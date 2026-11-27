import { serviceCategories } from "../lib/service-categories";
import { DEFAULT_SERVICES } from "../lib/honeycomb-slots";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import ProductionHomepage from "../components/homepage/ProductionHomepage";
import ReferenceFooter from "../components/homepage/Footer";
import FooterSwitch from "../components/homepage/FooterSwitch";
import Header from "../components/Header";
import SupportChat from "../components/SupportChat";
import presentation from "../lib/homepage-reference-settings.json";
import { I18nProvider } from "../lib/i18n/client";
import { sq } from "../lib/i18n/messages/sq";

// tsx's non-Next test transform uses classic JSX; no browser or database is used.
Object.assign(globalThis, { React });
const router = {
  bfcacheId: "homepage-render-test",
  back() {}, forward() {}, refresh() {}, hmrRefresh() {},
  push() {}, replace() {}, prefetch() {},
};
/**
 * Resolve server components first (async ones are awaited; sync ones that use
 * client hooks throw outside React and are left for the real render).
 */
async function expand(node: React.ReactNode): Promise<React.ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(expand));
  if (!React.isValidElement(node)) return node;
  const { type, props } = node as React.ReactElement<Record<string, unknown>>;
  if (typeof type === "function" && !(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent) {
    const component = type as (p: unknown) => React.ReactNode | Promise<React.ReactNode>;
    if (component.constructor.name === "AsyncFunction") return expand(await component(props));
    const originalError = console.error;
    console.error = () => {};
    try {
      return await expand(component(props) as React.ReactNode);
    } catch {
      // client component (uses hooks): rendered by React below
    } finally {
      console.error = originalError;
    }
  }
  if (props?.children === undefined) return node;
  const children = await expand(props.children as React.ReactNode);
  const element = node as React.ReactElement<Record<string, unknown>>;
  // Spread static child lists so React does not ask for keys it never needed.
  return Array.isArray(props.children) && Array.isArray(children)
    ? React.cloneElement(element, undefined, ...children)
    : React.cloneElement(element, { children });
}
async function render(node: React.ReactNode, pathname = "/") {
  const tree = await expand(React.createElement(I18nProvider, { locale: "sq", messages: sq, catalog: [] }, node));
  return renderToStaticMarkup(React.createElement(AppRouterContext.Provider, {
    value: router,
  }, React.createElement(PathnameContext.Provider, { value: pathname }, tree)));
}

test("original presentation keeps its title while the hive uses only the 14 approved categories", () => {
  assert.deepEqual(Object.keys(presentation), ["site"]);
  assert.equal(presentation.site.heroTitle, "Gjej profesionist për çdo shërbim.");
  assert.equal(presentation.site.heroAccent, "Lehtë.");
  const slugs = serviceCategories.map(c => c.slug);
  assert.equal(new Set(Object.values(DEFAULT_SERVICES)).size, 14);
  for (const slug of Object.values(DEFAULT_SERVICES)) assert(slugs.includes(slug as typeof slugs[number]));
});

test("original homepage renders the complete section order, hive geometry and search presentation", async () => {
  const html = await render(React.createElement(ProductionHomepage));
  const headings = ["Gjej profesionist për çdo shërbim.", "Kategoritë kryesore",
    "Për klientët", "Pse Zgjoi?", "Si funksionon", "Bëhu ndër profesionistët e parë",
    "Çfarë ju premtojmë gjatë beta-s"];
  let after = 0;
  for (const heading of headings) {
    const found = html.indexOf(heading, after);
    assert(found >= after, `missing or reordered section: ${heading}`);
    after = found + heading.length;
  }
  assert(html.includes('data-homepage-reference="zgjoi.com"'));
  assert(html.includes("zoom: 1.25"));
  assert(html.includes("zoom: 0.88"));
  assert(html.includes("sm:rounded-full"));
  assert(html.includes('role="combobox"'));
  assert(html.includes('viewBox="0 0 100 115.47"'));
  assert(html.includes("animate-bee-hover"));
  assert(html.includes("kategoria=mjeshter-i-ujit"));
  const links = [...html.matchAll(/kategoria=([^"&<>]+)/g)].map(match => decodeURIComponent(match[1]));
  assert.deepEqual([...new Set(links)].sort(), serviceCategories.map(c => c.slug).sort());
  for (const removed of ["kontabilist", "marketing", "transport", "trainer-personal", "fotograf", "internet"])
    assert(!html.includes(`kategoria=${removed}`));
  assert(!html.includes("[TEST]"));
  assert(!html.includes("/profesionisti/arben-elektricist"));
  assert(html.includes("Pagesa nis pas pranimit të ofertës"));
  assert(html.includes("nëse dëshiron"));
  assert(!html.includes("Paguaj vetëm pas përfundimit"));
});

test("beta homepage and about page contain no invented stats, ratings, testimonials or trust claims", async () => {
  const html = await render(React.createElement(ProductionHomepage)) + await render(React.createElement(ReferenceFooter));
  for (const invented of ["10K+", "5K+", "50K+", "4.9★", ">4.9<", "Klientë të kënaqur", "Profesionistë aktivë",
    "më e besuar", "Arben Krasniqi", "Blendi", "Paguan vetëm pas punës"])
    assert(!html.includes(invented), `invented marketing content: ${invented}`);
  assert(html.includes("Beta"));
  assert(html.includes("Kategori shërbimesh"));
  const about = readFileSync("app/rreth-nesh/page.tsx", "utf8");
  for (const invented of ["10K+", "5K+", "50K+", "më e besuar", "\"36\""])
    assert(!about.includes(invented), `invented about-page content: ${invented}`);
  assert(!JSON.stringify(presentation).includes("më e besuar"));
});

test("original footer is scoped to Preview homepage and cannot claim an unsaved subscription", async () => {
  const footer = await render(React.createElement(ReferenceFooter));
  for (const text of ["Regjistrohu për lajme", "Kompania", "Mbështetje", "LinkedIn"])
    assert(footer.includes(text));
  const component = readFileSync("components/homepage/Footer.tsx", "utf8");
  assert(component.includes("footer.newsletterIsntActiveYet"));
  assert(sq["footer.newsletterIsntActiveYet"].includes("Emaili juaj nuk u ruajt"));
  assert(!component.includes("Jeni abonuar me sukses"));
  assert(!component.includes("fetch("));
  const switchNode = (enabled: boolean) => React.createElement(FooterSwitch, {
    enabled,
  }, React.createElement("footer", null, "live-marketplace-footer"));
  assert((await render(switchNode(true))).includes("Regjistrohu për lajme"));
  assert((await render(switchNode(true), "/llogaria")).includes("live-marketplace-footer"));
  assert((await render(switchNode(false))).includes("live-marketplace-footer"));
});

test("home header and support launcher match original styling without replacing operational routes", async () => {
  const header = await render(React.createElement(Header, { productionHome: true }));
  assert(header.includes("gap-7 lg:flex"));
  const accountHeader = await render(React.createElement(Header, { productionHome: true }), "/llogaria");
  assert(accountHeader.includes("gap-6 xl:flex"));
  const support = await render(React.createElement(SupportChat, { productionHome: true }));
  assert(support.includes("bottom-[110px]"));
  assert(support.includes("message-circle"));
  assert(!support.includes("headset"));
  assert(support.includes("Hap mbështetjen"));
  assert(support.includes("bg-green-500") || support.includes("bg-gray-400"), "launcher shows online/offline status");
  const open = await render(React.createElement(SupportChat, { productionHome: true, defaultOpen: true }));
  assert(open.includes("Mbështetja Zgjoi"));
  assert(open.includes("Çdo ditë, 09:00–17:00"));
  assert(!open.includes("koha e Kosovës"));
  assert(!open.includes("Kosovo time"));
  assert(!open.includes("Nuk ka mesazhe ende"));
  assert(open.includes("Online") || open.includes("Jashtë orarit"));
  assert(open.includes("Jemi online deri") || open.includes("Kthehemi") || open.includes("Mesazhi juaj dërgohet gjithsesi"));
});

test("marketing reference modules never feed API, database, or account routes", () => {
  function check(directory: string) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, file.name);
      if (file.isDirectory()) check(path);
      else if (/\.[jt]sx?$/.test(path)) {
        const source = readFileSync(path, "utf8");
        assert(!source.includes("homepage-reference-"), `reference leaked into ${path}`);
      }
    }
  }
  for (const directory of ["app/api", "app/llogaria", "app/pro", "app/admin", "lib/server"]) check(directory);
  const home = readFileSync("app/page.tsx", "utf8");
  assert(home.includes('if (process.env.VERCEL_ENV === "preview") return <ProductionHomepage />'));
  const hero = readFileSync("components/homepage/Hero.tsx", "utf8");
  assert(!hero.includes("db."));
  assert(!hero.includes("fetch("));
});

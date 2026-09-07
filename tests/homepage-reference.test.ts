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

// tsx's non-Next test transform uses classic JSX; no browser or database is used.
Object.assign(globalThis, { React });
const router = {
  bfcacheId: "homepage-render-test",
  back() {}, forward() {}, refresh() {}, hmrRefresh() {},
  push() {}, replace() {}, prefetch() {},
};
function render(node: React.ReactNode, pathname = "/") {
  return renderToStaticMarkup(React.createElement(AppRouterContext.Provider, {
    value: router,
  }, React.createElement(PathnameContext.Provider, { value: pathname }, node)));
}

test("reference contains only the original public homepage settings and exact hive assignments", () => {
  assert.deepEqual(Object.keys(presentation).sort(), ["categories", "honeycomb", "site"]);
  assert.equal(presentation.site.heroTitle, "Gjej profesionist për çdo shërbim.");
  assert.equal(presentation.site.heroAccent, "Lehtë.");
  assert.equal(presentation.categories.length, 39);
  assert.deepEqual(presentation.honeycomb, {
    "0,5": "sigurim", "0,7": "kontabilist", "1,5": "perkthyes",
    "2,3": "postier", "2,7": "shtepiak", "3,1": "shtepiak",
    "3,5": "elektricist", "4,1": "shofer", "4,3": "berber", "6,1": "transport",
    "0.5,6": "klimatizim", "1.5,4": "kurse", "1.5,6": "dado",
    "2.5,2": "moler", "2.5,4": "marketing", "2.5,6": "mjeshter-i-ujit",
    "3.5,2": "kopshtar", "3.5,4": "pastrim", "4.5,0": "balet",
    "4.5,2": "avokat", "5.5,0": "internet", "5.5,2": "montim",
  });
  for (const category of presentation.categories) {
    assert.deepEqual(Object.keys(category).sort(), ["icon", "name", "slug"]);
    assert.match(category.icon, /^(?:[a-zA-Z][a-zA-Z0-9]*|data:image\/png;base64,[A-Za-z0-9+/=]+)$/);
    assert(!category.name.includes("[TEST]"));
  }
});

test("original homepage renders the complete section order, hive geometry and search presentation", () => {
  const html = render(React.createElement(ProductionHomepage));
  const headings = ["Gjej profesionist për çdo shërbim.", "Kategoritë kryesore",
    "Për klientët", "Pse Zgjoi?", "Si funksionon", "Profesionistë të rekomanduar",
    "Çfarë thonë klientët"];
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
  assert(html.includes("kategoria=kontabilist"));
  assert(!html.includes("[TEST]"));
  assert(!html.includes("/profesionisti/arben-elektricist"));
  assert(html.includes("Pagesa nis pas pranimit të ofertës"));
  assert(html.includes("nëse dëshiron"));
  assert(!html.includes("Paguaj vetëm pas përfundimit"));
});

test("original footer is scoped to Preview homepage and cannot claim an unsaved subscription", () => {
  const footer = render(React.createElement(ReferenceFooter));
  for (const text of ["Abonohu për lajme", "Kompania", "Mbështetje", "LinkedIn"])
    assert(footer.includes(text));
  const component = readFileSync("components/homepage/Footer.tsx", "utf8");
  assert(component.includes("Emaili juaj nuk u ruajt"));
  assert(!component.includes("Jeni abonuar me sukses"));
  assert(!component.includes("fetch("));
  const switchNode = (enabled: boolean) => React.createElement(FooterSwitch, {
    enabled,
  }, React.createElement("footer", null, "live-marketplace-footer"));
  assert(render(switchNode(true)).includes("Abonohu për lajme"));
  assert(render(switchNode(true), "/llogaria").includes("live-marketplace-footer"));
  assert(render(switchNode(false)).includes("live-marketplace-footer"));
});

test("home header and support launcher match original styling without replacing operational routes", () => {
  const header = render(React.createElement(Header, { productionHome: true }));
  assert(header.includes("gap-7 lg:flex"));
  const accountHeader = render(React.createElement(Header, { productionHome: true }), "/llogaria");
  assert(accountHeader.includes("gap-6 xl:flex"));
  const support = render(React.createElement(SupportChat, { productionHome: true }));
  assert(support.includes("bottom-[110px]"));
  assert(support.includes("message-circle"));
  assert(!support.includes("headset"));
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

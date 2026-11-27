import { localRedirect } from "@/lib/i18n/redirect";
import Link from "@/components/i18n/Link";
import { serviceCategory, serviceCategories, allowedCategorySlugs } from "@/lib/service-categories";
import type { Metadata } from "next";
import { Download, Hexagon, Image as ImageIcon, Power, Save, Trash2, Type } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import BeltIcon from "@/components/BeltIcons";
import EditCategoryModal from "@/components/admin/EditCategoryModal";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";
import {
  deleteCategory, saveHoneycomb, saveSiteSettings, seedCategories, toggleCategory, setHiringFlow,
} from "@/app/actions/admin";
import { hiringFlow } from "@/lib/book-now";
import { money } from "@/lib/format";
import { DEFAULT_SERVICES, CELL_LABELS } from "@/lib/honeycomb-slots";
import { getT, pageMetadata } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const generateMetadata = (): Promise<Metadata> => pageMetadata({ title: "meta.adminCategoriesTitle" });

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  const t = await getT();
  const feedback = await searchParams;
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") return localRedirect("/hyr?next=/admin/kategorite");

  const [cats, site, combMap] = await Promise.all([
    db.category.findMany({ where: { slug: { in: allowedCategorySlugs } }, orderBy: { position: "asc" } }),
    getSiteSettings(),
    getHoneycombMap(),
  ]);

  const active = cats.filter((c) => c.active).map(c => ({ ...c, slug: serviceCategory(c.slug)!.slug, name: serviceCategory(c.slug)!.name }));
  const options = active.length > 0
    ? active.map((c) => ({ slug: c.slug, name: c.name }))
    : baseCategories.map((c) => ({ slug: c.slug, name: c.name }));

  const current = combMap ?? DEFAULT_SERVICES;
  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: t("admin.administrator") };

  return (
    <AccountShell
      title={t("admin.categoriesSite")}
      subtitle={t("admin.manageCategoriesIconsSite")}
      nav={adminNav}
      user={shellUser}
    >
      {feedback?.ok && (
        <div className="mb-5 rounded-2xl border border-gold bg-honey px-5 py-3.5 text-sm font-semibold text-ink">
          {feedback.ok}
        </div>
      )}
      {feedback?.err && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-semibold text-red-600">
          {feedback.err}
        </div>
      )}

      <Card>
        <SectionTitle>{t("admin.n14ApprovedCategories")}</SectionTitle>
        <p className="text-sm text-muted">{t("admin.publicListOnlyUses")}</p>
        <p className="mt-3">{serviceCategories.map(c => t.tx(c.name)).join(" · ")}</p>
        <Link href="/admin/komisionet" className="mt-4 inline-block font-semibold text-gold-dark">{t("admin.seeCommissionRates15")}</Link>
        <form action={seedCategories} className="mt-4">
          <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Download size={15} /> {" "}{t("admin.syncApprovedCategories")}</button>
        </form>
      </Card>

      <Card className="mt-6">
        <SectionTitle>{t("admin.hiringOptionsCategory")}</SectionTitle>
        <p className="text-sm text-muted">{t("admin.chatAvailableEverywhereBook")}</p>
        <ul className="mt-3 divide-y divide-line">
          {serviceCategories.map((category) => {
            const row = cats.find((c) => c.slug === category.slug);
            const flow = hiringFlow(category.slug, row ?? {});
            const toggle = (field: "bookNowEnabled" | "estimateEnabled", on: boolean, label: string) => (
              <form action={setHiringFlow}>
                <input type="hidden" name="slug" value={category.slug} />
                <input type="hidden" name="field" value={field} />
                <input type="hidden" name="value" value={String(!on)} />
                <button className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-gold bg-honey text-gold-dark" : "border-line text-muted"}`}>
                  {label}: {on ? "Po" : "Jo"}
                </button>
              </form>
            );
            return (
              <li key={category.slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm font-semibold">{t.tx(category.name)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cream px-3 py-1 text-xs">{t("admin.chat")}</span>
                  {toggle("bookNowEnabled", flow.bookNow, t("admin.bookNow"))}
                  {toggle("estimateEnabled", flow.estimate, t("admin.estimate", { value: flow.estimatePriceCents ? ` ${money(flow.estimatePriceCents, t.locale)}` : "" }))}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* the list */}
      {cats.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>{t("admin.allCategories", { count: cats.length })}</SectionTitle>
          <ul className="divide-y divide-line">
            {cats.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey text-gold-dark">
                    <BeltIcon name={c.icon} size={20} />
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${c.active ? "text-ink" : "text-muted line-through"}`}>{t.tx(serviceCategory(c.slug)?.name)}</p>
                    <p className="text-xs text-muted">/{c.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EditCategoryModal cat={{ id: c.id, name: c.name, slug: c.slug, icon: c.icon }} />
                  <form action={toggleCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        c.active
                          ? "border-line text-muted hover:border-gold hover:text-gold-dark"
                          : "border-gold bg-honey text-gold-dark"
                      }`}
                    >
                      <Power size={12} /> {c.active ? t("admin.deactivate") : t("admin.activate")}
                    </button>
                  </form>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                      <Trash2 size={12} /> {" "}{t("admin.delete")}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* site texts + logo */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Type size={18} className="text-gold-dark" /> {" "}{t("admin.siteCopyLogo")}</span>
        </SectionTitle>
        <form action={saveSiteSettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="heroTitle">{t("admin.mainHeadline")}</label>
              <input
                id="heroTitle" name="heroTitle"
                defaultValue={site?.heroTitle ?? t("admin.findProAnyJob")}
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="heroAccent">{t("admin.goldHighlightedWord")}</label>
              <input
                id="heroAccent" name="heroAccent"
                defaultValue={site?.heroAccent ?? t("admin.easy")}
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="heroSubtitle">{t("admin.subheading")}</label>
            <input
              id="heroSubtitle" name="heroSubtitle"
              defaultValue={site?.heroSubtitle ?? t("admin.findVettedLocalPros")}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink" htmlFor="logoUrl">
              <ImageIcon size={14} /> {" "}{t("admin.logoUrlOptional")}</label>
            <input
              id="logoUrl" name="logoUrl" placeholder="https://…/logo.png"
              defaultValue={site?.logoUrl ?? ""}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Save size={15} /> {" "}{t("admin.saveCopy")}</button>
        </form>
      </Card>

      {/* honeycomb cells */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Hexagon size={18} className="text-gold-dark" /> {" "}{t("admin.homepageHoneycomb")}</span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          {t("admin.chooseWhichCategoryEach")}</p>
        <form action={saveHoneycomb}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(DEFAULT_SERVICES).map((c) => (
              <div key={c} className="rounded-xl border border-line bg-cream p-3">
                <label className="text-xs font-bold uppercase tracking-wide text-muted" htmlFor={`cell-${c}`}>
                  {t.tx(CELL_LABELS[c]) ?? t("admin.cell", { c: c })}
                </label>
                <select
                  id={`cell-${c}`}
                  name={`cell:${c}`}
                  defaultValue={current[c] ?? DEFAULT_SERVICES[c]}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-gold"
                >
                  {options.map((o) => (
                    <option key={o.slug} value={o.slug}>{t.tx(o.name)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button className="mt-5 flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Save size={15} /> {" "}{t("admin.saveHoneycomb")}</button>
        </form>
      </Card>
    </AccountShell>
  );
}

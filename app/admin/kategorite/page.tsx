import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Hexagon, Image as ImageIcon, Plus, Power, Save, Trash2, Type } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import BeltIcon from "@/components/BeltIcons";
import EditCategoryModal from "@/components/admin/EditCategoryModal";
import IconPicker from "@/components/admin/IconPicker";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";
import {
  deleteCategory, saveHoneycomb, saveSiteSettings, seedCategories, toggleCategory,
} from "@/app/actions/admin";
import { addCategory } from "@/app/actions/categories";
import { DEFAULT_SERVICES, CELL_LABELS } from "@/lib/honeycomb-slots";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kategoritë & Faqja — Admin" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: { ok?: string; err?: string };
}) {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/kategorite");

  const [cats, site, combMap] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" } }),
    getSiteSettings(),
    getHoneycombMap(),
  ]);

  const active = cats.filter((c) => c.active);
  const options = active.length > 0
    ? active.map((c) => ({ slug: c.slug, name: c.name }))
    : baseCategories.map((c) => ({ slug: c.slug, name: c.name }));

  const current = combMap ?? DEFAULT_SERVICES;
  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Kategoritë & Faqja"
      subtitle="Menaxho kategoritë, ikonat, tekstet e faqes dhe hojet."
      nav={adminNav}
      user={shellUser}
    >
      {searchParams?.ok && (
        <div className="mb-5 rounded-2xl border border-gold bg-honey px-5 py-3.5 text-sm font-semibold text-ink">
          {searchParams.ok}
        </div>
      )}
      {searchParams?.err && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-semibold text-red-600">
          {searchParams.err}
        </div>
      )}

      {cats.length === 0 && (
        <Card>
          <p className="text-sm text-muted">Databaza nuk ka ende kategori. Importo listën bazë:</p>
          <form action={seedCategories} className="mt-4">
            <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
              <Download size={15} /> Importo kategoritë bazë
            </button>
          </form>
        </Card>
      )}

      {/* add a category, with its own icon */}
      <Card className={cats.length === 0 ? "mt-6" : ""}>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Plus size={18} className="text-gold-dark" /> Shto kategori të re
          </span>
        </SectionTitle>
        <form action={addCategory} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="new-cat-name">Emri</label>
            <input
              id="new-cat-name"
              name="name"
              required
              placeholder="p.sh. Veteriner"
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold sm:max-w-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">Ikona</label>
            <div className="mt-1.5 sm:max-w-md">
              <IconPicker name="icon" />
            </div>
          </div>
          <button className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            Shto kategorinë
          </button>
          <p className="text-xs text-muted">Linku (slug) krijohet vetë nga emri.</p>
        </form>
      </Card>

      {/* the list */}
      {cats.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>Të gjitha kategoritë ({cats.length})</SectionTitle>
          <ul className="divide-y divide-line">
            {cats.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey text-gold-dark">
                    <BeltIcon name={c.icon} size={20} />
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${c.active ? "text-ink" : "text-muted line-through"}`}>{c.name}</p>
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
                      <Power size={12} /> {c.active ? "Çaktivizo" : "Aktivizo"}
                    </button>
                  </form>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                      <Trash2 size={12} /> Fshij
                    </button>
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
            <Type size={18} className="text-gold-dark" /> Tekstet dhe logo e faqes
          </span>
        </SectionTitle>
        <form action={saveSiteSettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="heroTitle">Titulli kryesor</label>
              <input
                id="heroTitle" name="heroTitle"
                defaultValue={site?.heroTitle ?? "Gjej profesionist për çdo shërbim."}
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink" htmlFor="heroAccent">Fjala me ngjyrë ari</label>
              <input
                id="heroAccent" name="heroAccent"
                defaultValue={site?.heroAccent ?? "Lehtë."}
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="heroSubtitle">Nën-titulli</label>
            <input
              id="heroSubtitle" name="heroSubtitle"
              defaultValue={site?.heroSubtitle ?? "Zgjoi është platforma më e besuar në Kosovë për të gjetur dhe punësuar profesionistë lokalë."}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink" htmlFor="logoUrl">
              <ImageIcon size={14} /> URL e logos (opsionale)
            </label>
            <input
              id="logoUrl" name="logoUrl" placeholder="https://…/logo.png"
              defaultValue={site?.logoUrl ?? ""}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Save size={15} /> Ruaj tekstet
          </button>
        </form>
      </Card>

      {/* honeycomb cells */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Hexagon size={18} className="text-gold-dark" /> Hojet e faqes së parë
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Zgjidh cilën kategori mban secila qelizë e hojeve (versioni për kompjuter).
        </p>
        <form action={saveHoneycomb}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(DEFAULT_SERVICES).map((c) => (
              <div key={c} className="rounded-xl border border-line bg-cream p-3">
                <label className="text-xs font-bold uppercase tracking-wide text-muted" htmlFor={`cell-${c}`}>
                  {CELL_LABELS[c] ?? `Qeliza ${c}`}
                </label>
                <select
                  id={`cell-${c}`}
                  name={`cell:${c}`}
                  defaultValue={current[c] ?? DEFAULT_SERVICES[c]}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-gold"
                >
                  {options.map((o) => (
                    <option key={o.slug} value={o.slug}>{o.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button className="mt-5 flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Save size={15} /> Ruaj hojet
          </button>
        </form>
      </Card>
    </AccountShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Hexagon, Image as ImageIcon, Plus, Power, Save, Trash2, Type } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import CategoryIcon from "@/components/CategoryIcon";
import EditCategoryModal from "@/components/admin/EditCategoryModal";
import IconPicker from "@/components/admin/IconPicker";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";
import { createCategory, deleteCategory, saveHoneycomb, saveSiteSettings, seedCategories, toggleCategory } from "@/app/actions/admin";
import { DEFAULT_SERVICES, CELL_LABELS } from "@/lib/honeycomb-slots";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kategoritë & Faqja — Admin" };

export default async function AdminCategoriesPage() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/kategorite");

  const [cats, site, combMap] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" } }),
    getSiteSettings(),
    getHoneycombMap(),
  ]);

  const options = cats.filter((c) => c.active).length > 0
    ? cats.filter((c) => c.active).map((c) => ({ slug: c.slug, name: c.name }))
    : baseCategories.map((c) => ({ slug: c.slug, name: c.name }));

  const current = combMap ?? DEFAULT_SERVICES;
  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Kategoritë & Faqja"
      subtitle="Menaxho kategoritë, tekstet e faqes dhe hojet — të gjitha në një vend."
      nav={adminNav}
      user={shellUser}
    >
      {/* ------------------------------------------------ categories */}
      {cats.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            Databaza nuk ka ende kategori. Importo listën bazë me një klikim:
          </p>
          <form action={seedCategories} className="mt-4">
            <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
              <Download size={15} /> Importo kategoritë bazë
            </button>
          </form>
        </Card>
      )}

      <Card className={cats.length === 0 ? "mt-6" : ""}>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Plus size={18} className="text-gold-dark" /> Shto kategori të re
          </span>
        </SectionTitle>
        <form action={createCategory} className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
          <input
            name="name"
            required
            placeholder="Emri (p.sh. Veteriner)"
            className="rounded-xl border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <IconPicker name="icon" />
          <button className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            Shto
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">Linku (slug) krijohet vetë nga emri.</p>
      </Card>

      {cats.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>Të gjitha kategoritë ({cats.length})</SectionTitle>
          <ul className="divide-y divide-line">
            {cats.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey text-gold-dark">
                    <CategoryIcon name={c.icon} size={18} />
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

      {/* -------------------------------------------------- site texts */}
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
              <ImageIcon size={14} /> URL e logos së faqes (opsionale)
            </label>
            <input
              id="logoUrl" name="logoUrl" placeholder="https://…/logo.png — lëre bosh për logon me bletë"
              defaultValue={site?.logoUrl ?? ""}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Save size={15} /> Ruaj tekstet
          </button>
        </form>
      </Card>

      {/* ---------------------------------------------- honeycomb cells */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Hexagon size={18} className="text-gold-dark" /> Hojet e faqes së parë
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Zgjidh cilën kategori e mban secila qelizë. Qelizat renditen nga
          poshtë-majtas (afër kutisë së kërkimit) drejt lart-djathtas.
        </p>
        <form action={saveHoneycomb}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(DEFAULT_SERVICES).map((cell) => (
              <div key={cell} className="rounded-xl border border-line bg-cream p-3">
                <label className="text-xs font-bold uppercase tracking-wide text-muted" htmlFor={`cell-${cell}`}>
                  {CELL_LABELS[cell] ?? `Qeliza ${cell}`}
                </label>
                <select
                  id={`cell-${cell}`}
                  name={`cell:${cell}`}
                  defaultValue={current[cell] ?? DEFAULT_SERVICES[cell]}
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

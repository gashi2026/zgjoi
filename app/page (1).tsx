import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hexagon, Image as ImageIcon, Save, Type } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { getHoneycombMap, getSiteSettings } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";
import { saveHoneycomb, saveSiteSettings } from "@/app/actions/admin";
import { DEFAULT_SERVICES, CELL_LABELS } from "@/lib/honeycomb-slots";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Faqja kryesore — Admin" };

export default async function AdminHomepagePage() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/faqja");

  const [site, combMap, dbCats] = await Promise.all([
    getSiteSettings(),
    getHoneycombMap(),
    db.category.findMany({ where: { active: true }, orderBy: { position: "asc" } }).catch(() => []),
  ]);

  // categories available to choose: DB first, fallback to the built-in list
  const options = dbCats.length > 0
    ? dbCats.map((c) => ({ slug: c.slug, name: c.name }))
    : baseCategories.map((c) => ({ slug: c.slug, name: c.name }));

  const current = combMap ?? DEFAULT_SERVICES;

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Faqja kryesore"
      subtitle="Ndrysho tekstet, logon dhe hojet e faqes së parë."
      nav={adminNav}
      user={shellUser}
    >
      {/* texts + logo */}
      <Card>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Type size={18} className="text-gold-dark" /> Tekstet dhe logo
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
              id="logoUrl" name="logoUrl" placeholder="https://…/logo.png — lëre bosh për logon e vizatuar"
              defaultValue={site?.logoUrl ?? ""}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-muted">
              Ngarko një imazh diku (p.sh. Supabase Storage) dhe ngjite linkun këtu. Bosh = logoja aktuale me bletë.
            </p>
          </div>
          <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            <Save size={15} /> Ruaj tekstet
          </button>
        </form>
      </Card>

      {/* honeycomb editor */}
      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Hexagon size={18} className="text-gold-dark" /> Hojet e faqes së parë
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Zgjidh cilën kategori e mban secila qelizë e hojeve. Qelizat renditen nga
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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Plus, Power, Trash2 } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import CategoryIcon from "@/components/CategoryIcon";
import EditCategoryModal from "@/components/admin/EditCategoryModal";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { createCategory, deleteCategory, seedCategories, toggleCategory } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kategoritë — Admin" };

export default async function AdminCategoriesPage() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/kategorite");

  const cats = await db.category.findMany({ orderBy: { position: "asc" } });
  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Kategoritë"
      subtitle={`${cats.length} kategori në platformë`}
      nav={adminNav}
      user={shellUser}
    >
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

      {/* add new */}
      <Card className={cats.length === 0 ? "mt-6" : ""}>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Plus size={18} className="text-gold-dark" /> Shto kategori të re
          </span>
        </SectionTitle>
        <form action={createCategory} className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input
            name="name"
            required
            placeholder="Emri (p.sh. Veteriner)"
            className="rounded-xl border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <input
            name="slug"
            placeholder="slug (opsional)"
            className="rounded-xl border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <input
            name="icon"
            placeholder="ikona (p.sh. heart)"
            className="rounded-xl border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
            Shto
          </button>
        </form>
      </Card>

      {/* list */}
      {cats.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>Të gjitha kategoritë</SectionTitle>
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
    </AccountShell>
  );
}

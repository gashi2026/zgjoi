import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Search, ShieldOff, Trash2, UserCheck } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import EditUserModal from "@/components/admin/EditUserModal";
import AddUserModal from "@/components/admin/AddUserModal";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { categories as baseCategories } from "@/lib/data";
import { approvePro, deleteUser, rejectPro, suspendUser, unsuspendUser } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Përdoruesit — Admin" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/perdoruesit");

  const q = (searchParams.q ?? "").trim();

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      proProfile: {
        select: {
          id: true, categorySlug: true, about: true, experience: true,
          priceFrom: true, radiusKm: true, serviceCities: true,
          verification: true, ibanLast4: true,
          services: { select: { name: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const avatarRows = await db.setting
    .findMany({ where: { key: { startsWith: "avatar:" } } })
    .catch(() => [] as { key: string; value: unknown }[]);
  const avatars = new Map(
    avatarRows.map((r) => [r.key.slice(7), typeof r.value === "string" ? r.value : null])
  );

  const pendingPros = users.filter((u) => u.proProfile?.verification === "PENDING");

  const dbCats = await db.category
    .findMany({ where: { active: true }, orderBy: { position: "asc" } })
    .catch(() => []);
  const categoryOptions = dbCats.length > 0
    ? dbCats.map((c) => ({ slug: c.slug, name: c.name }))
    : baseCategories.map((c) => ({ slug: c.slug, name: c.name }));

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Përdoruesit"
      subtitle={`${users.length} llogari${q ? ` — kërkim: “${q}”` : ""}`}
      nav={adminNav}
      user={shellUser}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex max-w-md flex-1 items-center gap-2 rounded-full border border-line bg-white p-1.5 shadow-soft" role="search">
          <Search size={16} className="ml-3 shrink-0 text-muted" />
          <input
            type="text" name="q" defaultValue={q}
            placeholder="Kërko emër, email ose qytet…"
            className="w-full bg-transparent px-1 py-2 text-sm outline-none"
          />
          <button type="submit" className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:bg-gold-dark">
            Kërko
          </button>
        </form>
        <AddUserModal categoryOptions={categoryOptions} />
      </div>

      {pendingPros.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <BadgeCheck size={18} className="text-gold-dark" />
              Verifikime në pritje ({pendingPros.length})
            </span>
          </SectionTitle>
          <ul className="divide-y divide-line">
            {pendingPros.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">{u.name}</p>
                  <p className="text-xs text-muted">{u.email} · {u.proProfile?.categorySlug}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approvePro}>
                    <input type="hidden" name="profileId" value={u.proProfile!.id} />
                    <button className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink hover:bg-gold-dark">Aprovo</button>
                  </form>
                  <form action={rejectPro}>
                    <input type="hidden" name="profileId" value={u.proProfile!.id} />
                    <button className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">Refuzo</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <SectionTitle>Të gjithë përdoruesit</SectionTitle>
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Asnjë përdorues nuk u gjet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-2.5 pr-4">Emri</th>
                  <th className="py-2.5 pr-4">Roli</th>
                  <th className="py-2.5 pr-4">Qyteti</th>
                  <th className="py-2.5 pr-4">Statusi</th>
                  <th className="py-2.5 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => {
                  const avatar = avatars.get(u.id) ?? null;
                  const p = u.proProfile;
                  return (
                    <tr key={u.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey text-xs font-bold text-gold-dark">
                              {u.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-ink">{u.name}</p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-ink">
                          {u.role === "ADMIN" ? "Admin" : u.role === "PRO" ? "Profesionist" : u.role === "SUPPORT" ? "Mbështetje" : "Klient"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted">{u.city ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {u.suspendedAt ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Pezulluar</span>
                        ) : (
                          <span className="rounded-full bg-honey px-2.5 py-1 text-xs font-bold text-gold-dark">Aktiv</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <EditUserModal
                            isSelf={u.id === me.id}
                            categoryOptions={categoryOptions}
                            user={{
                              id: u.id, name: u.name, email: u.email, city: u.city,
                              phone: u.phone, role: u.role,
                              personalNoLast4: u.personalNoLast4, avatarUrl: avatar,
                            }}
                            pro={
                              p
                                ? {
                                    id: p.id,
                                    categorySlug: p.categorySlug,
                                    about: p.about,
                                    experience: p.experience,
                                    priceFrom: p.priceFrom,
                                    radiusKm: p.radiusKm,
                                    serviceCities: p.serviceCities,
                                    verification: p.verification,
                                    ibanLast4: p.ibanLast4,
                                    subcategory: p.services[0]?.name ?? null,
                                  }
                                : null
                            }
                          />
                          {u.id !== me.id && (
                            <>
                              {u.suspendedAt ? (
                                <form action={unsuspendUser}>
                                  <input type="hidden" name="id" value={u.id} />
                                  <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-gold hover:text-gold-dark">
                                    <UserCheck size={12} /> Aktivizo
                                  </button>
                                </form>
                              ) : (
                                <form action={suspendUser}>
                                  <input type="hidden" name="id" value={u.id} />
                                  <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                                    <ShieldOff size={12} /> Pezullo
                                  </button>
                                </form>
                              )}
                              <form action={deleteUser}>
                                <input type="hidden" name="id" value={u.id} />
                                <button className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted hover:border-red-300 hover:text-red-500" title="Fshij llogarinë">
                                  <Trash2 size={12} />
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AccountShell>
  );
}

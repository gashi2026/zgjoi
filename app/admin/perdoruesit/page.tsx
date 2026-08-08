import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Search, ShieldOff, UserCheck } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import EditUserModal from "@/components/admin/EditUserModal";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { approvePro, rejectPro, suspendUser, unsuspendUser } from "@/app/actions/admin";

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
    include: { proProfile: { select: { id: true, verification: true, categorySlug: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pendingPros = users.filter((u) => u.proProfile?.verification === "PENDING");

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Përdoruesit"
      subtitle={`${users.length} llogari${q ? ` — kërkim: “${q}”` : ""}`}
      nav={adminNav}
      user={shellUser}
    >
      {/* search */}
      <form className="flex max-w-md items-center gap-2 rounded-full border border-line bg-white p-1.5 shadow-soft" role="search">
        <Search size={16} className="ml-3 shrink-0 text-muted" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Kërko emër, email ose qytet…"
          className="w-full bg-transparent px-1 py-2 text-sm outline-none"
        />
        <button type="submit" className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:bg-gold-dark">
          Kërko
        </button>
      </form>

      {/* pending verifications first */}
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
                    <button className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink hover:bg-gold-dark">
                      Aprovo
                    </button>
                  </form>
                  <form action={rejectPro}>
                    <input type="hidden" name="profileId" value={u.proProfile!.id} />
                    <button className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                      Refuzo
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* all users */}
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <p className="font-bold text-ink">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-ink">
                        {u.role === "ADMIN" ? "Admin" : u.role === "PRO" ? "Profesionist" : "Klient"}
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
                        <EditUserModal user={{ id: u.id, name: u.name, city: u.city, phone: u.phone, email: u.email }} />
                        {u.id !== me.id && (
                          u.suspendedAt ? (
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
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AccountShell>
  );
}

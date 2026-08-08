import type { Metadata } from "next";
import { Search, SlidersHorizontal } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { adminUsers } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Përdoruesit — Admin Zgjoi" };

const admin = { name: "Rrustem Gashi", initials: "RG", hue: 38, caption: "Administrator" };

const verifStyle: Record<string, string> = {
  "i-verifikuar": "bg-[#E9F7EC] text-[#1F7A3A]",
  "ne-pritje": "bg-honey text-gold-dark",
  refuzuar: "bg-[#FDF0F0] text-[#B4232A]",
  "—": "bg-[#F3F1EE] text-muted",
};

const verifLabel: Record<string, string> = {
  "i-verifikuar": "I verifikuar",
  "ne-pritje": "Në pritje",
  refuzuar: "Refuzuar",
  "—": "—",
};

export default function AdminUsersPage() {
  return (
    <AccountShell
      title="Përdoruesit dhe profesionistët"
      subtitle={`${adminUsers.length} llogari të regjistruara · filtro, verifiko ose pezullo.`}
      nav={adminNav}
      user={admin}
    >
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex flex-1 items-center gap-2 rounded-full border border-line px-4 py-2.5">
            <Search size={16} className="text-muted" />
            <input
              placeholder="Kërko sipas emrit ose email-it…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </span>
          {["Të gjithë", "Klientë", "Profesionistë", "Në pritje"].map((f, i) => (
            <button
              key={f}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                i === 0 ? "border-gold bg-honey text-ink" : "border-line text-muted hover:border-gold hover:text-gold-dark"
              }`}
            >
              {f}
            </button>
          ))}
          <button className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted hover:border-gold hover:text-gold-dark">
            <SlidersHorizontal size={15} /> Filtro
          </button>
        </div>
      </Card>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-4 font-semibold">Përdoruesi</th>
                <th className="px-5 py-4 font-semibold">Roli</th>
                <th className="px-5 py-4 font-semibold">Qyteti</th>
                <th className="px-5 py-4 font-semibold">Anëtar që nga</th>
                <th className="px-5 py-4 font-semibold">Punë</th>
                <th className="px-5 py-4 font-semibold">Verifikimi</th>
                <th className="px-5 py-4 font-semibold">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-bold text-ink">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-5 py-4 text-muted">{u.role}</td>
                  <td className="px-5 py-4 text-muted">{u.city}</td>
                  <td className="px-5 py-4 text-muted">{u.joined}</td>
                  <td className="px-5 py-4 text-muted">{u.jobs}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${verifStyle[u.verification]}`}>
                      {verifLabel[u.verification]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex gap-2">
                      <button className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-gold hover:text-gold-dark">
                        Shiko
                      </button>
                      <button
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                          u.state === "aktiv"
                            ? "border border-line text-muted hover:border-ink hover:text-ink"
                            : "bg-honey text-gold-dark"
                        }`}
                      >
                        {u.state === "aktiv" ? "Pezullo" : "Riaktivizo"}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AccountShell>
  );
}

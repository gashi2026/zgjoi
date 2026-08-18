import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banknote, CheckCircle2, Clock3, Undo2, Wallet } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { confirmFundsReceived, markPaidOut, refundPayment } from "@/app/actions/payouts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagesat — Admin" };

const eur = (cents: number) => `${(cents / 100).toFixed(2)}€`;
const dt = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export default async function AdminPayoutsPage() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/pagesat");

  /* Only scalar fields + the client relation are read here, then the
     professionals are looked up separately — fewer assumptions, fewer
     ways for a nested relation name to break the page. */
  const include = {
    request: {
      select: {
        title: true,
        state: true,
        city: true,
        acceptedProfileId: true,
        client: { select: { name: true, phone: true } },
      },
    },
  } as const;

  const [awaiting, held, paid] = await Promise.all([
    db.payment.findMany({ where: { state: "PENDING" }, include, orderBy: { createdAt: "asc" } }),
    db.payment.findMany({ where: { state: "HELD" }, include, orderBy: { createdAt: "asc" } }),
    db.payment.findMany({ where: { state: "RELEASED" }, include, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  const profileIds = Array.from(
    new Set(
      [...awaiting, ...held, ...paid]
        .map((p) => p.request.acceptedProfileId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const profiles = profileIds.length
    ? await db.proProfile.findMany({
        where: { id: { in: profileIds } },
        select: {
          id: true,
          ibanLast4: true,
          user: { select: { name: true, phone: true, email: true } },
        },
      })
    : [];
  const proById = new Map(profiles.map((p) => [p.id, p]));
  const proOf = (payment: { request: { acceptedProfileId: string | null } }) =>
    payment.request.acceptedProfileId ? proById.get(payment.request.acceptedProfileId) : undefined;

  const readyToPay = held.filter((p) => p.request.state === "COMPLETED");
  const stillWorking = held.filter((p) => p.request.state !== "COMPLETED");

  const owed = readyToPay.reduce((s, p) => s + p.proAmount, 0);
  const inAccount = held.reduce((s, p) => s + p.amount, 0);
  const earned = paid.reduce((s, p) => s + p.commissionAmount, 0);

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Pagesat"
      subtitle="Konfirmo arkëtimet dhe kryej pagesat drejt profesionistëve."
      nav={adminNav}
      user={shellUser}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Në llogarinë Zgjoi</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(inAccount)}</p>
          <p className="mt-0.5 text-xs text-muted">{held.length} pagesa të mbajtura</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Për t&apos;u paguar tani</p>
          <p className="mt-1 text-2xl font-extrabold text-gold-dark">{eur(owed)}</p>
          <p className="mt-0.5 text-xs text-muted">{readyToPay.length} profesionistë presin</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Komisioni i mbajtur</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{eur(earned)}</p>
          <p className="mt-0.5 text-xs text-muted">nga pagesat e mbyllura</p>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Clock3 size={18} className="text-gold-dark" /> Në pritje të arkëtimit ({awaiting.length})
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Klienti ka nisur transferin. Kontrollo pasqyrën e TEB-it dhe konfirmo kur paraja të ketë hyrë.
        </p>
        {awaiting.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Asnjë transfer në pritje.</p>
        ) : (
          <ul className="divide-y divide-line">
            {awaiting.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{p.request.title}</p>
                  <p className="text-xs text-muted">
                    {p.request.client.name} · {p.request.city} · referenca:{" "}
                    <b className="text-ink">ZG-{p.id.slice(-6).toUpperCase()}</b>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-ink">{eur(p.amount)}</span>
                  <form action={confirmFundsReceived}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink hover:bg-gold-dark">
                      <CheckCircle2 size={12} /> Arkëtova
                    </button>
                  </form>
                  <form action={refundPayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                      <Undo2 size={12} /> Anulo
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Banknote size={18} className="text-gold-dark" /> Për t&apos;u paguar ({readyToPay.length})
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          Puna është konfirmuar e përfunduar nga klienti. Bëj transferin nga TEB dhe shëno referencën.
        </p>
        {readyToPay.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Asgjë për të paguar për momentin.</p>
        ) : (
          <ul className="divide-y divide-line">
            {readyToPay.map((p) => {
              const pro = proOf(p);
              return (
                <li key={p.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{p.request.title}</p>
                      <p className="text-xs text-muted">
                        Paguaj: <b className="text-ink">{pro?.user.name ?? "—"}</b>
                        {pro?.user.phone ? ` · ${pro.user.phone}` : ""}
                        {pro?.ibanLast4 ? ` · IBAN ····${pro.ibanLast4}` : " · IBAN mungon"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Klienti pagoi {eur(p.amount)} · komisioni yt {eur(p.commissionAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Shuma për transfer</p>
                      <p className="text-xl font-extrabold text-gold-dark">{eur(p.proAmount)}</p>
                    </div>
                  </div>
                  <form action={markPaidOut} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input
                      name="reference"
                      placeholder="Referenca e transferit (opsionale)"
                      className="min-w-[220px] flex-1 rounded-xl border border-line bg-cream px-4 py-2 text-sm outline-none focus:border-gold"
                    />
                    <button className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2 text-sm font-bold text-ink hover:bg-gold-dark">
                      <Wallet size={14} /> E pagova
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {stillWorking.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>Paratë e mbajtura, puna në vazhdim ({stillWorking.length})</SectionTitle>
          <ul className="divide-y divide-line">
            {stillWorking.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">{p.request.title}</p>
                  <p className="text-xs text-muted">
                    {proOf(p)?.user.name ?? "—"} · arkëtuar më {dt(p.heldAt)}
                  </p>
                </div>
                <span className="text-sm font-bold text-ink">{eur(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {paid.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>Pagesat e kryera</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-2.5 pr-4">Puna</th>
                  <th className="py-2.5 pr-4">Profesionisti</th>
                  <th className="py-2.5 pr-4">Paguar</th>
                  <th className="py-2.5 pr-4">Komisioni</th>
                  <th className="py-2.5">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paid.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-semibold text-ink">{p.request.title}</td>
                    <td className="py-3 pr-4 text-muted">{proOf(p)?.user.name ?? "—"}</td>
                    <td className="py-3 pr-4 font-bold text-ink">{eur(p.proAmount)}</td>
                    <td className="py-3 pr-4 text-muted">{eur(p.commissionAmount)}</td>
                    <td className="py-3 text-muted">{dt(p.releasedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AccountShell>
  );
}

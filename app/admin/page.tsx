import { daysAgo } from "@/lib/server/time";
import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { money } from "@/lib/format";
import { paymentsReady } from "@/lib/server/payments";
import { bookingFunnel } from "@/lib/server/metrics";
export default async function Page() {
  const actor = await pageGuard("ADMIN");
  const since = daysAgo(30);
  const [
    users,
    pros,
    pending,
    requests,
    completed,
    held,
    released,
    tickets,
    events,
    heartbeat,
    failedMail,
    funnel,
  ] = await Promise.all([
    db.user.count(),
    db.proProfile.count({
      where: {
        verification: "APPROVED",
        user: { suspendedAt: null, role: "PRO" },
      },
    }),
    db.proProfile.count({ where: { verification: "PENDING" } }),
    db.serviceRequest.count(),
    db.serviceRequest.count({
      where: { state: "COMPLETED", completedAt: { not: null } },
    }),
    db.payment.aggregate({ where: { state: "HELD" }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { state: "RELEASED" },
      _sum: { commissionAmount: true },
    }),
    db.supportTicket.count({ where: { state: "OPEN" } }),
    db.auditLog.groupBy({
      by: ["action"],
      where: {
        createdAt: { gte: since },
        action: {
          in: [
            "ACCOUNT_CREATED",
            "INQUIRY_CREATED",
            "OFFER_SENT",
            "OFFER_ACCEPTED",
            "PAYMENT_HELD",
            "CONFIRM_COMPLETION",
            "FUNDS_TRANSFERRED",
            "REVIEW_PUBLISHED",
          ],
        },
      },
      _count: true,
    }),
    db.setting.findUnique({ where: { key: "maintenanceHeartbeat" } }),
    db.outbox.count({ where: { state: "FAILED", OR: [{ lastError: null }, { lastError: { not: "MESSAGE_SUPPRESSED" } }] } }),
    bookingFunnel(since),
  ]);
  return (
    <Frame actor={actor} title="Administrimi i Zgjoi">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Llogari", users],
          ["Profesionistë të miratuar", pros],
          ["Kërkesa", requests],
          ["Punë të përfunduara", completed],
          ["Pagesa të mbajtura", money(held._sum.amount ?? 0)],
          [
            "Komision nga transfere",
            money(released._sum.commissionAmount ?? 0),
          ],
        ].map(([label, value]) => (
          <Panel key={label}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </Panel>
        ))}
      </div>
      <Panel>
        <h2 className="mb-3 text-lg font-bold">Ecuria e kërkesave të 30 ditëve të fundit</h2>
        <p className="mb-4 text-sm text-muted">I njëjti grup kërkesash, sipas datës së krijimit. Çdo kërkesë numërohet vetëm një herë në secilin hap, pavarësisht sa oferta ose veprime ka. Këto janë të dhëna të këtij mjedisi.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-line"><th className="py-3">Hapi i arritur</th><th className="py-3">Kërkesa</th><th className="py-3">Nga të gjitha</th></tr></thead>
            <tbody>{[
              ["Kërkesë private", funnel.inquiries], ["Të paktën një ofertë zyrtare", funnel.offered],
              ["Ofertë e pranuar", funnel.accepted], ["Pagesë e konfirmuar ndonjëherë", funnel.funded],
              ["Përfundim i konfirmuar nga klienti", funnel.completed],
            ].map(([label, count]) => <tr key={label} className="border-b border-line"><th className="py-3 font-normal">{label}</th><td>{count}</td><td>{funnel.inquiries ? `${Math.round(Number(count) / funnel.inquiries * 100)}%` : "—"}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Hapat janë historikë: rimbursimi ose anulimi i mëvonshëm nuk e fshin një hap të arritur. Kjo tabelë nuk është raport i të ardhurave ose bilanc i fondeve.</p>
        {!funnel.coherent && <p role="alert" className="mt-3 text-sm text-red-800">Numrat kërkojnë kontroll të integritetit para interpretimit.</p>}
      </Panel>
      <Panel>
        <Link href="/admin/perdoruesit" className="mr-5 text-gold-dark">
          {pending} profile në shqyrtim
        </Link>
        <Link href="/admin/mbeshtetja" className="text-gold-dark">
          {tickets} biseda të hapura
        </Link>
      </Panel>
      <Panel>
        <h2 className="mb-3 text-lg font-bold">
          Veprimet në 30 ditët e fundit
        </h2>
        <p className="mb-3 text-sm text-muted">
          Numër ngjarjesh të regjistruara; këto nuk janë norma konvertimi ose
          vizitorë unikë.
        </p>
        {events.map((e) => (
          <p key={e.action}>
            {e.action}: {e._count}
          </p>
        ))}
        {!events.length && <p>Nuk ka ngjarje të regjistruara ende.</p>}
      </Panel>
      <Panel>
        <h2 className="mb-3 text-lg font-bold">Gjendja operative</h2>
        <p>Pagesat: {paymentsReady() ? "Vetëm provë" : "Të çaktivizuara"}</p>
        <p>
          Emaili:{" "}
          {process.env.EMAIL_DELIVERY_ENABLED === "true" &&
          process.env.RESEND_API_KEY &&
          process.env.EMAIL_FROM
            ? "Konfiguruar; verifikoni dorëzimin"
            : "Kërkon konfigurim"}
        </p>
        <p>{failedMail} email-e kërkojnë shqyrtim</p>
        <p>
          Kontrolli periodik:{" "}
          {heartbeat
            ? JSON.stringify(heartbeat.value)
            : "Nuk ka ekzekutim të regjistruar"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Ky panel nuk provon funksionimin e bankës, emailit ose ngarkimit të
          dokumenteve. Kontrollet e plota mbahen në planin e lançimit.
        </p>
      </Panel>
    </Frame>
  );
}

import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { money, stateLabel, dateTime } from "@/lib/format";
import Frame, { Panel } from "./Frame";
import ApiForm from "./ApiForm";
export default async function Dashboard({
  pro,
  view = "home",
  page = 1,
}: {
  pro: boolean;
  view?:
    | "home"
    | "requests"
    | "offers"
    | "messages"
    | "jobs"
    | "payments"
    | "notifications";
  page?: number;
}) {
  const actor = await pageGuard(pro ? "PRO" : "CLIENT");
  const base = pro ? "/pro" : "/llogaria";
  const titles = {
    home: "Paneli im",
    requests: "Kërkesat e mia",
    offers: "Ofertat e mia",
    messages: "Bisedat e mia",
    jobs: "Punët e mia",
    payments: "Pagesat dhe të ardhurat",
    notifications: "Njoftimet",
  };
  if (view === "notifications") {
    const notifications = await db.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: (page - 1) * 50,
    });
    return (
      <Frame actor={actor} title={titles[view]}>
        <Panel>
          {!notifications.length && <p>Nuk ka njoftime ende.</p>}
          {notifications.map((n) => (
            <article
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4"
            >
              <div>
                <Link
                  className={n.readAt ? "text-muted" : "font-bold"}
                  href={n.href}
                >
                  {n.title}
                </Link>
                <p className="text-xs text-muted">{dateTime(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <ApiForm
                  endpoint="/api/notifications"
                  values={{ ids: [n.id] }}
                  label="Shëno si të lexuar"
                />
              )}
            </article>
          ))}
          <Pager page={page} more={notifications.length === 50} />
        </Panel>
      </Frame>
    );
  }
  if (view === "payments") {
    const payments = await db.payment.findMany({
      where: {
        request: { acceptedProfileId: actor.proProfile?.id ?? "missing" },
      },
      include: {
        request: { select: { id: true, title: true } },
        payouts: {
          select: { id: true, state: true, amount: true, paidAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: (page - 1) * 50,
    });
    return (
      <Frame
        actor={actor}
        title={titles[view]}
        subtitle="Shumat bazohen vetëm në pagesat e regjistruara. Transferimi te ofruesi i pagesave dhe pagesa në bankë janë hapa të veçantë."
      >
        <Panel>
          {!payments.length && <p>Nuk keni pagesa të regjistruara ende.</p>}
          {payments.map((p) => (
            <article key={p.id} className="border-b border-line py-4">
              <Link
                className="font-bold"
                href={`${base}/kerkesat/${p.requestId}`}
              >
                {p.request.title}
              </Link>
              <p className="mt-2">
                {money(p.amount)} · {stateLabel(p.state)}
              </p>
              <p className="text-sm text-muted">
                Komisioni: {money(p.commissionAmount)} · Pjesa juaj:{" "}
                {money(p.proAmount)}
              </p>
              {p.payouts.map((payout) => (
                <p key={payout.id} className="text-sm">
                  {stateLabel(payout.state)}: {money(payout.amount)}
                </p>
              ))}
            </article>
          ))}
          <Pager page={page} more={payments.length === 50} />
        </Panel>
      </Frame>
    );
  }
  const scope: Prisma.ServiceRequestWhereInput = pro
    ? { selectedProfileId: actor.proProfile?.id ?? "missing" }
    : { clientId: actor.id };
  const where: Prisma.ServiceRequestWhereInput = {
    ...scope,
    ...(view === "offers"
      ? { quotes: { some: {} } }
      : view === "jobs"
        ? { state: { in: ["BOOKED", "IN_PROGRESS", "COMPLETED", "DISPUTED"] } }
        : {}),
  };
  const [requests, count, unread] = await Promise.all([
    db.serviceRequest.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
      select: {
        id: true,
        title: true,
        state: true,
        city: true,
        updatedAt: true,
        conversation: {
          select: {
            _count: {
              select: {
                messages: {
                  where: { readAt: null, senderId: { not: actor.id } },
                },
              },
            },
          },
        },
        quotes: {
          orderBy: { revision: "desc" },
          take: 1,
          select: { amount: true, state: true },
        },
      },
    }),
    db.serviceRequest.count({ where }),
    db.notification.count({ where: { userId: actor.id, readAt: null } }),
  ]);
  return (
    <Frame
      actor={actor}
      title={titles[view]}
      subtitle={
        pro
          ? "Kërkesa private të dërguara vetëm te ju."
          : "Kërkesat, ofertat dhe bisedat tuaja në një vend."
      }
    >
      {view === "home" && (
        <Panel>
          <div className="flex flex-wrap justify-between gap-4">
            <p>
              {count} kërkesa ·{" "}
              <Link className="text-gold-dark" href={`${base}/njoftimet`}>
                {unread} njoftime të palexuara
              </Link>
            </p>
            {!pro && (
              <Link className="font-semibold text-gold-dark" href="/kerko">
                Gjej një profesionist →
              </Link>
            )}
          </div>
          {pro && actor.proProfile?.verification !== "APPROVED" && (
            <p className="mt-3 rounded-xl bg-honey p-3">
              Profili juaj është në shqyrtim. Përfundoni profilin dhe dokumentet
              për miratim.
            </p>
          )}
          {!actor.emailVerified && (
            <div className="mt-4">
              <p className="mb-2 text-sm">
                Verifikoni emailin për të përgatitur llogarinë tuaj për pagesa.
              </p>
              <ApiForm
                endpoint="/api/auth/resend"
                label="Dërgo emailin e verifikimit"
              />
            </div>
          )}
        </Panel>
      )}
      <Panel>
        {!requests.length && (
          <div>
            <h2 className="font-bold">Nuk ka kërkesa në këtë listë ende.</h2>
            <p className="mt-2 text-muted">
              {pro
                ? "Klientët mund t’ju kontaktojnë pasi profili juaj të miratohet."
                : "Kërkoni një shërbim, zgjidhni një profesionist dhe dërgoni detajet e punës."}
            </p>
            {!pro && (
              <Link href="/kerko" className="mt-4 inline-block text-gold-dark">
                Gjej profesionistë
              </Link>
            )}
          </div>
        )}
        {requests.map((r) => (
          <article key={r.id} className="border-b border-line py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link
                href={`${base}/kerkesat/${r.id}`}
                className="text-lg font-bold"
              >
                {r.title}
              </Link>
              <span className="rounded-full bg-honey px-3 py-1 text-xs">
                {stateLabel(r.state)}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {r.city} · {dateTime(r.updatedAt)}
            </p>
            {r.quotes[0] && (
              <p className="mt-1 text-sm">
                Oferta: {money(r.quotes[0].amount)} ·{" "}
                {stateLabel(r.quotes[0].state)}
              </p>
            )}
            {Boolean(r.conversation?._count.messages) && (
              <p className="mt-1 text-sm font-semibold">
                {r.conversation?._count.messages} mesazhe të palexuara
              </p>
            )}
            <Link
              href={`${base}/kerkesat/${r.id}`}
              className="mt-3 inline-block text-sm text-gold-dark"
            >
              Hap kërkesën dhe bisedën →
            </Link>
          </article>
        ))}
        <Pager page={page} more={count > page * 30} />
      </Panel>
    </Frame>
  );
}
function Pager({ page, more }: { page: number; more: boolean }) {
  return (
    <nav aria-label="Faqet" className="mt-5 flex gap-5">
      {page > 1 && <Link href={`?page=${page - 1}`}>← Më parë</Link>}
      {more && <Link href={`?page=${page + 1}`}>Tjetër →</Link>}
    </nav>
  );
}

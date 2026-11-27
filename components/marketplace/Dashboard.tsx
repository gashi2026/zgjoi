import Link from "@/components/i18n/Link";
import type { Prisma } from "@prisma/client";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { expireDueOffersFor } from "@/lib/server/offer-expiry";
import { money, stateLabel, dateTime, unreadMessagesLabel, unreadNotificationsLabel } from "@/lib/format";
import Frame, { Panel } from "./Frame";
import ApiForm from "./ApiForm";
import { getT } from "@/lib/i18n/server";
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
  const t = await getT();
  const actor = await pageGuard(pro ? "PRO" : "CLIENT");
  const base = pro ? "/pro" : "/llogaria";
  const titles = {
    home: t("dashboard.myDashboard"),
    requests: t("dashboard.myChats"),
    offers: t("dashboard.myOffers"),
    messages: t("dashboard.myChats"),
    jobs: t("dashboard.myJobs"),
    payments: t("dashboard.paymentsEarnings"),
    notifications: t("dashboard.notifications"),
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
          {!notifications.length && <p>{t("dashboard.noNotificationsYet")}</p>}
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
                  {t.tx(n.title)}
                </Link>
                <p className="text-xs text-muted">{dateTime(n.createdAt, t.locale)}</p>
              </div>
              {!n.readAt && (
                <ApiForm
                  endpoint="/api/notifications"
                  values={{ ids: [n.id] }}
                  label={t("dashboard.markRead")}
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
        subtitle={t("dashboard.amountsBasedOnlyRecorded")}
      >
        <Panel>
          {!payments.length && <p>{t("dashboard.dontHaveAnyRecorded")}</p>}
          {payments.map((p) => (
            <article key={p.id} className="border-b border-line py-4">
              <Link
                className="font-bold"
                href={`${base}/kerkesat/${p.requestId}`}
              >
                {t.tx(p.request.title)}
              </Link>
              <p className="mt-2">
                {money(p.amount, t.locale)} · {t.tx(stateLabel(p.state))}
              </p>
              <p className="text-sm text-muted">
                {t("dashboard.commissionShare", { amount: money(p.commissionAmount, t.locale) })}{" "}
                {money(p.proAmount, t.locale)}
              </p>
              {p.payouts.map((payout) => (
                <p key={payout.id} className="text-sm">
                  {t.tx(stateLabel(payout.state))}: {money(payout.amount, t.locale)}
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
  // Offers past their deadline must not keep showing as "Dërguar" when the
  // maintenance cron has not run (e.g. Preview).
  await expireDueOffersFor(scope);
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
          ? t("dashboard.privateChatsCustomersWho")
          : t("dashboard.chatsOffersJobsOne")
      }
    >
      {view === "home" && (
        <Panel>
          <div className="flex flex-wrap justify-between gap-4">
            <p>
              {count} {count === 1 ? t("dashboard.chat") : "biseda"} ·{" "}
              <Link className="text-gold-dark" href={`${base}/njoftimet`}>
                {t.tx(unreadNotificationsLabel(unread))}
              </Link>
            </p>
            {!pro && (
              <Link className="font-semibold text-gold-dark" href="/kerko">
                {t("dashboard.findPro")}</Link>
            )}
          </div>
          {pro && actor.proProfile?.verification !== "APPROVED" && (
            <p className="mt-3 rounded-xl bg-honey p-3">
              {t("dashboard.profileUnderReviewComplete")}</p>
          )}
          {!actor.emailVerified && (
            <div className="mt-4">
              <p className="mb-2 text-sm">
                {t("dashboard.verifyEmailGetAccount")}</p>
              <ApiForm
                endpoint="/api/auth/resend"
                label={t("dashboard.sendVerificationEmail")}
              />
            </div>
          )}
        </Panel>
      )}
      <Panel>
        {!requests.length && (
          <div>
            <h2 className="font-bold">{t("dashboard.noChatsListYet")}</h2>
            <p className="mt-2 text-muted">
              {pro
                ? t("dashboard.customersCanContactOnce")
                : t("dashboard.findProStartChat")}
            </p>
            {!pro && (
              <Link href="/kerko" className="mt-4 inline-block text-gold-dark">
                {t("dashboard.findPros")}</Link>
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
                {t.tx(r.title)}
              </Link>
              <span className="rounded-full bg-honey px-3 py-1 text-xs">
                {t.tx(stateLabel(r.state))}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {r.city} · {dateTime(r.updatedAt, t.locale)}
            </p>
            {r.quotes[0] && (
              <p className="mt-1 text-sm">
                {t("dashboard.offer", { amount: money(r.quotes[0].amount, t.locale) })}{" "}
                {t.tx(stateLabel(r.quotes[0].state))}
              </p>
            )}
            {Boolean(r.conversation?._count.messages) && (
              <p className="mt-1 text-sm font-semibold">
                {t.tx(unreadMessagesLabel(r.conversation?._count.messages ?? 0))}
              </p>
            )}
            <Link
              href={`${base}/kerkesat/${r.id}`}
              className="mt-3 inline-block text-sm text-gold-dark"
            >
              {t("dashboard.openChat")}</Link>
          </article>
        ))}
        <Pager page={page} more={count > page * 30} />
      </Panel>
    </Frame>
  );
}
async function Pager({ page, more }: { page: number; more: boolean }) {
  const t = await getT();
  return (
    <nav aria-label={t("dashboard.pages")} className="mt-5 flex gap-5">
      {page > 1 && <Link href={`?page=${page - 1}`}>{t("dashboard.previous")}</Link>}
      {more && <Link href={`?page=${page + 1}`}>{t("dashboard.next")}</Link>}
    </nav>
  );
}

import Link from "@/components/i18n/Link";
import { db } from "@/lib/server/db";
import { pageGuard } from "@/lib/server/guard";
import { money, dateTime, stateLabel } from "@/lib/format";
import { paymentsReady } from "@/lib/server/payments";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { hoursLabel, ESTIMATE_PRO_SHARE_CENTS, ESTIMATE_PLATFORM_SHARE_CENTS } from "@/lib/book-now";
import { estimateStateLabels } from "@/lib/estimate-labels";
import { getT } from "@/lib/i18n/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getT();
  const actor = await pageGuard("ADMIN");
  const page = Math.min(
    1000,
    Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1),
  );
  const payments = await db.payment.findMany({
    include: {
      request: {
        select: {
          title: true,
          state: true,
          completedAt: true,
          client: { select: { name: true } },
          acceptedPro: { select: { user: { select: { name: true } } } },
          booking: {
            select: {
              minutes: true, hourlyRateCents: true, startsAt: true, status: true, dueCents: true, creditCents: true,
              changes: { where: { todoKind: { not: null } }, orderBy: { createdAt: "asc" },
                select: { id: true, todoKind: true, todoCents: true, todoDoneAt: true, note: true, createdAt: true } },
            },
          },
        },
      },
      dispute: true,
      payouts: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: (page - 1) * 50,
  });
  const todos = await db.bookingChange.findMany({
    where: { todoKind: { not: null }, todoDoneAt: null },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { booking: { select: { requestId: true, request: { select: { title: true, client: { select: { name: true } } } } } } },
  });
  const disputeTodos = await db.dispute.findMany({
    where: { todoKind: { not: null }, todoDoneAt: null },
    orderBy: { resolvedAt: "asc" },
    take: 50,
    include: { payment: { select: { request: { select: { title: true, client: { select: { name: true } } } } } } },
  });
  // Paid estimate visits (step 4): mark paid in the beta, refund or cancel.
  const estimates = await db.estimate.findMany({
    where: { state: { in: ["PENDING", "PAID"] } }, orderBy: { createdAt: "asc" }, take: 50,
    include: { profile: { select: { user: { select: { name: true } } } } },
  });
  const estimateClients = new Map((await db.user.findMany({ where: { id: { in: estimates.map(e => e.clientId) } }, select: { id: true, name: true } })).map(u => [u.id, u.name]));
  const due = (p: (typeof payments)[number]) => Math.max(0, p.amount - p.estimateCreditCents);
  return (
    <Frame
      actor={actor}
      title={t("admin.paymentsDisputes")}
      subtitle={t("admin.paymentStatusOnlyChanges")}
    >
      <Panel>
        <p>
          {paymentsReady()
            ? t("admin.stripeTestEnvironmentNo")
            : t("admin.onlinePaymentsSwitchedOff")}
        </p>
      </Panel>
      <Panel>
        <h2 className="text-lg font-bold">{t("admin.estimateVisits")}</h2>
        <p className="mt-1 text-sm text-muted">{t("admin.whenCustomerPaysEstimate", { amount: money(ESTIMATE_PRO_SHARE_CENTS, t.locale), amount2: money(ESTIMATE_PLATFORM_SHARE_CENTS, t.locale) })}</p>
        {!estimates.length && <p className="mt-3 text-sm">{t("admin.noPendingUnusedEstimates")}</p>}
        {estimates.map((e) => (
          <div key={e.id} className="mt-4 rounded-xl bg-cream p-3">
            <p className="font-semibold">
              {t("admin.estimate2", { amount: money(e.amountCents, t.locale) })}{" "}{estimateClients.get(e.clientId) ?? t("admin.customer")} → {e.profile.user.name} · {t.tx(estimateStateLabels[e.state]) ?? e.state}
            </p>
            <p className="text-xs text-muted">{t("admin.requested", { date: dateTime(e.createdAt, t.locale) })}{e.visitAt ? ` · vizita ${dateTime(e.visitAt, t.locale)}` : ""}{e.paidAt ? ` · paguar ${dateTime(e.paidAt, t.locale)}` : ""}</p>
            {e.proShareCents != null && e.platformShareCents != null && (
              <p className="text-sm">{t("admin.splitIfNotHired")}{" "}<strong>{money(e.proShareCents, t.locale)}</strong> {" "}{t("admin.to", { name: e.profile.user.name })}{" "}<strong>{money(e.platformShareCents, t.locale)}</strong> Zgjoi</p>
            )}
            {e.state === "PENDING" ? (
              <div className="mt-2 space-y-2">
                <ApiForm endpoint="/api/admin/estimates" values={{ id: e.id, action: "MARK_PAID" }} label={t("admin.markPaid")}
                  fields={[{ name: "reason", label: t("admin.howWasPaidE"), required: true, minLength: 10, maxLength: 500 }]} />
                <details><summary className="cursor-pointer text-sm">{t("admin.cancelRequest")}</summary>
                  <ApiForm endpoint="/api/admin/estimates" values={{ id: e.id, action: "CANCEL" }} label={t("admin.cancel")}
                    fields={[{ name: "reason", label: t("admin.reason"), required: true, minLength: 10, maxLength: 500 }]} /></details>
              </div>
            ) : (
              <details className="mt-2"><summary className="cursor-pointer text-sm">{t("admin.refundVisitDidntHappen")}</summary>
                <ApiForm endpoint="/api/admin/estimates" values={{ id: e.id, action: "REFUND" }} label={t("admin.markRefunded")}
                  fields={[{ name: "reason", label: t("admin.howWasRefundedWhy"), required: true, minLength: 10, maxLength: 500 }]} /></details>
            )}
          </div>
        ))}
      </Panel>
      <Panel>
        <h2 className="text-lg font-bold">{t("admin.tasksRefundsFeesCredits")}</h2>
        <p className="mt-1 text-sm text-muted">{t("admin.duringBetaNoMoney")}</p>
        {!todos.length && !disputeTodos.length && <p className="mt-3 text-sm">{t("admin.noOpenTasks")}</p>}
        {disputeTodos.map((todo) => (
          <div key={todo.id} className="mt-4 rounded-xl bg-cream p-3">
            <p className="font-semibold">
              {t("admin.disputeTodo", { kind: todo.todoKind === "REFUND" ? t("admin.refundCustomer") : t("admin.creditCustomer"), amount: money(todo.todoCents ?? 0, t.locale), title: todo.payment.request.title, client: todo.payment.request.client.name })}
            </p>
            {todo.resolution && <p className="text-sm">{t.tx(todo.resolution)}</p>}
            <Link className="text-xs text-gold-dark" href={`/admin/kontestet/${todo.id}`}>{t("admin.viewDispute")}</Link>
            <ApiForm endpoint="/api/admin/disputes" values={{ id: todo.id, action: "TODO_DONE" }} label={t("admin.markDone")}
              fields={[{ name: "reason", label: t("admin.howWasDoneE"), required: true, minLength: 5, maxLength: 500 }]} />
          </div>
        ))}
        {todos.map((todo) => (
          <div key={todo.id} className="mt-4 rounded-xl bg-cream p-3">
            <p className="font-semibold">
              {todo.todoKind === "REFUND" ? t("admin.refundCustomer") : t("admin.collectFromCustomer")}: {money(todo.todoCents ?? 0, t.locale)} · {t.tx(todo.booking.request.title)} · {todo.booking.request.client.name}
            </p>
            {todo.note && <p className="text-sm">{t.tx(todo.note)}</p>}
            <p className="text-xs text-muted">{dateTime(todo.createdAt, t.locale)}</p>
            <ApiForm endpoint="/api/admin/bookings" values={{ id: todo.id, action: "TODO_DONE" }} label={t("admin.markDone")}
              fields={[{ name: "reason", label: t("admin.howWasDoneE"), required: true, minLength: 5, maxLength: 500 }]} />
          </div>
        ))}
      </Panel>
      {!payments.length && <Panel>{t("admin.noPaymentsRecorded")}</Panel>}
      {payments.map((p) => (
        <Panel key={p.id}>
          <h2 className="text-lg font-bold">{t.tx(p.request.title)}</h2>
          <p className="mt-2">
            {p.request.client.name} → {p.request.acceptedPro?.user.name ?? "—"}
          </p>
          <p className="mt-2">
            {money(p.amount, t.locale)} · {t.tx(stateLabel(p.state))} · {dateTime(p.createdAt, t.locale)}
          </p>
          {p.request.booking && (
            <p className="text-sm">
              {t("admin.bookNowHrStarts2", { label: t.tx(hoursLabel(p.request.booking.minutes)), amount: money(p.request.booking.hourlyRateCents, t.locale) })}{" "}
              {dateTime(p.request.booking.startsAt, t.locale)}{p.request.booking.status === "CANCELLED" && " · Anuluar"}
            </p>
          )}
          {p.estimateCreditCents > 0 && (
            <p className="text-sm">{t("admin.estimateCreditCustomerPays", { amount: money(Math.min(p.estimateCreditCents, p.amount), t.locale), amount2: money(due(p), t.locale) })}</p>
          )}
          <p className="text-sm text-muted">
            {t("admin.method")}{" "}{p.method === "OFFLINE" ? t("admin.outsidePlatformBeta") : p.method} {" "}{t("admin.commissionRecordedCollectedLater", { amount: money(p.commissionAmount, t.locale) })}{" "}
            {money(p.proAmount, t.locale)} · {t.tx(stateLabel(p.request.state))}
          </p>
          {p.operation && (
            <p className="mt-2 font-semibold">
              {t("admin.actionAwaitingConfirmationCheck", { operation: p.operation })}</p>
          )}
          {p.dispute && (
            <div className="mt-3 rounded-xl bg-cream p-3">
              <h3 className="font-bold"><Link href={`/admin/kontestet/${p.dispute.id}`}>{t("admin.dispute")}</Link></h3>
              <p className="whitespace-pre-wrap">{t.tx(p.dispute.reason)}</p>
              <p>{p.dispute.resolution || t("admin.notResolvedYet")}</p>
            </div>
          )}
          {p.payouts.map((out) => (
            <p key={out.id} className="mt-2 text-sm">
              {t.tx(stateLabel(out.state))}: {money(out.amount, t.locale)}
            </p>
          ))}
          {p.provider === "offline" && (
            <p className="mt-2 text-sm font-semibold">
              {t("admin.markedPaidOutsidePlatform")}{" "}
              {p.heldAt ? dateTime(p.heldAt, t.locale) : "—"}{t("admin.transferProDoneManually")}</p>
          )}
          {p.state === "PENDING" &&
            p.provider === "disabled" &&
            !p.providerCheckoutId &&
            !p.operation &&
            !p.dispute &&
            p.request.state === "BOOKED" && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">
                  {t("admin.markPaidBetaNo")}</summary>
                <ApiForm
                  endpoint="/api/admin/payments"
                  values={{ id: p.id, action: "MARK_PAID_OFFLINE" }}
                  label={t("admin.markPaid")}
                  confirmation={t("admin.confirmCustomerPaidOutside", { amount: money(due(p), t.locale) })}
                  fields={[
                    {
                      name: "reason",
                      label: t("admin.howWasPaidE2"),
                      type: "textarea",
                      minLength: 10,
                      maxLength: 500,
                      required: true,
                    },
                  ]}
                />
              </details>
            )}
          {paymentsReady() &&
            p.provider === "stripe_test" &&
            p.state === "HELD" &&
            p.request.state === "COMPLETED" &&
            p.request.completedAt &&
            !p.dispute && (
              <div className="mt-4">
                <ApiForm
                  endpoint="/api/admin/payments"
                  values={{ id: p.id, action: "RELEASE" }}
                  label={t("admin.transferProsShareTest")}
                  confirmation={t("admin.customerHasConfirmedCompletion")}
                />
              </div>
            )}
          {paymentsReady() &&
            p.provider === "stripe_test" &&
            ["HELD", "DISPUTED", "REFUND_PENDING"].includes(p.state) &&
            !p.stripeTransferId && (
              <details className="mt-4">
                <summary>{t("admin.fullRefundTest")}</summary>
                <ApiForm
                  endpoint="/api/admin/payments"
                  values={{ id: p.id, action: "REFUND" }}
                  label={t("admin.issueRefund")}
                  confirmation={t("admin.issueFullRefundCustomer")}
                  fields={[
                    {
                      name: "reason",
                      label: t("admin.reasonReviewOutcome"),
                      type: "textarea",
                      minLength: 20,
                      maxLength: 1000,
                      required: true,
                    },
                  ]}
                />
              </details>
            )}
        </Panel>
      ))}
      <nav className="flex gap-4">
        {page > 1 && <Link href={`?page=${page - 1}`}>{t("admin.previous")}</Link>}
        {payments.length === 50 && (
          <Link href={`?page=${page + 1}`}>{t("admin.next")}</Link>
        )}
      </nav>
    </Frame>
  );
}

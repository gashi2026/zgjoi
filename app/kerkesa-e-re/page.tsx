import { localRedirect } from "@/lib/i18n/redirect";
import Link from "@/components/i18n/Link";
import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { dateTime, stateLabel } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { IdGate } from "@/components/verification/IdNotice";
import { getT } from "@/lib/i18n/server";
/** Chat-then-hire: the customer opens a private chat with one chosen pro and
 * describes the job as the first message. There is no public job posting. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pro?: string }>;
}) {
  const t = await getT();
  const actor = await pageGuard("CLIENT");
  const { pro: id } = await searchParams;
  if (!id) return localRedirect("/kerko");
  const pro = await publicProfile(id);
  if (!pro) notFound();
  const open = await db.serviceRequest.findMany({
    where: {
      clientId: actor.id,
      selectedProfileId: pro.id,
      state: { in: ["OPEN", "QUOTED", "BOOKED", "IN_PROGRESS"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, title: true, state: true, updatedAt: true },
  });
  return (
    <Frame
      actor={actor}
      title={t("newChat.chat", { name: pro.user.name })}
      subtitle={t("newChat.chatPrivateOnlyCan", { name: pro.user.name })}
    >
      {open.length > 0 && (
        <Panel>
          <h2 className="font-bold">{t("newChat.alreadyHaveOpenChats", { name: pro.user.name })}</h2>
          <ul className="mt-3 space-y-2">
            {open.map((r) => (
              <li key={r.id}>
                <Link className="font-semibold text-gold-dark" href={`/llogaria/kerkesat/${r.id}`}>
                  {t.tx(r.title)} →
                </Link>
                <span className="ml-2 text-xs text-muted">
                  {t.tx(stateLabel(r.state))} · {dateTime(r.updatedAt, t.locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">{t("newChat.differentJobStartNew")}</p>
        </Panel>
      )}
      <Panel>
        <h2 className="mb-1 text-lg font-bold">{t("newChat.describeJob")}</h2>
        <p className="mb-4 text-sm text-muted">
          {t("newChat.firstMessageRepliesChat", { name: pro.user.name })}</p>
        <IdGate actor={actor}>
        <ApiForm
          endpoint="/api/requests"
          idempotent
          values={{ profileId: pro.id }}
          label={t("newChat.startChat")}
          fields={[
            {
              name: "detail",
              label: t("newChat.whatJobDoNeed"),
              type: "textarea",
              required: true,
              minLength: 20,
              maxLength: 4000,
              hint: t("newChat.dontIncludePhoneNumber"),
            },
            {
              name: "city",
              label: t("newChat.city"),
              value: actor.city ?? "",
              required: true,
              maxLength: 60,
            },
            {
              name: "timing",
              label: t("newChat.whenDoNeedOptional"),
              maxLength: 120,
            },
            {
              name: "address",
              label: "Adresa (opsionale)",
              maxLength: 200,
              hint: t("newChat.shownProOncePayment"),
            },
          ]}
        />
        </IdGate>
      </Panel>
    </Frame>
  );
}

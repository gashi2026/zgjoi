import { dateTime, clockTime } from "@/lib/format";
import { contactLabels, waitMinutesLeft, ARRIVAL_RADIUS_M, HELPLINE_WAIT_MINUTES, type ContactResult } from "@/lib/arrival";
import ApiForm from "./ApiForm";
import { Panel } from "./Frame";
import { getT } from "@/lib/i18n/server";

export const arrivalAdminSelect = {
  id: true, checkedInAt: true, lat: true, lng: true, accuracyM: true, distanceM: true, method: true, photoSize: true,
  helplineAt: true, waitEndsAt: true, contactResult: true, contactNote: true, contactAt: true,
} as const;
export type ArrivalAdminView = {
  checkedInAt: Date; lat: number; lng: number; accuracyM: number | null; distanceM: number | null; method: string; photoSize: number | null;
  helplineAt: Date | null; waitEndsAt: Date | null; contactResult: string | null; contactNote: string | null; contactAt: Date | null;
};

/** Arrita evidence for admins: check-in, distance, photo, helpline tap, timer and contact log. */
export default async function ArrivalAdminPanel({ requestId, startsAt, siteGeocode, arrival, active }: {
  requestId: string; startsAt: Date; siteGeocode: string | null; arrival: ArrivalAdminView | null; active: boolean;
}) {
  const t = await getT();
  const now = new Date();
  const left = waitMinutesLeft(arrival, now);
  return (
    <Panel>
      <h2 className="text-lg font-bold">{t("arrivalAdminPanel.checkProofPresence")}</h2>
      {!arrival ? (
        <p className="mt-2 text-sm text-muted">{t("arrivalAdminPanel.proHasntCheckedIve", { date: dateTime(startsAt, t.locale) })}{siteGeocode === "OK" ? "" : t("arrivalAdminPanel.addressWasntFoundMap")}</p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">{t("arrivalAdminPanel.arrivedServerTime")}</dt>
            <dd className="font-semibold">{t("arrivalAdminPanel.minFromStart", { date: dateTime(arrival.checkedInAt, t.locale), value: Math.round((arrival.checkedInAt.getTime() - startsAt.getTime()) / 60_000) })}</dd></div>
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">{t("arrivalAdminPanel.distanceFromAddress")}</dt>
            <dd className="font-semibold">{arrival.distanceM === null ? t("arrivalAdminPanel.addressWithoutCoordinates") : `${arrival.distanceM} m${arrival.distanceM <= ARRIVAL_RADIUS_M ? " (brenda 200 m)" : " (mbi 200 m)"}`}
              {arrival.accuracyM !== null ? t("arrivalAdminPanel.gpsAccuracyM", { accuracyM: arrival.accuracyM }) : ""}</dd></div>
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">{t("arrivalAdminPanel.method")}</dt>
            <dd className="font-semibold">{arrival.method === "GPS" ? t("arrivalAdminPanel.location") : t("arrivalAdminPanel.photoLocationOutRange")}</dd>
            <dd className="text-xs text-muted">{t("arrivalAdminPanel.coordinatesAdminOnly", { value: arrival.lat.toFixed(5), value2: arrival.lng.toFixed(5) })}</dd></div>
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">{t("arrivalAdminPanel.zgjoiHelpline")}</dt>
            <dd className="font-semibold">{arrival.helplineAt ? t("arrivalAdminPanel.calledAt", { time: clockTime(arrival.helplineAt, t.locale), rest: left > 0 ? t("arrivalAdminPanel.waitingMinLeft", { left: left }) : t("arrivalAdminPanel.minWaitEnded", { HELPLINE_WAIT_MINUTES: HELPLINE_WAIT_MINUTES, value: arrival.waitEndsAt ? clockTime(arrival.waitEndsAt, t.locale) : "" }) }) : t("arrivalAdminPanel.notCalled")}</dd></div>
          {arrival.photoSize ? (
            <div className="rounded-xl bg-cream p-3 sm:col-span-2"><dt className="text-xs text-muted">{t("arrivalAdminPanel.photoAddress")}</dt>
              {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated photo route */}
              <dd><img src={`/api/bookings/${requestId}/arrival/photo`} alt={t("arrivalAdminPanel.prosPhotoAddress")} className="mt-2 max-h-72 rounded-xl border border-line" /></dd></div>
          ) : null}
          <div className="rounded-xl bg-cream p-3 sm:col-span-2"><dt className="text-xs text-muted">{t("arrivalAdminPanel.contactCustomer")}</dt>
            <dd className="font-semibold">{arrival.contactResult ? `${t.tx(contactLabels[arrival.contactResult as ContactResult]) ?? arrival.contactResult}${arrival.contactAt ? ` · ${clockTime(arrival.contactAt, t.locale)}` : ""}` : t("arrivalAdminPanel.noNoteYet")}</dd>
            {arrival.contactNote && <dd className="text-sm">{arrival.contactNote}</dd>}</div>
        </dl>
      )}
      {arrival?.helplineAt && active && (
        <div className="mt-4">
          <ApiForm endpoint="/api/admin/arrival" values={{ requestId }} label={t("arrivalAdminPanel.saveContactResult")}
            confirmation={t("arrivalAdminPanel.saveResultTheyCancelled")}
            fields={[
              { name: "result", label: t("arrivalAdminPanel.resultContactingCustomer"), type: "select", required: true, value: arrival.contactResult ?? "NO_ANSWER",
                options: Object.entries(contactLabels).map(([value, label]) => ({ value, label })) },
              { name: "note", label: t("arrivalAdminPanel.noteOptional"), type: "textarea", maxLength: 500 },
            ]} />
        </div>
      )}
    </Panel>
  );
}

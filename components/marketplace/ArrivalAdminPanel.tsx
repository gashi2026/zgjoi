import { dateTime, clockTime } from "@/lib/format";
import { contactLabels, waitMinutesLeft, ARRIVAL_RADIUS_M, HELPLINE_WAIT_MINUTES, type ContactResult } from "@/lib/arrival";
import ApiForm from "./ApiForm";
import { Panel } from "./Frame";

export const arrivalAdminSelect = {
  id: true, checkedInAt: true, lat: true, lng: true, accuracyM: true, distanceM: true, method: true, photoSize: true,
  helplineAt: true, waitEndsAt: true, contactResult: true, contactNote: true, contactAt: true,
} as const;
export type ArrivalAdminView = {
  checkedInAt: Date; lat: number; lng: number; accuracyM: number | null; distanceM: number | null; method: string; photoSize: number | null;
  helplineAt: Date | null; waitEndsAt: Date | null; contactResult: string | null; contactNote: string | null; contactAt: Date | null;
};

/** Arrita evidence for admins: check-in, distance, photo, helpline tap, timer and contact log. */
export default function ArrivalAdminPanel({ requestId, startsAt, siteGeocode, arrival, active }: {
  requestId: string; startsAt: Date; siteGeocode: string | null; arrival: ArrivalAdminView | null; active: boolean;
}) {
  const now = new Date();
  const left = waitMinutesLeft(arrival, now);
  return (
    <Panel>
      <h2 className="text-lg font-bold">Arrita · prova e paraqitjes</h2>
      {!arrival ? (
        <p className="mt-2 text-sm text-muted">Profesionisti nuk ka shënuar “Arrita”. Fillimi: {dateTime(startsAt)}.{siteGeocode === "OK" ? "" : " Adresa nuk është gjetur në hartë; arritja kërkon foto."}</p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">Arriti (ora e serverit)</dt>
            <dd className="font-semibold">{dateTime(arrival.checkedInAt)} · {Math.round((arrival.checkedInAt.getTime() - startsAt.getTime()) / 60_000)} min nga fillimi</dd></div>
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">Largësia nga adresa</dt>
            <dd className="font-semibold">{arrival.distanceM === null ? "Adresa pa koordinata" : `${arrival.distanceM} m${arrival.distanceM <= ARRIVAL_RADIUS_M ? " (brenda 200 m)" : " (mbi 200 m)"}`}
              {arrival.accuracyM !== null ? ` · saktësia e GPS ±${arrival.accuracyM} m` : ""}</dd></div>
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">Mënyra</dt>
            <dd className="font-semibold">{arrival.method === "GPS" ? "Vendndodhje" : "Foto (vendndodhja jashtë rrezes ose adresa pa koordinata)"}</dd>
            <dd className="text-xs text-muted">Koordinatat: {arrival.lat.toFixed(5)}, {arrival.lng.toFixed(5)} (vetëm për administratën)</dd></div>
          <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-muted">Ndihma e Zgjoi</dt>
            <dd className="font-semibold">{arrival.helplineAt ? `Thirrur ${clockTime(arrival.helplineAt)} · ${left > 0 ? `pritja: ${left} min të mbetura` : `pritja ${HELPLINE_WAIT_MINUTES} min përfundoi ${arrival.waitEndsAt ? clockTime(arrival.waitEndsAt) : ""}`}` : "Nuk është thirrur"}</dd></div>
          {arrival.photoSize ? (
            <div className="rounded-xl bg-cream p-3 sm:col-span-2"><dt className="text-xs text-muted">Fotoja te adresa</dt>
              {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated photo route */}
              <dd><img src={`/api/bookings/${requestId}/arrival/photo`} alt="Fotoja e profesionistit te adresa" className="mt-2 max-h-72 rounded-xl border border-line" /></dd></div>
          ) : null}
          <div className="rounded-xl bg-cream p-3 sm:col-span-2"><dt className="text-xs text-muted">Kontakti me klientin</dt>
            <dd className="font-semibold">{arrival.contactResult ? `${contactLabels[arrival.contactResult as ContactResult] ?? arrival.contactResult}${arrival.contactAt ? ` · ${clockTime(arrival.contactAt)}` : ""}` : "Ende pa shënim"}</dd>
            {arrival.contactNote && <dd className="text-sm">{arrival.contactNote}</dd>}</div>
        </dl>
      )}
      {arrival?.helplineAt && active && (
        <div className="mt-4">
          <ApiForm endpoint="/api/admin/arrival" values={{ requestId }} label="Ruaj rezultatin e kontaktit"
            confirmation="Ruani rezultatin? “Anuloi” zbaton anulimin e vonë të klientit (15 €)."
            fields={[
              { name: "result", label: "Rezultati i kontaktit me klientin", type: "select", required: true, value: arrival.contactResult ?? "NO_ANSWER",
                options: Object.entries(contactLabels).map(([value, label]) => ({ value, label })) },
              { name: "note", label: "Shënim (opsional)", type: "textarea", maxLength: 500 },
            ]} />
        </div>
      )}
    </Panel>
  );
}

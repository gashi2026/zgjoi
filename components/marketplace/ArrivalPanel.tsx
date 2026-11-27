"use client";
import { msgKey } from "@/lib/i18n/translate";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/i18n/client";
import { buttonClass } from "./ApiForm";
import { clockTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

/** Minutes left until `endsAt`, refreshed every 15 seconds. */
export function WaitCountdown({ endsAt, template, done }: { endsAt: string; template: string; done: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 60_000));
  return <span>{left > 0 ? template.replace("{m}", String(left)) : done}</span>;
}

const MAX_SIDE = 1280;
/** Re-encodes the camera photo as a small JPEG (also drops EXIF metadata). */
async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.72, 0.55, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length < 780_000) return url;
  }
  throw new Error(msgKey("arrivalPanel.photoTooLargePlease"));
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(msgKey("arrivalPanel.browserIsntSharingLocation")));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error(msgKey("arrivalPanel.allowLocationAccessZgjoi"))),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  });
}

export type ProArrival = { checkedInAt: string; distanceM: number | null; method: string; helplineAt: string | null; waitEndsAt: string | null; contactResult: string | null };

/** Pro side of Arrita: check in at the address, call the Zgjoi helpline, wait 30 minutes. */
export default function ArrivalPanel({ requestId, startsAt, arrival, whatsapp, contactLabel, canCheckIn }: {
  requestId: string; startsAt: string; arrival: ProArrival | null; whatsapp: string | null; contactLabel: string | null; canCheckIn: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [needsPhoto, setNeedsPhoto] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [helpline, setHelpline] = useState<string | null>(arrival?.helplineAt ?? null);
  const coords = useRef<GeolocationCoordinates | null>(null);
  const endpoint = `/api/bookings/${requestId}/arrival`;

  async function post(body: Record<string, unknown>) {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: !body.photo });
    const result = await res.json().catch(() => ({}));
    return { ok: res.ok && result.ok !== false, result };
  }
  async function checkIn() {
    setPending(true); setMessage("");
    try {
      coords.current ??= (await position()).coords; // the browser asks once
      const { ok, result } = await post({ action: "CHECK_IN", lat: coords.current.latitude, lng: coords.current.longitude,
        accuracy: coords.current.accuracy, ...(photo ? { photo } : {}) });
      if (!ok) {
        if (result.code === "PHOTO_REQUIRED") setNeedsPhoto(true);
        throw new Error(result.message || t("arrivalPanel.checkWasntRecordedPlease"));
      }
      setMessage(result.message);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? t.any(e.message) : t("arrivalPanel.connectionFailedPleaseTry"));
    } finally { setPending(false); }
  }
  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try { setPhoto(await compress(file)); setMessage(t("arrivalPanel.photoAdded")); }
    catch (e) { setMessage(e instanceof Error ? t.any(e.message) : t("arrivalPanel.photoCouldntRead")); }
  }
  async function callHelpline() {
    // The wa.me link opens in a new tab from the click itself; the tap is logged in parallel.
    setPending(true);
    const { ok, result } = await post({ action: "HELPLINE" }).catch(() => ({ ok: false, result: {} as Record<string, string> }));
    setPending(false);
    setMessage(ok ? result.message : result.message || t("arrivalPanel.callWasntRecordedPlease"));
    if (ok) { setHelpline(new Date().toISOString()); router.refresh(); }
  }

  if (!arrival) return (
    <div className="mt-4 rounded-2xl border-2 border-gold bg-honey/40 p-4" aria-label={t("arrivalPanel.iveArrived")}>
      <h3 className="font-bold">{t("arrivalPanel.iveArrived")}</h3>
      <p className="mt-1 text-sm">{t("arrivalPanel.whenGetAddressTap")}</p>
      <p className="mt-1 text-xs text-muted">{t("arrivalPanel.opens15MinutesBefore", { time: clockTime(startsAt, t.locale) })}</p>
      <label className="mt-3 block text-sm font-semibold">
        {needsPhoto ? t("arrivalPanel.photoDoorEntranceRequired") : t("arrivalPanel.photoDoorOptional")}
        <input type="file" accept="image/*" capture="environment" className="mt-1 block w-full text-sm" onChange={e => onPhoto(e.target.files?.[0])} />
      </label>
      <button type="button" className={`${buttonClass} mt-3`} disabled={pending || !canCheckIn || (needsPhoto && !photo)} onClick={checkIn}>
        {pending ? t("arrivalPanel.checking") : t("arrivalPanel.iveArrived")}
      </button>
      {!canCheckIn && <p className="mt-2 text-xs text-muted">{t("arrivalPanel.iveArrivedIsntOpen")}</p>}
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </div>
  );
  const time = clockTime(arrival.checkedInAt, t.locale);
  return (
    <div className="mt-4 rounded-2xl border-2 border-gold bg-honey/40 p-4" aria-label={t("arrivalPanel.iveArrived")}>
      <h3 className="font-bold">{t("arrivalPanel.checked", { time: time })}</h3>
      <p className="text-sm">{arrival.method === "GPS" ? t("arrivalPanel.addressM", { distanceM: arrival.distanceM }) : t("arrivalPanel.confirmedPhoto")}</p>
      {!helpline ? (
        <>
          <p className="mt-2 text-sm">{t("arrivalPanel.customerNotAnsweringCall")}</p>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${buttonClass} mt-3`} onClick={callHelpline}>{t("arrivalPanel.callZgjoiHelpline")}</a>
          ) : (
            <>
              <button type="button" className={`${buttonClass} mt-3`} disabled={pending} onClick={callHelpline}>{t("arrivalPanel.callZgjoiHelpline")}</button>
              <p className="mt-2 text-xs text-muted">{t("arrivalPanel.helplineWhatsappNumberIsnt")}</p>
            </>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm" role="status">
          {t("arrivalPanel.zgjoiHasBeenNotified")}{" "}
          {arrival.waitEndsAt ? <WaitCountdown endsAt={arrival.waitEndsAt} template={t("arrivalPanel.waitAnotherMinAddress")} done={t("arrivalPanel.n30MinuteWaitOver")} /> : t("arrivalPanel.wait30MinutesAddress")}
          {contactLabel ? ` · ${contactLabel}` : t("arrivalPanel.zgjoiContactingCustomer")}
          {whatsapp && <> <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-gold-dark underline">{t("arrivalPanel.openWhatsappAgain")}</a></>}
        </p>
      )}
      {helpline && !whatsapp && (
        <p className="mt-2 text-xs text-muted">{t("arrivalPanel.helplineWhatsappNumberIsnt2")}</p>
      )}
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </div>
  );
}

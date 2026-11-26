"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "./ApiForm";
import { clockTime } from "@/lib/format";

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
  throw new Error("Fotoja është shumë e madhe. Provoni përsëri.");
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Shfletuesi nuk e jep vendndodhjen. Përdorni foton."));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Lejoni vendndodhjen për Zgjoi dhe provoni përsëri.")),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  });
}

export type ProArrival = { checkedInAt: string; distanceM: number | null; method: string; helplineAt: string | null; waitEndsAt: string | null; contactResult: string | null };

/** Pro side of Arrita: check in at the address, call the Zgjoi helpline, wait 30 minutes. */
export default function ArrivalPanel({ requestId, startsAt, arrival, whatsapp, contactLabel, canCheckIn }: {
  requestId: string; startsAt: string; arrival: ProArrival | null; whatsapp: string | null; contactLabel: string | null; canCheckIn: boolean;
}) {
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
        throw new Error(result.message || "Arritja nuk u shënua. Provoni përsëri.");
      }
      setMessage(result.message);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lidhja dështoi. Provoni përsëri.");
    } finally { setPending(false); }
  }
  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try { setPhoto(await compress(file)); setMessage("Fotoja u shtua."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Fotoja nuk u lexua."); }
  }
  async function callHelpline() {
    // The wa.me link opens in a new tab from the click itself; the tap is logged in parallel.
    setPending(true);
    const { ok, result } = await post({ action: "HELPLINE" }).catch(() => ({ ok: false, result: {} as Record<string, string> }));
    setPending(false);
    setMessage(ok ? result.message : result.message || "Thirrja nuk u regjistrua. Provoni përsëri.");
    if (ok) { setHelpline(new Date().toISOString()); router.refresh(); }
  }

  if (!arrival) return (
    <div className="mt-4 rounded-2xl border-2 border-gold bg-honey/40 p-4" aria-label="Arrita">
      <h3 className="font-bold">Arrita</h3>
      <p className="mt-1 text-sm">Kur të arrini te adresa, shtypni “Arrita”. Shfletuesi kërkon vendndodhjen një herë; klienti sheh vetëm që jeni te adresa, jo vendndodhjen tuaj.</p>
      <p className="mt-1 text-xs text-muted">Hapet 15 minuta para fillimit ({clockTime(startsAt)}) dhe mbyllet 30 minuta pas tij.</p>
      <label className="mt-3 block text-sm font-semibold">
        {needsPhoto ? "Fotoja te dera ose hyrja (e detyrueshme)" : "Foto te dera (opsionale)"}
        <input type="file" accept="image/*" capture="environment" className="mt-1 block w-full text-sm" onChange={e => onPhoto(e.target.files?.[0])} />
      </label>
      <button type="button" className={`${buttonClass} mt-3`} disabled={pending || !canCheckIn || (needsPhoto && !photo)} onClick={checkIn}>
        {pending ? "Duke shënuar…" : "Arrita"}
      </button>
      {!canCheckIn && <p className="mt-2 text-xs text-muted">“Arrita” nuk është e hapur tani.</p>}
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </div>
  );
  const time = clockTime(arrival.checkedInAt);
  return (
    <div className="mt-4 rounded-2xl border-2 border-gold bg-honey/40 p-4" aria-label="Arrita">
      <h3 className="font-bold">Arrita · {time}</h3>
      <p className="text-sm">{arrival.method === "GPS" ? `Te adresa (${arrival.distanceM} m)` : "Konfirmuar me foto"}</p>
      {!helpline ? (
        <>
          <p className="mt-2 text-sm">Klienti nuk përgjigjet? Thirrni ndihmën e Zgjoi. Pas thirrjes prisni së paku 30 minuta te adresa.</p>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${buttonClass} mt-3`} onClick={callHelpline}>Thirr ndihmën e Zgjoi</a>
          ) : (
            <>
              <button type="button" className={`${buttonClass} mt-3`} disabled={pending} onClick={callHelpline}>Thirr ndihmën e Zgjoi</button>
              <p className="mt-2 text-xs text-muted">Numri i WhatsApp-it të ndihmës nuk është vendosur ende. Butoni e njofton administratën në faqe.</p>
            </>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm" role="status">
          Zgjoi u njoftua.{" "}
          {arrival.waitEndsAt ? <WaitCountdown endsAt={arrival.waitEndsAt} template="Prisni edhe {m} min te adresa." done="Pritja prej 30 minutash përfundoi." /> : "Prisni 30 minuta te adresa."}
          {contactLabel ? ` · ${contactLabel}` : " · Zgjoi po e kontakton klientin."}
          {whatsapp && <> <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-gold-dark underline">Hap përsëri WhatsApp</a></>}
        </p>
      )}
      {helpline && !whatsapp && (
        <p className="mt-2 text-xs text-muted">Numri i WhatsApp-it të ndihmës nuk është vendosur ende. Administrata u njoftua në faqe.</p>
      )}
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </div>
  );
}

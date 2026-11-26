import { clockTime } from "./format";
/** Arrita: the pro's proof of presence for a Book now booking (owner, 26 Nov 2026).
 * Pure rules shared by the UI, the server and the tests. */

/** A check-in counts within this distance of the booking address. */
export const ARRIVAL_RADIUS_M = 200;
/** The "Arrita" check-in is open from this many minutes before the start… */
export const CHECKIN_EARLY_MINUTES = 15;
/** …until this many minutes after it. */
export const CHECKIN_LATE_MINUTES = 30;
/** After tapping the helpline the pro waits at least this long. */
export const HELPLINE_WAIT_MINUTES = 30;
/** The customer can report a no-show from this many minutes after the start. */
export const NO_SHOW_AFTER_MINUTES = 15;
/** Photo cap after in-app compression (stored in the database during the beta). */
export const PHOTO_MAX_BYTES = 600_000;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** The prefilled WhatsApp message includes the customer's phone (owner-approved). */
export const HELPLINE_INCLUDES_CUSTOMER_PHONE = true;

const MIN = 60_000;
export type Point = { lat: number; lng: number };

/** Great-circle distance in metres. */
export function distanceM(a: Point, b: Point) {
  const R = 6_371_000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function checkInWindow(startsAt: Date, now: Date): "EARLY" | "OPEN" | "CLOSED" {
  const t = now.getTime(), s = startsAt.getTime();
  if (t < s - CHECKIN_EARLY_MINUTES * MIN) return "EARLY";
  if (t > s + CHECKIN_LATE_MINUTES * MIN) return "CLOSED";
  return "OPEN";
}

export type CheckInAssessment =
  | { ok: true; distanceM: number | null; method: "GPS" | "PHOTO" }
  | { ok: false; code: "EARLY" | "CLOSED" | "PHOTO_REQUIRED"; distanceM: number | null; message: string };

/** A check-in is valid inside the window and within ARRIVAL_RADIUS_M of the
 * address. When the address could not be located, or the pro is further away,
 * a photo taken at the location is required instead. */
export function assessCheckIn(input: { startsAt: Date; now: Date; site: Point | null; point: Point; hasPhoto: boolean }): CheckInAssessment {
  const window = checkInWindow(input.startsAt, input.now);
  const d = input.site ? distanceM(input.site, input.point) : null;
  if (window === "EARLY") return { ok: false, code: "EARLY", distanceM: d,
    message: `“Arrita” hapet ${CHECKIN_EARLY_MINUTES} minuta para orës së fillimit.` };
  if (window === "CLOSED") return { ok: false, code: "CLOSED", distanceM: d,
    message: `Afati për “Arrita” mbaroi ${CHECKIN_LATE_MINUTES} minuta pas fillimit. Kontaktoni ndihmën e Zgjoi.` };
  if (d !== null && d <= ARRIVAL_RADIUS_M) return { ok: true, distanceM: d, method: "GPS" };
  if (input.hasPhoto) return { ok: true, distanceM: d, method: "PHOTO" };
  return { ok: false, code: "PHOTO_REQUIRED", distanceM: d, message: d === null
    ? "Adresa nuk u gjet në hartë. Bëni një foto te dera ose hyrja për ta konfirmuar arritjen."
    : `Vendndodhja juaj është rreth ${d} m larg adresës. Bëni një foto te dera ose hyrja për ta konfirmuar arritjen.` };
}

export type ArrivalState = {
  checkedInAt: Date; helplineAt: Date | null; waitEndsAt: Date | null; contactResult: string | null;
};
export type ContactResult = "REACHED_GOES_AHEAD" | "REACHED_CANCELLED" | "NO_ANSWER";
export const contactLabels: Record<ContactResult, string> = {
  REACHED_GOES_AHEAD: "Klienti u kontaktua: puna vazhdon",
  REACHED_CANCELLED: "Klienti u kontaktua: anuloi",
  NO_ANSWER: "Klienti nuk u përgjigj",
};

export function waitEndsAt(helplineAt: Date) {
  return new Date(helplineAt.getTime() + HELPLINE_WAIT_MINUTES * MIN);
}
/** Whole minutes left of the 30-minute wait (0 once it is over). */
export function waitMinutesLeft(a: Pick<ArrivalState, "waitEndsAt"> | null, now: Date) {
  if (!a?.waitEndsAt) return 0;
  return Math.max(0, Math.ceil((a.waitEndsAt.getTime() - now.getTime()) / MIN));
}

/** "Askush s'ishte në shtëpi" needs all four: a valid check-in, the helpline
 * tapped, 30 minutes since the tap and the admin's "no answer" log. */
export function nobodyHomeGate(a: ArrivalState | null, now: Date): { ok: true } | { ok: false; missing: string[]; message: string } {
  const missing: string[] = [];
  if (!a) missing.push("regjistroni arritjen me “Arrita”");
  if (!a?.helplineAt) missing.push("shtypni “Thirr ndihmën e Zgjoi”");
  else if (waitMinutesLeft(a, now) > 0) missing.push(`prisni edhe ${waitMinutesLeft(a, now)} min`);
  if (a?.contactResult !== "NO_ANSWER") missing.push("Zgjoi duhet të shënojë se klienti nuk u përgjigj");
  return missing.length ? { ok: false, missing, message: `Ende nuk mund të raportoni “Askush s'ishte në shtëpi”: ${missing.join("; ")}.` } : { ok: true };
}

/** The customer's "the pro didn't come" report: too early, a no-show (no
 * check-in), or a dispute when the pro has a valid check-in. */
export function noShowGate(startsAt: Date, arrival: Pick<ArrivalState, "checkedInAt"> | null, now: Date): "TOO_EARLY" | "NO_SHOW" | "DISPUTE" {
  if (arrival) return "DISPUTE";
  return now.getTime() < startsAt.getTime() + NO_SHOW_AFTER_MINUTES * MIN ? "TOO_EARLY" : "NO_SHOW";
}

/** Trust history: late = arrived more than 15 minutes after the booked start. */
export function arrivalTime(a: { checkedInAt: Date } | null | undefined, startedAt: Date | null) {
  return a?.checkedInAt ?? startedAt;
}

/** wa.me needs the number in international format, digits only. */
export function helplineNumber(raw: string | undefined | null) {
  const digits = (raw ?? "").replace(/[\s()+-]/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
export function whatsappLink(number: string | null, text: string) {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}
const hhmm = (d: Date) => clockTime(d);
export function helplineMessage(m: { requestId: string; customerName: string; customerPhone: string | null; checkedInAt: Date;
  distanceM: number | null; method: string; adminUrl: string }) {
  return [
    "Zgjoi · Ndihmë te adresa",
    `Puna: ${m.requestId}`,
    `Klienti: ${m.customerName}${HELPLINE_INCLUDES_CUSTOMER_PHONE ? ` · ${m.customerPhone || "pa numër"}` : ""}`,
    `Arrita: ${hhmm(m.checkedInAt)} · ${m.distanceM === null ? "adresa pa koordinata" : `${m.distanceM} m nga adresa`}${m.method === "PHOTO" ? " · me foto" : ""}`,
    "Jam te adresa dhe klienti nuk përgjigjet. Po pres 30 minuta.",
    m.adminUrl,
  ].join("\n");
}
/** What the customer sees: the time and whether the pro is at the address, never coordinates. */
export function customerArrivalLine(a: { checkedInAt: Date; method: string }) {
  return `Profesionisti arriti · ${hhmm(a.checkedInAt)}${a.method === "GPS" ? " · te adresa" : " · konfirmuar me foto"}`;
}

/* ------------------------------------------------------------ geocoding */

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
export function geocodeQuery(address: string | null, city: string) {
  const a = (address ?? "").trim().replace(/\s+/g, " ");
  if (a.length < 4) return null; // a city alone is too coarse for a 200 m check
  return `${a}, ${city.trim()}, Kosovë`;
}
export function nominatimRequest(query: string, base = NOMINATIM_URL) {
  const url = new URL(base);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "xk");
  url.searchParams.set("accept-language", "sq");
  return url.toString();
}
export function parseNominatim(body: unknown): Point | null {
  if (!Array.isArray(body) || !body.length) return null;
  const lat = Number(body[0]?.lat), lng = Number(body[0]?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** Decodes a data: URL from the in-app camera; null when it is not an allowed image. */
export function decodePhoto(dataUrl: string): { mime: string; bytes: Uint8Array } | { error: string } {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || dataUrl.length > PHOTO_MAX_BYTES * 1.4) return { error: "Fotoja duhet të jetë JPEG, PNG ose WebP." };
  const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  if (bytes.length > PHOTO_MAX_BYTES) return { error: "Fotoja është shumë e madhe. Provoni përsëri." };
  const magic = m[1] === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8
    : m[1] === "image/png" ? bytes[0] === 0x89 && bytes[1] === 0x50
    : bytes[0] === 0x52 && bytes[8] === 0x57; // RIFF....WEBP
  return magic ? { mime: m[1], bytes } : { error: "Fotoja nuk u lexua. Provoni përsëri." };
}

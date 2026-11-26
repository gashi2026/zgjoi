import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Actor } from "./auth";
import { db } from "./db";
import { AppError, invariant } from "./errors";
import { notify, applicationUrl } from "./notifications";
import { enforceLimit, rateLimit } from "./rate-limit";
import { serializable } from "./transaction";
import { recordCancellation } from "./bookings";
import { entityId } from "../marketplace-validation";
import {
  assessCheckIn, contactLabels, customerArrivalLine, decodePhoto, geocodeQuery, helplineMessage, helplineNumber,
  nominatimRequest, parseNominatim, waitEndsAt, whatsappLink, HELPLINE_WAIT_MINUTES, type Point,
} from "../arrival";

/* ------------------------------------------------------------- geocoding */

const USER_AGENT = "Zgjoi/1.0 (+https://zgjoi.com; marketplace address check)";
/** Free geocoding: Nominatim (OSM) with a shared cache, ≤1 request/second and a
 * descriptive user agent, per its usage policy. GEOCODING_PROVIDER=off disables it. */
export async function geocodeAddress(address: string | null, city: string): Promise<{ status: "OK" | "NOT_FOUND" | "UNAVAILABLE"; point: Point | null }> {
  const query = geocodeQuery(address, city);
  if (!query) return { status: "NOT_FOUND", point: null };
  const key = createHash("sha256").update(query.toLowerCase()).digest("hex");
  const cached = await db.geocodeCache.findUnique({ where: { key } });
  if (cached) return cached.status === "OK" && cached.lat !== null && cached.lng !== null
    ? { status: "OK", point: { lat: cached.lat, lng: cached.lng } } : { status: "NOT_FOUND", point: null };
  if (process.env.GEOCODING_PROVIDER === "off") return { status: "UNAVAILABLE", point: null };
  if (!(await rateLimit("geocode:nominatim", 1, 1_100)).ok) return { status: "UNAVAILABLE", point: null };
  try {
    const res = await fetch(nominatimRequest(query), { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!res.ok) return { status: "UNAVAILABLE", point: null };
    const point = parseNominatim(await res.json());
    await db.geocodeCache.upsert({ where: { key }, update: {},
      create: { key, status: point ? "OK" : "NOT_FOUND", lat: point?.lat ?? null, lng: point?.lng ?? null, provider: "nominatim" } });
    return point ? { status: "OK", point } : { status: "NOT_FOUND", point: null };
  } catch {
    return { status: "UNAVAILABLE", point: null };
  }
}

/** Stores the booking address coordinates once (best effort, outside any transaction). */
export async function geocodeBooking(requestId: string) {
  const booking = await db.booking.findUnique({ where: { requestId }, select: { id: true, siteGeocode: true, request: { select: { address: true, city: true } } } });
  if (!booking || booking.siteGeocode === "OK" || booking.siteGeocode === "NOT_FOUND") return;
  const result = await geocodeAddress(booking.request.address, booking.request.city);
  await db.booking.update({ where: { id: booking.id }, data: {
    siteGeocode: result.status, siteLat: result.point?.lat ?? null, siteLng: result.point?.lng ?? null, siteGeocodedAt: new Date() } });
}

/* ---------------------------------------------------------- pro actions */

export const arrivalInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CHECK_IN"), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().max(100_000).optional(), photo: z.string().max(900_000).optional() }),
  z.object({ action: z.literal("HELPLINE") }),
]);

async function proBooking(tx: Prisma.TransactionClient, actor: Actor, requestId: string) {
  entityId.parse(requestId);
  invariant(actor.role === "PRO" && actor.proProfile, "FORBIDDEN", 403, "Vetëm profesionisti e shënon arritjen.");
  const booking = await tx.booking.findUnique({ where: { requestId },
    include: { arrival: true, request: { include: { client: { select: { id: true, name: true, phone: true } } } } } });
  invariant(booking && booking.profileId === actor.proProfile.id, "NOT_FOUND", 404, "Rezervimi nuk u gjet.");
  return booking;
}

export async function arrivalAction(actor: Actor, requestId: string, input: unknown) {
  const data = arrivalInput.parse(input);
  await enforceLimit(`arrival:${actor.id}`, 30, 60 * 60_000);
  if (data.action === "CHECK_IN") {
    // Geocode before the transaction (network call); cached on the booking.
    await geocodeBooking(requestId).catch(() => undefined);
    const photo = data.photo ? decodePhoto(data.photo) : null;
    invariant(!photo || !("error" in photo), "PHOTO", 400, photo && "error" in photo ? photo.error : "");
    return serializable(async (tx) => {
      const booking = await proBooking(tx, actor, requestId);
      if (booking.arrival) return { ok: true, already: true, message: "Arritja është shënuar tashmë." };
      invariant(booking.status === "CONFIRMED" && ["BOOKED", "IN_PROGRESS"].includes(booking.request.state), "STATE", 409, "Ky rezervim nuk është aktiv.");
      const now = new Date();
      const site = booking.siteLat !== null && booking.siteLng !== null ? { lat: booking.siteLat, lng: booking.siteLng } : null;
      const check = assessCheckIn({ startsAt: booking.startsAt, now, site, point: { lat: data.lat, lng: data.lng }, hasPhoto: !!photo });
      if (!check.ok) throw new AppError(check.code === "PHOTO_REQUIRED" ? "PHOTO_REQUIRED" : `ARRIVAL_${check.code}`, 409, check.message);
      const ok = photo && !("error" in photo) ? photo : null;
      const arrival = await tx.bookingArrival.create({ data: {
        bookingId: booking.id, proUserId: actor.id, checkedInAt: now, lat: data.lat, lng: data.lng,
        accuracyM: data.accuracy !== undefined ? Math.round(data.accuracy) : null, distanceM: check.distanceM, method: check.method,
        photo: ok ? Buffer.from(ok.bytes) : null, photoMime: ok?.mime ?? null, photoSize: ok?.bytes.length ?? null,
      } });
      await notify(tx, booking.clientId, "ARRIVAL", customerArrivalLine(arrival), `/llogaria/kerkesat/${requestId}`);
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARRIVAL_CHECKED_IN", target: requestId,
        meta: { distanceM: check.distanceM, method: check.method, photo: !!ok, siteGeocode: booking.siteGeocode } } });
      return { ok: true, message: check.method === "GPS" ? "Arritja u shënua: jeni te adresa." : "Arritja u shënua me foto." };
    });
  }
  return serializable(async (tx) => {
    const booking = await proBooking(tx, actor, requestId);
    invariant(booking.arrival, "ARRIVAL_FIRST", 409, "Shënoni fillimisht “Arrita” te adresa.");
    invariant(booking.status === "CONFIRMED" && booking.request.state === "BOOKED", "STATE", 409, "Ky rezervim nuk është më aktiv.");
    const now = new Date();
    const first = !booking.arrival.helplineAt;
    const arrival = first
      ? await tx.bookingArrival.update({ where: { id: booking.arrival.id }, data: { helplineAt: now, waitEndsAt: waitEndsAt(now) } })
      : booking.arrival;
    if (first) {
      const admins = await tx.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } });
      for (const admin of admins)
        await notify(tx, admin.id, "HELPLINE", `Ndihmë: profesionisti është te adresa dhe pret ${HELPLINE_WAIT_MINUTES} min; kontaktoni klientin`, `/admin/rezervimet/${requestId}`);
      await notify(tx, booking.clientId, "ARRIVAL", `Profesionisti po ju pret te adresa (${HELPLINE_WAIT_MINUTES} min). Zgjoi do t'ju kontaktojë.`, `/llogaria/kerkesat/${requestId}`);
    }
    await tx.auditLog.create({ data: { actorId: actor.id, action: "HELPLINE_TAPPED", target: requestId, meta: { first } } });
    return { ok: true, waitEndsAt: arrival.waitEndsAt, whatsapp: helplineLink(booking, arrival, requestId),
      message: first ? `Zgjoi u njoftua. Prisni së paku ${HELPLINE_WAIT_MINUTES} minuta te adresa.` : "Zgjoi është njoftuar tashmë." };
  });
}

/** The prefilled wa.me link to the admin helpline, or null when ZGJOI_HELPLINE_WHATSAPP is not set. */
export function helplineLink(booking: { request: { client: { name: string; phone: string | null } } },
  arrival: { checkedInAt: Date; distanceM: number | null; method: string }, requestId: string) {
  const number = helplineNumber(process.env.ZGJOI_HELPLINE_WHATSAPP);
  if (!number) return null;
  const base = applicationUrl() ?? "https://zgjoi.com";
  return whatsappLink(number, helplineMessage({ requestId, customerName: booking.request.client.name, customerPhone: booking.request.client.phone,
    checkedInAt: arrival.checkedInAt, distanceM: arrival.distanceM, method: arrival.method, adminUrl: `${base}/admin/rezervimet/${requestId}` }));
}

/* --------------------------------------------------------- admin action */

export const contactInput = z.object({
  requestId: entityId,
  result: z.enum(["REACHED_GOES_AHEAD", "REACHED_CANCELLED", "NO_ANSWER"]),
  note: z.string().trim().max(500).optional(),
});

/** The admin logs the result of contacting the customer during the wait. */
export async function logContact(actor: Actor, input: unknown) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  const data = contactInput.parse(input);
  return serializable(async (tx) => {
    invariant(await tx.user.findFirst({ where: { id: actor.id, role: "ADMIN", suspendedAt: null } }), "FORBIDDEN", 403, "Nuk keni qasje.");
    const booking = await tx.booking.findUnique({ where: { requestId: data.requestId },
      include: { arrival: true, request: { include: { payment: true, selectedPro: { select: { userId: true } } } } } });
    invariant(booking?.arrival && booking.request.payment, "NOT_FOUND", 404, "Nuk ka arritje të shënuar për këtë rezervim.");
    invariant(booking.arrival.helplineAt, "HELPLINE_FIRST", 409, "Profesionisti nuk e ka thirrur ende ndihmën.");
    invariant(booking.status === "CONFIRMED" && booking.request.state === "BOOKED", "STATE", 409, "Rezervimi nuk është më aktiv.");
    const now = new Date();
    await tx.bookingArrival.update({ where: { id: booking.arrival.id }, data: { contactResult: data.result, contactNote: data.note || null, contactById: actor.id, contactAt: now } });
    const proUser = booking.request.selectedPro?.userId ?? booking.arrival.proUserId;
    const proHref = `/pro/kerkesat/${data.requestId}`;
    if (data.result === "REACHED_CANCELLED") {
      // The customer cancelled at the door: the late customer-cancellation rule applies.
      const loaded = { ...booking, request: { ...booking.request, payment: booking.request.payment } };
      await recordCancellation(tx, loaded, { by: "CLIENT", reason: "CANCEL", actorId: actor.id, now, notifyUserId: proUser, notifyHref: proHref,
        note: "Klienti u kontaktua nga Zgjoi dhe anuloi te dera" });
      await notify(tx, booking.clientId, "BOOKING_CANCELLED", "Rezervimi u anulua pas kontaktit me Zgjoi", `/llogaria/kerkesat/${data.requestId}`);
    } else {
      await notify(tx, proUser, "HELPLINE", data.result === "NO_ANSWER"
        ? "Zgjoi nuk e arriti klientin. Pas pritjes mund të raportoni “Askush s'ishte në shtëpi”."
        : "Zgjoi e kontaktoi klientin: puna vazhdon.", proHref);
    }
    await tx.serviceRequest.update({ where: { id: data.requestId }, data: { version: { increment: 1 } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "HELPLINE_CONTACT_LOGGED", target: data.requestId, meta: { result: data.result } } });
    return { ok: true, message: `U shënua: ${contactLabels[data.result]}.` };
  });
}

/** The check-in photo, for the pro who took it and for admins only. */
export async function arrivalPhoto(actor: Actor, requestId: string) {
  entityId.parse(requestId);
  const booking = await db.booking.findUnique({ where: { requestId }, select: { profileId: true, arrival: { select: { photo: true, photoMime: true } } } });
  const allowed = actor.role === "ADMIN" || (actor.role === "PRO" && actor.proProfile?.id === booking?.profileId);
  invariant(booking?.arrival?.photo && booking.arrival.photoMime && allowed, "NOT_FOUND", 404, "Fotoja nuk u gjet.");
  return { bytes: booking.arrival.photo, mime: booking.arrival.photoMime };
}

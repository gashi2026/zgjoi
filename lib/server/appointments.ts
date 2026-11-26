import "server-only";
import type { Prisma } from "@prisma/client";
import { appointmentEnd, withinWorkingHours, type WorkingDay } from "../appointments";
import { invariant } from "./errors";

export async function lockCalendar(tx: Prisma.TransactionClient, profileId: string) {
  await tx.$queryRaw`SELECT id FROM public."ProProfile" WHERE id = ${profileId} FOR UPDATE`;
}
export async function assertAppointmentAvailable(tx: Prisma.TransactionClient, profileId: string, start: Date, duration: string, requestId: string) {
  await lockCalendar(tx, profileId);
  const end = appointmentEnd(start, duration);
  invariant(end, "DURATION", 409, "Kohëzgjatja duhet të jetë e saktë. Kërkoni ofertë të re me minutat e punës.");
  const days = await tx.availability.findMany({ where: { profileId } });
  invariant(withinWorkingHours(start, end, days), "AVAILABILITY", 409, "Orari është jashtë orarit javor të profesionistit. Kërkoni orar tjetër.");
  const existing = await tx.quote.findMany({
    where: { profileId, state: "ACCEPTED", requestId: { not: requestId }, scheduledAt: { lt: end },
      acceptedFor: { state: { in: ["BOOKED", "IN_PROGRESS", "DISPUTED"] }, completedAt: null } },
    select: { scheduledAt: true, duration: true },
  });
  for (const booking of existing) {
    const otherEnd = booking.scheduledAt && appointmentEnd(booking.scheduledAt, booking.duration);
    invariant(otherEnd, "LEGACY_SCHEDULE", 409, "Një rezervim ekzistues nuk ka kohëzgjatje të saktë. Kontaktoni mbështetjen para rezervimit të ri.");
    invariant(otherEnd <= start, "APPOINTMENT_CONFLICT", 409, "Profesionisti ka një rezervim tjetër në këtë orar. Kërkoni ofertë me orar tjetër.");
  }
}
export async function assertAvailabilityPreservesBookings(tx: Prisma.TransactionClient, profileId: string, days: WorkingDay[]) {
  await lockCalendar(tx, profileId);
  const bookings = await tx.quote.findMany({ where: { profileId, state: "ACCEPTED", scheduledAt: { gt: new Date() },
    acceptedFor: { state: { in: ["BOOKED", "IN_PROGRESS", "DISPUTED"] }, completedAt: null } }, select: { scheduledAt: true, duration: true } });
  for (const booking of bookings) {
    const end = booking.scheduledAt && appointmentEnd(booking.scheduledAt, booking.duration);
    invariant(end && withinWorkingHours(booking.scheduledAt!, end, days), "BOOKED_HOURS", 409, "Orari i ri përjashton një rezervim të pranuar. Ruani orarin e dakorduar ose kontaktoni mbështetjen.");
  }
}

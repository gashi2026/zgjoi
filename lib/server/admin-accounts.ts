import "server-only";
import type { Prisma } from "@prisma/client";
import type { Actor } from "./auth";
import { invariant } from "./errors";
import { serviceCategory } from "../service-categories";
import { requireActiveCategories, syncProfileSummary } from "./pro-categories";
import { deleteIdPhotosForUser } from "./id-verification";
import { tryDeleteStoredPaths } from "./storage";
import { activeAccountWhere, suspensionIsActive } from "../suspension";

export { resolveSuspendedUntil } from "./suspension";
export type { SuspendDuration } from "../suspension";

type Tx = Prisma.TransactionClient;

export const DELETED_ACCOUNT_NAME = "Llogari e fshirë";
export const deletedEmail = (id: string) => `deleted+${id}@deleted.zgjoi.invalid`;

export async function preserveAdmin(
  tx: Tx,
  target: { id: string; role: string; suspendedAt: Date | null; suspendedUntil?: Date | null; deletedAt?: Date | null },
  actor: Actor,
  losesAdmin: boolean,
) {
  if (!losesAdmin) return;
  invariant(target.id !== actor.id, "SELF", 409, "Nuk mund të hiqni qasjen tuaj administrative.");
  const targetIsActiveAdmin = target.role === "ADMIN" && !suspensionIsActive(target);
  if (!targetIsActiveAdmin) return;
  invariant(
    (await tx.user.count({ where: { role: "ADMIN", id: { not: target.id }, ...activeAccountWhere() } })) >= 1,
    "LAST_ADMIN",
    409,
    "Duhet të mbetet një administrator aktiv.",
  );
}

/**
 * Admin-set professions: 1..5 active catalogue slugs, each approved immediately.
 * Professions that stay keep their existing prices, minimum hours and hourly rate.
 */
export async function setAdminProfessions(tx: Tx, profileId: string, slugs: readonly string[]) {
  const canonical = await requireActiveCategories(slugs, tx);
  const before = await tx.proCategory.findMany({ where: { profileId } });
  const removed = before.filter((row) => !canonical.includes(serviceCategory(row.categorySlug)?.slug ?? ""));
  if (removed.length) await tx.proCategory.deleteMany({ where: { id: { in: removed.map((row) => row.id) } } });
  const now = new Date();
  for (const [position, slug] of canonical.entries()) {
    const existing = before.find((row) => serviceCategory(row.categorySlug)?.slug === slug);
    if (existing)
      await tx.proCategory.update({
        where: { id: existing.id },
        // Prices, minMinutes and hourlyRateCents are left untouched.
        data: { position, categorySlug: slug, approvedAt: existing.approvedAt ?? now },
      });
    else
      await tx.proCategory.create({ data: { profileId, categorySlug: slug, position, approvedAt: now } });
  }
  await syncProfileSummary(tx, profileId);
  return { added: canonical.filter((slug) => !before.some((row) => serviceCategory(row.categorySlug)?.slug === slug)), removed: removed.map((row) => row.categorySlug), kept: canonical.filter((slug) => before.some((row) => serviceCategory(row.categorySlug)?.slug === slug)) };
}

/**
 * Erase an account while keeping a tombstone row so foreign keys on bookings,
 * chats, reviews, payments and the legal identity record stay valid.
 *
 * Kept (anonymised): ServiceRequest, Booking, RecurringSeries, Review, Message,
 * Payment, Payout, Conversation, AuditLog (actorId still points at the tombstone),
 * IdentityRecord (legal/safety record; ID photos are deleted).
 * Cleared or detached: sessions, auth tokens, notifications, favorites, support
 * tickets (userId/senderId set to null), public pro profile (categories, documents,
 * services, availability, IBAN, stripe, about), ID document images.
 * Recurring series that are still proposed/active/paused are cancelled.
 */
export async function eraseAccount(tx: Tx, actor: Actor, targetId: string, confirmation: string, passwordHash: string) {
  const target = await tx.user.findUnique({
    where: { id: targetId },
    include: {
      proProfile: { include: { documents: { select: { id: true, storagePath: true } } } },
    },
  });
  invariant(target, "NOT_FOUND", 404, "Llogaria nuk u gjet.");
  invariant(!target.deletedAt, "DELETED", 409, "Kjo llogari është fshirë tashmë.");
  invariant(confirmation === target.email, "CONFIRMATION", 400, "Shkruani emailin e llogarisë për ta fshirë.");
  await preserveAdmin(tx, target, actor, target.role === "ADMIN");

  const storagePaths = (target.proProfile?.documents ?? []).flatMap((doc) => (doc.storagePath ? [doc.storagePath] : []));
  const now = new Date();

  await deleteIdPhotosForUser(tx, target.id, actor.id, "ACCOUNT_ERASED");

  if (target.proProfile) {
    const profileId = target.proProfile.id;
    await tx.proCategory.deleteMany({ where: { profileId } });
    await tx.proDocument.deleteMany({ where: { profileId } });
    await tx.proService.deleteMany({ where: { profileId } });
    await tx.availability.deleteMany({ where: { profileId } });
    await tx.favorite.deleteMany({ where: { profileId } });
    await tx.recurringSeries.updateMany({
      where: { profileId, status: { in: ["PROPOSED", "ACTIVE", "PAUSED"] } },
      data: { status: "CANCELLED", cancelledAt: now, cancelledBy: "SYSTEM", statusNote: "Llogaria u fshi." },
    });
    await tx.proProfile.update({
      where: { id: profileId },
      data: {
        slug: `deleted-${profileId}`,
        about: DELETED_ACCOUNT_NAME,
        experience: null,
        serviceCities: [],
        verification: "REJECTED",
        verifiedAt: null,
        ibanEnc: null,
        ibanLast4: null,
        stripeAccountId: null,
        stripeOnboarded: false,
        hourlyRateCents: null,
        bookNowEnabled: false,
        bookingMinMinutes: null,
        priceFrom: null,
      },
    });
  }

  await tx.favorite.deleteMany({ where: { userId: target.id } });
  await tx.notification.deleteMany({ where: { userId: target.id } });
  await tx.session.deleteMany({ where: { userId: target.id } });
  await tx.authToken.updateMany({ where: { userId: target.id, usedAt: null }, data: { usedAt: now } });
  await tx.supportTicket.updateMany({ where: { userId: target.id }, data: { userId: null } });
  await tx.supportMessage.updateMany({ where: { senderId: target.id }, data: { senderId: null } });

  await tx.user.update({
    where: { id: target.id },
    data: {
      name: DELETED_ACCOUNT_NAME,
      email: deletedEmail(target.id),
      phone: null,
      personalNoEnc: null,
      personalNoLast4: null,
      city: null,
      locale: null,
      emailVerified: null,
      signupStep: null,
      canReviewIds: false,
      passwordHash,
      suspendedAt: now,
      suspendedUntil: null,
      suspensionReason: null,
      deletedAt: now,
    },
  });

  return { email: target.email, name: target.name, profileId: target.proProfile?.id ?? null, storagePaths };
}

export async function afterEraseAccount(storagePaths: string[]) {
  await tryDeleteStoredPaths(storagePaths);
}

export { activeAccountWhere, suspensionIsActive };

import { activeServiceCategories, requireActiveCategory } from "./service-catalog";
import { professionSlug, serviceCategory } from "../service-categories";
import { syncProfileSummary } from "./pro-categories";
import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Actor } from "./auth";
import { hashPassword } from "./auth";
import { serializable } from "./marketplace";
import { invariant } from "./errors";
import { notify } from "./notifications";
import { entityId, cleanText } from "../marketplace-validation";
import { email, password } from "../validation";
import { opaqueToken } from "./tokens";
import { municipalityName } from "../kosovo-municipalities";
import { SUSPEND_DURATIONS } from "../suspension";
import {
  activeAccountWhere, afterEraseAccount, eraseAccount, preserveAdmin, setAdminProfessions,
  resolveSuspendedUntil,
} from "./admin-accounts";

async function adminAccess(actor: Actor, tx: Prisma.TransactionClient) {
  invariant(
    actor.role === "ADMIN" &&
      (await tx.user.findFirst({
        where: { id: actor.id, role: "ADMIN", ...activeAccountWhere() },
      })),
    "FORBIDDEN",
    403,
    "Nuk keni qasje.",
  );
}
export async function adminCommand(actor: Actor, input: unknown) {
  invariant(actor.role === "ADMIN", "FORBIDDEN", 403, "Nuk keni qasje.");
  const envelope = z
    .object({
      action: z.enum([
        "USER_CREATE",
        "USER_UPDATE",
        "USER_SUSPEND",
        "USER_RESTORE",
        "USER_SET_PROFESSIONS",
        "USER_DELETE",
        "PRO_APPROVE",
        "PRO_REJECT",
        "DOCUMENT_REVIEW",
        "REVIEW_FLAG",
        "REVIEW_REMOVE",
        "REVIEW_RESTORE",
      ]),
    })
    .passthrough()
    .parse(input);
  const { action } = envelope;
  if (action === "USER_CREATE" || action === "USER_UPDATE") {
    const data = z
      .object({
        id: entityId.optional(),
        name: cleanText(2, 120),
        email,
        role: z.enum(["CLIENT", "PRO", "ADMIN", "SUPPORT"]),
        city: municipalityName,
        phone: z.string().trim().max(30).default(""),
        password: password.optional().or(z.literal("")),
        categorySlug: cleanText(1, 80).optional(),
      })
      .parse(envelope);
    const passwordHash = data.password
      ? await hashPassword(data.password)
      : undefined;
    invariant(
      action !== "USER_CREATE" || passwordHash,
      "PASSWORD",
      400,
      "Vendosni një fjalëkalim fillestar të fortë.",
    );
    return serializable(async (tx) => {
      await adminAccess(actor, tx);
      if (action === "USER_CREATE") {
        if (data.role === "PRO") {
          invariant(data.categorySlug, "CATEGORY", 400, "Zgjidhni kategorinë e profesionistit.");
          await requireActiveCategory(data.categorySlug, tx);
          data.categorySlug = professionSlug(data.categorySlug)!;
        }
        invariant(
          !(await tx.user.findUnique({ where: { email: data.email } })),
          "EXISTS",
          409,
          "Emaili është përdorur tashmë.",
        );
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            role: data.role,
            city: data.city,
            phone: data.phone || null,
            passwordHash: passwordHash!,
            ...(data.role === "PRO"
              ? {
                  proProfile: {
                    create: {
                      slug: `pro-${opaqueToken().slice(0, 16)}`,
                      categorySlug: data.categorySlug!,
                      about: "Profili duhet të plotësohet para shqyrtimit.",
                      // Prices are set by the pro in their profile panel.
                      priceFrom: null,
                      categories: { create: [{ categorySlug: data.categorySlug!, position: 0 }] },
                      serviceCities: [data.city],
                      verification: "PENDING",
                      autoBid: false,
                      weeklyBudget: 0,
                    },
                  },
                }
              : {}),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action,
            target: user.id,
            meta: { role: data.role },
          },
        });
      } else {
        entityId.parse(data.id);
        const target = await tx.user.findUnique({
          where: { id: data.id },
          include: { proProfile: true },
        });
        invariant(target, "NOT_FOUND", 404, "Llogaria nuk u gjet.");
        invariant(!target.deletedAt, "DELETED", 409, "Kjo llogari është fshirë tashmë.");
        await preserveAdmin(
          tx,
          target,
          actor,
          target.role === "ADMIN" && data.role !== "ADMIN",
        );
        if (target.role !== data.role) {
          invariant(
            !target.proProfile &&
              !(await tx.serviceRequest.findFirst({
                where: { clientId: target.id },
              })),
            "ROLE_HISTORY",
            409,
            "Ndryshimi i rolit kërkon kontroll të historikut të llogarisë.",
          );
          invariant(
            data.role !== "PRO",
            "PRO_REGISTRATION",
            409,
            "Krijoni profil profesional përmes regjistrimit të profesionistit.",
          );
        }
        const otherEmail = await tx.user.findUnique({
          where: { email: data.email },
        });
        invariant(
          !otherEmail || otherEmail.id === target.id,
          "EMAIL_EXISTS",
          409,
          "Emaili është përdorur tashmë.",
        );
        await tx.user.update({
          where: { id: target.id },
          data: {
            name: data.name,
            email: data.email,
            role: data.role,
            city: data.city,
            phone: data.phone || null,
            passwordHash,
            ...(target.email !== data.email ? { emailVerified: null } : {}),
          },
        });
        if (
          target.email !== data.email ||
          target.role !== data.role ||
          passwordHash
        ) {
          await tx.session.deleteMany({ where: { userId: target.id } });
          await tx.authToken.updateMany({
            where: { userId: target.id, usedAt: null },
            data: { usedAt: new Date() },
          });
        }
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action,
            target: target.id,
            meta: {
              role: data.role,
              passwordReset: Boolean(passwordHash),
              emailChanged: target.email !== data.email,
            },
          },
        });
      }
      return { ok: true };
    });
  }
  if (action === "USER_SET_PROFESSIONS") {
    const data = z.object({ id: entityId, categories: z.array(cleanText(1, 80)).min(1).max(20) }).parse(envelope);
    return serializable(async (tx) => {
      await adminAccess(actor, tx);
      const target = await tx.user.findUnique({ where: { id: data.id }, include: { proProfile: true } });
      invariant(target && !target.deletedAt && target.proProfile, "NOT_FOUND", 404, "Profili profesional nuk u gjet.");
      const result = await setAdminProfessions(tx, target.proProfile.id, data.categories);
      await tx.auditLog.create({ data: { actorId: actor.id, action, target: target.id, meta: { profileId: target.proProfile.id, ...result } } });
      return { ok: true, message: "Profesionet u ruajtën dhe u miratuan." };
    });
  }
  if (action === "USER_DELETE") {
    const data = z.object({ id: entityId, confirmation: cleanText(3, 200) }).parse(envelope);
    const passwordHash = await hashPassword(opaqueToken());
    const erased = await serializable(async (tx) => {
      await adminAccess(actor, tx);
      const result = await eraseAccount(tx, actor, data.id, data.confirmation, passwordHash);
      await tx.auditLog.create({
        data: { actorId: actor.id, action, target: data.id, meta: { email: result.email, name: result.name, profileId: result.profileId } },
      });
      return result;
    });
    await afterEraseAccount(erased.storagePaths);
    return { ok: true, message: "Llogaria u hoq. Rezervimet dhe bisedat mbeten të anonimizuara." };
  }
  const data = z
    .object({
      id: entityId,
      reason: z.preprocess((v) => (v === "" || v == null ? undefined : v), cleanText(5, 1000).optional()),
      duration: z.enum(SUSPEND_DURATIONS).optional(),
      untilDate: z.string().trim().max(32).optional(),
    })
    .parse(envelope);
  return serializable(async (tx) => {
    await adminAccess(actor, tx);
    if (action === "USER_SUSPEND" || action === "USER_RESTORE") {
      const target = await tx.user.findUnique({ where: { id: data.id } });
      invariant(target, "NOT_FOUND", 404, "Llogaria nuk u gjet.");
      invariant(!target.deletedAt, "DELETED", 409, "Kjo llogari është fshirë tashmë.");
      await preserveAdmin(tx, target, actor, action === "USER_SUSPEND");
      if (action === "USER_SUSPEND") {
        const duration = data.duration ?? "permanent";
        const suspendedUntil = resolveSuspendedUntil(duration, data.untilDate);
        await tx.user.update({
          where: { id: data.id },
          data: { suspendedAt: new Date(), suspendedUntil, suspensionReason: data.reason ?? null },
        });
        await tx.session.deleteMany({ where: { userId: data.id } });
        await tx.authToken.updateMany({
          where: { userId: data.id, usedAt: null },
          data: { usedAt: new Date() },
        });
      } else {
        await tx.user.update({
          where: { id: data.id },
          data: { suspendedAt: null, suspendedUntil: null, suspensionReason: null },
        });
      }
    } else if (action === "PRO_APPROVE" || action === "PRO_REJECT") {
      const profile = await tx.proProfile.findUnique({
        where: { id: data.id },
        include: { user: true },
      });
      invariant(
        profile && profile.user.role === "PRO" && !profile.user.suspendedAt,
        "NOT_FOUND",
        404,
        "Profili aktiv nuk u gjet.",
      );
      invariant(
        data.reason,
        "REASON",
        400,
        "Shënoni arsyen dhe kontrollet që keni kryer.",
      );
      // Approving the profile approves every profession it lists that is still active in the
      // catalogue (including ones added later while the profile was already approved).
      const rows = await tx.proCategory.findMany({ where: { profileId: profile.id } });
      const active: string[] = (await activeServiceCategories(tx)).map((c) => c.slug);
      const approvable = rows.filter((r) => active.includes(serviceCategory(r.categorySlug)?.slug ?? ""));
      if (action === "PRO_APPROVE") {
        invariant(
          profile.about.length >= 30 && approvable.length > 0,
          "PROFILE",
          409,
          "Plotësoni profilin dhe të paktën një profesion aktiv.",
        );
        await tx.proCategory.updateMany({
          where: { id: { in: approvable.filter((r) => !r.approvedAt).map((r) => r.id) } },
          data: { approvedAt: new Date() },
        });
        await syncProfileSummary(tx, profile.id);
      }
      await tx.proProfile.update({
        where: { id: data.id },
        data: {
          verification: action === "PRO_APPROVE" ? "APPROVED" : "REJECTED",
          verifiedAt: action === "PRO_APPROVE" ? new Date() : null,
        },
      });
      await notify(
        tx,
        profile.userId,
        action,
        action === "PRO_APPROVE"
          ? "Profili juaj u miratua"
          : "Profili juaj kërkon rishikim; kontaktoni mbështetjen",
        "/pro/profili",
      );
    } else if (action === "DOCUMENT_REVIEW") {
      invariant(data.reason, "REASON", 400, "Shënoni rezultatin e kontrollit.");
      await tx.proDocument.update({
        where: { id: data.id },
        data: { reviewed: true },
      });
    } else {
      invariant(
        data.reason || action === "REVIEW_RESTORE",
        "REASON",
        400,
        "Shënoni arsyen e moderimit.",
      );
      const review = await tx.review.update({
        where: { id: data.id },
        data: {
          state:
            action === "REVIEW_FLAG"
              ? "FLAGGED"
              : action === "REVIEW_REMOVE"
                ? "REMOVED"
                : "PUBLISHED",
          flagReason: action === "REVIEW_RESTORE" ? null : data.reason,
        },
      });
      const stats = await tx.review.aggregate({
        where: { profileId: review.profileId, state: "PUBLISHED" },
        _count: true,
        _avg: { rating: true },
      });
      await tx.proProfile.update({
        where: { id: review.profileId },
        data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action,
        target: data.id,
        meta: { reason: data.reason ?? null },
      },
    });
    return { ok: true };
  });
}

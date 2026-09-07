import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Actor } from "./auth";
import { hashPassword } from "./auth";
import { serializable } from "./marketplace";
import { invariant } from "./errors";
import { notify } from "./notifications";
import { entityId, cleanText, euroAmount } from "../marketplace-validation";
import { email, password } from "../validation";
import { opaqueToken } from "./tokens";

async function adminAccess(actor: Actor, tx: Prisma.TransactionClient) {
  invariant(
    actor.role === "ADMIN" &&
      (await tx.user.findFirst({
        where: { id: actor.id, role: "ADMIN", suspendedAt: null },
      })),
    "FORBIDDEN",
    403,
    "Nuk keni qasje.",
  );
}
async function preserveAdmin(
  tx: Prisma.TransactionClient,
  target: { id: string; role: string; suspendedAt: Date | null },
  actor: Actor,
  losesAdmin: boolean,
) {
  if (!losesAdmin) return;
  invariant(
    target.id !== actor.id,
    "SELF",
    409,
    "Nuk mund të hiqni qasjen tuaj administrative.",
  );
  if (target.role === "ADMIN" && !target.suspendedAt)
    invariant(
      (await tx.user.count({ where: { role: "ADMIN", suspendedAt: null } })) >
        1,
      "LAST_ADMIN",
      409,
      "Duhet të mbetet një administrator aktiv.",
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
        city: cleanText(1, 60),
        phone: z.string().trim().max(30).default(""),
        password: password.optional().or(z.literal("")),
        categorySlug: cleanText(1, 80).optional(),
        priceFrom: euroAmount.optional(),
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
        if (data.role === "PRO")
          invariant(
            data.categorySlug &&
              (await tx.category.findFirst({
                where: { slug: data.categorySlug, active: true },
              })),
            "CATEGORY",
            400,
            "Zgjidhni kategorinë e profesionistit.",
          );
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
                      priceFrom: data.priceFrom ?? 100,
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
  const data = z
    .object({ id: entityId, reason: cleanText(5, 1000).optional() })
    .parse(envelope);
  return serializable(async (tx) => {
    await adminAccess(actor, tx);
    if (action === "USER_SUSPEND" || action === "USER_RESTORE") {
      const target = await tx.user.findUnique({ where: { id: data.id } });
      invariant(target, "NOT_FOUND", 404, "Llogaria nuk u gjet.");
      await preserveAdmin(tx, target, actor, action === "USER_SUSPEND");
      await tx.user.update({
        where: { id: data.id },
        data: { suspendedAt: action === "USER_SUSPEND" ? new Date() : null },
      });
      if (action === "USER_SUSPEND") {
        await tx.session.deleteMany({ where: { userId: data.id } });
        await tx.authToken.updateMany({
          where: { userId: data.id, usedAt: null },
          data: { usedAt: new Date() },
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
      if (action === "PRO_APPROVE")
        invariant(
          profile.about.length >= 30 &&
            (await tx.category.findFirst({
              where: { slug: profile.categorySlug, active: true },
            })),
          "PROFILE",
          409,
          "Plotësoni profilin dhe kategorinë aktive.",
        );
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

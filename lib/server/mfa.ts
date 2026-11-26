import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { invariant } from "./errors";
import { encrypt, decrypt } from "./crypto";
import { hashToken, opaqueToken, equalSecret } from "./tokens";
import { enforceLimit } from "./rate-limit";
import { serializable } from "./transaction";
import { readMfa, writeMfa, type MfaState } from "./mfa-state";
import { newTotpSecret, totpStep } from "./totp";
import type { Actor } from "./auth";

const normalized = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();
const recoveryHash = (userId: string, code: string) => hashToken(`mfa-recovery:${userId}:${normalized(code)}`);
function recoveries(userId: string) {
  const codes = Array.from({ length: 10 }, () => randomBytes(16).toString("hex").toUpperCase().match(/.{4}/g)!.join("-"));
  return { codes, hashes: codes.map(code => recoveryHash(userId, code)) };
}
function consume(state: MfaState, userId: string, code: string) {
  const value = normalized(code);
  const step = totpStep(decrypt(state.secretEnc), value, state.lastStep);
  if (step !== null) return { ...state, lastStep: step };
  if (/^[A-F0-9]{32}$/.test(value)) {
    const hash = recoveryHash(userId, value);
    const index = state.recoveryHashes.findIndex(saved => equalSecret(saved, hash));
    if (index >= 0) return { ...state, recoveryHashes: state.recoveryHashes.filter((_, i) => i !== index) };
  }
  invariant(false, "MFA_CODE", 401, "Kodi është i pasaktë, i përdorur ose ka skaduar. Provoni kodin e ri ose një kod rikuperimi.");
}

/** Called after password validation. The returned generation is checked again at session creation. */
export async function verifyLoginFactor(userId: string, expectedPasswordHash: string, code?: string) {
  const before = await readMfa(db, userId);
  if (!before?.enabled) return undefined;
  invariant(code, "MFA_REQUIRED", 401, "Shkruani kodin nga aplikacioni i autentikimit ose një kod rikuperimi.");
  await enforceLimit(`mfa-login:${userId}`, 8, 15 * 60_000);
  return serializable(async tx => {
    await tx.$queryRaw`SELECT id FROM public."User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { passwordHash: true, suspendedAt: true } });
    invariant(user && !user.suspendedAt && user.passwordHash === expectedPasswordHash, "CREDENTIALS", 401, "Hyrja duhet përsëritur.");
    const state = await readMfa(tx, userId);
    invariant(state?.enabled, "MFA_CHANGED", 409, "Siguria e llogarisë ka ndryshuar. Përsëritni hyrjen.");
    await writeMfa(tx, userId, consume(state, userId, code));
    return state.version;
  });
}

export async function mfaStatus(actor: Pick<Actor, "id">) {
  const state = await readMfa(db, actor.id);
  return { enabled: Boolean(state?.enabled), recoveryCodesRemaining: state?.enabled ? state.recoveryHashes.length : 0 };
}

export async function manageMfa(actor: Actor, input: unknown) {
  const data = z.object({
    action: z.enum(["BEGIN", "ENABLE", "DISABLE", "REGENERATE"]),
    currentPassword: z.string().min(1).max(256),
    code: z.string().max(50).default(""),
  }).parse(input);
  await enforceLimit(`mfa-manage:${actor.id}`, 8, 15 * 60_000);
  const credentials = await db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { passwordHash: true } });
  invariant(await bcrypt.compare(data.currentPassword, credentials.passwordHash), "CREDENTIALS", 401, "Fjalëkalimi aktual nuk është i saktë.");
  return serializable(async tx => {
    await tx.$queryRaw`SELECT id FROM public."User" WHERE id = ${actor.id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true, suspendedAt: true } });
    invariant(user && !user.suspendedAt && user.passwordHash === credentials.passwordHash, "CREDENTIALS", 401, "Hyrja duhet përsëritur.");
    let state = await readMfa(tx, actor.id);
    if (data.action === "BEGIN") {
      invariant(!state?.enabled, "MFA_ENABLED", 409, "Autentikimi me dy hapa është tashmë aktiv.");
      invariant(/^[a-fA-F0-9]{64}$/.test(process.env.ENCRYPTION_KEY ?? ""), "MFA_UNAVAILABLE", 503, "Aktivizimi nuk është i disponueshëm për momentin.");
      const secret = newTotpSecret();
      state = { version: opaqueToken(), enabled: false, secretEnc: encrypt(secret), lastStep: -1, recoveryHashes: [], enrollmentExpiresAt: Date.now() + 10 * 60_000 };
      await writeMfa(tx, actor.id, state);
      return { ok: true, enabled: false, secret, message: "Shtoni çelësin në aplikacionin tuaj dhe konfirmoni kodin brenda 10 minutave." };
    }
    invariant(state, "MFA_SETUP", 409, "Filloni konfigurimin përsëri.");
    let codes: string[] | undefined;
    if (data.action === "ENABLE") {
      invariant(!state.enabled && state.enrollmentExpiresAt > Date.now(), "MFA_SETUP", 409, "Konfigurimi ka skaduar ose është përfunduar.");
      const step = totpStep(decrypt(state.secretEnc), normalized(data.code), -1);
      invariant(step !== null, "MFA_CODE", 401, "Kodi nuk është i saktë. Kontrolloni orën e pajisjes dhe provoni përsëri.");
      const recovery = recoveries(actor.id);
      codes = recovery.codes;
      state = { ...state, enabled: true, lastStep: step, recoveryHashes: recovery.hashes, enrollmentExpiresAt: 0 };
    } else {
      invariant(state.enabled, "MFA_DISABLED", 409, "Autentikimi me dy hapa nuk është aktiv.");
      state = consume(state, actor.id, data.code);
      if (data.action === "DISABLE") state = { ...state, enabled: false, secretEnc: "", lastStep: -1, recoveryHashes: [], enrollmentExpiresAt: 0, version: opaqueToken() };
      else {
        const recovery = recoveries(actor.id);
        codes = recovery.codes;
        state = { ...state, recoveryHashes: recovery.hashes, version: opaqueToken() };
      }
    }
    await writeMfa(tx, actor.id, state);
    await tx.session.deleteMany({ where: { userId: actor.id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: `MFA_${data.action}`, target: actor.id } });
    return { ok: true, enabled: state.enabled, recoveryCodes: codes, reauthenticate: true,
      message: "Ndryshimi u ruajt dhe hyrjet e mëparshme u mbyllën. Ruani kodet dhe hyni përsëri." };
  });
}

import crypto from "crypto";

/**
 * AES-256-GCM for data we must store but must never leak: national ID
 * numbers and IBANs. The key lives in ENCRYPTION_KEY (64 hex chars).
 *
 * Generate one with:  openssl rand -hex 32
 */
const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters. Generate: openssl rand -hex 32"
    );
  }
  return Buffer.from(raw, "hex");
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export const last4 = (s: string) => s.slice(-4);

import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(bytes: Uint8Array) {
  let bits = 0, value = 0, text = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { bits -= 5; text += ALPHABET[(value >>> bits) & 31]; }
  }
  if (bits) text += ALPHABET[(value << (5 - bits)) & 31];
  return text;
}
function decode(secret: string) {
  if (!/^[A-Z2-7]{32,104}$/.test(secret)) throw new Error("INVALID_TOTP_SECRET");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const letter of secret) {
    value = (value << 5) | ALPHABET.indexOf(letter);
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  return Buffer.from(bytes);
}
export const newTotpSecret = () => base32(randomBytes(20));

/** RFC 6238: SHA-1, 30-second steps, six digits for authenticator interoperability. */
export function totp(secret: string, now = Date.now(), digits = 6) {
  if (!Number.isSafeInteger(now) || now < 0 || ![6, 8].includes(digits)) throw new Error("INVALID_TOTP_TIME");
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const mac = createHmac("sha1", decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, "0");
}
export function totpStep(secret: string, code: string, lastStep: number, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 30_000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate < 0 || candidate <= lastStep) continue;
    if (timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, candidate * 30_000)))) return candidate;
  }
  return null;
}

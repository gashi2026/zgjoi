import {
  createHash,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";

export const opaqueToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) =>
  `sha256:${createHash("sha256").update(token).digest("hex")}`;
export const validToken = (token: unknown): token is string =>
  typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

export function equalSecret(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}

export function previewCookie(password: string) {
  return createHmac("sha256", password)
    .update("zgjoi-preview-cookie-v2")
    .digest("hex");
}

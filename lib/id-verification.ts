// Identity verification: shared constants, labels and pure helpers (no server imports).

export const ID_STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;
export type IdStatus = (typeof ID_STATUSES)[number];
export const ID_SIDES = ["FRONT", "BACK"] as const;
export type IdSide = (typeof ID_SIDES)[number];

/** Retention (owner, 26 Nov 2026): ID photos are deleted 30 days after any decision.
 * The identity record (IdentityRecord) is kept permanently for legal and safety reporting. */
export const ID_RETENTION_DAYS_AFTER_APPROVAL = 30;
export const ID_RETENTION_DAYS_AFTER_DECLINE = 30;
/** Minimum age to hold a verified account (business default; see PR notes). */
export const ID_MIN_AGE_YEARS = 18;

/** Server limit per side, after the browser has converted the photo to JPEG. */
export const ID_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** What the user may pick before conversion (the browser shrinks it). */
export const ID_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
/** Longest edge of the converted photo, and the smallest edge we accept. */
export const ID_TARGET_EDGE_PX = 1800;
export const ID_MIN_EDGE_PX = 400;

export const idStatusLabels: Record<IdStatus, string> = {
  PENDING: "Në shqyrtim",
  APPROVED: "I verifikuar",
  DECLINED: "Refuzuar",
};

/** Accepted documents (owner, 26 Nov 2026): only the Kosovo ID card or a passport. */
export const ID_DOCUMENT_TYPES = ["ID_CARD", "PASSPORT"] as const;
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];
export const idDocumentTypeLabels: Record<IdDocumentType, string> = {
  ID_CARD: "Letërnjoftim",
  PASSPORT: "Pasaportë",
};
/** ID card: both sides required. Passport: the photo page is required, a second page is optional. */
export const backRequired = (type: IdDocumentType) => type === "ID_CARD";
export const asDocumentType = (v: unknown): IdDocumentType => (v === "PASSPORT" ? "PASSPORT" : "ID_CARD");

export const idSideLabels: Record<IdSide, string> = {
  FRONT: "Ana e përparme",
  BACK: "Ana e pasme",
};
export function sideLabel(type: IdDocumentType, side: IdSide) {
  if (type === "PASSPORT") return side === "FRONT" ? "Faqja me foto" : "Faqja tjetër (opsionale)";
  return idSideLabels[side];
}

/** Preset decline reasons the owner picks from; OTHER needs a free-text note. */
export const ID_DECLINE_REASONS = {
  BLURRY: "Fotoja është e paqartë ose e turbullt",
  CUT_OFF: "Dokumenti nuk shihet i plotë (skajet janë prerë)",
  GLARE: "Drita ose reflektimi fsheh të dhënat",
  SIDES: "Mungon njëra anë e letërnjoftimit, ose të dyja fotot tregojnë të njëjtën anë",
  WRONG_DOCUMENT: "Pranohet vetëm letërnjoftimi ose pasaporta e vlefshme",
  EXPIRED: "Dokumenti ka skaduar",
  NAME_MISMATCH: "Emri në dokument nuk përputhet me emrin e llogarisë",
  OTHER: "Arsye tjetër",
} as const;
export type IdDeclineReason = keyof typeof ID_DECLINE_REASONS;

export function idPurgeAfter(decision: "APPROVED" | "DECLINED", decidedAt: Date) {
  const days = decision === "APPROVED" ? ID_RETENTION_DAYS_AFTER_APPROVAL : ID_RETENTION_DAYS_AFTER_DECLINE;
  return new Date(decidedAt.getTime() + days * 86_400_000);
}

export function declineText(reason: string | null | undefined, note?: string | null) {
  const preset = reason && reason in ID_DECLINE_REASONS ? ID_DECLINE_REASONS[reason as IdDeclineReason] : null;
  if (reason === "OTHER") return note || preset || "";
  return [preset, note].filter(Boolean).join(". ");
}

/** Accounts that must pass the ID check before booking or taking jobs. Staff never are. */
export const needsIdCheck = (role: string) => role === "CLIENT" || role === "PRO";

export type ImageInfo = { type: "image/jpeg" | "image/png"; width: number; height: number };

/** Detects HEIC/HEIF (ISO-BMFF "ftyp" with a HEIF brand) so we can explain the conversion. */
export function isHeic(b: Uint8Array) {
  if (b.length < 12) return false;
  const box = String.fromCharCode(...b.subarray(4, 8));
  const brand = String.fromCharCode(...b.subarray(8, 12));
  return box === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|avif)$/.test(brand);
}

/** Reads the real type and pixel size from the bytes (never trusts the file name or MIME). */
export function readImageInfo(b: Uint8Array): ImageInfo | null {
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { type: "image/png", width: v.getUint32(16), height: v.getUint32(20) };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      if (marker === 0xd9 || marker === 0xda) break;
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len < 2) break;
      // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { type: "image/jpeg", height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
    return null;
  }
  return null;
}

/** Calendar date "YYYY-MM-DD" → UTC Date, or null when it is not a real date. */
export function parseCalendarDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}
export function ageOn(birth: Date, today: Date) {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const md = (today.getUTCMonth() - birth.getUTCMonth()) * 100 + (today.getUTCDate() - birth.getUTCDate());
  if (md < 0) age--;
  return age;
}
/** Document numbers are stored upper-case without spaces or dashes. */
export const normalizeDocumentNo = (v: string) => v.toUpperCase().replace(/[\s-]/g, "");

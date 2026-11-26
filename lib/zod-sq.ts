import { z, ZodIssueCode, type ZodErrorMap } from "zod";

/**
 * Albanian default messages for Zod. Schema-specific messages (e.g.
 * `.min(2, "…")`) still win; this only replaces Zod's English fallbacks such
 * as "Number must be less than or equal to 1000".
 */
export const albanianErrorMap: ZodErrorMap = (issue) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null")
        return { message: "Kjo fushë është e detyrueshme." };
      return { message: "Vlera nuk është në formatin e duhur." };
    case ZodIssueCode.invalid_enum_value:
    case ZodIssueCode.invalid_literal:
    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_union_discriminator:
      return { message: "Zgjidhni një nga vlerat e lejuara." };
    case ZodIssueCode.too_small:
      if (issue.type === "string")
        return { message: issue.minimum === 1 ? "Kjo fushë është e detyrueshme." : `Shkruani të paktën ${issue.minimum} shkronja.` };
      if (issue.type === "array" || issue.type === "set")
        return { message: `Zgjidhni të paktën ${issue.minimum}.` };
      if (issue.type === "number" || issue.type === "bigint")
        return { message: `Vlera duhet të jetë ${issue.inclusive ? "së paku" : "më e madhe se"} ${issue.minimum}.` };
      return { message: "Vlera është shumë e vogël." };
    case ZodIssueCode.too_big:
      if (issue.type === "string")
        return { message: `Shkruani jo më shumë se ${issue.maximum} shkronja.` };
      if (issue.type === "array" || issue.type === "set")
        return { message: `Zgjidhni jo më shumë se ${issue.maximum}.` };
      if (issue.type === "number" || issue.type === "bigint")
        return { message: `Vlera duhet të jetë ${issue.inclusive ? "jo më shumë se" : "më e vogël se"} ${issue.maximum}.` };
      return { message: "Vlera është shumë e madhe." };
    case ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Shkruani një adresë emaili të vlefshme." };
      if (issue.validation === "url") return { message: "Shkruani një lidhje të vlefshme." };
      return { message: "Formati nuk është i vlefshëm." };
    case ZodIssueCode.invalid_date:
      return { message: "Data nuk është e vlefshme." };
    case ZodIssueCode.not_multiple_of:
      return { message: "Vlera nuk është e vlefshme." };
    case ZodIssueCode.unrecognized_keys:
      return { message: "Kërkesa përmban fusha të panjohura." };
    case ZodIssueCode.custom:
      return { message: issue.message ?? "Vlera nuk është e vlefshme." };
    default:
      return { message: "Vlera nuk është e vlefshme." };
  }
};

z.setErrorMap(albanianErrorMap);

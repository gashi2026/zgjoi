import { z } from "zod";

type Issue = z.core.$ZodRawIssue;

/**
 * Albanian default messages for Zod 4. Schema-specific messages (e.g.
 * `.min(2, "…")`) still win; this only replaces Zod's English fallbacks such
 * as "Too big: expected number to be <=1000".
 */
export function albanianError(issue: Issue): string {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null
        ? "Kjo fushë është e detyrueshme."
        : "Vlera nuk është në formatin e duhur.";
    case "invalid_value":
    case "invalid_union":
      return "Zgjidhni një nga vlerat e lejuara.";
    case "too_small": {
      const min = Number(issue.minimum);
      if (issue.origin === "string")
        return min <= 1 ? "Kjo fushë është e detyrueshme." : `Shkruani të paktën ${min} shkronja.`;
      if (issue.origin === "array" || issue.origin === "set")
        return `Zgjidhni të paktën ${min}.`;
      if (issue.origin === "number" || issue.origin === "int" || issue.origin === "bigint")
        return `Vlera duhet të jetë ${issue.inclusive ? "së paku" : "më e madhe se"} ${min}.`;
      return "Vlera është shumë e vogël.";
    }
    case "too_big": {
      const max = Number(issue.maximum);
      if (issue.origin === "string") return `Shkruani jo më shumë se ${max} shkronja.`;
      if (issue.origin === "array" || issue.origin === "set")
        return `Zgjidhni jo më shumë se ${max}.`;
      if (issue.origin === "number" || issue.origin === "int" || issue.origin === "bigint")
        return `Vlera duhet të jetë ${issue.inclusive ? "jo më shumë se" : "më e vogël se"} ${max}.`;
      return "Vlera është shumë e madhe.";
    }
    case "invalid_format":
      if (issue.format === "email") return "Shkruani një adresë emaili të vlefshme.";
      if (issue.format === "url") return "Shkruani një lidhje të vlefshme.";
      if (issue.format === "date" || issue.format === "datetime") return "Data nuk është e vlefshme.";
      return "Formati nuk është i vlefshëm.";
    case "unrecognized_keys":
      return "Kërkesa përmban fusha të panjohura.";
    default:
      return "Vlera nuk është e vlefshme.";
  }
}

z.config({ customError: (issue) => albanianError(issue) });

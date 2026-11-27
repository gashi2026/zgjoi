import type { T } from "./i18n/translate";
/**
 * Live support runs 09:00–17:00, Monday to Friday, Kosovo time.
 * Kosovo uses Europe/Belgrade (CET/CEST) — the same offset year-round rules,
 * so we let Intl handle daylight saving rather than hardcoding +1/+2.
 */
export const SUPPORT_TZ = "Europe/Belgrade";
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 17;
/** Monday–Friday. Saturday and Sunday are closed. */
export const OPEN_DAYS = [1, 2, 3, 4, 5];

export type SupportReopen = "online" | "today" | "tomorrow" | "weekday";

export type SupportStatus = {
  online: boolean;
  /** Local time in Kosovo, e.g. "14:32" */
  localTime: string;
  /**
   * Albanian sentence describing when we are back. Kept for the support API
   * and the English catalog translator (`t.tx`).
   */
  nextOpenLabel: string;
  /** How the next opening should be phrased. */
  reopen: SupportReopen;
  /** Weekday (0=Sun) of the next opening when `reopen` is `weekday`. */
  nextWeekday: number | null;
};

function kosovoParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: SUPPORT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday as string] ?? 0,
    label: `${parts.hour}:${parts.minute}`,
  };
}

const dayNames = [
  "të dielën", "të hënën", "të martën", "të mërkurën",
  "të enjten", "të premten", "të shtunën",
];

export function supportStatus(now = new Date()): SupportStatus {
  const { hour, weekday, label } = kosovoParts(now);
  const isWorkday = OPEN_DAYS.includes(weekday);
  const online = isWorkday && hour >= OPEN_HOUR && hour < CLOSE_HOUR;

  let reopen: SupportReopen;
  let nextWeekday: number | null = null;
  if (online) {
    reopen = "online";
  } else if (isWorkday && hour < OPEN_HOUR) {
    reopen = "today";
  } else {
    let d = (weekday + 1) % 7;
    let steps = 1;
    while (!OPEN_DAYS.includes(d) && steps < 8) {
      d = (d + 1) % 7;
      steps += 1;
    }
    nextWeekday = d;
    reopen = steps === 1 ? "tomorrow" : "weekday";
  }

  const open = String(OPEN_HOUR).padStart(2, "0");
  const close = String(CLOSE_HOUR).padStart(2, "0");
  const nextOpenLabel =
    reopen === "online"
      ? `Jemi online deri në ora ${close}:00`
      : reopen === "today"
        ? `Kthehemi sot në ora ${open}:00`
        : `Kthehemi ${reopen === "tomorrow" ? "nesër" : dayNames[nextWeekday ?? 1]} në ora ${open}:00`;

  return { online, localTime: label, nextOpenLabel, reopen, nextWeekday };
}

const WEEKDAY_KEYS = [
  "supportChat.sunday",
  "supportChat.monday",
  "supportChat.tuesday",
  "supportChat.wednesday",
  "supportChat.thursday",
  "supportChat.friday",
  "supportChat.saturday",
] as const;

/** Locale-aware sentence for the open-panel status line. */
export function formatSupportStatus(status: SupportStatus, t: T): string {
  const hour = {
    OPEN_HOUR: String(OPEN_HOUR).padStart(2, "0"),
    CLOSE_HOUR: String(CLOSE_HOUR).padStart(2, "0"),
  };
  if (status.reopen === "online") return t("supportChat.wereOnlineUntil", hour);
  if (status.reopen === "today") return t("supportChat.wereBackToday", hour);
  const when =
    status.reopen === "tomorrow"
      ? t("supportChat.tomorrow")
      : t(WEEKDAY_KEYS[status.nextWeekday ?? 1]);
  return t("supportChat.wereBackWhen", { ...hour, when });
}

export const SUPPORT_HOURS_LABEL = "E hënë – e premte, 09:00–17:00 (koha e Kosovës)";

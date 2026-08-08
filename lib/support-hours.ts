/**
 * Live support runs 09:00–17:00, Monday to Friday, Kosovo time.
 * Kosovo uses Europe/Belgrade (CET/CEST) — the same offset year-round rules,
 * so we let Intl handle daylight saving rather than hardcoding +1/+2.
 */
export const SUPPORT_TZ = "Europe/Belgrade";
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 17;
export const OPEN_DAYS = [1, 2, 3, 4, 5]; // Monday–Friday

export type SupportStatus = {
  online: boolean;
  /** Local time in Kosovo, e.g. "14:32" */
  localTime: string;
  /** Albanian sentence describing when we are back */
  nextOpenLabel: string;
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

  let nextOpenLabel: string;
  if (online) {
    nextOpenLabel = `Jemi online deri në ora ${CLOSE_HOUR}:00`;
  } else if (isWorkday && hour < OPEN_HOUR) {
    nextOpenLabel = `Kthehemi sot në ora ${OPEN_HOUR}:00`;
  } else {
    // find the next working day
    let d = (weekday + 1) % 7;
    let steps = 1;
    while (!OPEN_DAYS.includes(d) && steps < 8) {
      d = (d + 1) % 7;
      steps += 1;
    }
    const when = steps === 1 ? "nesër" : dayNames[d];
    nextOpenLabel = `Kthehemi ${when} në ora ${OPEN_HOUR}:00`;
  }

  return { online, localTime: label, nextOpenLabel };
}

export const SUPPORT_HOURS_LABEL = "E hënë – e premte, 09:00–17:00 (koha e Kosovës)";

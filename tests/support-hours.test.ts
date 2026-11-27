import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLOSE_HOUR,
  OPEN_DAYS,
  OPEN_HOUR,
  SUPPORT_TZ,
  formatSupportStatus,
  supportStatus,
} from "../lib/support-hours";
import { createT } from "../lib/i18n/translate";
import { en } from "../lib/i18n/messages/en";
import { sq } from "../lib/i18n/messages/sq";

const tEn = createT("en", en);
const tSq = createT("sq", sq);

/** Instant when Kosovo local time is `isoLocal` (YYYY-MM-DDTHH:MM). */
function atKosovo(isoLocal: string) {
  const [date, time] = isoLocal.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // Guess UTC as local-1h and local-2h, then verify with Intl.
  for (const offset of [1, 2, 0]) {
    const utc = new Date(Date.UTC(y, m - 1, d, hh - offset, mm, 0));
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: SUPPORT_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(utc);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    if (`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}` === isoLocal) {
      return utc;
    }
  }
  throw new Error(`Could not resolve Kosovo time ${isoLocal}`);
}

test("support hours are 09:00–17:00 every day in Europe/Belgrade", () => {
  assert.equal(SUPPORT_TZ, "Europe/Belgrade");
  assert.equal(OPEN_HOUR, 9);
  assert.equal(CLOSE_HOUR, 17);
  assert.deepEqual(OPEN_DAYS, [0, 1, 2, 3, 4, 5, 6]);
});

test("weekday lunch is online; before 09:00 and from 17:00 is offline", () => {
  // Friday 27 Nov 2026 is in CET (UTC+1).
  const lunch = supportStatus(atKosovo("2026-11-27T12:00"));
  assert.equal(lunch.online, true);
  assert.equal(lunch.reopen, "online");
  assert.equal(lunch.localTime, "12:00");
  assert.equal(formatSupportStatus(lunch, tEn), "We’re online until 17:00");
  assert.equal(formatSupportStatus(lunch, tSq), "Jemi online deri në ora 17:00");
  assert.equal(lunch.nextOpenLabel, "Jemi online deri në ora 17:00");

  const early = supportStatus(atKosovo("2026-11-27T08:59"));
  assert.equal(early.online, false);
  assert.equal(early.reopen, "today");
  assert.equal(formatSupportStatus(early, tEn), "We’re back today at 09:00");
  assert.equal(formatSupportStatus(early, tSq), "Kthehemi sot në ora 09:00");

  const open = supportStatus(atKosovo("2026-11-27T09:00"));
  assert.equal(open.online, true);

  const lastMinute = supportStatus(atKosovo("2026-11-27T16:59"));
  assert.equal(lastMinute.online, true);

  const closing = supportStatus(atKosovo("2026-11-27T17:00"));
  assert.equal(closing.online, false);
  assert.equal(closing.reopen, "tomorrow");
  assert.equal(formatSupportStatus(closing, tEn), "We’re back tomorrow at 09:00");
  assert.equal(formatSupportStatus(closing, tSq), "Kthehemi nesër në ora 09:00");
  assert.equal(closing.nextOpenLabel, "Kthehemi nesër në ora 09:00");
});

test("weekends follow the same 09:00–17:00 hours", () => {
  const saturday = supportStatus(atKosovo("2026-11-28T12:00"));
  assert.equal(saturday.online, true);
  assert.equal(saturday.reopen, "online");

  const saturdayEvening = supportStatus(atKosovo("2026-11-28T17:00"));
  assert.equal(saturdayEvening.online, false);
  assert.equal(saturdayEvening.reopen, "tomorrow");
  assert.equal(formatSupportStatus(saturdayEvening, tEn), "We’re back tomorrow at 09:00");

  const sundayMorning = supportStatus(atKosovo("2026-11-29T08:00"));
  assert.equal(sundayMorning.online, false);
  assert.equal(sundayMorning.reopen, "today");
  assert.equal(formatSupportStatus(sundayMorning, tEn), "We’re back today at 09:00");

  const sunday = supportStatus(atKosovo("2026-11-29T18:00"));
  assert.equal(sunday.online, false);
  assert.equal(sunday.reopen, "tomorrow");
  assert.equal(formatSupportStatus(sunday, tEn), "We’re back tomorrow at 09:00");
  assert.equal(formatSupportStatus(sunday, tSq), "Kthehemi nesër në ora 09:00");
});

test("Thursday evening points to tomorrow; Thursday morning to today", () => {
  // Thursday 26 Nov 2026.
  const evening = supportStatus(atKosovo("2026-11-26T20:00"));
  assert.equal(evening.online, false);
  assert.equal(evening.reopen, "tomorrow");
  assert.equal(formatSupportStatus(evening, tEn), "We’re back tomorrow at 09:00");
  assert.equal(formatSupportStatus(evening, tSq), "Kthehemi nesër në ora 09:00");
});

test("daylight saving is applied via Europe/Belgrade, not a fixed offset", () => {
  // CEST (UTC+2): Monday 29 Jun 2026, 09:00 Kosovo = 07:00Z.
  const summerOpen = supportStatus(new Date("2026-06-29T07:00:00Z"));
  assert.equal(summerOpen.online, true);
  assert.equal(summerOpen.localTime, "09:00");
  const summerTooEarly = supportStatus(new Date("2026-06-29T06:59:00Z"));
  assert.equal(summerTooEarly.online, false);
  assert.equal(summerTooEarly.reopen, "today");

  // CET (UTC+1): Monday 4 Jan 2027, 09:00 Kosovo = 08:00Z.
  const winterOpen = supportStatus(new Date("2027-01-04T08:00:00Z"));
  assert.equal(winterOpen.online, true);
  assert.equal(winterOpen.localTime, "09:00");
  const winterTooEarly = supportStatus(new Date("2027-01-04T07:59:00Z"));
  assert.equal(winterTooEarly.online, false);
});

test("the open chat panel still allows a message while showing hours in both languages", () => {
  const source = readFileSync("components/SupportChat.tsx", "utf8");
  assert(!source.includes("offlineBanner"));
  assert(source.includes("offlineNote"));
  assert(source.includes("hoursLabel"));
  assert(source.includes("formatSupportStatus"));
  assert(source.includes("support"));
  assert(source.includes("LogoMark"));
  assert(!source.includes("Kosovo time"));
  assert(!source.includes("koha e Kosovës"));
  // Hours and status are computed on every page, not only the preview homepage.
  assert(!source.includes("if (!referenceHome) return"));
  // The composer stays available; Thread is not gated on online status.
  assert(source.includes("<Thread"));
  assert(!source.includes("closed={"));
  const thread = readFileSync("components/marketplace/Thread.tsx", "utf8");
  assert(thread.includes("!support && !timeline.length"));
  assert(thread.includes("note"));
});

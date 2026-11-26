import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import "../lib/zod-sq";
import { clockTime, dateTime, unreadMessagesLabel, unreadNotificationsLabel } from "../lib/format";

test("Zod fallbacks are Albanian while custom messages still win", () => {
  const schema = z.object({
    page: z.coerce.number().int().max(1000),
    sort: z.enum(["rating", "price"]),
    name: z.string().min(2, "Shkruani emrin."),
    city: z.string(),
  });
  const errors = schema.safeParse({ page: 99999, sort: "evil", name: "a" }).error!.flatten().fieldErrors;
  assert.deepEqual(errors, {
    page: ["Vlera duhet të jetë jo më shumë se 1000."],
    sort: ["Zgjidhni një nga vlerat e lejuara."],
    name: ["Shkruani emrin."],
    city: ["Kjo fushë është e detyrueshme."],
  });
  for (const messages of Object.values(errors))
    for (const message of messages ?? []) assert(!/must|expected|invalid|required/i.test(message));
});

test("times are 24-hour Kosovo wall-clock", () => {
  const afternoon = new Date("2026-11-26T15:45:00Z"); // 16:45 in Prishtina (CET)
  assert.equal(clockTime(afternoon), "16:45");
  assert.match(dateTime(afternoon), /16:45/);
  assert.doesNotMatch(dateTime(afternoon), /m\.d\.|p\.d\./);
  assert.equal(clockTime(new Date("2026-07-01T22:05:00Z")), "00:05"); // CEST midnight
});

test("unread counters use the Albanian singular for one", () => {
  assert.equal(unreadMessagesLabel(1), "1 mesazh i palexuar");
  assert.equal(unreadMessagesLabel(3), "3 mesazhe të palexuara");
  assert.equal(unreadNotificationsLabel(1), "1 njoftim i palexuar");
  assert.equal(unreadNotificationsLabel(0), "0 njoftime të palexuara");
});

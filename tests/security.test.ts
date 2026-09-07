import test from "node:test";
import assert from "node:assert/strict";
import { appointmentMinutes, appointmentEnd, withinWorkingHours } from "../lib/appointments";
import { kosovoLocalToIso } from "../lib/scheduling";
import { base32, totp, totpStep, newTotpSecret } from "../lib/server/totp";

test("TOTP matches independent RFC 6238 SHA-1 vectors including post-2038 time", () => {
  const secret = base32(Buffer.from("12345678901234567890"));
  for (const [time, expected] of [
    [59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"],
    [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"],
  ] as const) {
    assert.equal(totp(secret, time * 1000, 8), expected);
    assert.equal(totp(secret, time * 1000), expected.slice(-6));
  }
});
test("TOTP rejects replay, out-of-window and malformed codes and preserves leading zeroes", () => {
  const secret = base32(Buffer.from("12345678901234567890")), now = 1111111109000;
  const step = Math.floor(now / 30000);
  assert.equal(totpStep(secret, "081804", -1, now), step);
  assert.equal(totpStep(secret, "081804", step, now), null);
  assert.equal(totpStep(secret, "81804", -1, now), null);
  assert.equal(totpStep(secret, "081804", -1, now + 90_000), null);
  assert.equal(totpStep(secret, totp(secret, now - 30000), -1, now), step - 1);
  assert.equal(totpStep(secret, totp(secret, now + 30000), -1, now), step + 1);
  assert.equal(totpStep(secret, "ABCDEF", -1, now), null);
  assert.throws(() => totp("bad", now));
  assert.throws(() => totp(secret, -1));
  const a = newTotpSecret(), b = newTotpSecret();
  assert.match(a, /^[A-Z2-7]{32}$/); assert.notEqual(a, b);
});
test("appointment duration is exact and legacy ambiguity cannot silently reserve a guessed interval", () => {
  for (const value of ["120", "120 min", "Dy orë", "2h", "2 hours"]) assert.equal(appointmentMinutes(value), 120);
  assert.equal(appointmentMinutes("1.5 h"), 90);
  for (const value of ["soon", "2–3 hours", "0", "-1", "1.5 min", "43201", "1e2"]) assert.equal(appointmentMinutes(value), null);
  assert.equal(appointmentEnd("2026-09-10T07:00:00Z", "120 min")?.toISOString(), "2026-09-10T09:00:00.000Z");
});

test("working hours include the whole appointment and handle Kosovo midnight and repeated DST hours", () => {
  const start = new Date(kosovoLocalToIso("2026-09-10T09:00"));
  const days = [{ weekday: 3, startMin: 540, endMin: 660 }];
  assert(withinWorkingHours(start, new Date(start.getTime() + 120 * 60_000), days));
  assert(!withinWorkingHours(start, new Date(start.getTime() + 120 * 60_000 + 1), days));
  assert(!withinWorkingHours(new Date(start.getTime() - 1), start, days));
  assert(!withinWorkingHours(start, new Date(start.getTime() + 86400000), days));
  assert(withinWorkingHours(start, new Date(start.getTime() + 86400000), []));
  // The fall-back repeats 02:00 after 02:59. Endpoint-only checks miss the gap.
  assert(!withinWorkingHours(new Date("2026-10-25T00:45:00Z"), new Date("2026-10-25T02:15:00Z"), [{ weekday: 6, startMin: 150, endMin: 210 }]));
  assert(withinWorkingHours(new Date("2026-10-25T00:00:00Z"), new Date("2026-10-25T02:00:00Z"), [{ weekday: 6, startMin: 120, endMin: 180 }]));
  assert(withinWorkingHours(new Date("2026-03-29T00:30:00Z"), new Date("2026-03-29T01:30:00Z"), [{ weekday: 6, startMin: 90, endMin: 210 }]));
});

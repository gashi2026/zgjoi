import test from "node:test";
import assert from "node:assert/strict";
import {
  euroAmount,
  signupInput,
  availabilityInput,
} from "../lib/marketplace-validation";
import {
  opaqueToken,
  hashToken,
  validToken,
  equalSecret,
  previewCookie,
} from "../lib/server/tokens";
import { splitAmount } from "../lib/server/settings";
import { canReadTicket } from "../lib/server/support";
import { assertNoContact } from "../lib/server/marketplace";
import { fileKind } from "../lib/server/storage";
import { sameOrigin, readJson } from "../lib/server/http";

test("money parsing is exact in cents and rejects malformed/unsafe amounts", () => {
  for (const [input, cents] of [
    ["19.99", 1999],
    ["0,01", 1],
    [100, 10000],
    ["89.5", 8950],
  ] as const)
    assert.equal(euroAmount.parse(input), cents);
  for (const input of [
    "0",
    "-1",
    "1.999",
    "Infinity",
    "NaN",
    "1e4",
    "100000.01",
    null,
  ])
    assert.equal(euroAmount.safeParse(input).success, false);
  assert.deepEqual(splitAmount(9999, 1500), {
    commissionAmount: 1500,
    proAmount: 8499,
  });
  assert.throws(() => splitAmount(0, 1500));
  assert.throws(() => splitAmount(1, 1.5));
});
test("session and preview credentials are unpredictable, hashed and compared safely", () => {
  const a = opaqueToken(),
    b = opaqueToken();
  assert.notEqual(a, b);
  assert(validToken(a));
  assert(!validToken("x".repeat(64)));
  assert.match(hashToken(a), /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(hashToken(a), a);
  assert(equalSecret(a, a));
  assert(!equalSecret(a, b));
  assert.notEqual(previewCookie(a), a);
  assert.notEqual(previewCookie(a), previewCookie(b));
});
test("guest capabilities do not authorize a different logged-in account", () => {
  const ticket = { userId: null, guestTokenHash: "known-hash" };
  assert(canReadTicket(ticket, null, "known-hash"));
  assert(!canReadTicket(ticket, null, "different"));
  assert(!canReadTicket(ticket, { id: "b", role: "CLIENT" }, "known-hash"));
  assert(
    !canReadTicket(
      { userId: "a", guestTokenHash: null },
      { id: "b", role: "CLIENT" },
      null,
    ),
  );
  assert(
    canReadTicket(
      { userId: "a", guestTokenHash: null },
      { id: "admin", role: "ADMIN" },
      null,
    ),
  );
});
test("signup cannot assign a staff role and availability rejects overlap/duplicates", () => {
  assert.equal(
    signupInput.safeParse({
      role: "ADMIN",
      name: "Test",
      email: "test@example.invalid",
      password: "long-test-only-password",
      city: "Prishtinë",
      terms: true,
    }).success,
    false,
  );
  assert.equal(
    availabilityInput.safeParse({
      days: [{ weekday: 0, startMin: 600, endMin: 500 }],
    }).success,
    false,
  );
  assert.equal(
    availabilityInput.safeParse({
      days: [
        { weekday: 0, startMin: 600, endMin: 700 },
        { weekday: 0, startMin: 800, endMin: 900 },
      ],
    }).success,
    false,
  );
});
test("pre-booking contact details and unsupported document signatures are rejected", () => {
  for (const text of [
    "Call +383 44 123 456",
    "Email hello@example.com",
    "Visit https://example.com",
  ])
    assert.throws(() => assertNoContact(text));
  assert.doesNotThrow(() =>
    assertNoContact("Kërkoj riparimin e dritës në kuzhinë."),
  );
  assert.equal(fileKind(Buffer.from("<svg onload=evil()>")), null);
  assert.equal(fileKind(Buffer.from("%PDF-1.7\n"))?.type, "application/pdf");
});
test("JSON boundaries reject missing origin, wrong media types, malformed JSON and oversized streams", async () => {
  assert.throws(() =>
    sameOrigin(new Request("https://zgjoi.com/api/x", { method: "POST" })),
  );
  assert.throws(() =>
    sameOrigin(
      new Request("https://zgjoi.com/api/x", {
        method: "POST",
        headers: { origin: "https://evil.invalid" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("https://zgjoi.com/api/x", {
        method: "POST",
        headers: { origin: "https://zgjoi.com" },
      }),
    ),
  );
  await assert.rejects(
    readJson(new Request("https://zgjoi.com", { method: "POST", body: "{}" })),
  );
  await assert.rejects(
    readJson(
      new Request("https://zgjoi.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    ),
  );
  await assert.rejects(
    readJson(
      new Request("https://zgjoi.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(20000) }),
      }),
    ),
  );
});

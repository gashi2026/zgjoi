import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
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
import { api, sameOrigin, readJson } from "../lib/server/http";
import { databaseFailureDetails } from "../lib/server/error-diagnostics";

test("database diagnostics classify failures without logging credentials or Prisma messages", async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });
  const secretUrl =
    "postgresql://private-user:private-password@db.synthetic.supabase.co:5432/postgres";
  process.env.DATABASE_URL = secretUrl;
  const error = new Prisma.PrismaClientInitializationError(
    `Cannot connect: ${secretUrl}; private-query-value`,
    "5.22.0",
    "P1001",
  );
  const log = t.mock.method(console, "error", () => {});
  const response = await api(
    new Request("https://zgjoi.invalid/api/catalog"),
    async () => {
      throw error;
    },
  );
  assert.equal(response.status, 503);
  const body = await response.json();
  const logged = JSON.parse(String(log.mock.calls[0].arguments[0]));
  assert.equal(logged.requestId, body.requestId);
  assert.equal(logged.databaseErrorCode, "P1001");
  assert.equal(logged.databaseEndpoint, "supabase_direct");
  assert.equal(logged.databaseFailureReason, "unclassified");
  assert.equal(logged.databasePasswordState, "present");
  assert.equal(body.databaseErrorCode, undefined);
  assert.equal(body.databaseEndpoint, undefined);
  assert.equal(body.databaseFailureReason, undefined);
  assert.equal(body.databasePasswordState, undefined);
  for (const secret of [
    secretUrl,
    "private-user",
    "private-password",
    "db.synthetic",
    "private-query-value",
  ])
    assert(!JSON.stringify({ logged, body }).includes(secret));
});

test("database diagnostics reject arbitrary metadata and classify missing or invalid endpoints", (t) => {
  const originalUrl = process.env.DATABASE_URL;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });
  const error = new Prisma.PrismaClientInitializationError(
    "private", "5.22.0", "private-password",
  );
  for (const [value, expected] of [
    ["", "missing"],
    ["not-a-url", "invalid"],
    ["https://example.invalid", "invalid"],
    [
      "postgres://user:secret@aws-test.pooler.supabase.com:6543/postgres",
      "supabase_pooler",
    ],
    [
      "postgres://user:secret@pooler.supabase.com.attacker.invalid:6543/postgres",
      "other",
    ],
  ]) {
    process.env.DATABASE_URL = value;
    assert.deepEqual(databaseFailureDetails(error), {
      databaseEndpoint: expected,
      databaseFailureReason: "unclassified",
      ...(expected === "supabase_pooler" ? {
        databaseProjectRef: undefined,
        databasePasswordState: "present",
      } : {}),
    });
  }
  for (const [password, state] of [
    ["", "missing"],
    ["[YOUR-PASSWORD]", "placeholder"],
    ["%5BYOUR_PASSWORD%5D", "placeholder"],
    ["test-secret", "present"],
  ]) {
    process.env.DATABASE_URL =
      `postgresql://postgres.abcdefghijklmnopqrst:${password}@aws-test.pooler.supabase.com:6543/postgres`;
    const details = databaseFailureDetails(error);
    assert.equal(details.databaseProjectRef, "abcdefghijklmnopqrst");
    assert.equal(details.databasePasswordState, state);
    assert(!JSON.stringify(details).includes("test-secret"));
    assert(!JSON.stringify(details).includes("postgres."));
    assert(!JSON.stringify(details).includes("aws-test"));
  }
  for (const [message, reason] of [
    ["FATAL: Tenant or user not found", "pooler_tenant_or_user_not_found"],
    ["password authentication failed for user", "authentication_failed"],
    ["Can't reach database server", "database_unreachable"],
    ["Error opening a TLS connection", "tls_error"],
    ["Environment variable not found", "environment_variable_missing"],
    ["The provided database string is invalid", "invalid_connection_string"],
    ["FATAL: MaxClientsInSessionMode", "connection_limit"],
    ["Timed out fetching a new connection from the connection pool", "pool_timeout"],
    ["Prisma Client could not locate the Query Engine", "query_engine_unavailable"],
    ["Connection attempt timed out", "connection_timeout"],
    ["Server has closed the connection", "connection_closed"],
  ]) {
    const details = databaseFailureDetails(
      new Prisma.PrismaClientInitializationError(
        `${message}; private-password; postgresql://private:secret@example.invalid/db`,
        "5.22.0",
      ),
    );
    assert.equal(details.databaseFailureReason, reason);
    assert(!JSON.stringify(details).includes("private"));
    assert(!JSON.stringify(details).includes("secret"));
  }
  assert.deepEqual(
    databaseFailureDetails({ code: "P1000", message: "private" }), {},
  );
  assert.deepEqual(
    databaseFailureDetails(new Prisma.PrismaClientKnownRequestError("private", {
      code: "P2002",
      clientVersion: "5.22.0",
      meta: { secret: "private" },
    })),
    { databaseErrorCode: "P2002" },
  );
});

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


test("Kosovo appointment entry ignores device timezone and rejects impossible or ambiguous clock changes", async () => {
  const { kosovoLocalToIso } = await import("../lib/scheduling");
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/New_York", "UTC", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(kosovoLocalToIso("2026-09-10T09:30"), "2026-09-10T07:30:00.000Z");
      assert.equal(kosovoLocalToIso("2026-01-10T09:30"), "2026-01-10T08:30:00.000Z");
      assert.equal(kosovoLocalToIso("2026-03-29T03:30"), "2026-03-29T01:30:00.000Z");
      assert.equal(kosovoLocalToIso("2026-10-25T03:30"), "2026-10-25T02:30:00.000Z");
      assert.throws(() => kosovoLocalToIso("2026-03-29T02:30"), /nuk ekziston/);
      assert.throws(() => kosovoLocalToIso("2026-10-25T02:30"), /përsëritet/);
    }
    for (const value of ["2026-02-30T10:00", "2026-13-10T09:00", "2026-01-10T24:00", "2026-01-10", "invalid"])
      assert.throws(() => kosovoLocalToIso(value));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});


test("chat reconnect never conceals a gap after more than one page of new messages", async () => {
  const { mergeThreadPage } = await import("../lib/thread-pages");
  const messages = Array.from({ length: 350 }, (_, i) => ({ id: String(i).padStart(4, "0"), createdAt: new Date(1700000000000 + i * 1000).toISOString() }));
  const old = messages.slice(0, 100), latest = messages.slice(250);
  const reset = mergeThreadPage(old, latest, false);
  assert(reset.reset);
  assert.deepEqual(reset.messages, latest);
  const previous = mergeThreadPage(reset.messages, messages.slice(150, 250), true);
  const earlier = mergeThreadPage(previous.messages, messages.slice(50, 150), true);
  const complete = mergeThreadPage(earlier.messages, messages.slice(0, 50), true);
  assert.deepEqual(complete.messages, messages);
  assert.deepEqual(mergeThreadPage(complete.messages, latest, false).messages, messages);
  assert.deepEqual(mergeThreadPage(messages.slice(0, 100), messages.slice(50, 150), false).messages, messages.slice(0, 150));
});


test("maintenance status detects missing, stale and implausible heartbeat values", async () => {
  const { maintenanceState } = await import("../lib/operations");
  const now = Date.parse("2026-09-07T12:00:00Z");
  assert.equal(maintenanceState(null, now), "UNKNOWN");
  assert.equal(maintenanceState({ ranAt: "invalid" }, now), "UNKNOWN");
  assert.equal(maintenanceState({ ranAt: "2026-09-07T12:10:00Z" }, now), "UNKNOWN");
  assert.equal(maintenanceState({ ranAt: "2026-09-07T11:58:00Z" }, now), "RECENT");
  assert.equal(maintenanceState({ ranAt: "2026-09-07T11:00:00Z" }, now), "LATE");
});

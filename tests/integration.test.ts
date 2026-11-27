import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/server/db";
import { persistSession, hashPassword } from "../lib/server/auth";
import { recordSettledCheckout } from "../lib/server/payments";
import { adminCommand } from "../lib/server/admin";
import { rateLimit } from "../lib/server/rate-limit";
import { encrypt, decrypt } from "../lib/server/crypto";
import { requestAccountToken, authenticate, consumeAccountToken } from "../lib/server/accounts";
import { uploadDocument, signedDocument } from "../lib/server/storage";
import { hashToken, opaqueToken } from "../lib/server/tokens";
import { deliverOutbox, deliverOneVerificationEmail, deliverAccountEmail, notify } from "../lib/server/notifications";
import { notificationPreferenceKey, saveNotificationPreferences } from "../lib/server/notification-preferences";
import { expireOffers } from "../lib/server/offer-expiry";
import { bookingFunnel } from "../lib/server/metrics";
import { totp } from "../lib/server/totp";
import { mfaKey, readMfa } from "../lib/server/mfa-state";
import { kosovoLocalToIso } from "../lib/scheduling";
const database = new URL(process.env.DATABASE_URL || "");
assert(
  process.env.CI &&
    ["localhost", "127.0.0.1"].includes(database.hostname) &&
    database.pathname === "/zgjoi_test",
  "Refuse non-disposable database",
);
const base = process.env.TEST_BASE_URL!;
type Jar = Map<string, string>;
async function http(
  path: string,
  jar: Jar = new Map(),
  body?: unknown,
  extra: Record<string, string> = {},
) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: {
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(";");
    const i = pair.indexOf("=");
    const name = pair.slice(0, i),
      token = pair.slice(i + 1);
    if (token) jar.set(name, token);
    else jar.delete(name);
  }
  const text = await response.text();
  const data = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? JSON.parse(text)
    : null;
  return { status: response.status, data, text, headers: response.headers };
}
function ok(response: Awaited<ReturnType<typeof http>>, status = 200) {
  assert.equal(
    response.status,
    status,
    `Unexpected response: ${JSON.stringify(response.data)}`,
  );
  return response.data;
}
function redirects(
  response: Awaited<ReturnType<typeof http>>,
  destination: string,
) {
  if ([303, 307, 308].includes(response.status)) {
    assert.equal(
      new URL(response.headers.get("location") ?? "", base).pathname,
      destination,
    );
  } else {
    // Next streams a meta redirect when a loading boundary has already sent HTTP 200.
    assert.equal(response.status, 200);
    const tag = response.text.match(
      /<meta\b[^>]*id="__next-page-redirect"[^>]*>/,
    )?.[0];
    assert(
      tag,
      "Expected a real Next redirect tag, not an accessible admin page",
    );
    assert(tag.includes('http-equiv="refresh"'));
    assert(tag.includes(`content="1;url=${destination}"`));
  }
  assert(
    !response.text.includes("Administrimi i Zgjoi"),
    "Admin content leaked before redirect",
  );
  assert(
    !response.text.includes("Komision nga transfere"),
    "Private financial content leaked",
  );
}
after(async () => {
  await db.$disconnect();
});

test("database-backed private marketplace and authorization journey", async (t) => {
  const password = `test-only-${randomUUID()}`;
  const passwordHash = await hashPassword(password);
  const category = await db.category.create({
    data: {
      slug: "elektricist",
      name: "Elektricist test",
      icon: "zap",
      active: true,
    },
  });
  async function account(
    role: "CLIENT" | "PRO" | "ADMIN" | "SUPPORT",
    label: string,
  ) {
    return db.user.create({
      data: {
        id: randomUUID(),
        email: `${label.toLowerCase()}-${randomUUID()}@ci.zgjoi.invalid`,
        passwordHash,
        name: `Test ${label}`,
        city: "Prishtinë",
        role,
        emailVerified: new Date(),
        ...(role === "PRO"
          ? {
              proProfile: {
                create: {
                  slug: `pro-${randomUUID()}`,
                  categorySlug: category.slug,
                  about:
                    "Profesionist testues për skenarët e integrimit të aplikacionit.",
                  priceFrom: 2500,
                  categories: { create: [{ categorySlug: category.slug, priceFromCents: 2500, approvedAt: new Date() }] },
                  serviceCities: ["Prishtinë"],
                  verification: "APPROVED",
                  autoBid: false,
                  weeklyBudget: 0,
                },
              },
            }
          : {}),
      },
      include: { proProfile: true },
    });
  }
  const a = await account("CLIENT", "ClientA"),
    b = await account("CLIENT", "ClientB"),
    pro = await account("PRO", "ProA"),
    otherPro = await account("PRO", "ProB"),
    admin = await account("ADMIN", "AdminA"),
    support = await account("SUPPORT", "SupportA");
  const aj: Jar = new Map(),
    bj: Jar = new Map(),
    pj: Jar = new Map(),
    otherj: Jar = new Map(),
    adminj: Jar = new Map(),
    supportj: Jar = new Map();
  await t.test(
    "sign-in hashes session tokens and exposes only the current user",
    async () => {
      for (const [actor, jar] of [
        [a, aj],
        [b, bj],
        [pro, pj],
        [otherPro, otherj],
        [admin, adminj],
        [support, supportj],
      ] as const) {
        ok(
          await http("/api/auth/login", jar, {
            email: actor.email.toUpperCase(),
            password,
          }),
        );
        const data = ok(await http("/api/auth/me", jar));
        assert.equal(data.user.id, actor.id);
        assert(!("passwordHash" in data.user));
      }
      const sessions = await db.session.findMany();
      assert(sessions.length >= 6);
      assert(sessions.every((s) => /^sha256:[a-f0-9]{64}$/.test(s.token)));
      assert(!sessions.some((s) => s.token === aj.get("zgjoi_session")));
      ok(
        await http("/api/auth/login", new Map(), {
          email: a.email,
          password: "wrong-password",
        }),
        401,
      );
    },
  );
  await t.test(
    "MFA enrollment, login, recovery rotation and disable require both factors and revoke sessions",
    async () => {
      const user = await account("ADMIN", "MfaAdmin");
      const jar: Jar = new Map();
      ok(await http("/api/auth/login", jar, { email: user.email, password }));
      ok(await http("/api/account/mfa"), 401);
      ok(await http("/api/account/mfa", jar, { action: "BEGIN", currentPassword: "incorrect" }), 401);
      const setup = ok(await http("/api/account/mfa", jar, { action: "BEGIN", currentPassword: password }));
      const state = await readMfa(db, user.id);
      assert(state && !state.enabled);
      assert(!JSON.stringify(state).includes(setup.secret));
      assert.equal(decrypt(state.secretEnc), setup.secret);
      assert.deepEqual(ok(await http("/api/account/mfa", jar)), { enabled: false, recoveryCodesRemaining: 0 });
      ok(await http("/api/account/mfa", jar, { action: "ENABLE", currentPassword: password, code: "invalid" }), 401);
      const enrollmentCode = totp(setup.secret);
      const enabled = ok(await http("/api/account/mfa", jar, { action: "ENABLE", currentPassword: password, code: enrollmentCode }));
      assert.equal(enabled.recoveryCodes.length, 10);
      assert.equal(new Set(enabled.recoveryCodes).size, 10);
      assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
      ok(await http("/api/account/mfa", jar), 401);
      const stored = JSON.stringify((await db.setting.findUniqueOrThrow({ where: { key: mfaKey(user.id) } })).value);
      assert(enabled.recoveryCodes.every((code: string) => !stored.includes(code.replaceAll("-", ""))));
      assert(!stored.includes(setup.secret));
      ok(await http("/api/auth/login", new Map(), { email: user.email, password }), 401);
      ok(await http("/api/auth/login", new Map(), { email: user.email, password, secondFactor: "invalid" }), 401);
      ok(await http("/api/auth/login", new Map(), { email: user.email, password, secondFactor: enrollmentCode }), 401);
      await assert.rejects(persistSession(user.id, user.passwordHash), { code: "MFA_REQUIRED" });
      const jars: Jar[] = [new Map(), new Map()];
      const race = await Promise.all(jars.map(j => http("/api/auth/login", j, {
        email: user.email, password, secondFactor: enabled.recoveryCodes[0],
      })));
      assert.deepEqual(race.map(r => r.status).sort(), [200, 401]);
      const activeJar = jars[race.findIndex(r => r.status === 200)];
      const status = await http("/api/account/mfa", activeJar);
      assert.equal(status.headers.get("cache-control"), "no-store");
      assert.deepEqual(ok(status), { enabled: true, recoveryCodesRemaining: 9 });
      const generation = (await readMfa(db, user.id))!.version;
      ok(await http("/api/account/mfa", activeJar, { action: "DISABLE", currentPassword: password, code: "invalid" }), 401);
      const rotated = ok(await http("/api/account/mfa", activeJar, { action: "REGENERATE", currentPassword: password, code: enabled.recoveryCodes[1] }));
      assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
      await assert.rejects(persistSession(user.id, user.passwordHash, undefined, generation), { code: "MFA_REQUIRED" });
      ok(await http("/api/auth/login", new Map(), { email: user.email, password, secondFactor: enabled.recoveryCodes[2] }), 401);
      const freshJar: Jar = new Map();
      ok(await http("/api/auth/login", freshJar, { email: user.email, password, secondFactor: rotated.recoveryCodes[0] }));
      ok(await http("/api/account/mfa", freshJar, { action: "DISABLE", currentPassword: password, code: rotated.recoveryCodes[1] }));
      assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
      assert.equal((await readMfa(db, user.id))!.secretEnc, "");
      ok(await http("/api/auth/login", new Map(), { email: user.email, password }));
      const audits = await db.auditLog.findMany({ where: { target: user.id } });
      assert(audits.some(a => a.action === "MFA_ENABLE"));
      assert(audits.some(a => a.action === "MFA_REGENERATE"));
      assert(audits.some(a => a.action === "MFA_DISABLE"));
      assert(!JSON.stringify(audits).includes(setup.secret));
    },
  );
  await t.test(
    "expired MFA enrollment is denied and corrupt factor state never falls back to password-only login",
    async () => {
      const user = await account("CLIENT", "MfaExpiry");
      const jar: Jar = new Map();
      ok(await http("/api/auth/login", jar, { email: user.email, password }));
      const setup = ok(await http("/api/account/mfa", jar, { action: "BEGIN", currentPassword: password }));
      const state = (await readMfa(db, user.id))!;
      await db.setting.update({ where: { key: mfaKey(user.id) }, data: { value: { ...state, enrollmentExpiresAt: Date.now() - 1 } } });
      ok(await http("/api/account/mfa", jar, { action: "ENABLE", currentPassword: password, code: totp(setup.secret) }), 409);
      await db.setting.update({ where: { key: mfaKey(user.id) }, data: { value: { enabled: true } } });
      await assert.rejects(authenticate({ email: user.email, password }, "mfa-corrupt"), { code: "MFA_CONFIG" });
      await assert.rejects(persistSession(user.id, user.passwordHash), { code: "MFA_CONFIG" });
    },
  );
  await t.test(
    "password recovery revokes sessions but cannot disable an enrolled second factor",
    async () => {
      const user = await account("CLIENT", "MfaReset");
      const jar: Jar = new Map();
      ok(await http("/api/auth/login", jar, { email: user.email, password }));
      const setup = ok(await http("/api/account/mfa", jar, { action: "BEGIN", currentPassword: password }));
      const enabled = ok(await http("/api/account/mfa", jar, { action: "ENABLE", currentPassword: password, code: totp(setup.secret) }));
      const before = await readMfa(db, user.id);
      const token = opaqueToken(), nextPassword = `reset-test-${randomUUID()}`;
      await db.authToken.create({ data: { userId: user.id, purpose: "PASSWORD_RESET", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 600_000) } });
      await consumeAccountToken({ token, password: nextPassword }, "PASSWORD_RESET");
      assert.deepEqual(await readMfa(db, user.id), before);
      await assert.rejects(authenticate({ email: user.email, password: nextPassword }, "mfa-reset"), { code: "MFA_REQUIRED" });
      const proof = await authenticate({ email: user.email, password: nextPassword, secondFactor: enabled.recoveryCodes[0] }, "mfa-reset");
      assert(proof.mfaVersion);
      assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
    },
  );
  await t.test(
    "HTML and API roles reject unauthenticated and wrong-role requests",
    async () => {
      const privatePage = await http("/llogaria", new Map());
      assert.equal(privatePage.status, 307);
      assert.match(privatePage.headers.get("location") ?? "", /\/hyr/);
      const wrongRole = await http("/admin", aj);
      redirects(wrongRole, "/llogaria");
      ok(
        await http("/api/admin/commands", aj, {
          action: "USER_SUSPEND",
          id: b.id,
        }),
        403,
      );
      ok(await http("/api/requests", new Map(), {}), 401);
      const forged = new Map([["zgjoi_session", "a".repeat(64)]]);
      ok(await http("/api/requests", forged, {}), 401);
      const staffHome = await http("/admin", supportj);
      redirects(staffHome, "/admin/mbeshtetja");
    },
  );
  await t.test(
    "JSON, CSRF, role escalation and upload gates fail closed",
    async () => {
      ok(
        await http(
          "/api/requests",
          aj,
          {},
          { Origin: "https://attacker.invalid" },
        ),
        403,
      );
      ok(await http("/api/requests", aj, { detail: "x".repeat(20000) }), 413);
      ok(
        await http("/api/auth/register", new Map(), {
          role: "ADMIN",
          name: "Intruder",
          email: "intruder@ci.zgjoi.invalid",
          password,
          city: "Prishtinë",
          terms: true,
        }),
        400,
      );
      ok(await http("/api/documents", aj, {}), 403);
      const raw = await fetch(`${base}/api/requests`, {
        method: "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          Cookie: [...aj].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        body: "{",
      });
      assert.equal(raw.status, 400);
    },
  );
  await t.test(
    "support ticket access requires its owner, staff, or guest capability",
    async () => {
      const firstMessage = {
        body: "Mesazh privat i klientit A për ndihmë.",
        clientKey: randomUUID(),
      };
      const [firstSend, retriedSend] = await Promise.all([
        http("/api/support/send", aj, firstMessage),
        http("/api/support/send", aj, firstMessage),
      ]);
      const sent = ok(firstSend);
      assert.equal(ok(retriedSend).ticketId, sent.ticketId);
      assert.equal(
        await db.supportTicket.count({ where: { userId: a.id } }),
        1,
      );
      const read = ok(
        await http(`/api/support/messages?ticketId=${sent.ticketId}`, aj),
      );
      assert.equal(read.messages.length, 1);
      ok(
        await http(`/api/support/messages?ticketId=${sent.ticketId}`, bj),
        404,
      );
      ok(
        await http("/api/support/send", bj, {
          ticketId: sent.ticketId,
          body: "Attempted outsider reply",
          clientKey: randomUUID(),
        }),
        404,
      );
      const reply = {
        ticketId: sent.ticketId,
        body: "Përgjigje e mbështetjes.",
        clientKey: randomUUID(),
      };
      for (const response of await Promise.all([
        http("/api/support/reply", supportj, reply),
        http("/api/support/reply", supportj, reply),
      ]))
        ok(response);
      assert.equal(
        ok(await http(`/api/support/messages?ticketId=${sent.ticketId}`, aj))
          .messages.length,
        2,
      );
      const guest: Jar = new Map();
      ok(await http("/api/support/current", guest));
      assert(guest.has("zgjoi_support"));
      const guestMessage = {
        body: "Vizitor pa llogari, kërkoj ndihmë.",
        clientKey: randomUUID(),
      };
      const ticket = ok(await http("/api/support/send", guest, guestMessage));
      assert.equal(
        ok(await http("/api/support/send", guest, guestMessage)).ticketId,
        ticket.ticketId,
      );
      ok(
        await http("/api/support/send", guest, {
          ...guestMessage,
          body: "Different message with reused key",
        }),
        409,
      );
      ok(
        await http(`/api/support/messages?ticketId=${ticket.ticketId}`, guest),
      );
      ok(
        await http(
          `/api/support/messages?ticketId=${ticket.ticketId}`,
          new Map(),
        ),
        404,
      );
      const switched = new Map([...guest, ...bj]);
      ok(
        await http(
          `/api/support/messages?ticketId=${ticket.ticketId}`,
          switched,
        ),
        404,
      );
      assert.equal(
        ok(await http("/api/support/current", aj)).ticketId,
        sent.ticketId,
      );
    },
  );
  const inquiry = {
    profileId: pro.proProfile!.id,
    title: "Riparim ndriçimi në kuzhinë",
    detail:
      "Ndriçimi në kuzhinë duhet kontrolluar dhe riparuar nga profesionisti.",
    city: "Prishtinë",
    timing: "Gjatë javës",
    address: "Rruga e testit 12",
    clientKey: randomUUID(),
  };
  let requestId = "",
    conversationId = "",
    quoteId = "",
    version = 0;
  await t.test(
    "a selected-pro inquiry persists once, remains private and creates no payment",
    async () => {
      const responses = await Promise.all([
        http("/api/requests", aj, inquiry),
        http("/api/requests", aj, inquiry),
      ]);
      requestId = ok(responses[0]).id;
      assert.equal(ok(responses[1]).id, requestId);
      const request = await db.serviceRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { conversation: true },
      });
      conversationId = request.conversation!.id;
      assert.equal(request.selectedProfileId, pro.proProfile!.id);
      assert.equal(await db.payment.count({ where: { requestId } }), 0);
      assert.equal(await db.leadCharge.count(), 0);
      const viewed = ok(await http(`/api/requests/${requestId}`, pj));
      assert.equal(viewed.address, null);
      assert.notEqual(viewed.client.name, a.name);
      ok(await http(`/api/requests/${requestId}`, bj), 404);
      ok(await http(`/api/requests/${requestId}`, otherj), 404);
    },
  );
  await t.test(
    "chat writes are participant-scoped, retry-safe, and block pre-booking contact",
    async () => {
      ok(
        await http("/api/messages", otherj, {
          conversationId,
          body: "Other pro cannot send",
          clientKey: randomUUID(),
        }),
        404,
      );
      const body = {
        conversationId,
        body: "Përshëndetje, mund ta kontrolloni ndriçimin?",
        clientKey: randomUUID(),
      };
      const first = ok(await http("/api/messages", aj, body));
      assert.equal(ok(await http("/api/messages", aj, body)).id, first.id);
      ok(
        await http("/api/messages", aj, {
          conversationId,
          body: "Telefoni +383 44 123 456",
          clientKey: randomUUID(),
        }),
        400,
      );
      ok(await http(`/api/messages?conversationId=${conversationId}`, bj), 404);
    },
  );
  await t.test(
    "message history returns the newest 100 and correctly pages older messages",
    async () => {
      const created = Date.now() - 400000;
      await db.message.createMany({
        data: Array.from({ length: 305 }, (_, i) => ({
          id: randomUUID(),
          conversationId,
          senderId: a.id,
          body: `History message ${i}`,
          createdAt: new Date(created + i * 1000),
        })),
      });
      const latest = ok(
        await http(`/api/messages?conversationId=${conversationId}`, pj),
      );
      assert.equal(latest.messages.length, 100);
      assert(latest.hasMore);
      assert(
        latest.messages.some(
          (m: { body: string }) => m.body === "History message 304",
        ),
      );
      const untouched = await db.message.count({ where: { conversationId, body: { startsWith: "History message " }, readAt: null } });
      assert.equal(untouched, 305 - latest.messages.filter((m: { body: string }) => m.body.startsWith("History message ")).length, "The extra pagination row must remain unread");
      const previous = ok(
        await http(
          `/api/messages?conversationId=${conversationId}&before=${latest.messages[0].id}`,
          pj,
        ),
      );
      assert.equal(previous.messages.length, 100);
      assert(
        !previous.messages.some((m: { id: string }) =>
          latest.messages.some((n: { id: string }) => n.id === m.id),
        ),
      );
    },
  );
  const offer = (key = randomUUID(), expectedVersion = 0) => ({
    requestId,
    clientKey: key,
    expectedVersion,
    amount: "99.99",
    description: "Kontrolli dhe riparimi i plotë i ndriçimit të kuzhinës.",
    timing: "Në orarin e konfirmuar",
    duration: "Dy orë",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    scheduledAt: new Date(Date.now() + 7200000).toISOString(),
  });
  await t.test(
    "only the selected pro can issue a versioned offer; replaced offers cannot be accepted",
    async () => {
      ok(await http("/api/offers", otherj, offer()), 404);
      const first = offer();
      const sent = ok(await http("/api/offers", pj, first));
      assert.equal(
        ok(await http("/api/offers", pj, first)).quoteId,
        sent.quoteId,
      );
      ok(await http("/api/offers", pj, offer()), 409);
      const next = ok(await http("/api/offers", pj, offer(randomUUID(), 1)));
      quoteId = next.quoteId;
      version = 2;
      assert.equal(
        (await db.quote.findUniqueOrThrow({ where: { id: sent.quoteId } }))
          .state,
        "WITHDRAWN",
      );
      ok(
        await http("/api/offers/accept", aj, {
          quoteId: sent.quoteId,
          expectedVersion: version,
        }),
        409,
      );
      ok(
        await http("/api/offers/accept", bj, {
          quoteId,
          expectedVersion: version,
        }),
        404,
      );
      assert.equal(await db.payment.count({ where: { requestId } }), 0);
    },
  );
  await t.test(
    "acceptance creates exactly one pending payment despite simultaneous retries",
    async () => {
      const responses = await Promise.all([
        http("/api/offers/accept", aj, { quoteId, expectedVersion: version }),
        http("/api/offers/accept", aj, { quoteId, expectedVersion: version }),
      ]);
      responses.forEach((r) => ok(r));
      const payment = await db.payment.findUniqueOrThrow({
        where: { requestId },
      });
      assert.equal(payment.amount, 9999);
      assert.equal(payment.commissionAmount, 1500);
      assert.equal(payment.proAmount, 8499);
      assert.equal(payment.state, "PENDING");
      assert.equal(payment.provider, "disabled");
      assert.equal(await db.payment.count({ where: { requestId } }), 1);
      ok(
        await http(`/api/requests/${requestId}`, pj, { action: "START" }),
        409,
      );
      ok(
        await http(`/api/requests/${requestId}`, aj, {
          action: "CONFIRM_COMPLETION",
        }),
        409,
      );
      ok(
        await http("/api/reviews", aj, {
          requestId,
          rating: 5,
          text: "A review before work completion must be rejected.",
        }),
        409,
      );
      ok(await http("/api/payments/checkout", aj, { requestId }), 503);
    },
  );
  let event: Parameters<typeof recordSettledCheckout>[0];
  await t.test(
    "the verified-provider database boundary rejects mismatches and handles replay without duplicate effects",
    async () => {
      const payment = await db.payment.update({
        where: { requestId },
        data: {
          provider: "stripe_test",
          providerCheckoutId: `cs_test_${randomUUID()}`,
          attempt: 1,
          connectedAccountId: "acct_test_isolated",
        },
      });
      event = {
        eventId: `evt_test_${randomUUID()}`,
        checkoutId: payment.providerCheckoutId!,
        paymentId: payment.id,
        intentId: `pi_test_${randomUUID()}`,
        chargeId: `ch_test_${randomUUID()}`,
        amount: 9999,
        received: 9999,
        currency: "eur",
        intentCurrency: "eur",
        attempt: "1",
      };
      await assert.rejects(recordSettledCheckout({ ...event, amount: 1 }));
      await assert.rejects(recordSettledCheckout({ ...event, attempt: "9" }));
      const replies = await Promise.all([
        recordSettledCheckout(event),
        recordSettledCheckout(event),
      ]);
      assert.equal(replies.length, 2);
      assert.equal(
        await db.paymentEvent.count({ where: { paymentId: payment.id } }),
        1,
      );
      assert.equal(
        (await db.payment.findUniqueOrThrow({ where: { id: payment.id } }))
          .state,
        "HELD",
      );
      const revealed = ok(await http(`/api/requests/${requestId}`, pj));
      assert.equal(revealed.address, inquiry.address);
      assert.equal(revealed.client.name, a.name);
    },
  );
  await t.test(
    "only the customer confirms completion, creating one payout obligation independently of review",
    async () => {
      ok(await http(`/api/requests/${requestId}`, pj, { action: "START" }));
      ok(
        await http(`/api/requests/${requestId}`, pj, {
          action: "REQUEST_COMPLETION",
        }),
      );
      ok(
        await http(`/api/requests/${requestId}`, pj, {
          action: "CONFIRM_COMPLETION",
        }),
        403,
      );
      const complete = await Promise.all([
        http(`/api/requests/${requestId}`, aj, {
          action: "CONFIRM_COMPLETION",
        }),
        http(`/api/requests/${requestId}`, aj, {
          action: "CONFIRM_COMPLETION",
        }),
      ]);
      complete.forEach((r) => ok(r));
      assert.equal(
        (
          await db.serviceRequest.findUniqueOrThrow({
            where: { id: requestId },
          })
        ).state,
        "COMPLETED",
      );
      assert.equal(
        await db.payout.count({ where: { paymentId: event.paymentId } }),
        1,
      );
      assert.equal(await db.review.count({ where: { requestId } }), 0);
      assert.equal(
        (await db.payment.findUniqueOrThrow({ where: { id: event.paymentId } }))
          .state,
        "HELD",
      );
      ok(
        await http("/api/admin/payments", aj, {
          action: "RELEASE",
          id: event.paymentId,
        }),
        403,
      );
    },
  );
  await t.test(
    "reviews are owner-only, optional, unique, and moderation recalculates ratings",
    async () => {
      const review = {
        requestId,
        rating: 5,
        text: "Puna u krye mirë dhe komunikimi ishte i qartë.",
      };
      ok(await http("/api/reviews", bj, review), 409);
      const saved = ok(await http("/api/reviews", aj, review));
      assert.equal(ok(await http("/api/reviews", aj, review)).id, saved.id);
      assert.equal(
        (
          await db.proProfile.findUniqueOrThrow({
            where: { id: pro.proProfile!.id },
          })
        ).ratingCount,
        1,
      );
      ok(
        await http("/api/admin/commands", adminj, {
          action: "REVIEW_REMOVE",
          id: saved.id,
          reason: "Moderim i provës: arsye e regjistruar.",
        }),
      );
      assert.equal(
        (
          await db.proProfile.findUniqueOrThrow({
            where: { id: pro.proProfile!.id },
          })
        ).ratingCount,
        0,
      );
      ok(
        await http("/api/admin/commands", adminj, {
          action: "REVIEW_RESTORE",
          id: saved.id,
        }),
      );
      assert.equal(
        (
          await db.proProfile.findUniqueOrThrow({
            where: { id: pro.proProfile!.id },
          })
        ).ratingCount,
        1,
      );
    },
  );
  await t.test(
    "a dispute freezes funded work and older checkout events never overwrite that state",
    async () => {
      ok(
        await http("/api/disputes", aj, {
          requestId,
          reason:
            "Problem pas konfirmimit që kërkon shqyrtim të administratës.",
        }),
      );
      assert.equal(
        (await db.payment.findUniqueOrThrow({ where: { requestId } })).state,
        "DISPUTED",
      );
      await recordSettledCheckout({
        ...event,
        eventId: `evt_test_${randomUUID()}`,
      });
      assert.equal(
        (await db.payment.findUniqueOrThrow({ where: { requestId } })).state,
        "DISPUTED",
      );
      ok(
        await http(`/api/requests/${requestId}`, aj, {
          action: "CONFIRM_COMPLETION",
        }),
        409,
      );
    },
  );
  await t.test(
    "expiry, cancellation and approved catalog eligibility persist",
    async () => {
      const newRequest = ok(
        await http("/api/requests", aj, {
          ...inquiry,
          clientKey: randomUUID(),
        }),
      );
      const expiredOffer = ok(
        await http("/api/offers", pj, {
          ...offer(),
          requestId: newRequest.id,
          clientKey: randomUUID(),
        }),
      );
      await db.quote.update({
        where: { id: expiredOffer.quoteId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      ok(
        await http("/api/offers/accept", aj, {
          quoteId: expiredOffer.quoteId,
          expectedVersion: 1,
        }),
        409,
      );
      ok(
        await http(`/api/requests/${newRequest.id}`, aj, { action: "CANCEL", expectedVersion: 1 }),
      );
      ok(
        await http("/api/offers", pj, {
          ...offer(),
          requestId: newRequest.id,
          expectedVersion: 2,
          clientKey: randomUUID(),
        }),
        409,
      );
      const catalog = ok(await http(`/api/catalog?kategoria=${category.slug}`));
      assert(
        catalog.pros.some((p: { id: string }) => p.id === pro.proProfile!.id),
      );
      assert(!JSON.stringify(catalog).includes(pro.email));
      ok(
        await http("/api/admin/commands", adminj, {
          action: "PRO_REJECT",
          id: otherPro.proProfile!.id,
          reason: "Kontroll provë i statusit të katalogut",
        }),
      );
      assert(
        !ok(await http(`/api/catalog?kategoria=${category.slug}`)).pros.some(
          (p: { id: string }) => p.id === otherPro.proProfile!.id,
        ),
      );
    },
  );
  await t.test("calendar prevents concurrent cross-customer double booking and rechecks changed working hours", async () => {
    const professional = await account("PRO", "CalendarPro");
    const jar: Jar = new Map();
    ok(await http("/api/auth/login", jar, { email: professional.email, password }));
    const days = Array.from({ length: 7 }, (_, weekday) => ({ weekday, startMin: 540, endMin: 1020 }));
    ok(await http("/api/availability", jar, { days }));
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const start = kosovoLocalToIso(`${date}T09:00`);
    async function request(j: Jar) {
      return ok(await http("/api/requests", j, { ...inquiry, profileId: professional.proProfile!.id, clientKey: randomUUID() }));
    }
    async function proposal(id: string, hour: string, expectedVersion = 0) {
      return http("/api/offers", jar, { ...offer(), requestId: id, expectedVersion, clientKey: randomUUID(), duration: "120", scheduledAt: kosovoLocalToIso(`${date}T${hour}`) });
    }
    const first = await request(aj), second = await request(bj);
    const quotes = [ok(await proposal(first.id, "09:00")), ok(await proposal(second.id, "09:00"))];
    const race = await Promise.all([aj, bj].map((j, i) => http("/api/offers/accept", j, { quoteId: quotes[i].quoteId, expectedVersion: 1 })));
    assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
    assert.equal(race.find(r => r.status === 409)!.data.code, "APPOINTMENT_CONFLICT");
    assert.equal(await db.quote.count({ where: { profileId: professional.proProfile!.id, state: "ACCEPTED" } }), 1);
    assert.equal(await db.payment.count({ where: { requestId: { in: [first.id, second.id] } } }), 1);
    const booking = await db.serviceRequest.findFirstOrThrow({ where: { acceptedProfileId: professional.proProfile!.id } });
    assert.equal(booking.scheduledAt!.toISOString(), start);
    ok(await http("/api/availability", jar, { days: days.map(d => ({ ...d, endMin: 600 })) }), 409);
    assert.equal(await db.availability.count({ where: { profileId: professional.proProfile!.id, endMin: 1020 } }), 7);
    const blocked = await request(aj);
    ok(await proposal(blocked.id, "10:00"), 409);
    ok(await proposal(blocked.id, "18:00"), 409);
    const adjacent = ok(await proposal(blocked.id, "11:00"));
    ok(await http("/api/offers/accept", aj, { quoteId: adjacent.quoteId, expectedVersion: 1 }));
    const changed = await request(aj);
    const late = ok(await proposal(changed.id, "15:00"));
    ok(await http("/api/availability", jar, { days: days.map(d => ({ ...d, endMin: 900 })) }));
    const denied = await http("/api/offers/accept", aj, { quoteId: late.quoteId, expectedVersion: 1 });
    assert.equal(denied.status, 409);
    assert.equal(denied.data.code, "AVAILABILITY");
    assert.equal(await db.payment.count({ where: { requestId: changed.id } }), 0);
    const winnerJar = race[0].status === 200 ? aj : bj;
    ok(await http(`/api/requests/${booking.id}`, winnerJar, { action: "CANCEL", expectedVersion: booking.version }));
    // Cancelling an untouched booking frees the slot while retaining its payment history.
    ok(await proposal(changed.id, "09:00", 1));
    const calendar = await http("/pro/kalendari", jar);
    assert.equal(calendar.status, 200);
    assert(calendar.text.includes("Në pritje të pagesës"));
  });
  await t.test("offer expiry reopens only unaccepted requests and notifies each participant once under concurrent workers", async () => {
    const pending = ok(await http("/api/requests", aj, { ...inquiry, clientKey: randomUUID() }));
    const sent = ok(await http("/api/offers", pj, { ...offer(), requestId: pending.id, clientKey: randomUUID() }));
    await db.quote.update({ where: { id: sent.quoteId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await Promise.all([expireOffers(), expireOffers()]);
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: pending.id } })).state, "OPEN");
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: pending.id } })).version, 2);
    assert.equal((await db.quote.findUniqueOrThrow({ where: { id: sent.quoteId } })).state, "EXPIRED");
    const notices = await db.notification.findMany({ where: { kind: "EXPIRED", href: { endsWith: `/kerkesat/${pending.id}` } } });
    assert.equal(notices.length, 2);
    assert.deepEqual(notices.map(n => n.userId).sort(), [a.id, pro.id].sort());
    assert.equal(await db.payment.count({ where: { requestId: pending.id } }), 0);
    await expireOffers();
    assert.equal(await db.notification.count({ where: { kind: "EXPIRED", href: { endsWith: `/kerkesat/${pending.id}` } } }), 2);
  });
  await t.test("chat-then-hire: a chat opened from the profile gets a quote card the customer hires with Puneso, and the status shows in the chat", async () => {
    const detail = "Dy priza në sallon nuk punojnë dhe duhen kontrolluar sa më shpejt.";
    const opened = ok(await http("/api/requests", aj, { profileId: pro.proProfile!.id, detail, city: "Prishtinë", clientKey: randomUUID() }));
    const chat = await db.serviceRequest.findUniqueOrThrow({ where: { id: opened.id }, include: { conversation: true } });
    assert.equal(chat.title, detail);
    assert.equal(chat.timing, "Sipas marrëveshjes në bisedë");
    assert(chat.conversation);
    const card = (extra: Record<string, unknown>) => ({ requestId: chat.id, clientKey: randomUUID(), expectedVersion: 0, amount: "40", ...extra });
    // The contact filter still blocks the whole quote note, and the card needs an expiry.
    ok(await http("/api/offers", pj, card({ description: "Më shkruani te test@example.com", expiresInHours: 72 })), 400);
    ok(await http("/api/offers", pj, card({})), 400);
    ok(await http("/api/offers", pj, card({ expiresInHours: 5 })), 400);
    ok(await http("/api/offers", pj, card({ expiresInHours: 72, scheduledAt: new Date(Date.now() + 4 * 86400000).toISOString() })), 400);
    const sent = ok(await http("/api/offers", pj, card({ expiresInHours: 24 })));
    const quote = await db.quote.findUniqueOrThrow({ where: { id: sent.quoteId } });
    assert.equal(quote.scheduledAt, null);
    assert.equal(quote.duration, null);
    assert(Math.abs(quote.expiresAt!.getTime() - (Date.now() + 24 * 3600000)) < 120000);
    const customerView = await http(`/llogaria/kerkesat/${chat.id}`, aj);
    assert.equal(customerView.status, 200);
    assert(customerView.text.includes("Biseda me"));
    assert(customerView.text.includes("Puneso"));
    assert(customerView.text.includes("Data e punës caktohet në bisedë."));
    ok(await http("/api/offers/accept", aj, { quoteId: sent.quoteId, expectedVersion: 1 }));
    const hired = await db.serviceRequest.findUniqueOrThrow({ where: { id: chat.id }, include: { payment: true } });
    assert.equal(hired.state, "BOOKED");
    assert.equal(hired.payment?.amount, 4000);
    assert.equal(hired.payment?.state, "PENDING");
    assert((await http(`/llogaria/kerkesat/${chat.id}`, aj)).text.includes("Ju e punësuat profesionistin"));
    assert((await http(`/pro/kerkesat/${chat.id}`, pj)).text.includes("Klienti ju punësoi"));
    ok(await http(`/api/requests/${chat.id}`, aj, { action: "CANCEL", expectedVersion: hired.version }));
    assert((await http(`/llogaria/kerkesat/${chat.id}`, aj)).text.includes("Statusi: Anuluar"));
  });
  await t.test("book now: hourly rate and minimum, rate × hours, confirmed hour changes, admin mark-paid, cancellations and the estimate credit", async () => {
    const customer = await account("CLIENT", "BookNowClient"), professional = await account("PRO", "BookNowPro");
    const cj: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
    const pjar: Jar = new Map([["zgjoi_session", (await persistSession(professional.id, passwordHash)).token]]);
    const profileId = professional.proProfile!.id;
    const start = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
    const book = (extra: Record<string, unknown> = {}) => http("/api/bookings", cj, { profileId, clientKey: randomUUID(), startsAt: start(4),
      minutes: 180, detail: "Kontroll i instalimit elektrik në kuzhinë.", city: "Prishtinë", address: "Rruga e Testit 1", ...extra });
    // Not bookable until the pro sets a rate.
    ok(await book(), 409);
    assert(!(await http(`/profesionisti/${professional.proProfile!.slug}`)).text.includes("Rezervo tani"));
    ok(await http("/api/account/booking-settings", cj, { enabled: true, hourlyRate: "15", minMinutes: 120 }), 403);
    ok(await http("/api/account/booking-settings", pjar, { enabled: true, hourlyRate: "15", minMinutes: 45 }), 400);
    ok(await http("/api/account/booking-settings", pjar, { enabled: true, hourlyRate: "15", minMinutes: 120 }));
    assert((await http(`/profesionisti/${professional.proProfile!.slug}`)).text.includes("Rezervo tani"));
    assert.equal((await http(`/rezervo-tani?pro=${profileId}`, cj)).status, 200);
    ok(await book({ minutes: 90 }), 400);
    ok(await book({ detail: "Më shkruani te test@example.com për detajet." }), 400);
    ok(await http("/api/bookings", pjar, { profileId, clientKey: randomUUID(), startsAt: start(4), minutes: 180, detail: "Punë testi për rezervimin.", city: "Prishtinë" }), 403);
    const created = ok(await book());
    const booking = await db.booking.findUniqueOrThrow({ where: { requestId: created.id }, include: { request: { include: { payment: true, acceptedQuote: true, conversation: true } } } });
    assert.equal(booking.totalCents, 4500);
    assert.equal(booking.commissionCents, 675);
    assert.equal(booking.request.state, "BOOKED");
    assert.equal(booking.request.payment?.amount, 4500);
    assert.equal(booking.request.payment?.method, "OFFLINE");
    assert.equal(booking.request.acceptedQuote?.duration, "180 min");
    assert(booking.request.conversation);
    // The same slot cannot be booked twice.
    ok(await book(), 409);
    const chat = await http(`/llogaria/kerkesat/${created.id}`, cj);
    assert(chat.text.includes("Rezervo tani · me orë") && chat.text.includes("Anulo rezervimin"));
    // Generic unpaid cancel and reschedule are routed to the booking rules.
    ok(await http(`/api/requests/${created.id}`, cj, { action: "CANCEL", expectedVersion: 1 }), 409);
    // Hour change: proposal alone never changes the price.
    ok(await http(`/api/bookings/${created.id}`, cj, { action: "PROPOSE_HOURS", clientKey: randomUUID(), minutes: 240 }), 403);
    const proposed = ok(await http(`/api/bookings/${created.id}`, pjar, { action: "PROPOSE_HOURS", clientKey: randomUUID(), minutes: 240 }));
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).totalCents, 4500);
    assert.equal((await db.payment.findUniqueOrThrow({ where: { requestId: created.id } })).amount, 4500);
    ok(await http(`/api/bookings/${created.id}`, pjar, { action: "CONFIRM_HOURS", changeId: proposed.id }), 403);
    ok(await http(`/api/bookings/${created.id}`, cj, { action: "CONFIRM_HOURS", changeId: proposed.id }));
    const changed = await db.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { changes: true } });
    assert.equal(changed.minutes, 240);
    assert.equal(changed.totalCents, 6000);
    assert.equal((await db.payment.findUniqueOrThrow({ where: { requestId: created.id } })).amount, 6000);
    assert.equal(changed.changes[0].state, "CONFIRMED");
    // A declined proposal keeps the confirmed total.
    const second = ok(await http(`/api/bookings/${created.id}`, pjar, { action: "PROPOSE_HOURS", clientKey: randomUUID(), minutes: 120 }));
    ok(await http(`/api/bookings/${created.id}`, cj, { action: "DECLINE_HOURS", changeId: second.id }));
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).totalCents, 6000);
    // Admin marks it paid with the existing beta flow; a free (>24h) cancel then leaves a refund to-do.
    const payment = await db.payment.findUniqueOrThrow({ where: { requestId: created.id } });
    ok(await http("/api/admin/payments", adminj, { action: "MARK_PAID_OFFLINE", id: payment.id, reason: "Para në dorë, konfirmuar me telefon nga klienti." }));
    const version = (await db.serviceRequest.findUniqueOrThrow({ where: { id: created.id } })).version;
    ok(await http(`/api/bookings/${created.id}`, cj, { action: "NO_SHOW", expectedVersion: version }), 409);
    ok(await http(`/api/bookings/${created.id}`, cj, { action: "CANCEL", expectedVersion: version }));
    const cancelled = await db.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { changes: true, request: true } });
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelled.request.state, "CANCELLED");
    assert.equal(cancelled.feeCents, 0);
    assert.equal(cancelled.refundCents, 6000);
    const todo = cancelled.changes.find(c => c.kind === "CANCELLATION")!;
    assert.deepEqual([todo.todoKind, todo.todoCents], ["REFUND", 6000]);
    assert((await http("/admin/pagesat", adminj)).text.includes("Rimburso klientin"));
    ok(await http("/api/admin/bookings", adminj, { action: "TODO_DONE", id: todo.id, reason: "Kthyer në dorë." }));
    assert((await db.bookingChange.findUniqueOrThrow({ where: { id: todo.id } })).todoDoneAt);

    // Paid estimate with this pro: the full €15 is credited; a late cancel costs €15 and returns the credit.
    const estimate = await db.estimate.create({ data: { clientId: customer.id, profileId, state: "PAID", paidAt: new Date() } });
    const credited = ok(await book({ startsAt: start(6), minutes: 120 }));
    const withCredit = await db.booking.findUniqueOrThrow({ where: { requestId: credited.id }, include: { request: { include: { payment: true } } } });
    assert.equal(withCredit.totalCents, 3000);
    assert.equal(withCredit.creditCents, 1500);
    assert.equal(withCredit.dueCents, 1500);
    assert.equal(withCredit.commissionCents, 450, "commission on the full €30");
    assert.equal(withCredit.request.payment?.estimateCreditCents, 1500);
    assert.equal((await db.estimate.findUniqueOrThrow({ where: { id: estimate.id } })).creditedRequestId, credited.id);
    const soon = new Date(Date.now() + 3 * 3600000);
    await db.booking.update({ where: { id: withCredit.id }, data: { startsAt: soon } });
    ok(await http(`/api/bookings/${credited.id}`, cj, { action: "CANCEL", expectedVersion: withCredit.request.version }));
    const late = await db.booking.findUniqueOrThrow({ where: { id: withCredit.id }, include: { changes: true } });
    assert.deepEqual([late.feeCents, late.feeProCents, late.feePlatformCents, late.refundCents], [1500, 1000, 500, 0]);
    assert.equal(late.changes.find(c => c.kind === "CANCELLATION")?.todoKind, "COLLECT", "unpaid late fee becomes an admin to-do");
    const returned = await db.estimate.findUniqueOrThrow({ where: { id: estimate.id } });
    assert.equal(returned.state, "PAID", "credit returns for the next hire");
    assert.deepEqual([returned.proShareCents, returned.platformShareCents], [1000, 500], "unused again: 10 € pro / 5 € Zgjoi split");

    // The chat path credits the same estimate when the customer hires with Puneso.
    const opened = ok(await http("/api/requests", cj, { profileId, detail: "Ndërrimi i një ndërprerësi në korridor.", city: "Prishtinë", clientKey: randomUUID() }));
    const sent = ok(await http("/api/offers", pjar, { requestId: opened.id, clientKey: randomUUID(), expectedVersion: 0, amount: "10", expiresInHours: 24 }));
    ok(await http("/api/offers/accept", cj, { quoteId: sent.quoteId, expectedVersion: 1 }));
    const hired = await db.payment.findUniqueOrThrow({ where: { requestId: opened.id } });
    assert.equal(hired.estimateCreditCents, 1500);
    assert.equal(hired.amount, 1000, "no minimum price; the customer owes nothing more under €15");
  });
  await t.test("recurring Book now: weekly series (first visit 15%, then 5%), monthly, cron generation, pause/resume/cancel with the 24 h rule, pro proposal confirmed by the customer", async () => {
    const { generateRecurringBookings } = await import("../lib/server/recurring-series");
    const customer = await account("CLIENT", "SeriesClient"), professional = await account("PRO", "SeriesPro"), stranger = await account("CLIENT", "SeriesStranger");
    const cj: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
    const pjar: Jar = new Map([["zgjoi_session", (await persistSession(professional.id, passwordHash)).token]]);
    const sj: Jar = new Map([["zgjoi_session", (await persistSession(stranger.id, passwordHash)).token]]);
    const profileId = professional.proProfile!.id;
    const start = (days: number) => { const d = new Date(Date.now() + days * 86400000); d.setUTCSeconds(0, 0); return d.toISOString(); };
    ok(await http("/api/account/booking-settings", pjar, { enabled: true, hourlyRate: "20", minMinutes: 120 }));
    const bookPage = (await http(`/rezervo-tani?pro=${profileId}`, cj)).text;
    assert(bookPage.includes("Çdo javë, e njëjta ditë dhe orë") && bookPage.includes("Çdo muaj, e njëjta datë dhe orë"));
    const body = (extra: Record<string, unknown> = {}) => ({ profileId, clientKey: randomUUID(), startsAt: start(3), minutes: 120,
      detail: "Pastrim i përjavshëm i banesës, dy dhoma.", city: "Prishtinë", address: "Rruga e Serisë 3", ...extra });
    ok(await http("/api/bookings", cj, body({ repeat: "DAILY" })), 400);
    const created = ok(await http("/api/bookings", cj, body({ repeat: "WEEKLY" })));
    assert(created.seriesId);
    const series = await db.recurringSeries.findUniqueOrThrow({ where: { id: created.seriesId } });
    assert.deepEqual([series.status, series.cadence, series.proposedBy, series.minutes, series.hourlyRateCents], ["ACTIVE", "WEEKLY", "CLIENT", 120, 2000]);
    const first = await db.booking.findUniqueOrThrow({ where: { requestId: created.id }, include: { request: { include: { payment: true } } } });
    assert.equal(first.seriesId, series.id);
    assert.deepEqual([first.totalCents, first.commissionBps, first.commissionCents, first.proCents], [4000, 1500, 600, 3400], "the first visit of a series pays the normal 15%");
    assert.equal(first.request.payment?.commissionBps, 1500);
    // The cron route is secret-protected; it creates the occurrence 7 days later (within the 14-day horizon) once.
    ok(await http("/api/cron/recurring"), 403);
    ok(await http("/api/cron/recurring", new Map(), undefined, { Authorization: "Bearer wrong" }), 403);
    const cron = () => http("/api/cron/recurring", new Map(), undefined, { Authorization: `Bearer ${process.env.CRON_SECRET}` });
    ok(await cron()); ok(await cron());
    const live = () => db.booking.findMany({ where: { seriesId: series.id, status: "CONFIRMED" }, orderBy: { startsAt: "asc" }, include: { request: { include: { payment: true } } } });
    let occurrences = await live();
    assert.equal(occurrences.length, 2, "first booking + one generated occurrence, no duplicates");
    assert.equal(occurrences[1].startsAt.getTime() - occurrences[0].startsAt.getTime(), 7 * 86400000);
    assert.deepEqual([occurrences[1].commissionBps, occurrences[1].commissionCents, occurrences[1].request.payment?.commissionBps], [500, 200, 500], "later visits 5%");
    assert.equal(occurrences[1].request.state, "BOOKED");
    assert.equal(occurrences[1].request.payment?.state, "PENDING");
    assert((await http("/llogaria/perseritjet", cj)).text.includes("Çdo javë"));
    assert((await http("/pro/perseritjet", pjar)).text.includes("Pauzo"));
    assert((await http(`/llogaria/kerkesat/${occurrences[1].requestId}`, cj)).text.includes("Abonim"));
    ok(await http(`/api/recurring/${series.id}`, sj, { action: "PAUSE" }), 404);
    ok(await http(`/api/recurring/${series.id}`, cj, { action: "DECLINE" }), 409);
    // Pause: the visit within 24 h stays; the one a week later is cancelled free.
    await db.booking.update({ where: { id: first.id }, data: { startsAt: new Date(Date.now() + 3 * 3600000) } });
    const paused = ok(await http(`/api/recurring/${series.id}`, cj, { action: "PAUSE" }));
    assert(paused.message.includes("1 vizitë e ardhshme u anulua falas"));
    const afterPause = await db.booking.findMany({ where: { seriesId: series.id }, orderBy: { startsAt: "asc" }, include: { changes: true } });
    assert.deepEqual(afterPause.map(b => b.status), ["CONFIRMED", "CANCELLED"]);
    assert.equal(afterPause[1].feeCents, 0);
    assert.equal(afterPause[1].cancelledBy, "CLIENT");
    ok(await cron());
    assert.equal((await live()).length, 1, "a paused series generates nothing");
    // Resume regenerates the released occurrence.
    ok(await http(`/api/recurring/${series.id}`, pjar, { action: "RESUME" }));
    occurrences = await live();
    assert.equal(occurrences.length, 2);
    assert.equal(occurrences[1].occurrenceAt!.toISOString(), afterPause[1].occurrenceAt!.toISOString());
    // The pro cancels the series: the far visit is cancelled free (pro, > 24 h); the near one stays under the normal rules.
    ok(await http(`/api/recurring/${series.id}`, pjar, { action: "CANCEL" }));
    assert.equal((await db.recurringSeries.findUniqueOrThrow({ where: { id: series.id } })).status, "CANCELLED");
    const afterCancel = await live();
    assert.deepEqual(afterCancel.map(b => b.id), [first.id]);
    ok(await http(`/api/recurring/${series.id}`, cj, { action: "RESUME" }), 409);
    // A single visit of the series still uses the late-cancel rule (< 24 h: €15).
    const near = await db.serviceRequest.findUniqueOrThrow({ where: { id: created.id } });
    ok(await http(`/api/bookings/${created.id}`, cj, { action: "CANCEL", expectedVersion: near.version }));
    const lateFee = await db.booking.findUniqueOrThrow({ where: { id: first.id } });
    assert.deepEqual([lateFee.feeCents, lateFee.feeProCents, lateFee.feePlatformCents], [1500, 1000, 500]);

    // Pro proposal from a plain booking: nothing is booked until the customer confirms.
    const plain = ok(await http("/api/bookings", cj, body({ startsAt: start(5) })));
    const plainBooking = await db.booking.findUniqueOrThrow({ where: { requestId: plain.id } });
    assert.equal(plainBooking.commissionBps, 1500, "a one-off booking keeps 15%");
    ok(await http(`/api/bookings/${plain.id}`, cj, { action: "PROPOSE_SERIES", clientKey: randomUUID(), cadence: "WEEKLY" }), 403);
    const proposed = ok(await http(`/api/bookings/${plain.id}`, pjar, { action: "PROPOSE_SERIES", clientKey: randomUUID(), cadence: "BIWEEKLY" }));
    ok(await http(`/api/bookings/${plain.id}`, pjar, { action: "PROPOSE_SERIES", clientKey: randomUUID(), cadence: "WEEKLY" }), 409);
    const proposal = await db.recurringSeries.findUniqueOrThrow({ where: { id: proposed.id } });
    assert.deepEqual([proposal.status, proposal.proposedBy, proposal.sourceRequestId], ["PROPOSED", "PRO", plain.id]);
    assert.equal(proposal.firstStartsAt.getTime() - plainBooking.startsAt.getTime(), 14 * 86400000);
    assert((await http(`/llogaria/kerkesat/${plain.id}`, cj)).text.includes("Konfirmo abonimin"));
    ok(await cron());
    assert.equal(await db.booking.count({ where: { seriesId: proposal.id } }), 0, "a proposal books nothing");
    ok(await http(`/api/recurring/${proposal.id}`, pjar, { action: "CONFIRM" }), 403);
    ok(await http(`/api/recurring/${proposal.id}`, cj, { action: "CONFIRM" }));
    assert.equal((await db.recurringSeries.findUniqueOrThrow({ where: { id: proposal.id } })).status, "ACTIVE");
    // Its first visit is 19 days out (beyond the 14-day window): the next visit always exists, so it is booked on confirm, at 15%.
    const generated = await db.booking.findFirstOrThrow({ where: { seriesId: proposal.id } });
    assert.equal(generated.startsAt.toISOString(), proposal.firstStartsAt.toISOString());
    assert.deepEqual([generated.commissionBps, generated.commissionCents], [1500, 600], "first visit of a pro-proposed series: normal rate");
    assert.equal((await generateRecurringBookings(new Date(Date.now() + 6 * 86400000))).created, 0, "booked a week ahead: nothing to add");
    // Six days before that visit, the following one (two weeks later) is added at 5%; a second run adds nothing.
    const later = new Date(proposal.firstStartsAt.getTime() - 6 * 86400000);
    assert.equal((await generateRecurringBookings(later)).created, 1);
    assert.equal((await generateRecurringBookings(later)).created, 0, "idempotent");
    const proVisits = await db.booking.findMany({ where: { seriesId: proposal.id }, orderBy: { startsAt: "asc" } });
    assert.equal(proVisits[1].startsAt.getTime() - proVisits[0].startsAt.getTime(), 14 * 86400000);
    assert.deepEqual([proVisits[1].commissionBps, proVisits[1].commissionCents], [500, 200]);

    // Monthly ("Çdo muaj"): same date each month; the next visit is booked right away even though it is beyond 14 days.
    const monthlyStart = start(4);
    const monthly = ok(await http("/api/bookings", cj, body({ repeat: "MONTHLY", startsAt: monthlyStart })));
    const monthlySeries = await db.recurringSeries.findUniqueOrThrow({ where: { id: monthly.seriesId } });
    const { kosovoSlot, occurrenceAt } = await import("../lib/recurring-series");
    assert.deepEqual([monthlySeries.cadence, monthlySeries.monthDay], ["MONTHLY", Number(kosovoSlot(new Date(monthlyStart)).date.slice(8))]);
    ok(await cron());
    const monthVisits = await db.booking.findMany({ where: { seriesId: monthlySeries.id }, orderBy: { startsAt: "asc" } });
    assert.equal(monthVisits.length, 2, "first visit + next month's visit");
    assert.equal(monthVisits[1].startsAt.toISOString(), occurrenceAt(new Date(monthlyStart), "MONTHLY", 1, monthlySeries.monthDay)!.toISOString());
    assert(monthVisits[1].startsAt.getTime() - Date.now() > 14 * 86400000);
    assert.deepEqual([monthVisits[0].commissionBps, monthVisits[1].commissionBps], [1500, 500]);
    assert((await http("/llogaria/perseritjet", cj)).text.includes("Çdo muaj, më"));
    await assert.rejects(db.$executeRawUnsafe(`UPDATE "RecurringSeries" SET "monthDay" = NULL WHERE id = '${monthlySeries.id}'`), "monthly needs its day");
  });
  await t.test("paid €15 estimate: request in chat, admin marks paid, address revealed, credited on the chat hire; cancel unpaid", async () => {
    const customer = await account("CLIENT", "EstimateClient"), professional = await account("PRO", "EstimatePro");
    const cj: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
    const pjar: Jar = new Map([["zgjoi_session", (await persistSession(professional.id, passwordHash)).token]]);
    const profileId = professional.proProfile!.id;
    assert((await http(`/profesionisti/${professional.proProfile!.slug}`)).text.includes("Kërko vlerësim"));
    assert.equal((await http(`/kerko-vleresim?pro=${profileId}`, cj)).status, 200);
    const visitAt = new Date(Date.now() + 2 * 86400000).toISOString();
    const req = (extra: Record<string, unknown> = {}) => http("/api/estimates", cj, { profileId, clientKey: randomUUID(), visitAt,
      detail: "Prizat në kuzhinë nuk punojnë, duhet kontroll.", city: "Prishtinë", address: "Rruga e Vlerësimit 7", ...extra });
    ok(await http("/api/estimates", pjar, { profileId, clientKey: randomUUID(), visitAt, detail: "Kontroll i instalimit.", city: "Prishtinë" }), 403);
    ok(await req({ detail: "Më shkruani te test@example.com për vizitën." }), 400);
    ok(await req({ visitAt: new Date(Date.now() + 10 * 60000).toISOString() }), 400);
    const opened = ok(await req());
    ok(await req(), 409);
    const estimate = await db.estimate.findFirstOrThrow({ where: { requestId: opened.id } });
    assert.deepEqual([estimate.state, estimate.amountCents, estimate.clientId, estimate.profileId], ["PENDING", 1500, customer.id, profileId]);
    const request = await db.serviceRequest.findUniqueOrThrow({ where: { id: opened.id }, include: { conversation: true } });
    assert.equal(request.state, "OPEN");
    assert(request.conversation);
    assert((await http(`/llogaria/kerkesat/${opened.id}`, cj)).text.includes("Vizitë vlerësimi"));
    const before = await http(`/pro/kerkesat/${opened.id}`, pjar);
    assert(before.text.includes("Pagesa është në pritje") && !before.text.includes("Rruga e Vlerësimit 7"), "address hidden until paid");
    ok(await http("/api/admin/estimates", cj, { action: "MARK_PAID", id: estimate.id, reason: "Para në dorë te zyra." }), 403);
    ok(await http("/api/admin/estimates", adminj, { action: "MARK_PAID", id: estimate.id, reason: "short" }), 400);
    assert((await http("/admin/pagesat", adminj)).text.includes("Vizitat e vlerësimit"));
    ok(await http("/api/admin/estimates", adminj, { action: "MARK_PAID", id: estimate.id, reason: "Para në dorë, konfirmuar me telefon." }));
    ok(await http("/api/admin/estimates", adminj, { action: "MARK_PAID", id: estimate.id, reason: "Para në dorë, konfirmuar me telefon." }));
    const paid = await db.estimate.findUniqueOrThrow({ where: { id: estimate.id } });
    assert.equal(paid.state, "PAID");
    assert(paid.paidAt && paid.paidById);
    assert.deepEqual([paid.proShareCents, paid.platformShareCents], [1000, 500], "not hired yet: 10 € pro, 5 € Zgjoi");
    assert((await http("/admin/pagesat", adminj)).text.includes("Ndarja nëse nuk punësohet"));
    await assert.rejects(db.$executeRawUnsafe(`UPDATE "Estimate" SET "proShareCents" = 1200 WHERE id = '${estimate.id}'`), "split must add up");
    assert((await http(`/pro/kerkesat/${opened.id}`, pjar)).text.includes("Rruga e Vlerësimit 7"), "address shown for the paid visit");
    ok(await http(`/api/estimates/${estimate.id}`, cj, { action: "CANCEL" }), 409);
    // The pro sends the price in the same chat; hiring with Puneso credits the €15, commission on the full €100.
    const sent = ok(await http("/api/offers", pjar, { requestId: opened.id, clientKey: randomUUID(), expectedVersion: 0, amount: "100", expiresInHours: 24 }));
    ok(await http("/api/offers/accept", cj, { quoteId: sent.quoteId, expectedVersion: 1 }));
    const payment = await db.payment.findUniqueOrThrow({ where: { requestId: opened.id } });
    assert.deepEqual([payment.amount, payment.estimateCreditCents, payment.commissionAmount], [10000, 1500, 1500]);
    const credited = await db.estimate.findUniqueOrThrow({ where: { id: estimate.id } });
    assert.deepEqual([credited.state, credited.creditedRequestId, credited.proShareCents, credited.platformShareCents], ["CREDITED", opened.id, null, null], "hired: no split");
    ok(await http("/api/admin/estimates", adminj, { action: "REFUND", id: estimate.id, reason: "Provë rimbursimi pas kreditimit." }), 409);
    // A new, unpaid request can be withdrawn by the customer; an admin cannot mark it paid afterwards.
    const second = ok(await req());
    const pending = await db.estimate.findFirstOrThrow({ where: { requestId: second.id } });
    ok(await http(`/api/estimates/${pending.id}`, pjar, { action: "CANCEL" }), 403);
    ok(await http(`/api/estimates/${pending.id}`, cj, { action: "CANCEL" }));
    assert.equal((await db.estimate.findUniqueOrThrow({ where: { id: pending.id } })).state, "CANCELLED");
    ok(await http("/api/admin/estimates", adminj, { action: "MARK_PAID", id: pending.id, reason: "Para në dorë, konfirmuar me telefon." }), 409);
    // A paid estimate that was never used can be refunded by an admin.
    const third = ok(await req());
    const unused = await db.estimate.findFirstOrThrow({ where: { requestId: third.id } });
    ok(await http("/api/admin/estimates", adminj, { action: "MARK_PAID", id: unused.id, reason: "Transfer bankar, referenca ZG-1." }));
    ok(await http("/api/admin/estimates", adminj, { action: "REFUND", id: unused.id, reason: "Vizita nuk u bë, u kthye në dorë." }));
    const refunded = await db.estimate.findUniqueOrThrow({ where: { id: unused.id } });
    assert.deepEqual([refunded.state, refunded.proShareCents], ["REFUNDED", null]);
  });
  await t.test("disputes: either side flags, the other responds within 48 h, the admin decides a final price; trust history and the 3-cancellation alert", async () => {
    const customer = await account("CLIENT", "DisputeClient"), professional = await account("PRO", "DisputePro");
    const cj: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
    const pjar: Jar = new Map([["zgjoi_session", (await persistSession(professional.id, passwordHash)).token]]);
    const profileId = professional.proProfile!.id;
    async function hired(amount = "100") {
      const opened = ok(await http("/api/requests", cj, { profileId, detail: "Riparim i panelit elektrik në bodrum.", city: "Prishtinë", clientKey: randomUUID() }));
      const sent = ok(await http("/api/offers", pjar, { requestId: opened.id, clientKey: randomUUID(), expectedVersion: 0, amount, expiresInHours: 24 }));
      ok(await http("/api/offers/accept", cj, { quoteId: sent.quoteId, expectedVersion: 1 }));
      return opened.id as string;
    }
    const id = await hired();
    const payment = await db.payment.findUniqueOrThrow({ where: { requestId: id } });
    ok(await http("/api/disputes", pjar, { requestId: id, reason: "Klienti kërkon punë shtesë pa e paguar, para pagesës." }), 409);
    ok(await http("/api/admin/payments", adminj, { action: "MARK_PAID_OFFLINE", id: payment.id, reason: "Para në dorë, konfirmuar me telefon nga klienti." }));
    ok(await http(`/api/requests/${id}`, pjar, { action: "START" }));
    assert((await db.serviceRequest.findUniqueOrThrow({ where: { id } })).startedAt, "start time is recorded for the trust history");
    ok(await http(`/api/requests/${id}`, pjar, { action: "REQUEST_COMPLETION" }));
    ok(await http(`/api/requests/${id}`, cj, { action: "CONFIRM_COMPLETION" }));
    // The pro flags the finished job; admins get an on-site notice linking the dispute view.
    const opened = ok(await http("/api/disputes", pjar, { requestId: id, reason: "Klienti nuk pranon të paguajë pjesën e dytë të punës së kryer." }));
    const dispute = await db.dispute.findUniqueOrThrow({ where: { id: opened.id } });
    assert.equal(dispute.openedByRole, "PRO");
    assert.equal(dispute.priorState, "COMPLETED");
    assert(Math.abs(dispute.respondBy!.getTime() - (Date.now() + 48 * 3600000)) < 120000);
    assert(await db.notification.findFirst({ where: { userId: admin.id, kind: "DISPUTE", href: `/admin/kontestet/${dispute.id}` } }));
    // The admin waits for the other side (or the 48 hours).
    ok(await http("/api/admin/disputes", adminj, { action: "DECIDE", id: dispute.id, outcome: "NO_ACTION", resolution: "Asnjë veprim pas shqyrtimit." }), 409);
    ok(await http("/api/disputes", pjar, { action: "RESPOND", requestId: id, statement: "Deklarata e dytë nuk mund të vijë nga e njëjta palë." }), 403);
    ok(await http("/api/disputes", cj, { action: "RESPOND", requestId: id, statement: "Puna u krye vetëm përgjysmë dhe pa material të ri." }));
    const view = await http(`/admin/kontestet/${dispute.id}`, adminj);
    assert(view.text.includes("Klienti nuk pranon") && view.text.includes("Puna u krye vetëm përgjysmë") && view.text.includes("Ruaj vendimin"));
    for (const jar of [cj, pjar]) ok(await http("/api/admin/disputes", jar, { action: "DECIDE", id: dispute.id, outcome: "NO_ACTION", resolution: "Nuk lejohet." }), 403);
    ok(await http("/api/admin/disputes", adminj, { action: "DECIDE", id: dispute.id, outcome: "PARTIAL_REFUND", resolution: "Puna u krye pjesërisht; çmimi ulet." }), 400);
    const decided = ok(await http("/api/admin/disputes", adminj, { action: "DECIDE", id: dispute.id, outcome: "PARTIAL_REFUND", finalPrice: "60", resolution: "Puna u krye pjesërisht; çmimi ulet në 60 €." }));
    assert(decided.message.includes("Rimbursim i pjesshëm"));
    const settled = await db.payment.findUniqueOrThrow({ where: { requestId: id }, include: { dispute: true, payouts: true } });
    assert.deepEqual([settled.state, settled.amount, settled.commissionAmount, settled.proAmount], ["HELD", 6000, 900, 5100]);
    assert.equal(settled.payouts[0]?.amount, 5100);
    assert.deepEqual([settled.dispute?.todoKind, settled.dispute?.todoCents], ["REFUND", 4000]);
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id } })).state, "COMPLETED");
    assert((await http(`/llogaria/kerkesat/${id}`, cj)).text.includes("Vendimi i administratës: Rimbursim i pjesshëm"));
    assert(await db.notification.findFirst({ where: { userId: professional.id, kind: "DISPUTE_DECIDED" } }));
    assert((await http("/admin/pagesat", adminj)).text.includes("Kontest · Rimburso klientin"));
    ok(await http("/api/admin/disputes", adminj, { action: "TODO_DONE", id: dispute.id, reason: "Kthyer 40 € në dorë." }));
    assert((await db.dispute.findUniqueOrThrow({ where: { id: dispute.id } })).todoDoneAt);
    // Trust history on the public profile.
    const profile = await http(`/profesionisti/${professional.proProfile!.slug}`);
    assert(profile.text.includes("Historiku i punëve") && profile.text.includes("Në kohë"));
    // Three pro cancellations in 90 days alert the admins once.
    for (let i = 0; i < 3; i++) {
      const job = await hired("30");
      const version = (await db.serviceRequest.findUniqueOrThrow({ where: { id: job } })).version;
      ok(await http(`/api/requests/${job}`, pjar, { action: "CANCEL", expectedVersion: version }));
      assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: job } })).cancelledBy, "PRO");
    }
    assert.equal(await db.notification.count({ where: { userId: admin.id, kind: "PRO_REVIEW" } }), 1);
    const { proTrust } = await import("../lib/server/trust");
    assert.deepEqual(await proTrust(profileId), { booked: 4, onTime: 1, late: 0, notFinished: 3, disputes: 1, cancellations: 3 });
  });
  await t.test("arrita: check-in within 200 m or with a photo, helpline wait and admin contact log gate “nobody home”; a no-show after a check-in becomes a dispute", async () => {
    const customer = await account("CLIENT", "ArritaClient"), professional = await account("PRO", "ArritaPro");
    await db.user.update({ where: { id: customer.id }, data: { phone: "+38344000111" } });
    const cj: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
    const pjar: Jar = new Map([["zgjoi_session", (await persistSession(professional.id, passwordHash)).token]]);
    const profileId = professional.proProfile!.id;
    ok(await http("/api/account/booking-settings", pjar, { enabled: true, hourlyRate: "20", minMinutes: 60 }));
    const site = { lat: 42.6629, lng: 21.1655 }; // seeded coordinates (CI never calls the geocoder)
    let day = 3;
    async function booking(startOffsetMin: number, geocoded = true) {
      const created = ok(await http("/api/bookings", cj, { profileId, clientKey: randomUUID(), startsAt: new Date(Date.now() + day++ * 86400000).toISOString(),
        minutes: 120, detail: "Kontroll i prizave në dhomën e ndenjes.", city: "Prishtinë", address: "Rruga e Testit 7" }));
      const b = await db.booking.update({ where: { requestId: created.id }, data: { startsAt: new Date(Date.now() + startOffsetMin * 60000),
        ...(geocoded ? { siteGeocode: "OK", siteLat: site.lat, siteLng: site.lng } : { siteGeocode: "NOT_FOUND" }) } });
      return { id: created.id as string, bookingId: b.id };
    }
    const arrive = (id: string, body: Record<string, unknown>, jar = pjar) => http(`/api/bookings/${id}/arrival`, jar, body);
    const near = { action: "CHECK_IN", lat: site.lat + 0.0004, lng: site.lng, accuracy: 12 }; // ≈45 m
    const far = { action: "CHECK_IN", lat: site.lat + 0.01, lng: site.lng, accuracy: 12 };    // ≈1.1 km
    const jpeg = `data:image/jpeg;base64,${Buffer.from("ffd8ffdb" + "00".repeat(200), "hex").toString("base64")}`;
    const version = async (id: string) => (await db.serviceRequest.findUniqueOrThrow({ where: { id } })).version;

    // Window: closed until 15 minutes before the start.
    const a = await booking(120);
    assert.equal(ok(await arrive(a.id, near), 409).code, "ARRIVAL_EARLY");
    await db.booking.update({ where: { id: a.bookingId }, data: { startsAt: new Date(Date.now() + 5 * 60000) } });
    ok(await arrive(a.id, near, cj), 403);
    assert.equal(ok(await arrive(a.id, far), 409).code, "PHOTO_REQUIRED", "over 200 m needs a photo");
    ok(await arrive(a.id, { action: "HELPLINE" }), 409);
    const checked = ok(await arrive(a.id, near));
    assert.match(checked.message, /te adresa/);
    const arrival = await db.bookingArrival.findUniqueOrThrow({ where: { bookingId: a.bookingId } });
    assert.equal(arrival.method, "GPS");
    assert(arrival.distanceM! > 20 && arrival.distanceM! < 80);
    const clientChat = (await http(`/llogaria/kerkesat/${a.id}`, cj)).text;
    assert(clientChat.includes("Profesionisti arriti") && clientChat.includes("te adresa"));
    assert(!clientChat.includes(String(near.lat)) && !clientChat.includes(`${arrival.distanceM} m`), "the customer never sees coordinates or distance");

    // “Nobody home” needs: check-in, helpline, 30 minutes since the tap, and the admin's “no answer”.
    await db.booking.update({ where: { id: a.bookingId }, data: { startsAt: new Date(Date.now() - 60000) } });
    const blocked = ok(await http(`/api/bookings/${a.id}`, pjar, { action: "NOBODY_HOME", expectedVersion: await version(a.id) }), 409);
    assert.match(blocked.message, /Thirr ndihmën e Zgjoi/);
    ok(await arrive(a.id, { action: "HELPLINE" }, cj), 403);
    const tapped = ok(await arrive(a.id, { action: "HELPLINE" }));
    assert.equal(tapped.whatsapp, null, "no number configured: on-site alert only");
    assert(await db.notification.findFirst({ where: { userId: admin.id, kind: "HELPLINE", href: `/admin/rezervimet/${a.id}` } }));
    assert(await db.auditLog.findFirst({ where: { action: "HELPLINE_TAPPED", target: a.id } }));
    assert((await http(`/llogaria/kerkesat/${a.id}`, cj)).text.includes("Profesionisti po ju pret"));
    const proChat = (await http(`/pro/kerkesat/${a.id}`, pjar)).text;
    assert(proChat.includes("Numri i WhatsApp-it të ndihmës nuk është vendosur ende"));
    assert.match(ok(await http(`/api/bookings/${a.id}`, pjar, { action: "NOBODY_HOME", expectedVersion: await version(a.id) }), 409).message, /prisni edhe/);
    await db.bookingArrival.update({ where: { bookingId: a.bookingId }, data: { helplineAt: new Date(Date.now() - 31 * 60000), waitEndsAt: new Date(Date.now() - 60000) } });
    assert.match(ok(await http(`/api/bookings/${a.id}`, pjar, { action: "NOBODY_HOME", expectedVersion: await version(a.id) }), 409).message, /nuk u përgjigj/);
    ok(await http("/api/admin/arrival", pjar, { requestId: a.id, result: "NO_ANSWER" }), 403);
    assert((await http(`/admin/rezervimet/${a.id}`, adminj)).text.includes("Arrita · prova e paraqitjes"));
    ok(await http("/api/admin/arrival", adminj, { requestId: a.id, result: "NO_ANSWER", note: "Thirra dy herë." }));
    ok(await http(`/api/bookings/${a.id}`, pjar, { action: "NOBODY_HOME", expectedVersion: await version(a.id) }));
    const closed = await db.booking.findUniqueOrThrow({ where: { id: a.bookingId }, include: { request: true } });
    assert.deepEqual([closed.cancelReason, closed.feeCents, closed.feeProCents, closed.feePlatformCents, closed.request.cancelledBy], ["NOBODY_HOME", 1500, 1000, 500, "NOBODY_HOME"]);

    // Unlocated address: a photo is required; it is visible to the pro and admins only.
    const b = await booking(5, false);
    assert.equal(ok(await arrive(b.id, near), 409).code, "PHOTO_REQUIRED");
    ok(await arrive(b.id, { ...near, photo: "data:image/gif;base64,R0lGODlh" }), 400);
    ok(await arrive(b.id, { ...near, photo: jpeg }));
    const withPhoto = await db.bookingArrival.findUniqueOrThrow({ where: { bookingId: b.bookingId } });
    assert.deepEqual([withPhoto.method, withPhoto.distanceM, withPhoto.photoMime], ["PHOTO", null, "image/jpeg"]);
    assert.equal((await http(`/api/bookings/${b.id}/arrival/photo`, pjar)).status, 200);
    assert.equal((await http(`/api/bookings/${b.id}/arrival/photo`, adminj)).status, 200);
    assert.equal((await http(`/api/bookings/${b.id}/arrival/photo`, cj)).status, 404);
    assert((await http(`/llogaria/kerkesat/${b.id}`, cj)).text.includes("konfirmuar me foto"));
    // The admin reached the customer, who cancelled at the door: the late customer cancellation applies.
    ok(await arrive(b.id, { action: "HELPLINE" }));
    ok(await http("/api/admin/arrival", adminj, { requestId: b.id, result: "REACHED_CANCELLED" }));
    const doorCancel = await db.booking.findUniqueOrThrow({ where: { id: b.bookingId } });
    assert.deepEqual([doorCancel.status, doorCancel.cancelledBy, doorCancel.feeCents], ["CANCELLED", "CLIENT", 1500]);

    // Customer no-show: only from 15 minutes after the start, and only without a check-in.
    const c = await booking(-5);
    assert.equal(ok(await http(`/api/bookings/${c.id}`, cj, { action: "NO_SHOW", expectedVersion: await version(c.id) }), 409).code, "TOO_EARLY");
    await db.booking.update({ where: { id: c.bookingId }, data: { startsAt: new Date(Date.now() - 16 * 60000) } });
    ok(await http(`/api/bookings/${c.id}`, cj, { action: "NO_SHOW", expectedVersion: await version(c.id) }));
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: c.id } })).cancelledBy, "PRO_NO_SHOW");

    // With a valid check-in, the customer's no-show report becomes a dispute with the Arrita evidence.
    const d = await booking(5);
    const payment = await db.payment.findUniqueOrThrow({ where: { requestId: d.id } });
    ok(await http("/api/admin/payments", adminj, { action: "MARK_PAID_OFFLINE", id: payment.id, reason: "Para në dorë, konfirmuar me telefon nga klienti." }));
    ok(await arrive(d.id, near));
    await db.booking.update({ where: { id: d.bookingId }, data: { startsAt: new Date(Date.now() - 20 * 60000) } });
    assert.equal(ok(await http(`/api/bookings/${d.id}`, cj, { action: "NO_SHOW", expectedVersion: await version(d.id) }), 400).code, "STATEMENT");
    const flagged = ok(await http(`/api/bookings/${d.id}`, cj, { action: "NO_SHOW", expectedVersion: await version(d.id), statement: "Nuk erdhi askush te dera, prita gjithë kohën." }));
    assert.equal(flagged.dispute, true);
    const job = await db.serviceRequest.findUniqueOrThrow({ where: { id: d.id }, include: { payment: { include: { dispute: true } }, booking: true } });
    assert.equal(job.state, "DISPUTED");
    assert.equal(job.booking?.status, "CONFIRMED", "no automatic refund");
    const disputePage = (await http(`/admin/kontestet/${job.payment!.dispute!.id}`, adminj)).text;
    assert(disputePage.includes("Arrita · prova e paraqitjes") && disputePage.includes("Largësia nga adresa"));

    // Trust history: an Arrita check-in more than 15 minutes after the start counts as late.
    const e = await booking(-20);
    ok(await arrive(e.id, near));
    await db.serviceRequest.update({ where: { id: e.id }, data: { state: "COMPLETED", completedAt: new Date(), startedAt: new Date() } });
    const { proTrust } = await import("../lib/server/trust");
    assert.equal((await proTrust(profileId)).late, 1);
  });
  async function unpaidBooking() {
    const customer = await account("CLIENT", "BookingClient"), professional = await account("PRO", "BookingPro");
    const customerJar: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
    const proJar: Jar = new Map([["zgjoi_session", (await persistSession(professional.id, passwordHash)).token]]);
    const request = await db.serviceRequest.create({ data: {
      clientId: customer.id, selectedProfileId: professional.proProfile!.id, categorySlug: category.slug,
      title: "Rezervim për testim", detail: "Punë private për testimin e rezervimit.", city: "Prishtinë", timing: "Sipas marrëveshjes", answers: {}, conversation: { create: {} },
    } });
    const start = new Date(Date.now() + 3 * 86400000).toISOString();
    const sent = ok(await http("/api/offers", proJar, { ...offer(), requestId: request.id, scheduledAt: start }));
    ok(await http("/api/offers/accept", customerJar, { quoteId: sent.quoteId, expectedVersion: 1 }));
    const proposal = { action: "PROPOSE", clientKey: randomUUID(), expectedVersion: 2, timing: "Orari i ri i propozuar",
      scheduledAt: new Date(Date.now() + 5 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() };
    return { id: request.id, customer, professional, customerJar, proJar, start, quoteId: sent.quoteId as string, proposal,
      path: `/api/requests/${request.id}/reschedule` };
  }

  await t.test("unpaid cancellation enforces ownership and versions, is idempotent and retains closed payment history", async () => {
    const f = await unpaidBooking();
    const body = { action: "CANCEL", expectedVersion: 2 };
    for (const jar of [bj, otherj, adminj]) ok(await http(`/api/requests/${f.id}`, jar, body), 404);
    ok(await http(`/api/requests/${f.id}`, f.customerJar, { action: "CANCEL" }), 409);
    ok(await http(`/api/requests/${f.id}`, f.customerJar, { ...body, expectedVersion: 1 }), 409);
    const notices = await db.notification.count({ where: { kind: "CANCEL", href: { endsWith: f.id } } });
    const results = await Promise.all([f.customerJar, f.proJar].map(jar => http(`/api/requests/${f.id}`, jar, body)));
    results.forEach(r => ok(r));
    const request = await db.serviceRequest.findUniqueOrThrow({ where: { id: f.id } });
    assert.equal(request.state, "CANCELLED");
    assert.equal(request.version, 3);
    assert(request.cancelledAt);
    assert.equal((await db.payment.findUniqueOrThrow({ where: { requestId: f.id } })).state, "EXPIRED");
    assert.equal((await db.quote.findUniqueOrThrow({ where: { id: f.quoteId } })).state, "WITHDRAWN");
    assert.equal(await db.notification.count({ where: { kind: "CANCEL", href: { endsWith: f.id } } }), notices + 1);
    ok(await http(f.path, f.proJar, { ...f.proposal, expectedVersion: 3 }), 409);
    ok(await http("/api/payments/checkout", f.customerJar, { requestId: f.id }), 409);
    ok(await http("/api/offers/accept", f.customerJar, { quoteId: f.quoteId, expectedVersion: 1 }), 409);
    const page = await http(`/llogaria/kerkesat/${f.id}`, f.customerJar);
    assert.equal(page.status, 200);
    assert(page.text.includes("Asnjë shumë nuk u tarifua"));
    assert(!page.text.includes("Anulo rezervimin pa pagesë"));
  });

  await t.test("beta: an admin marks an unpaid booking as paid offline (audited, idempotent), unlocking completion, payout and review", async () => {
    const f = await unpaidBooking();
    const payment = await db.payment.findUniqueOrThrow({ where: { requestId: f.id } });
    const body = { action: "MARK_PAID_OFFLINE", id: payment.id, reason: "Para në dorë, konfirmuar me telefon nga klienti." };
    for (const jar of [f.customerJar, f.proJar, supportj]) ok(await http("/api/admin/payments", jar, body), 403);
    ok(await http("/api/admin/payments", adminj, { ...body, reason: "shkurt" }), 400);
    ok(await http(`/api/requests/${f.id}`, f.proJar, { action: "START" }), 409);
    const results = await Promise.all([1, 2].map(() => http("/api/admin/payments", adminj, body)));
    results.forEach((r) => ok(r));
    const held = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(held.state, "HELD");
    assert.equal(held.provider, "offline");
    assert(held.heldAt);
    const audits = await db.auditLog.findMany({ where: { action: "PAYMENT_MARKED_PAID_OFFLINE", target: payment.id } });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].actorId, admin.id);
    assert.equal((audits[0].meta as { note?: string }).note, body.reason);
    assert.equal(await db.notification.count({ where: { kind: "FUNDED", href: { endsWith: f.id } } }), 2);
    ok(await http(`/api/requests/${f.id}`, f.customerJar, { action: "CANCEL", expectedVersion: 2 }), 409);
    ok(await http(`/api/requests/${f.id}`, f.proJar, { action: "START" }));
    ok(await http(`/api/requests/${f.id}`, f.proJar, { action: "REQUEST_COMPLETION" }));
    ok(await http(`/api/requests/${f.id}`, f.customerJar, { action: "CONFIRM_COMPLETION" }));
    const payout = await db.payout.findUniqueOrThrow({ where: { paymentId: payment.id } });
    assert.equal(payout.amount, held.proAmount);
    assert.equal(payout.state, "SCHEDULED");
    ok(await http("/api/reviews", f.customerJar, { requestId: f.id, rating: 5, text: "Punë e pastër dhe në kohë, faleminderit." }));
    assert.equal(ok(await http("/api/admin/payments", adminj, body)).already, true);
    assert.equal(await db.auditLog.count({ where: { action: "PAYMENT_MARKED_PAID_OFFLINE", target: payment.id } }), 1);
  });

  await t.test("reading a request expires an overdue offer without the cron and returns no internal keys", async () => {
    const pending = ok(await http("/api/requests", bj, { ...inquiry, clientKey: randomUUID() }));
    const sent = ok(await http("/api/offers", pj, { ...offer(), requestId: pending.id, clientKey: randomUUID() }));
    await db.quote.update({ where: { id: sent.quoteId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const viewed = ok(await http(`/api/requests/${pending.id}`, bj));
    assert.equal(viewed.state, "OPEN");
    assert.equal(viewed.quotes[0].state, "EXPIRED");
    assert.equal(await db.notification.count({ where: { kind: "EXPIRED", href: { endsWith: `/kerkesat/${pending.id}` } } }), 2);
    for (const key of ["creationKey", "clientId"]) assert(!(key in viewed), key);
    assert(!("id" in viewed.client));
    assert(!("creationKey" in viewed.quotes[0]));
    assert(!("userId" in viewed.selectedPro));
  });

  await t.test("chat notices are coalesced per job and cleared when the thread is opened", async () => {
    const pending = ok(await http("/api/requests", bj, { ...inquiry, clientKey: randomUUID() }));
    const { id: conversation } = await db.conversation.findUniqueOrThrow({ where: { requestId: pending.id } });
    const href = `/pro/kerkesat/${pending.id}`;
    for (const text of ["Mirëdita, a jeni i lirë më 27.11.2026 nga ora 10:00?", "Buxheti im është rreth 95.50 €.", "Faleminderit!"])
      ok(await http("/api/messages", bj, { conversationId: conversation, body: text, clientKey: randomUUID() }));
    const notices = await db.notification.findMany({ where: { userId: pro.id, kind: "MESSAGE", href } });
    assert.equal(notices.length, 1);
    assert.equal(notices[0].title, "Keni mesazhe të reja");
    ok(await http(`/api/messages?conversationId=${conversation}`, pj));
    assert.equal(await db.notification.count({ where: { userId: pro.id, kind: "MESSAGE", href, readAt: null } }), 0);
    ok(await http("/api/messages", bj, { conversationId: conversation, body: "Edhe një pyetje.", clientKey: randomUUID() }));
    assert.equal(await db.notification.count({ where: { userId: pro.id, kind: "MESSAGE", href, readAt: null } }), 1);
  });

  await t.test("payment attempts, provider references and settled history prevent self-service booking changes", async () => {
    const f = await unpaidBooking();
    const payment = await db.payment.findUniqueOrThrow({ where: { requestId: f.id } });
    const cases = [
      { attempt: 1 }, { provider: "stripe_test" }, { providerCheckoutId: `cs-${randomUUID()}` },
      { stripeChargeId: "ch-ci" }, { operation: "CHECKOUT", operationStartedAt: new Date() },
      { heldAt: new Date() }, { state: "HELD" as const }, { state: "REFUNDED" as const },
    ];
    for (const patch of cases) {
      await db.payment.update({ where: { id: payment.id }, data: patch });
      ok(await http(`/api/requests/${f.id}`, f.customerJar, { action: "CANCEL", expectedVersion: 2 }), 409);
      ok(await http(f.path, f.proJar, f.proposal), 409);
      assert.equal(ok(await http(`/api/requests/${f.id}`, f.customerJar)).unpaidEditable, false);
      await db.payment.update({ where: { id: payment.id }, data: Object.fromEntries(Object.keys(patch).map(key => [key, payment[key as keyof typeof payment]])) });
    }
    await db.paymentEvent.create({ data: { provider: "synthetic", eventId: randomUUID(), kind: "synthetic", paymentId: payment.id } });
    ok(await http(`/api/requests/${f.id}`, f.proJar, { action: "CANCEL", expectedVersion: 2 }), 409);
    ok(await http(f.path, f.proJar, f.proposal), 409);
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: f.id } })).state, "BOOKED");
  });

  await t.test("rescheduling needs customer consent, keeps original terms and payment, and rejects stale or foreign decisions", async () => {
    const f = await unpaidBooking();
    for (const jar of [new Map(), bj, otherj, f.customerJar]) {
      const r = await http(f.path, jar, f.proposal);
      assert([401, 403, 404].includes(r.status));
    }
    ok(await http(f.path, f.proJar, f.proposal, { Origin: "https://outside.example.test" }), 403);
    ok(await http(f.path, f.proJar, { ...f.proposal, amount: "1" }), 400);
    const before = await db.payment.findUniqueOrThrow({ where: { requestId: f.id } });
    const proposals = await Promise.all([http(f.path, f.proJar, f.proposal), http(f.path, f.proJar, f.proposal)]);
    const sent = ok(proposals[0]);
    assert.equal(ok(proposals[1]).quoteId, sent.quoteId);
    let request = await db.serviceRequest.findUniqueOrThrow({ where: { id: f.id } });
    assert.equal(request.acceptedQuoteId, f.quoteId);
    assert.equal(request.scheduledAt!.toISOString(), f.start);
    assert.equal(request.version, 3);
    assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { requestId: f.id } }), before);
    assert.equal((await http("/api/payments/checkout", f.customerJar, { requestId: f.id })).data.code, "RESCHEDULE_PENDING");
    const page = await http(`/llogaria/kerkesat/${f.id}`, f.customerJar);
    assert(page.text.includes("Prano orarin e ri"));
    assert(page.text.includes("Mbaj orarin e mëparshëm"));
    const decision = { action: "ACCEPT", quoteId: sent.quoteId, expectedVersion: 3 };
    ok(await http(f.path, f.proJar, decision), 403);
    ok(await http(f.path, bj, decision), 404);
    ok(await http(f.path, f.customerJar, { ...decision, expectedVersion: 2 }), 409);
    const accepted = await Promise.all([http(f.path, f.customerJar, decision), http(f.path, f.customerJar, decision)]);
    accepted.forEach(r => ok(r));
    request = await db.serviceRequest.findUniqueOrThrow({ where: { id: f.id } });
    assert.equal(request.scheduledAt!.toISOString(), f.proposal.scheduledAt);
    assert.equal(request.acceptedQuoteId, sent.quoteId);
    assert.equal(request.version, 4);
    const after = await db.payment.findUniqueOrThrow({ where: { requestId: f.id } });
    assert.deepEqual({ ...after, updatedAt: before.updatedAt }, before);
    assert.equal(await db.payment.count({ where: { requestId: f.id } }), 1);
    assert.equal(await db.notification.count({ where: { kind: "RESCHEDULE_ACCEPT", href: { endsWith: f.id } } }), 1);
    assert.equal((await db.quote.findUniqueOrThrow({ where: { id: f.quoteId } })).state, "WITHDRAWN");
  });

  await t.test("declined, withdrawn, replaced and expired rescheduling proposals preserve the original reservation", async () => {
    const f = await unpaidBooking();
    let version = 2;
    for (const action of ["DECLINE", "WITHDRAW"] as const) {
      const sent = ok(await http(f.path, f.proJar, { ...f.proposal, clientKey: randomUUID(), expectedVersion: version++ }));
      const jar = action === "DECLINE" ? f.customerJar : f.proJar;
      const decision = { action, quoteId: sent.quoteId, expectedVersion: version++ };
      ok(await http(f.path, jar, decision));
      ok(await http(f.path, jar, decision));
    }
    const replaced = ok(await http(f.path, f.proJar, { ...f.proposal, clientKey: randomUUID(), expectedVersion: version++ }));
    const fresh = ok(await http(f.path, f.proJar, { ...f.proposal, clientKey: randomUUID(), expectedVersion: version++ }));
    ok(await http(f.path, f.customerJar, { action: "ACCEPT", quoteId: replaced.quoteId, expectedVersion: version }), 409);
    await db.quote.update({ where: { id: fresh.quoteId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    ok(await http(f.path, f.customerJar, { action: "ACCEPT", quoteId: fresh.quoteId, expectedVersion: version }), 409);
    await Promise.all([expireOffers(), expireOffers()]);
    const request = await db.serviceRequest.findUniqueOrThrow({ where: { id: f.id } });
    assert.equal(request.state, "BOOKED");
    assert.equal(request.acceptedQuoteId, f.quoteId);
    assert.equal(request.scheduledAt!.toISOString(), f.start);
    assert.equal(request.version, version + 1);
    assert.equal(await db.notification.count({ where: { kind: "RESCHEDULE_EXPIRED", href: { endsWith: f.id } } }), 2);
  });

  await t.test("rescheduling rechecks calendar collisions and payment activity at acceptance", async () => {
    const f = await unpaidBooking();
    const sent = ok(await http(f.path, f.proJar, f.proposal));
    const decision = { action: "ACCEPT", quoteId: sent.quoteId, expectedVersion: 3 };
    const otherRequest = await db.serviceRequest.create({ data: { clientId: b.id, selectedProfileId: f.professional.proProfile!.id,
      categorySlug: category.slug, title: "Rezervim tjetër", timing: "Sipas marrëveshjes", city: "Prishtinë", answers: {} } });
    // The original slot is still reserved while a replacement awaits consent.
    ok(await http("/api/offers", f.proJar, { ...offer(), requestId: otherRequest.id, scheduledAt: f.start }), 409);
    const otherQuote = ok(await http("/api/offers", f.proJar, { ...offer(), requestId: otherRequest.id, scheduledAt: f.proposal.scheduledAt }));
    ok(await http("/api/offers/accept", bj, { quoteId: otherQuote.quoteId, expectedVersion: 1 }));
    const conflict = await http(f.path, f.customerJar, decision);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.data.code, "APPOINTMENT_CONFLICT");
    assert.equal((await db.serviceRequest.findUniqueOrThrow({ where: { id: f.id } })).acceptedQuoteId, f.quoteId);
    ok(await http(`/api/requests/${otherRequest.id}`, bj, { action: "CANCEL", expectedVersion: 2 }));
    await db.payment.update({ where: { requestId: f.id }, data: { attempt: 1, provider: "stripe_test" } });
    ok(await http(f.path, f.customerJar, decision), 409);
    assert.equal((await db.quote.findUniqueOrThrow({ where: { id: sent.quoteId } })).state, "SENT");
  });

  await t.test("concurrent rate limits share one atomic bucket", async () => {
    const key = `test-${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 12 }, () => rateLimit(key, 5, 60000)),
    );
    assert.equal(results.filter((r) => r.ok).length, 5);
  });
  await t.test(
    "signup, verification, own-profile edits, favorites and availability persist",
    async () => {
      for (const role of ["CLIENT", "PRO"] as const) {
        const jar: Jar = new Map();
        const email = `signup-${role.toLowerCase()}-${randomUUID()}@ci.zgjoi.invalid`;
        const input = {
          role,
          name: `Test ${role}`,
          email,
          password,
          city: "Prishtinë",
          terms: true,
          ...(role === "PRO"
            ? {
                categories: [category.slug, "pastrim"],
                about: "Profesionist i ri për provën e regjistrimit të sigurt.",
                // Ignored: prices are never taken at sign-up.
                priceFrom: "35.50",
              }
            : {}),
        };
        ok(await http("/api/auth/register", jar, input));
        const user = await db.user.findUniqueOrThrow({
          where: { email },
          include: { proProfile: true },
        });
        assert.equal(user.role, role);
        assert.notEqual(user.passwordHash, password);
        assert.equal(user.emailVerified, null);
        ok(await http("/api/auth/register", new Map(), input), 409);
        const token = await db.authToken.findFirstOrThrow({
          where: { userId: user.id, purpose: "EMAIL_VERIFY", usedAt: null },
        });
        const mail = await db.outbox.findUniqueOrThrow({
          where: { key: `account-email:${token.id}` },
        });
        const payload = JSON.parse(decrypt(mail.payloadEnc));
        assert.equal(payload.expiresAt, token.expiresAt.toISOString());
        const raw = String(payload.text).match(/#token=([a-f0-9]{64})/)?.[1];
        assert(raw);
        ok(await http("/api/auth/verify", new Map(), { token: raw }));
        ok(await http("/api/auth/verify", new Map(), { token: raw }), 400);
        assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
        ok(await http("/api/auth/login", jar, { email, password }));
        ok(await http("/api/auth/resend", jar, {}));
        assert.equal(
          await db.authToken.count({
            where: { userId: user.id, purpose: "EMAIL_VERIFY" },
          }),
          1,
        );
        ok(
          await http("/api/account", jar, {
            name: user.name,
            city: "Pejë",
            phone: "",
          }),
        );
        if (role === "PRO") {
          // Sign-up created both professions, unpriced and unapproved; no price was stored.
          const rows = await db.proCategory.findMany({ where: { profileId: user.proProfile!.id }, orderBy: { position: "asc" } });
          assert.deepEqual(rows.map((r) => [r.categorySlug, r.priceFromCents, r.approvedAt]), [[category.slug, null, null], ["pastrim", null, null]]);
          assert.equal(user.proProfile!.priceFrom, null);
          assert.equal(user.signupStep, null, "with ID uploads off there is no ID step");
          // Prices are set per profession in the profile panel.
          ok(await http("/api/account/professions", jar, { categories: [{ slug: category.slug, priceFrom: "40.25" }, { slug: "pastrim", priceFrom: "" }] }));
          ok(await http("/api/account/professions", jar, { categories: [] }), 400);
          ok(await http("/api/account/professions", jar, { categories: [{ slug: "trainer-personal" }] }), 400);
          ok(await http("/api/account/professions", new Map(), { categories: [{ slug: "pastrim" }] }), 401);
        }
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: user.id } })).city,
          "Pejë",
        );
        if (role === "CLIENT") {
          for (let attempt = 0; attempt < 2; attempt++)
            ok(
              await http("/api/favorites", jar, {
                profileId: pro.proProfile!.id,
                saved: true,
              }),
            );
          assert.equal(
            await db.favorite.count({ where: { userId: user.id } }),
            1,
          );
          assert.equal(await db.favorite.count({ where: { userId: a.id } }), 0);
          ok(
            await http("/api/favorites", jar, {
              profileId: pro.proProfile!.id,
              saved: false,
            }),
          );
          assert.equal(
            await db.favorite.count({ where: { userId: user.id } }),
            0,
          );
          ok(await http("/api/availability", jar, { days: [] }), 403);
        } else {
          assert.equal(user.proProfile!.verification, "PENDING");
          assert(
            !ok(await http("/api/catalog")).pros.some(
              (p: { id: string }) => p.id === user.proProfile!.id,
            ),
          );
          assert.equal(
            (
              await db.proProfile.findUniqueOrThrow({
                where: { id: user.proProfile!.id },
              })
            ).priceFrom,
            4025,
          );
          assert.deepEqual((await db.proCategory.findMany({ where: { profileId: user.proProfile!.id }, orderBy: { position: "asc" } }))
            .map((r) => r.priceFromCents), [4025, null]);
          const days = [{ weekday: 1, startMin: 540, endMin: 1020 }];
          ok(await http("/api/availability", jar, { days }));
          assert.equal(
            await db.availability.count({
              where: { profileId: user.proProfile!.id },
            }),
            1,
          );
          ok(
            await http("/api/availability", jar, { days: [...days, ...days] }),
            400,
          );
          assert.equal(
            await db.availability.count({
              where: { profileId: user.proProfile!.id },
            }),
            1,
          );
          ok(
            await http("/api/admin/commands", adminj, {
              action: "PRO_APPROVE",
              id: user.proProfile!.id,
              reason: "Synthetic profile checked for CI publication test",
            }),
          );
          assert(
            ok(await http("/api/catalog")).pros.some(
              (p: { id: string }) => p.id === user.proProfile!.id,
            ),
          );
          // Both professions were approved with the profile; the unpriced one reads "ask for a price".
          const inCleaning = ok(await http("/api/catalog?kategoria=pastrim")).pros.find((p: { id: string }) => p.id === user.proProfile!.id);
          assert.equal(inCleaning?.categorySlug, "pastrim");
          assert.equal(inCleaning?.priceFrom, null);
          assert.equal(ok(await http(`/api/catalog?kategoria=${category.slug}`)).pros.find((p: { id: string }) => p.id === user.proProfile!.id)?.priceFrom, 4025);
          // Adding a profession later: visible in the approved ones at once, the new one only after approval.
          ok(await http("/api/account/professions", jar, { categories: [{ slug: category.slug, priceFrom: "40.25" }, { slug: "pastrim" }, { slug: "kopshtar", priceFrom: "20" }] }));
          assert.equal((await db.proProfile.findUniqueOrThrow({ where: { id: user.proProfile!.id } })).verification, "APPROVED");
          assert(!ok(await http("/api/catalog?kategoria=kopshtar")).pros.some((p: { id: string }) => p.id === user.proProfile!.id));
          assert(ok(await http("/api/catalog?kategoria=pastrim")).pros.some((p: { id: string }) => p.id === user.proProfile!.id));
          ok(await http("/api/admin/commands", adminj, { action: "PRO_APPROVE", id: user.proProfile!.id, reason: "Synthetic new profession checked" }));
          assert(ok(await http("/api/catalog?kategoria=kopshtar")).pros.some((p: { id: string }) => p.id === user.proProfile!.id));
          // Removing a profession takes it out of that category's search; the main one moves up.
          ok(await http("/api/account/professions", jar, { categories: [{ slug: "pastrim" }, { slug: "kopshtar", priceFrom: "20" }] }));
          assert(!ok(await http(`/api/catalog?kategoria=${category.slug}`)).pros.some((p: { id: string }) => p.id === user.proProfile!.id));
          const after = await db.proProfile.findUniqueOrThrow({ where: { id: user.proProfile!.id } });
          assert.deepEqual([after.categorySlug, after.priceFrom], ["pastrim", 2000]);
          ok(
            await http("/api/account", jar, {
              name: `${user.name} Changed`,
              city: "Pejë",
              phone: "",
            }),
          );
          assert.equal(
            (
              await db.proProfile.findUniqueOrThrow({
                where: { id: user.proProfile!.id },
              })
            ).verification,
            "PENDING",
          );
        }
        await db.session.updateMany({
          where: { userId: user.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        ok(await http("/api/account", jar, {}), 401);
      }
    },
  );

  await t.test("owners can revoke other sessions without exposing credentials or affecting another account", async () => {
    const spare: Jar = new Map();
    ok(await http("/api/auth/login", spare, { email: a.email, password }));
    const summary = ok(await http("/api/account/sessions", aj));
    assert(summary.sessions.some((s: { current: boolean }) => s.current));
    assert(summary.sessions.some((s: { current: boolean }) => !s.current));
    for (const session of summary.sessions) assert.deepEqual(Object.keys(session).sort(), ["createdAt", "current", "expiresAt"]);
    ok(await http("/api/account/sessions", new Map()), 401);
    ok(await http("/api/account/sessions", aj, { currentPassword: "wrong" }), 400);
    assert(ok(await http("/api/auth/me", spare)).user);
    ok(await http("/api/account/sessions", aj, { currentPassword: password, userId: b.id }));
    assert.equal(ok(await http("/api/auth/me", spare)).user, null);
    assert(ok(await http("/api/auth/me", aj)).user);
    assert(ok(await http("/api/auth/me", bj)).user);
    const page = await http("/siguria", aj);
    assert.equal(page.status, 200);
    assert(page.text.includes("Hyrjet aktive"));
    assert(!page.text.includes("sha256:"));
    assert(!page.text.includes(a.passwordHash));
    const log = await db.auditLog.findFirstOrThrow({ where: { actorId: a.id, action: "OTHER_SESSIONS_REVOKED" } });
    assert.equal(log.target, a.id);
  });
  await t.test("staff sessions expire within eight hours including legacy longer sessions", async () => {
    const staff = await account("SUPPORT", "ShortSession");
    const jar: Jar = new Map();
    ok(await http("/api/auth/login", jar, { email: staff.email, password }));
    let session = await db.session.findFirstOrThrow({ where: { userId: staff.id } });
    assert(session.expiresAt.getTime() - session.createdAt.getTime() <= 8 * 3600000 + 1000);
    await db.session.update({ where: { id: session.id }, data: { createdAt: new Date(Date.now() - 9 * 3600000), expiresAt: new Date(Date.now() + 86400000) } });
    assert.equal(ok(await http("/api/auth/me", jar)).user, null);
    session = await db.session.findFirstOrThrow({ where: { userId: a.id } });
    assert(session.expiresAt.getTime() - session.createdAt.getTime() > 29 * 86400000);
  });
  await t.test("concurrent recovery issuers leave one valid link and invalidate stale login proofs", async () => {
    const user = await account("CLIENT", "RecoveryRace");
    const proof = await authenticate({ email: user.email, password }, "127.0.0.81");
    await Promise.all([requestAccountToken(user.id, "PASSWORD_RESET"), requestAccountToken(user.id, "PASSWORD_RESET")]);
    const tokens = await db.authToken.findMany({ where: { userId: user.id, purpose: "PASSWORD_RESET" } });
    assert.equal(tokens.length, 2);
    assert.equal(tokens.filter((token) => token.usedAt === null).length, 1);
    const used = tokens.find((token) => token.usedAt)!;
    const fresh = tokens.find((token) => !token.usedAt)!;
    async function tokenText(id: string) {
      const outbox = await db.outbox.findUniqueOrThrow({ where: { key: `account-email:${id}` } });
      return String(JSON.parse(decrypt(outbox.payloadEnc)).text).match(/#token=([a-f0-9]{64})/)![1];
    }
    const next = `new-${randomUUID()}`;
    await assert.rejects(consumeAccountToken({ token: await tokenText(used.id), password: next }, "PASSWORD_RESET"));
    const raw = await tokenText(fresh.id);
    const results = await Promise.allSettled([
      consumeAccountToken({ token: raw, password: next }, "PASSWORD_RESET"),
      consumeAccountToken({ token: raw, password: next }, "PASSWORD_RESET"),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    await assert.rejects(persistSession(user.id, proof.passwordHash));
    assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
    const valid = await authenticate({ email: user.email, password: next }, "127.0.0.82");
    const session = await persistSession(user.id, valid.passwordHash);
    assert.equal(await db.session.count({ where: { userId: user.id, token: hashToken(session.token) } }), 1);
  });

  await t.test("documents require private storage and owner access before signing", async () => {
    const names = ["DOCUMENT_UPLOADS_ENABLED", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    const originalFetch = globalThis.fetch;
    process.env.DOCUMENT_UPLOADS_ENABLED = "true";
    process.env.SUPABASE_URL = "https://synthetic.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-ci-only";
    let publicBucket = true, writes = 0, signs = 0;
    const bucket = "zgjoi-pro-documents";
    globalThis.fetch = async (url, init) => {
      const parsed = new URL(String(url));
      assert.equal(parsed.origin, "https://synthetic.supabase.co");
      if (parsed.pathname === `/storage/v1/bucket/${bucket}`)
        return new Response(JSON.stringify({ id: bucket, public: publicBucket }));
      if (parsed.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`)) {
        signs++;
        assert.deepEqual(JSON.parse(String(init?.body)), { expiresIn: 60 });
        return new Response(JSON.stringify({ signedURL: `${parsed.pathname.replace("/storage/v1", "")}?token=synthetic-only` }));
      }
      assert.equal(init?.method, "POST");
      writes++;
      return new Response(JSON.stringify({ Key: "synthetic" }));
    };
    try {
      const file = new File(["%PDF-1.7\nsynthetic-test-only"], "test.pdf", { type: "application/pdf" });
      await assert.rejects(uploadDocument(pro, file, "CERTIFICATE"), (e: { code?: string }) => e.code === "STORAGE_NOT_PRIVATE");
      assert.equal(writes, 0);
      publicBucket = false;
      const uploaded = await uploadDocument(pro, file, "CERTIFICATE");
      assert.equal(writes, 1);
      const document = await db.proDocument.findUniqueOrThrow({ where: { id: uploaded.id } });
      assert.equal(document.url, "private");
      await assert.rejects(signedDocument(otherPro, uploaded.id));
      await assert.rejects(signedDocument(a, uploaded.id));
      assert.equal(signs, 0);
      const link = new URL(await signedDocument(pro, uploaded.id));
      assert.equal(link.hostname, "synthetic.supabase.co");
      assert.equal(link.searchParams.get("download"), "certificate.pdf");
      await signedDocument(admin, uploaded.id);
      assert.equal(signs, 2);
      publicBucket = true;
      await assert.rejects(signedDocument(pro, uploaded.id));
      assert.equal(signs, 2);
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });
  await t.test(
    "password recovery uses expiring one-use tokens and revokes every session",
    async () => {
      ok(await http("/api/auth/forgot", new Map(), { email: b.email }));
      const token = await db.authToken.findFirstOrThrow({
        where: { userId: b.id, purpose: "PASSWORD_RESET", usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      const outbox = await db.outbox.findUniqueOrThrow({
        where: { key: `account-email:${token.id}` },
      });
      const payload = JSON.parse(decrypt(outbox.payloadEnc));
      assert.equal(payload.expiresAt, token.expiresAt.toISOString());
      const raw = String(payload.text).match(/#token=([a-f0-9]{64})/)?.[1];
      assert(raw);
      const nextPassword = `replacement-${randomUUID()}`;
      ok(
        await http("/api/auth/reset", new Map(), {
          token: raw,
          password: nextPassword,
        }),
      );
      assert.equal(await db.session.count({ where: { userId: b.id } }), 0);
      ok(
        await http("/api/auth/reset", new Map(), {
          token: raw,
          password: nextPassword,
        }),
        400,
      );
      ok(
        await http("/api/auth/login", new Map(), { email: b.email, password }),
        401,
      );
      ok(
        await http("/api/auth/login", bj, {
          email: b.email,
          password: nextPassword,
        }),
      );
    },
  );
  await t.test(
    "consumed recovery emails are discarded without contacting a delivery provider",
    async () => {
      const originalFetch = globalThis.fetch;
      const names = [
        "EMAIL_DELIVERY_ENABLED",
        "RESEND_API_KEY",
        "EMAIL_FROM",
      ] as const;
      const saved = Object.fromEntries(
        names.map((name) => [name, process.env[name]]),
      );
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts++;
        throw new Error("External network forbidden in this test");
      };
      process.env.EMAIL_DELIVERY_ENABLED = "true";
      process.env.RESEND_API_KEY = "synthetic-ci-only";
      process.env.EMAIL_FROM = "test@ci.zgjoi.invalid";
      try {
        await deliverOutbox();
        assert.equal(attempts, 0);
        const used = await db.authToken.findFirstOrThrow({
          where: {
            userId: b.id,
            purpose: "PASSWORD_RESET",
            usedAt: { not: null },
          },
        });
        const mail = await db.outbox.findUniqueOrThrow({
          where: { key: `account-email:${used.id}` },
        });
        assert.equal(mail.state, "FAILED");
        assert.equal(mail.lastError, "EXPIRED_MESSAGE");
        assert.equal(mail.payloadEnc, "");
      } finally {
        globalThis.fetch = originalFetch;
        for (const name of names) {
          if (saved[name] === undefined) delete process.env[name];
          else process.env[name] = saved[name];
        }
      }
    },
  );

  await t.test("targeted account delivery claims only its fresh job and rechecks token, recipient and opt-in", async () => {
    const originalFetch = globalThis.fetch;
    const names = ["EMAIL_DELIVERY_ENABLED", "RESEND_API_KEY", "EMAIL_FROM"] as const;
    const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
    let calls = 0;
    try {
      const user = await account("CLIENT", "ImmediateEmail");
      const recipient = `immediate-${randomUUID()}@example.test`;
      await db.user.update({ where: { id: user.id }, data: { email: recipient } });
      const queued = await requestAccountToken(user.id, "PASSWORD_RESET");
      assert(queued.jobId);
      const sentinel = await db.outbox.create({ data: { key: `unrelated-${randomUUID()}`, kind: "EMAIL", payloadEnc: "unrelated" } });
      const before = await db.outbox.findUniqueOrThrow({ where: { id: queued.jobId } });
      globalThis.fetch = async (url, init) => {
        assert.equal(String(url), "https://api.resend.com/emails");
        assert.equal(new Headers(init?.headers).get("Idempotency-Key"), before.key);
        const payload = JSON.parse(String(init?.body));
        assert.deepEqual(payload.to, [recipient]);
        assert.equal(payload.reply_to, "info@zgjoi.com");
        assert.equal(payload.from, process.env.EMAIL_FROM);
        assert(payload.text.includes("/rivendos-fjalekalimin#token="));
        calls++;
        return new Response(JSON.stringify({ id: "mock-account-receipt" }));
      };
      process.env.EMAIL_DELIVERY_ENABLED = "false";
      process.env.RESEND_API_KEY = "synthetic-ci-only";
      process.env.EMAIL_FROM = "sender@example.test";
      assert.equal((await deliverAccountEmail(queued.jobId)).accepted, false);
      assert.deepEqual(await db.outbox.findUniqueOrThrow({ where: { id: queued.jobId } }), before);
      process.env.EMAIL_DELIVERY_ENABLED = "true";
      const results = await Promise.all([deliverAccountEmail(queued.jobId), deliverAccountEmail(queued.jobId)]);
      assert.equal(results.filter(r => r.accepted).length, 1);
      assert.equal(calls, 1);
      assert.equal((await deliverAccountEmail(queued.jobId)).accepted, false);
      assert.equal((await deliverAccountEmail(sentinel.id)).accepted, false);
      assert.deepEqual(await db.outbox.findUniqueOrThrow({ where: { id: sentinel.id } }), sentinel);
      assert.equal((await db.outbox.findUniqueOrThrow({ where: { id: queued.jobId } })).payloadEnc, "");

      const used = await requestAccountToken(user.id, "EMAIL_VERIFY");
      const suspended = await requestAccountToken(user.id, "EMAIL_VERIFY");
      assert(used.jobId && suspended.jobId);
      await deliverAccountEmail(used.jobId);
      assert.equal((await db.outbox.findUniqueOrThrow({ where: { id: used.jobId } })).lastError, "EXPIRED_MESSAGE");
      await db.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });
      await deliverAccountEmail(suspended.jobId);
      assert.equal((await db.outbox.findUniqueOrThrow({ where: { id: suspended.jobId } })).lastError, "MESSAGE_SUPPRESSED");
      assert.equal(calls, 1);
      await db.outbox.delete({ where: { id: sentinel.id } });
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });

  await t.test("email delivery retries preserve deduplication and recover crashed final attempts", async () => {
    const originalFetch = globalThis.fetch;
    const names = ["EMAIL_DELIVERY_ENABLED", "RESEND_API_KEY", "EMAIL_FROM"] as const;
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    // Finish unrelated test messages, then exercise only synthetic provider responses.
    process.env.EMAIL_DELIVERY_ENABLED = "true";
    process.env.RESEND_API_KEY = "synthetic-ci-only";
    process.env.EMAIL_FROM = "sender@ci.zgjoi.invalid";
    const calls: string[] = [];
    let mode: "failure" | "success" = "failure";
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "https://api.resend.com/emails");
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.to[0], "recipient@example.test");
      assert.equal(payload.reply_to, "info@zgjoi.com");
      calls.push(new Headers(init?.headers).get("Idempotency-Key")!);
      return new Response(JSON.stringify(mode === "failure" ? { error: "temporary" } : { id: "synthetic-receipt" }), { status: mode === "failure" ? 503 : 200 });
    };
    try {
      await deliverOutbox();
      assert.equal(calls.length, 0);
      const key = `test-email-${randomUUID()}`;
      const job = await db.outbox.create({ data: { key, kind: "EMAIL", payloadEnc: encrypt(JSON.stringify({ to: "recipient@example.test", subject: "CI only", text: "Synthetic" })) } });
      await deliverOutbox();
      let after = await db.outbox.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(after.state, "PENDING");
      assert.equal(after.attempts, 1);
      assert(after.payloadEnc.length > 0);
      assert(after.availableAt > new Date());
      await deliverOutbox();
      assert.equal(calls.length, 1);
      await db.outbox.update({ where: { id: job.id }, data: { availableAt: new Date(Date.now() - 1000) } });
      mode = "success";
      const results = await Promise.all([deliverOutbox(), deliverOutbox()]);
      assert.equal(results.reduce((sum, r) => sum + r.delivered, 0), 1);
      assert.deepEqual(calls, [key, key]);
      after = await db.outbox.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(after.state, "SENT");
      assert.equal(after.payloadEnc, "");
      const stuck = await db.outbox.create({ data: { key: `stuck-${randomUUID()}`, kind: "EMAIL", state: "PROCESSING", attempts: 8, lockedAt: new Date(Date.now() - 6 * 60000), payloadEnc: "encrypted-synthetic" } });
      await deliverOutbox();
      const recovered = await db.outbox.findUniqueOrThrow({ where: { id: stuck.id } });
      assert.equal(recovered.state, "FAILED");
      assert.equal(recovered.lastError, "DELIVERY_ATTEMPTS_EXHAUSTED");
      assert.equal(recovered.payloadEnc, "");
      assert.equal(recovered.lockedAt, null);
      assert.equal(calls.length, 2);
      // Outside production, recipients missing from EMAIL_ALLOWLIST are never contacted.
      const stranger = await db.outbox.create({ data: { key: `stranger-${randomUUID()}`, kind: "EMAIL", payloadEnc: encrypt(JSON.stringify({ to: "customer@not-allowlisted.example", subject: "CI only", text: "Synthetic" })) } });
      await deliverOutbox();
      const skipped = await db.outbox.findUniqueOrThrow({ where: { id: stranger.id } });
      assert.equal(skipped.state, "FAILED");
      assert.equal(skipped.lastError, "NOT_ALLOWLISTED");
      assert.equal(skipped.payloadEnc, "");
      assert.equal(calls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });

  await t.test("a Preview administrator can submit one confirmed verification email without maintenance or other sends", async () => {
    const input = { outboxId: "synthetic-job", recipient: "recipient@example.test" };
    ok(await http("/api/admin/email-test", new Map(), input), 401);
    for (const jar of [aj, pj, supportj]) ok(await http("/api/admin/email-test", jar, input), 403);
    ok(await http("/api/admin/email-test", adminj, input, { Origin: "https://outside.example.test" }), 403);
    // The integration HTTP server is not a Vercel Preview; this route stays closed.
    ok(await http("/api/admin/email-test", adminj, input), 404);
    const names = ["VERCEL_ENV", "EMAIL_DELIVERY_ENABLED", "RESEND_API_KEY", "EMAIL_FROM"] as const;
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    const originalFetch = globalThis.fetch;
    let calls = 0;
    try {
      process.env.VERCEL_ENV = "production";
      await assert.rejects(deliverOneVerificationEmail(input.outboxId, input.recipient), (e: { code?: string }) => e.code === "NOT_FOUND");
      process.env.VERCEL_ENV = "preview";
      process.env.EMAIL_DELIVERY_ENABLED = "false";
      await assert.rejects(deliverOneVerificationEmail(input.outboxId, input.recipient), (e: { code?: string }) => e.code === "EMAIL_NOT_READY");
      process.env.EMAIL_DELIVERY_ENABLED = "true";
      process.env.RESEND_API_KEY = "synthetic-ci-only";
      process.env.EMAIL_FROM = "sender@example.test";
      const user = await account("CLIENT", "SingleEmail");
      const recipient = `single-${randomUUID()}@example.test`;
      await db.user.update({ where: { id: user.id }, data: { email: recipient } });
      await requestAccountToken(user.id, "EMAIL_VERIFY");
      const token = await db.authToken.findFirstOrThrow({ where: { userId: user.id, purpose: "EMAIL_VERIFY", usedAt: null } });
      const target = await db.outbox.findUniqueOrThrow({ where: { key: `account-email:${token.id}` } });
      // Sentinels would be changed by the general maintenance worker.
      await persistSession(user.id, user.passwordHash);
      await db.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 2 * 86400000) } });
      await db.authToken.create({ data: { userId: user.id, purpose: "EMAIL_VERIFY", tokenHash: hashToken(randomUUID()), expiresAt: new Date(Date.now() - 8 * 86400000) } });
      await db.rateLimitBucket.create({ data: { key: hashToken(randomUUID()), hits: 1, resetAt: new Date(Date.now() - 2 * 86400000) } });
      await db.outbox.create({ data: { key: `unrelated-${randomUUID()}`, kind: "EMAIL", createdAt: new Date(Date.now() - 2 * 86400000), payloadEnc: encrypt("unrelated synthetic message") } });
      const snapshot = () => Promise.all([
        db.session.findMany({ orderBy: { id: "asc" } }),
        db.authToken.findMany({ orderBy: { id: "asc" } }),
        db.rateLimitBucket.findMany({ orderBy: { key: "asc" } }),
        db.quote.findMany({ orderBy: { id: "asc" } }),
        db.serviceRequest.findMany({ orderBy: { id: "asc" } }),
        db.payment.findMany({ orderBy: { id: "asc" } }),
        db.payout.findMany({ orderBy: { id: "asc" } }),
        db.setting.findMany({ orderBy: { key: "asc" } }),
        db.outbox.findMany({ where: { id: { not: target.id } }, orderBy: { id: "asc" } }),
      ]);
      const before = await snapshot();
      globalThis.fetch = async (url, init) => {
        assert.equal(String(url), "https://api.resend.com/emails");
        const payload = JSON.parse(String(init?.body));
        assert.deepEqual(payload.to, [recipient]);
        assert.equal(payload.reply_to, "info@zgjoi.com");
        assert.equal(new Headers(init?.headers).get("Idempotency-Key"), target.key);
        calls++;
        return new Response(JSON.stringify({ id: "synthetic-single-receipt" }));
      };
      await assert.rejects(deliverOneVerificationEmail(target.id, "other@example.test"), (e: { code?: string }) => e.code === "EMAIL_RECIPIENT");
      assert.equal(calls, 0);
      assert.deepEqual(await db.outbox.findUnique({ where: { id: target.id } }), target);
      const concurrent = await Promise.allSettled([
        deliverOneVerificationEmail(target.id, recipient),
        deliverOneVerificationEmail(target.id, recipient),
      ]);
      assert.equal(concurrent.filter((r) => r.status === "fulfilled" && r.value.accepted).length, 1);
      assert.equal(concurrent.filter((r) => r.status === "rejected").length, 1);
      await assert.rejects(deliverOneVerificationEmail(target.id, recipient));
      assert.equal(calls, 1);
      const sent = await db.outbox.findUniqueOrThrow({ where: { id: target.id } });
      assert.equal(sent.state, "SENT");
      assert.equal(sent.attempts, 1);
      assert.equal(sent.payloadEnc, "");
      assert.deepEqual(await snapshot(), before);
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });

  await t.test("job email is opt-in, suppresses queued mail after opt-out and retries the same encrypted notification safely", async () => {
    ok(await http("/api/account/notifications"), 401);
    assert.deepEqual(ok(await http("/api/account/notifications", aj)), { jobEmail: false });
    ok(await http("/api/account/notifications", aj, { jobEmail: true, userId: b.id }));
    assert.deepEqual(ok(await http("/api/account/notifications", bj)), { jobEmail: false });
    ok(await http("/api/account/notifications", aj, { jobEmail: false }));
    const names = ["EMAIL_DELIVERY_ENABLED", "RESEND_API_KEY", "EMAIL_FROM", "JOB_EMAILS_ENABLED"] as const;
    const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
    const originalFetch = globalThis.fetch;
    const originalNow = Date.now;
    const frozen = Date.now();
    Date.now = () => frozen;
    let calls = 0;
    const keys: string[] = [], bodies: string[] = [];
    try {
      process.env.EMAIL_DELIVERY_ENABLED = "true";
      process.env.RESEND_API_KEY = "synthetic-ci-only";
      process.env.EMAIL_FROM = "Zgjoi <sender@example.test>";
      process.env.JOB_EMAILS_ENABLED = "true";
      const user = await account("CLIENT", "JobEmail");
      const address = `jobs-${randomUUID()}@example.test`;
      await db.user.update({ where: { id: user.id }, data: { email: address } });
      const notification = (kind = "OFFER", href = "/llogaria/kerkesat/test-job") => db.$transaction(tx => notify(tx, user.id, kind, "Keni një njoftim të ri", href));
      await notification();
      assert.equal(await db.outbox.count({ where: { key: { startsWith: "job-email:" } } }), 0);
      await saveNotificationPreferences(user.id, { jobEmail: true });
      await assert.rejects(notification("OFFER", "https://attacker.invalid"));
      assert.equal(await db.outbox.count({ where: { key: { startsWith: "job-email:" } } }), 0);
      await Promise.all([notification("MESSAGE"), notification("MESSAGE")]);
      const queued = await db.outbox.findMany({ where: { key: { startsWith: "job-email:" } } });
      assert.equal(queued.length, 1);
      assert(!queued[0].payloadEnc.includes("example.test"));
      await saveNotificationPreferences(user.id, { jobEmail: false });
      globalThis.fetch = async (url, init) => {
        assert.equal(String(url), "https://api.resend.com/emails");
        const payload = JSON.parse(String(init?.body));
        assert.deepEqual(payload.to, [address]);
        assert.equal(payload.reply_to, "info@zgjoi.com");
        calls++;
        keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
        bodies.push(String(init?.body));
        if (calls === 1) throw new Error("synthetic network interruption");
        return new Response(JSON.stringify({ id: "synthetic-job-receipt" }));
      };
      await deliverOutbox();
      assert.equal(calls, 0);
      const suppressed = await db.outbox.findUniqueOrThrow({ where: { id: queued[0].id } });
      assert.equal(suppressed.state, "FAILED");
      assert.equal(suppressed.lastError, "MESSAGE_SUPPRESSED");
      assert.equal(suppressed.payloadEnc, "");
      await saveNotificationPreferences(user.id, { jobEmail: true });
      const fresh = await notification();
      await deliverOutbox();
      const retry = await db.outbox.findUniqueOrThrow({ where: { key: `job-email:${fresh.id}` } });
      assert.equal(retry.state, "PENDING");
      assert.equal(retry.attempts, 1);
      await db.outbox.update({ where: { id: retry.id }, data: { availableAt: new Date(frozen - 1000) } });
      await Promise.all([deliverOutbox(), deliverOutbox()]);
      assert.equal(calls, 2);
      assert.equal(keys[0], keys[1]);
      assert.equal(bodies[0], bodies[1]);
      assert(!bodies[0].includes("token="));
      const sent = await db.outbox.findUniqueOrThrow({ where: { id: retry.id } });
      assert.equal(sent.state, "SENT");
      assert.equal(sent.payloadEnc, "");
      assert.equal(sent.attempts, 2);
      assert.deepEqual((await db.setting.findUniqueOrThrow({ where: { key: notificationPreferenceKey(user.id) } })).value, { jobEmail: true });
    } finally {
      Date.now = originalNow;
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
      }
    }
  });
  await t.test("cohort metrics count requests beyond page limits, ignore repeated offers and retain historical funded milestones after refunds", async () => {
    const since = new Date("2020-01-01T00:00:00Z"), until = new Date("2020-02-01T00:00:00Z");
    const client = await account("CLIENT", "MetricsClient"), professional = await account("PRO", "MetricsPro");
    const ids = Array.from({ length: 63 }, () => randomUUID());
    await db.serviceRequest.createMany({ data: ids.map((id, i) => ({ id, clientId: client.id, selectedProfileId: professional.proProfile!.id,
      categorySlug: category.slug, city: "Prishtinë", title: "Synthetic historical cohort", timing: "Historical fixture", answers: {},
      createdAt: i === 61 ? new Date(since.getTime() - 1) : i === 62 ? until : since })) });
    const quoteIds = Array.from({ length: 40 }, () => randomUUID());
    await db.quote.createMany({ data: quoteIds.flatMap((id, i) => [
      { id, requestId: ids[i], profileId: professional.proProfile!.id, amount: 10000, lines: [], message: "Synthetic official offer", revision: 1, duration: "60 min", scheduledAt: since, state: i < 20 ? "ACCEPTED" as const : "SENT" as const },
      { id: randomUUID(), requestId: ids[i], profileId: professional.proProfile!.id, amount: 10000, lines: [], message: "Synthetic earlier offer revision", revision: 2, duration: "60 min", scheduledAt: since, state: "WITHDRAWN" as const },
    ]) });
    for (let i = 0; i < 20; i++) await db.serviceRequest.update({ where: { id: ids[i] }, data: {
      acceptedQuoteId: quoteIds[i], acceptedProfileId: professional.proProfile!.id, state: i < 8 ? "COMPLETED" : "BOOKED", completedAt: i < 8 ? since : null,
    } });
    await db.payment.createMany({ data: ids.slice(0, 12).map((requestId, i) => ({ requestId, amount: 10000, commissionBps: 1500,
      commissionAmount: 1500, proAmount: 8500, currency: "EUR", strategy: "PLATFORM_CHARGE", provider: "disabled", heldAt: since,
      state: i >= 8 ? "REFUNDED" : "HELD", refundedAt: i >= 8 ? new Date(since.getTime() + 86400000) : null })) });
    const result = await bookingFunnel(since, until);
    assert.deepEqual(result, { since: since.toISOString(), until: until.toISOString(), inquiries: 61, offered: 40, accepted: 20, funded: 12, completed: 8, coherent: true });
    assert.equal((await bookingFunnel(new Date("2018-01-01"), new Date("2018-02-01"))).inquiries, 0);
    await assert.rejects(bookingFunnel(until, since), { code: "METRICS_RANGE" });
    const page = await http("/admin", adminj);
    assert.equal(page.status, 200);
    assert(page.text.includes("Ecuria e kërkesave të 30 ditëve të fundit"));
    redirects(await http("/admin", aj), "/llogaria");
  });
  await t.test("operational health is staff-restricted, detects stalled work and discloses no message payloads", async () => {
    ok(await http("/api/admin/health", new Map()), 401);
    for (const jar of [aj, pj, supportj]) ok(await http("/api/admin/health", jar), 403);
    await db.setting.upsert({ where: { key: "maintenanceHeartbeat" }, create: { key: "maintenanceHeartbeat", value: { ranAt: new Date(Date.now() - 3600000).toISOString() } }, update: { value: { ranAt: new Date(Date.now() - 3600000).toISOString() } } });
    const health = ok(await http("/api/admin/health", adminj));
    assert.equal(health.maintenance, "LATE");
    assert.equal(health.emailConfigured, false);
    assert.deepEqual(Object.keys(health.emailSetup).sort(), ["apiKeyPresent", "deliveryEnabled", "encryptionKeyValid", "linkOriginValid", "senderPresent"]);
    assert(Object.values(health.emailSetup).every((value) => typeof value === "boolean"));
    assert.equal(health.emailConfigured, Object.values(health.emailSetup).every(Boolean));
    assert.equal(health.documentsConfigured, false);
    assert(health.mail.failed > 0);
    assert(!JSON.stringify(health).includes("payloadEnc"));
    assert(!JSON.stringify(health).includes("synthetic-ci-only"));
    const page = await http("/admin/sistemi", adminj);
    assert.equal(page.status, 200);
    assert(page.text.includes("Kontrolli periodik është vonuar"));
    assert(!page.text.includes("recipient@example.test"));
    await db.setting.update({ where: { key: "maintenanceHeartbeat" }, data: { value: { ranAt: new Date().toISOString() } } });
    assert.equal(ok(await http("/api/admin/health", adminj)).maintenance, "RECENT");
  });
  await t.test(
    "suspension revokes sessions, self-demotion is blocked, and the cron requires a secret",
    async () => {
      ok(
        await http("/api/admin/commands", adminj, {
          action: "USER_SUSPEND",
          id: b.id,
        }),
      );
      ok(await http("/api/requests", bj, {}), 401);
      await assert.rejects(
        adminCommand(admin, { action: "USER_SUSPEND", id: admin.id }),
      );
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: admin.id } }))
          .suspendedAt,
        null,
      );
      ok(await http("/api/cron/escrow"), 403);
      const cron = ok(
        await http("/api/cron/escrow", new Map(), undefined, {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        }),
      );
      assert.equal(cron.delivery.enabled, false);
      assert.equal(
        (await db.payment.findUniqueOrThrow({ where: { requestId } })).state,
        "DISPUTED",
      );
    },
  );
  await t.test(
    "public HTML and private dashboards render real records without demo journeys",
    async () => {
      for (const [path, jar] of [
        ["/", new Map()],
        ["/kerko", new Map()],
        [`/profesionisti/${pro.proProfile!.slug}`, new Map()],
        ["/llogaria", aj],
        [`/llogaria/kerkesat/${requestId}`, aj],
        ["/pro/paneli", pj],
        [`/pro/kerkesat/${requestId}`, pj],
        ["/admin", adminj],
        ["/admin/perdoruesit", adminj],
        ["/admin/pagesat", adminj],
        ["/admin/mbeshtetja", supportj],
      ] as [string, Jar][]) {
        const result = await http(path, jar);
        assert.equal(result.status, 200, path);
        assert(!result.text.includes("Kjo faqe është demonstrim"), path);
      }
      assert.match(
        (await http("/llogaria/kerkesat", aj)).text,
        /Riparim ndriçimi/,
      );
      const signup = await http("/regjistrohu-profesionist");
      assert.equal(signup.status, 200);
      assert.match(signup.text, /Elektricist/);
    },
  );
  await t.test(
    "all application tables retain RLS and no browser-role grants; financial constraints reject invalid rows",
    async () => {
      const checks = await db.$queryRaw<
        { tables: bigint; rls: bigint; exposed: bigint }[]
      >`SELECT count(*) AS tables, count(*) FILTER (WHERE c.relrowsecurity) AS rls, count(*) FILTER (WHERE has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')) AS exposed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`;
      // 28 marketplace tables + Booking, BookingChange, Estimate (Book now) + BookingArrival, GeocodeCache (Arrita) + RecurringSeries
      // + IdVerification, IdDocumentImage (ID check) + ProCategory (several professions per pro).
      assert.equal(Number(checks[0].tables), 38);
      assert.equal(Number(checks[0].rls), 38);
      assert.equal(Number(checks[0].exposed), 0);
      await assert.rejects(
        db.payment.update({ where: { requestId }, data: { amount: 100 } }),
      );
      await assert.rejects(
        db.review.updateMany({ where: { requestId }, data: { rating: 6 } }),
      );
    },
  );
});

test("approved catalogue and immutable tiered commissions", async (t) => {
  const { activeCategories, searchPros } = await import("../lib/server/catalog");
  const { requireActiveCategory } = await import("../lib/server/service-catalog");
  const { serviceCategories } = await import("../lib/service-categories");
  const { commissionMonth, COMMISSION_POLICY_VERSION } = await import("../lib/commission-policy");
  const { eliteMonth, bookingCommission, refreshCommissionMonth } = await import("../lib/server/commissions");
  const { createInquiry, createOffer, acceptOffer } = await import("../lib/server/marketplace");
  const { nextRecurringDate, readRecurrence } = await import("../lib/recurring-bookings");
  const { serializable } = await import("../lib/server/transaction");
  const passwordHash = await hashPassword(`synthetic-${randomUUID()}`);
  async function account(role: "CLIENT" | "PRO", categorySlug = "pastrim") {
    return db.user.create({ data: { name: "Synthetic commission account", email: `${randomUUID()}@ci.zgjoi.invalid`,
      passwordHash, role, city: "Prishtinë", emailVerified: new Date(),
      ...(role === "PRO" ? { proProfile: { create: { slug: randomUUID(), categorySlug,
        about: "Synthetic professional for commission policy tests only.", priceFrom: 2500, verification: "APPROVED",
        // Like the backfill: a slug outside the catalogue gets no profession row.
        categories: { create: serviceCategories.filter(c => c.slug === categorySlug || (c.aliases as readonly string[]).includes(categorySlug))
          .map(c => ({ categorySlug: c.slug, approvedAt: new Date() })) } } } } : {}) },
      include: { proProfile: true } });
  }
  const customer = await account("CLIENT"), stranger = await account("CLIENT"), pro = await account("PRO", "hidraulik");
  const cj: Jar = new Map([["zgjoi_session", (await persistSession(customer.id, passwordHash)).token]]);
  const sj: Jar = new Map([["zgjoi_session", (await persistSession(stranger.id, passwordHash)).token]]);
  const pj: Jar = new Map([["zgjoi_session", (await persistSession(pro.id, passwordHash)).token]]);
  async function completed(professional = pro, completedAt = new Date(), amount = 10000) {
    const scheduledAt = new Date(Math.floor((completedAt.getTime() - 86400000) / 60000) * 60000);
    const request = await db.serviceRequest.create({ data: { clientId: customer.id,
      selectedProfileId: professional.proProfile!.id, acceptedProfileId: professional.proProfile!.id,
      categorySlug: professional.proProfile!.categorySlug, title: "Punë e përsëritur prove", detail: "Detaje private për kontrollin e komisionit.",
      city: "Prishtinë", timing: "Orar prove", answers: {}, state: "COMPLETED", completedAt,
      scheduledAt, conversation: { create: {} } } });
    const quote = await db.quote.create({ data: { requestId: request.id, profileId: professional.proProfile!.id,
      amount, lines: [], message: "Përshkrim i plotë për ofertën e testimit.", duration: "60 min", scheduledAt,
      expiresAt: new Date(scheduledAt.getTime() - 3600000), state: "ACCEPTED", acceptedAt: new Date(scheduledAt.getTime() - 7200000) } });
    await db.serviceRequest.update({ where: { id: request.id }, data: { acceptedQuoteId: quote.id } });
    const commissionAmount = Math.round(amount * 0.15);
    const payment = await db.payment.create({ data: { requestId: request.id, amount, commissionBps: 1500,
      commissionAmount, proAmount: amount - commissionAmount, state: "HELD", heldAt: completedAt,
      strategy: "PLATFORM_CHARGE", provider: "stripe_test" } });
    return { request, quote, payment };
  }

  await t.test("only approved services can be listed, selected or booked, including legacy aliases", async () => {
    await db.category.create({ data: { slug: "marketing", name: "Marketing", icon: "megaphone", active: true } });
    const categories = await activeCategories();
    assert.deepEqual(categories.map(c => c.slug), serviceCategories.map(c => c.slug));
    assert(!categories.some(c => c.name.includes("test")));
    assert.equal((await requireActiveCategory("hidraulik")).slug, "mjeshter-i-ujit");
    await assert.rejects(requireActiveCategory("marketing"));
    const removed = await account("PRO", "marketing");
    const result = await searchPros({ kategoria: "hidraulik" });
    assert(result.pros.some(p => p.id === pro.proProfile!.id && p.categorySlug === "mjeshter-i-ujit"));
    assert.equal((await searchPros({ kategoria: "marketing" })).count, 0);
    await assert.rejects(createInquiry(customer, { profileId: removed.proProfile!.id,
      title: "Punë e përjashtuar", detail: "Kërkesë prove për kategori jashtë katalogut.", city: "Prishtinë", timing: "Sipas marrëveshjes", clientKey: randomUUID() }));
    const row = await db.category.create({ data: { slug: "mjeshter-i-ujit", name: "Private overridden name", icon: "droplets", active: false } });
    await assert.rejects(requireActiveCategory("hidraulik"));
    assert.equal((await searchPros({ kategoria: "hidraulik" })).count, 0);
    await db.category.update({ where: { id: row.id }, data: { active: true } });
    assert.equal((await activeCategories()).find(c => c.slug === row.slug)?.name, "Mjeshtër i Ujit");
  });

  await t.test("recurring visits enforce ownership, paid completion, consent, deduplication and a 5% snapshot", async () => {
    const f = await completed();
    const path = `/api/requests/${f.request.id}/recurrence`;
    ok(await http(path, sj, { cadence: "WEEKLY" }), 404);
    ok(await http(path, pj, { cadence: "WEEKLY" }), 403);
    await db.payment.update({ where: { id: f.payment.id }, data: { state: "PENDING" } });
    ok(await http(path, cj, { cadence: "WEEKLY" }), 409);
    await db.payment.update({ where: { id: f.payment.id }, data: { state: "HELD" } });
    const replies = await Promise.all([http(path, cj, { cadence: "WEEKLY" }), http(path, cj, { cadence: "WEEKLY" })]);
    replies.forEach(r => ok(r));
    assert.equal(replies[0].data.id, replies[1].data.id);
    const nextId = replies[0].data.id as string;
    ok(await http(path, cj, { cadence: "MONTHLY" }), 409);
    const next = await db.serviceRequest.findUniqueOrThrow({ where: { id: nextId } });
    const recurrence = readRecurrence(next.answers)!;
    assert.equal(recurrence.parentRequestId, f.request.id);
    assert.equal(recurrence.scheduledAt, nextRecurringDate(f.quote.scheduledAt!, "WEEKLY").toISOString());
    assert.equal(await db.payment.count({ where: { requestId: next.id } }), 0);
    const offer = { requestId: next.id, clientKey: randomUUID(), expectedVersion: 0, amount: "60.00",
      description: "Shërbim i përsëritur me kushtet e shënuara.", timing: "Orari i vizitës pasuese", duration: "60",
      scheduledAt: recurrence.scheduledAt, expiresAt: new Date(Date.now() + 3600000).toISOString() };
    ok(await http("/api/offers", pj, { ...offer, scheduledAt: new Date(Date.parse(recurrence.scheduledAt) + 3600000).toISOString() }), 409);
    const sent = ok(await http("/api/offers", pj, offer));
    const page = await http(`/llogaria/kerkesat/${next.id}`, cj);
    assert(page.text.includes("Vizitë e përsëritur"));
    ok(await http("/api/offers/accept", cj, { quoteId: sent.quoteId, expectedVersion: 1, commissionBps: 0 }));
    let payment = await db.payment.findUniqueOrThrow({ where: { requestId: next.id } });
    assert.equal(payment.commissionBps, 500);
    assert.equal(payment.commissionAmount, 300);
    assert.equal(payment.proAmount, 5700);
    assert.equal(payment.state, "PENDING");
    await db.setting.upsert({ where: { key: "commissionBps" }, create: { key: "commissionBps", value: 4900 }, update: { value: 4900 } });
    ok(await http("/api/offers/accept", cj, { quoteId: sent.quoteId, expectedVersion: 1 }));
    payment = await db.payment.findUniqueOrThrow({ where: { requestId: next.id } });
    assert.equal(payment.commissionBps, 500);
    const audit = await db.auditLog.findFirstOrThrow({ where: { target: next.id, action: "OFFER_ACCEPTED" } });
    assert(JSON.stringify(audit.meta).includes('"tier":"recurring"'));
    assert(JSON.stringify(audit.meta).includes(COMMISSION_POLICY_VERSION));
    const ordinary = await createInquiry(customer, { profileId: pro.proProfile!.id, title: "Punë standarde e re",
      detail: "Kërkesë prove për një ofertë të veçantë.", city: "Prishtinë", timing: "Sipas marrëveshjes", clientKey: randomUUID(),
      recurrence: { parentRequestId: f.request.id }, commissionBps: 500 });
    const ordinaryRequest = await db.serviceRequest.findUniqueOrThrow({ where: { id: ordinary.id } });
    assert.equal(readRecurrence(ordinaryRequest.answers), null);
    assert.equal((await bookingCommission(db, ordinaryRequest, new Date())).bps, 1500);
    await db.setting.update({ where: { key: "commissionBps" }, data: { value: 1500 } });
  });

  await t.test("eligibility is rechecked after a parent refund and forged links cannot gain a discount", async () => {
    const f = await completed();
    // Different time from the previous fixture avoids a calendar collision.
    await db.quote.update({ where: { id: f.quote.id }, data: { scheduledAt: new Date(f.quote.scheduledAt!.getTime() + 7200000) } });
    const next = ok(await http(`/api/requests/${f.request.id}/recurrence`, cj, { cadence: "FORTNIGHTLY" }));
    const request = await db.serviceRequest.findUniqueOrThrow({ where: { id: next.id } });
    const scheduledAt = new Date(readRecurrence(request.answers)!.scheduledAt);
    assert.equal((await bookingCommission(db, request, scheduledAt)).bps, 500);
    await db.payment.update({ where: { id: f.payment.id }, data: { state: "REFUNDED", refundedAt: new Date() } });
    await assert.rejects(bookingCommission(db, request, scheduledAt));
    await assert.rejects(bookingCommission(db, { ...request, creationKey: null }, scheduledAt));
    const page = await http(`/pro/kerkesat/${request.id}`, pj);
    assert.equal(page.status, 200);
    assert(page.text.includes("Kushtet e rezervimit të përsëritur kanë ndryshuar"));
    assert(!page.text.includes("Dërgo ofertën"));
  });

  await t.test("Elite closes the previous full month once, excludes unpaid/refunded/test leakage, and applies 10%", async () => {
    const oldMode = process.env.PAYMENTS_MODE;
    process.env.PAYMENTS_MODE = "stripe_test";
    try {
      const now = new Date(), period = commissionMonth(now);
      const at = new Date(period.from.getTime() + 86400000);
      const professionals = [];
      for (let i = 0; i < 21; i++) {
        const person = await account("PRO");
        professionals.push(person);
        await completed(person, at, 10000 + i * 100);
      }
      const unpaidPro = await account("PRO"), refundPro = await account("PRO"), suspendedPro = await account("PRO");
      const unpaid = await completed(unpaidPro, at, 900000);
      await db.payment.update({ where: { id: unpaid.payment.id }, data: { state: "PENDING", heldAt: null } });
      const refund = await completed(refundPro, at, 900000);
      await db.payment.update({ where: { id: refund.payment.id }, data: { state: "REFUNDED", refundedAt: now } });
      await completed(suspendedPro, at, 900000);
      await db.user.update({ where: { id: suspendedPro.id }, data: { suspendedAt: now } });
      const snapshots = await Promise.all([serializable(tx => eliteMonth(tx, now, true)), serializable(tx => eliteMonth(tx, now, true))]);
      assert.deepEqual(snapshots[0], snapshots[1]);
      const ids = snapshots[0].winners.filter(w => w.categorySlug === "pastrim").map(w => w.profileId).sort();
      assert.deepEqual(ids, [professionals[20].proProfile!.id, professionals[19].proProfile!.id].sort());
      await completed(professionals[0], at, 990000);
      assert.deepEqual((await eliteMonth(db, now, false)).winners, snapshots[0].winners);
      const professional = professionals[20];
      const inquiry = await createInquiry(customer, { profileId: professional.proProfile!.id, title: "Punë me komision Elite",
        detail: "Kërkesë e veçantë për komisionin e kategorisë.", city: "Prishtinë", timing: "Sipas marrëveshjes", clientKey: randomUUID() });
      const sent = await createOffer(professional, { requestId: inquiry.id, expectedVersion: 0, clientKey: randomUUID(), amount: "60.00",
        description: "Oferta e plotë për punën e testimit Elite.", timing: "Orar i dakorduar", duration: "60",
        expiresAt: new Date(Date.now() + 3600000).toISOString(), scheduledAt: new Date(Date.now() + 5 * 86400000).toISOString() });
      await acceptOffer(customer, { quoteId: sent.quoteId, expectedVersion: 1 });
      const payment = await db.payment.findUniqueOrThrow({ where: { requestId: inquiry.id } });
      assert.equal(payment.commissionBps, 1000);
      assert.equal(payment.commissionAmount, 600);
      assert.equal(payment.proAmount, 5400);
      const snapshotKey = `commissionElite:${COMMISSION_POLICY_VERSION}:test:${period.month}`;
      assert.equal(await db.auditLog.count({ where: { action: "COMMISSION_MONTH_CLOSED", target: snapshotKey } }), 1);
      process.env.PAYMENTS_MODE = "disabled";
      assert.equal((await eliteMonth(db, now, false)).winners.length, 0);
      const original = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
      await refreshCommissionMonth(now);
      assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: payment.id } }), original);
    } finally {
      if (oldMode === undefined) delete process.env.PAYMENTS_MODE;
      else process.env.PAYMENTS_MODE = oldMode;
    }
  });
});

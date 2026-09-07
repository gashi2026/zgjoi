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
import { hashToken } from "../lib/server/tokens";
import { deliverOutbox } from "../lib/server/notifications";
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
      slug: "test-elektricist",
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
        await http(`/api/requests/${newRequest.id}`, aj, { action: "CANCEL" }),
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
                categorySlug: category.slug,
                about: "Profesionist i ri për provën e regjistrimit të sigurt.",
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
            ...(role === "PRO" ? { priceFrom: "40.25" } : {}),
          }),
        );
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
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
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
      assert.match(signup.text, /Elektricist test/);
    },
  );
  await t.test(
    "all application tables retain RLS and no browser-role grants; financial constraints reject invalid rows",
    async () => {
      const checks = await db.$queryRaw<
        { tables: bigint; rls: bigint; exposed: bigint }[]
      >`SELECT count(*) AS tables, count(*) FILTER (WHERE c.relrowsecurity) AS rls, count(*) FILTER (WHERE has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')) AS exposed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`;
      assert.equal(Number(checks[0].tables), 28);
      assert.equal(Number(checks[0].rls), 28);
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

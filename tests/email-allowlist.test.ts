import test from "node:test";
import assert from "node:assert/strict";
import { emailRecipientAllowed, parseEmailAllowlist, maskEmail } from "../lib/email-allowlist";

test("production is never restricted by the allowlist", () => {
  assert.equal(emailRecipientAllowed("anyone@example.com", { VERCEL_ENV: "production" }), true);
});

test("outside production an empty allowlist sends nothing", () => {
  for (const VERCEL_ENV of ["preview", "development", undefined])
    assert.equal(emailRecipientAllowed("owner@zgjoi.com", { VERCEL_ENV }), false);
  assert.equal(emailRecipientAllowed("owner@zgjoi.com", { VERCEL_ENV: "preview", EMAIL_ALLOWLIST: " , " }), false);
});

test("allowlist matches exact addresses and domains case-insensitively", () => {
  const env = { VERCEL_ENV: "preview", EMAIL_ALLOWLIST: "Owner@Example.com, @zgjoi.com;team.test" };
  assert.deepEqual(parseEmailAllowlist(env.EMAIL_ALLOWLIST), ["owner@example.com", "zgjoi.com", "team.test"]);
  assert.equal(emailRecipientAllowed("owner@example.com", env), true);
  assert.equal(emailRecipientAllowed("OWNER@EXAMPLE.COM", env), true);
  assert.equal(emailRecipientAllowed("other@example.com", env), false);
  assert.equal(emailRecipientAllowed("info@zgjoi.com", env), true);
  assert.equal(emailRecipientAllowed("a@mail.zgjoi.com", env), true);
  assert.equal(emailRecipientAllowed("a@notzgjoi.com", env), false);
  assert.equal(emailRecipientAllowed("a@team.test", env), true);
  assert.equal(emailRecipientAllowed("not-an-address", env), false);
});

test("masked addresses never reveal the mailbox", () => {
  assert.equal(maskEmail("owner@example.com"), "o***@example.com");
});

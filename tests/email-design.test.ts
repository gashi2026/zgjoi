import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountNoticeEmail, changeEmailEmail, confirmSignupEmail, magicLinkEmail, passwordChangedEmail,
  renderEmail, resetPasswordEmail, welcomeEmail, escapeHtml,
} from "../lib/email/design";

const link = "https://zgjoi.com/verifiko-emailin#token=abc123";

test("every template renders the shared Zgjoi layout in Albanian", () => {
  for (const content of [confirmSignupEmail(link), resetPasswordEmail(link), magicLinkEmail(link), changeEmailEmail(link),
    passwordChangedEmail(), welcomeEmail("https://zgjoi.com/"), accountNoticeEmail({ title: "Oferta e re", url: "https://zgjoi.com/llogaria/paneli" })]) {
    const email = renderEmail(content);
    assert.match(email.subject, / \| Zgjoi$/);
    assert.match(email.html, /<html lang="sq">/);
    assert.match(email.html, />Zgjoi<\/div>/);
    assert.match(email.html, /Plus Jakarta Sans',Arial,Helvetica,sans-serif/);
    assert.match(email.html, /max-width:560px/);
    assert.match(email.html, /mailto:info@zgjoi\.com/);
    assert.match(email.html, /mos iu përgjigjni/);
    assert.doesNotMatch(email.html, /<script/i);
    assert.ok(email.text.includes(content.title));
  }
});

test("auth links are kept exactly, including the token fragment", () => {
  const email = renderEmail(confirmSignupEmail(link));
  assert.equal(email.subject, "Konfirmo emailin tënd | Zgjoi");
  assert.equal(email.html.split(`href="${link}"`).length - 1, 2);
  assert.ok(email.text.includes(link));
  assert.equal(renderEmail(resetPasswordEmail(link)).subject, "Rivendos fjalëkalimin | Zgjoi");
});

test("unsafe links and markup are refused or escaped", () => {
  assert.throws(() => renderEmail(confirmSignupEmail("javascript:alert(1)")));
  assert.throws(() => renderEmail(confirmSignupEmail("http://evil.example/x")));
  const notice = renderEmail(accountNoticeEmail({ title: "<b>x</b>", url: "https://zgjoi.com/llogaria/paneli" }));
  assert.ok(notice.html.includes(escapeHtml("<b>x</b>")));
  assert.ok(!notice.html.includes("<b>x</b>"));
});

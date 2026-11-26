import test from "node:test";
import assert from "node:assert/strict";
import { findContactDetails, containsContactDetails } from "../lib/contact-filter";

const blocked: [string, string][] = [
  ["044123456", "PHONE"],
  ["Më thirr në +383 44 123 456", "PHONE"],
  ["044-123-456", "PHONE"],
  ["0 4 4 1 2 3 4 5 6", "PHONE"],
  ["044 12 34", "PHONE"],
  ["tel044123456", "PHONE"],
  ["(044) 123.456", "PHONE"],
  ["zero katër katër një dy tre katër pesë gjashtë", "PHONE"],
  ["zero kater kater 123 456", "PHONE"],
  ["call zero four four one two three four five six", "PHONE"],
  ["qa@example.com", "EMAIL"],
  ["qa at example dot com", "EMAIL"],
  ["qa [at] example [dot] com", "EMAIL"],
  ["qa(at)example(dot)com", "EMAIL"],
  ["qa @ example . com", "EMAIL"],
  ["shkruaj në gmail tim", "EMAIL"],
  ["https://example.com/profili", "LINK"],
  ["www.example.com", "LINK"],
  ["shiko faqen example.com", "LINK"],
  ["shiko www . example . com", "LINK"],
  ["example dot com", "LINK"],
  ["shkruaj në wa.me/38344123", "MESSENGER"],
  ["instagram @qa_test_profile", "MESSENGER"],
  ["Më gjej në Instagram", "MESSENGER"],
  ["WhatsApp", "MESSENGER"],
  ["shkruaj në whats app", "MESSENGER"],
  ["Viber më mirë", "MESSENGER"],
  ["telegram: qa_test", "MESSENGER"],
  ["ig: qa.test", "MESSENGER"],
  ["më gjej @qa_test_profile", "HANDLE"],
  ["Ｗｈａｔｓａｐｐ", "MESSENGER"],
];

const allowed = [
  "27.11.2026 ne ora 10",
  "Mund të vij më 27.11.2026 nga ora 10:00 deri 12:30",
  "Data 2026-11-27, ora 16:45",
  "Oferta është 95.50 € për 240 min",
  "Çmimi 1.250,00 € me materiale",
  "Kostoja 1.250.000 EUR për ndërtim",
  "ora 10.30 jam aty",
  "Banesa ka 3 dhoma, 2 banjo dhe 85 m2",
  "Pastrim i plotë për 120 m2 në katin e 4",
  "Kam një pyetje për instalimin e prizave",
  "Po, dy ose tre orë mjaftojnë",
  "I'll be there at noon. Then we can start.",
  "Takohemi te hyrja e dytë, rruga Agim Ramadani 15",
  "Faleminderit! Shihemi nesër.",
  "Punë nga 08:00-16:00, e hënë",
  "Viti 2026, muaji 11",
];

test("contact filter blocks phone numbers, emails, links, messengers and handles", () => {
  const misses = blocked.filter(([text, kind]) => findContactDetails(text) !== kind)
    .map(([text, kind]) => `${text} → ${findContactDetails(text)} (expected ${kind})`);
  assert.deepEqual(misses, []);
});

test("contact filter allows dates, times, prices and ordinary numbers", () => {
  const falsePositives = allowed.filter((text) => findContactDetails(text) !== null)
    .map((text) => `${text} → ${findContactDetails(text)}`);
  assert.deepEqual(falsePositives, []);
});

test("contact filter is a boolean helper too", () => {
  assert.equal(containsContactDetails("044 123 456"), true);
  assert.equal(containsContactDetails("Mirëdita"), false);
});

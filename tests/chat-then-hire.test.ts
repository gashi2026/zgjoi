import test from "node:test";
import assert from "node:assert/strict";
import { chatTitle, inquiryInput, offerInput, DEFAULT_CHAT_TIMING } from "../lib/marketplace-validation";
import { jobStatus, mergeTimeline, timelineEventLabel } from "../lib/chat-timeline";
import { stateLabel } from "../lib/format";

const key = "6f1c1f9e-3c1a-4c55-9d8a-2a8f0b4c2d11";

test("a chat starts from the job description alone", () => {
  const parsed = inquiryInput.parse({ profileId: "pro_1", detail: "Dy priza në sallon nuk punojnë fare.", city: "Prishtinë", clientKey: key });
  assert.equal(parsed.title, "Dy priza në sallon nuk punojnë fare.");
  assert.equal(parsed.timing, DEFAULT_CHAT_TIMING);
  const long = "Kam nevojë për pastrim të plotë të banesës me tre dhoma përpara festave të fundvitit, përfshirë dritaret.";
  const title = chatTitle(long);
  assert(title.length <= 81 && title.endsWith("…"));
  assert(!title.includes("  "));
  // An explicit title and timing still win (older clients and tests send them).
  const explicit = inquiryInput.parse({ profileId: "pro_1", title: "Riparim prizash", detail: "Dy priza në sallon nuk punojnë fare.", city: "Prishtinë", timing: "Nesër", clientKey: key });
  assert.equal(explicit.title, "Riparim prizash");
  assert.equal(explicit.timing, "Nesër");
});

test("the in-chat quote card needs only a price and an expiry", () => {
  const base = { requestId: "req_1", clientKey: key, expectedVersion: 0, amount: "40" };
  const minimal = offerInput.parse({ ...base, expiresInHours: "72" });
  assert.equal(minimal.amount, 4000);
  assert.equal(minimal.description, "");
  assert.equal(minimal.expiresInHours, 72);
  assert.equal(minimal.scheduledAt, undefined);
  assert.equal(minimal.duration, undefined);
  assert(!offerInput.safeParse(base).success, "an expiry is required");
  assert(!offerInput.safeParse({ ...base, expiresInHours: 5 }).success, "only the offered expiry choices");
  const dated = { ...base, expiresInHours: 24, scheduledAt: "2030-01-01T09:00:00.000Z" };
  assert(!offerInput.safeParse(dated).success, "a start date needs a duration");
  assert.equal(offerInput.parse({ ...dated, duration: "120" }).duration, "120 min");
  // The previous full offer payload is still accepted unchanged.
  const legacy = offerInput.parse({ ...base, description: "Kontrolli i plotë i ndriçimit të kuzhinës.", timing: "Të hënën",
    duration: "Dy orë", expiresAt: "2030-01-01T08:00:00.000Z", scheduledAt: "2030-01-01T09:00:00.000Z" });
  assert.equal(legacy.duration, "120 min");
});

test("job status track: pranuar, në progres, përfunduar, anuluar", () => {
  assert.deepEqual(jobStatus("OPEN"), { reached: -1, cancelled: false, disputed: false });
  assert.equal(jobStatus("BOOKED").reached, 0);
  assert.equal(jobStatus("IN_PROGRESS").reached, 1);
  assert.equal(jobStatus("COMPLETED").reached, 2);
  assert(jobStatus("CANCELLED").cancelled);
  assert.equal(stateLabel("BOOKED"), "Pranuar");
  assert.equal(stateLabel("IN_PROGRESS"), "Në progres");
  assert.equal(stateLabel("COMPLETED"), "Përfunduar");
  assert.equal(stateLabel("CANCELLED"), "Anuluar");
  assert.match(timelineEventLabel("OFFER_ACCEPTED", false)!, /punësuat/);
  assert.match(timelineEventLabel("OFFER_ACCEPTED", true)!, /ju punësoi/);
  assert.equal(timelineEventLabel("UNKNOWN", true), null);
});

test("quote cards and status lines interleave with messages by time", () => {
  const rows = mergeTimeline(
    [{ id: "m2", createdAt: "2026-11-26T10:05:00.000Z" }, { id: "m1", createdAt: "2026-11-26T10:00:00.000Z" }],
    [{ id: "quote", createdAt: "2026-11-26T10:05:00.000Z" }, { id: "intro", createdAt: "2026-11-26T09:00:00.000Z" }],
  );
  assert.deepEqual(rows.map((r) => r.item.id), ["intro", "m1", "quote", "m2"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { assessCheckIn, nobodyHomeGate, noShowGate, distanceM, helplineNumber, whatsappLink, decodePhoto, parseNominatim, geocodeQuery } from "../lib/arrival";
import { classifyJob } from "../lib/trust";
const start = new Date("2026-12-01T09:00:00Z"), min = (m: number) => new Date(start.getTime() + m * 60000);
const site = { lat: 42.6629, lng: 21.1655 };
test("check-in window, 200 m radius and photo fallback", () => {
  assert.equal(assessCheckIn({ startsAt: start, now: min(-16), site, point: site, hasPhoto: false }).ok, false);
  assert.equal(assessCheckIn({ startsAt: start, now: min(31), site, point: site, hasPhoto: true }).ok, false);
  assert.deepEqual(assessCheckIn({ startsAt: start, now: min(-15), site, point: site, hasPhoto: false }), { ok: true, distanceM: 0, method: "GPS" });
  const far = { lat: site.lat + 0.01, lng: site.lng };
  assert(distanceM(site, far) > 1000);
  assert.equal((assessCheckIn({ startsAt: start, now: min(0), site, point: far, hasPhoto: false }) as { code: string }).code, "PHOTO_REQUIRED");
  assert.equal((assessCheckIn({ startsAt: start, now: min(0), site, point: far, hasPhoto: true }) as { method: string }).method, "PHOTO");
  assert.equal((assessCheckIn({ startsAt: start, now: min(0), site: null, point: site, hasPhoto: false }) as { code: string }).code, "PHOTO_REQUIRED");
});
test("nobody home needs check-in, helpline, 30 minutes and the admin's no answer", () => {
  const base = { checkedInAt: min(0), helplineAt: min(1), waitEndsAt: min(31), contactResult: "NO_ANSWER" };
  assert.equal(nobodyHomeGate(null, min(60)).ok, false);
  assert.equal(nobodyHomeGate({ ...base, helplineAt: null, waitEndsAt: null }, min(60)).ok, false);
  assert.equal(nobodyHomeGate(base, min(30)).ok, false);
  assert.equal(nobodyHomeGate({ ...base, contactResult: "REACHED_GOES_AHEAD" }, min(60)).ok, false);
  assert.equal(nobodyHomeGate(base, min(31)).ok, true);
});
test("customer no-show: from start+15 without check-in, else a dispute", () => {
  assert.equal(noShowGate(start, null, min(14)), "TOO_EARLY");
  assert.equal(noShowGate(start, null, min(15)), "NO_SHOW");
  assert.equal(noShowGate(start, { checkedInAt: min(2) }, min(40)), "DISPUTE");
});
test("helpline link needs a configured number; photos and geocoding are validated", () => {
  assert.equal(helplineNumber(undefined), null);
  assert.equal(helplineNumber("abc"), null);
  assert.equal(whatsappLink(null, "x"), null);
  assert.equal(whatsappLink(helplineNumber("+1 555 0100 200"), "a b"), "https://wa.me/15550100200?text=a%20b");
  assert.equal(helplineNumber("00383 44 123 456"), "38344123456");
  assert.equal(helplineNumber("+383.44.123.456"), "38344123456");
  assert.ok("error" in decodePhoto("data:image/gif;base64,R0lGODlh"));
  assert.ok("bytes" in decodePhoto(`data:image/jpeg;base64,${Buffer.from("ffd8ff00", "hex").toString("base64")}`));
  assert.deepEqual(parseNominatim([{ lat: "42.1", lon: "21.2" }]), { lat: 42.1, lng: 21.2 });
  assert.equal(parseNominatim([]), null);
  assert.equal(geocodeQuery(null, "Prishtinë"), null);
});
test("trust: arriving more than 15 minutes late counts as late", () => {
  const job = { state: "COMPLETED", scheduledAt: start, startedAt: min(5), cancelledAt: null, cancelledBy: null, hasDispute: false };
  assert.equal(classifyJob(job), "ON_TIME");
  assert.equal(classifyJob({ ...job, arrivedAt: min(16) }), "LATE");
});

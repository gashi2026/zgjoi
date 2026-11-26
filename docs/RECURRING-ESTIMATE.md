# Recurring schedules (step 3) and the paid €15 estimate (step 4)

Owner rules (26 Nov 2026). Pure rules: `lib/recurring-series.ts`, `lib/book-now.ts` (unit-tested in
`tests/recurring-estimate.test.ts`). Server: `lib/server/recurring-series.ts`, `lib/server/estimates.ts`.

## Recurring Book now

| | |
| --- | --- |
| Categories | Every category with Book now on (default Dado, Pastrim, Elektricist, Mjeshtër i Ujit; `/admin/kategorite` overrides) |
| Cadence | Every week or every two weeks, same weekday and Kosovo time (DST-safe; a time that does not exist that day is skipped) |
| Terms | The pro's hourly rate and the hours at the time the series is set (snapshot on `RecurringSeries`) |
| Each visit | A normal Book now booking (ServiceRequest + Quote + Payment PENDING/OFFLINE + Booking with `seriesId`, `occurrenceAt`) |
| Commission | 5% on every visit of an ACTIVE series (vs 15%, 10% elite), verified on the server in `bookingCommission` |
| Paid | Upfront per visit; in the beta an admin marks each one paid on `/admin/pagesat` |
| Cancellation of one visit | Unchanged Book now rules: > 24 h free; < 24 h €15 (€10 pro, €5 Zgjoi); pro late / no-show full refund; nobody home €15 |

**Who sets it**

- Customer: on `/rezervo-tani`, “Përsëritja” = Çdo javë / Çdo dy javë. The series is ACTIVE at once (same as Book now: the
  pro's public terms), the first visit is that booking.
- Pro: on any non-cancelled Book now booking, “Propozo rezervim të përsëritur”. The series is PROPOSED; nothing is booked
  until the customer presses “Konfirmo përsëritjen” (in the chat card or on `/llogaria/perseritjet`). First visit = one
  cadence after that booking (at least 24 h away), at the pro's current rate.

**Pause / resume / cancel** (customer or pro, `/llogaria/perseritjet`, `/pro/perseritjet`)

- Pause or cancel the series: visits more than 24 h away are cancelled free (refund to-do if already paid); visits within
  24 h stay and follow the normal rules if either side cancels them.
- Resume: generation restarts from now; released visits are recreated.
- The system pauses a series (and tells both sides) if the pro can no longer be booked (Book now off, suspended, not approved).

**Generation**: `GET /api/cron/recurring` (Bearer `CRON_SECRET`, daily 04:00 UTC in `vercel.json`) creates bookings for
visits up to 14 days ahead; it also runs right after a series is created, confirmed or resumed. Idempotent: a cursor
(`generatedUntil`) plus a partial unique index (one CONFIRMED booking per series and date). A taken slot or a time outside
the pro's weekly hours skips that date and notifies both sides.

## Paid estimate visit (€15)

- Elektricist and Mjeshtër i Ujit by default (`Category.estimateEnabled` / `estimatePriceCents` override).
- The pro's profile shows “Kërko vlerësim · 15 €” → `/kerko-vleresim`. The customer picks a visit time, describes the job;
  this opens a chat (ServiceRequest OPEN) with an `Estimate` (PENDING). One open estimate per customer and pro.
- Beta, payments off (`PAYMENTS_MODE` unchanged): an admin presses “Shëno si të paguar” on `/admin/pagesat` (note required,
  audited). The pro then sees the address. An admin can also cancel an unpaid one, or refund a paid one that was not used.
  The customer can withdraw an unpaid request.
- Credit: a PAID estimate with the same pro is credited in full once to the next hire on any path — Book now (including a
  recurring visit) or the chat offer “Puneso” (same chat or a new one). Customer pays total − €15; commission on the full price.

## Database

`supabase/staging/recurring-estimate.sql` (staging, guarded by the staging marker) and
`supabase/production/20261127_recurring_estimate.sql` (same body, production guard; NOT applied). Additive: new
`RecurringSeries` table (RLS on, no browser-role grants), `Booking.seriesId/occurrenceAt`, estimate columns; the
`Estimate_state_valid` check is widened with `CANCELLED`. Apply the production file before this code reaches main.

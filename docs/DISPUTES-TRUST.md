# Disputes and pro trust history

Owner request 26 Nov 2026. Rules: `lib/dispute-rules.ts`, `lib/trust.ts` (unit-tested in
`tests/disputes-trust.test.ts`). Server: `lib/server/disputes.ts`, `lib/server/trust.ts`.

## Disputes
- Either the customer or the pro flags a paid job (“Raporto një problem me punën”) with a
  written statement: any time while it is active, or up to **3 days** (`DISPUTE_OPEN_DAYS`)
  after completion or cancellation. Payment and job move to DISPUTED.
- The other side gets an on-site notice and may add one statement within **48 hours**
  (`DISPUTE_RESPONSE_HOURS`). Both statements show in the job chat.
- Admins get an on-site notice linking `/admin/kontestet/<id>`: both statements, job,
  payment, booking and the pro's trust history. The decision opens after the response or
  the deadline.
- Decisions: full refund (job ends, pro gets nothing, payment REFUND_PENDING → REFUNDED when
  the to-do is done), partial refund (lower final price), credit for the customer, or no
  action. An optional **final price** recalculates commission and the pro's share (Payment,
  Booking, scheduled Payout). The job returns to its prior state unless fully refunded.
- Refunds and credits are admin to-dos on `/admin/pagesat`. The outcome posts as a chat
  status line and an on-site notice to both sides. No email.

## Trust history (public on the pro profile, under name/rating/price)
- Jobs booked = hired jobs. On time / late = completed jobs whose start (“Fillo punën”,
  `ServiceRequest.startedAt`) was within / more than **15 minutes** after the booked time
  (`LATE_AFTER_MINUTES`); no booked time = on time. Not finished = pro cancellation, pro
  no-show or a full-refund dispute (`ServiceRequest.cancelledBy`). Disputes = jobs with a
  dispute. Cancellations = pro-side cancellations in the last **90 days**.
- Donut: green on time, gold late, red not finished; hover, tap and keyboard-focus tooltips
  (mockup `trust-donut-circle.html`).
- At **3** pro cancellations in 90 days admins get one review alert (`PRO_REVIEW`) per window.

## Database
`supabase/staging/disputes-trust.sql`: additive columns on `ServiceRequest` and `Dispute`,
check constraints, two indexes. Staging-marker guard; never on production without review.

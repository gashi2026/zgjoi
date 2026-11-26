# Book now (hourly) — step 2

Owner decisions of 26 Nov 2026. Pure rules live in `lib/book-now.ts` (unit-tested in
`tests/book-now.test.ts`); server actions in `lib/server/bookings.ts`.

## Hiring paths per category

| Category | Chat | Book now | Paid estimate |
| --- | --- | --- | --- |
| Elektricist, Mjeshtër i Ujit | yes | yes | yes (€15) |
| Dado, Pastrim | yes | yes | no |
| The other 10 | yes | no | no |

Code defaults; an admin can override per category on `/admin/kategorite`
(`Category.bookNowEnabled`, `estimateEnabled`, `estimatePriceCents`, null = default).

## How a booking works

- The pro sets an hourly rate and minimum hours on `/pro/profili`.
- Eligible profiles show **Rezervo tani**. The customer picks a start (Kosovo time) and any
  hours ≥ the minimum in half-hour steps (max 12 h). Total = rate × hours.
- A booking is a normal job: ServiceRequest (BOOKED) + an accepted Quote (reserves the
  calendar slot) + a Payment (PENDING, `method = OFFLINE`) + a `Booking` row with the
  hourly snapshot. It shows in the chat with the status bar.
- Paid upfront: in the beta an admin uses **Shëno si të paguar** on `/admin/pagesat`.
- Hour changes: the pro proposes in the chat; **only an explicit customer confirmation**
  changes hours, total, commission and the payment. Until then the original total stands
  (`UNCONFIRMED_CHANGE_POLICY = "ORIGINAL_STANDS"`, settled by the owner 26 Nov 2026).
  After payment a confirmed change creates a REFUND/COLLECT admin to-do for the difference.
- Every hour change and cancellation is stored in `BookingChange` (history in the chat).

## Cancellations (all Book now categories)

| Case | Outcome |
| --- | --- |
| Anyone, > 24 h before start | free, full refund |
| Customer, < 24 h | fixed €15 fee (€10 pro, €5 Zgjoi), rest refunded |
| Pro cancels < 24 h, or pro no-show | full refund, pro gets nothing |
| Nobody home (reported by pro after start) | customer loses €15, rest refunded |

Refunds and unpaid fees are admin to-dos on `/admin/pagesat`; no money moves in the beta.

## Estimate credit and commission

- A PAID `Estimate` with the same pro is credited in full (€15) once, on any hiring path
  (Book now and chat/Puneso). Cancelling a credited booking returns the credit.
- Commission is 15% (10% elite, 5% recurring) of the full price and is stored on the
  Payment/Booking; collection is deferred during the beta.
- No minimum price: under €15 the customer owes nothing more; the excess goes to the pro.

## Phase 2 seam

`Payment.method` (`OFFLINE` | `CARD`). No provider is integrated.

## Database

`supabase/staging/book-now.sql`: additive, guarded by the staging marker, RLS on the three
new tables. Never apply to production without a separate reviewed rollout.

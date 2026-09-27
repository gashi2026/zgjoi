# Backend: current implementation and boundaries

This candidate is a Next.js application running both the website and its API on
Vercel. React renders the screens; Tailwind supplies the existing gold/cream design.
Prisma translates server code into PostgreSQL queries against Supabase. The browser
never receives the database password or storage service key.

The website uses its own bcrypt passwords and hashed database sessions. It does
not use Supabase Auth. Enabling a Supabase Auth setting will not change website
registration, recovery or roles. Private pages and mutations check the current,
active user, role and record ownership; the site password is only a testing gate.

## Data flow

1. Search reads approved, active professionals in active service categories.
2. An authenticated customer selects one professional. Creating the inquiry also
   creates that pair's private conversation; there is no public lead feed.
3. Only the selected pro can issue a versioned offer. The customer can accept only
   the current unexpired version. A serializable transaction records the accepted
   quote and one pending payment amount/commission snapshot.
4. The test payment adapter creates hosted checkout only after acceptance. A
   signed, settled provider event changes PENDING to HELD. The return URL alone
   never marks a payment successful.
5. The pro starts work and requests completion. The customer confirms completion;
   one payout obligation is created. The optional review is a separate action.
6. A restricted admin operation can prepare a test transfer after completion. The
   provider charge is checked again for refunds/disputes. TRANSFERRED means a
   provider-account transfer; it never means that a bank payout has succeeded.

## Source map

| Location                                   | Responsibility                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `app/`, `components/marketplace/`          | Public catalog, signup and real customer/pro/admin pages and forms                     |
| `app/api/`                                 | HTTP boundaries: current user, role/ownership, input and origin checks                 |
| `app/actions/admin.ts`                     | Audited category/site/honeycomb management from the retained admin UI                  |
| `lib/server/auth.ts`, `accounts.ts`        | Hashed sessions, passwords, recovery, verification and own-profile changes             |
| `lib/server/marketplace.ts`, `catalog.ts`  | Private inquiries/chat, offers, acceptance, completion, reviews, search and favorites  |
| `lib/server/support.ts`, `admin.ts`        | Private support, guest capabilities and audited administrative commands                |
| `lib/server/payments.ts`                   | Test-only checkout, settlement validation, transfer/refund preparation                 |
| `lib/server/notifications.ts`              | In-app notifications and encrypted account-email outbox                                |
| `lib/server/storage.ts`                    | Server-side private document upload and short-lived download links                     |
| `lib/`                                     | Shared validation, formatting, static service taxonomy/cities and design configuration |
| `prisma/schema.prisma`                     | 28 application models, relationships and state enums                                   |
| `supabase/staging/`                        | Applied staging bootstrap/upgrade, RLS/grants/constraint verification                  |
| `tests/`, `scripts/`, `.github/workflows/` | Disposable Postgres migration/HTTP journey, unit checks, build and smoke checks        |

## Important boundaries

- Production still has the original application schema and source. The expanded
  28-table schema has been applied only to the separate staging project. Do not
  run its bootstrap or guarded upgrade against production.
- All 28 staging tables have RLS and no anonymous/authenticated browser-role CRUD
  grants. No permissive RLS policies are intentional: trusted Prisma server access
  performs application authorization. Supabase's informational no-policy notices
  do not call for opening the tables to browsers.
- Support retries are bound to the authenticated user or prepared private guest
  capability. Client keys alone do not authorize another person's ticket.
- Documents are disabled until a private bucket and server key are configured.
  Type/signature checks are present; malware scanning, retention/deletion and
  external storage verification remain open.
- In-app job notifications persist. Account emails have a bounded, encrypted,
  retryable outbox and are disabled by default. Used/expired account links are
  discarded before delivery. Job email/SMS/push delivery is not implemented.
- `PAYMENTS_MODE=disabled` is the default. `stripe_test` additionally requires a
  test secret and the matching webhook secret. Live keys are rejected. The actual
  company/provider/Kosovo payout arrangement is unresolved.
- Unexpected provider-side refunds/chargebacks, transfer reversals, bank payout
  events, partial refunds, processor fees and full financial reconciliation need
  implementation and testing before live money. A transfer precheck is not a
  substitute for those event handlers or an accounting ledger.
- The maintenance job expires offers and cleans expired authentication/rate-limit
  records, processes enabled mail and records a heartbeat. It never releases money
  because a time limit expired. Monitoring of that heartbeat still needs an owner.

See [the implementation evidence](docs/PRIVATE-MARKETPLACE-BETA.md),
[the roadmap](docs/LAUNCH-ROADMAP.md) and [owner setup](docs/OWNER-SETUP.md).
Builds do not mutate databases; the seed is catalog-only and refuses production.

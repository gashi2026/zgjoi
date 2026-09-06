# Backend: current implementation and boundaries

This is a server-rendered Next.js application with route handlers and Server
Actions. It uses Prisma directly against PostgreSQL on Supabase. The browser does
not use Supabase Auth, Storage or the Data API in the audited source.

| Component | Exists | Still required |
| --- | --- | --- |
| Database | 22 Prisma models and existing Supabase tables | Safe schema baseline, restore-tested backups and direct-inquiry/offer/payment constraints (P01/P07/P11/P14/P25) |
| Sessions | bcrypt password checks and database sessions with HttpOnly cookies | Complete private-page authorization, ownership tests, recovery, rate limiting and safe seed behavior (P03/P05/P08) |
| Admin | Several database-backed management screens and actions | Valid state transitions, safe financial administration, consistent totals and audit trails (P17/P22) |
| Support | Persistent ticket/message APIs and UI | Ticket ownership for guests/accounts, input limits and failure handling (P04/P21) |
| Customer/pro messaging | Schema and APIs; much of the UI is local-only | Membership on every read/write and private inquiry conversations (P03/P07/P10) |
| Search | In-memory professional fixtures and filters | Published database profiles, real category/city filtering and pagination (P09) |
| Offers/payments | Incomplete actions, payment helpers and webhook handler | Expiring/versioned offers, atomic acceptance, provider-approved checkout, event deduplication and reconciled payout ledger (P06/P11–P17) |
| Storage/notifications | No completed storage or delivery integration | Private document access, validation, retention, retries and delivery tracking (P19/P21) |

The intended payment sequence is acceptance, successful payment, customer-confirmed
completion, then payout less commission. An authorization hold, capture, transfer
and bank payout are different events. Existing helper names or demo fallbacks do
not prove funds are held or paid out correctly. Provider support and approved
operating arrangements for the actual company and Kosovo professionals remain
unverified. Never turn on live keys as a substitute for completing these tasks.

RLS and public API permission restrictions were applied on 6 September 2026 and are
recorded in `supabase/migrations/`. Trusted server roles retain database access;
custom application sessions therefore still need explicit role and ownership
checks. No Supabase Auth policy should be assumed to protect a custom session.

Use [DEPLOY.md](DEPLOY.md) for setup and release operations. The old advice to
create tables with a schema push and seed the production admin account is retired.
The legacy `prisma/seed.ts` remains unsafe for production and is tracked under P05.
See [docs/LAUNCH-ROADMAP.md](docs/LAUNCH-ROADMAP.md) for acceptance criteria.

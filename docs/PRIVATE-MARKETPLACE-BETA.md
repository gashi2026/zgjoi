# Private marketplace beta implementation

Status: implementation candidate, not deployed to production. The build and isolated HTTP/database journey pass in GitHub CI; external integrations and browser/device behavior remain unverified. This change is stacked on the safe build/staging foundation PR.

The journey is customer → select one professional → private inquiry and chat → versioned official offer (scope, cents, schedule, expiry) → acceptance → payment → customer confirmation → transfer less commission → optional review. There is no public request feed, lead purchase, bidding broadcast or automatic offer generation.

## Implemented in this branch

- One hashed-session authentication service for routes and server actions. Each private page, API and action checks the current account and role. Suspended users lose access. Shared database rate limits replace process memory limits.
- Customer and professional signup, profile changes, password change/recovery and email verification. Only a reviewed, active professional in an active category is searchable. Recovery mail uses encrypted queued payloads and one-use hashed tokens; the worker discards consumed or expired links before contacting the provider.
- Database search, approved professional profiles, favorites, request lists, messages, offers, job status, availability, earnings and notifications. Empty states replace invented marketplace activity.
- Every inquiry belongs to one selected professional. Pre-booking contact patterns are rejected in inquiry/message/offer text; client name is reduced to initials and address is hidden until funding. Obfuscation is an abuse-control limitation, not a guaranteed anonymity promise.
- Immutable offer revisions, expiry checks, optimistic version checks, serializable acceptance and an idempotency key. Acceptance creates one pending amount snapshot, not a charge.
- Participant-scoped chat and owner/capability-scoped support with bounded bodies, cursor pagination and concurrent retry deduplication for new tickets and staff replies. Guest support capability is ignored when a different user logs in.
- Separate customer completion and review actions; a confirmed completion creates one payout obligation. A review never releases money. Moderation recalculates published rating aggregates.
- Admin user management, suspension instead of hard deletion, profile/document review, support and audit records. No manual “money received” switch.
- Stripe **test-only** checkout and verified settlement recording; live keys and missing configuration fail closed. Full-refund and transfer preparations use provider idempotency and hold uncertain operations for reconciliation. Before transfer, the provider charge is rechecked for refunds/disputes. A successful refund cancels any scheduled payout obligation (recorded FAILED with a cancellation reference). A transfer is distinct from a confirmed bank payout.
- Private PDF/JPEG/PNG document endpoints with ownership, size/signature checks and 60-second download URLs. Uploads are disabled until a private bucket and server-only key are configured. A signature check does not replace malware scanning.
- In-app notifications, opt-in transactional email worker, authenticated maintenance, error/loading/empty states, keyboard labels and focus, mobile form sizes, reduced motion, metadata, private/preview indexing rules, sitemap and basic security headers.
- Public copy now describes the actual private-offer flow. Fake testimonials, fake totals, newsletter confirmation, payment-after-completion and automatic seven-day release promises are removed. Draft test-use/privacy notices remain an owner/legal launch dependency.

## Staging database evidence

Project: `jxddfakvakropstpfrvx`, separate from production `pfckeaicvexyaybptgfn`.

- Existing foundation migration: `20260906225844`.
- New provider-recorded migration: `20260907004950` (`private_marketplace_beta`). Exact source: `supabase/staging/marketplace.sql`.
- Before upgrade: no requests, payments, payouts or sessions; 22 tables and the staging marker verified.
- After upgrade: **28 application tables; RLS enabled on all 28; 0 tables with anon/authenticated CRUD grants; both browser roles lack public schema usage; 11 additional database check constraints.**
- The migration refuses non-staging databases and existing marketplace records. It is not a production migration baseline. Production cutover needs a reviewed migration/backfill, a backup and restore rehearsal, and an explicit session cutover.

## Verification

- Local TypeScript: passed at the current implementation checkpoint.
- Local ESLint: passed at the current implementation checkpoint.
- Local production build: passed without a reachable database.
- Six local unit tests: passed (money bounds, hashed tokens, guest/account separation, signup roles, availability, contact/file validation and JSON/origin/body boundaries).
- GitHub workflow installs an isolated Postgres 17 service, applies the **old bootstrap then the new upgrade**, builds the app and runs HTTP/database regressions. **Passed on source commit `d5e9759258293e583fe2b9291f6712bc2f5b3add`**, [run 34072974783](https://github.com/gashi2026/zgjoi/actions/runs/34072974783). All **21 integration scenarios** pass (Node reports 22 including the parent journey), plus **6 unit tests** and **20 no-database smoke checks**. Clean install, build/lint, TypeScript and dependency audit pass; the audit reported **0 known vulnerabilities** at that run.
- Browser visual/mobile testing, live Supabase application login, email delivery, signed storage upload/download, real provider webhooks and bank payout are **not yet verified**. Database boundary tests use synthetic settlement inputs after the signature-verification boundary; they do not prove a provider integration.

The integration scenarios include actual HTTP login/signup/verification/recovery, expired/suspended/wrong-role sessions, concurrent support retries, private inquiry/chat/offer ownership, 305-message history, stale/duplicate acceptance, mismatched/replayed settlement data, customer-only completion, optional review/moderation, dispute freezes, favorites, availability, real HTML records and database constraints. No production accounts or customer records are used. Earlier failed runs exposed a case-normalization error in a synthetic test fixture and an incorrect HTTP-status assertion for Next streaming redirects; both were corrected. The redirect test now checks the actual redirect target and absence of admin content.

A fresh hosted staging check on 7 September confirmed the same 28/28 RLS and zero browser-role grants. Supabase security advisors returned only 28 informational no-policy notices, consistent with the intentional server-only architecture. Do not create permissive policies to silence them. See [the advisory explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Deployment guard and configuration

Automatic Vercel deployment has been enabled for `codex/private-marketplace-beta` after the founder reported saving the eight initial staging-only Preview variables on 7 September. The available connector cannot inspect or edit their secret values. Deployment and database isolation must be verified from runtime behavior before authenticated writes. `APP_URL` follows once the stable Preview origin exists. Both pull requests remain draft and unmerged.

Follow [OWNER-SETUP.md](OWNER-SETUP.md) for dashboard steps and the actual remaining owner inputs. Required staging variables (names only; never paste secrets in chat):

| Variable                                                                | Purpose                                                                                                                            |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                                            | Both must target dedicated staging using appropriate pooled/direct Supabase connection strings.                                    |
| `APP_URL`                                                               | HTTPS origin of the staging app, used for account links and checkout redirects.                                                    |
| `ENCRYPTION_KEY`                                                        | Separate staging 32-byte hex encryption key; do not replace a production key without migration.                                    |
| `ZGJOI_PASSWORD`                                                        | Keep invitation/testing access locked.                                                                                             |
| `CRON_SECRET`                                                           | Required on the maintenance endpoint. Preview cron requires explicit staging scheduling/manual invocation.                         |
| `PAYMENTS_MODE`                                                         | `disabled` until an isolated Stripe test arrangement is configured. This code does not support live money.                         |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                            | Test-only keys and signature secret. Connected professional accounts must actually be enabled at the provider.                     |
| `EMAIL_DELIVERY_ENABLED`, `RESEND_API_KEY`, `EMAIL_FROM`                | Real delivery requires an approved sender/domain and a successful delivery test. Leave disabled while testing synthetic addresses. |
| `DOCUMENT_UPLOADS_ENABLED`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-only storage configuration. Create `zgjoi-pro-documents` as **private**, max 3 MB, PDF/PNG/JPEG only; no browser policies.  |

Maintenance is scheduled every five minutes on a compatible Vercel plan. It expires offers, cleans expired sessions/tokens/rate buckets, records a heartbeat and processes bounded opt-in email jobs. It never releases money because time elapsed. Vercel cron does not automatically run on Preview deployments.

## Remaining launch gates

1. Configure staging Preview connection strings through a supported credential channel/dashboard, then run browser customer/pro/admin flows and direct negative security probes against that isolated deployment.
2. Verify account email and storage delivery, restrict key scope, define private-document retention/deletion and scanning, and verify private bucket settings.
3. Choose and get approval for a payment provider/company setup supporting the actual Kosovo marketplace, hold/release model and professional payouts. Do not treat a test Stripe integration as approval to operate or as legal escrow.
4. Complete provider failure/chargeback, delayed webhook, refund, transfer reconciliation and bank payout testing; validate finance reconciliation and operational access controls before live money.
5. Owner/legal review of operator identity, terms, privacy, commission/processor-fee treatment, refunds, disputes, tax/invoicing and professional verification policy.
6. Production migration baseline, backup/restore, monitoring/alert recipients, browser/mobile/accessibility/performance review, launch approval and rollback rehearsal.

Each future change must update `docs/LAUNCH-ROADMAP.md` and this evidence record with the source commit, test result, environment and remaining gates. A passing build is not a launch-readiness claim.

## Documentation checked

- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Signed private downloads](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl)
- [Stripe separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers)
- [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration)

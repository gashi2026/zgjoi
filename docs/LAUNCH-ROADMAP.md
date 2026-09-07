# Zgjoi — launch roadmap

Updated 7 September 2026. **Current development candidate: approximately 60/100,
provisional. Real-money beta: NO-GO.** The older audited version was assessed at
27/100; its source remained deployed at the last inspection. Candidate progress
and deployed behavior are tracked separately, using the original audit rubric.

## Product contract

A customer chooses one professional and sends private job details. That pro sends
an official offer with price, scope, timing and expiration. The customer accepts
before payment. Customer-confirmed completion precedes release less commission.
Review is optional. There is no public bidding, broadcast lead feed or paid unlock.

## Current evidence

- Source: [draft PR #2](https://github.com/gashi2026/zgjoi/pull/2), branch
  `codex/private-marketplace-beta`, stacked on [foundation PR #1](https://github.com/gashi2026/zgjoi/pull/1).
  Verified implementation commit: `d5e9759258293e583fe2b9291f6712bc2f5b3add`.
- [CI run 34072974783](https://github.com/gashi2026/zgjoi/actions/runs/34072974783)
  passed clean install, staging bootstrap/upgrade in disposable PostgreSQL 17,
  build/lint, TypeScript, 6 unit tests, 21 integration scenarios (22 including the
  parent journey), 20 no-database smoke checks and an audit reporting zero known
  vulnerabilities. Test payment settlement is injected at the database boundary;
  no real provider payment, email, storage upload or bank payout was tested.
- Hosted staging `jxddfakvakropstpfrvx`: applied migration `20260907004950`,
  following bootstrap `20260906225844`. Recheck: 28/28 tables with RLS, zero
  browser-role table grants, no public-schema usage for anon/authenticated and
  11 additional integrity checks. The original four synthetic accounts remain.
- Supabase security advisors show only informational no-policy notices. This is
  intentional server-only access; [do not open browser policies to silence these notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Production source remains `4e6c58a21984b7ed7f6d9bf22d1c755c8512ef82`.
  The founder reported saving the eight initial staging-only Preview variables
  on 7 September. This branch's deployment restriction has now been removed;
  the resulting Preview still needs runtime isolation and journey verification.
- The earlier production database permission repair remains recorded as migration
  `20260906193104`. No production feature schema change or code release was made
  during this implementation batch.

Full details: [implementation evidence](PRIVATE-MARKETPLACE-BETA.md),
[owner setup steps](OWNER-SETUP.md), [backend map](../BACKEND.md) and
[deployment runbook](../DEPLOY.md). Earlier foundation verification files are
historical evidence for their named commits, not current feature claims.

## Hosted Preview connection checkpoint — 7 September 2026

- Candidate `a6e1e977860576bb61800fd388327dfdd63903fa` built successfully on
  Vercel and passed [the full CI workflow](https://github.com/gashi2026/zgjoi/actions/runs/34125392670).
- The founder supplied authorized Preview access. The site gate correctly returns
  HTTP 423 without its separate site cookie. With authorized site access, the
  read-only catalog request returns HTTP 503, request ID
  `ef63d4be-90c3-45cc-b6d8-7cace6d3ac77`; runtime logs identify a
  `PrismaClientInitializationError`. The staging database separately responds and
  retains its environment marker and zero sessions. Vercel-to-staging isolation
  and authenticated journeys remain unverified; no application write was made.
- This diagnostic change logs only a validated Prisma error code and a fixed
  endpoint classification. Connection strings, credentials, query values and raw
  error messages remain absent from these logs and API responses. Two regressions
  verify redaction and classification, bringing the unit suite to eight tests.
- Next: deploy this diagnostic change to Preview, identify and correct the actual
  connection failure, then repeat staging identity verification before login or
  marketplace writes. No production release or database modification is included.
- Follow-up at `0692ffc3df94cf72da432e631734bb54ea0ed4a8`: the diagnostic
  Preview is READY and [CI run 34127728152](https://github.com/gashi2026/zgjoi/actions/runs/34127728152)
  passes every required step. A new catalog request still returns HTTP 503
  (`e5215493-017e-4c70-9e83-f84576369bca`). The endpoint classification is
  `supabase_pooler`, but Prisma supplies no error code. Added fixed categories
  for known initialization messages to distinguish pooler tenant, authentication,
  network and engine failures without logging their raw content. Staging still
  has zero sessions, requests and payments; hosted isolation remains unverified.

## Readiness reassessment — 7 September 2026

**Current development candidate: approximately 60/100, provisional.** The original
27/100 assessment described the older audited version after its database access
repair. Carrying it forward as the headline after the candidate implementation
understated verified progress. The original audit rubric assessed the source and
available evidence; it was not restricted to already-deployed changes.

This reassessment uses the original eight categories and weights. It credits the
implemented code, isolated CI results and hosted staging checks, while withholding
credit for unverified external-service and production behavior. The individual
scores are engineering judgments, not calibrated measurements or a percentage of
work remaining. No new application functionality or deployment occurred as part
of this scoring correction.

| Area                                    |  Weight | Older version | Current candidate | Evidence / remaining gap                                                                                                                                                                                         |
| --------------------------------------- | ------: | ------------: | ----------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct-pro customer/pro journey         |      25 |             3 |                18 | Persistent search, accounts, private inquiries/chat, offers, acceptance and completion/review pass isolated HTTP/DB tests; full deployed browser/provider journey remains unverified.                            |
| Payment, held funds and settlement      |      20 |             2 |                 5 | Test-only checkout and guarded state/transfer/refund preparation exist. Live eligibility, complete money ledger, chargeback/reversal handling and bank payout reconciliation remain open.                        |
| Security and privacy                    |      15 |             5 |                10 | Shared session/role/ownership checks, support isolation, database rate limits and hosted RLS/grant restrictions have evidence. Deployed access, storage and administrative hardening still require verification. |
| Database and integrity                  |      10 |             4 |                 7 | Staging upgrade, constraints and concurrency scenarios pass. Production schema baseline, data migration and backup/restore rehearsal remain open.                                                                |
| Admin and support operations            |      10 |             5 |                 7 | Persistent audited administration/support and duplicate-reply controls are implemented; financial operating controls and live settlement verification are incomplete.                                            |
| UI, mobile, accessibility, localization |      10 |             6 |                 7 | Real account forms replace demos while preserving the visual system. Browser/device, accessibility and Albanian proofreading still need evidence.                                                                |
| Deployment, reliability and QA          |       5 |             1 |                 3 | Safe reproducible builds and CI/database regressions pass. Isolated Vercel wiring, monitoring, production rollout and recovery remain incomplete.                                                                |
| SEO, notifications and analytics        |       5 |             1 |                 3 | Canonical/private indexing, real metrics, in-app notifications and account-email outbox are prepared. Actual delivery, conversion analytics and production verification remain open.                             |
| **Total**                               | **100** |        **27** |            **60** | **Real-money launch remains blocked by mandatory gates.**                                                                                                                                                        |

The last inspected production deployment still ran the older source. The candidate
remains a draft awaiting isolated Preview verification. A higher candidate score
does not authorize launch: provider approval, the financial ledger/reconciliation,
real email/storage/provider and browser/device tests, production migration,
backup/restore and operational readiness still need completion.

## Top 25 work packages

The original estimates below are historical implementation/review ranges,
**not remaining effort or delivery promises**: 80–141 engineer-days in the initial
audit. One day means about six productive engineering hours; provider/legal waits
are extra. Re-estimate the remaining work after a deployed staging run and P06.
No whole launch package is marked production-complete solely from a draft change.

| ID  | Work package                                                     | Verified implementation / current status                                                                                                                             | Initial engineer-days | Next action / remaining gate                                                                                                                                          |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01 | Safe deployments, migration baseline and staging separation      | IN PROGRESS — Safe builds and isolated staging verified; Preview is deployed but its runtime database connection fails.                                                         | 1–2                   | Resolve the observed initialization failure, prove runtime database isolation, then rehearse backup/restore and the production migration.                       |
| P02 | Supported dependencies, type/lint checks and reproducible builds | IN PROGRESS — Pinned Next/React/Node/lockfile; clean build, lint, TypeScript and zero-known-vulnerability audit pass in CI.                                          | 2–4                   | Candidate Vercel build verified; retain the required CI gate and distinguish a successful build from working runtime database access.                                                                 |
| P03 | Roles and ownership on every private page/action/API             | IN PROGRESS — Shared active-session guards, explicit roles and record ownership; negative HTTP/DB scenarios pass.                                                    | 3–5                   | Repeat the role/ownership matrix against the configured Preview, including server actions and browser account switching.                                              |
| P04 | Guest/account support privacy                                    | IN PROGRESS — Owner/staff/guest-capability access, account-switch denial and concurrent ticket/reply deduplication pass in CI.                                       | 2–4                   | Verify widget focus, multi-tab/account changes, guest-cookie loss and retry UX in the isolated browser deployment.                                                    |
| P05 | Session, rate-limit, secret and seed safety                      | IN PROGRESS — Hashed session tokens, atomic DB rate limits, password revocation, input/origin bounds and catalog-only guarded seed implemented.                      | 2–4                   | Verify deployment cookie/secret behavior; plan the legacy-session cutover and stronger administrative authentication/recovery controls.                               |
| P06 | Approved Kosovo payment/payout arrangement                       | BLOCKED — BLOCKED: no approved company/provider/bank arrangement; candidate rejects live money.                                                                      | 1–3 + external wait   | Owner obtains written provider eligibility for the actual company, Kosovo professionals, customer-confirmed release, EUR, commission and refunds/payouts.             |
| P07 | Private selected-pro inquiry schema                              | IN PROGRESS — Selected pro, immutable accepted quote, versions, payment attempts, participant privacy and transitions implemented; staging has 28 restricted tables. | 3–5                   | Validate the staged app and prepare a reviewed production migration/backfill from the real existing schema; retain the one-pro private model.                         |
| P08 | Persistent signup, verification and recovery                     | IN PROGRESS — Real customer/pro signup, profile changes, one-use verification/reset tokens and session revocation pass in CI.                                        | 3–6                   | Configure and prove sender/domain delivery, replay/expiry UX and post-login navigation in Preview.                                                                    |
| P09 | Real catalog, search and professional publication                | IN PROGRESS — Database category/city/text filters, ordering, paging, approved profiles and favorites replace fixtures; CI checks publication privacy.                | 4–7                   | Load real approved pilot profiles, check search quality, query timing, empty results and category/city coverage with the owner.                                       |
| P10 | Private inquiry/chat and delivery recovery                       | IN PROGRESS — Private requests and scoped chat persist; latest-100/cursor history, duplicate writes, contact controls and 305-message paging pass.                   | 4–7                   | Verify browser reconnection, long offline gaps, read indicators and retained drafts; refine abuse controls without promising guaranteed anonymity.                    |
| P11 | Official offers: cents, scope, timing, expiry and versions       | IN PROGRESS — Pro-only immutable revisions, exact cents, description/timing/expiry checks and superseded-offer rejection pass.                                       | 3–5                   | Confirm offer defaults and schedule wording with the owner; verify date/time entry and expired-offer UX on Kosovo devices.                                            |
| P12 | Atomic, idempotent offer acceptance                              | IN PROGRESS — Simultaneous accept attempts create one accepted quote and one pending amount/commission snapshot; no pre-acceptance charge.                           | 4–6                   | Verify decline/retry/late-provider-event behavior with the approved test provider and actual deployed UI.                                                             |
| P13 | Provider checkout and durable payment events                     | IN PROGRESS — PARTIAL: Stripe test-only hosted checkout/signature checks and settlement deduplication prepared; injected DB-boundary cases pass.                     | 5–9                   | Complete approved provider onboarding and real sandbox checkout/webhook tests, including declines, authentication, delayed/duplicate callbacks and lost responses.    |
| P14 | Reconciled fund, refund and payout ledger                        | IN PROGRESS — PARTIAL: unique payout obligation, money constraints and guarded transfer/refund operations; transfer is not bank payout.                              | 5–9                   | Implement immutable money movements, provider fee/refund/chargeback/reversal/bank-payout events, reconciliation and recovery for uncertain operations.                |
| P15 | Customer completion followed by optional review                  | IN PROGRESS — Customer-only completion creates one payout obligation; optional owner review and moderation aggregates pass independently.                            | 3–5                   | Verify deployed UX and the actual provider release flow; agree customer nonresponse policy without time-based automatic release.                                      |
| P16 | Disputes, cancellation and refunds                               | IN PROGRESS — PARTIAL: dispute intake freezes held payment; basic pre-acceptance cancellation and test full-refund preparation implemented.                          | 5–8                   | Agree cancellation/nonresponse/refund rules; implement accepted-but-unfunded changes, evidence, partial refunds and provider-confirmed resolution/reconciliation.     |
| P17 | Safe financial administration and settlement                     | IN PROGRESS — PARTIAL: audited admin commands, self/last-admin protection, no fake bank receipts, transfer/refund guards and provider charge precheck.               | 3–5                   | Complete financial operations review, stronger admin authentication, statement reconciliation and explicit bank payout/failure handling.                              |
| P18 | Real customer/pro dashboards and forms                           | IN PROGRESS — Real requests, job details, chat, notifications, saved pros, profile, availability and earnings replace demo screens.                                  | 4–7                   | Finish browser/device journey checks, pagination/empty/error states and release the candidate only with its matching schema.                                          |
| P19 | Private documents and professional verification                  | IN PROGRESS — PARTIAL: private file endpoints, owner/admin authorization, 3 MB signature/type bounds and short signed-link preparation.                              | 3–6                   | Configure and verify private staging bucket/service key; implement agreed retention/deletion/scanning and test cleanup of failed/orphan uploads.                      |
| P20 | Scheduling, availability and offer timing                        | IN PROGRESS — Weekly availability persists; duplicate/invalid days rejected; official start/expiry dates and duration saved.                                         | 2–4                   | Confirm Kosovo timezone and appointment rules; add agreed rescheduling and conflict checks and test DST/device timezone cases.                                        |
| P21 | Transactional notifications and retries                          | IN PROGRESS — PARTIAL: in-app job notifications and encrypted account-email outbox; expiry/use checks, leases and bounded retries implemented.                       | 3–5                   | Verify actual account email delivery and cron execution; implement agreed job email/SMS/push and notification preferences/delivery monitoring.                        |
| P22 | Accurate admin metrics, categories and settings                  | IN PROGRESS — Real database aggregates and audited category/site settings replace fake counters; operational event counts and heartbeat are visible.                 | 3–5                   | Verify analytics definitions and conversion funnel/consent, alerting and efficient aggregate queries using realistic pilot volume.                                    |
| P23 | Mobile, accessibility and performance                            | IN PROGRESS — Keyboard labels/focus, error/loading states, mobile input sizes, reduced motion and responsive account pages implemented.                              | 3–5                   | Complete real browser/device, keyboard/screen-reader and performance checks; visual QA remains unverified because browser access was blocked.                         |
| P24 | Truthful content, localization, policies and SEO                 | IN PROGRESS — Private-offer copy, removal of fake traction, Albanian formatting, canonical metadata, private/Preview noindex and public sitemap implemented.         | 3–5                   | Owner/legal review real operator/terms/privacy/refund/invoice details; Albanian proofreading, canonical www/DNS and search-indexing checks before release.            |
| P25 | Journey tests, monitoring, recovery and pilot sign-off           | IN PROGRESS — Prior full CI passes; two new diagnostic redaction checks pass locally (8 unit tests total). Hosted journeys are blocked by DB initialization.                  | 6–10                  | Resolve hosted database initialization, verify browser/email/storage/provider flows, implement alert ownership and rehearse restore/rollback. |

## Next sequence

1. Diagnose the hosted Preview database initialization failure and correct the
   confirmed configuration problem. Verify effective staging identity before
   authenticating or testing writes; payment/email/document integrations stay disabled.
2. Configure and verify account email/private storage with synthetic documents and
   explicitly authorized test recipients. Complete mobile/accessibility testing.
3. Resolve P06 while finishing provider-independent operational work. Integrate and
   test the approved payment/refund/chargeback/payout system and ledger.
4. Rehearse production migration/backup/restore/rollback; publish accurate policies;
   verify monitoring and complete an invited, reconciled pilot before opening.

## Update protocol

After every change, preserve P01–P25 IDs and append the source commit, changed
behavior, test result, target environment and remaining dependency. Reopen affected
gates when a contract changes. Update the founder's full versioned roadmap as well.
This protocol is not an automatic background watcher.

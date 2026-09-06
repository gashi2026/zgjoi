# Zgjoi launch roadmap

Updated 6 September 2026. The production readiness assessment remains **27/100**:
**no real-money beta yet**. Proposed source changes do not receive production
readiness credit until reviewed, deployed and verified. The complete audit and
versioned roadmap are maintained in the founder's audit report; this file tracks
repository work using the same P01–P25 identifiers.

## Product contract

A customer chooses one professional and sends private job details. That pro sends
an official offer with price, scope, timing and expiration. The customer accepts
before payment. Customer-confirmed completion triggers payout less commission.
Review is optional. Public bidding, broadcast leads and paid lead unlocking are
outside the approved model.

## Current checkpoint

- Applied and verified in Supabase: migration `20260906193104` restricts public API
  roles and enables RLS on all 22 application tables. Trusted database access was
  preserved. Application ownership checks still need repair.
- Prepared in this change: builds no longer change the database; Node 24, a pinned
  lockfile, Next.js 16.3.4/React 19.2.8, async request API changes, build checks,
  limited UI state cleanup, CI and corrected operating documentation.
- Local production build, type checking and 18 HTTP smoke checks passed. See
  [BUILD-VERIFICATION.md](BUILD-VERIFICATION.md) for scope and remaining checks.
- Review gates: remote CI, Vercel preview/configuration, staging database isolation,
  authenticated regression tests and browser/device checks. Production main still
  needs the reviewed change; do not assume publishing a branch updates zgjoi.com.

## Work packages

Estimates are initial engineering effort ranges, not delivery promises. One day
means about six productive engineering hours. External provider decisions and
account setup can add calendar time. No whole package is marked done yet.

| ID | Work package | Current status | Initial effort |
| --- | --- | --- | --- |
| P01 | Safe deployments, migration baseline and staging separation | IN PROGRESS: safe build prepared; baseline/restore/isolation pending | 1–2 days |
| P02 | Supported dependencies, type/lint checks and reproducible builds | IN PROGRESS: local checks pass; remote/visual verification pending | 2–4 days |
| P03 | Roles and ownership on every private page/action/API | IN PROGRESS: database API restriction done; application checks pending | 3–5 days |
| P04 | Guest/account support privacy | NOT STARTED | 2–4 days |
| P05 | Session, rate-limit, secret and seed safety | NOT STARTED | 2–4 days |
| P06 | Approved Kosovo payment/payout arrangement | BLOCKED: company/provider decision | 1–3 days + external wait |
| P07 | Private selected-pro inquiry schema | NOT STARTED | 3–5 days |
| P08 | Persistent signup, login verification and recovery | NOT STARTED | 3–6 days |
| P09 | Real professional catalog, search and publication | NOT STARTED | 4–7 days |
| P10 | Private inquiry/chat with authorization and delivery recovery | NOT STARTED | 4–7 days |
| P11 | Official offers: cents, scope, timing, expiry and versions | NOT STARTED | 3–5 days |
| P12 | Atomic, idempotent offer acceptance | NOT STARTED | 4–6 days |
| P13 | Provider checkout and durable payment events | NOT STARTED | 5–9 days |
| P14 | Reconciled fund, refund and payout ledger | NOT STARTED | 5–9 days |
| P15 | Customer completion followed by optional review | NOT STARTED | 3–5 days |
| P16 | Disputes, cancellation and refunds | NOT STARTED | 5–8 days |
| P17 | Safe financial administration and settlement | NOT STARTED | 3–5 days |
| P18 | Real customer/pro dashboards and forms | NOT STARTED | 4–7 days |
| P19 | Document uploads, private access and verification | NOT STARTED | 3–6 days |
| P20 | Scheduling, availability and offer timing | NOT STARTED | 2–4 days |
| P21 | Transactional notifications and retries | NOT STARTED | 3–5 days |
| P22 | Accurate metrics, categories and settings | NOT STARTED | 3–5 days |
| P23 | Mobile, accessibility and performance | IN PROGRESS: limited state fixes; device/visual testing pending | 3–5 days |
| P24 | Truthful public content, localization, policies and SEO | NOT STARTED | 3–5 days |
| P25 | Full journey tests, monitoring, recovery and pilot sign-off | IN PROGRESS: database checks and local HTTP tests; full journey pending | 6–10 days |

Work through P01–P05 first while the founder resolves P06. Then implement
P07–P12 before connecting payments. Do not simply connect the existing unsafe
request/payment actions to their mock buttons. Extend the existing reusable UI
and enforce the approved private, one-pro flow throughout.

## Required launch evidence

- Reproducible clean build; isolated preview database; backup and demonstrated restore.
- Rejection of anonymous, forged, expired, suspended and wrong-role sessions;
  nonparticipants cannot read or write messages, offers, tickets or money records.
- A new customer and approved pro complete a private inquiry, official offer,
  acceptance, provider test payment, customer confirmation, payout and optional review.
- Double acceptance, stale/duplicate webhooks, failed/declined payments, disputes,
  refunds and failed/duplicate payouts recover without inconsistent balances.
- Real-device/keyboard checks, truthful policies/SEO, notification delivery and
  operational reconciliation/alerts have evidence and an accountable owner.

## Update protocol

After each authorized change, record the source revision, affected P IDs, actual
behavior, checks and limits. Separate proposed, merged, deployed and verified
states. Preserve old evidence, reopen affected downstream gates and update the
founder's full roadmap as well. These files are not an automatic monitoring system.

The founder still needs to confirm provider/company onboarding, commission and
fee allocation, cancellation/dispute/nonresponse rules, invoice responsibility,
necessary identity documents and pilot operations. Technical access does not
approve these business decisions.

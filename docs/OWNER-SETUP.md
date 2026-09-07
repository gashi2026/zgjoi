# Owner setup: the remaining account and business inputs

Updated 7 September 2026. The code is in draft PR #2, stacked on draft PR #1.
The current website at zgjoi.com has not received these changes. Keep the site
closed while staging and live-service checks are incomplete.

## What you can delegate and what needs your account

I have prepared the source, isolated staging database, security repairs, migration
checks, persistent marketplace flow and automated regressions. I can continue
fixing code, testing, recording migrations and reviewing supported deployment data.

The available Vercel connection can inspect projects/deployments/logs but does not
provide an environment-variable write tool. The Supabase connection does not
return your database password or storage service secret. Neither connection can
supply your business identity, sign a payment agreement, verify a bank account or
accept legal terms on your behalf. These are the concrete remaining owner inputs.
Do not paste passwords, database URLs or service keys in chat, GitHub or screenshots.

## 1. Connect the candidate Preview to staging

1. Open Supabase and select **zgjoi-staging**, project reference
   `jxddfakvakropstpfrvx`. The original `zgjoi` project
   `pfckeaicvexyaybptgfn` is production; do not use its connection values here.
2. Click **Connect**. Copy the connection strings for this staging project using
   its own database password. If the password is unavailable, reset **only the
   staging database password** in that project's database settings. It is different
   from the four synthetic website account passwords already supplied.
3. In Vercel open **zgjoi → Settings → Environment Variables**. Create overrides
   scoped to **Preview → codex/private-marketplace-beta**. Do not edit the shared
   Production values. Branch-specific values override general Preview values.
4. Set the variables below through the dashboard. Mark credentials as **Secret**
   when the dashboard provides that option. Use separate staging secrets.

| Variable                   | Staging value / action                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Staging transaction-pooler connection for Prisma runtime; copy its host/user from Supabase Connect.                                    |
| `DIRECT_URL`               | Staging direct or session-pooler connection suitable for administration; copy the project-provided connection, not a guessed hostname. |
| `ENCRYPTION_KEY`           | New staging 64-character hex key. Preserve the existing production key.                                                                |
| `CRON_SECRET`              | Independent random staging secret.                                                                                                     |
| `ZGJOI_PASSWORD`           | Separate testing access password; keep invitation-only access.                                                                         |
| `APP_URL`                  | Stable HTTPS origin for this Preview. After deployment, set it to the actual Preview branch URL and redeploy if it differs.            |
| `PAYMENTS_MODE`            | `disabled`                                                                                                                             |
| `EMAIL_DELIVERY_ENABLED`   | `false`                                                                                                                                |
| `DOCUMENT_UPLOADS_ENABLED` | `false`                                                                                                                                |

The runtime uses Prisma **5.22.0**, not the newer adapter setup in some current
quickstarts. Preserve the committed schema/client configuration. Confirm its
transaction-pooler compatibility options and a conservative connection limit
using [STAGING-SETUP.md](STAGING-SETUP.md) before opening the Preview; connection values must be tested, not inferred from
variable names. Supabase documents the connection modes in its
[Prisma guide](https://supabase.com/docs/guides/database/prisma).

Generate each new hex secret separately on your computer with
`openssl rand -hex 32` and save it directly in your password manager/dashboard.
Changing the production encryption key without a migration would make existing
encrypted data unreadable.

Vercel applies changed variables to **new deployments**, not existing ones. Once
all staging overrides are configured, the candidate's one branch-deployment
restriction in `vercel.json` can be removed and a Preview created. This source
restriction is deliberately still present. See
[Vercel environment-variable behavior](https://vercel.com/docs/environment-variables).

You only need to report that configuration is complete and supply the Preview URL.
No secret values are needed in chat. The next engineering action is to verify the
staging marker and log in using the synthetic accounts, then exercise customer,
pro and admin screens in a browser before any production release.

## 2. Enable and prove account email

Create/choose the email sending account and verify a sender domain under zgjoi.com.
Use the exact DNS records generated by the provider; do not replace the domain's
existing website or mailbox records. The prepared adapter uses Resend.
[Resend's domain guide](https://resend.com/docs/dashboard/domains/introduction)
describes its verification workflow.

After the sender is approved, set staging `RESEND_API_KEY`, `EMAIL_FROM` and
`EMAIL_DELIVERY_ENABLED=true` through Vercel. Authorize a delivery test to a mailbox
you control. Do not use the synthetic `.invalid` addresses for delivery: the worker
refuses them. The account-email queue is encrypted; no real email was sent during
this engineering work. General job email/SMS/push messages remain roadmap work.

The worker needs an authenticated invocation for Preview testing. Vercel schedules
cron automatically on production deployments, so Preview's five-minute schedule
alone does not send queued messages. Test delivery, expiry, retries and recovery
before relying on email login verification or password resets.

## 3. Enable and prove private documents

Decide which professional documents are actually needed, who reviews them and when
they must be deleted. Until that decision and a retention/scanning plan are ready,
use synthetic files only.

In **zgjoi-staging → Storage**, create `zgjoi-pro-documents` with **Public disabled**,
a maximum file size of **3 MB**, and MIME types `application/pdf`, `image/png`,
`image/jpeg`. Do not add anonymous/public read policies. Put the staging project
URL and server-only storage service key into Vercel as `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; then enable `DOCUMENT_UPLOADS_ENABLED=true` for the
candidate Preview. This key must never use a `NEXT_PUBLIC_` name.

Engineering must then prove upload, own/admin download, denial to other accounts,
60-second link expiry, invalid-file rejection and cleanup after failed writes.
No bucket or actual upload/download has been verified through this candidate yet.

## 4. Decide and obtain the payment arrangement

The source intentionally rejects live payment credentials. Opening a Stripe account
or adding a secret key does not establish permission to collect, retain and pay out
money for this marketplace. Confirm the actual company's jurisdiction and get the
provider's approval for customers in Kosovo, Kosovo professionals, EUR collection,
customer-confirmed release, commission, disputes/refunds and bank payout.
[Stripe's availability page](https://stripe.com/global) is a starting point for
eligibility; it does not approve this business model.

You must supply the true business identity, sign provider terms and complete bank/
identity verification yourself. Confirm the commission and who bears processing
fees. The code's current default is 15%; that is not a substitute for your final
pricing policy. Legal/tax/invoicing and customer/pro contracts require your local
professional advice and sign-off.

After a suitable test arrangement is available, engineering can finish provider
onboarding, verified refund/chargeback/payout events and a reconciled ledger. Then
it must test declines, authentication challenges, duplicate/delayed callbacks,
partial/full refunds, reversals and bank payout before supporting real money.
The current test adapter alone is not enough for launch.

## 5. Release prerequisites that remain engineering work

These do not require you to write code. They need the above access/configuration
and, where relevant, your operating decisions:

- Browser/mobile/keyboard testing on the isolated Preview, including failed sends,
  long message histories, account changes and the complete private-offer journey.
- Production database backup and demonstrated restore, schema baseline, migration
  of existing records/sessions, release order and rollback rehearsal.
- Runtime/queue/webhook monitoring and a real person/mailbox to receive alerts.
- Admin access controls, document retention/deletion, refund/dispute operating
  procedures and agreed service coverage/pro verification criteria.
- Accurate operator details, customer/pro terms, privacy, refund policy, Albanian
  proofreading, canonical domain/www routing and real approved launch profiles.
- A small invited pilot with recorded outcomes and financial reconciliation. The
  readiness score remains tied to the deployed product, not draft source files.

Do not merge either draft yet simply because CI is green. PR #2 currently targets
the foundation branch, not main; merging it would also require verified staging
variables on that foundation branch before any Preview deployment. Its schema and
external services must be ready before the combined change reaches production. After each future change, update the same
P01–P25 roadmap with the commit, actual tests, environment and next dependency.

# Zgjoi staging setup

Recorded 6 September 2026. The isolated database is ready for controlled testing.
Vercel Preview has not yet been connected or verified against it. Production
readiness remains 27/100; real-money beta is not approved.

## Environments

| Environment | Supabase project | Region | State |
| --- | --- | --- | --- |
| Existing production | `zgjoi` / `pfckeaicvexyaybptgfn` | Canada Central | Existing database; no changes during staging setup |
| Staging | `zgjoi-staging` / `jxddfakvakropstpfrvx` | Canada Central | Healthy; initialized and verified |

Both belong to organization `nromrcjgvsvakbrqbfsx` (gashi2026's Org). Supabase
quoted $0/month for the additional project under the allowance at creation.
No paid upgrade was made; this is not a guarantee about future usage charges.

The application uses server-side Prisma and custom sessions. Supabase Auth
accounts, browser API keys and permissive Data API policies are not needed to
make these test accounts work. Application ownership defects remain separate.

## What was applied

1. Prisma 5.22.0 generated an empty-database SQL diff from the unchanged
   `prisma/schema.prisma`. Schema SHA-256:
   `937b1764a75a8cf7e58ed0a5825c9f6520118814882f692887c3ec28e51002c5`.
2. [`bootstrap.sql`](../supabase/staging/bootstrap.sql) combines that DDL with
   access restrictions in one atomic statement. It requires the expected
   owner and an empty public application schema before creating objects.
   Supabase recorded migration **20260906225844**, named
   `bootstrap_zgjoi_staging_from_prisma`.
3. Row-level security is enabled on all 22 application tables. Public API roles
   `anon` and `authenticated` have no application-table access or public-schema
   usage. Trusted `postgres` and `service_role` access is preserved. New public
   objects created by postgres do not inherit the old broad API grants.
4. [`fixtures.sql`](../supabase/staging/fixtures.sql) was run with four privately
   generated bcrypt cost-12 hashes. It requires the staging marker and empty
   fixture tables, then advances the marker's fixture version from 0 to 1.
   Generated passwords and hashes are not committed or printed in reports.

This is an initialized synthetic test database, not a restored production
backup. The standalone bootstrap must not be replayed on this populated project,
added after the existing production security migration, or run during builds.
A complete production backup, tested restoration and reviewed Prisma migration
baseline remain outstanding. Do not run the legacy `prisma/seed.ts` here.

For a future replacement staging project, review and update the explicit project
marker, apply the guarded bootstrap through a controlled migration, generate new
credentials privately, and run the checks below. Never reuse fixture passwords.

## Synthetic fixtures

| Fixture | Count / detail |
| --- | --- |
| Customer accounts | Two: `client-a@staging.zgjoi.invalid`, `client-b@staging.zgjoi.invalid` |
| Professional account | One: `pro@staging.zgjoi.invalid` |
| Administrator account | One: `admin@staging.zgjoi.invalid` |
| Categories | Three explicitly labeled test categories |
| Professional profile/service/availability | One each; fictional pro, verification pending, no bank or provider account |
| Support | One ticket owned by customer A, two synthetic messages |
| Environment marker | One Setting row identifying the intended staging project and fixture version |
| Sessions, service requests, payments and payouts | Zero |

All account passwords are unique and random and were delivered privately to the
founder. They are website test passwords, not Supabase dashboard or database
passwords. `.invalid` addresses cannot receive mail; email delivery is not tested.
No production customer data was copied. No public bids or paid leads were added.
The current schema still needs the approved private selected-pro inquiry/offer
workflow before meaningful transaction fixtures can be added.

## Verification completed

- All 22 tables' columns, nullability, defaults, enum definitions, primary keys
  and foreign-key mappings match the audited existing schema. There are 9 enum
  types, 25 foreign keys and 60 indexes including primary keys.
- [`verify-access.sql`](../supabase/staging/verify-access.sql): 44 denied API-role
  reads and 44 allowed trusted-role reads. Queries return no application rows.
- [`verify-fixtures.sql`](../supabase/staging/verify-fixtures.sql): relationships
  valid; duplicate email and orphan session rejected; 44 API-role zero-row delete
  probes denied; two trusted-role session create/read/update/delete checks pass.
  All write probes rolled back. This script expects initial, unused fixtures.
- All four saved credential hashes match the privately generated bcrypt hashes;
  each generated password was locally checked against its hash.
- Security advisor: zero ERROR and zero WARN findings; 22 informational
  `rls_enabled_no_policy` notices are expected for intentionally denied API roles.

Final counts and limits are in
[`verification-summary.json`](../supabase/staging/verification-summary.json).
These are database checks. They do not establish website login, route/action
authorization, browser behavior, real email delivery or payment functionality.

## Owner step: connect Vercel Preview

The connected Vercel tools can inspect deployments but cannot edit environment
variables. The project-creation response did not provide a database password.
Use the private dashboards for the following steps; do not paste secrets into
chat, GitHub, screenshots or terminal history.

1. Open [zgjoi-staging in Supabase](https://supabase.com/dashboard/project/jxddfakvakropstpfrvx).
   If you do not have this new project's database password, set one in **Database
   > Settings**, save it in your password manager, and use it only for staging.
   [Supabase password instructions](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB).
2. Click **Connect**. Copy the actual **Transaction pooler** connection string
   (port 6543) for `DATABASE_URL` and **Session pooler** string (port 5432) for
   `DIRECT_URL`. Use the exact host and username shown for this new project;
   do not guess the regional pooler hostname. Session pooling avoids depending
   on direct-host IPv6 connectivity. Replace the password placeholder privately
   and URL-encode reserved password characters.
   [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).
3. For this repository's Prisma 5 client, ensure the transaction URL includes
   `pgbouncer=true`; start with `connection_limit=1` for the controlled serverless
   test and retain SSL. Do not append a second `?` if the URL already has query
   parameters. The session URL must not use port 6543 or transaction-mode options.
   Current Prisma 7 setup snippets are not a required code migration for this
   Prisma 5 project.
   [Prisma/Supavisor troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting),
   [serverless connection example](https://supabase.com/docs/guides/getting-started/quickstarts/redwoodjs).
4. Open [Vercel Environment Variables](https://vercel.com/zgjoi/zgjoi/settings/environment-variables).
   Separate the existing `DATABASE_URL` and `DIRECT_URL` values by scope: preserve
   the Production values and save the new staging values for **Preview only**.
   If a row currently covers both Production and Preview, split its scopes before
   changing the Preview value. Check branch-specific overrides, especially
   `codex/safe-build-foundation`, because they take precedence over general Preview
   values. Record project identity and scope only.
   [Vercel environment scopes](https://vercel.com/docs/environment-variables).
5. Before authenticated tests, review all Preview secrets and side effects:
   use separate staging encryption/cron/site-lock secrets and provider test
   credentials where needed. Keep the existing production encryption key intact.
   Do not enable live payments, real notification delivery or financial jobs.
6. Create a new Preview deployment from `codex/safe-build-foundation` after saving
   the settings. Existing deployments keep their previous values. Confirm the
   resulting deployment belongs to project `zgjoi`, remains Preview, and reads
   the staging marker. Then verify controlled login/logout for the four accounts
   and negative access between customers before using forms for further work.
   The current application has known ownership defects, so these are repair gates.

If you want help identifying the fields, share the Connect panel with password
and key values hidden. No account password or service-role key is required in chat.

## Next engineering work

Finish P01 environment isolation and backup/restore controls, then P03–P05 session,
role, support-ownership and secret/seed safeguards. Implement the private inquiry,
official offer and atomic acceptance flow before wiring payment collection. Keep
[LAUNCH-ROADMAP.md](LAUNCH-ROADMAP.md) updated with evidence after each change.

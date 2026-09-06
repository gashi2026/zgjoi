# Zgjoi deployment runbook

The site has a Next.js server, Prisma database access and partly connected APIs.
A successful deployment does not prove the marketplace or payments work. Keep the
site's coming-soon lock enabled until the launch gates in
[docs/LAUNCH-ROADMAP.md](docs/LAUNCH-ROADMAP.md) pass.

## Build contract

Use Node.js 24 (`.nvmrc` and `package.json`) and the committed npm lockfile:

```bash
npm ci
npm run build
npm run typecheck
npm run test:smoke
```

`npm ci` generates the Prisma client; it does not migrate a database. The build
runs ESLint, generates the Prisma client and compiles Next.js with Webpack. Type
errors stop the build. Webpack is retained for this framework upgrade to keep the
existing bundler behavior. Dependency installation/generation failures must stop
installation; there is no success fallback.

The CI job uses intentionally unreachable localhost database URLs and no project
secrets. Its HTTP checks exercise the production build with synthetic local
configuration. They do not prove production login, messaging or payment behavior.

Never add schema pushes, migrations, seeds or data-reset commands to install,
build, preview deployment or the startup command. In particular, the former build
step `prisma db push --accept-data-loss` has been removed entirely.

## Existing Vercel project

The existing project is `zgjoi`, connected to `gashi2026/zgjoi`, with `main` as the
production branch. Make changes in a feature branch and review its pull request.
The first commit published on a new branch must already contain the safe build
configuration because a branch push can start a preview automatically.

`vercel.json` defines:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Next.js default; do not set a static export folder |
| Node.js | 24.x, matching `package.json` |

Check the deployment logs against those commands. Repository configuration is now
explicit, but dashboard settings, environment values and deployment success still
need live verification. A preview should use a separate development/staging
database. The screenshots showed database variable names assigned to both
Production and Preview; they did not establish whether their values differ.

Do not merge or promote the framework upgrade until CI and Vercel checks pass,
the preview database is isolated, and a controlled login/logout test with a staging
account succeeds. Keep the current production deployment as the rollback target.
A code rollback does not undo database mutations; this change requires no new
production schema migration.

## Environment settings

Copy `.env.example` to `.env` only for local work. Use provider dashboards for
actual deployment secrets; never commit or paste passwords into issues or logs.

| Variable | Use and requirement |
| --- | --- |
| `DATABASE_URL` | Runtime PostgreSQL URL from the intended Supabase project; use the project's supported pooled connection settings for Prisma. |
| `DIRECT_URL` | Direct/session connection for database administration when supported by the host network. No migrations run in this build. |
| `ENCRYPTION_KEY` | Existing 32-byte key represented as 64 hex characters. Keep it stable; replacing it prevents decryption of existing protected data. |
| `ZGJOI_PASSWORD` | Existing coming-soon lock. Keep production restricted during development. This is not customer authentication. |
| `CRON_SECRET` | Independent random secret for scheduled jobs. The existing job still needs its fail-closed authorization and payment-state audit completed (P03/P14/P25). |
| `STRIPE_SECRET_KEY` | Only provider test credentials in an isolated test environment until Kosovo company/payout support and the money workflow are approved and verified. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the matching provider test webhook endpoint. No live-money sign-off is implied by configuring it. |

Generate new encryption/cron secrets locally with `openssl rand -hex 32`. Do not
regenerate an existing production encryption key as a routine setup step. The app
uses custom Prisma-backed sessions; adding Supabase Auth settings will not wire
its registration forms or fix ownership checks.

Do not run the legacy seed against production. It still contains unsafe admin
creation/promotion and credential logging behavior that must be fixed under P05.

## Existing Supabase database

The tables already exist. Public API access was restricted by the migration in
[supabase/migrations](supabase/migrations). That change has already been applied;
this pull request records it in source control and does not require applying it
again. Supabase and Prisma maintain separate migration histories.

Before any structural database change:

1. Create a full database backup through the approved database administration
   workflow and test restoration into an isolated environment. The previous
   structure/permission checkpoint is not a full data backup.
2. Compare the restored schema with `prisma/schema.prisma`, including foreign
   keys, indexes, enums, table grants, default privileges and RLS.
3. Prepare a reviewed baseline for the existing tables and reconcile migration
   histories. Do not execute initial CREATE TABLE statements against existing
   production tables or mark an unverified schema as applied.
4. Review and test each migration on the restored environment. Record its ID,
   verification, rollback limitations and corresponding roadmap task before a
   separately controlled production application.

Do not use database reset commands or prototype schema pushes on the existing
project. The current public API roles deliberately lack application-table
permissions; trusted server access still needs application ownership checks.

## Domain and release checks

`zgjoi.com` is already listed in the supplied Vercel screenshot. In the existing
project's Domains screen, verify its current configuration and HTTPS. Use the DNS
records shown for this project; do not copy old hardcoded IP addresses from an
outdated guide. Choose the canonical host and verify the other host redirects.

After a reviewed release, verify the deployed commit, lock behavior, login/logout
on test accounts, database connectivity, error logs and rollback target. Payment
collection, webhooks, completion and payout require separate staging tests. The
site lock currently also affects machine endpoints; resolve that deliberately
with authorization tests before enabling scheduled/payment operations.

## References checked on 6 September 2026

- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js support policy](https://nextjs.org/support-policy)
- [August 2026 security release](https://nextjs.org/blog/august-2026-security-release)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Supabase with Prisma](https://supabase.com/docs/guides/database/prisma)

This repository remains on Prisma 5.22.0. Do not paste newer Prisma-major setup
instructions into it without a separately tested upgrade.

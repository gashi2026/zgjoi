# Go-live runbook: zgjoi.com (26 Nov 2026)

Production: Vercel project `zgjoi` (domain `zgjoi.com`, Cloudflare DNS → Vercel), Supabase
project `pfckeaicvexyaybptgfn` (free plan org `gashi2026's Org`). Staging: `jxddfakvakropstpfrvx`.

## 0. Safety rails (already in place)
- `npm run build` = lint + `prisma generate` + `next build`. No database step runs at build time;
  `scripts/check-build-safety.mjs` (the `prebuild` step, so it runs in CI and on Vercel) fails the build if `prisma db push`, `migrate reset/dev` or
  `--accept-data-loss` ever reappears in a build/install hook or `vercel.json`.
- Schema changes are applied by hand as reviewed SQL (below), never by a deploy.
- Do not redeploy an old `main` commit after step 2: old commits still contain
  `prisma db push --accept-data-loss` and would drop the new columns/tables.

## 1. Database (before the code)
1. Supabase must be `ACTIVE_HEALTHY` (free restore is $0 while the org has a free active slot;
   free projects pause after ~7 days without activity — Pro is $25/month, needs the owner's approval code).
2. Backup: logical JSON export of every table (Supabase MCP `execute_sql`, read-only) to
   `/workspace/zgjoi-prod-backup/`, plus the schema (`main`'s `prisma/schema.prisma` +
   `supabase/migrations/20260906193104_*`). `pg_dump` needs the database password, which is
   not used by agents; the owner can run `pg_dump` from the Supabase dashboard connection string.
3. Check data: `ServiceRequest`, `Payment`, `Payout` must be empty (the migration refuses otherwise).
4. Apply `supabase/production/20261126_go_live_marketplace.sql` in one transaction (Supabase
   `apply_migration`, name `go_live_marketplace`). It is additive: enum values, nullable/defaulted
   columns, new tables with RLS + revokes, indexes, check constraints. The only drop is the Quote
   unique index (requestId, profileId), replaced by (requestId, profileId, revision).
   Rehearsed on a local copy of the `main` schema: the result equals the release Prisma schema.
5. Verify: RLS on all public tables, no anon/authenticated grants (`get_advisors` security).
6. Old sessions: users sign in again after release (session format changed).

## 2. Environment (Vercel → Production)
Present: `DATABASE_URL`, `DIRECT_URL` (created 8 Aug 2026 with the production project, before
staging existed), `ENCRYPTION_KEY` (keep it; rotating breaks encrypted data), `CRON_SECRET`, `ZGJOI_PASSWORD`.
Optional, safe defaults when unset: `PAYMENTS_MODE` (unset = payments off), `EMAIL_DELIVERY_ENABLED`
(unset = no email), `APP_URL` (unset = no email links; set `https://zgjoi.com` before enabling email),
`DOCUMENT_UPLOADS_ENABLED` (unset = off), `ZGJOI_HELPLINE_WHATSAPP` (Arrita; unset = on-site alert only).
`ZGJOI_PASSWORD` keeps the coming-soon lock on; remove it only when opening the site publicly.

## 3. Code
1. Feature PRs → `codex/private-marketplace-beta` (CI green).
2. `codex/private-marketplace-beta` → `main` (one PR, CI green). The merge triggers the Vercel
   production build; it runs no database step.
3. Watch the deployment to `READY`; smoke `/`, `/hyr`, `/kerko`, a profile, `/api/auth/me`.

## 4. Rollback
- Code: Vercel → Deployments → previous production deployment → "Instant Rollback"
  (or promote it). The previous code ignores the new additive columns. Never "Redeploy" an old commit (see 0).
- Database: the migration is additive; to undo, restore the JSON backup into a fresh project or
  drop the new objects in a reviewed script. Do not run `prisma db push` against production.

## 5. Arrita (proof of presence) rollout
1. Apply `supabase/production/20261126_arrita_checkin.sql` to production with a migration (additive; refuses staging; requires the go-live SQL first).
2. Set `ZGJOI_HELPLINE_WHATSAPP` (Production + Preview, sensitive; any format, normalized to wa.me digits) and optionally `GEOCODING_PROVIDER` (default Nominatim; `off` disables).
3. Only then merge beta → main. Rollback stays instant rollback; the new tables are unused by older builds.

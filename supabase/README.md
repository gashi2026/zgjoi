# Database setup and migration history

`20260906193104_secure_zgjoi_public_schema_access.sql` is the exact security
migration already applied to the existing Zgjoi Supabase project on 6 September
2026. It restricts public API roles and enables RLS on the 22 existing application
tables, preserving trusted server database access. It contains no application
record inserts, updates or deletes.

The `migrations/` directory is **not a complete empty-database bootstrap**. The application tables
predate migration tracking. This migration deliberately checks the table inventory
and owners and will fail on an empty or unexpected schema.

Do not run this migration automatically during a Vercel build. Do not run
`prisma db push`, reset the existing database or apply a new initial schema over
its tables. A reviewed schema baseline, full backup and tested restoration into
an isolated database are still required before introducing new schema migrations.
See [DEPLOY.md](../DEPLOY.md) and roadmap P01/P25.

Supabase's migration history and Prisma's migration history are different. The
existing project has this Supabase migration; it does not yet have a reconciled
Prisma migration baseline. Future schema changes must preserve these permissions.
The application uses custom sessions through server-side Prisma, not Supabase Auth.
No permissive browser-role policy should be added just to silence the advisor's
informational “RLS enabled with no policy” notice.

## Isolated staging database

`zgjoi-staging` (`jxddfakvakropstpfrvx`) was initialized and verified separately
on 6 September 2026. Its standalone bootstrap is in `staging/bootstrap.sql`;
Supabase recorded it as migration `20260906225844`,
`bootstrap_zgjoi_staging_from_prisma`. It creates the audited Prisma schema and
restricts browser/API roles in one atomic statement on an empty database.

This bootstrap is deliberately outside `migrations/`: it must not be replayed
after the existing-table security migration or applied over production. It is
not a production data backup or a reconciled Prisma migration baseline.

`staging/fixtures.sql` contains synthetic fixtures with privately supplied bcrypt
hashes. No generated credentials are stored in this repository. Database checks
are in `staging/verify-access.sql` and `staging/verify-fixtures.sql`; the latter
expects untouched initial fixtures and rolls its write probes back.

See [STAGING-SETUP.md](../docs/STAGING-SETUP.md) for recorded results and the
remaining Vercel Preview connection steps. Creating a separate database does
not automatically change Vercel's environment variables.

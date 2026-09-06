# Database migration history

`20260906193104_secure_zgjoi_public_schema_access.sql` is the exact security
migration already applied to the existing Zgjoi Supabase project on 6 September
2026. It restricts public API roles and enables RLS on the 22 existing application
tables, preserving trusted server database access. It contains no application
record inserts, updates or deletes.

This folder is **not a complete empty-database bootstrap**. The application tables
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

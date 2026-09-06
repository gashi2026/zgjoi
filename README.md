# Zgjoi

Zgjoi is a Kosovo service marketplace. The intended journey is: choose one
professional, send private job details, receive an official offer with price,
scope, timing and expiration, accept it, then pay. Funds are released after the
customer confirms completion, less commission. Reviews are optional and separate
from completion. There is no public bidding or paid lead unlocking in this model.

## Current state

The repository contains reusable Albanian-language UI, custom authentication,
Prisma models and partly connected admin/support APIs. Much of the customer and
professional journey still uses fixtures or local-only interactions. Search,
requests, offers, checkout, completion and payouts are not an operational paid
marketplace yet. Database RLS does not fix application-level ownership bugs.

**Real-money beta is not ready.** Track verified work and remaining gates in
[docs/LAUNCH-ROADMAP.md](docs/LAUNCH-ROADMAP.md). The initial audit covered all 143
files at commit `4e6c58a21984b7ed7f6d9bf22d1c755c8512ef82`; their blob hashes matched
the supplied ZIP exactly. Do not interpret existing demo counters or payment
success screens as evidence of real transactions.

## Stack and directories

| Location | Purpose |
| --- | --- |
| `app/` | Next.js App Router pages, route handlers and server actions |
| `components/` | React UI, including customer/pro/admin screens |
| `lib/` | Display fixtures and shared definitions |
| `lib/server/` | Prisma, custom sessions, settings, encryption and payment helpers |
| `prisma/` | PostgreSQL schema and legacy seed; do not seed production |
| `supabase/migrations/` | Recorded database permission repair; not a complete schema bootstrap |
| `scripts/` | Local production-build smoke checks |
| `.github/workflows/` | CI using no production credentials |

Framework: Next.js 16.3.4, React 19.2.8, TypeScript 5.9.3, Tailwind CSS 3 and Prisma
5.22.0. PostgreSQL is hosted on Supabase; the web app runs on Vercel. Next.js builds
use Webpack during this upgrade. Dependencies are recorded in `package-lock.json`.

## Development and verification

Use Node.js 24. For database-connected local work, copy `.env.example` to `.env`
and configure an isolated database. No production secrets are needed to build.

```bash
npm ci
npm run dev
```

For the verification sequence:

```bash
npm run build
npm run typecheck
npm run test:smoke
```

See [DEPLOY.md](DEPLOY.md) before changing Vercel, environment configuration or the
database. Build and install commands never migrate, seed or reset a database.
See [BACKEND.md](BACKEND.md) for the current backend boundaries and known gaps.

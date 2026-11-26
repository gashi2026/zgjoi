# Zgjoi

Zgjoi is a Kosovo service marketplace. The intended journey is: choose one
professional, send private job details, receive an official offer with price,
scope, timing and expiration, accept it, then pay. Funds are released after the
customer confirms completion, less commission. Reviews are optional and separate
from completion. There is no public bidding or paid lead unlocking in this model.

## Current state

This candidate contains database-backed customer, professional and admin flows:
accounts and recovery, approved catalog/search, private inquiries and messages,
versioned offers, atomic acceptance, customer completion and optional reviews.
Application authorization, database rate limits and restricted Supabase API roles
are separate layers. Legacy demo transactions and invented marketplace activity
have been removed from the active experience.

Payment code is **Stripe test-only and disabled by default**. Email delivery and
private document uploads also require configuration and external verification.
The candidate has not been deployed to production. Read
[the implementation evidence](docs/PRIVATE-MARKETPLACE-BETA.md) before enabling a Preview.

**Real-money beta is not ready.** Track verified work and remaining gates in
[docs/LAUNCH-ROADMAP.md](docs/LAUNCH-ROADMAP.md). The initial audit covered all 143
files at commit `4e6c58a21984b7ed7f6d9bf22d1c755c8512ef82`; their blob hashes matched
the supplied ZIP exactly. Do not interpret existing demo counters or payment
success screens as evidence of real transactions.

## Stack and directories

| Location               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `app/`                 | Next.js App Router pages, route handlers and server actions                |
| `components/`          | React UI, including customer/pro/admin screens                             |
| `lib/`                 | Static service taxonomy, validation, formatting and shared definitions     |
| `lib/server/`          | Prisma, custom sessions, settings, encryption and payment helpers          |
| `prisma/`              | PostgreSQL schema and guarded catalog-only local/staging seed              |
| `supabase/migrations/` | Recorded database permission repair; not a complete schema bootstrap       |
| `supabase/staging/`    | Guarded staging bootstrap/upgrade and verification evidence                |
| `scripts/`, `tests/`   | Unit checks, HTTP smoke checks and isolated PostgreSQL integration journey |
| `.github/workflows/`   | CI using no production credentials                                         |

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
npm run test:unit
npm run test:smoke
```

See [DEPLOY.md](DEPLOY.md) before changing Vercel, environment configuration or the
database. Build and install commands never migrate, seed or reset a database.
GitHub CI also runs `npm run test:integration` against a disposable local PostgreSQL
17 service. The preparation script refuses non-CI/non-loopback databases; never
point it at Supabase. See [BACKEND.md](BACKEND.md) for backend boundaries.

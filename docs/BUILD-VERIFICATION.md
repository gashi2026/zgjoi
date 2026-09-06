# Build foundation verification

Checked on 6 September 2026, against the proposed changes based on GitHub main
`4e6c58a21984b7ed7f6d9bf22d1c755c8512ef82`. All 143 baseline file blob hashes matched
the uploaded audit ZIP. The local comparison baseline is a synthetic commit;
published changes use the real GitHub commit as their parent.

## Evidence

| Check | Result and boundary |
| --- | --- |
| Locked clean installation | `npm ci --offline --no-audit --no-fund` passed using the local package cache; the Prisma client generation hook ran successfully. The connected install also logged completion, but its tool completion response was interrupted. |
| Production build | `npm run build` passed on Node 24.19.0/npm 11.9.0 with deliberately unreachable localhost database URLs. No database server, Supabase credentials or Stripe key was provided. |
| Type checking | Generated route types and `tsc --noEmit` pass, including the Next.js 16 promise-based page parameters. |
| ESLint | Zero errors; one warning for the existing full-page navigation after the coming-soon password succeeds. No lint/type rules were disabled to pass the upgrade. |
| Dependency audit | `npm audit --json` reported zero known vulnerabilities for the resolved tree, including development dependencies. This is point-in-time package evidence, not an application security certification. |
| HTTP smoke suite | 18 checks passed against the local production build: public/search/profile pages, profile metadata/404, anonymous session and route/API denials, site lock, incorrect/correct preview password and cookie-based unlock. |
| Database change scope | `prisma/schema.prisma` is byte-identical to the audited baseline. The recorded Supabase security migration is byte-identical to the SQL already applied; no database migration was run during this source change. |
| Secret/diff check | Diff whitespace checks pass. A limited scan found no private-key/provider-secret/cloud-key patterns in the candidate source. This does not certify historical Git data or the unsafe legacy seed. |
| Browser/device checks | Incomplete: no browser binary was present; the Playwright browser download timed out. HTTP and build checks do not validate hydration, drag behavior, mobile layout, keyboard use or visual appearance. |

The package installation warns that ESLint 9.39.4 is out of support. It is a
development tool and the audit reports no known vulnerability in this tree;
validate a compatible maintained ESLint/config combination as a follow-up under
P02. The Next.js runtime was moved from 14.2.5 to the current checked 16.3.4 release,
with React 19.2.8. Prisma remains on 5.22.0 to avoid coupling this change to a
separate database tooling migration.

## Behavior changed

- Install/build never push schemas or accept data loss; failures stop the build.
- Vercel uses the committed npm lockfile, Node 24 and explicit safe commands.
- Cookie/header reads and dynamic page parameters use the Next.js 16 async APIs.
- `middleware.ts` becomes `proxy.ts`, preserving its existing routing behavior.
  Cookie presence is still not a full authentication check.
- Derived search suggestions and navigation resets avoid redundant effects.
  In-memory filtering no longer shows an artificial 400 ms loading animation.
- Support browser state initializes after hydration; polling updates remain
  asynchronous. Existing support ownership bugs are still open under P04.
- Marquee event callbacks satisfy React's ref checks. Count-up subscriptions honor
  motion preference changes and cancel their animation frame on cleanup.

## Before merge and release

Inspect the remote CI and Vercel checks on the exact proposed commit. Verify preview
and production database isolation, then run browser regressions and authenticated
login/logout using staging accounts. The source build does not require a new
production database migration. Keep the current deployment available for rollback
and preserve the coming-soon lock.

This change does not finish signup, real search, selected-pro inquiries, official
offers, checkout, payment events, completion, refunds, payouts or reviews. It does
not prove production connectivity, create a full backup or approve live payments.
The roadmap remains **27/100 and NO-GO for real-money beta** pending release and
application launch gates.

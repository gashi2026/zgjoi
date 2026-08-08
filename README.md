# Zgjoi 🐝

Zgjoi ("beehive" in Albanian) is a Kosovo-based service marketplace where
customers find trusted local professionals — electricians, plumbers, cleaners,
painters, builders, gardeners, movers and repair specialists.

Built with **Next.js 14 (App Router) + React + TypeScript + Tailwind CSS +
lucide-react**, entirely in Albanian, with a premium white-and-gold honeycomb
visual identity.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Backend

The database, authentication, escrow payments and live support chat are
scaffolded and documented in **BACKEND.md** — read that before deploying with
real data.

## Deploying

See **DEPLOY.md** for step-by-step hosting instructions (Vercel, Netlify,
Cloudflare, VPS) and what still needs a backend.

Static design previews (open directly in a browser, no install) are in
`preview/`.

## Routes (34 pages)

### Public site
| Route | Page |
|---|---|
| `/` | Homepage — hero honeycomb, category belt, steps, pro belt, reviews |
| `/kategorite` | All service categories |
| `/kerko` | Search with filters, sorting, loading and empty states |
| `/si-funksionon` | How it works |
| `/profesionistet` | For professionals — commission, escrow, banking |
| `/rreth-nesh` | About, the idea, founder profile |
| `/hyr` | Login (client / professional toggle) |
| `/regjistrohu` | Client signup |
| `/regjistrohu-profesionist` | Professional signup — 3-step wizard |
| `/profesionisti/[id]` | Public professional profile |

### Customer portal
| Route | Page |
|---|---|
| `/llogaria` | Dashboard |
| `/kerkesa-e-re` | Service request wizard (questions vary by category) |
| `/llogaria/kerkesat` | My requests |
| `/llogaria/ofertat` | Compare quotes side by side |
| `/llogaria/mesazhet` | Inbox / chat |
| `/llogaria/rezervimi` | Booking — schedule, address, milestones |
| `/llogaria/pagesa` | Checkout, invoice, escrow |
| `/llogaria/vleresim` | Review and rating (releases payment) |
| `/llogaria/te-preferuarit` | Saved professionals |
| `/llogaria/cilesimet` | Account settings |

### Professional portal
| Route | Page |
|---|---|
| `/pro/paneli` | Dashboard |
| `/pro/kerkesat` | Lead board |
| `/pro/oferta` | Quote builder with commission preview |
| `/pro/punet` | Jobs and payout status |
| `/pro/kalendari` | Month calendar and working hours |
| `/pro/mesazhet` | Inbox |
| `/pro/te-ardhurat` | Earnings, commission split, bank details |
| `/pro/buxheti` | Weekly lead budget and targeting |
| `/pro/profili` | Profile, services, reviews |

### Admin
| Route | Page |
|---|---|
| `/admin` | Volume, growth, pending verifications |
| `/admin/perdoruesit` | User and pro management |
| `/admin/kategorite` | Categories and dynamic questionnaires |
| `/admin/transaksionet` | Ledger, commissions, disputes |
| `/admin/vleresimet` | Review moderation queue |

## Data

All content is mock data in `lib/`:
`data.ts` (categories, cities, professionals, reviews),
`account.ts` (dashboards, quotes, chat, bookings, payouts),
`admin.ts` (platform metrics, users, transactions, flagged reviews),
`wizard.ts` (per-category questionnaires).

## Not yet built

No authentication, database, payment processing or email. Every page is
publicly reachable by URL, including `/admin`. See DEPLOY.md section 5.

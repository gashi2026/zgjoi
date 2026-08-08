# Backend — udhëzues i plotë

Ky dokument shpjegon çfarë u ndërtua, si ta ngresh dhe çfarë mbetet.

---

## 1. Çfarë ka brenda

| Shtresa | Skedarët | Çfarë bën |
|---|---|---|
| Baza e të dhënave | `prisma/schema.prisma` | 22 tabela: përdorues, profile, kërkesa, oferta, pagesa, vlerësime, biseda, mbështetje, audit |
| Lidhja | `lib/server/db.ts` | Klienti Prisma (një instancë e vetme) |
| Enkriptimi | `lib/server/crypto.ts` | AES-256-GCM për numrin personal dhe IBAN |
| Autentikimi | `lib/server/auth.ts` | Fjalëkalime me bcrypt, sesione me cookie httpOnly |
| Mbrojtja e faqeve | `middleware.ts`, `lib/server/guard.ts` | `/llogaria`, `/pro`, `/admin` kërkojnë hyrje |
| Validimi | `lib/validation.ts` | Zod — të njëjtat rregulla në klient dhe server |
| Veprimet | `app/actions/*.ts` | Regjistrim, hyrje, kërkesa, oferta, vlerësime |
| Pagesat | `lib/server/stripe.ts`, `app/api/stripe/webhook` | Escrow me capture manual |
| Mbështetja live | `components/SupportChat.tsx`, `app/actions/support.ts` | 09:00–17:00 kohë Kosove |
| Paneli i agjentit | `/admin/mbeshtetja` | Radha e bisedave, përgjigje direkte |
| Kufizimi | `lib/server/rate-limit.ts` | Mbron hyrjen dhe chat-in nga abuzimi |

---

## 2. Ngritja — hap pas hapi

### 2.1 Baza e të dhënave (Supabase, falas)

1. Shko te **supabase.com** → **New project**.
2. Vendos një emër dhe një fjalëkalim të fortë. Ruaje fjalëkalimin.
3. Prit ~2 minuta derisa projekti të ngrihet.
4. **Project Settings → Database → Connection string → URI**.
5. Kopjo dy adresa:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL`
   - **Direct connection** (porta 5432) → `DIRECT_URL`

### 2.2 Çelësi i enkriptimit

Numri personal dhe IBAN-i ruhen të enkriptuar. Gjenero një çelës:

```bash
openssl rand -hex 32
```

Nëse nuk ke terminal, përdor https://generate.plus/en/hex (64 karaktere).

### 2.3 Variablat në Vercel

**Project → Settings → Environment Variables**, shto:

| Emri | Vlera |
|---|---|
| `DATABASE_URL` | nga Supabase (pooler) |
| `DIRECT_URL` | nga Supabase (direct) |
| `ENCRYPTION_KEY` | 64 karaktere hex |
| `NEXT_PUBLIC_APP_URL` | `https://zgjoi.vercel.app` |
| `SEED_ADMIN_EMAIL` | email-i yt |
| `SEED_ADMIN_PASSWORD` | një fjalëkalim i fortë |

Stripe lëre bosh për momentin — aplikacioni punon në modalitet demo.

### 2.4 Krijimi i tabelave

Në kompjuterin tënd, me `.env` të plotësuar:

```bash
npm install
npx prisma db push      # krijon tabelat
npx prisma db seed      # kategoritë, pyetësorët, llogaria admin
```

Kontrolloji me `npx prisma studio` (hapet në shfletues).

---

## 3. Pagesat me escrow — dy strategji

Nuk ka një mënyrë të vetme që funksionon për çdo punë. Kufizimi vendimtar
është teknik: **një rezervim karte skadon pas 7 ditësh**. Prandaj strategjia
zgjidhet automatikisht sipas kohëzgjatjes që deklaron profesionisti në ofertë
(`Quote.expectedDays`).

| | Punë e shkurtër (≤ 5 ditë) | Punë e gjatë (> 5 ditë) |
|---|---|---|
| Strategjia | `AUTH_HOLD` | `DESTINATION_CHARGE` |
| Në Stripe | `capture_method: "manual"` | pagesë e menjëhershme + `transfer_data.destination` |
| Ku janë paratë | te klienti, të ngrira | në ledger-in e profesionistit, të bllokuara |
| Çka i tërheq | `paymentIntents.capture()` | `payouts.create()` në llogarinë e lidhur |
| Afati i fortë | 7 ditë — pastaj rezerva bie | ~90 ditë — duhet liruar ose rimbursuar |

### 3.1 AUTH_HOLD — rezervim

1. Klienti pranon ofertën → `PaymentIntent` me `capture_method: "manual"`.
2. Klienti fut kartën → shuma **ngrihet**, nuk tërhiqet. `state = AUTHORISED`.
3. Klienti konfirmon punën → `capture()` → paratë lëvizin. `state = RELEASED`.
4. Nëse puna nuk kryhet brenda 7 ditësh, rezerva bie vetvetiu.

Përparësia: klienti nuk e ndien pagesën derisa puna të kryhet.
Kufizimi: 7 ditë, pa përjashtim.

### 3.2 DESTINATION_CHARGE — tërhiqet dhe mbyllet

1. Klienti pranon ofertën → pagesa procesohet **menjëherë**.
2. Paratë shkojnë në llogarinë Connect të profesionistit, minus komisioni
   (`application_fee_amount`).
3. Llogaria e profesionistit konfigurohet me **payouts manuale**
   (`settings.payouts.schedule.interval = "manual"`). Kjo është e gjithë
   mbyllja: profesionisti i sheh paratë, por nuk mund t'i tërheqë.
4. Klienti konfirmon → `payouts.create()` në llogarinë e lidhur → paratë
   kalojnë në bankë.

Kërkesë: çdo profesionist duhet të kalojë onboarding-un e Stripe Connect
Express përpara se të pranojë punë të gjata. Nëse nuk e ka, `beginEscrow()`
e refuzon dhe e shpjegon.

### 3.3 Rojtari i afateve (kritik)

`app/api/cron/escrow/route.ts` ekzekutohet çdo orë (`vercel.json`). Pa të,
paratë humbasin në heshtje — dhe ky është dështimi më i keq i mundshëm:
klienti mendon se ka paguar, profesionisti nuk merr asgjë.

Çka bën:

1. **36 orë para skadimit të rezervës** — njofton të dy palët.
2. **Pas skadimit** — anulon rezervën te Stripe dhe vendos `state = EXPIRED`,
   që gjendja te ne të mos gënjejë.
3. **Pas 75 ditësh në ledger** — njofton se puna duhet mbyllur.
4. **7 ditë para afatit 90-ditor** — i numëron për ndërhyrje administrative.

Shto `CRON_SECRET` në Vercel që endpoint-i të mos thirret nga jashtë.

### 3.4 Konfigurimi i Stripe

1. Llogari te **stripe.com** → aktivizo **Connect**.
2. Çelësat: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   `https://<domeni>/api/stripe/webhook`
   Ngjarjet: `payment_intent.amount_capturable_updated`,
   `payment_intent.succeeded`, `payment_intent.canceled`,
   `charge.refunded`, `account.updated`.
4. Kopjo `STRIPE_WEBHOOK_SECRET`.

> **Kujdes ligjor.** Mbajtja e parave të palëve të treta është veprimtari e
> rregulluar. Modeli me Connect ndihmon sepse profesionisti bëhet palë e
> regjistruar te Stripe, por kjo nuk të liron nga detyrimet vendore.
> Konsulto një jurist para pagesës së parë reale. Verifiko gjithashtu te
> Stripe nëse Kosova mbulohet nga Connect për rastin tënd.

## 4. Mbështetja live 09:00–17:00

Logjika: `lib/support-hours.ts`. Përdor `Europe/Belgrade`, pra ora e verës
llogaritet vetë.

- **Brenda orarit** — pika jeshile, "Mbështetja është online".
- **Jashtë orarit** — pika gri, mesazhi ruhet, shënohet `offline`, dhe
  klienti merr menjëherë përgjigje automatike me kohën e kthimit.
- Agjenti përgjigjet te `/admin/mbeshtetja`; bisedat offline dalin të parat.

Ndryshimi i orarit: `OPEN_HOUR`, `CLOSE_HOUR`, `OPEN_DAYS`.

Chat-i punon me *polling* çdo 5 sekonda, jo websocket — kështu nuk ka
server shtesë për të mbajtur. Për trafik të madh kalo te Pusher ose
Supabase Realtime.

---

## 5. Siguria — çfarë u bë

- Fjalëkalimet: bcrypt me 12 raunde, kurrë në tekst të thjeshtë.
- Sesionet: cookie `httpOnly`, `secure`, `sameSite=lax`, 30 ditë.
- Numri personal dhe IBAN: AES-256-GCM, në bazë ruhen vetëm 4 shifrat e fundit
  të dukshme.
- Hyrja: maksimum 8 përpjekje / 15 minuta për IP.
- Mesazhi i gabimit në hyrje është i njëjtë për email të pasaktë dhe
  fjalëkalim të pasaktë — që të mos zbulohet cili email ekziston.
- Çdo veprim i rëndësishëm shkon në `AuditLog`.
- Faqet private mbrohen dy herë: `middleware.ts` (cookie) dhe `pageGuard()`
  (roli, në server).

### Çfarë mbetet për prodhim
- Verifikim i email-it dhe rikthim i fjalëkalimit (dërgo me Resend).
- 2FA për administratorët.
- Rate limit me Redis (Upstash) nëse ke më shumë se një instancë.
- Politikë privatësie që shpjegon pse mblidhet numri personal (kërkesë ligjore).

---

## 6. Kalimi nga demo në të dhëna reale

Faqet ende lexojnë nga `lib/data.ts`, `lib/account.ts`, `lib/admin.ts`.
Zëvendësimi bëhet një faqe në kohë:

```ts
// para
import { professionals } from "@/lib/data";

// pas
import { db } from "@/lib/server/db";
const professionals = await db.proProfile.findMany({
  where: { verification: "APPROVED" },
  include: { user: { select: { name: true, city: true } } },
});
```

Rendi i rekomanduar:
1. `/hyr` dhe të dy faqet e regjistrimit → `app/actions/auth.ts`
2. `/kerkesa-e-re` → `createRequest`
3. `/pro/kerkesat` dhe `/pro/oferta` → `openLead`, `sendQuote`
4. `/llogaria/ofertat` → `acceptQuote`
5. `/llogaria/vleresim` → `submitReview`
6. Panelet dhe admin-i në fund

Formularët ekzistues janë ndërtuar me `useState` — lidhja bëhet duke
zëvendësuar `onClick` me `useActionState` dhe veprimin përkatës.

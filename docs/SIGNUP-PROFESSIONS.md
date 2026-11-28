# Sign-up wizard, several professions per pro, prices in the profile panel

Owner request (27 Nov 2026): "the id verification has to be when you are signing up not after and for pros
they should be able to select multiple professions and no one puts prices before hand it should be in the
panel of their profile".

## Sign-up wizard
- Customer `/regjistrohu`: **1 Account** (name, email, password, city, terms) → **2 ID**.
- Pro `/regjistrohu-profesionist`: **1 Account** → **2 Professions** (one to five, honeycomb picker, plus
  "about" and optional years of experience; **no price**) → **3 ID**.
- The account is created when the last step before the ID is sent (`POST /api/auth/register`). It is
  created with `User.signupStep = "ID"` and the browser goes to `/regjistrohu/identiteti`, the same
  ID upload form as `/verifikimi` (ID card front + back, or passport photo page, consent).
- The ID step cannot be skipped: `pageGuard` (every account page) and login send a user with
  `signupStep = "ID"` back to it; `/regjistrohu/identiteti` is login-protected in `proxy.ts`.
  Returning mid-wizard (closed the tab, logged in later) resumes at the ID step.
- Sending the photos clears `signupStep` (audit `SIGNUP_COMPLETED`) and shows "Sign-up complete".
  Manual approval afterwards is unchanged (`/admin/verifikimi`, 18+ checked on approval).
- Why not upload the photos in the same request as the account: two photos are up to 4 MB together,
  close to the Vercel request limit, and a failed photo would lose the whole form. Creating the account
  first and gating it is simpler and lets the user retry photos without retyping anything.
- Existing users (`signupStep` null) keep today's banner and `/verifikimi` page.
- Only while ID uploads are on (`DOCUMENT_UPLOADS_ENABLED=true` + valid `ENCRYPTION_KEY`). With the switch
  off sign-up has no ID step and nobody is redirected.

## Several professions per pro (`ProCategory`)
- One row per profession: canonical `categorySlug`, optional `priceFromCents`, `position` (0 = main),
  `approvedAt`. `ProProfile.categorySlug` (main) and `ProProfile.priceFrom` (lowest price, nullable)
  are kept in sync as a summary for sorting and older code paths.
- **Approval per profession**: a row is public only once `approvedAt` is set. Approving the profile
  (`PRO_APPROVE`) approves every row in an active catalogue category. A pro who is already approved and
  adds a profession stays visible in the old ones; the new one waits (admin gets a notification; the
  button on `/admin/perdoruesit` reads "Approve new professions"). Removing or re-ordering a profession,
  or changing a price, needs no approval. Name/description changes still send the profile back for review.
- Search, category filter, favourites, sitemap and public profile match any approved profession. A card
  shows the profession searched for (else the main one) and its price.
- Public profile lists every profession with its price or **"Ask for a price"**; with more than one,
  each has its own Start chat / Book now / estimate buttons (`?kategoria=`).
- Chat, Book now and estimate requests carry `categorySlug`; the server uses it only when the pro
  offers (approved) it, else the main profession (`resolveProCategory`). Commission, elite and
  recurring checks use "the pro still offers this category" instead of "it is their only category".
- Book now: one hourly rate per pro, offered in each of their professions that has Book now.
- Legacy categories outside the catalogue (e.g. `trainer-personal`) get no row; that pro sees an empty
  professions list and must pick one before the profile can be approved (admin page shows a warning).

## Prices
- Never asked at sign-up (customers or pros) nor when an admin creates a pro.
- Profile panel `/pro/profili#profesionet` ("Professions and prices"): optional "price from" per profession.
- No price: cards and profile say "Ask for a price"; customers start a chat and the pro sends an offer.
- A price is **not required** for profile approval (owner decision pending; see the PR).
- Search with a maximum price only shows pros with a price at or under it in that profession; sort by
  price puts pros without a price last.

## Database
`supabase/staging/pro-categories-signup.sql` / `supabase/production/20261130_pro_categories_signup.sql`
(NOT applied to staging or production). Additive: new table `ProCategory` (RLS on) backfilled from each
`ProProfile` (alias slugs mapped, approved if the profile is approved), `User.signupStep` (nullable),
`ProProfile.priceFrom` becomes nullable. Apply before this code reaches the environment.
Rollback note: once a pro has signed up without a price, `priceFrom` is NULL; older code would show it badly, so roll back with Vercel instant rollback only before new pro sign-ups, or set a price first.

## Minimum hours (per profession)

- Each profession row (`ProCategory.minMinutes`, 30-minute steps, 0.5–12 h) has its own minimum, editable any time in
  `/pro/profili#profesionet` together with the price and order — before or after approval, with no re-review.
- Book now professions always have a minimum (the field has no "none" option); other professions may leave it empty
  ("No minimum"), and when set it is shown on the public profile only.
- Book now uses the profession's minimum, else the pro's `ProProfile.bookingMinMinutes` (set to 2 h when a first rate is
  saved). Existing pros therefore keep today's minimum until they change it — no backfill.
- Enforced server-side in `createBooking` (`checkHours`), in recurring proposals, and in the duration list on
  `/rezervo-tani` (it starts at the minimum). The hourly rate stays one per pro.

## Pricing per profession (owner decision, replaces the single per-pro rate)

- Each profession row has its own optional **minimum price** (`priceFromCents`, the "from" price), **hourly rate**
  (`ProCategory.hourlyRateCents`, €1–€1,000) and **minimum hours** (`minMinutes`), all editable any time in
  `/pro/profili#profesionet` with no re-review. There is no single per-pro rate form any more.
- Book now (one on/off switch per pro, `ProProfile.bookNowEnabled`) is available for a profession only when it is a
  Book now category AND has an hourly rate; it charges that profession's rate × hours with that profession's minimum.
  Recurring proposals and estimate credits go through the same per-profession terms; an existing series keeps the
  rate it started with.
- Backward compatibility: a profession without a rate falls back to the legacy `ProProfile.hourlyRateCents`, so existing
  Book now pros keep working with no SQL backfill. The panel pre-fills that rate on their Book now professions, and the
  first save of the professions panel moves it onto the rows and clears the legacy value (Book now switch unchanged).
- Public profile: each profession card shows minimum price (or "Ask for a price"), hourly rate and minimum hours.
  Search cards show the searched profession's rate, else the pro's lowest.
- Accepted defaults: no price or rate needed for approval; a newly added profession needs its own approval; max 5.

## Kurse subjects (Valle is under Kurse)
- 13 categories. Valle is no longer a category: it is a Kurse subject. Kurse opens into subjects
  (`kurseSubjects` in `lib/service-categories.ts`): Anglisht, Gjermanisht, Frëngjisht, Italisht, Matematikë,
  Fizikë & Kimi, Programim, Përgatitje për provime (Matura), Muzikë, Këndim, Vallëzim, Balet, Valle popullore,
  Art & vizatim, Teori për patentë shoferi, Lëndë tjetër.
- Code only, no schema change: a subject is a profession row with the slug `kurse-<subject>` (a string in
  `ProCategory.categorySlug`). Each subject has its own price, rate and minimum hours and its own approval.
  Requests, hiring paths and commission still resolve to the parent `kurse` (`serviceCategory()`); the
  subject is only used to match and label the pro (`professionSlug()`, `professionLabel()`).
- A pro may pick up to 5 categories; every Kurse subject counts as the one category Kurse (at most 12 rows in all).
- Old slugs keep working: `valle` becomes Kurse · Valle popullore, `balet` Kurse · Balet, `vallezim` and `vallzim`
  Kurse · Vallëzim, `tutor` plain Kurse. Rows stored with an old slug are matched and shown correctly and are
  rewritten to the subject slug (approval kept) the next time the pro saves their professions. `/kerko?kategoria=valle`
  opens the Traditional dance results.
- Where the dropdown appears: the search filter (grouped `<optgroup>` plus subject chips), `/kategorite`
  (Kurse expands), the home search suggestions, pro sign-up (tap Kurse, then pick subjects), the profile
  "Professions and prices" panel and the admin professions form.

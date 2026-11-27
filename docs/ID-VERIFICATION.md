# Identity verification (front + back ID photo, approved by hand)

Every customer and pro uploads the front and back of an ID document. The owner approves or
declines each one at `/admin/verifikimi`. No hired staff and no third-party KYC service.

## How it works
- **Upload** `/verifikimi` (customers and pros; staff are never asked). New sign-ups land here
  (`/verifikimi?fillim=1`); existing users see a banner on every account page.
  Camera capture (`capture="environment"`) or gallery; JPEG, PNG or HEIC. The browser redraws
  the photo to a JPEG of at most 1800 px / 2 MB (which also strips EXIF/GPS). The server
  re-checks the real type and size from the bytes (JPEG/PNG only, ≥ 400 px, ≤ 2 MB per side,
  HEIC gets a clear message), refuses the same photo twice, and rate-limits uploads.
- **Storage** `IdDocumentImage.dataEnc`: AES-256-GCM with the existing `ENCRYPTION_KEY`,
  in Postgres, RLS on, no browser-role grants. There is no public or signed URL. Photos are
  only streamed to an ADMIN through `GET /api/admin/verifikimi/[id]/FRONT|BACK`
  (`private, no-store`, integrity-checked, every view audited as `ID_IMAGE_VIEWED`).
- **Statuses** `PENDING → APPROVED | DECLINED`. Decline needs a preset Albanian reason
  (`ID_DECLINE_REASONS` in `lib/id-verification.ts`) plus optional free text (required for
  "Arsye tjetër"). A declined user can re-upload (new attempt, back of the queue; old photos
  deleted and logged). A pending user can replace photos without losing their place.
- **Notifications** on-site notification for every decision; an email too when job emails
  are enabled (`JOB_EMAILS_ENABLED`, email delivery, `APP_URL`, and the user's preference).
  The email never contains the reason or any ID data, only a link to `/verifikimi`.
- **Gating** (only while enforcement is on, see below):
  - pros without an approved ID are hidden from search, profile pages, favourites, the
    sitemap and the homepage count, cannot be booked/contacted, and cannot send offers or
    propose recurring series;
  - customers without an approved ID can browse but cannot start a chat, hire (accept an
    offer), Book now, request an estimate, request/confirm/resume a recurring series;
  - ADMIN and SUPPORT are never gated.
- **Audit** `ID_SUBMITTED`, `ID_APPROVED`, `ID_DECLINED` (reason, note), `ID_IMAGE_VIEWED`,
  `ID_IMAGES_DELETED` (reason `RETENTION`, `REPLACED_AFTER_DECLINE`, `REPLACED_WHILE_PENDING`).
- **Retention** (owner, 26 Nov 2026) constants in `lib/id-verification.ts`: photos are
  deleted 30 days after ANY decision (`ID_RETENTION_DAYS_AFTER_APPROVAL = 30`,
  `ID_RETENTION_DAYS_AFTER_DECLINE = 30`). The decision, dates and the identity record stay. Deletion runs in the existing daily cron `/api/cron/recurring` (the plan allows
  two crons, both already used) and every deletion is logged.

## Permanent identity record (for authorities)
- Table `IdentityRecord` (one per user, FK `ON DELETE RESTRICT`, RLS on, service role only).
- Filled by the reviewer from the document when approving; approval is refused without:
  legal full name, date of birth, document type (ID card / passport), document number,
  issuing country, expiry date. Validation: real dates, age ≥ `ID_MIN_AGE_YEARS` (18),
  document not expired (Kosovo date).
- Date of birth and document number are AES-256-GCM encrypted with `ENCRYPTION_KEY`
  (`birthDateEnc`, `documentNoEnc`); only the last 4 characters of the number are kept in
  clear for searching. Verified date and who verified are stored on the record; decisions,
  reasons and every attempt come from `IdVerification` + `AuditLog`.
- Never touched by the photo cleanup.
- Pages: `/admin/verifikimi/regjistri` (search by name, email, last 4; no decrypted data)
  and `/admin/verifikimi/regjistri/<userId>` (full record + history). `?eksport=1` opens a
  printable sheet and the print dialog (Save as PDF) to hand to authorities.
- Access: ADMIN, or SUPPORT with the per-user grant (checked on every request).
  Audit: `ID_RECORD_CREATED`, `ID_RECORD_VIEWED`, `ID_RECORD_EXPORTED` (no plaintext in audit).

## Enforcement switch
Enforcement and uploads are on only when `DOCUMENT_UPLOADS_ENABLED=true` **and**
`ENCRYPTION_KEY` is a valid 64-hex key. With the switch off nothing is gated and the upload
page says uploads are not available yet, so merging this code cannot lock anyone out.

## What production needs (nothing here has been done)
1. Apply `supabase/production/20261128_id_verification.sql` (additive: three new tables, RLS on, plus `User.canReviewIds`)
   **before** this code reaches `main`. Take a backup first, as for previous rollouts.
2. No Supabase Storage bucket is needed. `ENCRYPTION_KEY` already exists in production and
   must stay the same (rotating it makes stored ID photos unreadable).
3. With the owner's approval, set `DOCUMENT_UPLOADS_ENABLED=true` (Production; and Preview to
   test on staging) and redeploy. From then on every customer and pro, including existing ones,
   must upload and be approved before booking or appearing in search.
   Note: the same switch also enables the older pro certificate upload, which additionally
   needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the private `zgjoi-pro-documents`
   bucket; without them that older form just says it is unavailable.
4. Optional: decision emails need `JOB_EMAILS_ENABLED=true`, email delivery and `APP_URL`.
5. Capacity: about 0.3–1.2 MB per user while photos are kept. On the free plan (500 MB
   database) that is roughly 400–1,500 users with photos at the same time; retention keeps it
   bounded.

# VendorVerse backend

The backend is a TypeScript/NestJS modular monolith (D-016). Implemented slices
include authentication/accounts, geography, taxonomy, vendor onboarding,
listings/availability, files, notifications and vendor verification. It is not
production-ready: OTP delivery is not integrated, the fixed OTP adapter is
local/test-only, and privileged accounts fail closed until MFA exists.
BUSINESS mode still requires business-account persistence. Platform audit,
outbox, rate-limit and Idempotency-Key plumbing exists in `src/platform/`;
writes use audit selectively, notifications enqueue outbox events, and an
in-process dispatcher drains them (no separate worker yet).

## Local setup

1. Use Node.js 20 or newer and PostgreSQL 16.
2. Create a database (a hosted one such as Render works; set `DATABASE_SSL=true`
   for it, `false` for a local server).
3. Copy `.env.example` to `.env` and supply every required value (`CORS_ORIGINS` is a comma-separated list of the web and mobile
   dev-server origins allowed to call the API). Authentication
   lifetimes and request/verification limits have no code defaults; select
   values for the local environment rather than copying arbitrary production
   policy.
4. Install dependencies with `npm install`, apply the migrations with
   `npm run db:migrate` (applies `db/migrations/*.up.sql` in order and records
   them with a checksum in `schema_migrations`; safe to re-run), then run
   `npm run start:dev`. See "Database" below for status, rollback and verification.

The local/test OTP is `123456`; it is not sent by SMS or email. The application
rejects non-local/test configuration and `NODE_ENV=production` while this
provider is selected. The process binds to `127.0.0.1` unless `HOST` is set (a hosting platform needs
`HOST=0.0.0.0`). Because the fixed OTP lets anyone sign in as any phone number or
email, do not expose this service publicly, and note it refuses to start with
`NODE_ENV=production`. Once the service starts, open the interactive API
reference at `http://127.0.0.1:<PORT>/docs` (replace `<PORT>` with the `PORT`
value in `.env`). The OpenAPI JSON is available at `/docs-json`.

## Implemented routes

These routes are also listed in Swagger UI at `/docs`.

- `GET /v1/health/live`
- `GET /v1/health/ready`
- `POST /v1/auth/otp/request`
- `POST /v1/auth/otp/verify`
- `POST /v1/auth/mfa/verify` (returns 503; no MFA method is implemented)
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/me`
- `POST /v1/me/mode`
- `GET /v1/me/sessions`, `DELETE /v1/me/sessions/{sessionId}` (F-ACC-08)
- `GET|PUT /v1/me/notification-preferences` (F-ACC-07)
- `POST /v1/files` (declare a file, get a signed upload URL), `POST /v1/files/:id/complete`, `GET /v1/files/:id`, `GET /v1/files/:id/download-url` (clean files only). Files are private and owner-only; verification reviewers can get a short-lived URL only for clean evidence attached to a verification.
- `GET /v1/me/notifications`, `GET /v1/me/notifications/unread-count`, `POST /v1/me/notifications/:id/read`, `POST /v1/me/notifications/read-all` (F-MSG-04)
- `GET|POST /v1/me/data-requests`, `POST /v1/me/data-requests/{requestId}/cancel` (F-ACC-04, F-ACC-05; records the request only, no verification or fulfilment)
- `POST /v1/vendors`, `GET /v1/vendors/mine`, `GET|PATCH /v1/vendors/{vendorId}` (F-VND-01, F-VND-02; owner only; creates a registered, unpublished vendor)
- `POST /v1/vendors` also takes `roleCodes` (more vendor roles; `businessType` is the primary role), and every vendor view lists its `roles` with status (D-023). Role codes are checked against the role catalogue, not a fixed list (D-024)
- `GET /v1/vendors/{vendorId}/public` (F-VND-09; no sign-in; shows only verified roles and answers 404 for a vendor with none, D-020, D-021; ratings, response metrics and publication gates are not part of it yet)
- `GET /v1/vendor-roles` (the active role catalogue with the documents each role requires)
- `GET|POST /v1/vendors/{vendorId}/roles`, `DELETE /v1/vendors/{vendorId}/roles/{roleCode}` (owner only; a role starts `pending`, only `verified` roles are public, a vendor keeps at least one role; D-020, D-021)
- `GET /v1/admin/vendor-role-reviews?status=`, `POST /v1/admin/vendor-role-reviews/{vendorId}/{roleCode}/decision` (requires `verification.review`; verify, reject or revoke with a required reason; reviewers cannot decide on their own vendor)
- `GET|POST /v1/admin/vendor-roles`, `PATCH /v1/admin/vendor-roles/{code}` (requires `vendor_roles.manage`; adding or retiring a kind of vendor is configuration, D-024)
- `GET|POST /v1/vendors/{vendorId}/documents` (private evidence metadata; uploaded and clean files only)
- `GET|POST /v1/vendors/{vendorId}/verifications` (F-VND-03; L1-L3 submissions, category-specific requests, evidence references, history and resubmission links)
- `GET /v1/admin/verifications?status=`, `POST /v1/admin/verifications/{verificationId}/decision`, `GET /v1/admin/verifications/{verificationId}/evidence/{fileId}/download-url` (F-VND-03; requires `verification.review`, reason required and audited, owner cannot review own vendor)
- `GET /v1/geo/countries`, `/geo/regions?countryCode=`, `/geo/cities?countryCode=&regionId=` (with launchStatus), `/geo/localities?cityId=` (F-GEO-01, F-GEO-02; public)
- `GET|POST /v1/vendors/{vendorId}/service-areas`, `DELETE /v1/vendors/{vendorId}/service-areas/{areaId}` (F-GEO-06; owner only; city, pincode, region, country, radius or remote, never worldwide)
- `POST|GET /v1/vendors/{vendorId}/listings`, `GET|PATCH /v1/listings/{listingId}`, `POST /v1/listings/{listingId}/submit|pause|resume|unpublish` (F-VND-06; owner only; drafts are never public)
- `GET /v1/vendors/{vendorId}/publication-gates?listingId=` (F-VND-05; computed live, never stored; gates whose module is missing report `met: null`)
- `GET|PUT|DELETE /v1/listings/{listingId}/availability`, `GET|POST /v1/listings/{listingId}/capacity`, `DELETE /v1/listings/{listingId}/capacity/{windowId}` (F-VND-08)
- `GET /v1/me/waitlist`, `POST|DELETE /v1/geo/cities/{cityId}/waitlist` (F-GEO-02)
- `GET /v1/admin/roles`, `GET|POST /v1/admin/users/{userId}/roles`, `DELETE /v1/admin/users/{userId}/roles/{roleCode}` (F-ADM-04; needs `rbac.read` / `rbac.manage`; only SALES_AGENT and SUPER_ADMIN are assignable; reason required and audited; you cannot change your own roles; the last Super Admin cannot be revoked)
- `GET /v1/admin/taxonomy/categories?industryId=&lifecycle=`, `GET|PATCH /v1/admin/taxonomy/categories/{id}`, `POST /v1/admin/taxonomy/categories`, `POST .../categories/{id}/lifecycle|merge`, `PUT /v1/admin/taxonomy/industries/{id}/category-order`, `POST .../categories/{id}/subcategories`, `PATCH .../subcategories/{id}` (F-TAX-02; needs `taxonomy.manage`; new categories start as Draft, so activate one and set a `marketRules` entry before it shows in public browse)
- `POST /v1/rfqs`, `GET /v1/me/rfqs`, `GET /v1/vendors/{vendorId}/rfqs`, `GET /v1/rfqs/{rfqId}`, `POST /v1/rfqs/{rfqId}/open|revisions|extend-deadline` (F-RFQ-01, F-RFQ-05, F-RFQ-06; customer-owned; RFQ revisions are immutable and the caller supplies the deadline and recipient vendor IDs)
- `GET|POST /v1/rfqs/{rfqId}/quotes`, `POST /v1/quotes/{quoteId}/revisions|withdraw`, `POST /v1/rfqs/{rfqId}/quotes/{quoteId}/accept` (F-RFQ-02 to F-RFQ-04; invited vendors only; goods quotes include validated line items; acceptance is serialized, snapshots accepted terms, marks competing submitted quotes unsuccessful, and atomically creates the configured fulfillment)
- `POST /v1/rfqs/{rfqId}/expire`, `GET /v1/rfqs/{rfqId}/vendor-suggestions`, `GET /v1/me/work-orders`, `GET /v1/vendors/{vendorId}/work-orders`, `GET /v1/work-orders/{workOrderId}`, `POST /v1/work-orders/{workOrderId}/actions` (RFQ deadline/no-quote and work-order operations)
- `POST /v1/bookings`, `POST /v1/booking-series`, `GET /v1/me/bookings`, `GET /v1/vendors/{vendorId}/bookings`, `GET /v1/bookings/{bookingId}` and its events/actions/cancel/modification/completion/conflict routes (F-BKG-01 to F-BKG-09; idempotency key required for creation)
- `POST /v1/contracts`, `GET /v1/me/contracts`, `GET /v1/vendors/{vendorId}/contracts`, `GET /v1/contracts/{contractId}` and version/accept/decline/milestone routes (F-CON-01, F-CON-02; contract proposals require category configuration)
- `GET /v1/me/purchase-orders`, `GET /v1/vendors/{vendorId}/purchase-orders`, `GET /v1/purchase-orders/{orderId}`, `POST /v1/purchase-orders/{orderId}/actions`, and dispute routes (F-GDS-03, F-GDS-04, F-GDS-06; orders arise from accepted goods RFQs; no payment APIs or funds movement)
- `GET /v1/taxonomy/industries?countryCode=`
- `GET /v1/taxonomy/categories?countryCode=&industryId=`
- `GET /v1/taxonomy/categories/{categoryId}?countryCode=`

The taxonomy routes are public (F-TAX-01, F-TAX-08). They return Active categories whose
`marketRules` enable the requested market (most specific country/region/city rule wins) and
that a Super Admin marked always-show. The eligible-listings rule is not applied yet because
the listings module does not exist, so a category without always-show is hidden. Industries
come from `npm run db:seed` (the ten Phase 1 industries of F-TAX-05); categories are created by
the admin taxonomy builder (F-TAX-02) above, so none exist until a Super Admin creates and activates them.

Verification expiries and evidence requirements are recorded when supplied;
the API does not invent expiry periods or evidence checklists. File uploads and
downloads still fail closed until storage policy and providers are configured.
The web and mobile verification screens do not yet call these APIs. The role screens do not call the roles APIs yet either; mobile onboarding sends `roleCodes` to `POST /v1/vendors`.

The transaction APIs now cover RFQs and quotes, bookings, work orders,
contracts and purchase orders. Service RFQs use the category's
`rfqFulfillmentType` (`booking`, `work_order`, or `contract`); goods RFQs create
purchase orders. RFQ attachments require uploaded, scan-clean files; real
storage/scanner providers and client wiring remain outstanding. Notification
delivery is not implemented for these workflows. Automatic booking, work-order
and contract milestone closure methods need scheduler integration. Payment APIs
are excluded; O-06 and O-08 remain open and are not implemented.

Mode switching supports CUSTOMER and VENDOR when a vendor record is owned by
the identity. BUSINESS returns 409 until its separately verified account
model is implemented. Authenticated requests validate both the JWT and its
persisted, unrevoked session.

## Platform plumbing

`src/platform/` holds the cross-cutting pieces every module reuses:

- **Correlation id**: every response carries `correlation-id`; the audit service stamps it on each event.
- **Audit** (`AuditService.record`): appends to `audit_events`; pass the transaction client so the event commits with the change.
- **Outbox** (`OutboxService.enqueue`): writes `outbox_events` in the caller's transaction. `OutboxDispatcherService` drains them in-process every 2 seconds (skipped when `APP_ENV=test`): rows are claimed with `FOR UPDATE SKIP LOCKED`, handlers register by `event_type`, a failure retries with exponential backoff (30 s, doubling) and the event is dead-lettered (`dead_lettered_at`) after 8 attempts. Handlers must be idempotent. The batch size, attempt limit and backoff are engineering constants in `outbox-dispatcher.service.ts`, not product values. There is no separate worker process yet.
- **Files** (`src/files/`): `FilesService` keeps metadata only; bytes go to private S3-compatible storage through a short-lived signed URL (`FileStorageProvider`). The storage key is built by the server (`purpose/userId/uuid`). `complete` checks the object exists with the declared size, sets `uploaded_at` and queues `file.uploaded`; `FileScanHandler` (an outbox handler) runs the `FileScanner` and stores `clean`, `infected` or `failed`. A download URL is issued only for a clean file and is audited. Only local/test stand-ins exist (no bytes stored, scanner always clean); no real storage or malware-scan provider is chosen.
- **Notifications** (`src/notifications/`): `NotificationsService.notify` writes the inbox row (deduplicated by `recipient + dedupeKey`) and a `notification.created` outbox event in the caller's transaction. The dispatch handler then creates one `notification_delivery_attempts` row per channel (push, SMS, email) for each active template of the event: user opt-outs are honoured (unset means on), mandatory templates always send, and a channel with no registered provider is recorded as `skipped`. No channel provider exists yet (CFG-07, CFG-10 open).
- **Rate limit** (`RateLimitService`): fixed-window counter; callers pass the maximum and window from configuration.
- **Idempotency**: send `Idempotency-Key` on any write. The same key and request replays the first response (`Idempotent-Replayed: true`); the same key with a different request returns 422; a concurrent duplicate returns 409. A failed attempt frees the key. `IDEMPOTENCY_TTL_SECONDS` and `IDEMPOTENCY_LOCK_SECONDS` have no code defaults; choose values for your environment. Expired keys are replaced on reuse; there is no cleanup job yet.

## Roles and permissions (F-ADM-04)

Protect an admin route with `@RequirePermission("<code>")` (`src/rbac/permission.guard.ts`). It also applies the access-token guard and is **deny by default**: a route that names no permission, or a caller whose active roles lack it, gets 403. Roles are read on every request, so a revoke takes effect at once. Permission codes and the role grants live in `db/seeds/*.sql` (currently `004_rbac_permissions.sql`: SUPER_ADMIN holds `rbac.read` and `rbac.manage`; CUSTOMER and VENDOR hold none because their access is ownership-based; SALES_AGENT holds none until the agents module decides). Each admin module adds its own permission rows when it ships; run `npm run db:seed` after pulling.

The first Super Admin is created from the command line, because the API needs one to exist: the person signs up first, then run `npm run admin:first-super-admin -- phone "<normalized phone>" "<reason>"` (or `email`). It refuses once any Super Admin exists and writes an audit event. Super Admin sign-in is blocked until the MFA method is decided.

## Deploying on Render: required variables

The backend refuses to start if any of these is missing, so a failed deploy usually means one is unset. Secrets must be at least 32 bytes.

| Variable | Value on Render |
|---|---|
| `APP_ENV` | `local` or `test` (the only values accepted while the fixed OTP provider is the only one) |
| `NODE_ENV` | **not** `production` while `OTP_PROVIDER=local-test` (the app refuses to start) |
| `OTP_PROVIDER` | `local-test` until a real provider is chosen |
| `DATABASE_URL`, `DATABASE_SSL` | the Render Postgres URL; `DATABASE_SSL=true` |
| `CORS_ORIGINS` | comma-separated `https://` origins of the deployed web **and** mobile sites (a trailing slash is ignored; a missing origin makes every browser call fail) |
| `HOST` | `0.0.0.0` |
| `PORT` | the port Render routes to |
| `JWT_ISSUER`, `JWT_SECRET`, `OTP_VERIFIER_SECRET`, `SESSION_TOKEN_PEPPER` | your own values; secrets of 32+ bytes |
| `OTP_CHALLENGE_TTL_SECONDS`, `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`, `OTP_REQUEST_WINDOW_SECONDS`, `OTP_REQUEST_MAX`, `OTP_VERIFY_MAX` | no code defaults; owner-chosen policy values |
| `IDEMPOTENCY_TTL_SECONDS`, `IDEMPOTENCY_LOCK_SECONDS` | no code defaults; omitting them failed an earlier deploy |
| `FILE_STORAGE_PROVIDER`, `FILE_MAX_BYTES`, `FILE_ALLOWED_CONTENT_TYPES`, `FILE_UPLOAD_URL_TTL_SECONDS`, `FILE_DOWNLOAD_URL_TTL_SECONDS` | **optional**, owner decisions not made. While any is unset the files API answers 503 (fail closed). `FILE_STORAGE_PROVIDER=local-test` is the only provider and stores no bytes; local/test only. Types are comma-separated MIME types. |

The web and mobile static sites need `VITE_API_BASE_URL=https://<backend>.onrender.com/v1`. Vite reads it **at build time**, so set it, then redeploy (Clear build cache & deploy). Without it the app runs on the in-memory mock: screens look fine, but nothing is saved and a reload loses it. After changing `CORS_ORIGINS`, redeploy the backend. `render.yaml` already sets it for both sites. After any deploy run `node infra/check-deploy.cjs https://<backend>.onrender.com https://<mobile site> https://<web site>`: it checks backend health, the CORS preflight for each site, and that each site's bundle contains the API URL (exit code 1 on any failure).

## Checks

Run `npm run build`, `npm test`, and `npm run lint` from this directory. Tests
use explicit test configuration and do not require a live database.

## Database

PostgreSQL 16. The schema covers the whole Phase 1 scope; the table-by-domain map and the
modelling decisions are in `mobile/docs/deliverables/06-database-architecture-erd.md` (section 10).

| Command | Does |
|---|---|
| `npm run db:migrate` | Applies pending `db/migrations/*.up.sql`. Takes an advisory lock, so two deploys cannot race. |
| `npm run db:status` | Lists applied / pending migrations and flags any applied file that was edited afterwards. |
| `npm run db:seed` | Idempotent reference data: Phase 1 industries, India launch geography (every market **not live**), CFG-01..19 register. |
| `npm run db:rollback` | Reverts the latest migration with its `*.down.sql`. Destructive; needs `ALLOW_DESTRUCTIVE_DOWN=true`. |
| `npm run db:verify` | Applies everything, tries to break the integrity rules, rolls all back and re-applies. **Drops every table**, so it refuses any host except localhost. |

Rules for changing the schema:

- **Never edit an applied migration.** The runner stores a SHA-256 per file and fails if one changes. Add the next numbered migration with a matching `.down.sql`.
- Money is integer minor units plus an ISO-4217 code. Instants are `timestamptz` (UTC); local schedules keep an explicit time zone.
- A vocabulary is a `CHECK` only when the spec or PRS defines it. Anything still open (CFG/O items) is a non-empty `text` column with a comment, so the owner's decision needs no data migration.
- Snapshots, versions and audit rows are protected by `prevent_row_mutation()` triggers. Do not work around them; insert a new version.
- Run `npm run db:verify` against a throwaway local Postgres before opening a PR that touches `db/`.

## Customer profile (F-ACC-06)

All routes need a bearer token and act on the signed-in user only (contract: `packages/api-contract/profile.openapi.yaml`).

| Route | Does |
|---|---|
| `GET /v1/me/profile` | Name, verified phone, contact email, `emailVerified`, customer type, locale. |
| `PATCH /v1/me/profile` | Partial update; `email: null` clears the email. The phone cannot be changed here. |
| `GET/POST /v1/me/locations` | List (default first) and add saved locations. The first one is the default. |
| `PATCH/DELETE /v1/me/locations/:id` | Edit, move the default, or delete. Someone else's id returns 404. |

The email is stored **unverified** and is not a sign-in identifier; verification needs email OTP delivery (CFG-07, open). Name, email and addresses are collected by the Create account screen and saved right after OTP verification; an account that has no name yet is sent to Edit profile after its first sign-in.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-13 12:44 | Amit | Added: booking, contract, purchase-order and RFQ handoff routes | Document the implemented transaction APIs, the category-based handoff and explicit gaps; payment APIs remain out of scope. |
| 2026-11-13 11:16 | Amit | Added: RFQ and quote routes | Document the first transaction API slice and make its current workflow gaps explicit. |
| 2026-11-12 12:01 | Sahil Soni | Added: public vendor read `GET /vendors/{vendorId}/public` | Show only verified roles publicly (D-020, D-021); no public-profile screen calls it yet. |
| 2026-11-12 11:52 | Sahil Soni | Added: vendor roles APIs, role catalogue, role review and the `vendor_roles.manage` permission (migration 016) | Make vendor roles data instead of a fixed list, with role-level verification (D-019 to D-024). |
| 2026-11-10 13:59 | Amit | Added: vendor verification APIs, reviewer permission and API contract | Deliver the F-VND-03 backend slice without guessing evidence requirements or expiry policy. |
| 2026-11-06 15:05 | Shil1517 | Added: files module (signed uploads, scan handler), migration 015, optional FILE_* settings | Foundation work for P1-S1: verification evidence and photo review need private, scanned files. Providers and limits stay open owner decisions. |
| 2026-11-06 13:48 | Shil1517 | Added: outbox dispatcher and notifications core (inbox API, dispatch handler) | Foundation leftovers for P1-S1: events are now delivered, and F-MSG-04 / F-MSG-05 have a backend. |
| 2026-11-05 13:05 | Shil1517 | Added: customer profile and saved-location routes, migration 014, DTO/service tests | F-ACC-06: sign-up collected a name and email but nothing stored them. |
| 2026-11-05 12:16 | Shil1517 | Added: migrations 004-013 (full Phase 1 schema), upgraded migration runner (advisory lock, checksums, status, guarded rollback), `db:verify`, geography and CFG-register seeds; applied to the Render database | Web and mobile need one consistent store before more APIs are built; production runs need safe, auditable migrations. |
| 2026-11-05 11:27 | Shil1517 | Added: optional `HOST` setting (default 127.0.0.1) | A hosted deployment must bind to 0.0.0.0 for the platform router to reach the process; local behaviour is unchanged. |
| 2026-11-05 11:22 | Shil1517 | Added: public taxonomy routes, `npm run db:seed` and the Phase 1 industries seed | Implements the F-TAX-01 / F-TAX-08 public reads from packages/api-contract/taxonomy.openapi.yaml. |
| 2026-11-05 11:11 | Shil1517 | Added: required `CORS_ORIGINS` setting and CORS support | Browser clients (web and mobile mockups) call the auth API from a different origin; only listed origins are allowed. |
| 2026-11-05 11:05 | Shil1517 | Added: `DATABASE_SSL` setting and `npm run db:migrate` runner; migrations 001-003 applied to the Render database | Render requires SSL and the schema had to be created there before clients can connect. |
| 2026-11-05 10:50 | Shil1517 | Added: field-level `errors` in 400 responses, AuthService and error-filter tests; restored `.env.example` | Validation failures were unreadable for clients, auth logic had no tests, and setup step 3 referenced a missing file. |
| 2026-11-05 09:42 | Amit | Added: Swagger API reference instructions | Make the implemented local/test endpoints easy to discover and exercise. |
| 2026-11-04 15:45 | Amit | Modified: local server exposure guidance | Document that the local/test server binds to loopback and should not be exposed publicly. |
| 2026-11-04 15:37 | Amit | Modified: implementation limitations | Explicitly identify unfinished idempotency and audit/outbox work before any production use. |
| 2026-11-04 15:32 | Amit | Added: NestJS backend setup and implementation status | Document the selected stack, local-only authentication limits, configuration, and available routes. |
| 2026-11-05 15:10 | Shil1517 | Modified: platform plumbing and account settings routes | Added audit, outbox, rate-limit and Idempotency-Key services and the sessions, notification-preference and data-request routes. |
| 2026-11-05 15:40 | Shil1517 | Added: vendor onboarding routes | First vendor-supply API slice (become a vendor, own profile). |
| 2026-11-05 16:40 | Shil1517 | Added: geography reads and vendor service-area routes | Coverage declaration (F-GEO-06) needs a location hierarchy to pick from. |
| 2026-11-05 17:30 | Shil1517 | Added: listings, availability, publication-gate and waitlist routes | Next slices of vendor supply (F-VND-05, F-VND-06, F-VND-08) and the F-GEO-02 waitlist. |
| 2026-11-05 16:14 | Shil1517 | Added: roles and permissions routes, permission guard, rbac seed, first-Super-Admin script | F-ADM-04: every admin API needs a deny-by-default permission check and audited role changes. |
| 2026-11-05 16:31 | Shil1517 | Added: admin taxonomy builder routes and taxonomy.manage seed | F-TAX-02: no categories existed, so listings could not be tried end to end. |
| 2026-11-05 16:52 | Shil1517 | Added: Render required-variables checklist | A deploy failed on missing idempotency variables and the deployed apps ran on the mock without the API URL. |
| 2026-11-06 11:37 | Shil1517 | Modified: CORS_ORIGINS parsing ignores trailing slashes | Entries copied from a browser address bar ended in "/" and silently blocked every request from the deployed apps. |
| 2026-11-06 11:50 | Shil1517 | Added: infra/check-deploy.cjs and the API URL pinned in render.yaml | Web and mobile deploys must reach the backend consistently, and the dashboard-only setting had silently left them on the mock or blocked by CORS. |

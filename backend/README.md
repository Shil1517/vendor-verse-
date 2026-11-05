# VendorVerse backend

The backend is a TypeScript/NestJS modular monolith (D-016). This initial
implementation contains the auth/account slice and health endpoints. It is
not production-ready: OTP delivery is not integrated, the fixed OTP adapter is
local/test-only, privileged accounts fail closed until MFA exists, and
BUSINESS mode requires business-account verification persistence. Platform
The audit, outbox, rate-limit and Idempotency-Key plumbing exists in `src/platform/`, but only the account settings writes use the audit trail; no module enqueues outbox events yet and no worker dispatches them.

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
- `GET|POST /v1/me/data-requests`, `POST /v1/me/data-requests/{requestId}/cancel` (F-ACC-04, F-ACC-05; records the request only, no verification or fulfilment)
- `POST /v1/vendors`, `GET /v1/vendors/mine`, `GET|PATCH /v1/vendors/{vendorId}` (F-VND-01, F-VND-02; owner only; creates a registered, unpublished vendor)
- `GET /v1/geo/countries`, `/geo/regions?countryCode=`, `/geo/cities?countryCode=&regionId=` (with launchStatus), `/geo/localities?cityId=` (F-GEO-01, F-GEO-02; public)
- `GET|POST /v1/vendors/{vendorId}/service-areas`, `DELETE /v1/vendors/{vendorId}/service-areas/{areaId}` (F-GEO-06; owner only; city, pincode, region, country, radius or remote, never worldwide)
- `POST|GET /v1/vendors/{vendorId}/listings`, `GET|PATCH /v1/listings/{listingId}`, `POST /v1/listings/{listingId}/submit|pause|resume|unpublish` (F-VND-06; owner only; drafts are never public)
- `GET /v1/vendors/{vendorId}/publication-gates?listingId=` (F-VND-05; computed live, never stored; gates whose module is missing report `met: null`)
- `GET|PUT|DELETE /v1/listings/{listingId}/availability`, `GET|POST /v1/listings/{listingId}/capacity`, `DELETE /v1/listings/{listingId}/capacity/{windowId}` (F-VND-08)
- `GET /v1/me/waitlist`, `POST|DELETE /v1/geo/cities/{cityId}/waitlist` (F-GEO-02)
- `GET /v1/taxonomy/industries?countryCode=`
- `GET /v1/taxonomy/categories?countryCode=&industryId=`
- `GET /v1/taxonomy/categories/{categoryId}?countryCode=`

The taxonomy routes are public (F-TAX-01, F-TAX-08). They return Active categories whose
`marketRules` enable the requested market (most specific country/region/city rule wins) and
that a Super Admin marked always-show. The eligible-listings rule is not applied yet because
the listings module does not exist, so a category without always-show is hidden. Industries
come from `npm run db:seed` (the ten Phase 1 industries of F-TAX-05); categories are created by
the admin taxonomy builder (F-TAX-02), which is not implemented, so none exist until then.

Mode switching supports CUSTOMER and VENDOR when a vendor record is owned by
the identity. BUSINESS returns 409 until its separately verified account
model is implemented. Authenticated requests validate both the JWT and its
persisted, unrevoked session.

## Platform plumbing

`src/platform/` holds the cross-cutting pieces every module reuses:

- **Correlation id**: every response carries `correlation-id`; the audit service stamps it on each event.
- **Audit** (`AuditService.record`): appends to `audit_events`; pass the transaction client so the event commits with the change.
- **Outbox** (`OutboxService.enqueue`): writes `outbox_events` in the caller's transaction. No dispatcher exists yet.
- **Rate limit** (`RateLimitService`): fixed-window counter; callers pass the maximum and window from configuration.
- **Idempotency**: send `Idempotency-Key` on any write. The same key and request replays the first response (`Idempotent-Replayed: true`); the same key with a different request returns 422; a concurrent duplicate returns 409. A failed attempt frees the key. `IDEMPOTENCY_TTL_SECONDS` and `IDEMPOTENCY_LOCK_SECONDS` have no code defaults; choose values for your environment. Expired keys are replaced on reuse; there is no cleanup job yet.

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

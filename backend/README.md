# VendorVerse backend

The backend is a TypeScript/NestJS modular monolith (D-016). This initial
implementation contains the auth/account slice and health endpoints. It is
not production-ready: OTP delivery is not integrated, the fixed OTP adapter is
local/test-only, privileged accounts fail closed until MFA exists, and
BUSINESS mode requires business-account verification persistence. Platform
Idempotency-Key handling and audit/outbox integration are also not implemented.

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
   them in `schema_migrations`; safe to re-run), then run `npm run start:dev`.

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

## Checks

Run `npm run build`, `npm test`, and `npm run lint` from this directory. Tests
use explicit test configuration and do not require a live database.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-05 11:27 | Shil1517 | Added: optional `HOST` setting (default 127.0.0.1) | A hosted deployment must bind to 0.0.0.0 for the platform router to reach the process; local behaviour is unchanged. |
| 2026-11-05 11:22 | Shil1517 | Added: public taxonomy routes, `npm run db:seed` and the Phase 1 industries seed | Implements the F-TAX-01 / F-TAX-08 public reads from packages/api-contract/taxonomy.openapi.yaml. |
| 2026-11-05 11:11 | Shil1517 | Added: required `CORS_ORIGINS` setting and CORS support | Browser clients (web and mobile mockups) call the auth API from a different origin; only listed origins are allowed. |
| 2026-11-05 11:05 | Shil1517 | Added: `DATABASE_SSL` setting and `npm run db:migrate` runner; migrations 001-003 applied to the Render database | Render requires SSL and the schema had to be created there before clients can connect. |
| 2026-11-05 10:50 | Shil1517 | Added: field-level `errors` in 400 responses, AuthService and error-filter tests; restored `.env.example` | Validation failures were unreadable for clients, auth logic had no tests, and setup step 3 referenced a missing file. |
| 2026-11-05 09:42 | Amit | Added: Swagger API reference instructions | Make the implemented local/test endpoints easy to discover and exercise. |
| 2026-11-04 15:45 | Amit | Modified: local server exposure guidance | Document that the local/test server binds to loopback and should not be exposed publicly. |
| 2026-11-04 15:37 | Amit | Modified: implementation limitations | Explicitly identify unfinished idempotency and audit/outbox work before any production use. |
| 2026-11-04 15:32 | Amit | Added: NestJS backend setup and implementation status | Document the selected stack, local-only authentication limits, configuration, and available routes. |

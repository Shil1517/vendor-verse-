# VendorVerse backend

The backend is a TypeScript/NestJS modular monolith (D-016). This initial
implementation contains the auth/account slice and health endpoints. It is
not production-ready: OTP delivery is not integrated, the fixed OTP adapter is
local/test-only, privileged accounts fail closed until MFA exists, and
BUSINESS mode requires business-account verification persistence. Platform
Idempotency-Key handling and audit/outbox integration are also not implemented.

## Local setup

1. Use Node.js 20 or newer and PostgreSQL 16.
2. Create a local database, then apply `db/migrations/001_users_and_roles.up.sql`,
   `002_vendors_and_taxonomy.up.sql`, and
   `003_auth_security_controls.up.sql` in that order.
3. Copy `.env.example` to `.env` and supply every required value. Authentication
   lifetimes and request/verification limits have no code defaults; select
   values for the local environment rather than copying arbitrary production
   policy.
4. Install dependencies with `npm install`, then run `npm run start:dev`.

The local/test OTP is `123456`; it is not sent by SMS or email. The application
rejects non-local/test configuration and `NODE_ENV=production` while this
provider is selected. The local process binds to `127.0.0.1`; do not expose
this service publicly. Once the service starts, open the interactive API
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
| 2026-11-05 09:42 | Amit | Added: Swagger API reference instructions | Make the implemented local/test endpoints easy to discover and exercise. |
| 2026-11-04 15:45 | Amit | Modified: local server exposure guidance | Document that the local/test server binds to loopback and should not be exposed publicly. |
| 2026-11-04 15:37 | Amit | Modified: implementation limitations | Explicitly identify unfinished idempotency and audit/outbox work before any production use. |
| 2026-11-04 15:32 | Amit | Added: NestJS backend setup and implementation status | Document the selected stack, local-only authentication limits, configuration, and available routes. |

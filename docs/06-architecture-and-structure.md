# Architecture and Repository Structure

The target structure for building VendorVerse as a real product: backend, shared contract, clients, infrastructure and tests. It does not define scope. Scope and phase come from [01-feature-spec.md](01-feature-spec.md); this file says where each feature's code lives.

The backend language and framework are TypeScript with NestJS (D-016). Other technology choices carried over from the earlier detail docs (`mobile/docs/deliverables/06` and `07`) remain proposed and may not be reconciled with D-002 to D-013. O-13 remains open only for the mobile client technology.

The current product-wide logical model is [06-database-architecture-erd.md](../mobile/docs/deliverables/06-database-architecture-erd.md). It maps the existing feature scope and PRS data/integrity requirements; it is not a physical schema or evidence that a database has been implemented. Proposed technology choices and module boundaries above remain unchanged.

The PostgreSQL 16 schema for the whole Phase 1 scope (identity, geography and markets, taxonomy, vendors and verification, listings, bookings, RFQ and quotes, purchase orders, contracts, messaging, reviews, cases, notifications, subscriptions, agents, audit and admin configuration) is in `backend/db/migrations/` (001-013), with idempotent seeds in `backend/db/seeds/`. Phase 2, Phase 3 and OPEN features have no tables; the modelling choices are in section 10 of [the logical data model](../mobile/docs/deliverables/06-database-architecture-erd.md). The backend implementation is being established under `backend/`; the mobile client technology remains open under O-13.

## 1. Shape of the system

```
 web (React, Vite)        mobile (Android + iOS)
        \                      /
         \  generated client  /
          v                  v
        packages/api-contract  (OpenAPI /v1, single source for both clients)
                    |
                    v
   backend: TypeScript + NestJS modular monolith (one deployable, hard module boundaries)
     |-- modules/*        one folder per business module (section 3)
     |-- platform/*       cross-cutting: http, idempotency, outbox, rate limit, config
     |-- workers/*        scheduler, search indexer, notifications, file scanner, retention
     |-- integrations/*   one adapter per third-party provider
                    |
   PostgreSQL 16 + PostGIS | Redis | OpenSearch (read model) | S3-compatible storage
```

Rules carried over from the detail docs:

- REST/JSON over HTTPS, versioned `/v1`, OpenAPI first. Chat and live status over SSE or WebSocket.
- JWT access token plus rotating refresh token. Staff and admin need MFA (F-ACC-01).
- Every write accepts `Idempotency-Key` (F-BKG-08). Every response carries a correlation ID that lands in the audit log.
- Cursor pagination. Errors as RFC 9457 problem+json.
- Money as integer minor units plus ISO currency. No floats. No invented prices (CFG items stay open).
- Listing `is_public` is computed from the six publication gates (F-VND-05), never stored as a source of truth.
- Accepted terms, booking terms and contract versions are immutable snapshots.
- A module reads another module's data only through that module's public interface, never its tables.

## 2. Repository layout

```
vendor-verse-/
|-- CLAUDE.md, render.yaml
|-- docs/                     scope, spec, matrix, decisions, runbook, this file
|-- web/                      web client (exists; currently the mockup)
|-- mobile/                   mobile client (exists; currently the mockup)
|-- backend/
|   |-- src/                  NestJS application bootstrap and implemented feature modules
|   |-- modules/              Phase 1 modules (section 3)
|   |-- modules-phase2/       Phase 2 modules, empty until Phase 2 starts
|   |-- platform/             http, idempotency, outbox, audit-hook, rate-limit, config
|   |-- workers/              scheduler, search-indexer, notification-dispatch, file-scanner, retention
|   |-- integrations/         sms, email, push, whatsapp, billing, kyc, maps, storage
|   |-- db/                   migrations, seeds
|   `-- tests/                unit, integration
|-- packages/
|   |-- api-contract/         OpenAPI spec, generated clients for web and mobile
|   |-- shared/               i18n (English, Hindi), status vocabulary, validators
|   `-- design-tokens/        colours, spacing, type, shared by both clients
|-- infra/                    docker, environments, observability
`-- tests/                    e2e, contract, load, acceptance
```

`web/` and `mobile/` stay where they are so the Render deploy and the sync matrix keep working. They move under `apps/` only when the mockups are replaced by real clients; that move needs a matrix and registry update.

The NestJS bootstrap and active modules are in `backend/src/`. The implemented
feature slices include auth/accounts, geography, taxonomy, vendor onboarding,
listings/availability, files, notifications, vendor verification, vendor roles
and RFQs/quotes. Booking, contract and purchase-order API modules remain
unimplemented; the architecture folders under `backend/modules/` remain planned
module boundaries.

## 3. Backend modules and the features they own

Each folder under `backend/modules/` is one module. Phase is read from the spec, not from here.

| Folder | Responsibility | Feature IDs |
|---|---|---|
| auth | OTP login, sessions, refresh, MFA, device list | F-ACC-01, F-ACC-07, F-ACC-08 |
| accounts | Identity, modes, account states, profile, deletion, export | F-ACC-02 to F-ACC-06 |
| rbac | Roles, permissions, separation of duties | F-ADM-01 to F-ADM-08 |
| geo | Hierarchy, launch status, waitlist, rollout, coverage | F-GEO-01 to F-GEO-03, F-GEO-06 |
| taxonomy | Industries, categories, schemas, versions, suggestions | F-TAX-01 to F-TAX-05, F-TAX-08 |
| vendors | Vendor types, onboarding, public profile, dashboard data | F-VND-01, F-VND-02, F-VND-09, F-VND-10 |
| verification | Levels L0 to L3, evidence, expiry, reviewer queue, appeals | F-VND-03 |
| business | Company details, eligibility, admin verification, network; merged into the vendor account (D-023), boundary to be re-cut once O-19 closes | F-BIZ-01, F-BIZ-02, F-BIZ-04 |
| listings | Listings, catalogue, media, six gates, duplicates | F-VND-05 to F-VND-07, F-GDS-01 |
| availability | Service areas, availability rules, slots | F-VND-08 |
| search | Query, filters, ranking, favourites, compare | F-DSC-01 to F-DSC-07 |
| bookings | Instant, scheduled, recurring, modify, cancel, complete | F-BKG-01 to F-BKG-10 |
| rfq | RFQs, quotes, atomic accept and configured fulfillment | F-RFQ-01 to F-RFQ-06, F-GDS-02 |
| orders | Purchase orders and exceptions | F-GDS-03, F-GDS-04, F-GDS-06 |
| contracts | Propose, counter, accept, milestones, disputes | F-CON-01, F-CON-02 |
| messaging | Linked conversations, privacy filter, consent, report | F-MSG area |
| notifications | Templates, channels, preferences, inbox | F-MSG area |
| reviews | Eligibility, ratings, moderation | F-TRU area |
| trust-cases | Reports, cases, SLA, emergency restriction, appeals | F-TRU-03 to F-TRU-05 |
| subscriptions | Plans, entitlements, billing webhooks, grace | F-SUB area |
| sponsored | Campaigns and placement rules (cannot bypass gates) | F-SUB area |
| invoices | Tax invoices | F-SUB area |
| agents | Leads, activities, consent, assisted onboarding, commissions | F-AGT area |
| admin-ops | Queues, analytics, config register | F-ADM area |
| audit | Append-only trail, query, export | F-ADM area |
| files | Signed upload URLs, scanning, moderation | F-XCT area |

The bookings, RFQ, purchase-order and contract transaction APIs are implemented under `backend/src/`. Payment APIs are intentionally outside this transaction slice; no payment module or funds movement is added. Payment scope remains as recorded in F-PAY-01/F-PAY-02 and D-002.

`backend/modules-phase2/`: `payments` (checkout, escrow, wallet, refunds), `payouts-commission`, `trade` (Incoterms, multi-currency, samples, trade documents), `teams` (business roles, approvals). Empty on purpose. Open features (F-GEO-04, F-GEO-05, F-VND-11, F-VND-12, F-DSC-08, F-DSC-09, F-CON-05, F-GDS-05 and others) have no folder or code until their O-xx is closed.

## 4. Background workers

| Worker | Does |
|---|---|
| scheduler | Booking response deadline, 7-day auto-close, RFQ deadline, credential expiry scan, subscription grace |
| search-indexer | Outbox events to OpenSearch upserts and deletes |
| notification-dispatch | Render template, send through the channel provider |
| file-scanner | Virus scan and image or text pre-screen on upload |
| retention | Deletion, anonymisation and retention policy |

## 5. Client structure (when the mockups become real clients)

Both clients follow the same layout so the sync matrix keeps one row per feature:

```
src/
|-- app/            shell, routing, role/mode switch
|-- features/       one folder per spec area (accounts, geo, discovery, bookings, rfq, ...)
|-- api/            generated client from packages/api-contract (never hand-written)
|-- ui/             components built on packages/design-tokens
`-- i18n/           from packages/shared (English, Hindi)
```

Status names, tab names and labels come from `packages/shared/status-vocabulary` so web and mobile cannot diverge (D-013).

## 6. Build order

From the earlier estimate (planning only, not a commitment). Critical path: auth, taxonomy, vendor and listing, search, booking and RFQ, billing, hardening.

1. Foundation: platform, db, auth, accounts, rbac, geo, taxonomy, files, audit, notifications core.
2. Vendor supply: vendors, verification, listings, availability.
3. Discovery: search and indexer.
4. Transactions: bookings, rfq, orders, contracts, messaging.
5. Revenue and trust: subscriptions, sponsored, invoices, reviews, trust-cases, business.
6. Admin and agents: admin-ops, agents.
7. Hardening, UAT, launch (Jaipur first, D-008).

## 7. Definition of done for a feature

- Spec row exists with one phase; matrix row maps web and mobile screens.
- API in `packages/api-contract` first, then backend module, then both clients.
- Unit and integration tests in the module; contract and acceptance tests in `tests/`.
- Docs and Change Log updated; `python docs/tools/check_docs.py --write` passes.

## 8. Environments and deployment architecture

```
 developer machine ──PR──► qa branch ──deploy──► QA environment   (team testing)
                              │
                              └──PR after sign-off──► main branch ──deploy──► Production
```

| Environment | Git branch | Runs | Data |
|---|---|---|---|
| Local | feature/*, fix/*, docs/* | Each developer's machine (`web/`, `mobile/`, later backend via `infra/docker`) | Seed or local database |
| QA | `qa` | Same build as production, separate services | Test data only; never production data |
| Production | `main` | Live services (today: Render static sites from `render.yaml`) | Real data |

Rules:

- A change reaches production only by passing through `qa`. Branch rules, the QA gate and hotfixes are in [08-branching-and-release.md](08-branching-and-release.md).
- Configuration and secrets differ per environment and live in `infra/environments/` (names and shapes only) and the host's secret store. No secrets in git. No invented values (CFG items stay open).
- QA and production use the same build and migrations. Database migrations in `backend/db/migrations` run on QA first.
- Third-party integrations (`backend/integrations/*`) use sandbox credentials on QA and live credentials on production only.
- Stage-by-stage delivery plan and phase sign-off: [09-phase-completion.md](09-phase-completion.md).

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-13 12:44 | Amit | Modified: active transaction module inventory | Record the booking, contract and purchase-order API implementation and clarify that payment APIs are excluded from this slice. |
| 2026-11-12 11:52 | Sahil Soni | Modified: active backend module status | Vendor roles module added under `backend/src/vendor-roles/` (D-024). |
| 2026-11-11 16:52 | Sahil Soni | Modified: business module description | Vendor and Business merged (D-023); no code moved yet. |
| 2026-11-10 13:59 | Amit | Modified: active backend module status | Vendor verification now has an implemented module under `backend/src/verification/`, not only a planned boundary. |
| 2026-11-05 12:16 | Shil1517 | Modified: PostgreSQL migration scope reference (migrations 004-013 added) | Schema extended from the auth/vendor/taxonomy slice to the full Phase 1 data model so APIs on web and mobile share one consistent store. |
| 2026-11-04 15:37 | Amit | Modified: PostgreSQL migration scope reference | Include the auth challenge and request-limit support migration added for the F-ACC implementation slice. |
| 2026-11-04 15:32 | Amit | Modified: NestJS source layout | Document the application bootstrap and first active modules without changing the modular-monolith boundaries. |
| 2026-11-04 15:24 | Amit | Modified: backend language and framework | Record owner decision D-016 while leaving mobile technology and other proposed infrastructure unchanged. |
| 2026-11-04 15:12 | Amit | Added: scoped PostgreSQL migration draft reference | Record the explicitly authorized database-only deliverable while keeping all proposed stack decisions and O-13 unchanged. |
| 2026-11-04 14:29 | Amit | Modified: product-wide ERD reference | Identify the full logical data model while preserving the proposed architecture and O-13 status. |
| 2026-11-04 13:50 | Amit | Modified: initial ERD status and reference | Point the architecture overview to the decision-aligned logical model without implying implementation or resolving O-13. |
| 2026-11-04 11:15 | Shil1517 | Added: section 8 environments and deployment architecture | Team uses main (production) and qa (testing) branches; architecture shows how they map to environments. |
| 2026-10-31 15:10 | Shil1517 | Added: architecture and repository structure; scaffold folders under backend, packages, infra, tests | Owner asked for the application structure for full development. |

# VendorVerse Technical Documentation

One technical reference for the whole repository as it stands on 2026-11-04: what exists, how it is built and run, how the two mockups work, how the docs are kept in step, and what is not built yet. It describes; it does not define scope. Scope and phase come from [01-feature-spec.md](01-feature-spec.md) and [04-decisions-log.md](04-decisions-log.md).

## 1. What VendorVerse is

A global B2B and B2C marketplace where customers find verified vendors, book services, request quotations (RFQ), place purchase orders and sign contracts. Web and mobile are **one product** (D-013): every Phase 1 feature exists on both with the same rules and wording.

**Current state: there is no deployed backend.** A TypeScript/NestJS auth/account API and the public taxonomy reads (F-TAX-01, F-TAX-08) are implemented for local/test use under `backend/`, with Swagger UI at `/docs` when the service is running. PostgreSQL SQL migrations 001-013 covering the full Phase 1 data model (identity and roles, geography and markets, taxonomy, vendors, verification, listings, bookings, RFQ and quotes, purchase orders, contracts, messaging, reviews, cases, notifications, subscriptions, agents, audit, admin configuration) are applied to the shared Render development database, with the Phase 1 industries, India launch geography (all markets not live) and the CFG register seeded. The auth, account (mode), vendor onboarding, own profile and service areas (F-VND-01, F-VND-02, F-GEO-06), public geography reads and the city waitlist (F-GEO-01, F-GEO-02), listings, availability and live publication gates (F-VND-05, F-VND-06, F-VND-08), customer profile and saved-location (F-ACC-06) and taxonomy-read APIs use the schema so far; the other tables are ready for the next API slices. The mobile client technology remains open under O-13. The fixed OTP adapter is local/test only and does not deliver codes; production delivery, MFA and policy values remain unconfigured. Idempotency-Key, audit, outbox and rate-limit services exist under `backend/src/platform/`; only the account settings writes use the audit trail so far, an in-process dispatcher drains outbox events (no separate worker yet), and a private-files API with scan status exists (signed upload and download URLs, scan handler; migration 015; local/test stand-ins only), the notification inbox API and dispatch handler exist (F-MSG-04, F-MSG-05) with no push / SMS / email provider registered. The web and mobile mockups use browser-held seed data except sign-in, which calls the auth API when `VITE_API_BASE_URL` is set; they do not call the taxonomy API yet. When `VITE_API_BASE_URL` is set they also call the account settings (sessions, notification preferences, data requests) and vendor onboarding APIs from the screens listed in the sync matrix.

| Item | Value |
|---|---|
| Features in the spec | 143: Phase 1 = 101, Phase 2 = 21, Phase 3 = 8, OPEN = 13 |
| Web screens (registry) | 178 |
| Mobile screens (registry) | 162 |
| Roles in the mockups | Customer, Vendor, Business, Sales Agent, Super Admin |
| Phase 1 launch | India: Jaipur, Ajmer, Sikar, Delhi NCR; English and Hindi (D-008) |
| Hosting (mockups) | Render, two static sites from `render.yaml` |

## 2. Repository map

```
vendor-verse-/
|-- CLAUDE.md                 repo rules (docs must match code)
|-- render.yaml               Render blueprint: vendorverse-web, vendorverse-mobile
|-- docs/                     scope, spec, matrix, decisions, runbook, architecture, this file
|   `-- tools/check_docs.py   consistency checker and phase-view generator
|-- web/                      web mockup (React 19, Vite, Tailwind 4)
|-- mobile/                   mobile mockup, rendered as a phone frame in the browser
|-- backend/                  TypeScript/NestJS modular monolith, auth/account slice, SQL migrations
|-- packages/                 api-contract has a draft auth contract; design-tokens and shared are empty
|-- infra/                    docker, environments, observability; empty
`-- tests/                    acceptance, contract, e2e, load; empty
```

## 3. Documentation set

| File | Purpose | Authority |
|---|---|---|
| [04-decisions-log.md](04-decisions-log.md) | Owner decisions D-001 to D-015, open questions O-01 to O-13, differences from the PRS | 1 (highest) |
| [01-feature-spec.md](01-feature-spec.md) | Every feature, one phase each, rules and PRS reference | 2 |
| PRS v3.0 (`.docx`, read-only) | Detailed rules, scenarios SC-xxx, config items CFG-xx | 3 |
| [03-mockup-sync-matrix.md](03-mockup-sync-matrix.md) | Which screens implement each feature on web and mobile, with status and sync action | 4 |
| `web/` and `mobile/` code | Illustration of the spec | 5 |
| [02-phase-scope.md](02-phase-scope.md) | Generated phase lists; never edit by hand | derived |
| [05-maintenance-runbook.md](05-maintenance-runbook.md) | Procedures for add, change, move and remove | process |
| [06-architecture-and-structure.md](06-architecture-and-structure.md) | Target backend, modules, workers, build order | proposed |

Older docs (`docs/web-vs-mobile-gap-analysis.md`, `web/docs/*`, `mobile/docs/deliverables/*`, `mobile/docs/user-flows-and-roadmap.md`, `mobile/docs/screen-inventory.csv`) are background; the set above wins on any conflict.

**Identifiers** are permanent and never reused: `F-AAA-nn` features, `D-nn` decisions, `O-nn` open decisions, `RET-nn` retired screens. Spec areas: ACC, GEO, TAX, VND, BIZ, DSC, BKG, RFQ, GDS, CON, PAY, MSG, TRU, SUB, AGT, ADM, XCT, MCK.

**Checker.** `python docs/tools/check_docs.py` (add `--write` to regenerate `02-phase-scope.md`). It verifies unique feature IDs and valid phases (`P1 P2 P3 OPEN`), that every spec feature is in the matrix and vice versa, that every matrix screen exists in the right registry, that every registry screen is mapped or retired, and that statuses are in `Done Partial Missing Hold Unverified N/A`. Last run: OK (143 features, 178 web and 162 mobile screens mapped).

## 4. Front-end mockups

Both apps are Vite single-page apps, `type: module`, with the same dependency set: React 19, `lucide-react` icons, Tailwind CSS 4 via `@tailwindcss/vite`, Vite 8. Scripts: `npm run dev`, `npm run build`, `npm run preview`. `vite.config.js` sets `base: './'` so builds work from any path.

### 4.1 Shared architecture

| Piece | Web (`web/src`) | Mobile (`mobile/src`) |
|---|---|---|
| Entry | `main.jsx`, `App.jsx` (shell, status bar, role switcher, screen directory) | same |
| Screen registry | `registry.jsx`: `R(id, Component, role, title, fr[], extra)`, 178 entries | `registry.jsx`: `R(id, Component, role, title, sec[], sc[], extra)`, 162 entries |
| Roles, tabs, home | `roles.js`: `ROLES`, `HOME`, `TABS`, `ADMIN_SIDEBAR` | `roles.js`: same plus `HIDE_ADMIN` / `VISIBLE_ROLES` |
| Navigation | `nav.jsx`: `NavProvider` / `useNav` | `nav.jsx` |
| State | `store.jsx`: `AppProvider`, `useApp`, React `useState` per collection | `store.jsx` |
| Seed data | `data.jsx`, `bizdata.js`, `geo.js` | `data.jsx`, `mvpdata.jsx`, `mvpseed.jsx`, `globaldata.jsx`, `geodata.jsx` |
| Reference specs shown in-app | `specs.js` | `specs.js` |
| UI kit | `ui.jsx` (`cx` and components) | `ui.jsx` |
| Screens | `screens/*.jsx` plus per-role CSS | `screens/*.jsx` |

**Registry entry fields.** `id` (permanent key, referenced by the sync matrix), `C` component, `role` (`auth`, `customer`, `vendor`, `shared`, `agent`, `business`, `admin`), `title`, requirement codes (`fr` on web, `sec` and `sc` on mobile), and `extra`: `tab` (appears in bottom navigation), `bar` (status-bar tone: `light`, `brand`, `brand-dark`, `ink`), `defaultParams` / `demo` (route parameters used when jumping from the directory).

**Routing.** Hash routes (`#/screen_id`); `INITIAL_SCREEN` is read from `window.location.hash`. nginx falls back to `index.html` for any path.

**Roles and navigation.** Bottom tabs per role, with label keys resolved through a Hindi/English dictionary in `store.jsx` (`DICT`, `lang`). Home screens: customer `c_home`, vendor `v_dash`, agent `a_home`, business `b_home`, admin `ad_dash`. Screen id prefixes: `c_` customer, `v_` vendor, `b_` business, `a_` agent, `ad_` admin.

### 4.2 Web specifics

- Sources are 364 lines of shell (`App.jsx`) plus screens in `screens/`: `auth`, `customer1`, `customer2`, `vendor`, `vendor-explore`, `agent`, `admin`, `website-home`, `scope`, `blocks`, `biz-screens`, and the Phase 1/2 sync files `p1-account`, `p1-booking`, `p1-business`, `p1-misc`, `p1-review`, `p1-depth`, `p2-storefront`.
- `services/authorization.js` holds the client-side permission model used by the mockup: role to permission sets (for example customer `booking:create`, `rfq:create`; vendor `listing:own`, `rfq:respond`; agent `lead:assigned`, `commission:own`; admin `vendor:review`, `taxonomy:manage`, `audit:read`), plus `can`, `ownsVendor`, `ownsCustomerRecord` and `canOpenRoute`. A vendor can open customer routes only with `buyerMode` on. This is illustrative; a real backend must enforce it server-side (section 8).
- `services/browserRepository.js` persists the whole store in `localStorage` under key `vendorverse.website.state.v3`. On load it merges saved state over the seed (RFQs and settings are merged so new seed rows appear); if storage is unavailable it falls back to seed state.
- Locale model: country, state, city, pincode, currency, time zone, coverage. India is the default (Rajasthan, Jaipur, INR, Asia/Kolkata); other countries are shown as Phase 2.
- Data collections in the store: vendors, listings, orders, bookings, rfqs, leads, commissions, disputes, users, agents, audit, notifs, threads, settings, reviews, saved, compare, contracts, company orders, waitlist, custom categories and overrides.

### 4.3 Mobile specifics

- Rendered in a phone frame with a status bar (battery, signal, wifi) and a screen directory; the intended native clients (Android, iOS) are not built, and the client technology is open (O-13).
- Screens are grouped by area: `auth`, `customer1`, `customer_book`, `customer_rfq`, `customer_misc`, `customer_biz`, `explore`, `vendor_a`, `vendor_b`, `agent`, `admin_a/b/c`, `business`, `catbuilder`, `contracts`, `payments`, `profiles`, `global`, `mvp`, `ops`, `shared`.
- The admin role exists in code but is hidden from role pickers and the directory (`HIDE_ADMIN = true`). Web shows it. Aligning this is O-11.
- Business is merged into Vendor by D-023 (supersedes D-005): two account types, Customer and Vendor. Mobile and web hide the Business account (`HIDE_BUSINESS` in each `roles.js`) and keep its screens; the backend still has Business as a mode until the details in O-19 are closed. Vendor roles are configuration (D-024): the backend stores them in `vendor_role_definitions` and each vendor's roles in `vendor_roles` (migration 016); mobile reads them from `VENDOR_TYPES` in `mobile/src/mvpdata.jsx` and web from `web/src/vendorRoles.js`; labels and the goods / services filters are derived from it.

### 4.4 Build and deploy

- `render.yaml` defines two static web services, `vendorverse-web` (`rootDir: web`) and `vendorverse-mobile` (`rootDir: mobile`), each `npm ci && npm run build`, publishing `dist`.
- Each app also has a `Dockerfile`: stage 1 `node:22-alpine` runs `npm ci` and `npm run build`; stage 2 `nginx:1.27-alpine` serves `dist` using `nginx.conf.template` (listens on `${PORT}`, default 80; SPA fallback; `/assets/` cached one year immutable; gzip on; healthcheck via `wget`).
- `dist/` and `node_modules/` are present in the working tree for both apps; `mobile/VendorVerse-mockup.zip` is a packaged copy of the mockup.

## 5. Domain model (as shown in the spec)

Behaviour the mockups imitate and a backend must implement. Full rules are in the spec; this is the technical summary.

| Area | Rules that drive the design |
|---|---|
| Identity | One login (phone or email + OTP) for all roles; role comes from the account. Mode (customer / vendor / business) is UX context, not privilege. Admin and privileged roles need a second factor. Account states: Pending verification, Active, Restricted, Suspended, Deletion requested. |
| Geography | Country > state > city > pincode hierarchy. A market is publicly searchable only when activated in the Launch Market Register. Coverage never defaults to worldwide. |
| Taxonomy | Industries > categories > subcategories, each with a versioned schema (attributes, booking modes, availability model, response deadline, cancellation policy, RFQ schema, verification rules). Forms are generated from the schema. Existing deals keep their version snapshot. |
| Vendors | Verification levels L0 Registered, L1 Contact, L2 Business, L3 Credential (L4 and KYB are Phase 2); not purchasable. Listing publication is gated by six live-computed gates: account state, content review, subscription, category verification, required fields and service area, no holds. Duplicates are flagged, never auto-merged. |
| Business | Separate account type, owner only, 3+ years and registered, admin verified. Team roles are Phase 2. Storefront ordering is Phase 2 (D-015). |
| Transactions | Booking modes: instant, scheduled, recurring series (D-011); RFQ with atomic quote accept; goods RFQ > quote > purchase order > tracking (D-003); contracts: propose, counter, in-app acceptance, milestones, disputes (D-004). |
| Payments | Phase 1: Mode A (direct, recorded) and Mode B (invoice / offline terms). Phase 2: Mode C (checkout, escrow, wallet, refunds, payouts, commission engine) (D-002). The platform handles no money in Phase 1. |
| Revenue | Vendor subscriptions and sponsored visibility (sponsored cannot bypass gates). Plan names only; no prices (D-007, CFG-01/02). |
| Agents | Leads, activities, consent-based assisted onboarding, commissions in Phase 1 (D-006); the pay model is open (O-03). |
| Trust and safety | Reviews with eligibility and moderation, reports and cases with SLA fields and appeals, privacy filter in messaging. |
| Admin | RBAC with separation of duties, queues, config register, append-only audit trail, analytics. |

## 6. Target architecture (proposed, not built)

Detail is in [06-architecture-and-structure.md](06-architecture-and-structure.md). Summary:

- **Shape:** modular monolith with hard module boundaries; REST/JSON over HTTPS, versioned `/v1`, OpenAPI first, generated clients for web and mobile from `packages/api-contract`.
- **Data:** PostgreSQL 16 with PostGIS, Redis, OpenSearch as a read model, S3-compatible object storage.
- **Cross-cutting rules:** JWT access plus rotating refresh tokens; `Idempotency-Key` on every write; correlation ID on every response and in the audit log; cursor pagination; RFC 9457 `problem+json` errors; money as integer minor units plus ISO currency; `is_public` computed, never stored; accepted terms and contract versions stored as immutable snapshots; a module reads another's data only through its public interface.
- **Backend folders:** `modules/` (26 Phase 1 modules, e.g. auth, accounts, rbac, geo, taxonomy, vendors, verification, listings, search, bookings, rfq, orders, contracts, messaging, notifications, reviews, trust-cases, subscriptions, sponsored, invoices, agents, admin-ops, audit, files), `modules-phase2/` (payments, payouts-commission, teams, trade), `platform/` (http, idempotency, outbox, audit-hook, rate-limit, config), `workers/` (scheduler, search-indexer, notification-dispatch, file-scanner, retention), `integrations/` (sms, email, push, whatsapp, billing, kyc, maps, storage), `db/` (migrations, seeds).
- **Status:** TypeScript/NestJS is the decided backend stack (D-016); the mobile client technology remains open (O-13). The auth/account API implementation covers local/test OTP, sessions, and customer/vendor modes; production OTP delivery and privileged-role MFA are not implemented, and BUSINESS mode remains unavailable pending verified business-account persistence. Required OTP/token/rate-limit values have no code defaults. API contracts are in [auth.openapi.yaml](../packages/api-contract/auth.openapi.yaml), [vendor.openapi.yaml](../packages/api-contract/vendor.openapi.yaml), and [taxonomy.openapi.yaml](../packages/api-contract/taxonomy.openapi.yaml); the product-wide logical model is [06-database-architecture-erd.md](../mobile/docs/deliverables/06-database-architecture-erd.md).

## 7. Build order and definition of done

Build order (planning only): foundation, vendor supply, discovery, transactions, revenue and trust, admin and agents, hardening and UAT, launch in Jaipur first (D-008).

A feature is done when: the spec row has one phase; the matrix maps its web and mobile screens; the API is in `packages/api-contract` first, then the backend module, then both clients; unit and integration tests are in the module and contract and acceptance tests in `tests/`; docs and Change Log are updated; the checker passes.

## 8. Known gaps and risks

| Gap | Effect | Where tracked |
|---|---|---|
| No deployed backend or applied database | Only sign-in can call the local/test API from the web and mobile mockups; all other mockup data remains in browser storage. The product-wide OpenAPI contracts and [initial logical ERD](../mobile/docs/deliverables/06-database-architecture-erd.md) remain drafts, and permissions in `authorization.js` are client-side only and not a security control | Section 6, O-13 |
| Backend language and mobile client technology undecided | Cannot start implementation | O-13 |
| 13 features with OPEN phase (country packs, market activation checklist, contract suspend/resume, profile completeness, field visibility, saved searches, SEO landing pages, chat attachments and scanning, content screening, and others) | Not built, changed or removed until decided | O-04, O-05, O-08, O-09, and others |
| Web admin screens held: Add vendor, Coupons | Kept as is pending ruling | O-01, O-02 |
| Admin role visible on web, hidden on mobile | Demo journeys differ | O-11 |
| Agent commission model, purchase-order "payment failed" meaning, manufacturer launch category | Business rules undefined | O-03, O-06, O-10 |
| Mobile storefront screens need the "Phase 2" badge; several features Missing on mobile (for example F-ACC-05 data export, F-ACC-08 session list) | Mobile not yet at parity | Sync matrix |
| PRS v3.0 differs from decisions D-003, D-005, D-006, D-011, D-013 | Decisions win; PRS not reissued | O-12 |
| No automated tests, CI, linting or type checking in the front-end projects; web and mobile carry their own copies of shared logic (roles, store, UI kit) | Drift risk; the sync matrix is the only parity control | Section 6 target `packages/shared` |
| Statuses in the matrix come from code reading and a render check, not end-to-end testing | Treat as "what the code shows" | Matrix header |

## 9. Working rules (from CLAUDE.md)

1. Any change to a feature, screen, flow, API, data model or scope updates the related docs in the same commit.
2. Never assume a phase; undecided means `OPEN` plus an O-xx row, and nothing is built for it.
3. One phase per feature, set only in the spec; IDs are permanent; removed features keep their row.
4. No invented values (prices, limits, deadlines, rates).
5. Adding, renaming or removing a registry screen updates the sync matrix; Phase 2 screens carry a visible "Phase 2" badge.
6. Every doc edit adds a Change Log row (date and time, author, change, reason), newest first.
7. Run `python docs/tools/check_docs.py --write` before committing anything under `docs/` or a registry.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-12 12:01 | Sahil Soni | Modified: vendor roles description | Web has the same roles registry and role screens (D-024). |
| 2026-11-12 11:53 | Sahil Soni | Modified: vendor roles description | Backend vendor roles tables and APIs exist (D-024). |
| 2026-11-12 11:44 | Sahil Soni | Modified: vendor roles description | Roles are a single registry, open to new entries (D-024). |
| 2026-11-12 11:36 | Sahil Soni | Modified: Business account description | Web now hides the Business account too (D-023). |
| 2026-11-11 17:25 | Sahil Soni | Modified: Business account description | Mobile hides the Business account (D-023). |
| 2026-11-11 16:52 | Sahil Soni | Modified: Business account description | Vendor and Business merged (D-023); code unchanged. |
| 2026-11-06 15:05 | Shil1517 | Modified: files status | Files module added to the backend; storage provider and limits remain undecided. |
| 2026-11-06 13:48 | Shil1517 | Modified: outbox and notifications status | Outbox dispatcher and notifications core added to the backend. |
| 2026-11-05 17:30 | Shil1517 | Modified: listings, availability, gates and waitlist APIs noted | Backend now covers the vendor listing lifecycle up to review. |
| 2026-11-05 16:40 | Shil1517 | Modified: geography and service-area APIs noted | Backend now serves the location hierarchy and vendor coverage. |
| 2026-11-05 16:05 | Shil1517 | Modified: web and mobile API integration note | Screens now call the settings and vendor onboarding APIs. |
| 2026-11-05 15:40 | Shil1517 | Modified: vendor onboarding API noted | Backend now creates and edits vendors. |
| 2026-11-05 13:05 | Shil1517 | Modified: API coverage (customer profile and saved locations, migration 014) | F-ACC-06 profile data (name, email, locale, addresses) is now stored on the server instead of browser memory. |
| 2026-11-05 12:16 | Shil1517 | Modified: database status (migrations 004-013 applied) | The full Phase 1 schema now exists on the Render database; API coverage is unchanged. |
| 2026-11-05 11:22 | Shil1517 | Modified: current-state notes for the applied Render database, optional client sign-in and the taxonomy API | Earlier text said no database was applied and the mockups did not call the API; both changed, and public taxonomy reads were added. |
| 2026-11-05 09:42 | Amit | Modified: local API access and Swagger documentation | Explain how to browse the implemented local/test API and clarify the mockups are not connected to it. |
| 2026-11-04 15:37 | Amit | Modified: auth/account implementation limitations | Call out unfinished platform idempotency/audit plumbing alongside the existing production auth blockers. |
| 2026-11-04 15:27 | Amit | Modified: NestJS auth/account implementation status | Document the local/test-only boundary, unresolved production dependencies, and new auth migration without implying deploy readiness. |
| 2026-11-04 15:24 | Amit | Modified: backend implementation status | Record the TypeScript/NestJS decision and explicit local/test-only authentication boundary without implying production readiness. |
| 2026-11-04 15:12 | Amit | Modified: scoped SQL migration status | Document the authorized migration drafts accurately without suggesting the backend, database, or O-13 decision is complete. |
| 2026-11-04 14:29 | Amit | Modified: product-wide ERD status reference | Reflect the expanded logical model while keeping the documented architecture proposals and unresolved technology decision intact. |
| 2026-11-04 13:49 | Amit | Added: initial logical ERD status reference | Keep the technical inventory clear that the ERD is a draft and no database implementation exists. |
| 2026-11-04 13:44 | Amit | Added: Phase 1 taxonomy API draft reference | Keep the technical inventory aligned with the public browse, category administration, and suggestion contract. |
| 2026-11-04 13:37 | Amit | Added: F-VND-09 vendor profile API draft reference | Keep the technical inventory aligned with the new profile and trust contract. |
| 2026-11-04 13:30 | Amit | Added: F-ACC-02 account mode API draft reference | Keep the technical inventory aligned with the identity and mode contract. |
| 2026-11-04 13:26 | Amit | Added: F-ACC-01 authentication API draft reference | Keep the technical inventory aligned with the initial OpenAPI contract. |
| 2026-11-03 14:45 | Shil1517 | Added: technical documentation (this file) | Owner asked for one technical document covering the whole repository. |
| 2026-11-05 15:10 | Shil1517 | Modified: platform plumbing status | Idempotency, audit, outbox and rate-limit services now exist in the backend. |

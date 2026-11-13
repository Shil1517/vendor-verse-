# Phase-by-Phase Completion Tracker

What "done" means for each phase, the work streams inside it, and where progress is recorded. It does not define scope or assign phases: the phase of every feature is set only in [01-feature-spec.md](01-feature-spec.md), and the generated lists are in [02-phase-scope.md](02-phase-scope.md). It adds no dates; dates stay open until the owner sets them.

Feature scope updated 2026-11-11: Phase 1 = 103 features, Phase 2 = 20, Phase 3 = 7, OPEN = 13. Implementation snapshot at 2026-11-06: web and mobile mockups, plus a NestJS backend (not production-deployed) that covered about 20 of the then 101 Phase 1 features fully or in part (auth and account settings, vendor onboarding, geography and waitlist, listings and gates, taxonomy, RBAC, notification inbox). The mockups call it only for sign-in, account settings, profile, vendor onboarding and the notification inbox; the other screens still use browser-held seed data. Matrix screen statuses at that time: web 58 Done / 41 Partial / 2 Missing, mobile 85 Done / 6 Partial / 8 Missing / 2 Unverified (mockup-level, not backend completion). No stage is Done and no Phase 1 exit criterion is met yet (see [07-technical-documentation.md](07-technical-documentation.md)).

Status values: `Not started`, `In progress`, `In QA` (merged to `qa`, testing), `Done` (released on `main`), `Hold` (blocked, reason stated).

## 1. Phase 1: launch scope (India, English and Hindi)

### 1.1 Stages

Order follows the build order in [06-architecture-and-structure.md](06-architecture-and-structure.md) section 6. A stage is Done only when every module in it passes the feature definition of done (06 section 7) on `main`.

| # | Stage | Modules / work | Status | Owner | Notes |
|---|---|---|---|---|---|
| P1-S0 | Decisions that block building | Resolve remaining open questions that touch Phase 1 | In progress | | D-016 selects TypeScript/NestJS; O-13 remains open for mobile client technology. |
| P1-S1 | Foundation | platform (http, idempotency, outbox, audit-hook, rate-limit, config), db, auth, accounts, rbac, geo, taxonomy, files, audit, notifications core; `packages/api-contract`, `shared`, `design-tokens` | In progress | | NestJS auth/account foundation is underway. Done: platform idempotency, audit, outbox services and shared rate limit; sessions, notification preferences and data-request records. rbac done (F-ADM-04: role grant/revoke API and permission guard). Outbox dispatcher (in-process) and notifications core done (inbox API, delivery attempts; no channel provider, CFG-07 / CFG-10). Files module done (metadata, signed upload and download URLs, scan handler) with local/test stand-ins only; storage and malware-scan providers, size and type limits and URL lifetimes are undecided, so the API answers 503 until configured (new open items). Remaining: OTP provider, MFA, production policy values, BUSINESS-mode persistence, account-state enforcement (per-state capabilities are not defined in the docs, see O-14), request verification/fulfilment (CFG-08), real storage and scan providers, admin notification template manager; no production authentication or database deployment is implied. |
| P1-S2 | Vendor supply | vendors, verification, listings, availability | In progress | | Vendor onboarding and own-profile API done (F-VND-01, F-VND-02). Vendor coverage (service areas) and geography reads done (F-GEO-06, F-GEO-01). Listings, availability, live publication gates and the city waitlist done (F-VND-06, F-VND-08, F-VND-05 partial, F-GEO-02). Admin taxonomy builder API done (F-TAX-02). Not built: verification L0-L3 and evidence (the files module now exists; the verification workflow and its evidence requirements per level, country and category are not built or decided), the admin listing review queue and duplicate detection (F-VND-07), and the subscription, verification and hold gates. |
| P1-S3 | Discovery | search, search-indexer worker | In progress | | Public listing search and detail and favourites done (`backend/src/discover/`, queried live from the database; no search index yet, so the search-indexer worker is not built). Not applied yet: subscription, category-verification and no-holds gates, radius coverage, pincode filter in the UI, saved searches (OPEN, O-09). |
| P1-S4 | Transactions | bookings, rfq, orders, contracts, messaging, Mode A / Mode B payment records | In progress | | Bookings done in two overlapping modules: `backend/src/remote-bookings/` (what the web and mobile apps call) and `backend/src/bookings/` (used by the RFQ handoff; to be reconciled). Capabilities: scheduled, instant, recurring series, modification, cancel, completion with the 7-day window, conflicts surfaced, idempotent create). RFQ, contracts and purchase-order APIs exist in the backend (not wired to clients). Not built: messaging, payment records, the scheduler worker (deadlines are applied on read), reporting an issue after completion (trust-cases). |
| P1-S5 | Revenue and trust | subscriptions, sponsored, invoices, reviews, trust-cases, business | Not started | | |
| P1-S6 | Admin and agents | admin-ops, agents | Not started | | |
| P1-S7 | Replace mockups with real clients | `web/` and `mobile/` use the generated API client; registries and matrix updated | Not started | | Keep web and mobile in step (D-013). |
| P1-S8 | Hardening, UAT, launch | Load and security checks, UAT on both platforms, Jaipur first then Ajmer, Sikar, Delhi NCR (D-008) | Not started | | |

### 1.2 Phase 1 exit criteria

All must be true to call Phase 1 complete:

- [ ] Every feature with phase `P1` in the spec is `Done` on both web and mobile in the sync matrix.
- [ ] No `Missing` or `Partial` Phase 1 rows in the matrix.
- [ ] Acceptance scenarios (SC-xxx) for Phase 1 features pass on `qa` and then on `main`.
- [ ] Docs checker passes; no feature doc is out of step with the code.
- [ ] All CFG items that Phase 1 needs have owner-decided values (none invented).
- [ ] Phase 1 open questions (O-xx) are closed or explicitly moved to a later phase by a D-xx decision.
- [ ] Release `v1.0` tagged on `main`.
- [ ] Phase sign-off recorded (name and date) in section 5.

## 2. Phase 2: platform payments, more markets, trade, teams

Starts only after Phase 1 sign-off, unless the owner records a decision otherwise. Work lives in `backend/modules-phase2/` and the Phase 2 features in the spec; screens already carry the "Phase 2" badge (D-010).

| # | Stage | Scope (see spec for IDs) | Status | Owner |
|---|---|---|---|---|
| P2-S1 | Payments and payouts | Checkout and escrow, wallet, refunds, payouts, commission engine, payout tax (F-PAY-03 to F-PAY-09) | Not started | |
| P2-S2 | Trade | Incoterms, multi-currency quotes, samples, customs, trade documents (F-RFQ-07, F-GDS-07) | Not started | |
| P2-S3 | Teams and business | Team roles, approvals, vendor staff (F-BIZ-06); company storefront ordering (F-BIZ-03, D-015) | Not started | |
| P2-S4 | Markets and languages | More countries and metros, multi-currency display (F-GEO-07, F-GEO-08); Arabic (RTL), Spanish, French, German, Chinese (F-XCT-02) | Not started | |
| P2-S5 | Verification and contracts | L4 and third-party KYB (F-VND-04); renewal, amendment, termination, e-sign (F-CON-03, F-CON-04) | Not started | |
| P2-S6 | Admin and support tooling | Feature-flag console, funnels, event console (F-ADM-11, F-ADM-12); helpdesk macros and SLA timers (F-TRU-06) | Not started | |

Exit criteria: every `P2` feature `Done` on both platforms; checker passes; acceptance scenarios pass; sign-off recorded; release `v2.0` tagged.

## 3. Phase 3: direction only

AI, enterprise procurement, cart checkout and more regions (D-014, awaiting confirmation under O-12). All documented industries are in the Phase 1 browse catalog per D-017. No Phase 3 stages are planned. Planning starts only after Phase 2 sign-off and an owner decision.

## 4. OPEN features

13 features have no phase (O-xx rows in [04-decisions-log.md](04-decisions-log.md)). They are not built, changed or removed until the owner decides. When one is decided it joins the relevant phase's stage list above, with a D-xx entry.

## 5. Phase sign-off record

| Phase | Completed on | Signed off by | Release tag | Notes |
|---|---|---|---|---|
| Phase 1 | | | | |
| Phase 2 | | | | |
| Phase 3 | | | | |

## 6. How to keep this current

- When a stage's work merges into `qa`, set `In QA`; when it reaches `main`, set `Done`.
- Feature-level truth stays in the sync matrix statuses; this file tracks stages, not individual features.
- Add a Change Log row whenever a status, owner or exit criterion changes.
- Branching and release steps are in [08-branching-and-release.md](08-branching-and-release.md).

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-13 13:36 | Sahil Soni | Modified: P1-S4 status | Merge with theamitmehra added RFQ, contracts and purchase-order APIs and a second booking module. |
| 2026-11-12 14:18 | Sahil Soni | Modified: P1-S3 and P1-S4 status and progress notes | Discovery and bookings landed; remaining items listed. |
| 2026-11-11 12:41 | Amit | Modified: phase scope snapshot and Phase 3 summary | D-017 moves the full documented industry browser into Phase 1. |
| 2026-11-06 15:05 | Shil1517 | Modified: P1-S1 and P1-S2 progress notes | Files module landed; verification is no longer blocked by it. |
| 2026-11-06 15:00 | Shil1517 | Modified: progress snapshot | Replaced the out-of-date "no backend" line with the current backend coverage and matrix status counts. |
| 2026-11-06 13:48 | Shil1517 | Modified: P1-S1 progress note | Outbox dispatcher and notifications core landed; account-state enforcement is blocked on an owner decision (O-14). |
| 2026-11-05 17:30 | Shil1517 | Modified: P1-S2 progress note | Listings, availability, publication gates and waitlist landed; verification and review queue remain. |
| 2026-11-05 16:40 | Shil1517 | Modified: P1-S2 progress note | Service-area and geography APIs landed. |
| 2026-11-05 15:40 | Shil1517 | Modified: P1-S2 status to In progress | Vendor onboarding API landed. |
| 2026-11-04 15:24 | Amit | Modified: P1-S0 and P1-S1 backend status | Reflect D-016 and the bounded auth/account implementation while retaining open mobile and security/integration prerequisites. |
| 2026-11-04 15:12 | Amit | Modified: P1-S0 scoped migration authorization | Record the owner's limited database-only authorization while preserving O-13 as a prerequisite for application/backend work. |
| 2026-11-04 11:12 | Shil1517 | Added: phase-by-phase completion tracker | Team needs staged completion criteria and a sign-off record per phase. |
| 2026-11-05 15:10 | Shil1517 | Modified: P1-S1 progress note | Platform plumbing and account settings APIs landed; remaining items listed. |
| 2026-11-05 16:14 | Shil1517 | Modified: P1-S1 progress note | rbac module (roles API and permission guard) landed. |
| 2026-11-05 16:31 | Shil1517 | Modified: P1-S2 progress note | Admin taxonomy builder API landed. |

# Phase Scope: Phase 1 / Phase 2 / Phase 3

The phase of every feature is set in one place: the `Phase` column of [01-feature-spec.md](01-feature-spec.md). This file explains the boundaries and shows each phase as a list. **The lists in section 3 are generated from the spec; do not edit them by hand.** Run `python docs/tools/check_docs.py --write` after changing the spec.

## 1. What each phase means

| Phase | Scope | Old names it replaces |
|---|---|---|
| Phase 1 | Launch scope on web, Android and iOS together. India launch cities (Jaipur, Ajmer, Sikar, Delhi NCR), English and Hindi. Customers pay vendors directly (Mode A), or by invoice / offline terms for contracts (Mode B). Platform revenue is vendor subscriptions and sponsored visibility. | "MVP", PRS "Release 1", PRS "Wave 1" |
| Phase 2 | Platform-facilitated payments and commission, more countries and languages, cross-border trade, team roles, L4 verification, contract renewal and amendment. | Mobile "Phase 2", PRS "Wave 2/3" where decided |
| Phase 3 | Direction only: AI, enterprise procurement, cart checkout and more regions. | Mobile "Phase 3", PRS "Future" (see D-014) |
| OPEN | Not decided. Not built, not removed. | none |

## 2. Where one capability spans phases

Where the same capability starts in Phase 1 and grows in Phase 2, it is split into two features so each has one phase.

| Capability | Phase 1 (feature) | Phase 2 (feature) |
|---|---|---|
| Payments | Mode A direct payment record and Mode B invoice / offline-terms records (F-PAY-01, F-PAY-02) | Checkout and escrow, wallet, refunds, payouts, commission engine, foreign-currency checkout, payout tax (F-PAY-03 to F-PAY-09) |
| Contracts | Propose, counter, in-app acceptance; milestones; disputes (F-CON-01, F-CON-02) | Renewal, amendment, termination; e-sign provider (F-CON-03, F-CON-04). Suspend/resume and expiry are OPEN (F-CON-05). |
| Verification | Levels L0 to L3 (F-VND-03) | L4 and third-party KYB (F-VND-04) |
| Geography | India launch cities and the picker, waitlist, rollout manager (F-GEO-01 to F-GEO-03, F-GEO-06) | More countries and metros; multi-currency display (F-GEO-07, F-GEO-08) |
| Languages | English, Hindi (F-XCT-01) | Arabic (RTL), Spanish, French, German, Chinese (F-XCT-02) |
| Industries | All 30 documented industries browseable (F-TAX-05 to F-TAX-07); 10 workflow groups configured, 5 prioritized | No additional industries |
| Trade | Domestic goods: catalogue, goods RFQ, PO (F-GDS-01 to F-GDS-04, F-GDS-06) | Incoterms, multi-currency quotes, samples, customs, trade documents (F-RFQ-07, F-GDS-07) |
| Business accounts | Separate business account, owner-only (F-BIZ-01, F-BIZ-02, F-BIZ-04) | Team roles, approvals, vendor staff (F-BIZ-06) |
| Support tooling | Cases, SLA fields, appeals (F-TRU-03 to F-TRU-05) | Helpdesk macros and SLA timers (F-TRU-06) |
| Admin tooling | Queues, RBAC, audit, analytics, config register (F-ADM-01 to F-ADM-08) | Feature-flag console, funnels and event console (F-ADM-11, F-ADM-12) |

## 3. Features by phase (generated)

<!-- BEGIN GENERATED: do not edit by hand, run check_docs.py --write -->

### Phase 1 (launch scope): 103 features

| ID | Feature | Area |
|---|---|---|
| F-ACC-01 | Sign-up and login (phone or email + OTP) | Accounts and identity |
| F-ACC-02 | One identity, customer / vendor / business modes | Accounts and identity |
| F-ACC-03 | Account states | Accounts and identity |
| F-ACC-04 | Account deletion request | Accounts and identity |
| F-ACC-05 | Data export and deletion explainer | Accounts and identity |
| F-ACC-06 | Customer profile | Accounts and identity |
| F-ACC-07 | Settings: notification preferences, privacy, active sessions | Accounts and identity |
| F-ACC-08 | Session and device list for vendors and admins | Accounts and identity |
| F-GEO-01 | Country, state, city, pincode picker | Geography and markets |
| F-GEO-02 | Launch status and waitlist for cities not live | Geography and markets |
| F-GEO-03 | Geo rollout manager (Launch Market Register) | Geography and markets |
| F-GEO-06 | Vendor coverage declaration | Geography and markets |
| F-TAX-01 | Browse industries, categories, subcategories | Taxonomy and categories |
| F-TAX-02 | Admin taxonomy builder | Taxonomy and categories |
| F-TAX-03 | Per-category configuration | Taxonomy and categories |
| F-TAX-04 | Vendor suggests a category | Taxonomy and categories |
| F-TAX-05 | Core Phase 1 industries (10) | Taxonomy and categories |
| F-TAX-06 | Additional industries (9; formerly Phase 2) | Taxonomy and categories |
| F-TAX-07 | Additional industries (11; formerly Phase 3) | Taxonomy and categories |
| F-TAX-08 | Schema-driven dynamic forms | Taxonomy and categories |
| F-VND-01 | Onboarding wizard by vendor type | Vendor onboarding, verification and listings |
| F-VND-02 | "Become a vendor" asks country first | Vendor onboarding, verification and listings |
| F-VND-03 | Verification levels L0 to L3 | Vendor onboarding, verification and listings |
| F-VND-05 | Publication gates | Vendor onboarding, verification and listings |
| F-VND-06 | Listings: create, edit, pause, unpublish | Vendor onboarding, verification and listings |
| F-VND-07 | Listing review queue and duplicate detection | Vendor onboarding, verification and listings |
| F-VND-08 | Service areas and availability | Vendor onboarding, verification and listings |
| F-VND-09 | Vendor public profile and trust display | Vendor onboarding, verification and listings |
| F-VND-10 | Vendor dashboard | Vendor onboarding, verification and listings |
| F-DSC-01 | Home with search, intent tabs and category explorer | Discovery |
| F-DSC-02 | Search, filters, ranking, pagination | Discovery |
| F-DSC-03 | Search error, offline and no-result flows | Discovery |
| F-DSC-04 | Supplier and manufacturer search | Discovery |
| F-DSC-05 | Listing detail with honest missing-data labels | Discovery |
| F-DSC-06 | Product page: MOQ, volume tiers, delivery regions | Discovery |
| F-DSC-07 | Favourites and compare up to three | Discovery |
| F-BKG-01 | Scheduled booking lifecycle | Bookings |
| F-BKG-02 | Instant booking | Bookings |
| F-BKG-03 | Recurring booking series | Bookings |
| F-BKG-04 | Booking modification | Bookings |
| F-BKG-05 | Cancellation, no-show and vendor cancellation | Bookings |
| F-BKG-06 | Completion and 7-day confirmation | Bookings |
| F-BKG-07 | Conflicting confirmations | Bookings |
| F-BKG-08 | Idempotent create and independent multi-vendor requests | Bookings |
| F-BKG-09 | Vendor booking inbox and actions | Bookings |
| F-BKG-10 | Customer activity hub | Bookings |
| F-RFQ-01 | Create RFQ | RFQ and quotations |
| F-RFQ-02 | Vendor quotation: submit, revise, withdraw | RFQ and quotations |
| F-RFQ-03 | Compare, negotiate, accept (atomic, one winner) | RFQ and quotations |
| F-RFQ-04 | Accepted-terms snapshot and work order | RFQ and quotations |
| F-RFQ-05 | Edit RFQ with revision history | RFQ and quotations |
| F-RFQ-06 | Deadline extension and no-quotes flow | RFQ and quotations |
| F-GDS-01 | Supplier and manufacturer listings (domestic) | Goods, purchase orders and supplier trade |
| F-GDS-02 | Goods RFQ | Goods, purchase orders and supplier trade |
| F-GDS-03 | Purchase order lifecycle | Goods, purchase orders and supplier trade |
| F-GDS-04 | PO exceptions: rejected, cancelled, delivery exception | Goods, purchase orders and supplier trade |
| F-GDS-06 | PO dispute outcomes | Goods, purchase orders and supplier trade |
| F-CON-01 | Contract proposal, counter, in-app acceptance | Contracts |
| F-CON-02 | Milestones, 7-day confirmation, contract disputes | Contracts |
| F-BIZ-01 | Business account (separate account type) | Business accounts and vendor-as-buyer |
| F-BIZ-02 | Business workspace: home, services for vendors, vendor enquiries | Business accounts and vendor-as-buyer |
| F-BIZ-04 | Company verification queue | Business accounts and vendor-as-buyer |
| F-BIZ-05 | Vendor as buyer | Business accounts and vendor-as-buyer |
| F-MSG-01 | Linked, privacy-aware chat | Messaging and notifications |
| F-MSG-02 | Contact-share consent | Messaging and notifications |
| F-MSG-04 | Notification inbox with deep links | Messaging and notifications |
| F-MSG-05 | Notification channels, templates, preferences | Messaging and notifications |
| F-SUB-01 | Plans and entitlements | Subscriptions and sponsored visibility |
| F-SUB-02 | Subscription lifecycle | Subscriptions and sponsored visibility |
| F-SUB-03 | Plan checkout: tax and proration, scheduled downgrade | Subscriptions and sponsored visibility |
| F-SUB-05 | Lead-usage meter and limits | Subscriptions and sponsored visibility |
| F-SUB-06 | Sponsored visibility | Subscriptions and sponsored visibility |
| F-SUB-07 | Admin subscription monitoring and billing investigation | Subscriptions and sponsored visibility |
| F-SUB-08 | Tax invoice and fees explainer | Subscriptions and sponsored visibility |
| F-PAY-01 | Mode A: direct payment record | Payments and commission |
| F-PAY-02 | Mode B: invoice / offline terms records | Payments and commission |
| F-TRU-01 | Eligible-only reviews with rating dimensions | Trust, reviews and support |
| F-TRU-02 | Trust score and badges | Trust, reviews and support |
| F-TRU-03 | Reports and support cases | Trust, reviews and support |
| F-TRU-04 | Moderation and appeals | Trust, reviews and support |
| F-TRU-05 | Proportionate enforcement and emergency restriction | Trust, reviews and support |
| F-AGT-01 | Leads and pipeline | Sales agents |
| F-AGT-02 | Consent-based assisted onboarding | Sales agents |
| F-AGT-03 | Assigned onboarding tasks | Sales agents |
| F-AGT-04 | Agent permission boundaries | Sales agents |
| F-AGT-05 | Conversion performance | Sales agents |
| F-AGT-06 | Agent commissions and earnings | Sales agents |
| F-AGT-07 | Admin sales oversight | Sales agents |
| F-ADM-01 | Admin dashboard and operational queues hub | Admin and governance |
| F-ADM-02 | Vendor verification review | Admin and governance |
| F-ADM-03 | Users and account-state management | Admin and governance |
| F-ADM-04 | Roles and permissions (RBAC) | Admin and governance |
| F-ADM-05 | Audit log | Admin and governance |
| F-ADM-06 | Analytics and reports | Admin and governance |
| F-ADM-07 | Platform settings | Admin and governance |
| F-ADM-08 | Open configuration register | Admin and governance |
| F-ADM-10 | Maintenance and force-update screen | Admin and governance |
| F-XCT-01 | English and Hindi | Cross-cutting |
| F-XCT-03 | Standard UI states | Cross-cutting |
| F-XCT-04 | Accessibility (WCAG 2.2 AA target) | Cross-cutting |
| F-XCT-05 | Web and mobile parity | Cross-cutting |
| F-XCT-06 | Customer dashboard | Cross-cutting |
| F-MCK-01 | Scope, vision and journeys review screens | Mockup tooling |

### Phase 2: 20 features

| ID | Feature | Area |
|---|---|---|
| F-GEO-07 | More countries live (UAE, Singapore, more Indian metros) | Geography and markets |
| F-GEO-08 | Multi-currency display and conversion | Geography and markets |
| F-VND-04 | Verification L4 and third-party KYB | Vendor onboarding, verification and listings |
| F-RFQ-07 | Multi-currency quotes, Incoterms, samples workflow | RFQ and quotations |
| F-GDS-07 | Cross-border trade: customs, export markets, trade-document vault | Goods, purchase orders and supplier trade |
| F-CON-03 | Renewal, amendment (new version), termination | Contracts |
| F-CON-04 | E-signature provider integration | Contracts |
| F-BIZ-03 | Company directory, storefront and direct ordering | Business accounts and vendor-as-buyer |
| F-BIZ-06 | Business team roles, approvals, spending limits | Business accounts and vendor-as-buyer |
| F-PAY-03 | Checkout and escrow with milestone release | Payments and commission |
| F-PAY-04 | Wallet and top-up | Payments and commission |
| F-PAY-05 | Refund requests, status, bank verification | Payments and commission |
| F-PAY-06 | Vendor earnings and payouts | Payments and commission |
| F-PAY-07 | Platform commission engine and revenue admin | Payments and commission |
| F-PAY-08 | Foreign-currency checkout | Payments and commission |
| F-PAY-09 | Tax handling for payouts (TCS/TDS) | Payments and commission |
| F-TRU-06 | Helpdesk macros and SLA timers | Trust, reviews and support |
| F-ADM-11 | Feature-flag console | Admin and governance |
| F-ADM-12 | Cohort and funnel analytics, event-tracking console | Admin and governance |
| F-XCT-02 | Additional languages and right-to-left layout | Cross-cutting |

### Phase 3 (roadmap): 7 features

| ID | Feature | Area |
|---|---|---|
| F-DSC-10 | Personalised home and AI search | Discovery |
| F-GDS-08 | Cart, inventory checkout, shipping and returns | Goods, purchase orders and supplier trade |
| F-GDS-09 | Enterprise procurement: approval chains, budgets, cost centres | Goods, purchase orders and supplier trade |
| F-SUB-09 | Advanced ad platform, bidding, ad analytics | Subscriptions and sponsored visibility |
| F-TRU-08 | Fraud-signal ML and continuous monitoring | Trust, reviews and support |
| F-AGT-08 | Field and offline tools for agents | Sales agents |
| F-XCT-07 | UK/US/EU/APAC launches, predictive pricing, multi-vendor project plans, trade finance | Cross-cutting |

### Phase not decided (OPEN): 13 features

| ID | Feature | Area |
|---|---|---|
| F-GEO-04 | Country packs (per-country localisation) | Geography and markets |
| F-GEO-05 | Market activation checklist | Geography and markets |
| F-VND-11 | Profile completeness score | Vendor onboarding, verification and listings |
| F-VND-12 | Field visibility classes (public / counterparty / private) | Vendor onboarding, verification and listings |
| F-DSC-08 | Saved searches and saved-vendor alerts | Discovery |
| F-DSC-09 | Web SEO landing pages per country/state/city/category | Discovery |
| F-GDS-05 | PO "payment failed" state | Goods, purchase orders and supplier trade |
| F-CON-05 | Suspend / resume and expiry states | Contracts |
| F-MSG-03 | Chat attachments, scanning, read receipts | Messaging and notifications |
| F-SUB-04 | Coupons | Subscriptions and sponsored visibility |
| F-TRU-07 | Automated text/image screening | Trust, reviews and support |
| F-ADM-09 | Dual approval and self-approval blocking | Admin and governance |
| F-ADM-13 | Admin creates a vendor or business supplier | Admin and governance |

<!-- END GENERATED -->

## 4. How Phase 2 and Phase 3 appear in the mockups

- **Phase 2:** the screen exists on both web and mobile, reachable from normal navigation, with a visible "Phase 2" badge (D-010). A Phase 2 screen must not change what a Phase 1 flow does. For example, a Phase 1 booking never routes through checkout.
- **Phase 3:** appears only in the roadmap / vision screen and in these docs.
- **OPEN:** the screen, if it exists, is left unchanged and is not badged until the decision is closed.

## 5. Mapping to the PRS waves

| This doc | PRS v3 |
|---|---|
| Phase 1 | Release 1 and Wave 1; delivery phases 0 to 6 |
| Phase 2 | Waves 2 and 3 for the items decided here. Payment Mode C stays gated by CFG-15 and CFG-16 and legal review. |
| Phase 3 | Chapter 24 deferred roadmap |

Where this file and the PRS disagree, this file wins and the difference is recorded in [04-decisions-log.md](04-decisions-log.md) section 3.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-11 12:49 | Amit | Modified: Industry phase boundary | D-017 moves all 30 documented industries into Phase 1 browsing; generated feature lists refreshed from the spec. |
| 2026-10-30 11:34 | Shil1517 | Modified: restored docs, web/src and mobile/src to commit 06ab837 | Owner did not want web and mobile UIs matched; reverted the sync work and its doc changes. |
| 2026-10-29 16:27 | Shil1517 | Added: phase definitions, split-capability table, generated phase lists | The old docs gave the phase split in three places that disagreed; one view per phase now comes from the spec. |

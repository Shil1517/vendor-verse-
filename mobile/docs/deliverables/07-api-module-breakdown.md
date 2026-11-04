# 07 · API Module Breakdown

> **Detail document, not yet reviewed against the 2026-10-29 decisions** (see [../../../docs/04-decisions-log.md](../../../docs/04-decisions-log.md)). Phase labels follow the spec in [../../../docs/01-feature-spec.md](../../../docs/01-feature-spec.md) where they differ.


**Style:** REST/JSON over HTTPS, versioned `/v1`, OpenAPI-first. Server-sent events or WebSocket for chat and live status. Background jobs for deadlines, billing, search indexing and notifications.
**Deployment recommendation:** a modular monolith (one deployable, hard module boundaries) for MVP, with search, notifications and file scanning as separate workers. Split further only when a module needs independent scaling.

Auth: JWT access token (15 min) + rotating refresh token. Staff require MFA. Every write endpoint accepts `Idempotency-Key`. Every response carries a `correlation-id` that lands in the audit log.

## 1. Modules

| Code | Module | Responsibility | Key endpoints (examples) | Screens served | Phase |
|---|---|---|---|---|---|
| **A1** | Auth & sessions | OTP login, registration, MFA for staff, device sessions | `POST /auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `GET/DELETE /me/sessions` | auth, c_settings | MVP |
| **A2** | Accounts & modes | One identity, customer/vendor/business modes, account states, deletion | `GET/PATCH /me`, `POST /me/mode`, `POST /me/delete-request`, `GET /me/export` | c_profile, acct_state, c_delete | MVP |
| **A3** | RBAC & staff | Roles, permissions, scopes, separation of duties | `GET/POST /admin/roles`, `POST /admin/staff/{id}/grant` | ad_roles, ad_users | MVP |
| **G1** | Geo | Country/state/city/pincode, launch status, waitlist, rollout matrix, country packs | `GET /geo/countries`, `/geo/cities?state=`, `POST /geo/waitlist`, `PUT /admin/geo/rollout` | c_location, ad_geo, ad_country | MVP |
| **T1** | Taxonomy | Industries, categories, subcategories, field schemas, versions, suggestions | `GET /taxonomy`, `POST /taxonomy/suggestions`, `POST /admin/categories`, `POST /admin/categories/{id}/publish` | c_categories, ad_taxonomy, ad_category | MVP |
| **V1** | Vendors & onboarding | Vendor types, wizard, profile, public profile, company link | `GET/PATCH /vendors/me/profile`, `GET /vendors/{id}/public` (draft: `packages/api-contract/vendor.openapi.yaml`) | v_register*, v_profile, c_vendor | MVP |
| **V2** | Verification | Evidence upload, tiers, expiry, reviewer decisions, appeals | `POST /vendors/{id}/documents`, `GET /admin/verifications`, `POST /admin/verifications/{id}/decision` | v_verify, ad_vendors | MVP |
| **B1** | Business accounts | Eligibility, company form, admin verification, network | `POST /companies`, `GET /vendor/network`, `POST /admin/companies/{id}/decision` | b_*, ad_company, v_biz_* | MVP |
| **L1** | Listings & catalogue | Listings, products, tiers, media, 6-gate publication, duplicates | `POST /listings`, `GET /listings/{id}/gates`, `POST /listings/{id}/submit`, `POST /admin/listings/{id}/decision` | v_listing*, ad_listing | MVP |
| **L2** | Availability & areas | Service areas, availability rules, slot lookup | `PUT /vendors/{id}/areas`, `GET /listings/{id}/slots` | v_areas, v_avail | MVP |
| **S1** | Search & discovery | Query, filter, geo, ranking, sponsored slots, compare, favourites | `GET /search`, `GET /listings/{id}`, `POST /favorites`, `GET /compare` | c_explore, c_saved | MVP |
| **K1** | Bookings | Create (idempotent), accept/decline, modify, cancel, complete, conflict | `POST /bookings`, `POST /bookings/{id}/accept`, `/modify`, `/cancel`, `/complete`, `/confirm` | c_book*, c_booking*, v_booking* | MVP |
| **R1** | RFQ & quotes | Create/revise RFQ, recipients, quotes, compare, atomic accept | `POST /rfqs`, `PUT /rfqs/{id}`, `POST /rfqs/{id}/quotes`, `POST /rfqs/{id}/accept` | c_rfq*, v_rfq, c_rfq_goods | MVP |
| **O1** | Purchase orders | PO from quote/catalogue, accept, ship, deliver, exception | `POST /orders`, `POST /orders/{id}/accept`, `/ship`, `/deliver`, `/exception` | c_order*, v_order* | MVP |
| **C1** | Contracts | Propose, counter, e-sign, milestones; renewal/termination (P2) | `POST /contracts`, `POST /contracts/{id}/counter`, `/sign`, `POST /milestones/{id}/complete` | c_contract*, v_contract | MVP (core) / P2 |
| **M1** | Messaging | Linked conversations, privacy filter, contact-share consent, report | `GET /conversations`, `POST /conversations/{id}/messages`, WebSocket `/ws` | messages, chat, b_messages | MVP |
| **N1** | Notifications | Templates, channels (push, SMS, email, WhatsApp), preferences, in-app inbox | `GET /notifications`, `PUT /me/notification-preferences`, `POST /admin/templates` | notifications | MVP |
| **Q1** | Reviews | Eligibility, 4 ratings, trust score, moderation | `POST /reviews`, `GET /vendors/{id}/reviews`, `POST /admin/reviews/{id}/decision` | c_review*, v_reviews | MVP |
| **Q2** | Trust & cases | Reports, cases, severity/SLA, evidence, emergency restriction, appeals | `POST /reports`, `GET /admin/cases`, `POST /admin/cases/{id}/decision`, `POST /cases/{id}/appeal` | c_report, c_case*, ad_case*, v_cases | MVP |
| **P1** | Plans & subscriptions | Plans, entitlements, checkout, webhooks, grace, corrections | `GET /plans`, `POST /subscriptions`, `POST /webhooks/billing`, `POST /admin/subscriptions/{id}/correct` | v_sub, v_plans, v_checkout, ad_subs | MVP |
| **P2** | Sponsored visibility | Campaigns, placement rules (cannot bypass gates) | `POST /sponsored`, `GET /admin/sponsored` | v_sponsor, ad_sponsored | MVP |
| **I1** | Invoices & tax | Tax invoice generation, GST fields | `GET /invoices`, `GET /invoices/{id}/pdf` | invoice | MVP |
| **AG1** | Sales agents | Leads, activities, consent, assisted onboarding, tasks, conversion metrics | `POST /agent/leads`, `POST /agent/leads/{id}/activities`, `POST /agent/leads/{id}/consent` | a_* | MVP |
| **AD1** | Admin ops & analytics | Dashboards, queues, analytics, config register | `GET /admin/queues`, `GET /admin/analytics`, `GET/PUT /admin/config/{key}` | ad_dash, ad_analytics, ad_cfg, ad_settings | MVP |
| **AU1** | Audit | Append-only action trail, query, export | `GET /admin/audit` | ad_audit | MVP |
| **F1** | Files & media | Signed upload URLs, virus scan, image moderation, thumbnails | `POST /files/upload-url`, `GET /files/{id}` | all uploads | MVP |
| **PAY1** | Payments & escrow | Checkout, escrow hold/release, refunds, wallet | `POST /payments`, `POST /escrow/{id}/release`, `POST /refunds` | c_pay*, c_wallet, c_refund* | **P2** |
| **PAY2** | Payouts & commission | Commission rules, payouts, bank verification | `GET /vendor/payouts`, `PUT /admin/commission-rules` | v_payouts, ad_commission | **P2** |
| **TR1** | Trade (global) | Incoterms, multi-currency quotes, samples, trade-doc vault | `POST /samples`, `POST /trade-docs` | c_pay_fx, c_listing_trade | **P2** |
| **TM1** | Business teams | Team members, roles, spending limits, approvals | `POST /team/members`, `POST /approvals/{id}/decision` | team | **P2** |

## 2. Background jobs and events

| Job / event | Trigger | Effect |
|---|---|---|
| Booking response deadline | timer at `response_due` | Requested → Expired, notify both |
| 7-day auto-close | timer | Awaiting → Closed, unlock review |
| RFQ deadline | timer | → No quotes / Expired |
| Credential expiry scan | daily | Reminders; gate 4 fails on expiry |
| Subscription renewal / grace | provider webhook + daily | Active → Grace → Expired |
| Search index sync | outbox events | Upsert/delete listing documents |
| Notification dispatch | events | Render template → channel provider |
| Retention / anonymisation | daily | Apply deletion & retention policy |
| Moderation scan | upload | Virus + image/text pre-screen |

## 3. Third-party integrations

| Need | Candidate | Phase |
|---|---|---|
| SMS/OTP (India DLT) | MSG91 / Twilio | MVP |
| Email | SES / SendGrid | MVP |
| Push | FCM / APNs | MVP |
| WhatsApp business | Meta Cloud API | MVP (optional) |
| Subscription billing | Razorpay Subscriptions / Stripe | MVP |
| KYC/KYB | Karza / Signzy / IDfy (GST, PAN, MCA) | MVP |
| Maps & geocoding | Google Maps / Mapbox | MVP |
| E-sign | Leegality / Digio | P2 (contracts core can use click-to-sign in MVP) |
| Payments + escrow | Razorpay Route / Cashfree | P2 |
| Shipment tracking | Shiprocket / AfterShip | P2 |
| Error / APM | Sentry + OpenTelemetry | MVP |

## 4. Cross-cutting requirements

- **Rate limiting:** OTP (per phone, IP, device), search, message send, report.
- **Authorisation:** policy layer per module; ownership checks on every resource; staff scope checks.
- **Pagination:** cursor-based. **Errors:** RFC 9457 problem+json.
- **Observability:** structured logs, metrics, traces, alerting on queue depth and webhook failures.
- **Privacy:** PII encrypted at column level for ID documents; contact details gated until booking confirmed.
- **Contract testing:** OpenAPI schema published; mobile client generated from it; the same schema is shared with the separate web workstream.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-04 13:37 | Amit | Modified: vendor profile API endpoints | Align the background API breakdown with the F-VND-09 OpenAPI draft. |
| 2026-10-29 16:27 | Shil1517 | Modified: added pointer banner | Added pointer to the new docs/ set; content review still outstanding |

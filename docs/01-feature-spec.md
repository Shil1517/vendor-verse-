# VendorVerse Feature Specification (master register)

**This file is the single source of truth for what VendorVerse does and in which phase.** Web and mobile are two clients of one product, so every feature below applies to both unless a row says otherwise. The mockups are measured against this file (see [03-mockup-sync-matrix.md](03-mockup-sync-matrix.md)); this file is not measured against the mockups.

Read order: [README](README.md) · this file · [02-phase-scope.md](02-phase-scope.md) · [03-mockup-sync-matrix.md](03-mockup-sync-matrix.md) · [04-decisions-log.md](04-decisions-log.md) · [05-maintenance-runbook.md](05-maintenance-runbook.md)

## How to read this file

**Phases** (decision D-001)

| Phase | Meaning |
|---|---|
| **P1** | Phase 1: launch scope on web, Android and iOS together. Equals the old "MVP", PRS "Release 1" and "Wave 1". |
| **P2** | Phase 2: next release. Screens stay visible in the mockups with a "Phase 2" badge (D-010). |
| **P3** | Phase 3: future roadmap. Direction only; not scheduled. PRS items called "Future" are listed here (see D-014, awaiting confirmation). |
| **OPEN** | Phase not yet decided. The row names the open decision (O-xx in the decisions log). Nothing is built or removed for an OPEN row until it is decided. |

**Rules for this file**

- Every row has exactly one phase. A feature that spans phases is split into two rows (for example F-CON-01 and F-CON-03), so a phase can be read straight off the row.
- IDs are permanent. A removed or deferred feature keeps its row (struck through or with its new phase) and gets a Change Log line. IDs are never reused.
- `PRS ref` points to the Comprehensive PRS v3.0 (24 Oct 2026). Where the owner's decisions differ from the PRS, the decision wins and the difference is listed in [04-decisions-log.md](04-decisions-log.md) section 3.
- Descriptions state the rule, not the screen. Screen names and IDs live only in the sync matrix.

---

## 1. Accounts and identity (ACC)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-ACC-01 | Sign-up and login (phone or email + OTP) | P1 | One login for all roles. No role picker at login: the role comes from the account. Admin and privileged roles add a second factor (MFA). Rate limits on OTP. | §3, §16 |
| F-ACC-02 | One identity, customer / vendor / business modes | P1 | A user can switch mode. Mode is a UX context, not a privilege; vendor APIs still need ownership. Two modes after D-022: Customer and Vendor (Business is merged into Vendor). Buying happens in Customer mode and selling in Vendor mode (D-021). Mobile no longer offers a Business mode; web still does until O-17 is closed. | §3.1 |
| F-ACC-03 | Account states | P1 | Pending verification, Active, Restricted, Suspended, Deletion requested, each with defined behaviour and a user-facing explanation. | §3.2 |
| F-ACC-04 | Account deletion request | P1 | Verify requester, run the approved deletion/anonymisation flow, keep legally required records, show status. | SC-040, CFG-08 |
| F-ACC-05 | Data export and deletion explainer | P1 | User can request an export of their data and sees what deletion keeps and removes. Added to P1 by the mobile scope doc (gap list). | §16, CFG-08 |
| F-ACC-06 | Customer profile | P1 | Individual or business type, verified contact, locale (country, language, time zone, currency), multiple saved locations, notification and privacy preferences. | §26.4.1 |
| F-ACC-07 | Settings: notification preferences, privacy, active sessions | P1 | Channel and category preferences; mandatory transactional notices cannot be switched off. | §10.2, §16 |
| F-ACC-08 | Session and device list for vendors and admins | P1 | See and revoke active sessions. Added to P1 by the mobile scope doc. | §4.3 |

## 2. Geography and markets (GEO)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-GEO-01 | Country, state, city, pincode picker | P1 | Maintained hierarchy. P1 launch geography is India: live cities Jaipur, Ajmer, Sikar, Delhi NCR (D-008). | §26.3, GM-19 |
| F-GEO-02 | Launch status and waitlist for cities not live | P1 | Shows "not yet available", nearby live markets and remote-capable vendors, and a waitlist. Never shows out-of-area vendors as local. | GM-05, GM-23, SC-041 |
| F-GEO-03 | Geo rollout manager (Launch Market Register) | P1 | Admin controls which cities and categories are publicly live. Markets not activated are never publicly searchable. | §26.11, CFG-13 |
| F-GEO-04 | Country packs (per-country localisation) | OPEN | The mobile scope doc lists country packs in both P1 admin and P2 ("per-country packs"). Decision O-04. | §26.11 |
| F-GEO-05 | Market activation checklist | OPEN | Six-item checklist and dual approval before a market goes live. Decision O-05. | §26.11, SC-044, SC-045 |
| F-GEO-06 | Vendor coverage declaration | P1 | Vendor declares cities, states, countries, radius, or remote. Coverage never defaults to worldwide. Ships-to field is displayed, not enforced for export (export is P2). | GM-20 |
| F-GEO-07 | More countries live (UAE, Singapore, more Indian metros) | P2 | Each country needs the activation review. | §26.11, CFG-14 |
| F-GEO-08 | Multi-currency display and conversion | P2 | Converted estimates labelled approximate with rate date. P1 shows INR only. | GM-25 |

## 3. Taxonomy and categories (TAX)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-TAX-01 | Browse industries, categories, subcategories | P1 | Reads the live taxonomy. All 30 industry nodes and their documented example subcategories are shown directly in the browse view without expanding an industry; actual categories without eligible listings in the market are hidden unless admin marks "always show". | §6, GM-04, D-017 |
| F-TAX-02 | Admin taxonomy builder | P1 | Create, edit, reorder, merge, retire categories without a release. Lifecycle Draft, Active, Restricted, Retired. Retired categories keep history. Super Admin only. | GM-11, GM-16, GM-18 |
| F-TAX-03 | Per-category configuration | P1 | Attribute schema, validation, booking modes, availability model, response deadline, cancellation policy, RFQ schema, verification rules, country availability, contract eligibility. Versioned; existing deals keep their snapshot. | §6.2, GM-12 |
| F-TAX-04 | Vendor suggests a category | P1 | Proposal enters an admin queue; vendor lists under the nearest approved category meanwhile; never auto-published. | GM-14, SC-046 |
| F-TAX-05 | Core Phase 1 industries (10) | P1 | Home and household, Construction, Events, Professional, IT and digital, Wholesale and distribution, Logistics, Automotive, Health/education/wellness, Agriculture/energy/environment. Five groups remain the supply-building priority. The complete 30-industry taxonomy is browseable in Phase 1; listing workflows remain configured for the existing 10 industry groups (D-017). | §6.1 |
| F-TAX-06 | Additional industries (9; formerly Phase 2) | P1 | Manufacturing and OEM, Textiles, Chemicals, Food processing, Education providers, Finance and real estate, Marketing and media, Power and utilities, Packaging and printing. Browseable with the documented example subcategories in Phase 1 (D-017); existing listing workflow configuration is unchanged. | §6.1 |
| F-TAX-07 | Additional industries (11; formerly Phase 3) | P1 | Mining, metals and minerals, Hospitality, travel and tourism, Real estate and property services, Beauty, salon and personal care, Sports, fitness and recreation, Security and safety services, Telecom and networking, Aerospace and defence suppliers, Marine and shipbuilding, Recycling and circular economy, Jewellery, gifts and luxury. Browseable with the documented example subcategories in Phase 1 (D-017); existing listing workflow configuration is unchanged. | §6.1 |
| F-TAX-08 | Schema-driven dynamic forms | P1 | Onboarding, listing, filters, comparison and RFQ forms are generated from the category schema on web and mobile. No per-category hard-coded screens. | GM-15 |

## 4. Vendor onboarding, verification and listings (VND)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-VND-01 | Onboarding wizard by vendor type | P1 | A vendor is one business with one or more vendor roles (manufacturer, supplier, wholesaler, distributor, retailer, contractor, service provider and others), not one fixed type (D-022). Forms and required documents follow the roles chosen, and the business submits only the documents its own roles require (D-018). A role is hidden publicly until verified (D-020). Role list for Phase 1: O-17. Mobile mockup has the multi-role wizard; web still has a single type until O-17 is closed. | §5.1, §26.4.2 |
| F-VND-02 | "Become a vendor" asks country first | P1 | Country selection drives verification and category availability from the first step. | GM-08 |
| F-VND-03 | Verification levels L0 to L3 | P1 | L0 Registered, L1 Contact, L2 Business, L3 Credential. Evidence, expiry tracking, reviewer queue, reasons, resubmission. Badges state what was verified and when. Not purchasable. Verification applies to the business and to each vendor role (D-019). | §5.2, §26.6 |
| F-VND-04 | Verification L4 and third-party KYB | P2 | Audited partner review; KYB/registry integrations per country. | §26.6, CFG-18 |
| F-VND-05 | Publication gates | P1 | Six gates computed live, never stored: account state, content review, subscription, category verification, required fields and service area, no holds. | §5.3 |
| F-VND-06 | Listings: create, edit, pause, unpublish | P1 | Multiple listings within plan limit; material edits can trigger re-review. | §5.4 |
| F-VND-07 | Listing review queue and duplicate detection | P1 | Duplicates are flagged, never auto-merged. Review covers text, photos, portfolio and profile images (absorbs the web photo, previous-work and profile-image screens). | §5.4, §12.2 |
| F-VND-08 | Service areas and availability | P1 | Coverage by city/pincode; availability shown only if provided. | §7.1, §8.4 |
| F-VND-09 | Vendor public profile and trust display | P1 | Verification level, ratings, response metrics, credentials with status. Platform-computed fields cannot be edited by the vendor. | §26.4.2 |
| F-VND-10 | Vendor dashboard | P1 | Listing states, subscription and lead usage, request inbox, RFQ opportunities, quotes, bookings, contracts, reviews, performance. | §26.8 |
| F-VND-11 | Profile completeness score | OPEN | PRS requires it; absent from both mockups. Decision O-09. | §26.4.2 |
| F-VND-12 | Field visibility classes (public / counterparty / private) | OPEN | PRS requires server-enforced classes; not in either mockup. Decision O-09. | §26.4 |

## 5. Discovery (DSC)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-DSC-01 | Home with search, intent tabs and category explorer | P1 | Industry-neutral brand, "what" and "where" search, region/language selectors, clearly labelled sponsored blocks. | §26.1 |
| F-DSC-02 | Search, filters, ranking, pagination | P1 | Coverage match, ineligible listings excluded, organic ranking (plan tier is not a signal), "why this matched" label. | §7, GM-21, GM-22 |
| F-DSC-03 | Search error, offline and no-result flows | P1 | Recoverable states; broader-area suggestions are labelled as mismatches. | §7.3, SC-002 |
| F-DSC-04 | Supplier and manufacturer search | P1 | Filters for vendor type, minimum order, lead time, ships-to display. | §26.7 |
| F-DSC-05 | Listing detail with honest missing-data labels | P1 | Never show zero, estimates or inferred values for price, rating, availability, credentials. | §7.4, SC-003 |
| F-DSC-06 | Product page: MOQ, volume tiers, delivery regions | P1 | Domestic delivery regions. Price on request allowed. | §26.7 |
| F-DSC-07 | Favourites and compare up to three | P1 | Compare only applicable fields; absent fields labelled; no silent currency mixing. | §7.4, §7.5 |
| F-DSC-08 | Saved searches and saved-vendor alerts | OPEN | PRS calls for meaningful-change alerts. Decision O-09. | §7.5, §26.4.1 |
| F-DSC-09 | Web SEO landing pages per country/state/city/category | OPEN | Web-only concern; indexable only for activated markets. Decision O-09. | GM-09 |
| F-DSC-10 | Personalised home and AI search | P3 | Direction only. | §24 |

## 6. Bookings (BKG)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-BKG-01 | Scheduled booking lifecycle | P1 | Draft, Requested, Confirmed, Declined, Expired, In progress, Completed-awaiting, Closed, Cancelled. Response deadline with reminders, terms and policy snapshot, time zones explicit. | §8, §26.5 |
| F-BKG-02 | Instant booking | P1 | Only for listings with reliable availability and price. Atomic capacity reservation; goes straight to Confirmed. | §26.5, SC-013 |
| F-BKG-03 | Recurring booking series | P1 | Series of linked bookings; cancelling one occurrence does not cancel the series unless the customer chooses (D-011). | §26.5 |
| F-BKG-04 | Booking modification | P1 | Original terms stay in force until the vendor accepts. | §8.6, SC-015, SC-016 |
| F-BKG-05 | Cancellation, no-show and vendor cancellation | P1 | Policy shown before submit; outcome recorded; no automatic penalty per cancellation. | §8.6, CFG-04 |
| F-BKG-06 | Completion and 7-day confirmation | P1 | Vendor marks complete; customer confirms or reports within 7 days; silence closes the booking; later support issue still possible. | §8.7 |
| F-BKG-07 | Conflicting confirmations | P1 | Customer chooses which to keep; never auto-cancel. | §8.5, SC-014 |
| F-BKG-08 | Idempotent create and independent multi-vendor requests | P1 | Double taps and retries create one booking; vendors cannot see competing requests. | §8.5, §8.6 |
| F-BKG-09 | Vendor booking inbox and actions | P1 | Accept, decline, propose change, progress, complete; leads view. | §8 |
| F-BKG-10 | Customer activity hub | P1 | Bookings, RFQs, orders, contracts in one list with consistent status vocabulary. | §19 |

## 7. RFQ and quotations (RFQ)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-RFQ-01 | Create RFQ | P1 | Category schema fields, scanned attachments, deadline, eligible vendor set. Services and goods variants. | §9.1 |
| F-RFQ-02 | Vendor quotation: submit, revise, withdraw | P1 | Price, scope, inclusions, exclusions, timeline, validity. | §9.2, §9.3 |
| F-RFQ-03 | Compare, negotiate, accept (atomic, one winner) | P1 | Exactly one quote wins under concurrent acceptance; others marked unsuccessful. | §9.5, SC-025 |
| F-RFQ-04 | Accepted-terms snapshot and work order | P1 | Accepted terms immutable; creates booking, work order, PO or contract per category. | §9.5 |
| F-RFQ-05 | Edit RFQ with revision history | P1 | Allowed while open and unaccepted; vendors notified. | §9.4, SC-021 |
| F-RFQ-06 | Deadline extension and no-quotes flow | P1 | Reminders, extension, then suggestions. | §9.4, SC-020 |
| F-RFQ-07 | Multi-currency quotes, Incoterms, samples workflow | P2 | Cross-border trade terms. | §26.5, §26.7 |

## 8. Goods, purchase orders and supplier trade (GDS)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-GDS-01 | Supplier and manufacturer listings (domestic) | P1 | Vendor type, catalogue with specs, MOQ, price tiers, lead time, certifications, delivery regions. Self-declared vs verified flags. | §26.7 |
| F-GDS-02 | Goods RFQ | P1 | Quantity, specification and delivery requirements; "Request quote" from a product. | §26.7 |
| F-GDS-03 | Purchase order lifecycle | P1 | PO created from an accepted quote, supplier accepts, processing, shipped, delivered, completed (D-003). No cart, no inventory checkout, no platform-handled payment. | PRS §24 differs, see decisions D-003 |
| F-GDS-04 | PO exceptions: rejected, cancelled, delivery exception | P1 | Defined states and notifications. | Priority review §5 |
| F-GDS-05 | PO "payment failed" state | OPEN | In P1 the platform handles no payments, so this state's meaning must be redefined. Decision O-06. | Priority review §5 |
| F-GDS-06 | PO dispute outcomes | P1 | Outcomes: replace, credit note, partial refund (between parties), close. Added to P1 by the mobile scope doc. | §12.3 |
| F-GDS-07 | Cross-border trade: customs, export markets, trade-document vault | P2 | | §26.7 |
| F-GDS-08 | Cart, inventory checkout, shipping and returns | P3 | PRS "Future". | §24 |
| F-GDS-09 | Enterprise procurement: approval chains, budgets, cost centres | P3 | | §24 |

## 9. Contracts (CON)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-CON-01 | Contract proposal, counter, in-app acceptance | P1 | From an accepted quote or mutual proposal. Each counter is a new version; only the latest can be accepted; both parties accept the same version (user, timestamp, version recorded). Enabled per category once an approved template exists (CFG-17). | §26.5.1, SC-043 |
| F-CON-02 | Milestones, 7-day confirmation, contract disputes | P1 | Milestone completion uses the §8.7 rule; dispute links a support case. Completed milestones make reviews eligible. | §26.5.1, §12.1 |
| F-CON-03 | Renewal, amendment (new version), termination | P2 | Amendments create a version that both parties accept. | §26.5.1 |
| F-CON-04 | E-signature provider integration | P2 | P1 records in-app acceptance only. | CFG-17 |
| F-CON-05 | Suspend / resume and expiry states | OPEN | PRS lists them; the P1/P2 split did not name them. Decision O-08. | §26.5.1 |

## 10. Business accounts and vendor-as-buyer (BIZ)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-BIZ-01 | Business account (separate account type) | P1 | Merged into Vendor by D-022 (supersedes D-005): a company is a vendor with company details and the documents its roles require. Whether the 3+ years / registered / owner-only eligibility and the six-step company form still apply: O-17. Mobile mockup hides the Business account (D-022); web and the Business screens stay until O-17 is closed. | §26.4.1 differs, see D-005, D-022 |
| F-BIZ-02 | Business workspace: home, services for vendors, vendor enquiries | P1 | Vendors message the company; company-side inbox. | |
| F-BIZ-03 | Company directory, storefront and direct ordering | P2 | Verified companies list products with MOQ and lead time; customers order directly and the company accepts, processes and ships. Payment is settled directly with the company; the platform tracks status only. Decision D-015 (closes O-07). | |
| F-BIZ-04 | Company verification queue | P1 | Admin reviews company evidence. | §13.1 |
| F-BIZ-05 | Vendor as buyer | P1 | A vendor switches to Customer mode to buy (D-021): find supplier, bulk RFQ, compare, accept, PO, track. Buying as the business: O-17. | Priority review journey 5 |
| F-BIZ-06 | Business team roles, approvals, spending limits | P2 | Includes vendor staff accounts. | §24 |

## 11. Messaging and notifications (MSG)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-MSG-01 | Linked, privacy-aware chat | P1 | Conversation tied to booking/RFQ; participants only; phone/email protected; report misuse. | §10.1 |
| F-MSG-02 | Contact-share consent | P1 | Contact details disclosed only through a controlled flow. | §10.1 |
| F-MSG-03 | Chat attachments, scanning, read receipts | OPEN | PRS requires attachment scanning and rate limits; mobile mockup is text only. Decision O-09. | §10.1 |
| F-MSG-04 | Notification inbox with deep links | P1 | Each notification opens the relevant record. | §10.2 |
| F-MSG-05 | Notification channels, templates, preferences | P1 | Push, SMS, email, in-app; template manager for admin (replaces the web "send notification" screen); user preferences; SMS template registration for India. | §10.2, CFG-10 |

## 12. Subscriptions and sponsored visibility (SUB)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-SUB-01 | Plans and entitlements | P1 | Tiers differ by listings, leads, tools. **Plan names and prices are not fixed (D-007, CFG-01, CFG-02).** Mockups show tier names with placeholder values labelled "sample". | §11.1 |
| F-SUB-02 | Subscription lifecycle | P1 | Active, renewal upcoming, failed with 3-day grace, expired, cancelled to end of period, restored. Existing commitments stay manageable. | §11.2 |
| F-SUB-03 | Plan checkout: tax and proration, scheduled downgrade | P1 | Vendor pays the platform. Billing callbacks authenticated and idempotent. | §26.9 |
| F-SUB-04 | Coupons | OPEN | Not in the PRS; present in mobile checkout and web admin. Decision O-02. | |
| F-SUB-05 | Lead-usage meter and limits | P1 | When a limit is reached genuine enquiries continue; show usage and upgrade. | §11.1 |
| F-SUB-06 | Sponsored visibility | P1 | Labelled; separately sold; never bypasses publication gates. Advanced bidding is P3. | §11.3 |
| F-SUB-07 | Admin subscription monitoring and billing investigation | P1 | Failure, grace, expiry views; authorised corrections. | §13.1 |
| F-SUB-08 | Tax invoice and fees explainer | P1 | Receipts/tax invoices for subscriptions; "who pays what" screen. | §26.9 |
| F-SUB-09 | Advanced ad platform, bidding, ad analytics | P3 | | §24 |

## 13. Payments and commission (PAY)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-PAY-01 | Mode A: direct payment record | P1 | Customer pays vendor outside the platform; platform records price and terms; vendor "payment received" note is informational only (D-002). | §26.9 |
| F-PAY-02 | Mode B: invoice / offline terms records | P1 | For contracts and business deals; platform stores invoices and statuses, never handles funds (D-002). | §26.9 |
| F-PAY-03 | Checkout and escrow with milestone release | P2 | Mode C. Gated by CFG-15, CFG-16 and legal review. | §26.9 |
| F-PAY-04 | Wallet and top-up | P2 | | |
| F-PAY-05 | Refund requests, status, bank verification | P2 | | §26.9 |
| F-PAY-06 | Vendor earnings and payouts | P2 | | §26.9 |
| F-PAY-07 | Platform commission engine and revenue admin | P2 | Percentage, flat, tiered or capped; dual approval; append-only ledger. | §26.9 |
| F-PAY-08 | Foreign-currency checkout | P2 | | GM-25 |
| F-PAY-09 | Tax handling for payouts (TCS/TDS) | P2 | | CFG-16 |

## 14. Trust, reviews and support (TRU)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-TRU-01 | Eligible-only reviews with rating dimensions | P1 | Only after a recorded booking, accepted quote/work order, PO or contract milestone. Overall 1 to 5 plus optional dimensions. Vendor can respond. | §12.1, §26.6 |
| F-TRU-02 | Trust score and badges | P1 | Platform-computed; "no reviews yet" is neutral. | §26.6 |
| F-TRU-03 | Reports and support cases | P1 | One vocabulary: **Cases**. Reason, evidence, severity, SLA, owner, resolution; linked to the transaction. | §12.2, §12.3 |
| F-TRU-04 | Moderation and appeals | P1 | Vendor appeal goes to a human reviewer; admin review-moderation queue. | §12.2, SC-038 |
| F-TRU-05 | Proportionate enforcement and emergency restriction | P1 | Warnings, restrictions, suspension; reason and audit; post-action review. | §12.4 |
| F-TRU-06 | Helpdesk macros and SLA timers | P2 | | |
| F-TRU-07 | Automated text/image screening | OPEN | Needs a provider decision. Decision O-09. | §12.2 |
| F-TRU-08 | Fraud-signal ML and continuous monitoring | P3 | | |

## 15. Sales agents (AGT)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-AGT-01 | Leads and pipeline | P1 | Home, leads ("Prospective vendors"), add lead, log call/message/visit, follow-ups. Assigned leads only. | §3 |
| F-AGT-02 | Consent-based assisted onboarding | P1 | Agent assists; cannot publish as vendor. | §4.2 |
| F-AGT-03 | Assigned onboarding tasks | P1 | | |
| F-AGT-04 | Agent permission boundaries | P1 | Shows what agents can and cannot do. No customer transactions, private chats, verification decisions. | §3, §4.2 |
| F-AGT-05 | Conversion performance | P1 | Assigned leads, registration and subscription conversion. | §26.8 |
| F-AGT-06 | Agent commissions and earnings | P1 | Decision D-006. Calculation, payer and payout are not defined: decision O-03. The PRS does not mention agent pay. | PRS silent |
| F-AGT-07 | Admin sales oversight | P1 | Agents list and detail, all leads (absorbs the web "shop leads" screen). | §4.2 |
| F-AGT-08 | Field and offline tools for agents | P3 | | §24 |

## 16. Admin and governance (ADM)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-ADM-01 | Admin dashboard and operational queues hub | P1 | Onboarding, listing, high-risk reports, review appeals, subscriptions, cases, category suggestions, market activation. | §13.1 |
| F-ADM-02 | Vendor verification review | P1 | Evidence viewer, approve/reject/request info with reason; reviewer cannot approve self. | §13.2 |
| F-ADM-03 | Users and account-state management | P1 | Includes a customers filter. | §3.2 |
| F-ADM-04 | Roles and permissions (RBAC) | P1 | Four roles; deny by default; role changes need reason and audit. | §4 |
| F-ADM-05 | Audit log | P1 | Actor, action, target, reason, correlation ID; role-scoped search. | §13.1 |
| F-ADM-06 | Analytics and reports | P1 | Supply, discovery, booking, RFQ, subscription, trust metrics; date ranges and export. Absorbs web "supply gaps" and "RFQ health". | §18 |
| F-ADM-07 | Platform settings | P1 | One settings area (the web duplicate "platform settings" is removed). | §13.2 |
| F-ADM-08 | Open configuration register | P1 | CFG-01 to CFG-19 with owner and status. | §23 |
| F-ADM-09 | Dual approval and self-approval blocking | OPEN | Required by the PRS for market activation and commission; neither mockup codes it. Decision O-05. | §13.2, §26.8 |
| F-ADM-10 | Maintenance and force-update screen | P1 | Added to P1 by the mobile scope doc. | |
| F-ADM-11 | Feature-flag console | P2 | | |
| F-ADM-12 | Cohort and funnel analytics, event-tracking console | P2 | | §18 |
| F-ADM-13 | Admin creates a vendor or business supplier | OPEN | Web has it; the PRS allows audited admin intervention but does not describe creation. Decision O-01. | §4.2 |

## 17. Cross-cutting (XCT)

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-XCT-01 | English and Hindi | P1 | No hard-coded strings; language-neutral state codes. | §17, CFG-19 |
| F-XCT-02 | Additional languages and right-to-left layout | P2 | Arabic (RTL), Spanish, French, German, Chinese. | CFG-19 |
| F-XCT-03 | Standard UI states | P1 | Loading, empty, error, offline/retry, permission-denied, expired on every important screen. | §19 |
| F-XCT-04 | Accessibility (WCAG 2.2 AA target) | P1 | State never shown by colour alone. | §17 |
| F-XCT-05 | Web and mobile parity | P1 | Same business states, permissions, terminology and journeys on both clients (D-013). | §17, SC-035 |
| F-XCT-06 | Customer dashboard | P1 | Bookings, RFQs, quotes, contracts, favourites, messages, reviews to give, cases, notifications. | §26.8 |
| F-XCT-07 | UK/US/EU/APAC launches, predictive pricing, multi-vendor project plans, trade finance | P3 | Direction only. | §24 |

## 18. Mockup tooling (MCK)

Not product features. They exist so stakeholders can review the mockups.

| ID | Feature | Phase | Description and rules | PRS ref |
|---|---|---|---|---|
| F-MCK-01 | Scope, vision and journeys review screens | P1 | Both mockups provide the same five required demo journeys (priority review) plus the scope/phase view, using these docs as content. Phase 2 items carry a badge (D-010). | Priority review §4 |

---

## PRS coverage check

Every PRS chapter maps to at least one feature, or to a documented non-goal.

| PRS chapter | Features |
|---|---|
| §3 Actors and accounts | ACC-01 to ACC-08 |
| §4 RBAC | ADM-04, ADM-09, AGT-04 |
| §5 Onboarding and publication | VND-01 to VND-08 |
| §6 Taxonomy | TAX-01 to TAX-08 |
| §7 Discovery | DSC-01 to DSC-09 |
| §8 Bookings | BKG-01 to BKG-10 |
| §9 RFQ | RFQ-01 to RFQ-07 |
| §10 Messaging, notifications | MSG-01 to MSG-05 |
| §11 Subscriptions | SUB-01 to SUB-09 |
| §12 Reviews, moderation, support | TRU-01 to TRU-08 |
| §13 Admin operations | ADM-01 to ADM-13 |
| §18 Analytics | ADM-06, ADM-12 |
| §26.1 to §26.3 Global, categories, geography | DSC-01, TAX-*, GEO-* |
| §26.4 Profiles | ACC-06, VND-09, VND-11, VND-12 |
| §26.5 Booking modes, contracts | BKG-*, RFQ-*, CON-* |
| §26.6 Verification, ratings | VND-03, VND-04, TRU-01, TRU-02 |
| §26.7 Supplier listings | GDS-01 to GDS-07, DSC-04, DSC-06 |
| §26.8 Dashboards | VND-10, XCT-06, AGT-05, ADM-01 |
| §26.9 Payments | PAY-01 to PAY-09, SUB-03 |
| §26.10 Responsive, i18n | XCT-01 to XCT-05 |
| §26.11 Market activation | GEO-03, GEO-05, GEO-07 |

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-11 17:25 | Sahil Soni | Modified: F-ACC-02, F-BIZ-01 descriptions | Mobile mockup hides the Business account (D-022). |
| 2026-11-11 17:00 | Sahil Soni | Modified: F-VND-01 description | Mobile mockup now implements multi-role onboarding (D-022). |
| 2026-11-11 16:52 | Sahil Soni | Modified: F-VND-01, F-VND-03, F-ACC-02, F-BIZ-01, F-BIZ-05 descriptions (phases unchanged) | Vendor and Business merged into one Vendor account with multi-valued vendor roles (D-022, D-018 to D-021); open details in O-17. |
| 2026-11-11 13:02 | Amit | Modified: F-TAX-01 subcategory visibility | Industry subcategory examples are now shown directly in the browse list on both platforms. |
| 2026-11-11 12:34 | Amit | Modified: F-TAX-01, F-TAX-05, F-TAX-06 and F-TAX-07 | D-017 moves the full documented industry browser into Phase 1 while preserving current listing workflow scope. |
| 2026-10-30 17:05 | Shil1517 | Modified: F-BIZ-03 moved from OPEN to Phase 2 | Owner decision D-015 (closes O-07). |
| 2026-10-30 16:42 | Shil1517 | Modified: no feature rules changed; new web screens mapped to features in the sync matrix | Web sync pass of 2026-10-30. The 12 web screens retired under D-009 are now removed from the web code (see matrix section 2). |
| 2026-10-29 16:27 | Shil1517 | Added: master feature register (all rows) | Web and mobile mockups had drifted and the PRS v3 was out of date; one phase-tagged register is needed so both can be synced. Phases per decisions D-001 to D-014. |

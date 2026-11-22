# Vendor roles and features

This is the working guide to the kinds of vendors in VendorVerse. It describes the current role catalogue, the features a vendor can use, and the decisions still open. The [decisions log](04-decisions-log.md) and [feature spec](01-feature-spec.md) remain authoritative for product rules and phases; the [backend catalogue](../backend/db/migrations/016_vendor_roles.up.sql) supplies the initial role rows.

## 1. How vendor roles work

- There are Customer and Vendor account types; Admin is platform staff. A manufacturer, supplier, retailer or contractor is a **role on a Vendor account**, not another account type (D-023).
- One vendor business can hold several roles. `businessType` is its primary role for compatibility; `roleCodes` holds additional roles. A role does not replace the vendor's industry, category, listings or verification level.
- A role definition has a stable code, label, description, offer type (`products`, `services`, or undecided), required documents and active/retired status. New kinds are added to the catalogue as data (D-024).
- Every added role begins `pending`. Review can make it `verified`, `rejected` or `revoked`. Only verified roles appear on the public vendor profile and in role filters (D-020, D-021). Business verification and role verification are separate.
- A vendor submits the **union** of the documents required by its chosen roles, plus any applicable country and category evidence; duplicate documents should be requested once (D-019). A document label in today's seed is a catalogue requirement, not proof that an upload or verification provider is configured.
- Roles describe what the business does. They are **not RBAC permissions**. Actual actions also depend on ownership, the offering's category configuration, listing review, verification and publication gates. The current listing API does not enforce a product/service permission from `offerType`; do not promise such a gate until it is implemented.

## 2. Current seeded role catalogue

These seven codes are inserted by migration 016. Administrators can edit or retire definitions, so a live deployment's `GET /v1/vendor-roles` is the current catalogue. The table records the seed, not a permanently fixed list.

| Code | Vendor meaning and typical offering | Seed offer type | Seed required documents | Relevant Phase 1 workflow |
|---|---|---|---|---|
| `SERVICE_PROVIDER` | Performs a service, such as plumbing, catering or consulting | Services | Government photo ID; address proof; category licence | Service listing, coverage and availability; booking or service RFQ; quotation and category-configured fulfillment |
| `CONTRACTOR` | Delivers project work with crews, drawings or milestones | Services | GST / business registration; contractor licence; insurance certificate | Service RFQ and quotation; work order or contract with milestones when the category enables it |
| `MANUFACTURER` | Makes goods, including OEM, white-label or custom products | Products | Business and factory registration; quality certificate (ISO / CE / BIS); factory photos or audit report | Product catalogue, specifications, MOQ, volume tiers and delivery regions; goods RFQ, quotation and purchase order |
| `SUPPLIER` | Stocks and sells goods, often in bulk; the seed label is **Supplier / distributor** | Products | GST / business registration; brand authorisation letter; warehouse proof | Product catalogue, goods RFQ, quotation and purchase order |
| `WHOLESALER` | Sells goods in bulk to business buyers | Products | None in the seed | Product catalogue, goods RFQ, quotation and purchase order |
| `DISTRIBUTOR` | Distributes goods across a territory | Products | None in the seed | Product catalogue, goods RFQ, quotation and purchase order |
| `OTHER` | A business whose role has not been classified yet | Undecided | None in the seed | No role-specific offering should be inferred; an administrator must configure the definition and applicable categories |

The workflow column maps each business model to existing feature families. It does not give a vendor an automatic entitlement. For example, a manufacturer may also hold `SUPPLIER`; the same vendor profile can then show both roles after each is verified.

### Roles named but not seeded

D-023 names **retailer** and **reseller** as vendor-role examples. Neither has a seeded backend code or a decided document checklist. The Phase 1 starting list and detailed capabilities remain open under O-19. They should be added through the role catalogue once those details are decided. Other future kinds are handled in the same way; a document should not turn an example into a live role by itself.

The web mock catalogue currently shows six roles (the first six above). The mobile mock catalogue shows four (`service`, `contractor`, `manufacturer`, `supplier`) with local keys that differ from backend codes. In remote mode, the clients use the backend catalogue. Neither mock list settles O-19.

## 3. Feature map

| Feature family | Who uses it | Rules and phase |
|---|---|---|
| Onboarding and roles | All vendors | Country first; choose one or more roles; primary role plus additional roles; add or remove later, keeping at least one. Phase 1: F-VND-01, F-VND-02. |
| Verification | All vendors | L0–L3 business evidence and separate role review. Only verified roles are public. L4 and third-party KYB are Phase 2. F-VND-03, F-VND-04. |
| Business profile and listings | All vendors | Own profile, service or product listings, media, review, pause/unpublish, service area and availability where relevant. Public visibility depends on six live publication gates. F-VND-05 to F-VND-09. |
| Discovery | Public shoppers and vendors as buyers | Search by verified role and offering; listing detail, supplier/manufacturer search, favorites and comparison. Product detail may show MOQ, volume tiers and delivery regions; missing values must be labelled honestly. F-DSC-02 to F-DSC-07. |
| Service transactions | Vendors with applicable service offerings | Scheduled/instant/recurring bookings, changes and completion; service RFQ, quotation and accepted-terms handoff to booking, work order or contract according to category configuration. F-BKG-01 to F-BKG-09, F-RFQ-01 to F-RFQ-06, F-CON-01 to F-CON-02. |
| Goods transactions | Vendors with applicable product offerings | Domestic goods RFQ and quotation; accepted quote creates a purchase order, then supplier acceptance, processing, shipping, delivery and exceptions. F-GDS-01 to F-GDS-04, F-GDS-06. |
| Messaging and trust | All vendors | Linked participant chat, contact-share consent, notifications, eligible-only reviews and support cases. F-MSG-01, F-MSG-02, F-MSG-04, F-MSG-05, F-TRU-01 to F-TRU-05. |
| Revenue and visibility | All eligible vendors | Plans, subscription state, lead limits, sponsored visibility and tax invoice/fees explanation. Sponsorship must not bypass publication gates. F-SUB-01 to F-SUB-03, F-SUB-05 to F-SUB-08. Plan names, prices and policy values are not set by a role. |
| Buying from another vendor | A vendor owner in Customer mode | Search, goods RFQ, quote comparison and PO tracking. Vendor mode is for selling; switching modes does not grant ownership rights. Buying *as the business* is open under O-19. F-BIZ-05, D-022. |

Phase 2 adds company storefront direct ordering, business team roles and approvals, cross-border trade and platform-facilitated payments where their feature IDs place them. Those are not Phase 1 permissions granted by a vendor role.

## 4. Operational rules for adding a kind of vendor

1. Decide its business meaning, stable code, product/service offer type and document checklist. Check O-19 before treating it as a Phase 1 launch role.
2. An administrator creates the definition through `POST /v1/admin/vendor-roles`; `GET /v1/vendor-roles` exposes active choices. Retiring a role hides it from new selection but preserves vendors that already hold it.
3. The vendor adds the role. It stays pending until a reviewer with `verification.review` decides with a reason; reviewers cannot decide their own vendor's role.
4. Verify any country/category evidence separately. Show the role publicly only after role verification. Configure the relevant categories and offering workflow separately.
5. Update web and mobile wording, filters and onboarding together. Keep role labels, offer types and document lists sourced from the catalogue in remote mode.

## 5. Decisions still needed

O-19 leaves the exact Phase 1 role list, retailer/reseller definitions, company eligibility, how role and category evidence combine, business purchasing, multiple businesses per owner, and the merged company verification/storefront treatment undecided. This document records the current seed and existing feature families without closing those questions. See [O-19](04-decisions-log.md) before changing scope or granting a new capability.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-22 22:11 | Amit | Added: vendor roles and features guide | Put the current role catalogue, shared features and open decisions in one place. |

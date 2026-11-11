# Decisions Log

Every scope decision lives here, with who made it and why. Features reference these IDs (D-xx decided, O-xx open). A decision is never deleted: if it changes, add a new decision that supersedes it and mark the old one `Superseded by D-xx`.

## 1. Decisions made

| ID | Date | Decided by | Decision | Why / effect |
|---|---|---|---|---|
| D-001 | 2026-10-29 | Shil1517 | Use **Phase 1 / Phase 2 / Phase 3** as the only phase scheme. PRS waves and delivery phases are cross-references only. | Three schemes (PRS release/wave/phase, mobile MVP/P2/P3) were in use and disagreed. |
| D-002 | 2026-10-29 | Shil1517 | **Payments: Phase 1 = Mode A (direct) + Mode B (invoice / offline terms). Phase 2 = Mode C** (checkout, escrow, wallet, refunds, payouts, commission engine). | Matches PRS release scope; removes the conflict between mobile P2 escrow screens and the web "no payments" position. Mode B needs new screens on both (F-PAY-02). |
| D-003 | 2026-10-29 | Shil1517 | **Purchase orders are in Phase 1**: goods RFQ > accepted quote > PO > tracking. No cart, no inventory checkout, no platform-handled payment. | Needed for the vendor-to-vendor and bulk-supplier demo journeys. Differs from PRS §24 (see section 3). |
| D-004 | 2026-10-29 | Shil1517 | **Contracts: core in Phase 1** (propose, counter, in-app acceptance, milestones, disputes). **Renewal, amendment, termination and e-sign provider in Phase 2.** | Keeps contracts available for ongoing work without the full legal lifecycle. Suspend/resume and expiry were not named: O-08. |
| D-005 | 2026-10-29 | Shil1517 | **Business is a separate account type** (mobile model): owner-only, 3+ years and registered, admin-verified. Web adopts it. Team roles are Phase 2. | Web had treated Business as a vendor variant. |
| D-006 | 2026-10-29 | Shil1517 | **Agent commissions are in Phase 1** on both web and mobile. | Reverses the mobile decision that removed commissions. The PRS does not mention agent pay; the model is open (O-03). |
| D-007 | 2026-10-29 | Shil1517 | **Subscription plans: names only, no prices** in the docs. Mockups show placeholders labelled sample until CFG-01 and CFG-02 are decided. | Web (Normal / Pro / Premium) and mobile (Free / Starter / Growth / Pro) used different plans and prices; the PRS says not to invent them. |
| D-008 | 2026-10-29 | Shil1517 | **Phase 1 geography and language:** India launch cities (Jaipur, Ajmer, Sikar, Delhi NCR), English and Hindi. Picker, waitlist and ships-to display stay in Phase 1. Multi-currency, Incoterms, samples, more languages and UAE / Singapore are Phase 2. | Matches mobile scope doc. |
| D-009 | 2026-10-29 | Shil1517 | **Web-only admin screens that are not in the PRS are dropped.** Their useful content folds into the matching feature. | Listed in the sync matrix section 2 (RET-01 to RET-12). Two screens that need a ruling are held (O-01, O-02). |
| D-010 | 2026-10-29 | Shil1517 | **Phase 2 features stay visible in both mockups with a "Phase 2" badge.** | Stakeholders see the roadmap; hidden flags made the mockups drift. |
| D-011 | 2026-10-29 | Shil1517 | **Recurring booking series are in Phase 1.** | PRS §26.5 and the priority review list it as a distinct journey. Neither mockup has it yet. |
| D-012 | 2026-10-29 | Shil1517 | **Deliverable is a Markdown set in `docs/`.** The PRS .docx is not edited; deviations are listed in section 3. | A diffable format that can be checked by script. |
| D-013 | 2026-10-29 | Shil1517 | **Web and mobile are one product.** Every Phase 1 feature is on both, with the same rules, terms and status names. | Stated by the owner; PRS §17 requires parity. Supersedes the mobile scope doc's "Android and iOS only, web separate". |
| D-014 | 2026-10-29 | Claude (derived from D-001), awaiting Shil1517 | **PRS items marked "Future" map to Phase 3** (cart checkout, enterprise procurement, AI, field tools, advanced ads). | D-001 defines Phase 3 as future roadmap. This is an inference, listed under O-12 for confirmation. |
| D-015 | 2026-10-30 | Shil1517 | **Company storefront ordering (F-BIZ-03) is Phase 2.** Customers can order directly from a verified company storefront; screens carry the "Phase 2" badge on both clients. Payment stays direct between customer and company. | Closes O-07. Owner chose Phase 2 with badge (D-010) when asked during the web sync. The mobile storefront screens need the badge. |
| D-016 | 2026-11-04 | Amit | **Use TypeScript with NestJS for the backend modular monolith.** Keep the documented hard module boundaries, REST/OpenAPI contracts, and PostgreSQL data layer proposal. | Owner approved the recommended backend stack so implementation can start; mobile client technology remains open under O-13. |
| D-017 | 2026-11-11 | Abhishek Samadhiya | **F-VND-13 is Phase 1 and provides six persistent appearance-only themes (Light, Dark, Midnight, Ocean, Emerald, Sunset) across Vendor, Agent and Business workspaces.** | Owner requested the six themes and explicitly excluded edits to `mobile/` in this change. Web is implemented first; mobile remains outstanding P1 parity work under D-013. Theme presets do not change data, roles, routes or workflows. |

## 2. Open decisions

Nothing in these rows is built, changed or removed until the decision is closed. When closed, add a D-xx row above, update the feature's phase in [01-feature-spec.md](01-feature-spec.md), and mark the O-xx row `Closed by D-xx`.

| ID | Question | Features affected | Context |
|---|---|---|---|
| O-01 | Can an admin create a vendor or business supplier on their behalf? | F-ADM-13 | Web has "Add vendor"; PRS §4.2 allows audited admin intervention on listings but does not describe creating accounts. Agents already have consent-based assisted onboarding. |
| O-02 | Are coupons in scope? | F-SUB-04 | Not in the PRS. Present in the web admin and in mobile plan checkout. D-009 would drop them, but that also removes the coupon field from the Phase 1 checkout. |
| O-03 | How are agent commissions calculated, who pays, and how are they paid out? | F-AGT-06, F-AGT-07 | D-006 puts commission in Phase 1; web shows amounts, mobile has nothing. The PRS has no agent-pay model. Agent commission is separate from the Phase 2 platform commission engine. |
| O-04 | Are country packs Phase 1 or Phase 2? | F-GEO-04 | The mobile scope doc lists country packs under both. Only India is live in Phase 1. |
| O-05 | Are dual approval and the market activation checklist in Phase 1? | F-GEO-05, F-ADM-09 | PRS requires dual approval for market activation and commission changes. Neither mockup implements it. Phase 1 launch cities need an activation step. |
| O-06 | What does a purchase order's "payment failed" state mean when the platform handles no payments? | F-GDS-05 | The mobile mockup has it; in Phase 1 the platform cannot fail a payment. Options: remove, or redefine as "supplier did not confirm payment terms". |
| O-07 | **Closed by D-015.** Can customers order directly from a company storefront, or do vendors only message companies? | F-BIZ-03 | Mobile scope doc says message only. The mobile mockup has a company directory, storefront and an "Order from a company" flow with company-side order handling. |
| O-08 | Are contract suspend/resume and expiry in Phase 1 or Phase 2? | F-CON-05 | D-004 named the other lifecycle parts but not these. |
| O-09 | Phase for PRS-required items that neither mockup has and no document placed: profile completeness, field visibility classes, saved searches and alerts, web SEO landing pages, chat attachments / scanning / read receipts, automated content screening. | F-VND-11, F-VND-12, F-DSC-08, F-DSC-09, F-MSG-03, F-TRU-07 | Each is a PRS "must" for the release wave in which it is enabled. |
| O-10 | Do manufacturers launch under the Wholesale industry in Phase 1 while "Manufacturing and OEM" opens in Phase 2? | F-TAX-05, F-TAX-06 | Open item from the mobile scope doc (decision 7). |
| O-11 | Is the admin role visible in the mockup role picker on both apps? | sync matrix section 3 | Web shows it; mobile hides it (`HIDE_ADMIN`). Needed so both demo the same journeys. |
| O-12 | Confirm D-014 (PRS "Future" = Phase 3) and whether the PRS should be reissued as v3.1. | F-GDS-08, F-GDS-09, F-DSC-10 and others | The PRS is dated 24 Oct 2026 and is out of step with decisions D-003, D-005, D-006, D-011, D-013. |
| O-13 | Which mobile client technology should be used: native, React Native or a web app? | docs/06-architecture-and-structure.md | Backend language and framework were decided by D-016. The mobile client choice remains open; do not assume or implement a mobile technology. |
| O-14 | What may an account in each state do: Pending verification, Restricted, Suspended, Deletion requested? | F-ACC-03 | PRS §3.2 gives only general behaviour (restrict sensitive actions; disable some capabilities with a user-facing explanation; block relevant activity but keep records). No capability list per state exists, so only Active accounts can sign in or use the API and no other state is enforced. The server needs the capability list, and the user-facing explanation copy, before it can enforce them. |
| O-15 | Which object storage and malware-scan providers are used, and what are the upload limits (maximum size, accepted file types) and the lifetimes of signed upload and download URLs? | F-VND-03, F-VND-07, F-RFQ-01, F-TRU-03 | PRS §16 requires private, scanned uploads but names no provider or limits, and none may be invented. The files API (migration 015) is built and answers 503 until the owner sets `FILE_STORAGE_PROVIDER`, `FILE_MAX_BYTES`, `FILE_ALLOWED_CONTENT_TYPES` and the two URL lifetimes; only local/test stand-ins exist. |
| O-16 | Closed by D-017. Which phase should include vendor workspace color-theme presets (Lavender Dream, Mint Breeze, Arctic Pearl, Peach Blossom and Midnight Violet, each with light/dark variants)? | F-VND-13 | Owner's 2026-11-11 decision specifies six named themes across Vendor, Agent and Business workspaces in Phase 1. |
| O-17 | Which phase should include vendor analytics appearance presets, and should the 3D option be limited to existing data-backed visuals? | F-VND-14 | Requested 2026-11-10. Existing vendor data has no trustworthy geographic activity coordinates, so a geographic globe must not invent locations or statistics; do not build the selector until its phase and 3D scope are decided. |

## 3. Where these decisions differ from the PRS v3.0

The PRS is not edited (D-012). Until it is reissued, the decision wins.

| PRS says | Decision | PRS ref |
|---|---|---|
| Product orders are Future; no cart or checkout in Release 1. | Purchase orders are in Phase 1 (cart and checkout still are not). D-003 | §2, §24 |
| Four roles; vendor staff and team accounts are Future. | Business is a separate account type in Phase 1 (still owner-only; no staff roles). D-005 | §3, §4, §26.4.1 |
| Sales Agent: leads, onboarding, conversion tracking, assigned performance. Nothing about agent pay. | Agent commissions in Phase 1. D-006 | §3, §26.8 |
| Contracts are enabled per category in Wave 1 with the full lifecycle (§26.5.1). | Core in Phase 1; renewal, amendment, termination in Phase 2. D-004 | §26.5.1 |
| Instant, scheduled, RFQ and contract bookings; scheduled includes recurring series. | Agrees; recurring is explicitly Phase 1. D-011 | §26.5 |
| Plan names and prices are open configuration. | Agrees; mockups show names with sample values only. D-007 | §11.1, CFG-01 |
| "Web, Android and iOS are intended to launch together." | Agrees. Supersedes the mobile scope doc's "mobile only". D-013 | §2.1 |
| Initial launch in selected cities, English and Hindi. | Agrees; India launch cities fixed. D-008 | §2.1, CFG-13 |

## 4. Conflicts from the earlier web-vs-mobile gap analysis, and their resolution

| Gap-analysis item | Resolution |
|---|---|
| #1 Which requirements version is the source? | PRS v3.0 plus these docs (decisions win over PRS text). |
| #29 Payment model disagreement | D-002. |
| #43 Agent commissions contradiction | D-006 (commission in Phase 1); model open O-03. |
| #35 Plan names and prices | D-007. |
| #8 Business: separate account or vendor variant | D-005. |
| #11 Which admin consoles belong on both sides | D-009 for web-only screens; mobile-only admin screens (cases, subscriptions, geo, taxonomy, config register, company queue, reviews) are Phase 1 features on both (sync matrix). |
| #3 Mobile meta screens vs web scope-review screen | F-MCK-01: both mockups provide the same review screens. |

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-11 11:31 | Abhishek Samadhiya | Added: D-017; closed O-16 | Owner requested six appearance-only themes for the three web workspaces and explicitly excluded mobile files from this change. |
| 2026-11-10 11:02 | Abhishek Samadhiya | Added: O-16 and O-17 | Record owner phase and 3D analytics-scope decisions required before new preference controls can be built. |
| 2026-11-06 15:05 | Shil1517 | Added: O-15 | The files module needs owner decisions on storage and scan providers, upload limits and URL lifetimes; none are invented. |
| 2026-11-06 13:48 | Shil1517 | Added: O-14 | Account-state enforcement cannot be built without a per-state capability list; PRS §3.2 is not specific enough. |
| 2026-11-04 15:24 | Amit | Added: D-016; narrowed O-13 to mobile client technology | Owner approved TypeScript and NestJS for the modular-monolith backend; mobile technology remains undecided. |
| 2026-10-31 15:10 | Shil1517 | Added: O-13 | Architecture scaffold needs a backend and mobile technology decision; not assumed. |
| 2026-10-30 17:05 | Shil1517 | Added: D-015; closed O-07 | Owner decided during the web sync pass that company storefront ordering is Phase 2 with a badge. |
| 2026-10-30 16:42 | Shil1517 | Modified: no decision added; D-005, D-006, D-007 and D-009 applied to the web mockup | Web sync pass of 2026-10-30. Removed from web: ad_faqs, ad_requirements, ad_supply_gaps, ad_quote_moderation, ad_category_templates, ad_rfq_health, ad_platform_settings, ad_photo_approvals, ad_previous, ad_profile_images, ad_shop_leads, ad_notifications. Held per O-01 and O-02: ad_vendor_new, ad_coupons. |
| 2026-10-29 16:27 | Shil1517 | Added: D-001 to D-014, O-01 to O-12, PRS differences, gap-analysis resolutions | Owner answered the phase questions on 2026-10-29; open items recorded instead of being assumed. |

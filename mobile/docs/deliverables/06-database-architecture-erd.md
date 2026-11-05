# 06 · Product-Wide Logical Data Model / ERD

> **Logical model.** PostgreSQL 16 SQL migrations 001-013 in `backend/db/migrations/` implement the Phase 1 scope of this model; section 10 records where the physical schema differs from the diagrams and what is deliberately not built. This ERD maps the wider current product requirements across the feature register, owner decisions, PRS v3.0, and proposed architecture. It does not add, remove, or re-phase product behavior. Source precedence remains [04-decisions-log.md](../../../docs/04-decisions-log.md), [01-feature-spec.md](../../../docs/01-feature-spec.md), the read-only [PRS](../../../docs/VendorVerse_Comprehensive_PRS_v3_Global_Marketplace.docx), then the sync matrix and mockup. The migration scope is explicitly authorized while proposed architecture choices remain proposed and O-13 stays open.

The model is grouped by domain for readability. Relationships show conceptual ownership and references, not permission for one module to read another module's tables. Per the architecture, modules use their public interfaces. Physical design for domains beyond the initial migration slice, partitioning, retention periods, provider choices, and application-stack decisions remain for technical discovery and owner-approved implementation.

## 1. Modeling rules and source alignment

1. **Identity and authorization are distinct.** A user is the authenticated identity. Account modes (customer, vendor, business) are UX context; roles, ownership, assignment, account state, and workflow state determine authorization. Deny by default (F-ACC-01, F-ACC-02, F-ADM-04; PRS §§3–4).
2. **Business stays separate.** A business account is owner-only, registered, meets the D-005 age requirement, and requires admin verification. It is not a vendor subtype. Business teams and vendor staff are Phase 2 (D-005, F-BIZ-01, F-BIZ-06).
3. **Global-ready, controlled activation.** Geography and taxonomy can represent multiple markets, but a market or category is not publicly searchable until enabled. Never infer worldwide coverage or market activation (D-008, F-GEO-01 to F-GEO-03, F-GEO-06; PRS §§14, 26.2–26.3).
4. **Taxonomy is data, not code.** The hierarchy is configurable and supports localized labels, aliases, market availability, attributes and versioned configuration. Manufacturer placement for Phase 1 remains open (F-TAX-01 to F-TAX-08, O-10; PRS §26.2).
5. **Computed publication.** Listing visibility is derived from the six publication gates; `is_public` is not an authoritative stored field (F-VND-05; architecture §1).
6. **Snapshots and state integrity.** Accepted quotation terms, booking terms and contract versions remain immutable. Critical transitions and concurrent accept/reservation operations need transactional constraints (PRS §§14–15; D-003, D-004, D-011).
7. **No invented values.** This model sets no prices, plan names, rate limits, response deadlines, retention periods, agent commission rules, or other open CFG/O-xx values.
8. **Payment boundary.** Phase 1 records Mode A direct payments and Mode B invoice/offline terms; the platform does not handle transaction funds. Mode C, escrow, refunds, payouts and platform commission remain Phase 2 and approval-gated (D-002, F-PAY-01 to F-PAY-09, CFG-15/16).
9. **Architecture boundary.** Keep the documented modular-monolith shape and proposed stack (PostgreSQL 16 + PostGIS, Redis, OpenSearch read model, S3-compatible storage, REST/OpenAPI). This diagram neither changes those proposals nor makes O-13 technology choices into owner decisions.

## 2. ERD — identity, account types, roles, and sessions

```mermaid
erDiagram
  USER ||--o{ USER_IDENTIFIER : has
  USER ||--o{ AUTH_SESSION : opens
  USER ||--o{ ROLE_ASSIGNMENT : receives
  USER ||--o{ USER_CONSENT : records
  USER ||--o{ USER_PRIVACY_PREFERENCE : sets
  USER ||--o{ ACCOUNT_DATA_REQUEST : requests
  ROLE ||--o{ ROLE_ASSIGNMENT : assigned
  ROLE ||--o{ ROLE_PERMISSION : grants
  PERMISSION ||--o{ ROLE_PERMISSION : included
  USER ||--o{ VENDOR : owns
  USER ||--o{ BUSINESS_ACCOUNT : owns
  USER ||--o{ CUSTOMER_PROFILE : may_have
  USER ||--o| SALES_AGENT_PROFILE : may_have

  USER {
    id PK
    status account_state
    current_mode account_mode
    locale locale_preferences
    consent consent_records
  }
  USER_IDENTIFIER {
    id PK
    user_id FK
    channel phone_or_email
    normalized_value
    verified_at timestamp
  }
  AUTH_CHALLENGE {
    id PK
    identifier_reference
    purpose OTP_or_MFA
    verifier_hash
    expires_at timestamp
    consumed_at timestamp
    failed_attempts integer
  }
  AUTH_RATE_LIMIT_BUCKET {
    scope PK
    subject_hash PK
    window_ends_at timestamp
    request_count integer
  }
  AUTH_SESSION {
    id PK
    user_id FK
    refresh_verifier_hash
    created_at timestamp
    expires_at timestamp
    revoked_at timestamp
    device_metadata
  }
  ROLE {
    id PK
    code Customer_Vendor_SalesAgent_SuperAdmin
  }
  PERMISSION {
    id PK
    code permission_catalogue
  }
  ROLE_ASSIGNMENT {
    id PK
    user_id FK
    role_id FK
    granted_by_user_id FK
    reason
    revoked_at timestamp
  }
  ROLE_PERMISSION {
    role_id PK, FK
    permission_id PK, FK
  }
  CUSTOMER_PROFILE {
    user_id PK, FK
    customer_type
    verified_contact_reference
    locale_reference
  }
  USER_CONSENT {
    id PK
    user_id FK
    consent_type
    accepted_version
    recorded_at timestamp
    withdrawn_at timestamp
  }
  USER_PRIVACY_PREFERENCE {
    user_id PK, FK
    preference_key PK
    preference_value
    updated_at timestamp
  }
  ACCOUNT_DATA_REQUEST {
    id PK
    user_id FK
    request_type export_or_deletion
    status
    verified_at timestamp
    requested_at timestamp
    completed_at timestamp
  }
  BUSINESS_ACCOUNT {
    id PK
    owner_user_id FK
    registered_business_details
    eligibility_evidence
    verification_status
    verified_by_user_id FK
  }
  SALES_AGENT_PROFILE {
    user_id PK, FK
    assigned_profile_details
    status
  }
```

### Identity and access constraints

- Account states follow F-ACC-03: Pending verification, Active, Restricted, Suspended, and Deletion requested. These are not roles or modes.
- Phone/email identifiers are verified and uniquely resolve an identity per channel. Exact normalization and uniqueness implementation are physical-schema decisions.
- Authentication challenges and sessions represent OTP/MFA, refresh rotation, revocation, and device/session visibility without fixing token lifetime, OTP expiry, retry thresholds, or MFA enrollment/recovery details.
- The initial auth implementation migration adds per-challenge failed-attempt tracking and hashed-subject request buckets; policy values remain required runtime configuration, not schema defaults.
- Persist only secure verifiers/hashes for OTP and refresh credentials, never reusable plaintext secrets. Privileged roles use individual accounts, MFA, short-lived sessions, revocation, reason capture, and audit (PRS §§3–4, 16).
- The four roles are Customer, Vendor, Sales Agent, and Super Admin. Role permissions are deny-by-default and checked server-side with ownership, assignment, account state, and workflow state. A role assignment is not an account mode.
- `BUSINESS` mode is available only through the user's separate owner-only, eligible, admin-verified business account. Team membership is not a Phase 1 relationship.
- Customer profile locale/preferences and saved locations, privacy and notification preferences, account export/deletion requests, and session revocation remain part of the account domain (F-ACC-03 to F-ACC-08); detailed records and retention rules require their feature/API contracts.

## 3. ERD — geography, market activation, taxonomy, and suggestions

```mermaid
erDiagram
  COUNTRY ||--o{ REGION : contains
  REGION ||--o{ CITY : contains
  CITY ||--o{ LOCALITY : contains
  COUNTRY ||--o{ MARKET_ACTIVATION : scopes
  CITY o|--o{ MARKET_ACTIVATION : scopes
  USER o|--o{ MARKET_WAITLIST : joins
  CITY ||--o{ MARKET_WAITLIST : requested_for
  MARKET_ACTIVATION ||--o{ MARKET_CATEGORY : enables
  TAXONOMY_NODE ||--o{ MARKET_CATEGORY : available_as
  INDUSTRY ||--o{ TAXONOMY_NODE : groups
  TAXONOMY_NODE ||--o{ TAXONOMY_NODE : parent_of
  TAXONOMY_NODE ||--o{ CATEGORY_CONFIG_VERSION : versions
  CATEGORY_CONFIG_VERSION ||--o{ ATTRIBUTE_DEFINITION : defines
  USER ||--o{ CATEGORY_SUGGESTION : submits
  USER o|--o{ CATEGORY_SUGGESTION : reviews
  TAXONOMY_NODE o|--o{ CATEGORY_SUGGESTION : related_to

  COUNTRY {
    id PK
    iso_country_code
    localized_names
    activation_status
  }
  REGION {
    id PK
    country_id FK
    localized_names
    region_type
  }
  CITY {
    id PK
    region_id FK
    localized_names
    time_zone
    activation_status
  }
  LOCALITY {
    id PK
    city_id FK
    postal_code
    localized_names
  }
  MARKET_WAITLIST {
    id PK
    user_id FK
    city_id FK
    contact_reference
    status
    created_at timestamp
  }
  MARKET_ACTIVATION {
    id PK
    country_id FK
    city_id FK
    status
    enabled_languages
    currencies
    tax_settings
    payment_modes
    verification_matrix
    legal_document_versions
    version
  }
  MARKET_CATEGORY {
    market_activation_id PK, FK
    taxonomy_node_id PK, FK
    enabled
  }
  INDUSTRY {
    id PK
    name
    localized_names
    phase P1_P2_P3
    sort_order
  }
  TAXONOMY_NODE {
    id PK
    industry_id FK
    parent_node_id FK
    node_type
    lifecycle
    localized_names
    aliases_and_synonyms
    sort_order
    always_show
    merged_into_node_id FK
  }
  CATEGORY_CONFIG_VERSION {
    id PK
    taxonomy_node_id FK
    version_number
    attribute_schema
    validation_rules
    booking_modes
    availability_model
    response_deadline
    cancellation_policy
    rfq_schema
    verification_rules
    country_availability
    price_units_and_currencies
    contract_eligibility
    supplier_attributes
    mandatory_compliance_notices
    created_by_user_id FK
    created_at timestamp
  }
  ATTRIBUTE_DEFINITION {
    id PK
    category_config_version_id FK
    key
    localized_label
    data_type
    validation
    filterable
    required
    sort_order
  }
  CATEGORY_SUGGESTION {
    id PK
    submitted_by_user_id FK
    proposed_path
    justification
    status
    reviewer_user_id FK
    decision_reason
    related_node_id FK
    created_at timestamp
    reviewed_at timestamp
  }
```

### Geography and taxonomy constraints

- Geography supports country, region/state/province, city, locality/postal code, and where configured a radius or service polygon. Country, region, city, locality and market records use stable identifiers, localized names, aliases where applicable, and explicit activation state (F-GEO-01 to F-GEO-03, F-GEO-06; PRS §26.3).
- `MARKET_WAITLIST` records a user's request for a not-yet-live city and supports notification when availability changes (F-GEO-02).
- The global architecture supports countries without states or postal codes. India is the Phase 1 launch; additional markets and currencies retain their feature phases and activation requirements (D-008, F-GEO-07/08).
- Market activation includes country/city scope, enabled categories, languages, currencies, tax settings, payment modes, verification matrix and legal document versions. Dual approval/checklist behavior remains open under O-05 and is not assumed here.
- `TAXONOMY_NODE` is a configurable hierarchy. Its node types represent the PRS path Domain/Industry → Category → Subcategory → Service/Product/Rental/Supply → Attributes; depth is configurable (PRS §26.2). Phase 1's manufacturer placement remains unresolved by O-10.
- Lifecycle values for category nodes are Draft, Active, Restricted, Retired. Retired and merged nodes retain identity and historical references; there is no hard-delete operation. A merge can redirect current listings while retaining history.
- Configuration versions are immutable and uniquely ordered per node. A change creates a new version; transaction snapshots keep the version/terms used when agreed. Schema propagation to search and homepage is event-driven under the documented architecture.
- `always_show` affects browse visibility only; it does not activate a market/category or bypass publication eligibility. A suggestion is reviewed by an authorized admin and never auto-publishes a category (F-TAX-01 to F-TAX-04).

## 4. ERD — vendors, verification, listings, and availability

```mermaid
erDiagram
  USER ||--o{ VENDOR : owns
  VENDOR ||--|| VENDOR_PROFILE : has
  VENDOR ||--o{ VENDOR_CATEGORY : selects
  TAXONOMY_NODE ||--o{ VENDOR_CATEGORY : classifies
  VENDOR ||--o{ VENDOR_DOCUMENT : submits
  VENDOR ||--o{ VERIFICATION : reviewed_for
  USER ||--o{ VERIFICATION : reviews
  VENDOR ||--o{ LISTING : owns
  TAXONOMY_NODE ||--o{ LISTING : classifies
  CATEGORY_CONFIG_VERSION ||--o{ LISTING : validates_against
  LISTING ||--o{ LISTING_ATTRIBUTE : describes
  LISTING ||--o{ LISTING_REVIEW : reviewed
  USER ||--o{ LISTING_REVIEW : reviews
  LISTING ||--o{ DUPLICATE_FLAG : flagged
  VENDOR ||--o{ SERVICE_AREA : covers
  LISTING o|--o{ SERVICE_AREA : narrows
  CITY o|--o{ SERVICE_AREA : locates
  LISTING ||--o{ AVAILABILITY_RULE : schedules
  LISTING ||--o{ AVAILABILITY_CAPACITY : offers
  VENDOR ||--o{ CATALOG_ITEM : supplies

  VENDOR {
    id PK
    owner_user_id FK
    business_type
    legal_business_details
    registration_country
    account_status
  }
  VENDOR_PROFILE {
    vendor_id PK, FK
    public_profile_fields
    profile_media_references
    moderated_links
  }
  VENDOR_CATEGORY {
    vendor_id PK, FK
    taxonomy_node_id PK, FK
    selected_config_version
  }
  VENDOR_DOCUMENT {
    id PK
    vendor_id FK
    document_type
    private_object_reference
    submitted_at timestamp
  }
  VERIFICATION {
    id PK
    vendor_id FK
    level L0_to_L3
    status
    evidence_reference
    reviewer_user_id FK
    reason
    expiry_at timestamp
    decided_at timestamp
  }
  LISTING {
    id PK
    vendor_id FK
    taxonomy_node_id FK
    config_version
    content
    price_or_range
    content_state
    subscription_state_reference
    hold_state_reference
  }
  LISTING_ATTRIBUTE {
    listing_id PK, FK
    attribute_key PK
    value
  }
  LISTING_REVIEW {
    id PK
    listing_id FK
    reviewer_user_id FK
    status
    reason
    created_at timestamp
  }
  DUPLICATE_FLAG {
    id PK
    listing_id FK
    possible_duplicate_listing_id FK
    review_status
  }
  SERVICE_AREA {
    id PK
    vendor_id FK
    listing_id FK
    geography_reference
    coverage_type
  }
  AVAILABILITY_RULE {
    id PK
    listing_id FK
    local_schedule
    time_zone
    availability_model
  }
  AVAILABILITY_CAPACITY {
    id PK
    listing_id FK
    interval
    capacity
  }
  CATALOG_ITEM {
    id PK
    vendor_id FK
    listing_id FK
    specifications
    minimum_order_quantity
    price_tiers
    lead_time
    certifications
    delivery_regions
    declared_or_verified
  }
```

### Vendor and listing constraints

- Vendor onboarding records the owner relationship before category selection, service area, profile, documents, and submission for review. Release 1 vendor operations are owner-only; do not introduce vendor staff membership (F-VND-01/02; PRS §§5, 14).
- Business identity and vendor identity remain separate. Public profile projection excludes private identity and evidence. Platform-computed trust and verification fields are not vendor-editable (D-005, F-VND-09; `vendor.openapi.yaml`).
- Verification captures evidence type/reference, status, expiry, reviewer, reason, and audit history. Phase 1 is L0–L3; L4 and third-party KYB are Phase 2 (F-VND-03/04).
- Listing visibility is computed from account state, content review, subscription eligibility, category verification, required fields/service area, and holds. Do not persist `is_public` as its source of truth (F-VND-05).
- Duplicate detection flags possible duplicates for review; it never auto-merges listings (F-VND-07).
- Vendor-declared coverage is explicit (cities, regions, countries, radius, remote/worldwide when applicable). It never defaults to worldwide (F-GEO-06; PRS §26.3).
- Supplier catalogue fields support domestic P1 listings; cross-border trade details such as Incoterms, samples and export workflows remain Phase 2 (F-GDS-01, F-RFQ-07, F-GDS-07).

## 5. ERD — bookings, RFQs, quotations, orders, and contracts

```mermaid
erDiagram
  CUSTOMER_PROFILE ||--o{ BOOKING : requests
  LISTING ||--o{ BOOKING : booked
  BOOKING_SERIES o|--o{ BOOKING : groups
  BOOKING ||--o{ BOOKING_EVENT : timeline
  BOOKING ||--o{ BOOKING_MODIFICATION : changes
  BOOKING ||--|| BOOKING_TERMS_SNAPSHOT : freezes
  CUSTOMER_PROFILE ||--o{ RFQ : creates
  RFQ ||--o{ RFQ_REVISION : versions
  RFQ ||--o{ RFQ_RECIPIENT : routes
  RFQ ||--o{ QUOTE : receives
  QUOTE ||--o{ QUOTE_REVISION : versions
  QUOTE ||--o{ QUOTE_LINE : itemizes
  RFQ o|--o| ACCEPTED_TERMS_SNAPSHOT : accepts
  ACCEPTED_TERMS_SNAPSHOT ||--o| WORK_ORDER : produces
  ACCEPTED_TERMS_SNAPSHOT ||--o| PURCHASE_ORDER : produces
  ACCEPTED_TERMS_SNAPSHOT ||--o| CONTRACT : produces
  ACCEPTED_TERMS_SNAPSHOT ||--o{ PAYMENT_RECORD : records_terms
  PURCHASE_ORDER ||--o{ PO_LINE : contains
  PURCHASE_ORDER ||--o{ PO_EVENT : timeline
  PURCHASE_ORDER ||--o{ SHIPMENT : tracks
  CONTRACT ||--o{ CONTRACT_VERSION : versions
  CONTRACT_VERSION ||--o{ CONTRACT_ACCEPTANCE : accepted_by
  CONTRACT ||--o{ MILESTONE : schedules

  BOOKING {
    id PK
    listing_id FK
    customer_user_id FK
    vendor_id FK
    booking_mode
    state
    requested_terms
    slot_start timestamp
    slot_end timestamp
    response_due timestamp
    idempotency_reference
  }
  BOOKING_SERIES {
    id PK
    customer_user_id FK
    recurrence_rule
    state
  }
  BOOKING_EVENT {
    id PK
    booking_id FK
    actor_user_id FK
    event_type
    occurred_at timestamp
  }
  BOOKING_MODIFICATION {
    id PK
    booking_id FK
    proposed_terms
    state
    created_by_user_id FK
  }
  BOOKING_TERMS_SNAPSHOT {
    id PK
    booking_id FK
    category_config_version
    accepted_terms
    policy_snapshot
    accepted_at timestamp
  }
  RFQ {
    id PK
    customer_user_id FK
    taxonomy_node_id FK
    kind service_or_goods
    state
    current_revision
    quote_deadline timestamp
  }
  RFQ_REVISION {
    id PK
    rfq_id FK
    revision_number
    requirements
    category_config_version
    created_at timestamp
  }
  RFQ_RECIPIENT {
    rfq_id PK, FK
    vendor_id PK, FK
    delivery_state
  }
  QUOTE {
    id PK
    rfq_id FK
    vendor_id FK
    current_revision
    state
  }
  QUOTE_REVISION {
    id PK
    quote_id FK
    revision_number
    price_and_currency
    scope_and_terms
    timeline
    validity
  }
  ACCEPTED_TERMS_SNAPSHOT {
    id PK
    rfq_id FK
    quote_id FK
    quote_revision_id FK
    immutable_terms
    accepted_at timestamp
  }
  PAYMENT_RECORD {
    id PK
    accepted_terms_snapshot_id FK
    mode A_direct_or_B_offline_terms
    amount_minor_units
    currency
    status
    external_payment_reference
    terms_snapshot
  }
  PURCHASE_ORDER {
    id PK
    accepted_terms_snapshot_id FK
    buyer_user_id FK
    supplier_vendor_id FK
    state
    terms_snapshot
  }
  PO_LINE {
    id PK
    purchase_order_id FK
    catalog_item_reference
    quantity
    agreed_terms
  }
  SHIPMENT {
    id PK
    purchase_order_id FK
    status
    delivery_region
  }
  CONTRACT {
    id PK
    accepted_terms_snapshot_id FK
    parties
    current_version
    state
  }
  CONTRACT_VERSION {
    id PK
    contract_id FK
    version_number
    scope_schedule_price_terms
    created_at timestamp
  }
  CONTRACT_ACCEPTANCE {
    id PK
    contract_version_id FK
    accepting_user_id FK
    accepted_at timestamp
  }
  MILESTONE {
    id PK
    contract_id FK
    terms
    state
    due_at timestamp
  }
```

### Transaction constraints

- Booking modes, deadlines, availability, cancellation policy and required fields come from the applicable category configuration version. All schedules retain an explicit timezone; instants are stored in UTC (PRS §14).
- Recurring bookings are linked occurrences; cancellation of one occurrence does not cancel the series unless selected (D-011).
- Idempotency prevents duplicate booking creation. Capacity reservation and booking acceptance are concurrency-safe. Existing policy and accepted terms are snapshots.
- RFQ edits are versioned while open. A quote revision is retained; exactly one quote can be accepted per RFQ, atomically, and its accepted terms are immutable (F-RFQ-03). Unselected vendors cannot see competing RFQs/quotes beyond their authorization scope.
- An accepted snapshot may produce the appropriate booking/work order, Phase 1 purchase order, or Phase 1 contract according to category and workflow. PO creation does not imply cart, inventory checkout, or platform-handled funds (D-003).
- Phase 1 contracts support proposal, counter, in-app acceptance, milestones and disputes. Renewal, amendment, termination and e-sign are Phase 2; suspend/resume and expiry remain open under O-08 (D-004).
- PO “payment failed” remains unresolved under O-06. Mode A/B payment records represent parties' direct/offline terms, not platform payment processing.

## 6. ERD — customer activity, messaging, reviews, support, and notifications

```mermaid
erDiagram
  CUSTOMER_PROFILE ||--o{ SAVED_LOCATION : stores
  CUSTOMER_PROFILE ||--o{ FAVORITE : saves
  VENDOR ||--o{ FAVORITE : favorited
  USER ||--o{ CONVERSATION_PARTICIPANT : participates
  CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : has
  CONVERSATION ||--o{ MESSAGE : contains
  USER ||--o{ MESSAGE : sends
  CONVERSATION ||--o{ CONVERSATION_LINK : relates
  USER ||--o{ CONTACT_SHARE_CONSENT : grants
  USER ||--o{ REVIEW : authors
  REVIEW ||--o{ REVIEW_RATING : rates
  REPORT ||--o| SUPPORT_CASE : opens
  SUPPORT_CASE ||--o{ CASE_EVIDENCE : contains
  SUPPORT_CASE ||--o{ CASE_ACTION : records
  SUPPORT_CASE ||--o{ APPEAL : receives
  USER ||--o{ NOTIFICATION : receives
  NOTIFICATION ||--o{ DELIVERY_ATTEMPT : attempts
  USER ||--o{ NOTIFICATION_PREFERENCE : sets
  NOTIFICATION }o--|| NOTIFICATION_TEMPLATE : uses

  SAVED_LOCATION {
    id PK
    customer_user_id FK
    geography_reference
    label
  }
  FAVORITE {
    customer_user_id PK, FK
    vendor_id PK, FK
    created_at timestamp
  }
  CONVERSATION {
    id PK
    linked_transaction_reference
    state
  }
  CONVERSATION_PARTICIPANT {
    conversation_id PK, FK
    user_id PK, FK
    joined_at timestamp
  }
  CONVERSATION_LINK {
    id PK
    conversation_id FK
    linked_resource_type
    linked_resource_id
  }
  MESSAGE {
    id PK
    conversation_id FK
    sender_user_id FK
    body
    sent_at timestamp
  }
  CONTACT_SHARE_CONSENT {
    id PK
    user_id FK
    conversation_id FK
    scope
    granted_at timestamp
    revoked_at timestamp
  }
  REVIEW {
    id PK
    author_user_id FK
    vendor_id FK
    eligible_transaction_reference
    overall_rating
    response
    moderation_state
  }
  REVIEW_RATING {
    review_id PK, FK
    dimension
    rating
  }
  REPORT {
    id PK
    reporter_user_id FK
    target_reference
    reason
    created_at timestamp
  }
  SUPPORT_CASE {
    id PK
    report_id FK
    transaction_reference
    severity
    state
    assigned_staff_user_id FK
    sla_due_at timestamp
    resolution
  }
  CASE_EVIDENCE {
    id PK
    support_case_id FK
    private_object_reference
  }
  CASE_ACTION {
    id PK
    support_case_id FK
    actor_user_id FK
    action
    reason
    occurred_at timestamp
  }
  APPEAL {
    id PK
    support_case_id FK
    appellant_user_id FK
    reviewer_user_id FK
    outcome
    reason
  }
  NOTIFICATION {
    id PK
    recipient_user_id FK
    template_id FK
    linked_resource_reference
    status
  }
  DELIVERY_ATTEMPT {
    id PK
    notification_id FK
    channel
    idempotency_reference
    status
    attempted_at timestamp
  }
  NOTIFICATION_PREFERENCE {
    user_id PK, FK
    channel
    category
    enabled
  }
  NOTIFICATION_TEMPLATE {
    id PK
    event_type
    channel
    localized_content
    version
  }
```

### Privacy, trust, and notification constraints

- Conversations are linked to an authorized booking or RFQ context. Only participants may read/send; contact information is protected until the controlled consent flow. Support access is case-bound, purpose-limited, and audited (F-MSG-01/02; PRS §§10, 14).
- Chat attachments, scanning, read receipts, and automated content screening remain OPEN under O-09. RFQ/vendor evidence files still use private storage and authorized, short-lived access; this diagram does not enable OPEN chat behavior.
- Reviews require an eligible completed/accepted transaction reference, enforce one review per eligible party/transaction as applicable, and support moderation and vendor responses (F-TRU-01/02).
- Reports and cases retain reason, evidence reference, severity, owner, SLA, resolution, appeals, and audit trail. Emergency restrictions are proportionate and reviewed (F-TRU-03 to F-TRU-05).
- Notification delivery attempts are retry-safe and deduplicated. Mandatory transactional notifications cannot be disabled by preferences (F-ACC-07, F-MSG-04/05).

## 7. ERD — subscriptions, payments, agents, and audit

```mermaid
erDiagram
  VENDOR ||--o{ SUBSCRIPTION : holds
  PLAN ||--o{ SUBSCRIPTION : selected
  PLAN ||--o{ PLAN_VERSION : versions
  PLAN_VERSION ||--o{ PLAN_ENTITLEMENT : defines
  SUBSCRIPTION ||--o{ BILLING_EVENT : receives
  SUBSCRIPTION ||--o{ INVOICE : bills
  VENDOR ||--o{ SPONSORED_CAMPAIGN : requests
  USER ||--o{ SALES_LEAD : assigned_or_created
  SALES_AGENT_PROFILE ||--o{ SALES_LEAD : owns
  SALES_LEAD ||--o{ LEAD_ACTIVITY : logs
  SALES_LEAD ||--o{ ONBOARDING_CONSENT : authorizes
  USER ||--o{ AUDIT_EVENT : acts
  USER ||--o{ AUDIT_EVENT : subject

  PLAN {
    id PK
    name
    status
  }
  PLAN_VERSION {
    id PK
    plan_id FK
    version_number
    entitlements
    effective_period
  }
  PLAN_ENTITLEMENT {
    id PK
    plan_version_id FK
    entitlement_key
    configured_value
  }
  SUBSCRIPTION {
    id PK
    vendor_id FK
    plan_version_id FK
    state
    paid_period
    grace_period
  }
  BILLING_EVENT {
    id PK
    subscription_id FK
    provider_event_id
    event_type
    authenticated_payload_reference
    processed_at timestamp
  }
  INVOICE {
    id PK
    subscription_id FK
    invoice_number
    tax_and_fee_details
    amount_minor_units
    currency
    status
  }
  SPONSORED_CAMPAIGN {
    id PK
    vendor_id FK
    placement
    status
    budget_configuration_reference
  }
  SALES_LEAD {
    id PK
    assigned_agent_user_id FK
    prospective_vendor_reference
    status
    created_at timestamp
  }
  LEAD_ACTIVITY {
    id PK
    sales_lead_id FK
    actor_user_id FK
    activity_type
    notes
    follow_up_at timestamp
  }
  ONBOARDING_CONSENT {
    id PK
    sales_lead_id FK
    prospective_user_reference
    consent_scope
    granted_at timestamp
    revoked_at timestamp
  }
  AUDIT_EVENT {
    id PK
    actor_user_id FK
    actor_role
    action
    target_type
    target_id
    reason
    correlation_id
    occurred_at timestamp
  }
```

### Revenue, agents, and audit constraints

- Plan names, prices, entitlements, limits, and rates remain owner-controlled configuration; no sample or guessed value is a production default (D-007, CFG-01/02). Subscription lifecycle and billing callbacks are idempotent and provider-authenticated.
- Sponsored placement is visibly labeled and cannot bypass any publication, safety, or verification gate (F-SUB-06).
- Mode A/B transaction records may be linked to their booking/order/contract; they record the parties' terms/status and do not initiate, hold, settle, or refund funds. Platform Mode C and its ledger remain Phase 2 and disabled until CFG-15/16 approval.
- Agent leads, assigned activities, and consent-based onboarding are Phase 1. D-006 puts commissions in scope, but calculation, payer, and payout are OPEN under O-03; do not encode invented rates or settlement rules.
- Audit events include actor, role, action, target, timestamp, reason, and correlation ID; audit storage is tamper-resistant/append-only with restricted role-scoped access. System jobs use an explicit service identity (F-ADM-05; PRS §§4, 14).

## 8. Phase and open-decision boundaries

| Area | Model boundary |
|---|---|
| Phase 1 | Identity, account modes/states, four-role RBAC, owner-only vendors and business accounts, geography/market rollout, taxonomy/configuration, vendor verification and listings, service areas/availability, domestic supplier catalogue, bookings, RFQs/quotes, work orders/POs/core contracts, messaging without OPEN attachments, reviews/cases, notifications, subscriptions, sponsored placement, Mode A/B records, agents, admin queues and audit. |
| Phase 2 | Business/vendor teams and memberships (F-BIZ-06); company storefront ordering (F-BIZ-03, D-015); L4/KYB; cross-border trade; contract renewal/amendment/termination/e-sign; Mode C/escrow/wallet/refunds/payouts/platform commission; additional markets/currencies/languages as defined by the spec and decisions. |
| Phase 3 | Cart/inventory checkout, enterprise procurement, AI and other roadmap features stay outside the Phase 1 model. |
| OPEN | Dual-approval/activation checklist (O-05), agent commission model (O-03), PO payment-failed meaning (O-06), contract suspend/resume/expiry (O-08), profile completeness/field visibility and other O-09 items, manufacturer P1 placement (O-10), and technology choices (O-13) remain unresolved. No field or constraint here closes them. |

Phase 2 business/vendor team membership and company storefront ordering (including company orders) are extension points only; they do not grant Phase 1 team access or storefront ordering.

These are phase and decision labels from the existing sources, not new scope decisions. Transaction and operational domains are represented because the PRS's logical data model (§14) and the approved product scope include them; detailed physical design is still subject to the feature contracts, CFG decisions, and the architecture's module boundaries.

## 9. Design invariants to carry into migrations

| Requirement | Logical control |
|---|---|
| Unique identity and verified contact | Unique verified identifier per channel; identity state is server-controlled. |
| No cross-tenant access | Owner, participant, assignment, and scope checks on every private-object read/write. |
| RBAC deny by default | Role and permission catalogue plus server-side ownership/workflow checks; no mode-based privileges. |
| Safe authentication | One-time challenges and revocable/rotating sessions; store credential verifiers, not plaintext secrets. |
| Category versioning | Immutable configuration versions; transaction snapshots retain the accepted version/terms. |
| Listing publication | Six gates are computed; duplicate candidates are reviewed, never auto-merged. |
| One accepted quote | At most one accepted quote per RFQ; enforce atomically under concurrent acceptance. |
| Booking capacity | Concurrency-safe reservations for modeled capacity and slots. |
| Idempotency | Retry-safe writes and provider event deduplication where required by the feature/API. |
| Privacy and audit | Private evidence by default; authorized access; append-only audit events with reason and correlation ID. |
| Money | Integer minor units and ISO currency when a monetary value is recorded; no floating-point amount. |
| Market visibility | Unactivated markets/categories are never publicly searchable. |
| Deletion and retention | Follow verified deletion/anonymization and legal retention; do not invent retention periods. |

## 10. Physical schema notes (migrations 001-013)

The diagrams above stay the logical model; this section is what the database actually does.

**Tables by domain**

| Domain | Tables |
|---|---|
| Identity and access | `users`, `user_identifiers`, `auth_challenges`, `auth_rate_limit_buckets`, `auth_sessions`, `roles`, `permissions`, `role_permissions`, `user_role_assignments` |
| Accounts | `customer_profiles`, `saved_locations`, `user_consents`, `user_privacy_preferences`, `account_data_requests`, `business_accounts`, `business_account_evidence`, `sales_agent_profiles` |
| Geography | `countries`, `regions`, `cities`, `localities`, `market_activations`, `market_waitlist` |
| Taxonomy | `industries`, `categories`, `category_config_versions`, `attribute_definitions`, `subcategories`, `category_suggestions` |
| Vendors and listings | `vendors`, `vendor_profiles`, `vendor_profile_links`, `vendor_categories`, `vendor_documents`, `verifications`, `verification_evidence`, `listings`, `listing_attributes`, `listing_media`, `listing_reviews`, `duplicate_flags`, `service_areas`, `availability_rules`, `availability_capacity`, `catalog_items` |
| Transactions | `rfqs`, `rfq_revisions`, `rfq_revision_files`, `rfq_recipients`, `quotes`, `quote_revisions`, `quote_lines`, `accepted_terms_snapshots`, `booking_series`, `bookings`, `booking_terms_snapshots`, `booking_events`, `booking_modifications`, `work_orders`, `purchase_orders`, `po_lines`, `po_events`, `shipments`, `po_disputes`, `contracts`, `contract_versions`, `contract_acceptances`, `milestones`, `payment_records` |
| Engagement and trust | `favorites`, `conversations`, `conversation_links`, `conversation_participants`, `messages`, `contact_share_consents`, `reviews`, `review_ratings`, `vendor_trust_metrics`, `reports`, `support_cases`, `case_evidence`, `case_actions`, `appeals`, `account_holds`, `notification_templates`, `notifications`, `notification_delivery_attempts`, `notification_preferences` |
| Revenue and agents | `plans`, `plan_versions`, `plan_entitlements`, `subscriptions`, `billing_events`, `invoices`, `lead_usage`, `sponsored_campaigns`, `sales_leads`, `lead_activities`, `onboarding_consents` |
| Platform | `files`, `audit_events`, `idempotency_keys`, `outbox_events`, `config_register_items`, `platform_settings`, `schema_migrations` |

**Where the physical schema differs from the diagrams**

- Taxonomy stays two levels (`categories`, `subcategories`) as built in migration 002, not the generic `TAXONOMY_NODE` tree.
- There is no `MARKET_CATEGORY` table. Which categories are enabled in a market stays in the versioned category configuration (`marketRules`, read by the taxonomy API), so category availability has one source of truth. `market_activations` holds only whether a country or city is live.
- `ATTRIBUTE_DEFINITION` rows are derived from a category configuration version and are immutable with it.
- `quotes` can only be created for vendors in `rfq_recipients`; `accepted_terms_snapshots` is unique per RFQ and per quote.
- Payment records (`payment_records`) allow Mode A and B only and need exactly one parent record.

**Enforced in the database (not only in the service)**

- One accepted quote per RFQ (partial unique index plus unique snapshot), and accepted terms are immutable.
- Immutable or append-only: category configuration versions, attribute definitions, RFQ and quote revisions and lines, accepted terms, booking terms snapshots, booking and PO events, contract versions and acceptances, case actions, listing reviews, audit events, plan entitlements.
- A contract version can be accepted only while it is the latest; an accepted quote or non-open RFQ cannot be revised; declined, expired, closed and cancelled bookings are final.
- Reviewer separation: a vendor owner cannot approve their own verification or listing; an owner cannot verify their own business account; a category suggestion cannot be reviewed by its submitter; an appeal cannot be reviewed by the appellant.
- Retry safety: booking idempotency key per customer, idempotency-key table, billing webhook `(provider, provider_event_id)`, notification `dedupe_key`.
- Capacity: non-overlapping windows per listing and `reserved <= capacity`.
- Coverage is always explicit: there is no worldwide coverage type; a live market needs an activator and timestamp.

**Left open on purpose (no table, column or value)**

Per the decisions log and spec: market activation checklist and dual approval (O-05), country packs (O-04), profile completeness and field visibility (O-09), saved searches (O-09), chat attachments and read receipts (O-09), automated content screening (O-09), coupons (O-02), agent commissions (O-03), PO "payment failed" (O-06), contract suspend/resume/expiry (O-08), admin-created vendors (O-01). Phase 2 and 3 items (Mode C, escrow, wallet, refunds, payouts, commission engine, multi-currency, Incoterms, teams, storefront ordering, L4/KYB, contract renewal/amendment/termination) have no tables.

Vocabularies the owner has not decided are non-empty `text` columns, not enumerations, so a later decision needs no data migration: support-case severity and state (CFG-06), review moderation state (CFG-11), invoice and payment-record status (CFG-16), lead pipeline status, attribute data types, notification categories. Plan names, prices, limits and entitlements are not seeded (D-007, CFG-01, CFG-02).

**Known follow-ups (not done here)**

- The RBAC permission catalogue (`permissions`, `role_permissions`) is empty. Authorization still uses roles plus ownership checks in the service; the catalogue needs the owner's list before it is seeded (PRS 4.1 groups only).
- Database roles: use separate roles for migrations, the API (no DDL) and the trust-metrics worker (only it may write `vendor_trust_metrics`). Not configured on Render yet.
- Retention and deletion periods (CFG-08), `audit_events` partitioning, backups and restore tests (CFG-09) are open.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-05 12:16 | Shil1517 | Added: section 10 physical schema notes; Modified: header (no longer 'not a physical schema') | Migrations 004-013 now implement the Phase 1 scope; records divergences from the logical diagrams and the open items left unbuilt. |
| 2026-11-04 15:27 | Amit | Modified: authentication rate-limit and attempt-tracking ERD | Keep the logical model aligned with the scoped auth security migration without assigning policy values. |
| 2026-11-04 15:12 | Amit | Modified: ERD linked to scoped SQL migration draft | Keep the logical model aligned with the authorized users, roles, vendors, and categories migration deliverable without closing O-13. |
| 2026-11-04 14:30 | Amit | Modified: product-wide logical data model and ERD | Map the existing PRS and approved feature/architecture scope without changing requirements, phases, or open decisions. |
| 2026-11-04 13:50 | Amit | Modified: initial identity, RBAC, vendor, and taxonomy ERD | Replace the pre-decision conceptual model with a source-aligned logical ERD for the foundation deliverables; defer other domains until their contracts are reviewed. |

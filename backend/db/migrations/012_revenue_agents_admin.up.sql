-- Revenue, sales agents and admin configuration:
-- subscriptions / sponsored visibility / invoices (F-SUB-*), leads and consent
-- based onboarding (F-AGT-01..05, F-AGT-07), the open-configuration register
-- and platform settings (F-ADM-07, F-ADM-08).
--
-- No plan names, prices, limits or rates are stored as defaults: they are
-- CFG-01 / CFG-02 and stay empty until the business decides (D-007).
-- Not modelled: coupons (F-SUB-04, OPEN O-02), agent commissions (F-AGT-06,
-- OPEN O-03), advanced ads/bidding (Phase 3), commission engine (Phase 2).
BEGIN;

CREATE TABLE plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE CHECK (length(btrim(name)) > 0),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
    version_number integer NOT NULL CHECK (version_number > 0),
    price_minor bigint CHECK (price_minor IS NULL OR price_minor >= 0),
    currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    billing_interval text,
    effective_from timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_versions_number_key UNIQUE (plan_id, version_number),
    CONSTRAINT plan_versions_price_currency_check CHECK (price_minor IS NULL OR currency IS NOT NULL),
    CONSTRAINT plan_versions_period_check CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE plan_entitlements (
    plan_version_id uuid NOT NULL REFERENCES plan_versions (id) ON DELETE RESTRICT,
    entitlement_key text NOT NULL CHECK (length(btrim(entitlement_key)) > 0),
    configured_value jsonb NOT NULL,
    PRIMARY KEY (plan_version_id, entitlement_key)
);

-- A plan version is a snapshot: change a plan by adding a version.
CREATE TRIGGER plan_entitlements_immutable BEFORE UPDATE OR DELETE ON plan_entitlements
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Lifecycle (F-SUB-02): active, failed (3-day grace), expired, cancelled to end
-- of period, cancelled; "restored" returns a row to active. "Renewal upcoming"
-- is derived from current_period_end, not stored.
CREATE TABLE subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    plan_version_id uuid NOT NULL REFERENCES plan_versions (id) ON DELETE RESTRICT,
    state text NOT NULL DEFAULT 'active'
        CHECK (state IN ('active', 'payment_failed', 'expired', 'cancel_at_period_end', 'cancelled')),
    current_period_start timestamptz,
    current_period_end timestamptz,
    grace_ends_at timestamptz,
    cancel_requested_at timestamptz,
    scheduled_plan_version_id uuid REFERENCES plan_versions (id) ON DELETE RESTRICT,
    provider text,
    provider_subscription_id text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscriptions_period_check
        CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start),
    CONSTRAINT subscriptions_grace_check CHECK (state <> 'payment_failed' OR grace_ends_at IS NOT NULL),
    CONSTRAINT subscriptions_cancel_check CHECK (state <> 'cancel_at_period_end' OR cancel_requested_at IS NOT NULL)
);

-- A vendor has at most one live subscription.
CREATE UNIQUE INDEX subscriptions_one_live_per_vendor_key ON subscriptions (vendor_id)
    WHERE state IN ('active', 'payment_failed', 'cancel_at_period_end');
CREATE UNIQUE INDEX subscriptions_provider_key ON subscriptions (provider, provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX subscriptions_vendor_idx ON subscriptions (vendor_id, created_at DESC);
CREATE INDEX subscriptions_grace_idx ON subscriptions (grace_ends_at) WHERE state = 'payment_failed';
CREATE INDEX subscriptions_period_end_idx ON subscriptions (current_period_end)
    WHERE state IN ('active', 'cancel_at_period_end');
CREATE INDEX subscriptions_plan_version_idx ON subscriptions (plan_version_id);

-- Provider callbacks are authenticated and idempotent (F-SUB-03): the
-- (provider, provider_event_id) key makes redelivery a no-op. Store no card data.
CREATE TABLE billing_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid REFERENCES subscriptions (id) ON DELETE RESTRICT,
    provider text NOT NULL CHECK (length(btrim(provider)) > 0),
    provider_event_id text NOT NULL CHECK (length(btrim(provider_event_id)) > 0),
    event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamptz,
    processing_error text,
    CONSTRAINT billing_events_provider_event_key UNIQUE (provider, provider_event_id)
);

CREATE INDEX billing_events_subscription_idx ON billing_events (subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX billing_events_unprocessed_idx ON billing_events (received_at) WHERE processed_at IS NULL;

CREATE TABLE invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid REFERENCES subscriptions (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    invoice_number text NOT NULL UNIQUE CHECK (length(btrim(invoice_number)) > 0),
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    tax_and_fee_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(tax_and_fee_details) = 'object'),
    status text NOT NULL CHECK (length(btrim(status)) > 0),
    document_file_id uuid REFERENCES files (id) ON DELETE RESTRICT,
    issued_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX invoices_vendor_idx ON invoices (vendor_id, issued_at DESC);
CREATE INDEX invoices_subscription_idx ON invoices (subscription_id) WHERE subscription_id IS NOT NULL;

COMMENT ON COLUMN invoices.invoice_number IS
    'Numbering scheme and tax rules are CFG-16 (open); the application allocates numbers. Uniqueness is the only rule assumed.';

-- Lead-usage meter (F-SUB-05). Limits come from plan entitlements.
CREATE TABLE lead_usage (
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    lead_count integer NOT NULL DEFAULT 0 CHECK (lead_count >= 0),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vendor_id, period_start),
    CONSTRAINT lead_usage_period_check CHECK (period_end > period_start)
);

-- Sponsored visibility: labelled, separately sold, never bypasses publication
-- gates (F-SUB-06). The gate check lives in the search/listing services.
CREATE TABLE sponsored_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    listing_id uuid,
    placement text NOT NULL CHECK (length(btrim(placement)) > 0),
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'active', 'paused', 'ended')),
    starts_at timestamptz,
    ends_at timestamptz,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(configuration) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sponsored_campaigns_listing_vendor_fk FOREIGN KEY (listing_id, vendor_id)
        REFERENCES listings (id, vendor_id) ON DELETE RESTRICT,
    CONSTRAINT sponsored_campaigns_period_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
    CONSTRAINT sponsored_campaigns_active_check CHECK (status <> 'active' OR starts_at IS NOT NULL)
);

CREATE INDEX sponsored_campaigns_vendor_idx ON sponsored_campaigns (vendor_id);
CREATE INDEX sponsored_campaigns_active_idx ON sponsored_campaigns (placement, starts_at) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Sales agents (F-AGT-01..05, F-AGT-07)
-- ---------------------------------------------------------------------------
CREATE TABLE sales_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_agent_user_id uuid NOT NULL REFERENCES sales_agent_profiles (user_id) ON DELETE RESTRICT,
    created_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    prospect_name text NOT NULL CHECK (length(btrim(prospect_name)) > 0),
    business_name text,
    contact_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(contact_details) = 'object'),
    status text NOT NULL DEFAULT 'new' CHECK (length(btrim(status)) > 0),
    converted_vendor_id uuid REFERENCES vendors (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sales_leads_agent_idx ON sales_leads (assigned_agent_user_id, status);
CREATE INDEX sales_leads_converted_idx ON sales_leads (converted_vendor_id) WHERE converted_vendor_id IS NOT NULL;

COMMENT ON COLUMN sales_leads.status IS 'Pipeline stages are not defined by the spec, so not enumerated.';

CREATE TABLE lead_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES sales_leads (id) ON DELETE RESTRICT,
    actor_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    activity_type text NOT NULL CHECK (activity_type IN ('call', 'message', 'visit', 'note')),
    notes text,
    follow_up_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX lead_activities_lead_idx ON lead_activities (lead_id, created_at DESC);
CREATE INDEX lead_activities_followup_idx ON lead_activities (follow_up_at) WHERE follow_up_at IS NOT NULL;

-- Consent-based assisted onboarding (F-AGT-02): an agent assists only with the
-- prospect's recorded consent and cannot publish as the vendor.
CREATE TABLE onboarding_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES sales_leads (id) ON DELETE RESTRICT,
    prospective_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    consent_scope text NOT NULL CHECK (length(btrim(consent_scope)) > 0),
    granted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at timestamptz,
    CONSTRAINT onboarding_consents_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE INDEX onboarding_consents_lead_idx ON onboarding_consents (lead_id);

-- ---------------------------------------------------------------------------
-- Admin configuration
-- ---------------------------------------------------------------------------
-- Open configuration register CFG-01..CFG-19 (F-ADM-08, PRS section 23).
CREATE TABLE config_register_items (
    code text PRIMARY KEY CHECK (code ~ '^CFG-[0-9]{2}$'),
    title text NOT NULL CHECK (length(btrim(title)) > 0),
    owner text NOT NULL CHECK (length(btrim(owner)) > 0),
    required_decision text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'decided')),
    decided_value jsonb,
    decided_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    decided_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT config_register_items_decided_check CHECK (
        status = 'open' OR (decided_value IS NOT NULL AND decided_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
    )
);

-- Platform settings, including maintenance / force-update (F-ADM-07, F-ADM-10).
CREATE TABLE platform_settings (
    key text PRIMARY KEY CHECK (length(btrim(key)) > 0),
    value jsonb NOT NULL,
    updated_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lead_usage_set_updated_at BEFORE UPDATE ON lead_usage FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sponsored_campaigns_set_updated_at BEFORE UPDATE ON sponsored_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sales_leads_set_updated_at BEFORE UPDATE ON sales_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER config_register_items_set_updated_at BEFORE UPDATE ON config_register_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER platform_settings_set_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Account domain beyond login: customer profile, saved locations, consents,
-- privacy preferences, data export/deletion requests (F-ACC-04..07), the
-- separate business account (F-BIZ-01, D-005) and sales agent profiles.
BEGIN;

CREATE TABLE customer_profiles (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE RESTRICT,
    display_name text CHECK (display_name IS NULL OR length(btrim(display_name)) > 0),
    photo_file_id uuid REFERENCES files (id) ON DELETE RESTRICT,
    customer_type text NOT NULL DEFAULT 'individual'
        CHECK (customer_type IN ('individual', 'business')),
    company_name text,
    billing_address jsonb CHECK (billing_address IS NULL OR jsonb_typeof(billing_address) = 'object'),
    registration_tax_id text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN customer_profiles.registration_tax_id IS
    'Restricted data (PRS 26.4): never returned on public or counterparty views; reads of this column are audited.';
COMMENT ON TABLE customer_profiles IS
    'Business details are optional until a contract booking or payment mode needs them (PRS 26.4.1). Locale (country, language, time zone, currency) lives in users.locale.';

CREATE TABLE saved_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    label text NOT NULL CHECK (length(btrim(label)) > 0),
    address jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(address) = 'object'),
    country_id uuid REFERENCES countries (id) ON DELETE RESTRICT,
    city_id uuid REFERENCES cities (id) ON DELETE RESTRICT,
    locality_id uuid REFERENCES localities (id) ON DELETE RESTRICT,
    postal_code text,
    latitude numeric(9, 6) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude numeric(9, 6) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT saved_locations_coordinates_check
        CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX saved_locations_user_id_idx ON saved_locations (user_id);

CREATE TABLE user_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    consent_type text NOT NULL CHECK (length(btrim(consent_type)) > 0),
    accepted_version text NOT NULL CHECK (length(btrim(accepted_version)) > 0),
    recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at timestamptz,
    CONSTRAINT user_consents_withdrawal_check CHECK (withdrawn_at IS NULL OR withdrawn_at >= recorded_at)
);

CREATE INDEX user_consents_user_type_idx ON user_consents (user_id, consent_type, recorded_at DESC);

CREATE TABLE user_privacy_preferences (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    preference_key text NOT NULL CHECK (length(btrim(preference_key)) > 0),
    preference_value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, preference_key)
);

-- Export and deletion requests (F-ACC-04, F-ACC-05). Retention periods and
-- deletion exceptions are CFG-08 (open); this table only tracks the workflow.
CREATE TABLE account_data_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    request_type text NOT NULL CHECK (request_type IN ('export', 'deletion')),
    status text NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'verified', 'in_progress', 'completed', 'rejected', 'cancelled')),
    requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at timestamptz,
    completed_at timestamptz,
    result_file_id uuid REFERENCES files (id) ON DELETE RESTRICT,
    outcome_note text,
    CONSTRAINT account_data_requests_completion_check
        CHECK ((status = 'completed') = (completed_at IS NOT NULL) OR status IN ('rejected', 'cancelled')),
    CONSTRAINT account_data_requests_verified_check
        CHECK (status IN ('requested', 'rejected', 'cancelled') OR verified_at IS NOT NULL)
);

CREATE UNIQUE INDEX account_data_requests_open_key
    ON account_data_requests (user_id, request_type)
    WHERE status IN ('requested', 'verified', 'in_progress');
CREATE INDEX account_data_requests_status_idx
    ON account_data_requests (status, requested_at)
    WHERE status IN ('requested', 'verified', 'in_progress');

-- Business account: a separate, owner-only account type (D-005). Team roles are
-- Phase 2 (F-BIZ-06) and are not modelled. The 3-year / registered eligibility
-- rule is enforced by the service; the evidence is stored here.
CREATE TABLE business_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    company_name text NOT NULL CHECK (length(btrim(company_name)) > 0),
    registration_country_id uuid REFERENCES countries (id) ON DELETE RESTRICT,
    registered_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(registered_details) = 'object'),
    established_on date,
    verification_status text NOT NULL DEFAULT 'draft'
        CHECK (verification_status IN ('draft', 'submitted', 'info_requested', 'verified', 'rejected')),
    verified_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    verified_at timestamptz,
    decision_reason text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT business_accounts_decision_check CHECK (
        verification_status NOT IN ('verified', 'rejected', 'info_requested')
        OR (verified_by_user_id IS NOT NULL AND verified_at IS NOT NULL
            AND decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0)
    ),
    -- separation of duties: an owner cannot verify their own company (PRS 4.3)
    CONSTRAINT business_accounts_no_self_verification_check
        CHECK (verified_by_user_id IS NULL OR verified_by_user_id <> owner_user_id)
);

CREATE INDEX business_accounts_owner_idx ON business_accounts (owner_user_id);
CREATE INDEX business_accounts_queue_idx ON business_accounts (verification_status, created_at)
    WHERE verification_status IN ('submitted', 'info_requested');

COMMENT ON COLUMN business_accounts.owner_user_id IS
    'Owner-to-business cardinality is not decided, so this is intentionally not unique (same stance as vendors.owner_user_id).';
COMMENT ON COLUMN business_accounts.registered_details IS
    'Registration and tax identifiers: restricted data; the public sees verification status only (PRS 26.4.2).';

CREATE TABLE business_account_evidence (
    business_account_id uuid NOT NULL REFERENCES business_accounts (id) ON DELETE RESTRICT,
    file_id uuid NOT NULL REFERENCES files (id) ON DELETE RESTRICT,
    evidence_type text NOT NULL CHECK (length(btrim(evidence_type)) > 0),
    submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (business_account_id, file_id)
);

CREATE TABLE sales_agent_profiles (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    profile_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(profile_details) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sales_agent_profiles IS
    'Agent commissions (F-AGT-06) are not modelled: calculation, payer and payout are open under O-03.';

CREATE TRIGGER customer_profiles_set_updated_at BEFORE UPDATE ON customer_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER saved_locations_set_updated_at BEFORE UPDATE ON saved_locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER user_privacy_preferences_set_updated_at BEFORE UPDATE ON user_privacy_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER business_accounts_set_updated_at BEFORE UPDATE ON business_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sales_agent_profiles_set_updated_at BEFORE UPDATE ON sales_agent_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

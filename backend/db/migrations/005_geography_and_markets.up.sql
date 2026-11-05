-- Geography hierarchy, market activation and waitlist (F-GEO-01 to F-GEO-03).
-- Country -> region (optional) -> city -> locality/postal code. Supports
-- countries without states or postal codes (PRS 26.3).
--
-- Not modelled here, on purpose:
--   * the market-activation checklist and dual approval (F-GEO-05 / F-ADM-09,
--     OPEN under O-05);
--   * per-country packs (F-GEO-04, OPEN under O-04).
-- Which categories are enabled in a market stays in the versioned category
-- configuration ("marketRules", see 002 and src/taxonomy/market-eligibility.ts)
-- so there is a single source of truth for category availability.
BEGIN;

CREATE TABLE countries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    iso_code text NOT NULL UNIQUE CHECK (iso_code ~ '^[A-Z]{2}$'),
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id uuid NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    region_type text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT regions_country_name_key UNIQUE (country_id, name),
    CONSTRAINT regions_country_id_id_key UNIQUE (country_id, id)
);

CREATE TABLE cities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id uuid NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    region_id uuid,
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    time_zone text NOT NULL CHECK (length(btrim(time_zone)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- a city's region must belong to the same country
    CONSTRAINT cities_region_country_fk FOREIGN KEY (country_id, region_id)
        REFERENCES regions (country_id, id) ON DELETE RESTRICT,
    CONSTRAINT cities_id_country_key UNIQUE (id, country_id)
);

CREATE UNIQUE INDEX cities_country_region_name_key
    ON cities (country_id, COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
CREATE INDEX cities_region_id_idx ON cities (region_id) WHERE region_id IS NOT NULL;

COMMENT ON COLUMN cities.time_zone IS 'IANA zone name, e.g. Asia/Kolkata. Local schedules keep an explicit zone (PRS 14.1).';

CREATE TABLE localities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id uuid NOT NULL REFERENCES cities (id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    postal_code text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX localities_city_postal_name_key
    ON localities (city_id, COALESCE(postal_code, ''), name);
CREATE INDEX localities_postal_code_idx ON localities (postal_code) WHERE postal_code IS NOT NULL;

-- Market activation (F-GEO-03). A market that is not 'live' is never publicly
-- searchable. Languages, currencies, tax, payment modes, verification matrix and
-- legal document versions are configuration filled in by the business (CFG-13,
-- CFG-14, CFG-16, CFG-18); the defaults here are empty, not invented values.
CREATE TABLE market_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id uuid NOT NULL,
    city_id uuid,
    status text NOT NULL DEFAULT 'not_live' CHECK (status IN ('not_live', 'live')),
    enabled_languages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(enabled_languages) = 'array'),
    currencies jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(currencies) = 'array'),
    tax_settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(tax_settings) = 'object'),
    payment_modes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(payment_modes) = 'array'),
    verification_matrix jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(verification_matrix) = 'object'),
    legal_document_versions jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(legal_document_versions) = 'object'),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    activated_at timestamptz,
    activated_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT market_activations_city_country_fk FOREIGN KEY (city_id, country_id)
        REFERENCES cities (id, country_id) ON DELETE RESTRICT,
    CONSTRAINT market_activations_country_fk FOREIGN KEY (country_id)
        REFERENCES countries (id) ON DELETE RESTRICT,
    CONSTRAINT market_activations_live_check
        CHECK (status = 'not_live' OR (activated_at IS NOT NULL AND activated_by_user_id IS NOT NULL))
);

CREATE UNIQUE INDEX market_activations_country_scope_key
    ON market_activations (country_id) WHERE city_id IS NULL;
CREATE UNIQUE INDEX market_activations_city_scope_key
    ON market_activations (city_id) WHERE city_id IS NOT NULL;
CREATE INDEX market_activations_live_idx ON market_activations (status) WHERE status = 'live';

COMMENT ON TABLE market_activations IS
    'Row-per-scope (country-wide or one city). Changes must write an audit_events row; versioned with `version`. Dual approval is OPEN (O-05) and not modelled.';

-- Waitlist for cities that are not yet live (F-GEO-02).
CREATE TABLE market_waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id uuid NOT NULL REFERENCES cities (id) ON DELETE RESTRICT,
    user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    contact_channel text CHECK (contact_channel IS NULL OR contact_channel IN ('phone', 'email')),
    contact_value text,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_at timestamptz,
    CONSTRAINT market_waitlist_contact_check CHECK (
        user_id IS NOT NULL
        OR (contact_channel IS NOT NULL AND contact_value IS NOT NULL AND length(btrim(contact_value)) > 0)
    ),
    CONSTRAINT market_waitlist_notified_check CHECK (status <> 'notified' OR notified_at IS NOT NULL)
);

CREATE UNIQUE INDEX market_waitlist_user_city_key
    ON market_waitlist (city_id, user_id) WHERE user_id IS NOT NULL AND status = 'waiting';
CREATE UNIQUE INDEX market_waitlist_contact_city_key
    ON market_waitlist (city_id, contact_channel, contact_value)
    WHERE user_id IS NULL AND status = 'waiting';
CREATE INDEX market_waitlist_user_id_idx ON market_waitlist (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER countries_set_updated_at BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER regions_set_updated_at BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cities_set_updated_at BEFORE UPDATE ON cities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER localities_set_updated_at BEFORE UPDATE ON localities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER market_activations_set_updated_at BEFORE UPDATE ON market_activations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

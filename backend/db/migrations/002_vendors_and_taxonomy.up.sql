-- PostgreSQL 16 SQL migration draft.
-- O-13 remains open; this is the explicitly authorized database-only scope.
-- Geographic market references remain versioned category configuration data
-- until the separate geography module is implemented.

BEGIN;

CREATE TABLE vendors (
    id uuid PRIMARY KEY,
    owner_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    business_type text
        CHECK (business_type IN (
            'SERVICE_PROVIDER',
            'CONTRACTOR',
            'SUPPLIER',
            'WHOLESALER',
            'MANUFACTURER',
            'DISTRIBUTOR',
            'OTHER'
        )),
    legal_name text
        CHECK (legal_name IS NULL OR length(btrim(legal_name)) > 0),
    registration_country text
        CHECK (
            registration_country IS NULL
            OR registration_country ~ '^[A-Z]{2}$'
        ),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN vendors.owner_user_id IS
    'Vendor owner; intentionally not unique because the owner-to-vendor cardinality is not decided by the current contract.';

CREATE INDEX vendors_owner_user_id_idx ON vendors (owner_user_id);

CREATE TABLE vendor_profiles (
    vendor_id uuid PRIMARY KEY REFERENCES vendors (id) ON DELETE RESTRICT,
    trading_name text,
    description text,
    logo_file_id uuid,
    banner_file_id uuid,
    languages jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(languages) = 'array'),
    website_url text,
    website_moderation_state text,
    year_established integer,
    team_size_range text,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN vendor_profiles.logo_file_id IS
    'Reference to the files module; FK is added with that module.';
COMMENT ON COLUMN vendor_profiles.banner_file_id IS
    'Reference to the files module; FK is added with that module.';
COMMENT ON COLUMN vendor_profiles.website_moderation_state IS
    'Moderation vocabulary is owned by the moderation feature and is not constrained here.';

CREATE TABLE vendor_profile_links (
    id uuid PRIMARY KEY,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    platform text NOT NULL CHECK (length(btrim(platform)) > 0),
    url text NOT NULL CHECK (length(btrim(url)) > 0),
    moderation_state text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX vendor_profile_links_vendor_id_idx
    ON vendor_profile_links (vendor_id);

CREATE TABLE industries (
    id uuid PRIMARY KEY,
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    phase text NOT NULL CHECK (phase IN ('P1', 'P2', 'P3')),
    sort_order integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id uuid PRIMARY KEY,
    industry_id uuid NOT NULL REFERENCES industries (id) ON DELETE RESTRICT,
    current_version integer NOT NULL CHECK (current_version > 0),
    lifecycle text NOT NULL
        CHECK (lifecycle IN ('DRAFT', 'ACTIVE', 'RESTRICTED', 'RETIRED')),
    always_show boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL,
    merged_into_category_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categories_not_merged_into_self_check
        CHECK (merged_into_category_id IS NULL OR merged_into_category_id <> id)
);

CREATE INDEX categories_industry_lifecycle_order_idx
    ON categories (industry_id, lifecycle, sort_order, id);
CREATE INDEX categories_merged_into_category_id_idx
    ON categories (merged_into_category_id)
    WHERE merged_into_category_id IS NOT NULL;

CREATE TABLE category_config_versions (
    id uuid PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    version_number integer NOT NULL CHECK (version_number > 0),
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    aliases jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(aliases) = 'array'),
    configuration jsonb NOT NULL
        CHECK (jsonb_typeof(configuration) = 'object'),
    created_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT category_config_versions_category_version_key
        UNIQUE (category_id, version_number)
);

ALTER TABLE categories
    ADD CONSTRAINT categories_current_version_fk
    FOREIGN KEY (id, current_version)
    REFERENCES category_config_versions (category_id, version_number)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON TABLE category_config_versions IS
    'Immutable category name, aliases, schema and policy configuration. Insert a new version for each effective configuration change.';
COMMENT ON COLUMN category_config_versions.configuration IS
    'Versioned API contract configuration, including attribute/RFQ schemas, booking modes, availability, deadlines, policies, verification and market rules.';

CREATE TABLE subcategories (
    id uuid PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    localized_names jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(localized_names) = 'object'),
    aliases jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(aliases) = 'array'),
    sort_order integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX subcategories_category_order_idx
    ON subcategories (category_id, sort_order, id);

COMMIT;

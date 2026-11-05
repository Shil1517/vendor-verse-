-- Vendor supply side: categories, documents, verification L0-L3, listings,
-- listing review, duplicate flags, service areas, availability/capacity and the
-- domestic supplier catalogue (F-VND-*, F-GEO-06, F-GDS-01).
--
-- Deliberately NOT stored:
--   * listings.is_public - computed from the six publication gates (F-VND-05);
--   * "worldwide" coverage - coverage is always explicit (F-GEO-06);
--   * profile completeness / field-visibility classes (F-VND-11/12, OPEN O-09);
--   * L4 / third-party KYB (F-VND-04, Phase 2).
BEGIN;

-- Needed for the non-overlapping availability windows (EXCLUDE ... gist).
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE vendor_categories (
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    category_id uuid NOT NULL,
    config_version_number integer NOT NULL,
    selected_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vendor_id, category_id),
    CONSTRAINT vendor_categories_version_fk FOREIGN KEY (category_id, config_version_number)
        REFERENCES category_config_versions (category_id, version_number) ON DELETE RESTRICT
);

CREATE INDEX vendor_categories_category_idx ON vendor_categories (category_id);

CREATE TABLE vendor_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    document_type text NOT NULL CHECK (length(btrim(document_type)) > 0),
    file_id uuid NOT NULL REFERENCES files (id) ON DELETE RESTRICT,
    issued_by text,
    expires_at timestamptz,
    submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX vendor_documents_vendor_idx ON vendor_documents (vendor_id, submitted_at DESC);
CREATE INDEX vendor_documents_expiry_idx ON vendor_documents (expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE vendor_documents IS
    'Credential evidence (licences, certifications, insurance). Each credential carries a status and expiry (PRS 26.4.2); the expiry scan reads expires_at. Files are private.';

-- Verification record per level (F-VND-03). category_id is set for category
-- verification (publication gate 4). Rows are history; the current state is the
-- latest decided row per (vendor, level, category).
CREATE TABLE verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    category_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
    level text NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3')),
    status text NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'in_review', 'info_requested', 'approved', 'rejected', 'expired', 'revoked')),
    reviewer_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    reason text,
    resubmission_of_id uuid REFERENCES verifications (id) ON DELETE RESTRICT,
    submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at timestamptz,
    expires_at timestamptz,
    CONSTRAINT verifications_decision_check CHECK (
        status NOT IN ('approved', 'rejected', 'info_requested', 'revoked')
        OR (reviewer_user_id IS NOT NULL AND decided_at IS NOT NULL
            AND reason IS NOT NULL AND length(btrim(reason)) > 0)
    ),
    CONSTRAINT verifications_expiry_check CHECK (expires_at IS NULL OR status IN ('approved', 'expired'))
);

CREATE INDEX verifications_vendor_idx ON verifications (vendor_id, level, submitted_at DESC);
CREATE INDEX verifications_queue_idx ON verifications (submitted_at)
    WHERE status IN ('submitted', 'in_review', 'info_requested');
CREATE INDEX verifications_expiry_idx ON verifications (expires_at)
    WHERE status = 'approved' AND expires_at IS NOT NULL;
CREATE INDEX verifications_reviewer_idx ON verifications (reviewer_user_id) WHERE reviewer_user_id IS NOT NULL;

CREATE TABLE verification_evidence (
    verification_id uuid NOT NULL REFERENCES verifications (id) ON DELETE RESTRICT,
    document_id uuid NOT NULL REFERENCES vendor_documents (id) ON DELETE RESTRICT,
    PRIMARY KEY (verification_id, document_id)
);

CREATE INDEX verification_evidence_document_idx ON verification_evidence (document_id);

-- A vendor cannot approve their own verification (PRS 4.3, F-ADM-02).
CREATE FUNCTION enforce_reviewer_not_vendor_owner() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_owner uuid;
    v_vendor uuid;
BEGIN
    IF NEW.reviewer_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'verifications' THEN
        v_vendor := NEW.vendor_id;
    ELSIF TG_TABLE_NAME = 'listing_reviews' THEN
        SELECT vendor_id INTO v_vendor FROM listings WHERE id = NEW.listing_id;
    END IF;
    SELECT owner_user_id INTO v_owner FROM vendors WHERE id = v_vendor;
    IF v_owner = NEW.reviewer_user_id THEN
        RAISE EXCEPTION 'reviewer % cannot review their own vendor submission', NEW.reviewer_user_id
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER verifications_reviewer_check
    BEFORE INSERT OR UPDATE OF reviewer_user_id ON verifications
    FOR EACH ROW EXECUTE FUNCTION enforce_reviewer_not_vendor_owner();

-- Listings (F-VND-06). Price fields are optional: "price on request" is allowed
-- and missing data is never shown as zero (F-DSC-05).
CREATE TABLE listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    category_id uuid NOT NULL,
    subcategory_id uuid REFERENCES subcategories (id) ON DELETE RESTRICT,
    config_version_number integer NOT NULL,
    listing_type text NOT NULL CHECK (listing_type IN ('service', 'product')),
    title text NOT NULL CHECK (length(btrim(title)) > 0),
    description text,
    content_state text NOT NULL DEFAULT 'draft'
        CHECK (content_state IN ('draft', 'pending_review', 'approved', 'changes_requested', 'rejected', 'paused', 'unpublished')),
    price_on_request boolean NOT NULL DEFAULT false,
    price_min_minor bigint CHECK (price_min_minor IS NULL OR price_min_minor >= 0),
    price_max_minor bigint CHECK (price_max_minor IS NULL OR price_max_minor >= 0),
    price_currency text CHECK (price_currency IS NULL OR price_currency ~ '^[A-Z]{3}$'),
    price_unit text,
    time_zone text,
    instant_booking_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listings_version_fk FOREIGN KEY (category_id, config_version_number)
        REFERENCES category_config_versions (category_id, version_number) ON DELETE RESTRICT,
    CONSTRAINT listings_price_range_check
        CHECK (price_max_minor IS NULL OR price_min_minor IS NULL OR price_max_minor >= price_min_minor),
    CONSTRAINT listings_price_needs_currency_check
        CHECK ((price_min_minor IS NULL AND price_max_minor IS NULL) OR price_currency IS NOT NULL),
    CONSTRAINT listings_price_on_request_check
        CHECK (NOT price_on_request OR (price_min_minor IS NULL AND price_max_minor IS NULL)),
    CONSTRAINT listings_instant_needs_price_check
        CHECK (NOT instant_booking_enabled OR (price_min_minor IS NOT NULL AND time_zone IS NOT NULL)),
    CONSTRAINT listings_id_vendor_key UNIQUE (id, vendor_id)
);

CREATE INDEX listings_vendor_state_idx ON listings (vendor_id, content_state);
CREATE INDEX listings_category_state_idx ON listings (category_id, content_state);
CREATE INDEX listings_review_queue_idx ON listings (updated_at) WHERE content_state = 'pending_review';

COMMENT ON TABLE listings IS
    'No is_public column by design: visibility is computed from account state, content review, subscription, category verification, required fields/service area and holds (F-VND-05). Subscription and hold state live in their own tables.';
COMMENT ON COLUMN listings.instant_booking_enabled IS
    'Vendor opt-in per listing (PRS 26.5); requires a stated price and time zone. Capacity rows in availability_capacity back the atomic reservation.';

CREATE TABLE listing_attributes (
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    attribute_key text NOT NULL CHECK (length(btrim(attribute_key)) > 0),
    value jsonb NOT NULL,
    PRIMARY KEY (listing_id, attribute_key)
);

CREATE TABLE listing_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    file_id uuid NOT NULL REFERENCES files (id) ON DELETE RESTRICT,
    media_type text NOT NULL CHECK (media_type IN ('photo', 'portfolio')),
    caption text,
    sort_order integer NOT NULL DEFAULT 0,
    moderation_state text NOT NULL DEFAULT 'pending'
        CHECK (moderation_state IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listing_media_file_key UNIQUE (listing_id, file_id)
);

CREATE INDEX listing_media_order_idx ON listing_media (listing_id, sort_order);

-- Review history for listings (F-VND-07). Append-only.
CREATE TABLE listing_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    reviewer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status text NOT NULL CHECK (status IN ('approved', 'changes_requested', 'rejected')),
    reason text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listing_reviews_reason_check
        CHECK (status = 'approved' OR (reason IS NOT NULL AND length(btrim(reason)) > 0))
);

CREATE INDEX listing_reviews_listing_idx ON listing_reviews (listing_id, created_at DESC);
CREATE INDEX listing_reviews_reviewer_idx ON listing_reviews (reviewer_user_id);

CREATE TRIGGER listing_reviews_reviewer_check
    BEFORE INSERT ON listing_reviews
    FOR EACH ROW EXECUTE FUNCTION enforce_reviewer_not_vendor_owner();
CREATE TRIGGER listing_reviews_immutable
    BEFORE UPDATE OR DELETE ON listing_reviews
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Duplicates are flagged for a human; never auto-merged (F-VND-07).
CREATE TABLE duplicate_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    possible_duplicate_listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    similarity_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(similarity_details) = 'object'),
    review_status text NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'confirmed_duplicate', 'not_duplicate')),
    reviewed_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT duplicate_flags_distinct_check CHECK (listing_id <> possible_duplicate_listing_id),
    CONSTRAINT duplicate_flags_pair_key UNIQUE (listing_id, possible_duplicate_listing_id),
    CONSTRAINT duplicate_flags_review_check
        CHECK (review_status = 'pending' OR (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE INDEX duplicate_flags_queue_idx ON duplicate_flags (created_at) WHERE review_status = 'pending';
CREATE INDEX duplicate_flags_other_idx ON duplicate_flags (possible_duplicate_listing_id);

-- Explicit coverage (F-GEO-06, F-VND-08). There is no 'worldwide' type.
CREATE TABLE service_areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    listing_id uuid,
    coverage_type text NOT NULL
        CHECK (coverage_type IN ('city', 'pincode', 'region', 'country', 'radius', 'remote')),
    country_id uuid REFERENCES countries (id) ON DELETE RESTRICT,
    region_id uuid REFERENCES regions (id) ON DELETE RESTRICT,
    city_id uuid REFERENCES cities (id) ON DELETE RESTRICT,
    postal_code text,
    radius_km numeric(8, 2) CHECK (radius_km IS NULL OR radius_km > 0),
    center_latitude numeric(9, 6) CHECK (center_latitude IS NULL OR center_latitude BETWEEN -90 AND 90),
    center_longitude numeric(9, 6) CHECK (center_longitude IS NULL OR center_longitude BETWEEN -180 AND 180),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_areas_listing_vendor_fk FOREIGN KEY (listing_id, vendor_id)
        REFERENCES listings (id, vendor_id) ON DELETE RESTRICT,
    CONSTRAINT service_areas_shape_check CHECK (
        (coverage_type = 'city' AND city_id IS NOT NULL)
        OR (coverage_type = 'pincode' AND postal_code IS NOT NULL AND length(btrim(postal_code)) > 0 AND country_id IS NOT NULL)
        OR (coverage_type = 'region' AND region_id IS NOT NULL)
        OR (coverage_type = 'country' AND country_id IS NOT NULL)
        OR (coverage_type = 'radius' AND radius_km IS NOT NULL
            AND center_latitude IS NOT NULL AND center_longitude IS NOT NULL)
        OR (coverage_type = 'remote')
    )
);

CREATE INDEX service_areas_vendor_idx ON service_areas (vendor_id);
CREATE INDEX service_areas_listing_idx ON service_areas (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX service_areas_city_idx ON service_areas (city_id) WHERE city_id IS NOT NULL;
CREATE INDEX service_areas_postal_idx ON service_areas (country_id, postal_code) WHERE postal_code IS NOT NULL;
CREATE INDEX service_areas_region_idx ON service_areas (region_id) WHERE region_id IS NOT NULL;

-- Availability is shown only if provided (F-VND-08). Rules come from the
-- category's availability model.
CREATE TABLE availability_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    availability_model text NOT NULL CHECK (length(btrim(availability_model)) > 0),
    time_zone text NOT NULL CHECK (length(btrim(time_zone)) > 0),
    weekly_schedule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(weekly_schedule) = 'object'),
    valid_from date,
    valid_to date,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT availability_rules_period_check CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX availability_rules_listing_idx ON availability_rules (listing_id);

-- Bookable capacity windows. `reserved` is incremented with a conditional
-- UPDATE (reserved < capacity) so the last slot is allocated exactly once
-- (SC-013). Windows for one listing cannot overlap.
CREATE TABLE availability_capacity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 0),
    reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT availability_capacity_period_check CHECK (ends_at > starts_at),
    CONSTRAINT availability_capacity_within_capacity_check CHECK (reserved <= capacity),
    CONSTRAINT availability_capacity_no_overlap
        EXCLUDE USING gist (listing_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
);

CREATE INDEX availability_capacity_window_idx ON availability_capacity (listing_id, starts_at);

-- Domestic supplier catalogue (F-GDS-01, F-DSC-06). Cross-border fields
-- (Incoterms, export markets) are Phase 2 and are not included.
CREATE TABLE catalog_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    listing_id uuid,
    name text NOT NULL CHECK (length(btrim(name)) > 0),
    specifications jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(specifications) = 'object'),
    minimum_order_quantity numeric(14, 3) CHECK (minimum_order_quantity IS NULL OR minimum_order_quantity > 0),
    quantity_unit text,
    price_tiers jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(price_tiers) = 'array'),
    lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
    certifications jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(certifications) = 'array'),
    delivery_regions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(delivery_regions) = 'array'),
    data_source text NOT NULL DEFAULT 'self_declared' CHECK (data_source IN ('self_declared', 'verified')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT catalog_items_listing_vendor_fk FOREIGN KEY (listing_id, vendor_id)
        REFERENCES listings (id, vendor_id) ON DELETE RESTRICT
);

CREATE INDEX catalog_items_vendor_idx ON catalog_items (vendor_id);
CREATE INDEX catalog_items_listing_idx ON catalog_items (listing_id) WHERE listing_id IS NOT NULL;

COMMENT ON COLUMN catalog_items.price_tiers IS
    'Array of {minQuantity, unitPriceMinor, currency}. Minor units only; never floats.';

CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_areas_set_updated_at BEFORE UPDATE ON service_areas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER availability_rules_set_updated_at BEFORE UPDATE ON availability_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER availability_capacity_set_updated_at BEFORE UPDATE ON availability_capacity
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER catalog_items_set_updated_at BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Taxonomy: queryable attribute definitions per category version (F-TAX-03,
-- F-TAX-08) and the vendor category-suggestion queue (F-TAX-04).
BEGIN;

-- One row per attribute of a category configuration version, so filters and
-- dynamic forms can be indexed and queried. The full schema stays in
-- category_config_versions.configuration; these rows are derived from it when a
-- version is created and are immutable with it.
CREATE TABLE attribute_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL,
    version_number integer NOT NULL,
    attribute_key text NOT NULL CHECK (length(btrim(attribute_key)) > 0),
    localized_labels jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(localized_labels) = 'object'),
    data_type text NOT NULL CHECK (length(btrim(data_type)) > 0),
    validation jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation) = 'object'),
    is_required boolean NOT NULL DEFAULT false,
    is_filterable boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attribute_definitions_version_fk FOREIGN KEY (category_id, version_number)
        REFERENCES category_config_versions (category_id, version_number) ON DELETE RESTRICT,
    CONSTRAINT attribute_definitions_key UNIQUE (category_id, version_number, attribute_key)
);

CREATE INDEX attribute_definitions_filterable_idx
    ON attribute_definitions (category_id, version_number) WHERE is_filterable;

COMMENT ON COLUMN attribute_definitions.data_type IS
    'Vocabulary is owned by the category schema validator (F-TAX-08); not constrained here so new field types need no migration.';

CREATE TRIGGER attribute_definitions_immutable
    BEFORE UPDATE OR DELETE ON attribute_definitions
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();
CREATE TRIGGER attribute_definitions_no_truncate
    BEFORE TRUNCATE ON attribute_definitions
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_row_mutation();

-- Vendor proposes a category; it enters an admin queue and is never
-- auto-published (F-TAX-04, GM-14).
CREATE TABLE category_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid REFERENCES vendors (id) ON DELETE RESTRICT,
    industry_id uuid REFERENCES industries (id) ON DELETE RESTRICT,
    proposed_path jsonb NOT NULL CHECK (jsonb_typeof(proposed_path) = 'array'),
    justification text,
    nearest_category_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    duplicate_of_suggestion_id uuid REFERENCES category_suggestions (id) ON DELETE RESTRICT,
    created_category_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
    reviewer_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    decision_reason text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamptz,
    CONSTRAINT category_suggestions_decision_check CHECK (
        status = 'submitted'
        OR (reviewer_user_id IS NOT NULL AND reviewed_at IS NOT NULL
            AND decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0)
    ),
    CONSTRAINT category_suggestions_no_self_review_check
        CHECK (reviewer_user_id IS NULL OR reviewer_user_id <> submitted_by_user_id),
    CONSTRAINT category_suggestions_created_category_check
        CHECK (created_category_id IS NULL OR status = 'approved')
);

CREATE INDEX category_suggestions_queue_idx ON category_suggestions (created_at)
    WHERE status = 'submitted';
CREATE INDEX category_suggestions_submitter_idx ON category_suggestions (submitted_by_user_id);

COMMIT;

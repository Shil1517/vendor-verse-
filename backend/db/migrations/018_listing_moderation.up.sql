-- Listing review, duplicate decisions and vendor profile image moderation
-- (F-VND-07). Duplicate candidates are reviewed by a person; no merge/delete.
BEGIN;

ALTER TABLE duplicate_flags
    ADD COLUMN review_reason text,
    ADD CONSTRAINT duplicate_flags_review_reason_check
        CHECK (review_reason IS NULL OR length(btrim(review_reason)) > 0);

CREATE TABLE vendor_profile_image_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    image_type text NOT NULL CHECK (image_type IN ('logo', 'banner')),
    file_id uuid NOT NULL REFERENCES files (id) ON DELETE RESTRICT,
    reviewer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status text NOT NULL CHECK (status IN ('approved', 'rejected')),
    reason text NOT NULL CHECK (length(btrim(reason)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_profile_image_reviews_asset_key
        UNIQUE (vendor_id, image_type, file_id)
);

CREATE INDEX vendor_profile_image_reviews_vendor_idx
    ON vendor_profile_image_reviews (vendor_id, image_type, created_at DESC);

CREATE TRIGGER vendor_profile_image_reviews_immutable
    BEFORE UPDATE OR DELETE ON vendor_profile_image_reviews
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

INSERT INTO permissions (code, description) VALUES
    ('listing.review', 'Review listing content, media and duplicate flags')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'listing.review')
ON CONFLICT (role_code, permission_code) DO NOTHING;

COMMIT;

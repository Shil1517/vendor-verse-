-- F-ACC-06 customer profile: contact email and a default saved location.
--
-- contact_email is an UNVERIFIED contact detail kept on the profile. It is
-- deliberately not a user_identifiers row: authentication looks accounts up by
-- identifier, so an unverified address there would let someone claim another
-- person's email and have that person's OTP sign them into the wrong account.
-- When email OTP delivery exists (CFG-07) a verified address is promoted to
-- user_identifiers; the API reports emailVerified by matching the two.
BEGIN;

ALTER TABLE customer_profiles
    ADD COLUMN contact_email text,
    ADD CONSTRAINT customer_profiles_contact_email_check CHECK (
        contact_email IS NULL
        OR (length(contact_email) <= 254
            AND contact_email = lower(contact_email)
            AND contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    ),
    ADD CONSTRAINT customer_profiles_display_name_length_check CHECK (
        display_name IS NULL OR length(display_name) <= 120
    ),
    ADD CONSTRAINT customer_profiles_company_name_check CHECK (
        company_name IS NULL OR (length(btrim(company_name)) > 0 AND length(company_name) <= 160)
    ),
    -- an individual has no company; a business may add one later
    ADD CONSTRAINT customer_profiles_individual_company_check CHECK (
        customer_type = 'business' OR company_name IS NULL
    );

ALTER TABLE saved_locations
    ADD COLUMN is_default boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT saved_locations_label_length_check CHECK (length(label) <= 60);

-- at most one default location per user
CREATE UNIQUE INDEX saved_locations_one_default_key
    ON saved_locations (user_id) WHERE is_default;

COMMIT;

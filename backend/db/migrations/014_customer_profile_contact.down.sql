-- Destructive rollback for a disposable database or an approved recovery plan.
-- Drops stored contact emails and default-location flags.
BEGIN;

DROP INDEX saved_locations_one_default_key;
ALTER TABLE saved_locations
    DROP CONSTRAINT saved_locations_label_length_check,
    DROP COLUMN is_default;

ALTER TABLE customer_profiles
    DROP CONSTRAINT customer_profiles_individual_company_check,
    DROP CONSTRAINT customer_profiles_company_name_check,
    DROP CONSTRAINT customer_profiles_display_name_length_check,
    DROP CONSTRAINT customer_profiles_contact_email_check,
    DROP COLUMN contact_email;

COMMIT;

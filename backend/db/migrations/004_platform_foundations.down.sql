-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE outbox_events;
DROP TABLE idempotency_keys;
DROP TABLE audit_events;

ALTER TABLE vendor_profiles
    DROP CONSTRAINT vendor_profiles_logo_file_fk,
    DROP CONSTRAINT vendor_profiles_banner_file_fk;
DROP TABLE files;

DROP TRIGGER category_config_versions_no_truncate ON category_config_versions;
DROP TRIGGER category_config_versions_immutable ON category_config_versions;

DROP TRIGGER subcategories_set_updated_at ON subcategories;
DROP TRIGGER categories_set_updated_at ON categories;
DROP TRIGGER industries_set_updated_at ON industries;
DROP TRIGGER vendor_profile_links_set_updated_at ON vendor_profile_links;
DROP TRIGGER vendor_profiles_set_updated_at ON vendor_profiles;
DROP TRIGGER vendors_set_updated_at ON vendors;
DROP TRIGGER users_set_updated_at ON users;

DROP FUNCTION prevent_row_mutation();
DROP FUNCTION set_updated_at();

COMMIT;

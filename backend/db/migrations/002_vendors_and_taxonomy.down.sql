-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE subcategories;
ALTER TABLE categories DROP CONSTRAINT categories_current_version_fk;
DROP TABLE category_config_versions;
DROP TABLE categories;
DROP TABLE industries;
DROP TABLE vendor_profile_links;
DROP TABLE vendor_profiles;
DROP TABLE vendors;

COMMIT;

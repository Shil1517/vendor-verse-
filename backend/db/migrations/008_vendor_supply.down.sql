-- Destructive rollback for a disposable database or an approved recovery plan.
-- btree_gist is left installed (shared extension; harmless).
BEGIN;

DROP TABLE catalog_items;
DROP TABLE availability_capacity;
DROP TABLE availability_rules;
DROP TABLE service_areas;
DROP TABLE duplicate_flags;
DROP TABLE listing_reviews;
DROP TABLE listing_media;
DROP TABLE listing_attributes;
DROP TABLE listings;
DROP TABLE verification_evidence;
DROP TABLE verifications;
DROP FUNCTION enforce_reviewer_not_vendor_owner();
DROP TABLE vendor_documents;
DROP TABLE vendor_categories;

COMMIT;

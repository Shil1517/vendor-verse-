-- Supporting indexes for foreign keys that are used for lookups, joins or
-- "who references this row" checks. Added as a follow-up to 004-012 (which are
-- already applied and checksum-locked) after an index audit.
--
-- Deliberately NOT indexed: pure "actor" columns on low-volume decision tables
-- (reviewed_by / decided_by / released_by / created_by ...). Users are never
-- hard-deleted (all user FKs are ON DELETE RESTRICT), those columns are not
-- filtered on, and an index would only add write cost. Add one if a screen
-- starts to query "everything user X decided".
BEGIN;

-- File references: answers "is this file used anywhere?" before retention
-- deletes it, and keeps the RESTRICT check on files cheap.
CREATE INDEX customer_profiles_photo_file_idx ON customer_profiles (photo_file_id) WHERE photo_file_id IS NOT NULL;
CREATE INDEX vendor_profiles_logo_file_idx ON vendor_profiles (logo_file_id) WHERE logo_file_id IS NOT NULL;
CREATE INDEX vendor_profiles_banner_file_idx ON vendor_profiles (banner_file_id) WHERE banner_file_id IS NOT NULL;
CREATE INDEX vendor_documents_file_idx ON vendor_documents (file_id);
CREATE INDEX listing_media_file_idx ON listing_media (file_id);
CREATE INDEX business_account_evidence_file_idx ON business_account_evidence (file_id);
CREATE INDEX case_evidence_file_idx ON case_evidence (file_id);
CREATE INDEX invoices_document_file_idx ON invoices (document_file_id) WHERE document_file_id IS NOT NULL;
CREATE INDEX account_data_requests_result_file_idx ON account_data_requests (result_file_id) WHERE result_file_id IS NOT NULL;

-- Taxonomy and geography links.
CREATE INDEX listings_subcategory_idx ON listings (subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX verifications_category_idx ON verifications (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX verifications_resubmission_idx ON verifications (resubmission_of_id) WHERE resubmission_of_id IS NOT NULL;
CREATE INDEX contracts_category_idx ON contracts (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX category_suggestions_vendor_idx ON category_suggestions (vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX category_suggestions_industry_idx ON category_suggestions (industry_id) WHERE industry_id IS NOT NULL;
CREATE INDEX category_suggestions_nearest_idx ON category_suggestions (nearest_category_id) WHERE nearest_category_id IS NOT NULL;
CREATE INDEX category_suggestions_created_category_idx ON category_suggestions (created_category_id) WHERE created_category_id IS NOT NULL;
CREATE INDEX category_suggestions_duplicate_idx ON category_suggestions (duplicate_of_suggestion_id) WHERE duplicate_of_suggestion_id IS NOT NULL;
CREATE INDEX saved_locations_city_idx ON saved_locations (city_id) WHERE city_id IS NOT NULL;
CREATE INDEX saved_locations_country_idx ON saved_locations (country_id) WHERE country_id IS NOT NULL;
CREATE INDEX saved_locations_locality_idx ON saved_locations (locality_id) WHERE locality_id IS NOT NULL;
CREATE INDEX business_accounts_country_idx ON business_accounts (registration_country_id) WHERE registration_country_id IS NOT NULL;

-- Transaction and engagement joins.
CREATE INDEX booking_series_listing_idx ON booking_series (listing_id);
CREATE INDEX po_lines_catalog_item_idx ON po_lines (catalog_item_id) WHERE catalog_item_id IS NOT NULL;
CREATE INDEX purchase_orders_buyer_vendor_idx ON purchase_orders (buyer_vendor_id) WHERE buyer_vendor_id IS NOT NULL;
CREATE INDEX account_holds_case_idx ON account_holds (case_id) WHERE case_id IS NOT NULL;
CREATE INDEX appeals_reviewer_idx ON appeals (reviewer_user_id) WHERE reviewer_user_id IS NOT NULL;
CREATE INDEX contact_share_consents_user_idx ON contact_share_consents (user_id);
CREATE INDEX notifications_template_idx ON notifications (template_id) WHERE template_id IS NOT NULL;
CREATE INDEX role_permissions_permission_idx ON role_permissions (permission_code);
CREATE INDEX subscriptions_scheduled_plan_idx ON subscriptions (scheduled_plan_version_id) WHERE scheduled_plan_version_id IS NOT NULL;

COMMIT;

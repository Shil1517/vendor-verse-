-- Safe rollback: drops indexes only, no data is touched.
BEGIN;

DROP INDEX customer_profiles_photo_file_idx;
DROP INDEX vendor_profiles_logo_file_idx;
DROP INDEX vendor_profiles_banner_file_idx;
DROP INDEX vendor_documents_file_idx;
DROP INDEX listing_media_file_idx;
DROP INDEX business_account_evidence_file_idx;
DROP INDEX case_evidence_file_idx;
DROP INDEX invoices_document_file_idx;
DROP INDEX account_data_requests_result_file_idx;
DROP INDEX listings_subcategory_idx;
DROP INDEX verifications_category_idx;
DROP INDEX verifications_resubmission_idx;
DROP INDEX contracts_category_idx;
DROP INDEX category_suggestions_vendor_idx;
DROP INDEX category_suggestions_industry_idx;
DROP INDEX category_suggestions_nearest_idx;
DROP INDEX category_suggestions_created_category_idx;
DROP INDEX category_suggestions_duplicate_idx;
DROP INDEX saved_locations_city_idx;
DROP INDEX saved_locations_country_idx;
DROP INDEX saved_locations_locality_idx;
DROP INDEX business_accounts_country_idx;
DROP INDEX booking_series_listing_idx;
DROP INDEX po_lines_catalog_item_idx;
DROP INDEX purchase_orders_buyer_vendor_idx;
DROP INDEX account_holds_case_idx;
DROP INDEX appeals_reviewer_idx;
DROP INDEX contact_share_consents_user_idx;
DROP INDEX notifications_template_idx;
DROP INDEX role_permissions_permission_idx;
DROP INDEX subscriptions_scheduled_plan_idx;

COMMIT;

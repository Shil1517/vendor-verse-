-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE sales_agent_profiles;
DROP TABLE business_account_evidence;
DROP TABLE business_accounts;
DROP TABLE account_data_requests;
DROP TABLE user_privacy_preferences;
DROP TABLE user_consents;
DROP TABLE saved_locations;
DROP TABLE customer_profiles;

COMMIT;

-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE platform_settings;
DROP TABLE config_register_items;
DROP TABLE onboarding_consents;
DROP TABLE lead_activities;
DROP TABLE sales_leads;
DROP TABLE sponsored_campaigns;
DROP TABLE lead_usage;
DROP TABLE invoices;
DROP TABLE billing_events;
DROP TABLE subscriptions;
DROP TABLE plan_entitlements;
DROP TABLE plan_versions;
DROP TABLE plans;

COMMIT;

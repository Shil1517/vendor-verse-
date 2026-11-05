-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE notification_preferences;
DROP TABLE notification_delivery_attempts;
DROP TABLE notifications;
DROP TABLE notification_templates;
DROP TABLE vendor_trust_metrics;
DROP TABLE review_ratings;
DROP TABLE reviews;
DROP TABLE contact_share_consents;
DROP TABLE messages;
DROP TABLE conversation_participants;
DROP TABLE conversation_links;
DROP TABLE conversations;
DROP TABLE favorites;

COMMIT;

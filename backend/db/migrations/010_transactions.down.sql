-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE payment_records;
DROP TABLE milestones;
DROP TABLE contract_acceptances;
DROP FUNCTION enforce_latest_contract_version();
ALTER TABLE contracts DROP CONSTRAINT contracts_current_version_fk;
DROP TABLE contract_versions;
DROP TABLE contracts;
DROP TABLE po_disputes;
DROP TABLE shipments;
DROP TABLE po_events;
DROP TABLE po_lines;
DROP TABLE purchase_orders;
DROP TABLE work_orders;
DROP TABLE booking_modifications;
DROP TABLE booking_events;
DROP TABLE booking_terms_snapshots;
DROP TABLE bookings;
DROP FUNCTION enforce_booking_final_states();
DROP TABLE booking_series;
DROP TABLE accepted_terms_snapshots;
DROP TABLE quote_lines;
ALTER TABLE quotes DROP CONSTRAINT quotes_current_revision_fk;
DROP TABLE quote_revisions;
DROP TABLE quotes;
DROP TABLE rfq_recipients;
DROP TABLE rfq_revision_files;
ALTER TABLE rfqs DROP CONSTRAINT rfqs_current_revision_fk;
DROP TABLE rfq_revisions;
DROP TABLE rfqs;
DROP FUNCTION enforce_quote_revisable();
DROP FUNCTION enforce_rfq_editable();

COMMIT;

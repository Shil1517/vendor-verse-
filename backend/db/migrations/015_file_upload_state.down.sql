-- Destructive rollback for a disposable database or an approved recovery plan.
-- Drops the recorded upload times.
BEGIN;

DROP INDEX files_scan_pending_idx;
CREATE INDEX files_scan_pending_idx ON files (created_at) WHERE scan_status = 'pending';

ALTER TABLE files
    DROP CONSTRAINT files_scan_after_upload_check,
    DROP COLUMN uploaded_at;

COMMIT;

-- Files module: record when the owner confirmed the upload finished. scan_status
-- stays 'pending' until the scanner decides, so without this column "waiting for
-- bytes" and "waiting for scan" cannot be told apart.
BEGIN;

ALTER TABLE files
    ADD COLUMN uploaded_at timestamptz,
    ADD CONSTRAINT files_scan_after_upload_check
        CHECK (scan_status = 'pending' OR uploaded_at IS NOT NULL);

-- the scanner only looks at uploaded, unscanned files
DROP INDEX files_scan_pending_idx;
CREATE INDEX files_scan_pending_idx ON files (uploaded_at)
    WHERE scan_status = 'pending' AND uploaded_at IS NOT NULL;

COMMIT;

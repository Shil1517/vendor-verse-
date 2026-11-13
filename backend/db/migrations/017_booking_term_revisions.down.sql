BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM booking_terms_snapshots
        GROUP BY booking_id HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot roll back booking term revisions while multiple snapshots exist';
    END IF;
END;
$$;

ALTER TABLE booking_terms_snapshots
    DROP CONSTRAINT booking_terms_snapshots_booking_version_key,
    DROP COLUMN version_number,
    ADD CONSTRAINT booking_terms_snapshots_booking_id_key UNIQUE (booking_id);

COMMIT;

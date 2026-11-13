BEGIN;

ALTER TABLE booking_terms_snapshots
    DROP CONSTRAINT booking_terms_snapshots_booking_id_key;

ALTER TABLE booking_terms_snapshots
    ADD COLUMN version_number integer NOT NULL DEFAULT 1
        CHECK (version_number > 0),
    ADD CONSTRAINT booking_terms_snapshots_booking_version_key
        UNIQUE (booking_id, version_number);

COMMIT;

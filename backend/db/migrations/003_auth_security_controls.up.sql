-- Authentication challenge attempt tracking and persistent OTP request limits.
-- Exact policy values are supplied at runtime; this migration sets no limits.
BEGIN;

ALTER TABLE auth_challenges
    ADD COLUMN failed_attempts integer NOT NULL DEFAULT 0
        CHECK (failed_attempts >= 0);

CREATE INDEX auth_challenges_expires_at_idx
    ON auth_challenges (expires_at);

CREATE TABLE auth_rate_limit_buckets (
    scope text NOT NULL CHECK (length(btrim(scope)) > 0),
    subject_hash text NOT NULL CHECK (length(btrim(subject_hash)) > 0),
    window_ends_at timestamptz NOT NULL,
    request_count integer NOT NULL CHECK (request_count > 0),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (scope, subject_hash)
);

COMMIT;

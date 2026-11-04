-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE auth_rate_limit_buckets;
DROP INDEX auth_challenges_expires_at_idx;
ALTER TABLE auth_challenges DROP COLUMN failed_attempts;

COMMIT;

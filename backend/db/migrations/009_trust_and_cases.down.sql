-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE account_holds;
DROP TABLE appeals;
DROP TABLE case_actions;
DROP TABLE case_evidence;
DROP TABLE support_cases;
DROP TABLE reports;

COMMIT;

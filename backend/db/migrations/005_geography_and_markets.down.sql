-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE market_waitlist;
DROP TABLE market_activations;
DROP TABLE localities;
DROP TABLE cities;
DROP TABLE regions;
DROP TABLE countries;

COMMIT;

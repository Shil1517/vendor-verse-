-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE category_suggestions;
DROP TABLE attribute_definitions;

COMMIT;

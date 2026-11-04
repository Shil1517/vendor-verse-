-- Destructive rollback for a disposable database or an approved recovery plan.
BEGIN;

DROP TABLE user_role_assignments;
DROP TABLE role_permissions;
DROP TABLE permissions;
DROP TABLE roles;
DROP TABLE auth_sessions;
DROP TABLE auth_challenges;
DROP TABLE user_identifiers;
DROP TABLE users;

COMMIT;

BEGIN;

-- Password sign-in for Super Admin (owner request 2026-11-23). One row per admin user; the
-- password is stored only as a salted scrypt hash and is never returned by any API.
CREATE TABLE admin_credentials (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE RESTRICT,
    login_id text NOT NULL
        CHECK (length(btrim(login_id)) > 0 AND login_id = lower(btrim(login_id))),
    password_hash text NOT NULL CHECK (length(password_hash) > 0),
    password_changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_credentials_login_id_key UNIQUE (login_id)
);

COMMENT ON TABLE admin_credentials IS
    'Super Admin password sign-in. Created by scripts/seed-admin.cjs; sign-in also needs an active SUPER_ADMIN role assignment.';

COMMIT;

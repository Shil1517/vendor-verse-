-- PostgreSQL 16 SQL migration draft.
-- O-13 remains open; this is the explicitly authorized database-only scope.
-- UUID primary keys are supplied by the application; do not generate or reuse
-- identifiers from client-controlled input.

BEGIN;

CREATE TABLE users (
    id uuid PRIMARY KEY,
    account_status text NOT NULL
        CHECK (account_status IN (
            'pending_verification',
            'active',
            'restricted',
            'suspended',
            'deletion_requested'
        )),
    current_mode text NOT NULL
        CHECK (current_mode IN ('customer', 'vendor', 'business')),
    locale jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(locale) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS
    'Single authenticated identity; mode is UX context, not an authorization grant.';

CREATE TABLE user_identifiers (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    channel text NOT NULL CHECK (channel IN ('phone', 'email')),
    normalized_value text NOT NULL CHECK (length(btrim(normalized_value)) > 0),
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_identifiers_channel_value_key
        UNIQUE (channel, normalized_value)
);

CREATE INDEX user_identifiers_user_id_idx ON user_identifiers (user_id);

CREATE TABLE auth_challenges (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    channel text CHECK (channel IS NULL OR channel IN ('phone', 'email')),
    identifier_value text,
    purpose text NOT NULL CHECK (purpose IN ('otp', 'mfa')),
    verifier_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_challenges_subject_check CHECK (
        (purpose = 'otp'
            AND channel IS NOT NULL
            AND identifier_value IS NOT NULL
            AND length(btrim(identifier_value)) > 0)
        OR
        (purpose = 'mfa' AND user_id IS NOT NULL)
    )
);

CREATE INDEX auth_challenges_identifier_idx
    ON auth_challenges (channel, identifier_value, created_at DESC);
CREATE INDEX auth_challenges_user_id_idx
    ON auth_challenges (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE TABLE auth_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    refresh_token_hash text NOT NULL UNIQUE,
    device_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(device_metadata) = 'object'),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_sessions_revocation_time_check
        CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX auth_sessions_user_id_idx
    ON auth_sessions (user_id, created_at DESC);

COMMENT ON COLUMN auth_sessions.refresh_token_hash IS
    'Store a verifier/hash only; never persist a reusable plaintext refresh token.';

CREATE TABLE roles (
    code text PRIMARY KEY
        CHECK (code IN ('CUSTOMER', 'VENDOR', 'SALES_AGENT', 'SUPER_ADMIN')),
    display_name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (code, display_name) VALUES
    ('CUSTOMER', 'Customer'),
    ('VENDOR', 'Vendor'),
    ('SALES_AGENT', 'Sales Agent'),
    ('SUPER_ADMIN', 'Super Admin')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE permissions (
    code text PRIMARY KEY,
    description text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_code text NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
    permission_code text NOT NULL REFERENCES permissions (code) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE user_role_assignments (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    role_code text NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
    granted_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    grant_reason text,
    granted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    revocation_reason text,
    revoked_at timestamptz,
    CONSTRAINT user_role_assignments_grant_reason_check
        CHECK (grant_reason IS NULL OR length(btrim(grant_reason)) > 0),
    CONSTRAINT user_role_assignments_revocation_check CHECK (
        (revoked_at IS NULL
            AND revoked_by_user_id IS NULL
            AND revocation_reason IS NULL)
        OR
        (revoked_at IS NOT NULL
            AND revoked_by_user_id IS NOT NULL
            AND revocation_reason IS NOT NULL
            AND length(btrim(revocation_reason)) > 0)
    ),
    CONSTRAINT user_role_assignments_time_check
        CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE UNIQUE INDEX user_role_assignments_active_key
    ON user_role_assignments (user_id, role_code)
    WHERE revoked_at IS NULL;
CREATE INDEX user_role_assignments_role_code_idx
    ON user_role_assignments (role_code);

COMMENT ON TABLE user_role_assignments IS
    'Authorization roles are separate from account modes; administrative role changes require service-enforced authorization and audit.';

COMMIT;

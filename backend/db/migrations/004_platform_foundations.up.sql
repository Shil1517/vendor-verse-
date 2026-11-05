-- Platform foundations: shared trigger helpers, append-only audit trail,
-- idempotency keys, transactional outbox and private file metadata.
-- Additive only; nothing in 001-003 is rewritten.
--
-- Conventions used by every migration from here on:
--   * ids are uuid, defaulting to gen_random_uuid() (the application may also
--     supply them); timestamps are timestamptz in UTC.
--   * money is integer minor units plus an ISO-4217 code, never a float.
--   * a vocabulary is enforced with a CHECK only when the feature spec or PRS
--     defines it. Where the owner has not decided a vocabulary (CFG/O items),
--     the column is a non-empty text and the comment says so.
--   * immutable / append-only tables are protected by prevent_row_mutation().
BEGIN;

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
    'BEFORE UPDATE trigger: keeps updated_at truthful even when the application forgets to set it.';

CREATE FUNCTION prevent_row_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is not allowed on % : rows are immutable/append-only',
        TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

COMMENT ON FUNCTION prevent_row_mutation() IS
    'Attach as BEFORE UPDATE OR DELETE (row) and BEFORE TRUNCATE (statement) to make a table append-only.';

-- Keep updated_at honest on the tables created by 001 and 002.
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vendors_set_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vendor_profiles_set_updated_at BEFORE UPDATE ON vendor_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vendor_profile_links_set_updated_at BEFORE UPDATE ON vendor_profile_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER industries_set_updated_at BEFORE UPDATE ON industries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER subcategories_set_updated_at BEFORE UPDATE ON subcategories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Category configuration versions are immutable (F-TAX-03: existing deals keep
-- their snapshot). A change is a new version row.
CREATE TRIGGER category_config_versions_immutable
    BEFORE UPDATE OR DELETE ON category_config_versions
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();
CREATE TRIGGER category_config_versions_no_truncate
    BEFORE TRUNCATE ON category_config_versions
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_row_mutation();

-- ---------------------------------------------------------------------------
-- Files: metadata only. Bytes live in S3-compatible private storage.
-- ---------------------------------------------------------------------------
CREATE TABLE files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    purpose text NOT NULL CHECK (length(btrim(purpose)) > 0),
    storage_key text NOT NULL UNIQUE CHECK (length(btrim(storage_key)) > 0),
    original_name text,
    content_type text NOT NULL CHECK (length(btrim(content_type)) > 0),
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256 text CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'),
    visibility text NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'public')),
    scan_status text NOT NULL DEFAULT 'pending'
        CHECK (scan_status IN ('pending', 'clean', 'infected', 'failed')),
    scanned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT files_scan_time_check
        CHECK (scan_status = 'pending' OR scanned_at IS NOT NULL)
);

CREATE INDEX files_owner_user_id_idx ON files (owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX files_scan_pending_idx ON files (created_at) WHERE scan_status = 'pending';

COMMENT ON TABLE files IS
    'Private by default. Serve only through short-lived authorised URLs; a file is usable only after scan_status = clean (PRS section 16).';

-- The files module now exists, so complete the references left open in 002.
ALTER TABLE vendor_profiles
    ADD CONSTRAINT vendor_profiles_logo_file_fk
        FOREIGN KEY (logo_file_id) REFERENCES files (id) ON DELETE RESTRICT,
    ADD CONSTRAINT vendor_profiles_banner_file_fk
        FOREIGN KEY (banner_file_id) REFERENCES files (id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- Audit trail (F-ADM-05): append-only, role-scoped read by the application.
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    actor_service text,
    actor_role text,
    action text NOT NULL CHECK (length(btrim(action)) > 0),
    target_type text NOT NULL CHECK (length(btrim(target_type)) > 0),
    target_id text NOT NULL CHECK (length(btrim(target_id)) > 0),
    reason text,
    correlation_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT audit_events_actor_check CHECK (
        actor_user_id IS NOT NULL OR (actor_service IS NOT NULL AND length(btrim(actor_service)) > 0)
    )
);

CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id, occurred_at DESC);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_user_id, occurred_at DESC)
    WHERE actor_user_id IS NOT NULL;
CREATE INDEX audit_events_correlation_idx ON audit_events (correlation_id)
    WHERE correlation_id IS NOT NULL;
CREATE INDEX audit_events_occurred_at_idx ON audit_events (occurred_at DESC);

CREATE TRIGGER audit_events_immutable
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();
CREATE TRIGGER audit_events_no_truncate
    BEFORE TRUNCATE ON audit_events
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_row_mutation();

COMMENT ON TABLE audit_events IS
    'Append-only. Background jobs record an explicit actor_service (PRS section 4.3). Partition by occurred_at when volume requires it.';

-- ---------------------------------------------------------------------------
-- Idempotency (F-BKG-08): one stored response per (scope, key).
-- ---------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
    scope text NOT NULL CHECK (length(btrim(scope)) > 0),
    idempotency_key text NOT NULL CHECK (length(btrim(idempotency_key)) > 0),
    request_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (scope, idempotency_key)
);

CREATE INDEX idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);

COMMENT ON COLUMN idempotency_keys.scope IS
    'Caller identity plus operation, e.g. "<user_id>:POST /v1/bookings". Retention is a runtime setting; a cleanup job deletes rows past expires_at.';

-- ---------------------------------------------------------------------------
-- Transactional outbox: events committed with the data, dispatched by workers
-- (search indexer, notification dispatch).
-- ---------------------------------------------------------------------------
CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type text NOT NULL CHECK (length(btrim(aggregate_type)) > 0),
    aggregate_id text NOT NULL CHECK (length(btrim(aggregate_id)) > 0),
    event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    available_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error text,
    dead_lettered_at timestamptz
);

CREATE INDEX outbox_events_pending_idx ON outbox_events (available_at, created_at)
    WHERE processed_at IS NULL AND dead_lettered_at IS NULL;
CREATE INDEX outbox_events_aggregate_idx ON outbox_events (aggregate_type, aggregate_id, created_at);

COMMIT;

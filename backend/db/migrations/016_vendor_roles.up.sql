-- Vendor roles (D-023, D-024). A vendor holds one or more roles; each role is verified
-- on its own (D-020) and shown publicly only once verified (D-021). Roles are data, not
-- a fixed list: adding a kind of vendor is an INSERT into vendor_role_definitions.
-- Reference data that vendors.business_type now points at is created here, because
-- the foreign key needs it to exist.
BEGIN;

CREATE TABLE vendor_role_definitions (
    code text PRIMARY KEY CHECK (code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
    label text NOT NULL CHECK (length(btrim(label)) > 0),
    description text,
    -- NULL means not yet decided; no value is assumed.
    offer_type text CHECK (offer_type IN ('products', 'services')),
    -- Documents a vendor holding this role must submit (D-019). A vendor submits the
    -- combined set for its roles and nothing more.
    required_documents jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(required_documents) = 'array'),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendor_role_definitions IS
    'Catalogue of vendor roles (manufacturer, supplier, ...). New roles are rows, not code (D-024). Retire with is_active = false; rows are never deleted while vendors hold the role.';

-- The seven values the old business_type check allowed, so existing vendors keep a valid
-- role. Required documents are only filled where the clients already ask for them.
INSERT INTO vendor_role_definitions (code, label, offer_type, required_documents) VALUES
    ('SERVICE_PROVIDER', 'Service provider', 'services',
        '["Government photo ID", "Address proof", "Category licence"]'),
    ('CONTRACTOR', 'Contractor', 'services',
        '["GST / business registration", "Contractor licence", "Insurance certificate"]'),
    ('MANUFACTURER', 'Manufacturer', 'products',
        '["Business & factory registration", "Quality certificate (ISO / CE / BIS)", "Factory photos / audit report"]'),
    ('SUPPLIER', 'Supplier / distributor', 'products',
        '["GST / business registration", "Brand authorisation letter", "Warehouse proof"]'),
    ('WHOLESALER', 'Wholesaler', 'products', '[]'),
    ('DISTRIBUTOR', 'Distributor', 'products', '[]'),
    ('OTHER', 'Other', NULL, '[]')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE vendor_roles (
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    role_code text NOT NULL REFERENCES vendor_role_definitions (code) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'rejected', 'revoked')),
    reviewer_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    reason text,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vendor_id, role_code),
    CONSTRAINT vendor_roles_decision_check CHECK (
        status = 'pending'
        OR (reviewer_user_id IS NOT NULL AND decided_at IS NOT NULL
            AND reason IS NOT NULL AND length(btrim(reason)) > 0)
    )
);

CREATE INDEX vendor_roles_queue_idx ON vendor_roles (created_at) WHERE status = 'pending';
CREATE INDEX vendor_roles_role_idx ON vendor_roles (role_code, status);
CREATE INDEX vendor_roles_reviewer_idx ON vendor_roles (reviewer_user_id) WHERE reviewer_user_id IS NOT NULL;

-- A reviewer cannot decide on their own vendor's role (same rule as verifications).
CREATE FUNCTION enforce_role_reviewer_not_vendor_owner() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_owner uuid;
BEGIN
    IF NEW.reviewer_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT owner_user_id INTO v_owner FROM vendors WHERE id = NEW.vendor_id;
    IF v_owner = NEW.reviewer_user_id THEN
        RAISE EXCEPTION 'reviewer % cannot review a role of their own vendor', NEW.reviewer_user_id
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER vendor_roles_reviewer_not_owner
    BEFORE INSERT OR UPDATE OF reviewer_user_id ON vendor_roles
    FOR EACH ROW EXECUTE FUNCTION enforce_role_reviewer_not_vendor_owner();

-- vendors.business_type becomes the primary role, validated against the catalogue
-- instead of a fixed list.
ALTER TABLE vendors DROP CONSTRAINT vendors_business_type_check;
ALTER TABLE vendors
    ADD CONSTRAINT vendors_business_type_fkey
        FOREIGN KEY (business_type) REFERENCES vendor_role_definitions (code) ON DELETE RESTRICT;
CREATE INDEX vendors_business_type_idx ON vendors (business_type) WHERE business_type IS NOT NULL;

-- Existing vendors get their current type as a pending role: nothing was verified per role.
INSERT INTO vendor_roles (vendor_id, role_code)
SELECT id, business_type FROM vendors WHERE business_type IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;

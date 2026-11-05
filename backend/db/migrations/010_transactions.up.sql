-- Transaction core: bookings (incl. recurring series), RFQs and quotations,
-- accepted-terms snapshots, work orders, purchase orders, contracts, milestones
-- and Mode A/B payment records (F-BKG-*, F-RFQ-*, F-GDS-*, F-CON-*, F-PAY-01/02).
--
-- Key integrity rules enforced here (PRS 14, 14.1):
--   * exactly one accepted quote per RFQ, even under concurrent acceptance;
--   * accepted terms, booking terms, RFQ/quote/contract versions are immutable;
--   * a contract version can be accepted only while it is the latest;
--   * duplicate booking creation is blocked by an idempotency key;
--   * the platform records terms only - it never holds or moves funds (D-002).
--
-- Not modelled: PO "payment failed" (O-06), contract suspend/resume/expiry
-- (O-08), contract renewal/amendment/termination and e-sign (Phase 2), Mode C,
-- escrow, wallet, refunds, payouts, commission (Phase 2), multi-currency quotes
-- and Incoterms (Phase 2).
BEGIN;

-- ---------------------------------------------------------------------------
-- RFQ and quotations
-- ---------------------------------------------------------------------------
CREATE TABLE rfqs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    kind text NOT NULL CHECK (kind IN ('service', 'goods')),
    state text NOT NULL DEFAULT 'draft'
        CHECK (state IN ('draft', 'open', 'accepted', 'expired', 'cancelled')),
    current_revision integer NOT NULL DEFAULT 1 CHECK (current_revision > 0),
    quote_deadline_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rfqs_open_needs_deadline_check CHECK (state = 'draft' OR quote_deadline_at IS NOT NULL)
);

CREATE INDEX rfqs_customer_idx ON rfqs (customer_user_id, created_at DESC);
CREATE INDEX rfqs_open_deadline_idx ON rfqs (quote_deadline_at) WHERE state = 'open';
CREATE INDEX rfqs_category_idx ON rfqs (category_id, state);

CREATE TABLE rfq_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id uuid NOT NULL REFERENCES rfqs (id) ON DELETE RESTRICT,
    revision_number integer NOT NULL CHECK (revision_number > 0),
    requirements jsonb NOT NULL CHECK (jsonb_typeof(requirements) = 'object'),
    category_config_version integer NOT NULL CHECK (category_config_version > 0),
    quote_deadline_at timestamptz,
    time_zone text,
    created_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    change_reason text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rfq_revisions_rfq_revision_key UNIQUE (rfq_id, revision_number)
);

ALTER TABLE rfqs
    ADD CONSTRAINT rfqs_current_revision_fk
    FOREIGN KEY (id, current_revision) REFERENCES rfq_revisions (rfq_id, revision_number)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE rfq_revision_files (
    rfq_revision_id uuid NOT NULL REFERENCES rfq_revisions (id) ON DELETE RESTRICT,
    file_id uuid NOT NULL REFERENCES files (id) ON DELETE RESTRICT,
    PRIMARY KEY (rfq_revision_id, file_id)
);

CREATE INDEX rfq_revision_files_file_idx ON rfq_revision_files (file_id);

-- The eligible vendor set. Vendors only ever see their own row (no competing
-- RFQs / quotes, F-BKG-08, PRS 8.5).
CREATE TABLE rfq_recipients (
    rfq_id uuid NOT NULL REFERENCES rfqs (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    delivery_state text NOT NULL DEFAULT 'pending'
        CHECK (delivery_state IN ('pending', 'delivered', 'viewed', 'declined')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rfq_id, vendor_id)
);

CREATE INDEX rfq_recipients_vendor_idx ON rfq_recipients (vendor_id, created_at DESC);

CREATE TABLE quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    current_revision integer NOT NULL DEFAULT 1 CHECK (current_revision > 0),
    state text NOT NULL DEFAULT 'submitted'
        CHECK (state IN ('submitted', 'withdrawn', 'accepted', 'unsuccessful', 'expired')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- only invited vendors can quote
    CONSTRAINT quotes_recipient_fk FOREIGN KEY (rfq_id, vendor_id)
        REFERENCES rfq_recipients (rfq_id, vendor_id) ON DELETE RESTRICT,
    CONSTRAINT quotes_rfq_vendor_key UNIQUE (rfq_id, vendor_id),
    CONSTRAINT quotes_rfq_id_id_key UNIQUE (rfq_id, id)
);

-- At most one accepted quote per RFQ (F-RFQ-03, SC-025).
CREATE UNIQUE INDEX quotes_one_accepted_per_rfq_key ON quotes (rfq_id) WHERE state = 'accepted';
CREATE INDEX quotes_vendor_idx ON quotes (vendor_id, created_at DESC);

CREATE TABLE quote_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id uuid NOT NULL REFERENCES quotes (id) ON DELETE RESTRICT,
    revision_number integer NOT NULL CHECK (revision_number > 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    total_minor bigint NOT NULL CHECK (total_minor >= 0),
    scope text,
    inclusions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(inclusions) = 'array'),
    exclusions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exclusions) = 'array'),
    timeline jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(timeline) = 'object'),
    terms jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(terms) = 'object'),
    valid_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT quote_revisions_quote_revision_key UNIQUE (quote_id, revision_number),
    CONSTRAINT quote_revisions_quote_id_id_key UNIQUE (quote_id, id)
);

ALTER TABLE quotes
    ADD CONSTRAINT quotes_current_revision_fk
    FOREIGN KEY (id, current_revision) REFERENCES quote_revisions (quote_id, revision_number)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON COLUMN quote_revisions.currency IS
    'ISO 4217. Phase 1 shows INR only (D-008); multi-currency quotes are Phase 2 (F-RFQ-07), so the column is ready but not restricted.';

CREATE TABLE quote_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_revision_id uuid NOT NULL REFERENCES quote_revisions (id) ON DELETE RESTRICT,
    line_number integer NOT NULL CHECK (line_number > 0),
    description text NOT NULL CHECK (length(btrim(description)) > 0),
    quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
    unit text,
    unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
    line_total_minor bigint NOT NULL CHECK (line_total_minor >= 0),
    CONSTRAINT quote_lines_revision_line_key UNIQUE (quote_revision_id, line_number)
);

-- RFQs can be edited only while open and unaccepted; quotes can be revised only
-- while still submitted (an accepted quote is never mutated, PRS 4.4).
CREATE FUNCTION enforce_rfq_editable() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_state text;
BEGIN
    SELECT state INTO v_state FROM rfqs WHERE id = NEW.rfq_id;
    IF v_state NOT IN ('draft', 'open') THEN
        RAISE EXCEPTION 'RFQ % is % and can no longer be revised', NEW.rfq_id, v_state
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION enforce_quote_revisable() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_state text;
BEGIN
    SELECT state INTO v_state FROM quotes WHERE id = NEW.quote_id;
    IF v_state <> 'submitted' THEN
        RAISE EXCEPTION 'quote % is % and cannot be revised', NEW.quote_id, v_state
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER rfq_revisions_editable BEFORE INSERT ON rfq_revisions
    FOR EACH ROW EXECUTE FUNCTION enforce_rfq_editable();
CREATE TRIGGER quote_revisions_revisable BEFORE INSERT ON quote_revisions
    FOR EACH ROW EXECUTE FUNCTION enforce_quote_revisable();

CREATE TRIGGER rfq_revisions_immutable BEFORE UPDATE OR DELETE ON rfq_revisions
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();
CREATE TRIGGER quote_revisions_immutable BEFORE UPDATE OR DELETE ON quote_revisions
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();
CREATE TRIGGER quote_lines_immutable BEFORE UPDATE OR DELETE ON quote_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Accepted terms (F-RFQ-04): immutable, one per RFQ, produced from one quote
-- revision of a quote that belongs to that RFQ.
CREATE TABLE accepted_terms_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id uuid NOT NULL REFERENCES rfqs (id) ON DELETE RESTRICT,
    quote_id uuid NOT NULL,
    quote_revision_id uuid NOT NULL,
    immutable_terms jsonb NOT NULL CHECK (jsonb_typeof(immutable_terms) = 'object'),
    accepted_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    accepted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accepted_terms_one_per_rfq_key UNIQUE (rfq_id),
    CONSTRAINT accepted_terms_quote_key UNIQUE (quote_id),
    CONSTRAINT accepted_terms_quote_rfq_fk FOREIGN KEY (rfq_id, quote_id)
        REFERENCES quotes (rfq_id, id) ON DELETE RESTRICT,
    CONSTRAINT accepted_terms_revision_fk FOREIGN KEY (quote_id, quote_revision_id)
        REFERENCES quote_revisions (quote_id, id) ON DELETE RESTRICT
);

CREATE TRIGGER accepted_terms_snapshots_immutable BEFORE UPDATE OR DELETE ON accepted_terms_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
CREATE TABLE booking_series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    listing_id uuid NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
    recurrence_rule text NOT NULL CHECK (length(btrim(recurrence_rule)) > 0),
    time_zone text NOT NULL CHECK (length(btrim(time_zone)) > 0),
    state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'cancelled', 'completed')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX booking_series_customer_idx ON booking_series (customer_user_id);
CREATE INDEX booking_series_vendor_idx ON booking_series (vendor_id);

COMMENT ON TABLE booking_series IS
    'Cancelling one occurrence does not cancel the series unless the customer chooses (D-011). Occurrences are rows in bookings with the same series_id.';

CREATE TABLE bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    booking_mode text NOT NULL CHECK (booking_mode IN ('instant', 'scheduled')),
    series_id uuid REFERENCES booking_series (id) ON DELETE RESTRICT,
    occurrence_number integer CHECK (occurrence_number IS NULL OR occurrence_number > 0),
    accepted_terms_snapshot_id uuid REFERENCES accepted_terms_snapshots (id) ON DELETE RESTRICT,
    state text NOT NULL DEFAULT 'draft'
        CHECK (state IN ('draft', 'requested', 'confirmed', 'declined', 'expired',
                         'in_progress', 'completed_awaiting', 'closed', 'cancelled')),
    requested_terms jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(requested_terms) = 'object'),
    slot_start timestamptz,
    slot_end timestamptz,
    time_zone text,
    response_due_at timestamptz,
    capacity_id uuid REFERENCES availability_capacity (id) ON DELETE RESTRICT,
    idempotency_key text CHECK (idempotency_key IS NULL OR length(btrim(idempotency_key)) > 0),
    decline_reason text,
    cancelled_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    cancellation_reason text,
    cancelled_at timestamptz,
    completed_at timestamptz,
    confirmation_due_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_listing_vendor_fk FOREIGN KEY (listing_id, vendor_id)
        REFERENCES listings (id, vendor_id) ON DELETE RESTRICT,
    CONSTRAINT bookings_slot_check CHECK (slot_end IS NULL OR slot_start IS NULL OR slot_end > slot_start),
    CONSTRAINT bookings_slot_timezone_check CHECK (slot_start IS NULL OR time_zone IS NOT NULL),
    CONSTRAINT bookings_series_check CHECK ((series_id IS NULL) = (occurrence_number IS NULL)),
    CONSTRAINT bookings_cancel_check CHECK (
        state <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancelled_by_user_id IS NOT NULL)
    ),
    CONSTRAINT bookings_completion_check CHECK (
        state NOT IN ('completed_awaiting', 'closed') OR completed_at IS NOT NULL
    ),
    CONSTRAINT bookings_closed_check CHECK (state <> 'closed' OR closed_at IS NOT NULL)
);

-- Retried / double-tapped create requests produce one booking (F-BKG-08).
CREATE UNIQUE INDEX bookings_idempotency_key ON bookings (customer_user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX bookings_series_occurrence_key ON bookings (series_id, occurrence_number)
    WHERE series_id IS NOT NULL;
CREATE INDEX bookings_customer_idx ON bookings (customer_user_id, created_at DESC);
CREATE INDEX bookings_vendor_state_idx ON bookings (vendor_id, state, created_at DESC);
CREATE INDEX bookings_response_due_idx ON bookings (response_due_at) WHERE state = 'requested';
CREATE INDEX bookings_confirmation_due_idx ON bookings (confirmation_due_at) WHERE state = 'completed_awaiting';
CREATE INDEX bookings_listing_slot_idx ON bookings (listing_id, slot_start);
CREATE INDEX bookings_capacity_idx ON bookings (capacity_id) WHERE capacity_id IS NOT NULL;
CREATE INDEX bookings_snapshot_idx ON bookings (accepted_terms_snapshot_id) WHERE accepted_terms_snapshot_id IS NOT NULL;

-- Declined, expired, closed and cancelled bookings are final (F-BKG-01).
CREATE FUNCTION enforce_booking_final_states() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.state IN ('declined', 'expired', 'closed', 'cancelled') AND NEW.state <> OLD.state THEN
        RAISE EXCEPTION 'booking % is % and cannot move to %', OLD.id, OLD.state, NEW.state
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_final_states BEFORE UPDATE OF state ON bookings
    FOR EACH ROW EXECUTE FUNCTION enforce_booking_final_states();

CREATE TABLE booking_terms_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE RESTRICT,
    category_id uuid NOT NULL,
    category_config_version integer NOT NULL,
    terms jsonb NOT NULL CHECK (jsonb_typeof(terms) = 'object'),
    policy_snapshot jsonb NOT NULL CHECK (jsonb_typeof(policy_snapshot) = 'object'),
    captured_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_terms_snapshots_version_fk FOREIGN KEY (category_id, category_config_version)
        REFERENCES category_config_versions (category_id, version_number) ON DELETE RESTRICT
);

CREATE TRIGGER booking_terms_snapshots_immutable BEFORE UPDATE OR DELETE ON booking_terms_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

CREATE TABLE booking_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
    actor_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    actor_service text,
    event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
    from_state text,
    to_state text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_events_actor_check CHECK (actor_user_id IS NOT NULL OR actor_service IS NOT NULL)
);

CREATE INDEX booking_events_booking_idx ON booking_events (booking_id, occurred_at);

CREATE TRIGGER booking_events_immutable BEFORE UPDATE OR DELETE ON booking_events
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Original terms stay in force until the vendor accepts (F-BKG-04).
CREATE TABLE booking_modifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
    proposed_terms jsonb NOT NULL CHECK (jsonb_typeof(proposed_terms) = 'object'),
    state text NOT NULL DEFAULT 'proposed' CHECK (state IN ('proposed', 'accepted', 'declined', 'withdrawn')),
    created_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    decided_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_modifications_decision_check CHECK (
        (state = 'proposed' AND decided_at IS NULL)
        OR (state <> 'proposed' AND decided_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX booking_modifications_one_open_key ON booking_modifications (booking_id)
    WHERE state = 'proposed';

-- ---------------------------------------------------------------------------
-- Work orders and purchase orders (F-RFQ-04, F-GDS-03, F-GDS-04, F-GDS-06)
-- ---------------------------------------------------------------------------
CREATE TABLE work_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accepted_terms_snapshot_id uuid NOT NULL UNIQUE REFERENCES accepted_terms_snapshots (id) ON DELETE RESTRICT,
    customer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    state text NOT NULL DEFAULT 'created'
        CHECK (state IN ('created', 'in_progress', 'completed_awaiting', 'closed', 'cancelled')),
    scope jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scope) = 'object'),
    completed_at timestamptz,
    confirmation_due_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT work_orders_completion_check CHECK (
        state NOT IN ('completed_awaiting', 'closed') OR completed_at IS NOT NULL
    )
);

CREATE INDEX work_orders_customer_idx ON work_orders (customer_user_id, created_at DESC);
CREATE INDEX work_orders_vendor_idx ON work_orders (vendor_id, state);
CREATE INDEX work_orders_confirmation_due_idx ON work_orders (confirmation_due_at) WHERE state = 'completed_awaiting';

-- No cart, no inventory checkout, no platform-handled payment (D-003).
CREATE TABLE purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accepted_terms_snapshot_id uuid NOT NULL UNIQUE REFERENCES accepted_terms_snapshots (id) ON DELETE RESTRICT,
    buyer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    buyer_vendor_id uuid REFERENCES vendors (id) ON DELETE RESTRICT,
    supplier_vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    state text NOT NULL DEFAULT 'created'
        CHECK (state IN ('created', 'accepted', 'rejected', 'processing', 'shipped',
                         'delivered', 'completed', 'cancelled', 'delivery_exception')),
    terms_snapshot jsonb NOT NULL CHECK (jsonb_typeof(terms_snapshot) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_orders_distinct_parties_check
        CHECK (buyer_vendor_id IS NULL OR buyer_vendor_id <> supplier_vendor_id)
);

CREATE INDEX purchase_orders_buyer_idx ON purchase_orders (buyer_user_id, created_at DESC);
CREATE INDEX purchase_orders_supplier_idx ON purchase_orders (supplier_vendor_id, state);

COMMENT ON COLUMN purchase_orders.buyer_vendor_id IS
    'Set when a vendor buys as a customer (F-BIZ-05).';
COMMENT ON COLUMN purchase_orders.state IS
    '"payment failed" is intentionally absent: its meaning in Phase 1 is open (O-06).';

CREATE TABLE po_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
    line_number integer NOT NULL CHECK (line_number > 0),
    catalog_item_id uuid REFERENCES catalog_items (id) ON DELETE RESTRICT,
    description text NOT NULL CHECK (length(btrim(description)) > 0),
    quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
    unit text,
    unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    agreed_terms jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(agreed_terms) = 'object'),
    CONSTRAINT po_lines_order_line_key UNIQUE (purchase_order_id, line_number)
);

CREATE TABLE po_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
    actor_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    actor_service text,
    event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
    from_state text,
    to_state text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT po_events_actor_check CHECK (actor_user_id IS NOT NULL OR actor_service IS NOT NULL)
);

CREATE INDEX po_events_order_idx ON po_events (purchase_order_id, occurred_at);

CREATE TRIGGER po_events_immutable BEFORE UPDATE OR DELETE ON po_events
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

CREATE TABLE shipments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_transit', 'delivered', 'exception')),
    delivery_region text,
    carrier text,
    tracking_reference text,
    shipped_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shipments_dates_check CHECK (delivered_at IS NULL OR shipped_at IS NULL OR delivered_at >= shipped_at)
);

CREATE INDEX shipments_order_idx ON shipments (purchase_order_id);

-- Dispute outcomes between the parties (F-GDS-06). Linked to a support case.
CREATE TABLE po_disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
    support_case_id uuid NOT NULL UNIQUE REFERENCES support_cases (id) ON DELETE RESTRICT,
    outcome text CHECK (outcome IS NULL OR outcome IN ('replace', 'credit_note', 'partial_refund', 'close')),
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT po_disputes_resolution_check CHECK ((outcome IS NULL) = (resolved_at IS NULL))
);

CREATE INDEX po_disputes_order_idx ON po_disputes (purchase_order_id);

COMMENT ON COLUMN po_disputes.outcome IS
    '"partial_refund" is settled between the parties; the platform moves no funds (D-002, D-003).';

-- ---------------------------------------------------------------------------
-- Contracts (F-CON-01, F-CON-02)
-- ---------------------------------------------------------------------------
CREATE TABLE contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accepted_terms_snapshot_id uuid UNIQUE REFERENCES accepted_terms_snapshots (id) ON DELETE RESTRICT,
    customer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    category_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
    proposer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
    state text NOT NULL DEFAULT 'draft'
        CHECK (state IN ('draft', 'proposed', 'negotiating', 'declined', 'active', 'completed', 'closed')),
    activated_at timestamptz,
    completed_at timestamptz,
    confirmation_due_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contracts_active_check CHECK (state NOT IN ('active', 'completed', 'closed') OR activated_at IS NOT NULL)
);

CREATE INDEX contracts_customer_idx ON contracts (customer_user_id, created_at DESC);
CREATE INDEX contracts_vendor_idx ON contracts (vendor_id, state);
CREATE INDEX contracts_confirmation_due_idx ON contracts (confirmation_due_at) WHERE state = 'completed';

COMMENT ON COLUMN contracts.state IS
    'Suspended and expired are OPEN (O-08); terminated/renewal/amendment are Phase 2 (D-004). Widen the CHECK in a later migration once decided.';

CREATE TABLE contract_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES contracts (id) ON DELETE RESTRICT,
    version_number integer NOT NULL CHECK (version_number > 0),
    proposed_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    scope jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scope) = 'object'),
    schedule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(schedule) = 'object'),
    price_schedule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(price_schedule) = 'object'),
    term jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(term) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contract_versions_number_key UNIQUE (contract_id, version_number),
    CONSTRAINT contract_versions_contract_id_id_key UNIQUE (contract_id, id)
);

ALTER TABLE contracts
    ADD CONSTRAINT contracts_current_version_fk
    FOREIGN KEY (id, current_version) REFERENCES contract_versions (contract_id, version_number)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER contract_versions_immutable BEFORE UPDATE OR DELETE ON contract_versions
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Each party accepts one version; only the latest can be accepted (F-CON-01).
CREATE TABLE contract_acceptances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    contract_version_id uuid NOT NULL,
    party_role text NOT NULL CHECK (party_role IN ('customer', 'vendor')),
    accepting_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    accepted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contract_acceptances_version_fk FOREIGN KEY (contract_id, contract_version_id)
        REFERENCES contract_versions (contract_id, id) ON DELETE RESTRICT,
    CONSTRAINT contract_acceptances_party_key UNIQUE (contract_version_id, party_role)
);

CREATE INDEX contract_acceptances_contract_idx ON contract_acceptances (contract_id);

CREATE FUNCTION enforce_latest_contract_version() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_latest integer;
    v_number integer;
BEGIN
    SELECT current_version INTO v_latest FROM contracts WHERE id = NEW.contract_id;
    SELECT version_number INTO v_number FROM contract_versions WHERE id = NEW.contract_version_id;
    IF v_number IS DISTINCT FROM v_latest THEN
        RAISE EXCEPTION 'contract % version % is superseded; only version % can be accepted',
            NEW.contract_id, v_number, v_latest
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER contract_acceptances_latest_only BEFORE INSERT ON contract_acceptances
    FOR EACH ROW EXECUTE FUNCTION enforce_latest_contract_version();
CREATE TRIGGER contract_acceptances_immutable BEFORE UPDATE OR DELETE ON contract_acceptances
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Milestone completion follows the section 8.7 rule: the vendor marks complete,
-- the customer confirms or reports within 7 days, silence closes it.
CREATE TABLE milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES contracts (id) ON DELETE RESTRICT,
    sequence_number integer NOT NULL CHECK (sequence_number > 0),
    title text NOT NULL CHECK (length(btrim(title)) > 0),
    terms jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(terms) = 'object'),
    amount_minor bigint CHECK (amount_minor IS NULL OR amount_minor >= 0),
    currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    state text NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending', 'in_progress', 'completed_awaiting', 'closed', 'disputed')),
    due_at timestamptz,
    completed_at timestamptz,
    confirmation_due_at timestamptz,
    closed_at timestamptz,
    support_case_id uuid REFERENCES support_cases (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT milestones_contract_sequence_key UNIQUE (contract_id, sequence_number),
    CONSTRAINT milestones_amount_currency_check CHECK (amount_minor IS NULL OR currency IS NOT NULL),
    CONSTRAINT milestones_completion_check CHECK (
        state NOT IN ('completed_awaiting', 'closed') OR completed_at IS NOT NULL
    ),
    CONSTRAINT milestones_dispute_check CHECK (state <> 'disputed' OR support_case_id IS NOT NULL)
);

CREATE INDEX milestones_confirmation_due_idx ON milestones (confirmation_due_at) WHERE state = 'completed_awaiting';
CREATE INDEX milestones_case_idx ON milestones (support_case_id) WHERE support_case_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Payment records, Mode A (direct) and Mode B (invoice / offline terms).
-- Records only: the platform never initiates, holds, settles or refunds funds
-- (D-002). No card or bank credentials belong in this table (PRS 14.1).
-- ---------------------------------------------------------------------------
CREATE TABLE payment_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mode text NOT NULL CHECK (mode IN ('A', 'B')),
    accepted_terms_snapshot_id uuid REFERENCES accepted_terms_snapshots (id) ON DELETE RESTRICT,
    booking_id uuid REFERENCES bookings (id) ON DELETE RESTRICT,
    purchase_order_id uuid REFERENCES purchase_orders (id) ON DELETE RESTRICT,
    contract_id uuid REFERENCES contracts (id) ON DELETE RESTRICT,
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status text NOT NULL CHECK (length(btrim(status)) > 0),
    external_reference text,
    terms_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(terms_snapshot) = 'object'),
    recorded_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payment_records_single_parent_check CHECK (
        num_nonnulls(accepted_terms_snapshot_id, booking_id, purchase_order_id, contract_id) = 1
    )
);

CREATE INDEX payment_records_booking_idx ON payment_records (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX payment_records_po_idx ON payment_records (purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX payment_records_contract_idx ON payment_records (contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX payment_records_snapshot_idx ON payment_records (accepted_terms_snapshot_id)
    WHERE accepted_terms_snapshot_id IS NOT NULL;

COMMENT ON COLUMN payment_records.status IS
    'Mode A: informational note only ("vendor marked payment received"). Mode B: invoice/offline-terms status. Vocabulary not yet decided, so not enumerated.';

CREATE TRIGGER rfqs_set_updated_at BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER quotes_set_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER booking_series_set_updated_at BEFORE UPDATE ON booking_series FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER work_orders_set_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER purchase_orders_set_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER shipments_set_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER milestones_set_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_records_set_updated_at BEFORE UPDATE ON payment_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

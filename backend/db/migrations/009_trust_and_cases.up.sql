-- Reports, support cases, appeals and holds (F-TRU-03 to F-TRU-05).
-- One vocabulary: "Cases". Severity levels, SLAs and case states are CFG-06 /
-- CFG-11 (open), so those columns are non-empty text, not enumerations.
BEGIN;

CREATE TABLE reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    target_type text NOT NULL CHECK (length(btrim(target_type)) > 0),
    target_id text NOT NULL CHECK (length(btrim(target_id)) > 0),
    reason text NOT NULL CHECK (length(btrim(reason)) > 0),
    details text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX reports_target_idx ON reports (target_type, target_id);
CREATE INDEX reports_reporter_idx ON reports (reporter_user_id, created_at DESC);

CREATE TABLE support_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid UNIQUE REFERENCES reports (id) ON DELETE RESTRICT,
    opened_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    transaction_type text,
    transaction_id uuid,
    subject text NOT NULL CHECK (length(btrim(subject)) > 0),
    severity text NOT NULL CHECK (length(btrim(severity)) > 0),
    state text NOT NULL DEFAULT 'open' CHECK (length(btrim(state)) > 0),
    assigned_staff_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    sla_due_at timestamptz,
    resolution text,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_cases_transaction_link_check
        CHECK ((transaction_type IS NULL) = (transaction_id IS NULL)),
    CONSTRAINT support_cases_resolution_check
        CHECK ((resolved_at IS NULL) OR (resolution IS NOT NULL AND length(btrim(resolution)) > 0))
);

CREATE INDEX support_cases_queue_idx ON support_cases (sla_due_at NULLS LAST, created_at)
    WHERE resolved_at IS NULL;
CREATE INDEX support_cases_assignee_idx ON support_cases (assigned_staff_user_id)
    WHERE assigned_staff_user_id IS NOT NULL AND resolved_at IS NULL;
CREATE INDEX support_cases_transaction_idx ON support_cases (transaction_type, transaction_id)
    WHERE transaction_id IS NOT NULL;
CREATE INDEX support_cases_opened_by_idx ON support_cases (opened_by_user_id);

COMMENT ON COLUMN support_cases.transaction_type IS
    'Polymorphic link to the booking/rfq/purchase_order/contract/milestone the case is about. No FK: the table depends on which module owns the record.';

CREATE TABLE case_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES support_cases (id) ON DELETE RESTRICT,
    file_id uuid NOT NULL REFERENCES files (id) ON DELETE RESTRICT,
    submitted_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT case_evidence_file_key UNIQUE (case_id, file_id)
);

-- Every staff action on a case, with reason. Append-only (PRS 12.3, audit).
CREATE TABLE case_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES support_cases (id) ON DELETE RESTRICT,
    actor_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    action text NOT NULL CHECK (length(btrim(action)) > 0),
    reason text,
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX case_actions_case_idx ON case_actions (case_id, occurred_at);

CREATE TRIGGER case_actions_immutable
    BEFORE UPDATE OR DELETE ON case_actions
    FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- Appeals go to a human reviewer other than the original decision maker
-- (F-TRU-04, SC-038).
CREATE TABLE appeals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES support_cases (id) ON DELETE RESTRICT,
    appellant_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    reviewer_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'decided')),
    outcome text,
    reason text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at timestamptz,
    CONSTRAINT appeals_decision_check CHECK (
        status = 'submitted'
        OR (reviewer_user_id IS NOT NULL AND decided_at IS NOT NULL
            AND outcome IS NOT NULL AND length(btrim(outcome)) > 0
            AND reason IS NOT NULL AND length(btrim(reason)) > 0)
    ),
    CONSTRAINT appeals_no_self_review_check
        CHECK (reviewer_user_id IS NULL OR reviewer_user_id <> appellant_user_id)
);

CREATE INDEX appeals_queue_idx ON appeals (created_at) WHERE status = 'submitted';
CREATE INDEX appeals_case_idx ON appeals (case_id);

-- Holds and restrictions (F-TRU-05). The "no holds" publication gate reads
-- active rows (released_at IS NULL). Emergency restrictions require a
-- post-action review.
CREATE TABLE account_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type text NOT NULL CHECK (target_type IN ('user', 'vendor', 'listing')),
    target_id uuid NOT NULL,
    hold_type text NOT NULL CHECK (length(btrim(hold_type)) > 0),
    is_emergency boolean NOT NULL DEFAULT false,
    reason text NOT NULL CHECK (length(btrim(reason)) > 0),
    placed_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    case_id uuid REFERENCES support_cases (id) ON DELETE RESTRICT,
    placed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at timestamptz,
    released_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    release_reason text,
    reviewed_at timestamptz,
    reviewed_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT account_holds_release_check CHECK (
        (released_at IS NULL AND released_by_user_id IS NULL AND release_reason IS NULL)
        OR (released_at IS NOT NULL AND released_by_user_id IS NOT NULL
            AND release_reason IS NOT NULL AND length(btrim(release_reason)) > 0)
    ),
    CONSTRAINT account_holds_review_check CHECK ((reviewed_at IS NULL) = (reviewed_by_user_id IS NULL))
);

CREATE INDEX account_holds_active_idx ON account_holds (target_type, target_id) WHERE released_at IS NULL;
CREATE INDEX account_holds_review_due_idx ON account_holds (placed_at)
    WHERE is_emergency AND reviewed_at IS NULL;

COMMENT ON COLUMN account_holds.target_id IS
    'users.id, vendors.id or listings.id depending on target_type (checked by the service; polymorphic).';

CREATE TRIGGER support_cases_set_updated_at BEFORE UPDATE ON support_cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Engagement: favourites, linked messaging, reviews and trust metrics,
-- notifications (F-DSC-07, F-MSG-01/02/04/05, F-TRU-01/02, F-ACC-07).
--
-- Not modelled (OPEN under O-09): chat attachments / scanning / read receipts
-- (F-MSG-03), saved searches and alerts (F-DSC-08), automated content screening
-- (F-TRU-07). Compare-up-to-three is client state and has no table.
BEGIN;

CREATE TABLE favorites (
    customer_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_user_id, vendor_id)
);

CREATE INDEX favorites_vendor_idx ON favorites (vendor_id);

-- ---------------------------------------------------------------------------
-- Messaging: conversations are linked to a booking / RFQ / order and visible to
-- participants only (PRS 10.1).
-- ---------------------------------------------------------------------------
CREATE TABLE conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed')),
    last_message_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE RESTRICT,
    linked_resource_type text NOT NULL CHECK (length(btrim(linked_resource_type)) > 0),
    linked_resource_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conversation_links_resource_key UNIQUE (linked_resource_type, linked_resource_id, conversation_id)
);

CREATE INDEX conversation_links_conversation_idx ON conversation_links (conversation_id);
CREATE INDEX conversation_links_resource_idx ON conversation_links (linked_resource_type, linked_resource_id);

CREATE TABLE conversation_participants (
    conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    joined_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at timestamptz,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX conversation_participants_user_idx ON conversation_participants (user_id) WHERE left_at IS NULL;

CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    sender_user_id uuid NOT NULL,
    body text NOT NULL CHECK (length(btrim(body)) > 0),
    contact_filtered boolean NOT NULL DEFAULT false,
    sent_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- only participants can send
    CONSTRAINT messages_sender_participant_fk FOREIGN KEY (conversation_id, sender_user_id)
        REFERENCES conversation_participants (conversation_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, sent_at, id);
CREATE INDEX messages_sender_idx ON messages (sender_user_id);

COMMENT ON COLUMN messages.contact_filtered IS
    'Set when the privacy filter masked a phone number / email in body (F-MSG-01). Text only: attachments are OPEN (O-09).';

CREATE TABLE contact_share_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    scope text NOT NULL CHECK (scope IN ('phone', 'email', 'phone_and_email')),
    granted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at timestamptz,
    CONSTRAINT contact_share_consents_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE UNIQUE INDEX contact_share_consents_active_key
    ON contact_share_consents (conversation_id, user_id, scope) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- Reviews: eligible transactions only (F-TRU-01). transaction_type/id is a
-- polymorphic reference checked by the service against the module that owns the
-- record; the unique key stops duplicate reviews.
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    vendor_id uuid NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
    transaction_type text NOT NULL
        CHECK (transaction_type IN ('booking', 'work_order', 'purchase_order', 'contract_milestone')),
    transaction_id uuid NOT NULL,
    overall_rating smallint NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    comment text,
    vendor_response text,
    vendor_responded_at timestamptz,
    moderation_state text NOT NULL DEFAULT 'published' CHECK (length(btrim(moderation_state)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_one_per_transaction_key UNIQUE (author_user_id, transaction_type, transaction_id),
    CONSTRAINT reviews_response_check CHECK ((vendor_response IS NULL) = (vendor_responded_at IS NULL))
);

CREATE INDEX reviews_vendor_idx ON reviews (vendor_id, created_at DESC);
CREATE INDEX reviews_moderation_idx ON reviews (created_at) WHERE moderation_state <> 'published';

COMMENT ON COLUMN reviews.moderation_state IS
    'Moderation vocabulary is CFG-11 (open); the default "published" is the only value the schema assumes.';

CREATE TABLE review_ratings (
    review_id uuid NOT NULL REFERENCES reviews (id) ON DELETE RESTRICT,
    dimension text NOT NULL CHECK (length(btrim(dimension)) > 0),
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (review_id, dimension)
);

-- Platform-computed trust fields (F-TRU-02, F-VND-09). Vendors cannot edit
-- them: grant write access to the trust worker role only. "No reviews yet" is
-- neutral: rating_average stays NULL and rating_count 0.
CREATE TABLE vendor_trust_metrics (
    vendor_id uuid PRIMARY KEY REFERENCES vendors (id) ON DELETE RESTRICT,
    rating_average numeric(3, 2) CHECK (rating_average IS NULL OR rating_average BETWEEN 1 AND 5),
    rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    response_rate numeric(5, 4) CHECK (response_rate IS NULL OR response_rate BETWEEN 0 AND 1),
    completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
    badges jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(badges) = 'array'),
    computed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_trust_metrics_rating_check CHECK ((rating_count = 0) = (rating_average IS NULL))
);

-- ---------------------------------------------------------------------------
-- Notifications (F-MSG-04, F-MSG-05)
-- ---------------------------------------------------------------------------
CREATE TABLE notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
    channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'in_app')),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    localized_content jsonb NOT NULL CHECK (jsonb_typeof(localized_content) = 'object'),
    is_mandatory boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    provider_template_id text,
    created_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_templates_version_key UNIQUE (event_type, channel, version)
);

COMMENT ON COLUMN notification_templates.is_mandatory IS
    'Mandatory transactional notices cannot be switched off by user preferences (F-ACC-07). Copy and channel requirements are CFG-10 (open).';
COMMENT ON COLUMN notification_templates.provider_template_id IS
    'Registered SMS template id for India (CFG-10).';

CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    template_id uuid REFERENCES notification_templates (id) ON DELETE RESTRICT,
    event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
    category text NOT NULL CHECK (length(btrim(category)) > 0),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
    linked_resource_type text,
    linked_resource_id uuid,
    dedupe_key text NOT NULL CHECK (length(btrim(dedupe_key)) > 0),
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_link_check CHECK ((linked_resource_type IS NULL) = (linked_resource_id IS NULL)),
    -- the same logical event is never delivered twice (PRS 14)
    CONSTRAINT notifications_dedupe_key UNIQUE (recipient_user_id, dedupe_key)
);

CREATE INDEX notifications_inbox_idx ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (recipient_user_id) WHERE read_at IS NULL;

CREATE TABLE notification_delivery_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid NOT NULL REFERENCES notifications (id) ON DELETE RESTRICT,
    channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'in_app')),
    idempotency_key text NOT NULL UNIQUE CHECK (length(btrim(idempotency_key)) > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    provider_reference text,
    error text,
    attempted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX notification_delivery_attempts_notification_idx ON notification_delivery_attempts (notification_id);
CREATE INDEX notification_delivery_attempts_retry_idx ON notification_delivery_attempts (created_at)
    WHERE status IN ('pending', 'failed');

CREATE TABLE notification_preferences (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'in_app')),
    category text NOT NULL CHECK (length(btrim(category)) > 0),
    enabled boolean NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, channel, category)
);

CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notification_preferences_set_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

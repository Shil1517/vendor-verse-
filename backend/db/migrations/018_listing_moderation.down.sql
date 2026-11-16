BEGIN;

DROP TABLE vendor_profile_image_reviews;

DELETE FROM role_permissions WHERE permission_code = 'listing.review';
DELETE FROM permissions WHERE code = 'listing.review';

ALTER TABLE duplicate_flags
    DROP CONSTRAINT duplicate_flags_review_reason_check,
    DROP COLUMN review_reason;

COMMIT;

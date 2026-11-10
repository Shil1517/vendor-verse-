-- Verification review is limited to the Super Admin until other reviewer
-- roles and their separation-of-duties rules are explicitly decided.
INSERT INTO permissions (code, description) VALUES
    ('verification.review', 'Review vendor verification submissions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'verification.review')
ON CONFLICT (role_code, permission_code) DO NOTHING;

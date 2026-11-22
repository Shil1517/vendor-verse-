INSERT INTO permissions (code, description) VALUES
    ('cases.manage', 'Triage reports, manage support cases, and decide appeals')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'cases.manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

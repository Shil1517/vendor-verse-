INSERT INTO permissions (code, description) VALUES
    ('sponsored.review', 'Review sponsored campaigns and stop their delivery')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'sponsored.review')
ON CONFLICT (role_code, permission_code) DO NOTHING;

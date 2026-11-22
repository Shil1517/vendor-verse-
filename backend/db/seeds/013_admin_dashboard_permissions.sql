INSERT INTO permissions (code, description) VALUES
    ('admin.dashboard', 'Read operational queue counts on the admin dashboard')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'admin.dashboard')
ON CONFLICT (role_code, permission_code) DO NOTHING;

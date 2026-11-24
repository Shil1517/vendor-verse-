INSERT INTO permissions (code, description) VALUES
    ('plans.manage', 'Manage plan definitions and monitor vendor subscriptions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'plans.manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

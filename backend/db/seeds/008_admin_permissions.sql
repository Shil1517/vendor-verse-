INSERT INTO permissions (code, description) VALUES
    ('audit.read', 'Read the append-only platform audit log'),
    ('admin.configure', 'Read and decide the configuration register and platform settings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'audit.read'),
    ('SUPER_ADMIN', 'admin.configure')
ON CONFLICT (role_code, permission_code) DO NOTHING;

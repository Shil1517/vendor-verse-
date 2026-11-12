-- Managing the vendor role catalogue is limited to the Super Admin until other
-- roles are decided. Reviewing a vendor's role reuses verification.review (D-020).
INSERT INTO permissions (code, description) VALUES
    ('vendor_roles.manage', 'Create, edit and retire vendor role definitions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'vendor_roles.manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

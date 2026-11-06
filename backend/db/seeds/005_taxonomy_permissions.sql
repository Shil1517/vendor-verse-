-- Admin taxonomy builder (F-TAX-02): Super Admin only. Idempotent.
INSERT INTO permissions (code, description) VALUES
    ('taxonomy.manage', 'Create, edit, reorder, merge and retire categories and subcategories')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'taxonomy.manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

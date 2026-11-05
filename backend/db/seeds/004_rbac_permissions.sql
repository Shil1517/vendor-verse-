-- Permission catalogue for the admin APIs (F-ADM-04). Idempotent: safe to re-run.
-- Deny by default: a role has only the permissions granted here.
-- CUSTOMER and VENDOR hold none; their access is ownership-based, never a role permission.
-- SALES_AGENT holds none yet: agent permissions are decided with the agents module.
-- Each admin module adds its own permission rows here when it ships.
INSERT INTO permissions (code, description) VALUES
    ('rbac.read', 'View roles, their permissions and any user''s role assignments'),
    ('rbac.manage', 'Grant and revoke roles (reason required, audited)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SUPER_ADMIN', 'rbac.read'),
    ('SUPER_ADMIN', 'rbac.manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

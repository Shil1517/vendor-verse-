BEGIN;
INSERT INTO permissions (code, description) VALUES
  ('invoices.read', 'Read subscription invoices for billing investigation')
ON CONFLICT (code) DO NOTHING;
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('SUPER_ADMIN', 'invoices.read')
ON CONFLICT DO NOTHING;
COMMIT;

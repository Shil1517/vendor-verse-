INSERT INTO permissions (code, description) VALUES
    ('agent.leads', 'Manage own assigned prospective vendor leads and activities'),
    ('agent.oversee', 'Read sales-agent pipeline for administrative oversight')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code) VALUES
    ('SALES_AGENT', 'agent.leads'),
    ('SUPER_ADMIN', 'agent.oversee')
ON CONFLICT (role_code, permission_code) DO NOTHING;

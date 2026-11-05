-- Phase 1 industries from F-TAX-05 (docs/01-feature-spec.md). Idempotent: safe to re-run.
-- IDs are fixed (uuid v5 of the name) so every environment shares them.
-- Categories are not seeded: they are created through the admin taxonomy builder (F-TAX-02).
INSERT INTO industries (id, name, phase, sort_order) VALUES
    ('16af86dd-926e-5ad0-a610-8645a78fd165', 'Home and household', 'P1', 1),
    ('cffd1073-f6d3-5a68-bd3c-096bb5f9de93', 'Construction', 'P1', 2),
    ('45bfd247-b012-58dc-a970-ac651c9c8272', 'Events', 'P1', 3),
    ('8245c0a0-6cfb-5011-b5a0-5b22e6e8ec30', 'Professional', 'P1', 4),
    ('f2ad290a-2cdf-5ac0-b13c-f298a2bd7200', 'IT and digital', 'P1', 5),
    ('6b2521cd-7457-5dec-adc4-6d2589711044', 'Wholesale and distribution', 'P1', 6),
    ('555f64e6-55df-5e53-ab89-565d043d21e6', 'Logistics', 'P1', 7),
    ('059adda2-eff0-52f6-bc38-048a619f14bb', 'Automotive', 'P1', 8),
    ('89e7f540-a554-52d6-a38c-cc1d3e04fe66', 'Health/education/wellness', 'P1', 9),
    ('1d93cf7d-1905-5492-bc66-66371e66c7db', 'Agriculture/energy/environment', 'P1', 10)
ON CONFLICT (id) DO NOTHING;

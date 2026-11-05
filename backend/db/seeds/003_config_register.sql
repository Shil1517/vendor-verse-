-- Open configuration register CFG-01 to CFG-19 (F-ADM-08), copied from PRS v3.0 section 23.
-- All items start 'open'. Idempotent: existing rows (and any recorded decision) are left untouched.
INSERT INTO config_register_items (code, title, owner, required_decision) VALUES
    ('CFG-01', 'Subscription plans/pricing', 'Business', 'Business: plan names, price, billing cadence, taxes, trial policy and entitlements.'),
    ('CFG-02', 'Numerical listing/lead limits', 'Business/Product', 'Business/Product: exact caps and how each counted event is defined.'),
    ('CFG-03', 'Category workflow matrix', 'Product/Operations', 'Product/Operations: booking vs RFQ vs both, required fields, availability model and response deadlines.'),
    ('CFG-04', 'Cancellation/no-show policy', 'Business/Legal', 'Business/Legal: baseline and category exceptions; disclose before request.'),
    ('CFG-05', 'Verification matrix', 'Trust/Legal/Operations', 'Trust/Legal/Operations: required documents/licences by category, reviewer evidence and expiry handling.'),
    ('CFG-06', 'Support severity and SLAs', 'Operations', 'Operations: severity definitions, coverage hours, response targets and escalation owner.'),
    ('CFG-07', 'Providers', 'Engineering/Product', 'Engineering/Product: OTP/SMS, email/push, maps, billing, storage and malware scanning.'),
    ('CFG-08', 'Retention and deletion', 'Legal/Security', 'Legal/Security: retention periods, legal holds, deletion/anonymization exceptions.'),
    ('CFG-09', 'Performance/recovery targets', 'Engineering/Ops', 'Engineering/Ops: load profile, SLO, RTO/RPO and incident escalation.'),
    ('CFG-10', 'Notification copy', 'Product/Legal', 'Product/Legal: localized templates, required vs optional channels and consent wording.'),
    ('CFG-11', 'Moderation policy', 'Trust/Legal', 'Trust/Legal: prohibited content, severity thresholds, appeal timing and emergency actions.'),
    ('CFG-12', 'Brand clearance', 'Business', 'Business: trademark/domain clearance for VendorVerse before public launch.'),
    ('CFG-13', 'Launch Market Register', 'Business/Operations', 'Business/Operations: initial cities and categories, minimum supply per category and launch order.'),
    ('CFG-14', 'Country activation criteria', 'Business/Legal/Operations', 'Business/Legal/Operations: checklist, approvers, privacy and data-residency position and thresholds for opening a new country.'),
    ('CFG-15', 'Commission model', 'Business/Finance/Legal', 'Business/Finance/Legal: whether and where commission applies, rates, who pays, refund and reversal rules.'),
    ('CFG-16', 'Currencies, taxes and payment providers by country', 'Finance/Legal/Engineering', 'Finance/Legal/Engineering: supported currencies, tax registrations, invoicing rules and licensed providers.'),
    ('CFG-17', 'Contract templates and legal position', 'Legal', 'Legal: approved templates and clauses per country, platform role and e-acceptance requirements.'),
    ('CFG-18', 'Global verification matrix', 'Trust/Legal/Operations', 'Trust/Legal/Operations: evidence by country and category for levels L1 to L4, including screening duties.'),
    ('CFG-19', 'Supported languages and scripts', 'Product/Operations', 'Product/Operations: language list per wave, right-to-left scope and translation ownership.')
ON CONFLICT (code) DO NOTHING;

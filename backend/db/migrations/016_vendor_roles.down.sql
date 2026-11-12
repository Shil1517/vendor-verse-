-- Destructive rollback for a disposable database or an approved recovery plan.
-- Drops every vendor role and any role definition added after the original seven.
-- Vendors whose business_type is not one of the original seven fail the check and must be fixed first.
BEGIN;

DROP INDEX vendors_business_type_idx;
ALTER TABLE vendors DROP CONSTRAINT vendors_business_type_fkey;
ALTER TABLE vendors
    ADD CONSTRAINT vendors_business_type_check
        CHECK (business_type IN (
            'SERVICE_PROVIDER',
            'CONTRACTOR',
            'SUPPLIER',
            'WHOLESALER',
            'MANUFACTURER',
            'DISTRIBUTOR',
            'OTHER'
        ));

DROP TRIGGER vendor_roles_reviewer_not_owner ON vendor_roles;
DROP FUNCTION enforce_role_reviewer_not_vendor_owner();
DROP TABLE vendor_roles;
DROP TABLE vendor_role_definitions;

COMMIT;

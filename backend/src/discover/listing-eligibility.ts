/**
 * Public eligibility of a listing (F-VND-05, F-DSC-02): never stored, always
 * computed. `l` is listings, `v` vendors, `u` the vendor owner's users row and
 * `cfg` the category configuration version the listing is pinned to.
 *
 * Applied: account active, content approved, at least one verified vendor role,
 * a service area, required attributes present. The market being live is checked
 * separately because it depends on the searched market.
 *
 * NOT applied yet, because their modules are not built: the subscription gate,
 * the category verification gate and the no-holds gate (see
 * PublicationGatesService, which reports them as unknown). Until they land,
 * search treats them as met; wiring them in is one predicate each, here.
 */
export const LISTING_ELIGIBLE_SQL = `
  l.content_state = 'approved'
  AND u.account_status = 'active'
  AND EXISTS (
    SELECT 1 FROM vendor_roles AS vr
    WHERE vr.vendor_id = v.id AND vr.status = 'verified')
  AND EXISTS (
    SELECT 1 FROM service_areas AS sa
    WHERE sa.vendor_id = l.vendor_id
      AND (sa.listing_id = l.id OR sa.listing_id IS NULL))
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(cfg.configuration #> '{attributeSchema,required}') = 'array'
           THEN cfg.configuration #> '{attributeSchema,required}'
           ELSE '[]'::jsonb END) AS req(attribute_key)
    WHERE NOT EXISTS (
      SELECT 1 FROM listing_attributes AS a
      WHERE a.listing_id = l.id AND a.attribute_key = req.attribute_key))`;

/** The joins LISTING_ELIGIBLE_SQL needs. */
export const LISTING_ELIGIBLE_JOINS = `
  FROM listings AS l
  JOIN vendors AS v ON v.id = l.vendor_id
  JOIN users AS u ON u.id = v.owner_user_id
  JOIN category_config_versions AS cfg
    ON cfg.category_id = l.category_id
   AND cfg.version_number = l.config_version_number`;

/* Vendor roles (D-023, D-024). The single source of truth for vendor roles in the web mockup.
   Adding a new kind of vendor = adding one entry here (code, label, hint, offer: 'products' | 'services', docs).
   Codes match the backend role catalogue (GET /vendor-roles); in remote mode the backend list is used instead. */
export const VENDOR_ROLES = {
  SERVICE_PROVIDER: { label: 'Service provider', hint: 'Plumbers, caterers, consultants, agencies…', offer: 'services', docs: ['Government photo ID', 'Address proof', 'Category licence'] },
  CONTRACTOR: { label: 'Contractor', hint: 'Projects with crews, drawings and milestones', offer: 'services', docs: ['GST / business registration', 'Contractor licence', 'Insurance certificate'] },
  MANUFACTURER: { label: 'Manufacturer', hint: 'You make products — OEM, white-label, custom', offer: 'products', docs: ['Business & factory registration', 'Quality certificate (ISO / CE / BIS)', 'Factory photos / audit report'] },
  SUPPLIER: { label: 'Supplier / distributor', hint: 'You stock and sell products in bulk', offer: 'products', docs: ['GST / business registration', 'Brand authorisation letter', 'Warehouse proof'] },
  WHOLESALER: { label: 'Wholesaler', hint: 'You sell goods in bulk to businesses', offer: 'products', docs: [] },
  DISTRIBUTOR: { label: 'Distributor', hint: 'You distribute products across a territory', offer: 'products', docs: [] },
}

export const roleLabel = (code) => VENDOR_ROLES[code]?.label || code

/** The mockup catalogue, shaped like the backend's role definitions. */
export const mockRoleCatalogue = () => Object.entries(VENDOR_ROLES).map(([code, r]) => ({ code, label: r.label, offerType: r.offer, requiredDocuments: r.docs, isActive: true }))

/** A vendor's roles as [{ code, status }]. Seeded vendors have one verified role derived from their type. */
export const vendorRolesOf = (v) => {
  if (v?.roles) return v.roles
  const code = v?.businessType || (v?.vendorType === 'manufacturer_supplier' ? 'MANUFACTURER' : v?.supplierType === 'business' ? 'SUPPLIER' : 'SERVICE_PROVIDER')
  return [{ code, status: 'verified' }]
}

/** Only verified roles are shown publicly (D-020, D-021). */
export const publicRoleLabels = (v) => vendorRolesOf(v).filter((r) => r.status === 'verified').map((r) => roleLabel(r.code))

/** Documents for a set of roles, combined without duplicates (D-019). */
export const combinedDocs = (codes) => [...new Set(codes.flatMap((c) => VENDOR_ROLES[c]?.docs || []))]

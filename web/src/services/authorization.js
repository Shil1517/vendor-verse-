const ROLE_PERMISSIONS = {
  customer: new Set(['market:read', 'booking:create', 'rfq:create', 'review:create', 'support:create', 'profile:own']),
  vendor: new Set(['listing:own', 'booking:own', 'rfq:respond', 'review:respond', 'profile:own']),
  agent: new Set(['lead:assigned', 'onboarding:assist', 'commission:own']),
  admin: new Set(['market:read', 'vendor:review', 'listing:review', 'taxonomy:manage', 'user:manage', 'audit:read', 'support:manage', 'settings:manage']),
}

export function can(actor, permission) {
  return Boolean(actor?.loggedIn && ROLE_PERMISSIONS[actor.role]?.has(permission))
}

export function ownsVendor(actor, vendorId) {
  return actor?.role === 'vendor' && actor.vendorId === vendorId
}

export function ownsCustomerRecord(actor, record) {
  return actor?.role === 'customer' && Boolean(record) && record.customer === actor.name
}

export function canOpenRoute(actor, routeRole) {
  if (routeRole === 'auth') return true
  if (routeRole === 'customer') return actor?.role === 'customer' // buying is Customer mode only (D-022)
  if (routeRole === 'shared') return actor?.role === 'customer' || actor?.role === 'vendor' || actor?.role === 'business'
  if (routeRole === 'vendor') return actor?.role === 'vendor'
  return Boolean(actor?.loggedIn && actor.role === routeRole)
}

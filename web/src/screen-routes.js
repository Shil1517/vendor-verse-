const PRODUCT_PATHS = {
  c_home: '/', c_categories: '/categories', c_category: '/categories/:id', c_explore: '/search',
  c_listing: '/listings/:id', c_vendor: '/vendors/:id', c_location: '/location',
  c_location_wait: '/locations/:city/waitlist', c_saved: '/account/saved', c_activity: '/account/requests',
  c_rfq_new: '/requests/new', c_rfq: '/requests/:id', c_rfq_edit: '/requests/:id/edit',
  c_book_new: '/bookings/new', c_booking: '/bookings/:id', c_orders: '/account/orders',
  c_order: '/orders/:id', c_contract: '/customer/contract/:id', c_profile: '/account/profile', c_profile_edit: '/account/profile/edit',
  c_settings: '/account/settings', c_sessions: '/account/sessions', c_delete: '/account/delete',
  c_export: '/account/data-export', c_notif_prefs: '/account/notifications/preferences',
  login: '/login', register: '/signup', welcome: '/welcome', otp: '/verify',
  messages: '/messages', chat: '/messages/:id', notifications: '/notifications',
  v_dash: '/vendor/dashboard', v_listings: '/vendor/listings', v_listing_edit: '/vendor/listings/:id/edit',
  v_work: '/vendor/requests', v_orders: '/vendor/orders', v_profile: '/vendor/profile',
  v_reviews: '/vendor/reviews', v_verify: '/vendor/verification', v_register: '/vendor/signup',
  a_home: '/agent/dashboard', ad_dash: '/admin/dashboard', b_home: '/business/dashboard',
}

const PREFIXES = [['c_', 'customer'], ['v_', 'vendor'], ['vb_', 'buyer'], ['a_', 'agent'], ['ad_', 'admin'], ['b_', 'business']]
const kebab = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase()

export function pathForScreen(id, params = {}) {
  let pattern = PRODUCT_PATHS[id]
  if (!pattern) {
    const prefix = PREFIXES.find(([p]) => id.startsWith(p))
    const area = prefix?.[1]
    const name = prefix ? id.slice(prefix[0].length) : id
    pattern = `/${area ? `${area}/` : ''}${kebab(name)}`
  }
  const path = pattern.replace(/:(\w+)/g, (_, key) => encodeURIComponent(params[key] ?? 'demo'))
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!pattern.includes(`:${key}`) && value != null && typeof value !== 'object') query.set(key, String(value))
  }
  const search = query.toString()
  return `${path}${search ? `?${search}` : ''}`
}

export function screenForLocation(location, screens) {
  const hashId = location.hash.replace(/^#\/?/, '')
  if (screens[hashId]) return { id: hashId, params: screens[hashId].defaultParams || {} }
  const path = decodeURI(location.pathname || '/')
  const query = Object.fromEntries(new URLSearchParams(location.search))
  const entries = Object.keys(screens).map((id) => [id, PRODUCT_PATHS[id] || fallbackPattern(id)])
  for (const [id, pattern] of entries) {
    const keys = []
    const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, key) => { keys.push(key); return '([^/]+)' })}/?$`)
    const match = path.match(regex)
    if (!match) continue
    const params = { ...(screens[id].defaultParams || {}), ...query }
    keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]) })
    if (params.id && ['c_listing', 'v_listing_edit'].includes(id)) params.listingId = params.id
    return { id, params }
  }
  return { id: 'c_home', params: {} }
}

function fallbackPattern(id) {
  const prefix = PREFIXES.find(([p]) => id.startsWith(p))
  const name = prefix ? id.slice(prefix[0].length) : id
  return `/${prefix ? `${prefix[1]}/` : ''}${kebab(name)}`
}

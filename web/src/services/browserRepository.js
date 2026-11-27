const STORAGE_KEY = 'vendorverse.website.state.v3'

const clone = (value) => JSON.parse(JSON.stringify(value))

export function createSeedState(seed) {
  return clone(seed)
}

export function loadState(seed) {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return createSeedState(seed)
    const parsed = JSON.parse(saved)
    const savedRfqs = Array.isArray(parsed.rfqs) ? parsed.rfqs : []
    const savedRfqIds = new Set(savedRfqs.map((item) => item.id))
    const rfqs = [...savedRfqs, ...(seed.rfqs || []).filter((item) => !savedRfqIds.has(item.id))]
    const savedVendors = Array.isArray(parsed.vendors)
      ? parsed.vendors.filter((item) => !/^v-[a-z]+-\d{3}$/.test(String(item.id || '')))
      : []
    const savedVendorIds = new Set(savedVendors.map((item) => item.id))
    const vendors = [...savedVendors, ...(seed.vendors || []).filter((item) => !savedVendorIds.has(item.id))]
    return { ...createSeedState(seed), ...parsed, vendors, rfqs, settings: { ...seed.settings, ...parsed.settings }, threads: { ...seed.threads, ...parsed.threads }, notifs: { ...seed.notifs, ...parsed.notifs }, prefs: { ...seed.prefs, ...parsed.prefs } }
  } catch {
    return createSeedState(seed)
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private browsing. The live session remains usable.
  }
}

export function clearState() {
  try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* no-op */ }
}

export const waitForService = (value, delay = 120) => new Promise((resolve) => setTimeout(() => resolve(value), delay))

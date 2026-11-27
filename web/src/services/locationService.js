import { GEO, findCity, lookupPin } from '../geo.js'
import { authService } from './authService.js'

const COUNTRY_TZ = {
  IN: 'Asia/Kolkata',
  AE: 'Asia/Dubai',
  GB: 'Europe/London',
  US: 'America/New_York',
  DE: 'Europe/Berlin',
  CN: 'Asia/Shanghai',
  SG: 'Asia/Singapore',
  AU: 'Australia/Sydney',
  CA: 'America/Toronto',
}

const cleanDistrict = (value) => String(value || '')
  .replace(/\s+(district|division)$/i, '')
  .trim()

const countryEntry = (codeOrName) => {
  const raw = String(codeOrName || '').trim()
  if (!raw) return GEO[0]
  const upper = raw.toUpperCase()
  const lower = raw.toLowerCase()
  return GEO.find((c) => c.code === upper || c.name.toLowerCase() === lower) || null
}

/** Build a normalized locale patch from any detected or user-entered place. */
export function buildLocalePatch(place = {}, currentLocale = {}) {
  const byCode = countryEntry(place.country || place.countryCode)
  const byName = countryEntry(place.countryName)
  const entry = byCode || byName
  const country = entry?.code || String(place.country || place.countryCode || currentLocale.country || 'IN').toUpperCase()
  const countryName = place.countryName || entry?.name || currentLocale.countryName || 'India'
  const city = String(place.city || place.resolvedCity || place.locality || place.state || '').trim()
  const state = String(place.state || '').trim()
  const pincode = String(place.pincode || place.postalCode || '').trim()
  const locality = String(place.locality || '').trim()
  return {
    country,
    countryName,
    state,
    city,
    cityId: place.cityId ?? null,
    pincode,
    locality,
    currency: entry?.cur || currentLocale.currency || 'INR',
    timeZone: COUNTRY_TZ[country] || currentLocale.timeZone || 'Asia/Kolkata',
    source: place.source || 'manual',
  }
}

export function formatLocationLabel(locale, fallback = 'Select location') {
  if (!locale) return fallback
  const city = String(locale.city || '').trim()
  const pin = String(locale.pincode || '').trim()
  if (city) return pin ? `${city} ${pin}` : city
  if (pin) return locale.state ? `${pin}, ${locale.state}` : pin
  if (locale.state) return locale.state
  return fallback
}

export function formatHeroWhere(locale) {
  if (!locale) return ''
  const city = String(locale.city || '').trim()
  const pin = String(locale.pincode || '').trim()
  const countryName = String(locale.countryName || '').trim()
  if (city) return `${city}${pin ? ` ${pin}` : ''}${countryName ? `, ${countryName}` : ''}`
  if (pin) return `${pin}${countryName ? `, ${countryName}` : ''}`
  return ''
}

async function fetchJsonWithTimeout(url, timeoutMs = 6000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const response = await fetch(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    if (timer) globalThis.clearTimeout(timer)
  }
}

/**
 * Resolve any Indian pincode (6 digits) or supported ZIP/postcode into a place.
 * Tries backend `/geo/pincodes/:pincode` first when remote, then India Post directly,
 * then local `lookupPin` fallback so every valid pincode resolves and can be applied.
 */
export async function resolvePincodeLocation(rawValue) {
  const trimmed = String(rawValue || '').trim()
  const digits = trimmed.replace(/\D/g, '')
  const isIndianPin = /^[1-9]\d{5}$/.test(digits) && (!trimmed || /^\d+$/.test(trimmed))

  if (isIndianPin) {
    let remoteUnavailable = !authService.isRemote
    if (authService.isRemote) {
      const r = await authService.lookupPincode(digits)
      if (r.ok && r.place) {
        const p = r.place
        const resolvedCity = p.city?.name || cleanDistrict(p.district) || p.areas?.[0] || p.state
        return {
          ok: true,
          place: {
            ...p,
            resolvedCity,
            cityId: p.city?.id || null,
            countryName: 'India',
            launchStatus: p.city?.launchStatus || 'not_live',
            supported: Boolean(p.supported && p.city),
          },
        }
      }
      if (r.unknown) {
        return { ok: false, unknown: true, message: `We could not find pincode ${digits}. Check it or enter your city manually.` }
      }
      remoteUnavailable = true
    }

    if (remoteUnavailable) {
      const data = await fetchJsonWithTimeout(`https://api.postalpincode.in/pincode/${encodeURIComponent(digits)}`)
      const entry = Array.isArray(data) ? data[0] : null
      const offices = Array.isArray(entry?.PostOffice) ? entry.PostOffice : []
      if (entry?.Status === 'Success' && offices.length) {
        const first = offices[0]
        const district = cleanDistrict(first.District)
        const block = first.Block && first.Block !== 'NA' ? first.Block.trim() : ''
        const state = String(first.State || '').trim()
        const areas = [...new Set(offices.map((o) => o.Name?.trim()).filter(Boolean))].slice(0, 10)
        const cityMatch = findCity(district) || (block ? findCity(block) : null)
        const resolvedCity = cityMatch?.city || district || block || areas[0] || state
        return {
          ok: true,
          place: {
            postalCode: digits,
            countryCode: 'IN',
            countryName: 'India',
            state,
            district: first.District || district,
            areas,
            region: null,
            city: cityMatch ? { id: null, name: cityMatch.city, launchStatus: 'live' } : null,
            cityId: null,
            resolvedCity,
            launchStatus: cityMatch ? 'live' : 'not_live',
            supported: Boolean(cityMatch),
          },
        }
      }
    }
  }

  const local = lookupPin(trimmed)
  if (local && !local.unknown) {
    return {
      ok: true,
      place: {
        postalCode: local.pin,
        countryCode: local.country,
        countryName: local.countryName,
        state: local.state,
        district: local.city,
        areas: [],
        region: null,
        city: { id: null, name: local.city, launchStatus: local.status === 'live' ? 'live' : 'not_live' },
        cityId: null,
        resolvedCity: local.city,
        launchStatus: local.status === 'live' ? 'live' : 'not_live',
        supported: local.status === 'live',
      },
    }
  }

  if (isIndianPin) {
    return { ok: false, unavailable: true, message: `Could not detect pincode ${digits}. Check the number or choose your city manually.` }
  }
  return { ok: false, unknown: true, message: 'Enter a valid 6-digit pincode, US ZIP, or UK postcode.' }
}

/**
 * Request browser geolocation permission and reverse-geocode coordinates into a place.
 */
export async function detectLocationByBrowser() {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { ok: false, unavailable: true, message: 'Location detection is not supported in this browser.' }
  }

  let coords
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 180000,
      })
    })
    coords = position.coords
  } catch (err) {
    if (err?.code === 1) {
      return { ok: false, denied: true, message: 'Location access was denied. Allow location access or enter your pincode.' }
    }
    return { ok: false, unavailable: true, message: 'Could not get your current location. Enter your pincode or city instead.' }
  }

  const { latitude, longitude } = coords
  let place = null

  const nominatim = await fetchJsonWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1&accept-language=en`,
    7000,
  )
  if (nominatim?.address) {
    const a = nominatim.address
    const country = String(a.country_code || 'IN').toUpperCase()
    const rawCity = a.city || a.town || a.village || a.municipality || cleanDistrict(a.state_district) || cleanDistrict(a.county) || ''
    place = {
      country,
      countryName: a.country || countryEntry(country)?.name || 'India',
      state: a.state || a.region || '',
      city: rawCity,
      pincode: String(a.postcode || '').replace(/\s+/g, ''),
      locality: a.suburb || a.neighbourhood || a.quarter || a.road || '',
      source: 'geo',
    }
  }

  if (!place) {
    const bdc = await fetchJsonWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`,
      7000,
    )
    if (bdc) {
      const country = String(bdc.countryCode || 'IN').toUpperCase()
      place = {
        country,
        countryName: bdc.countryName || countryEntry(country)?.name || 'India',
        state: bdc.principalSubdivision || '',
        city: bdc.city || bdc.locality || '',
        pincode: String(bdc.postcode || '').replace(/\s+/g, ''),
        locality: bdc.locality || '',
        source: 'geo',
      }
    }
  }

  if (!place || (!place.city && !place.state && !place.pincode)) {
    return { ok: false, unavailable: true, message: 'Detected coordinates, but could not resolve your city name. Enter your pincode instead.' }
  }

  // Enrich with backend cityId when an Indian pincode is available and API is active.
  if (authService.isRemote && place.country === 'IN' && /^[1-9]\d{5}$/.test(place.pincode)) {
    const enriched = await authService.lookupPincode(place.pincode).catch(() => null)
    if (enriched?.ok && enriched.place) {
      if (enriched.place.city?.id) place.cityId = enriched.place.city.id
      if (!place.city && enriched.place.city?.name) place.city = enriched.place.city.name
      if (!place.state && enriched.place.state) place.state = enriched.place.state
      if (!place.locality && enriched.place.areas?.[0]) place.locality = enriched.place.areas[0]
    }
  }

  return { ok: true, place }
}

/**
 * Parse any user-entered location text (pincode, "City, Country", or "City") into a place.
 */
export async function resolveFreeformLocation(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return null

  const pinMatch = text.match(/\b([1-9]\d{5})\b/)
  if (pinMatch) {
    const resolved = await resolvePincodeLocation(pinMatch[1])
    if (resolved.ok) {
      return {
        country: resolved.place.countryCode,
        countryName: resolved.place.countryName,
        state: resolved.place.state,
        city: resolved.place.resolvedCity,
        cityId: resolved.place.cityId || null,
        pincode: resolved.place.postalCode,
        locality: resolved.place.areas?.[0] || '',
        source: 'pincode',
      }
    }
  }

  const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
  const cityPart = parts[0] || text
  const maybeCountry = parts.length > 1 ? countryEntry(parts[parts.length - 1]) : null
  const knownCity = findCity(cityPart)

  if (knownCity) {
    return {
      country: knownCity.country,
      countryName: knownCity.countryName,
      state: knownCity.state,
      city: knownCity.city,
      pincode: '',
      locality: '',
      source: 'manual',
    }
  }

  return {
    country: maybeCountry?.code || 'IN',
    countryName: maybeCountry?.name || (parts.length > 1 ? parts[parts.length - 1] : 'India'),
    state: parts.length >= 3 ? parts[1] : '',
    city: cityPart,
    pincode: '',
    locality: '',
    source: 'manual',
  }
}

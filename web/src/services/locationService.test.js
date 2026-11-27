import { describe, expect, it } from 'vitest'
import { findCity, lookupPin } from '../geo.js'
import { buildLocalePatch, formatLocationLabel } from './locationService.js'
import { DEFAULT_LOCALE, hasUserSelectedLocation, normalizeLocale } from '../store.jsx'

describe('location defaults and user selection', () => {
  it('defaults to Jabalpur when the user has not provided a location', () => {
    expect(DEFAULT_LOCALE.city).toBe('Jabalpur')
    expect(DEFAULT_LOCALE.state).toBe('Madhya Pradesh')
    expect(formatLocationLabel(null)).toBe('Jabalpur')
    expect(normalizeLocale({ country: 'IN', city: '', source: 'unset' })).toMatchObject({
      city: 'Jabalpur',
      state: 'Madhya Pradesh',
      source: 'default',
    })
    expect(normalizeLocale({ country: 'IN', city: 'Jaipur' })).toMatchObject({
      city: 'Jabalpur',
      state: 'Madhya Pradesh',
      source: 'default',
    })
    expect(hasUserSelectedLocation(DEFAULT_LOCALE)).toBe(false)
  })

  it('preserves a user-selected or detected location', () => {
    const userGeo = { ...DEFAULT_LOCALE, ...buildLocalePatch({ city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', source: 'geo' }, DEFAULT_LOCALE) }
    expect(hasUserSelectedLocation(userGeo)).toBe(true)
    expect(normalizeLocale(userGeo)).toMatchObject({ city: 'Bhopal', pincode: '462001', source: 'geo' })
    expect(formatLocationLabel(userGeo)).toBe('Bhopal 462001')

    const userManual = { ...DEFAULT_LOCALE, ...buildLocalePatch({ city: 'Jaipur', state: 'Rajasthan', source: 'manual' }, DEFAULT_LOCALE) }
    expect(hasUserSelectedLocation(userManual)).toBe(true)
    expect(normalizeLocale(userManual)).toMatchObject({ city: 'Jaipur', source: 'manual' })
  })

  it('resolves Jabalpur in local geo and pincode lookup', () => {
    expect(findCity('Jabalpur')).toMatchObject({ country: 'IN', state: 'Madhya Pradesh', city: 'Jabalpur' })
    expect(lookupPin('482002')).toMatchObject({ country: 'IN', state: 'Madhya Pradesh', city: 'Jabalpur', pin: '482002' })
  })
})

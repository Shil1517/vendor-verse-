import { describe, expect, it } from 'vitest'
import { CATS, LISTINGS0, VENDORS0 } from '../data.jsx'
import { getPopularSubcategories, vendorMatchesSubcategory } from '../data/vendorSeed.js'
import { SAMPLE_LISTINGS } from '../data/exploreSamples.js'
import {
  normalizeSuggestionItem,
  normalizeVendorSuggestion,
  rankProductSuggestions,
  rankVendorSuggestions,
} from './NavbarProductSearch.jsx'

describe('Vendor directory seed (100 per field)', () => {
  it('provides at least 100 approved vendors in every category field', () => {
    for (const category of CATS) {
      const count = VENDORS0.filter((v) => v.status === 'approved' && v.cat === category.id).length
      expect(count).toBeGreaterThanOrEqual(100)
    }

    const manufacturingCount = VENDORS0.filter(
      (v) => v.status === 'approved' && v.group === 'Manufacturing and supply',
    ).length
    expect(manufacturingCount).toBeGreaterThanOrEqual(100)

    const wholesaleCount = VENDORS0.filter(
      (v) => v.status === 'approved' && v.cat === 'elec' && v.group !== 'Manufacturing and supply',
    ).length
    expect(wholesaleCount).toBeGreaterThanOrEqual(100)
  })

  it('returns popular subcategories for each marketplace category', () => {
    expect(getPopularSubcategories('Events')).toEqual([
      'Event catering', 'Wedding', 'Corporate', 'Decoration', 'Photography', 'Artists & DJs',
    ])
    expect(getPopularSubcategories('Home services')).toContain('Plumbing')
    expect(getPopularSubcategories('Construction')).toContain('Civil contractors')
  })

  it('filters vendors strictly by selected subcategory without bleeding into DJs or other specialties', () => {
    const eventVendors = VENDORS0.filter((v) => v.status === 'approved' && v.cat === 'event')
    const cateringVendors = eventVendors.filter((v) => vendorMatchesSubcategory(v, 'Event catering'))

    expect(cateringVendors.length).toBeGreaterThanOrEqual(15)
    expect(cateringVendors.some((v) => v.specialty === 'Artists & DJs')).toBe(false)
    expect(cateringVendors.some((v) => v.specialty === 'Photography')).toBe(false)
    expect(cateringVendors.some((v) => v.name === 'Royal Feast Caterers')).toBe(true)
  })
})

describe('NavbarProductSearch vendor & product helpers', () => {
  const resolveVendor = (vendorId) => VENDORS0.find((v) => v.id === vendorId)
  const vendorSuggestions = VENDORS0
    .filter((v) => v.status === 'approved')
    .map((v) => normalizeVendorSuggestion(v))
    .filter(Boolean)

  it('returns diverse suggested vendors across fields when the query is empty', () => {
    const suggested = rankVendorSuggestions(vendorSuggestions, '', { city: 'Bhopal', country: 'India', limit: 6 })

    expect(suggested).toHaveLength(6)
    const distinctCategories = new Set(suggested.map((v) => v.category))
    expect(distinctCategories.size).toBeGreaterThanOrEqual(4)
  })

  it('recommends matching vendors when typing a name, specialty, or city', () => {
    const bySpecialty = rankVendorSuggestions(vendorSuggestions, 'plumbing', { limit: 6 })
    expect(bySpecialty.length).toBe(6)
    expect(bySpecialty.every((v) => `${v.title} ${v.specialty} ${v.subs.join(' ')}`.toLowerCase().includes('plumbing'))).toBe(true)

    const byName = rankVendorSuggestions(vendorSuggestions, 'Sharma Electricals', { limit: 6 })
    expect(byName[0].title).toBe('Sharma Electricals & Hardware')
  })

  it('continues to rank product suggestions accurately when used for listings', () => {
    const localItems = LISTINGS0
      .filter((item) => item.status === 'approved')
      .map((item) => normalizeSuggestionItem(item, resolveVendor))

    const results = rankProductSuggestions(localItems, 'drill', 6)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toContain('Bosch GSB 500 Impact Drill')

    const samples = SAMPLE_LISTINGS.map((item) => normalizeSuggestionItem(item))
    expect(rankProductSuggestions(samples, 'cement', 6)[0].sample).toBe(true)
  })
})

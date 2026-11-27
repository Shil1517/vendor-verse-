import { describe, expect, it } from 'vitest'
import { searchIndustries } from '../../packages/shared/taxonomy-search.js'
import { INDUSTRIES } from './data.jsx'

describe('industry browse search', () => {
  it('finds the electrician industry through the electricity alias and ranks it first', () => {
    const results = searchIndustries(INDUSTRIES, 'electricity')

    expect(results[0].industry.name).toBe('Home & household services')
    expect(results[0].matchedSubcategories).toContain('Electrician')
    expect(results.map(({ industry }) => industry.name)).toContain('Construction & infrastructure')
  })

  it('normalizes punctuation and case, and tolerates a small typo', () => {
    expect(searchIndustries(INDUSTRIES, '  ELECTRICITY! ')[0].industry.name).toBe('Home & household services')
    expect(searchIndustries(INDUSTRIES, 'electricty')[0].matchedSubcategories).toContain('Electrician')
  })

  it('finds Plumbing through the plumber alias', () => {
    const results = searchIndustries(INDUSTRIES, 'plumber')

    expect(results[0].industry.name).toBe('Home & household services')
    expect(results[0].matchedSubcategories).toContain('Plumbing')
  })

  it('returns all industries in their original order for an empty query', () => {
    const results = searchIndustries(INDUSTRIES, '  ')

    expect(results.map(({ industry }) => industry.id)).toEqual(INDUSTRIES.map(({ id }) => id))
    expect(results.every(({ matchedSubcategories }) => matchedSubcategories.length === 0)).toBe(true)
  })
})

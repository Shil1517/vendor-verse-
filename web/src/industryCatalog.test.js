import { describe, expect, it } from 'vitest'
import { CATS, INDUSTRIES } from './data.jsx'

describe('industry browse catalog', () => {
  it('keeps all 30 documented industries and their example subcategories browseable in Phase 1', () => {
    expect(INDUSTRIES).toHaveLength(30)
    expect(new Set(INDUSTRIES.map((industry) => industry.id)).size).toBe(30)
    expect(INDUSTRIES.every((industry) => industry.phase === 'MVP' && industry.subs.length > 0)).toBe(true)
  })

  it('preserves the existing ten configured listing workflows', () => {
    expect(CATS).toHaveLength(10)
  })
})

import { describe, expect, it } from 'vitest'
import { destinationFor, timeAgo, toRow } from './notificationView.js'

const NOW = new Date('2026-11-06T12:00:00Z').getTime()
const item = (over = {}) => ({ id: 'n1', eventType: 'listing.approved', category: 'listing', payload: {}, linkedResource: { type: 'listing', id: 'l1' }, read: false, createdAt: '2026-11-06T11:00:00Z', ...over })

describe('notification inbox mapping', () => {
  it('labels an event type when no template text exists', () => {
    expect(toRow(item(), 'customer', NOW).title).toBe('Listing approved')
  })
  it('prefers the title and body a template put in the payload', () => {
    const row = toRow(item({ payload: { title: 'Approved', body: 'Your listing is live.' } }), 'customer', NOW)
    expect(row).toMatchObject({ title: 'Approved', body: 'Your listing is live.', time: '1 h ago', read: false, type: 'listing' })
  })
  it('opens the record for the role, and not at all for an unknown resource', () => {
    expect(destinationFor({ type: 'listing', id: 'l1' }, 'customer')).toEqual(['c_listing', { id: 'l1' }])
    expect(destinationFor({ type: 'listing', id: 'l1' }, 'vendor')).toEqual(['v_listings'])
    expect(destinationFor({ type: 'order', id: 'o1' }, 'customer')).toBeNull()
    expect(destinationFor(null, 'customer')).toBeNull()
  })
  it('formats the age', () => {
    expect(timeAgo('2026-11-06T11:59:30Z', NOW)).toBe('Just now')
    expect(timeAgo('2026-11-06T11:15:00Z', NOW)).toBe('45 min ago')
    expect(timeAgo('2026-11-04T12:00:00Z', NOW)).toBe('2 d ago')
  })
})

/*
 * F-MSG-04: turns an inbox item from the notifications API into the row the Notifications screen draws.
 * The server stores facts (eventType, category, payload, linkedResource), not display text, so the title and
 * body come from payload.title / payload.body when a template put them there; otherwise the event type is
 * shown as a plain label. Copy per language belongs to the template manager (F-MSG-05), which is not built yet.
 */

const humanize = (eventType) => {
  const words = String(eventType || 'notification').replace(/[._-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function timeAgo(iso, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days} d ago` : new Date(iso).toLocaleDateString()
}

/** Where a notification opens, by the resource it links to and the signed-in role. Unknown types do not navigate. */
const LINKS = {
  listing: {
    customer: (id) => ['c_listing', { id }],
    vendor: () => ['v_listings'],
    admin: () => ['ad_listings'],
  },
}

export function destinationFor(linkedResource, role = 'customer') {
  if (!linkedResource) return null
  const build = LINKS[linkedResource.type]?.[role]
  return build ? build(linkedResource.id) : null
}

export function toRow(item, role = 'customer', now = Date.now()) {
  return {
    id: item.id,
    type: item.category,
    title: item.payload?.title || humanize(item.eventType),
    body: item.payload?.body || '',
    time: timeAgo(item.createdAt, now),
    read: Boolean(item.read),
    to: destinationFor(item.linkedResource, role),
  }
}

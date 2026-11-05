import { canPublish } from './accountState.js'

/*
 * F-VND-05: six publication gates, computed live from current data on every call.
 * Never persist the result.
 */
export function computePublicationGates({ me, vendor, listings = [] }) {
  const v = vendor || {}
  const mine = listings.filter((l) => l.vendorId === v.id)
  const gates = [
    { id: 'account', label: 'Account state is active', ok: canPublish(me), hint: 'Pending, restricted, suspended or deletion-requested accounts cannot publish' },
    { id: 'content', label: 'Content review passed', ok: mine.some((l) => l.status === 'approved'), hint: 'At least one listing approved by an admin' },
    { id: 'subscription', label: 'Subscription allows another listing', ok: Boolean(v.plan), hint: v.plan ? `${v.plan} plan` : 'Choose a plan' },
    { id: 'verification', label: 'Category verification met', ok: v.status === 'approved', hint: 'Verification level required by the category' },
    { id: 'fields', label: 'Required fields and service area set', ok: (v.areas || []).length > 0, hint: 'Category fields and at least one area' },
    { id: 'holds', label: 'No holds on the account', ok: !(v.holds && v.holds.length), hint: 'Cases or compliance holds' },
  ]
  return { gates, met: gates.filter((g) => g.ok).length, canPublish: gates.every((g) => g.ok) }
}

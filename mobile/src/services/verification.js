/* F-VND-03 verification levels and F-ADM-02 reviewer rules. */

export const TRUST_LEVELS = [['L0', 'Registered'], ['L1', 'Contact verified'], ['L2', 'Business verified'], ['L3', 'Credential verified']]
export const MIN_REASON_LENGTH = 5

/** Highest level earned. Badges state what was verified; the date comes from the review record. Levels are never purchasable. */
export function verificationLevel(vendor) {
  if (!vendor) return 0
  const docs = vendor.docs || []
  const allVerified = docs.length > 0 && docs.every((d) => d.status === 'verified')
  if (vendor.status === 'approved' && allVerified) return 3
  if (vendor.status === 'approved') return 2
  if (vendor.phone || vendor.email) return 1
  return 0
}

export const levelBadges = (vendor) => TRUST_LEVELS.slice(0, verificationLevel(vendor) + 1)

/** A document expiring within `days` (default none configured: the window is a CFG item) is flagged; past expiry is always expired. */
export function expiryState(doc, today = new Date(), warnDays = null) {
  if (!doc?.expiresAt) return 'none'
  const ms = new Date(doc.expiresAt).getTime() - today.getTime()
  if (Number.isNaN(ms)) return 'none'
  if (ms < 0) return 'expired'
  if (warnDays != null && ms <= warnDays * 86400000) return 'expiring'
  return 'valid'
}

/**
 * Validate an admin decision on a vendor verification.
 * @param {{kind:'approved'|'rejected'|'info', reason:string, reviewer:{id?:string, vendorId?:string, role?:string, loggedIn?:boolean}, vendor:{id:string, ownerAccountId?:string}}} d
 * @returns {{ok:true}|{ok:false, code:string, message:string}}
 */
export function validateReviewDecision({ kind, reason, reviewer, vendor }) {
  if (!['approved', 'rejected', 'info'].includes(kind)) return { ok: false, code: 'BAD_DECISION', message: 'Unknown decision.' }
  if (!reviewer?.loggedIn || reviewer.role !== 'admin') return { ok: false, code: 'FORBIDDEN', message: 'Only an admin reviewer can decide a verification.' }
  const own = (reviewer.id && vendor?.ownerAccountId && reviewer.id === vendor.ownerAccountId) || (reviewer.vendorId && reviewer.vendorId === vendor?.id)
  if (own) return { ok: false, code: 'SELF_REVIEW', message: 'A reviewer cannot decide their own verification.' }
  if (String(reason || '').trim().length < MIN_REASON_LENGTH) return { ok: false, code: 'REASON_REQUIRED', message: `A reason is required (min ${MIN_REASON_LENGTH} characters).` }
  return { ok: true }
}

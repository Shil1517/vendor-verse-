/*
 * F-ACC-01 sign-in service (client seam).
 *
 * There is no backend yet (O-13), so this module is the single place that would
 * be replaced by real API calls. It never contains a fixed OTP:
 *  - the mock provider generates a random code per request, and "delivers" it by
 *    returning it to the screen (dev/mock only, flagged by `mock: true`);
 *  - a real SMS/email provider plugs in through the `provider` argument.
 *
 * OTP policy numbers (expiry, max attempts, rate-limit window) are open CFG items.
 * They are NOT invented here: each limit is `null` (not enforced) until the owner
 * decides, and tests inject values.
 */

export const OTP_POLICY = {
  expirySeconds: null, // CFG: OTP lifetime
  maxAttempts: null, // CFG: wrong attempts before the code is locked
  maxRequests: null, // CFG: OTP requests allowed per window
  requestWindowSeconds: null, // CFG: rate-limit window
}

export const AUTH_ERRORS = {
  INVALID_CONTACT: 'INVALID_CONTACT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  NO_REQUEST: 'NO_REQUEST',
  INVALID_OTP: 'INVALID_OTP',
  EXPIRED: 'EXPIRED',
  LOCKED: 'LOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
}

export const AUTH_MESSAGES = {
  INVALID_CONTACT: 'Enter a valid mobile number or email address.',
  INVALID_FORMAT: 'Enter all 6 digits.',
  NO_REQUEST: 'Request a new code to continue.',
  INVALID_OTP: 'Incorrect code. Please check and try again.',
  EXPIRED: 'This code has expired. Request a new one.',
  LOCKED: 'Too many incorrect attempts. Request a new code.',
  RATE_LIMITED: 'Too many code requests. Please wait before trying again.',
  ACCOUNT_BLOCKED: 'This account cannot sign in. See your account status for details.',
}

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''))
export const normalizePhone = (value = '') => String(value).replace(/\D/g, '').slice(-10)
export const isPhone = (value) => normalizePhone(value).length === 10

export function randomOtp() {
  const buf = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buf)
  return String(buf[0] % 1000000).padStart(6, '0')
}

/** Dev/mock provider: returns the code so the screen can show it. Replace with a real SMS/email provider. */
export const mockProvider = {
  mock: true,
  async send(_contact, code) {
    return { delivered: true, devCode: code }
  },
}

const fail = (code, extra = {}) => ({ ok: false, code, message: AUTH_MESSAGES[code], ...extra })

/**
 * @param {object} deps
 * @param {object} [deps.provider] must expose send(contact, code, factor)
 * @param {object} [deps.policy] overrides OTP_POLICY
 * @param {() => number} [deps.now] ms clock (injectable for tests)
 * @param {() => string} [deps.generate] code generator (injectable for tests)
 */
export function createAuthService({ provider = mockProvider, policy = OTP_POLICY, now = Date.now, generate = randomOtp } = {}) {
  const challenges = new Map() // `${factor}:${contact}` -> { code, issuedAt, attempts }
  const requestLog = new Map() // contact -> [timestamps]
  const key = (contact, factor) => `${factor}:${contact}`

  async function requestOtp(contact, { factor = 'otp' } = {}) {
    const c = String(contact || '').trim()
    if (!c || !(isEmail(c) || isPhone(c))) return fail(AUTH_ERRORS.INVALID_CONTACT)
    const t = now()
    if (policy.maxRequests != null && policy.requestWindowSeconds != null) {
      const recent = (requestLog.get(c) || []).filter((x) => t - x < policy.requestWindowSeconds * 1000)
      if (recent.length >= policy.maxRequests) {
        const retryAfter = Math.ceil((recent[0] + policy.requestWindowSeconds * 1000 - t) / 1000)
        return fail(AUTH_ERRORS.RATE_LIMITED, { retryAfter })
      }
      recent.push(t)
      requestLog.set(c, recent)
    }
    const code = generate()
    challenges.set(key(c, factor), { code, issuedAt: t, attempts: 0 })
    try {
      const res = await provider.send(c, code, factor)
      return { ok: true, mock: Boolean(provider.mock), devCode: provider.mock ? res?.devCode : undefined }
    } catch {
      challenges.delete(key(c, factor))
      return { ok: false, code: 'PROVIDER_ERROR', message: 'We could not send the code. Please try again.' }
    }
  }

  function verifyOtp(contact, input, { factor = 'otp' } = {}) {
    const k = key(String(contact || '').trim(), factor)
    if (!/^\d{6}$/.test(String(input || ''))) return fail(AUTH_ERRORS.INVALID_FORMAT)
    const ch = challenges.get(k)
    if (!ch) return fail(AUTH_ERRORS.NO_REQUEST)
    if (policy.expirySeconds != null && now() - ch.issuedAt > policy.expirySeconds * 1000) {
      challenges.delete(k)
      return fail(AUTH_ERRORS.EXPIRED)
    }
    if (policy.maxAttempts != null && ch.attempts >= policy.maxAttempts) {
      challenges.delete(k)
      return fail(AUTH_ERRORS.LOCKED)
    }
    if (input !== ch.code) {
      ch.attempts += 1
      if (policy.maxAttempts != null && ch.attempts >= policy.maxAttempts) {
        challenges.delete(k)
        return fail(AUTH_ERRORS.LOCKED)
      }
      return fail(AUTH_ERRORS.INVALID_OTP)
    }
    challenges.delete(k) // single use
    return { ok: true }
  }

  return { requestOtp, verifyOtp }
}

/** App-wide instance used by screens. */
export const authService = createAuthService()

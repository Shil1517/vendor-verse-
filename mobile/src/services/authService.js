/*
 * F-ACC-01 sign-in service (client seam).
 *
 * Two implementations share one interface (requestOtp, verifyOtp, endSession):
 *  - the real API client, used when VITE_API_BASE_URL is set (createApiAuthService);
 *  - the in-memory mock below, used otherwise (tests, offline demos).
 * It never contains a fixed OTP:
 *  - the mock provider generates a random code per request, and "delivers" it by
 *    returning it to the screen (dev/mock only, flagged by `mock: true`);
 *  - a real SMS/email provider plugs in through the `provider` argument.
 *
 * OTP policy numbers (expiry, max attempts, rate-limit window) are open CFG items.
 * They are NOT invented here: each limit is `null` (not enforced) until the owner
 * decides, and tests inject values.
 */

import { createSessionStore } from './session.js'

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
  PRIVILEGED_BLOCKED: 'PRIVILEGED_BLOCKED',
  NETWORK: 'NETWORK',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INVALID_PROFILE: 'INVALID_PROFILE',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
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
  PRIVILEGED_BLOCKED: 'Sales Agent and Super Admin sign-in is not available yet.',
  NETWORK: 'Cannot reach the server. Check your connection and try again.',
  PROVIDER_ERROR: 'We could not complete that. Please try again.',
  INVALID_PROFILE: 'Check your details and try again.',
  NOT_FOUND: 'That item no longer exists.',
  CONFLICT: 'That change is not allowed. Choose another option.',
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

  return { requestOtp, verifyOtp, endSession: async () => {} }
}

const MODE_ROLES = { CUSTOMER: 'customer', VENDOR: 'vendor', BUSINESS: 'business' }

/** Maps the backend account mode (GET /me) to the client role id. */
export const roleForMode = (mode) => MODE_ROLES[mode] || 'customer'

/** Phone numbers keep their country code and lose spacing: "+91 98290 00001" -> "+919829000001". */
export function canonicalIdentifier(contact) {
  const c = String(contact || '').trim()
  return isEmail(c) ? c.toLowerCase() : c.replace(/[\s()-]/g, '')
}

/**
 * Real API client for F-ACC-01 (POST /auth/otp/request, /auth/otp/verify, /auth/refresh,
 * /auth/logout and GET /me) and F-ACC-06 (/me/profile, /me/locations), F-ACC-04/05/07/08 (/me/sessions, /me/notification-preferences, /me/data-requests) and F-VND-01/02 (/vendors). Same interface as the mock, except verifyOtp is async and
 * resolves with the signed-in `account` ({ userId, currentMode, availableModes }).
 * The server owns OTP limits and role; nothing here is a policy value.
 *
 * @param {object} deps
 * @param {string} deps.baseUrl e.g. http://127.0.0.1:3001/v1
 * @param {typeof fetch} [deps.fetchImpl]
 * @param {ReturnType<typeof createSessionStore>} [deps.store]
 */
export function createApiAuthService({ baseUrl, fetchImpl = (...args) => globalThis.fetch(...args), store = createSessionStore() }) {
  const challenges = new Map() // canonical identifier -> challengeId
  let refreshing = null

  async function call(path, { method = 'POST', body, token, headers = {} } = {}) {
    let res
    try {
      res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      return { status: 0, data: null }
    }
    let data = null
    try {
      data = await res.json()
    } catch {
      /* 204 or non-JSON body */
    }
    return { status: res.status, data }
  }

  /** Rotates the refresh token once even when several requests expire together. */
  function refresh() {
    refreshing ??= (async () => {
      const session = store.get()
      if (!session?.refreshToken) return false
      const r = await call('/auth/refresh', { body: { refreshToken: session.refreshToken } })
      if (r.status === 200 && r.data?.accessToken) {
        store.set(r.data)
        return true
      }
      if (r.status === 401) store.clear() // definitively rejected; a network error keeps the session
      return false
    })().finally(() => { refreshing = null })
    return refreshing
  }

  /** Authenticated call with one transparent refresh-and-retry on 401. `body` may be a function of the current session. */
  async function authed(path, { method = 'POST', body, headers } = {}) {
    const attempt = () => {
      const session = store.get()
      if (!session) return Promise.resolve({ status: 401, data: null })
      return call(path, { method, token: session.accessToken, headers, body: typeof body === 'function' ? body(session) : body })
    }
    let r = await attempt()
    if (r.status === 401 && (await refresh())) r = await attempt()
    return r
  }

  async function requestOtp(contact) {
    const c = String(contact || '').trim()
    if (!c || !(isEmail(c) || isPhone(c))) return fail(AUTH_ERRORS.INVALID_CONTACT)
    const identifier = canonicalIdentifier(c)
    const r = await call('/auth/otp/request', { body: { channel: isEmail(c) ? 'email' : 'phone', identifier } })
    if (r.status === 202 && r.data?.challengeId) {
      challenges.set(identifier, r.data.challengeId)
      return { ok: true, mock: false }
    }
    if (r.status === 429) return fail(AUTH_ERRORS.RATE_LIMITED)
    if (r.status === 400) return fail(AUTH_ERRORS.INVALID_CONTACT)
    return fail(r.status === 0 ? AUTH_ERRORS.NETWORK : AUTH_ERRORS.PROVIDER_ERROR)
  }

  async function verifyOtp(contact, input) {
    if (!/^\d{6}$/.test(String(input || ''))) return fail(AUTH_ERRORS.INVALID_FORMAT)
    const identifier = canonicalIdentifier(contact)
    const challengeId = challenges.get(identifier)
    if (!challengeId) return fail(AUTH_ERRORS.NO_REQUEST)
    const r = await call('/auth/otp/verify', { body: { challengeId, code: input } })
    if (r.status === 429) {
      challenges.delete(identifier)
      return fail(AUTH_ERRORS.LOCKED)
    }
    if (r.status === 401) return fail(AUTH_ERRORS.INVALID_OTP)
    if (r.status === 503) return fail(AUTH_ERRORS.PRIVILEGED_BLOCKED)
    if (r.status !== 200 || !r.data?.accessToken) return fail(r.status === 0 ? AUTH_ERRORS.NETWORK : AUTH_ERRORS.PROVIDER_ERROR)
    challenges.delete(identifier)
    store.set(r.data)
    const me = await authed('/me', { method: 'GET' })
    if (me.status !== 200 || !me.data?.userId) {
      store.clear()
      return fail(me.status === 0 ? AUTH_ERRORS.NETWORK : AUTH_ERRORS.PROVIDER_ERROR)
    }
    return { ok: true, account: me.data }
  }

  /** Revokes the server session (best effort) and always clears local tokens. */
  async function endSession() {
    if (!store.get()) return
    try {
      await authed('/auth/logout', { body: (session) => ({ refreshToken: session.refreshToken }) })
    } finally {
      store.clear()
    }
  }


  /* ---- F-ACC-06 customer profile and saved locations (all calls are for the signed-in user) ---- */
  const profileFail = (r) => {
    if (r.status === 0) return fail(AUTH_ERRORS.NETWORK)
    if (r.status === 400) return fail(AUTH_ERRORS.INVALID_PROFILE)
    if (r.status === 404) return fail(AUTH_ERRORS.NOT_FOUND)
    if (r.status === 409) return fail(AUTH_ERRORS.CONFLICT)
    return fail(AUTH_ERRORS.PROVIDER_ERROR)
  }

  /** GET /me/profile -> { ok, profile: { displayName, phone, email, emailVerified, customerType, companyName, locale } } */
  async function getProfile() {
    const r = await authed('/me/profile', { method: 'GET' })
    return r.status === 200 ? { ok: true, profile: r.data } : profileFail(r)
  }

  /** PATCH /me/profile. Omitted fields stay as they are; email: null clears it. */
  async function saveProfile(patch) {
    const r = await authed('/me/profile', { method: 'PATCH', body: patch })
    return r.status === 200 ? { ok: true, profile: r.data } : profileFail(r)
  }

  async function listLocations() {
    const r = await authed('/me/locations', { method: 'GET' })
    return r.status === 200 ? { ok: true, locations: r.data.locations } : profileFail(r)
  }

  async function addLocation(location) {
    const r = await authed('/me/locations', { method: 'POST', body: location })
    return r.status === 201 ? { ok: true, location: r.data } : profileFail(r)
  }

  async function updateLocation(id, patch) {
    const r = await authed(`/me/locations/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
    return r.status === 200 ? { ok: true, location: r.data } : profileFail(r)
  }

  async function removeLocation(id) {
    const r = await authed(`/me/locations/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return r.status === 204 ? { ok: true } : profileFail(r)
  }

  /* ---- F-ACC-07 / F-ACC-08 / F-ACC-04 / F-ACC-05 account settings ---- */
  /** One key per user action, reused if the same call is retried, so a retry never creates a second record. */
  const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)

  /** GET /me/sessions -> { ok, sessions: [{ id, createdAt, expiresAt, device, current }] } */
  async function listSessions() {
    const r = await authed('/me/sessions', { method: 'GET' })
    return r.status === 200 ? { ok: true, sessions: r.data.sessions } : profileFail(r)
  }

  /** DELETE /me/sessions/:id. Revoking the current session signs this device out on its next call. */
  async function revokeSession(id) {
    const r = await authed(`/me/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return r.status === 204 ? { ok: true } : profileFail(r)
  }

  /** GET /me/notification-preferences -> { ok, preferences: [{ channel, category, enabled }] } (channel: push|sms|email|in_app) */
  async function getNotificationPreferences() {
    const r = await authed('/me/notification-preferences', { method: 'GET' })
    return r.status === 200 ? { ok: true, preferences: r.data.preferences } : profileFail(r)
  }

  async function saveNotificationPreferences(preferences) {
    const r = await authed('/me/notification-preferences', { method: 'PUT', body: { preferences } })
    return r.status === 200 ? { ok: true, preferences: r.data.preferences } : profileFail(r)
  }

  /** GET /me/data-requests -> { ok, requests: [{ id, type: export|deletion, status, requestedAt, completedAt }] } */
  async function listDataRequests() {
    const r = await authed('/me/data-requests', { method: 'GET' })
    return r.status === 200 ? { ok: true, requests: r.data.requests } : profileFail(r)
  }

  /** POST /me/data-requests. It only records the request; 409 means one of that type is already open. */
  async function requestDataRequest(type) {
    const r = await authed('/me/data-requests', { method: 'POST', body: { type }, headers: { 'idempotency-key': newKey() } })
    return r.status === 201 ? { ok: true, request: r.data } : profileFail(r)
  }

  async function cancelDataRequest(id) {
    const r = await authed(`/me/data-requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
    return r.status === 200 ? { ok: true, request: r.data } : profileFail(r)
  }

  /* ---- F-MSG-04 notification inbox ---- */
  /** GET /me/notifications -> { ok, notifications: [{ id, eventType, category, payload, linkedResource: { type, id } | null, read, createdAt }] }. Page back with `before` (a createdAt). */
  async function listNotifications({ unreadOnly = false, limit, before } = {}) {
    const q = new URLSearchParams()
    if (unreadOnly) q.set('unreadOnly', 'true')
    if (limit) q.set('limit', String(limit))
    if (before) q.set('before', before)
    const r = await authed(`/me/notifications${q.size ? `?${q}` : ''}`, { method: 'GET' })
    return r.status === 200 ? { ok: true, notifications: r.data.notifications } : profileFail(r)
  }

  async function getUnreadNotificationCount() {
    const r = await authed('/me/notifications/unread-count', { method: 'GET' })
    return r.status === 200 ? { ok: true, count: r.data.count } : profileFail(r)
  }

  async function markNotificationRead(id) {
    const r = await authed(`/me/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
    return r.status === 200 ? { ok: true, notification: r.data } : profileFail(r)
  }

  async function markAllNotificationsRead() {
    const r = await authed('/me/notifications/read-all', { method: 'POST' })
    return r.status === 200 ? { ok: true, updated: r.data.updated } : profileFail(r)
  }

  /* ---- F-VND-01 / F-VND-02 vendor onboarding ---- */
  /** POST /vendors. Country first; businessType is the primary vendor role code and roleCodes adds more (D-023). Role codes come from GET /vendor-roles. */
  async function createVendor({ registrationCountry, businessType, roleCodes, legalName, tradingName }) {
    const r = await authed('/vendors', { method: 'POST', body: { registrationCountry, businessType, ...(roleCodes?.length ? { roleCodes } : {}), legalName, ...(tradingName ? { tradingName } : {}) }, headers: { 'idempotency-key': newKey() } })
    return r.status === 201 ? { ok: true, vendor: r.data } : profileFail(r)
  }

  async function listMyVendors() {
    const r = await authed('/vendors/mine', { method: 'GET' })
    return r.status === 200 ? { ok: true, vendors: r.data.vendors } : profileFail(r)
  }

  async function updateVendor(id, patch) {
    const r = await authed(`/vendors/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
    return r.status === 200 ? { ok: true, vendor: r.data } : profileFail(r)
  }

  /** GET /vendors/{id}/public needs no sign-in. Only verified roles are shown (D-020, D-021); a vendor with none answers not found. */
  async function getPublicVendor(vendorId) {
    const r = await call(`/vendors/${encodeURIComponent(vendorId)}/public`, { method: 'GET' })
    return r.status === 200 ? { ok: true, vendor: r.data } : profileFail(r)
  }

  /* ---- vendor roles (D-023, D-024): the catalogue is data, so clients read it instead of hardcoding ---- */
  async function listVendorRoleCatalogue() {
    const r = await authed('/vendor-roles', { method: 'GET' })
    return r.status === 200 ? { ok: true, roles: r.data.roles } : profileFail(r)
  }

  /** The caller's roles for one vendor. Only `verified` roles are public (D-020, D-021). */
  async function listVendorRoles(vendorId) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/roles`, { method: 'GET' })
    return r.status === 200 ? { ok: true, roles: r.data.roles } : profileFail(r)
  }

  /** Adds a role as pending; a rejected or revoked role is resubmitted. */
  async function addVendorRole(vendorId, roleCode) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/roles`, { method: 'POST', body: { roleCode } })
    return r.status === 201 ? { ok: true, roles: r.data.roles } : profileFail(r)
  }

  async function removeVendorRole(vendorId, roleCode) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/roles/${encodeURIComponent(roleCode)}`, { method: 'DELETE' })
    return r.status === 200 ? { ok: true, roles: r.data.roles } : profileFail(r)
  }

  /** Reviewer queue and decision for vendor roles (needs the verification.review permission). */
  async function listVendorRoleReviews(status = 'pending') {
    const r = await authed(`/admin/vendor-role-reviews?status=${encodeURIComponent(status)}`, { method: 'GET' })
    return r.status === 200 ? { ok: true, roles: r.data.roles } : verificationFail(r)
  }

  async function decideVendorRole(vendorId, roleCode, decision, reason) {
    const r = await authed(`/admin/vendor-role-reviews/${encodeURIComponent(vendorId)}/${encodeURIComponent(roleCode)}/decision`, { method: 'POST', body: { decision, reason } })
    return r.status === 200 ? { ok: true, role: r.data } : verificationFail(r)
  }

  /** Role definitions for administrators (needs the vendor_roles.manage permission). */
  async function listVendorRoleDefinitions() {
    const r = await authed('/admin/vendor-roles', { method: 'GET' })
    return r.status === 200 ? { ok: true, roles: r.data.roles } : verificationFail(r)
  }

  async function createVendorRoleDefinition(role) {
    const r = await authed('/admin/vendor-roles', { method: 'POST', body: role })
    return r.status === 201 ? { ok: true, role: r.data } : verificationFail(r)
  }

  async function updateVendorRoleDefinition(code, patch) {
    const r = await authed(`/admin/vendor-roles/${encodeURIComponent(code)}`, { method: 'PATCH', body: patch })
    return r.status === 200 ? { ok: true, role: r.data } : verificationFail(r)
  }

  /* ---- F-VND-03 verification ---- */
  const verificationFail = (r) => ({
    ok: false,
    code: r.status === 0 ? AUTH_ERRORS.NETWORK : r.status === 503 ? 'UNAVAILABLE' : r.status === 403 ? 'FORBIDDEN' : r.status === 404 ? AUTH_ERRORS.NOT_FOUND : r.status === 409 ? AUTH_ERRORS.CONFLICT : AUTH_ERRORS.PROVIDER_ERROR,
    message: r.data?.detail || r.data?.message || (r.status === 503 ? 'Evidence storage is not configured yet.' : r.status === 403 ? 'You are not allowed to review this verification.' : r.status === 0 ? AUTH_MESSAGES.NETWORK : AUTH_MESSAGES.PROVIDER_ERROR),
  })

  async function listVendorDocuments(vendorId) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/documents`, { method: 'GET' })
    return r.status === 200 ? { ok: true, documents: r.data.documents } : verificationFail(r)
  }

  async function listVendorVerifications(vendorId) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/verifications`, { method: 'GET' })
    return r.status === 200 ? { ok: true, verifications: r.data.verifications } : verificationFail(r)
  }

  async function submitVendorVerification(vendorId, body) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/verifications`, { method: 'POST', body, headers: { 'idempotency-key': newKey() } })
    return r.status === 201 ? { ok: true, verification: r.data } : verificationFail(r)
  }

  async function uploadVendorEvidence(file) {
    const declared = await authed('/files', {
      body: { purpose: 'verification-evidence', originalName: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size },
      headers: { 'idempotency-key': newKey() },
    })
    if (declared.status !== 201 || !declared.data?.file?.id || !declared.data?.upload?.url) return verificationFail(declared)

    let uploaded
    try {
      uploaded = await fetchImpl(declared.data.upload.url, {
        method: declared.data.upload.method || 'PUT',
        headers: declared.data.upload.headers || {},
        body: file,
        redirect: 'error',
      })
    } catch {
      return { ok: false, code: AUTH_ERRORS.NETWORK, message: 'Could not upload the evidence file. Try again.' }
    }
    if (!uploaded.ok) return { ok: false, code: AUTH_ERRORS.PROVIDER_ERROR, message: 'The evidence upload did not complete.' }

    const completed = await authed(`/files/${encodeURIComponent(declared.data.file.id)}/complete`)
    return completed.status === 200 ? { ok: true, file: completed.data } : verificationFail(completed)
  }

  async function getFile(fileId) {
    const r = await authed(`/files/${encodeURIComponent(fileId)}`, { method: 'GET' })
    return r.status === 200 ? { ok: true, file: r.data } : verificationFail(r)
  }

  async function registerVendorDocument(vendorId, { fileId, documentType }) {
    const r = await authed(`/vendors/${encodeURIComponent(vendorId)}/documents`, { body: { fileId, documentType } })
    return r.status === 201 ? { ok: true, document: r.data } : verificationFail(r)
  }

  async function listVerificationQueue({ status, limit = 50, cursor } = {}) {
    const q = new URLSearchParams()
    if (status) q.set('status', status)
    if (limit) q.set('limit', String(limit))
    if (cursor) q.set('cursor', cursor)
    const r = await authed(`/admin/verifications${q.size ? `?${q}` : ''}`, { method: 'GET' })
    return r.status === 200 ? { ok: true, ...r.data } : verificationFail(r)
  }

  async function reviewVerification(id, { status, reason, expiresAt } = {}) {
    const r = await authed(`/admin/verifications/${encodeURIComponent(id)}/decision`, {
      body: { status, reason, ...(expiresAt ? { expiresAt } : {}) },
      headers: { 'idempotency-key': newKey() },
    })
    return r.status === 200 ? { ok: true, verification: r.data } : verificationFail(r)
  }

  async function getVerificationEvidenceUrl(verificationId, fileId) {
    const r = await authed(`/admin/verifications/${encodeURIComponent(verificationId)}/evidence/${encodeURIComponent(fileId)}/download-url`, { method: 'GET' })
    return r.status === 200 ? { ok: true, ...r.data } : verificationFail(r)
  }

  return { requestOtp, verifyOtp, endSession, getProfile, saveProfile, listLocations, addLocation, updateLocation, removeLocation, listSessions, revokeSession, getNotificationPreferences, saveNotificationPreferences, listDataRequests, requestDataRequest, cancelDataRequest, listNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead, createVendor, listMyVendors, updateVendor, getPublicVendor, listVendorRoleCatalogue, listVendorRoles, addVendorRole, removeVendorRole, listVendorRoleReviews, decideVendorRole, listVendorRoleDefinitions, createVendorRoleDefinition, updateVendorRoleDefinition, listVendorDocuments, listVendorVerifications, submitVendorVerification, uploadVendorEvidence, getFile, registerVendorDocument, listVerificationQueue, reviewVerification, getVerificationEvidenceUrl, isRemote: true }
}

const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL

/** App-wide instance used by screens: the real API when VITE_API_BASE_URL is set, otherwise the mock. */
export const authService = apiBaseUrl ? createApiAuthService({ baseUrl: apiBaseUrl }) : createAuthService()

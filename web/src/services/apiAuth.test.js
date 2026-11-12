import { describe, expect, it } from 'vitest'
import { createApiAuthService, canonicalIdentifier, roleForMode } from './authService.js'
import { createSessionStore } from './session.js'

const memoryStorage = () => {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) }
}

const reply = (status, body) => ({ status, json: async () => { if (body === undefined) throw new Error('no body'); return body } })
const TOKENS = { accessToken: 'a1', refreshToken: 'r1', accessTokenExpiresAt: '2026-01-01T00:00:00Z' }
const ACCOUNT = { userId: 'u1', currentMode: 'CUSTOMER', availableModes: ['CUSTOMER'] }

/** routes: { 'METHOD /path': (request) => reply | array of replies (consumed in order) } */
function setup(routes) {
  const calls = []
  const fetchImpl = async (url, init) => {
    const requestUrl = new URL(url)
    if (requestUrl.hostname !== 'api.test') return { status: 200, ok: true, json: async () => ({}) }
    const path = requestUrl.pathname.replace('/v1', '')
    const request = { path, query: requestUrl.search, method: init.method, auth: init.headers.authorization, key: init.headers['idempotency-key'], body: init.body ? JSON.parse(init.body) : undefined }
    calls.push(request)
    const handler = routes[`${init.method} ${path}`]
    if (!handler) throw new Error(`unexpected ${init.method} ${path}`)
    if (Array.isArray(handler)) return handler.shift()
    return typeof handler === 'function' ? handler(request) : handler
  }
  const store = createSessionStore(memoryStorage())
  const service = createApiAuthService({ baseUrl: 'http://api.test/v1/', fetchImpl, store })
  return { service, store, calls }
}

describe('canonicalIdentifier / roleForMode', () => {
  it('keeps country code, drops spacing, lowercases email', () => {
    expect(canonicalIdentifier('+91 98290 00001')).toBe('+919829000001')
    expect(canonicalIdentifier(' A@B.com ')).toBe('a@b.com')
  })
  it('maps account modes to client roles, defaulting to customer', () => {
    expect(roleForMode('VENDOR')).toBe('vendor')
    expect(roleForMode('BUSINESS')).toBe('business')
    expect(roleForMode('???')).toBe('customer')
  })
})

describe('createApiAuthService', () => {
  it('requests an OTP with the channel and canonical identifier, exposing no code', async () => {
    const { service, calls } = setup({ 'POST /auth/otp/request': reply(202, { challengeId: 'c1', expiresAt: 'x' }) })
    const r = await service.requestOtp('+91 98290 00001')
    expect(r).toEqual({ ok: true, mock: false })
    expect(calls[0].body).toEqual({ channel: 'phone', identifier: '+919829000001' })
  })

  it('rejects malformed contacts without calling the server', async () => {
    const { service, calls } = setup({})
    expect((await service.requestOtp('nope')).code).toBe('INVALID_CONTACT')
    expect(calls).toHaveLength(0)
  })

  it.each([
    [429, 'RATE_LIMITED'],
    [400, 'INVALID_CONTACT'],
    [500, 'PROVIDER_ERROR'],
  ])('maps request status %i to %s', async (status, code) => {
    const { service } = setup({ 'POST /auth/otp/request': reply(status, {}) })
    expect((await service.requestOtp('a@b.com')).code).toBe(code)
  })

  it('reports a network failure distinctly', async () => {
    const service = createApiAuthService({ baseUrl: 'http://api.test/v1', fetchImpl: async () => { throw new TypeError('failed') }, store: createSessionStore(memoryStorage()) })
    expect((await service.requestOtp('a@b.com')).code).toBe('NETWORK')
  })

  it('requires a prior request and a 6-digit code', async () => {
    const { service } = setup({})
    expect((await service.verifyOtp('a@b.com', '123')).code).toBe('INVALID_FORMAT')
    expect((await service.verifyOtp('a@b.com', '123456')).code).toBe('NO_REQUEST')
  })

  it('verifies, stores the session and returns the account from /me', async () => {
    const { service, store, calls } = setup({
      'POST /auth/otp/request': reply(202, { challengeId: 'c1' }),
      'POST /auth/otp/verify': reply(200, TOKENS),
      'GET /me': reply(200, ACCOUNT),
    })
    await service.requestOtp('A@B.com')
    const r = await service.verifyOtp('a@b.com', '123456')
    expect(r).toEqual({ ok: true, account: ACCOUNT })
    expect(calls[1].body).toEqual({ challengeId: 'c1', code: '123456' })
    expect(calls[2].auth).toBe('Bearer a1')
    expect(store.get()).toEqual(TOKENS)
  })

  it.each([
    [401, 'INVALID_OTP'],
    [429, 'LOCKED'],
    [503, 'PRIVILEGED_BLOCKED'],
  ])('maps verify status %i to %s and stores no session', async (status, code) => {
    const { service, store } = setup({ 'POST /auth/otp/request': reply(202, { challengeId: 'c1' }), 'POST /auth/otp/verify': reply(status, {}) })
    await service.requestOtp('a@b.com')
    expect((await service.verifyOtp('a@b.com', '123456')).code).toBe(code)
    expect(store.get()).toBeNull()
  })

  it('forgets the challenge after the server locks it', async () => {
    const { service } = setup({ 'POST /auth/otp/request': reply(202, { challengeId: 'c1' }), 'POST /auth/otp/verify': reply(429, {}) })
    await service.requestOtp('a@b.com')
    await service.verifyOtp('a@b.com', '123456')
    expect((await service.verifyOtp('a@b.com', '123456')).code).toBe('NO_REQUEST')
  })

  it('refreshes once on 401 and retries the request', async () => {
    const { service, store, calls } = setup({
      'POST /auth/otp/request': reply(202, { challengeId: 'c1' }),
      'POST /auth/otp/verify': reply(200, TOKENS),
      'GET /me': [reply(401, {}), reply(200, ACCOUNT)],
      'POST /auth/refresh': reply(200, { ...TOKENS, accessToken: 'a2', refreshToken: 'r2' }),
    })
    await service.requestOtp('a@b.com')
    const r = await service.verifyOtp('a@b.com', '123456')
    expect(r.ok).toBe(true)
    expect(calls.find((c) => c.path === '/auth/refresh').body).toEqual({ refreshToken: 'r1' })
    expect(calls.filter((c) => c.path === '/me').map((c) => c.auth)).toEqual(['Bearer a1', 'Bearer a2'])
    expect(store.get().refreshToken).toBe('r2')
  })

  it('clears the session when the refresh token is rejected', async () => {
    const { service, store } = setup({
      'POST /auth/otp/request': reply(202, { challengeId: 'c1' }),
      'POST /auth/otp/verify': reply(200, TOKENS),
      'GET /me': reply(401, {}),
      'POST /auth/refresh': reply(401, {}),
    })
    await service.requestOtp('a@b.com')
    const r = await service.verifyOtp('a@b.com', '123456')
    expect(r.ok).toBe(false)
    expect(store.get()).toBeNull()
  })

  it('logs out with the current refresh token and always clears local tokens', async () => {
    const { service, store, calls } = setup({ 'POST /auth/logout': reply(204) })
    store.set(TOKENS)
    await service.endSession()
    expect(calls[0].body).toEqual({ refreshToken: 'r1' })
    expect(calls[0].auth).toBe('Bearer a1')
    expect(store.get()).toBeNull()
  })

  it('uses the rotated refresh token when logout needs a refresh first', async () => {
    const { service, store, calls } = setup({
      'POST /auth/logout': [reply(401, {}), reply(204)],
      'POST /auth/refresh': reply(200, { ...TOKENS, accessToken: 'a2', refreshToken: 'r2' }),
    })
    store.set(TOKENS)
    await service.endSession()
    const logouts = calls.filter((c) => c.path === '/auth/logout')
    expect(logouts.map((c) => c.body.refreshToken)).toEqual(['r1', 'r2'])
    expect(store.get()).toBeNull()
  })

  it('endSession is a no-op without a session', async () => {
    const { service, calls } = setup({})
    await service.endSession()
    expect(calls).toHaveLength(0)
  })
})

describe('createApiAuthService: customer profile and saved locations (F-ACC-06)', () => {
  const signedIn = () => {
    const ctx = setup({
      'GET /me/profile': reply(200, { userId: 'u1', displayName: 'Aarav Mehta', phone: '+919829000001', email: 'a@b.co', emailVerified: false, customerType: 'individual', companyName: null, locale: {} }),
      'PATCH /me/profile': (req) => reply(200, { userId: 'u1', displayName: req.body.displayName ?? 'Aarav Mehta', email: req.body.email ?? null }),
      'GET /me/locations': reply(200, { locations: [{ id: 'l1', label: 'Home', addressText: '24 Vaishali Nagar', isDefault: true }] }),
      'POST /me/locations': (req) => reply(201, { id: 'l2', ...req.body, isDefault: false }),
      'PATCH /me/locations/l2': reply(200, { id: 'l2', isDefault: true }),
      'DELETE /me/locations/l2': reply(204),
    })
    ctx.store.set(TOKENS)
    return ctx
  }

  it('loads the profile with the bearer token', async () => {
    const { service, calls } = signedIn()
    const r = await service.getProfile()
    expect(r.ok).toBe(true)
    expect(r.profile).toMatchObject({ displayName: 'Aarav Mehta', phone: '+919829000001', emailVerified: false })
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/me/profile', auth: 'Bearer a1' })
  })

  it('sends only the fields it is given (PATCH) and null clears the email', async () => {
    const { service, calls } = signedIn()
    expect((await service.saveProfile({ displayName: 'Aarav Mehta', email: 'a@b.co' })).ok).toBe(true)
    expect(calls[0].body).toEqual({ displayName: 'Aarav Mehta', email: 'a@b.co' })
    await service.saveProfile({ email: null })
    expect(calls[1].body).toEqual({ email: null })
  })

  it.each([
    [400, 'INVALID_PROFILE'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [500, 'PROVIDER_ERROR'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const { service, store } = setup({ 'PATCH /me/profile': reply(status, {}) })
    store.set(TOKENS)
    const r = await service.saveProfile({ displayName: 'x' })
    expect(r).toMatchObject({ ok: false, code })
    expect(r.message).toBeTruthy()
  })

  it('reports a network failure distinctly', async () => {
    const store = createSessionStore(memoryStorage())
    store.set(TOKENS)
    const service = createApiAuthService({ baseUrl: 'http://api.test/v1', fetchImpl: async () => { throw new Error('offline') }, store })
    expect((await service.getProfile()).code).toBe('NETWORK')
  })

  it('refreshes an expired token once and retries the profile call', async () => {
    const { service, store, calls } = setup({
      'GET /me/profile': [reply(401, {}), reply(200, { userId: 'u1', displayName: 'Aarav Mehta' })],
      'POST /auth/refresh': reply(200, { accessToken: 'a2', refreshToken: 'r2', accessTokenExpiresAt: 'x' }),
    })
    store.set(TOKENS)
    const r = await service.getProfile()
    expect(r.ok).toBe(true)
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /me/profile', 'POST /auth/refresh', 'GET /me/profile'])
    expect(calls[2].auth).toBe('Bearer a2')
  })

  it('does nothing when signed out', async () => {
    const { service, calls } = setup({})
    expect((await service.getProfile()).ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('lists, adds, edits and removes saved locations', async () => {
    const { service, calls } = signedIn()
    expect((await service.listLocations()).locations).toHaveLength(1)
    const added = await service.addLocation({ label: 'Office', addressText: 'MI Road' })
    expect(added).toMatchObject({ ok: true, location: { id: 'l2', label: 'Office' } })
    expect((await service.updateLocation('l2', { isDefault: true })).location.isDefault).toBe(true)
    expect(await service.removeLocation('l2')).toEqual({ ok: true })
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /me/locations', 'POST /me/locations', 'PATCH /me/locations/l2', 'DELETE /me/locations/l2'])
  })

  it('url-encodes location ids so a crafted id cannot change the path', async () => {
    const { service, store, calls } = setup({ 'DELETE /me/locations/..%2Fprofile': reply(204) })
    store.set(TOKENS)
    await service.removeLocation('../profile')
    expect(calls[0].path).toBe('/me/locations/..%2Fprofile')
  })
})

describe('account settings and vendor onboarding calls', () => {
  const signedIn = (routes) => {
    const ctx = setup(routes)
    ctx.store.set(TOKENS)
    return ctx
  }

  it('lists and revokes sessions for the signed-in user', async () => {
    const { service, calls } = signedIn({
      'GET /me/sessions': reply(200, { sessions: [{ id: 's1', current: true }] }),
      'DELETE /me/sessions/s2': reply(204),
    })
    expect((await service.listSessions()).sessions).toEqual([{ id: 's1', current: true }])
    expect((await service.revokeSession('s2')).ok).toBe(true)
    expect(calls.every((c) => c.auth === 'Bearer a1')).toBe(true)
  })

  it('maps a missing session to NOT_FOUND', async () => {
    const { service } = signedIn({ 'DELETE /me/sessions/x': reply(404, {}) })
    expect((await service.revokeSession('x')).code).toBe('NOT_FOUND')
  })

  it('saves notification preferences as one PUT', async () => {
    const prefs = [{ channel: 'sms', category: 'offers', enabled: false }]
    const { service, calls } = signedIn({ 'PUT /me/notification-preferences': reply(200, { preferences: prefs }) })
    expect((await service.saveNotificationPreferences(prefs)).preferences).toEqual(prefs)
    expect(calls[0].body).toEqual({ preferences: prefs })
  })

  it('lists the inbox with filters, reads the unread count and marks items read', async () => {
    const { service, calls } = signedIn({
      'GET /me/notifications': reply(200, { notifications: [{ id: 'n1' }] }),
      'GET /me/notifications/unread-count': reply(200, { count: 2 }),
      'POST /me/notifications/n1/read': reply(200, { id: 'n1', read: true }),
      'POST /me/notifications/read-all': reply(200, { updated: 2 }),
    })
    expect((await service.listNotifications({ unreadOnly: true, limit: 10, before: '2026-11-06T00:00:00Z' })).notifications).toEqual([{ id: 'n1' }])
    expect((await service.getUnreadNotificationCount()).count).toBe(2)
    expect((await service.markNotificationRead('n1')).notification.read).toBe(true)
    expect((await service.markAllNotificationsRead()).updated).toBe(2)
    expect(calls.every((c) => c.auth === 'Bearer a1')).toBe(true)
  })

  it('reports a missing notification as NOT_FOUND', async () => {
    const { service } = signedIn({ 'POST /me/notifications/n9/read': reply(404, {}) })
    expect((await service.markNotificationRead('n9')).code).toBe('NOT_FOUND')
  })

  it('sends an Idempotency-Key on data requests and reports an open duplicate as CONFLICT', async () => {
    const { service, calls } = signedIn({ 'POST /me/data-requests': [reply(201, { id: 'r1', type: 'export', status: 'requested' }), reply(409, {})] })
    expect((await service.requestDataRequest('export')).request.id).toBe('r1')
    expect((await service.requestDataRequest('export')).code).toBe('CONFLICT')
    expect(calls[0].body).toEqual({ type: 'export' })
    expect(calls[0].key).toBeTruthy()
    expect(calls[0].key).not.toBe(calls[1].key)
  })

  it('creates a vendor with the country first and an Idempotency-Key', async () => {
    const { service, calls } = signedIn({ 'POST /vendors': [reply(201, { id: 'v1' }), reply(400, {})] })
    const r = await service.createVendor({ registrationCountry: 'IN', businessType: 'SUPPLIER', legalName: 'Sharma', tradingName: '' })
    expect(r).toEqual({ ok: true, vendor: { id: 'v1' } })
    expect(calls[0].body).toEqual({ registrationCountry: 'IN', businessType: 'SUPPLIER', legalName: 'Sharma' })
    expect(calls[0].key).toBeTruthy()
    expect((await service.createVendor({ registrationCountry: 'ZZ', businessType: 'SUPPLIER', legalName: 'x' })).code).toBe('INVALID_PROFILE')
  })

  it('reads the public vendor profile and reports a vendor with no verified role as not found', async () => {
    const { service } = signedIn({ 'GET /vendors/v1/public': [reply(200, { id: 'v1', roles: [{ roleCode: 'SUPPLIER' }] }), reply(404, {})] })
    expect((await service.getPublicVendor('v1')).vendor.roles).toEqual([{ roleCode: 'SUPPLIER' }])
    expect((await service.getPublicVendor('v1')).ok).toBe(false)
  })

  it('sends extra vendor roles and reads, adds and removes a vendor roles (D-023)', async () => {
    const { service, calls } = signedIn({
      'POST /vendors': [reply(201, { id: 'v1' })],
      'GET /vendor-roles': [reply(200, { roles: [{ code: 'SUPPLIER' }] })],
      'GET /vendors/v1/roles': [reply(200, { roles: [{ roleCode: 'SUPPLIER', status: 'pending', isPublic: false }] })],
      'POST /vendors/v1/roles': [reply(201, { roles: [{ roleCode: 'WHOLESALER' }] }), reply(409, {})],
      'DELETE /vendors/v1/roles/WHOLESALER': [reply(200, { roles: [] })],
    })
    await service.createVendor({ registrationCountry: 'IN', businessType: 'SUPPLIER', roleCodes: ['WHOLESALER'], legalName: 'Sharma' })
    expect(calls[0].body).toEqual({ registrationCountry: 'IN', businessType: 'SUPPLIER', roleCodes: ['WHOLESALER'], legalName: 'Sharma' })
    expect((await service.listVendorRoleCatalogue()).roles).toEqual([{ code: 'SUPPLIER' }])
    expect((await service.listVendorRoles('v1')).roles[0].isPublic).toBe(false)
    expect((await service.addVendorRole('v1', 'WHOLESALER')).ok).toBe(true)
    expect((await service.addVendorRole('v1', 'WHOLESALER')).ok).toBe(false)
    expect((await service.removeVendorRole('v1', 'WHOLESALER')).ok).toBe(true)
  })

  it('uploads evidence, waits for scan status, registers it, and submits verification', async () => {
    const { service, calls } = signedIn({
      'POST /files': reply(201, { file: { id: 'f1' }, upload: { url: 'https://storage.test/signed', method: 'PUT', headers: { 'x-upload': 'yes' } } }),
      'POST /files/f1/complete': reply(200, { id: 'f1', scanStatus: 'pending' }),
      'GET /files/f1': reply(200, { id: 'f1', scanStatus: 'clean' }),
      'POST /vendors/v1/documents': reply(201, { id: 'd1', documentType: 'Certificate' }),
      'GET /vendors/v1/documents': reply(200, { documents: [{ id: 'd1' }] }),
      'GET /vendors/v1/verifications': reply(200, { verifications: [] }),
      'POST /vendors/v1/verifications': reply(201, { id: 'vr1', level: 'L1' }),
    })
    const file = new Blob(['evidence'], { type: 'application/pdf' })
    Object.defineProperties(file, { name: { value: 'certificate.pdf' }, size: { value: 8 } })
    const uploaded = await service.uploadVendorEvidence(file)
    expect(uploaded.file.scanStatus).toBe('pending')
    expect((await service.getFile('f1')).file.scanStatus).toBe('clean')
    expect((await service.registerVendorDocument('v1', { fileId: 'f1', documentType: 'Certificate' })).document.id).toBe('d1')
    expect((await service.listVendorDocuments('v1')).documents).toHaveLength(1)
    expect((await service.listVendorVerifications('v1')).verifications).toEqual([])
    expect((await service.submitVendorVerification('v1', { level: 'L1', documentIds: ['d1'] })).verification.id).toBe('vr1')
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /files',
      'POST /files/f1/complete',
      'GET /files/f1',
      'POST /vendors/v1/documents',
      'GET /vendors/v1/documents',
      'GET /vendors/v1/verifications',
      'POST /vendors/v1/verifications',
    ])
    expect(calls[0].body).toMatchObject({ purpose: 'verification-evidence', originalName: 'certificate.pdf', contentType: 'application/pdf', sizeBytes: 8 })
  })

  it('lists, reviews and retrieves reviewer evidence links', async () => {
    const { service, calls } = signedIn({
      'GET /admin/verifications': reply(200, { verifications: [{ id: 'vr1' }], nextCursor: null }),
      'POST /admin/verifications/vr1/decision': reply(200, { id: 'vr1', status: 'approved' }),
      'GET /admin/verifications/vr1/evidence/f1/download-url': reply(200, { url: 'https://storage.test/download', expiresInSeconds: 60 }),
    })
    expect((await service.listVerificationQueue({ status: 'submitted' })).verifications).toEqual([{ id: 'vr1' }])
    expect((await service.reviewVerification('vr1', { status: 'approved', reason: 'Evidence verified' })).verification.status).toBe('approved')
    expect((await service.getVerificationEvidenceUrl('vr1', 'f1')).url).toBe('https://storage.test/download')
    expect(calls[0].query).toBe('?status=submitted&limit=50')
    expect(calls[1].body).toEqual({ status: 'approved', reason: 'Evidence verified' })
  })
})

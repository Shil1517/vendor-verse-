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
    const path = new URL(url).pathname.replace('/v1', '')
    const request = { path, method: init.method, auth: init.headers.authorization, body: init.body ? JSON.parse(init.body) : undefined }
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

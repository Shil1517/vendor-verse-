import { describe, it, expect } from 'vitest'
import { createAuthService, AUTH_ERRORS, OTP_POLICY, randomOtp } from './authService.js'
import { stateOf, canPublish, canTransact, stateBanner } from './accountState.js'
import { computePublicationGates } from './publicationGates.js'
import { validateReviewDecision, verificationLevel } from './verification.js'

const fixed = (code = '123456') => ({ generate: () => code })

describe('authService (F-ACC-01)', () => {
  it('has no limits configured by default (CFG items are not invented)', () => {
    expect(Object.values(OTP_POLICY).every((v) => v === null)).toBe(true)
  })
  it('generates a 6-digit code', () => expect(randomOtp()).toMatch(/^\d{6}$/))
  it('rejects invalid contact', async () => {
    const r = await createAuthService().requestOtp('abc')
    expect(r.code).toBe(AUTH_ERRORS.INVALID_CONTACT)
  })
  it('verifies a correct code once only', async () => {
    const s = createAuthService(fixed())
    await s.requestOtp('9829000001')
    expect(s.verifyOtp('9829000001', '123456').ok).toBe(true)
    expect(s.verifyOtp('9829000001', '123456').code).toBe(AUTH_ERRORS.NO_REQUEST)
  })
  it('rejects wrong and malformed codes', async () => {
    const s = createAuthService(fixed())
    await s.requestOtp('a@b.co')
    expect(s.verifyOtp('a@b.co', '000000').code).toBe(AUTH_ERRORS.INVALID_OTP)
    expect(s.verifyOtp('a@b.co', '12').code).toBe(AUTH_ERRORS.INVALID_FORMAT)
  })
  it('expires codes when expiry is configured', async () => {
    let t = 0
    const s = createAuthService({ ...fixed(), now: () => t, policy: { ...OTP_POLICY, expirySeconds: 60 } })
    await s.requestOtp('9829000001')
    t = 61000
    expect(s.verifyOtp('9829000001', '123456').code).toBe(AUTH_ERRORS.EXPIRED)
  })
  it('locks after max attempts', async () => {
    const s = createAuthService({ ...fixed(), policy: { ...OTP_POLICY, maxAttempts: 2 } })
    await s.requestOtp('9829000001')
    expect(s.verifyOtp('9829000001', '000001').code).toBe(AUTH_ERRORS.INVALID_OTP)
    expect(s.verifyOtp('9829000001', '000002').code).toBe(AUTH_ERRORS.LOCKED)
    expect(s.verifyOtp('9829000001', '123456').code).toBe(AUTH_ERRORS.NO_REQUEST)
  })
  it('rate limits requests when configured', async () => {
    let t = 0
    const s = createAuthService({ ...fixed(), now: () => t, policy: { ...OTP_POLICY, maxRequests: 2, requestWindowSeconds: 60 } })
    expect((await s.requestOtp('9829000001')).ok).toBe(true)
    expect((await s.requestOtp('9829000001')).ok).toBe(true)
    const third = await s.requestOtp('9829000001')
    expect(third.code).toBe(AUTH_ERRORS.RATE_LIMITED)
    expect(third.retryAfter).toBeGreaterThan(0)
    t = 61000
    expect((await s.requestOtp('9829000001')).ok).toBe(true)
  })
  it('keeps the admin second factor separate from the OTP', async () => {
    const s = createAuthService(fixed())
    await s.requestOtp('9829000001', { factor: 'mfa' })
    expect(s.verifyOtp('9829000001', '123456', { factor: 'otp' }).code).toBe(AUTH_ERRORS.NO_REQUEST)
    expect(s.verifyOtp('9829000001', '123456', { factor: 'mfa' }).ok).toBe(true)
  })
  it('surfaces provider failure and clears the challenge', async () => {
    const s = createAuthService({ ...fixed(), provider: { send: async () => { throw new Error('down') } } })
    expect((await s.requestOtp('9829000001')).ok).toBe(false)
    expect(s.verifyOtp('9829000001', '123456').code).toBe(AUTH_ERRORS.NO_REQUEST)
  })
})

describe('account states (F-ACC-03)', () => {
  it('only active accounts can publish and transact', () => {
    for (const s of ['pending', 'restricted', 'suspended', 'deletion_requested']) {
      expect(canPublish({ accountState: s })).toBe(false)
      expect(canTransact({ accountState: s })).toBe(false)
    }
    expect(canPublish({ accountState: 'active' })).toBe(true)
  })
  it('unknown states fail safe to pending; banner hidden when active', () => {
    expect(stateOf({ accountState: 'weird' })).toBe('pending')
    expect(stateBanner({ accountState: 'active' })).toBeNull()
    expect(stateBanner({ accountState: 'suspended' }).tone).toBe('red')
  })
})

describe('publication gates (F-VND-05)', () => {
  const vendor = { id: 'v1', plan: 'Starter', status: 'approved', areas: ['Jaipur'] }
  const listings = [{ vendorId: 'v1', status: 'approved' }]
  it('passes when all six gates are met', () => {
    const r = computePublicationGates({ me: { accountState: 'active' }, vendor, listings })
    expect(r.gates).toHaveLength(6)
    expect(r.canPublish).toBe(true)
  })
  it('recomputes live from current data', () => {
    expect(computePublicationGates({ me: { accountState: 'suspended' }, vendor, listings }).canPublish).toBe(false)
    expect(computePublicationGates({ me: { accountState: 'active' }, vendor: { ...vendor, holds: ['case-1'] }, listings }).met).toBe(5)
    expect(computePublicationGates({ me: { accountState: 'active' }, vendor: { ...vendor, areas: [] }, listings }).canPublish).toBe(false)
  })
})

describe('verification review (F-VND-03, F-ADM-02)', () => {
  const admin = { loggedIn: true, role: 'admin', id: 'a1' }
  const vendor = { id: 'v1' }
  it('requires a reason for every decision', () => {
    for (const kind of ['approved', 'rejected', 'info']) expect(validateReviewDecision({ kind, reason: '', reviewer: admin, vendor }).code).toBe('REASON_REQUIRED')
    expect(validateReviewDecision({ kind: 'approved', reason: 'Docs match registry', reviewer: admin, vendor }).ok).toBe(true)
  })
  it('blocks self-review and non-admins', () => {
    expect(validateReviewDecision({ kind: 'approved', reason: 'fine ok', reviewer: { ...admin, vendorId: 'v1' }, vendor }).code).toBe('SELF_REVIEW')
    expect(validateReviewDecision({ kind: 'approved', reason: 'fine ok', reviewer: { ...admin, id: 'x' }, vendor: { id: 'v1', ownerAccountId: 'x' } }).code).toBe('SELF_REVIEW')
    expect(validateReviewDecision({ kind: 'approved', reason: 'fine ok', reviewer: { loggedIn: true, role: 'vendor' }, vendor }).code).toBe('FORBIDDEN')
  })
  it('computes levels', () => {
    expect(verificationLevel({})).toBe(0)
    expect(verificationLevel({ phone: '1' })).toBe(1)
    expect(verificationLevel({ status: 'approved', docs: [{ status: 'verified' }] })).toBe(3)
  })
})

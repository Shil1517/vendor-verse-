import { describe, expect, it } from 'vitest'
import { resolveActiveTab, shouldShowTabBar } from './roles.js'

describe('mobile bottom navigation visibility and active tab resolution', () => {
  it('hides the bottom bar only for auth screens and keeps it visible on portal/sub-pages', () => {
    expect(shouldShowTabBar(undefined)).toBe(false)
    expect(shouldShowTabBar({ id: 'splash', role: 'auth' })).toBe(false)
    expect(shouldShowTabBar({ id: 'welcome', role: 'auth' })).toBe(false)
    expect(shouldShowTabBar({ id: 'ad_login', role: 'auth' })).toBe(false)

    expect(shouldShowTabBar({ id: 'c_saved', role: 'customer' })).toBe(true)
    expect(shouldShowTabBar({ id: 'c_orders', role: 'shared' })).toBe(true)
    expect(shouldShowTabBar({ id: 'c_dash', role: 'customer' })).toBe(true)
    expect(shouldShowTabBar({ id: 'c_vendor', role: 'shared' })).toBe(true)
    expect(shouldShowTabBar({ id: 'v_perf', role: 'vendor' })).toBe(true)
    expect(shouldShowTabBar({ id: 'a_lead', role: 'agent' })).toBe(true)
    expect(shouldShowTabBar({ id: 'ad_vendors', role: 'admin' })).toBe(true)
  })

  it('resolves the active tab from stack history first, then role parent mapping', () => {
    expect(resolveActiveTab({ id: 'c_saved', stack: [{ id: 'c_profile' }, { id: 'c_saved' }] }, 'customer')).toBe('c_profile')
    expect(resolveActiveTab({ id: 'c_saved', stack: [{ id: 'c_saved' }] }, 'customer')).toBe('c_profile')
    expect(resolveActiveTab({ id: 'c_vendor', stack: [{ id: 'c_explore' }, { id: 'c_vendor' }] }, 'customer')).toBe('c_explore')
    expect(resolveActiveTab({ id: 'c_orders', stack: [{ id: 'c_orders' }] }, 'customer')).toBe('c_activity')
    expect(resolveActiveTab({ id: 'chat', stack: [{ id: 'chat' }] }, 'customer')).toBe('messages')

    expect(resolveActiveTab({ id: 'v_perf', stack: [{ id: 'v_perf' }] }, 'vendor')).toBe('v_dash')
    expect(resolveActiveTab({ id: 'v_orders', stack: [{ id: 'v_orders' }] }, 'vendor')).toBe('v_work')
    expect(resolveActiveTab({ id: 'v_reviews', stack: [{ id: 'v_more' }, { id: 'v_reviews' }] }, 'vendor')).toBe('v_more')

    expect(resolveActiveTab({ id: 'a_lead', stack: [{ id: 'a_lead' }] }, 'agent')).toBe('a_leads')
    expect(resolveActiveTab({ id: 'ad_vendors', stack: [{ id: 'ad_vendors' }] }, 'admin')).toBe('ad_approvals')
  })
})

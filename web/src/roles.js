import {
  Home, Compass, ClipboardList, MessageCircle, User, LayoutDashboard, Briefcase, Package, MoreHorizontal, Users, CalendarClock,
  Wallet, ShieldCheck, BarChart3, Settings, LineChart, UserRound, Store, Megaphone, CreditCard, TicketPercent, AlertOctagon, Image, History, Camera, Tag, HelpCircle, Languages, Rocket, Bot, CalendarRange, ClipboardCheck, GitBranch, FileSearch, ShieldAlert, FileCog, Activity, SlidersHorizontal, Boxes, Building2, TrendingUp, MapPin, FileCheck2, Receipt, Star,
} from 'lucide-react'

export const ROLES = [
  { id: 'customer', label: 'Customer', short: 'Customer' },
  { id: 'vendor', label: 'Vendor / Supplier', short: 'Vendor' },
  { id: 'business', label: 'Business / Company Supplier', short: 'Business' },
  { id: 'agent', label: 'Sales Agent', short: 'Agent' },
  { id: 'admin', label: 'Super Admin', short: 'Admin' },
]

/* Vendor and Business are merged (D-023): the Business account is hidden from sign-up and the workspace picker.
   Its screens stay in the codebase until the open details in O-19 are decided. */
export const HIDE_BUSINESS = true
export const VISIBLE_ROLES = ROLES.filter((r) => !(HIDE_BUSINESS && r.id === 'business'))

export const HOME = { customer: 'c_home', vendor: 'v_dash', agent: 'a_home', admin: 'ad_dash' }
HOME.business = 'b_home'

/* bottom navigation per role — `k` is a dictionary key for Hindi/English labels */
export const TABS = {
  customer: [
    { id: 'c_home', k: 'home', icon: Home },
    { id: 'c_explore', k: 'explore', icon: Compass },
    { id: 'c_activity', k: 'activity', icon: ClipboardList },
    { id: 'messages', k: 'messages', icon: MessageCircle },
    { id: 'c_profile', k: 'profile', icon: User },
  ],
  vendor: [
    { id: 'v_dash', k: 'dashboard', icon: LayoutDashboard },
    { id: 'v_work', k: 'work', icon: Briefcase },
    { id: 'v_listings', k: 'listings', icon: Package },
    { id: 'messages', k: 'messages', icon: MessageCircle },
    { id: 'v_more', k: 'more', icon: MoreHorizontal },
  ],
  business: [
    { id: 'b_home', k: 'home', icon: Home },
    { id: 'b_company', k: 'company', icon: Building2 },
    { id: 'b_services', k: 'services', icon: Boxes },
    { id: 'messages', k: 'messages', icon: MessageCircle },
    { id: 'b_more', k: 'more', icon: MoreHorizontal },
  ],
  agent: [
    { id: 'a_home', k: 'home', icon: Home },
    { id: 'a_leads', k: 'leads', icon: Users },
    { id: 'a_followups', k: 'followups', icon: CalendarClock },
    { id: 'a_perf', k: 'performance', icon: TrendingUp },
    { id: 'a_profile', k: 'profile', icon: User },
  ],
  admin: [
    { id: 'ad_dash', k: 'dashboard', icon: LayoutDashboard },
    { id: 'ad_approvals', k: 'approvals', icon: ShieldCheck },
    { id: 'ad_users', k: 'users', icon: Users },
    { id: 'ad_reports', k: 'reports', icon: BarChart3 },
    { id: 'ad_more', k: 'more', icon: Settings },
  ],
}

export const ADMIN_SIDEBAR = [
  { label: 'Overview', items: [{ id: 'ad_dash', label: 'Dashboard', icon: LayoutDashboard }, { id: 'ad_analytics', label: 'Analytics', icon: LineChart }] },
  { label: 'Users', items: [{ id: 'ad_vendors', label: 'Vendors', icon: Store }, { id: 'ad_role_reviews', label: 'Vendor roles', icon: ShieldCheck }, { id: 'ad_role_defs', label: 'Role catalogue', icon: Tag }, { id: 'ad_company', label: 'Companies', icon: Building2 }, { id: 'ad_customers', label: 'Customers', icon: UserRound }, { id: 'ad_agents', label: 'Sales Agents', icon: Users }] },
  { label: 'Trust', items: [{ id: 'ad_cases', label: 'Cases', icon: AlertOctagon }, { id: 'ad_reviews', label: 'Review moderation', icon: Star }] },
  { label: 'Money', items: [{ id: 'ad_subs', label: 'Subscriptions', icon: Receipt }, { id: 'ad_plans', label: 'Plans & entitlements', icon: CreditCard }, { id: 'ad_sponsored', label: 'Sponsored', icon: Megaphone }, { id: 'ad_coupons', label: 'Coupons', icon: TicketPercent }] },
  { label: 'Platform', items: [{ id: 'ad_categories', label: 'Categories', icon: Tag }, { id: 'ad_taxonomy', label: 'Taxonomy builder', icon: GitBranch }, { id: 'ad_geo', label: 'Geo rollout', icon: MapPin }] },
  { label: 'System', items: [{ id: 'ad_reports', label: 'Reports', icon: BarChart3 }, { id: 'ad_settings', label: 'Platform settings', icon: SlidersHorizontal }, { id: 'ad_cfg', label: 'Configuration register', icon: FileCheck2 }, { id: 'ad_maintenance', label: 'Maintenance', icon: FileCog }, { id: 'ad_audit', label: 'Audit log', icon: ClipboardList }] },
]

const group = (parent, ids) => Object.fromEntries(ids.map((id) => [id, parent]))

const TAB_PARENT = {
  customer: {
    ...group('c_explore', [
      'c_categories', 'c_category', 'c_listing', 'c_listing_nodata', 'c_listing_trade', 'c_product',
      'c_vendor', 'c_explore_suppliers', 'c_explore_err', 'c_companies', 'c_company',
      'v_buy', 'vb_home', 'vb_explore',
    ]),
    ...group('c_activity', [
      'c_book_new', 'c_book_instant', 'c_book_series', 'c_booking', 'c_booking_done', 'c_book_modify',
      'c_conflict', 'c_rfq_new', 'c_rfq', 'c_rfq_edit', 'c_rfq_none', 'c_rfq_goods', 'c_rfq_compare',
      'c_rfq_open', 'c_work_order', 'c_terms', 'c_orders', 'c_order', 'c_order_new', 'c_order_exc',
      'c_contract_new', 'c_contract', 'c_company_order', 'c_company_track',
      'vb_rfq', 'vb_compare', 'vb_order',
    ]),
    ...group('messages', ['chat']),
    ...group('c_profile', [
      'c_saved', 'c_dash', 'c_profile_edit', 'c_settings', 'c_notif_prefs', 'c_sessions',
      'c_export', 'c_delete', 'c_contact_share', 'c_location', 'c_location_wait',
      'c_cases', 'c_case', 'c_report', 'c_review', 'c_review_no', 'c_reviews',
      'c_pay', 'c_payments', 'c_wallet', 'c_refund', 'c_refund_view', 'c_pay_fx',
      'acct_state', 'fees', 'invoice', 'ui_states',
      'v_register', 'v_register_type', 'v_register_mfr', 'v_register_svc', 'b_eligibility', 'b_register',
    ]),
  },
  vendor: {
    ...group('v_dash', ['v_perf']),
    ...group('v_work', [
      'v_booking', 'v_booking_mod', 'v_rfq', 'v_work_order', 'v_leads', 'v_orders', 'v_order', 'v_contract',
      'c_rfq', 'c_rfq_edit', 'c_rfq_none', 'c_rfq_goods', 'c_rfq_compare', 'c_rfq_open', 'c_booking', 'c_order', 'c_terms',
    ]),
    ...group('v_listings', [
      'v_listing_edit', 'v_listing_gate', 'v_explore',
      'c_listing', 'c_product', 'c_listing_trade', 'c_listing_nodata', 'c_explore', 'c_categories', 'c_category', 'c_vendor',
    ]),
    ...group('messages', ['chat']),
    ...group('v_more', [
      'v_profile', 'v_public', 'v_verify', 'v_roles', 'v_areas', 'v_avail', 'v_reviews', 'v_cases',
      'v_sub', 'v_plans', 'v_checkout', 'v_checkout_down', 'v_sponsor', 'v_biz_network', 'v_biz_profile',
      'v_refunds', 'v_payouts', 'v_business_onboard', 'v_register', 'v_register_type', 'v_register_mfr', 'v_register_svc',
      'c_cat_suggest', 'c_notif_prefs', 'c_sessions', 'c_export', 'c_delete', 'c_contact_share',
      'c_location', 'c_location_wait', 'c_report', 'acct_state', 'fees', 'invoice', 'ui_states',
    ]),
  },
  business: {
    ...group('b_company', ['b_register', 'b_eligibility']),
    ...group('b_services', ['b_orders', 'b_order']),
    ...group('messages', ['b_messages', 'chat']),
    ...group('b_more', ['team', 'c_notif_prefs', 'c_sessions', 'c_export', 'c_delete', 'acct_state', 'fees', 'invoice', 'ui_states']),
  },
  agent: {
    ...group('a_leads', ['a_lead', 'a_lead_new', 'a_log', 'a_onboard']),
    ...group('a_perf', ['a_earnings']),
    ...group('a_profile', ['a_tasks', 'a_perms', 'c_notif_prefs', 'c_sessions', 'c_export', 'c_delete', 'acct_state', 'ui_states']),
  },
  admin: {
    ...group('ad_approvals', ['ad_vendors', 'ad_vendor', 'ad_vendor_new', 'ad_role_reviews', 'ad_listings', 'ad_listing', 'ad_cases', 'ad_case', 'ad_reviews', 'ad_company']),
    ...group('ad_users', ['ad_user', 'ad_customers', 'ad_agents', 'ad_agent', 'ad_roles']),
    ...group('ad_reports', ['ad_analytics', 'ad_audit', 'ad_subs', 'ad_sub', 'ad_commission']),
    ...group('ad_more', ['ad_categories', 'ad_category', 'ad_cat_new', 'ad_taxonomy', 'ad_geo', 'ad_plans', 'ad_sponsored', 'ad_settings', 'ad_coupons', 'ad_role_defs', 'ad_cfg', 'ad_maintenance', 'ui_states']),
  },
}

/** Auth/review screens occupy the full viewport; all app/workspace screens keep the mobile bottom bar visible. */
export const shouldShowTabBar = (screen) => Boolean(screen && screen.role !== 'auth')

/** Resolves the highlighted bottom/header tab from the current route, navigation history, or parent section fallback. */
export function resolveActiveTab(nav, role = 'customer') {
  const effectiveRole = role || 'customer'
  const tabs = TABS[effectiveRole] || TABS.customer
  if (tabs.some((tab) => tab.id === nav?.id)) return nav.id
  const fromStack = (nav?.stack || []).slice().reverse().map((entry) => tabs.find((tab) => tab.id === entry.id)).find(Boolean)?.id
  if (fromStack) return fromStack
  const mapped = TAB_PARENT[effectiveRole]?.[nav?.id]
  return mapped && tabs.some((tab) => tab.id === mapped) ? mapped : null
}

import {
  Home, Compass, ClipboardList, MessageCircle, User, LayoutDashboard, Briefcase, Package, MoreHorizontal, Users, CalendarClock,
  TrendingUp, ShieldCheck, BarChart3, Settings, Building2, ShoppingCart,
} from 'lucide-react'

export const ROLES = [
  { id: 'customer', label: 'Customer', short: 'Customer' },
  { id: 'vendor', label: 'Vendor', short: 'Vendor' },
  { id: 'agent', label: 'Sales Agent', short: 'Agent' },
  { id: 'business', label: 'Business', short: 'Business' },
  { id: 'admin', label: 'Super Admin', short: 'Admin' },
]

/* Admin is kept in the codebase but hidden from every role picker and the screen directory.
   Flip to false to bring it back. */
export const HIDE_ADMIN = true
/* Vendor and Business are merged (D-023): the Business account is hidden from every picker and the screen directory.
   Its screens stay in the codebase until the open details in O-19 are decided. */
export const HIDE_BUSINESS = true
export const isHiddenRole = (id) => (HIDE_ADMIN && id === 'admin') || (HIDE_BUSINESS && id === 'business')
export const VISIBLE_ROLES = ROLES.filter((r) => !isHiddenRole(r.id))

/* Business is a separate account type (company owners only) - it never shares a vendor identity */
export const vendorSide = (me) => me.role === 'vendor'

export const HOME = { customer: 'c_home', vendor: 'v_dash', agent: 'a_home', business: 'b_home', admin: 'ad_dash' }

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
    { id: 'v_buy', k: 'buy', icon: ShoppingCart },
    { id: 'messages', k: 'messages', icon: MessageCircle },
    { id: 'v_more', k: 'more', icon: MoreHorizontal },
  ],
  agent: [
    { id: 'a_home', k: 'home', icon: Home },
    { id: 'a_leads', k: 'leads', icon: Users },
    { id: 'a_followups', k: 'followups', icon: CalendarClock },
    { id: 'a_perf', k: 'performance', icon: TrendingUp },
    { id: 'a_profile', k: 'profile', icon: User },
  ],
  business: [
    { id: 'b_home', k: 'home', icon: Home },
    { id: 'b_company', k: 'company', icon: Building2 },
    { id: 'b_services', k: 'services', icon: Briefcase },
    { id: 'messages', k: 'messages', icon: MessageCircle },
    { id: 'b_more', k: 'more', icon: MoreHorizontal },
  ],
  admin: [
    { id: 'ad_dash', k: 'dashboard', icon: LayoutDashboard },
    { id: 'ad_approvals', k: 'approvals', icon: ShieldCheck },
    { id: 'ad_users', k: 'users', icon: Users },
    { id: 'ad_analytics', k: 'reports', icon: BarChart3 },
    { id: 'ad_more', k: 'more', icon: Settings },
  ],
}


import {
  Home, Compass, ClipboardList, MessageCircle, User, LayoutDashboard, Briefcase, Package, MoreHorizontal, Users, CalendarClock,
  Wallet, ShieldCheck, BarChart3, Settings, LineChart, UserRound, Store, Megaphone, CreditCard, TicketPercent, AlertOctagon, Image, History, Camera, Tag, HelpCircle, Languages, Rocket, Bot, CalendarRange, ClipboardCheck, GitBranch, FileSearch, ShieldAlert, FileCog, Activity, SlidersHorizontal, Boxes, ShoppingBag, Building2, TrendingUp, MapPin, FileCheck2, Receipt, Star,
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
    { id: 'v_buy', k: 'buy', icon: ShoppingBag },
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

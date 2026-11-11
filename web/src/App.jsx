import { useEffect, useMemo, useState } from 'react'
import { Battery, Signal, Wifi, Search, X, LayoutGrid, CheckCircle2, AlertTriangle, Info, ChevronRight, FileCheck2, Rocket, Users2, Target, HelpCircle, Smartphone, Menu, Bell, Globe, ArrowLeftRight, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, LogOut, MapPin } from 'lucide-react'
import { AppProvider, COUNTRY_SETTINGS, LOCATION_PRESETS, useApp } from './store.jsx'
import { canOpenRoute } from './services/authorization.js'
import { NavProvider, useNav } from './nav.jsx'
import { HOME, TABS, ROLES, ADMIN_SIDEBAR } from './roles.js'
import { SCREENS, GROUPS } from './registry.jsx'
import { Logo } from './screens/auth.jsx'
import { VendorWorkspace } from './screens/vendor.jsx'
import { ThemeToggle } from './components/ThemeToggle.jsx'
import { FRS, NFR, MVP, PHASE2, ACCEPTANCE, DECISIONS, ROLE_TABLE } from './specs.js'
import { cx } from './ui.jsx'
import { ThemeProvider } from './hooks/useTheme.jsx'
import './screens/customer-visuals.css'
import './screens/vendor-dashboard-visuals.css'
import './screens/explore-visuals.css'
import './screens/agent-dashboard-visuals.css'
import './screens/admin-dashboard-visuals.css'
import './screens/dashboard-reference.css'
import './layout.css'
import './workspace-themes.css'

const INITIAL_SCREEN = window.location.hash.replace(/^#\/?/, '')

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const f = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return v
}

const BAR = {
  light: 'bg-white text-ink-900',
  brand: 'bg-brand-600 text-white',
  'brand-dark': 'bg-brand-700 text-white',
  ink: 'bg-ink-900 text-white',
}

function StatusBar({ tone = 'light' }) {
  return (
    <div className={cx('absolute inset-x-0 top-0 z-30 flex h-11 items-end justify-between px-7 pb-1.5 text-[13px] font-bold', BAR[tone])}>
      <span>9:41</span>
      <div className="absolute left-1/2 top-2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1"><Signal size={14} strokeWidth={2.6} /><Wifi size={14} strokeWidth={2.6} /><Battery size={19} strokeWidth={2.2} /></div>
    </div>
  )
}

function TabBar() {
  const nav = useNav()
  const { me, t, threads, vendors, leads, listings } = useApp()
  const tabs = TABS[me.role] || []
  if (!tabs.some((x) => x.id === nav.id)) return null
  const badge = (id) => {
    if (id === 'messages') return (threads[me.role === 'vendor' ? 'vendor' : me.role === 'business' ? 'business' : 'customer'] || []).reduce((s, x) => s + x.unread, 0)
    if (id === 'ad_approvals') return vendors.filter((v) => v.status === 'submitted').length + listings.filter((l) => l.status === 'pending').length
    if (id === 'a_followups') return leads.filter((l) => l.next?.date && new Date(l.next.date) <= new Date('19 Oct 2026')).length
    return 0
  }
  return (
    <nav className="z-20 flex shrink-0 items-center justify-between gap-1 border-t border-ink-100 bg-white/95 px-3 pb-1.5 pt-2 shadow-[0_-8px_24px_-14px_rgba(20,40,75,0.25)] backdrop-blur">
      {tabs.map((x) => {
        const on = x.id === nav.id
        const n = badge(x.id)
        return (
          <button key={x.id} aria-label={t(x.k)} onClick={() => !on && nav.reset(x.id)} className={cx('relative flex h-11 items-center justify-center gap-1.5 rounded-full transition-all duration-300 active:scale-90', on ? 'flex-[2.1] bg-brand-600 px-3 text-white shadow-md shadow-brand-700/30' : 'flex-1 text-ink-400 hover:bg-ink-50')}>
            <x.icon size={21} strokeWidth={on ? 2.4 : 2} className="shrink-0" />
            {on && <span className="truncate text-[12.5px] font-bold">{t(x.k)}</span>}
            {n > 0 && <span className={cx('absolute grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white ring-2', on ? 'right-1.5 top-0.5 ring-brand-600' : 'right-2 top-0.5 ring-white')}>{n}</span>}
          </button>
        )
      })}
    </nav>
  )
}

function Toast() {
  const { toastMsg } = useApp()
  if (!toastMsg) return null
  const warn = toastMsg.tone === 'warn'
  return (
    <div key={toastMsg.id} className={cx('pointer-events-none fixed right-4 top-[84px] z-[90] w-[min(420px,calc(100vw-2rem))] flex animate-toast items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-semibold text-white shadow-xl', warn ? 'bg-amber-600' : 'bg-ink-900')}>
      {warn ? <AlertTriangle size={17} className="shrink-0" /> : <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />}
      {toastMsg.msg}
    </div>
  )
}

function ScreenHost({ onMenu }) {
  const nav = useNav()
  const { me } = useApp()
  const reg = SCREENS[nav.id] || SCREENS.welcome
  const C = reg.C
  const customerRoute = reg.role === 'customer' || (reg.role === 'shared' && me.role === 'customer')
  const businessWorkspaceRoute = me.role === 'business' && ['b_home', 'b_company', 'b_services', 'b_messages', 'b_more'].includes(nav.id)
  const vendorWorkspaceRoute = ['vendor', 'business'].includes(me.role) && (reg.role === 'vendor' || ['messages', 'chat'].includes(nav.id))
  const workspaceRoute = vendorWorkspaceRoute || businessWorkspaceRoute
  const vendorMessagesRoute = nav.id === 'messages' && (me.role === 'vendor' || me.role === 'business')
  const agentWorkspaceRoute = me.role === 'agent' && (reg.role === 'agent' || nav.id === 'notifications')
  const adminWorkspaceRoute = ['ad_dash', 'ad_approvals', 'ad_users', 'ad_reports', 'ad_more'].includes(nav.id)
  const FORM_IDS = ['c_book_new', 'c_book_instant', 'c_book_series', 'c_book_modify', 'c_booking_done', 'c_rfq_new', 'c_rfq_edit', 'c_rfq_none', 'c_rfq_goods', 'c_order_new', 'c_order_exc', 'c_review', 'c_review_no', 'c_report', 'c_profile_edit', 'c_settings', 'c_notif_prefs', 'c_delete', 'c_export', 'c_sessions', 'c_contact_share', 'c_location', 'c_location_wait', 'c_cat_suggest', 'c_contract_new', 'c_company_order', 'acct_state', 'ui_states', 'v_register']
  const formRoute = FORM_IDS.includes(nav.id) || (!customerRoute && !workspaceRoute && !agentWorkspaceRoute && !adminWorkspaceRoute && !['auth'].includes(reg.role) && !['v_explore', 'vb_explore', 'c_explore_suppliers', 'messages', 'chat', 'ad_vendors', 'ad_listings', 'ad_cases', 'ad_agents', 'ad_categories', 'ad_audit', 'ad_customers', 'ad_analytics', 'ad_coupons'].includes(nav.id))
  return (
    <div key={nav.depth + nav.id} className={cx('h-full min-w-0', formRoute && 'vv-form-route', nav.dir === 'push' ? 'animate-slide-in' : 'animate-fade-in', customerRoute && 'vv-customer-route', ['c_explore', 'v_explore'].includes(nav.id) && 'vv-explore-route', nav.id === 'v_dash' && 'vv-vendor-dashboard-route', workspaceRoute && 'vv-vendor-workspace-route', businessWorkspaceRoute && 'vv-business-workspace-route', agentWorkspaceRoute && 'vv-agent-route', adminWorkspaceRoute && 'vv-admin-route', ['v_profile', 'v_reviews', 'v_verify', 'v_perf'].includes(nav.id) && 'vv-vendor-detail-route', vendorMessagesRoute && 'vv-vendor-message-route')}>
      {workspaceRoute ? <VendorWorkspace variant={businessWorkspaceRoute ? 'business' : 'vendor'} header={businessWorkspaceRoute ? ({ onWorkspaceToggle, mobile, mobileOpen, collapsed }) => <WebHeader onMenu={onMenu} hideTabs workspaceHeader blueBrand workspaceToggle={onWorkspaceToggle} workspaceMobile={mobile} workspaceMobileOpen={mobileOpen} workspaceCollapsed={collapsed} /> : undefined}><C params={nav.params || {}} /></VendorWorkspace> : <C params={nav.params || {}} />}
    </div>
  )
}

function Phone({ frame, scale, web = false, onMenu }) {
  const nav = useNav()
  const reg = SCREENS[nav.id] || SCREENS.welcome
  const inner = (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
      {frame && <StatusBar tone={reg.bar} />}
      <div className={cx('relative flex min-h-0 flex-1 flex-col', frame && 'pt-11')}>
        <div className="relative min-h-0 flex-1"><ScreenHost onMenu={onMenu} /><Toast /></div>
        {!web && !['v_dash', 'v_explore', 'v_listings', 'v_work', 'v_orders', 'v_more', 'v_profile', 'v_reviews', 'v_verify', 'v_perf'].includes(nav.id) && <TabBar />}
        {frame && <div className="h-5 shrink-0 bg-white" />}
      </div>
      {frame && <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-40 h-1.5 w-32 -translate-x-1/2 rounded-full bg-ink-900/85" />}
    </div>
  )
  if (!frame) return <div className="h-full w-full">{inner}</div>
  return (
    <div data-phone style={{ width: 410 * scale, height: 864 * scale }}>
      <div style={{ width: 410, height: 864, transform: `scale(${scale})`, transformOrigin: 'top left' }} className="rounded-[56px] border-[10px] border-ink-900 bg-ink-900 shadow-[0_30px_80px_-20px_rgba(20,40,75,0.55)]">
        <div className="h-full w-full overflow-hidden rounded-[46px]">{inner}</div>
      </div>
    </div>
  )
}

/* ---------- left: screen directory ---------- */
function Directory({ onJump, onClose }) {
  const nav = useNav()
  const { me } = useApp()
  const [q, setQ] = useState('')
  const grp = me.role || 'customer'
  const list = useMemo(() => {
    const all = Object.values(SCREENS)
    if (q) return all.filter((s) => (s.title + s.id + s.fr.join(' ')).toLowerCase().includes(q.toLowerCase()))
    return all.filter((s) => s.role === grp || (s.role === 'shared' && (grp === 'customer' || grp === 'vendor')))
  }, [grp, q])
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
        <Logo size={38} />
        <div className="min-w-0 flex-1"><h1 className="text-[17px] font-extrabold leading-tight tracking-tight">VendorVerse</h1><p className="text-[11px] font-medium text-ink-500">Marketplace & business tools</p></div>
        {onClose && <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-ink-100"><X size={20} /></button>}
      </div>
      <div className="space-y-3 px-4 pt-4">
        <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800">Your workspace and navigation follow the role you choose when you sign in.</div>
        <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages and tools" className="h-10 w-full rounded-lg bg-ink-50 pl-9 pr-3 text-[13px] outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /></div>
        <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">{q ? 'Search results' : 'Workspace navigation'}</p>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {list.map((s) => (
          <button key={s.id} onClick={() => { onJump(s.id); onClose?.() }} className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition', nav.id === s.id ? 'bg-brand-50' : 'hover:bg-ink-50')}>
            <span className={cx('size-1.5 shrink-0 rounded-full', nav.id === s.id ? 'bg-brand-600' : 'bg-ink-200')} />
            <span className={cx('min-w-0 flex-1 truncate text-[13px] font-semibold', nav.id === s.id ? 'text-brand-800' : 'text-ink-800')}>{s.title}</span>
            {s.tab && <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />}
          </button>
        ))}
        {list.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No screens match.</p>}
      </div>
      <div className="space-y-1 border-t border-ink-100 p-3">
        <button onClick={() => { onJump('scope_review'); onClose?.() }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-brand-700 hover:bg-brand-50">MVP scope & roadmap review</button>
        <button onClick={() => { onJump('login'); onClose?.() }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50">Sign in</button>
        <button onClick={() => { onJump('register'); onClose?.() }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-600 hover:bg-ink-50">Create account</button>
      </div>
    </div>
  )
}

/* ---------- right: requirement panel ---------- */
function SpecPanel() {
  const nav = useNav()
  const reg = SCREENS[nav.id] || SCREENS.welcome
  const [tab, setTab] = useState('screen')
  const tabs = [['screen', 'This screen'], ['mvp', 'MVP'], ['p2', 'Phase 2'], ['accept', 'Acceptance'], ['decide', 'Decisions'], ['roles', 'Roles & NFR']]
  const List = ({ items, icon: I = CheckCircle2, tone = 'text-brand-600' }) => <ul className="space-y-2.5">{items.map((x) => <li key={x} className="flex gap-2.5 text-[13px] leading-snug text-ink-700"><I size={16} className={cx('mt-0.5 shrink-0', tone)} />{x}</li>)}</ul>
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-ink-100 px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Software Requirements Specification</p>
        <h2 className="mt-1 text-[17px] font-extrabold leading-tight">{tab === 'screen' ? reg.title : tabs.find((t) => t[0] === tab)[1]}</h2>
        {tab === 'screen' && <p className="mt-1 text-xs text-ink-500">Screen id <code className="rounded bg-ink-100 px-1 py-0.5 text-[11px]">{reg.id}</code> · {reg.role === 'shared' ? 'Shared' : ROLES.find((r) => r.id === reg.role)?.label || 'Public'}</p>}
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-ink-100 px-4 py-2.5">
        {tabs.map(([id, l]) => <button key={id} onClick={() => setTab(id)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition', tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200')}>{l}</button>)}
      </div>
      <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'screen' && (reg.fr.length ? reg.fr.map((k) => (
          <div key={k} className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100">
            <div className="flex items-center gap-2"><span className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">{k}</span><p className="text-sm font-bold">{FRS[k].title}</p></div>
            <div className="mt-3"><List items={FRS[k].items} /></div>
          </div>
        )) : <p className="text-sm text-ink-500">No requirements mapped.</p>)}
        {tab === 'mvp' && <List items={MVP} icon={Rocket} />}
        {tab === 'p2' && <List items={PHASE2} icon={Target} tone="text-violet-600" />}
        {tab === 'accept' && <List items={ACCEPTANCE} icon={FileCheck2} tone="text-emerald-600" />}
        {tab === 'decide' && <List items={DECISIONS} icon={HelpCircle} tone="text-amber-600" />}
        {tab === 'roles' && (
          <>
            {ROLE_TABLE.map(([r, d]) => <div key={r} className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100"><p className="flex items-center gap-2 text-sm font-bold"><Users2 size={16} className="text-brand-600" />{r}</p><p className="mt-1.5 text-[13px] leading-snug text-ink-600">{d}</p></div>)}
            <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Shared & non-functional</p>
            {NFR.map(([k, d]) => <p key={k} className="text-[13px] leading-snug text-ink-700"><b>{k}:</b> {d}</p>)}
          </>
        )}
      </div>
      <div className="border-t border-ink-100 px-5 py-3 text-[11px] text-ink-400">ADRSTECHNO PRIVATE LIMITED · v1.0 · Draft for review</div>
    </div>
  )
}

function WebHeader({ onMenu, hideTabs, workspaceHeader = false, workspaceTheme = false, blueBrand = false, workspaceToggle, workspaceMobile = false, workspaceMobileOpen = false, workspaceCollapsed = false }) {
  const nav = useNav()
  const { lang, setLang, locale, setLocale, me, setMe, t } = useApp()
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const screen = SCREENS[nav.id] || SCREENS.welcome
  const tabs = TABS[me.role || 'customer'] || TABS.customer
  const activeTab = nav.stack.slice().reverse().map((entry) => tabs.find((tab) => tab.id === entry.id)).find(Boolean)?.id || nav.id
  return (
    <header className={cx('sticky top-0 z-40 shrink-0 border-b border-ink-200 bg-white/95 shadow-[0_2px_10px_rgba(20,40,75,.04)] backdrop-blur', workspaceHeader && 'vv-workspace-global-header')}>
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-7 lg:px-10">
          <button onClick={() => nav.reset(HOME[me.role || 'customer'])} className="flex shrink-0 items-center gap-2.5 rounded-xl text-left" aria-label="VendorVerse home"><Logo size={42} blue={blueBrand} /><span className="hidden lg:block"><span className="block text-[18px] font-black leading-tight tracking-tight text-ink-900">VendorVerse</span><span className="block text-[11px] font-medium text-ink-500">Global Marketplace · products · services · quotes</span></span></button>
        <nav className={cx("no-scrollbar ml-3 hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto", hideTabs ? "" : "md:flex")} style={hideTabs ? { display: "none" } : undefined} aria-label="Main navigation">
          {tabs.map((tab) => { const on = activeTab === tab.id; return <button key={tab.id} onClick={() => nav.reset(tab.id)} aria-current={on ? 'page' : undefined} className={cx('flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-bold transition', on ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900')}><tab.icon size={17} />{t(tab.k)}</button> })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {workspaceHeader && <button type="button" onClick={workspaceToggle} aria-controls="business-workspace-navigation" aria-label={workspaceMobile ? workspaceMobileOpen ? 'Close business workspace menu' : 'Open business workspace menu' : workspaceCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={workspaceMobile ? workspaceMobileOpen : !workspaceCollapsed} className="grid size-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-50">{workspaceMobile ? workspaceMobileOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} /> : workspaceCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>}
          <button onClick={onMenu} aria-label="More pages and tools" title="More pages and tools" className="grid size-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-50"><Menu size={20} /></button>
          {me.loggedIn && me.role !== 'business' && me.hasVendorAccount && <button onClick={() => { const nextRole = me.role === 'business' ? 'vendor' : me.role === 'vendor' ? 'customer' : 'vendor'; setMe({ ...me, role: nextRole, name: nextRole === 'customer' ? (me.customerName || me.name) : nextRole === 'vendor' && me.vendorOwnerName ? me.vendorOwnerName : (me.vendorName || me.name), buyerMode: false }); nav.reset(nextRole === 'customer' ? 'c_home' : 'v_dash') }} className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 text-xs font-bold text-brand-800 hover:bg-brand-100" title={me.role === 'business' ? 'Switch to vendor workspace' : me.role === 'vendor' ? 'Switch to customer' : 'Switch to vendor workspace'}><ArrowLeftRight size={16} /><span className="hidden sm:inline">{me.role === 'business' ? 'Vendor' : me.role === 'vendor' ? 'Customer' : 'Vendor'}</span></button>}
          <button onClick={() => nav.go('c_location')} className="hidden max-w-[210px] truncate rounded-xl bg-ink-50 px-3 py-2 text-left text-xs font-bold text-ink-700 hover:bg-brand-50 sm:block" title={t('searchLocation')}><MapPin size={14} className="mr-1 inline text-brand-700" />{locale.city || 'Jaipur'}{locale.pincode ? ` ${locale.pincode}` : ''}, {locale.state || 'Rajasthan'}, {locale.countryName || 'India'}</button>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="hidden h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50 sm:flex" aria-label="Switch language"><Globe size={17} /><span>{lang === 'en' ? 'EN' : 'हि'}</span></button>
          <button onClick={() => nav.go('notifications')} className="relative grid size-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-50" aria-label="Notifications"><Bell size={19} /></button>
          {(workspaceHeader || workspaceTheme) && <ThemeToggle className="vv-workspace-theme-toggle" />}
          {!me.loggedIn && <button onClick={() => nav.go('login')} className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700">Sign in</button>}
        </div>
      </div>
      <div className="sr-only" aria-live="polite">{screen.title}</div>
    </header>
  )
}

function AgentSidebar({ collapsed, onToggle, onNavigate, onLogout, me, t, activeId }) {
  return (
    <aside className={cx('vv-agent-sidebar', collapsed && 'is-collapsed')} aria-label="Sales Agent navigation">
      <div className="vv-agent-sidebar-brand">
        <Logo size={40} blue />
        {!collapsed && <div className="vv-agent-sidebar-brand-copy"><b>VendorVerse</b><span>Sales workspace</span></div>}
        <button className="vv-agent-sidebar-toggle" type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="vv-agent-sidebar-nav" aria-label="Sales Agent pages">
        {TABS.agent.map((tab) => {
          const Icon = tab.icon
          const selected = activeId === tab.id
            || (tab.id === 'a_leads' && ['a_lead', 'a_lead_new', 'a_log', 'a_onboard'].includes(activeId))
            || (tab.id === 'a_profile' && ['a_tasks', 'a_perms', 'a_earnings'].includes(activeId))
          return <button key={tab.id} type="button" className={cx('vv-agent-sidebar-link', selected && 'is-active')} onClick={() => onNavigate(tab.id)} aria-current={selected ? 'page' : undefined} title={collapsed ? t(tab.k) : undefined}>
            <Icon size={19} />{!collapsed && <span>{t(tab.k)}</span>}
          </button>
        })}
      </nav>
      <div className="vv-agent-sidebar-bottom">
        {!collapsed && <div className="vv-agent-sidebar-user"><span className="vv-agent-sidebar-avatar">{(me.name || 'Neha Verma').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><b>{me.name || 'Neha Verma'}</b><small>Sales Agent</small></span></div>}
        <button type="button" className="vv-agent-sidebar-logout" onClick={onLogout} title={collapsed ? 'Log out' : undefined}><LogOut size={18} />{!collapsed && <span>Log out</span>}</button>
      </div>
    </aside>
  )
}

function AdminSidebar({ collapsed, onToggle, onNavigate, onLogout, me, t, activeId }) {
  return (
    <aside className={cx('vv-agent-sidebar vv-admin-sidebar', collapsed && 'is-collapsed')} aria-label="Super Admin navigation">
      <div className="vv-agent-sidebar-brand">
        <Logo size={40} />
        {!collapsed && <div className="vv-agent-sidebar-brand-copy"><b>VendorVerse</b><span>Admin workspace</span></div>}
        <button className="vv-agent-sidebar-toggle" type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="vv-agent-sidebar-nav vv-admin-sidebar-nav" aria-label="Admin pages">
        {ADMIN_SIDEBAR.map((group) => <div key={group.label} className="vv-admin-sidebar-group"><p className="vv-admin-sidebar-label">{collapsed ? '' : group.label}</p>{group.items.map((item) => { const Icon = item.icon; const selected = activeId === item.id; return <button key={item.id} type="button" className={cx('vv-agent-sidebar-link', selected && 'is-active')} onClick={() => onNavigate(item.id)} aria-current={selected ? 'page' : undefined} title={collapsed ? item.label : undefined}><Icon size={19} />{!collapsed && <span>{item.label}</span>}</button> })}</div>)}
      </nav>
      <div className="vv-agent-sidebar-bottom">
        {!collapsed && <div className="vv-agent-sidebar-user"><span className="vv-agent-sidebar-avatar">{(me.name || 'Priya Nair').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><b>{me.name || 'Priya Nair'}</b><small>Super Admin</small></span></div>}
        <button type="button" className="vv-agent-sidebar-logout" onClick={onLogout} title={collapsed ? 'Log out' : undefined}><LogOut size={18} />{!collapsed && <span>Log out</span>}</button>
      </div>
    </aside>
  )
}

function Shell() {
  const nav = useNav()
  const { me, setMe, t } = useApp()
  const { w } = useViewport()
  const [drawer, setDrawer] = useState(false)
  const [agentSidebarCollapsed, setAgentSidebarCollapsed] = useState(false)
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false)
  const desktop = w >= 768
  const showAgentSidebar = me.role === 'agent' && ((SCREENS[nav.id] || {}).role === 'agent' || nav.id === 'notifications')
  const adminSidebarIds = ADMIN_SIDEBAR.flatMap((group) => group.items.map((item) => item.id)).concat(['ad_approvals', 'ad_more', 'ad_vendors', 'ad_vendor', 'ad_vendor_new', 'ad_listings', 'ad_listing', 'ad_users', 'ad_user', 'ad_roles', 'ad_category', 'ad_agent', 'ad_case', 'ad_sub', 'ad_cat_new'])
  const showAdminSidebar = me.role === 'admin' && adminSidebarIds.includes(nav.id)
  const showBusinessWorkspace = me.role === 'business' && ['b_home', 'b_company', 'b_services', 'b_messages', 'b_more'].includes(nav.id)
  const showVendorWorkspace = (['vendor', 'business'].includes(me.role) && ((SCREENS[nav.id] || {}).role === 'vendor' || ['messages', 'chat'].includes(nav.id))) || showBusinessWorkspace
  const agentLogout = () => {
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' })
    nav.reset('c_home')
  }
  const adminLogout = () => {
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' })
    nav.reset('c_home')
  }

  const jump = (id) => {
    const reg = SCREENS[id]
    if (reg.role === 'auth') { nav.reset(id, reg.defaultParams || {}); return }
    if (id === 'c_home') { nav.reset('c_home', reg.defaultParams || {}); return }
    const role = reg.role === 'shared' ? (me.role || 'customer') : reg.role
    const canOpen = (role === 'customer' && me.role === 'customer') || canOpenRoute(me, role)
    if (!canOpen) { nav.reset('login', { role, next: id, nextParams: reg.defaultParams || {} }); return }
    nav.reset(id, reg.defaultParams || {})
  }

  // deep links: /#/c_home opens that screen; the hash follows navigation
  useEffect(() => {
    if (SCREENS[INITIAL_SCREEN]) jump(INITIAL_SCREEN)
  }, [])
  useEffect(() => { window.history.replaceState(null, '', `#/${nav.id}`) }, [nav.id])
  // typing a link or using the browser back/forward buttons changes the hash: follow it
  useEffect(() => {
    const onHash = () => { const id = window.location.hash.replace(/^#\/?/, ''); if (SCREENS[id] && id !== nav.id) jump(id) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [nav.id, me.role, me.loggedIn])

  return (
    <div className={cx('flex h-full min-h-0 bg-white', showAgentSidebar ? 'vv-agent-shell' : showAdminSidebar ? 'vv-admin-shell' : 'flex-col', showAgentSidebar && agentSidebarCollapsed && 'is-agent-sidebar-collapsed', showVendorWorkspace && 'vv-global-vendor-shell', showBusinessWorkspace && 'vv-business-shell')}>
      {showAgentSidebar && <AgentSidebar collapsed={agentSidebarCollapsed} onToggle={() => setAgentSidebarCollapsed((value) => !value)} onNavigate={(id) => nav.reset(id)} onLogout={agentLogout} me={me} t={t} activeId={nav.id} />}
      {showAdminSidebar && <AdminSidebar collapsed={adminSidebarCollapsed} onToggle={() => setAdminSidebarCollapsed((value) => !value)} onNavigate={jump} onLogout={adminLogout} me={me} t={t} activeId={nav.id} />}
      <div className={cx('flex min-h-0 min-w-0 flex-1 flex-col', showAgentSidebar && 'vv-agent-main', showAdminSidebar && 'vv-admin-main')}>
        {!showVendorWorkspace && <WebHeader onMenu={() => setDrawer(true)} hideTabs={showAgentSidebar || showAdminSidebar} blueBrand={showAgentSidebar} workspaceTheme={showAgentSidebar} />}
        <main className={cx('relative flex min-h-0 flex-1 flex-col bg-white', showAgentSidebar && 'vv-agent-main-content')}>
          <Phone frame={false} scale={1} web={desktop} onMenu={() => setDrawer(true)} />
        </main>
      </div>
      {drawer && <div className="fixed inset-0 z-[80] flex justify-start"><div className="absolute inset-0 animate-fade-in bg-ink-900/45" onClick={() => setDrawer(false)} /><div className="relative h-full w-[min(360px,92vw)] animate-slide-in border-r border-ink-200 shadow-2xl"><Directory onJump={jump} onClose={() => setDrawer(false)} /></div></div>}
    </div>
  )
}

function Root() {
  const { me } = useApp()
  return (
    <NavProvider fallbackHome={() => HOME[me.role] || 'c_home'}>
      <Shell />
    </NavProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </ThemeProvider>
  )
}

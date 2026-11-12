import { useEffect, useMemo, useState } from 'react'
import { Battery, Signal, Wifi, Search, X, LayoutGrid, CheckCircle2, AlertTriangle, FileCheck2, Users2, Target, Workflow, ListChecks, ChevronDown, ChevronUp, Ban } from 'lucide-react'
import { AppProvider, useApp } from './store.jsx'
import { JOURNEYS } from './mvpdata.jsx'
import { NavProvider, useNav } from './nav.jsx'
import { HOME, TABS, ROLES, VISIBLE_ROLES, isHiddenRole } from './roles.js'
import { SCREENS, GROUPS, phaseOf } from './registry.jsx'
import { ME } from './data.jsx'
import { Logo } from './screens/auth.jsx'
import { SECTIONS, SCENARIOS, BOOKING_STATES, VERIFICATION_STATES, GATES, DEFERRED, ROLE_TABLE } from './specs.js'
import { CFG } from './data.jsx'
import { cx, PhaseTag } from './ui.jsx'
import { ROADMAP, PHASES } from './globaldata.jsx'

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
  const { me, t, threads, vendors, leads, listings, bookings, cases } = useApp()
  const tabs = TABS[me.role] || []
  // a vendor searching to buy stays inside the Buy tab
  const cur = me.role === 'vendor' && ['c_explore', 'c_explore_suppliers'].includes(nav.id) ? 'v_buy' : nav.id
  if (!tabs.some((x) => x.id === cur)) return null
  const badge = (id) => {
    if (id === 'messages') return (me.role === 'business' ? threads.business.filter((x) => x.bizId === me.bizId) : me.role === 'vendor' ? threads.vendor : threads.customer.filter((x) => x.owner === me.name)).reduce((s, x) => s + x.unread, 0)
    if (id === 'v_work') return bookings.filter((b) => b.vendorId === me.vendorId && b.state === 'requested').length
    if (id === 'c_activity') return bookings.filter((b) => b.customer === me.name && ['awaiting', 'requested'].includes(b.state)).length
    if (id === 'ad_approvals') return vendors.filter((v) => ['submitted', 'more_info'].includes(v.ver)).length + listings.filter((l) => l.review === 'pending').length + cases.filter((c) => c.status === 'triage').length
    if (id === 'a_followups') return leads.filter((l) => l.next?.date && new Date(l.next.date) <= new Date('19 Oct 2026')).length
    return 0
  }
  return (
    <nav className="z-20 flex shrink-0 items-center justify-between gap-1 border-t border-ink-100 bg-white/95 px-3 pb-1.5 pt-2 shadow-[0_-8px_24px_-14px_rgba(20,40,75,0.25)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-1">
      {tabs.map((x) => {
        const on = x.id === cur
        const n = badge(x.id)
        return (
          <button key={x.id} aria-label={t(x.k)} onClick={() => x.id !== nav.id && nav.reset(x.id)} className={cx('relative flex h-11 items-center justify-center gap-1.5 rounded-full transition-all duration-300 active:scale-90', on ? 'flex-[2.1] bg-brand-600 px-3 text-white shadow-md shadow-brand-700/30' : 'flex-1 text-ink-400 hover:bg-ink-50')}>
            <x.icon size={21} strokeWidth={on ? 2.4 : 2} className="shrink-0" />
            {on && <span className="truncate text-[12.5px] font-bold">{t(x.k)}</span>}
            {n > 0 && <span className={cx('absolute grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white ring-2', on ? 'right-1.5 top-0.5 ring-brand-600' : 'right-2 top-0.5 ring-white')}>{n}</span>}
          </button>
        )
      })}
      </div>
    </nav>
  )
}

function Toast() {
  const { toastMsg } = useApp()
  if (!toastMsg) return null
  const warn = toastMsg.tone === 'warn'
  return (
    <div key={toastMsg.id} className={cx('pointer-events-none absolute inset-x-4 top-3 z-[60] flex animate-toast items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-semibold text-white shadow-xl', warn ? 'bg-amber-600' : 'bg-ink-900')}>
      {warn ? <AlertTriangle size={17} className="shrink-0" /> : <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />}
      {toastMsg.msg}
    </div>
  )
}

function ScreenHost() {
  const nav = useNav()
  const reg = SCREENS[nav.id] || SCREENS.welcome
  const C = reg.C
  return (
    <div key={`${nav.epoch}-${nav.depth}-${nav.id}`} className={cx('h-full', nav.dir === 'push' ? 'animate-slide-in' : 'animate-fade-in')}>
      <C params={nav.params || {}} />
    </div>
  )
}

export const DEVICES = [{ id: 'se', label: 'Small', w: 320, h: 640 }, { id: 'std', label: 'Phone', w: 390, h: 844 }, { id: 'max', label: 'Large', w: 430, h: 900 }, { id: 'tab', label: 'Tablet', w: 768, h: 1000 }]
function GuideBar() {
  const { journey, setJourney } = useApp()
  if (!journey) return null
  const j = JOURNEYS.find((x) => x.id === journey.id)
  if (!j) return null
  const last = journey.step >= j.steps.length - 1
  const go = (i) => { setJourney({ id: j.id, step: i }); window.dispatchEvent(new CustomEvent('vv-jump', { detail: j.steps[i][1] })) }
  return (
    <div className="z-30 flex shrink-0 items-center gap-2 bg-ink-900 px-3 py-1.5 text-white">
      <span className="shrink-0 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold">{j.id}</span>
      <p className="min-w-0 flex-1 truncate text-[11.5px] font-medium">Step {journey.step + 1}/{j.steps.length} · {j.steps[journey.step][0]}</p>
      {journey.step > 0 && <button onClick={() => go(journey.step - 1)} className="text-[11px] font-bold text-white/70">Prev</button>}
      {!last ? <button onClick={() => go(journey.step + 1)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink-900">Next</button> : <button onClick={() => setJourney(null)} className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold">Done</button>}
      <button aria-label="Exit guided mode" onClick={() => setJourney(null)} className="text-white/60"><X size={14} /></button>
    </div>
  )
}

function Phone({ frame, scale, dev = DEVICES[1] }) {
  const nav = useNav()
  const reg = SCREENS[nav.id] || SCREENS.welcome
  const inner = (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
      {frame && <StatusBar tone={reg.bar} />}
      <div className={cx('relative flex min-h-0 flex-1 flex-col', frame && 'pt-11')}>
        <GuideBar />
        <div className="relative min-h-0 flex-1"><ScreenHost /><Toast /></div>
        <TabBar />
        {frame && <div className="h-5 shrink-0 bg-white" />}
      </div>
      {frame && <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-40 h-1.5 w-32 -translate-x-1/2 rounded-full bg-ink-900/85" />}
    </div>
  )
  if (!frame) return <div className="h-full w-full">{inner}</div>
  return (
    <div data-phone style={{ width: (dev.w + 20) * scale, height: (dev.h + 20) * scale }}>
      <div style={{ width: dev.w + 20, height: dev.h + 20, transform: `scale(${scale})`, transformOrigin: 'top left' }} className={cx('border-[10px] border-ink-900 bg-ink-900 shadow-[0_30px_80px_-20px_rgba(20,40,75,0.55)]', dev.w > 600 ? 'rounded-[36px]' : 'rounded-[56px]')}>
        <div className={cx('h-full w-full overflow-hidden', dev.w > 600 ? 'rounded-[26px]' : 'rounded-[46px]')}>{inner}</div>
      </div>
    </div>
  )
}

/* ---------- left: screen directory ---------- */
function Directory({ onJump, onClose }) {
  const nav = useNav()
  const { me } = useApp()
  const [grp, setGrp] = useState(SCREENS[nav.id]?.role === 'shared' ? me.role || 'customer' : SCREENS[nav.id]?.role || 'auth')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const all = Object.values(SCREENS).filter((s) => !isHiddenRole(s.role))
    if (q) return all.filter((s) => (s.title + s.id + s.sec.join(' ') + s.sc.join(' ')).toLowerCase().includes(q.toLowerCase()))
    return all.filter((s) => s.role === grp || (s.role === 'shared' && (grp === 'customer' || grp === 'vendor')))
  }, [grp, q])
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
        <Logo size={38} />
        <div className="min-w-0 flex-1"><h1 className="text-[17px] font-extrabold leading-tight tracking-tight">VendorVerse</h1><p className="text-[11px] font-medium text-ink-500">Release 1 mockup · Spec of 19 Oct 2026</p></div>
        {onClose && <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-ink-100"><X size={20} /></button>}
      </div>
      <div className="space-y-3 px-4 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Switch role</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${VISIBLE_ROLES.length}, minmax(0, 1fr))` }}>
          {VISIBLE_ROLES.map((r) => {
            const on = me.loggedIn && me.role === r.id
            return <button key={r.id} onClick={() => { onJump(HOME[r.id]); setGrp(r.id); setQ('') }} className={cx('rounded-lg py-2 text-[11px] font-bold ring-1 ring-inset transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-600 ring-ink-200 hover:bg-ink-50')}>{r.short}</button>
          })}
        </div>
        <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${Object.keys(SCREENS).length} screens, §8 or SC-012`} className="h-10 w-full rounded-lg bg-ink-50 pl-9 pr-3 text-[13px] outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /></div>
        {!q && (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {GROUPS.filter((g) => !isHiddenRole(g.id)).map((g) => <button key={g.id} onClick={() => setGrp(g.id)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition', grp === g.id ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200')}>{g.label} <span className="opacity-60">{Object.values(SCREENS).filter((s) => s.role === g.id).length}</span></button>)}
          </div>
        )}
      </div>
      <div className="thin-scroll mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {list.map((s) => (
          <button key={s.id} onClick={() => { onJump(s.id); onClose?.() }} className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition', nav.id === s.id ? 'bg-brand-50' : 'hover:bg-ink-50')}>
            <span className={cx('size-1.5 shrink-0 rounded-full', nav.id === s.id ? 'bg-brand-600' : 'bg-ink-200')} />
            <span className={cx('min-w-0 flex-1 truncate text-[13px] font-semibold', nav.id === s.id ? 'text-brand-800' : 'text-ink-800')}>{s.title}</span>
            <span className="flex shrink-0 gap-1">{s.sec.slice(0, 2).map((f) => <span key={f} className="rounded bg-ink-100 px-1.5 py-0.5 text-[9.5px] font-bold text-ink-500">{SECTIONS[f]?.n}</span>)}{s.sc.length > 0 && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-bold text-brand-700">{s.sc.length} SC</span>}{phaseOf(s.id) !== 'MVP' && <PhaseTag p={phaseOf(s.id)} />}</span>
          </button>
        ))}
        {list.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No screens match.</p>}
      </div>
    </div>
  )
}

/* ---------- right: requirement panel ---------- */
function SpecPanel() {
  const nav = useNav()
  const reg = SCREENS[nav.id] || SCREENS.welcome
  const [tab, setTab] = useState('screen')
  const [openSc, setOpenSc] = useState(null)
  const tabs = [['screen', 'This screen'], ['road', 'MVP vs future'], ['sc', 'Scenarios'], ['states', 'States'], ['roles', 'Roles'], ['gates', 'Release gates'], ['scope', 'Scope & config']]
  const List = ({ items, icon: I = CheckCircle2, tone = 'text-brand-600' }) => <ul className="space-y-2.5">{items.map((x) => <li key={x} className="flex gap-2.5 text-[13px] leading-snug text-ink-700"><I size={16} className={cx('mt-0.5 shrink-0', tone)} />{x}</li>)}</ul>
  const coverage = (id) => Object.values(SCREENS).filter((x) => x.sc.includes(id))
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-ink-100 px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Product requirements · 19 Oct 2026</p>
        <h2 className="mt-1 text-[17px] font-extrabold leading-tight">{tab === 'screen' ? reg.title : tabs.find((t) => t[0] === tab)[1]}</h2>
        {tab === 'screen' && <p className="mt-1 text-xs text-ink-500">Screen id <code className="rounded bg-ink-100 px-1 py-0.5 text-[11px]">{reg.id}</code> · {reg.role === 'shared' ? 'Shared' : ROLES.find((r) => r.id === reg.role)?.label || 'Public'}</p>}
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-ink-100 px-4 py-2.5">
        {tabs.map(([id, l]) => <button key={id} onClick={() => setTab(id)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition', tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200')}>{l}</button>)}
      </div>
      <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'screen' && (
          <>
            {reg.sec.map((k) => (
              <div key={k} className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100">
                <div className="flex items-center gap-2"><span className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">{SECTIONS[k].n}</span><p className="text-sm font-bold">{SECTIONS[k].title}</p></div>
                <div className="mt-3"><List items={SECTIONS[k].items} /></div>
              </div>
            ))}
            {reg.sc.length > 0 && (
              <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
                <p className="mb-2.5 text-sm font-bold text-brand-900">Scenarios this screen demonstrates</p>
                <div className="space-y-2.5">{reg.sc.map((id) => <div key={id}><p className="text-[12px] font-extrabold text-brand-800">{id} · {SCENARIOS[id][0]}</p><p className="text-[12.5px] leading-snug text-ink-700">{SCENARIOS[id][1]}</p></div>)}</div>
              </div>
            )}
            {!reg.sec.length && <p className="text-sm text-ink-500">No requirements mapped.</p>}
          </>
        )}
        {tab === 'road' && (
          <div className="space-y-4">
            <p className="text-xs text-ink-500">Every capability of the long-term vision, separated by release. Screens for Phase 2 / 3 features are in the mockup and tagged.</p>
            {ROADMAP.map((p) => (
              <div key={p.pillar} className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100"><p className="mb-2 text-sm font-extrabold">{p.pillar}</p><div className="space-y-2">{p.items.map(([t, x]) => <div key={t} className="flex items-start gap-2"><PhaseTag p={x} className="mt-0.5 shrink-0" /><p className="text-[12.5px] leading-snug text-ink-700">{t}</p></div>)}</div></div>
            ))}
          </div>
        )}
        {tab === 'sc' && (
          <div className="space-y-2">
            <p className="text-xs text-ink-500">All 40 end-to-end scenarios. Tap one to see which screens demonstrate it.</p>
            {Object.entries(SCENARIOS).map(([id, [t, d]]) => {
              const scr = coverage(id)
              const on = openSc === id
              return (
                <div key={id} className="rounded-2xl bg-ink-50 ring-1 ring-ink-100">
                  <button onClick={() => setOpenSc(on ? null : id)} className="flex w-full items-center gap-2 p-3 text-left"><span className="rounded-md bg-ink-900 px-1.5 py-0.5 text-[10.5px] font-extrabold text-white">{id.replace('SC-', '')}</span><span className="flex-1 text-[13px] font-bold">{t}</span><span className={cx('text-[10.5px] font-bold', scr.length ? 'text-emerald-600' : 'text-ink-400')}>{scr.length ? `${scr.length} screen${scr.length > 1 ? 's' : ''}` : 'server rule'}</span>{on ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                  {on && <div className="space-y-1.5 border-t border-ink-100 px-3 pb-3 pt-2"><p className="text-[12.5px] leading-snug text-ink-700">{d}</p>{scr.map((x) => <button key={x.id} onClick={() => window.dispatchEvent(new CustomEvent('vv-jump', { detail: x.id }))} className="mr-1.5 mt-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">{x.title}</button>)}</div>}
                </div>
              )
            })}
          </div>
        )}
        {tab === 'states' && (
          <>
            <p className="text-sm font-bold">Booking states (§8.2)</p>
            {BOOKING_STATES.map(([a, b, c]) => <div key={a} className="rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-100"><p className="text-[13px] font-bold">{a}</p><p className="text-xs text-ink-600"><b>Entry:</b> {b}</p><p className="text-xs text-ink-600"><b>Next:</b> {c}</p></div>)}
            <p className="pt-2 text-sm font-bold">Verification status (§5.2)</p>
            {VERIFICATION_STATES.map(([a, b, c]) => <div key={a} className="rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-100"><p className="text-[13px] font-bold">{a}</p><p className="text-xs text-ink-600">{b}</p><p className="text-xs text-ink-600"><b>Publication:</b> {c}</p></div>)}
          </>
        )}
        {tab === 'roles' && ROLE_TABLE.map(([r, d]) => <div key={r} className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100"><p className="flex items-center gap-2 text-sm font-bold"><Users2 size={16} className="text-brand-600" />{r}</p><p className="mt-1.5 text-[13px] leading-snug text-ink-600">{d}</p></div>)}
        {tab === 'gates' && <List items={GATES.map(([a, b]) => `${a}: ${b}`)} icon={FileCheck2} tone="text-emerald-600" />}
        {tab === 'scope' && (
          <>
            <p className="text-sm font-bold">Deferred (not in Release 1)</p>
            <List items={DEFERRED} icon={Ban} tone="text-violet-600" />
            <p className="pt-2 text-sm font-bold">Open configuration register (§23)</p>
            <div className="space-y-2">{CFG.map(([id, t, o, d, st]) => <div key={id} className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100"><p className="text-[12px] font-extrabold text-ink-700">{id} · {t} <span className={cx('ml-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold', st === 'sample' ? 'bg-amber-100 text-amber-800' : 'bg-ink-200 text-ink-600')}>{st === 'sample' ? 'sample values in mockup' : 'open'}</span></p><p className="text-[12px] text-ink-600">{d}</p></div>)}</div>
          </>
        )}
      </div>
      <div className="border-t border-ink-100 px-5 py-3 text-[11px] text-ink-400">ADRS Techno Private Limited · Release 1 · Confidential working specification</div>
    </div>
  )
}

function Shell() {
  const nav = useNav()
  const { me, setMe, setLang } = useApp()
  const { w, h } = useViewport()
  const [drawer, setDrawer] = useState(false)
  const mobile = w < 560
  const desk = w >= 1024
  const wide = w >= 1320
  const [devId, setDevId] = useState('std')
  const dev = DEVICES.find((d) => d.id === devId)
  const scale = Math.min(1, (h - 96) / (dev.h + 20), (w - (desk ? 310 : 0) - (wide ? 380 : 0) - 32) / (dev.w + 20))

  const jump = (id) => {
    const reg = SCREENS[id]
    if (reg.role === 'auth') setMe({ ...me, role: null, loggedIn: false, guest: false })
    else if (reg.role === 'shared') { if (!['customer', 'vendor'].includes(me.role)) setMe({ ...me, role: 'customer', loggedIn: true, guest: false, vendorId: null, hasVendor: false, name: ME.customer }) }
    else if (reg.as === 'vbuyer') setMe({ ...me, role: 'vendor', loggedIn: true, guest: false, vendorId: 'v-me', hasVendor: true, name: ME.vendor })
    else setMe({ ...me, role: reg.role, loggedIn: true, guest: false, vendorId: reg.role === 'vendor' ? 'v-me' : null, hasVendor: reg.role === 'vendor', bizId: reg.role === 'business' ? 'biz-me' : null, name: ME[reg.role] })
    nav.reset(id, reg.demo || {})
  }

  // deep links: /#/c_home opens that screen; the hash follows navigation
  useEffect(() => {
    if (SCREENS[INITIAL_SCREEN]) jump(INITIAL_SCREEN)
  }, [])
  useEffect(() => { window.history.replaceState(null, '', `#/${nav.id}`) }, [nav.id])
  useEffect(() => { const h = (e) => jump(e.detail); window.addEventListener('vv-jump', h); return () => window.removeEventListener('vv-jump', h) })

  return (
    <div className="flex h-full bg-[#e9eef4]">
      {desk && <aside className="w-[310px] shrink-0 border-r border-ink-200"><Directory onJump={jump} /></aside>}
      <main className={cx('relative flex min-w-0 flex-1 items-center justify-center', !mobile && 'bg-[radial-gradient(circle_at_30%_20%,#f4f8fc,#dfe7f0)]')}>
        {mobile ? (
          <div className="h-full w-full max-w-[560px]"><Phone frame={false} scale={1} /></div>
        ) : <div className="flex flex-col items-center gap-3"><div className="flex gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-ink-200 backdrop-blur">{DEVICES.map((d) => <button key={d.id} onClick={() => setDevId(d.id)} className={cx('rounded-full px-3 py-1.5 text-[11px] font-bold transition', devId === d.id ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100')}>{d.label} <span className="opacity-60">{d.w}</span></button>)}</div><Phone frame scale={scale} dev={dev} /></div>}
        {!desk && (
          <button onClick={() => setDrawer(true)} aria-label="Open screen directory" className="fixed right-0 top-1/2 z-[70] flex h-14 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg bg-ink-900/85 text-white shadow-lg backdrop-blur">
            <LayoutGrid size={14} />
          </button>
        )}
      </main>
      {wide && <aside className="w-[380px] shrink-0 border-l border-ink-200"><SpecPanel /></aside>}
      {drawer && !desk && (
        <div className="fixed inset-0 z-[80] flex">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/50" onClick={() => setDrawer(false)} />
          <div className="relative h-full w-[min(340px,88vw)] animate-slide-in shadow-2xl"><Directory onJump={jump} onClose={() => setDrawer(false)} /></div>
        </div>
      )}
    </div>
  )
}

function Root() {
  const { me } = useApp()
  return (
    <NavProvider fallbackHome={() => HOME[me.role] || 'welcome'}>
      <Shell />
    </NavProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  )
}


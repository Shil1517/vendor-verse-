import { validateReviewDecision } from '../services/verification.js'
import { useMemo, useState } from 'react'
import {
  ShieldCheck, Package, Users, Store, CalendarCheck, FileText, IndianRupee, UserPlus, AlertTriangle, ChevronRight, Check, X, Layers, Tag, Settings,
  ScrollText, LogOut, BarChart3, Download, Plus, Trash2, Lock, Percent, MapPin, Gift, Bell, Gavel, Wallet, Search, Eye, Ban, RotateCcw, KeyRound, Briefcase,
  CircleDollarSign, CheckCircle2, ListChecks, ClipboardCheck, GitBranch, FileSearch, BadgeCheck, MessageSquareWarning, MessageSquare, Sparkles,
} from 'lucide-react'
import { P2Badge } from './blocks.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, cat, REPORT, ME } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Banner, EmptyState, Stat, KV, fmt, cx,
  Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar, DocTile, HBar, BarChart, Spark, SearchBar, SOFT, GRAD, Checkbox,
} from '../ui.jsx'
import { NotifBell, VerifiedBadge, vendorKind } from './shared.jsx'

const INDUSTRIES = ['Construction & Infrastructure', 'Electrical & Energy', 'Office & Technology', 'Home & Facilities', 'Food & Events', 'Professional Services']

/* ================= DASHBOARD ================= */
export function AdminDashboard() {
  const nav = useNav()
  const { vendors, rfqs, listings, disputes, users, agents, leads, threads } = useApp()
  const pendV = vendors.filter((v) => ['submitted', 'info'].includes(v.status)).length
  const pendL = listings.filter((l) => l.status === 'pending').length
  const openD = disputes.filter((d) => ['open', 'under_review', 'escalated'].includes(d.status)).length
  const conv = leads.filter((l) => l.stage === 'Approved/Converted').length + agents.reduce((s, a) => s + a.converted, 0)
  return (
    <Screen headerless pad={false}>
      <div className="bg-gradient-to-b from-ink-900 to-ink-800 px-4 pb-14 pt-3 text-white">
        <div className="flex items-center justify-between"><div><p className="text-xs text-white/60">Super Admin</p><h1 className="text-xl font-extrabold">Marketplace overview</h1></div><div className="[&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:ring-ink-900"><NotifBell role="admin" /></div></div>
        <p className="mt-1 text-xs text-white/60">19 Oct 2026 · All locations</p>
      </div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Registrations (6w)" value={REPORT.registrations.reduce((a, b) => a + b, 0)} icon={UserPlus} tone="sky" delta="+33%" onClick={() => nav.go('ad_users')} />
          <Stat label="Active vendors" value={vendors.filter((v) => v.status === 'approved').length} icon={Store} tone="amber" delta="+2" onClick={() => nav.go('ad_vendors')} />
          <Stat label="Conversations" value={threads.customer.length + 214} icon={MessageSquare} tone="violet" delta="+9%" onClick={() => nav.go('ad_reports')} />
          <Stat label="Live listings" value={listings.filter((l) => l.status === 'approved').length + 120} icon={Package} tone="emerald" delta="+14%" onClick={() => nav.go('ad_listings')} />
          <Stat label="RFQs" value={rfqs.length + 41} icon={FileText} tone="rose" delta="+6%" onClick={() => nav.go('ad_reports')} />
          <Stat label="Verified vendors %" value="78%" icon={ShieldCheck} tone="teal" delta="+5%" onClick={() => nav.go('ad_vendors')} />
        </div>
        <Card><div className="flex items-center justify-between"><div><p className="text-sm font-bold">New registrations</p><p className="text-xs text-ink-500">Customers + vendors, weekly</p></div><Badge tone="green">+33%</Badge></div><div className="mt-3"><BarChart data={REPORT.weeks.map((w, i) => ({ label: w, value: REPORT.registrations[i] }))} height={96} /></div></Card>
        <Section title="Needs attention">
          <Group>
            <ListRow icon={ShieldCheck} tone="amber" title="Vendor verifications" subtitle={`${pendV} awaiting review`} right={<Badge tone="amber">{pendV}</Badge>} onClick={() => nav.go('ad_vendors')} />
            <ListRow icon={Package} tone="indigo" title="Listings to moderate" subtitle={`${pendL} pending`} right={<Badge tone="blue">{pendL}</Badge>} onClick={() => nav.go('ad_listings')} />
            <ListRow icon={MessageSquareWarning} tone="rose" title="Open cases" subtitle={`${openD} need action`} right={<Badge tone="red">{openD}</Badge>} onClick={() => nav.go('ad_cases')} last />
          </Group>
        </Section>
        <Section title="Sales agents" action="Manage" onAction={() => nav.go('ad_agents')}>
          <Card className="flex items-center justify-between"><div><p className="text-2xl font-extrabold">{conv}</p><p className="text-xs text-ink-500">Conversions via agents</p></div><Spark points={REPORT.vendorSpark} /></Card>
        </Section>
      </div>
    </Screen>
  )
}

export function AdminReferenceDashboard() {
  const nav = useNav()
  const { vendors, rfqs, listings, disputes, agents, users, toast } = useApp()
  const approved = vendors.filter((v) => v.status === 'approved')
  const pending = vendors.filter((v) => ['submitted', 'info'].includes(v.status))
  const openDisputes = disputes.filter((d) => ['open', 'under_review', 'escalated'].includes(d.status))
  const recent = vendors.filter((v) => ['approved', 'submitted', 'info'].includes(v.status)).slice(-5).reverse()
  const health = [['Active vendors', approved.length, vendors.length ? Math.round((approved.length / vendors.length) * 100) : 0, 'bg-emerald-500'], ['Incomplete vendors', pending.length, vendors.length ? Math.round((pending.length / vendors.length) * 100) : 0, 'bg-amber-400'], ['Active agents', agents.filter((a) => a.status === 'active').length, agents.length ? Math.round((agents.filter((a) => a.status === 'active').length / agents.length) * 100) : 0, 'bg-rose-500']]
  return <Screen headerless pad={false}><div className="vv-admin-reference-dashboard"><div className="vv-admin-reference-heading"><div><p>Live platform overview</p><h1>Admin Dashboard</h1></div><Badge tone="green">Live</Badge></div><div className="vv-admin-reference-kpis"><Stat label="Total vendors" value={vendors.length} icon={Store} tone="violet" delta={`↗ ${approved.length} active`} onClick={() => nav.go('ad_vendors')} /><Stat label="Registered agents" value={agents.length} icon={Users} tone="rose" delta={`↗ ${agents.filter((a) => a.status === 'active').length} active`} onClick={() => nav.go('ad_agents')} /><Stat label="Open cases" value={openDisputes.length} icon={Gavel} tone="amber" delta="↗ Check cases" onClick={() => nav.go('ad_cases')} /><Stat label="Platform status" value="Live" icon={MessageSquare} tone="emerald" delta="↗ All systems ready" onClick={() => toast('All platform systems are running')} /></div><div className="vv-admin-reference-grid"><Card className="vv-admin-reference-panel !p-0"><div className="vv-admin-reference-panel-head"><div><h2>Recent vendors</h2><p>Latest accounts and verification activity</p></div><Button size="sm" variant="secondary" onClick={() => nav.go('ad_vendors')}>View all</Button></div><div className="vv-admin-reference-table-head"><span>Vendor</span><span>Owner</span><span>Category</span><span>Status</span></div>{recent.map((v) => <button key={v.id} onClick={() => nav.go('ad_vendor', { id: v.id })} className="vv-admin-reference-row"><span className="font-bold">{v.name}</span><span>{v.owner}</span><span>{cat(v.cat).name}</span><StatusBadge s={v.status} /></button>)}{!recent.length && <EmptyState icon={Store} title="No vendors yet" />}</Card><div className="space-y-4"><Card className="vv-admin-reference-panel"><h2>Platform health</h2>{health.map(([label, value, pct, color]) => <div key={label} className="mt-4"><div className="flex justify-between text-xs font-semibold text-ink-600"><span>{label}</span><span>{value}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100"><div className={cx('h-full rounded-full', color)} style={{ width: `${Math.max(pct, value ? 8 : 0)}%` }} /></div></div>)}</Card><Card className="vv-admin-reference-panel"><h2>Pending moderation</h2><button onClick={() => nav.go('ad_cases')} className="vv-admin-moderation-row text-amber-800"><Gavel size={16} />{openDisputes.length} open cases <ChevronRight size={15} /></button><button onClick={() => nav.go('ad_vendors')} className="vv-admin-moderation-row text-rose-800"><ShieldCheck size={16} />{pending.length} incomplete vendors <ChevronRight size={15} /></button><button onClick={() => nav.go('ad_listings')} className="vv-admin-moderation-row text-violet-800"><Package size={16} />{listings.filter((l) => l.status === 'pending').length} pending listings <ChevronRight size={15} /></button></Card></div></div><div className="vv-admin-reference-footer-stats"><button onClick={() => nav.go('ad_users')}><b>{users.length}</b><span>Registered users</span></button><button onClick={() => nav.go('ad_reports')}><b>{rfqs.length}</b><span>Active RFQs</span></button><button onClick={() => nav.go('ad_listings')}><b>{listings.filter((l) => l.status === 'approved').length}</b><span>Live listings</span></button></div></div></Screen>
}

export function AdminFeature({ params = {} }) {
  const { addAudit, toast } = useApp()
  const title = params.title || 'Admin workspace'
  const [query, setQuery] = useState('')
  const [newItem, setNewItem] = useState('')
  const seed = { notifications: ['Vendor verification reminder', 'RFQ response deadline alert'], faqs: ['How verification works', 'How RFQ matching works'], translations: ['English marketplace copy', 'Hindi marketplace copy'], releases: ['Marketplace v1.4', 'RFQ workflow update'], 'assistant-intents': ['Find suppliers', 'Compare quotations'], planning: ['Weekly vendor review', 'RFQ quality audit'], requirements: ['LED lighting for warehouse', 'Recurring cleaning contract'], 'supply-gaps': ['Remote IT providers in Europe', 'Solar installers in Rajasthan'], 'quote-moderation': ['RFQ-315 quotation review', 'RFQ-320 supplier response'], 'profile-images': ['12 vendor profile images pending'] }[params.kind] || ['Review queue', 'Configuration checklist']
  const [items, setItems] = useState(seed.map((name, i) => ({ id: i, name, status: i === 0 ? 'Needs attention' : 'Ready' })))
  const filtered = items.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()))
  const add = () => { if (!newItem.trim()) return; const item = { id: Date.now(), name: newItem.trim(), status: 'New' }; setItems((all) => [item, ...all]); addAudit(`Created ${title.toLowerCase()} item`, item.name, 'setting'); toast('Item added'); setNewItem('') }
  const actionLabel = params.kind === 'notifications' ? 'Send' : params.kind === 'faqs' ? 'Publish' : params.kind === 'profile-images' ? 'Approve' : params.kind === 'quote-moderation' ? 'Review' : 'Mark done'
  const markDone = (item) => { setItems((all) => all.map((x) => x.id === item.id ? { ...x, status: 'Completed' } : x)); addAudit(`${actionLabel} ${title.toLowerCase()} item`, item.name, 'moderation'); toast(params.kind === 'notifications' ? 'Notification sent' : `${actionLabel} completed`) }
  const remove = (item) => { setItems((all) => all.filter((x) => x.id !== item.id)); addAudit(`Deleted ${title.toLowerCase()} item`, item.name, 'moderation'); toast('Item deleted') }
  return <Screen title={title} subtitle="Admin controls and review queue"><Banner tone="blue">This workspace is connected to the same browser-local admin state. Changes are recorded in the audit log.</Banner><SearchBar value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} /><Card><div className="flex gap-2"><Input className="flex-1" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={`Add ${title.toLowerCase()} item`} /><Button onClick={add} icon={Plus}>Add</Button></div></Card><Group>{filtered.map((item, i) => <ListRow key={item.id} icon={params.kind === 'notifications' ? Bell : ClipboardCheck} title={item.name} subtitle={item.status} right={<div className="flex items-center gap-2">{item.status !== 'Completed' ? <Button size="sm" variant="soft" onClick={() => markDone(item)}>{actionLabel}</Button> : <StatusBadge s="completed" />}{params.kind === 'profile-images' && <Button size="sm" variant="dangerSoft" icon={Trash2} onClick={() => remove(item)}>Delete</Button>}</div>} last={i === filtered.length - 1} />)}{!filtered.length && <EmptyState icon={Search} title="Nothing found" body="Try another search or add a new item." />}</Group></Screen>
}

export function AdminRfqWorkspace({ params = {} }) {
  const { addAudit, toast } = useApp()
  const kind = params.kind || 'requirements'
  const configs = {
    requirements: {
      title: 'Requirements', subtitle: 'Review buyer requirements and matching readiness', icon: ClipboardCheck,
      seed: [
        { id: 'REQ-204', primary: 'LED lighting for warehouse', secondary: 'Nova Logistics Pvt Ltd · Electrical & Hardware', meta: 'Budget ₹1,20,000 · 200 units · Jaipur', status: 'New' },
        { id: 'REQ-205', primary: 'Recurring office cleaning', secondary: 'Aria Workspace · Cleaning & Pest Control', meta: 'Monthly · Jaipur · Remote coordination', status: 'Matching' },
      ],
      action: 'Start matching', done: 'Matching started', add: 'Add requirement',
    },
    'supply-gaps': {
      title: 'Supply gaps', subtitle: 'Find categories and locations where buyer demand is underserved', icon: GitBranch,
      seed: [
        { id: 'GAP-021', primary: 'Remote IT providers in Europe', secondary: 'Professional & IT Services · Worldwide', meta: '12 open requirements · 3 matched vendors', status: 'High priority' },
        { id: 'GAP-022', primary: 'Solar installers in Rajasthan', secondary: 'Electrical & Energy · Nationwide', meta: '7 open requirements · 5 matched vendors', status: 'Monitor' },
      ],
      action: 'Mark addressed', done: 'Gap addressed', add: 'Add supply gap',
    },
    'quote-moderation': {
      title: 'Quote moderation', subtitle: 'Review vendor quotations before buyer comparison', icon: FileSearch,
      seed: [
        { id: 'QTE-315', primary: 'BrightSpark Home Services', secondary: 'RFQ-315 · Electrical & Hardware', meta: '₹84,500 · Submitted 2 hours ago', status: 'Needs review' },
        { id: 'QTE-320', primary: 'TechNova Systems', secondary: 'RFQ-320 · Office & IT Supplies', meta: '₹2,40,000 · MOQ 50 · Lead time 14 days', status: 'Needs review' },
      ],
      action: 'Approve quote', done: 'Quote approved', add: 'Add quote review',
    },
  }
  const config = configs[kind] || configs.requirements
  const [query, setQuery] = useState('')
  const [items, setItems] = useState(config.seed)
  const filtered = items.filter((item) => `${item.primary} ${item.secondary} ${item.meta}`.toLowerCase().includes(query.toLowerCase()))
  const update = (item, status = 'Completed') => {
    setItems((all) => all.map((x) => x.id === item.id ? { ...x, status } : x))
    addAudit(config.action, item.primary, 'rfq')
    toast(config.done)
  }
  return <Screen title={config.title} subtitle={config.subtitle}>
    <Banner tone="blue">{kind === 'requirements' ? 'Requirements are matched with eligible vendors based on category, coverage and verification.' : kind === 'supply-gaps' ? 'Supply gaps highlight demand that needs more verified vendors or better geographic coverage.' : 'Only approved quotations move forward to buyer comparison and negotiation.'}</Banner>
    <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} />
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><p className="text-xs text-ink-500">Total records</p><p className="mt-1 text-2xl font-extrabold text-ink-900">{items.length}</p></Card>
      <Card><p className="text-xs text-ink-500">Needs action</p><p className="mt-1 text-2xl font-extrabold text-amber-700">{items.filter((x) => x.status !== 'Completed' && x.status !== 'Addressed' && x.status !== 'Approved').length}</p></Card>
      <Card><p className="text-xs text-ink-500">Completed</p><p className="mt-1 text-2xl font-extrabold text-emerald-700">{items.filter((x) => ['Completed', 'Addressed', 'Approved'].includes(x.status)).length}</p></Card>
    </div>
    <Group>{filtered.map((item, i) => <ListRow key={item.id} icon={config.icon} title={item.primary} subtitle={`${item.id} · ${item.secondary} · ${item.meta}`} right={<div className="flex items-center gap-2"><StatusBadge s={item.status} />{!['Completed', 'Addressed', 'Approved'].includes(item.status) && <Button size="sm" variant="soft" onClick={() => update(item)}>{config.action}</Button>}</div>} last={i === filtered.length - 1} />)}{!filtered.length && <EmptyState icon={Search} title={`No ${config.title.toLowerCase()} found`} body="Try another search term." />}</Group>
    <Button variant="secondary" icon={Plus} onClick={() => { const item = { id: `${kind === 'requirements' ? 'REQ' : kind === 'supply-gaps' ? 'GAP' : 'QTE'}-${Date.now()}`, primary: config.add, secondary: 'New admin record', meta: 'Added in this browser session', status: 'New' }; setItems((all) => [item, ...all]); toast(`${config.add} added`) }}>{config.add}</Button>
  </Screen>
}

export function AdminSettings() {
  const { settings, setSettings, addAudit, toast } = useApp()
  const [draft, setDraft] = useState({ ...settings, coupons: settings.coupons || [] })
  const updatePlan = (id, field, value) => setDraft({ ...draft, plans: draft.plans.map((p) => p.id === id ? { ...p, [field]: field === 'price' ? Number(value.replace(/\D/g, '')) : value } : p) })
  const updateCoupon = (id, field, value) => setDraft({ ...draft, coupons: draft.coupons.map((c) => c.id === id ? { ...c, [field]: field === 'value' ? Number(value.replace(/\D/g, '')) : value } : c) })
  const save = () => { setSettings(draft); addAudit('Updated vendor subscription plans and coupons', 'Commercial settings', 'setting'); toast('Plans and coupons saved') }
  return <Screen title="Platform settings" footer={<Button full size="lg" onClick={save}>Save changes</Button>}>
    <Banner tone="blue">Manage subscription pricing and discount coupons. Changes apply to new vendor purchases in this browser demo.</Banner>
    <Section title="Subscription plans"><div className="space-y-3">{draft.plans.map((p) => <Card key={p.id}><div className="grid gap-3 sm:grid-cols-3"><Input label="Plan name" value={p.name} onChange={(e) => updatePlan(p.id, 'name', e.target.value)} /><Input label="Monthly price" inputMode="numeric" value={String(p.price ?? "")} placeholder="Open (CFG-02)" onChange={(e) => updatePlan(p.id, 'price', e.target.value)} /><Input label="Listings limit" value={String(p.listings)} onChange={(e) => updatePlan(p.id, 'listings', e.target.value)} /></div><div className="mt-3 flex justify-between"><Toggle label="Active" on={p.active} onChange={(v) => setDraft({ ...draft, plans: draft.plans.map((x) => x.id === p.id ? { ...x, active: v } : x) })} /><Button variant="dangerSoft" size="sm" onClick={() => setDraft({ ...draft, plans: draft.plans.filter((x) => x.id !== p.id) })}><Trash2 size={14} /> Delete</Button></div></Card>)}<Button variant="secondary" onClick={() => setDraft({ ...draft, plans: [...draft.plans, { id: `p-${Date.now()}`, name: 'New plan', price: null, listings: 10, leads: 30, active: true }] })}><Plus size={16} /> Add plan</Button></div></Section>
    <Section title="Subscription coupons"><div className="space-y-3">{draft.coupons.map((c) => <Card key={c.id}><div className="grid gap-3 sm:grid-cols-3"><Input label="Coupon code" value={c.code} onChange={(e) => updateCoupon(c.id, 'code', e.target.value.toUpperCase())} /><Select label="Discount type" value={c.type} onChange={(e) => updateCoupon(c.id, 'type', e.target.value)} options={[{ value: 'percent', label: 'Percentage' }, { value: 'flat', label: 'Flat amount' }]} /><Input label="Discount value" inputMode="numeric" value={String(c.value)} onChange={(e) => updateCoupon(c.id, 'value', e.target.value)} /></div><div className="mt-3 flex justify-between"><Toggle label="Active" on={c.active} onChange={(v) => updateCoupon(c.id, 'active', v)} /><Button variant="dangerSoft" size="sm" onClick={() => setDraft({ ...draft, coupons: draft.coupons.filter((x) => x.id !== c.id) })}><Trash2 size={14} /> Delete</Button></div></Card>)}<Button variant="secondary" onClick={() => setDraft({ ...draft, coupons: [...draft.coupons, { id: `cp-${Date.now()}`, code: 'NEWCODE', type: 'percent', value: 10, active: true }] })}><Plus size={16} /> Add coupon</Button></div></Section>
  </Screen>
}

export function Approvals() {
  const nav = useNav()
  const { vendors, listings, disputes, commissions } = useApp()
  const cards = [
    ['Vendor verification', 'Approve, reject or request info', ShieldCheck, 'amber', vendors.filter((v) => ['submitted', 'info'].includes(v.status)).length, 'ad_vendors'],
    ['Listing moderation', 'Approve, reject or suspend listings', Package, 'indigo', listings.filter((l) => l.status === 'pending').length, 'ad_listings'],
    ['Cases', 'Review escalated cases', Gavel, 'rose', disputes.filter((d) => ['open', 'under_review', 'escalated'].includes(d.status)).length, 'ad_cases'],
    ['Agent commissions', 'Approve attribution & payouts', Wallet, 'emerald', commissions.filter((c) => c.status === 'pending').length, 'ad_agents'],
  ]
  return (
    <Screen title="Approvals" back={false}>
      {cards.map(([t, s, I, tone, n, to]) => (
        <Card key={t} onClick={() => nav.go(to)} className="!p-4"><div className="flex items-center gap-3.5"><span className={cx('grid size-12 place-items-center rounded-2xl', SOFT[tone])}><I size={24} /></span><div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{t}</p><p className="text-xs text-ink-500">{s}</p></div>{n > 0 ? <span className="grid min-w-7 place-items-center rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">{n}</span> : <Check size={18} className="text-emerald-500" />}<ChevronRight size={18} className="text-ink-300" /></div></Card>
      ))}
    </Screen>
  )
}

/* ================= VENDOR VERIFICATION ================= */
export function AdminVendors({ params = {} }) {
  const nav = useNav()
  const { vendors } = useApp()
  const [f, setF] = useState(params.f || 'pending')
  const match = { pending: ['submitted'], info: ['info'], rejected: ['rejected'], approved: ['approved'], all: null }[f]
  const list = vendors.filter((v) => f === 'business' ? vendorKind(v) === 'Supplier' : (!match || match.includes(v.status)))
  const c = (st) => vendors.filter((v) => st.includes(v.status)).length
  return (
    <Screen title="Vendor & supplier accounts" right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('ad_vendor_new')}>Add</Button>}>
      <Chips value={f} onChange={setF} options={[{ id: 'pending', label: `Pending (${c(['submitted'])})` }, { id: 'info', label: `Info needed (${c(['info'])})` }, { id: 'rejected', label: `Rejected (${c(['rejected'])})` }, { id: 'approved', label: `Approved (${c(['approved'])})` }, { id: 'business', label: `Business suppliers (${vendors.filter((v) => vendorKind(v) === 'Supplier').length})` }, { id: 'all', label: 'All' }]} />
      <div className="space-y-2.5">
        {list.map((v) => (
          <Card key={v.id} onClick={() => nav.go('ad_vendor', { id: v.id })} className="!p-3.5">
            <div className="flex items-center gap-3"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={48} round="rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{v.name}</p><StatusBadge s={v.status} /></div><p className="truncate text-xs text-ink-500">{cat(v.cat).name} · {v.city}</p><p className="mt-0.5 text-xs text-ink-400">Submitted {v.history[v.history.length - 1].at}{v.agent ? ` · via ${v.agent}` : ''}</p></div></div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={ShieldCheck} title="Queue is clear" body="No vendors in this state." />}
      </div>
    </Screen>
  )
}

export function AdminVendorNew() {
  const nav = useNav()
  const { setVendors, addAudit, toast, stamp } = useApp()
  const [f, setF] = useState({ name: '', owner: '', type: 'vendor', cat: CATS[0]?.id || 'elec', city: '', email: '', phone: '' })
  const [err, setErr] = useState('')
  const save = () => {
    if (f.name.trim().length < 3 || f.owner.trim().length < 3 || !f.city.trim()) return setErr('Business name, owner and city are required')
    const id = `admin-v-${Date.now()}`
    const record = { id, name: f.name.trim(), owner: f.owner.trim(), cat: f.cat, city: f.city.trim(), areas: [f.city.trim()], branches: 1, rating: 0, reviews: 0, status: 'submitted', tone: cat(f.cat).tone || 'teal', since: new Date().getFullYear(), gstin: 'Pending verification', phone: f.phone.trim() || 'Not provided', email: f.email.trim() || 'Not provided', plan: 'Starter', docs: [{ name: 'Business registration proof', status: 'pending' }, { name: 'Identity / tax document', status: 'pending' }], history: [{ s: 'submitted', at: stamp(), by: ME.admin }], ...(f.type === 'business' ? { supplierType: 'business' } : {}) }
    setVendors((all) => [record, ...all]); addAudit(f.type === 'business' ? 'Created business supplier' : 'Created vendor account', record.name, 'user'); toast(f.type === 'business' ? 'Business supplier added' : 'Vendor added'); nav.go('ad_vendor', { id })
  }
  return <Screen title={f.type === 'business' ? 'Add business supplier' : 'Add vendor'} footer={<Button full size="lg" onClick={save}>Create account</Button>}>
    <Banner tone="blue">Admin-created accounts enter verification as pending. The account owner must provide evidence before approval.</Banner>
    <Segmented value={f.type} onChange={(type) => setF({ ...f, type })} options={[{ id: 'vendor', label: 'Vendor' }, { id: 'business', label: 'Business supplier' }]} />
    <Input label="Business name" required value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr('') }} />
    <Input label="Owner / authorised contact" required value={f.owner} onChange={(e) => { setF({ ...f, owner: e.target.value }); setErr('') }} />
    <Select label="Primary category" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} options={CATS.map((c) => ({ value: c.id, label: c.name }))} />
    <Input label="City / coverage base" required value={f.city} onChange={(e) => { setF({ ...f, city: e.target.value }); setErr('') }} />
    <div className="grid gap-3 sm:grid-cols-2"><Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /><Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
    {err && <p className="text-sm font-medium text-red-600">{err}</p>}
  </Screen>
}

export function AdminVendor({ params }) {
  const nav = useNav()
  const { me, vendors, setVendors, patchVendor, addAudit, notify, toast, leads, patchLead, setCommissions, stamp } = useApp()
  const v = vendors.find((x) => x.id === (params.id || 'v8'))
  const [dlg, setDlg] = useState(null)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  if (!v) return <Screen title="Account unavailable"><EmptyState icon={Store} title="Vendor account not found" body="This account may have been deleted by an administrator." /><Button full onClick={() => nav.go('ad_vendors')}>Back to accounts</Button></Screen>
  const allVerified = v.docs.every((d) => d.status === 'verified')
  const setDoc = (name, status, note) => patchVendor(v.id, (x) => ({ docs: x.docs.map((d) => (d.name === name ? { ...d, status, note } : d)) }))
  const act = (kind) => {
    const check = validateReviewDecision({ kind, reason, reviewer: me, vendor: v })
    if (!check.ok) return setErr(check.message)
    patchVendor(v.id, (x) => ({ status: kind, history: [...x.history, { s: kind, at: stamp(), by: ME.admin, note: reason.trim() }], docs: kind === 'approved' ? x.docs.map((d) => ({ ...d, status: 'verified' })) : x.docs }))
    addAudit(kind === 'approved' ? 'Approved vendor' : kind === 'rejected' ? 'Rejected vendor' : 'Requested more info from vendor', v.name, 'approval', reason.trim())
    notify('vendor', kind === 'approved' ? 'You are verified 🎉' : kind === 'rejected' ? 'Application rejected' : 'More information needed', kind === 'approved' ? `Your business is now shown as Verified. ${reason.trim()}` : reason, 'onboarding')
    if (kind === 'approved') {
      const ld = leads.find((l) => l.vendorId === v.id)
      if (ld) patchLead(ld.id, { stage: 'Approved/Converted' })
      setCommissions((c) => c.map((x) => (x.lead === v.name && x.status === 'awaiting' ? { ...x, status: 'pending' } : x)))
    }
    toast(kind === 'approved' ? 'Vendor approved' : kind === 'rejected' ? 'Vendor rejected' : 'Information requested')
    setDlg(null); setReason(''); setErr('')
  }
  const decided = ['approved', 'rejected'].includes(v.status)
  return (
    <Screen
      title={v.name}
      subtitle={v.id}
      right={<StatusBadge s={v.status} className="mr-2" />}
      overlay={<><Dialog open={!!dlg} onClose={() => { setDlg(null); setErr('') }} title={dlg === 'approved' ? 'Approve this vendor?' : dlg === 'rejected' ? 'Reject application' : 'Request more information'} actions={<><Button variant="secondary" className="flex-1" onClick={() => { setDlg(null); setErr('') }}>Cancel</Button><Button variant={dlg === 'rejected' ? 'danger' : 'primary'} className="flex-1" onClick={() => act(dlg)}>{dlg === 'approved' ? 'Approve' : dlg === 'rejected' ? 'Reject' : 'Send request'}</Button></>}>
          {dlg === 'approved' && <p className="mb-3">{v.name} will be shown as <b>Verified</b> and can publish listings. This action is recorded in the audit log.</p>}<Input textarea rows={3} label="Reason (visible to vendor)" value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} error={err} placeholder={dlg === 'approved' ? 'e.g. Registration and GSTIN match the portal' : dlg === 'rejected' ? 'e.g. GSTIN inactive on portal' : 'e.g. Please re-upload a clear GST certificate'} />
        </Dialog><Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={`Delete ${vendorKind(v).toLowerCase()} account?`} actions={<><Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={() => { setVendors((all) => all.filter((x) => x.id !== v.id)); addAudit('Deleted vendor account', v.name, 'user'); toast('Account deleted'); setDeleteOpen(false); nav.go('ad_vendors') }}>Delete account</Button></>}><p>This removes <b>{v.name}</b> from the admin account directory in this demo. Existing audit history remains recorded.</p></Dialog></>}
      footer={<div className="space-y-2">{!allVerified && v.status !== 'approved' && <button onClick={() => v.docs.forEach((d) => setDoc(d.name, 'verified'))} className="w-full text-center text-xs font-bold text-brand-700">Mark all documents as verified</button>}<div className="flex gap-2"><Button variant="dangerSoft" className="flex-1" onClick={() => setDlg('rejected')}>Reject</Button><Button variant="secondary" className="flex-1" onClick={() => setDlg('info')}>Request info</Button><Button className="flex-1" disabled={!allVerified || v.status === 'approved'} onClick={() => setDlg('approved')}>Approve</Button></div><Button full variant="dangerSoft" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete {vendorKind(v).toLowerCase()} account</Button></div>}
    >
      <Card><div className="flex items-center gap-3"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={56} /><div className="min-w-0"><p className="text-base font-extrabold leading-tight">{v.name}</p><p className="text-sm text-ink-500">{v.owner}</p><div className="mt-1.5"><VerifiedBadge id={v.id} /></div></div></div></Card>
      {decided && <Banner tone={v.status === 'approved' ? 'green' : 'red'} title={v.status === 'approved' ? 'Approved' : 'Rejected'}>{v.history[v.history.length - 1].note || `Decision recorded by ${v.history[v.history.length - 1].by}.`}</Banner>}
      <Card><KV rows={[['Category', cat(v.cat).name], ['City', v.city], ['Service areas', v.areas.join(', ')], ['Branches', v.branches], ['GSTIN', v.gstin], ['Phone', v.phone], ['Email', v.email], ['Operating since', v.since], v.agent && ['Sourced by', `${v.agent} (agent)`]]} /></Card>
      <Section title="Documents">
        <div className="space-y-2">
          {v.docs.map((d) => (
            <div key={d.name}>
              <DocTile name={d.name} status={d.status} note={d.note} />
              {v.status !== 'approved' && <div className="mt-1.5 flex justify-end gap-2"><button onClick={() => setDoc(d.name, 'rejected', 'Unclear / invalid — needs re-upload')} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">Reject doc</button><button onClick={() => setDoc(d.name, 'verified')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Verify</button></div>}
            </div>
          ))}
        </div>
        {!allVerified && v.status !== 'approved' && <p className="mt-2 text-xs text-ink-500">Approval is enabled once every document is verified.</p>}
      </Section>
      <Section title="Review history"><Card><Timeline steps={v.history.map((h, i) => ({ label: { submitted: 'Submitted', info: 'More info requested', approved: 'Approved', rejected: 'Rejected' }[h.s] || h.s, at: `${h.at} · ${h.by}`, note: h.note, done: true }))} /></Card></Section>
    </Screen>
  )
}

/* ================= LISTING MODERATION ================= */
export function AdminListings() {
  const nav = useNav()
  const { listings, vendor } = useApp()
  const [f, setF] = useState('pending')
  const list = listings.filter((l) => f === 'all' || l.status === f)
  const c = (s) => listings.filter((l) => l.status === s).length
  return (
    <Screen title="Listing moderation">
      <Chips value={f} onChange={setF} options={[{ id: 'pending', label: `Pending (${c('pending')})` }, { id: 'approved', label: `Live (${c('approved')})` }, { id: 'rejected', label: `Rejected (${c('rejected')})` }, { id: 'suspended', label: `Suspended (${c('suspended')})` }, { id: 'all', label: 'All' }]} />
      <div className="space-y-2.5">
        {list.map((l) => (
          <Card key={l.id} onClick={() => nav.go('ad_listing', { id: l.id })} className="!p-3"><div className="flex gap-3"><Thumb tone={l.tone} icon={cat(l.cat).icon} size={56} round="rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold leading-snug">{l.title}</p><StatusBadge s={l.status} /></div><p className="mt-0.5 truncate text-xs text-ink-500">{vendor(l.vendorId)?.name} · {fmt(l.price)}</p></div></div></Card>
        ))}
        {!list.length && <EmptyState icon={Package} title="Nothing to moderate" />}
      </div>
    </Screen>
  )
}

export function AdminListing({ params }) {
  const { listings, patchListing, vendor, addAudit, notify, toast } = useApp()
  const l = listings.find((x) => x.id === (params.id || 'l5'))
  const [dlg, setDlg] = useState(null)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const act = (s) => {
    if (['rejected', 'suspended', 'removed'].includes(s) && reason.trim().length < 5) return setErr('A reason is required')
    patchListing(l.id, { status: s, reason: s === 'approved' ? undefined : reason })
    addAudit({ approved: 'Approved listing', rejected: 'Rejected listing', suspended: 'Suspended listing', removed: 'Removed listing' }[s], l.title, 'approval', reason || undefined)
    notify('vendor', `Listing ${s}`, `${l.title}${reason ? ` — ${reason}` : ''}`, 'onboarding')
    toast(`Listing ${s}`); setDlg(null); setReason(''); setErr('')
  }
  const actions = { approved: [['Suspend', 'suspended', 'dangerSoft']], pending: [['Reject', 'rejected', 'dangerSoft'], ['Approve', 'approved', 'primary']], rejected: [['Approve anyway', 'approved', 'primary']], suspended: [['Reinstate', 'approved', 'primary'], ['Remove', 'removed', 'dangerSoft']], removed: [] }[l.status] || []
  return (
    <Screen
      title="Review listing"
      right={<StatusBadge s={l.status} className="mr-2" />}
      overlay={<Dialog open={!!dlg} onClose={() => { setDlg(null); setErr('') }} title={dlg === 'approved' ? 'Approve listing?' : `${dlg === 'rejected' ? 'Reject' : dlg === 'suspended' ? 'Suspend' : 'Remove'} listing`} actions={<><Button variant="secondary" className="flex-1" onClick={() => { setDlg(null); setErr('') }}>Cancel</Button><Button variant={dlg === 'approved' ? 'primary' : 'danger'} className="flex-1" onClick={() => act(dlg)}>Confirm</Button></>}>{dlg === 'approved' ? <p>The listing becomes visible in customer search immediately.</p> : <Input textarea rows={3} label="Reason (visible to vendor)" value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} error={err} />}</Dialog>}
      footer={actions.length > 0 && <div className="flex gap-2">{actions.map(([label, s, v]) => <Button key={s} variant={v} className="flex-1" size="lg" onClick={() => (s === 'approved' ? act('approved') : setDlg(s))}>{label}</Button>)}</div>}
    >
      <div className={cx('grid h-40 place-items-center rounded-2xl bg-gradient-to-br text-white', GRAD[l.tone])}>{(() => { const I = cat(l.cat).icon; return <I size={64} strokeWidth={1.4} /> })()}</div>
      <div><div className="flex flex-wrap gap-1.5"><Pill>{cat(l.cat).name}</Pill><Pill>{l.sub}</Pill><Pill>{l.type}</Pill></div><h2 className="mt-2 text-lg font-extrabold leading-snug">{l.title}</h2><p className="mt-1 text-xl font-extrabold text-brand-700">{fmt(l.price)}<span className="text-sm font-normal text-ink-400"> /{l.unit}</span></p></div>
      <Card><p className="text-sm leading-relaxed text-ink-600">{l.desc}</p></Card>
      <Card><KV rows={[['Vendor', vendor(l.vendorId)?.name], ['Vendor status', vendor(l.vendorId)?.status === 'approved' ? 'Verified' : 'Unverified'], l.type === 'product' && ['Stock / MOQ', `${l.stock} / ${l.moq}`], l.type === 'product' && ['Lead time', `${l.lead} days`], l.type === 'service' && ['Duration', `${l.duration} min`], ...l.specs]} /></Card>
      <Section title="Moderation checklist"><Card className="space-y-2">{['Title & description are accurate', 'Images are clear and original', 'Category-specific fields completed', 'Pricing is reasonable'].map((t, i) => <Checkbox key={t} checked={l.status !== 'rejected' || i > 1} onChange={() => {}}>{t}</Checkbox>)}</Card></Section>
      <Section title="Photos, portfolio and logo"><Card className="space-y-2">{['Listing photos are clear and original', 'Previous-work portfolio belongs to this vendor', 'Logo and banner are appropriate'].map((t) => <label key={t} className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" /> {t}</label>)}</Card></Section>
      {l.reason && <Banner tone="red" title="Last reason">{l.reason}</Banner>}
    </Screen>
  )
}

/* ================= USERS & ROLES ================= */
const PERMS = [
  ['Browse public catalogue', [1, 1, 1, 1]],
  ['Message vendors & request RFQs', [1, 0, 0, 0]],
  ['Manage own listings & inventory', [0, 1, 0, 0]],
  ['Reply to enquiries & send quotations', [0, 1, 0, 0]],
  ['Create & manage assigned leads', [0, 0, 1, 0]],
  ['Assist onboarding (with consent)', [0, 0, 1, 0]],
  ['Approve / reject vendors', [0, 0, 0, 1]],
  ['Moderate listings', [0, 0, 0, 1]],
  ['Manage categories & fields', [0, 0, 0, 1]],
  ['Handle cases', [0, 0, 0, 1]],
  ['Commercial & platform settings', [0, 0, 0, 1]],
  ['View reports & audit logs', [0, 0, 0, 1]],
]
export function UsersScreen({ params = {} }) {
  const nav = useNav()
  const { users } = useApp()
  const [q, setQ] = useState('')
  const [role, setRole] = useState(params.role || 'All')
  const list = users.filter((u) => (role === 'All' || u.role === role) && (!q || u.name.toLowerCase().includes(q.toLowerCase())))
  return (
    <Screen title="Users" back={false} right={<IconBtn label="Roles" onClick={() => nav.go('ad_roles')}><KeyRound size={20} /></IconBtn>}>
      <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" />
      <Chips value={role} onChange={setRole} options={['All', 'Customer', 'Vendor', 'Sales Agent', 'Super Admin']} />
      <Group>{list.map((u, i) => <ListRow key={u.id} last={i === list.length - 1} onClick={() => nav.go('ad_user', { id: u.id })} title={u.name} subtitle={`${u.role} · ${u.phone}`} right={<div className="flex items-center gap-2"><StatusBadge s={u.status} /><ChevronRight size={16} className="text-ink-300" /></div>} icon={undefined} />)}</Group>
      {!list.length && <EmptyState icon={Users} title="No users found" />}
    </Screen>
  )
}
export function UserDetail({ params }) {
  const nav = useNav()
  const { users, patchUser, addAudit, toast } = useApp()
  const u = users.find((x) => x.id === (params.id || 'u1'))
  const [role, setRole] = useState(u.role)
  const toggle = () => { const s = u.status === 'active' ? 'suspended' : 'active'; patchUser(u.id, { status: s }); addAudit(s === 'suspended' ? 'Suspended user' : 'Reactivated user', u.name, 'user'); toast(`User ${s}`) }
  const save = () => { patchUser(u.id, { role }); addAudit(`Changed role ${u.role} → ${role}`, u.name, 'user'); toast('Role updated') }
  return (
    <Screen title="User" footer={<div className="flex gap-2"><Button variant={u.status === 'active' ? 'dangerSoft' : 'primary'} className="flex-1" icon={u.status === 'active' ? Ban : RotateCcw} onClick={toggle}>{u.status === 'active' ? 'Suspend user' : 'Reactivate'}</Button><Button variant="secondary" className="flex-1" onClick={() => toast('All sessions signed out')}>Sign out sessions</Button></div>}>
      <Card className="text-center"><div className="mx-auto w-fit"><Avatar name={u.name} size={72} /></div><p className="mt-3 text-lg font-extrabold">{u.name}</p><p className="text-sm text-ink-500">{u.phone}</p><div className="mt-2 flex justify-center gap-2"><Badge tone="teal">{u.role}</Badge><StatusBadge s={u.status} /></div></Card>
      <Card><KV rows={[['Joined', u.joined], ['Last active', 'Today, 9:41 AM'], ['2-step verification', u.role === 'Super Admin' ? 'Enabled (required)' : 'Not required']]} /></Card>
      <Section title="Role"><Card className="space-y-3"><Select value={role} onChange={(e) => setRole(e.target.value)} options={['Customer', 'Vendor', 'Sales Agent', 'Super Admin']} /><Button full variant="soft" disabled={role === u.role} onClick={save}>Update role</Button><button onClick={() => nav.go('ad_roles')} className="w-full text-center text-xs font-bold text-brand-700">View permission matrix</button></Card></Section>
    </Screen>
  )
}
export function Roles() {
  return (
    <Screen title="Roles & permissions" subtitle="Enforced by the backend">
      <Banner tone="blue">Screens, records and actions are restricted by role. Vendor data is isolated per organisation; Sales Agents have no approval or settings permissions by default.</Banner>
      <Card pad={false} className="overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(4,38px)] items-end gap-1 border-b border-ink-100 bg-ink-50 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-ink-500"><span className="text-left">Permission</span><span>Cust</span><span>Vend</span><span>Agent</span><span>Admin</span></div>
        {PERMS.map(([p, a], i) => <div key={p} className={cx('grid grid-cols-[1fr_repeat(4,38px)] items-center gap-1 px-3 py-2.5', i % 2 && 'bg-ink-50/60')}><span className="text-xs font-medium text-ink-700">{p}</span>{a.map((x, j) => <span key={j} className="grid place-items-center">{x ? <Check size={16} className="text-emerald-600" strokeWidth={3} /> : <span className="h-0.5 w-3 rounded bg-ink-200" />}</span>)}</div>)}
      </Card>
    </Screen>
  )
}

/* ================= CATEGORIES ================= */
export function AdminCategories() {
  const nav = useNav()
  const { toast, categories, setCustomCategories, setCategoryOverrides, categoryOverrides, addAudit, industries, setIndustries } = useApp()
  const [on, setOn] = useState(() => Object.fromEntries(categories.map((c) => [c.id, c.active !== false])))
  const [mergeSource, setMergeSource] = useState(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const merge = () => {
    const source = categories.find((c) => c.id === mergeSource)
    const target = categories.find((c) => c.id === mergeTarget)
    if (!source || !target || source.id === target.id) return
    const merged = { subs: [...new Set([...(target.subs || []), ...(source.subs || [])])], fields: [...new Set([...(target.fields || []), ...(source.fields || [])])], filters: [...new Set([...(target.filters || []), ...(source.filters || [])])], mergedFrom: [...(target.mergedFrom || []), source.name] }
    if (target.id.startsWith('custom-')) setCustomCategories((all) => all.map((c) => c.id === target.id ? { ...c, ...merged } : c))
    else setCategoryOverrides((all) => ({ ...all, [target.id]: { ...(all[target.id] || {}), ...merged } }))
    if (source.id.startsWith('custom-')) setCustomCategories((all) => all.map((c) => c.id === source.id ? { ...c, active: false, mergedInto: target.id } : c))
    else setCategoryOverrides((all) => ({ ...all, [source.id]: { ...(all[source.id] || {}), active: false, mergedInto: target.id } }))
    setOn((all) => ({ ...all, [source.id]: false })); addAudit('Merged category', `${source.name} → ${target.name}`, 'setting'); toast(`${source.name} merged into ${target.name}`); setMergeSource(null); setMergeTarget('')
  }
  return (
    <Screen title="Categories & industries" right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('ad_category')}>Add category</Button>}>
      <Section title="Industries"><Card className="!p-3.5"><div className="flex flex-wrap gap-2">{industries.map((industry) => <span key={industry} className="flex items-center gap-1.5 rounded-full bg-ink-100 py-1.5 pl-3 pr-2 text-xs font-semibold text-ink-700">{industry}<button aria-label={`Remove ${industry}`} onClick={() => setIndustries((all) => all.filter((x) => x !== industry))}><X size={13} /></button></span>)}</div><div className="mt-3 flex gap-2"><input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder="Add industry" className="h-10 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { const value = newIndustry.trim(); if (value && !industries.includes(value)) { setIndustries((all) => [...all, value]); addAudit('Created industry', value, 'setting'); setNewIndustry('') } }}>Add</Button></div></Card></Section>
      {categories.map((c) => (
        <Card key={c.id} className="!p-3.5"><div className="flex items-center gap-3"><button onClick={() => nav.go('ad_category', { id: c.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Thumb tone={c.tone} icon={c.icon} size={48} round="rounded-xl" /><div className="min-w-0"><p className="truncate text-sm font-bold">{c.name}</p><p className="text-xs text-ink-500">{c.industry || 'Unassigned industry'} · {c.type === 'service' ? 'Services' : 'Products'} · {c.subs.length} subs · {c.fields.length} fields · {c.filters?.length || 0} filters · {on[c.id] ? 'Published' : 'Inactive'}</p></div></button><button className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-brand-700 hover:bg-brand-50" onClick={() => { setMergeSource(c.id); setMergeTarget(categories.find((x) => x.id !== c.id && x.active !== false)?.id || '') }}>Merge</button><button role="switch" aria-checked={on[c.id]} aria-label="Toggle category" onClick={() => { const active = !on[c.id]; setOn({ ...on, [c.id]: active }); if (c.id.startsWith('custom-')) setCustomCategories((all) => all.map((x) => (x.id === c.id ? { ...x, active } : x))); else setCategoryOverrides((all) => ({ ...all, [c.id]: { ...(all[c.id] || {}), active } })); toast(active ? 'Category published' : 'Category deactivated') }} className={cx('relative h-7 w-12 shrink-0 rounded-full transition', on[c.id] ? 'bg-brand-600' : 'bg-ink-300')}><span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', on[c.id] ? 'left-[22px]' : 'left-0.5')} /></button></div></Card>
      ))}
      <Dialog open={!!mergeSource} onClose={() => setMergeSource(null)} title="Merge category" actions={<><Button variant="secondary" className="flex-1" onClick={() => setMergeSource(null)}>Cancel</Button><Button className="flex-1" disabled={!mergeTarget} onClick={merge}>Merge</Button></>}><p className="text-sm text-ink-600">Move the source category’s subcategories, fields and filters into the target, then deactivate the source.</p><div className="mt-4"><Select label="Merge into" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} options={categories.filter((c) => c.id !== mergeSource && c.active !== false).map((c) => ({ value: c.id, label: c.name }))} /></div></Dialog>
    </Screen>
  )
}
export function AdminCategory({ params = {} }) {
  const nav = useNav()
  const { toast, addAudit, categories, customCategories, setCustomCategories, setCategoryOverrides, categoryOverrides, industries } = useApp()
  const ex = params.id ? categories.find((x) => x.id === params.id) : null
  const [f, setF] = useState({ name: ex?.name || '', industry: ex?.industry || industries[0] || INDUSTRIES[0], type: ex?.type || 'product', subs: ex?.subs || [], fields: ex?.fields || [], filters: ex?.filters || [] })
  const [sub, setSub] = useState('')
  const [fld, setFld] = useState('')
  const [filter, setFilter] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    if (f.name.trim().length < 3) return setErr('Category name is required')
    if (!f.subs.length) return setErr('Add at least one subcategory')
    if (!ex) setCustomCategories((all) => [...all, { id: `custom-${Date.now()}`, name: f.name.trim(), industry: f.industry, type: f.type, subs: f.subs, fields: f.fields, filters: f.filters, tone: 'teal', active: true }])
    else if (ex.id.startsWith('custom-')) setCustomCategories((all) => all.map((c) => c.id === ex.id ? { ...c, name: f.name.trim(), industry: f.industry, type: f.type, subs: f.subs, fields: f.fields, filters: f.filters } : c))
    else setCategoryOverrides((all) => ({ ...all, [ex.id]: { ...(all[ex.id] || {}), name: f.name.trim(), industry: f.industry, type: f.type, subs: f.subs, fields: f.fields, filters: f.filters } }))
    addAudit(ex ? 'Updated category' : 'Created category', f.name, 'setting'); toast('Category saved'); nav.back()
  }
  return (
    <Screen title={ex ? 'Edit category' : 'New category'} footer={<Button full size="lg" onClick={save}>Save category</Button>}>
      <Input label="Category name" required value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr('') }} error={err && !f.name.trim() ? err : ''} />
      <Select label="Industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} options={industries.length ? industries : INDUSTRIES} />
      <Segmented value={f.type} onChange={(t) => setF({ ...f, type: t })} options={[{ id: 'product', label: 'Product' }, { id: 'service', label: 'Service' }]} />
      <Section title="Subcategories">
        <div className="mb-2 flex flex-wrap gap-2">{f.subs.map((s) => <span key={s} className="flex items-center gap-1.5 rounded-full bg-ink-900 py-1.5 pl-3 pr-2 text-xs font-semibold text-white">{s}<button aria-label={`Remove ${s}`} onClick={() => setF({ ...f, subs: f.subs.filter((x) => x !== s) })}><X size={13} /></button></span>)}</div>
        <div className="flex gap-2"><input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Add subcategory" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (sub.trim()) { setF({ ...f, subs: [...f.subs, sub.trim()] }); setSub(''); setErr('') } }}>Add</Button></div>
      </Section>
      <Section title="Required listing fields">
        <div className="mb-2 space-y-2">{f.fields.map((s) => <div key={s} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><ListChecks size={17} className="text-brand-600" /><span className="flex-1 text-sm font-medium">{s}</span><button aria-label={`Remove ${s}`} onClick={() => setF({ ...f, fields: f.fields.filter((x) => x !== s) })}><Trash2 size={16} className="text-ink-400" /></button></div>)}</div>
        <div className="flex gap-2"><input value={fld} onChange={(e) => setFld(e.target.value)} placeholder="e.g. Warranty (months)" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (fld.trim()) { setF({ ...f, fields: [...f.fields, fld.trim()] }); setFld('') } }}>Add</Button></div>
      </Section>
      <Section title="Customer filters"><div className="mb-2 space-y-2">{f.filters.map((s) => <div key={s} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><Tag size={17} className="text-brand-600" /><span className="flex-1 text-sm font-medium">{s}</span><button aria-label={`Remove ${s}`} onClick={() => setF({ ...f, filters: f.filters.filter((x) => x !== s) })}><Trash2 size={16} className="text-ink-400" /></button></div>)}</div><div className="flex gap-2"><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. Delivery region" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (filter.trim()) { setF({ ...f, filters: [...f.filters, filter.trim()] }); setFilter('') } }}>Add</Button></div><p className="mt-2 text-xs text-ink-500">These are stored with the category and can drive marketplace filters in a production implementation.</p></Section>
      {err && f.name.trim() && <p className="text-sm font-medium text-red-600">{err}</p>}
    </Screen>
  )
}

/* ================= SALES AGENTS ================= */
export function AdminAgents() {
  const nav = useNav()
  const { agents, leads } = useApp()
  return (
    <Screen title="Sales agents" right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('ad_agent', { id: 'new' })}>Invite</Button>}>
      {agents.map((a) => (
        <Card key={a.id} onClick={() => nav.go('ad_agent', { id: a.id })} className="!p-3.5">
          <div className="flex items-center gap-3"><Avatar name={a.name} size={46} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{a.name}</p><StatusBadge s={a.status} /></div><p className="text-xs text-ink-500">{a.region}</p></div></div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center"><div><p className="text-base font-extrabold">{a.leads}</p><p className="text-[11px] text-ink-500">Leads</p></div><div><p className="text-base font-extrabold">{a.converted}</p><p className="text-[11px] text-ink-500">Converted</p></div><div><p className="text-base font-extrabold">{fmt(a.commission)}</p><p className="text-[11px] text-ink-500">Commission</p></div></div>
        </Card>
      ))}
      <Card><p className="mb-2 text-sm font-bold">All leads across agents</p><div className="space-y-1">{leads.slice(0, 6).map((l) => <p key={l.id} className="flex justify-between text-sm"><span>{l.name}</span><span className="text-ink-500">{l.stage}</span></p>)}</div></Card>
    </Screen>
  )
}
export function AdminAgent({ params }) {
  const nav = useNav()
  const { agents, setAgents, commissions, patchCommission, addAudit, toast, settings } = useApp()
  const isNew = params.id === 'new'
  const a = agents.find((x) => x.id === params.id) || agents[0]
  const [f, setF] = useState({ name: '', phone: '', region: 'Jaipur North' })
  const [err, setErr] = useState('')
  const [dlg, setDlg] = useState(null)
  const mine = commissions.filter((c) => !isNew && (a.name === 'Neha Verma' || c.status === 'zzz'))
  if (isNew) {
    return (
      <Screen title="Invite sales agent" footer={<Button full size="lg" onClick={() => { if (f.name.trim().length < 3 || !/^[6-9]\d{9}$/.test(f.phone)) return setErr('Enter a valid name and 10-digit phone number'); const id = `ag-${Date.now()}`; setAgents((all) => [...all, { id, name: f.name.trim(), phone: f.phone, region: f.region, leads: 0, converted: 0, vendors: 0, customers: 0, commission: 0, status: 'active' }]); addAudit('Added sales agent', f.name, 'user'); toast('Sales agent added'); nav.back() }}>Add sales agent</Button>}>
        <Banner tone="blue">Sales Agents are invited by Super Admin. They get lead-management access only — no approval or platform-setting permissions.</Banner>
        <Input label="Full name" required value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr('') }} />
        <Input label="Mobile number" required inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => { setF({ ...f, phone: e.target.value.replace(/\D/g, '') }); setErr('') }} error={err} />
        <Select label="Region" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} options={['Jaipur North', 'Jaipur South', 'Delhi NCR', 'Ajmer', 'Jodhpur']} />
      </Screen>
    )
  }
  const act = (c, st) => { patchCommission(c.id, { status: st }); addAudit(st === 'approved' ? 'Approved commission' : st === 'paid' ? 'Paid commission' : 'Rejected commission', `${c.lead} · ${fmt(c.amount)}`, 'financial'); toast(`Commission ${st}`) }
  return (
    <Screen title={a.name} subtitle={a.region} right={<StatusBadge s={a.status} className="mr-2" />} overlay={<Dialog open={dlg === 'delete'} onClose={() => setDlg(null)} title="Delete sales agent?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setDlg(null)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={() => { setAgents((all) => all.filter((x) => x.id !== a.id)); addAudit('Deleted sales agent', a.name, 'user'); toast('Sales agent deleted'); setDlg(null); nav.go('ad_agents') }}>Delete agent</Button></>}><p>This removes <b>{a.name}</b> from the admin agent directory. Commission history remains in the audit trail.</p></Dialog>}>
      <div className="grid grid-cols-3 gap-2">{[['Leads', a.leads], ['Converted', a.converted], ['Rate', `${Math.round((a.converted / (a.leads || 1)) * 100)}%`]].map(([k, v]) => <Card key={k} className="!p-3 text-center"><p className="text-lg font-extrabold">{v}</p><p className="text-[11px] text-ink-500">{k}</p></Card>)}</div>
      <Card><KV rows={[['Vendors onboarded', a.vendors], ['Customers registered', a.customers], ['Commission earned', fmt(a.commission)], ['Rule', settings.agentCommission.amount ? `${fmt(settings.agentCommission.amount)} per activated vendor` : 'Not decided (O-03)']]} /></Card>
      <Banner tone="amber" title="Anti-fraud rule">Agents cannot approve vendors they onboarded. Commission needs admin approval after attribution is verified.</Banner>
      <Section title="Commission approvals">
        {a.name !== 'Neha Verma' ? <Card className="text-center text-sm text-ink-500">No commission items are recorded for this agent.</Card> : (
          <div className="space-y-2.5">{commissions.map((c) => (
            <Card key={c.id} className="!p-3.5"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{c.lead}</p><p className="text-xs text-ink-500">{c.kind} · {c.date}</p></div><div className="text-right"><p className="text-sm font-extrabold">{fmt(c.amount)}</p><Badge tone={{ pending: 'amber', awaiting: 'gray', approved: 'blue', paid: 'green', rejected: 'red' }[c.status]}>{{ pending: 'Pending', awaiting: 'Vendor not approved', approved: 'Approved', paid: 'Paid', rejected: 'Rejected' }[c.status]}</Badge></div></div>
              {c.status === 'pending' && <div className="mt-3 flex gap-2"><Button size="sm" variant="dangerSoft" className="flex-1" onClick={() => act(c, 'rejected')}>Reject</Button><Button size="sm" className="flex-1" onClick={() => act(c, 'approved')}>Approve</Button></div>}
              {c.status === 'approved' && <Button size="sm" full className="mt-3" onClick={() => act(c, 'paid')}>Mark as paid</Button>}
            </Card>
          ))}</div>
        )}
      </Section>
      <Button full variant="dangerSoft" icon={Trash2} onClick={() => setDlg('delete')}>Delete sales agent</Button>
    </Screen>
  )
}

/* ================= ORDERS OVERVIEW ================= */

/* ================= DISPUTES ================= */
export function AdminDisputes() {
  const nav = useNav()
  const { disputes } = useApp()
  const [f, setF] = useState('open')
  const list = disputes.filter((d) => (f === 'open' ? ['open', 'under_review', 'escalated'].includes(d.status) : f === 'resolved' ? ['resolved', 'refunded', 'rejected'].includes(d.status) : true))
  return (
    <Screen title="Cases">
      <Segmented value={f} onChange={setF} options={[{ id: 'open', label: 'Needs action' }, { id: 'resolved', label: 'Closed' }, { id: 'all', label: 'All' }]} />
      <div className="space-y-2.5">{list.map((d) => <Card key={d.id} onClick={() => nav.go('ad_case', { id: d.id })} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{d.id} · {d.ref}</span><StatusBadge s={d.status} /></div><p className="mt-1 text-sm font-bold">{d.title}</p><p className="mt-0.5 text-xs text-ink-500">{d.raisedBy} vs {d.against} · {d.created}</p></Card>)}{!list.length && <EmptyState icon={Gavel} title="No cases" />}</div>
    </Screen>
  )
}

/* ================= REPORTS ================= */
export function AdminReports() {
  const { toast, vendors, agents, addAudit, rfqs } = useApp()
  const [range, setRange] = useState('30')
  const [c, setC] = useState('all')
  const [loc, setLoc] = useState('All')
  const [vn, setVn] = useState('all')
  const [ag, setAg] = useState('all')
  const [sheet, setSheet] = useState(false)
  const [exp, setExp] = useState(false)
  const mult = ({ 7: 0.25, 30: 1, 90: 2.8 }[range]) * (c === 'all' ? 1 : 0.3) * (loc === 'All' ? 1 : 0.55) * (vn === 'all' ? 1 : 0.12) * (ag === 'all' ? 1 : 0.2)
  const n = (x) => Math.round(x * mult)
  const filters = [c !== 'all', loc !== 'All', vn !== 'all', ag !== 'all'].filter(Boolean).length
  return (
    <Screen
      title="Reports"
      back={false}
      right={<IconBtn label="Export" onClick={() => setExp(true)}><Download size={20} /></IconBtn>}
      overlay={
        <>
          <Sheet open={sheet} onClose={() => setSheet(false)} title="Report filters" footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => { setC('all'); setLoc('All'); setVn('all'); setAg('all') }}>Reset</Button><Button className="flex-[2]" onClick={() => setSheet(false)}>Apply</Button></div>}>
            <Select label="Category" value={c} onChange={(e) => setC(e.target.value)} options={[{ value: 'all', label: 'All categories' }, ...CATS.map((x) => ({ value: x.id, label: x.name }))]} />
            <Select label="Location" value={loc} onChange={(e) => setLoc(e.target.value)} options={['All', 'Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar']} />
            <Select label="Vendor" value={vn} onChange={(e) => setVn(e.target.value)} options={[{ value: 'all', label: 'All vendors' }, ...vendors.filter((v) => v.status === 'approved').map((v) => ({ value: v.id, label: v.name }))]} />
            <Select label="Sales agent" value={ag} onChange={(e) => setAg(e.target.value)} options={[{ value: 'all', label: 'All agents' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
          </Sheet>
          <Dialog open={exp} onClose={() => setExp(false)} title="Export report" actions={<><Button variant="secondary" className="flex-1" onClick={() => setExp(false)}>Cancel</Button><Button className="flex-1" onClick={() => { addAudit('Exported report', `${range}d · CSV`, 'financial'); toast('Report exported'); setExp(false) }}>Export CSV</Button></>}><p>Exports include the current date range and filters. Exports are logged in the audit trail.</p></Dialog>
        </>
      }
    >
      <Segmented value={range} onChange={setRange} options={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} />
      <button onClick={() => setSheet(true)} className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-semibold ring-1 ring-ink-200"><span className="flex items-center gap-2"><Layers size={17} className="text-brand-600" />Filters</span><span className="text-xs text-ink-500">{filters ? `${filters} applied` : 'Date, category, location, vendor, agent'}</span></button>
      <div className="grid grid-cols-2 gap-3"><Stat label="Registrations" value={n(340)} icon={UserPlus} tone="sky" /><Stat label="Active vendors" value={n(64)} icon={Store} tone="emerald" /><Stat label="Conversations" value={n(1188)} icon={MessageSquare} tone="amber" /><Stat label="Vendor replies < 2h" value={`${Math.min(96, 84 + Math.round(mult * 2))}%`} icon={CheckCircle2} tone="violet" /><Stat label="RFQs" value={n(41)} icon={FileText} tone="rose" /><Stat label="Agent conversions" value={n(19)} icon={BadgeCheck} tone="teal" /></div>
      <Card><p className="mb-3 text-sm font-bold">Customer–vendor conversations</p><BarChart data={REPORT.weeks.map((w, i) => ({ label: w, value: Math.max(1, Math.round(REPORT.gmv[i] * (mult > 1 ? 1 : Math.max(mult, 0.15)))) }))} height={110} /></Card>
      <Card className="flex items-center justify-between"><div><p className="text-sm font-bold">Cohort and funnel analytics, event tracking</p><p className="text-xs text-ink-500">Retention cohorts, funnels and event console</p></div><P2Badge /></Card>
      <Card className="space-y-3"><p className="text-sm font-bold">RFQ health</p><div className="grid grid-cols-3 gap-2 text-center">{[['Open', rfqs.filter((r) => r.status === 'open').length], ['With quotes', rfqs.filter((r) => r.status === 'quoted').length], ['No quotes', rfqs.filter((r) => !r.quotes.length).length]].map(([k, v]) => <div key={k} className="rounded-xl bg-ink-50 p-2"><p className="text-lg font-extrabold">{v}</p><p className="text-[11px] text-ink-500">{k}</p></div>)}</div></Card>
      <Card className="space-y-2"><p className="text-sm font-bold">Service-coverage gaps</p>{CATS.slice(0, 6).filter((c) => !vendors.some((v) => v.status === 'approved' && v.cat === c.id && (v.city === 'Ajmer' || (v.areas || []).includes('Ajmer')))).map((c) => <p key={c.id} className="text-sm text-ink-600">No approved {c.name} vendor covers Ajmer</p>)}</Card>
      <Card className="space-y-3"><p className="text-sm font-bold">Sales by category</p>{REPORT.byCat.map(([k, v], i) => <HBar key={k} label={k} value={v} max={38} right={`${v}%`} color={['bg-brand-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'][i]} />)}</Card>
    </Screen>
  )
}

/* ================= COMMERCIAL SETTINGS ================= */

/* ================= AUDIT LOG ================= */
export function AuditLog() {
  const { audit } = useApp()
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  const list = audit.filter((a) => (f === 'all' || a.kind === f) && (!q || (a.action + a.target + a.actor).toLowerCase().includes(q.toLowerCase())))
  const tone = { approval: 'teal', financial: 'emerald', setting: 'amber', user: 'violet' }
  const icon = { approval: ShieldCheck, financial: CircleDollarSign, CheckCircle2, setting: Settings, user: Users }
  return (
    <Screen title="Audit log" subtitle="Actor · action · target · time">
      <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search audit trail" />
      <Chips value={f} onChange={setF} options={[{ id: 'all', label: 'All' }, { id: 'approval', label: 'Approvals' }, { id: 'financial', label: 'Financial' }, { id: 'setting', label: 'Settings' }, { id: 'user', label: 'Users' }]} />
      <div className="space-y-2.5">
        {list.map((a) => { const I = icon[a.kind] || ScrollText; return (
          <Card key={a.id} className="!p-3.5"><div className="flex gap-3"><span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', SOFT[tone[a.kind]] || SOFT.slate)}><I size={17} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold leading-snug">{a.action}</p><p className="mt-0.5 truncate text-xs text-ink-600">{a.target}</p>{a.note && <p className="mt-1 text-xs italic text-ink-500">“{a.note}”</p>}<p className="mt-1 text-[11px] text-ink-400">{a.actor} · {a.at}</p></div></div></Card>
        ) })}
        {!list.length && <EmptyState icon={ScrollText} title="No entries" />}
      </div>
    </Screen>
  )
}

/* ================= MORE ================= */
export function AdminMore() {
  const nav = useNav()
  const { setMe, me } = useApp()
  return (
    <Screen title="More" back={false} pad={false}>
      <div className="space-y-4 p-4">
        <Card className="!p-4"><div className="flex items-center gap-3.5"><Avatar name={me.name || 'Priya Nair'} size={56} /><div><p className="text-base font-extrabold">{me.name || 'Priya Nair'}</p><p className="text-sm text-ink-500">Super Admin</p><Badge tone="green" className="mt-1.5"><Lock size={10} />2-step verified</Badge></div></div></Card>
        <Group>
          <ListRow icon={Layers} tone="indigo" title="Categories & fields" subtitle="Subcategories, required fields" onClick={() => nav.go('ad_categories')} />
          <ListRow icon={Briefcase} tone="teal" title="Sales agents" subtitle="Performance, commissions" onClick={() => nav.go('ad_agents')} />
          <ListRow icon={MessageSquare} tone="amber" title="Reports & activity" subtitle="Enquiries, RFQs, registrations" onClick={() => nav.go('ad_reports')} />
          <ListRow icon={Gavel} tone="rose" title="Cases" onClick={() => nav.go('ad_cases')} />
          <ListRow icon={Layers} tone="indigo" title="Taxonomy builder" onClick={() => nav.go('ad_taxonomy')} />
          <ListRow icon={Layers} tone="indigo" title="Geo rollout manager" onClick={() => nav.go('ad_geo')} />
          <ListRow icon={Briefcase} tone="teal" title="Company verification" onClick={() => nav.go('ad_company')} />
          <ListRow icon={Percent} tone="emerald" title="Subscriptions & billing" onClick={() => nav.go('ad_subs')} />
          <ListRow icon={MessageSquare} tone="amber" title="Review moderation" onClick={() => nav.go('ad_reviews')} />
          <ListRow icon={ScrollText} tone="slate" title="Configuration register" onClick={() => nav.go('ad_cfg')} />
          <ListRow icon={ScrollText} tone="slate" title="Maintenance & force update" onClick={() => nav.go('ad_maintenance')} last />
        </Group>
        <Group>
          <ListRow icon={Percent} tone="emerald" title="Platform settings" subtitle="Plans, commission, locations, features" onClick={() => nav.go('ad_settings')} />
          <ListRow icon={KeyRound} tone="violet" title="Roles & permissions" onClick={() => nav.go('ad_roles')} />
          <ListRow icon={ScrollText} tone="slate" title="Audit log" subtitle="Critical actions history" onClick={() => nav.go('ad_audit')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' }); nav.reset('c_home') }}>Log out</Button>
      </div>
    </Screen>
  )
}


export function AdminDispute({ params }) {
  const { disputes, patchDispute, addAudit, notify, toast, stamp, patchVendor, vendors } = useApp()
  const d = disputes.find((x) => x.id === (params.id || 'DSP-204'))
  const [dlg, setDlg] = useState(null)
  const [outcome, setOutcome] = useState('Warning issued to vendor')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const log = (action, status, extra) => {
    patchDispute(d.id, (x) => ({ status: status || x.status, actions: [...x.actions, { by: ME.admin, action, at: stamp() }] }))
    addAudit(action, d.id, 'user', extra)
    notify('customer', 'Update on your case', `${d.id}: ${action}`, 'order')
  }
  const submit = () => {
    if (dlg === 'resolve') {
      if (outcome === 'Vendor suspended') { const v = vendors.find((x) => x.name === d.against); if (v) patchVendor(v.id, { status: 'suspended' }) }
      log(`Resolved — ${outcome}${note ? ` (${note})` : ''}`, 'resolved', note)
    } else if (dlg === 'reject') {
      if (note.trim().length < 5) return setErr('Please provide a reason')
      log(`Report rejected — ${note}`, 'rejected', note)
    } else if (dlg === 'respond') {
      log(`Asked ${d.against} to respond${note ? ` — ${note}` : ''}`, 'under_review')
    }
    toast('Action recorded'); setDlg(null); setNote(''); setErr('')
  }
  const closed = ['resolved', 'rejected', 'refunded'].includes(d.status)
  return (
    <Screen
      title={d.id}
      subtitle={d.ref}
      right={<StatusBadge s={d.status} className="mr-2" />}
      overlay={<Dialog open={!!dlg} onClose={() => { setDlg(null); setErr('') }} title={{ resolve: 'Resolve report', reject: 'Reject report', respond: 'Ask for a response' }[dlg] || ''} actions={<><Button variant="secondary" className="flex-1" onClick={() => { setDlg(null); setErr('') }}>Cancel</Button><Button variant={dlg === 'reject' ? 'danger' : 'primary'} className="flex-1" onClick={submit}>Confirm</Button></>}>{dlg === 'resolve' && <Select label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} options={['Warning issued to vendor', 'Listing removed', 'Vendor suspended', 'No action needed']} />}<Input textarea rows={2} label={dlg === 'reject' ? 'Reason' : 'Note (optional)'} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} error={err} /></Dialog>}
      footer={!closed && <div className="flex gap-2"><Button variant="dangerSoft" onClick={() => setDlg('reject')}>Reject</Button><Button variant="secondary" className="flex-1" onClick={() => setDlg('respond')}>Ask for reply</Button><Button className="flex-1" onClick={() => setDlg('resolve')}>Resolve</Button></div>}
    >
      <Card><p className="text-base font-bold">{d.title}</p><p className="mt-2 text-sm text-ink-600">{d.desc}</p></Card>
      <Card><KV rows={[['Type', d.kind], ['Raised by', d.raisedBy], ['Against', d.against], ['Opened', d.created]]} /></Card>
      <Card className="flex items-center justify-between"><div><p className="text-sm font-bold">Helpdesk macros and SLA timers</p><p className="text-xs text-ink-500">Canned replies and escalation timers</p></div><P2Badge /></Card>
      <Section title="Action log (recorded)"><Card><Timeline steps={d.actions.map((a) => ({ label: a.action, at: `${a.by} · ${a.at}`, done: true }))} /></Card></Section>
    </Screen>
  )
}

/* ================= COMMERCIAL SETTINGS ================= */
function LegacyAdminSettings() {
  const { settings, setSettings, addAudit, toast } = useApp()
  const [d, setD] = useState(settings)
  const coupons = d.coupons || []
  const dirty = JSON.stringify(d) !== JSON.stringify(settings)
  const save = () => {
    if (d.agentCommission.amount !== settings.agentCommission.amount) addAudit(`Changed agent commission ${settings.agentCommission.amount ?? 'unset'} → ${d.agentCommission.amount ?? 'unset'}`, 'Commercial settings', 'setting')
    d.plans.forEach((p, i) => { if (p.active !== settings.plans[i].active) addAudit(`${p.active ? 'Enabled' : 'Disabled'} vendor plan ${p.name}`, 'Commercial settings', 'setting') })
    d.locations.forEach((l, i) => { if (l.on !== settings.locations[i].on) addAudit(`${l.on ? 'Opened' : 'Closed'} location ${l.city}`, 'Commercial settings', 'setting') })
    Object.keys(d.features).forEach((k) => { if (d.features[k] !== settings.features[k]) addAudit(`${d.features[k] ? 'Enabled' : 'Disabled'} feature: ${k}`, 'Commercial settings', 'setting') })
    Object.keys(d.channels).forEach((k) => { if (d.channels[k] !== settings.channels[k]) addAudit(`${d.channels[k] ? 'Enabled' : 'Disabled'} channel: ${k}`, 'Commercial settings', 'setting') })
    setSettings(d); toast('Settings saved & logged')
  }
  return (
    <Screen title="Platform settings" footer={<Button full size="lg" disabled={!dirty} onClick={save}>Save changes</Button>}>
      <Banner tone="blue">Customers do not pay through VendorVerse — they talk to vendors directly. Revenue comes from vendor plans. Every change is written to the audit log.</Banner>
      <Section title="Vendor plans"><Group>{d.plans.map((p, i) => <div key={p.id} className={cx('flex items-center gap-3 px-4 py-3', i < d.plans.length - 1 && 'border-b border-ink-100')}><span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Briefcase size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{p.name}</p><p className="text-xs text-ink-500">Sample · {p.listings} listings · {p.leads} enquiries/mo · price open (CFG-02)</p></div><button role="switch" aria-checked={p.active} aria-label={`Toggle ${p.name}`} onClick={() => setD({ ...d, plans: d.plans.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)) })} className={cx('relative h-7 w-12 shrink-0 rounded-full transition', p.active ? 'bg-brand-600' : 'bg-ink-300')}><span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', p.active ? 'left-[22px]' : 'left-0.5')} /></button></div>)}</Group></Section>
      <Section title="Sales-agent commission"><Card className="space-y-3"><Input label="Per activated vendor" prefix="₹" inputMode="numeric" value={String(d.agentCommission.amount ?? "")} placeholder="Open (O-03)" onChange={(e) => setD({ ...d, agentCommission: { ...d.agentCommission, amount: +e.target.value.replace(/\D/g, '') } })} /><Toggle label="Admin approval required" desc="Attribution must be verified before payout" on={d.agentCommission.approvalRequired} onChange={(v) => setD({ ...d, agentCommission: { ...d.agentCommission, approvalRequired: v } })} /></Card></Section>
      <Section title="Launch locations"><Card className="space-y-1">{d.locations.map((l) => <Toggle key={l.city} label={l.city} on={l.on} onChange={(v) => setD({ ...d, locations: d.locations.map((x) => (x.city === l.city ? { ...x, on: v } : x)) })} />)}</Card></Section>
      <Section title="Feature availability"><Card className="space-y-1">{[['messaging', 'Customer ↔ vendor messaging'], ['rfq', 'RFQs & quotations'], ['reviews', 'Reviews'], ['hindi', 'Hindi language'], ['subscriptions', 'Paid vendor subscriptions'], ['sponsored', 'Sponsored placements (Phase 2)']].map(([k, label]) => <Toggle key={k} label={label} on={d.features[k]} onChange={(v) => setD({ ...d, features: { ...d.features, [k]: v } })} />)}</Card></Section>
      <Section title="Feature-flag console"><Card className="flex items-center justify-between"><p className="text-sm text-ink-600">Turn features on per country, city or cohort without a release.</p><P2Badge /></Card></Section>
      <Section title="Notification channels"><Card className="space-y-1">{[['inapp', 'In-app (baseline)'], ['email', 'Email'], ['sms', 'SMS'], ['push', 'Push'], ['whatsapp', 'WhatsApp']].map(([k, label]) => <Toggle key={k} label={label} desc={k !== 'inapp' ? 'Requires provider readiness' : 'Always on'} on={d.channels[k]} onChange={(v) => k !== 'inapp' && setD({ ...d, channels: { ...d.channels, [k]: v } })} />)}</Card></Section>
    </Screen>
  )
}



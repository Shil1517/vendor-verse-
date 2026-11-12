import { useState } from 'react'
import { Store, Factory, Wrench, Star, Trophy, ShieldCheck, FileText, Wallet, ClipboardList, Target, Clock, Receipt, RefreshCw, Landmark, CreditCard, Globe, WifiOff, SearchX } from 'lucide-react'
import { Badge, Banner, Button, Card, Checkbox, Chips, EmptyState, Group, HBar, Input, ListRow, Section, Select, Stars, StatusBadge, Toggle, Stat, fmt, cx } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { VENDOR_ROLES } from '../vendorRoles.js'
import { P2Badge, Page, Facts, Links, Checklist, SampleBadge } from './blocks.jsx'
import { AppealQueue } from './p1-depth.jsx'
import { computePublicationGates } from '../services/publicationGates.js'
import { TRUST_LEVELS as TRUST_LEVELS_SVC, levelBadges } from '../services/verification.js'

/* ============ vendor onboarding by type (F-VND-01, F-VND-02) ============ */
const COUNTRY_CODE = { India: 'IN' }
export function RegisterType({ params = {} }) {
  const nav = useNav()
  const [country, setCountry] = useState('India')
  return <Page title="Become a vendor" subtitle="Tell us who you are">
    <Select label="Which country is your business in?" value={country} onChange={(e) => setCountry(e.target.value)} options={['India']} hint="Asked first, because verification evidence depends on it. Other countries open in Phase 2." />
    <Group>
      <ListRow icon={Wrench} title="Service provider" subtitle="Electricians, cleaners, caterers and other services" onClick={() => nav.go('v_register_svc', { name: params.biz, country: COUNTRY_CODE[country] })} />
      <ListRow icon={Factory} title="Manufacturer / supplier" subtitle="Goods, bulk supply and wholesale" onClick={() => nav.go('v_register_mfr', { name: params.biz, country: COUNTRY_CODE[country] })} last />
    </Group>
    <p className="text-xs text-ink-500">Own a registered company for 3+ years? Open a <button className="font-bold text-brand-700" onClick={() => nav.go('b_eligibility')}>Business account</button> instead.</p>
  </Page>
}

/* The role a path starts with. Every vendor role comes from the shared registry (D-023, D-024); a vendor can hold several. */
const DEFAULT_ROLE = { svc: 'SERVICE_PROVIDER', mfr: 'MANUFACTURER' }
const IND_CAT = { 'Home & facilities': 'home', Construction: 'build', Events: 'event', 'Professional services': 'staff', 'Wholesale and distribution': 'elec' }
function TypedRegister({ kind, params = {} }) {
  const nav = useNav()
  const { toast } = useApp()
  const svc = kind === 'svc'
  const [f, setF] = useState({ name: params.name || '', roles: [DEFAULT_ROLE[kind]], cat: svc ? 'Home & facilities' : 'Wholesale and distribution', area: 'Jaipur', moq: '' })
  const next = () => {
    if (!f.name.trim()) return toast('Enter your business name', 'warn')
    if (!f.roles.length) return toast('Choose at least one vendor role', 'warn')
    const goods = f.roles.some((r) => VENDOR_ROLES[r]?.offer === 'products')
    nav.go('v_register', { name: f.name, cat: IND_CAT[f.cat], vendorType: goods ? 'manufacturer_supplier' : 'service_provider', country: params.country || 'IN', businessType: f.roles[0], roleCodes: f.roles.slice(1) })
  }
  return <Page title={svc ? 'Service provider' : 'Manufacturer / supplier'} subtitle="Business details" footer={<Button full onClick={next}>Continue to verification</Button>}>
    <Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
    <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Your vendor roles</p><Chips multi value={f.roles} onChange={(roles) => setF({ ...f, roles })} options={Object.entries(VENDOR_ROLES).map(([id, r]) => ({ id, label: r.label }))} /><p className="mt-1.5 text-xs text-ink-500">Pick every role that applies. A role is shown publicly only after it is verified.</p></div>
    <Select label="Industry" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} options={['Home & facilities', 'Construction', 'Events', 'Professional services', 'Wholesale and distribution']} />
    <Input label={svc ? 'Service areas' : 'Delivery regions'} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} hint={svc ? 'Cities and radius you serve' : 'Where you can ship'} />
    {!svc && <Input label="Minimum order quantity" value={f.moq} onChange={(e) => setF({ ...f, moq: e.target.value })} />}
    {svc && <Banner tone="blue">Bookings need an availability calendar. You set it after verification.</Banner>}
  </Page>
}
export const RegisterSvc = (p) => <TypedRegister kind="svc" {...p} />
export const RegisterMfr = (p) => <TypedRegister kind="mfr" {...p} />

/* ============ F-VND-05 publication gates (computed live) ============ */
export function ListingGate() {
  const { me, vendor, listings } = useApp()
  const v = vendor(me.vendorId) || {}
  const mine = listings.filter((l) => l.vendorId === v.id)
  const { gates: liveGates, met: ok } = computePublicationGates({ me, vendor: v, listings })
  const gates = liveGates.map((g) => [g.label, g.ok, g.hint])
  return <Page title="Publication checklist" subtitle={`${ok} of 6 gates met`}>
    <Banner tone={ok === 6 ? 'green' : 'amber'} title={ok === 6 ? 'You can publish' : 'Some gates are open'}>These are computed live each time. They are never stored, so they always reflect today.</Banner>
    <Checklist items={gates} />
  </Page>
}

/* ============ F-VND-08 / F-GEO-06 service areas and availability ============ */
export function ServiceAreas() {
  const { vendor, me, patchVendor, toast } = useApp()
  const v = vendor(me.vendorId)
  const [areas, setAreas] = useState(v?.areas || ['Jaipur'])
  const [f, setF] = useState({ add: '', radius: '15', remote: false })
  return <Page title="Where you work" subtitle="Cities, states, countries, radius, remote" footer={<Button full onClick={() => { patchVendor(v.id, { areas }); toast('Coverage saved') }}>Save coverage</Button>}>
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-2">{areas.map((a) => <button key={a} onClick={() => setAreas(areas.filter((x) => x !== a))} className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">{a} ✕</button>)}</div>
      <div className="flex gap-2"><Input label="Add city, state or country" value={f.add} onChange={(e) => setF({ ...f, add: e.target.value })} /><Button className="mt-6" variant="secondary" onClick={() => { if (f.add.trim()) { setAreas([...areas, f.add.trim()]); setF({ ...f, add: '' }) } }}>Add</Button></div>
      <Select label="Service radius" value={f.radius} onChange={(e) => setF({ ...f, radius: e.target.value })} options={['5', '15', '25', '50'].map((r) => ({ value: r, label: `${r} km` }))} />
      <Toggle label="I can work remotely" desc="Shown as Remote, never as Local" on={f.remote} onChange={(v2) => setF({ ...f, remote: v2 })} />
    </Card>
  </Page>
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export function Availability() {
  const { toast } = useApp()
  const [on, setOn] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false })
  const [cap, setCap] = useState('2')
  return <Page title="Availability" subtitle="When customers can book you" footer={<Button full onClick={() => toast('Availability saved')}>Save</Button>}>
    <Card className="space-y-1">{DAYS.map((d) => <Toggle key={d} label={`${d} · 09:00 AM – 06:00 PM`} on={on[d]} onChange={(v) => setOn({ ...on, [d]: v })} />)}</Card>
    <Select label="Jobs at the same time" value={cap} onChange={(e) => setCap(e.target.value)} options={['1', '2', '3']} hint="Instant booking is offered only when capacity is reliable." />
  </Page>
}

/* ============ F-VND-09 / F-TRU-02 public profile with trust ============ */
export const TRUST_LEVELS = TRUST_LEVELS_SVC
export function PublicProfile({ params = {} }) {
  const { vendor, reviews } = useApp()
  const v = vendor(params.id || 'v-me')
  const rv = reviews.filter((r) => r.target === v.id)
  return <Page title={v.name} subtitle="How customers see you">
    <Card className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">Trust</p>{rv.length ? <Badge tone="green">Trust score {Math.min(99, Math.round(v.rating * 20))}</Badge> : <Badge tone="gray">No reviews yet</Badge>}</div>
      <div className="flex flex-wrap gap-2">{levelBadges(v).map(([k, l]) => <Badge key={k} tone="teal"><ShieldCheck size={12} />{k} {l} · 06 Mar 2026</Badge>)}</div>
      <div className="flex items-center gap-2 text-xs text-ink-500"><Badge tone="gray">L4 Third-party KYB</Badge><P2Badge /></div><p className="text-xs text-ink-500">Badges say what was verified and when. Trust is computed by the platform and cannot be bought.</p>
    </Card>
    <Facts rows={[['Since', v.since], ['Areas', (v.areas || []).join(', ')], ['Rating', v.rating ? `${v.rating} (${v.reviews})` : 'New']]} />
  </Page>
}

/* ============ F-TRU-01 reviews ============ */
export function ReviewNotEligible() {
  const nav = useNav()
  return <Page title="Review not available yet">
    <EmptyState icon={Star} title="You can review after a completed job" body="Reviews are open only after a recorded booking, accepted quote, purchase order or contract milestone." action={<Button onClick={() => nav.go('c_activity')}>See my activity</Button>} />
  </Page>
}
export function MyReviews() {
  const { reviews, me } = useApp()
  const mine = reviews.filter((r) => r.by === me.name || r.by === 'Meera Kapoor').slice(0, 3)
  return <Page title="My reviews" subtitle="Reviews you wrote">
    {mine.length === 0 ? <EmptyState icon={Star} title="No reviews yet" /> : mine.map((r) => <Card key={r.id}><div className="flex items-center justify-between"><Stars value={r.rating} size={16} /><span className="text-xs text-ink-400">{r.at}</span></div><p className="mt-2 text-sm">{r.text}</p>{r.reply && <p className="mt-2 rounded-xl bg-ink-50 p-2 text-xs text-ink-600">Vendor reply: {r.reply}</p>}</Card>)}
  </Page>
}
export function AdminReviews() {
  const { reviews, setReviews, addAudit, toast } = useApp()
  const [hidden, setHidden] = useState([])
  return <Page title="Review moderation" subtitle="Reported reviews and appeals">
    {reviews.slice(0, 4).map((r) => <Card key={r.id}><div className="flex items-center justify-between"><p className="text-sm font-bold">{r.by}</p>{hidden.includes(r.id) ? <Badge tone="gray">Hidden</Badge> : <Badge tone="amber">Reported</Badge>}</div><p className="mt-1 text-sm text-ink-600">{r.text}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setHidden([...hidden, r.id]); addAudit('Hid review', r.by, 'approval'); toast('Review hidden') }}>Hide</Button><Button size="sm" variant="ghost" onClick={() => toast('Review kept')}>Keep</Button></div></Card>)}
    <p className="text-xs text-ink-500">Vendor appeals of a hidden review go to a human reviewer.</p>
    <AppealQueue />
  </Page>
}

/* ============ F-TRU-04 vendor cases and appeals ============ */
/* ============ discovery details ============ */
export function ExploreError() {
  const nav = useNav()
  return <Page title="Search" subtitle="Something went wrong">
    <EmptyState icon={WifiOff} title="We couldn't load results" body="Check your connection and try again. Your filters are saved." action={<div className="flex gap-2"><Button onClick={() => nav.back()}>Try again</Button><Button variant="secondary" onClick={() => nav.go('c_categories')}>Browse categories</Button></div>} />
    <EmptyState icon={SearchX} title="No results" body="Try fewer filters, a nearby city, or request a quotation." action={<Button variant="secondary" onClick={() => nav.go('c_rfq_new')}>Request a quotation</Button>} />
  </Page>
}

export function ListingNoData({ params = {} }) {
  const { listings, vendor } = useApp()
  const l = listings.find((x) => x.id === (params.id || 'l6')) || listings[0]
  return <Page title={l.title} subtitle={vendor(l.vendorId)?.name}>
    <Banner tone="amber" title="Some details are missing">The vendor has not filled in every field. We show that instead of guessing.</Banner>
    <Facts rows={(l.specs || []).map(([k, v]) => [k, v === '—' ? <span key={k} className="text-ink-400">Not provided</span> : v])} />
    <Facts rows={[['Price', l.price ? fmt(l.price) : 'Not provided'], ['Delivery', l.lead ? `${l.lead} days` : 'Not provided'], ['Warranty', 'Not provided']]} />
  </Page>
}

export const TIERS = [['1 – 9', 100], ['10 – 49', 94], ['50+', 88]]
export function ListingTrade({ params = {} }) {
  const { listings, vendor } = useApp()
  const nav = useNav()
  const l = listings.find((x) => x.id === (params.id || 'l7')) || listings[0]
  return <Page title={l.title} subtitle={vendor(l.vendorId)?.name}>
    <Facts title="Trade details" rows={[['Supplier type', 'Manufacturer / supplier'], ['Minimum order', `${l.moq || 1} ${l.unit}`], ['Lead time', `${l.lead || 3} days`], ['Delivery regions', 'Jaipur, Ajmer, Sikar'], ['Certifications', 'ISI · mill test certificate'], ['Customs, export markets, trade documents', <P2Badge key="p2" />]]} />
    <Button full onClick={() => nav.go('c_rfq_goods')}>Request a quotation</Button>
  </Page>
}

export function ProductPage({ params = {} }) {
  const { listings, vendor } = useApp()
  const nav = useNav()
  const l = listings.find((x) => x.id === (params.id || 'l7')) || listings[0]
  return <Page title={l.title} subtitle={vendor(l.vendorId)?.name}>
    <Card><p className="text-sm text-ink-600">{l.desc}</p><p className="mt-3 text-2xl font-extrabold text-brand-700">{fmt(l.price)}<span className="text-xs font-semibold text-ink-400"> / {l.unit}</span></p></Card>
    <Section title="Volume pricing"><Group>{TIERS.map(([q, pct], i) => <ListRow key={q} title={`${q} ${l.unit}s`} subtitle={pct === 100 ? 'Listed price' : `Indicative — confirm in a quotation`} right={<span className="text-sm font-bold">{fmt(Math.round((l.price * pct) / 100))}</span>} last={i === 2} />)}</Group></Section>
    <Facts rows={[['Minimum order', `${l.moq || 1} ${l.unit}`], ['Delivery regions', 'Jaipur, Ajmer, Sikar'], ['Lead time', `${l.lead || 2} days`]]} />
    <Button full onClick={() => nav.go('c_order_new', { listingId: l.id })}>Create purchase order</Button>
  </Page>
}

/* ============ customer dashboard (F-XCT-06) ============ */
export function CustomerDashboard() {
  const { bookings, rfqs, orders, me } = useApp()
  const nav = useNav()
  return <Page title="Dashboard" subtitle={me.name}>
    <div className="grid grid-cols-2 gap-3"><Stat label="Open bookings" icon={Clock} value={bookings.filter((b) => ['requested', 'accepted'].includes(b.status)).length} onClick={() => nav.go('c_activity')} /><Stat label="Active RFQs" icon={ClipboardList} value={rfqs.filter((r) => r.mine && ['open', 'quoted'].includes(r.status)).length} onClick={() => nav.go('c_activity')} /><Stat label="Purchase orders" icon={Receipt} value={orders.length} onClick={() => nav.go('c_orders')} /><Stat label="Contracts" icon={FileText} value={2} onClick={() => nav.go('c_activity')} /></div>
    <Links title="Quick actions" items={[[ClipboardList, 'Request a quotation', 'Services or goods', 'c_rfq_new'], [Store, 'Find a supplier', 'Suppliers and manufacturers', 'c_explore_suppliers'], [Star, 'My reviews', '', 'c_reviews']]} />
  </Page>
}

/* ============ agent screens (F-AGT-03/04/05) ============ */
export function AgentTasks() {
  const [tasks, setTasks] = useState([['Collect GST certificate — Gupta Sanitary Mart', false], ['Upload PAN — Rajputana Caterers', false], ['Check approval status — TechNova Systems', true]])
  return <Page title="Onboarding tasks" subtitle="Assigned by Super Admin" back={false}>
    <Group>{tasks.map(([t, d], i) => <div key={t} className={cx('px-4 py-3', i < tasks.length - 1 && 'border-b border-ink-100')}><Checkbox checked={d} onChange={(v) => setTasks(tasks.map((x, k) => (k === i ? [x[0], v] : x)))}>{t}</Checkbox></div>)}</Group>
  </Page>
}
export function AgentPerms() {
  return <Page title="What you can and cannot do">
    <Section title="You can"><Checklist items={[['Add and track prospective vendors', true], ['Help a vendor register with their consent', true], ['See conversion of your own leads', true]]} /></Section>
    <Section title="You cannot"><Group>{['See customer transactions', 'Read private chats', 'Approve or reject verification', 'Approve your own commission'].map((t, i) => <ListRow key={t} title={t} right={<Badge tone="red">Not allowed</Badge>} last={i === 3} />)}</Group></Section>
  </Page>
}
/* ============ admin: config register, maintenance ============ */
const CFG = [['CFG-01', 'Plan names and entitlements', 'Product'], ['CFG-02', 'Plan prices', 'Business'], ['CFG-03', 'Response deadlines', 'Operations'], ['CFG-04', 'Cancellation policy defaults', 'Operations'], ['CFG-05', 'Review window', 'Trust'], ['CFG-06', 'Case SLA targets', 'Support'], ['CFG-07', 'Sponsored pricing', 'Business'], ['CFG-08', 'Data retention and export', 'Legal'], ['CFG-09', 'Tax rules per country', 'Finance'], ['CFG-10', 'Notification providers and templates', 'Product'], ['CFG-11', 'Search ranking weights', 'Product'], ['CFG-12', 'Verification evidence per category', 'Trust']]
export function ConfigRegister() {
  const [done, setDone] = useState({})
  return <Page title="Open configuration register" subtitle="Values nobody has decided yet">
    <Banner tone="blue">Nothing here is invented. Each item stays open until its owner decides.</Banner>
    <Group>{CFG.map(([id, name, owner], i) => <ListRow key={id} title={`${id} · ${name}`} subtitle={`Owner: ${owner}`} right={<Badge tone={done[id] ? 'green' : 'amber'}>{done[id] ? 'Decided' : 'Open'}</Badge>} onClick={() => setDone({ ...done, [id]: !done[id] })} last={i === CFG.length - 1} />)}</Group>
  </Page>
}

export function Maintenance() {
  const { toast, addAudit } = useApp()
  const [m, setM] = useState({ on: false, force: false, min: '1.4.0' })
  return <Page title="Maintenance and updates" subtitle="Maintenance screen and forced update" footer={<Button full onClick={() => { addAudit(`Maintenance ${m.on ? 'on' : 'off'}, force update ${m.force ? 'on' : 'off'}`, 'App availability', 'setting'); toast('Saved') }}>Save</Button>}>
    <Card className="space-y-2"><Toggle label="Show maintenance screen" desc="Users see a calm page and a retry button" on={m.on} onChange={(v) => setM({ ...m, on: v })} /><Toggle label="Force update" desc="Block versions below the minimum" on={m.force} onChange={(v) => setM({ ...m, force: v })} /><Input label="Minimum version" value={m.min} onChange={(e) => setM({ ...m, min: e.target.value })} /></Card>
    {m.on && <Banner tone="amber" title="Preview — maintenance">We are making VendorVerse better. Back shortly.</Banner>}
  </Page>
}

/* ============ Phase 2 previews (payments) with a visible badge (D-010) ============ */
function P2({ title, subtitle, rows, body, icon: Icon = CreditCard }) {
  return <Page title={title} subtitle={subtitle} phase2>
    {body && <Banner tone="blue">{body}</Banner>}
    <Facts rows={rows} />
    <Button full disabled icon={Icon}>Available in Phase 2</Button>
  </Page>
}
export const PayCheckout = () => <P2 title="Checkout and escrow" subtitle="Pay on the platform" body="Funds are held and released by milestone." rows={[['Method', 'UPI / card / net banking'], ['Release', 'On milestone confirmation'], ['Protection', 'Escrow with dispute hold']]} />
export const PayHub = () => <P2 title="Payments" subtitle="History and receipts" rows={[['Methods', 'Saved payment methods'], ['History', 'All platform payments'], ['Receipts', 'Tax invoices']]} icon={Receipt} />
export const Wallet2 = () => <P2 title="Wallet" subtitle="Top-up and balance" rows={[['Balance', 'Shown here'], ['Top-up', 'UPI / card'], ['Use', 'At checkout']]} icon={Wallet} />
export const RefundRequest = () => <P2 title="Request a refund" subtitle="Reason and bank check" rows={[['Reason', 'Required'], ['Evidence', 'Optional'], ['Bank verification', 'Before payout']]} icon={RefreshCw} />
export const RefundStatus = () => <P2 title="Refund status" subtitle="Track a refund" rows={[['Requested', 'Date'], ['Reviewed', 'By support'], ['Paid out', 'To verified bank']]} icon={RefreshCw} />
export const VendorRefunds = () => <P2 title="Refunds and bank verification" subtitle="Vendor side" rows={[['Refund requests', 'Respond within SLA'], ['Bank account', 'Verified before payouts']]} icon={Landmark} />
export const VendorPayouts = () => <P2 title="Earnings and payouts" subtitle="Settlements" rows={[['Pending', 'Awaiting milestone'], ['Settled', 'History'], ['TCS / TDS', 'Phase 2 tax handling']]} icon={Wallet} />
export const AdminCommission = () => <P2 title="Revenue and commission" subtitle="Platform commission engine" rows={[['Commission rates', 'Open — needs dual approval (O-05)'], ['Revenue', 'By category and city'], ['Changes', 'Audited']]} icon={Landmark} />
export const PayFx = () => <P2 title="Foreign-currency checkout" subtitle="Pay in your currency" rows={[['Display currency', 'Toggle'], ['Conversion', 'Rate shown before paying'], ['Incoterms', 'For cross-border orders']]} icon={Globe} />

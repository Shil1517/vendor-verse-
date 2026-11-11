import { useMemo, useState } from 'react'
import {
  Globe, MapPin, Search, ChevronRight, Check, Plus, Crosshair, BellRing, ThumbsUp, Download, ArrowRight, Layers, Languages, Rocket, Target, Workflow, Compass, ChevronDown, ChevronUp, Sparkles, Lock,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, cat, MY_LOC } from '../data.jsx'
import { lookupPin, GEO, country, LAUNCH_LABEL, CUR, INDUSTRIES, LAUNCH_CATS, ROADMAP, ARCH, PHASES } from '../globaldata.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Input, Select, Badge, Banner, EmptyState, cx, Pill, ListRow, Group, PhaseTag, PhaseBanner, StatusBadge, HBar,
} from '../ui.jsx'

/* ================= LOCATION: Country → State → City → Pincode ================= */
export function Location({ params = {} }) {
  const nav = useNav()
  const { loc, setLoc, toast, waitlist, setWaitlist, geo, dispCur, setDispCur, lang, setLang } = useApp()
  const [cc, setCc] = useState(params.country || loc.country || 'IN')
  const [st, setSt] = useState(params.state || loc.state || null)
  const [city, setCity] = useState(params.city || loc.city || null)
  const [pin, setPin] = useState(loc.pin || '')
  const [q, setQ] = useState('')
  const C = geo.find((c) => c.code === cc)
  const S = C?.states.find((x) => x.name === st)
  const Ct = S?.cities.find((x) => x.n === city)
  const det = pin.length >= 5 ? lookupPin(pin) : null
  const onPin = (v) => {
    const x = v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8)
    setPin(x)
    const d = lookupPin(x)
    if (d && !d.unknown) { setCc(d.country); setSt(d.state); setCity(d.city) }
  }
  const err = pin && /^\d{6}$/.test(pin) && det?.unknown ? 'We couldn’t match this pincode — pick your city below' : pin && !det && pin.length >= 5 ? 'Pincode not recognised — try another or choose manually' : ''
  const live = Ct?.s === 'live'
  const joined = Ct && waitlist.includes(`${cc}-${Ct.n}`)
  const countries = geo.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Screen
      title="Where do you need vendors?"
      subtitle="Country → state → city"
      footer={live ? <Button full size="lg" disabled={!!err || !pin || (det && !det.unknown && det.city !== city)} onClick={() => { setLoc({ country: cc, state: st, city, pin }); toast(`Showing vendors that serve ${city} ${pin}`); nav.back() }}>Apply location</Button> : Ct ? <Button full size="lg" variant={joined ? 'secondary' : 'primary'} icon={BellRing} onClick={() => { if (!joined) setWaitlist([...waitlist, `${cc}-${Ct.n}`]); toast(joined ? 'You are on the waitlist' : `We’ll tell you the day ${Ct.n} goes live`) }}>{joined ? 'On the waitlist ✓' : `Notify me when ${Ct.n} launches`}</Button> : null}
    >
      <Banner tone="blue" title="Launching city by city">VendorVerse is built for every country, but we switch on cities and categories only when there is enough verified supply. Pick yours — if it isn’t live yet, join the waitlist.</Banner>
      <Button full variant="secondary" icon={Crosshair} onClick={() => { setCc(MY_LOC.country); setSt(MY_LOC.state); setCity(MY_LOC.city); setPin(MY_LOC.pin); toast('Location permission granted — Jaipur 302021') }}>Use current location</Button>

      <Section title="Enter your pincode — we detect the rest">
        <Input inputMode="text" maxLength={8} icon={MapPin} placeholder="e.g. 302021 · 90001 · SW1A 1AA" value={pin} onChange={(e) => onPin(e.target.value)} error={err} hint="Supports Indian pincodes, US ZIP codes and UK postcodes" />
        {det && !det.unknown && (
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200"><span className="text-2xl">{det.flag}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-emerald-900">{det.city}, {det.state}</p><p className="text-xs text-emerald-800">{det.countryName} · detected from {det.pin}</p></div><StatusBadge s={det.status === 'live' ? 'live' : det.status} /></div>
        )}
      </Section>
      <Section title="1 · Country">
        <div className="mb-2"><div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search countries" className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /></div></div>
        <div className="grid grid-cols-2 gap-2">
          {countries.map((c) => (
            <button key={c.code} onClick={() => { setCc(c.code); setSt(null); setCity(null) }} className={cx('rounded-2xl p-3 text-left ring-1 ring-inset', cc === c.code ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200')}>
              <p className="text-lg">{c.flag} <span className="text-sm font-bold">{c.name}</span></p>
              <div className="mt-1 flex items-center justify-between"><StatusBadge s={c.launch === 'live' ? 'live' : c.launch} /><span className="text-[11px] text-ink-500">{c.cur}</span></div>
            </button>
          ))}
        </div>
      </Section>
      {C && (
        <Section title={`2 · State / region (${C.states.length})`}>
          <Select value={st || ''} onChange={(e) => { setSt(e.target.value || null); setCity(null) }} options={[{ value: '', label: 'Select a state / region' }, ...C.states.map((s) => ({ value: s.name, label: `${s.name} — ${s.cities.length} ${s.cities.length === 1 ? 'city' : 'cities'}` }))]} />
        </Section>
      )}
      {S && (
        <Section title="3 · City">
          <div className="space-y-2">{S.cities.map((c) => (
            <button key={c.n} onClick={() => { setCity(c.n); if (det && det.city !== c.n) setPin('') }} className={cx('flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset', city === c.n ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200')}>
              <MapPin size={18} className={c.s === 'live' ? 'text-brand-600' : 'text-ink-300'} />
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{c.n}</span><span className="block text-xs text-ink-500">{c.s === 'live' ? `${c.vendors} verified vendors` : `${c.wait} people waiting`}</span></span>
              <StatusBadge s={c.s === 'live' ? 'live' : c.s} />
            </button>
          ))}</div>
        </Section>
      )}
      {false && <Section title="4 · Pincode"><Input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} error={err} hint="Used for hyperlocal matching" /></Section>}
      {Ct && !live && <Banner tone="amber" title={`${Ct.n} is ${LAUNCH_LABEL[Ct.s].toLowerCase()}`}>You can still browse suppliers and manufacturers that <b>ship worldwide</b> and send RFQs. Local service providers appear here after launch.</Banner>}

      <Section title="Display currency & language">
        <Card className="space-y-3">
          <Select label="Show prices in" value={dispCur} onChange={(e) => setDispCur(e.target.value)} options={[{ value: 'local', label: 'Each vendor’s own currency' }, ...Object.entries(CUR).map(([k, v]) => ({ value: k, label: `${k} — ${v.name}` }))]} hint="Conversion is indicative. Billing is always in the vendor’s currency." />
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Language</p><div className="flex flex-wrap gap-2"><button onClick={() => setLang('en')} className={cx('rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset', lang === 'en' ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white ring-ink-200')}>English</button><button onClick={() => setLang('hi')} className={cx('rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset', lang === 'hi' ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white ring-ink-200')}>हिन्दी</button>{['العربية', 'Español', 'Français', 'Deutsch', '中文'].map((x) => <span key={x} className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3.5 py-2 text-[13px] font-semibold text-ink-400">{x}<PhaseTag p="P2" /></span>)}</div></div>
        </Card>
      </Section>
    </Screen>
  )
}

/* ================= CATEGORIES: dynamic, unlimited taxonomy ================= */
export function Categories() {
  const nav = useNav()
  const { catRequests } = useApp()
  const [q, setQ] = useState('')
  const list = INDUSTRIES.filter((i) => !q || (i.name + ' ' + i.subs.join(' ')).toLowerCase().includes(q.toLowerCase()))
  const total = INDUSTRIES.reduce((s, i) => s + i.cats, 0)
  const approved = catRequests.filter((c) => c.status === 'approved')
  return (
    <Screen title="Browse all categories" subtitle={`${INDUSTRIES.length} industries · ${total.toLocaleString('en-IN')} sample categories`} right={<Button size="sm" variant="secondary" icon={Plus} className="mr-2" onClick={() => nav.go('c_cat_suggest')}>Suggest</Button>}>
      <div className="relative"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any industry, product or service" className="h-12 w-full rounded-xl bg-white pl-10 pr-3 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /></div>
      <Banner tone="blue" title="All 30 industries are live to browse">Subcategory names and category counts are representative examples. Listing and RFQ workflows remain configured for the existing 10 industry groups; supply-building focuses on {LAUNCH_CATS.length} priority groups.</Banner>
      {approved.length > 0 && <Section title="Newly added by the community">{approved.map((c) => <Card key={c.id} className="!p-3.5"><p className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15} className="text-amber-500" />{c.name}</p><p className="text-xs text-ink-500">in {c.parent} · {c.votes} requests</p></Card>)}</Section>}
      <div className="space-y-2.5">
        {list.map((i) => (
          <Card key={i.id} className="!p-3.5">
            <div className="flex items-center gap-3"><Thumb tone={i.tone} icon={i.icon} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold leading-snug">{i.name}</p><p className="text-xs text-ink-500">{i.cats} sample categories · {i.subs.length} examples</p></div><Badge tone="green">Live</Badge></div>
            <div className="mt-3 border-t border-ink-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-ink-500">Example subcategories</p>
              <div className="flex flex-wrap gap-1.5">{i.subs.map((s) => <Pill key={s}>{s}</Pill>)}</div>
              {i.cat ? <Button size="sm" className="mt-3" icon={ArrowRight} onClick={() => nav.go('c_category', { id: i.cat })}>See vendors</Button> : <p className="mt-3 text-xs text-ink-500">Browseable now; listing and RFQ workflows are not configured for this industry yet.</p>}
            </div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={Search} title="No category matches" body="Can’t find yours? Suggest it — admins review suggestions and add attributes." action={<Button size="sm" onClick={() => nav.go('c_cat_suggest', { name: q })}>Suggest “{q}”</Button>} />}
      </div>
    </Screen>
  )
}

export function CategorySuggest({ params = {} }) {
  const nav = useNav()
  const { catRequests, setCatRequests, patchCatRequest, notify, toast, me } = useApp()
  const [f, setF] = useState({ name: params.name || '', parent: INDUSTRIES[0].name, desc: '' })
  const [attrs, setAttrs] = useState([])
  const [a, setA] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (f.name.trim().length < 4) return setErr('Name the category (min 4 characters)')
    setCatRequests((c) => [{ id: 'cr' + Date.now(), name: f.name.trim(), parent: f.parent, by: `${me.name} (${me.role || 'customer'})`, votes: 1, status: 'pending', attrs, at: 'Today' }, ...c])
    notify('admin', 'New category suggestion', `${f.name} under ${f.parent}`, 'listing', ['ad_taxonomy', { tab: 'requests' }])
    toast('Suggestion sent — admins will review it'); nav.back()
  }
  const pending = catRequests.filter((c) => c.status === 'pending')
  return (
    <Screen title="Suggest a category" subtitle="Help the marketplace cover every industry" footer={<Button full size="lg" onClick={submit}>Send suggestion</Button>}>
      <Input label="Category name" required placeholder="e.g. Drone services & aerial survey" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr('') }} error={err} />
      <Select label="Closest industry" value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })} options={INDUSTRIES.map((i) => i.name)} />
      <Input label="What do vendors in this category do?" textarea rows={3} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Useful details to capture (attributes)</p>
        <div className="mb-2 flex flex-wrap gap-2">{attrs.map((x) => <span key={x} className="flex items-center gap-1.5 rounded-full bg-ink-900 py-1.5 pl-3 pr-2 text-xs font-semibold text-white">{x}<button aria-label="Remove" onClick={() => setAttrs(attrs.filter((y) => y !== x))}>×</button></span>)}</div>
        <div className="flex gap-2"><input value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. Licence number, Payload kg" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (a.trim()) { setAttrs([...attrs, a.trim()]); setA('') } }}>Add</Button></div>
      </div>
      <Section title="Others are asking for">
        <div className="space-y-2">{pending.map((c) => <Card key={c.id} className="!p-3.5"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{c.name}</p><p className="text-xs text-ink-500">{c.parent} · {c.by}</p></div><button onClick={() => { patchCatRequest(c.id, { votes: c.votes + 1 }); toast('Vote added') }} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700"><ThumbsUp size={13} />{c.votes}</button></div></Card>)}</div>
      </Section>
    </Screen>
  )
}

/* ================= VISION & ROADMAP: MVP vs future ================= */
export function Vision() {
  const nav = useNav()
  const [ph, setPh] = useState('all')
  const [tab, setTab] = useState('roadmap')
  const [open, setOpen] = useState(0)
  const counts = useMemo(() => { const c = { MVP: 0, P2: 0, P3: 0 }; ROADMAP.forEach((p) => p.items.forEach(([, x]) => c[x]++)); return c }, [])
  const total = counts.MVP + counts.P2 + counts.P3
  const liveCities = GEO.flatMap((c) => c.states.flatMap((s) => s.cities)).filter((c) => c.s === 'live')
  return (
    <Screen title="Product vision" subtitle="Global marketplace · MVP vs future" pad={false}>
      <div className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 p-5 text-white">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
          <Globe size={30} />
          <h2 className="mt-2 text-xl font-extrabold leading-tight">The universal vendor marketplace for every industry, worldwide.</h2>
          <p className="mt-1.5 text-[13px] text-white/80">Service providers, suppliers, manufacturers, contractors and business vendors — one platform, launched city by city.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">{Object.entries(PHASES).map(([k, p]) => <Card key={k} className="!p-3 text-center"><PhaseTag p={k} /><p className="mt-1.5 text-2xl font-extrabold">{counts[k]}</p><p className="text-[10.5px] leading-tight text-ink-500">{p.when}</p></Card>)}</div>
        <Segmented value={tab} onChange={setTab} options={[{ id: 'roadmap', label: 'Roadmap' }, { id: 'launch', label: 'Launch scope' }, { id: 'arch', label: 'Architecture' }]} />
        {tab === 'roadmap' && (
          <>
            <Chips scroll={false} value={ph} onChange={setPh} options={[{ id: 'all', label: `All (${total})` }, { id: 'MVP', label: `MVP (${counts.MVP})` }, { id: 'P2', label: `Phase 2 (${counts.P2})` }, { id: 'P3', label: `Phase 3 (${counts.P3})` }]} />
            <div className="space-y-2.5">
              {ROADMAP.map((p, i) => {
                const items = p.items.filter(([, x]) => ph === 'all' || x === ph)
                if (!items.length) return null
                return (
                  <Card key={p.pillar} pad={false} className="overflow-hidden">
                    <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3.5 text-left"><span className="text-sm font-extrabold">{p.pillar}</span>{open === i ? <ChevronUp size={17} className="text-ink-400" /> : <ChevronDown size={17} className="text-ink-400" />}</button>
                    {open === i && <div className="space-y-2.5 border-t border-ink-100 px-4 py-3.5">{items.map(([t, x]) => <div key={t} className="flex items-start gap-2.5"><PhaseTag p={x} className="mt-0.5 shrink-0" /><p className="text-[13px] leading-snug text-ink-700">{t}</p></div>)}</div>}
                  </Card>
                )
              })}
            </div>
          </>
        )}
        {tab === 'launch' && (
          <div className="space-y-3">
            <Card><p className="text-sm font-extrabold">Live at launch</p><div className="mt-2 flex flex-wrap gap-1.5">{liveCities.map((c) => <Badge key={c.n} tone="green"><MapPin size={11} />{c.n}</Badge>)}</div></Card>
            <Card><p className="text-sm font-extrabold">Priority categories</p><div className="mt-2 flex flex-wrap gap-1.5">{LAUNCH_CATS.map((id) => <Pill key={id}>{cat(id).name}</Pill>)}</div><p className="mt-2 text-xs text-ink-500">The other categories are configured and visible but get supply-building attention after launch.</p></Card>
            <Card><p className="text-sm font-extrabold">Waiting to launch</p><div className="mt-3 space-y-2.5">{GEO.flatMap((c) => c.states.flatMap((s) => s.cities.filter((x) => x.s !== 'live').map((x) => ({ ...x, flag: c.flag })))).sort((a, b) => b.wait - a.wait).slice(0, 6).map((c) => <HBar key={c.n} label={`${c.flag} ${c.n}`} value={c.wait} max={620} right={`${c.wait} waiting`} color="bg-amber-500" />)}</div></Card>
            <PhaseBanner p="P2" title="Payments, commission and contracts are Phase 2">MVP launches with customers paying vendors directly, vendor subscriptions and sponsored visibility. The Phase 2 screens are in the mockup so the full product is reviewable — each is tagged.</PhaseBanner>
          </div>
        )}
        {tab === 'arch' && <div className="space-y-2.5">{ARCH.map(([t, d]) => <Card key={t} className="!p-4"><p className="text-sm font-extrabold">{t}</p><p className="mt-1 text-[13px] leading-snug text-ink-600">{d}</p></Card>)}<Card className="!p-4"><p className="text-sm font-extrabold">Responsive by design</p><p className="mt-1 text-[13px] text-ink-600">One rule set for mobile app and web. Mobile uses tab bars and sheets; web uses top nav / sidebars, tables and split panes.</p></Card></div>}
        <div className="flex gap-2"><Button className="flex-1" icon={Workflow} onClick={() => nav.go('flows')}>User flows</Button><Button className="flex-1" variant="secondary" icon={Compass} onClick={() => nav.go('c_categories')}>Taxonomy</Button></div>
      </div>
    </Screen>
  )
}

/* ================= USER FLOWS + SCREEN INVENTORY EXPORT ================= */
const FLOWS = [
  { id: 'F1', t: 'Discover → book a service', who: 'Customer ↔ Vendor', steps: [['Home', 'c_home'], ['Search & filter', 'c_explore'], ['Listing', 'c_listing'], ['Request booking', 'c_book_new'], ['Booking tracker', 'c_booking'], ['Vendor accepts', 'v_booking'], ['Confirm & review', 'c_review']] },
  { id: 'F2', t: 'Instant booking', who: 'Customer', steps: [['Listing ⚡', 'c_listing'], ['Choose “Book now”', 'c_book_new', 'instant'], ['Confirmed with ETA', 'c_booking']] },
  { id: 'F3', t: 'RFQ → compare → accept', who: 'Customer ↔ Vendor', steps: [['Create RFQ', 'c_rfq_new'], ['Vendor quotes', 'v_rfq'], ['Compare quotes', 'c_rfq'], ['Atomic accept', 'c_rfq_open'], ['Work order / contract', 'c_contract']] },
  { id: 'F4', t: 'Contract booking', who: 'Customer ↔ Vendor', phase: 'P2', steps: [['Propose contract', 'c_contract_new'], ['Vendor counters', 'v_contract'], ['E-sign & activate', 'c_contract'], ['Milestone / visit paid', 'c_pay']] },
  { id: 'F5', t: 'Global sourcing', who: 'Buyer ↔ Manufacturer', steps: [['Filter suppliers', 'c_explore'], ['Trade details & tiers', 'c_listing_trade'], ['Global RFQ (incoterms, currency)', 'c_rfq_new'], ['Compare quotes', 'c_rfq'], ['Samples / contract', 'c_contract_new']] },
  { id: 'F6', t: 'Vendor onboarding → publish', who: 'Vendor ↔ Admin', steps: [['Onboard', 'v_register'], ['Verification tiers', 'v_verify'], ['Reviewer decision', 'ad_vendor'], ['Subscribe', 'v_sub'], ['Create listing', 'v_listing_edit'], ['Listing review', 'ad_listing'], ['Publication checklist', 'v_listing_gate']] },
  { id: 'F7', t: 'Suggest a category', who: 'Anyone ↔ Admin', steps: [['Browse all', 'c_categories'], ['Suggest', 'c_cat_suggest'], ['Admin builder', 'ad_taxonomy'], ['Category goes live', 'c_category']] },
  { id: 'F8', t: 'Launch a new city', who: 'Customer ↔ Admin', steps: [['Pick city', 'c_location'], ['Join waitlist', 'c_location'], ['Rollout matrix', 'ad_geo'], ['Go live', 'c_home']] },
  { id: 'F9', t: 'Pay, escrow & payout', who: 'Customer → Vendor → Platform', phase: 'P2', steps: [['Checkout', 'c_pay'], ['Held in escrow', 'c_payments'], ['Release on completion', 'c_booking'], ['Vendor payout', 'v_payouts'], ['Commission rules', 'ad_commission']] },
  { id: 'F10', t: 'Report → resolve → appeal', who: 'Anyone ↔ Admin ↔ Vendor', steps: [['Report', 'c_report'], ['Case triage', 'ad_case'], ['Decision', 'ad_cases'], ['Appeal', 'v_cases'], ['Human re-review', 'ad_reviews']] },
]
export const FLOW_DEF = FLOWS
export function Flows() {
  const nav = useNav()
  const { toast } = useApp()
  const go = (id, mode) => window.dispatchEvent(new CustomEvent('vv-jump', { detail: id }))
  const exportCsv = async () => {
    const { SCREENS, phaseOf } = await import('../registry.jsx')
    const rows = [['screen_id', 'title', 'role', 'phase', 'spec_sections', 'scenarios'], ...Object.values(SCREENS).map((s) => [s.id, s.title, s.role, phaseOf(s.id), s.sec.join(' '), s.sc.join(' ')])]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'vendorverse-screen-inventory.csv'; a.click(); URL.revokeObjectURL(url)
    toast(`Exported ${rows.length - 1} screens`)
  }
  return (
    <Screen title="User flows" subtitle="Tap any step to open that screen" right={<Button size="sm" variant="secondary" icon={Download} className="mr-2" onClick={exportCsv}>Inventory</Button>}>
      <Banner tone="blue" title="Review pack">Each flow is a chain of real screens in this mockup. “Inventory” exports every screen with role, phase, spec section and scenarios (CSV) — ready to import into FigJam / Figma as frames or a tracker.</Banner>
      {FLOWS.map((f) => (
        <Card key={f.id}>
          <div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{f.id} · {f.who}</p><p className="text-[15px] font-extrabold">{f.t}</p></div><PhaseTag p={f.phase || 'MVP'} /></div>
          <ol className="mt-3 space-y-0">
            {f.steps.map(([l, id], i) => (
              <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                {i < f.steps.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5 bg-brand-200" />}
                <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                <button onClick={() => go(id)} className="flex flex-1 items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-left text-[13px] font-semibold hover:bg-brand-50">{l}<ChevronRight size={14} className="text-ink-400" /></button>
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </Screen>
  )
}

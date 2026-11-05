import { useState } from 'react'
import { Download, Trash2, Smartphone, Laptop, LogOut, MapPin } from 'lucide-react'
import { Badge, Banner, Button, Card, Checkbox, Chips, Group, Input, KV, ListRow, Section, Select, Toggle, StatusBadge } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { Page, Lifecycle, StatePreview } from './blocks.jsx'
import { GEO, lookupPin } from '../geo.js'
import { ACCOUNT_STATES, ACCOUNT_STATE_IDS, stateOf } from '../services/accountState.js'

/* ---------- F-ACC-03 account states ---------- */
const STATE_ROWS = ACCOUNT_STATE_IDS.map((id) => [id, ACCOUNT_STATES[id].label, ACCOUNT_STATES[id].message, ACCOUNT_STATES[id].tone])
export function AccountState() {
  const { me, setMe } = useApp()
  const nav = useNav()
  const cur = stateOf(me)
  const st = ACCOUNT_STATES[cur]
  return <Page title="Account status" subtitle="What each state means for you">
    <Chips scroll options={STATE_ROWS.map((s) => ({ id: s[0], label: s[1] }))} value={cur} onChange={(v) => setMe({ ...me, accountState: v })} />
    <p className="text-xs text-ink-500">Demo control: in production the state is set by verification, admin action or a deletion request, never by the account owner.</p>
    <Banner tone={st.tone} title={st.label}>{st.message}</Banner>
    <Card><KV rows={[['Browse and search', cur === 'suspended' ? 'Read only' : 'Allowed'], ['New bookings, RFQs, orders', st.transact ? 'Allowed' : 'Blocked'], ['Publish or edit listings', st.publish ? 'Allowed' : 'Blocked'], ['Appeal', st.appeal ? 'Available' : 'Not needed']]} /></Card>
    {st.appeal && <Button full variant="secondary" onClick={() => nav.go('v_cases')}>Appeal this decision</Button>}
  </Page>
}

/* ---------- F-ACC-04 deletion request ---------- */
export function DeleteAccount() {
  const { me, setMe, toast } = useApp()
  const nav = useNav()
  const [ack, setAck] = useState(false)
  const [otp, setOtp] = useState('')
  const requested = me.accountState === 'deletion_requested'
  const submit = () => {
    if (otp !== '123456') return toast('Enter the 6-digit demo code 123456 to verify it is you', 'warn')
    setMe({ ...me, accountState: 'deletion_requested' })
    toast('Deletion request submitted')
  }
  return <Page title="Delete account" subtitle="Request deletion and track its status">
    {requested ? <>
      <Banner tone="amber" title="Deletion requested">Your request is in the approved deletion flow. You can cancel while it is pending.</Banner>
      <Lifecycle steps={['Requested', 'Identity verified', 'Legal records checked', 'Anonymised and closed']} start={1} />
      <Button full variant="secondary" onClick={() => { setMe({ ...me, accountState: 'active' }); toast('Deletion request cancelled') }}>Cancel request</Button>
    </> : <>
      <Banner tone="red" title="This cannot be undone once complete">Open bookings, orders, RFQs or contracts must be closed first. Some records are kept where the law requires it.</Banner>
      <Card className="space-y-3">
        <Input label="Verification code" placeholder="Enter OTP" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} hint="Demo code: 123456" />
        <Checkbox checked={ack} onChange={setAck}>I understand what is kept and what is removed.</Checkbox>
      </Card>
      <Button full variant="danger" icon={Trash2} disabled={!ack} onClick={submit}>Request deletion</Button>
      <Button full variant="ghost" onClick={() => nav.go('c_export')}>What happens to my data?</Button>
    </>}
  </Page>
}

/* ---------- F-ACC-05 data export and deletion explainer ---------- */
export function ExportData() {
  const { toast } = useApp()
  const [sent, setSent] = useState(false)
  return <Page title="Your data" subtitle="Export and deletion explained">
    <Section title="Export my data">
      <Card className="space-y-3"><p className="text-sm text-ink-600">Get a copy of your profile, bookings, RFQs, orders, messages and reviews. We email a download link to your verified address.</p>
        {sent ? <Banner tone="green" title="Export requested">Link arrives within the time set in CFG-08 (open).</Banner> : <Button icon={Download} onClick={() => { setSent(true); toast('Export requested') }}>Request export</Button>}</Card>
    </Section>
    <Section title="If you delete your account">
      <Group>
        <ListRow title="Removed or anonymised" subtitle="Profile, saved items, notification preferences, chat content shown to others" right={<Badge tone="green">Removed</Badge>} />
        <ListRow title="Kept for legal reasons" subtitle="Tax invoices, transaction records, audit entries, case outcomes" right={<Badge tone="amber">Kept</Badge>} last />
      </Group>
      <p className="mt-2 text-xs text-ink-500">Retention periods are configuration item CFG-08 and are not decided yet.</p>
    </Section>
  </Page>
}

/* ---------- F-ACC-08 sessions ---------- */
export function Sessions() {
  const { toast } = useApp()
  const [list, setList] = useState([
    { id: 's1', icon: Laptop, name: 'Chrome on Windows', info: 'Jaipur, India · This device', cur: true },
    { id: 's2', icon: Smartphone, name: 'Android app', info: 'Jaipur, India · 2 days ago' },
    { id: 's3', icon: Laptop, name: 'Safari on macOS', info: 'Delhi, India · 9 days ago' },
  ])
  return <Page title="Sessions and devices" subtitle="Where you are signed in">
    <Group>{list.map((s, i) => <ListRow key={s.id} icon={s.icon} title={s.name} subtitle={s.info} right={s.cur ? <Badge tone="green">This device</Badge> : <button className="text-[13px] font-bold text-red-600" onClick={() => { setList(list.filter((x) => x.id !== s.id)); toast('Signed out of that device') }}>Sign out</button>} last={i === list.length - 1} />)}</Group>
    {list.length > 1 && <Button full variant="secondary" icon={LogOut} onClick={() => { setList(list.filter((x) => x.cur)); toast('Signed out everywhere else') }}>Sign out of all other devices</Button>}
    <p className="text-xs text-ink-500">Vendor and admin accounts must review this list when a new device signs in.</p>
  </Page>
}

/* ---------- F-ACC-07 / F-MSG-05 notification preferences ---------- */
export function NotifPrefs() {
  const { prefs, setPrefs, settings, toast } = useApp()
  const [ch, setCh] = useState({ inapp: true, email: false, sms: false, push: true })
  return <Page title="Notification preferences" subtitle="Channels and categories" footer={<Button full onClick={() => toast('Preferences saved')}>Save</Button>}>
    <Section title="Channels"><Card className="space-y-1">{[['inapp', 'In-app (always on)'], ['email', 'Email'], ['sms', 'SMS'], ['push', 'Push']].map(([k, l]) => <Toggle key={k} label={l} on={ch[k]} onChange={(v) => k !== 'inapp' && setCh({ ...ch, [k]: v })} desc={k !== 'inapp' && !settings.channels?.[k] ? 'Provider not ready yet (CFG-10)' : undefined} />)}</Card></Section>
    <Section title="Categories"><Card className="space-y-1">{[['orders', 'Orders and purchase orders'], ['bookings', 'Bookings'], ['quotes', 'RFQs and quotations'], ['promos', 'Promotions']].map(([k, l]) => <Toggle key={k} label={l} on={!!prefs[k]} onChange={(v) => setPrefs({ ...prefs, [k]: v })} />)}</Card></Section>
    <Banner tone="blue">Security and account notices cannot be switched off.</Banner>
  </Page>
}

/* ---------- F-MSG-02 contact-share consent ---------- */
export function ContactShare({ params = {} }) {
  const { toast } = useApp()
  const nav = useNav()
  const [state, setState] = useState('ask')
  return <Page title="Share contact details" subtitle={params.name || 'Sharma Electricals & Hardware'}>
    {state === 'ask' && <>
      <Banner tone="blue" title="Your phone and email stay hidden">Details are shared only if you both agree, and only for this conversation.</Banner>
      <Card className="space-y-2"><KV rows={[['You would share', 'Phone number'], ['With', params.name || 'Sharma Electricals & Hardware'], ['Linked to', params.ref || 'RFQ-311']]} /></Card>
      <Button full onClick={() => { setState('waiting'); toast('Request sent') }}>Ask to exchange contact details</Button>
    </>}
    {state === 'waiting' && <><Banner tone="amber" title="Waiting for the other side">They must accept before anything is shown.</Banner><Button full variant="soft" onClick={() => { setState('shared'); toast('Contact details exchanged') }}>Simulate: they accepted</Button></>}
    {state === 'shared' && <><Banner tone="green" title="Contact details exchanged">Revoke at any time. Past chats stay on record.</Banner><Button full variant="secondary" onClick={() => { setState('ask'); toast('Sharing revoked') }}>Revoke sharing</Button></>}
    <Button full variant="ghost" onClick={() => nav.back()}>Back to chat</Button>
  </Page>
}

/* ---------- F-GEO-01 location picker (country > state > city > pincode, same as mobile) ---------- */
const LAUNCH_LABEL = { live: 'Live', soon: 'Coming soon', later: 'Planned' }
const STATUS_TONE = { live: 'green', soon: 'amber', later: 'gray' }
export function LocationPicker({ params = {} }) {
  const { locale, setLocale, toast, waitlist, setWaitlist, lang, setLang } = useApp()
  const nav = useNav()
  const [cc, setCc] = useState(params.country || locale.country || 'IN')
  const [st, setSt] = useState(params.state || locale.state || null)
  const [city, setCity] = useState(params.city || locale.city || null)
  const [pin, setPin] = useState(locale.pincode || '')
  const [q, setQ] = useState('')
  const C = GEO.find((c) => c.code === cc)
  const S = C?.states.find((x) => x.name === st)
  const Ct = S?.cities.find((x) => x.n === city)
  const det = pin.length >= 5 ? lookupPin(pin) : null
  const onPin = (v) => {
    const x = v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8)
    setPin(x)
    const d = lookupPin(x)
    if (d && !d.unknown) { setCc(d.country); setSt(d.state); setCity(d.city) }
  }
  const err = pin && /^\d{6}$/.test(pin) && det?.unknown ? "We couldn't match this pincode. Pick your city below." : pin && !det && pin.length >= 5 ? 'Pincode not recognised. Try another or choose manually.' : ''
  const live = Ct?.s === 'live'
  const joined = Ct && waitlist.includes(`${cc}-${Ct.n}`)
  const countries = GEO.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
  const apply = () => { setLocale({ ...locale, country: cc, countryName: C.name, state: st, city, pincode: pin, currency: C.cur }); toast(`Showing vendors that serve ${city}${pin ? ` ${pin}` : ''}`); nav.back() }
  return <Page title="Where do you need vendors?" subtitle="Country, state, city and pincode" footer={live ? <Button full size="lg" disabled={!!err || !pin || (det && !det.unknown && det.city !== city)} onClick={apply}>Use this location</Button> : Ct ? <Button full size="lg" variant={joined ? 'secondary' : 'primary'} onClick={() => { setWaitlist(joined ? waitlist.filter((w) => w !== `${cc}-${Ct.n}`) : [...waitlist, `${cc}-${Ct.n}`]); toast(joined ? 'Left the waitlist' : `You are on the ${Ct.n} waitlist`) }}>{joined ? 'On the waitlist (tap to leave)' : `Join the ${Ct.n} waitlist`}</Button> : null}>
    <Banner tone="blue" title="Launching city by city">VendorVerse switches on cities only when there is enough verified supply. Phase 1 is live in Jaipur, Ajmer, Sikar and Delhi NCR. Pick yours; if it is not live yet, join the waitlist.</Banner>
    <Button full variant="secondary" icon={MapPin} onClick={() => { setCc('IN'); setSt('Rajasthan'); setCity('Jaipur'); setPin('302021'); toast('Location permission granted: Jaipur 302021') }}>Use current location</Button>
    <Section title="Enter your pincode and we detect the rest">
      <Input inputMode="text" maxLength={8} icon={MapPin} placeholder="e.g. 302021 · 90001 · SW1A 1AA" value={pin} onChange={(e) => onPin(e.target.value)} error={err} hint="Supports Indian pincodes, US ZIP codes and UK postcodes" />
      {det && !det.unknown && <div className="mt-2 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200"><span className="text-2xl">{det.flag}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-emerald-900">{det.city}, {det.state}</p><p className="text-xs text-emerald-800">{det.countryName} · {LAUNCH_LABEL[det.status]}</p></div></div>}
    </Section>
    <Section title="1 · Country">
      <Input placeholder="Search country" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 grid grid-cols-2 gap-2">{countries.map((c) => <button key={c.code} onClick={() => { setCc(c.code); setSt(null); setCity(null) }} className={`rounded-2xl p-3 text-left ring-1 ring-inset ${cc === c.code ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200'}`}><p className="text-lg">{c.flag} <span className="text-sm font-bold">{c.name}</span></p><div className="mt-1 flex items-center justify-between">{c.launch === 'live' ? <Badge tone="green">Live</Badge> : <Badge tone="purple">Phase 2</Badge>}<span className="text-[11px] text-ink-500">{c.cur}</span></div></button>)}</div>
    </Section>
    {C && <Section title={`2 · State / region (${C.states.length})`}><Select value={st || ''} onChange={(e) => { setSt(e.target.value || null); setCity(null) }} options={[{ value: '', label: 'Select a state / region' }, ...C.states.map((s) => ({ value: s.name, label: `${s.name} (${s.cities.length} ${s.cities.length === 1 ? 'city' : 'cities'})` }))]} /></Section>}
    {S && <Section title="3 · City"><div className="space-y-2">{S.cities.map((c) => <button key={c.n} onClick={() => { setCity(c.n); if (det && det.city !== c.n) setPin('') }} className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset ${city === c.n ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200'}`}><MapPin size={18} className={c.s === 'live' ? 'text-brand-600' : 'text-ink-300'} /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{c.n}</span><span className="block text-xs text-ink-500">{c.s === 'live' ? `${c.vendors} verified vendors` : `${c.wait} people waiting`}</span></span><Badge tone={STATUS_TONE[c.s]}>{LAUNCH_LABEL[c.s]}</Badge></button>)}</div></Section>}
    {Ct && !live && <Banner tone="amber" title={`${Ct.n} is ${LAUNCH_LABEL[Ct.s].toLowerCase()}`}>Vendors outside a live area are never shown as local. You can still send RFQs to suppliers that ship to you. Local service providers appear here after launch.</Banner>}
    <Section title="Display currency and language">
      <Card className="space-y-3">
        <div><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-ink-700">Show prices in</p><Badge tone="purple">Phase 2</Badge></div><p className="mt-1 text-sm text-ink-600">Phase 1 shows INR only. Multi-currency display comes in Phase 2.</p></div>
        <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Language</p><div className="flex gap-2"><Button size="sm" variant={lang === 'en' ? 'primary' : 'secondary'} onClick={() => setLang('en')}>English</Button><Button size="sm" variant={lang === 'hi' ? 'primary' : 'secondary'} onClick={() => setLang('hi')}>हिन्दी</Button></div><div className="mt-2 flex flex-wrap items-center gap-2">{['العربية', 'Español', 'Français', 'Deutsch', '中文'].map((l) => <span key={l} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-400">{l}</span>)}<Badge tone="purple">Phase 2</Badge></div></div>
      </Card>
    </Section>
  </Page>
}

export function LocationWait({ params = {} }) {
  const { toast, waitlist, setWaitlist } = useApp()
  const nav = useNav()
  const city = params.city || 'Jodhpur'
  const key = `IN-${city}`
  const joined = waitlist.includes(key)
  const setJoined = () => setWaitlist([...waitlist, key])
  return <Page title={`${city} is not live yet`} subtitle="We are not available here yet">
    <Banner tone="amber" title="Not yet available">Vendors outside a live area are never shown as local. Pick a nearby live city, or join the waitlist.</Banner>
    <Section title="Nearby live markets"><Group>{['Jaipur', 'Ajmer', 'Sikar'].map((c, i) => <ListRow key={c} icon={MapPin} title={c} subtitle="Live" onClick={() => nav.back()} last={i === 2} />)}</Group></Section>
    <Card className="space-y-2"><p className="text-sm font-bold">Remote-capable vendors</p><p className="text-sm text-ink-600">Some vendors serve any city remotely. They are labelled Remote, not Local.</p><Button size="sm" variant="soft" onClick={() => nav.go('c_explore')}>See remote vendors</Button></Card>
    {joined ? <Banner tone="green" title="You are on the waitlist">We will notify you when {city} opens.</Banner> : <Button full onClick={() => { setJoined(true); toast(`Joined the ${city} waitlist`) }}>Join the waitlist</Button>}
  </Page>
}

/* ---------- F-GEO-03 geo rollout manager (admin) ---------- */
export function GeoManager() {
  const { settings, setSettings, addAudit, toast } = useApp()
  const rows = [...settings.locations, { city: 'Dubai (UAE)', on: false, p2: true }, { city: 'Singapore', on: false, p2: true }]
  return <Page title="Geo rollout manager" subtitle="Launch Market Register">
    <Banner tone="blue">Phase 1 launch cities: Jaipur, Ajmer, Sikar and Delhi NCR. Each change is written to the audit log. Dual approval for activation is an open decision (O-05).</Banner>
    <Group>{rows.map((l, i) => <div key={l.city} className={i < rows.length - 1 ? 'border-b border-ink-100 px-4 py-3' : 'px-4 py-3'}>
      <Toggle label={<>{l.city} {l.p2 && <Badge tone="purple">Phase 2</Badge>}</>} desc={l.p2 ? 'Not available in Phase 1' : l.on ? 'Live' : 'Waitlist open'} on={l.on} onChange={(v) => { if (l.p2) return toast('Phase 2 market', 'warn'); setSettings({ ...settings, locations: settings.locations.map((x) => (x.city === l.city ? { ...x, on: v } : x)) }); addAudit(`${v ? 'Opened' : 'Closed'} market ${l.city}`, 'Launch Market Register', 'setting') }} />
    </div>)}</Group>
  </Page>
}

/* ---------- F-TAX-04 suggest a category, F-TAX-02 taxonomy builder ---------- */
export function CatSuggest() {
  const { industries, toast } = useApp()
  const nav = useNav()
  const [f, setF] = useState({ name: '', industry: industries[0] || 'Construction', why: '' })
  const [done, setDone] = useState(false)
  return <Page title="Suggest a category" subtitle="Tell us what is missing">
    {done ? <><Banner tone="green" title="Suggestion sent">An admin reviews it in the taxonomy queue. Your listing stays under its current category meanwhile.</Banner><Button full onClick={() => nav.back()}>Done</Button></> : <>
      <Input label="Category name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Select label="Closest industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} options={industries.length ? industries : ['Construction']} />
      <Input label="Why is it needed?" textarea value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} />
      <Button full disabled={f.name.trim().length < 3} onClick={() => { setDone(true); toast('Suggestion submitted') }}>Submit suggestion</Button>
    </>}
  </Page>
}

export function AdminTaxonomy() {
  const { categories, categoryOverrides, setCategoryOverrides, addAudit, toast } = useApp()
  const [sel, setSel] = useState(null)
  const life = (c) => categoryOverrides[c.id]?.lifecycle || 'active'
  const set = (c, lifecycle) => { setCategoryOverrides({ ...categoryOverrides, [c.id]: { ...(categoryOverrides[c.id] || {}), lifecycle } }); addAudit(`Category ${c.name} → ${lifecycle}`, 'Taxonomy', 'setting'); toast(`${c.name}: ${lifecycle}`) }
  return <Page title="Taxonomy builder" subtitle="Lifecycle, merge, retire, aliases, country scope">
    <Banner tone="blue">Lifecycle: draft → active → retired. Retiring keeps existing listings readable. Merging moves listings to the target category.</Banner>
    <Group>{categories.slice(0, 12).map((c, i) => <ListRow key={c.id} title={c.name} subtitle={`${c.type} · aliases: ${(categoryOverrides[c.id]?.aliases || []).join(', ') || 'none'} · India`} right={<StatusBadge s={life(c) === 'active' ? 'active' : life(c) === 'retired' ? 'removed' : 'draft'} />} onClick={() => setSel(sel === c.id ? null : c.id)} last={i === 11} />)}</Group>
    {sel && (() => { const c = categories.find((x) => x.id === sel); return <Card className="space-y-3"><p className="text-sm font-bold">{c.name}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="soft" onClick={() => set(c, 'active')}>Activate</Button><Button size="sm" variant="secondary" onClick={() => set(c, 'draft')}>Back to draft</Button><Button size="sm" variant="dangerSoft" onClick={() => set(c, 'retired')}>Retire</Button></div><Input label="Add alias" placeholder="e.g. Wiring" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { const a = [...(categoryOverrides[c.id]?.aliases || []), e.target.value.trim()]; setCategoryOverrides({ ...categoryOverrides, [c.id]: { ...(categoryOverrides[c.id] || {}), aliases: a } }); e.target.value = ''; toast('Alias added') } }} hint="Press Enter to add" /><Select label="Merge into" value="" onChange={(e) => e.target.value && toast(`Merge into ${e.target.value} queued for approval`)} options={['', ...categories.filter((x) => x.id !== c.id).slice(0, 6).map((x) => x.name)]} /></Card> })()}
  </Page>
}

export function AdminCatNew() {
  const { industries, categories, setCategoryOverrides, categoryOverrides, addAudit, toast } = useApp()
  const nav = useNav()
  const [f, setF] = useState({ name: '', industry: industries[0] || '', type: 'service' })
  return <Page title="Create category" subtitle="New category in draft" footer={<Button full disabled={!f.name.trim()} onClick={() => { const id = 'new-' + f.name.toLowerCase().replace(/\W+/g, '-'); setCategoryOverrides({ ...categoryOverrides, [id]: { lifecycle: 'draft' } }); addAudit(`Created category ${f.name} (draft)`, 'Taxonomy', 'setting'); toast('Category saved as draft'); nav.back() }}>Save as draft</Button>}>
    <Input label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
    <Select label="Industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} options={industries.length ? industries : ['Construction']} />
    <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={['service', 'product']} />
    <p className="text-xs text-ink-500">{categories.length} categories exist. Booking mode, response deadline, cancellation policy, RFQ schema and verification rules are set on the category screen after saving.</p>
  </Page>
}

/* ---------- F-XCT-03 standard UI states ---------- */
export function UiStates() {
  const box = (title, body, tone = 'blue') => <Banner tone={tone} title={title}>{body}</Banner>
  return <Page title="UI states" subtitle="Loading, empty, error, offline, denied, expired">
    <StatePreview states={[
      { id: 'loading', label: 'Loading', node: <Card className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-100" />)}<p className="text-center text-xs text-ink-500">Finding matching vendors…</p></Card> },
      { id: 'empty', label: 'Empty', node: box('Nothing here yet', 'When you create an RFQ or booking it will appear here.', 'gray') },
      { id: 'error', label: 'Error', node: box('Something went wrong', 'We could not load this. Try again; your data is safe.', 'red') },
      { id: 'offline', label: 'Offline', node: box('You are offline', 'Showing the last saved data. Changes will sync when you are back online.', 'amber') },
      { id: 'denied', label: 'No access', node: box('You do not have access', 'This page is for another role. Switch account mode or contact support.', 'red') },
      { id: 'expired', label: 'Expired', node: box('This link or request has expired', 'Start again from the original screen.', 'amber') },
    ]} />
  </Page>
}


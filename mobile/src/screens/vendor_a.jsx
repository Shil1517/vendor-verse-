import { useEffect, useMemo, useRef, useState } from 'react'
import { authService } from '../services/authService.js'
import {
  Package, CalendarCheck, FileText, Plus, AlertTriangle, ChevronRight, Store, ShieldCheck, Clock, MessageCircle, Check, X, Upload, BarChart3, Star, MapPin, Crown, Trash2, ImagePlus,
  BadgeCheck, Info, Pause, Play, Copy, Eye, RefreshCw, CalendarClock, Settings, Lock, Layers, Megaphone, Gavel, LogOut, Repeat, Hourglass, TriangleAlert,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, liveCats, cat, CITIES, gatesFor, isPublished, firstBlocker, SETTINGS0, AVAIL_LABEL, MODE_LABEL } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Rating, Banner, EmptyState, Stat, KV, cx, Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar,
  DocTile, Stepper, Checkbox, GateRow, Countdown, Missing, Price, HBar, Spark, BarChart, SponsoredTag,
} from '../ui.jsx'
import { NotifBell, ModeChip } from './shared.jsx'
import { Logo } from './auth.jsx'
import { TIERS, KIND_LABEL, CUR, trustScore } from '../globaldata.jsx'
import { VENDOR_TYPES } from '../mvpdata.jsx'
import { TierBadge, PhaseTag, Toggle as Tg } from '../ui.jsx'

export const useMyVendor = () => {
  const { me, vendors } = useApp()
  return vendors.find((v) => v.id === me.vendorId) || null
}
const planOf = (v, settings) => settings.plans.find((p) => p.name === v?.sub.plan) || settings.plans[0]
const limitNum = (x) => (x === 'Unlimited' ? Infinity : x)

function NoVendor({ title = 'Vendor' }) {
  const nav = useNav()
  return <Screen title={title} back={false}><EmptyState icon={Store} title="No vendor organization yet" body="Switching modes never grants vendor permissions. Create an organization first." action={<Button onClick={() => nav.go('v_register')}>Start vendor onboarding</Button>} /></Screen>
}

/* ================= DASHBOARD ================= */
export function VendorDashboard() {
  const nav = useNav()
  const { me, listings, threads, bookings, rfqs, settings, published, vendor } = useApp()
  const v = useMyVendor()
  if (!v) return <NoVendor />
  const mine = listings.filter((l) => l.vendorId === v.id)
  const pub = mine.filter(published)
  const reqs = bookings.filter((b) => b.vendorId === v.id && b.state === 'requested').sort((a, b) => a.leftMin - b.leftMin)
  const mods = bookings.filter((b) => b.vendorId === v.id && b.mod?.state === 'pending')
  const awaiting = bookings.filter((b) => b.vendorId === v.id && b.state === 'awaiting')
  const cats = [...new Set(mine.map((l) => l.cat))]
  const toQuote = rfqs.filter((r) => r.customer !== me.name && r.state === 'open' && cats.includes(r.cat) && !r.quotes.find((q) => q.vendorId === v.id))
  const unread = threads.vendor.reduce((s, t) => s + t.unread, 0)
  const blocked = mine.filter((l) => !published(l) && l.review !== 'draft')
  const plan = planOf(v, settings)
  const leadMax = limitNum(plan.leads)
  const todo = reqs.length + mods.length + toQuote.length
  const sub = v.sub
  const banners = []
  if (v.acct === 'restricted') banners.push(<Banner key="a" tone="red" title="Account restricted" action={<Button size="sm" onClick={() => nav.go('v_cases')}>View decision & appeal</Button>}>Some capabilities are switched off while we review a concern. Existing bookings stay manageable.</Banner>)
  if (sub.status === 'grace') banners.push(<Banner key="s" tone="amber" title={`Payment failed — grace period until ${sub.grace}`} action={<Button size="sm" onClick={() => nav.go('v_sub')}>Renew now</Button>}>Your listings stay visible for now. After the grace period they’re hidden and new enquiries stop. Your data and conversations are kept.</Banner>)
  if (sub.status === 'expired' || sub.status === 'none') banners.push(<Banner key="s" tone="red" title="Subscription not active" action={<Button size="sm" onClick={() => nav.go('v_sub')}>Choose a plan</Button>}>Public listings and sponsored placements are hidden and you’re not receiving new public enquiries. You can still manage existing bookings, quotations and conversations.</Banner>)
  if (sub.status === 'cancelled') banners.push(<Banner key="s" tone="blue" title="Auto-renew is off">Your plan stays active until {sub.paidUntil}.</Banner>)
  if (['more_info', 'rejected', 'expired', 'revoked'].includes(v.ver)) banners.push(<Banner key="v" tone={v.ver === 'more_info' ? 'amber' : 'red'} title={`Verification: ${({ more_info: 'more information required', rejected: 'rejected', expired: 'credential expired', revoked: 'revoked' })[v.ver]}`} action={<Button size="sm" onClick={() => nav.go('v_verify')}>Fix now</Button>}>Affected listings stay hidden until this is resolved.</Banner>)
  return (
    <Screen headerless pad={false}>
      <div className="bg-gradient-to-b from-ink-900 to-ink-800 px-4 pb-14 pt-3 text-white">
        <div className="mb-3 flex items-center gap-2"><Logo size={28} light /><span className="text-sm font-extrabold tracking-tight">VendorVerse</span></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={42} round="rounded-xl" /><div className="min-w-0"><p className="max-w-[210px] truncate text-[15px] font-bold leading-tight">{v.name}</p><div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">{v.ver === 'approved' ? <><ShieldCheck size={13} className="text-emerald-400" />Verified</> : <><AlertTriangle size={13} className="text-amber-300" />Not verified</>}<span>·</span><span className="capitalize">{v.acct}</span></div></div></div>
          <div className="[&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:ring-ink-900"><NotifBell role="vendor" /></div>
        </div>
      </div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        {banners}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Booking requests" value={reqs.length} icon={CalendarCheck} tone="sky" onClick={() => nav.go('v_work', { tab: 'bookings' })} />
          <Stat label="RFQs to quote" value={toQuote.length} icon={FileText} tone="violet" onClick={() => nav.go('v_work', { tab: 'rfqs' })} />
          <Stat label="Public listings" value={`${pub.length}/${mine.length}`} icon={Package} tone="emerald" onClick={() => nav.go('v_listings')} />
          <Stat label="Lead usage" value={leadMax === Infinity ? `${sub.leads}` : `${sub.leads}/${leadMax}`} icon={Layers} tone="amber" onClick={() => nav.go('v_sub')} />
        </div>
        <Section title={`Needs your attention${todo ? ` (${todo})` : ''}`}>
          <Group>
            {reqs.map((b) => <ListRow key={b.id} icon={Hourglass} tone="sky" title={`${b.customer} · ${b.date}`} subtitle={`${b.id} — respond or it expires`} right={<Countdown mins={b.leftMin} label="left" />} onClick={() => nav.go('v_booking', { id: b.id })} />)}
            {mods.map((b) => <ListRow key={b.id} icon={Repeat} tone="violet" title={`Change requested · ${b.id}`} subtitle={`${b.customer} → ${b.mod.date}, ${b.mod.slot}`} onClick={() => nav.go('v_booking', { id: b.id })} />)}
            {toQuote.slice(0, 2).map((r) => <ListRow key={r.id} icon={FileText} tone="violet" title={`Quote ${r.id}`} subtitle={r.title} onClick={() => nav.go('v_rfq', { id: r.id })} />)}
            {unread > 0 && <ListRow icon={MessageCircle} tone="amber" title={`${unread} unread messages`} onClick={() => nav.go('messages')} />}
            {todo + unread === 0 && <p className="p-5 text-center text-sm text-ink-500">You’re all caught up 🎉</p>}
          </Group>
        </Section>
        {blocked.length > 0 && (
          <Section title="Hidden listings" action="Details" onAction={() => nav.go('v_listings')}>
            <Group>{blocked.slice(0, 3).map((l) => <ListRow key={l.id} icon={AlertTriangle} tone="rose" title={l.title} subtitle={firstBlocker(l, v)?.detail} onClick={() => nav.go('v_listing_gate', { id: l.id })} />)}</Group>
          </Section>
        )}
        {awaiting.length > 0 && <Card className="!p-3.5"><p className="text-sm font-bold">Awaiting customer confirmation</p><p className="mt-0.5 text-xs text-ink-500">{awaiting.map((b) => `${b.id} (${b.leftDays}d left)`).join(' · ')} — closes automatically after 7 days.</p></Card>}
        <Card onClick={() => nav.go('v_public')} className="!p-3.5"><div className="flex items-center gap-3"><span className="relative grid size-12 place-items-center rounded-full bg-brand-50 text-lg font-extrabold text-brand-700">{trustScore(v)}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">Public profile & trust score</p><div className="mt-0.5 flex items-center gap-2"><TierBadge tier={v.tier} /></div></div><ChevronRight size={17} className="text-ink-300" /></div></Card>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2">
          {[[Plus, 'Add listing', () => nav.go('v_listing_edit')], [MapPin, 'Areas', () => nav.go('v_areas')], [Crown, 'Plan', () => nav.go('v_sub')], [BarChart3, 'Metrics', () => nav.go('v_perf')]].map(([I, l, fn]) => (
            <button key={l} onClick={fn} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 ring-1 ring-ink-100 active:scale-95"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><I size={18} /></span><span className="text-[11px] font-semibold">{l}</span></button>
          ))}
        </div>
      </div>
    </Screen>
  )
}

/* ================= ONBOARDING WIZARD (spec §5.1) ================= */
const COUNTRY_CODE = { India: 'IN' }
/** Wizard vendor type -> backend vendors.business_type. */
const BUSINESS_TYPE = { service: 'SERVICE_PROVIDER', contractor: 'CONTRACTOR', manufacturer: 'MANUFACTURER', supplier: 'SUPPLIER' }
export function VendorRegister({ params = {} }) {
  const nav = useNav()
  const { me, setMe, setVendors, notify, toast, stamp } = useApp()
  const [step, setStep] = useState(0)
  const [vroles, setVroles] = useState(params.type ? [params.type] : []) // D-023: one or more vendor roles
  const vtype = vroles[0] || null // primary role: the backend still takes a single business type
  const [f, setF] = useState({ country: 'India', name: me.biz || '', owner: me.name || '', gstin: '', pan: '', email: '', years: '2020', cats: ['home'], subs: [], areas: ['Jaipur'], pins: '', ans: {}, lang: ['English', 'Hindi'], contact: 'chat' })
  const [docs, setDocs] = useState({})
  const [consent, setConsent] = useState(false)
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const createdId = useRef(null)
  const c = cat(f.cats[0])
  const goods = vroles.some((r) => VENDOR_TYPES[r]?.offer === 'products')
  // D-019: only the documents the chosen roles require, combined without duplicates
  const docList = vroles.length ? [...new Set(vroles.flatMap((r) => (r === 'service' ? c.docs : VENDOR_TYPES[r].docs)))] : c.docs
  const fieldKeys = [...c.fields, ...(goods ? ['Minimum order quantity', 'Lead time (days)', 'Certifications', 'Delivery regions'] : [])]
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const validate = () => {
    const e = {}
    if (step === 0) {
      if (f.name.trim().length < 3) e.name = 'Enter your business name'
      if (!vroles.length) e.vtype = 'Choose at least one vendor role'
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.toUpperCase())) e.gstin = 'Enter a valid 15-character GSTIN (e.g. 08ABCPS1234F1Z5)'
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan.toUpperCase())) e.pan = 'Enter a valid PAN (e.g. ABCPS1234F)'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid business email'
    }
    if (step === 1) { if (!f.cats.length) e.cats = 'Choose at least one category'; if (!f.areas.length) e.areas = 'Select at least one service area' }
    if (step === 2) { fieldKeys.forEach((k) => { if (!(f.ans[k] || '').trim()) e['a_' + k] = 'Required for this category' }) }
    if (step === 3 && !authService.isRemote) { const miss = docList.filter((d) => !docs[d]); if (miss.length) e.docs = `${miss.length} required document${miss.length > 1 ? 's' : ''} missing` }
    if (step === 4 && !consent) e.consent = 'Please confirm to submit'
    setErrs(e); return Object.keys(e).length === 0
  }
  const next = async () => {
    if (!validate()) return
    if (step < 4) return setStep(step + 1)
    if (authService.isRemote && !createdId.current) {
      // F-VND-01/02: create the vendor only after onboarding is complete; evidence is uploaded from v_verify.
      setBusy(true)
      const r = await authService.createVendor({ registrationCountry: COUNTRY_CODE[f.country] || 'IN', businessType: BUSINESS_TYPE[vtype], roleCodes: vroles.slice(1).map((r) => BUSINESS_TYPE[r]), legalName: f.name.trim() })
      setBusy(false)
      if (!r.ok) return toast(r.message, 'warn')
      if (!r.vendor?.id) return toast('Vendor was created without an ID; reload and contact support before continuing.', 'warn')
      createdId.current = r.vendor.id
    }
    const vendorId = createdId.current || 'v-new'
    const rec = { id: vendorId, name: f.name, owner: f.owner, cat: f.cats[0], city: f.areas[0], areas: f.areas, branches: 1, acct: 'pending', kind: vtype || 'service', roles: (vroles.length ? vroles : ['service']).map((id) => ({ id, status: 'pending' })), ver: authService.isRemote ? 'not_started' : c.verifyReq ? 'submitted' : 'not_started', tone: c.tone, since: +f.years, gstin: f.gstin.toUpperCase(), phone: '+91 98290 00099', email: f.email, resp: null, jobs: 0, rating: 0, reviews: 0, langs: f.lang, docs: authService.isRemote ? [] : docList.map((d) => ({ name: d, status: 'pending' })), sub: { plan: 'Free', status: 'none', renews: '—', paidUntil: null, autoRenew: false, leads: 0 }, history: authService.isRemote ? [] : [{ s: 'submitted', at: stamp(), by: f.owner }] }
    setVendors((vs) => [rec, ...vs.filter((x) => x.id !== vendorId && x.id !== 'v-new')])
    setMe({ ...me, role: 'vendor', vendorId, hasVendor: true })
    if (authService.isRemote) toast('Vendor profile created — upload evidence and submit verification')
    else { notify('admin', 'Vendor awaiting verification', `${f.name} submitted for review.`, 'onboarding', ['ad_vendors', {}]); toast(c.verifyReq ? 'Submitted for verification' : 'Profile created — add a listing') }
    nav.reset('v_verify')
  }
  return (
    <Screen title="Vendor onboarding" subtitle={`${vroles.length ? vroles.map((r) => VENDOR_TYPES[r].label).join(' + ') + ' · ' : ''}step ${step + 1} of 5`} back={step === 0} footer={<div className="flex gap-2">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="flex-1" size="lg" disabled={busy} onClick={next}>{step === 4 ? 'Submit for review' : 'Continue'}</Button></div>}>
      <Stepper steps={['Business', 'Services', 'Details', 'Documents', 'Submit']} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <Banner tone="blue">Your vendor organization is separate from your personal identity. Release 1 is owner-managed — no staff accounts.</Banner>
          <Select label="Which country is your business in?" value={f.country} onChange={set('country')} options={['India']} hint="Asked first, because verification evidence depends on it. Other countries open in Phase 2." />
          <Input label="Business name" required value={f.name} onChange={set('name')} error={errs.name} />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Your vendor roles <span className="text-red-600">*</span></p>
            <Chips scroll={false} multi value={vroles} onChange={(v) => { setVroles(v); setDocs({}); setErrs({ ...errs, vtype: '' }) }} options={Object.entries(VENDOR_TYPES).map(([id, t]) => ({ id, label: t.label }))} />
            {errs.vtype && <p className="mt-1 text-xs font-medium text-red-600">{errs.vtype}</p>}
            {vroles.length ? <div className="mt-2 space-y-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">{vroles.map((r) => <div key={r}><p className="font-semibold text-ink-700">{VENDOR_TYPES[r].label}: {VENDOR_TYPES[r].hint}</p><p className="mt-0.5">Needs: {VENDOR_TYPES[r].needs.join(' · ')}</p></div>)}<p className="font-semibold text-ink-700">A role is shown publicly only after it is verified. You can add more roles later.</p></div> : <p className="mt-1 text-xs text-ink-500">Pick every role that applies. Your roles decide the fields and documents we ask for, and you submit only what they require.</p>}
          </div>
          <Input label="Owner / authorised person" value={f.owner} onChange={set('owner')} />
          <Input label="GSTIN" required placeholder="08ABCPS1234F1Z5" maxLength={15} value={f.gstin} onChange={(e) => set('gstin')(e.target.value.toUpperCase())} error={errs.gstin} />
          <Input label="PAN" required placeholder="ABCPS1234F" maxLength={10} value={f.pan} onChange={(e) => set('pan')(e.target.value.toUpperCase())} error={errs.pan} />
          <Input label="Business email" required type="email" value={f.email} onChange={set('email')} error={errs.email} hint="Hidden from customers by default" />
          <Select label="Operating since" value={f.years} onChange={set('years')} options={Array.from({ length: 15 }, (_, i) => String(2026 - i))} />
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Categories you serve</p><Chips scroll={false} multi value={f.cats} onChange={set('cats')} options={liveCats().map((x) => ({ id: x.id, label: x.name }))} />{errs.cats && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.cats}</p>}</div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service types in {c.name}</p><Chips scroll={false} multi value={f.subs} onChange={set('subs')} options={c.subs} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service areas (cities)</p><Chips scroll={false} multi value={f.areas} onChange={set('areas')} options={CITIES} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div>
          <Input label="Specific pincodes (optional)" placeholder="302021, 302017" value={f.pins} onChange={set('pins')} hint="Leave empty to cover whole selected cities" />
          <Banner tone="blue" title={MODE_LABEL[c.mode]}>Customers will {c.mode === 'booking' ? 'send you booking requests you accept or decline' : c.mode === 'rfq' ? 'send RFQs you answer with a structured quotation' : 'either book you or send RFQs'} in this category.</Banner>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <Banner tone="blue">These fields were loaded from the <b>{c.name}</b> category configuration (v{c.ver.slice(1)}).</Banner>
          {fieldKeys.map((k) => <Input key={k} label={k} required value={f.ans[k] || ''} onChange={(e) => { setF({ ...f, ans: { ...f.ans, [k]: e.target.value } }); setErrs({ ...errs, ['a_' + k]: '' }) }} error={errs['a_' + k]} />)}
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Languages</p><Chips scroll={false} multi value={f.lang} onChange={set('lang')} options={['English', 'Hindi']} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">How customers first contact you</p><Chips scroll={false} value={f.contact} onChange={set('contact')} options={[{ id: 'chat', label: 'In-app chat (default)' }, { id: 'request', label: 'Booking / RFQ only' }]} /><p className="mt-1.5 text-xs text-ink-500">Your phone and email stay protected and are shared only through a controlled flow.</p></div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-3">
          {authService.isRemote
            ? <Banner tone="blue">Evidence files are uploaded from the verification screen after your vendor profile is created. No evidence is submitted in this mock registration step.</Banner>
            : <>{docList.length === 0 ? <Banner tone="green" title="No documents required">{c.name} needs no document verification. Your listings still go through content review.</Banner> : <Banner tone="blue">Required for {c.name}: {docList.join(', ')}. Files are scanned and stored privately; only verification reviewers can open them.</Banner>}
              {docList.map((d) => <DocTile key={d} name={d} status={docs[d] ? 'pending' : 'missing'} onAction={() => setDocs({ ...docs, [d]: !docs[d] })} actionLabel={docs[d] ? 'Remove' : 'Upload'} note={docs[d] ? 'Uploaded · awaiting review' : 'Required'} />)}
              {errs.docs && <p className="text-xs font-medium text-red-600">{errs.docs}</p>}</>}
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <Card><KV rows={[['Business', f.name], ['Roles', vroles.map((r) => VENDOR_TYPES[r].label).join(', ')], ['Category', c.name], ['Service types', f.subs.join(', ') || '—'], ['Areas', f.areas.join(', ')], ['GSTIN', f.gstin.toUpperCase()], ['Documents', authService.isRemote ? 'Upload from verification after profile creation' : `${Object.values(docs).filter(Boolean).length}/${docList.length} uploaded`]]} /></Card>
          <Banner tone="amber" title="What happens next">Automated checks run first; flagged items go to a human reviewer. A reviewer can approve, reject with a reason or ask for more information. <b>You can’t publish until</b> your account, a paid subscription, content review and any required verification all pass.</Banner>
          <div><Checkbox checked={consent} onChange={(v) => { setConsent(v); setErrs({}) }}>I confirm the details are accurate and consent to VendorVerse verifying my documents.</Checkbox>{errs.consent && <p className="mt-1 text-xs font-medium text-red-600">{errs.consent}</p>}</div>
        </div>
      )}
    </Screen>
  )
}

/* ================= VERIFICATION STATUS (spec §5.2) ================= */
async function loadRemoteVerification(vendorId) {
  const [documents, verifications] = await Promise.all([
    authService.listVendorDocuments(vendorId),
    authService.listVendorVerifications(vendorId),
  ])
  if (!documents.ok) return documents
  if (!verifications.ok) return verifications
  return { ok: true, documents: documents.documents, verifications: verifications.verifications }
}

function RemoteVendorVerification({ vendor }) {
  const [documents, setDocuments] = useState([])
  const [verifications, setVerifications] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [level, setLevel] = useState('L1')
  const [documentType, setDocumentType] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    const result = await loadRemoteVerification(vendor.id)
    if (!result.ok) { setError(result.message); return false }
    setDocuments(result.documents)
    setVerifications(result.verifications)
    setError('')
    return true
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loadRemoteVerification(vendor.id).then((result) => {
      if (!active) return
      if (!result.ok) setError(result.message)
      else { setDocuments(result.documents); setVerifications(result.verifications); setError('') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [vendor.id])

  const registerFile = async (file) => {
    const result = await authService.registerVendorDocument(vendor.id, { fileId: file.fileId, documentType: file.documentType })
    if (!result.ok) { setError(result.message); return false }
    setPendingFiles((items) => items.filter((item) => item.fileId !== file.fileId))
    await refresh()
    return true
  }

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    const result = await authService.uploadVendorEvidence(file)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    const pending = { fileId: result.file.id, fileName: file.name, documentType: documentType.trim() || file.name }
    if (result.file.scanStatus === 'clean') await registerFile(pending)
    else if (['infected', 'failed'].includes(result.file.scanStatus)) setError('The evidence file did not pass the security scan. Choose a different file.')
    else setPendingFiles((items) => [...items, pending])
  }

  const checkScan = async (file) => {
    setBusy(true); setError('')
    const result = await authService.getFile(file.fileId)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    if (result.file.scanStatus === 'clean') await registerFile(file)
    else if (['infected', 'failed'].includes(result.file.scanStatus)) {
      setPendingFiles((items) => items.filter((item) => item.fileId !== file.fileId))
      setError('The evidence file did not pass the security scan. Choose a different file.')
    } else setError('The security scan is still in progress. Check again later.')
  }

  const submit = async () => {
    setBusy(true); setError('')
    const result = await authService.submitVendorVerification(vendor.id, { level, documentIds: documents.map((document) => document.id) })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    await refresh()
  }

  const latest = verifications[0]
  const statusLabels = { submitted: 'Submitted — awaiting review', in_review: 'In review', info_requested: 'More information requested', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', revoked: 'Revoked' }

  return (
    <Screen title="Verification" footer={<Button full size="lg" disabled={busy || loading} onClick={submit}>Submit {level} for review</Button>}>
      <Banner tone="blue">Upload evidence below, then submit an L1–L3 verification request. Files are attached only after the security scan passes.</Banner>
      {error && <Banner tone="red" title="Verification request failed">{error}</Banner>}
      <Card><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-ink-400">Current status</p><p className="mt-1 text-sm font-bold">{latest ? statusLabels[latest.status] || latest.status : 'Not submitted'}</p></div>{latest && <Badge tone={latest.status === 'approved' ? 'green' : latest.status === 'rejected' || latest.status === 'revoked' ? 'red' : latest.status === 'info_requested' ? 'amber' : 'blue'}>{latest.level}</Badge>}</div>{latest?.reason && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{latest.reason}</p>}{latest?.expiresAt && <p className="mt-2 text-xs text-ink-500">Expires {new Date(latest.expiresAt).toLocaleDateString()}</p>}</Card>
      <Section title="Evidence documents">
        <Input label="Evidence label" value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="e.g. Business registration" />
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-4 text-sm font-semibold text-brand-700">
          <Upload size={17} />{busy ? 'Uploading or checking scan…' : 'Choose evidence file'}
          <input type="file" className="sr-only" disabled={busy} onChange={upload} />
        </label>
        {pendingFiles.map((file) => <Card key={file.fileId} className="mt-2 !p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.fileName}</p><p className="text-xs text-ink-500">Security scan pending</p></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => checkScan(file)}>Check</Button></div></Card>)}
        {loading && <p className="mt-3 text-sm text-ink-500">Loading verification records…</p>}
        {!loading && documents.length === 0 && <p className="mt-3 text-sm text-ink-500">No evidence documents registered yet.</p>}
        <div className="mt-3 space-y-2">{documents.map((document) => <Card key={document.id} className="!p-3"><p className="text-sm font-semibold">{document.documentType}</p><p className="mt-1 text-xs text-ink-500">Uploaded {new Date(document.submittedAt).toLocaleString()}</p></Card>)}</div>
      </Section>
      <Select label="Verification level" value={level} onChange={(event) => setLevel(event.target.value)} options={['L1', 'L2', 'L3'].map((value) => ({ value, label: value }))} />
      <Section title="Submission history">
        {verifications.length === 0 && <p className="text-sm text-ink-500">No verification requests yet.</p>}
        <div className="space-y-2">{verifications.map((verification) => <Card key={verification.id} className="!p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{verification.level} · {statusLabels[verification.status] || verification.status}</p><Badge tone="gray">{new Date(verification.submittedAt).toLocaleDateString()}</Badge></div>{verification.reason && <p className="mt-2 text-sm text-ink-600">{verification.reason}</p>}</Card>)}</div>
      </Section>
    </Screen>
  )
}

export function VendorVerify() {
  const nav = useNav()
  const v = useMyVendor()
  const { patchVendor, notify, toast, stamp, addAudit, listings, published } = useApp()
  const [fixed, setFixed] = useState({})
  if (!v) return <NoVendor title="Verification" />
  if (authService.isRemote) return <RemoteVendorVerification vendor={v} />
  const c = cat(v.cat)
  const meta = {
    not_started: ['gray', 'Not started', c.verifyReq ? 'Submit your documents to start verification.' : 'Your category doesn’t need document verification.'],
    submitted: ['blue', 'Submitted — awaiting review', 'We usually respond within 1–2 business days. Listings in categories that require verification stay hidden meanwhile.'],
    more_info: ['amber', 'More information required', 'Correct the items below and resubmit. Affected listings stay hidden until resolved.'],
    approved: ['green', 'Approved', 'Approval is one of the gates for publication — it doesn’t publish listings by itself.'],
    rejected: ['red', 'Rejected', 'See the reason below. You can correct and resubmit where allowed.'],
    expired: ['red', 'Credential expired', 'Publication is re-evaluated: affected listings are hidden until a renewed credential is approved.'],
    revoked: ['red', 'Approval revoked', 'Contact support for the reason and next steps.'],
  }[v.ver]
  const last = v.history[v.history.length - 1]
  const bad = v.docs.filter((d) => ['rejected', 'missing', 'expired'].includes(d.status))
  const needsFix = ['more_info', 'rejected', 'expired'].includes(v.ver) || bad.length > 0
  const soon = v.docs.filter((d) => d.status === 'verified' && d.expires && /Dec 2026|Nov 2026|Oct 2026/.test(d.expires))
  const resubmit = () => {
    patchVendor(v.id, (x) => ({ ver: 'submitted', docs: x.docs.map((d) => (fixed[d.name] ? { ...d, status: 'pending', note: undefined } : d)), history: [...x.history, { s: 'submitted', at: stamp(), by: x.owner, note: 'Corrected and resubmitted — earlier decisions stay on record' }] }))
    notify('admin', 'Vendor resubmitted', `${v.name} corrected their documents.`, 'onboarding', ['ad_vendors', {}])
    toast('Resubmitted for review')
  }
  const tone = { green: 'text-emerald-600', blue: 'text-sky-600', amber: 'text-amber-600', red: 'text-red-600', gray: 'text-ink-500' }[meta[0]]
  return (
    <Screen title="Verification" footer={needsFix ? <Button full size="lg" disabled={bad.some((d) => !fixed[d.name])} onClick={resubmit}>Resubmit for review</Button> : null}>
      <Card className={cx('!p-5 text-center', { green: 'bg-emerald-50', blue: 'bg-sky-50', amber: 'bg-amber-50', red: 'bg-red-50', gray: 'bg-ink-100' }[meta[0]])}>
        <div className={cx('mx-auto grid size-16 place-items-center rounded-full bg-white shadow', tone)}>{v.ver === 'approved' ? <BadgeCheck size={36} /> : v.ver === 'submitted' ? <Clock size={34} /> : <AlertTriangle size={34} />}</div>
        <h2 className="mt-3 text-lg font-extrabold">{meta[1]}</h2>
        <p className="mt-1 text-sm text-ink-600">{meta[2]}</p>
        {needsFix && last?.note && <div className="mt-3 rounded-xl bg-white p-3 text-left text-sm"><p className="text-xs font-bold uppercase text-ink-400">Reviewer note</p><p className="mt-0.5 font-medium text-ink-800">{last.note}</p></div>}
      </Card>
      {soon.length > 0 && v.ver === 'approved' && <Banner tone="amber" title="A credential expires soon">{soon[0].name} expires {soon[0].expires}. Renew it early — after expiry your listings in this category are hidden automatically.</Banner>}
      <Section title="Verification tiers">
        <Card className="space-y-3">
          <div className="flex items-center justify-between"><TierBadge tier={v.tier} /><span className="text-xs text-ink-500">Trust score {trustScore(v)}/100</span></div>
          {TIERS.slice(1).map((t) => {
            const ok = v.tier >= t.n
            return (
              <div key={t.n} className={cx('rounded-xl p-3 ring-1 ring-inset', ok ? 'bg-emerald-50 ring-emerald-200' : t.n === v.tier + 1 ? 'bg-white ring-2 ring-brand-500' : 'bg-ink-50 ring-ink-100')}>
                <div className="flex items-center gap-2"><span className={cx('grid size-6 place-items-center rounded-full text-[11px] font-bold', ok ? 'bg-emerald-600 text-white' : 'bg-ink-200 text-ink-600')}>{ok ? <Check size={13} strokeWidth={3} /> : t.n}</span><p className="text-sm font-bold">{t.name}</p>{t.n === 4 && <PhaseTag p="P2" />}</div>
                <p className="mt-1 text-xs text-ink-500">{t.desc}</p>
                <p className="mt-1.5 text-[11px] font-semibold text-ink-600">Needs: {t.needs.join(' · ')}</p>
                {!ok && t.n === v.tier + 1 && t.n < 4 && <Button size="sm" className="mt-2" onClick={() => toast(`Upgrade to ${t.name} requested — upload the listed evidence`)}>Request Tier {t.n}</Button>}
              </div>
            )
          })}
          <p className="text-[11px] text-ink-400">Higher tiers rank no higher by themselves, but they raise your trust score and unlock categories and contract sizes that need them.</p>
        </Card>
      </Section>
      <Section title="Documents">
        <div className="space-y-2">
          {v.docs.length === 0 && <Card><Missing>{c.verifyReq ? `Upload: ${c.docs.join(', ')}` : 'No documents required for this category'}</Missing></Card>}
          {v.docs.map((d) => {
            const fix = ['rejected', 'missing', 'expired'].includes(d.status)
            return <DocTile key={d.name} name={d.name} status={fixed[d.name] ? 'pending' : d.status === 'expired' ? 'rejected' : d.status} note={fixed[d.name] ? 'New file uploaded' : d.note || (d.expires ? `Valid till ${d.expires}` : undefined)} onAction={fix && needsFix ? () => setFixed({ ...fixed, [d.name]: !fixed[d.name] }) : undefined} actionLabel={fixed[d.name] ? 'Undo' : 'Re-upload'} />
          })}
        </div>
      </Section>
      {v.ver === 'approved' && v.docs.some((d) => d.status === 'verified' && d.expires) && (
        <Card className="space-y-2 !bg-ink-100 shadow-none">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Mockup control · credential expiry (SC-009)</p>
          <p className="text-xs text-ink-600">Expire your {v.docs.filter((d) => d.status === 'verified' && d.expires).slice(-1)[0].name.toLowerCase()} and watch only the listings that depend on it get hidden.</p>
          <Button size="sm" variant="secondary" onClick={() => { const d = v.docs.filter((x) => x.status === 'verified' && x.expires).slice(-1)[0]; patchVendor(v.id, (x) => ({ docs: x.docs.map((y) => (y.name === d.name ? { ...y, status: 'expired', note: `${d.name} expired — upload the renewed copy` } : y)), history: [...x.history, { s: 'expired', at: stamp(), by: 'System', note: `${d.name} expired` }] })); addAudit('Credential expired → listings re-evaluated', v.name, 'publication', `${d.name} expired`, 'System'); notify('vendor', 'Credential expired', `${d.name} expired. Affected listings are hidden until you renew it.`, 'onboarding', ['v_verify', {}]); toast('Expired — affected listings are now hidden', 'warn') }}>Expire a credential</Button>
          <p className="text-[11px] text-ink-500">Public now: {listings.filter((l) => l.vendorId === v.id && published(l)).length} of {listings.filter((l) => l.vendorId === v.id).length} listings</p>
        </Card>
      )}
      <Section title="Decision history (kept for audit)"><Card><Timeline steps={v.history.map((h, i) => ({ label: { submitted: 'Submitted for review', more_info: 'More information requested', approved: 'Approved', rejected: 'Rejected', expired: 'Credential expired', restricted: 'Account restricted' }[h.s] || h.s, at: `${h.at} · ${h.by}`, note: h.note, done: i < v.history.length - 1 || h.s === 'approved', current: i === v.history.length - 1 && h.s !== 'approved' }))} /></Card></Section>
    </Screen>
  )
}

/* ================= LISTINGS ================= */
function statusOf(l, v) {
  if (isPublished(l, v)) return 'published'
  if (l.review === 'draft') return 'draft'
  if (l.paused) return 'paused'
  if (l.restricted) return 'restricted'
  if (l.review === 'pending') return 'pending'
  if (l.review === 'rejected') return 'rejected'
  if (l.review === 'changes') return 'changes'
  return 'hidden'
}
export function VendorListings() {
  const nav = useNav()
  const { listings, settings, published } = useApp()
  const v = useMyVendor()
  const [tab, setTab] = useState('all')
  if (!v) return <NoVendor title="Listings" />
  const mine = listings.filter((l) => l.vendorId === v.id)
  const plan = planOf(v, settings)
  const cap = limitNum(plan.listings)
  const st = (l) => statusOf(l, v)
  const list = mine.filter((l) => tab === 'all' || (tab === 'live' ? st(l) === 'published' : tab === 'review' ? ['pending', 'draft'].includes(st(l)) : !['published', 'pending', 'draft'].includes(st(l))))
  const cnt = (f) => mine.filter(f).length
  const atCap = mine.filter((l) => l.review !== 'draft').length >= cap
  return (
    <Screen title="My listings" back={false} right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => atCap ? nav.go('v_plans') : nav.go('v_listing_edit')}>Add</Button>}>
      <Card className="!p-3.5">
        <div className="flex items-center justify-between text-sm"><span className="font-bold">{plan.name} plan</span><span className="text-ink-500">{mine.filter((l) => l.review !== 'draft').length} of {cap === Infinity ? '∞' : cap} listings</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${cap === Infinity ? 20 : Math.min(100, (mine.filter((l) => l.review !== 'draft').length / (cap || 1)) * 100)}%` }} /></div>
        {atCap && <p className="mt-2 text-xs font-semibold text-amber-700">Listing limit reached — upgrade your plan to add more.</p>}
      </Card>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'all', label: 'All', count: mine.length }, { id: 'live', label: 'Public', count: cnt((l) => st(l) === 'published') }, { id: 'review', label: 'Review', count: cnt((l) => ['pending', 'draft'].includes(st(l))) }, { id: 'issues', label: 'Hidden', count: cnt((l) => !['published', 'pending', 'draft'].includes(st(l))) }]} />
      <div className="space-y-2.5">
        {list.map((l) => {
          const b = firstBlocker(l, v)
          return (
            <Card key={l.id} onClick={() => nav.go('v_listing_gate', { id: l.id })} className="!p-3">
              <div className="flex gap-3">
                <Thumb tone={l.tone} icon={cat(l.cat).icon} size={64} round="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold leading-snug">{l.title}</p><StatusBadge s={st(l)} /></div>
                  <div className="mt-1"><Price l={l} /></div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">{l.areas.map((a) => <Pill key={a}>{a}</Pill>)}{l.dupOf && <Badge tone="amber">Possible duplicate</Badge>}</div>
                </div>
              </div>
              {!isPublished(l, v) && b && <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700"><Lock size={13} className="mt-0.5 shrink-0" />Hidden: {b.detail}</p>}
            </Card>
          )
        })}
        {!list.length && <EmptyState icon={Package} title="No listings here" action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
      </div>
    </Screen>
  )
}

/* ---- publication checklist: the six gates (spec §5.3, SC-006/007/008/009) ---- */
export function ListingGate({ params }) {
  const nav = useNav()
  const { listings, patchListing, gates, published, toast, vendor, notify } = useApp()
  const l = listings.find((x) => x.id === params.id) || listings.find((x) => x.vendorId === 'v-me')
  const v = vendor(l.vendorId)
  const g = gates(l)
  const live = published(l)
  const [explain, setExplain] = useState(false)
  const [why, setWhy] = useState('')
  const dup = l.dupOf && listings.find((x) => x.id === l.dupOf)
  return (
    <Screen
      title="Publication status"
      subtitle={l.title}
      right={<StatusBadge s={statusOf(l, v)} className="mr-2" />}
      overlay={<Sheet open={explain} onClose={() => setExplain(false)} title="Explain this listing" footer={<Button full disabled={why.trim().length < 10} onClick={() => { patchListing(l.id, { dupNote: why }); notify('admin', 'Duplicate flag explained', `${l.title}: ${why.slice(0, 40)}`, 'listing', ['ad_listing', { id: l.id }]); setExplain(false); toast('Sent to the reviewer — nothing is merged or deleted') }}>Send to reviewer</Button>}><p className="text-sm text-ink-600">Tell the reviewer why this is a legitimate regional or service variant.</p><Input textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Separate Sikar team and different service radius" /></Sheet>}
      footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => nav.go('v_listing_edit', { id: l.id })}>Edit listing</Button>{l.review === 'draft' ? <Button className="flex-1" onClick={() => { patchListing(l.id, { review: 'pending' }); toast('Submitted for review') }}>Submit for review</Button> : l.review === 'rejected' || l.review === 'changes' ? <Button className="flex-1" onClick={() => { patchListing(l.id, { review: 'pending', reason: undefined }); toast('Resubmitted for review') }}>Resubmit</Button> : <Button className="flex-1" variant={l.paused ? 'primary' : 'secondary'} icon={l.paused ? Play : Pause} onClick={() => { patchListing(l.id, { paused: !l.paused }); toast(l.paused ? 'Listing resumed — gates re-checked' : 'Listing paused') }}>{l.paused ? 'Resume' : 'Pause'}</Button>}</div>}
    >
      <Card className={cx('!p-5 text-center', live ? 'bg-emerald-50' : 'bg-ink-100')}>
        <div className={cx('mx-auto grid size-14 place-items-center rounded-full bg-white shadow', live ? 'text-emerald-600' : 'text-ink-500')}>{live ? <Eye size={28} /> : <Lock size={26} />}</div>
        <h2 className="mt-3 text-lg font-extrabold">{live ? 'Publicly discoverable' : 'Hidden from customers'}</h2>
        <p className="mt-1 text-sm text-ink-600">{live ? 'All six publication checks pass.' : `${g.filter((x) => !x.ok).length} check${g.filter((x) => !x.ok).length > 1 ? 's' : ''} need attention. Payment never overrides review or verification.`}</p>
      </Card>
      {l.reason && <Banner tone="red" title="Reviewer feedback">{l.reason}</Banner>}
      {dup && <Banner tone="amber" title="Possible duplicate" action={<Button size="sm" variant="secondary" onClick={() => setExplain(true)}>{l.dupNote ? 'Update explanation' : 'It’s a variant'}</Button>}>This looks similar to “{dup.title}” (same service, nearby area). It’s flagged for review — we never merge or delete automatically, and legitimate regional variants stay.</Banner>}
      <Group>{g.map((x, i) => <GateRow key={x.id} g={x} last={i === g.length - 1} />)}</Group>
      <p className="text-xs text-ink-500">Publication is recomputed from live state whenever any check changes — for example when a subscription lapses or a credential expires — so nothing stays public by accident.</p>
      <div className="grid grid-cols-2 gap-2.5"><Button variant="secondary" icon={Eye} onClick={() => nav.go('c_listing', { id: l.id })}>Preview as customer</Button><Button variant="secondary" icon={Megaphone} onClick={() => nav.go('v_sponsor', { id: l.id })}>Sponsor</Button></div>
    </Screen>
  )
}

export function ListingEdit({ params = {} }) {
  const nav = useNav()
  const { me, listings, setListings, patchListing, notify, toast, settings } = useApp()
  const v = useMyVendor()
  const ex = params.id ? listings.find((l) => l.id === params.id) : null
  const [f, setF] = useState(ex ? { ...ex, priceMin: ex.priceMin != null ? String(ex.priceMin) : '', priceMax: ex.priceMax ? String(ex.priceMax) : '', imgs: ex.portfolio || 0, moq: ex.trade?.moq ? String(ex.trade.moq) : '', lead: ex.trade?.leadDays ? String(ex.trade.leadDays) : '', certs: (ex.trade?.certs || []).join(', '), specVals: Object.fromEntries((ex.specs || []).map(([k, val]) => [k, val === '—' ? '' : val])) } : { cat: v?.cat || 'home', sub: '', title: '', desc: '', priceMin: '', priceMax: '', unit: 'visit', basis: '', areas: v?.areas?.slice(0, 1) || ['Jaipur'], pins: null, avail: 'slots', imgs: 0, specVals: {}, scope: 'city', cur: 'INR', instant: false, moq: '', lead: '', certs: '' })
  const [errs, setErrs] = useState({})
  const [del, setDel] = useState(false)
  const [dupAsk, setDupAsk] = useState(null)
  if (!v) return <NoVendor title="Listing" />
  const c = cat(f.cat)
  const mineAll = listings.filter((l) => l.vendorId === v.id)
  const plan = planOf(v, settings)
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const material = ex && ex.review === 'approved' && (ex.title !== f.title || ex.desc !== f.desc || String(ex.priceMin ?? '') !== f.priceMin || ex.areas.join() !== f.areas.join())
  const save = (submit, force) => {
    const e = {}
    if (f.title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (submit && f.desc.trim().length < 20) e.desc = 'Add a description (min 20 characters)'
    if (submit && !f.areas.length) e.areas = 'Pick at least one service area'
    if (f.priceMax && +f.priceMax < +f.priceMin) e.priceMax = 'Maximum can’t be lower than minimum'
    setErrs(e)
    if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'warn')
    if (['restricted', 'suspended'].includes(v.acct)) return toast(`ACCOUNT_${v.acct.toUpperCase()} — new listings are blocked on every platform`, 'warn')
    if (!ex && submit && mineAll.filter((l) => l.review !== 'draft').length >= limitNum(plan.listings)) return nav.replace('v_plans')
    const near = !ex && mineAll.find((l) => l.sub === (f.sub || c.subs[0]) && l.areas.some((a) => f.areas.includes(a)) && l.title.split(' ').filter((w) => w.length > 3 && f.title.toLowerCase().includes(w.toLowerCase())).length >= 2)
    if (near && !force) return setDupAsk(near)
    const body = { cat: f.cat, sub: f.sub || c.subs[0], type: c.type, title: f.title.trim(), desc: f.desc.trim(), priceMin: f.priceMin ? +f.priceMin : null, priceMax: f.priceMax ? +f.priceMax : null, unit: f.unit, basis: f.basis, areas: f.areas, avail: f.avail, scope: f.scope, cur: f.cur, instant: !!f.instant && f.avail === 'slots', trade: f.moq || f.lead || f.certs ? { moq: f.moq ? +f.moq : null, unit: 'pcs', leadDays: f.lead ? +f.lead : null, certs: f.certs.split(',').map((x) => x.trim()).filter(Boolean), origin: 'India', tiers: ex?.trade?.tiers } : ex?.trade, portfolio: f.imgs, tone: c.tone, specs: c.fields.map((k) => [k, f.specVals[k] || '—']) }
    if (ex) {
      patchListing(ex.id, { ...body, review: material || ex.review === 'rejected' || ex.review === 'changes' ? 'pending' : ex.review, reason: undefined })
      toast(material ? 'Saved — material edits go back to review' : ex.review === 'rejected' ? 'Resubmitted for review' : 'Listing updated')
      if (material) notify('admin', 'Listing re-review', body.title, 'listing', ['ad_listing', { id: ex.id }])
    } else {
      const id = 'l' + Date.now()
      setListings((l) => [{ id, vendorId: v.id, rating: 0, reviews: 0, review: submit ? 'pending' : 'draft', paused: false, restricted: false, hold: null, sponsored: false, pins: null, exp: null, dupOf: near?.id || null, ...body }, ...l])
      if (submit) notify('admin', 'Listing pending review', body.title, 'listing', ['ad_listing', { id }])
      toast(near ? 'Submitted — flagged as a possible duplicate for the reviewer' : submit ? 'Submitted for review' : 'Saved as draft')
    }
    nav.back()
  }
  return (
    <Screen
      title={ex ? 'Edit listing' : 'New listing'}
      right={ex && <IconBtn label="Delete" onClick={() => setDel(true)}><Trash2 size={19} className="text-red-500" /></IconBtn>}
      overlay={
        <>
          <Dialog open={del} onClose={() => setDel(false)} title="Remove this listing?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setDel(false)}>Keep</Button><Button variant="danger" className="flex-1" onClick={() => { setListings((l) => l.filter((x) => x.id !== ex.id)); toast('Listing removed'); nav.reset('v_listings') }}>Remove</Button></>}><p>It will no longer appear to customers. Existing bookings and accepted quotations are not affected.</p></Dialog>
          <Dialog open={!!dupAsk} onClose={() => setDupAsk(null)} title="Looks like a duplicate" actions={<><Button variant="secondary" className="flex-1" onClick={() => setDupAsk(null)}>Edit</Button><Button className="flex-1" onClick={() => { const d = dupAsk; setDupAsk(null); save(true, true) }}>It’s a variant</Button></>}><p>Similar to “{dupAsk?.title}”. If this is a separate service or area, submit anyway — a reviewer decides. Nothing is merged or deleted automatically.</p></Dialog>
        </>
      }
      footer={<div className="flex gap-2">{!ex && <Button variant="secondary" onClick={() => save(false)}>Save draft</Button>}<Button className="flex-1" size="lg" onClick={() => save(true)}>{ex ? (['rejected', 'changes'].includes(ex.review) ? 'Resubmit' : 'Save changes') : 'Submit for review'}</Button></div>}
    >
      {material && <Banner tone="amber" title="Material edit">Changing the title, description, price or area sends this listing back to review. It stays hidden until re-approved.</Banner>}
      <Select label="Category" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value, sub: '', specVals: {} })} options={liveCats().map((x) => ({ value: x.id, label: x.name }))} />
      <Select label="Service type" value={f.sub || c.subs[0]} onChange={set('sub')} options={c.subs} />
      <Input label="Title" required value={f.title} onChange={set('title')} error={errs.title} placeholder="e.g. Electrician — home wiring & fault visit" />
      <Input label="Description" required textarea rows={4} value={f.desc} onChange={set('desc')} error={errs.desc} hint="What’s included, experience, warranty. Min 20 characters." />
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Portfolio photos <span className="font-normal text-ink-400">(optional)</span></p>
        <div className="flex gap-2">{Array.from({ length: f.imgs }).map((_, i) => <div key={i} className="relative grid size-[72px] place-items-center rounded-xl bg-gradient-to-br from-ink-200 to-ink-300 text-ink-500"><ImagePlus size={20} /><button aria-label="Remove image" onClick={() => setF({ ...f, imgs: f.imgs - 1 })} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink-900 text-white"><X size={11} /></button></div>)}{f.imgs < 8 && <button onClick={() => setF({ ...f, imgs: f.imgs + 1 })} className="grid size-[72px] place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400"><Plus size={20} /></button>}</div>
        <p className="mt-1.5 text-xs text-ink-500">No photos? Customers see “No portfolio photos provided” — we never add stock images.</p>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Price <span className="font-normal text-ink-400">(optional)</span></p>
        <div className="flex gap-3"><Input prefix="₹" inputMode="numeric" placeholder="From" value={f.priceMin} onChange={(e) => set('priceMin')(e.target.value.replace(/\D/g, ''))} /><Input prefix="₹" inputMode="numeric" placeholder="Up to" value={f.priceMax} onChange={(e) => set('priceMax')(e.target.value.replace(/\D/g, ''))} error={errs.priceMax} /></div>
        <div className="mt-3 flex gap-3"><Input label="Unit" value={f.unit} onChange={set('unit')} /><Input label="Pricing basis" placeholder="Visit charge; material extra" value={f.basis} onChange={set('basis')} /></div>
        <p className="mt-1.5 text-xs text-ink-500">Leave empty if you quote per requirement — customers will see “Price not provided” and can enquire.</p>
      </div>
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service areas <span className="text-red-500">*</span></p><Chips scroll={false} multi value={f.areas} onChange={set('areas')} options={CITIES} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Coverage scope</p>
        <Chips scroll={false} value={f.scope} onChange={set('scope')} options={[{ id: 'city', label: 'Cities / pincodes' }, { id: 'country', label: 'Whole country' }, { id: 'global', label: 'Worldwide' }]} />
        <p className="mt-1.5 text-xs text-ink-500">{f.scope === 'global' ? 'Shown to buyers in every country. Cross-border terms (incoterms, export documents) are a Phase 2 feature — until then agree them in chat.' : f.scope === 'country' ? 'Shown to customers anywhere in your country.' : 'Shown only inside the cities or pincodes you pick.'}</p>
        <div className="mt-3 flex gap-3"><Select label="Listing currency" value={f.cur} onChange={set('cur')} options={Object.keys(CUR)} /></div>
      </div>
      {(['manufacturer', 'supplier'].includes(v.kind) || c.id === 'whole') && (
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-ink-100">
          <p className="text-sm font-extrabold">Supplier & manufacturer details</p>
          <div className="flex gap-3"><Input label="Min order qty" inputMode="numeric" value={f.moq} onChange={(e) => set('moq')(e.target.value.replace(/\D/g, ''))} /><Input label="Lead time (days)" inputMode="numeric" value={f.lead} onChange={(e) => set('lead')(e.target.value.replace(/\D/g, ''))} /></div>
          <Input label="Certifications" placeholder="ISO 9001, CE, FSC" value={f.certs} onChange={(e) => set('certs')(e.target.value)} hint="Self-declared until a reviewer verifies the certificate" />
        </div>
      )}
      {f.avail === 'slots' && <Card><Tg label="Offer instant booking ⚡" desc="Only if you keep a reliable live schedule — requests are confirmed automatically and the slot is reserved atomically" on={f.instant} onChange={(x) => setF({ ...f, instant: x })} /></Card>}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Availability model</p>
        <Chips scroll={false} value={f.avail} onChange={set('avail')} options={Object.entries(AVAIL_LABEL).map(([id, label]) => ({ id, label }))} />
        <p className="mt-1.5 text-xs text-ink-500">Default for {c.name}: {AVAIL_LABEL[c.avail]}. “Not listed” is shown honestly to customers if you have no reliable schedule.</p>
      </div>
      <Section title={`${c.name} details`}>
        <div className="space-y-3">{c.fields.map((k) => <Input key={k} label={k} value={f.specVals[k] || ''} onChange={(e) => setF({ ...f, specVals: { ...f.specVals, [k]: e.target.value } })} />)}</div>
        <div className="mt-3 flex items-center gap-2"><ModeChip mode={c.mode} /><span className="text-xs text-ink-500">Booking mode is set by the category.</span></div>
      </Section>
    </Screen>
  )
}

/* ================= SERVICE AREAS ================= */
export function ServiceAreas() {
  const nav = useNav()
  const { patchVendor, toast, listings, patchListing } = useApp()
  const v = useMyVendor()
  const [areas, setAreas] = useState(v?.areas || [])
  const [pins, setPins] = useState('302021, 302017, 302020')
  if (!v) return <NoVendor title="Service areas" />
  return (
    <Screen title="Service areas" footer={<Button full size="lg" disabled={!areas.length} onClick={() => { patchVendor(v.id, { areas }); toast('Coverage saved — search matching updates'); nav.back() }}>Save coverage</Button>}>
      <Banner tone="blue">Search only shows you to customers inside these areas. Never list places you can’t actually serve.</Banner>
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Cities</p><Chips scroll={false} multi value={areas} onChange={setAreas} options={CITIES} /></div>
      <Input label="Hyperlocal pincodes (optional)" value={pins} onChange={(e) => setPins(e.target.value)} hint="Applies to listings you pick below" />
      <Section title="Listing coverage"><Group>{listings.filter((l) => l.vendorId === v.id).map((l, i, a) => <ListRow key={l.id} last={i === a.length - 1} icon={MapPin} tone="teal" title={l.title} subtitle={`${l.areas.join(', ')}${l.pins ? ' · ' + l.pins.length + ' pincodes' : ''}`} onClick={() => nav.go('v_listing_edit', { id: l.id })} />)}</Group></Section>
    </Screen>
  )
}

/* ================= AVAILABILITY ================= */
export function Availability() {
  const { toast } = useApp()
  const v = useMyVendor()
  const c = cat(v?.cat || 'home')
  const [model, setModel] = useState(c.avail)
  const [days, setDays] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false })
  const [cap, setCap] = useState('2')
  const [lead, setLead] = useState('3')
  const [open, setOpen] = useState('09:00')
  const [close, setClose] = useState('18:00')
  return (
    <Screen title="Availability" footer={<Button full size="lg" onClick={() => toast('Availability saved')}>Save</Button>}>
      <Banner tone="blue">Customers only see availability you actually maintain. If you don’t keep a schedule, choose <b>Not listed</b> — we won’t imply free slots.</Banner>
      <Chips scroll={false} value={model} onChange={setModel} options={Object.entries(AVAIL_LABEL).map(([id, label]) => ({ id, label }))} />
      {model === 'slots' && (<><div><p className="mb-2 text-[13px] font-semibold text-ink-700">Working days</p><Chips scroll={false} multi value={Object.keys(days).filter((d) => days[d])} onChange={(a) => setDays(Object.fromEntries(Object.keys(days).map((d) => [d, a.includes(d)])))} options={Object.keys(days)} /></div><div className="flex gap-3"><Input label="Opens" type="time" value={open} onChange={(e) => setOpen(e.target.value)} /><Input label="Closes" type="time" value={close} onChange={(e) => setClose(e.target.value)} /></div><Input label="Jobs you can take at the same time" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} hint="Exclusive slots are reserved atomically so two customers can’t take the same one" /><Card className="!bg-ink-50 shadow-none"><p className="text-xs text-ink-600">Times are in <b>IST</b>. Instant confirmation is off in Release 1 — you accept each request.</p></Card></>)}
      {model === 'capacity' && <Input label="Jobs per day" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} hint="A date at capacity can’t be confirmed again" />}
      {model === 'lead' && <Input label="Typical lead time (days)" inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value.replace(/\D/g, ''))} hint="Shown as an estimate — you confirm each date" />}
      {model === 'none' && <Card><Missing>Availability not listed — customers will see this label.</Missing></Card>}
    </Screen>
  )
}

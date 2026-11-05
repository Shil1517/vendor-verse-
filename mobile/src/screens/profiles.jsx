import { useEffect, useState } from 'react'
import {
  CalendarCheck, FileText, FileSignature, Heart, ShieldCheck, Plus, Trash2, MapPin, Building2, User, Check, ImagePlus, Award, Globe, Users, Package, Eye, Wallet, ChevronRight, Lock, Star, X, Link as LinkIcon,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, cat } from '../data.jsx'
import { GEO, TIERS, RATING_DIMS, trustScore, KIND_LABEL, country, CUR } from '../globaldata.jsx'
import {
  Screen, Card, Section, Button, Chips, Segmented, Sheet, Input, Select, Toggle, Badge, Banner, EmptyState, Stat, KV, cx, Pill, ListRow, Group, Avatar, HBar, TierBadge, PhaseBanner, PhaseTag, Missing, Rating, Thumb, Checkbox,
} from '../ui.jsx'
import { useMyVendor } from './vendor_a.jsx'
import { authService } from '../services/authService.js'

/* ---------- shared: completeness meter ---------- */
export function Completeness({ pct, items, onTap }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">Profile completeness</p><span className="text-lg font-extrabold text-brand-700">{pct}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${pct}%` }} /></div>
      {items.filter((x) => !x.ok).length > 0 && <div className="mt-3 space-y-1.5">{items.filter((x) => !x.ok).slice(0, 4).map((x) => <button key={x.label} onClick={() => onTap?.(x)} className="flex w-full items-center gap-2 text-left text-xs font-semibold text-ink-600"><span className="grid size-4 place-items-center rounded-full ring-1 ring-ink-300" />{x.label}<ChevronRight size={13} className="ml-auto text-ink-300" /></button>)}</div>}
    </Card>
  )
}

/* ---------- trust: tier + score + rating dimensions ---------- */
export function TrustCard({ v }) {
  const score = trustScore(v)
  const dims = v.rating > 0 ? RATING_DIMS.map(([k, l], i) => [l, Math.max(3, Math.min(5, +(v.rating + [0.1, -0.15, -0.05, -0.25][i]).toFixed(1)))]) : null
  const t = TIERS[v.tier] || TIERS[0]
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="size-20 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef1f6" strokeWidth="3.5" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="#00857c" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(score / 100) * 97.4} 97.4`} /></svg>
          <span className="absolute text-xl font-extrabold">{score}</span>
        </div>
        <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">Trust score</p><div className="mt-1"><TierBadge tier={v.tier} /></div><p className="mt-1.5 text-xs leading-snug text-ink-500">{t.desc} Based on verification tier, ratings, completed jobs and reply time — never on a paid plan.</p></div>
      </div>
      {dims ? <div className="space-y-2.5">{dims.map(([l, n]) => <HBar key={l} label={l} value={n} max={5} right={n.toFixed(1)} color="bg-amber-400" />)}</div> : <Missing>Rating breakdown appears after the first verified reviews</Missing>}
    </Card>
  )
}

/* ================= CUSTOMER DASHBOARD ================= */
export function CustomerDash() {
  const nav = useNav()
  const { me, bookings, rfqs, contracts, saved, payments } = useApp()
  const mb = bookings.filter((b) => b.customer === me.name)
  const act = mb.filter((b) => ['requested', 'confirmed', 'in_progress', 'awaiting'].includes(b.state))
  const rf = rfqs.filter((r) => r.customer === me.name && r.state === 'open')
  const ct = contracts.filter((c) => c.customer === me.name && ['active', 'proposed', 'negotiating'].includes(c.state))
  const pr = me.profile || {}
  const items = [{ label: 'Add your business details', ok: !!pr.company, to: 'c_profile_edit' }, { label: 'Add a service address', ok: (pr.addresses || []).length > 0, to: 'c_profile_edit' }, { label: 'Verify your email', ok: !!pr.emailOk, to: 'c_profile_edit' }, { label: 'Save a favorite vendor', ok: saved.length > 0, to: 'c_explore' }]
  const pct = Math.round((20 + items.filter((x) => x.ok).length * 20))
  return (
    <Screen title="My dashboard" subtitle={me.name}>
      <div className="grid grid-cols-2 gap-3"><Stat label="Active bookings" value={act.length} icon={CalendarCheck} tone="sky" onClick={() => nav.go('c_activity', { tab: 'bookings' })} /><Stat label="Open RFQs" value={rf.length} icon={FileText} tone="violet" onClick={() => nav.go('c_activity', { tab: 'rfqs' })} /><Stat label="Contracts" value={ct.length} icon={FileSignature} tone="amber" onClick={() => nav.go('c_activity', { tab: 'contracts' })} /><Stat label="Favorites" value={saved.length} icon={Heart} tone="rose" onClick={() => nav.go('c_saved')} /></div>
      <Completeness pct={pct} items={items} onTap={(x) => nav.go(x.to)} />
      <Section title="Spend & payments"><Card className="relative overflow-hidden"><div className="opacity-50"><p className="text-xs text-ink-500">This month</p><p className="text-2xl font-extrabold">₹ ••,•••</p><div className="mt-2 h-10 rounded-lg bg-gradient-to-r from-brand-200 to-brand-50" /></div><div className="absolute inset-0 grid place-items-center bg-white/70"><div className="text-center"><PhaseTag p="P2" /><p className="mt-1 text-xs font-semibold text-ink-600">Spend analytics arrive with in-app payments</p></div></div></Card></Section>
      <Group>
        <ListRow icon={Wallet} tone="emerald" title="Payments & invoices" subtitle="Phase 2" right={<PhaseTag p="P2" />} onClick={() => nav.go('c_payments')} />
        <ListRow icon={ShieldCheck} tone="teal" title="Account status & safety" onClick={() => nav.go('acct_state')} />
        <ListRow icon={User} tone="slate" title="Edit profile" onClick={() => nav.go('c_profile_edit')} last />
      </Group>
    </Screen>
  )
}

/* ================= CUSTOMER PROFILE (individual or business) ================= */
const fmtPhone = (p) => (/^\+91\d{10}$/.test(p || '') ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p || '')
const LANG_LABEL = { en: 'English', hi: 'हिन्दी' }
const LANG_CODE = { English: 'en', 'हिन्दी': 'hi' }

export function ProfileEdit({ params = {} }) {
  const nav = useNav()
  const { me, setMe, toast, loc } = useApp()
  const p = me.profile || {}
  const remote = Boolean(authService.isRemote) // real API: name, email, locale and addresses live on the server (F-ACC-06)
  const [f, setF] = useState(remote
    ? { name: '', email: '', country: loc.country || 'IN', lang: 'English', cur: 'INR', addresses: [], emailOk: false }
    : { name: me.name, email: p.email || 'aarav.mehta@gmail.com', country: p.country || loc.country || 'IN', lang: p.lang || 'English', cur: p.cur || 'INR', addresses: p.addresses || [{ id: 1, label: 'Home', text: '24, Vaishali Nagar, Jaipur 302021', def: true }], emailOk: p.emailOk ?? false })
  const [phone, setPhone] = useState('+91 98290 00001')
  const [serverIds, setServerIds] = useState([])
  const [loading, setLoading] = useState(remote)
  const [saving, setSaving] = useState(false)
  const [addr, setAddr] = useState('')
  const [errs, setErrs] = useState({})
  useEffect(() => {
    if (!remote) return undefined
    let live = true
    ;(async () => {
      const [pr, lr] = await Promise.all([authService.getProfile(), authService.listLocations()])
      if (!live) return
      if (pr.ok) {
        const q = pr.profile
        setF((x) => ({ ...x, name: q.displayName || '', email: q.email || '', emailOk: Boolean(q.emailVerified), country: q.locale?.country || x.country, lang: LANG_LABEL[q.locale?.language] || x.lang, cur: q.locale?.currency || x.cur }))
        if (q.phone) setPhone(fmtPhone(q.phone))
      } else toast(pr.message)
      if (lr.ok) {
        setServerIds(lr.locations.map((l) => l.id))
        setF((x) => ({ ...x, addresses: lr.locations.map((l) => ({ id: l.id, label: l.label, text: l.addressText, def: l.isDefault, server: true })) }))
      }
      setLoading(false)
    })()
    return () => { live = false }
  }, [])
  const checks = [f.name.trim().length > 2, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email), f.emailOk, f.addresses.length > 0]
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  const save = async () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Name is required'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email'
    setErrs(e)
    if (Object.keys(e).length) return
    if (remote) {
      setSaving(true)
      const locale = {}
      if (/^[A-Z]{2}$/.test(f.country)) locale.country = f.country
      if (LANG_CODE[f.lang]) locale.language = LANG_CODE[f.lang]
      if (/^[A-Z]{3}$/.test(f.cur)) locale.currency = f.cur
      const steps = [() => authService.saveProfile({ displayName: f.name.trim(), email: f.email.trim() ? f.email.trim() : null, locale })]
      for (const id of serverIds) if (!f.addresses.some((a) => a.id === id)) steps.push(() => authService.removeLocation(id))
      for (const a of f.addresses) if (!a.server) steps.push(() => authService.addLocation({ label: a.label, addressText: a.text, isDefault: Boolean(a.def) }))
      for (const step of steps) {
        const r = await step()
        if (!r.ok) { setSaving(false); setErrs({ form: r.message }); return toast(r.message) }
      }
      setSaving(false)
    }
    setMe({ ...me, name: f.name.trim(), profile: { ...f } }); toast('Profile saved')
    if (params.firstRun) nav.reset('c_home'); else nav.back()
  }
  return (
    <Screen title="Edit profile" footer={<Button full size="lg" disabled={loading || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>}>
      <Completeness pct={pct} items={[{ label: 'Confirm your email', ok: f.emailOk }, { label: 'Add an address', ok: f.addresses.length > 0 }]} />
      <div className="flex justify-center py-1"><div className="relative"><Avatar name={f.name || 'A'} size={84} /><span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-brand-600 text-white ring-4 ring-ink-50"><ImagePlus size={15} /></span></div></div>
      {errs.form && <p role="alert" className="text-center text-sm font-medium text-red-600">{errs.form}</p>}
      <Input label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} />
      <Input label="Mobile number" value={phone} readOnly hint="Verified · changing it needs OTP re-verification" />
      <div><Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value, emailOk: false })} error={errs.email} />{!remote && !f.emailOk && <button onClick={() => { setF({ ...f, emailOk: true }); toast('Email confirmed') }} className="mt-1.5 text-xs font-bold text-brand-700">Send confirmation link →</button>}{remote && f.email && !f.emailOk && <p className="mt-1.5 text-xs text-ink-500">Not verified yet — email verification is coming soon.</p>}{f.emailOk && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} />Email confirmed</p>}</div>
      <Banner tone="blue" title="Personal profile">Company details are not kept here. To list a business, become a vendor from your Profile. Company owners open a separate Business account.</Banner>
      <Section title="Addresses">
        <div className="space-y-2">{f.addresses.map((a) => <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><MapPin size={17} className="text-brand-600" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a.label}{a.def && <span className="ml-2 text-[10px] font-bold text-brand-700">DEFAULT</span>}</p><p className="truncate text-xs text-ink-500">{a.text}</p></div><button aria-label="Remove" onClick={() => setF({ ...f, addresses: f.addresses.filter((x) => x.id !== a.id) })}><Trash2 size={16} className="text-ink-400" /></button></div>)}</div>
        <div className="mt-2 flex gap-2"><input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Add an address" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (addr.trim()) { setF({ ...f, addresses: [...f.addresses, { id: Date.now(), label: 'Other', text: addr.trim(), def: f.addresses.length === 0 }] }); setAddr('') } }}>Add</Button></div>
      </Section>
      <Section title="Preferences"><Card className="space-y-3"><div className="flex gap-3"><Select label="Language" value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })} options={['English', 'हिन्दी']} /><Select label="Currency" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} options={Object.keys(CUR)} /></div></Card></Section>
      <Card className="!p-3.5"><div className="flex items-center gap-3"><ShieldCheck size={20} className="text-ink-400" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">ID verification</p><p className="text-xs text-ink-500">Needed for high-value contracts and escrow</p></div><PhaseTag p="P2" /></div></Card>
    </Screen>
  )
}

/* ================= VENDOR PUBLIC PROFILE EDITOR ================= */
export function VendorProfileEdit() {
  const nav = useNav()
  const v = useMyVendor()
  const { patchVendor, toast } = useApp()
  const [f, setF] = useState({ name: v?.name || '', tagline: v?.tagline || 'Trusted, licensed and reachable in-app', about: v?.about || 'Family-run business with a decade of verified work. We quote clearly, turn up on time and stand behind our workmanship.', kind: v?.kind || 'service', since: String(v?.since || 2016), team: v?.team || '11–50', caps: v?.caps || ['Residential', 'Commercial', 'Emergency call-outs'], markets: v?.markets || ['India'], certs: v?.certs || [{ n: 'ISO 9001:2015', exp: 'Mar 2028' }], website: v?.website || 'https://sharmaelectrical.example', langs: v?.langs || ['English', 'Hindi'], gallery: v?.gallery ?? 6, showPhone: false })
  const [cap, setCap] = useState('')
  const [cert, setCert] = useState('')
  if (!v) return <Screen title="Business profile"><EmptyState icon={Building2} title="No business profile yet" action={<Button onClick={() => nav.go('v_register')}>Start onboarding</Button>} /></Screen>
  const checks = [['Company story', f.about.length > 60], ['Tagline', !!f.tagline], ['3+ capabilities', f.caps.length >= 3], ['Certification', f.certs.length > 0], ['Gallery photos', f.gallery >= 3], ['Website', !!f.website], ['Verification tier 3+', v.tier >= 3], ['Service areas', v.areas.length > 0]]
  const pct = Math.round((checks.filter((x) => x[1]).length / checks.length) * 100)
  return (
    <Screen title="Public profile" subtitle="What customers see" right={<Button size="sm" variant="secondary" icon={Eye} className="mr-2" onClick={() => nav.go('c_vendor', { id: v.id })}>Preview</Button>} footer={<Button full size="lg" onClick={() => { patchVendor(v.id, { name: f.name, tagline: f.tagline, about: f.about, kind: f.kind, since: +f.since, team: f.team, caps: f.caps, markets: f.markets, certs: f.certs, website: f.website, langs: f.langs, gallery: f.gallery }); toast('Public profile saved'); nav.back() }}>Save profile</Button>}>
      <Completeness pct={pct} items={checks.map(([label, ok]) => ({ label: `Add: ${label}`, ok }))} />
      <div className="flex items-center gap-3"><Thumb tone={v.tone} icon={Building2} size={64} /><div className="min-w-0 flex-1"><TierBadge tier={v.tier} /><p className="mt-1 text-xs text-ink-500">Trust score {trustScore(v)}/100 — raise it with verification, reviews and fast replies.</p></div></div>
      <Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input label="Tagline" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
      <Input label="About your business" textarea rows={4} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">What kind of vendor are you?</p><Chips scroll={false} value={f.kind} onChange={(k) => setF({ ...f, kind: k })} options={Object.entries(KIND_LABEL).map(([id, label]) => ({ id, label }))} /></div>
      <div className="flex gap-3"><Select label="Established" value={f.since} onChange={(e) => setF({ ...f, since: e.target.value })} options={Array.from({ length: 40 }, (_, i) => String(2026 - i))} /><Select label="Team size" value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} options={['1–10', '11–50', '51–200', '201–1,000', '1,000+']} /></div>
      <Section title="Capabilities">
        <div className="mb-2 flex flex-wrap gap-2">{f.caps.map((c) => <span key={c} className="flex items-center gap-1.5 rounded-full bg-ink-900 py-1.5 pl-3 pr-2 text-xs font-semibold text-white">{c}<button aria-label={`Remove ${c}`} onClick={() => setF({ ...f, caps: f.caps.filter((x) => x !== c) })}><X size={13} /></button></span>)}</div>
        <div className="flex gap-2"><input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="e.g. 24×7 emergency" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200" /><Button variant="soft" onClick={() => { if (cap.trim()) { setF({ ...f, caps: [...f.caps, cap.trim()] }); setCap('') } }}>Add</Button></div>
      </Section>
      <Section title="Certifications">
        <div className="space-y-2">{f.certs.map((c) => <div key={c.n} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><Award size={18} className="text-amber-500" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.n}</p><p className="text-xs text-ink-500">Valid till {c.exp} · shown as “self-declared” until a reviewer verifies it</p></div><button aria-label="Remove" onClick={() => setF({ ...f, certs: f.certs.filter((x) => x.n !== c.n) })}><Trash2 size={16} className="text-ink-400" /></button></div>)}</div>
        <div className="mt-2 flex gap-2"><input value={cert} onChange={(e) => setCert(e.target.value)} placeholder="e.g. CE, ISO 14001, FSSAI" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200" /><Button variant="soft" onClick={() => { if (cert.trim()) { setF({ ...f, certs: [...f.certs, { n: cert.trim(), exp: 'Dec 2027' }] }); setCert('') } }}>Add</Button></div>
      </Section>
      <Section title="Markets you serve"><Chips scroll={false} multi value={f.markets} onChange={(m) => setF({ ...f, markets: m })} options={['India', 'Middle East', 'South-East Asia', 'Europe', 'North America', 'Worldwide']} /><p className="mt-1.5 text-xs text-ink-500">Cross-border selling (incoterms, export documents) is a Phase 2 capability.</p></Section>
      <Section title="Gallery & catalogue"><div className="flex flex-wrap gap-2">{Array.from({ length: f.gallery }).map((_, i) => <div key={i} className="grid size-16 place-items-center rounded-xl bg-gradient-to-br from-ink-200 to-ink-300 text-ink-500"><ImagePlus size={18} /></div>)}<button onClick={() => setF({ ...f, gallery: f.gallery + 1 })} className="grid size-16 place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400"><Plus size={20} /></button></div><Button className="mt-3" size="sm" variant="secondary" icon={FileText} onClick={() => toast('Brochure / catalogue PDF uploaded (scanned)')}>Upload catalogue (PDF)</Button></Section>
      <Input label="Website" icon={Globe} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Languages</p><Chips scroll={false} multi value={f.langs} onChange={(l) => setF({ ...f, langs: l })} options={['English', 'Hindi', 'Arabic', 'Spanish', 'French', 'German', 'Chinese']} /></div>
      <Card><Toggle label="Show phone number" desc="Off by default. Contact is shared only through a controlled flow in chat." on={f.showPhone} onChange={(v2) => setF({ ...f, showPhone: v2 })} /></Card>
    </Screen>
  )
}

import { useMemo, useState } from 'react'
import {
  MapPin, ChevronDown, Search, SlidersHorizontal, MessageCircle, GitCompare, Clock, Store, ChevronRight, Home as HomeIcon, ArrowRight, Share2, Check,
  Lock, FileText, Heart, ShieldCheck, CalendarCheck, Flag, Locate, BellRing, WifiOff, RefreshCw, Languages, Hourglass, Image as ImageIcon, BadgeCheck, CircleAlert, Crosshair, Star, Wrench,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, liveCats, cat, listing as findListing, serves, CITIES, CANCEL_POLICY, AVAIL_LABEL, MODE_LABEL, MY_LOC } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Input, Select, Toggle, Rating, Banner, EmptyState, KV, cx, Pill, SearchBar, IconBtn,
  StatusBadge, ListRow, Group, GRAD, SOFT, Carousel, Avatar, Missing, Price, SponsoredTag, Countdown,
} from '../ui.jsx'
import { Logo } from './auth.jsx'
import { NotifBell, ListingCard, VendorRow, VerifiedBadge, useGate, useStartChat, Coverage, ModeChip, RatingOrNew } from './shared.jsx'
import { country, KIND_LABEL, publicRoleLabels, INDUSTRIES, BOOKING_TYPES, fmtC } from '../globaldata.jsx'
import { TrustCard } from './profiles.jsx'
import { PhaseTag, Badge } from '../ui.jsx'
import { Globe as GlobeIcon, Factory as FactoryIcon, Handshake, Zap, Building2 } from 'lucide-react'

/* ---------- organic ranking (spec §7.2): relevance + quality; subscription tier is NOT a signal ---------- */
function organicScore(l, vendor, q, loc) {
  let s = 0
  if (q) {
    const hay = (l.title + ' ' + l.sub + ' ' + cat(l.cat).name + ' ' + cat(l.cat).aliases.join(' ')).toLowerCase()
    q.toLowerCase().split(/\s+/).forEach((w) => { if (w && hay.includes(w)) s += 3 })
  }
  if (serves(l, loc)) s += 4
  if (vendor?.ver === 'approved') s += 2
  if (l.avail !== 'none') s += 1
  if (l.resp != null) s += Math.max(0, 2 - l.resp / 4)
  s += Math.min((l.jobs || 0) / 150, 2)
  // Bayesian-smoothed rating so new vendors with little history are not penalised
  const n = l.reviews || 0
  s += (((l.rating || 4.2) * n + 4.2 * 8) / (n + 8) - 3.5) * 2
  return s
}

/* ================= HOME ================= */
export function CustomerHome() {
  const nav = useNav()
  const { t, lang, me, vendors, listings, threads, loc, bookings, published, vendor, notifs, geo } = useApp()
  const live = listings.filter(published)
  const near = vendors.filter((v) => v.ver === 'approved' && live.some((l) => l.vendorId === v.id && serves(l, loc))).slice(0, 6)
  const sponsored = live.filter((l) => l.sponsored && serves(l, loc)).slice(0, 1)
  const popular = live.filter((l) => !l.sponsored && serves(l, loc)).sort((a, b) => organicScore(b, vendor(b.vendorId), '', loc) - organicScore(a, vendor(a.vendorId), '', loc)).slice(0, 3)
  const mine = bookings.filter((b) => b.customer === me.name)
  const attention = mine.filter((b) => b.state === 'requested' || b.state === 'awaiting')
  const conflict = mine.filter((b) => b.state === 'confirmed' && mine.some((o) => o.id !== b.id && o.req === b.req && o.state === 'confirmed'))
  const first = (me.name || 'there').split(' ')[0]
  const unreadAlerts = (notifs.customer || []).filter((n) => n.type === 'saved' && !n.read)
  return (
    <Screen headerless pad={false}>
      <div className="bg-gradient-to-b from-brand-700 to-brand-600 px-4 pb-16 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} light />
            <span className="text-[16px] font-extrabold tracking-tight text-white">VendorVerse</span>
          </div>
          <div className="flex items-center gap-2">
            <IconBtn label="Favorites" onClick={() => nav.go('c_saved')} className="!size-11 bg-white ring-1 ring-ink-200"><Heart size={20} /></IconBtn>
            <div className="rounded-full bg-white ring-1 ring-ink-200"><NotifBell role="customer" /></div>
          </div>
        </div>
        <button onClick={() => nav.go('c_location')} className="mt-4 flex items-center gap-1.5 text-[13.5px] font-semibold text-white/80">
          <MapPin size={15} className="text-white" />{loc.city} · {loc.pin}<ChevronDown size={14} />
        </button>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight text-white">{t('hello')}{me.guest ? '' : `, ${first}`} 👋</h1>
        <div className="mt-3"><SearchBar placeholder={t('searchPh')} onClick={() => nav.go('c_explore')} /></div>
      </div>

      <div className="-mt-11 space-y-5 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => nav.go('c_explore', { kind: 'service' })} className="flex min-h-[132px] flex-col items-start rounded-2xl bg-white p-3.5 text-left shadow-[0_6px_20px_rgba(20,40,75,0.14)] ring-1 ring-ink-100 active:scale-[0.98]">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Wrench size={20} /></span>
            <span className="mt-3 text-[16px] font-extrabold leading-tight text-ink-900">Hire a service</span>
            <span className="mt-1 text-[12px] leading-snug text-ink-500">Book trusted pros, instantly or on a schedule</span>
          </button>
          <button onClick={() => nav.go('c_rfq_new')} className="flex min-h-[132px] flex-col items-start rounded-2xl bg-white p-3.5 text-left shadow-[0_6px_20px_rgba(20,40,75,0.14)] ring-1 ring-ink-100 active:scale-[0.98]">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileText size={20} /></span>
            <span className="mt-3 text-[16px] font-extrabold leading-tight text-ink-900">Get free quotes</span>
            <span className="mt-1 text-[12px] leading-snug text-ink-500">Tell us once, get matched quotations</span>
          </button>
        </div>

        <Group>
          <ListRow icon={FileText} tone="brand" title="My Quotes" onClick={() => nav.go('c_activity', { tab: 'rfqs' })} />
          <ListRow icon={CalendarCheck} tone="ink" title="My Bookings" onClick={() => nav.go('c_activity', { tab: 'bookings' })} />
          <ListRow icon={FactoryIcon} tone="brand" title="Source goods" subtitle="Suppliers & manufacturers" onClick={() => nav.go('c_explore', { kind: 'manufacturer' })} />
          <ListRow icon={Building2} tone="brand" title="Buy from companies" subtitle="Verified companies — order products directly" onClick={() => nav.go('c_companies')} last />
        </Group>

        {!me.guest && (conflict.length > 0 || attention.length > 0 || unreadAlerts.length > 0) && (
          <Section title="Needs your attention">
            <Group>
              {conflict.length > 0 && <ListRow icon={CircleAlert} tone="rose" title="Two vendors confirmed the same job" subtitle="Choose which booking to keep — nothing is cancelled automatically" onClick={() => nav.go('c_conflict', { req: conflict[0].req })} />}
              {attention.map((b) => <ListRow key={b.id} icon={b.state === 'requested' ? Hourglass : CalendarCheck} tone={b.state === 'requested' ? 'sky' : 'amber'} title={b.state === 'requested' ? `Waiting for ${vendor(b.vendorId)?.name}` : `Confirm completion · ${b.id}`} subtitle={b.state === 'requested' ? `Vendor has until ${b.due} to respond` : `${b.leftDays} days left to confirm or report an issue`} onClick={() => nav.go('c_booking', { id: b.id })} />)}
              {unreadAlerts.map((n) => <ListRow key={n.id} icon={BellRing} tone="teal" title={n.title} subtitle={n.body} onClick={() => nav.go('c_saved')} />)}
            </Group>
          </Section>
        )}

        <Section title={t('categories')} action={t('seeAll')} onAction={() => nav.go('c_categories')}>
          <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
            {liveCats().map((c) => (
              <button key={c.id} onClick={() => nav.go('c_category', { id: c.id })} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 active:scale-95">
                <Thumb tone={c.tone} icon={c.icon} size={56} />
                <span className="line-clamp-2 w-full text-balance text-center text-[11.5px] font-semibold leading-tight text-ink-700 [overflow-wrap:normal] [word-break:normal]">{lang === 'hi' ? c.hi : c.name.replace(' services', '').replace('Wholesale & industrial', 'Wholesale').replace('Health, education & wellness', 'Wellness').replace('Agriculture, energy & specialized', 'Agri & energy')}</span>
              </button>
            ))}
          </div>
        </Section>

        <div className="overflow-hidden rounded-3xl shadow-[0_12px_28px_-14px_rgba(20,40,75,0.45)]">
          <Carousel auto={5000}>
            {[
              ['from-ink-900 to-ink-700', FileText, 'text-amber-300', t('rfqTitle'), t('rfqBody'), t('rfqCta'), () => nav.go('c_rfq_new')],
              ['from-brand-700 to-brand-500', ShieldCheck, 'text-white', 'Verified means checked', 'A Verified badge only appears after our reviewers approve the documents. A paid plan never buys it.', 'Browse verified', () => nav.go('c_explore', { verified: true })],
              ['from-ink-800 to-brand-700', CalendarCheck, 'text-amber-200', 'Book with a clear policy', 'See cancellation rules and the vendor’s response deadline before you send a request.', 'My bookings', () => nav.go('c_activity', { tab: 'bookings' })],
            ].map(([g, I, ic, h, b, cta, fn]) => (
              <div key={h} className={cx('relative h-[168px] overflow-hidden bg-gradient-to-br p-5 pb-9 text-white', g)}>
                <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-12 right-10 size-32 rounded-full bg-black/10" />
                <I size={26} className={ic} />
                <h3 className="mt-2.5 text-[19px] font-extrabold leading-tight">{h}</h3>
                <p className="mt-1 max-w-[17rem] text-[13px] leading-snug text-white/80">{b}</p>
                <button onClick={fn} className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-ink-900 active:scale-95">{cta}<ArrowRight size={13} /></button>
              </div>
            ))}
          </Carousel>
        </div>

        <Section title={t('featured')} action={t('seeAll')} onAction={() => nav.go('c_explore', { mode: 'vendors', verified: true })}>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {near.map((v) => (
              <Card key={v.id} onClick={() => nav.go('c_vendor', { id: v.id })} pad={false} className="w-56 shrink-0 overflow-hidden">
                <div className={cx('relative h-20 bg-gradient-to-br', GRAD[v.tone])}>
                  <div className="absolute -right-4 -top-6 size-24 rounded-full bg-white/20" />
                  {v.rating > 0 && <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-ink-800"><Star size={11} className="fill-amber-400 text-amber-400" />{v.rating.toFixed(1)}</span>}
                </div>
                <div className="-mt-6 px-3.5 pb-3.5">
                  <div className="w-fit rounded-2xl bg-white p-1 shadow"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={44} round="rounded-xl" /></div>
                  <p className="mt-2 truncate text-sm font-bold">{v.name}</p>
                  <p className="truncate text-xs text-ink-500">{cat(v.cat).name} · {v.city}</p>
                  <div className="mt-2.5 flex items-center justify-between"><VerifiedBadge id={v.id} compact />{v.resp && <span className="text-[11px] font-semibold text-ink-500">replies ~{v.resp}</span>}</div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Suppliers & manufacturers" action={t('seeAll')} onAction={() => nav.go('c_explore', { kind: 'manufacturer' })}>
          <div className="space-y-2.5">{live.filter((l) => ['manufacturer', 'supplier'].includes(vendor(l.vendorId)?.kind) && (l.scope === 'global' || serves(l, loc))).slice(0, 3).map((l) => <ListingCard key={l.id} l={l} />)}</div>
          <p className="mt-2 text-[11px] text-ink-400">Worldwide sellers appear in every city. Cross-border terms (incoterms, export documents) arrive in Phase 2.</p>
        </Section>

        <Section title="Popular in your area">
          <div className="space-y-2.5">
            {sponsored.map((l) => <ListingCard key={l.id} l={l} />)}
            {popular.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
          <p className="mt-2 text-[11px] text-ink-400">Organic order uses relevance, area match, verification, responsiveness and reviews. Sponsored placements are labelled and pass the same checks.</p>
        </Section>

        <Card className="!p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-extrabold">Launching city by city</p><button onClick={() => nav.go('vision')} className="text-xs font-bold text-brand-700">Roadmap →</button></div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">{geo.flatMap((c) => c.states.flatMap((s) => s.cities.map((x) => ({ ...x, f: c.flag })))).filter((x) => x.s === 'live').map((x) => <Badge key={x.n} tone="green">{x.f} {x.n}</Badge>)}{geo.flatMap((c) => c.states.flatMap((s) => s.cities.map((x) => ({ ...x, f: c.flag })))).filter((x) => x.s !== 'live').slice(0, 4).map((x) => <Badge key={x.n} tone="gray">{x.f} {x.n} · soon</Badge>)}</div>
          <Button full size="sm" variant="secondary" className="mt-3" onClick={() => nav.go('c_categories')}>Browse all {INDUSTRIES.length} industries</Button>
        </Card>
      </div>
    </Screen>
  )
}

/* ================= LOCATION ================= */
export function Location() {
  const nav = useNav()
  const { loc, setLoc, toast } = useApp()
  const [city, setCity] = useState(loc.city)
  const [pin, setPin] = useState(loc.pin)
  const err = pin && !/^[1-9]\d{5}$/.test(pin) ? 'Enter a valid 6-digit pincode' : ''
  return (
    <Screen title="Your location" footer={<Button full size="lg" disabled={!!err || !pin} onClick={() => { setLoc({ city, pin }); toast(`Showing vendors that serve ${pin}`); nav.back() }}>Apply</Button>}>
      <Banner tone="blue">Search shows only vendors whose configured service coverage includes your area. We never imply a vendor serves all of India.</Banner>
      <Button full variant="secondary" icon={Crosshair} onClick={() => { setCity(MY_LOC.city); setPin(MY_LOC.pin); toast('Location permission granted — Jaipur 302021') }}>Use current location</Button>
      <Select label="City" value={city} onChange={(e) => setCity(e.target.value)} options={CITIES} />
      <Input label="Pincode" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} error={err} hint="Used for hyperlocal matching" />
      <p className="text-xs text-ink-500">Only a small set of cities has launch supply today. Other cities may show no vendors yet — you can ask to be notified.</p>
    </Screen>
  )
}

/* ================= CATEGORIES ================= */
export function Categories() {
  const nav = useNav()
  const { lang } = useApp()
  const [letter, setLetter] = useState('All')
  const label = (c) => (lang === 'hi' ? c.hi : c.name)
  const sorted = useMemo(() => [...liveCats()].sort((a, b) => a.name.localeCompare(b.name)), [])
  const have = new Set(sorted.map((c) => c.name[0].toUpperCase()))
  const list = letter === 'All' ? sorted : sorted.filter((c) => c.name[0].toUpperCase() === letter)
  return (
    <Screen title="All categories">
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setLetter('All')} className={cx('h-8 rounded-lg px-2.5 text-xs font-bold', letter === 'All' ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200')}>All</button>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
          <button key={l} disabled={!have.has(l)} onClick={() => setLetter(letter === l ? 'All' : l)} className={cx('h-8 w-8 rounded-lg text-xs font-bold', letter === l ? 'bg-brand-600 text-white' : have.has(l) ? 'bg-white text-ink-700 ring-1 ring-ink-200' : 'text-ink-300')}>{l}</button>
        ))}
      </div>
      {list.map((c) => (
        <Card key={c.id} onClick={() => nav.go('c_category', { id: c.id })}>
          <div className="flex items-center gap-3">
            <Thumb tone={c.tone} icon={c.icon} size={52} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{label(c)}</p>
              <p className="mt-0.5 text-xs text-ink-500">{MODE_LABEL[c.mode]}</p>
            </div>
            <ChevronRight size={18} className="text-ink-300" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{c.subs.map((s) => <Pill key={s}>{s}</Pill>)}</div>
        </Card>
      ))}
    </Screen>
  )
}

export function Category({ params }) {
  const nav = useNav()
  const { listings, vendors, published, loc } = useApp()
  const c = cat(params.id || 'home')
  const [sub, setSub] = useState('All')
  const items = listings.filter((l) => l.cat === c.id && published(l) && serves(l, loc) && (sub === 'All' || l.sub === sub))
  const vs = vendors.filter((v) => items.some((l) => l.vendorId === v.id))
  return (
    <Screen title={c.name} subtitle={`${loc.city} · ${loc.pin}`} right={<IconBtn label="Search" onClick={() => nav.go('c_explore', { cat: c.id })}><Search size={20} /></IconBtn>}>
      <div className={cx('relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white', GRAD[c.tone])}>
        <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/20" />
        <c.icon size={30} />
        <p className="mt-2 text-lg font-extrabold">{c.name}</p>
        <p className="text-[13px] text-white/85">{items.length} eligible listings · {vs.length} vendors serve your area</p>
      </div>
      <Card>
        <p className="mb-2 text-sm font-bold">How it works here</p>
        <KV rows={[['Customer action', MODE_LABEL[c.mode]], ['Vendor response window', c.mode === 'rfq' ? 'Per RFQ deadline' : `${c.respHrs} hours`], ['Availability', AVAIL_LABEL[c.avail]], ['Verification', c.verifyReq ? c.docs.join(', ') : 'Not required for this category']]} />
        <p className="mt-2 text-[11px] text-ink-400">Category rules are configuration (v{c.ver.slice(1)}), so they can change without an app update. Bookings keep the terms they were made under.</p>
      </Card>
      <Chips value={sub} onChange={setSub} options={['All', ...c.subs]} />
      <div className="space-y-2.5">
        {items.map((l) => <ListingCard key={l.id} l={l} />)}
        {items.length === 0 && <EmptyState icon={Store} title="No eligible vendor serves your area yet" body="We only list vendors whose coverage includes your location." action={<div className="flex gap-2"><Button size="sm" onClick={() => nav.go('c_rfq_new', { cat: c.id })}>Request quotation</Button><Button size="sm" variant="secondary" onClick={() => nav.go('c_location')}>Change area</Button></div>} />}
      </div>
    </Screen>
  )
}

/* ================= EXPLORE / SEARCH ================= */
const DEFAULT_F = { min: '', max: '', verified: false, availListed: false, lang: 'Any', rating: 0, mode: 'any', sort: 'relevance' }
const PAGE = 5
export function Explore({ params = {} }) {
  const nav = useNav()
  const { listings, vendors, published, vendor, loc, toast } = useApp()
  const [q, setQ] = useState(params.q || '')
  const [view, setView] = useState(params.mode || 'listings')
  const [c, setC] = useState(params.cat || 'all')
  const [kind, setKind] = useState(params.kind || 'all')
  const [sub, setSub] = useState('All')
  const [f, setF] = useState({ ...DEFAULT_F, verified: !!params.verified })
  const [draft, setDraft] = useState(DEFAULT_F)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(PAGE)
  const [broad, setBroad] = useState(false)
  const [err, setErr] = useState(params.state === 'error')
  const [watch, setWatch] = useState(false)
  const applied = [f.min || f.max, f.verified, f.availListed, f.lang !== 'Any', f.rating > 0, f.mode !== 'any', f.sort !== 'relevance'].filter(Boolean).length

  const base = useMemo(() => {
    let r = listings.filter(published)          // drafts, rejected, hidden, expired, restricted never reach search
    if (c !== 'all') r = r.filter((l) => l.cat === c)
    if (c !== 'all' && sub !== 'All') r = r.filter((l) => l.sub === sub)
    if (kind !== 'all') r = r.filter((l) => vendor(l.vendorId)?.kind === kind)
    if (q) {
      const w = q.toLowerCase().trim()
      const pin = /^\d{6}$/.test(w)
      r = r.filter((l) => pin ? serves(l, { city: l.areas[0], pin: w }) || (l.pins ? l.pins.includes(w) : true) : (l.title + ' ' + l.sub + ' ' + cat(l.cat).name + ' ' + cat(l.cat).aliases.join(' ') + ' ' + (vendor(l.vendorId)?.name || '')).toLowerCase().includes(w))
    }
    if (f.min) r = r.filter((l) => l.priceMin != null && (l.priceMax ?? l.priceMin) >= +f.min)
    if (f.max) r = r.filter((l) => l.priceMin != null && l.priceMin <= +f.max)
    if (f.verified) r = r.filter((l) => vendor(l.vendorId)?.ver === 'approved')
    if (f.availListed) r = r.filter((l) => l.avail !== 'none')
    if (f.lang !== 'Any') r = r.filter((l) => vendor(l.vendorId)?.langs.includes(f.lang))
    if (f.rating) r = r.filter((l) => l.rating >= f.rating)
    if (f.mode !== 'any') r = r.filter((l) => cat(l.cat).mode === f.mode || cat(l.cat).mode === 'both')
    return r
  }, [listings, c, sub, kind, q, f, published, vendor])

  const inArea = base.filter((l) => serves(l, loc))
  const outside = base.filter((l) => !serves(l, loc))
  const sortFn = f.sort === 'low' ? (a, b) => (a.priceMin ?? Infinity) - (b.priceMin ?? Infinity) : f.sort === 'rating' ? (a, b) => b.rating - a.rating : f.sort === 'resp' ? (a, b) => (a.resp ?? 99) - (b.resp ?? 99) : (a, b) => organicScore(b, vendor(b.vendorId), q, loc) - organicScore(a, vendor(a.vendorId), q, loc)
  const organic = [...inArea].sort(sortFn)
  const items = f.sort === 'relevance' ? [...organic.filter((l) => l.sponsored), ...organic.filter((l) => !l.sponsored)] : organic
  const vs = useMemo(() => {
    const ids = [...new Set(items.map((l) => l.vendorId))]
    return ids.map((id) => vendor(id)).filter(Boolean)
  }, [items])
  const list = view === 'vendors' ? vs : items
  const count = list.length

  return (
    <Screen
      title="Explore"
      back={false}
      pad={false}
      overlay={
        <Sheet open={open} onClose={() => setOpen(false)} title="Filters" footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setDraft(DEFAULT_F)}>Reset</Button><Button className="flex-[2]" onClick={() => { setF(draft); setShown(PAGE); setOpen(false) }}>Show results</Button></div>}>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Price (₹)</p>
            <div className="flex gap-3"><Input placeholder="Min" inputMode="numeric" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/\D/g, '') })} /><Input placeholder="Max" inputMode="numeric" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value.replace(/\D/g, '') })} /></div>
            <p className="mt-1.5 text-xs text-ink-500">Listings without a price are left out when a price filter is set — we never guess prices.</p>
          </div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Minimum rating</p><Chips scroll={false} value={draft.rating} onChange={(v) => setDraft({ ...draft, rating: v })} options={[{ id: 0, label: 'Any' }, { id: 4, label: '4.0+' }, { id: 4.5, label: '4.5+' }, { id: 4.8, label: '4.8+' }]} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Vendor language</p><Chips scroll={false} value={draft.lang} onChange={(v) => setDraft({ ...draft, lang: v })} options={['Any', 'English', 'Hindi']} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">How you want to proceed</p><Chips scroll={false} value={draft.mode} onChange={(v) => setDraft({ ...draft, mode: v })} options={[{ id: 'any', label: 'Any' }, { id: 'booking', label: 'Book a service' }, { id: 'rfq', label: 'Request a quote' }]} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Sort by</p><Chips scroll={false} value={draft.sort} onChange={(v) => setDraft({ ...draft, sort: v })} options={[{ id: 'relevance', label: 'Relevance' }, { id: 'rating', label: 'Rating' }, { id: 'resp', label: 'Fastest reply' }, { id: 'low', label: 'Price: low to high' }]} /></div>
          <Toggle label="Verified vendors only" desc="Approved by VendorVerse reviewers" on={draft.verified} onChange={(v) => setDraft({ ...draft, verified: v })} />
          <Toggle label="Availability listed" desc="Hide vendors who have not listed availability" on={draft.availListed} onChange={(v) => setDraft({ ...draft, availListed: v })} />
        </Sheet>
      }
    >
      <div className="space-y-3 bg-white px-4 pb-3 pt-3 shadow-sm">
        <SearchBar value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }} placeholder="Search services, vendors or a pincode" right={
          <button onClick={() => { setDraft(f); setOpen(true) }} className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-white" aria-label="Filters">
            <SlidersHorizontal size={19} />
            {applied > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold ring-2 ring-white">{applied}</span>}
          </button>
        } />
        <button onClick={() => nav.go('c_location')} className="flex items-center gap-1.5 text-xs font-bold text-brand-700">{country(loc.country).flag} Serving {loc.city} {loc.pin}<ChevronDown size={13} /></button>
        <Segmented value={view} onChange={setView} options={[{ id: 'listings', label: 'Listings' }, { id: 'vendors', label: 'Vendors' }]} />
        <Chips value={kind} onChange={(k) => { setKind(k); setShown(PAGE) }} options={[{ id: 'all', label: 'All vendor types' }, ...Object.entries(KIND_LABEL).map(([id, label]) => ({ id, label }))]} />
        <Chips value={c} onChange={(v) => { setC(v); setSub('All'); setShown(PAGE) }} options={[{ id: 'all', label: 'All categories' }, ...liveCats().map((x) => ({ id: x.id, label: x.name }))]} />
        {c !== 'all' && <Chips value={sub} onChange={(v) => { setSub(v); setShown(PAGE) }} options={['All', ...cat(c).subs]} />}
      </div>

      <div className="space-y-4 p-4">
        {err ? (
          <EmptyState icon={WifiOff} title="Couldn’t load results" body="Check your connection and try again. Your search and filters are kept." action={<Button size="sm" icon={RefreshCw} onClick={() => { setErr(false); toast('Back online') }}>Retry</Button>} />
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>{count} result{count === 1 ? '' : 's'}{q && <> for “<b className="text-ink-800">{q}</b>”</>} in your area</span>
              {(applied > 0 || c !== 'all' || q) && <button className="font-bold text-brand-700" onClick={() => { setF(DEFAULT_F); setC('all'); setKind('all'); setSub('All'); setQ(''); setShown(PAGE); setBroad(false) }}>Reset filters</button>}
            </div>
            {view === 'listings' && items.slice(0, shown).map((l) => <ListingCard key={l.id} l={l} />)}
            {view === 'vendors' && vs.slice(0, shown).map((v) => <VendorRow key={v.id} v={v} />)}
            {count > shown && <Button full variant="secondary" onClick={() => setShown(shown + PAGE)}>Load more ({count - shown} left)</Button>}

            {count === 0 && (
              <div className="space-y-3">
                <EmptyState icon={Search} title="No suitable vendor found" body={`We couldn’t find an eligible vendor for ${c !== 'all' ? cat(c).name : 'this search'} that serves ${loc.city} ${loc.pin} with your filters.`} />
                <Card className="space-y-2">
                  <p className="text-sm font-bold">Try one of these</p>
                  <ListRow icon={MapPin} title="Broaden the area" subtitle="Show vendors outside your area — clearly labelled" onClick={() => setBroad(true)} />
                  <ListRow icon={SlidersHorizontal} tone="violet" title="Remove restrictive filters" onClick={() => { setF(DEFAULT_F); setC('all') }} />
                  <ListRow icon={FileText} tone="amber" title="Send a requirement as an RFQ" subtitle="Eligible vendors can respond when they serve you" onClick={() => nav.go('c_rfq_new', { cat: c !== 'all' ? c : undefined })} />
                  <ListRow icon={BellRing} tone="teal" title={watch ? 'We will notify you' : 'Notify me when a vendor becomes available'} subtitle={watch ? `Alert saved for ${loc.pin}` : 'Get one alert when supply appears'} onClick={() => { setWatch(true); toast('You will be notified') }} last />
                </Card>
              </div>
            )}

            {(broad || (count === 0 && false)) && outside.length > 0 && (
              <div className="space-y-2.5">
                <Banner tone="amber" title="Outside your area">These vendors do <b>not</b> list {loc.city} {loc.pin} in their coverage. They may not travel to you — confirm in chat first.</Banner>
                {outside.slice(0, 4).map((l) => <ListingCard key={l.id} l={l} outside />)}
              </div>
            )}
            {!broad && count > 0 && outside.length > 0 && <button onClick={() => setBroad(true)} className="w-full py-1 text-center text-xs font-bold text-brand-700">Also show {outside.length} listings outside my area</button>}
            {broad && count > 0 && outside.length > 0 && (
              <div className="space-y-2.5"><Banner tone="amber" title="Outside your area">Labelled so you can tell. They don’t list {loc.pin} in their coverage.</Banner>{outside.slice(0, 3).map((l) => <ListingCard key={l.id} l={l} outside />)}</div>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}

/* ================= LISTING DETAIL ================= */
export function ListingDetail({ params }) {
  const nav = useNav()
  const gate = useGate()
  const { listings, vendor, compare, toggleCompare, reviews, toast, loc, published, saved, toggleSaved, me } = useApp()
  const start = useStartChat()
  const l = findListing(params.id || 'l1', listings)
  const v = vendor(l.vendorId)
  const c = cat(l.cat)
  const live = published(l)
  const ok = serves(l, loc)
  const inCmp = compare.includes(l.id)
  const rv = reviews.filter((r) => r.target === l.vendorId && r.status === 'published').slice(0, 2)
  const canBook = c.mode !== 'rfq'
  const canRfq = c.mode !== 'booking'
  const enquire = () => start(l.vendorId, l.id)
  const availTxt = { slots: 'Time slots — you pick one when you request', capacity: 'Daily capacity — vendor confirms the date', lead: 'Typical lead time — vendor confirms', none: null }[l.avail]
  return (
    <Screen
      title=""
      pad={false}
      right={<><IconBtn label="Save vendor" onClick={() => { toggleSaved(l.vendorId); toast(saved.includes(l.vendorId) ? 'Removed from favorites' : 'Saved — the vendor is not notified') }}><Heart size={21} className={saved.includes(l.vendorId) ? 'fill-rose-500 text-rose-500' : ''} /></IconBtn><IconBtn label="Share" onClick={() => toast('Link copied')}><Share2 size={20} /></IconBtn></>}
      footer={
        <div className="space-y-2">
          {!ok && live && <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700"><MapPin size={13} />This vendor does not list {loc.pin} in its service area.</p>}
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" icon={MessageCircle} onClick={enquire} aria-label="Message vendor" />
            {canBook && l.instant && <Button disabled={!live || !ok} className="flex-1" size="lg" icon={Zap} onClick={() => gate('Log in to book') && nav.go('c_book_new', { id: l.id, mode: 'instant' })}>Book now</Button>}
            {canBook && <Button disabled={!live || !ok} variant={l.instant ? 'secondary' : 'primary'} className="flex-1" size="lg" icon={CalendarCheck} onClick={() => gate('Log in to request a booking') && nav.go('c_book_new', { id: l.id, mode: 'scheduled' })}>{l.instant ? 'Schedule' : 'Request booking'}</Button>}
            {canRfq && <Button disabled={!live || !ok} variant={canBook ? 'secondary' : 'primary'} className="flex-1" size="lg" icon={FileText} onClick={() => gate('Log in to request a quote') && nav.go('c_rfq_new', { cat: l.cat, vendorId: l.vendorId, title: l.title })}>Request quote</Button>}
          </div>
        </div>
      }
    >
      {l.portfolio > 0 ? (
        <Carousel counter dotsClass="bottom-7">
          {Array.from({ length: Math.min(l.portfolio, 3) }).map((_, k) => (
            <div key={k} className={cx('relative grid h-52 place-items-center overflow-hidden bg-gradient-to-br text-white', GRAD[l.tone])} style={k ? { filter: `hue-rotate(${k * 18}deg)` } : undefined}>
              <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/20" /><div className="absolute -bottom-12 -left-8 size-48 rounded-full bg-black/10" />
              <c.icon size={84} strokeWidth={1.3} className="relative drop-shadow-lg" />
              <span className="absolute bottom-8 left-4 rounded-full bg-black/35 px-3 py-1 text-xs font-bold backdrop-blur">Vendor’s portfolio · {k + 1} of {l.portfolio}</span>
            </div>
          ))}
        </Carousel>
      ) : (
        <div className={cx('relative grid h-40 place-items-center overflow-hidden bg-gradient-to-br text-white/90', GRAD[l.tone])}>
          <c.icon size={64} strokeWidth={1.3} /><span className="absolute bottom-6 left-4 flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1 text-xs font-bold backdrop-blur"><ImageIcon size={12} />No portfolio photos provided</span>
        </div>
      )}
      <div className="-mt-4 space-y-4 rounded-t-3xl bg-ink-50 p-4 pt-5">
        {!live && <Banner tone="amber" title="Not public"><span>This listing is hidden from customers because a publication check is not passed.</span>{me.role === 'vendor' && me.vendorId === l.vendorId && <button onClick={() => nav.go('v_listing_gate', { id: l.id })} className="mt-1 block font-bold underline">See which check is failing</button>}</Banner>}
        <div>
          <div className="flex flex-wrap items-center gap-1.5">{l.sponsored && <SponsoredTag />}<Pill>{c.name}</Pill><Pill>{l.sub}</Pill><ModeChip mode={c.mode} /></div>
          <h1 className="mt-2 text-xl font-extrabold leading-snug tracking-tight">{l.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3"><RatingOrNew value={l.rating} count={l.reviews} /><VerifiedBadge id={l.vendorId} /></div>
        </div>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Price</p>
          <div className="mt-1"><Price l={l} big /></div>
          {l.priceMin != null ? <p className="mt-1 text-xs text-ink-500">{l.basis}. Indicative — confirm the final price with the vendor.</p> : <p className="mt-1 text-xs text-ink-500">The vendor has not listed a price. Send an enquiry or request a quote — we won’t estimate one.</p>}
        </Card>

        <Card onClick={() => nav.go('c_vendor', { id: v.id })} className="!p-3.5">
          <div className="flex items-center gap-3">
            <Thumb tone={v.tone} icon={Store} size={46} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{v.name}</p><p className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} />{v.city}</p></div>
            <ChevronRight size={17} className="text-ink-300" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[['Replies', v.resp ? `~${v.resp}` : null], ['Experience', l.exp], ['Completed', v.jobs ? `${v.jobs} jobs` : null]].map(([k, val]) => (
              <div key={k} className="rounded-xl bg-ink-50 p-2"><p className="text-[11px] text-ink-400">{k}</p>{val ? <p className="text-[13px] font-bold">{val}</p> : <p className="text-[11px] italic text-ink-400">Not provided</p>}</div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-bold">Service area & availability</p>
          <div className={cx('flex items-start gap-2.5 rounded-xl p-3', ok ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900')}>
            {ok ? <Check size={18} className="mt-0.5 shrink-0" /> : <CircleAlert size={18} className="mt-0.5 shrink-0" />}
            <p className="text-[13px] leading-snug">{ok ? <>Serves <b>{loc.city} {loc.pin}</b>.</> : <>Does <b>not</b> serve {loc.city} {loc.pin}.</>} Coverage: {l.areas.join(', ')}{l.pins ? ` (pincodes ${l.pins.join(', ')})` : ''}.</p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Clock size={15} className="text-ink-400" />
            {availTxt ? <span className="text-ink-700">{availTxt}</span> : <Missing>Availability not listed</Missing>}
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-bold">Ways to work with this vendor</p>
          <div className="space-y-2">
            {[['instant', Zap, canBook && l.instant, () => nav.go('c_book_new', { id: l.id, mode: 'instant' })], ['scheduled', CalendarCheck, canBook, () => nav.go('c_book_new', { id: l.id, mode: 'scheduled' })], ['rfq', FileText, canRfq, () => nav.go('c_rfq_new', { cat: l.cat, vendorId: l.vendorId, title: l.title })], ['contract', Handshake, true, () => nav.go('c_contract_new', { listingId: l.id })]].map(([k, I, avail, fn]) => (
              <button key={k} disabled={!avail || !live} onClick={fn} className={cx('flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 ring-inset', avail ? 'bg-white ring-ink-200 active:bg-ink-50' : 'bg-ink-50 opacity-55 ring-ink-100')}>
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><I size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{BOOKING_TYPES[k].label}</span><span className="block text-[11px] leading-snug text-ink-500">{avail ? BOOKING_TYPES[k].desc : k === 'instant' ? 'Not offered — this vendor doesn’t keep a live schedule' : 'Not available for this category'}</span></span>
                <PhaseTag p={BOOKING_TYPES[k].phase} />
              </button>
            ))}
          </div>
        </Card>

        {l.trade && (
          <Card className="space-y-3">
            <p className="text-sm font-bold">Trade details</p>
            <KV rows={[['Origin', l.trade.origin], l.trade.moq ? ['MOQ', `${l.trade.moq.toLocaleString('en-IN')} ${l.trade.unit}`] : null, l.trade.leadDays ? ['Lead time', `${l.trade.leadDays} days`] : null, l.trade.capacity ? ['Capacity', l.trade.capacity] : null, l.trade.hs ? ['HS code', l.trade.hs] : null, l.trade.ports ? ['Ports', l.trade.ports] : null, l.trade.samples ? ['Samples', l.trade.samples] : null]} />
            {l.trade.tiers && (
              <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Volume pricing</p><div className="overflow-hidden rounded-xl ring-1 ring-inset ring-ink-200">{l.trade.tiers.map(([q, pr], i) => <div key={q} className={cx('flex justify-between px-3 py-2 text-sm', i % 2 === 0 && 'bg-ink-50')}><span className="text-ink-600">{q.toLocaleString('en-IN')}+ {l.trade.unit}</span><b>{fmtC(pr, l.cur)} / {l.unit}</b></div>)}</div></div>
            )}
            {l.trade.incoterms && <div><p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-400">Incoterms <PhaseTag p="P2" /></p><div className="flex flex-wrap gap-1.5">{l.trade.incoterms.map((x) => <Pill key={x}>{x}</Pill>)}</div></div>}
            {l.trade.certs && <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Certifications</p><div className="flex flex-wrap gap-1.5">{l.trade.certs.map((x) => <Badge key={x} tone="teal">{x}</Badge>)}</div></div>}
          </Card>
        )}

        <TrustCard v={v} />

        {(canBook) && (
          <Card>
            <p className="mb-1 text-sm font-bold">Before you request</p>
            <KV rows={[['Vendor responds within', `${c.respHrs} hours`], ['If unanswered', 'Request expires — nothing is charged']]} />
            <p className="mt-2 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-600"><b>Cancellation:</b> {CANCEL_POLICY[c.cancel]}</p>
            <p className="mt-2 text-xs text-ink-500">Payment is made directly to the vendor. VendorVerse does not collect service payments.</p>
          </Card>
        )}

        <Section title="Credentials">
          <Card>
            {v.docs.length === 0 ? <Missing>No credentials provided{c.verifyReq ? '' : ' — not required for this category'}</Missing> : v.docs.map((d) => <div key={d.name} className="flex items-center justify-between py-1.5 text-sm"><span className="text-ink-600">{d.name}</span><StatusBadge s={d.status} /></div>)}
            <p className="mt-2 text-[11px] text-ink-400">Verification comes only from reviewed documents — never from a paid plan.</p>
          </Card>
        </Section>

        <Section title="About this listing"><Card><p className="text-sm leading-relaxed text-ink-600">{l.desc}</p></Card></Section>
        <Section title="Specifications"><Card><KV rows={l.specs.map(([k, val]) => [k, val === '—' ? <Missing>Not provided</Missing> : val])} /></Card></Section>

        <div className="grid grid-cols-2 gap-2.5">
          <Button variant={inCmp ? 'soft' : 'secondary'} icon={inCmp ? Check : GitCompare} onClick={() => { toggleCompare(l.id); toast(inCmp ? 'Removed from compare' : compare.length >= 3 ? 'You can compare up to 3 vendors' : 'Added to compare') }}>{inCmp ? 'In compare' : 'Compare'}</Button>
          <Button variant="secondary" icon={Flag} onClick={() => gate('Log in to report') && nav.go('c_report', { type: 'listing', id: l.id, label: l.title })}>Report listing</Button>
        </div>
        {inCmp && compare.length > 1 && <Button full variant="soft" onClick={() => nav.go('c_saved', { tab: 'compare' })}>View comparison ({compare.length})</Button>}

        <Section title="Reviews" action={rv.length ? 'All' : undefined} onAction={() => nav.go('c_vendor', { id: v.id, tab: 'reviews' })}>
          {rv.length === 0 ? <Card><Missing>Not yet rated — reviews appear after real bookings or accepted quotes</Missing></Card> : <div className="space-y-2.5">{rv.map((r) => (
            <Card key={r.id}><div className="flex items-center justify-between"><p className="text-sm font-bold">{r.by}</p><Rating value={r.rating} /></div><p className="mt-1 text-[13px] text-ink-600">{r.text}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700"><BadgeCheck size={12} />Verified transaction · {r.via} · {r.at}</p></Card>
          ))}</div>}
        </Section>
      </div>
    </Screen>
  )
}

/* ================= VENDOR PROFILE (customer view) ================= */
export function VendorProfile({ params }) {
  const nav = useNav()
  const gate = useGate()
  const { vendors, listings, reviews, toggleSaved, saved, published, loc, toast } = useApp()
  const start = useStartChat()
  const v = vendors.find((x) => x.id === (params.id || 'v2'))
  const c = cat(v.cat)
  const [tab, setTab] = useState(params.tab || 'listings')
  const items = listings.filter((l) => l.vendorId === v.id && published(l))
  const rv = reviews.filter((r) => r.target === v.id && r.status === 'published')
  return (
    <Screen title="Vendor profile" pad={false} right={<IconBtn label="Favorite" onClick={() => { toggleSaved(v.id); toast(saved.includes(v.id) ? 'Removed from favorites' : 'Saved — the vendor is not notified') }}><Heart size={21} className={saved.includes(v.id) ? 'fill-rose-500 text-rose-500' : ''} /></IconBtn>}>
      <div className={cx('relative h-28 bg-gradient-to-br', GRAD[v.tone])}><div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/20" /></div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="rounded-2xl bg-white p-1 shadow w-fit"><Thumb tone={v.tone} icon={c.icon} size={72} /></div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{v.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><VerifiedBadge id={v.id} />{v.rating > 0 ? <Rating value={v.rating} count={v.reviews} size={14} /> : <Missing>Not yet rated</Missing>}</div>
          <p className="mt-2 flex items-center gap-1 text-sm text-ink-500"><MapPin size={14} />{v.city} · serves {v.areas.join(', ')}</p>
        </div>
        <p className="text-sm text-ink-600">{country(v.country).flag} {publicRoleLabels(v).join(' · ') || 'Roles pending verification'}{v.team ? ` · ${v.team} people` : ''}</p>
        {v.tagline && <p className="text-sm italic text-ink-600">“{v.tagline}”</p>}
        <TrustCard v={v} />
        {v.ver !== 'approved' && c.verifyReq && <Banner tone="amber" title="Not verified">{v.ver === 'expired' ? 'A required credential has expired. This vendor’s listings are hidden until it is renewed.' : 'This vendor has not completed verification, so it is not shown as Verified.'}</Banner>}
        <div className="grid grid-cols-3 gap-2">
          {[['Since', v.since], ['Replies', v.resp ? `~${v.resp}` : null], ['Completed', v.jobs || null]].map(([a, b]) => <Card key={a} className="!p-3 text-center"><p className="text-base font-extrabold">{b ?? <span className="text-xs font-medium italic text-ink-400">Not provided</span>}</p><p className="text-[11px] text-ink-500">{a}</p></Card>)}
        </div>
        <div className="flex gap-2.5"><Button className="flex-1" icon={MessageCircle} onClick={() => start(v.id)}>Message</Button><Button variant="secondary" className="flex-1" icon={Flag} onClick={() => gate('Log in to report') && nav.go('c_report', { type: 'vendor', id: v.id, label: v.name })}>Report</Button></div>
        <Segmented value={tab} onChange={setTab} options={[{ id: 'listings', label: 'Listings', count: items.length }, { id: 'reviews', label: 'Reviews', count: rv.length }, { id: 'about', label: 'About' }]} />
        {tab === 'listings' && <div className="space-y-2.5">{items.map((l) => <ListingCard key={l.id} l={l} showVendor={false} />)}{items.length === 0 && <EmptyState icon={Store} title="No public listings right now" body="This vendor has nothing eligible to show at the moment." />}</div>}
        {tab === 'reviews' && <div className="space-y-2.5">{rv.map((r) => <Card key={r.id}><div className="flex justify-between"><p className="text-sm font-bold">{r.by}</p><Rating value={r.rating} /></div><p className="mt-1 text-[13px] text-ink-600">{r.text}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700"><BadgeCheck size={12} />Verified transaction · {r.via}</p>{r.reply && <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600"><b>Vendor reply:</b> {r.reply}</p>}<p className="mt-1.5 text-[11px] text-ink-400">{r.at}</p></Card>)}{rv.length === 0 && <EmptyState icon={Star} title="Not yet rated" body="That doesn’t mean poor quality — reviews appear after real bookings or accepted quotes." />}</div>}
        {tab === 'about' && (
          <div className="space-y-3">
            <Card><KV rows={[['Category', c.name], ['Established', v.since], ['Branches', v.branches], ['Languages', v.langs.join(', ')], ['Service areas', v.areas.join(', ')], ['GSTIN', v.ver === 'approved' ? v.gstin : <Missing>Shown after verification</Missing>]]} /></Card>
            <Card><p className="mb-2 text-sm font-bold">Credentials</p>{v.docs.length === 0 ? <Missing>No credentials provided</Missing> : v.docs.map((d) => <div key={d.name} className="flex items-center justify-between py-1.5 text-sm"><span className="text-ink-600">{d.name}</span><StatusBadge s={d.status} /></div>)}</Card>
          </div>
        )}
      </div>
    </Screen>
  )
}

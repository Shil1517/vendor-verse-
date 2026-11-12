import { publicRoleLabels } from '../vendorRoles.js'
import { useMemo, useRef, useState } from 'react'
import {
  Phone, MapPin, ChevronDown, Search, SlidersHorizontal, Package, CalendarCheck, FileText, Heart, Star, Minus, Plus, ShieldCheck,
  MessageCircle, GitCompare, Truck, Clock, CreditCard, Smartphone, Landmark, Banknote, Lock, CheckCircle2, XCircle, Loader2,
  Store, ChevronRight, BadgeCheck, Home as HomeIcon, Briefcase, Receipt, ArrowRight, Share2, Check,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { findCity } from '../geo.js'
import { CATS, INDUSTRIES, cat, calcPrice, BUSY_SLOTS, SLOTS, listing as findListing } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Input, Select, Toggle, Badge, Rating, Banner, EmptyState,
  PriceBreakdown, KV, fmt, cx, Pill, SearchBar, IconBtn, StatusBadge, Stars, ListRow, Group, Meta, SOFT, GRAD, Carousel, Avatar,
} from '../ui.jsx'
import { NotifBell, ListingCard, VendorRow, VerifiedBadge, useGate, useStartChat, listingDisc } from './shared.jsx'

const visibleVendors = (vendors) => vendors.filter((v) => v.status === 'approved' || v.status === 'submitted')

/* ================= HOME ================= */
export function CustomerHome() {
  const nav = useNav()
  const { t, lang, me, vendors, listings, threads } = useApp()
  const top = vendors.filter((v) => v.status === 'approved' && v.rating >= 4.6).slice(0, 5)
  const popular = listings.filter((l) => l.status === 'approved').sort((a, b) => b.reviews - a.reviews).slice(0, 4)
  const unread = threads.customer.reduce((s, t) => s + t.unread, 0)
  const first = (me.name || 'there').split(' ')[0]
  return (
    <Screen headerless pad={false}>
      <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pb-6 pt-3 text-white">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 py-1.5 pl-2.5 pr-2 text-[13px] font-semibold">
            <MapPin size={15} />Jaipur, RJ<ChevronDown size={15} />
          </button>
          <div className="[&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:ring-brand-600"><NotifBell role="customer" /></div>
        </div>
        <p className="mt-4 text-sm text-white/80">{t('hello')}, {me.guest ? 'Guest' : first} 👋</p>
        <h1 className="mt-0.5 text-[24px] font-extrabold leading-tight tracking-tight">{t('whatNeed')}</h1>
        <div className="mt-4"><SearchBar placeholder={t('searchPh')} onClick={() => nav.go('c_explore')} /></div>
      </div>

      <div className="space-y-5 bg-ink-50 px-4 pb-6 pt-4">
        <div className="grid grid-cols-4 gap-2">
          {[[MessageCircle, 'Messages', 'amber', () => nav.go('messages')], [Store, 'Vendors', 'sky', () => nav.go('c_explore', { mode: 'vendors' })], [FileText, 'Quotes', 'violet', () => nav.go('c_activity')], [Heart, 'Saved', 'rose', () => nav.go('c_saved')]].map(([I, l, tone, fn]) => (
            <button key={l} onClick={fn} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 shadow-[0_1px_2px_rgba(20,40,75,0.06)] ring-1 ring-ink-100 active:scale-95">
              <span className={cx('grid size-10 place-items-center rounded-xl', SOFT[tone])}><I size={20} /></span>
              <span className="text-xs font-semibold">{l}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl shadow-[0_12px_28px_-14px_rgba(20,40,75,0.45)]">
          <Carousel auto={4500}>
            {[
              ['from-ink-900 to-ink-700', FileText, 'text-amber-300', t('rfqTitle'), t('rfqBody'), t('rfqCta'), () => nav.go('c_rfq_new')],
              ['from-brand-600 to-teal-500', ShieldCheck, 'text-white', 'Verified vendors only', 'Every vendor’s documents are checked by our team before they get the Verified badge.', 'Browse vendors', () => nav.go('c_explore', { mode: 'vendors' })],
              ['from-violet-600 to-indigo-500', MessageCircle, 'text-amber-200', 'Talk to vendors directly', 'Ask questions, share photos and agree the deal in chat — no middlemen.', 'Open messages', () => nav.go('messages')],
            ].map(([g, I, ic, h, b, cta, fn]) => (
              <div key={h} className={cx('vv-customer-promo relative h-[168px] overflow-hidden bg-gradient-to-br p-5 pb-9 text-white', g)}>
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

        {!me.guest && threads.customer.length > 0 && (
          <Section title="Continue chatting" action="All" onAction={() => nav.go('messages')}>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
              {threads.customer.slice(0, 6).map((th) => (
                <button key={th.id} onClick={() => nav.go('chat', { id: th.id })} className="flex w-16 shrink-0 flex-col items-center gap-1.5 active:scale-95">
                  <span className="relative">
                    <span className={cx('block rounded-full p-0.5', th.unread ? 'bg-gradient-to-br from-brand-500 to-amber-400' : 'bg-ink-200')}><span className="block rounded-full bg-white p-0.5"><Avatar name={th.name} size={50} /></span></span>
                    <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    {th.unread > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-ink-50">{th.unread}</span>}
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-semibold text-ink-700">{th.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title={t('categories')} action={t('seeAll')} onAction={() => nav.go('c_categories')}>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {CATS.map((c) => (
              <button key={c.id} onClick={() => nav.go('c_category', { id: c.id })} className="flex flex-col items-center gap-1.5 active:scale-95">
                <Thumb tone={c.tone} icon={c.icon} size={58} />
                <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight text-ink-700">{lang === 'hi' ? c.hi : c.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('featured')} action={t('seeAll')} onAction={() => nav.go('c_explore', { mode: 'vendors' })}>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {top.map((v) => (
              <Card key={v.id} onClick={() => nav.go('c_vendor', { id: v.id })} pad={false} className="w-56 shrink-0 overflow-hidden">
                <div className={cx('relative h-20 bg-gradient-to-br', GRAD[v.tone])}>
                  <div className="absolute -right-4 -top-6 size-24 rounded-full bg-white/20" />
                  <div className="absolute -bottom-6 left-6 size-16 rounded-full bg-black/10" />
                  <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-ink-800"><Star size={11} className="fill-amber-400 text-amber-400" />{v.rating.toFixed(1)}</span>
                </div>
                <div className="-mt-6 px-3.5 pb-3.5">
                  <div className="w-fit rounded-2xl bg-white p-1 shadow"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={44} round="rounded-xl" /></div>
                  <p className="mt-2 flex items-center gap-1 truncate text-sm font-bold">{v.name}</p>
                  <p className="truncate text-xs text-ink-500">{cat(v.cat).name} · {v.city}</p>
                  <div className="mt-2.5 flex items-center justify-between"><VerifiedBadge id={v.id} /><span className="text-[11px] font-semibold text-brand-700">{v.reviews} reviews</span></div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title={t('popular')}>
          <div className="space-y-2.5">{popular.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        </Section>
      </div>
    </Screen>
  )
}

/* ================= CATEGORIES ================= */
export function Categories() {
  const nav = useNav()
  const total = INDUSTRIES.reduce((sum, i) => sum + i.cats, 0)
  return (
    <Screen title="All industries and categories" subtitle={`${INDUSTRIES.length} industries · ${total.toLocaleString('en-IN')} sample categories`}>
      <Banner tone="blue" title="All 30 industries are live to browse">Subcategory names and category counts are representative examples. Listing and RFQ workflows remain configured for the existing 10 industry groups; supply-building focuses on the 5 priority groups.</Banner>
      {INDUSTRIES.map((i) => {
        const configured = CATS.some((c) => c.id === i.cat)
        return (
        <Card key={i.id} onClick={configured ? () => nav.go('c_category', { id: i.cat }) : undefined}>
          <div className="flex items-center gap-3">
            <Thumb tone={i.tone} icon={i.icon} size={52} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{i.name}</p>
              <p className="text-xs text-ink-500">{i.cats} sample categories · {i.subs.length} examples</p>
            </div>
            <Badge tone="green">Live</Badge>
            {configured && <ChevronRight size={18} className="text-ink-300" />}
          </div>
          <p className="mb-2 mt-3 text-xs font-semibold text-ink-500">Example subcategories</p>
          <div className="flex flex-wrap gap-1.5">{i.subs.map((s) => <Pill key={s}>{s}</Pill>)}</div>
          {!configured && <p className="mt-3 text-xs text-ink-500">Browseable now; listing and RFQ workflows are not configured for this industry yet.</p>}
        </Card>
        )
      })}
    </Screen>
  )
}

export function Category({ params }) {
  const nav = useNav()
  const { listings, vendors } = useApp()
  const c = cat(params.id || 'elec')
  const [sub, setSub] = useState('All')
  const items = listings.filter((l) => l.cat === c.id && l.status === 'approved' && (sub === 'All' || l.sub === sub))
  const vs = visibleVendors(vendors).filter((v) => v.cat === c.id)
  return (
    <Screen title={c.name} subtitle={c.type === 'service' ? 'Services' : 'Products'} right={<IconBtn label="Search" onClick={() => nav.go('c_explore', { cat: c.id })}><Search size={20} /></IconBtn>}>
      <div className={cx('relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white', GRAD[c.tone])}>
        <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/20" />
        <c.icon size={30} />
        <p className="mt-2 text-lg font-extrabold">{c.name}</p>
        <p className="text-[13px] text-white/85">{items.length} listings · {vs.length} vendors</p>
      </div>
      <Chips value={sub} onChange={setSub} options={['All', ...c.subs]} />
      {vs.length > 0 && (
        <Section title="Vendors">
          <div className="space-y-2.5">{vs.map((v) => <VendorRow key={v.id} v={v} />)}</div>
        </Section>
      )}
      <Section title={c.type === 'service' ? 'Services' : 'Products'}>
        <div className="space-y-2.5">
          {items.map((l) => <ListingCard key={l.id} l={l} />)}
          {items.length === 0 && <EmptyState icon={Package} title="Nothing here yet" body="No listings in this subcategory. Try another one or post an RFQ." action={<Button size="sm" onClick={() => nav.go('c_rfq_new')}>Request quotation</Button>} />}
        </div>
      </Section>
    </Screen>
  )
}

/* ================= EXPLORE / SEARCH ================= */
const DEFAULT_F = { min: '', max: '', stock: false, verified: false, city: 'Any', rating: 0, sort: 'relevance' }
function CoverageFilter({ value, onChange, t, lang }) {
  return <div><p className="mb-2 text-[13px] font-semibold text-ink-700">{lang === 'hi' ? 'खोज का दायरा' : 'Discovery coverage'}</p><div className="grid grid-cols-2 gap-2">{[['local', 'local', 'nearCity'], ['nationwide', 'nationwide', 'acrossCountry'], ['worldwide', 'worldwide', 'international'], ['remote', 'remote', 'anywhere']].map(([id, label, desc]) => <button key={id} onClick={() => onChange(id)} className={cx('rounded-xl border px-3 py-2.5 text-left transition', value === id ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 bg-white text-ink-700')}><span className="block text-sm font-bold">{t(label)}</span><span className="block text-[11px] opacity-70">{t(desc)}</span></button>)}</div></div>
}
export function Explore({ params = {}, supplierOnlyOverride, hideVendorMode = false }) {
  const nav = useNav()
  const { listings, vendors, compare, toggleCompare, me, setMe, locale, setLocale, lang, t } = useApp()
  const [q, setQ] = useState(params.q || '')
  const [mode, setMode] = useState(params.mode || 'all')
  const [c, setC] = useState(params.cat || 'all')
  const [f, setF] = useState(DEFAULT_F)
  const [draft, setDraft] = useState(DEFAULT_F)
  const [coverage, setCoverage] = useState(params.coverage || locale.coverage || 'local')
  const [subcategory, setSubcategory] = useState('all')
  const [open, setOpen] = useState(false)
  const applied = [coverage !== 'local', f.min || f.max, f.stock, f.verified, f.city !== 'Any', f.rating > 0, f.sort !== 'relevance'].filter(Boolean).length
  const match = (s) => s.toLowerCase().includes(q.toLowerCase())
  const supplierOnly = supplierOnlyOverride ?? (me.role === 'vendor' && me.buyerMode)
  const isBusinessSupplier = (id) => ['v-me', 'v-global-2'].includes(id)
  const coverageMatch = (v) => {
    const city = locale.city || 'Jaipur'
    const country = locale.countryName || 'India'
    const remote = v.remote || v.areas?.some((x) => String(x).toLowerCase() === 'remote')
    if (coverage === 'remote') return remote
    if (remote) return false
    if (coverage === 'local') return v.city === city || v.areas?.includes(city)
    if (coverage === 'nationwide') return (v.country || 'India') === country && !(v.city === city || v.areas?.includes(city))
    if (coverage === 'worldwide') return (v.country || 'India') !== country
    return true
  }

  const items = useMemo(() => {
    let r = listings.filter((l) => l.status === 'approved' && (!supplierOnly || isBusinessSupplier(l.vendorId)))
    r = r.filter((l) => coverageMatch(vendors.find((v) => v.id === l.vendorId) || {}))
    if (mode === 'products') r = r.filter((l) => l.type === 'product')
    if (mode === 'services') r = r.filter((l) => l.type === 'service')
    if (c !== 'all') r = r.filter((l) => l.cat === c)
    if (subcategory !== 'all') r = r.filter((l) => l.sub === subcategory)
    if (q) r = r.filter((l) => match(l.title) || match(l.sub) || match(cat(l.cat).name) || match(vendors.find((v) => v.id === l.vendorId)?.name || ''))
    if (f.min) r = r.filter((l) => l.price >= +f.min)
    if (f.max) r = r.filter((l) => l.price <= +f.max)
    if (f.stock) r = r.filter((l) => l.type === 'service' || l.stock > 0)
    if (f.verified) r = r.filter((l) => vendors.find((v) => v.id === l.vendorId)?.status === 'approved')
    if (f.city !== 'Any') r = r.filter((l) => vendors.find((v) => v.id === l.vendorId)?.areas.includes(f.city))
    if (f.rating) r = r.filter((l) => l.rating >= f.rating)
    if (f.sort === 'low') r = [...r].sort((a, b) => a.price - b.price)
    if (f.sort === 'high') r = [...r].sort((a, b) => b.price - a.price)
    if (f.sort === 'rating') r = [...r].sort((a, b) => b.rating - a.rating)
    return r
  }, [listings, vendors, mode, c, subcategory, q, f, supplierOnly, coverage, locale.city, locale.countryName])

  const vs = useMemo(() => {
    let r = visibleVendors(vendors).filter((v) => !supplierOnly || isBusinessSupplier(v.id)).filter(coverageMatch)
    if (c !== 'all') r = r.filter((v) => v.cat === c)
    if (q) r = r.filter((v) => match(v.name) || match(cat(v.cat).name) || match(v.city))
    if (f.verified) r = r.filter((v) => v.status === 'approved')
    if (f.city !== 'Any') r = r.filter((v) => v.areas.includes(f.city))
    if (f.rating) r = r.filter((v) => v.rating >= f.rating)
    return r
  }, [vendors, c, q, f, supplierOnly, coverage, locale.city, locale.countryName])

  const showVendors = mode === 'all' || mode === 'vendors'
  const showItems = mode !== 'vendors'
  return (
    <Screen
      title="Explore"
      back={false}
      pad={false}
      overlay={
        <Sheet open={open} onClose={() => setOpen(false)} title="Filters" footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => { setDraft(DEFAULT_F); setF(DEFAULT_F); setCoverage('local'); setC('all'); setSubcategory('all') }}>Reset</Button><Button className="flex-[2]" onClick={() => { setF(draft); if (draft.city !== 'Any') { const p = findCity(draft.city); if (p) setLocale({ ...locale, ...p, pincode: '' }) } setOpen(false) }}>Show results</Button></div>}>
          <div>
            <CoverageFilter value={coverage} onChange={setCoverage} t={t} lang={lang} />
          </div>
          <div>
            <Select label="Category" value={c} onChange={(e) => { setC(e.target.value); setSubcategory('all') }} options={[{ value: 'all', label: t('allCategories') }, ...CATS.map((x) => ({ value: x.id, label: lang === 'hi' ? x.hi : x.name }))]} />
            <div className="mt-3"><Select label="Subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} options={[{ value: 'all', label: 'All subcategories' }, ...(CATS.find((x) => x.id === c)?.subs || []).map((x) => ({ value: x, label: x }))]} /></div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Price range (₹)</p>
            <div className="flex gap-3"><Input placeholder="Min" inputMode="numeric" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/\D/g, '') })} /><Input placeholder="Max" inputMode="numeric" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <Select label="Location" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} options={['Any', 'Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar']} />
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Minimum rating</p><Chips scroll={false} value={draft.rating} onChange={(v) => setDraft({ ...draft, rating: v })} options={[{ id: 0, label: 'Any' }, { id: 4, label: '4.0+' }, { id: 4.5, label: '4.5+' }, { id: 4.8, label: '4.8+' }]} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Sort by</p><Chips scroll={false} value={draft.sort} onChange={(v) => setDraft({ ...draft, sort: v })} options={[{ id: 'relevance', label: 'Relevance' }, { id: 'low', label: 'Price: low to high' }, { id: 'high', label: 'Price: high to low' }, { id: 'rating', label: 'Rating' }]} /></div>
          <Toggle label="Verified vendors only" desc="Hide vendors that are not Super Admin verified" on={draft.verified} onChange={(v) => setDraft({ ...draft, verified: v })} />
        </Sheet>
      }
    >
      {supplierOnly && <div className="border-b border-violet-100 bg-violet-50 px-4 py-3"><div className="flex items-center gap-3"><Package size={19} className="shrink-0 text-violet-700" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-violet-950">Business suppliers only</p><p className="mt-0.5 text-xs text-violet-800/80">Browse company supplier products, send bulk RFQs and create purchase orders.</p></div><button onClick={() => { setMe({ ...me, buyerMode: false }); nav.reset('v_dash') }} className="shrink-0 rounded-lg bg-white px-2.5 py-2 text-xs font-bold text-violet-800 ring-1 ring-violet-200">Exit buyer</button></div></div>}
      <div className="vv-explore-tools space-y-3 bg-white px-4 pb-3 pt-3 shadow-sm">
        <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors, products, services" right={
          <button onClick={() => { setDraft(f); setOpen(true) }} className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-white" aria-label="Filters">
            <SlidersHorizontal size={19} />
            {applied > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold ring-2 ring-white">{applied}</span>}
          </button>
        } />
        <div className="vv-explore-modes"><Segmented value={mode} onChange={setMode} options={[{ id: 'all', label: 'All' }, { id: 'products', label: 'Products' }, { id: 'services', label: 'Services' }, ...(!hideVendorMode ? [{ id: 'vendors', label: 'Vendors' }] : [])]} /></div>
        <div className="vv-explore-categories" aria-label="Browse categories">
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={c === 'all'}
              onClick={() => { setC('all'); setSubcategory('all') }}
              className={cx('shrink-0 text-sm font-bold', c === 'all' ? 'bg-ink-900 text-white' : 'bg-white text-ink-700')}
            >
              {lang === 'hi' ? 'सभी श्रेणियां' : 'All categories'}
            </button>
            {CATS.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={c === category.id}
                onClick={() => { setC(category.id); setSubcategory('all') }}
                className={cx('shrink-0 text-sm font-bold', c === category.id ? 'bg-ink-900 text-white' : 'bg-white text-ink-700')}
              >
                {lang === 'hi' ? category.hi : category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="vv-explore-results space-y-4 p-4">
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>{(showItems ? items.length : 0) + (showVendors ? vs.length : 0)} results{q && <> for “<b className="text-ink-800">{q}</b>”</>}</span>
          {(applied > 0 || c !== 'all' || q) && <button className="font-bold text-brand-700" onClick={() => { setF(DEFAULT_F); setC('all'); setQ(''); setCoverage('local') }}>{t('clearAll')}</button>}
        </div>
        {showVendors && vs.length > 0 && (
          <Section title={mode === 'vendors' ? undefined : supplierOnly ? 'Business suppliers' : 'Vendors'}><div className="vv-explore-card-grid vv-explore-vendor-grid">{vs.map((v) => <VendorRow key={v.id} v={v} showProfileAction={hideVendorMode} />)}</div></Section>
        )}
        {showItems && items.length > 0 && (
          <Section title={mode === 'all' ? 'Products & services' : undefined}>
            <div className="vv-explore-card-grid vv-explore-listing-grid">{items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
          </Section>
        )}
        {(showItems ? items.length : 0) + (showVendors ? vs.length : 0) === 0 && (
          <EmptyState icon={Search} title={t('noMatches')} body={lang === 'hi' ? 'अलग शब्द आज़माएं, फ़िल्टर हटाएं या आवश्यकता पोस्ट करें।' : 'Try different keywords, remove filters, or post a requirement and let vendors come to you.'} action={<Button size="sm" onClick={() => nav.go('c_rfq_new')}>{t('requestQuote')}</Button>} />
        )}
      </div>
    </Screen>
  )
}

/* ================= LISTING DETAIL ================= */
export function ListingDetail({ params }) {
  const nav = useNav()
  const gate = useGate()
  const { listings, vendor, saved, toggleSaved, compare, toggleCompare, reviews, toast } = useApp()
  const start = useStartChat()
  const l = findListing(params.id || 'l1', listings)
  const v = vendor(l.vendorId)
  const c = cat(l.cat)
  const isSvc = l.type === 'service'
  const inCmp = compare.includes(l.id)
  const rv = reviews.filter((r) => r.target === l.vendorId).slice(0, 2)
  const live = l.status === 'approved'
  const enquire = () => start(l.vendorId, l.id)
  return (
    <Screen
      title=""
      pad={false}
      right={<><IconBtn label="Save" onClick={() => { toggleSaved(l.id); toast(saved.includes(l.id) ? 'Removed from saved' : 'Saved for later') }}><Heart size={21} className={saved.includes(l.id) ? 'fill-rose-500 text-rose-500' : ''} /></IconBtn><IconBtn label="Share" onClick={() => toast('Link copied')}><Share2 size={20} /></IconBtn></>}
      footer={
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-500">Indicative price</p>
            <p className="text-xl font-extrabold text-ink-900">{fmt(l.price)}<span className="text-xs font-normal text-ink-400"> /{l.unit}</span></p>
          </div>
          <Button variant="secondary" icon={Phone} onClick={() => toast(`Calling ${v.name}…`)} aria-label="Call vendor" />
          {isSvc && <Button disabled={!live} variant="secondary" className="flex-1" size="lg" icon={MessageCircle} onClick={enquire}>Message</Button>}
          <Button disabled={!live} className="flex-1" size="lg" icon={isSvc ? CalendarCheck : CreditCard} onClick={() => isSvc ? (gate('Log in to request a service booking') && nav.go('c_book_new', { listingId: l.id })) : (gate('Log in to place an order') && nav.go('c_order_new', { listingId: l.id }))}>{isSvc ? 'Request booking' : 'Buy / procure'}</Button>
        </div>
      }
    >
      <Carousel counter dotsClass="bottom-7">
        {[[0, 84, 'from-0'], [1, 120, 'rot'], [2, 64, 'dual']].map(([k, sz, kind]) => (
          <div key={k} className={cx('relative grid h-56 place-items-center overflow-hidden bg-gradient-to-br text-white', GRAD[l.tone])} style={k === 1 ? { filter: 'hue-rotate(-18deg) saturate(1.1)' } : k === 2 ? { filter: 'hue-rotate(20deg)' } : undefined}>
            <div className={cx('absolute size-44 rounded-full bg-white/20', k === 0 ? '-right-10 -top-10' : k === 1 ? '-left-12 top-6' : '-right-6 bottom-0')} />
            <div className={cx('absolute size-48 rounded-full bg-black/10', k === 0 ? '-bottom-12 -left-8' : k === 1 ? '-bottom-16 right-0' : '-left-10 -top-16')} />
            <c.icon size={sz} strokeWidth={1.4} className="relative drop-shadow-lg" />
            {k === 0 && l.mrp && <span className="absolute bottom-8 left-4 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-emerald-600">{listingDisc(l)}% OFF</span>}
            {k === 1 && <span className="absolute bottom-8 left-4 rounded-full bg-black/35 px-3 py-1 text-xs font-bold backdrop-blur">Product close-up</span>}
            {k === 2 && <span className="absolute bottom-8 left-4 rounded-full bg-black/35 px-3 py-1 text-xs font-bold backdrop-blur">From the vendor</span>}
          </div>
        ))}
      </Carousel>
      <div className="-mt-4 space-y-4 rounded-t-3xl bg-ink-50 p-4 pt-5">
        {!live && <Banner tone="amber" title="Not visible to customers">This listing is <b>{l.status}</b>. Only approved listings appear in search.</Banner>}
        <div>
          <div className="flex flex-wrap gap-1.5"><Pill>{c.name}</Pill><Pill>{l.sub}</Pill></div>
          <h1 className="mt-2 text-xl font-extrabold leading-snug tracking-tight">{l.title}</h1>
          <div className="mt-2 flex items-center gap-3">{l.rating > 0 && <Rating value={l.rating} count={l.reviews} size={15} />}</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{fmt(l.price)}</span>
            {l.mrp && <span className="text-sm text-ink-400 line-through">{fmt(l.mrp)}</span>}
            <span className="text-sm text-ink-500">per {l.unit}</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">Indicative price · agree the final price with the vendor</p>
        </div>

        <Card onClick={() => nav.go('c_vendor', { id: v.id })} className="!p-3.5">
          <div className="flex items-center gap-3">
            <Thumb tone={v.tone} icon={Store} size={46} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{v.name}</p>
              <p className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} />{v.city} · {v.rating > 0 ? `${v.rating} ★` : 'New'}</p>
            </div>
            <VerifiedBadge id={v.id} />
          </div>
        </Card>

        {l.variants?.length > 0 && (
          <div><p className="mb-2 text-sm font-bold">Available options</p><div className="flex flex-wrap gap-2">{l.variants.map((x) => <Pill key={x}>{x}</Pill>)}</div></div>
        )}

        <Card>
          <KV rows={isSvc ? [['Duration', `${l.duration} min`], ['Pricing', 'Indicative — vendor confirms'], ['Booking', 'Choose a preferred date and time'], ['Payment', 'Agreed directly with vendor'], ['Service area', v.areas.join(', ')]] : [['Pricing', 'Indicative — vendor confirms'], ['Lead time', `${l.lead} day${l.lead > 1 ? 's' : ''}`], ['Bulk orders', 'Ask for a quote'], ['Delivery area', v.areas.join(', ')]]} />
        </Card>

        <Section title="About this listing"><Card><p className="text-sm leading-relaxed text-ink-600">{l.desc}</p></Card></Section>
        <Section title="Specifications"><Card><KV rows={l.specs} /></Card></Section>

        <div className="grid grid-cols-2 gap-2.5">
          <Button variant={inCmp ? 'soft' : 'secondary'} icon={inCmp ? Check : GitCompare} onClick={() => { toggleCompare(l.id); toast(inCmp ? 'Removed from compare' : compare.length >= 3 ? 'You can compare up to 3 listings' : 'Added to compare') }}>{inCmp ? 'In compare' : 'Compare'}</Button>
          <Button variant="secondary" icon={FileText} onClick={() => gate('Log in to request a quote') && nav.go('c_rfq_new', { cat: l.cat, title: l.title, vendorId: v.id })}>Bulk quote</Button>
        </div>
        {inCmp && compare.length > 1 && <Button full variant="soft" onClick={() => nav.go('c_saved', { tab: 'compare' })}>View comparison ({compare.length})</Button>}

        {rv.length > 0 && (
          <Section title="Reviews" action="All" onAction={() => nav.go('c_vendor', { id: v.id, tab: 'reviews' })}>
            <div className="space-y-2.5">{rv.map((r) => (
              <Card key={r.id}><div className="flex items-center justify-between"><p className="text-sm font-bold">{r.by}</p><Rating value={r.rating} /></div><p className="mt-1 text-[13px] text-ink-600">{r.text}</p><p className="mt-1 text-[11px] text-ink-400">{r.at}</p></Card>
            ))}</div>
          </Section>
        )}
      </div>
    </Screen>
  )
}

/* ================= VENDOR PROFILE ================= */
export function VendorProfile({ params }) {
  const nav = useNav()
  const gate = useGate()
  const { vendors, listings, reviews, toggleSaved, saved } = useApp()
  const start = useStartChat()
  const v = vendors.find((x) => x.id === (params.id || 'v-me'))
  const c = cat(v.cat)
  const [tab, setTab] = useState(params.tab || 'listings')
  const items = listings.filter((l) => l.vendorId === v.id && l.status === 'approved')
  const rv = reviews.filter((r) => r.target === v.id)
  const msg = () => start(v.id)
  return (
    <Screen title="Vendor profile" pad={false} right={<IconBtn label="Save vendor" onClick={() => toggleSaved(v.id)}><Heart size={21} className={saved.includes(v.id) ? 'fill-rose-500 text-rose-500' : ''} /></IconBtn>}>
      <div className={cx('relative h-28 bg-gradient-to-br', GRAD[v.tone])}><div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/20" /></div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="flex items-end gap-3">
          <div className="rounded-2xl bg-white p-1 shadow"><Thumb tone={v.tone} icon={c.icon} size={72} /></div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold tracking-tight">{v.name}</h1></div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><VerifiedBadge id={v.id} />{v.rating > 0 && <Rating value={v.rating} count={v.reviews} size={14} />}</div>
          <p className="mt-2 flex items-center gap-1 text-sm text-ink-500"><MapPin size={14} />{v.city} · serves {v.areas.join(', ')}</p>
          <p className="mt-1 text-sm text-ink-600">{publicRoleLabels(v).join(' · ') || 'Roles pending verification'}</p>
        </div>
        {v.status !== 'approved' && <Banner tone="amber" title="Verification pending">This vendor has not been verified by VendorVerse yet. Documents are under review.</Banner>}
        <div className="grid grid-cols-3 gap-2">
          {[['Since', v.since], ['Branches', v.branches], ['Listings', items.length]].map(([a, b]) => <Card key={a} className="!p-3 text-center"><p className="text-lg font-extrabold">{b}</p><p className="text-[11px] text-ink-500">{a}</p></Card>)}
        </div>
        <div className="flex gap-2.5"><Button className="flex-1" icon={MessageCircle} onClick={msg}>Message</Button><Button variant="secondary" className="flex-1" icon={FileText} onClick={() => gate('Log in to request a quote') && nav.go('c_rfq_new', { cat: v.cat })}>Request quote</Button></div>
        <Segmented value={tab} onChange={setTab} options={[{ id: 'listings', label: 'Listings', count: items.length }, { id: 'reviews', label: 'Reviews', count: rv.length }, { id: 'about', label: 'About' }]} />
        {tab === 'listings' && <div className="space-y-2.5">{items.map((l) => <ListingCard key={l.id} l={l} showVendor={false} />)}{items.length === 0 && <EmptyState icon={Package} title="No listings yet" />}</div>}
        {tab === 'reviews' && <div className="space-y-2.5">{rv.map((r) => <Card key={r.id}><div className="flex justify-between"><p className="text-sm font-bold">{r.by}</p><Rating value={r.rating} /></div><p className="mt-1 text-[13px] text-ink-600">{r.text}</p>{r.reply && <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600"><b>Vendor reply:</b> {r.reply}</p>}<p className="mt-1.5 text-[11px] text-ink-400">{r.at}</p></Card>)}{rv.length === 0 && <EmptyState icon={Star} title="No reviews yet" body="Reviews appear after completed transactions." />}</div>}
        {tab === 'about' && (
          <div className="space-y-3">
            <Card><KV rows={[['Category', c.name], ['Owner', v.owner], ['Established', v.since], ['Branches', v.branches], ['Service areas', v.areas.join(', ')], ['GSTIN', v.status === 'approved' ? v.gstin : 'Pending verification']]} /></Card>
            <Card><p className="mb-2 text-sm font-bold">Verification</p>{v.docs.map((d) => <div key={d.name} className="flex items-center justify-between py-1.5 text-sm"><span className="text-ink-600">{d.name}</span><StatusBadge s={d.status} /></div>)}</Card>
          </div>
        )}
      </div>
    </Screen>
  )
}

/* ================= CHECKOUT ================= */
const ADDRS = [{ id: 'a1', label: 'Home', text: '24, Vaishali Nagar, Jaipur 302021', icon: HomeIcon }, { id: 'a2', label: 'Office', text: 'Plot 12, Sitapura Industrial Area, Jaipur', icon: Briefcase }]
const METHODS = [{ id: 'upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm', icon: Smartphone }, { id: 'card', label: 'Credit / Debit card', sub: 'Visa, Mastercard, RuPay', icon: CreditCard }, { id: 'net', label: 'Net banking', sub: 'All major banks', icon: Landmark }, { id: 'cod', label: 'Pay on delivery', sub: 'Cash or UPI at doorstep', icon: Banknote }]


/* ================= PAYMENT ================= */


/* ================= BOOK SERVICE ================= */

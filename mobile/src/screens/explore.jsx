import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MapPin, ChevronDown, Search, SlidersHorizontal, FileText, BellRing, WifiOff, RefreshCw, Store, Package, Wrench, Factory, Building2, Layers, X, ArrowUpRight,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { cat, serves, liveCats, coverageOf } from '../data.jsx'
import { country, KIND_LABEL, INDUSTRIES, GEO } from '../globaldata.jsx'
import { VENDOR_TYPES } from '../mvpdata.jsx'
import { normLabel } from '../mvpdata.jsx'
import {
  Screen, Card, Button, Chips, Segmented, Sheet, Input, Select, Toggle, Banner, EmptyState, ListRow, Pill, Thumb, SOFT, cx, SkeletonList,
} from '../ui.jsx'
import { ListingCard, VendorRow } from './shared.jsx'

/* ---------- organic ranking: relevance + quality; subscription tier is NOT a signal ---------- */
export function organicScore(l, vendor, q, loc) {
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
  const n = l.reviews || 0
  s += (((l.rating || 4.2) * n + 4.2 * 8) / (n + 8) - 3.5) * 2
  return s
}

const DEFAULT_F = { min: '', max: '', verified: false, availListed: false, lang: 'Any', rating: 0, mode: 'any', sort: 'relevance', cover: 'any', origin: 'any', ships: false }
const PAGE = 5
const COVER = [['any', 'Anywhere'], ['local', 'Local'], ['remote', 'Remote'], ['national', 'National'], ['international', 'International']]

/* does a listing's spec value satisfy the admin-defined filter for one custom field? */
function specMatch(l, field, val) {
  const spec = (l.specs || []).find(([k]) => normLabel(k) === normLabel(field.k))
  if (!spec) return false
  const raw = String(spec[1])
  if (field.type === 'boolean') return /^(yes|true)/i.test(raw) === !!val
  if (field.type === 'number') { const n = parseFloat(raw.replace(/,/g, '')); if (Number.isNaN(n)) return false; return field.cmp === 'max' ? n <= +val : n >= +val }
  if (field.type === 'multi') return val.length === 0 || val.some((x) => raw.toLowerCase().includes(x.toLowerCase()))
  return raw.toLowerCase().includes(String(val).toLowerCase())
}

/* grouped vendor-type filters used by the vendor Buy tab */
// derived from each role's `offer` in VENDOR_TYPES (D-024), so a new role needs no change here
const KIND_GROUPS = { goods: Object.keys(VENDOR_TYPES).filter((k) => VENDOR_TYPES[k].offer === 'products'), services: Object.keys(VENDOR_TYPES).filter((k) => VENDOR_TYPES[k].offer === 'services') }
const KIND_GROUP_LABEL = { goods: 'Suppliers & manufacturers', services: 'Service providers' }

export function Explore({ params = {} }) {
  const nav = useNav()
  const { listings, vendors, published, vendor, loc, toast, catsVer, me } = useApp()
  const buying = me.role === 'vendor'
  const [q, setQ] = useState(params.q || '')
  const [focus, setFocus] = useState(false)
  const [type, setType] = useState(params.mode === 'vendors' ? 'vendors' : params.kind === 'services' ? 'services' : params.kind && params.kind !== 'service' ? 'products' : 'all')
  const [c, setC] = useState(params.cat || 'all')
  const [kind, setKind] = useState(params.kind || 'all')
  const [sub, setSub] = useState('All')
  const [f, setF] = useState({ ...DEFAULT_F, verified: !!params.verified })
  const [sf, setSf] = useState({})
  const [draft, setDraft] = useState(DEFAULT_F)
  const [dsf, setDsf] = useState({})
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(PAGE)
  const [broad, setBroad] = useState(false)
  const [err, setErr] = useState(params.state === 'error')
  const [watch, setWatch] = useState(false)
  const [loading, setLoading] = useState(!params.skip)
  const inputRef = useRef(null)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 450); return () => clearTimeout(t) }, [])
  const cats = liveCats()
  const cur = c !== 'all' ? cat(c) : null
  const schemaFilters = (cur?.schema || []).filter((x) => x.filter)
  const applied = [f.min || f.max, f.verified, f.availListed, f.lang !== 'Any', f.rating > 0, f.mode !== 'any', f.sort !== 'relevance', f.cover !== 'any', f.origin !== 'any', f.ships, Object.keys(sf).length].filter(Boolean).length

  const industryOf = (l) => INDUSTRIES.find((i) => i.cat === l.cat)
  const base = useMemo(() => {
    let r = listings.filter(published).filter((l) => cat(l.cat).active !== false && !(buying && l.vendorId === me.vendorId))
    if (c !== 'all') r = r.filter((l) => l.cat === c)
    if (c !== 'all' && sub !== 'All') r = r.filter((l) => l.sub === sub)
    if (kind !== 'all') r = r.filter((l) => (KIND_GROUPS[kind] || [kind]).includes(vendor(l.vendorId)?.kind))
    if (type === 'services') r = r.filter((l) => l.type === 'service')
    if (type === 'products') r = r.filter((l) => l.type === 'product')
    if (q) {
      const w = q.toLowerCase().trim()
      const pin = /^\d{6}$/.test(w)
      r = r.filter((l) => {
        if (pin) return l.pins ? l.pins.includes(w) : true
        const ind = industryOf(l)
        const hay = (l.title + ' ' + l.sub + ' ' + cat(l.cat).name + ' ' + cat(l.cat).aliases.join(' ') + ' ' + (vendor(l.vendorId)?.name || '') + ' ' + (ind ? ind.name + ' ' + ind.subs.join(' ') : '') + ' ' + (l.specs || []).map((x) => x[1]).join(' ')).toLowerCase()
        return w.split(/\s+/).every((t) => hay.includes(t))
      })
    }
    if (f.min) r = r.filter((l) => l.priceMin != null && (l.priceMax ?? l.priceMin) >= +f.min)
    if (f.max) r = r.filter((l) => l.priceMin != null && l.priceMin <= +f.max)
    if (f.verified) r = r.filter((l) => vendor(l.vendorId)?.ver === 'approved')
    if (f.availListed) r = r.filter((l) => l.avail !== 'none')
    if (f.lang !== 'Any') r = r.filter((l) => vendor(l.vendorId)?.langs.includes(f.lang))
    if (f.rating) r = r.filter((l) => l.rating >= f.rating)
    if (f.mode !== 'any') r = r.filter((l) => cat(l.cat).mode === f.mode || cat(l.cat).mode === 'both')
    if (f.cover !== 'any') r = r.filter((l) => coverageOf(l).includes(f.cover))
    if (f.origin !== 'any') r = r.filter((l) => vendor(l.vendorId)?.country === f.origin)
    if (f.ships) r = r.filter((l) => !l.trade?.regions || l.trade.regions.some((x) => /pan-india|worldwide|north india/i.test(x) || x === loc.state || x === loc.city || x === loc.country))
    Object.entries(sf).forEach(([k, val]) => { const fld = schemaFilters.find((x) => x.k === k); if (fld) r = r.filter((l) => specMatch(l, fld, val)) })
    return r
  }, [listings, c, sub, kind, type, q, f, sf, published, vendor, catsVer])

  const inArea = base.filter((l) => serves(l, loc))
  const outside = base.filter((l) => !serves(l, loc))
  const sortFn = f.sort === 'low' ? (a, b) => (a.priceMin ?? Infinity) - (b.priceMin ?? Infinity) : f.sort === 'rating' ? (a, b) => b.rating - a.rating : f.sort === 'resp' ? (a, b) => (a.resp ?? 99) - (b.resp ?? 99) : (a, b) => organicScore(b, vendor(b.vendorId), q, loc) - organicScore(a, vendor(a.vendorId), q, loc)
  const organic = [...inArea].sort(sortFn)
  const items = f.sort === 'relevance' ? [...organic.filter((l) => l.sponsored), ...organic.filter((l) => !l.sponsored)] : organic
  const vs = useMemo(() => [...new Set(items.map((l) => l.vendorId))].map((id) => vendor(id)).filter(Boolean), [items])
  const list = type === 'vendors' ? vs : items
  const count = list.length
  const reset = () => { setF(DEFAULT_F); setSf({}); setC('all'); setKind('all'); setSub('All'); setQ(''); setShown(PAGE); setBroad(false); setType('all') }

  /* suggestions across vendors, products, services, industries and places */
  const sugg = useMemo(() => {
    const w = q.toLowerCase().trim()
    if (w.length < 2) return null
    const pub = listings.filter(published)
    return {
      vendors: vendors.filter((v) => v.name.toLowerCase().includes(w) && pub.some((l) => l.vendorId === v.id)).slice(0, 3),
      products: pub.filter((l) => l.type === 'product' && l.title.toLowerCase().includes(w)).slice(0, 3),
      services: pub.filter((l) => l.type === 'service' && l.title.toLowerCase().includes(w)).slice(0, 3),
      industries: INDUSTRIES.filter((i) => (i.name + ' ' + i.subs.join(' ')).toLowerCase().includes(w)).slice(0, 3),
      places: GEO.flatMap((g) => g.states.flatMap((s) => s.cities.map((x) => ({ n: x.n, st: s.name, f: g.flag })))).filter((x) => x.n.toLowerCase().includes(w)).slice(0, 2),
    }
  }, [q, listings, vendors, published])
  const hasSugg = sugg && Object.values(sugg).some((a) => a.length)

  const SH = ({ children }) => <p className="px-3 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-400">{children}</p>
  const SR = ({ icon: I, tone, title, sub: s2, onClick }) => (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink-50 active:bg-ink-100"><span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', SOFT[tone])}><I size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{title}</span>{s2 && <span className="block truncate text-[11px] text-ink-500">{s2}</span>}</span><ArrowUpRight size={14} className="shrink-0 text-ink-300" /></button>
  )

  return (
    <Screen
      title={buying ? 'Buy from vendors' : 'Explore'}
      back={buying}
      pad={false}
      overlay={
        <Sheet open={open} onClose={() => setOpen(false)} title="Filters" footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => { setDraft(DEFAULT_F); setDsf({}) }}>Reset</Button><Button className="flex-[2]" onClick={() => { setF(draft); setSf(dsf); setShown(PAGE); setOpen(false) }}>Show results</Button></div>}>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Coverage</p><Chips scroll={false} value={draft.cover} onChange={(v) => setDraft({ ...draft, cover: v })} options={COVER.map(([id, label]) => ({ id, label }))} /><p className="mt-1.5 text-xs text-ink-500">Local = serves your pincode/city · Remote = delivered online · National = whole country · International = ships or serves worldwide.</p></div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Price</p>
            <div className="flex gap-3"><Input placeholder="Min" inputMode="numeric" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/\D/g, '') })} /><Input placeholder="Max" inputMode="numeric" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value.replace(/\D/g, '') })} /></div>
            <p className="mt-1.5 text-xs text-ink-500">Listings without a price are left out when a price filter is set — we never guess prices.</p>
          </div>
          {schemaFilters.length > 0 && (
            <div className="space-y-4 rounded-2xl bg-ink-50 p-3.5">
              <p className="text-[13px] font-extrabold">{cur.name} filters <span className="font-medium text-ink-400">· set by admin</span></p>
              {schemaFilters.map((fl) => (
                <div key={fl.k}>
                  <p className="mb-1.5 text-[13px] font-semibold text-ink-700">{fl.k}{fl.type === 'number' && <span className="font-normal text-ink-400"> · {fl.cmp === 'max' ? 'at most' : 'at least'}</span>}</p>
                  {fl.type === 'boolean' && <Toggle label="Yes" on={!!dsf[fl.k]} onChange={(v) => { const n = { ...dsf }; v ? (n[fl.k] = true) : delete n[fl.k]; setDsf(n) }} />}
                  {fl.type === 'number' && <Input inputMode="numeric" placeholder={fl.unit || 'value'} value={dsf[fl.k] || ''} onChange={(e) => { const n = { ...dsf }; e.target.value ? (n[fl.k] = e.target.value.replace(/\D/g, '')) : delete n[fl.k]; setDsf(n) }} />}
                  {fl.type === 'select' && <Chips scroll={false} value={dsf[fl.k] || ''} onChange={(v) => { const n = { ...dsf }; v === dsf[fl.k] ? delete n[fl.k] : (n[fl.k] = v); setDsf(n) }} options={fl.options} />}
                  {fl.type === 'multi' && <Chips scroll={false} multi value={dsf[fl.k] || []} onChange={(v) => { const n = { ...dsf }; v.length ? (n[fl.k] = v) : delete n[fl.k]; setDsf(n) }} options={fl.options} />}
                  {fl.type === 'text' && <Input placeholder="Contains…" value={dsf[fl.k] || ''} onChange={(e) => { const n = { ...dsf }; e.target.value ? (n[fl.k] = e.target.value) : delete n[fl.k]; setDsf(n) }} />}
                </div>
              ))}
            </div>
          )}
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Seller located in</p><Select value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} options={[{ value: 'any', label: 'Any country' }, ...GEO.filter((g) => vendors.some((v) => v.country === g.code)).map((g) => ({ value: g.code, label: `${g.flag} ${g.name}` }))]} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Minimum rating</p><Chips scroll={false} value={draft.rating} onChange={(v) => setDraft({ ...draft, rating: v })} options={[{ id: 0, label: 'Any' }, { id: 4, label: '4.0+' }, { id: 4.5, label: '4.5+' }, { id: 4.8, label: '4.8+' }]} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Vendor language</p><Chips scroll={false} value={draft.lang} onChange={(v) => setDraft({ ...draft, lang: v })} options={['Any', 'English', 'Hindi']} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">How you want to proceed</p><Chips scroll={false} value={draft.mode} onChange={(v) => setDraft({ ...draft, mode: v })} options={[{ id: 'any', label: 'Any' }, { id: 'booking', label: 'Book a service' }, { id: 'rfq', label: 'Request a quote' }]} /></div>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Sort by</p><Chips scroll={false} value={draft.sort} onChange={(v) => setDraft({ ...draft, sort: v })} options={[{ id: 'relevance', label: 'Relevance' }, { id: 'rating', label: 'Rating' }, { id: 'resp', label: 'Fastest reply' }, { id: 'low', label: 'Price: low to high' }]} /></div>
          <Toggle label="Verified vendors only" desc="Evidence-based — approved by reviewers" on={draft.verified} onChange={(v) => setDraft({ ...draft, verified: v })} />
          <Toggle label="Availability listed" on={draft.availListed} onChange={(v) => setDraft({ ...draft, availListed: v })} />
          <Toggle label="Delivers to my region" desc="Products that list your state, city or all of India" on={draft.ships} onChange={(v) => setDraft({ ...draft, ships: v })} />
        </Sheet>
      }
    >
      <div className="space-y-3 bg-white px-4 pb-3 pt-3 shadow-sm">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input ref={inputRef} value={q} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 120)} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }} placeholder="Vendor, company, product, service, industry or place" className="h-11 w-full rounded-xl bg-white pl-10 pr-9 text-sm text-ink-900 outline-none ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500" />
              {q && <button aria-label="Clear" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400"><X size={16} /></button>}
            </div>
            <button onClick={() => { setDraft(f); setDsf(sf); setOpen(true) }} className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-white" aria-label="Filters">
              <SlidersHorizontal size={19} />
              {applied > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold ring-2 ring-white">{applied}</span>}
            </button>
          </div>
          {focus && hasSugg && (
            <div className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[22rem] overflow-y-auto rounded-2xl bg-white pb-1.5 shadow-[0_18px_40px_-12px_rgba(20,40,75,0.35)] ring-1 ring-ink-200">
              {sugg.vendors.length > 0 && <><SH>Vendors & companies</SH>{sugg.vendors.map((v) => <SR key={v.id} icon={Building2} tone="indigo" title={v.name} sub={`${KIND_LABEL[v.kind]} · ${country(v.country).flag} ${v.city}`} onClick={() => nav.go('c_vendor', { id: v.id })} />)}</>}
              {sugg.products.length > 0 && <><SH>Products</SH>{sugg.products.map((l) => <SR key={l.id} icon={Package} tone="slate" title={l.title} sub={`MOQ ${l.trade?.moq ?? '—'} · ${vendor(l.vendorId)?.name}`} onClick={() => nav.go('c_product', { id: l.id })} />)}</>}
              {sugg.services.length > 0 && <><SH>Services</SH>{sugg.services.map((l) => <SR key={l.id} icon={Wrench} tone="sky" title={l.title} sub={vendor(l.vendorId)?.name} onClick={() => nav.go('c_listing', { id: l.id })} />)}</>}
              {sugg.industries.length > 0 && <><SH>Industries</SH>{sugg.industries.map((i) => <SR key={i.id} icon={Layers} tone="teal" title={i.name} sub={`${i.cats} categories`} onClick={() => { setQ(''); if (i.cat) setC(i.cat); else toast('This industry opens after launch — join the waitlist from Browse all', 'warn') }} />)}</>}
              {sugg.places.length > 0 && <><SH>Places</SH>{sugg.places.map((p) => <SR key={p.n} icon={MapPin} tone="amber" title={`${p.f} ${p.n}`} sub={p.st} onClick={() => nav.go('c_location', {})} />)}</>}
            </div>
          )}
        </div>
        <button onClick={() => nav.go('c_location')} className="flex items-center gap-1.5 text-xs font-bold text-brand-700">{country(loc.country).flag} Serving {loc.city} {loc.pin}<ChevronDown size={13} /></button>
        <Segmented value={type} onChange={(t) => { setType(t); setShown(PAGE) }} options={[{ id: 'all', label: 'All' }, { id: 'services', label: 'Services' }, { id: 'products', label: 'Products' }, { id: 'vendors', label: 'Vendors' }]} />
      </div>

      <div className="space-y-4 p-4">
        {loading ? <SkeletonList n={4} /> : err ? (
          <EmptyState icon={WifiOff} title="Couldn’t load results" body="Check your connection and try again. Your search and filters are kept." action={<Button size="sm" icon={RefreshCw} onClick={() => { setErr(false); toast('Back online') }}>Retry</Button>} />
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>{count} result{count === 1 ? '' : 's'}{q && <> for “<b className="text-ink-800">{q}</b>”</>} for {loc.city}</span>
              {(applied > 0 || c !== 'all' || q || kind !== 'all' || type !== 'all') && <button className="font-bold text-brand-700" onClick={reset}>Reset filters</button>}
            </div>
            {Object.keys(sf).length > 0 && <div className="flex flex-wrap gap-1.5">{Object.entries(sf).map(([k, v]) => <button key={k} onClick={() => { const n = { ...sf }; delete n[k]; setSf(n) }} className="flex items-center gap-1 rounded-full bg-ink-900 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-white">{k}: {Array.isArray(v) ? v.join(', ') : v === true ? 'Yes' : v}<X size={12} /></button>)}</div>}
            {type === 'vendors' ? vs.slice(0, shown).map((v) => <VendorRow key={v.id} v={v} />) : items.slice(0, shown).map((l) => <ListingCard key={l.id} l={l} />)}
            {count > shown && <Button full variant="secondary" onClick={() => setShown(shown + PAGE)}>Load more ({count - shown} left)</Button>}

            {count === 0 && (
              <div className="space-y-3">
                <EmptyState icon={Search} title="No suitable vendor found" body={`We couldn’t find an eligible ${type === 'products' ? 'product' : type === 'services' ? 'service' : 'vendor'}${c !== 'all' ? ` in ${cat(c).name}` : ''} for ${loc.city} ${loc.pin} with your filters.`} />
                <Card className="space-y-2">
                  <p className="text-sm font-bold">Try one of these</p>
                  <ListRow icon={MapPin} title="Broaden the area" subtitle="Show vendors outside your area — clearly labelled" onClick={() => setBroad(true)} />
                  <ListRow icon={SlidersHorizontal} tone="violet" title="Remove restrictive filters" onClick={reset} />
                  <ListRow icon={FileText} tone="amber" title="Send a requirement as an RFQ" subtitle="Eligible vendors can respond when they serve you" onClick={() => nav.go('c_rfq_new', { cat: c !== 'all' ? c : undefined })} />
                  <ListRow icon={BellRing} tone="teal" title={watch ? 'We will notify you' : 'Notify me when a vendor becomes available'} subtitle={watch ? `Alert saved for ${loc.pin}` : 'Get one alert when supply appears'} onClick={() => { setWatch(true); toast('You will be notified') }} last />
                </Card>
              </div>
            )}
            {outside.length > 0 && !broad && <button onClick={() => setBroad(true)} className="w-full py-1 text-center text-xs font-bold text-brand-700">Also show {outside.length} listings outside my area</button>}
            {broad && outside.length > 0 && (
              <div className="space-y-2.5"><Banner tone="amber" title="Outside your area">Labelled so you can tell. They don’t list {loc.pin} in their coverage.</Banner>{outside.slice(0, 4).map((l) => <ListingCard key={l.id} l={l} outside />)}</div>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}

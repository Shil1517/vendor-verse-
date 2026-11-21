/*
 * Real-API discovery and booking screens (F-DSC-02/05/07, F-BKG-01..10).
 *
 * Used instead of the seed-data screens when VITE_API_BASE_URL is set (see the
 * registry). Same file on web and mobile; only the app shell around it differs.
 * Nothing here invents a value: a price or availability the vendor did not give
 * is labelled, never shown as zero (F-DSC-05).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Heart, MapPin, Search, Zap } from 'lucide-react'
import { Badge, Banner, Button, Card, Chips, EmptyState, Input, KV, ListRow, Screen, Section, Segmented, SearchBar, Toggle, cx } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { openAuthDialog } from '../components/MarketplaceAuthDialog.jsx'
import { SAMPLE_GROUPS, SAMPLE_LISTINGS } from '../data/exploreSamples.js'

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/* ---------- shared formatting ---------- */
export function minorToText(minor, currency) {
  if (minor === null || minor === undefined || !currency) return null
  try {
    const f = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    const digits = f.resolvedOptions().maximumFractionDigits
    return f.format(Number(minor) / 10 ** digits)
  } catch {
    return null
  }
}

/** price.state is stated | on_request | not_provided; a missing price is never zero (F-DSC-05). */
export function priceLabel(price) {
  if (!price || price.state === 'not_provided') return 'Price not provided'
  if (price.state === 'on_request') return 'Price on request'
  const lo = minorToText(price.minMinor, price.currency)
  const hi = minorToText(price.maxMinor, price.currency)
  const range = lo && hi && lo !== hi ? `${lo} to ${hi}` : lo || hi || 'Price not provided'
  return price.unit ? `${range} / ${price.unit}` : range
}

const COVERAGE_LABEL = { city: 'In your city', region: 'Covers your state or region', country: 'Wider area: covers the whole country', remote: 'Remote service' }
/** "Why this matched" (F-DSC-02). A wider coverage than the searched place is labelled as such (F-DSC-03). */
export function matchLabels(matchedOn = []) {
  const out = []
  for (const m of matchedOn) {
    if (m.startsWith('coverage:')) out.push(COVERAGE_LABEL[m.slice(9)] || m)
    else if (m === 'title') out.push('Matches the title')
    else if (m === 'description') out.push('Matches the description')
    else if (m === 'vendor') out.push('Matches the vendor name')
  }
  return out
}

export const BOOKING_STATUS = {
  requested: ['Requested', 'blue'], confirmed: ['Confirmed', 'teal'], declined: ['Declined', 'red'], expired: ['Expired', 'gray'],
  in_progress: ['In progress', 'purple'], completed_awaiting: ['Awaiting confirmation', 'amber'], closed: ['Closed', 'gray'], cancelled: ['Cancelled', 'gray'], draft: ['Draft', 'gray'],
}
const StateBadge = ({ s }) => { const [label, tone] = BOOKING_STATUS[s] || [s, 'gray']; return <Badge tone={tone}>{label}</Badge> }

export const fmtWhen = (iso, zone) => {
  if (!iso) return 'Time not set'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', ...(zone ? { timeZone: zone } : {}) }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}

/** Runs a loader on mount and when deps change; `reload` refetches. */
export function useLoad(load, deps = []) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }))
    return load().then((r) => setState(r.ok ? { loading: false, error: '', data: r } : { loading: false, error: r.message || 'Something went wrong.', data: null }))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, [run])
  return { ...state, reload: run }
}

export const Loading = () => <div className="vv-loading-state" role="status" aria-live="polite">
  <span className="vv-loading-spinner" aria-hidden="true" />
  <span>Loading results…</span>
</div>
export const ErrorBox = ({ message, onRetry }) => <Banner tone="red" title="Could not load" action={onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}>{message}</Banner>

/* ================= SEARCH (F-DSC-02, F-DSC-03, F-DSC-04) ================= */
/* ---------- universal search (F-DSC-02, D-025) ---------- */
const PRIVATE_TYPES = ['rfq', 'booking', 'contract', 'purchase_order']
const PRIVATE_LABEL = { rfq: 'My RFQs', booking: 'My bookings', contract: 'My contracts', purchase_order: 'My purchase orders' }
const ROLE_LABEL = { customer: 'You are the customer', vendor: 'You are the vendor', buyer: 'You are the buyer', supplier: 'You are the supplier' }
const PRIVATE_MATCH = { listing: 'Matches the listing', vendor: 'Matches the vendor name', category: 'Matches the category', requirements: 'Matches the request details', scope: 'Matches the scope', item: 'Matches an item' }
/** The screen a private result opens, by record type and the caller's side. Contracts and purchase orders have no real-API screen yet. */
const privateTarget = (type, hit) => (type === 'rfq' ? [hit.role === 'vendor' ? 'v_rfq' : 'c_rfq', { id: hit.id }] : type === 'booking' ? [hit.role === 'vendor' ? 'v_booking' : 'c_booking', { id: hit.id }] : null)

/** One search over vendors, categories and (signed in) the caller's own RFQs, bookings, contracts and purchase orders. Products and services are the listing results below. */
function UniversalPanel({ q, country, cityId, signedIn, onCategory }) {
  const nav = useNav()
  const text = q.trim()
  const [state, setState] = useState({ loading: false, error: '', data: null })
  useEffect(() => {
    if (text.length < 2) { setState({ loading: false, error: '', data: null }); return undefined }
    let live = true
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: '' }))
      const r = await authService.universalSearch({ q: text, countryCode: country, cityId, types: ['vendor', 'category', ...(signedIn ? PRIVATE_TYPES : [])] })
      if (live) setState(r.ok ? { loading: false, error: '', data: r } : { loading: false, error: r.message || 'Search failed.', data: null })
    }, 350)
    return () => { live = false; clearTimeout(t) }
  }, [text, country, cityId, signedIn])

  if (text.length < 2) return null
  if (state.error) return signedIn ? <ErrorBox message={state.error} /> : null // signed-out visitors just see the listings below
  const sections = state.data?.sections || {}
  const vendors = sections.vendor?.items || []
  const categories = sections.category?.items || []
  const priv = PRIVATE_TYPES.filter((t) => sections[t]?.items?.length)
  if (!state.loading && !vendors.length && !categories.length && !priv.length) return null
  return (
    <div className="space-y-3">
      {state.loading && !state.data && <Loading />}
      {vendors.length > 0 && <Section title="Vendors">{vendors.map((v) => (
        <Card key={v.id} onClick={() => nav.go('c_vendor', { id: v.id })}><p className="truncate text-[15px] font-bold text-ink-900">{v.name}</p><p className="text-xs text-ink-500">{v.roles.join(' · ') || 'Verified vendor'}</p></Card>
      ))}</Section>}
      {categories.length > 0 && <Section title="Categories"><div className="flex flex-wrap gap-2">{categories.map((c) => (
        <button key={c.id} onClick={() => onCategory(c.id)} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 ring-1 ring-ink-200">{c.name}</button>
      ))}</div></Section>}
      {priv.map((type) => (
        <Section key={type} title={PRIVATE_LABEL[type]}>{sections[type].items.map((h) => {
          const target = privateTarget(type, h)
          return (
            <Card key={h.id} onClick={target ? () => nav.go(target[0], target[1]) : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-[15px] font-bold text-ink-900">{h.title || h.categoryName || 'Untitled'}</p><p className="truncate text-xs text-ink-500">{ROLE_LABEL[h.role]}{h.categoryName && h.title ? ` · ${h.categoryName}` : ''}</p></div>
                <Badge tone="gray">{String(h.state).replace(/_/g, ' ')}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">{h.matchedOn.map((m) => PRIVATE_MATCH[m] || m).join(' · ')}</p>
            </Card>
          )
        })}</Section>
      ))}
      <p className="text-[11px] text-ink-400">Your RFQs, bookings, contracts and orders are shown only to you{signedIn ? '' : '. Sign in to include them'}.</p>
    </div>
  )
}

const RESULT_IMAGES = {
  Plumbing: '/category-images/plumbing.jpg',
  'Electrical and AC repair': '/category-images/electrical-ac-repair.jpg',
  'Home cleaning': '/category-images/home-cleaning.jpg',
  Carpentry: '/category-images/carpentry.jpg',
  'Paints and finishing': '/category-images/paints-finishing.jpg',
  'Hardware and building materials': '/category-images/hardware-building-materials.jpg',
  'Event catering': '/category-images/event-catering.jpg',
}

function ResultCard({ listing: l, sample = false, onClick, onVendorClick }) {
  const location = l.city || l.vendor?.city || l.vendor?.location
  const kind = l.listingType === 'product' ? 'Product' : 'Service'
  const matched = sample ? (l.isNew ? 'New vendor' : 'Verified marketplace listing') : matchLabels(l.matchedOn).join(' · ')
  const image = RESULT_IMAGES[l.categoryName] || (l.listingType === 'product' ? '/category-images/hardware-building-materials.jpg' : '/hero-home-services.svg')

  return (
    <Card className="group overflow-hidden p-0">
      <div className="vv-result-card-layout">
        <button type="button" disabled={!onClick} onClick={onClick} aria-label={`Open ${l.title}`} className="vv-result-card-image relative overflow-hidden rounded-2xl bg-ink-100 text-left">
          <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/35 to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-700 backdrop-blur-sm">{kind}</span>
        </button>
        <div className="vv-result-card-body p-4 md:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button type="button" disabled={!onClick} onClick={onClick} className="min-w-0 text-left text-base font-bold leading-snug text-ink-900 transition hover:text-brand-700 md:text-lg">{l.title}</button>
              <div className="flex shrink-0 gap-1.5">{l.instantBooking && <Badge tone="teal"><Zap size={11} /> Instant</Badge>}{sample && <Badge tone="gray">Sample</Badge>}</div>
            </div>
            {onVendorClick ? <button type="button" onClick={onVendorClick} className="mt-1 text-left text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">{l.vendor.name} · View profile & message</button> : <p className="mt-1 text-sm font-medium text-ink-600">{l.vendor.name}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
              <span className="rounded-full bg-ink-50 px-2 py-1 font-semibold text-ink-600">{l.categoryName}</span>
              {location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{location}</span>}
            </div>
          </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-ink-50/80 px-3.5 py-2.5 ring-1 ring-inset ring-ink-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">Starting range</p>
            <p className="mt-1 text-base font-extrabold tracking-tight text-ink-900 md:text-lg">{priceLabel(l.price)}</p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 ring-1 ring-ink-200">{kind}</span>
        </div>
        {matched && <p className="mt-2 text-xs font-medium text-ink-500">{matched}</p>}
        </div>
      </div>
    </Card>
  )
}

export function RemoteExplore({ params = {} }) {
  const nav = useNav()
  const app = useApp()
  const locale = app.locale ?? app.loc ?? {} // web keeps the place in `locale`, mobile in `loc`
  const [q, setQ] = useState(params.q || '')
  const [group, setGroup] = useState(params.group || '') // top-level category picked in the marketplace header
  const [type, setType] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [instantOnly, setInstantOnly] = useState(false)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [state, setState] = useState({ loading: true, error: '', items: [], nextCursor: null, marketLive: true })
  const country = locale.country || 'IN'

  // Picking another header category while this screen is open starts a fresh browse of it.
  useEffect(() => { setGroup(params.group || ''); setQ(params.q || ''); setCategoryId('all') }, [params.group, params.q])

  // Resolve the saved city name to a geography id once.
  const cities = useLoad(() => authService.listCities(country), [country])
  const cityId = useMemo(() => cities.data?.cities?.find((c) => c.name === locale.city)?.id, [cities.data, locale.city])
  const categories = useLoad(() => authService.listCategories({ countryCode: country, cityId }), [country, cityId])

  const filters = useMemo(() => ({
    countryCode: country, cityId, q: q.trim() || undefined, categoryId: categoryId === 'all' ? undefined : categoryId,
    listingType: type === 'all' ? undefined : type, instantOnly: instantOnly || undefined,
    minPriceMinor: min ? Number(min) * 100 : undefined, maxPriceMinor: max ? Number(max) * 100 : undefined,
  }), [country, cityId, q, categoryId, type, instantOnly, min, max])

  const search = useCallback(async (cursor) => {
    setState((s) => ({ ...s, loading: true, error: '', ...(cursor ? {} : { items: [] }) }))
    const r = await authService.searchListings({ ...filters, cursor })
    if (!r.ok) return setState((s) => ({ ...s, loading: false, error: r.message || 'Search failed. Check your connection and try again.' }))
    setState((s) => ({ loading: false, error: '', items: cursor ? [...s.items, ...r.items] : r.items, nextCursor: r.nextCursor, marketLive: r.marketLive }))
  }, [filters])

  // Debounce typing; wait for the city lookup so the first search is already local.
  useEffect(() => {
    if (cities.loading) return undefined
    const t = setTimeout(() => search(), 300)
    return () => clearTimeout(t)
  }, [search, cities.loading])

  // Sample data fills the screen until real listings exist (see data/exploreSamples.js).
  const realCategories = categories.data?.categories || []
  const groupSubs = group && group !== 'New vendors' ? SAMPLE_GROUPS[group] || [] : null
  // The API has flat categories; the header groups them by name, so apply the group here.
  const visibleItems = useMemo(() => (groupSubs ? state.items.filter((l) => groupSubs.includes(l.categoryName)) : state.items), [state.items, groupSubs])
  const useSamples = !state.loading && visibleItems.length === 0 && (Boolean(state.error) || state.marketLive)
  const sampleCategories = Object.entries(SAMPLE_GROUPS).filter(([g]) => !group || group === 'New vendors' || g === group).flatMap(([, subs]) => subs)
  const chipOptions = realCategories.length > 0
    ? realCategories.filter((c) => !groupSubs || groupSubs.includes(c.name)).map((c) => ({ id: c.categoryId, label: c.name }))
    : sampleCategories.map((name) => ({ id: name, label: name }))
  const sampleItems = useMemo(() => {
    const text = q.trim().toLowerCase()
    return SAMPLE_LISTINGS.filter((l) => {
      if (group === 'New vendors' ? !l.isNew : group && l.group !== group) return false
      if (type !== 'all' && l.listingType !== type) return false
      if (categoryId !== 'all' && l.categoryName !== categoryId) return false
      if (instantOnly && !l.instantBooking) return false
      if (min && l.price.maxMinor < Number(min) * 100) return false
      if (max && l.price.minMinor > Number(max) * 100) return false
      return !text || [l.title, l.vendor.name, l.categoryName, l.group, l.city].some((v) => v.toLowerCase().includes(text))
    })
  }, [q, group, type, categoryId, instantOnly, min, max])
  const activeFilterCount = [type !== 'all', categoryId !== 'all', Boolean(min), Boolean(max), instantOnly].filter(Boolean).length

  return (
    <Screen title="Explore" back={false} pad={false} headerless scrollClass="vv-remote-explore-scroll">
      <div className="vv-remote-explore mx-auto space-y-5 pb-6 pt-3 md:pb-8 md:pt-4">
      <div className="vv-remote-explore-grid grid items-start gap-5">
      <aside className="vv-explore-filter md:sticky md:top-4">
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_55px_-30px_rgba(15,23,42,0.45)] ring-1 ring-ink-100">
        <div className="flex items-center justify-between border-b border-ink-100 bg-gradient-to-br from-ink-50 via-white to-brand-50/40 px-5 py-4 md:px-6">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Search filters</p><h2 className="mt-1 text-lg font-bold tracking-tight text-ink-900">Refine results</h2></div>
          {activeFilterCount > 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-100">{activeFilterCount} active</span>}
        </div>

        <div className="vv-explore-filter-body space-y-4 p-4 md:p-5">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Browse by type</p>
              <span className="text-xs text-ink-400">Choose one</span>
            </div>
            <Segmented className="bg-ink-50" value={type} onChange={setType} options={[{ id: 'all', label: 'All' }, { id: 'product', label: 'Products' }, { id: 'service', label: 'Services' }]} />
          </div>

          {chipOptions.length > 0 && (
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Category</p>
              <Chips className="-mx-1 px-1" value={categoryId} onChange={setCategoryId} options={[{ id: 'all', label: 'All categories' }, ...chipOptions]} />
            </div>
          )}

          <div className="rounded-2xl bg-ink-50/75 p-4 ring-1 ring-inset ring-ink-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink-900">Refine your search</p>
                <p className="mt-0.5 text-xs text-ink-500">Optional filters to narrow the results.</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-200">Optional</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input className="!h-11 bg-white" label="Minimum price" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} />
              <Input className="!h-11 bg-white" label="Maximum price" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3">
            <Toggle label="Instant booking only" desc="Show listings you can book without waiting for a reply" on={instantOnly} onChange={setInstantOnly} />
          </div>
        </div>
      </div>
      </aside>
      <div className="vv-explore-listings space-y-3.5">
        <UniversalPanel q={q} country={country} cityId={cityId} signedIn={Boolean(app.me?.loggedIn)} onCategory={setCategoryId} />
        <p className="pt-1 text-[13px] font-bold uppercase tracking-wide text-ink-500">Products and services{(useSamples ? sampleItems.length : visibleItems.length) > 0 && ` (${useSamples ? sampleItems.length : visibleItems.length})`}</p>
        {!useSamples && state.error && <ErrorBox message={state.error} onRetry={() => search()} />}
        {!state.error && !state.loading && !state.marketLive && (
          <Banner tone="amber" title="Not live in this area yet">VendorVerse is not open for search in {locale.city || 'this area'} yet, so nothing is shown. Nothing here is hidden from you.</Banner>
        )}
        {!state.error && state.loading && state.items.length === 0 && <Loading />}
        {useSamples && sampleItems.map((l) => <ResultCard key={l.id} listing={l} sample />)}
        {useSamples && sampleItems.length === 0 && (
          <EmptyState icon={Search} title="No matches" body="Try different words or remove a filter." action={<Button size="sm" onClick={() => nav.go('c_rfq_new')}>Request a quote</Button>} />
        )}
        {!useSamples && !state.loading && !state.error && state.marketLive && visibleItems.length === 0 && (
          <EmptyState icon={Search} title="No matches" body="Try different words or remove a filter. Results never include vendors that do not serve your area." action={<Button size="sm" onClick={() => nav.go('c_rfq_new')}>Request a quote</Button>} />
        )}
        {visibleItems.map((l) => <ResultCard key={l.id} listing={l} onClick={() => nav.go('c_listing', { id: l.id })} onVendorClick={() => nav.go('c_vendor', { id: l.vendor.id, listingId: l.id })} />)}
        {state.nextCursor && !state.loading && <Button full variant="secondary" onClick={() => search(state.nextCursor)}>Show more</Button>}
        {state.nextCursor && state.loading && <Loading />}
      </div>
      </div>
      </div>
    </Screen>
  )
}

/* ================= LISTING DETAIL (F-DSC-05, F-DSC-06, F-DSC-07) ================= */
export function RemoteListingDetail({ params = {} }) {
  const nav = useNav()
  const { me, toast } = useApp()
  const { loading, error, data, reload } = useLoad(() => authService.getPublicListing(params.id), [params.id])
  const [favorite, setFavorite] = useState(false)
  const vendorId = data?.listing?.vendor?.id

  useEffect(() => {
    if (!vendorId || !me?.loggedIn) return
    authService.listFavorites().then((r) => r.ok && setFavorite(r.favorites.some((f) => f.vendorId === vendorId)))
  }, [vendorId, me?.loggedIn])

  const toggleFavorite = async () => {
    if (!me?.loggedIn) return openAuthDialog('signin')
    const r = favorite ? await authService.removeFavorite(vendorId) : await authService.addFavorite(vendorId)
    if (r.ok) setFavorite(!favorite)
    else toast(r.message || 'Could not update your saved vendors.', 'warn')
  }

  if (loading) return <Screen title="Listing"><Loading /></Screen>
  if (error) return <Screen title="Listing">{data === null && /no longer|not found|exist/i.test(error) ? <EmptyState icon={Search} title="Listing not available" body="It may have been paused or removed." /> : <ErrorBox message={error} onRetry={reload} />}</Screen>

  const l = data.listing
  const attrs = Object.entries(l.attributes || {})
  const book = (mode) => (me?.loggedIn ? nav.go('c_book_new', { id: l.id, mode }) : openAuthDialog('signin'))
  return (
    <Screen
      title="Listing"
      right={<button aria-label={favorite ? 'Remove from saved vendors' : 'Save vendor'} onClick={toggleFavorite} className="grid size-10 place-items-center"><Heart size={20} className={favorite ? 'fill-red-500 text-red-500' : 'text-ink-500'} /></button>}
      footer={<div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => book('scheduled')} icon={CalendarClock}>Request booking</Button>
        {l.instantBooking && <Button className="flex-1" onClick={() => book('instant')} icon={Zap}>Book instantly</Button>}
      </div>}
    >
      <div>
        <h2 className="text-lg font-bold text-ink-900">{l.title}</h2>
        <p className="text-sm text-ink-500"><button type="button" className="font-semibold text-brand-700 underline underline-offset-2" onClick={() => nav.go('c_vendor', { id: l.vendor.id, listingId: l.id })}>{l.vendor.name} · View profile & message</button> · {l.categoryName}</p>
        <p className="mt-2 text-base font-semibold text-ink-900">{priceLabel(l.price)}</p>
      </div>
      {l.description ? <p className="text-sm leading-relaxed text-ink-700">{l.description}</p> : <p className="text-sm text-ink-500">The vendor has not added a description.</p>}
      <Card>
        <KV rows={[
          ['Availability', l.availability.state === 'provided' ? `Provided by the vendor (${l.availability.model})` : 'Not provided by the vendor'],
          ['Booking', l.instantBooking ? 'Instant booking available' : 'Vendor confirms each request'],
          ['Roles', l.vendor.roles.length ? l.vendor.roles.join(', ') : 'Not provided'],
        ]} />
      </Card>
      {attrs.length > 0 && <Section title="Details"><Card><KV rows={attrs.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])} /></Card></Section>}
      {l.serviceAreas.length > 0 && <Section title="Where this vendor works"><p className="flex items-center gap-1 text-sm text-ink-700"><MapPin size={14} />{l.serviceAreas.length} service {l.serviceAreas.length === 1 ? 'area' : 'areas'} declared</p></Section>}
    </Screen>
  )
}

/* ================= BOOK (F-BKG-01, F-BKG-02, F-BKG-03, F-BKG-08) ================= */
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export function RemoteBookNew({ params = {} }) {
  const nav = useNav()
  const { toast } = useApp()
  const listing = useLoad(() => authService.getPublicListing(params.id || params.listingId), [params.id, params.listingId])
  const [mode, setMode] = useState(params.mode === 'instant' ? 'instant' : 'scheduled')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [repeat, setRepeat] = useState(1)
  const [windowId, setWindowId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const key = useRef(newKey()) // one key per user action: a double tap or retry makes one booking (F-BKG-08)
  const scrollRef = useRef(null)

  if (listing.loading) return <Screen title="Request a booking"><Loading /></Screen>
  if (listing.error) return <Screen title="Request a booking"><ErrorBox message={listing.error} onRetry={listing.reload} /></Screen>
  const l = listing.data.listing
  const windows = (l.bookableWindows || []).filter((window) => new Date(window.startsAt) > new Date() && window.placesLeft > 0)

  // The Send button lives in a fixed footer, so an error shown only inside the scrolled form can be off-screen
  // and the tap looks like it did nothing. Show it at the top of the form and as a toast.
  const fail = (message) => { setError(message); toast(message, 'warn'); scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }
  const onStart = (value) => {
    setStart(value)
    // Default the end to one hour later so a customer only has to pick a start; they can still change it.
    if (value && (!end || new Date(end) <= new Date(value))) setEnd(toLocalInput(new Date(new Date(value).getTime() + 3600000)))
  }
  const chooseWindow = (id) => {
    setWindowId(id)
  }
  const changeMode = (value) => {
    setMode(value)
    setError('')
    if (value === 'instant') setRepeat(1)
  }

  const submit = async () => {
    setError('')
    const chosenWindow = mode === 'instant' ? windows.find((item) => item.id === windowId) : null
    if (mode === 'instant' && !chosenWindow) return fail('Choose an available time window.')
    if (mode === 'scheduled' && (!start || !end)) return fail('Choose a start and end time.')
    const s = new Date(chosenWindow?.startsAt || start)
    const e = new Date(chosenWindow?.endsAt || end)
    if (!(e > s)) return fail('The end time must be after the start.')
    if (s <= new Date()) return fail('Choose a time in the future.')
    const week = 7 * 86400000
    const body = {
      listingId: l.id,
      mode,
      timeZone: deviceZone(), // the times above are in this device's zone, so say so explicitly
      requestedTerms: notes.trim() ? { notes: notes.trim() } : {},
      ...(repeat > 1
        ? { recurrence: { rule: `FREQ=WEEKLY;COUNT=${repeat}`, occurrences: Array.from({ length: repeat }, (_, i) => ({ slotStart: new Date(s.getTime() + i * week).toISOString(), slotEnd: new Date(e.getTime() + i * week).toISOString() })) } }
        : { slotStart: s.toISOString(), slotEnd: e.toISOString() }),
    }
    setBusy(true)
    const r = await authService.createBooking(body, key.current)
    setBusy(false)
    if (!r.ok) {
      if (r.status === 409) {
        key.current = newKey() // a different attempt may now be valid
        if (mode === 'instant') {
          setWindowId('')
          listing.reload()
        }
      }
      return fail(r.status === 409 ? 'That time is no longer available. Choose another one.' : r.message || 'Could not create the booking.')
    }
    toast(r.bookings[0].state === 'confirmed' ? 'Booking confirmed' : 'Request sent to the vendor')
    nav.replace('c_booking', { id: r.bookings[0].id })
  }

  return (
    <Screen title={mode === 'instant' ? 'Instant booking' : 'Request a booking'} subtitle={l.title} footer={<Button full disabled={busy} onClick={submit}>{busy ? 'Sending…' : mode === 'instant' ? 'Confirm booking' : 'Send request'}</Button>}>
      <div ref={scrollRef}>{error && <Banner tone="red" title="Cannot book">{error}</Banner>}</div>
      {l.instantBooking && <Segmented value={mode} onChange={changeMode} options={[{ id: 'scheduled', label: 'Request' }, { id: 'instant', label: 'Instant' }]} />}
      <Card><KV rows={[['Vendor', l.vendor.name], ['Price', priceLabel(l.price)]]} /></Card>
      {mode === 'instant' ? <Section title="Available time windows">
        {windows.length ? <div className="space-y-2">{windows.map((window) => <button key={window.id} type="button" aria-pressed={windowId === window.id} onClick={() => chooseWindow(window.id)} className={cx('w-full rounded-xl border p-3 text-left text-sm transition', windowId === window.id ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400')}>
          <span className="font-semibold">{fmtWhen(window.startsAt, deviceZone())} to {fmtWhen(window.endsAt, deviceZone())}</span>
          <span className="ml-2 text-xs">{window.placesLeft} {window.placesLeft === 1 ? 'place' : 'places'} left</span>
        </button>)}</div> : <Banner tone="amber" title="No instant times available">Try a scheduled request or check again later.</Banner>}
      </Section> : <>
        <Input label="Start" type="datetime-local" min={toLocalInput(new Date())} value={start} onChange={(e) => onStart(e.target.value)} required />
        <Input label="End" type="datetime-local" min={start || toLocalInput(new Date())} value={end} onChange={(e) => setEnd(e.target.value)} required hint={`Times are in your device's time zone (${deviceZone()}).`} />
      </>}
      {mode === 'scheduled' && <Select2 label="Repeat" value={repeat} onChange={setRepeat} />}
      <Input label="Notes for the vendor" textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Address, access details, anything the vendor needs." />
      {mode === 'instant'
        ? <Banner tone="teal" title="Confirmed straight away">The slot is reserved for you the moment you confirm. If someone else takes it first, you will be told and can choose another time.</Banner>
        : <Banner tone="blue" title="The vendor must accept">Your request is sent only to this vendor. The terms you see now are saved with the booking and stay in force until the vendor accepts any change.</Banner>}
    </Screen>
  )
}

function Select2({ label, value, onChange }) {
  const opts = [{ id: 1, label: 'Once' }, { id: 4, label: 'Weekly x4' }, { id: 8, label: 'Weekly x8' }]
  return <div><p className="mb-2 text-[13px] font-semibold text-ink-700">{label}</p><Chips scroll={false} value={value} onChange={onChange} options={opts} /></div>
}

/* ================= BOOKING DETAIL + ACTIONS (F-BKG-04..07, F-BKG-09) ================= */
export function RemoteBookingDetail({ params = {} }) {
  const nav = useNav()
  const { toast } = useApp()
  const { loading, error, data, reload } = useLoad(() => authService.getBooking(params.id), [params.id])
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [panel, setPanel] = useState(null) // 'decline' | 'cancel' | 'modify'
  const [change, setChange] = useState({ start: '', end: '', note: '' })

  if (loading && !data) return <Screen title="Booking"><Loading /></Screen>
  if (error) return <Screen title="Booking"><ErrorBox message={error} onRetry={reload} /></Screen>
  const b = data.booking
  const isVendor = b.viewerRole === 'vendor'
  const proposal = b.openModification

  const act = async (fn, okMessage) => {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (!r.ok) return toast(r.message || 'That did not work.', 'warn')
    toast(okMessage)
    setPanel(null)
    setReason('')
    reload()
  }
  const doAction = (name, body, msg) => act(() => authService.bookingAction(b.id, name, body), msg)
  const propose = () => {
    if (change.start && !change.end) return toast('Add an end time too.', 'warn')
    const body = { proposedTerms: change.note.trim() ? { notes: change.note.trim() } : {}, ...(change.start ? { slotStart: new Date(change.start).toISOString(), slotEnd: new Date(change.end).toISOString(), timeZone: deviceZone() } : {}) }
    return act(() => authService.proposeBookingModification(b.id, body), 'Change proposed. The original terms stay until it is accepted.')
  }

  return (
    <Screen title="Booking" subtitle={b.listingTitle} back>
      <div className="flex items-center gap-2"><StateBadge s={b.state} />{b.mode === 'instant' && <Badge tone="teal"><Zap size={11} /> Instant</Badge>}{b.seriesId && <Badge tone="gray">Series #{b.occurrenceNumber}</Badge>}</div>
      <Card>
        <KV rows={[
          [isVendor ? 'Customer' : 'Vendor', (isVendor ? b.customerName : b.vendorName) || 'Not provided'],
          ['When', b.slotStart ? `${fmtWhen(b.slotStart, b.timeZone)} to ${fmtWhen(b.slotEnd, b.timeZone)}` : 'Time not set'],
          ...(b.timeZone ? [['Time zone', b.timeZone]] : []),
          ...(b.requestedTerms?.notes ? [['Notes', b.requestedTerms.notes]] : []),
          ...(b.responseDueAt && b.state === 'requested' ? [['Vendor should reply by', fmtWhen(b.responseDueAt)]] : []),
          ...(b.confirmationDueAt && b.state === 'completed_awaiting' ? [['Confirm or report by', fmtWhen(b.confirmationDueAt)]] : []),
          ...(b.declineReason ? [['Decline reason', b.declineReason]] : []),
          ...(b.cancelledBy ? [['Cancelled by', `${b.cancelledBy}${b.cancellationReason ? `: ${b.cancellationReason}` : ''}`]] : []),
        ]} />
      </Card>

      {b.conflictingBookingIds?.length > 0 && (
        <Banner tone="amber" title="This overlaps another booking of yours">Nothing has been cancelled. You choose which to keep.
          <div className="mt-2 flex flex-wrap gap-2">{b.conflictingBookingIds.map((id) => <Button key={id} size="sm" variant="secondary" onClick={() => nav.go('c_booking', { id })}>Open the other booking</Button>)}</div>
        </Banner>
      )}

      {proposal && (
        <Banner tone="blue" title={proposal.proposedBy === b.viewerRole ? 'You proposed a change' : `The ${proposal.proposedBy} proposed a change`}
          action={<div className="flex gap-2">
            {proposal.proposedBy === b.viewerRole
              ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => authService.decideBookingModification(b.id, proposal.id, 'withdraw'), 'Proposal withdrawn')}>Withdraw</Button>
              : <>
                <Button size="sm" disabled={busy} onClick={() => act(() => authService.decideBookingModification(b.id, proposal.id, 'accept'), 'Change accepted')}>Accept</Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => authService.decideBookingModification(b.id, proposal.id, 'decline'), 'Change declined')}>Decline</Button>
              </>}
          </div>}>
          {proposal.proposedTerms?.slot ? `New time: ${fmtWhen(proposal.proposedTerms.slot.slotStart, proposal.proposedTerms.slot.timeZone)}. ` : ''}{proposal.proposedTerms?.notes || ''} The original terms stay in force until it is accepted.
        </Banner>
      )}

      <div className="space-y-2">
        {isVendor && b.state === 'requested' && <><Button full disabled={busy} onClick={() => doAction('accept', undefined, 'Booking accepted')}>Accept</Button><Button full variant="secondary" onClick={() => setPanel('decline')}>Decline</Button></>}
        {isVendor && b.state === 'confirmed' && <Button full disabled={busy} onClick={() => doAction('start', undefined, 'Marked in progress')}>Start work</Button>}
        {isVendor && (b.state === 'confirmed' || b.state === 'in_progress') && <Button full variant={b.state === 'confirmed' ? 'secondary' : 'primary'} disabled={busy} onClick={() => doAction('complete', undefined, 'Marked complete. The customer has 7 days to confirm.')}>Mark complete</Button>}
        {!isVendor && b.state === 'completed_awaiting' && <Button full disabled={busy} onClick={() => doAction('confirm', undefined, 'Thanks, booking closed')}>Confirm completion</Button>}
        {(b.state === 'requested' || b.state === 'confirmed') && !proposal && <Button full variant="secondary" onClick={() => setPanel('modify')}>Propose a change</Button>}
        {(b.state === 'requested' || b.state === 'confirmed') && <Button full variant="dangerSoft" onClick={() => setPanel('cancel')}>Cancel booking</Button>}
      </div>

      {panel === 'decline' && <Card><Input label="Reason for declining" textarea value={reason} onChange={(e) => setReason(e.target.value)} required /><Button className="mt-3" full disabled={busy || !reason.trim()} onClick={() => doAction('decline', { reason: reason.trim() }, 'Booking declined')}>Decline booking</Button></Card>}
      {panel === 'cancel' && (
        <Card>
          <p className="mb-2 text-xs text-ink-500">No automatic penalty is applied. The outcome is recorded.</p>
          <Input label="Reason (optional)" textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button className="mt-3" full variant="danger" disabled={busy} onClick={() => doAction('cancel', { reason: reason.trim() || undefined }, 'Booking cancelled')}>{b.seriesId && !isVendor ? 'Cancel this booking only' : 'Cancel booking'}</Button>
          {b.seriesId && !isVendor && <Button className="mt-2" full variant="dangerSoft" disabled={busy} onClick={() => doAction('cancel', { reason: reason.trim() || undefined, cancelSeries: true }, 'This and later bookings cancelled')}>Cancel this and all later bookings in the series</Button>}
        </Card>
      )}
      {panel === 'modify' && (
        <Card>
          <div className="space-y-3">
            <Input label="New start (optional)" type="datetime-local" value={change.start} onChange={(e) => setChange({ ...change, start: e.target.value })} />
            <Input label="New end" type="datetime-local" value={change.end} onChange={(e) => setChange({ ...change, end: e.target.value })} hint={`Times are in your device's time zone (${deviceZone()}).`} />
            <Input label="Note" textarea value={change.note} onChange={(e) => setChange({ ...change, note: e.target.value })} />
            <Button full disabled={busy || (!change.start && !change.note.trim())} onClick={propose}>Send proposal</Button>
          </div>
        </Card>
      )}

      {b.termsSnapshot && <Section title="Terms saved at booking"><Card><KV rows={[['Listing', b.termsSnapshot.terms.listingTitle], ['Price then', priceLabel({ state: b.termsSnapshot.terms.price?.onRequest ? 'on_request' : b.termsSnapshot.terms.price?.minMinor != null || b.termsSnapshot.terms.price?.maxMinor != null ? 'stated' : 'not_provided', ...(b.termsSnapshot.terms.price || {}) })], ['Cancellation policy', b.termsSnapshot.policy?.cancellationPolicyId || 'Not provided']]} /></Card></Section>}
      <Section title="History">
        <Card>{b.events.map((e, i) => <ListRow key={i} title={e.type.replaceAll('_', ' ')} subtitle={`${fmtWhen(e.occurredAt)}${e.toState ? ` · ${(BOOKING_STATUS[e.toState] || [e.toState])[0]}` : ''}`} last={i === b.events.length - 1} />)}</Card>
      </Section>
    </Screen>
  )
}

/* ================= LISTS: customer activity and vendor inbox (F-BKG-09, F-BKG-10) ================= */
const FILTERS = [{ id: 'all', label: 'All' }, { id: 'requested', label: 'Requested' }, { id: 'confirmed', label: 'Confirmed' }, { id: 'in_progress', label: 'In progress' }, { id: 'completed_awaiting', label: 'To confirm' }, { id: 'closed', label: 'Closed' }, { id: 'cancelled', label: 'Cancelled' }]

/** Filter chips plus booking cards for an already-loaded list (shared by BookingList and the customer Activity tabs). */
export function BookingRows({ state, empty, detail }) {
  const nav = useNav()
  const [filter, setFilter] = useState('all')
  const { loading, error, data, reload } = state
  const all = data?.bookings || []
  const rows = all.filter((b) => filter === 'all' || b.state === filter)
  return (
    <>
      <div className="bg-white px-4 py-3"><Chips value={filter} onChange={setFilter} options={FILTERS} /></div>
      <div className="space-y-3 p-4">
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && rows.length === 0 && <EmptyState icon={CalendarClock} title="No bookings" body={empty} />}
        {rows.map((b) => (
          <Card key={b.id} onClick={() => nav.go(detail, { id: b.id })}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-[15px] font-bold text-ink-900">{b.listingTitle}</p><p className="truncate text-xs text-ink-500">{b.viewerRole === 'vendor' ? b.customerName || 'Customer' : b.vendorName}</p></div>
              <StateBadge s={b.state} />
            </div>
            <p className="mt-2 text-xs text-ink-600">{b.slotStart ? fmtWhen(b.slotStart, b.timeZone) : 'Time not set'}{b.seriesId ? ` · Series #${b.occurrenceNumber}` : ''}</p>
          </Card>
        ))}
      </div>
    </>
  )
}

export function BookingList({ title, back, load, empty, detail, children }) {
  const state = useLoad(load, [load])
  return (
    <Screen title={title} back={back} pad={false}>
      {children}
      <BookingRows state={state} empty={empty} detail={detail} />
    </Screen>
  )
}

/** Customer activity hub: bookings from the API. RFQs, orders and contracts join when their APIs exist (F-BKG-10). */
export function RemoteCustomerBookings() {
  const load = useCallback(() => authService.listMyBookings(), [])
  return <BookingList title="Activity" back={false} load={load} detail="c_booking" empty="When you book a service it shows up here." />
}

/** Vendor inbox: only this vendor's bookings, never competing requests (F-BKG-08, F-BKG-09). */
export function RemoteVendorBookings() {
  const mine = useLoad(() => authService.listMyVendors(), [])
  const vendorId = mine.data?.vendors?.[0]?.id
  const load = useCallback(() => (vendorId ? authService.listVendorBookings(vendorId) : Promise.resolve({ ok: true, bookings: [] })), [vendorId])
  if (mine.loading) return <Screen title="Work" back={false}><Loading /></Screen>
  if (mine.error) return <Screen title="Work" back={false}><ErrorBox message={mine.error} onRetry={mine.reload} /></Screen>
  return <BookingList title="Work" back={false} load={load} detail="v_booking" empty={vendorId ? 'Booking requests for your listings appear here.' : 'Register your business to receive bookings.'} />
}

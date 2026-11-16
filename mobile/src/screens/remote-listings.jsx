/*
 * Real-API vendor listing management (F-VND-05, F-VND-06, F-VND-08): my listings,
 * create / edit, submit / pause / resume / unpublish, the publication checklist and
 * availability with capacity windows. Same file on web and mobile; used instead of
 * the seed-data screens when VITE_API_BASE_URL is set (see the registry, `live(...)`).
 *
 * Nothing here invents a value: a price the vendor does not give is saved as not
 * provided (or "on request" when they choose it), never as zero. A listing is a draft
 * and never public until it is submitted and approved. A publication gate the backend
 * cannot evaluate yet is shown as such and is not treated as met. The plan limit,
 * category attribute schema and photos are not enforced by the backend, so they are
 * not offered here.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { CalendarClock, Package, Plus } from 'lucide-react'
import { Badge, Banner, Button, Card, Dialog, EmptyState, Input, KV, Screen, Section, Segmented, Select, Toggle } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { ErrorBox, Loading, fmtWhen, minorToText, priceLabel, useLoad } from './remote-discovery.jsx'

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

const LISTING_STATE = {
  draft: ['Draft', 'gray'], pending_review: ['In review', 'blue'], approved: ['Live', 'green'], changes_requested: ['Changes requested', 'amber'],
  rejected: ['Rejected', 'red'], paused: ['Paused', 'gray'], unpublished: ['Unpublished', 'gray'],
}
const GATE_LABEL = {
  account_state: 'Account in good standing', content_review: 'Content approved by review', subscription: 'Active subscription',
  category_verification: 'Category verification', required_fields_and_service_area: 'Required fields and a service area', no_holds: 'No holds or open cases',
}
const DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']]

const StateBadge = ({ s }) => { const [label, tone] = LISTING_STATE[s] || [String(s).replace(/_/g, ' '), 'gray']; return <Badge tone={tone}>{label}</Badge> }
const text = (v) => (typeof v === 'string' && v.trim() ? v : null)

/** Price as the listing states it: a range, "on request" or "not provided" (F-DSC-05). */
const listingPrice = (l) => priceLabel(l.priceOnRequest ? { state: 'on_request' } : l.priceMinMinor === null && l.priceMaxMinor === null ? { state: 'not_provided' } : { state: 'stated', minMinor: l.priceMinMinor, maxMinor: l.priceMaxMinor, currency: l.priceCurrency, unit: l.priceUnit })

/** The signed-in vendor owner's first vendor profile. */
function useMyVendor() {
  const mine = useLoad(() => authService.listMyVendors(), [])
  return { loading: mine.loading, error: mine.error, reload: mine.reload, vendor: mine.data?.vendors?.[0] || null }
}

/* ================= MY LISTINGS (F-VND-06) ================= */
export function RemoteVendorListings() {
  const nav = useNav()
  const mine = useMyVendor()
  const vendorId = mine.vendor?.id
  const [tab, setTab] = useState('all')
  const listings = useLoad(() => (vendorId ? authService.listVendorListings(vendorId) : Promise.resolve({ ok: true, listings: [] })), [vendorId])
  const add = <Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('v_listing_edit')}>Add</Button>
  if (mine.loading) return <Screen title="My listings" back={false}><Loading /></Screen>
  if (mine.error) return <Screen title="My listings" back={false}><ErrorBox message={mine.error} onRetry={mine.reload} /></Screen>
  if (!vendorId) return <Screen title="My listings" back={false}><EmptyState icon={Package} title="Register your business first" body="You need a vendor account before you can create listings." /></Screen>
  const all = listings.data?.listings || []
  const groups = {
    live: (l) => l.contentState === 'approved',
    review: (l) => ['pending_review', 'changes_requested'].includes(l.contentState),
    other: (l) => ['draft', 'paused', 'unpublished', 'rejected'].includes(l.contentState),
  }
  const shown = all.filter((l) => tab === 'all' || groups[tab](l))
  return (
    <Screen title="My listings" back={false} right={add}>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'all', label: 'All', count: all.length }, { id: 'live', label: 'Live', count: all.filter(groups.live).length }, { id: 'review', label: 'Review', count: all.filter(groups.review).length }, { id: 'other', label: 'Other', count: all.filter(groups.other).length }]} />
      {listings.loading && !listings.data && <Loading />}
      {listings.error && <ErrorBox message={listings.error} onRetry={listings.reload} />}
      {listings.data && !shown.length && <EmptyState icon={Package} title="No listings here" body="Create a listing. It stays a draft until you submit it and it is approved." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
      <div className="space-y-2.5">
        {shown.map((l) => (
          <Card key={l.id} onClick={() => nav.go('v_listing_edit', { id: l.id })}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="line-clamp-2 text-[15px] font-bold text-ink-900">{l.title}</p><p className="mt-0.5 text-sm font-semibold text-ink-700">{listingPrice(l)}</p><p className="text-xs text-ink-500">{l.listingType === 'product' ? 'Product' : 'Service'}</p></div>
              <StateBadge s={l.contentState} />
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  )
}

/* ================= ADD / EDIT A LISTING (F-VND-06) ================= */
const toMinor = (v) => Math.round(Number(v) * 100)
const fromMinor = (m) => (m === null || m === undefined ? '' : String(m / 100))

export function RemoteListingEdit({ params = {} }) {
  const nav = useNav()
  const app = useApp()
  const { toast } = app
  const locale = app.locale ?? app.loc ?? {}
  const country = locale.country || 'IN'
  const mine = useMyVendor()
  const existing = useLoad(() => (params.id ? authService.getListing(params.id) : Promise.resolve({ ok: true, listing: null })), [params.id])
  const cities = useLoad(() => authService.listCities(country), [country])
  const cityId = useMemo(() => cities.data?.cities?.find((c) => c.name === locale.city)?.id, [cities.data, locale.city])
  const categories = useLoad(() => authService.listCategories({ countryCode: country, cityId }), [country, cityId])
  const key = useRef(newKey()) // one idempotency key per form, so a retry cannot create a second listing
  const [f, setF] = useState(null)
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [savedId, setSavedId] = useState(null)

  const l = existing.data?.listing
  const id = params.id || savedId
  // Fill the form once the listing (or nothing, for a new one) is known.
  if (!f && !existing.loading && !existing.error) {
    setF(l
      ? { categoryId: l.categoryId, subcategoryId: l.subcategoryId || '', listingType: l.listingType, title: l.title, description: l.description || '', priceMode: l.priceOnRequest ? 'request' : l.priceMinMinor === null && l.priceMaxMinor === null ? 'none' : 'stated', min: fromMinor(l.priceMinMinor), max: fromMinor(l.priceMaxMinor), unit: l.priceUnit || '', timeZone: l.timeZone || deviceZone() }
      : { categoryId: '', subcategoryId: '', listingType: 'service', title: '', description: '', priceMode: 'none', min: '', max: '', unit: '', timeZone: deviceZone() })
  }
  if (mine.loading || existing.loading || !f) return <Screen title={params.id ? 'Edit listing' : 'Add listing'}><Loading /></Screen>
  if (existing.error) return <Screen title="Edit listing"><ErrorBox message={existing.error} onRetry={existing.reload} /></Screen>
  if (!mine.vendor) return <Screen title="Add listing"><EmptyState icon={Package} title="Register your business first" body="You need a vendor account before you can create listings." /></Screen>

  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e })); setErrs((x) => ({ ...x, [k]: '' })) }
  const cats = categories.data?.categories || []
  const category = cats.find((c) => c.categoryId === f.categoryId)
  const state = l?.contentState

  const body = () => {
    const out = { title: f.title.trim(), timeZone: f.timeZone, ...(f.description.trim() ? { description: f.description.trim() } : {}) }
    if (f.priceMode === 'request') out.priceOnRequest = true
    else if (f.priceMode === 'stated') {
      out.priceOnRequest = false
      out.priceMinMinor = toMinor(f.min)
      out.priceMaxMinor = f.max !== '' ? toMinor(f.max) : toMinor(f.min)
      out.priceCurrency = 'INR'
      if (f.unit.trim()) out.priceUnit = f.unit.trim()
    }
    return out
  }
  const validate = () => {
    const e = {}
    if (!id && !f.categoryId) e.categoryId = 'Choose a category'
    if (f.title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (f.priceMode === 'stated') {
      if (f.min === '' || !(Number(f.min) >= 0)) e.min = 'Enter the price'
      else if (f.max !== '' && Number(f.max) < Number(f.min)) e.max = 'The maximum cannot be below the minimum'
    }
    setErrs(e)
    return !Object.keys(e).length
  }

  /** Saves the draft (create or edit); returns the listing id, or null when it failed. */
  const save = async () => {
    if (!validate()) { toast('Please complete the required fields', 'warn'); return null }
    setBusy(true)
    setFailure('')
    const r = id
      ? await authService.updateListing(id, body())
      : await authService.createListing(mine.vendor.id, { categoryId: f.categoryId, ...(f.subcategoryId ? { subcategoryId: f.subcategoryId } : {}), listingType: f.listingType, ...body() }, key.current)
    setBusy(false)
    if (!r.ok) { setFailure(r.message); return null }
    setSavedId(r.listing.id)
    return r.listing.id
  }
  const saveDraft = async () => {
    const lid = await save()
    if (!lid) return
    toast('Saved')
    if (!id) nav.replace('v_listing_edit', { id: lid })
    else existing.reload()
  }
  const submit = async () => {
    const lid = await save()
    if (!lid) return
    setBusy(true)
    const r = await authService.listingTransition(lid, 'submit')
    setBusy(false)
    if (!r.ok) return setFailure(`${r.message} Your changes are saved as a draft.`)
    toast('Submitted for review')
    nav.replace('v_listing_gate', { listingId: lid })
  }
  const transition = (t, done) => async () => {
    setConfirm(null)
    setBusy(true)
    setFailure('')
    const r = await authService.listingTransition(id, t)
    setBusy(false)
    if (!r.ok) return setFailure(r.message)
    toast(done)
    existing.reload()
  }

  const canSubmit = !state || ['draft', 'changes_requested'].includes(state)
  return (
    <Screen
      title={id ? 'Edit listing' : 'Add listing'}
      subtitle={state ? undefined : 'Saved as a draft until you submit it'}
      right={state ? <StateBadge s={state} /> : undefined}
      footer={<div className="flex gap-2"><Button full variant="secondary" disabled={busy} onClick={saveDraft}>{busy ? 'Saving…' : state && !canSubmit ? 'Save changes' : 'Save draft'}</Button>{canSubmit && <Button full disabled={busy} onClick={submit}>Submit for review</Button>}</div>}
    >
      {failure && <Banner tone="red" title="Could not save">{failure}</Banner>}
      {state === 'approved' && <Banner tone="amber" title="This listing is live">Editing it sends it back to review. It stays hidden from customers until it is approved again.</Banner>}
      {state === 'changes_requested' && <Banner tone="amber" title="Changes requested">Update the listing, then submit it again.</Banner>}
      {categories.error && <ErrorBox message={categories.error} onRetry={categories.reload} />}
      {id
        ? <Card><KV rows={[['Category', category?.name || 'Fixed when the listing was created'], ['Type', f.listingType === 'product' ? 'Product' : 'Service']]} /></Card>
        : (
          <>
            <Select label="Category" required value={f.categoryId} error={errs.categoryId} onChange={(e) => setF((x) => ({ ...x, categoryId: e.target.value, subcategoryId: '' }))} options={[{ value: '', label: categories.loading ? 'Loading…' : cats.length ? 'Choose a category' : 'No category is available in your market yet' }, ...cats.map((c) => ({ value: c.categoryId, label: c.name }))]} />
            {category?.subcategories?.length > 0 && <Select label="Subcategory (optional)" value={f.subcategoryId} onChange={set('subcategoryId')} options={[{ value: '', label: 'None' }, ...category.subcategories.map((s) => ({ value: s.subcategoryId, label: s.name }))]} />}
            <Segmented value={f.listingType} onChange={(v) => setF((x) => ({ ...x, listingType: v }))} options={[{ id: 'service', label: 'Service' }, { id: 'product', label: 'Product' }]} />
          </>
        )}
      <Input label="Title" required placeholder="e.g. Kitchen pipe leak repair" value={f.title} onChange={set('title')} error={errs.title} />
      <Input label="Description (optional)" textarea value={f.description} onChange={set('description')} />
      <Segmented value={f.priceMode} onChange={(v) => setF((x) => ({ ...x, priceMode: v }))} options={[...(l && (l.priceOnRequest || l.priceMinMinor !== null || l.priceMaxMinor !== null) ? [] : [{ id: 'none', label: 'No price' }]), { id: 'stated', label: 'Price' }, { id: 'request', label: 'On request' }]} />
      {f.priceMode === 'none' && <p className="text-xs text-ink-500">Customers will see "Price not provided".</p>}
      {f.priceMode === 'request' && <p className="text-xs text-ink-500">Customers will see "Price on request".</p>}
      {f.priceMode === 'stated' && (
        <div className="space-y-3">
          <div className="flex gap-3"><Input label="From (₹)" required inputMode="decimal" value={f.min} onChange={set('min')} error={errs.min} /><Input label="To (₹, optional)" inputMode="decimal" value={f.max} onChange={set('max')} error={errs.max} /></div>
          <Input label="Per (optional)" placeholder="e.g. hour, piece" value={f.unit} onChange={set('unit')} />
        </div>
      )}
      <Input label="Time zone" hint="Used for availability and booking times." value={f.timeZone} onChange={set('timeZone')} />
      {id && (
        <Section title="More">
          <div className="space-y-2">
            <Button full variant="secondary" onClick={() => nav.go('v_avail', { id })}>Availability and capacity</Button>
            <Button full variant="secondary" onClick={() => nav.go('v_listing_gate', { listingId: id })}>Publication checklist</Button>
            {state === 'approved' && <Button full variant="secondary" disabled={busy} onClick={() => setConfirm('pause')}>Pause listing</Button>}
            {state === 'paused' && <Button full variant="secondary" disabled={busy} onClick={transition('resume', 'Listing resumed')}>Resume listing</Button>}
            {['approved', 'paused'].includes(state) && <Button full variant="secondary" disabled={busy} onClick={() => setConfirm('unpublish')}>Unpublish listing</Button>}
          </div>
        </Section>
      )}
      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm === 'pause' ? 'Pause this listing?' : 'Unpublish this listing?'} actions={<><Button variant="secondary" full onClick={() => setConfirm(null)}>Keep it</Button><Button full onClick={transition(confirm, confirm === 'pause' ? 'Listing paused' : 'Listing unpublished')}>{confirm === 'pause' ? 'Pause' : 'Unpublish'}</Button></>}>
        <p>{confirm === 'pause' ? 'Customers cannot find or book it until you resume it.' : 'Customers will no longer see it. The server decides whether it can be published again.'}</p>
      </Dialog>
    </Screen>
  )
}

/* ================= PUBLICATION CHECKLIST (F-VND-05) ================= */
export function RemoteListingGate({ params = {} }) {
  const mine = useMyVendor()
  const vendorId = mine.vendor?.id
  const gates = useLoad(() => (vendorId ? authService.getPublicationGates(vendorId, params.listingId) : Promise.resolve({ ok: true, gates: null })), [vendorId, params.listingId])
  if (mine.loading || (gates.loading && !gates.data)) return <Screen title="Publication checklist"><Loading /></Screen>
  if (mine.error || gates.error) return <Screen title="Publication checklist"><ErrorBox message={mine.error || gates.error} onRetry={mine.error ? mine.reload : gates.reload} /></Screen>
  if (!vendorId) return <Screen title="Publication checklist"><EmptyState icon={Package} title="Register your business first" body="Gates are checked for your vendor account." /></Screen>
  const g = gates.data.gates
  const met = g.gates.filter((x) => x.met === true).length
  return (
    <Screen title="Publication checklist" subtitle={`${met} of ${g.gates.length} gates met`}>
      <Banner tone={g.canPublish ? 'green' : 'amber'} title={g.canPublish ? 'You can publish' : 'Some gates are open'}>These are computed live each time and never stored. A gate that cannot be checked yet keeps publishing blocked.</Banner>
      <div className="space-y-2.5">
        {g.gates.map((x) => (
          <Card key={x.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[15px] font-bold text-ink-900">{GATE_LABEL[x.id] || x.id.replace(/_/g, ' ')}</p><p className="mt-0.5 text-xs text-ink-500">{x.detail}</p></div>
              {x.met === true ? <Badge tone="green">Met</Badge> : x.met === false ? <Badge tone="red">Not met</Badge> : <Badge tone="gray">Cannot be checked yet</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  )
}

/* ================= AVAILABILITY AND CAPACITY (F-VND-08) ================= */
const emptyWeek = () => Object.fromEntries(DAYS.map(([k]) => [k, { on: false, start: '09:00', end: '18:00' }]))

export function RemoteAvailability({ params = {} }) {
  const app = useApp()
  const { toast } = app
  const country = (app.locale ?? app.loc ?? {}).country || 'IN'
  const mine = useMyVendor()
  const vendorId = mine.vendor?.id
  const all = useLoad(() => (vendorId ? authService.listVendorListings(vendorId) : Promise.resolve({ ok: true, listings: [] })), [vendorId])
  const [pick, setPick] = useState(params.id || '')
  const listingId = pick || (all.data?.listings?.length === 1 ? all.data.listings[0].id : '')
  if (mine.loading || (all.loading && !all.data)) return <Screen title="Availability"><Loading /></Screen>
  if (mine.error || all.error) return <Screen title="Availability"><ErrorBox message={mine.error || all.error} onRetry={mine.error ? mine.reload : all.reload} /></Screen>
  const listings = all.data?.listings || []
  if (!vendorId || !listings.length) return <Screen title="Availability"><EmptyState icon={CalendarClock} title="No listing yet" body="Create a listing first. Availability and capacity belong to a listing." /></Screen>
  return (
    <Screen title="Availability" subtitle="When customers can book you">
      {listings.length > 1 && <Select label="Listing" value={listingId} onChange={(e) => setPick(e.target.value)} options={[{ value: '', label: 'Choose a listing' }, ...listings.map((x) => ({ value: x.id, label: x.title }))]} />}
      {listingId
        ? <AvailabilityEditor key={listingId} listing={listings.find((x) => x.id === listingId)} toast={toast} country={country} />
        : <p className="text-sm text-ink-500">Choose a listing to set its hours.</p>}
    </Screen>
  )
}

function AvailabilityEditor({ listing, toast, country }) {
  const rule = useLoad(() => authService.getListingAvailability(listing.id), [listing.id])
  const category = useLoad(() => authService.getCategory(listing.categoryId, { countryCode: country }), [listing.categoryId, country])
  const windows = useLoad(() => authService.listListingCapacity(listing.id), [listing.id])
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [win, setWin] = useState(null)

  const models = category.data?.category?.configuration?.availabilityModels
  const modelList = Array.isArray(models) ? models.map((m) => (typeof m === 'string' ? m : m.code || m.id || m.name)).filter(Boolean) : models && typeof models === 'object' ? Object.keys(models) : []
  if (!f && !rule.loading && !rule.error) {
    const r = rule.data?.availability
    const week = emptyWeek()
    if (r?.weeklySchedule) for (const [k] of DAYS) { const first = r.weeklySchedule[k]?.[0]; if (first) week[k] = { on: true, start: first.start, end: first.end } }
    setF({ model: r?.availabilityModel || '', timeZone: r?.timeZone || listing.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, week, saved: Boolean(r) })
  }
  if (!f || category.loading) return <Loading />
  if (rule.error) return <ErrorBox message={rule.error} onRetry={rule.reload} />

  const setDay = (k, patch) => setF((x) => ({ ...x, week: { ...x.week, [k]: { ...x.week[k], ...patch } } }))
  const saveRule = async () => {
    if (!f.model) return toast('Choose an availability model', 'warn')
    const days = DAYS.filter(([k]) => f.week[k].on)
    if (days.some(([k]) => !(f.week[k].start < f.week[k].end))) return toast('Each day must start before it ends', 'warn')
    setBusy(true)
    setFailure('')
    const weeklySchedule = Object.fromEntries(DAYS.map(([k]) => [k, f.week[k].on ? [{ start: f.week[k].start, end: f.week[k].end }] : []]))
    const r = await authService.saveListingAvailability(listing.id, { availabilityModel: f.model, timeZone: f.timeZone, weeklySchedule })
    setBusy(false)
    if (!r.ok) return setFailure(r.message)
    setF((x) => ({ ...x, saved: true }))
    toast('Availability saved')
  }
  const clearRule = async () => {
    const r = await authService.clearListingAvailability(listing.id)
    if (!r.ok) return setFailure(r.message)
    setF({ model: f.model, timeZone: f.timeZone, week: emptyWeek(), saved: false })
    toast('Availability cleared')
  }
  const addWindow = async () => {
    if (!win.startsAt || !win.endsAt || !(win.startsAt < win.endsAt)) return toast('Choose a start before the end', 'warn')
    if (!Number.isInteger(Number(win.capacity)) || Number(win.capacity) < 0) return toast('Capacity must be a whole number', 'warn')
    const r = await authService.addListingCapacity(listing.id, { startsAt: new Date(win.startsAt).toISOString(), endsAt: new Date(win.endsAt).toISOString(), capacity: Number(win.capacity) })
    if (!r.ok) return setFailure(r.message)
    setWin(null)
    toast('Capacity window added')
    windows.reload()
  }
  const removeWindow = async (id) => {
    const r = await authService.removeListingCapacity(listing.id, id)
    if (!r.ok) return setFailure(r.message)
    toast('Window removed')
    windows.reload()
  }

  return (
    <div className="space-y-3">
      {failure && <Banner tone="red" title="Could not save">{failure}</Banner>}
      {category.error && <Banner tone="amber" title="Availability models not loaded">{category.error}</Banner>}
      <Section title="Weekly hours">
        <Card className="space-y-3">
          <Select label="Availability model" required value={f.model} onChange={(e) => setF((x) => ({ ...x, model: e.target.value }))} options={[{ value: '', label: modelList.length ? 'Choose a model' : 'This category has no availability model configured' }, ...modelList.map((m) => ({ value: m, label: String(m).replace(/_/g, ' ') }))]} />
          <Input label="Time zone" value={f.timeZone} onChange={(e) => setF((x) => ({ ...x, timeZone: e.target.value }))} />
          {DAYS.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Toggle label={label} on={f.week[k].on} onChange={(v) => setDay(k, { on: v })} />
              {f.week[k].on && <div className="flex gap-3"><Input label="From" type="time" value={f.week[k].start} onChange={(e) => setDay(k, { start: e.target.value })} /><Input label="To" type="time" value={f.week[k].end} onChange={(e) => setDay(k, { end: e.target.value })} /></div>}
            </div>
          ))}
          <div className="flex gap-2"><Button full disabled={busy} onClick={saveRule}>{busy ? 'Saving…' : 'Save hours'}</Button>{f.saved && <Button full variant="secondary" onClick={clearRule}>Clear</Button>}</div>
        </Card>
      </Section>
      <Section title="Capacity windows" action="Add" onAction={() => setWin({ startsAt: '', endsAt: '', capacity: '1' })}>
        {windows.loading && !windows.data && <Loading />}
        {windows.error && <ErrorBox message={windows.error} onRetry={windows.reload} />}
        {windows.data && !windows.data.windows.length && <EmptyState icon={CalendarClock} title="No capacity windows" body="Instant booking and quotes for a booking need a window with free capacity." />}
        {windows.data?.windows.map((w) => (
          <Card key={w.id}>
            <p className="text-sm font-bold text-ink-900">{fmtWhen(w.startsAt)} to {fmtWhen(w.endsAt)}</p>
            <p className="text-xs text-ink-500">{w.reserved} of {w.capacity} reserved</p>
            <Button className="mt-2" size="sm" variant="secondary" onClick={() => removeWindow(w.id)}>Remove</Button>
          </Card>
        ))}
      </Section>
      <Dialog open={Boolean(win)} onClose={() => setWin(null)} title="Add capacity window" actions={<><Button variant="secondary" full onClick={() => setWin(null)}>Cancel</Button><Button full onClick={addWindow}>Add</Button></>}>
        {win && <div className="space-y-3"><Input label="Starts" type="datetime-local" value={win.startsAt} onChange={(e) => setWin({ ...win, startsAt: e.target.value })} /><Input label="Ends" type="datetime-local" value={win.endsAt} onChange={(e) => setWin({ ...win, endsAt: e.target.value })} /><Input label="Jobs at the same time" inputMode="numeric" value={win.capacity} onChange={(e) => setWin({ ...win, capacity: e.target.value })} /></div>}
      </Dialog>
    </div>
  )
}

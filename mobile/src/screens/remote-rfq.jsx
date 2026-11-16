/*
 * Real-API RFQ screens (F-RFQ-01..06, F-BKG-10), used instead of the seed-data
 * screens when VITE_API_BASE_URL is set (see the registry, `live(...)`).
 *
 * Customer: create + open an RFQ, compare quotes, accept exactly one (the backend
 * then creates the booking, work order, contract or purchase order from the
 * category configuration). Vendor: see RFQs addressed to it and submit a quote.
 * Nothing here invents a value: the quote deadline, amounts and recipients are
 * always chosen by the user, and a missing value is labelled, never zero.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Send } from 'lucide-react'
import { Badge, Banner, Button, Card, Checkbox, Dialog, EmptyState, Input, KV, Screen, Section, Segmented, Select } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { BookingList, ErrorBox, Loading, fmtWhen, minorToText, useLoad } from './remote-discovery.jsx'

const RFQ_STATE = {
  draft: ['Draft', 'gray'], open: ['Open for quotes', 'blue'], accepted: ['Quote accepted', 'teal'], expired: ['Expired', 'gray'], cancelled: ['Cancelled', 'gray'],
}
const QUOTE_STATE = { submitted: ['Submitted', 'blue'], accepted: ['Accepted', 'teal'], unsuccessful: ['Not selected', 'gray'], withdrawn: ['Withdrawn', 'gray'], expired: ['Expired', 'gray'] }
const FULFILLMENT_LABEL = { booking: 'booking', work_order: 'work order', contract: 'contract', purchase_order: 'purchase order' }

const StateBadge = ({ map, s }) => { const [label, tone] = map[s] || [String(s).replace(/_/g, ' '), 'gray']; return <Badge tone={tone}>{label}</Badge> }
const text = (v) => (typeof v === 'string' && v.trim() ? v : null)
const rupeesToMinor = (value) => Math.round(Number(value) * 100)
const money = (minor, currency = 'INR') => minorToText(minor, currency) || 'Not provided'

/** Display title for an RFQ: the free-form requirements are the customer's own words. */
const rfqTitle = (rfq) => text(rfq.requirements?.title) || 'Request for quotation'

/* ---------- list rows (also used by the activity and work hubs) ---------- */
function RfqRows({ rfqs, detail, empty }) {
  const nav = useNav()
  if (!rfqs.length) return <EmptyState icon={FileText} title="No RFQs" body={empty} />
  return rfqs.map((r) => (
    <Card key={r.id} onClick={() => nav.go(detail, { id: r.id })}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-ink-900">{rfqTitle(r)}</p>
          <p className="truncate text-xs text-ink-500">{r.kind === 'goods' ? 'Goods' : 'Service'} · {r.quoteDeadlineAt ? `Quotes by ${fmtWhen(r.quoteDeadlineAt)}` : 'No deadline yet'}</p>
        </div>
        <StateBadge map={RFQ_STATE} s={r.state} />
      </div>
    </Card>
  ))
}

/** Customer activity hub: my RFQs above my bookings (F-BKG-10). */
export function RemoteActivity() {
  const rfqs = useLoad(() => authService.listMyRfqs(), [])
  const nav = useNav()
  const load = useCallback(() => authService.listMyBookings(), [])
  return (
    <BookingList title="Activity" back={false} load={load} detail="c_booking" empty="When you book a service it shows up here.">
      <div className="space-y-3 px-4 pt-4">
        <Section title="My RFQs" action="New RFQ" onAction={() => nav.go('c_rfq_new')}>
          {rfqs.loading && !rfqs.data && <Loading />}
          {rfqs.error && <ErrorBox message={rfqs.error} onRetry={rfqs.reload} />}
          {rfqs.data && <RfqRows rfqs={rfqs.data.rfqs} detail="c_rfq" empty="Ask vendors for quotes and compare them here." />}
        </Section>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Bookings</p>
      </div>
    </BookingList>
  )
}

/** Vendor work hub: RFQs addressed to this vendor above its bookings (F-BKG-09). */
export function RemoteVendorWork() {
  const mine = useLoad(() => authService.listMyVendors(), [])
  const vendorId = mine.data?.vendors?.[0]?.id
  const rfqs = useLoad(() => (vendorId ? authService.listVendorRfqs(vendorId) : Promise.resolve({ ok: true, rfqs: [] })), [vendorId])
  const load = useCallback(() => (vendorId ? authService.listVendorBookings(vendorId) : Promise.resolve({ ok: true, bookings: [] })), [vendorId])
  if (mine.loading) return <Screen title="Work" back={false}><Loading /></Screen>
  if (mine.error) return <Screen title="Work" back={false}><ErrorBox message={mine.error} onRetry={mine.reload} /></Screen>
  return (
    <BookingList title="Work" back={false} load={load} detail="v_booking" empty={vendorId ? 'Booking requests for your listings appear here.' : 'Register your business to receive bookings.'}>
      <div className="space-y-3 px-4 pt-4">
        <Section title="RFQs sent to you">
          {rfqs.loading && !rfqs.data && <Loading />}
          {rfqs.error && <ErrorBox message={rfqs.error} onRetry={rfqs.reload} />}
          {rfqs.data && <RfqRows rfqs={rfqs.data.rfqs} detail="v_rfq" empty={vendorId ? 'RFQs from customers that match your categories appear here.' : 'Register your business to receive RFQs.'} />}
        </Section>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Bookings</p>
      </div>
    </BookingList>
  )
}

/* ================= CREATE RFQ (F-RFQ-01) ================= */
export function RemoteRfqNew({ params = {} }) {
  const nav = useNav()
  const app = useApp()
  const { toast } = app
  const locale = app.locale ?? app.loc ?? {}
  const country = locale.country || 'IN'
  const cities = useLoad(() => authService.listCities(country), [country])
  const cityId = useMemo(() => cities.data?.cities?.find((c) => c.name === locale.city)?.id, [cities.data, locale.city])

  const [f, setF] = useState({ categoryId: params.categoryId || '', kind: 'service', title: '', scope: '', quantity: '', budget: '', timeline: '', deadline: '', listingId: params.listingId || '' })
  // Categories and vendors come from the eligible listings in this place, so every category offered has someone to send the RFQ to.
  const [listings, setListings] = useState({ loading: true, error: '', items: [] })
  const [picked, setPicked] = useState(() => new Set(params.vendorId ? [params.vendorId] : []))
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const [draftId, setDraftId] = useState(null) // created but not yet opened (open failed): retry opens it instead of creating a second RFQ
  const [failure, setFailure] = useState('')
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e })); setErrs((x) => ({ ...x, [k]: '' })) }

  useEffect(() => {
    if (cities.loading) return undefined
    let live = true
    setListings((l) => ({ ...l, loading: true }))
    authService.searchListings({ countryCode: country, cityId, limit: 50 }).then((r) => {
      if (live) setListings({ loading: false, error: r.ok ? '' : r.message, items: r.ok ? r.items : [] })
    })
    return () => { live = false }
  }, [country, cityId, cities.loading])

  // Arriving with a listing (from a listing page) preselects its category.
  useEffect(() => {
    const l = f.listingId && !f.categoryId ? listings.items.find((x) => x.id === f.listingId) : null
    if (l) setF((x) => ({ ...x, categoryId: l.categoryId }))
  }, [listings.items]) // eslint-disable-line react-hooks/exhaustive-deps

  const categoryOptions = useMemo(() => {
    const m = new Map()
    for (const l of listings.items) if (!m.has(l.categoryId)) m.set(l.categoryId, l.categoryName)
    return [...m.entries()].map(([value, label]) => ({ value, label }))
  }, [listings.items])
  const categoryListings = useMemo(() => listings.items.filter((l) => l.categoryId === f.categoryId), [listings.items, f.categoryId])
  const vendors = useMemo(() => {
    const m = new Map()
    for (const l of categoryListings) if (!m.has(l.vendor.id)) m.set(l.vendor.id, l.vendor)
    return [...m.values()]
  }, [categoryListings])
  const chosenListing = categoryListings.find((l) => l.id === f.listingId)
  const recipients = chosenListing ? [chosenListing.vendor.id] : [...picked].filter((id) => vendors.some((v) => v.id === id))
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const submit = async () => {
    const e = {}
    if (!f.categoryId) e.categoryId = 'Choose a category'
    if (f.title.trim().length < 5) e.title = 'Add a short title (min 5 characters)'
    if (!f.scope.trim()) e.scope = 'Describe what you need'
    if (!f.deadline) e.deadline = 'Choose when quotes are due'
    else if (new Date(`${f.deadline}T23:59:59`) <= new Date()) e.deadline = 'Choose a future date'
    if (!recipients.length) e.recipients = 'Choose at least one vendor to receive it'
    setErrs(e)
    if (Object.keys(e).length) return toast('Please complete the required fields', 'warn')
    setBusy(true)
    setFailure('')
    let id = draftId
    if (!id) {
      const requirements = {
        title: f.title.trim(), scope: f.scope.trim(), ...(f.quantity.trim() ? { quantity: f.quantity.trim() } : {}), ...(f.budget.trim() ? { budget: f.budget.trim() } : {}),
        ...(f.timeline.trim() ? { timeline: f.timeline.trim() } : {}), ...(locale.city ? { city: locale.city } : {}), ...(f.listingId ? { listingId: f.listingId } : {}),
      }
      const created = await authService.createRfq({ categoryId: f.categoryId, kind: f.kind, requirements })
      if (!created.ok) { setBusy(false); return setFailure(created.message) }
      id = created.rfq.id
      setDraftId(id)
    }
    const opened = await authService.openRfq(id, { quoteDeadlineAt: new Date(`${f.deadline}T23:59:59`).toISOString(), vendorIds: recipients })
    setBusy(false)
    if (!opened.ok) return setFailure(`${opened.message} Your RFQ is saved as a draft; fix this and send again.`)
    toast(`RFQ sent to ${recipients.length} vendor${recipients.length === 1 ? '' : 's'}`)
    nav.replace('c_rfq', { id })
  }

  return (
    <Screen title="Request quotation" subtitle="Structured request for eligible vendors" footer={<Button full size="lg" icon={Send} disabled={busy} onClick={submit}>{busy ? 'Sending…' : draftId ? 'Send draft RFQ' : 'Send RFQ'}</Button>}>
      {failure && <Banner tone="red" title="Could not send">{failure}</Banner>}
      {listings.error && <ErrorBox message={listings.error} />}
      <Select label="Category" required value={f.categoryId} error={errs.categoryId} onChange={(e) => { set('categoryId')(e); setF((x) => ({ ...x, categoryId: e.target.value, listingId: '' })); setPicked(new Set()) }} options={[{ value: '', label: listings.loading ? 'Loading…' : categoryOptions.length ? 'Choose a category' : 'No category has vendors here yet' }, ...categoryOptions]} />
      <Segmented value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v }))} options={[{ id: 'service', label: 'Service' }, { id: 'goods', label: 'Goods' }]} />
      <Input label="What do you need?" required placeholder="e.g. Repair kitchen pipe leak" value={f.title} onChange={set('title')} error={errs.title} />
      <Input label="Scope" required textarea placeholder="Describe the work or the items" value={f.scope} onChange={set('scope')} error={errs.scope} />
      <div className="flex gap-3"><Input label="Quantity" value={f.quantity} onChange={set('quantity')} /><Input label="Budget (optional)" value={f.budget} onChange={set('budget')} /></div>
      <div className="flex gap-3"><Input label="Timeline (optional)" value={f.timeline} onChange={set('timeline')} /><Input label="Quotes needed by" required type="date" min={new Date().toISOString().slice(0, 10)} value={f.deadline} onChange={set('deadline')} error={errs.deadline} /></div>
      {f.categoryId && vendors.length > 0 && (
        <Select label={f.kind === 'service' ? 'Book a specific listing' : 'For a specific listing (optional)'} hint="Picking a listing is what makes the accepted quote a booking on that listing (the vendor offers one of its time slots). It then goes only to that listing's vendor. Leave it empty to ask several vendors for a quote; what is created on acceptance then depends on the category." value={f.listingId} onChange={set('listingId')} options={[{ value: '', label: 'No specific listing' }, ...categoryListings.map((l) => ({ value: l.id, label: `${l.title} · ${l.vendor.name}` }))]} />
      )}
      <Card>
        <p className="text-sm font-bold">Who receives it</p>
        {!f.categoryId && <p className="mt-1 text-xs text-ink-500">Choose a category to see eligible vendors in {locale.city || 'your area'}.</p>}
                {f.categoryId && vendors.length === 0 && <p className="mt-1 text-xs font-semibold text-amber-700">No verified vendor serves this category here yet, so there is nobody to send it to.</p>}
        {chosenListing ? <p className="mt-2 text-sm font-semibold">{chosenListing.vendor.name}</p> : (
          <div className="mt-2 space-y-2">{vendors.map((v) => <Checkbox key={v.id} checked={picked.has(v.id)} onChange={() => toggle(v.id)}>{v.name}</Checkbox>)}</div>
        )}
        {errs.recipients && <p className="mt-2 text-xs font-semibold text-red-600">{errs.recipients}</p>}
        <p className="mt-2 text-[11px] text-ink-400">Only vendors you choose here receive it. Your contact details stay hidden.</p>
      </Card>
    </Screen>
  )
}

/* ================= RFQ DETAIL + COMPARE + ACCEPT (F-RFQ-03, F-RFQ-04, F-RFQ-06) ================= */
function QuoteCard({ q, name, canAccept, onAccept, kind }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-[15px] font-bold text-ink-900">{name}</p><p className="text-xs text-ink-500">Revision {q.currentRevision}</p></div>
        <StateBadge map={QUOTE_STATE} s={q.state} />
      </div>
      <p className="mt-2 text-xl font-extrabold text-ink-900">{money(q.totalMinor, q.currency)}</p>
      <KV rows={[
        ['Scope', text(q.scope) || 'Not provided'],
        ['Valid until', q.validUntil ? fmtWhen(q.validUntil) : 'Not provided'],
        ['Includes', q.inclusions?.length ? q.inclusions.join(', ') : 'Not provided'],
        ['Excludes', q.exclusions?.length ? q.exclusions.join(', ') : 'Not provided'],
      ]} />
      {kind === 'goods' && q.lines?.length > 0 && (
        <div className="mt-2 space-y-1 text-xs text-ink-600">{q.lines.map((l, i) => <p key={i}>{l.description}: {l.quantity}{l.unit ? ` ${l.unit}` : ''} × {money(l.unitPriceMinor, q.currency)} = {money(l.lineTotalMinor, q.currency)}</p>)}</div>
      )}
      {canAccept && q.state === 'submitted' && <Button className="mt-3" full onClick={() => onAccept(q)}>Accept this quote</Button>}
    </Card>
  )
}

export function RemoteRfqDetail({ params = {} }) {
  const nav = useNav()
  const { toast } = useApp()
  const { loading, error, data, reload } = useLoad(() => authService.listRfqQuotes(params.id), [params.id])
  const [names, setNames] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [failure, setFailure] = useState('')
  const [extendTo, setExtendTo] = useState('')

  const vendorIds = (data?.quotes || []).map((q) => q.vendorId).join(',')
  useEffect(() => {
    let live = true
    ;(data?.quotes || []).forEach((q) => {
      authService.getPublicVendor(q.vendorId).then((r) => { if (live && r.ok) setNames((n) => ({ ...n, [q.vendorId]: r.vendor.name })) })
    })
    return () => { live = false }
  }, [vendorIds]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <Screen title="RFQ"><Loading /></Screen>
  if (error) return <Screen title="RFQ"><ErrorBox message={error} onRetry={reload} /></Screen>
  const { rfq, quotes } = data
  const req = rfq.requirements || {}
  const accept = async () => {
    setBusy(true)
    setFailure('')
    const r = await authService.acceptQuote(rfq.id, confirm.id)
    setBusy(false)
    setConfirm(null)
    if (!r.ok) return setFailure(r.message)
    setOutcome(r.fulfillment)
    toast('Quote accepted')
    reload()
  }
  const extend = async () => {
    if (!extendTo || new Date(`${extendTo}T23:59:59`) <= new Date(rfq.quoteDeadlineAt)) return toast('Choose a date after the current deadline', 'warn')
    const r = await authService.extendRfqDeadline(rfq.id, new Date(`${extendTo}T23:59:59`).toISOString())
    if (!r.ok) return toast(r.message, 'warn')
    toast('Deadline extended')
    setExtendTo('')
    reload()
  }
  const accepted = quotes.find((q) => q.state === 'accepted')

  return (
    <Screen title={rfqTitle(rfq)} subtitle={rfq.kind === 'goods' ? 'Goods RFQ' : 'Service RFQ'} right={<StateBadge map={RFQ_STATE} s={rfq.state} />}>
      {failure && <Banner tone="red" title="Could not accept this quote">{failure}</Banner>}
      {outcome && (
        <Banner tone="green" title={`Quote accepted: ${FULFILLMENT_LABEL[outcome.type] || outcome.type} created`}>
          {outcome.type === 'booking' ? <Button size="sm" onClick={() => nav.go('c_booking', { id: outcome.id })}>Open the booking</Button> : `Reference ${outcome.id}.`}
        </Banner>
      )}
      <Card>
        <KV rows={[
          ['Scope', text(req.scope) || 'Not provided'], ['Quantity', text(req.quantity) || 'Not provided'], ['Budget', text(req.budget) || 'Not provided'], ['Timeline', text(req.timeline) || 'Not provided'],
          ['Quotes due', rfq.quoteDeadlineAt ? fmtWhen(rfq.quoteDeadlineAt) : 'Not set'],
        ]} />
      </Card>
      {rfq.state === 'open' && (
        <div className="flex items-end gap-2"><Input label="Extend deadline to" type="date" value={extendTo} onChange={(e) => setExtendTo(e.target.value)} /><Button variant="secondary" onClick={extend}>Extend</Button></div>
      )}
      <Section title={`Quotes (${quotes.length})`}>
        {quotes.length === 0 && <EmptyState icon={FileText} title="No quotes yet" body={rfq.state === 'open' ? 'Vendors you sent this to can reply until the deadline.' : 'No vendor sent a quote.'} />}
        {quotes.map((q) => <QuoteCard key={q.id} q={q} kind={rfq.kind} name={names[q.vendorId] || 'Vendor'} canAccept={rfq.state === 'open' && !accepted} onAccept={setConfirm} />)}
      </Section>
      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Accept this quote?" actions={<><Button variant="secondary" full onClick={() => setConfirm(null)}>Cancel</Button><Button full disabled={busy} onClick={accept}>{busy ? 'Accepting…' : 'Accept'}</Button></>}>
        {confirm && <p>You are accepting {names[confirm.vendorId] || 'this vendor'}'s quote for {money(confirm.totalMinor, confirm.currency)}. The other quotes close, and the agreed terms are frozen.</p>}
      </Dialog>
    </Screen>
  )
}

/* ================= VENDOR: SUBMIT / REVISE A QUOTE (F-RFQ-02) ================= */
export function RemoteVendorRfq({ params = {} }) {
  const nav = useNav()
  const { toast } = useApp()
  const mine = useLoad(() => authService.listMyVendors(), [])
  const { loading, error, data, reload } = useLoad(() => authService.listRfqQuotes(params.id), [params.id])
  const [f, setF] = useState({ total: '', scope: '', inclusions: '', exclusions: '', validUntil: '', lineDesc: '', lineQty: '1', linePrice: '', windowId: '' })
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrs((x) => ({ ...x, [k]: '' })) }
  // A booking RFQ names a listing; the quote must then carry a slot from that listing's capacity (the backend refuses to book without one).
  const listingId = text(data?.rfq?.requirements?.listingId)
  const capacity = useLoad(() => (listingId ? authService.listListingCapacity(listingId) : Promise.resolve({ ok: true, windows: [] })), [listingId])

  if ((loading && !data) || mine.loading) return <Screen title="RFQ"><Loading /></Screen>
  if (error) return <Screen title="RFQ"><ErrorBox message={error} onRetry={reload} /></Screen>
  if (mine.error) return <Screen title="RFQ"><ErrorBox message={mine.error} onRetry={mine.reload} /></Screen>
  const { rfq, quotes } = data
  const vendorId = mine.data?.vendors?.[0]?.id
  const req = rfq.requirements || {}
  const goods = rfq.kind === 'goods'
  const own = quotes[0] // a vendor only ever sees its own quote
  const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean)
  const windows = (capacity.data?.windows || []).filter((w) => Number(w.capacity) > Number(w.reserved))
  const slotZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const windowLabel = (w) => `${fmtWhen(w.startsAt)} to ${fmtWhen(w.endsAt)} (${Number(w.capacity) - Number(w.reserved)} free)`

  const submit = async () => {
    const e = {}
    const qty = Number(f.lineQty)
    if (goods) {
      if (!f.lineDesc.trim()) e.lineDesc = 'Describe the item'
      if (!Number.isInteger(qty) || qty < 1) e.lineQty = 'Whole quantity of 1 or more'
      if (!(Number(f.linePrice) >= 0) || f.linePrice === '') e.linePrice = 'Enter the unit price'
    } else if (!(Number(f.total) >= 0) || f.total === '') e.total = 'Enter your total price'
    const slot = windows.find((w) => w.id === f.windowId)
    if (listingId && !slot) e.windowId = 'Choose the time slot you can do this in'
    setErrs(e)
    if (Object.keys(e).length) return toast('Please complete the required fields', 'warn')
    const unitPriceMinor = rupeesToMinor(f.linePrice)
    const lines = goods ? [{ description: f.lineDesc.trim(), quantity: qty, unitPriceMinor, lineTotalMinor: unitPriceMinor * qty }] : undefined
    const body = {
      currency: 'INR', totalMinor: goods ? unitPriceMinor * qty : rupeesToMinor(f.total), ...(lines ? { lines } : {}),
      ...(f.scope.trim() ? { scope: f.scope.trim() } : {}), ...(list(f.inclusions).length ? { inclusions: list(f.inclusions) } : {}),
      ...(list(f.exclusions).length ? { exclusions: list(f.exclusions) } : {}),
      ...(slot ? { timeline: { slotStart: new Date(slot.startsAt).toISOString(), slotEnd: new Date(slot.endsAt).toISOString(), timeZone: slotZone, capacityId: slot.id } } : {}),
      ...(f.validUntil ? { validUntil: new Date(`${f.validUntil}T23:59:59`).toISOString() } : {}),
    }
    setBusy(true)
    setFailure('')
    const r = own ? await authService.reviseQuote(own.id, body) : await authService.submitQuote(rfq.id, { vendorId, ...body })
    setBusy(false)
    if (!r.ok) return setFailure(r.message)
    toast(own ? 'Quote revised' : 'Quote sent')
    reload()
  }
  const withdraw = async () => {
    const r = await authService.withdrawQuote(own.id)
    if (!r.ok) return toast(r.message, 'warn')
    toast('Quote withdrawn')
    reload()
  }
  const canQuote = rfq.state === 'open' && vendorId && (!own || own.state === 'submitted')

  return (
    <Screen title={rfqTitle(rfq)} subtitle={goods ? 'Goods RFQ' : 'Service RFQ'} right={<StateBadge map={RFQ_STATE} s={rfq.state} />} footer={canQuote ? <Button full size="lg" disabled={busy} onClick={submit}>{busy ? 'Sending…' : own ? 'Revise quote' : 'Send quote'}</Button> : undefined}>
      {failure && <Banner tone="red" title="Could not send">{failure}</Banner>}
      {!vendorId && <Banner tone="amber" title="Register your business first">You need a vendor account to answer RFQs.</Banner>}
      <Card>
        <KV rows={[['Scope', text(req.scope) || 'Not provided'], ['Quantity', text(req.quantity) || 'Not provided'], ['Budget', text(req.budget) || 'Not provided'], ['Timeline', text(req.timeline) || 'Not provided'], ['Quotes due', rfq.quoteDeadlineAt ? fmtWhen(rfq.quoteDeadlineAt) : 'Not set']]} />
      </Card>
      {own && <Section title="Your quote"><QuoteCard q={own} kind={rfq.kind} name="Your quote" canAccept={false} />{own.state === 'submitted' && rfq.state === 'open' && <Button variant="secondary" full onClick={withdraw}>Withdraw quote</Button>}{own.state === 'accepted' && <Button full onClick={() => nav.go('v_work')}>Go to Work</Button>}</Section>}
      {canQuote && (
        <Section title={own ? 'Revise your quote' : 'Your quote'}>
          {goods ? (
            <>
              <Input label="Item" required value={f.lineDesc} onChange={set('lineDesc')} error={errs.lineDesc} />
              <div className="flex gap-3"><Input label="Quantity" required inputMode="numeric" value={f.lineQty} onChange={set('lineQty')} error={errs.lineQty} /><Input label="Unit price (₹)" required inputMode="decimal" value={f.linePrice} onChange={set('linePrice')} error={errs.linePrice} /></div>
            </>
          ) : <Input label="Total price (₹)" required inputMode="decimal" value={f.total} onChange={set('total')} error={errs.total} />}
          {listingId && (
            <>
              {capacity.loading && <p className="text-xs text-ink-500">Loading your open time slots…</p>}
              {capacity.error && <ErrorBox message={capacity.error} onRetry={capacity.reload} />}
              {!capacity.loading && !capacity.error && windows.length === 0 && <Banner tone="amber" title="No free time slot">This request is for a booking on one of your listings, and that listing has no open capacity window, so a quote cannot be sent. Add a window to the listing first.</Banner>}
              {windows.length > 0 && <Select label="Time slot you can do it in" required hint="The customer books this slot if they accept your quote." value={f.windowId} error={errs.windowId} onChange={set('windowId')} options={[{ value: '', label: 'Choose a slot' }, ...windows.map((w) => ({ value: w.id, label: windowLabel(w) }))]} />}
            </>
          )}
          <Input label="Scope (optional)" textarea value={f.scope} onChange={set('scope')} />
          <Input label="Includes (comma separated, optional)" value={f.inclusions} onChange={set('inclusions')} />
          <Input label="Excludes (comma separated, optional)" value={f.exclusions} onChange={set('exclusions')} />
          <Input label="Quote valid until (optional)" type="date" min={new Date().toISOString().slice(0, 10)} value={f.validUntil} onChange={set('validUntil')} />
        </Section>
      )}
      {!canQuote && !own && rfq.state !== 'open' && <EmptyState icon={FileText} title="Not accepting quotes" body="This RFQ is no longer open." />}
    </Screen>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  Package, CalendarCheck, FileText, Truck, Phone, MessageCircle, Send, Paperclip, Plus, X, Star, Download, Receipt, RotateCcw, ShieldAlert,
  User, Heart, Globe, Bell, Lock, LogOut, ChevronRight, Check, GitCompare, CreditCard, HelpCircle, Smartphone, Trash2, CircleDollarSign,
  Clock, Wallet, Store, BadgeCheck, TrendingDown, Zap, ImagePlus,
} from 'lucide-react'
import { Info, CheckCheck } from 'lucide-react'
import { P2Badge } from './blocks.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { remoteInbox, useInbox } from '../useInbox.js'
import { GEO, findCity } from '../geo.js'
import { cat, CATS, calcPrice, listing as findListing, SLOTS } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Rating, Banner, EmptyState, SearchBar,
  PriceBreakdown, KV, fmt, cx, Pill, IconBtn, StatusBadge, Stars, ListRow, Group, Timeline, Avatar, SOFT, Meta, DemoPhonePePayment,
} from '../ui.jsx'
import { ListingCard, VendorRow, VerifiedBadge, useGate, useStartChat } from './shared.jsx'
import { useSignIn } from './auth.jsx'
import { authService } from '../services/authService.js'

const ME_NAME = 'Aarav Mehta'
const dateAfterISO = (days = 1) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const nextDate = () => dateAfterISO(1)
const dateLabel = (value) => { const [y, m, d] = value.split('-'); return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${y}` }
const dateExpired = (value) => { const d = new Date(value); return !Number.isNaN(d.valueOf()) && d < new Date(new Date().setHours(0, 0, 0, 0)) }

/* ================= ACTIVITY (orders / bookings / RFQs) ================= */

function GuestWall({ title }) {
  const nav = useNav()
  return (
    <Screen title={title} back={false}>
      <EmptyState icon={Lock} title="Log in to continue" body="Browsing is open to everyone. Sign in to order, book, request quotes and message vendors." action={<div className="flex gap-2"><Button onClick={() => nav.go('login')}>Log in</Button><Button variant="secondary" onClick={() => nav.go('register')}>Create account</Button></div>} />
    </Screen>
  )
}

/* ================= ORDER DETAIL ================= */
const ORDER_FLOW = [['placed', 'Order placed'], ['confirmed', 'Confirmed by vendor'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered']]


/* ================= BOOKING DETAIL ================= */
const BK_FLOW = [['requested', 'Request sent'], ['accepted', 'Accepted by vendor'], ['in_progress', 'Service in progress'], ['completed', 'Completed']]

/* ================= RFQ ================= */
export function RfqNew({ params = {} }) {
  const nav = useNav()
  const { me, vendor, vendors, rfqs, setRfqs, notify, toast, locale } = useApp()
  const targetVendor = params.vendorId ? vendor(params.vendorId) : null
  const [f, setF] = useState({ cat: params.cat || 'home', title: params.title ? `Bulk quote: ${params.title}` : '', qty: '', budget: '', timeline: '', deadline: dateAfterISO(7), city: locale.city || 'Jaipur', answers: {} })
  const [gx, setGx] = useState({ dest: locale.countryName || 'India', inco: '', target: '', samples: false })
  const [files, setFiles] = useState([])
  const [errs, setErrs] = useState({})
  const c = cat(f.cat)
  const qs = (c.rfq || []).filter((k) => !['Budget range', 'Quantity', 'Delivery location'].includes(k))
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const cities = [...new Set(GEO.find((g) => g.code === 'IN').states.flatMap((st) => st.cities.map((x) => x.n)))]
  const eligible = targetVendor ? [targetVendor] : vendors.filter((v) => v.status === 'approved' && v.cat === f.cat && (v.areas || []).some((a) => a === f.city || a === 'Remote' || a === 'India'))
  const submit = () => {
    const e = {}
    if (f.title.trim().length < 5) e.title = 'Add a short title (min 5 characters)'
    if (!f.qty.trim()) e.qty = 'Enter quantity / scope'
    if (!f.timeline.trim()) e.timeline = 'Add a date or timeline'
    if (!f.budget.trim()) e.budget = 'Add a budget range'
    if (!f.deadline || f.deadline < new Date().toISOString().slice(0, 10)) e.deadline = 'Choose a current or future date'
    qs.forEach((k) => { if (!(f.answers[k] || '').trim()) e['a_' + k] = 'Required for this category' })
    setErrs(e)
    if (Object.keys(e).length) return toast('Please complete the required fields', 'warn')
    const id = 'RFQ-' + (315 + rfqs.length)
    const place = findCity(f.city)
    const [y, m, d] = f.deadline.split('-')
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]
    const specs = [...qs.map((k) => `${k}: ${f.answers[k]}`), `Timeline: ${f.timeline}`, ...(gx.target ? [`Target unit price: ${gx.target}`] : []), ...(gx.inco ? [`Incoterm: ${gx.inco}`] : []), ...(gx.dest !== 'India' ? [`Destination: ${gx.dest}`] : []), ...(gx.samples ? ['Samples needed first'] : [])]
    const buyerName = me.role === 'vendor' ? (vendor(me.vendorId)?.name || me.name || 'Business buyer') : ME_NAME
    setRfqs((r) => [{ id, mine: true, buyerType: me.role === 'vendor' ? 'vendor' : 'customer', buyerVendorId: me.role === 'vendor' ? me.vendorId : undefined, targetVendorId: params.vendorId || undefined, targetVendorName: targetVendor?.name, customer: buyerName, title: f.title, cat: f.cat, cats: [f.cat], categoryBudgets: {}, qty: f.qty, budget: f.budget, deadline: `${d} ${mon} ${y}`, location: `${f.city}${place ? `, ${place.state}, ${place.countryName}` : ''}`, country: place?.countryName || 'India', state: place?.state || '', city: f.city, pincode: locale.pincode || '', desc: specs.join('\n'), files, status: 'submitted', created: '19 Oct 2026', recipients: eligible.length, history: [{ s: 'submitted', at: 'Just now', note: `Sent to ${eligible.length} eligible vendor${eligible.length === 1 ? '' : 's'}` }], quotes: [], chat: [] }, ...r])
    notify('vendor', me.role === 'vendor' ? 'Vendor buyer RFQ published' : 'RFQ matches your category', `${id} · ${f.title}`, 'rfq')
    toast(`RFQ sent to ${eligible.length} eligible vendor${eligible.length === 1 ? '' : 's'}`)
    nav.replace('c_rfq', { id })
  }
  return (
    <Screen title="Request quotation" subtitle={targetVendor ? `Direct to ${targetVendor.name}` : 'Structured request for eligible vendors'} footer={<Button full size="lg" onClick={submit}>Send RFQ</Button>}>
      <Select label="Category" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value, answers: {} })} options={CATS.map((x) => ({ value: x.id, label: x.name }))} />
      <Input label="What do you need?" required placeholder="e.g. Complete rewiring for a 3,200 sq ft office" value={f.title} onChange={set('title')} error={errs.title} />
      <Input label="Quantity / scope" required placeholder="e.g. 3,200 sq ft · 200 units" value={f.qty} onChange={set('qty')} error={errs.qty} />
      {qs.length > 0 && <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">{c.name}: specific questions</p>
        <div className="space-y-3">{qs.map((k) => <Input key={k} label={k} required value={f.answers[k] || ''} onChange={(e) => { setF({ ...f, answers: { ...f.answers, [k]: e.target.value } }); setErrs({ ...errs, ['a_' + k]: '' }) }} error={errs['a_' + k]} />)}</div>
        <p className="mt-1.5 text-xs text-ink-500">These fields come from the category's RFQ schema and can differ per category.</p>
      </div>}
      <div className="flex gap-3"><Input label="Budget range" required placeholder="₹1,50,000 – ₹2,20,000" value={f.budget} onChange={set('budget')} error={errs.budget} /><Input label="Date / timeline" required placeholder="Start by 4 Nov" value={f.timeline} onChange={set('timeline')} error={errs.timeline} /></div>
      <div className="flex gap-3"><Input label="Quotes needed by" required type="date" min={dateAfterISO(0)} value={f.deadline} onChange={set('deadline')} error={errs.deadline} /><Select label="Service / delivery location" value={f.city} onChange={set('city')} options={cities} /></div>
      <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-ink-100">
        <p className="flex items-center gap-2 text-sm font-extrabold">Sourcing details <span className="text-xs font-medium text-ink-400">(optional)</span> <P2Badge /></p>
        <div className="flex gap-3"><Select label="Deliver to" value={gx.dest} onChange={(e) => setGx({ ...gx, dest: e.target.value })} options={GEO.map((g) => g.name)} /><Select label="Incoterm" value={gx.inco} onChange={(e) => setGx({ ...gx, inco: e.target.value })} options={['', 'EXW', 'FOB', 'CIF', 'DDP']} /></div>
        <Input label="Target unit price" inputMode="decimal" value={gx.target} onChange={(e) => setGx({ ...gx, target: e.target.value.replace(/[^\d.]/g, '') })} />
        <Toggle label="I need samples first" on={gx.samples} onChange={(v) => setGx({ ...gx, samples: v })} />
        {(gx.dest !== 'India' || gx.inco || gx.samples) && <p className="rounded-lg bg-sky-50 p-2.5 text-xs text-sky-900"><b>Phase 2:</b> cross-border quoting, customs documents and samples workflow. In Phase 1 this is recorded on the RFQ and agreed with the vendor in chat.</p>}
      </div>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Reference files</p>
        <div className="space-y-2">
          {files.map((n) => <div key={n} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><FileText size={18} className="text-brand-600" /><span className="flex-1 truncate text-sm font-medium">{n}</span><span className="text-[11px] font-semibold text-emerald-700">Scanned</span><button onClick={() => setFiles(files.filter((x) => x !== n))} aria-label="Remove"><X size={17} className="text-ink-400" /></button></div>)}
          <button onClick={() => setFiles([...files, ['Floor-plan.pdf', 'Spec-sheet.xlsx', 'Site-photo.jpg'][files.length % 3]])} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 py-3.5 text-sm font-semibold text-ink-500"><Paperclip size={16} />Add file</button>
          <p className="text-[11px] text-ink-500">PDF, images, Office files up to 10 MB. Type and size checked, visible only to you and vendors who receive this RFQ.</p>
        </div>
      </div>
      <Card>
        <p className="text-sm font-bold">Who receives it</p>
        <p className="mt-1 text-xs text-ink-500">{targetVendor ? 'Only the supplier you chose receives this RFQ.' : `Only eligible vendors (right category, serving ${f.city}, verified) receive or can discover this RFQ.`}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">{eligible.length ? eligible.map((v) => <Pill key={v.id}>{v.name}</Pill>) : <span className="text-xs text-ink-500">No eligible vendors serve {f.city} yet</span>}</div>
        {eligible.length === 0 && <p className="mt-2 text-xs font-semibold text-amber-700">You can still publish. Vendors who join later and match will see it until the deadline.</p>}
        <p className="mt-2 text-[11px] text-ink-400">Contact details come from your account and stay hidden.</p>
      </Card>
    </Screen>
  )
}

/* ================= SERVICE BOOKINGS ================= */
export function BookingNew({ params = {} }) {
  const nav = useNav()
  const { me, listings, vendor, bookings, setBookings, notify, toast, stamp } = useApp()
  const l = listings.find((x) => x.id === params.listingId && x.type === 'service')
  const [f, setF] = useState({ mode: params.mode || 'scheduled', date: nextDate(), slot: '10:00 AM', repeat: 'Weekly · 4 visits', address: '', notes: '' })
  const [errs, setErrs] = useState({})
  if (!l) return <Screen title="Request service"><EmptyState icon={CalendarCheck} title="Service unavailable" body="Choose an active service listing to request a booking." action={<Button onClick={() => nav.back()}>Back to listing</Button>} /></Screen>
  const v = vendor(l.vendorId)
  const reserved = bookings.filter((b) => b.vendorId === v.id && b.date === dateLabel(f.date) && ['requested', 'accepted', 'change_requested', 'in_progress'].includes(b.status)).map((b) => b.slot)
  const availableSlots = SLOTS.filter((slot) => !reserved.includes(slot))
  const submit = () => {
    const e = {}
    const bookingDate = f.mode === 'instant' ? nextDate() : f.date
    const bookingSlot = f.mode === 'instant' ? availableSlots[0] : f.slot
    if (f.mode !== 'instant' && (!f.date || f.date < nextDate())) e.date = 'Choose a future date'
    if (!bookingSlot || !availableSlots.includes(bookingSlot)) e.slot = 'That time is no longer available. Choose another slot.'
    if (!f.address.trim() || f.address.trim().length < 8) e.address = 'Add the service address (at least 8 characters)'
    if (f.notes.trim().length > 500) e.notes = 'Keep notes under 500 characters'
    setErrs(e); if (Object.keys(e).length) return
    const id = `BKG-${Date.now().toString().slice(-6)}`
    const booking = { id, vendorId: v.id, listingId: l.id, bookingType: f.mode, recurrence: f.mode === 'recurring' ? f.repeat : undefined, date: dateLabel(bookingDate), slot: bookingSlot, status: 'requested', customer: me.name || ME_NAME, address: f.address.trim(), notes: f.notes.trim(), total: l.price, paymentTerms: 'To be agreed directly with vendor; VendorVerse does not collect service payment.', history: [{ s: 'requested', at: stamp(), note: f.mode === 'instant' ? 'Customer requested an instant service slot' : f.mode === 'recurring' ? `Customer requested recurring service · ${f.repeat}` : 'Customer requested a scheduled preferred slot' }] }
    setBookings((all) => [booking, ...all])
    notify('vendor', 'New service booking request', `${id} · ${l.title} · ${booking.date}, ${booking.slot}`, 'booking')
    toast(f.mode === 'instant' ? 'Instant service request sent' : f.mode === 'recurring' ? 'Recurring service request sent' : 'Booking request sent. The vendor will confirm or decline the preferred time.')
    nav.replace('c_booking', { id })
  }
  return <Screen title="Request a service" subtitle={v.name} footer={<Button full size="lg" icon={CalendarCheck} onClick={submit}>Send booking request</Button>}>
    <Card><p className="text-sm font-bold">{l.title}</p><p className="mt-1 text-xs text-ink-500">{l.duration} min · Indicative price {fmt(l.price)} · final price agreed with vendor</p></Card>
    <Segmented value={f.mode} onChange={(mode) => setF({ ...f, mode })} options={[{ id: 'instant', label: 'Instant' }, { id: 'scheduled', label: 'Scheduled' }, { id: 'recurring', label: 'Recurring' }]} />
    {f.mode === 'instant' && <Banner tone="teal" title="Instant service">The next available slot will be requested immediately from the provider.</Banner>}
    {f.mode !== 'instant' && <div className="flex gap-3"><Input label="Preferred date" required type="date" min={nextDate()} value={f.date} onChange={(e) => { const date = e.target.value; const occupied = bookings.filter((b) => b.vendorId === v.id && b.date === dateLabel(date) && ['requested', 'accepted', 'change_requested', 'in_progress'].includes(b.status)).map((b) => b.slot); const first = SLOTS.find((slot) => !occupied.includes(slot)) || ''; setF({ ...f, date, slot: occupied.includes(f.slot) ? first : f.slot }); setErrs({ ...errs, date: '', slot: '' }) }} error={errs.date} /><Select label="Preferred time" value={f.slot} onChange={(e) => { setF({ ...f, slot: e.target.value }); setErrs({ ...errs, slot: '' }) }} options={availableSlots.length ? availableSlots : [{ value: '', label: 'No times available' }]} error={errs.slot} /></div>}
    {f.mode === 'recurring' && <Select label="Repeat schedule" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} options={['Weekly · 4 visits', 'Fortnightly · 3 visits', 'Monthly · 6 visits']} />}
    {!availableSlots.length && <Banner tone="amber">No preferred times are open on this date. Select another date.</Banner>}
    <Input label="Service address" required textarea rows={2} placeholder="Full address, area and access details" value={f.address} onChange={(e) => { setF({ ...f, address: e.target.value }); setErrs({ ...errs, address: '' }) }} error={errs.address} />
    <Input label="What should the vendor know?" textarea rows={3} placeholder="Describe the work or access requirements" value={f.notes} onChange={(e) => { setF({ ...f, notes: e.target.value }); setErrs({ ...errs, notes: '' }) }} error={errs.notes} />
    <Banner tone="blue" title="No payment is collected here">The vendor will confirm availability and agree the final service price and payment terms with you directly.</Banner>
  </Screen>
}

export function BookingDetail({ params = {} }) {
  const nav = useNav()
  const { me, bookings, patchBooking, listings, vendor, notify, toast, stamp } = useApp()
  const b = bookings.find((x) => x.id === params.id)
  const [change, setChange] = useState(false)
  const [reason, setReason] = useState('')
  const [f, setF] = useState({ date: nextDate(), slot: '10:00 AM' })
  const customer = me.role !== 'vendor'
  if (!b) return <Screen title="Booking"><EmptyState icon={CalendarCheck} title="Booking not found" action={<Button onClick={() => nav.back()}>Back</Button>} /></Screen>
  const l = listings.find((x) => x.id === b.listingId)
  const v = vendor(b.vendorId)
  const update = (status, note, extra = {}) => {
    if (!customer && status === 'accepted') {
      const targetDate = extra.date || b.date
      const targetSlot = extra.slot || b.slot
      const collision = bookings.some((x) => x.id !== b.id && x.vendorId === b.vendorId && x.date === targetDate && x.slot === targetSlot && ['accepted', 'in_progress'].includes(x.status))
      if (collision) return toast('That slot is already confirmed for another customer. Propose another time.', 'warn')
    }
    patchBooking(b.id, (x) => ({ ...x, ...extra, status, history: [...(x.history || []), { s: status, at: stamp(), note }] }))
    notify(customer ? 'vendor' : 'customer', `Booking ${status.replaceAll('_', ' ')}`, `${b.id} · ${note}`, 'booking')
    toast(`Booking ${status.replaceAll('_', ' ')}`)
  }
  const propose = () => {
    if (!reason.trim()) return toast('Add a short reason for the change', 'warn')
    update('change_requested', reason.trim(), { proposedDate: dateLabel(f.date), proposedSlot: f.slot, changeNote: reason.trim() })
    setChange(false); setReason('')
  }
  const acceptChange = () => { update('accepted', 'Vendor accepted the proposed slot', { date: b.proposedDate, slot: b.proposedSlot, proposedDate: undefined, proposedSlot: undefined }); }
  return <Screen title={b.id} right={<StatusBadge s={b.status} className="mr-2" />} overlay={<Sheet open={change} onClose={() => setChange(false)} title="Request a booking change" footer={<Button full onClick={propose}>Send change request</Button>}><div className="space-y-3"><Input label="New preferred date" type="date" min={nextDate()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><Select label="New preferred time" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} options={SLOTS} /><Input label="Reason" required textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div></Sheet>}>
    <Card><div className="flex items-start gap-3"><Thumb tone={l?.tone || 'teal'} icon={CalendarCheck} size={48} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="font-bold">{l?.title || 'Service booking'}</p><p className="mt-1 text-sm text-ink-500">{v?.name || 'Vendor'} · {b.date} at {b.slot}</p></div></div><div className="mt-4"><KV rows={[["Booking status", b.status.replaceAll('_', ' ')], ['Journey', b.bookingType === 'instant' ? 'Instant service' : b.bookingType === 'recurring' ? `Recurring · ${b.recurrence}` : 'Scheduled service'], ['Address', b.address], ['Customer', b.customer], ['Indicative amount', fmt(b.total || 0)]]} /></div></Card>
    {b.notes && <Card><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Service notes</p><p className="mt-1 text-sm text-ink-700">{b.notes}</p></Card>}
    {b.changeNote && <Banner tone="amber" title="Change requested">{b.changeNote}{b.proposedDate ? ` · ${b.proposedDate}, ${b.proposedSlot}` : ''}</Banner>}
    <Banner tone="blue" title="Payment is arranged directly">VendorVerse does not collect or settle payments for service bookings. Confirm the final price and terms with the other participant.</Banner>
    <Card><Timeline steps={(b.history || []).map((h) => ({ label: h.s.replaceAll('_', ' '), at: h.at, note: h.note, done: true }))} /></Card>
    <div className="flex flex-wrap gap-2">
      {customer && ['accepted', 'change_requested'].includes(b.status) && <Button variant="secondary" onClick={() => setChange(true)}>Request change</Button>}
      {customer && ['requested', 'accepted', 'change_requested'].includes(b.status) && <Button variant="danger" onClick={() => update('cancelled', 'Cancelled by customer')}>Cancel request</Button>}
      {customer && ['accepted', 'in_progress'].includes(b.status) && <Button variant="dangerSoft" onClick={() => update('payment_failed', 'Demo service payment failed')}>Payment failed</Button>}
      {!customer && b.status === 'requested' && <><Button onClick={() => update('accepted', 'Vendor confirmed the requested slot')}>Accept request</Button><Button variant="danger" onClick={() => update('declined', 'Vendor declined the request')}>Decline</Button></>}
      {!customer && b.status === 'change_requested' && <><Button onClick={acceptChange}>Accept new time</Button><Button variant="secondary" onClick={() => update('accepted', 'Vendor could not accept the requested change', { proposedDate: undefined, proposedSlot: undefined })}>Keep original time</Button></>}
      {!customer && b.status === 'accepted' && <Button onClick={() => update('in_progress', 'Vendor marked service in progress')}>Start service</Button>}
      {!customer && b.status === 'in_progress' && <Button onClick={() => update('completed', 'Vendor marked service complete')}>Mark complete</Button>}
      {customer && b.status === 'completed' && <><Button onClick={() => update('closed', 'Customer confirmed completion')}>Confirm completion</Button><Button variant="secondary" onClick={() => { update('disputed', 'Customer opened a dispute'); nav.go('c_report', { bookingId: b.id }) }}>Report a problem</Button><Button variant="soft" onClick={() => nav.go('c_review', { vendorId: b.vendorId, bookingId: b.id })}>Leave a review</Button></>}
      <Button variant="secondary" icon={MessageCircle} onClick={() => nav.go('messages')}>Messages</Button>
    </div>
  </Screen>
}

/* ================= PRODUCT PROCUREMENT ================= */
export function OrderNew({ params = {} }) {
  const nav = useNav()
  const { me, listings, vendor, orders, setOrders, notify, toast, stamp, rfqs } = useApp()
  const rfq = params.rfqId ? rfqs.find((x) => x.id === params.rfqId) : null
  const accepted = rfq?.acceptedTerms
  const quoteListing = accepted ? listings.find((x) => x.vendorId === accepted.vendorId && x.type === 'product') : null
  const l = listings.find((x) => x.id === params.listingId) || quoteListing || (accepted && rfq ? { id: `rfq-${rfq.id}`, vendorId: accepted.vendorId, title: rfq.title, price: accepted.amount, unit: 'quotation', moq: 1, lead: accepted.lead, variants: [] } : null)
  const [f, setF] = useState({ qty: 1, variant: l?.variants?.[0] || '', address: '', payment: 'Terms with supplier' })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [error, setError] = useState('')
  if (!l) return <Screen title="Create purchase order"><EmptyState icon={Package} title="Product unavailable" body="Choose an approved supplier listing or return to the quotation." action={<Button onClick={() => nav.back()}>Back</Button>} /></Screen>
  const enforceMoq = me.role !== 'customer'
  const minimumQty = enforceMoq ? (l.moq || 1) : 1
  const unitPrice = accepted?.amount || l.price
  const total = unitPrice * Number(f.qty || 0)
  const submit = (paymentState) => {
    if (!Number.isInteger(Number(f.qty)) || Number(f.qty) < minimumQty) return setError(enforceMoq ? `Minimum order quantity is ${minimumQty}` : 'Enter a valid quantity')
    if (l.stock !== undefined && Number(f.qty) > l.stock) return setError('Requested quantity is not available in the current catalogue')
    if (f.address.trim().length < 8) return setError('Add a delivery region or complete address')
    if (f.payment === 'Demo payment' && paymentState !== 'paid') return setPaymentOpen(true)
    const id = `PO-${Date.now().toString().slice(-6)}`
    const order = { id, vendorId: accepted?.vendorId || l.vendorId, listingId: l.id, rfqId: rfq?.id, qty: Number(f.qty), variant: f.variant, status: 'placed', pay: paymentState === 'paid' ? 'paid' : 'terms_pending', payRef: paymentState === 'paid' ? `demo_${Date.now()}` : undefined, date: stamp(), customer: me.name || ME_NAME, address: f.address.trim(), total, history: [{ s: 'placed', at: stamp(), note: rfq ? `Created from accepted quotation ${rfq.id}` : 'Purchase order created from supplier catalogue' }] }
    setOrders((all) => [order, ...all])
    notify('vendor', 'New purchase order', `${id} · ${l.title} · ${f.qty} ${l.unit}`, 'order')
    toast('Purchase order created')
    nav.replace('c_order', { id })
  }
  return <Screen title={rfq ? 'Create purchase order' : 'Buy / procure'} subtitle={rfq ? `From accepted quotation ${rfq.id}` : 'Supplier procurement'} overlay={<DemoPhonePePayment open={paymentOpen} amount={total} title="VendorVerse purchase order" onClose={() => setPaymentOpen(false)} onSuccess={() => { setPaymentOpen(false); submit('paid') }} />} footer={<Button full size="lg" icon={Package} onClick={() => submit()}>Create purchase order</Button>}>
    <Card><p className="text-sm font-bold">{l.title}</p><p className="mt-1 text-xs text-ink-500">{vendor(l.vendorId)?.name} · {l.lead || 'Configured'} day lead time</p><p className="mt-2 text-xl font-black">{fmt(unitPrice)} <span className="text-xs font-normal text-ink-500">/ {l.unit}</span></p></Card>
    <div className="flex gap-3"><Input label="Quantity" required type="number" min={minimumQty} value={f.qty} onChange={(e) => { setF({ ...f, qty: e.target.value }); setError('') }} /><Select label="Variant" value={f.variant} onChange={(e) => setF({ ...f, variant: e.target.value })} options={l.variants?.length ? l.variants : [{ value: '', label: 'Standard' }]} /></div>
    <Input label="Delivery region / address" required textarea rows={3} value={f.address} onChange={(e) => { setF({ ...f, address: e.target.value }); setError('') }} placeholder="Country, city, postal code and delivery instructions" />
    <Select label="Payment / commercial terms" value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })} options={['Terms with supplier', 'Demo payment']} />
    {error && <Banner tone="red">{error}</Banner>}
    <Card><KV rows={[['Order total', fmt(total || 0)], ['Delivery', `${l.lead || 'Supplier'} day lead time`], ['Verification', vendor(l.vendorId)?.status === 'approved' ? 'Verified supplier' : 'Pending supplier']]} /></Card>
    <Banner tone="blue" title="Procurement demo">This creates a trackable purchase order in the browser-local mock. Payment and fulfilment are simulated; a production implementation needs a server-side supplier and payment contract.</Banner>
  </Screen>
}

const ORDER_STEPS = [['placed', 'Purchase order created'], ['payment_confirmed', 'Payment / terms confirmed'], ['payment_failed', 'Payment failed'], ['confirmed', 'Supplier accepted'], ['packed', 'Processing'], ['shipped', 'Shipped'], ['delivery_exception', 'Delivery exception'], ['delivered', 'Delivered'], ['disputed', 'Disputed'], ['completed', 'Completed']]
export function OrderDetail({ params = {} }) {
  const nav = useNav()
  const { me, orders, patchOrder, listings, vendor, notify, toast, stamp } = useApp()
  const o = orders.find((x) => x.id === params.id)
  if (!o) return <Screen title="Purchase order"><EmptyState icon={Package} title="Order not found" action={<Button onClick={() => nav.back()}>Back</Button>} /></Screen>
  const l = listings.find((x) => x.id === o.listingId)
  const isSupplier = me.role === 'vendor' && o.vendorId === me.vendorId
  const isBuyer = o.customer === me.name || me.role === 'customer'
  const next = { placed: ['confirmed', 'Supplier accepted'], confirmed: ['packed', 'Order processing'], packed: ['shipped', 'Order shipped'], shipped: ['delivered', 'Delivery marked received'], delivered: ['completed', 'Order completed'] }[o.status]
  const update = (status, note, extra = {}) => { patchOrder(o.id, (x) => ({ ...x, ...extra, status, history: [...(x.history || []), { s: status, at: stamp(), note }] })); notify(isSupplier ? 'customer' : 'vendor', `Order ${status}`, `${o.id} · ${note}`, 'order'); toast(`Order ${status.replaceAll('_', ' ')}`) }
  const updatePayment = (pay, note) => { patchOrder(o.id, (x) => ({ ...x, pay, history: [...(x.history || []), { s: pay === 'paid' ? 'payment_confirmed' : 'payment_failed', at: stamp(), note }] })); notify('vendor', `Payment ${pay === 'paid' ? 'confirmed' : 'failed'}`, `${o.id} · ${note}`, 'payment'); toast(note, pay === 'paid' ? 'ok' : 'warn') }
  return <Screen title={o.id} right={<StatusBadge s={o.status} className="mr-2" />}>
    <Card><div className="flex items-center gap-3"><Thumb tone={l?.tone || 'teal'} icon={Package} size={52} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{l?.title || 'Supplier order'}</p><p className="text-xs text-ink-500">{vendor(o.vendorId)?.name || 'Supplier'} · {o.qty} {l?.unit || 'units'}</p></div></div><div className="mt-4"><KV rows={[['Buyer', o.customer], ['Delivery', o.address], ['Commercial total', fmt(o.total || 0)], ['Payment', o.pay === 'paid' ? 'Demo payment captured' : o.pay === 'terms_confirmed' ? 'Terms confirmed' : o.pay === 'refund_pending' ? 'Refund pending' : o.pay === 'terms_pending' ? 'Terms pending' : o.pay]]} /></div></Card>
    <Card><Timeline steps={(o.history || []).map((h) => ({ label: ORDER_STEPS.find((x) => x[0] === h.s)?.[1] || h.s, at: h.at, note: h.note, done: true }))} /></Card>
    <div className="flex flex-wrap gap-2">{isBuyer && o.pay === 'terms_pending' && ['placed', 'confirmed'].includes(o.status) && <><Button onClick={() => updatePayment('terms_confirmed', 'Commercial terms confirmed by buyer')}>Confirm payment / terms</Button><Button variant="dangerSoft" onClick={() => update('payment_failed', 'Demo purchase payment failed')}>Payment failed</Button></>}{isBuyer && ['placed', 'confirmed'].includes(o.status) && <Button variant="danger" onClick={() => update('cancelled', 'Cancelled by buyer', { pay: o.pay === 'paid' ? 'refund_pending' : o.pay })}>Cancel order</Button>}{isSupplier && o.status === 'placed' && <Button variant="dangerSoft" onClick={() => update('rejected', 'Supplier rejected the purchase order')}>Reject order</Button>}{isSupplier && next && <Button onClick={() => update(next[0], next[1])}>{next[1]}</Button>}{isBuyer && o.status === 'shipped' && <Button variant="dangerSoft" onClick={() => update('delivery_exception', 'Buyer reported a delivery exception')}>Delivery exception</Button>}{isBuyer && o.status === 'delivered' && <><Button onClick={() => update('completed', 'Buyer confirmed delivery')}>Confirm delivery</Button><Button variant="dangerSoft" onClick={() => update('disputed', 'Buyer disputed the delivered order')}>Dispute order</Button></>}<Button variant="secondary" icon={MessageCircle} onClick={() => nav.go('messages')}>Message supplier</Button></div>
    {o.status === 'cancelled' && <Banner tone="amber" title="Cancellation recorded">Refund or settlement status: {o.pay || 'pending'}.</Banner>}
  </Screen>
}

export function RfqDetail({ params }) {
  const nav = useNav()
  const { rfqs, patchRfq, vendor, notify, toast, stamp } = useApp()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-311'))
  const [tab, setTab] = useState('quotes')
  const [cmp, setCmp] = useState(false)
  const [ask, setAsk] = useState(null)
  const [msg, setMsg] = useState('')
  const [acc, setAcc] = useState(null)
  const [hist, setHist] = useState(null)
  const setRfqState = (status, note) => { patchRfq(r.id, (x) => ({ status, history: [...x.history, { s: status, at: stamp(), note }] })); toast(note) }
  const best = r.quotes.length ? Math.min(...r.quotes.map((q) => q.amount)) : 0
  const fast = r.quotes.length ? Math.min(...r.quotes.map((q) => q.lead)) : 0
  const sorted = [...r.quotes].sort((a, b) => a.amount - b.amount)
  const accepted = r.quotes.find((q) => q.status === 'accepted')
  const accept = () => {
    if (!acc || ['accepted', 'closed', 'withdrawn', 'expired', 'no_quotes'].includes(r.status) || acc.status === 'rejected' || dateExpired(acc.validity)) { toast('This quotation is no longer available. Refresh and choose a current quote.', 'warn'); setAcc(null); return }
    const acceptedTerms = { quoteId: acc.id, vendorId: acc.vendorId, amount: acc.amount, lead: acc.lead, validity: acc.validity, notes: acc.notes, acceptedAt: stamp() }
    patchRfq(r.id, (x) => {
      if (!['open', 'quoted'].includes(x.status) || !x.quotes.some((q) => q.id === acc.id && q.status !== 'rejected')) return x
      return { status: 'accepted', acceptedTerms, quotes: x.quotes.map((q) => ({ ...q, status: q.id === acc.id ? 'accepted' : 'rejected' })), history: [...x.history, { s: 'accepted', at: stamp(), note: `Accepted quote from ${vendor(acc.vendorId).name}; terms recorded` }] }
    })
    notify('vendor', 'Quotation accepted 🎉', `${r.id} · ${fmt(acc.amount)}`, 'rfq')
    toast('Quotation accepted — vendor notified')
    setAcc(null)
  }
  const send = () => {
    if (!msg.trim()) return
    patchRfq(r.id, (x) => ({ chat: [...x.chat, { from: 'me', vendorId: ask.vendorId, text: msg, at: 'Just now' }] }))
    notify('vendor', 'Question on your quotation', `${r.id}: ${msg.slice(0, 50)}`, 'rfq')
    setMsg(''); setAsk(null); toast('Question sent to vendor')
  }
  return (
    <Screen
      title={r.id}
      right={<StatusBadge s={r.status} className="mr-2" />}
      overlay={
        <>
          <Sheet open={!!ask} onClose={() => setAsk(null)} title={`Ask ${ask ? vendor(ask.vendorId).name : ''}`} footer={<Button full icon={Send} onClick={send} disabled={!msg.trim()}>Send question</Button>}>
            <Input textarea rows={3} placeholder="Ask about price, delivery, warranty or negotiate…" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <div className="flex flex-wrap gap-2">{['Can you reduce the price?', 'Is installation included?', 'Can you deliver sooner?'].map((s) => <Pill key={s} className="cursor-pointer" ><button onClick={() => setMsg(s)}>{s}</button></Pill>)}</div>
          </Sheet>
          <Dialog open={!!acc} onClose={() => setAcc(null)} title="Accept this quotation?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setAcc(null)}>Not now</Button><Button className="flex-1" onClick={accept}>Accept</Button></>}>
            {acc && <><p><b>{vendor(acc.vendorId).name}</b> will be awarded this requirement for <b>{fmt(acc.amount)}</b>, delivered in {acc.lead} days.</p><p>Other quotations will be marked as not selected.</p></>}
          </Dialog>
          <Sheet open={!!hist} onClose={() => setHist(null)} title="Quotation history">
            {hist && <Timeline steps={[...hist.history].reverse().map((h, i) => ({ label: fmt(h.amount), at: h.at, note: i === 0 ? 'Latest' : 'Previous', done: true }))} />}
          </Sheet>
        </>
      }
    >
      <Card>
        <p className="text-base font-bold leading-snug">{r.title}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><Meta icon={Package}>{r.qty}</Meta><Meta icon={CircleDollarSign}>{r.budget}</Meta><Meta icon={Clock}>Quotes by {r.deadline}</Meta><Meta icon={Store}>{cat(r.cat).name}</Meta></div>
      </Card>
      {!accepted && !['closed', 'withdrawn', 'expired'].includes(r.status) && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setRfqState('withdrawn', 'RFQ withdrawn by buyer')}>Withdraw RFQ</Button>{!r.quotes.length && <Button size="sm" variant="soft" onClick={() => setRfqState('no_quotes', 'No supplier quotations received')}>Mark no quotes</Button>}</div>}
      {accepted && (
        <Banner tone="green" title={`Accepted: ${vendor(accepted.vendorId).name}`} action={<div className="flex gap-2"><Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => nav.go('chat', { vendorId: accepted.vendorId })}>Message vendor</Button><Button size="sm" onClick={() => nav.go('c_order_new', { rfqId: r.id })}>Create PO</Button></div>}>Accepted terms saved: {fmt((r.acceptedTerms || accepted).amount)} · { (r.acceptedTerms || accepted).lead } days · valid until {(r.acceptedTerms || accepted).validity}. Continue to a purchase order for supplier fulfilment.</Banner>
      )}
      <Segmented value={tab} onChange={setTab} options={[{ id: 'quotes', label: 'Quotes', count: r.quotes.length }, { id: 'details', label: 'Details' }, { id: 'history', label: 'History' }]} />
      {tab === 'quotes' && (
        <div className="space-y-3">
          {r.quotes.length === 0 && <EmptyState icon={Clock} title="Waiting for quotes" body="Matching vendors have been notified. You will get an alert for each quotation." />}
          {r.quotes.length > 1 && <Button full variant="soft" icon={GitCompare} onClick={() => { const next = !cmp; setCmp(next); if (next && !['accepted', 'closed'].includes(r.status)) setRfqState('comparing', 'Quotations are being compared') }}>{cmp ? 'Hide comparison' : 'Compare quotations'}</Button>}
          {cmp && (
            <Card pad={false} className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[320px] text-left text-xs">
                <thead><tr className="border-b border-ink-100 bg-ink-50"><th className="p-3 font-semibold text-ink-500"> </th>{sorted.map((q) => <th key={q.id} className="p-3 font-bold">{vendor(q.vendorId).name.split(' ')[0]}</th>)}</tr></thead>
                <tbody>
                  {[['Price', (q) => <b className={q.amount === best ? 'text-emerald-600' : ''}>{fmt(q.amount)}</b>], ['Lead time', (q) => `${q.lead} days`], ['Valid till', (q) => q.validity], ['Verified', (q) => (vendor(q.vendorId).status === 'approved' ? '✓ Yes' : '✕ No')], ['Rating', (q) => vendor(q.vendorId).rating || '—']].map(([k, fn]) => <tr key={k} className="border-b border-ink-100 last:border-0"><td className="p-3 font-semibold text-ink-500">{k}</td>{sorted.map((q) => <td key={q.id} className="p-3">{fn(q)}</td>)}</tr>)}
                </tbody>
              </table>
            </Card>
          )}
          {sorted.map((q) => {
            const v = vendor(q.vendorId)
            return (
              <Card key={q.id} className={cx(q.status === 'accepted' && '!ring-2 !ring-emerald-500', q.status === 'rejected' && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={40} round="rounded-xl" /><div><p className="text-sm font-bold leading-tight">{v.name}</p><div className="mt-1"><VerifiedBadge id={v.id} /></div></div></div>
                  {q.status === 'accepted' ? <Badge tone="green">Accepted</Badge> : q.status === 'rejected' ? <Badge tone="gray">Not selected</Badge> : null}
                </div>
                <div className="mt-3 flex items-end justify-between"><div><p className="text-2xl font-extrabold">{fmt(q.amount)}</p><p className="text-xs text-ink-500">Delivery in {q.lead} days · valid till {q.validity}</p></div><div className="flex flex-col items-end gap-1">{q.amount === best && r.quotes.length > 1 && <Badge tone="green"><TrendingDown size={11} />Lowest</Badge>}{q.lead === fast && r.quotes.length > 1 && <Badge tone="blue"><Zap size={11} />Fastest</Badge>}</div></div>
                <p className="mt-2 rounded-xl bg-ink-50 p-2.5 text-[13px] text-ink-600">{q.notes}</p>
                {q.history.length > 1 && <button onClick={() => setHist(q)} className="mt-2 text-xs font-bold text-brand-700">Revised {q.history.length - 1}× — see history</button>}
                {r.chat.filter((c) => c.vendorId === q.vendorId).map((c, i) => <p key={i} className={cx('mt-2 rounded-xl p-2.5 text-xs', c.from === 'me' ? 'bg-brand-50 text-brand-900' : 'bg-ink-100 text-ink-700')}><b>{c.from === 'me' ? 'You' : v.name.split(' ')[0]}:</b> {c.text}</p>)}
                {!['accepted', 'closed', 'withdrawn', 'expired', 'no_quotes'].includes(r.status) && q.status !== 'rejected' && (
                  <div className="mt-3 flex gap-2"><Button variant="secondary" size="sm" className="flex-1" onClick={() => { setRfqState('negotiating', 'Revision requested from supplier'); setAsk(q) }}>Request revision</Button><Button disabled={dateExpired(q.validity)} size="sm" className="flex-1" onClick={() => setAcc(q)}>{dateExpired(q.validity) ? 'Quote expired' : 'Accept quote'}</Button></div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      {tab === 'details' && (
        <div className="space-y-3">
          <Card><p className="text-sm leading-relaxed text-ink-600">{r.desc}</p></Card>
          <Card><KV rows={[['Categories', (r.cats || [r.cat]).map((id) => cat(id).name).join(', ')], ['Budget by category', r.categoryBudgets ? Object.entries(r.categoryBudgets).map(([id, amount]) => `${cat(id).name}: ${amount || 'Not set'}`).join(' · ') : r.budget], ['Quantity', r.qty], ['Location', r.location], ['Created', r.created], ['Deadline', r.deadline]]} /></Card>
          {r.files.length > 0 && <Section title="Attachments"><div className="space-y-2">{r.files.map((f) => <div key={f} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><FileText size={18} className="text-brand-600" /><span className="flex-1 truncate text-sm font-medium">{f}</span><Download size={16} className="text-ink-400" /></div>)}</div></Section>}
        </div>
      )}
      {tab === 'history' && <Card><Timeline steps={r.history.map((h) => ({ label: h.s === 'open' ? 'RFQ published' : h.s === 'submitted' ? 'Sent to vendors' : h.s === 'quoted' ? 'Quotations received' : h.s === 'comparing' ? 'Comparing quotations' : h.s === 'negotiating' ? 'Negotiating terms' : h.s === 'accepted' ? 'Quotation accepted' : h.s, at: h.at, note: h.note, done: true }))} /></Card>}
    </Screen>
  )
}

/* ================= SAVED & COMPARE ================= */
export function Saved({ params = {} }) {
  const nav = useNav()
  const { saved, listings, vendors, compare, toggleCompare, vendor, setCompare } = useApp()
  const [tab, setTab] = useState(params.tab || 'saved')
  const sl = listings.filter((l) => saved.includes(l.id))
  const sv = vendors.filter((v) => saved.includes(v.id))
  const cl = compare.map((id) => listings.find((l) => l.id === id)).filter(Boolean)
  const rows = [['Price', (l) => <b>{fmt(l.price)}</b>], ['Rating', (l) => (l.rating ? `${l.rating} ★` : '—')], ['Vendor', (l) => vendor(l.vendorId).name.split(' ')[0]], ['Verified', (l) => (vendor(l.vendorId).status === 'approved' ? '✓' : '✕')], ['Lead time', (l) => (l.lead ? `${l.lead}d` : `${l.duration}m`)], ['Stock', (l) => (l.type === 'service' ? 'Bookable' : l.stock || 'Out')]]
  return (
    <Screen title="Saved & compare">
      <Segmented value={tab} onChange={setTab} options={[{ id: 'saved', label: 'Saved', count: sl.length + sv.length }, { id: 'compare', label: 'Compare', count: cl.length }]} />
      {tab === 'saved' && (
        <div className="space-y-2.5">
          {sv.map((v) => <VendorRow key={v.id} v={v} />)}
          {sl.map((l) => <ListingCard key={l.id} l={l} />)}
          {!sl.length && !sv.length && <EmptyState icon={Heart} title="Nothing saved yet" body="Tap the heart on any vendor or listing to keep it here." action={<Button size="sm" onClick={() => nav.go('c_explore')}>Explore</Button>} />}
        </div>
      )}
      {tab === 'compare' && (
        cl.length < 2 ? (
          <EmptyState icon={GitCompare} title="Pick 2–3 items to compare" body={cl.length ? `${cl.length} selected. Add one more from any listing page.` : 'Open a listing and tap “Compare” to add it here.'} action={<Button size="sm" onClick={() => nav.go('c_explore')}>Browse listings</Button>} />
        ) : (
          <>
            <div className="vv-compare-scroll"><div className="vv-compare-table space-y-2">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cl.length}, 1fr)` }}>
                {cl.map((l) => <Card key={l.id} className="relative !p-2.5 text-center"><button aria-label="Remove" onClick={() => toggleCompare(l.id)} className="absolute right-1.5 top-1.5"><X size={14} className="text-ink-400" /></button><Thumb tone={l.tone} icon={cat(l.cat).icon} size={44} className="mx-auto" round="rounded-xl" /><p className="mt-2 line-clamp-2 text-[11px] font-bold leading-tight">{l.title}</p></Card>)}
              </div>
              <Card pad={false} className="overflow-hidden">
                {rows.map(([k, fn], i) => (
                  <div key={k} className={cx('px-3 py-2.5', i % 2 === 0 && 'bg-ink-50')}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{k}</p>
                    <div className="mt-0.5 grid gap-2 text-center text-sm" style={{ gridTemplateColumns: `repeat(${cl.length}, 1fr)` }}>{cl.map((l) => <span key={l.id}>{fn(l)}</span>)}</div>
                  </div>
                ))}
              </Card>
            </div></div>
            <Button full variant="secondary" onClick={() => setCompare([])}>Clear comparison</Button>
          </>
        )
      )}
    </Screen>
  )
}

/* ================= MESSAGES (shared by customer + vendor) ================= */


/* ================= NOTIFICATIONS (shared) ================= */
const NTONE = { order: ['amber', Package], booking: ['sky', CalendarCheck], rfq: ['violet', FileText], payment: ['emerald', Wallet], review: ['rose', Star], onboarding: ['teal', BadgeCheck], followup: ['orange', Clock], dispute: ['rose', ShieldAlert], listing: ['indigo', Package] }
const NDEST = {
  customer: { order: ['messages'], booking: ['messages'], rfq: ['c_activity'], payment: ['messages'], review: ['messages'] },
  vendor: { order: ['messages'], booking: ['messages'], rfq: ['v_work'], onboarding: ['v_listings'], payment: ['v_more'], review: ['v_reviews'] },
  agent: { onboarding: ['a_leads'], followup: ['a_followups'], payment: ['a_earnings'] },
  admin: { onboarding: ['ad_vendors'], dispute: ['ad_cases'], listing: ['ad_listings'], payment: ['ad_reports'] },
}
export function Notifications() {
  const nav = useNav()
  const { me, notifs, setNotifs, prefs } = useApp()
  const role = me.role || 'customer'
  const inbox = useInbox(role)
  const list = remoteInbox ? inbox.rows : notifs[role] || []
  const fresh = list.filter((n) => !n.read)
  const old = list.filter((n) => n.read)
  const open = (n) => {
    if (remoteInbox) {
      if (!n.read) inbox.markRead(n.id)
      if (n.to) nav.go(n.to[0], n.to[1] || {})
      return
    }
    setNotifs((s) => ({ ...s, [role]: s[role].map((x) => (x.id === n.id ? { ...x, read: true } : x)) }))
    const d = NDEST[role]?.[n.type]
    if (d) nav.go(d[0], d[1] || {})
  }
  const Row = ({ n }) => {
    const [tone, I] = NTONE[n.type] || ['slate', Bell]
    return (
      <button onClick={() => open(n)} className={cx('flex w-full items-start gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset', n.read ? 'bg-white ring-ink-100' : 'bg-brand-50/60 ring-brand-100')}>
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', SOFT[tone])}><I size={19} /></span>
        <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{n.title}</span><span className="shrink-0 text-[11px] text-ink-400">{n.time}</span></span><span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{n.body}</span></span>
        {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" />}
      </button>
    )
  }
  return (
    <Screen title="Notifications" right={fresh.length > 0 ? <button onClick={() => (remoteInbox ? inbox.markAll() : setNotifs((s) => ({ ...s, [role]: s[role].map((x) => ({ ...x, read: true })) })))} className="mr-2 text-[13px] font-bold text-brand-700">Mark all read</button> : null}>
      {remoteInbox && inbox.error && <p className="text-center text-sm text-red-600">{inbox.error}</p>}
      {list.length === 0 && !inbox.loading && !inbox.error && <EmptyState icon={Bell} title="You’re all caught up" />}
      {fresh.length > 0 && <Section title="New"><div className="space-y-2">{fresh.map((n) => <Row key={n.id} n={n} />)}</div></Section>}
      {old.length > 0 && <Section title="Earlier"><div className="space-y-2">{old.map((n) => <Row key={n.id} n={n} />)}</div></Section>}
      {remoteInbox && inbox.more && <button onClick={inbox.loadMore} disabled={inbox.loading} className="mx-auto block text-[13px] font-bold text-brand-700">Load older</button>}
      <p className="text-center text-xs text-ink-400">In-app notifications are on. Email, SMS and WhatsApp depend on provider readiness.</p>
    </Screen>
  )
}

/* ================= REVIEW ================= */

/* ================= ISSUES & SUPPORT ================= */
export function Issues() {
  const nav = useNav()
  const { disputes } = useApp()
  const mine = disputes.filter((d) => d.raisedBy === ME_NAME)
  return (
    <Screen title="Cases" right={<IconBtn label="New" onClick={() => nav.go('c_report')}><Plus size={21} /></IconBtn>}>
      {mine.length === 0 && <EmptyState icon={HelpCircle} title="No cases raised" body="If something goes wrong with an order or booking, report it here." action={<Button size="sm" onClick={() => nav.go('c_report')}>Report an issue</Button>} />}
      {mine.map((d) => (
        <Card key={d.id} onClick={() => nav.go('c_case', { id: d.id })} className="!p-3.5">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{d.id} · {d.ref}</span><StatusBadge s={d.status} /></div>
          <p className="mt-1 text-sm font-bold">{d.title}</p><p className="mt-0.5 text-xs text-ink-500">Against {d.against} · {d.created}</p>
        </Card>
      ))}
    </Screen>
  )
}
export function IssueDetail({ params }) {
  const { disputes } = useApp()
  const d = disputes.find((x) => x.id === params.id) || disputes[0]
  return (
    <Screen title={d.id} subtitle={d.ref} right={<StatusBadge s={d.status} className="mr-2" />}>
      <Card><p className="text-base font-bold">{d.title}</p><p className="mt-2 text-sm text-ink-600">{d.desc}</p></Card>
      <Card><KV rows={[['Against', d.against], ['Reference', d.ref], ['Opened', d.created], d.amount ? ['Amount', fmt(d.amount)] : null]} /></Card>
      <Section title="Activity"><Card><Timeline steps={[...d.actions].map((a) => ({ label: a.action, at: `${a.by} · ${a.at}`, done: true }))} /></Card></Section>
    </Screen>
  )
}

/* ================= PROFILE ================= */
export function Profile() {
  const nav = useNav()
  const { me, setMe, t, lang, setLang, saved, orders, toast } = useApp()
  if (!me.loggedIn) return <GuestWall title={t('profile')} />
  return (
    <Screen title={t('profile')} back={false} pad={false}>
      <div className="space-y-4 p-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={me.name || ME_NAME} size={60} />
            <div className="min-w-0 flex-1"><p className="text-lg font-extrabold">{me.name || ME_NAME}</p><p className="text-sm text-ink-500">+91 98290 00001</p><Badge tone="teal" className="mt-1.5">Customer</Badge></div>
            <Button size="sm" variant="soft" onClick={() => nav.go('c_profile_edit')}>Edit</Button>
          </div>
        </Card>
        <Group>
          <ListRow icon={Heart} tone="rose" title="Saved & compare" subtitle={`${saved.length} saved items`} onClick={() => nav.go('c_saved')} />
          <ListRow icon={FileText} tone="violet" title="My quote requests" subtitle="RFQs and quotations" onClick={() => nav.go('c_activity')} />
          <ListRow icon={Star} tone="amber" title="Rate a vendor" subtitle="After you have talked to them" onClick={() => nav.go('c_review')} />
          <ListRow icon={ShieldAlert} tone="violet" title="Cases" subtitle="Report and track problems" onClick={() => nav.go('c_cases')} />
          <ListRow icon={FileText} tone="violet" title="Dashboard" onClick={() => nav.go('c_dash')} />
          <ListRow icon={FileText} tone="violet" title="Purchase orders" onClick={() => nav.go('c_orders')} />
          <ListRow icon={FileText} tone="violet" title="Contracts" onClick={() => nav.go('c_contract')} />
          <ListRow icon={FileText} tone="violet" title="Companies (Phase 2)" subtitle="Buy directly from verified companies" onClick={() => nav.go('c_companies')} />
          <ListRow icon={Star} tone="amber" title="My reviews" onClick={() => nav.go('c_reviews')} last />
        </Group>
        {me.hasVendorAccount && <Card onClick={() => nav.go('vb_home')} className="!p-4"><div className="flex items-center gap-3"><Thumb tone="violet" icon={Store} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Buy from other vendors</p><p className="mt-0.5 text-xs text-ink-500">Find suppliers, send bulk RFQs and track purchases</p></div><ChevronRight size={17} className="text-ink-300" /></div></Card>}
        {me.hasVendorAccount ? <Card onClick={() => { setMe({ ...me, role: 'vendor', name: me.vendorName || me.name, buyerMode: false }); nav.reset('v_dash') }} className="!p-4"><div className="flex items-center gap-3"><Thumb tone="teal" icon={Store} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Open vendor workspace</p><p className="mt-0.5 text-xs text-ink-500">Manage {me.vendorName || 'your business'} and supplier work</p></div><ChevronRight size={17} className="text-ink-300" /></div></Card> : <Card onClick={() => nav.go('v_register')} className="!border-brand-200 !bg-brand-50/60 !p-4"><div className="flex items-center gap-3"><Thumb tone="teal" icon={Store} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-brand-900">Become a vendor</p><p className="mt-0.5 text-xs text-brand-800/75">Create a business account and start selling products or services</p></div><ChevronRight size={17} className="text-brand-500" /></div></Card>}
        <Group>
          <ListRow icon={Globe} tone="sky" title={t('language')} subtitle={lang === 'en' ? 'English' : 'हिन्दी'} onClick={() => { setLang(lang === 'en' ? 'hi' : 'en'); toast(lang === 'en' ? 'भाषा हिन्दी में बदली गई' : 'Language set to English') }} />
          <ListRow icon={Bell} tone="orange" title="Notifications" subtitle="Alerts & channels" onClick={() => nav.go('c_notif_prefs')} />
          <ListRow icon={Lock} tone="slate" title="Privacy, security & sessions" subtitle="Data export, delete account" onClick={() => nav.go('c_sessions')} />
          <ListRow icon={Lock} tone="slate" title="Your data & account deletion" onClick={() => nav.go('c_export')} />
          <ListRow icon={Lock} tone="slate" title="Account status" onClick={() => nav.go('acct_state')} />
          <ListRow icon={Lock} tone="red" title="Delete account" onClick={() => nav.go('c_delete')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: 'customer', loggedIn: false, guest: true, vendorId: 'v-me', name: 'Guest' }); nav.reset('c_home') }}>{t('logout')}</Button>
        <p className="text-center text-xs text-ink-400">VendorVerse v1.0 · ADRSTECHNO PRIVATE LIMITED</p>
      </div>
    </Screen>
  )
}

const fmtPhone = (p) => (/^\+91\d{10}$/.test(p || '') ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p || '')

export function ProfileEdit({ params = {} }) {
  const nav = useNav()
  const { me, setMe, toast, locale, setLocale } = useApp()
  const remote = Boolean(authService.isRemote) // real API: name, email and address live on the server (F-ACC-06)
  const [f, setF] = useState(remote ? { name: '', email: '', city: locale.city || 'Jaipur', address: '' } : { name: me.name || ME_NAME, email: 'aarav.mehta@gmail.com', city: locale.city || 'Jaipur', address: '24, Vaishali Nagar, Jaipur 302021' })
  const [phone, setPhone] = useState('+91 98290 00001')
  const [emailOk, setEmailOk] = useState(false)
  const [homeLoc, setHomeLoc] = useState(null)
  const [loading, setLoading] = useState(remote)
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})
  useEffect(() => {
    if (!remote) return undefined
    let live = true
    ;(async () => {
      const [p, l] = await Promise.all([authService.getProfile(), authService.listLocations()])
      if (!live) return
      if (p.ok) {
        setF((x) => ({ ...x, name: p.profile.displayName || '', email: p.profile.email || '' }))
        setEmailOk(Boolean(p.profile.emailVerified))
        if (p.profile.phone) setPhone(fmtPhone(p.profile.phone))
      } else toast(p.message)
      const home = l.ok ? l.locations.find((x) => x.isDefault) : null
      if (home) { setHomeLoc(home); setF((x) => ({ ...x, address: home.addressText })) }
      setLoading(false)
    })()
    return () => { live = false }
  }, [])
  const save = async () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Name is required'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email'
    setErrs(e)
    if (Object.keys(e).length) return
    if (remote) {
      setSaving(true)
      const r = await authService.saveProfile({ displayName: f.name.trim(), email: f.email.trim() ? f.email.trim() : null })
      const address = f.address.trim()
      let loc = { ok: true }
      if (r.ok && address && (!homeLoc || homeLoc.addressText !== address)) {
        loc = homeLoc ? await authService.updateLocation(homeLoc.id, { addressText: address }) : await authService.addLocation({ label: 'Home', addressText: address, isDefault: true })
      }
      setSaving(false)
      if (!r.ok || !loc.ok) { const msg = (r.ok ? loc : r).message; setErrs({ form: msg }); return toast(msg) }
    }
    setMe({ ...me, name: f.name.trim() }); const place = findCity(f.city); if (place && f.city !== locale.city) setLocale({ ...locale, ...place, pincode: '' }); toast('Profile updated')
    if (params.firstRun) nav.reset('c_home'); else nav.back()
  }
  return (
    <Screen title="Edit profile" footer={<Button full size="lg" disabled={loading || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>}>
      <div className="flex justify-center py-2"><div className="relative"><Avatar name={f.name || 'A'} size={84} /><span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-brand-600 text-white ring-4 ring-ink-50"><ImagePlus size={15} /></span></div></div>
      {errs.form && <p role="alert" className="text-center text-sm font-medium text-red-600">{errs.form}</p>}
      <Input label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} />
      <Input label="Mobile number" value={phone} readOnly hint="Verified · contact support to change" />
      <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errs.email} hint={remote && f.email ? (emailOk ? 'Verified' : 'Not verified yet — email verification is coming soon') : undefined} />
      <Select label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar']} />
      <Input label="Default address" textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
    </Screen>
  )
}


/* ================= SETTINGS / PRIVACY ================= */
export function CustomerSettings() {
  const nav = useNav()
  const { lang, setLang, prefs, setPrefs, toast, setMe } = useApp()
  const [del, setDel] = useState(false)
  const [sessions, setSessions] = useState([{ id: 1, d: 'This device · Chrome', w: 'Jaipur · Active now' }, { id: 2, d: 'Pixel 8 · VendorVerse app', w: 'Jaipur · 2 days ago' }])
  const P = (k) => (v) => setPrefs({ ...prefs, [k]: v })
  return (
    <Screen
      title="Settings & privacy"
      overlay={<Dialog open={del} onClose={() => setDel(false)} title="Delete your account?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={() => { setDel(false); setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' }); nav.reset('welcome'); toast('Deletion requested') }}>Delete</Button></>}><p>Your profile will be removed after a 30-day grace period. Order and payment records are retained for tax and legal compliance as per the retention policy.</p></Dialog>}
    >
      <Section title="Language"><Segmented value={lang} onChange={setLang} options={[{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिन्दी' }]} /></Section>
      <Section title="Notifications">
        <Card className="space-y-1">
          <Toggle label="In-app notifications" desc="Always on — order, booking, quote & payment updates" on={true} onChange={() => toast('In-app alerts are required')} />
          <div className="h-px bg-ink-100" />
          <Toggle label="Order updates" on={prefs.orders} onChange={P('orders')} />
          <Toggle label="Booking updates" on={prefs.bookings} onChange={P('bookings')} />
          <Toggle label="Quotation alerts" on={prefs.quotes} onChange={P('quotes')} />
          <Toggle label="Offers & promotions" on={prefs.promos} onChange={P('promos')} />
        </Card>
        <Banner tone="blue" title="More channels coming">Email, SMS, push and WhatsApp alerts will be enabled once providers are ready.</Banner>
      </Section>
      <Section title="Active sessions">
        <Group>{sessions.map((s, i) => <ListRow key={s.id} icon={Smartphone} tone="slate" title={s.d} subtitle={s.w} last={i === sessions.length - 1} right={i > 0 ? <button onClick={() => { setSessions(sessions.filter((x) => x.id !== s.id)); toast('Signed out of device') }} className="text-[13px] font-bold text-red-600">Sign out</button> : <Badge tone="green">Current</Badge>} />)}</Group>
      </Section>
      <Section title="Your data">
        <Group>
          <ListRow icon={Download} tone="sky" title="Export my data" subtitle="Receive a copy by email within 48 hrs" onClick={() => toast('Data export requested')} />
          <ListRow icon={Trash2} danger title="Delete my account" subtitle="Subject to legal retention rules" onClick={() => setDel(true)} last />
        </Group>
      </Section>
    </Screen>
  )
}

/* ================= QUOTES (RFQ list) ================= */
export function Quotes() {
  const nav = useNav()
  const { me, rfqs, bookings, listings, vendor } = useApp()
  const [flt, setFlt] = useState('active')
  const [kind, setKind] = useState('quotes')
  if (!me.loggedIn) return <GuestWall title="Quotes" />
  const mine = rfqs.filter((r) => r.mine)
  const list = mine.filter((r) => (flt === 'active') === !['accepted', 'closed'].includes(r.status))
  const myBookings = bookings.filter((b) => b.customer === (me.name || ME_NAME))
  return (
    <Screen title="My quote requests" back={false} right={<IconBtn label="New RFQ" onClick={() => nav.go('c_rfq_new')}><Plus size={21} /></IconBtn>}>
      <Segmented value={kind} onChange={(v) => { setKind(v); }} options={[{ id: 'quotes', label: 'Quotes' }, { id: 'bookings', label: `Bookings (${myBookings.length})` }]} />
      {kind === 'quotes' ? <>
      <Banner tone="blue">Post what you need and vendors reply with a quotation. Agree on the deal directly with the vendor in Messages.</Banner>
      <Chips scroll={false} value={flt} onChange={setFlt} options={[{ id: 'active', label: 'Active' }, { id: 'past', label: 'Closed' }]} />
      <div className="space-y-2.5">
        {list.map((r) => (
          <Card key={r.id} onClick={() => nav.go('c_rfq', { id: r.id })} className="!p-3.5">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{r.id}</span><StatusBadge s={r.status} /></div>
            <p className="mt-1 text-sm font-bold">{r.title}</p>
            <p className="mt-1 flex items-center gap-3 text-xs text-ink-500"><span>{r.qty}</span><span>·</span><span>{r.quotes.length} quotes</span><span>·</span><span>by {r.deadline}</span></p>
          </Card>
        ))}
        {!list.length && <EmptyState icon={FileText} title={`No ${flt === 'active' ? 'active' : 'closed'} requests`} body="Request a quotation and compare replies from verified vendors." action={<Button size="sm" onClick={() => nav.go('c_rfq_new')}>Request quotation</Button>} />}
      </div>
      </> : <>
        <Banner tone="blue">Track service requests, confirm proposed times, and report a problem from the booking record. Payments are arranged directly with the vendor.</Banner>
        <div className="space-y-2.5">{myBookings.map((b) => { const l = listings.find((x) => x.id === b.listingId); return <Card key={b.id} onClick={() => nav.go('c_booking', { id: b.id })} className="!p-3.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-ink-500">{b.id}</span><StatusBadge s={b.status} /></div><p className="mt-1 text-sm font-bold">{l?.title || 'Service booking'}</p><p className="mt-1 text-xs text-ink-500">{vendor(b.vendorId)?.name} · {b.date} at {b.slot}</p></Card> })}{!myBookings.length && <EmptyState icon={CalendarCheck} title="No service bookings yet" body="Choose a service listing and request a preferred date and time." action={<Button size="sm" onClick={() => nav.go('c_explore')}>Explore services</Button>} />}</div>
      </>}
    </Screen>
  )
}

/* ================= MESSAGES (one section for customer ↔ vendor) ================= */
export function Messages() {
  const nav = useNav()
  const start = useStartChat()
  const { me, threads, vendors } = useApp()
  const role = me.role === 'vendor' ? 'vendor' : me.role === 'business' ? 'business' : 'customer'
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [pick, setPick] = useState(false)
  if (!me.loggedIn) return <GuestWall title="Messages" />
  const all = threads[role]
  const list = all.filter((t) => (f === 'all' || (f === 'unread' ? t.unread > 0 : /RFQ/.test(t.ctx))) && (!q || t.name.toLowerCase().includes(q.toLowerCase())))
  const unread = all.reduce((s, t) => s + t.unread, 0)
  return (
    <Screen
      title="Messages"
      back={false}
      pad={false}
      right={role === 'customer' ? <IconBtn label="New enquiry" onClick={() => setPick(true)}><Plus size={21} /></IconBtn> : null}
      overlay={
        <Sheet open={pick} onClose={() => setPick(false)} title="Start an enquiry">
          <p className="text-sm text-ink-500">Choose a vendor to talk to about their products or services.</p>
          <div className="space-y-2">{vendors.filter((v) => v.status === 'approved').map((v) => (
            <button key={v.id} onClick={() => { setPick(false); start(v.id) }} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ring-1 ring-ink-200 active:bg-ink-50"><Avatar name={v.name} size={40} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{v.name}</span><span className="block text-xs text-ink-500">{cat(v.cat).name} · {v.city}</span></span><ChevronRight size={16} className="text-ink-300" /></button>
          ))}</div>
        </Sheet>
      }
    >
      <div className="space-y-3 bg-white px-4 pb-3 pt-3">
        <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder={role === 'customer' ? 'Search vendors' : 'Search customers'} />
        <Chips scroll={false} value={f} onChange={setF} options={[{ id: 'all', label: `All (${all.length})` }, { id: 'unread', label: `Unread (${unread})` }, { id: 'rfq', label: 'Quote requests' }]} />
      </div>
      {list.length === 0 && <EmptyState icon={MessageCircle} title="No conversations" body={role === 'customer' ? 'Tap + or open any vendor or listing to start talking to them.' : 'Customer enquiries will appear here.'} />}
      <div className="divide-y divide-ink-100 bg-white">
        {list.map((t) => {
          const last = t.msgs[t.msgs.length - 1]
          const v = t.vendorId && vendors.find((x) => x.id === t.vendorId)
          return (
            <button key={t.id} onClick={() => nav.go('chat', { id: t.id })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-ink-50">
              <Avatar name={t.name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="flex min-w-0 items-center gap-1 text-sm font-bold"><span className="truncate">{t.name}</span>{v?.status === 'approved' && <BadgeCheck size={14} className="shrink-0 text-emerald-600" />}</p><span className={cx('shrink-0 text-[11px]', t.unread ? 'font-bold text-brand-700' : 'text-ink-400')}>{last?.at || ''}</span></div>
                <p className="truncate text-xs font-semibold text-brand-700">{t.ctx}</p>
                <p className={cx('truncate text-[13px]', t.unread ? 'font-semibold text-ink-900' : 'text-ink-500')}>{last ? (last.f === 'me' ? 'You: ' : '') + (last.file ? '📎 ' + last.file : last.t) : 'Say hello 👋'}</p>
              </div>
              {t.unread > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{t.unread}</span>}
            </button>
          )
        })}
      </div>
    </Screen>
  )
}

export function Chat({ params }) {
  const nav = useNav()
  const { me, threads, setThreads, listings, vendors, toast } = useApp()
  const role = me.role === 'vendor' ? 'vendor' : me.role === 'business' ? 'business' : 'customer'
  const th = threads[role].find((t) => (params.id ? t.id === params.id : t.vendorId === params.vendorId)) || threads[role][0]
  const [text, setText] = useState('')
  const [menu, setMenu] = useState(false)
  const [typing, setTyping] = useState(false)
  const end = useRef(null)
  const l = th?.listingId ? listings.find((x) => x.id === th.listingId) : null
  const v = th?.vendorId ? vendors.find((x) => x.id === th.vendorId) : null
  useEffect(() => { if (th) setThreads((t) => ({ ...t, [role]: t[role].map((x) => (x.id === th.id ? { ...x, unread: 0 } : x)) })) }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [th?.msgs.length, typing])
  if (!th) return <Screen title="Chat"><EmptyState icon={MessageCircle} title="No conversation" /></Screen>
  // a company conversation exists on both sides (vendor and company): mirror every message to the other side
  const add = (f, t, file) => setThreads((s) => { const next = { ...s, [role]: s[role].map((x) => (x.id === th.id ? { ...x, msgs: [...x.msgs, { f, t, file, at: 'Now' }] } : x)) }; const pr = th.pair; if (pr && next[pr.role]) next[pr.role] = next[pr.role].map((x) => (x.id === pr.id ? { ...x, unread: f === 'me' ? (x.unread || 0) + 1 : x.unread, msgs: [...x.msgs, { f: f === 'me' ? 'them' : 'me', t, file, at: 'Now' }] } : x)); return next })
  const reply = () => { setTyping(true); setTimeout(() => { setTyping(false); add('them', role === 'business' ? 'Thanks for the enquiry. We will share terms shortly.' : role === 'customer' || th.bizId ? 'Thanks for reaching out! Let me check and get back to you shortly.' : 'Noted, thank you. I will confirm shortly.') }, 1500) }
  const send = (m = text) => { if (!m.trim()) return; add('me', m.trim()); setText(''); reply() }
  const attach = () => { add('me', '', role === 'customer' ? 'Site-photo.jpg' : 'Price-list.pdf'); reply() }
  const quick = role === 'business' ? ['Please share your GST details', 'We can offer 30-day credit', 'Sending our price list', 'Can we talk on a call?'] : th.bizId ? ['Do you supply in bulk?', 'What is the MOQ?', 'Share your price list', 'Do you offer credit terms?'] : role === 'vendor' ? ['Yes, available ✅', 'Sharing a quotation shortly', 'Can we talk on a call?', 'Please share your location'] : ['Is this available?', 'What is the price for bulk?', 'Can you visit for a site survey?', 'Please share your best quote']
  return (
    <Screen
      title={th.name}
      back
      subtitle={typing ? 'typing…' : role === 'customer' ? 'Online · usually replies within 1 hr' : role === 'business' ? 'Vendor · ' + th.ctx : th.bizId ? th.ctx : 'Customer · ' + th.ctx}
      right={<><IconBtn label="Call" onClick={() => toast(`Calling ${th.name}…`)}><Phone size={19} /></IconBtn><IconBtn label="More" onClick={() => setMenu(true)}><Info size={19} /></IconBtn></>}
      pad={false}
      bg="bg-ink-100"
      overlay={
        <Sheet open={menu} onClose={() => setMenu(false)} title={th.name}>
          <div className="space-y-1 pb-2">
            {role === 'customer' && v && <ListRow icon={Store} title="View vendor profile" onClick={() => { setMenu(false); nav.go('c_vendor', { id: v.id }) }} />}
            {role === 'customer' && <ListRow icon={FileText} tone="violet" title="Request a quotation" onClick={() => { setMenu(false); nav.go('c_rfq_new', { cat: v?.cat }) }} />}
            {role === 'customer' && v && <ListRow icon={Star} tone="amber" title="Rate this vendor" onClick={() => { setMenu(false); nav.go('c_review', { vendorId: v.id }) }} />}
            <ListRow icon={ShieldAlert} tone="rose" title="Report this conversation" onClick={() => { setMenu(false); nav.go('c_report', { ref: v?.id || 'general' }) }} last />
          </div>
        </Sheet>
      }
      footer={
        <div className="space-y-2">
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">{quick.map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">{q}</button>)}</div>
          <div className="flex items-center gap-2">
            <IconBtn label="Attach file" onClick={attach} className="!size-10"><Paperclip size={20} className="text-ink-500" /></IconBtn>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message" className="h-11 flex-1 rounded-full bg-ink-100 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            <button onClick={() => send()} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-brand-600 text-white active:bg-brand-700"><Send size={18} /></button>
          </div>
        </div>
      }
    >
      <div className="space-y-2 p-4">
        {l && (
          <Card onClick={() => nav.go('c_listing', { id: l.id })} className="!p-3"><div className="flex items-center gap-3"><Thumb tone={l.tone} icon={cat(l.cat).icon} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Enquiry about</p><p className="truncate text-sm font-bold">{l.title}</p><p className="text-xs text-ink-500">From {fmt(l.price)} / {l.unit}</p></div><ChevronRight size={16} className="text-ink-300" /></div></Card>
        )}
        <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[11px] font-medium text-ink-500">Deals are agreed directly with the vendor. Never share OTPs or card details.</p>
        <p className="mx-auto w-fit rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-bold text-ink-500">Today</p>
        {th.msgs.map((m, i) => (
          <div key={i} className={cx('flex animate-fade-in', m.f === 'me' ? 'justify-end' : 'justify-start', th.msgs[i - 1] && th.msgs[i - 1].f !== m.f && 'pt-1.5')}>
            <div className={cx('max-w-[78%] rounded-2xl px-3.5 py-2 text-sm', m.f === 'me' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-ink-900 shadow-sm')}>
              {m.file ? <span className="flex items-center gap-2 font-semibold"><FileText size={18} />{m.file}</span> : m.t}
              <p className={cx('mt-0.5 flex items-center justify-end gap-1 text-[10px]', m.f === 'me' ? 'text-white/70' : 'text-ink-400')}>{m.at}{m.f === 'me' && <CheckCheck size={12} />}</p>
            </div>
          </div>
        ))}
        {typing && <div className="flex"><div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-ink-300" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>}
        <div ref={end} />
      </div>
    </Screen>
  )
}

/* ================= REVIEW a vendor ================= */
export function WriteReview({ params }) {
  const nav = useNav()
  const { me, vendors, bookings, rfqs, reviews, setReviews, reviewed, setReviewed, notify, toast } = useApp()
  const v = vendors.find((x) => x.id === params.vendorId) || vendors.find((x) => x.id === 'v-me')
  const eligibleBooking = bookings.some((b) => b.vendorId === v.id && b.customer === (me.name || ME_NAME) && ['completed', 'closed'].includes(b.status))
  const eligibleRfq = rfqs.some((r) => r.mine && r.status === 'accepted' && r.quotes.some((q) => q.vendorId === v.id && q.status === 'accepted'))
  // Reviews are independent of payment. Customers can share feedback after
  // talking to a vendor, completing a booking, or accepting a quotation.
  const eligible = Boolean(v) && (eligibleBooking || eligibleRfq || me?.role === 'customer')
  const done = reviewed.includes(v.id)
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!eligible || done) return
    if (!rating) return setErr('Please select a star rating')
    setReviews((r) => [{ id: 'r' + Date.now(), by: ME_NAME, rating, text: [text, tags.join(', ')].filter(Boolean).join(' — ') || 'Great!', at: '19 Oct 2026', target: v.id, reply: '' }, ...r])
    setReviewed((r) => [...r, v.id])
    notify('vendor', 'New review', `${ME_NAME} rated you ${rating}★`, 'review')
    toast('Thanks for your review!')
    nav.back()
  }
  return (
    <Screen title="Rate this vendor" footer={eligible && !done ? <Button full size="lg" onClick={submit}>Submit review</Button> : null}>
      <Card className="!p-3.5"><div className="flex items-center gap-3"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={52} round="rounded-xl" /><div><p className="text-sm font-bold">{v.name}</p><p className="text-xs text-ink-500">{cat(v.cat).name} · {v.city}</p></div></div></Card>
      {!eligible && <Banner tone="amber" title="Vendor unavailable">This vendor profile is not available for review.</Banner>}
      {done && <Banner tone="green" title="Already reviewed">Thank you — you have already reviewed this vendor.</Banner>}
      {eligible && !done && (
        <>
          <Card className="text-center"><p className="text-sm font-semibold text-ink-600">How was your experience?</p><div className="mt-3 flex justify-center"><Stars value={rating} onChange={(n) => { setRating(n); setErr('') }} size={38} /></div>{err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}</Card>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">What went well?</p><Chips scroll={false} multi value={tags} onChange={setTags} options={['Quick replies', 'Helpful advice', 'Fair pricing', 'Professional', 'Clear communication']} /></div>
          <Input label="Tell us more (optional)" textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share details to help other customers" />
        </>
      )}
    </Screen>
  )
}

/* ================= ISSUES & SUPPORT ================= */
export function IssueNew({ params = {} }) {
  const nav = useNav()
  const { me, vendors, threads, bookings, listings, disputes, setDisputes, toast, notify } = useApp()
  const myBookings = bookings.filter((b) => b.customer === (me.name || ME_NAME))
  const opts = [...threads.customer.filter((t) => t.vendorId).map((t) => ({ value: t.vendorId, label: t.name })), ...myBookings.map((b) => ({ value: b.id, label: `${b.id} · ${listings.find((l) => l.id === b.listingId)?.title || 'Service booking'}` })), { value: 'general', label: 'General / App' }]
  const [f, setF] = useState({ ref: opts.some((o) => o.value === params.bookingId) ? params.bookingId : opts.some((o) => o.value === params.ref) ? params.ref : opts[0].value, kind: params.bookingId ? 'Service booking' : 'Vendor behaviour', title: '', desc: '' })
  const [photos, setPhotos] = useState(0)
  const [errs, setErrs] = useState({})
  const submit = () => {
    const e = {}
    if (f.title.trim().length < 5) e.title = 'Add a short summary'
    if (f.desc.trim().length < 15) e.desc = 'Please give more details (min 15 characters)'
    setErrs(e)
    if (Object.keys(e).length) return
    const booking = bookings.find((x) => x.id === f.ref)
    const v = vendors.find((x) => x.id === (booking?.vendorId || f.ref))
    const id = 'DSP-' + (209 + disputes.length - 3)
    setDisputes((d) => [{ id, ref: booking?.id || (v ? v.name : 'General'), bookingId: booking?.id, kind: f.kind, title: f.title, raisedBy: ME_NAME, against: v ? v.name : 'VendorVerse', status: 'open', amount: 0, created: '19 Oct 2026', desc: f.desc, evidence: photos, actions: [{ by: 'System', action: 'Case submitted' + (v ? ' and vendor notified' : ''), at: 'Just now' }] }, ...d])
    notify('admin', 'New case reported', `${id} · ${f.title}`, 'dispute')
    toast('Case submitted. We will respond as per the case SLA (CFG-06).')
    nav.replace('c_case', { id })
  }
  return (
    <Screen title="Report a problem" footer={<Button full size="lg" onClick={submit}>Submit</Button>}>
      <Select label="Related to" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} options={opts} />
      <Select label="Case type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} options={['Vendor behaviour', 'Misleading listing', 'Spam or abuse', 'Fake or unverified vendor', 'App or account']} />
      <Input label="Summary" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={errs.title} placeholder="e.g. Vendor shared a different price off-app" />
      <Input label="What happened?" required textarea rows={4} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} error={errs.desc} />
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Evidence (optional)</p><div className="flex gap-2">{Array.from({ length: photos }).map((_, i) => <div key={i} className="grid size-16 place-items-center rounded-xl bg-gradient-to-br from-ink-200 to-ink-300 text-ink-500"><ImagePlus size={20} /></div>)}<button onClick={() => photos < 4 && setPhotos(photos + 1)} className="grid size-16 place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400"><Plus size={20} /></button></div></div>
      <Banner tone="blue">Our team reviews reports and records every action for transparency.</Banner>
    </Screen>
  )
}



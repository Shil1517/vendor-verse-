import { useState } from 'react'
import {
  Package, Truck, Factory, FileText, ShieldCheck, Globe, ClipboardCheck, ArrowRight, Check, WifiOff, Inbox, Lock, Ban, CreditCard, RefreshCw, Compass, Building2, Route, ListChecks, AlertTriangle, Inbox as InboxIcon,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { cat, MY_LOC } from '../data.jsx'
import { country, KIND_LABEL } from '../globaldata.jsx'
import { PO_FLOW, PO_ALT, JOURNEYS, CHECKLIST } from '../mvpdata.jsx'
import {
  Screen, Card, Button, Banner, Input, Select, Chips, KV, Timeline, StatusBadge, Money, EmptyState, ListRow, Pill, Segmented, SkeletonList, PhaseTag, Sheet, cx,
} from '../ui.jsx'
import { VerifiedBadge } from './shared.jsx'
const SCREENS = new Proxy({}, { get: (_, k) => (typeof window !== 'undefined' ? window.__SCREENS?.[k] : undefined) })

const jumpTo = (id) => window.dispatchEvent(new CustomEvent('vv-jump', { detail: id }))
const stamp = () => 'Just now'

/* ============ Product / manufacturer catalogue item (distinct from a bookable service) ============ */
export function ProductDetail({ params = {} }) {
  const nav = useNav()
  const { listings, vendor, toast } = useApp()
  const l = listings.find((x) => x.id === (params.id || 'l40')) || listings.find((x) => x.type === 'product')
  const v = vendor(l.vendorId)
  const t = l.trade || { moq: 1, unit: 'units', tiers: [], leadDays: 0, regions: [], certs: [] }
  const [qty, setQty] = useState(String(t.moq))
  const n = parseInt(qty || '0', 10)
  const tier = [...(t.tiers || [])].reverse().find(([min]) => n >= min) || (t.tiers || [])[0]
  const below = n < t.moq
  const total = tier && !below ? tier[1] * n : null
  return (
    <Screen title="Product" subtitle={v?.name} footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => nav.go('c_vendor', { id: v.id })}>Supplier</Button><Button className="flex-[2]" disabled={below} onClick={() => nav.go('c_rfq_goods', { listingId: l.id, qty: n })}>Request bulk quotation</Button></div>}>
      <Card className="space-y-2">
        <div className="flex flex-wrap gap-1.5"><Pill icon={Package}>Product</Pill><Pill icon={Factory}>{KIND_LABEL[v?.kind] || 'Supplier'}</Pill>{v && <span className="text-xs text-ink-500">{country(v.country).flag} {v.city}</span>}</div>
        <h2 className="text-lg font-extrabold leading-snug">{l.title}</h2>
        <p className="text-[13px] leading-relaxed text-ink-600">{l.desc}</p>
        <VerifiedBadge id={l.vendorId} />
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-extrabold">Quantity & price</p>
        <Input label={`Quantity (${t.unit})`} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} error={below ? `Minimum order quantity is ${t.moq.toLocaleString('en-IN')} ${t.unit}` : ''} />
        <div className="overflow-hidden rounded-xl ring-1 ring-ink-100">
          {(t.tiers || []).map(([min, price], i) => (
            <div key={min} className={cx('flex items-center justify-between px-3 py-2 text-[13px]', tier && tier[0] === min && !below ? 'bg-brand-50 font-bold text-brand-800' : i % 2 ? 'bg-ink-50' : 'bg-white')}>
              <span>{min.toLocaleString('en-IN')}+ {t.unit}</span><span><Money n={price} cur={l.cur} /> / {t.unit.replace(/s$/, '')}</span>
            </div>
          ))}
        </div>
        {total != null ? <p className="text-sm">Indicative total <b><Money n={total} cur={l.cur} /></b> <span className="text-ink-500">· excl. tax & freight — final price on quotation</span></p> : <p className="text-xs text-ink-500">Enter at least the minimum order quantity.</p>}
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-extrabold">Supply terms</p>
        <KV rows={[['Lead time', `${t.leadDays} days`], ['Delivers to', (t.regions || []).join(', ') || '—'], ['Certifications', (t.certs || []).join(', ') || '—'], ['Samples', t.samples || '—'], ['Packaging', t.packaging || '—'], ['Origin', t.origin || '—']]} />
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-extrabold">Specifications</p>
        <KV rows={(l.specs || []).map(([k, val]) => [k, String(val)])} />
      </Card>
      <Banner tone="blue" title="Quotation, not checkout">Large orders are agreed through an RFQ. Payment terms are settled between you and the supplier; VendorVerse does not hold funds in the MVP.</Banner>
    </Screen>
  )
}

/* ============ Goods RFQ: quantity, specs, delivery ============ */
export function RfqGoods({ params = {} }) {
  const nav = useNav()
  const { listings, vendor, rfqs, setRfqs, me, notify, toast } = useApp()
  const l = listings.find((x) => x.id === (params.listingId || 'l40')) || listings.find((x) => x.type === 'product')
  const v = vendor(l.vendorId)
  const [f, setF] = useState({ title: `Quote: ${l.title}`, qty: String(params.qty || l.trade?.moq || ''), dest: me.hasVendor ? 'Site: Jhotwara, Jaipur 302012' : 'Warehouse: Sitapura, Jaipur 302022', by: '2026-11-20', pay: '30% advance, balance on delivery', inco: 'Delivered (DAP)', target: '', notes: '' })
  const [errs, setErrs] = useState({})
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const moq = l.trade?.moq || 1
  const submit = () => {
    const e = {}
    if (me.hasVendor && l.vendorId === me.vendorId) return toast('This is your own listing - you cannot order from yourself', 'warn')
    if (!(+f.qty >= moq)) e.qty = `Minimum order quantity is ${moq.toLocaleString('en-IN')}`
    if (!f.dest.trim()) e.dest = 'Add a delivery address or site'
    setErrs(e)
    if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'warn')
    const id = 'RFQ-' + (341 + rfqs.length)
    const [y, m, d] = f.by.split('-')
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]
    setRfqs((r) => [{ id, customer: me.name, title: f.title, cat: l.cat, specs: [...(l.specs || []).slice(0, 4), ['Delivery', f.dest], ['Payment terms', f.pay], ['Incoterm', f.inco], ...(f.target ? [['Target price', f.target]] : []), ...(f.notes ? [['Notes', f.notes]] : [])], qty: `${(+f.qty).toLocaleString('en-IN')} ${l.trade?.unit || 'units'}`, budget: f.target || 'Open to quotation', location: MY_LOC.city, timeline: `Deliver by ${d} ${mon} ${y}`, deadline: `${d} ${mon} ${y}`, extended: false, files: [], state: 'open', created: '26 Oct 2026', rev: 1, recipients: 1, sentAt: 'just', revisions: [{ n: 1, at: stamp(), note: 'RFQ sent' }], quotes: [], thread: null, listingId: l.id }, ...r])
    notify('vendor', 'Bulk RFQ received', `${id} · ${f.title}`, 'rfq', ['v_rfq', { id }])
    toast(`RFQ sent to ${v?.name}`)
    nav.replace('c_rfq', { id })
  }
  return (
    <Screen title="Request quotation" subtitle="Goods — quantity, specs, delivery" footer={<Button full size="lg" onClick={submit}>Send RFQ</Button>}>
      <Card className="flex items-center gap-3"><Package size={20} className="text-brand-600" /><div className="min-w-0"><p className="truncate text-sm font-bold">{l.title}</p><p className="text-xs text-ink-500">{v?.name} · MOQ {moq.toLocaleString('en-IN')} {l.trade?.unit}</p></div></Card>
      <Input label="Title" value={f.title} onChange={set('title')} />
      <Input label={`Quantity (${l.trade?.unit || 'units'})`} required inputMode="numeric" value={f.qty} onChange={(e) => set('qty')(e.target.value.replace(/\D/g, ''))} error={errs.qty} />
      <Input label="Delivery address / site" required value={f.dest} onChange={set('dest')} error={errs.dest} />
      <Input label="Required by" type="date" value={f.by} onChange={set('by')} />
      <Select label="Payment terms" value={f.pay} onChange={set('pay')} options={['30% advance, balance on delivery', '100% advance', '50% advance, 50% before dispatch', 'Net 30 days', 'Letter of credit']} />
      <Select label="Incoterm" value={f.inco} onChange={set('inco')} options={['Delivered (DAP)', 'Ex-works (EXW)', 'FOB', 'CIF']} />
      <Input label="Target price (optional)" placeholder="e.g. ₹1,700 per unit" value={f.target} onChange={set('target')} />
      <Input label="Notes / special specification" textarea value={f.notes} onChange={set('notes')} />
    </Screen>
  )
}

/* ============ Purchase orders ============ */
const idx = (s) => PO_FLOW.findIndex(([k]) => k === s)

export function Orders({ params = {} }) {
  const nav = useNav()
  const { orders, me } = useApp()
  const biz = me.role === 'business'
  const buying = !biz && (me.role !== 'vendor' || params.as === 'buyer')
  const mine = orders.filter((o) => (buying ? o.buyer === me.name : biz ? o.bizId === me.bizId : o.vendorId === me.vendorId))
  const [flt, setFlt] = useState('all')
  const shown = mine.filter((o) => flt === 'all' || (flt === 'open' ? !['po_completed', 'po_cancelled', 'po_rejected', 'po_delivered'].includes(o.state) : ['po_completed', 'po_delivered', 'po_cancelled', 'po_rejected'].includes(o.state)))
  return (
    <Screen title={buying ? 'My purchases' : 'Orders'} subtitle={buying ? 'Purchase orders you placed' : 'Purchase orders received'}>
      <Segmented value={flt} onChange={setFlt} options={[{ id: 'all', label: 'All' }, { id: 'open', label: 'In progress' }, { id: 'done', label: 'Closed' }]} />
      {shown.length === 0 && <EmptyState icon={Package} title="No orders yet" body="Accept a quotation on a goods RFQ to create a purchase order." action={<Button size="sm" onClick={() => nav.go('c_explore_suppliers')}>Find suppliers</Button>} />}
      {shown.map((o) => (
        <Card key={o.id} onClick={() => nav.go(buying ? 'c_order' : biz ? 'b_order' : 'v_order', { id: o.id, as: buying ? 'buyer' : undefined })} className="space-y-1.5">
          <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold leading-snug">{o.title}</p><StatusBadge s={o.state} /></div>
          <p className="text-xs text-ink-500">{o.id} · {buying ? (o.bizId ? 'Company order' : 'Supplier order') : o.org} · due {o.by}</p>
        </Card>
      ))}
    </Screen>
  )
}

export function OrderDetail({ params = {} }) {
  const nav = useNav()
  const { orders, patchOrder, vendor, me, toast, notify, companies } = useApp()
  const o = orders.find((x) => x.id === (params.id || 'PO-3002')) || orders[0]
  const v = vendor(o.vendorId)
  const vendorSide = (me.role === 'vendor' || me.role === 'business') && params.as !== 'buyer'
  const co = o.bizId ? companies[o.bizId] : null
  const supName = co ? (co.brand || co.legal) : v?.name
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const alt = PO_ALT.includes(o.state)
  const move = (s, msg, by) => { patchOrder(o.id, (x) => ({ state: s, history: [...x.history, { s, at: stamp(), note: msg || '', by: by || (vendorSide ? supName : me.name) }] })); toast(msg || 'Order updated') }
  const total = o.items.reduce((a, i) => a + i.qty * i.price, 0)
  const cur = idx(o.state)
  const lastGood = alt ? Math.max(idx(o.history.filter((h) => !PO_ALT.includes(h.s)).slice(-1)[0]?.s), 0) : cur
  const steps = PO_FLOW.map(([k, label], i) => { const h = o.history.find((x) => x.s === k); return { label, done: alt ? i <= lastGood : i < cur || o.state === 'po_completed', current: !alt && i === cur && o.state !== 'po_completed', at: h?.at, note: h?.note } })
  const A = (label, fn, variant = 'primary') => <Button key={label} full variant={variant} onClick={fn}>{label}</Button>
  const actions = []
  if (vendorSide) {
    if (o.state === 'po_created') { actions.push(A('Accept order', () => move('po_accepted', 'Order accepted'))); actions.push(A('Reject order', () => setReason('reject'), 'danger')) }
    if (o.state === 'po_accepted') actions.push(A('Confirm terms received', () => move('po_paid', 'Payment / terms confirmed')))
    if (o.state === 'po_paid') actions.push(A('Start processing', () => move('po_processing', 'Production started')))
    if (o.state === 'po_processing') actions.push(A('Mark shipped', () => { patchOrder(o.id, { tracking: { carrier: 'Gati Surface', awb: 'GT-' + Math.floor(10000000 + Math.random() * 8e7), eta: '05 Nov 2026' } }); move('po_shipped', 'Shipped with tracking') }))
    if (o.state === 'po_shipped') { actions.push(A('Mark delivered', () => move('po_delivered', 'Delivered to buyer'))); actions.push(A('Report delivery exception', () => move('po_exception', 'Carrier delay reported'), 'secondary')) }
    if (o.state === 'po_exception') actions.push(A('Resume shipment', () => move('po_shipped', 'Shipment resumed')))
  } else {
    if (o.state === 'po_payment_failed') actions.push(A('Retry payment', () => { move('po_paid', 'Payment retried successfully'); notify('vendor', 'Payment confirmed', o.id, 'order', ['v_order', { id: o.id }]) }))
    if (o.state === 'po_delivered') actions.push(A('Confirm receipt & complete', () => move('po_completed', 'Buyer confirmed receipt')))
    if (['po_created', 'po_accepted'].includes(o.state)) actions.push(A('Cancel order', () => setReason('cancel'), 'danger'))
    if (['po_shipped', 'po_delivered', 'po_exception'].includes(o.state)) actions.push(A('Raise a dispute', () => setReason('dispute'), 'secondary'))
  }
  return (
    <Screen
      title={o.id}
      subtitle={vendorSide ? o.org : supName}
      overlay={
        <Sheet open={!!reason} onClose={() => setReason(null)} title={reason === 'reject' ? 'Reject this order' : reason === 'cancel' ? 'Cancel this order' : 'Raise a dispute'} footer={<Button full variant="danger" disabled={note.trim().length < 5} onClick={() => { move(reason === 'reject' ? 'po_rejected' : reason === 'cancel' ? 'po_cancelled' : 'po_disputed', note, reason === 'reject' || vendorSide ? supName : me.name); setReason(null); setNote('') }}>{reason === 'reject' ? 'Reject order' : reason === 'cancel' ? 'Cancel order' : 'Open dispute'}</Button>}>
          <Input label="Reason (required)" textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Sheet>
      }
      footer={actions.length ? <div className="space-y-2">{actions}</div> : undefined}
    >
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2"><p className="text-base font-extrabold leading-snug">{o.title}</p><StatusBadge s={o.state} /></div>
        {o.rfq && <button onClick={() => nav.go(vendorSide ? 'v_rfq' : 'c_rfq', { id: o.rfq })} className="text-xs font-bold text-brand-700">From {o.rfq} · view quotation</button>}
      </Card>
      {o.state === 'po_payment_failed' && <Banner tone="red" title="Payment failed">The advance did not go through. The supplier will not start until terms are confirmed. {vendorSide ? 'Waiting for the buyer.' : 'Retry below.'}</Banner>}
      {o.state === 'po_exception' && <Banner tone="amber" title="Delivery exception">{o.history[o.history.length - 1]?.note || 'The carrier reported a delay.'}</Banner>}
      {o.state === 'po_disputed' && <Banner tone="red" title="Dispute open">Support will review the order record and both parties’ statements.</Banner>}
      {['po_rejected', 'po_cancelled'].includes(o.state) && <Banner tone="gray" title={o.state === 'po_rejected' ? 'Rejected by supplier' : 'Cancelled'}>{o.history[o.history.length - 1]?.note}</Banner>}
      <Card className="space-y-2"><p className="text-sm font-extrabold">Progress</p><Timeline steps={steps} /></Card>
      <Card className="space-y-2">
        <p className="text-sm font-extrabold">Items</p>
        {o.items.map((i) => <div key={i.name} className="flex items-start justify-between gap-3 text-[13px]"><span className="min-w-0">{i.name}<br /><span className="text-xs text-ink-500">{i.qty.toLocaleString('en-IN')} {i.unit} × <Money n={i.price} cur={o.cur} /></span></span><b className="shrink-0"><Money n={i.qty * i.price} cur={o.cur} /></b></div>)}
        <div className="flex justify-between border-t border-ink-100 pt-2 text-sm font-bold"><span>Order value (excl. tax)</span><Money n={total} cur={o.cur} /></div>
      </Card>
      <Card className="space-y-2"><p className="text-sm font-extrabold">Terms</p><KV rows={[['Deliver to', o.delivery], ['Required by', o.by], ['Payment terms', o.payTerms], ['Incoterm', o.incoterm], ...(o.tracking ? [['Carrier', o.tracking.carrier], ['Tracking', o.tracking.awb], ['ETA', o.tracking.eta]] : [])]} /><p className="text-xs text-ink-500">Payment is made directly between buyer and supplier in the MVP; this record tracks status only.</p></Card>
      {!co && <Button full variant="secondary" onClick={() => nav.go('chat', { id: 't1' })}>Message {vendorSide ? 'buyer' : 'supplier'}</Button>}
      {co && !vendorSide && ['po_created', 'po_accepted', 'po_paid', 'po_processing', 'po_shipped'].includes(o.state) && (
        <Card className="!bg-ink-100 shadow-none">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Mockup controls · company side</p>
          <div className="mt-2"><Button size="sm" variant="secondary" onClick={() => { const nx = { po_created: ['po_accepted', 'Company accepted the order'], po_accepted: ['po_paid', 'Payment / terms confirmed'], po_paid: ['po_processing', 'Production started'], po_processing: ['po_shipped', 'Shipped with tracking'], po_shipped: ['po_delivered', 'Delivered to buyer'] }[o.state]; patchOrder(o.id, (x) => ({ state: nx[0], ...(nx[0] === 'po_shipped' ? { tracking: { carrier: 'Gati Surface', awb: 'GT-' + Math.floor(10000000 + Math.random() * 8e7), eta: '05 Nov 2026' } } : {}), history: [...x.history, { s: nx[0], at: stamp(), note: nx[1], by: supName }] })); toast(nx[1]) }}>Company moves to next step</Button></div>
        </Card>
      )}
    </Screen>
  )
}

/* ============ Vendor "Buy" tab: a vendor sources from other vendors and companies, inside the vendor account ============ */
export function VendorBuy() {
  const nav = useNav()
  const { me, rfqs, orders, bookings } = useApp()
  const myRfqs = rfqs.filter((r) => r.customer === me.name)
  const myPos = orders.filter((o) => o.buyer === me.name)
  const myBookings = bookings.filter((b) => b.customer === me.name)
  return (
    <Screen title="Buy" subtitle="Source from other vendors and companies">
      <Banner tone="blue" title="Buying happens in Customer mode">You are buying as a customer with your own identity. Orders you receive as a vendor stay under Work in Vendor mode.</Banner>
      <div className="grid grid-cols-3 gap-2">{[['RFQs', myRfqs.length], ['Purchases', myPos.length], ['Bookings', myBookings.length]].map(([k, n]) => <Card key={k} className="!p-3 text-center"><p className="text-xl font-extrabold">{n}</p><p className="text-[11px] text-ink-500">{k}</p></Card>)}</div>
      <Card className="space-y-1">
        <p className="text-sm font-extrabold">Find who to buy from</p>
        <ListRow icon={Factory} tone="teal" title="Suppliers & manufacturers" subtitle="Products with MOQ, tiers and lead time" onClick={() => nav.go('c_explore_suppliers', { kind: 'goods' })} />
        <ListRow icon={Compass} tone="sky" title="Service providers" subtitle="Hire another vendor for a job" onClick={() => nav.go('c_explore', { kind: 'services' })} />
        <ListRow icon={Building2} tone="indigo" title="Companies" subtitle="Verified companies - connect by message" onClick={() => nav.go('v_biz_network')} last />
      </Card>
      <Card className="space-y-1">
        <p className="text-sm font-extrabold">My buying</p>
        <ListRow icon={FileText} tone="amber" title="My RFQs" subtitle={`${myRfqs.length} sent - compare and accept quotes`} onClick={() => nav.go('c_activity', { tab: 'rfqs' })} />
        <ListRow icon={Package} tone="violet" title="My purchases" subtitle={`${myPos.length} purchase orders you placed`} onClick={() => nav.go('c_orders', { as: 'buyer' })} />
        <ListRow icon={ClipboardCheck} tone="sky" title="My bookings" subtitle="Services you booked from other vendors" onClick={() => nav.go('c_activity', { tab: 'bookings' })} last />
      </Card>
      <Banner tone="gray" title="Rules">You cannot order from your own listings. Companies are visible only to vendors, and are contacted by message.</Banner>
    </Screen>
  )
}

/* ============ Vendor leads (enquiries + matched RFQs) ============ */
export function Leads() {
  const nav = useNav()
  const { rfqs, bookings, me, orders } = useApp()
  const reqs = bookings.filter((b) => b.vendorId === me.vendorId && b.state === 'requested')
  const open = rfqs.filter((r) => r.state === 'open')
  const pos = orders.filter((o) => o.vendorId === me.vendorId && o.state === 'po_created')
  return (
    <Screen title="Leads" subtitle="Booking requests, matched RFQs and new orders">
      <div className="grid grid-cols-3 gap-2">{[['Requests', reqs.length], ['RFQs', open.length], ['Orders', pos.length]].map(([k, n]) => <Card key={k} className="!p-3 text-center"><p className="text-xl font-extrabold">{n}</p><p className="text-[11px] text-ink-500">{k}</p></Card>)}</div>
      <Card className="space-y-1"><p className="text-sm font-extrabold">Booking requests</p>{reqs.length ? reqs.map((b) => <ListRow key={b.id} icon={ClipboardCheck} title={b.customer} subtitle={`${b.date} · ${b.slot}`} onClick={() => nav.go('v_booking', { id: b.id })} />) : <p className="text-xs text-ink-500">None waiting.</p>}</Card>
      <Card className="space-y-1"><p className="text-sm font-extrabold">Matched RFQs</p>{open.slice(0, 5).map((r) => <ListRow key={r.id} icon={FileText} tone="amber" title={r.title} subtitle={`${r.id} · ${r.qty}`} onClick={() => nav.go('v_rfq', { id: r.id })} />)}</Card>
      <Card className="space-y-1"><p className="text-sm font-extrabold">New purchase orders</p>{pos.length ? pos.map((o) => <ListRow key={o.id} icon={Package} tone="violet" title={o.title} subtitle={o.id} onClick={() => nav.go('v_order', { id: o.id })} />) : <p className="text-xs text-ink-500">No new orders.</p>}<Button size="sm" variant="secondary" onClick={() => nav.go('v_orders')}>All orders</Button></Card>
    </Screen>
  )
}

/* ============ Journeys, picker, states, checklist ============ */
export function JourneysPick() {
  const nav = useNav()
  const pick = [['Book a service', 'Local, scheduled or instant', Compass, 'c_explore', 'teal'], ['Request bulk quotations', 'Manufacturers & suppliers', Factory, 'c_explore_suppliers', 'amber'], ['Receive & fulfil orders', 'Vendor order handling', Package, 'v_orders', 'violet'], ['Procure as a business', 'Vendor buying from a supplier', Building2, 'vb_home', 'blue']]
  return (
    <Screen title="What do you want to do?" subtitle="Each path is a different record: booking, RFQ, order or contract">
      {pick.map(([t, s, I, id, tone]) => <ListRow key={id} icon={I} tone={tone} title={t} subtitle={s} onClick={() => jumpTo(id)} />)}
      <Button full variant="secondary" icon={Route} onClick={() => nav.go('journeys')}>See all journeys</Button>
    </Screen>
  )
}

export function Journeys() {
  const { journey, setJourney } = useApp()
  const [tab, setTab] = useState('journeys')
  return (
    <Screen title="Demonstration journeys" subtitle="Clickable end-to-end prototype · demo data">
      <Segmented value={tab} onChange={setTab} options={[{ id: 'journeys', label: 'Journeys' }, { id: 'check', label: 'Checklist' }]} />
      <Banner tone="amber" title="Demo data">Names, prices and quantities are sample content. Features marked Phase 2 or Future are not part of the MVP.</Banner>
      {tab === 'journeys' && JOURNEYS.map((j) => (
        <Card key={j.id} className="space-y-2">
          <div className="flex items-center justify-between"><p className="text-sm font-extrabold">{j.id} · {j.t}</p><Pill>{j.who}</Pill></div>
          <ol className="space-y-1">{j.steps.map(([label, id], i) => <li key={id}><button disabled={!SCREENS[id]} onClick={() => { setJourney({ id: j.id, step: i }); jumpTo(id) }} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-ink-50 disabled:opacity-40"><span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', journey?.id === j.id && journey.step === i ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600')}>{i + 1}</span><span className="min-w-0 flex-1 text-[13px]">{label}</span><ArrowRight size={14} className="shrink-0 text-ink-300" /></button></li>)}</ol>
        </Card>
      ))}
      {tab === 'check' && CHECKLIST.map(([t, ids], i) => (
        <Card key={i} className="space-y-2"><div className="flex gap-2.5"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={12} strokeWidth={3} /></span><p className="text-[13px] leading-snug">{t}</p></div><div className="flex flex-wrap gap-1.5">{ids.filter((id) => SCREENS[id]).map((id) => <button key={id} onClick={() => jumpTo(id)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">{SCREENS[id].title}</button>)}</div></Card>
      ))}
    </Screen>
  )
}

export function UiStates() {
  const [s, setS] = useState('loading')
  const body = {
    loading: <SkeletonList n={3} />,
    empty: <EmptyState icon={Inbox} title="Nothing here yet" body="When there is activity it will show up here." action={<Button size="sm">Explore</Button>} />,
    error: <EmptyState icon={WifiOff} title="Couldn’t load" body="Something went wrong. Your data is safe." action={<Button size="sm" icon={RefreshCw}>Retry</Button>} />,
    offline: <Banner tone="amber" title="You’re offline">Showing saved data. Changes will sync when you reconnect.</Banner>,
    denied: <EmptyState icon={Lock} title="You don’t have access" body="Ask the account owner to give you the Buyer or Approver role." />,
    cancel: <Banner tone="gray" icon={Ban} title="Booking cancelled">Cancelled by you · free cancellation applied.</Banner>,
    payfail: <Banner tone="red" icon={CreditCard} title="Payment failed" action={<Button size="sm">Retry</Button>}>Your card was declined. No money was taken.</Banner>,
  }
  return (
    <Screen title="Interface states" subtitle="Loading, empty, error, offline, permission, cancellation, payment failure">
      <Chips scroll={false} value={s} onChange={setS} options={[['loading', 'Loading'], ['empty', 'Empty'], ['error', 'Error'], ['offline', 'Offline'], ['denied', 'Permission denied'], ['cancel', 'Cancellation'], ['payfail', 'Payment failure']].map(([id, label]) => ({ id, label }))} />
      <div className="rounded-2xl bg-ink-50 p-3">{body[s]}</div>
    </Screen>
  )
}

/*
 * Real-API fulfilment screens: purchase orders (F-GDS-03/04), contracts (F-CON-01/02)
 * and work orders (F-RFQ-04). Same file on web and mobile; only the app shell around
 * it differs. Used instead of the seed-data screens when VITE_API_BASE_URL is set
 * (see the registry, `live(...)`).
 *
 * Nothing here moves money. Payment records are informational only; nothing invents a value: a
 * missing field is labelled "Not provided". Actions are offered by state and the
 * server decides who may do what, so a refusal shows the server's own message.
 * Disputes need a support case and there is no support-case API yet, so they are not
 * offered here.
 */
import { useCallback, useState } from 'react'
import { ClipboardList, FileSignature, Package } from 'lucide-react'
import { Badge, Banner, Button, Card, Dialog, EmptyState, Input, KV, Screen, Section } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { ErrorBox, Loading, fmtWhen, minorToText, useLoad } from './remote-discovery.jsx'
import { RemotePaymentRecords } from './remote-payment-records.jsx'

const PO_STATE = {
  created: ['Awaiting supplier', 'blue'], accepted: ['Accepted', 'teal'], rejected: ['Rejected', 'red'], processing: ['Processing', 'purple'], shipped: ['Shipped', 'purple'],
  delivered: ['Delivered', 'amber'], completed: ['Completed', 'green'], cancelled: ['Cancelled', 'gray'], delivery_exception: ['Delivery exception', 'red'],
}
const CONTRACT_STATE = { proposed: ['Proposed', 'blue'], negotiating: ['Negotiating', 'amber'], active: ['Active', 'teal'], declined: ['Declined', 'red'], completed: ['Completed', 'green'], closed: ['Closed', 'gray'] }
const MILESTONE_STATE = { pending: ['Pending', 'gray'], in_progress: ['In progress', 'purple'], completed_awaiting: ['Awaiting confirmation', 'amber'], closed: ['Closed', 'green'], disputed: ['Disputed', 'red'] }
const WORK_STATE = { created: ['Created', 'blue'], in_progress: ['In progress', 'purple'], completed_awaiting: ['Awaiting confirmation', 'amber'], closed: ['Closed', 'green'], cancelled: ['Cancelled', 'gray'] }

const StateBadge = ({ map, s }) => { const [label, tone] = map[s] || [String(s).replace(/_/g, ' '), 'gray']; return <Badge tone={tone} className="vv-purchase-order-status">{label}</Badge> }
const text = (v) => (typeof v === 'string' && v.trim() ? v : null)
const money = (minor, currency = 'INR') => minorToText(minor, currency) || 'Not provided'
const short = (id) => String(id).slice(0, 8)

/** The vendor ids this user owns, so a record can be read from the supplier or vendor side. */
function useMyVendorIds() {
  const mine = useLoad(() => authService.listMyVendors(), [])
  return { loading: mine.loading, ids: (mine.data?.vendors || []).map((v) => v.id) }
}

/** Runs one action, shows the server's message on refusal, then reloads. */
function useAct(reload) {
  const { toast } = useApp()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const run = useCallback(async (fn, done) => {
    setBusy(true)
    setFailure('')
    const r = await fn()
    setBusy(false)
    if (!r.ok) return setFailure(r.message)
    if (done) toast(done)
    reload()
  }, [reload, toast])
  return { busy, failure, run }
}

/* ================= WORK ORDERS ================= */
export function WorkOrderRows({ items, detail, empty }) {
  const nav = useNav()
  if (!items.length) return <EmptyState icon={ClipboardList} title="No work orders" body={empty} />
  return items.map((w) => (
    <Card key={w.id} onClick={() => nav.go(detail, { id: w.id })}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-[15px] font-bold text-ink-900">{text(w.scope?.scope) || `Work order ${short(w.id)}`}</p><p className="truncate text-xs text-ink-500">Created {fmtWhen(w.created_at)}</p></div>
        <StateBadge map={WORK_STATE} s={w.state} />
      </div>
    </Card>
  ))
}

/** Work order detail. `side` is 'customer' or 'vendor': it only chooses which buttons are offered; the server enforces it. */
export function RemoteWorkOrder({ params = {}, side = 'customer' }) {
  const { loading, error, data, reload } = useLoad(() => authService.getWorkOrder(params.id), [params.id])
  const { busy, failure, run } = useAct(reload)
  if (loading && !data) return <Screen title="Work order"><Loading /></Screen>
  if (error) return <Screen title="Work order"><ErrorBox message={error} onRetry={reload} /></Screen>
  const w = data.workOrder
  const act = (action, done) => () => run(() => authService.workOrderAction(w.id, action), done)
  return (
    <Screen title={text(w.scope?.scope) || 'Work order'} subtitle={`Reference ${short(w.id)}`} right={<StateBadge map={WORK_STATE} s={w.state} />}>
      {failure && <Banner tone="red" title="Could not update">{failure}</Banner>}
      <Card>
        <KV rows={[
          ['Scope', text(w.scope?.scope) || 'Not provided'],
          ['Created', fmtWhen(w.created_at)],
          ['Completed', w.completed_at ? fmtWhen(w.completed_at) : 'Not yet'],
          ['Confirm by', w.confirmation_due_at ? fmtWhen(w.confirmation_due_at) : 'Not set'],
        ]} />
      </Card>
      <div className="space-y-2">
        {side === 'vendor' && w.state === 'created' && <Button full disabled={busy} onClick={act('start', 'Work started')}>Start work</Button>}
        {side === 'vendor' && w.state === 'in_progress' && <Button full disabled={busy} onClick={act('complete', 'Marked complete')}>Mark complete</Button>}
        {side === 'customer' && w.state === 'completed_awaiting' && <Button full disabled={busy} onClick={act('confirm', 'Completion confirmed')}>Confirm completion</Button>}
        {['created', 'in_progress'].includes(w.state) && <Button full variant="secondary" disabled={busy} onClick={act('cancel', 'Work order cancelled')}>Cancel work order</Button>}
      </div>
    </Screen>
  )
}

/* ================= PURCHASE ORDERS ================= */
const poTitle = (o) => text(o.terms?.scope) || `Order ${short(o.id)}`
const poTotal = (o) => (o.terms?.totalMinor !== undefined ? money(o.terms.totalMinor, o.terms.currency) : 'Not provided')

function OrderRows({ items, detail, empty }) {
  const nav = useNav()
  if (!items.length) return <EmptyState icon={Package} title="No purchase orders" body={empty} />
  return items.map((o) => (
    <Card key={o.id} onClick={() => nav.go(detail, { id: o.id })} className="vv-purchase-order-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-[15px] font-bold text-ink-900">{poTitle(o)}</p><p className="truncate text-xs text-ink-500">{poTotal(o)} · {fmtWhen(o.createdAt)}</p></div>
        <StateBadge map={PO_STATE} s={o.state} />
      </div>
    </Card>
  ))
}

/** Buyer list (c_orders) or supplier list (v_orders). */
export function RemoteOrders({ side = 'customer' }) {
  const mine = useLoad(() => authService.listMyVendors(), [])
  const vendorId = mine.data?.vendors?.[0]?.id
  const load = useCallback(() => (side === 'vendor' ? (vendorId ? authService.listVendorPurchaseOrders(vendorId) : Promise.resolve({ ok: true, purchaseOrders: [] })) : authService.listMyPurchaseOrders()), [side, vendorId])
  const orders = useLoad(load, [load])
  const detail = side === 'vendor' ? 'v_order' : 'c_order'
  return (
    <Screen title="Purchase orders" subtitle={side === 'vendor' ? 'Orders placed with you' : 'Orders you placed'} headerClass="vv-purchase-orders-header" scrollClass="vv-purchase-orders-scroll" bg="bg-[#f8f5ee]">
      {(orders.loading || (side === 'vendor' && mine.loading)) && !orders.data && <Loading />}
      {orders.error && <ErrorBox message={orders.error} onRetry={orders.reload} />}
      {orders.data && <OrderRows items={orders.data.purchaseOrders} detail={detail} empty={side === 'vendor' ? 'Orders from accepted goods quotes appear here.' : 'Accept a goods quote on an RFQ to create an order.'} />}
    </Screen>
  )
}

export function RemoteOrderDetail({ params = {} }) {
  const mine = useMyVendorIds()
  const { loading, error, data, reload } = useLoad(() => authService.getPurchaseOrder(params.id), [params.id])
  const { busy, failure, run } = useAct(reload)
  const [ship, setShip] = useState(null)
  if ((loading && !data) || mine.loading) return <Screen title="Purchase order"><Loading /></Screen>
  if (error) return <Screen title="Purchase order"><ErrorBox message={error} onRetry={reload} /></Screen>
  const o = data.purchaseOrder
  const supplier = mine.ids.includes(o.supplierVendorId)
  const act = (action, done, extra) => () => run(() => authService.purchaseOrderAction(o.id, action, extra), done)
  const lines = Array.isArray(o.terms?.lines) ? o.terms.lines : []
  return (
    <Screen title={poTitle(o)} subtitle={supplier ? 'You are the supplier' : 'You are the buyer'} right={<StateBadge map={PO_STATE} s={o.state} />} headerClass="vv-purchase-orders-header" scrollClass="vv-purchase-orders-scroll" bg="bg-[#f8f5ee]">
      {failure && <Banner tone="red" title="Could not update">{failure}</Banner>}
      <Card><KV rows={[['Total', poTotal(o)], ['Ordered', fmtWhen(o.createdAt)], ['Reference', short(o.id)]]} /></Card>
      {lines.length > 0 && <Section title="Items"><Card><div className="space-y-1 text-sm text-ink-700">{lines.map((l, i) => <p key={i}>{l.description}: {l.quantity}{l.unit ? ` ${l.unit}` : ''} × {money(l.unitPriceMinor, o.terms.currency)} = {money(l.lineTotalMinor, o.terms.currency)}</p>)}</div></Card></Section>}
      <div className="space-y-2">
        {supplier && o.state === 'created' && <><Button full disabled={busy} onClick={act('accept', 'Order accepted')}>Accept order</Button><Button full variant="secondary" disabled={busy} onClick={act('reject', 'Order rejected')}>Reject order</Button></>}
        {supplier && o.state === 'accepted' && <Button full disabled={busy} onClick={act('process', 'Order is processing')}>Start processing</Button>}
        {supplier && o.state === 'processing' && <Button full disabled={busy} onClick={() => setShip({ carrier: '', trackingReference: '' })}>Mark as shipped</Button>}
        {!supplier && o.state === 'shipped' && <Button full disabled={busy} onClick={act('deliver', 'Marked delivered')}>Mark delivered</Button>}
        {!supplier && o.state === 'delivered' && <Button full disabled={busy} onClick={act('complete', 'Order completed')}>Confirm and complete</Button>}
        {o.state === 'shipped' && <Button full variant="secondary" disabled={busy} onClick={act('delivery_exception', 'Delivery exception recorded')}>Report a delivery problem</Button>}
        {o.state === 'created' && <Button full variant="secondary" disabled={busy} onClick={act('cancel', 'Order cancelled')}>Cancel order</Button>}
      </div>
      <RemotePaymentRecords parentType="purchase_order" parentId={o.id} state={o.state} vendorSide={supplier} />
      <Dialog open={Boolean(ship)} onClose={() => setShip(null)} title="Shipment details" actions={<><Button variant="secondary" full onClick={() => setShip(null)}>Cancel</Button><Button full disabled={busy} onClick={() => { const extra = { ...(ship.carrier.trim() ? { carrier: ship.carrier.trim() } : {}), ...(ship.trackingReference.trim() ? { trackingReference: ship.trackingReference.trim() } : {}) }; setShip(null); run(() => authService.purchaseOrderAction(o.id, 'ship', extra), 'Order shipped') }}>Ship</Button></>}>
        {ship && <div className="space-y-3"><Input label="Carrier (optional)" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} /><Input label="Tracking reference (optional)" value={ship.trackingReference} onChange={(e) => setShip({ ...ship, trackingReference: e.target.value })} /></div>}
      </Dialog>
    </Screen>
  )
}

/* ================= CONTRACTS ================= */
export function ContractRows({ items, detail, empty }) {
  const nav = useNav()
  if (!items.length) return <EmptyState icon={FileSignature} title="No contracts" body={empty} />
  return items.map((c) => (
    <Card key={c.id} onClick={() => nav.go(detail, { id: c.id })}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-[15px] font-bold text-ink-900">{text(c.version?.scope?.title) || `Contract ${short(c.id)}`}</p><p className="truncate text-xs text-ink-500">Version {c.currentVersion} · {fmtWhen(c.createdAt)}</p></div>
        <StateBadge map={CONTRACT_STATE} s={c.state} />
      </div>
    </Card>
  ))
}

/** Contract detail for either party (c_contract / v_contract): accept the current version, decline, counter, add and move milestones. */
export function RemoteContractDetail({ params = {} }) {
  const mine = useMyVendorIds()
  const { loading, error, data, reload } = useLoad(() => authService.getContract(params.id), [params.id])
  const { busy, failure, run } = useAct(reload)
  const [decline, setDecline] = useState(null)
  const [ms, setMs] = useState(null)
  const [counter, setCounter] = useState(null)
  if ((loading && !data) || mine.loading) return <Screen title="Contract"><Loading /></Screen>
  if (error) return <Screen title="Contract"><ErrorBox message={error} onRetry={reload} /></Screen>
  const c = data.contract
  const vendorSide = mine.ids.includes(c.vendorId)
  const v = c.version || {}
  const open = ['proposed', 'negotiating'].includes(c.state)
  const milestones = c.milestones || []
  const act = (fn, done) => () => run(fn, done)
  return (
    <Screen title={text(v.scope?.title) || 'Contract'} subtitle={vendorSide ? 'You are the vendor' : 'You are the customer'} right={<StateBadge map={CONTRACT_STATE} s={c.state} />}>
      {failure && <Banner tone="red" title="Could not update">{failure}</Banner>}
      <Card>
        <KV rows={[
          ['Version', String(c.currentVersion)],
          ['Scope', text(v.scope?.description) || text(v.scope?.scope) || 'Not provided'],
          ['Schedule', text(v.schedule?.summary) || 'Not provided'],
          ['Price', text(v.priceSchedule?.summary) || (v.priceSchedule?.totalMinor !== undefined ? money(v.priceSchedule.totalMinor, v.priceSchedule.currency) : 'Not provided')],
          ['Term', text(v.term?.summary) || 'Not provided'],
          ['Accepted (this version)', (c.acceptances || []).length ? c.acceptances.map((a) => `${a.party_role}`).join(', ') : 'Nobody yet'],
        ]} />
      </Card>
      {open && (
        <div className="space-y-2">
          <Button full disabled={busy} onClick={act(() => authService.acceptContract(c.id), 'You accepted this version')}>Accept this version</Button>
          <Button full variant="secondary" disabled={busy} onClick={() => setCounter({ title: text(v.scope?.title) || '', description: text(v.scope?.description) || '' })}>Counter with changes</Button>
          <Button full variant="secondary" disabled={busy} onClick={() => setDecline('')}>Decline</Button>
        </div>
      )}
      {c.state === 'active' && <Button full variant="secondary" disabled={busy} onClick={act(() => authService.completeContract(c.id), 'Contract completed')}>Complete contract</Button>}
      <RemotePaymentRecords parentType="contract" parentId={c.id} state={c.state} vendorSide={vendorSide} />
      <Section title={`Milestones (${milestones.length})`} action={c.state === 'active' ? 'Add' : undefined} onAction={() => setMs({ title: '', amount: '', dueAt: '' })}>
        {milestones.length === 0 && <EmptyState icon={FileSignature} title="No milestones" body={c.state === 'active' ? 'Add milestones to track the work.' : 'Milestones can be added once the contract is active.'} />}
        {milestones.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-[15px] font-bold text-ink-900">{m.title}</p><StateBadge map={MILESTONE_STATE} s={m.state} /></div>
            <p className="text-xs text-ink-500">{m.due_at ? `Due ${fmtWhen(m.due_at)}` : 'No due date'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {vendorSide && m.state === 'pending' && <Button size="sm" disabled={busy} onClick={act(() => authService.milestoneAction(m.id, 'start'), 'Milestone started')}>Start</Button>}
              {vendorSide && m.state === 'in_progress' && <Button size="sm" disabled={busy} onClick={act(() => authService.milestoneAction(m.id, 'complete'), 'Marked complete')}>Mark complete</Button>}
              {!vendorSide && m.state === 'completed_awaiting' && <Button size="sm" disabled={busy} onClick={act(() => authService.milestoneAction(m.id, 'confirm'), 'Milestone confirmed')}>Confirm</Button>}
            </div>
          </Card>
        ))}
      </Section>
      <Dialog open={decline !== null} onClose={() => setDecline(null)} title="Decline this contract?" actions={<><Button variant="secondary" full onClick={() => setDecline(null)}>Keep</Button><Button full disabled={busy || !String(decline || '').trim()} onClick={() => { const reason = decline.trim(); setDecline(null); run(() => authService.declineContract(c.id, reason), 'Contract declined') }}>Decline</Button></>}>
        <Input label="Reason" required textarea value={decline || ''} onChange={(e) => setDecline(e.target.value)} />
      </Dialog>
      <Dialog open={Boolean(ms)} onClose={() => setMs(null)} title="Add milestone" actions={<><Button variant="secondary" full onClick={() => setMs(null)}>Cancel</Button><Button full disabled={busy || !ms?.title.trim()} onClick={() => { const body = { title: ms.title.trim(), ...(ms.amount !== '' && Number(ms.amount) >= 0 ? { amountMinor: Math.round(Number(ms.amount) * 100), currency: v.priceSchedule?.currency || 'INR' } : {}), ...(ms.dueAt ? { dueAt: new Date(`${ms.dueAt}T23:59:59`).toISOString() } : {}) }; setMs(null); run(() => authService.addContractMilestone(c.id, body), 'Milestone added') }}>Add</Button></>}>
        {ms && <div className="space-y-3"><Input label="Title" required value={ms.title} onChange={(e) => setMs({ ...ms, title: e.target.value })} /><Input label="Amount (optional)" inputMode="decimal" value={ms.amount} onChange={(e) => setMs({ ...ms, amount: e.target.value })} /><Input label="Due date (optional)" type="date" value={ms.dueAt} onChange={(e) => setMs({ ...ms, dueAt: e.target.value })} /></div>}
      </Dialog>
      <Dialog open={Boolean(counter)} onClose={() => setCounter(null)} title="Counter proposal" actions={<><Button variant="secondary" full onClick={() => setCounter(null)}>Cancel</Button><Button full disabled={busy || !counter?.title.trim()} onClick={() => { const scope = { ...v.scope, title: counter.title.trim(), description: counter.description.trim() }; setCounter(null); run(() => authService.reviseContract(c.id, { scope, ...(v.schedule ? { schedule: v.schedule } : {}), ...(v.priceSchedule ? { priceSchedule: v.priceSchedule } : {}), ...(v.term ? { term: v.term } : {}) }), 'New version sent') }}>Send</Button></>}>
        {counter && <div className="space-y-3"><p className="text-xs text-ink-500">This creates a new version. Both parties must accept the same current version.</p><Input label="Title" required value={counter.title} onChange={(e) => setCounter({ ...counter, title: e.target.value })} /><Input label="Scope" textarea value={counter.description} onChange={(e) => setCounter({ ...counter, description: e.target.value })} /></div>}
      </Dialog>
    </Screen>
  )
}

/** Propose a contract to a vendor for a listing's category (c_contract_new). The category must configure an approved contract template; otherwise the server says so. */
export function RemoteContractNew({ params = {} }) {
  const nav = useNav()
  const { toast } = useApp()
  const listing = useLoad(() => (params.listingId ? authService.getPublicListing(params.listingId) : Promise.resolve({ ok: true, listing: null })), [params.listingId])
  const [f, setF] = useState({ title: '', description: '', price: '', term: '' })
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const l = listing.data?.listing
  const vendorId = params.vendorId || l?.vendor?.id
  const categoryId = params.categoryId || l?.categoryId
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  if (listing.loading && !listing.data) return <Screen title="Propose a contract"><Loading /></Screen>
  const submit = async () => {
    if (!vendorId || !categoryId) return setFailure('Open this from a vendor listing so the vendor and category are known.')
    if (!f.title.trim() || !f.description.trim()) return toast('Add a title and the scope', 'warn')
    setBusy(true)
    setFailure('')
    const r = await authService.proposeContract({
      vendorId, categoryId, scope: { title: f.title.trim(), description: f.description.trim() },
      ...(f.price.trim() ? { priceSchedule: { summary: f.price.trim() } } : {}), ...(f.term.trim() ? { term: { summary: f.term.trim() } } : {}),
    })
    setBusy(false)
    if (!r.ok) return setFailure(r.message)
    toast('Contract proposed')
    nav.replace('c_contract', { id: r.contract.id })
  }
  return (
    <Screen title="Propose a contract" subtitle={l ? `With ${l.vendor?.name || 'the vendor'}` : undefined} footer={<Button full size="lg" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send proposal'}</Button>}>
      {failure && <Banner tone="red" title="Could not send">{failure}</Banner>}
      {listing.error && <ErrorBox message={listing.error} onRetry={listing.reload} />}
      <Input label="Title" required value={f.title} onChange={set('title')} />
      <Input label="Scope" required textarea value={f.description} onChange={set('description')} />
      <Input label="Price terms (optional)" value={f.price} onChange={set('price')} />
      <Input label="Term (optional)" value={f.term} onChange={set('term')} />
    </Screen>
  )
}

export const RemoteCustomerWorkOrder = (props) => <RemoteWorkOrder {...props} side="customer" />
export const RemoteVendorWorkOrder = (props) => <RemoteWorkOrder {...props} side="vendor" />
export const RemoteCustomerOrders = () => <RemoteOrders side="customer" />
export const RemoteVendorOrders = () => <RemoteOrders side="vendor" />

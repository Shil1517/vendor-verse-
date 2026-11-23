import { useState } from 'react'
import { CalendarCheck, FileSignature, Package, ClipboardList } from 'lucide-react'
import { Badge, Banner, Button, Card, EmptyState, Group, Input, KV, ListRow, Section, Select, StatusBadge, Segmented, Timeline, fmt, cx } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { P2Badge, Page, Facts, Lifecycle } from './blocks.jsx'

/* ============ bookings ============ */

/* F-BKG-04: modification keeps original terms until the vendor accepts */
export function BookModify({ params = {} }) {
  const { bookings, patchBooking, stamp, toast, notify } = useApp()
  const nav = useNav()
  const b = bookings.find((x) => x.id === (params.id || 'BKG-1039'))
  const [f, setF] = useState({ date: '27 Oct 2026', slot: '03:00 PM', reason: '' })
  if (!b) return <Page title="Change request"><EmptyState title="Booking not found" /></Page>
  const send = () => {
    if (!f.reason.trim()) return toast('Add a short reason', 'warn')
    patchBooking(b.id, (x) => ({ status: 'change_requested', proposedDate: f.date, proposedSlot: f.slot, changeNote: f.reason, originalTerms: { date: x.date, slot: x.slot }, history: [...x.history, { s: 'change_requested', at: stamp(), note: f.reason }] }))
    notify('vendor', 'Booking change requested', `${b.id} · ${f.date}, ${f.slot}`, 'booking')
    toast('Change request sent. Original time stays until the vendor accepts.')
    nav.replace('c_booking', { id: b.id })
  }
  return <Page title="Request a change" subtitle={b.id} footer={<Button full onClick={send}>Send change request</Button>}>
    <Banner tone="blue" title="Original terms stay in force">Your confirmed time {b.date}, {b.slot} is kept until the vendor accepts the new one.</Banner>
    <Input label="New date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
    <Select label="New time" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} options={['09:00 AM', '10:00 AM', '11:00 AM', '03:00 PM', '04:00 PM']} />
    <Input label="Reason" textarea value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
  </Page>
}

/* vendor side of the change request */
export function VendorBookingMod({ params = {} }) {
  const { bookings, patchBooking, stamp, toast } = useApp()
  const nav = useNav()
  const b = bookings.find((x) => x.id === (params.id || 'BKG-1045')) || bookings.find((x) => x.status === 'change_requested' || x.status === 'reschedule')
  if (!b) return <Page title="Change request"><EmptyState icon={CalendarCheck} title="No change requests" body="Customer change requests appear here." /></Page>
  const act = (status, note, extra = {}) => { patchBooking(b.id, (x) => ({ status, ...extra, history: [...x.history, { s: status, at: stamp(), note }] })); toast(note); nav.back() }
  return <Page title="Customer change request" subtitle={b.id}>
    <Facts title="Current confirmed terms" rows={[['Date', b.originalTerms?.date || b.date], ['Time', b.originalTerms?.slot || b.slot], ['Customer', b.customer]]} />
    <Facts title="Requested" rows={[['Date', b.proposedDate || '27 Oct 2026'], ['Time', b.proposedSlot || '03:00 PM'], ['Reason', b.changeNote || b.notes || '—']]} />
    <div className="flex gap-2"><Button full onClick={() => act('accepted', 'Change accepted', { date: b.proposedDate || b.date, slot: b.proposedSlot || b.slot })}>Accept change</Button><Button full variant="secondary" onClick={() => act('accepted', 'Change declined — original time kept')}>Decline, keep original</Button></div>
  </Page>
}

/* F-BKG-06: 7-day confirmation */
export function BookingDone({ params = {} }) {
  const { bookings, patchBooking, stamp, toast } = useApp()
  const nav = useNav()
  const b = bookings.find((x) => x.id === (params.id || 'BKG-1031'))
  const [left, setLeft] = useState(5)
  if (!b) return <Page title="Confirm completion"><EmptyState title="Booking not found" /></Page>
  const closeIt = (status, note) => { patchBooking(b.id, (x) => ({ status, history: [...x.history, { s: status, at: stamp(), note }] })); toast(note) }
  return <Page title="Confirm completion" subtitle={b.id}>
    <Banner tone="amber" title={`${left} days left to confirm or report`}>The vendor marked this complete. If you do nothing, it closes automatically after 7 days. You can still raise a support case later.</Banner>
    <Facts rows={[['Service', b.id], ['Completed', b.date], ['Status', <StatusBadge key="s" s={b.status} />]]} />
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => { closeIt('closed', 'Customer confirmed completion'); nav.go('c_review', { vendorId: b.vendorId }) }}>Confirm and review</Button>
      <Button variant="secondary" onClick={() => nav.go('c_report', { ref: b.id })}>Report a problem</Button>
      <Button variant="ghost" onClick={() => { setLeft(0); closeIt('closed', 'Auto-closed after 7 days') }}>Simulate 7 days passing</Button>
    </div>
  </Page>
}

/* F-BKG-07: conflicting confirmations */
export function Conflict() {
  const { toast } = useApp()
  const nav = useNav()
  const [keep, setKeep] = useState(null)
  const opts = [{ id: 'a', name: 'BrightSpark Home Services', when: '24 Oct 2026 · 02:00 PM' }, { id: 'b', name: 'Sharma Electricals & Hardware', when: '24 Oct 2026 · 02:00 PM' }]
  return <Page title="Two vendors confirmed the same time" subtitle="You choose which to keep">
    <Banner tone="amber" title="Nothing was cancelled automatically">Both confirmed. Pick one; the other can be cancelled or moved without penalty.</Banner>
    <Group>{opts.map((o, i) => <ListRow key={o.id} title={o.name} subtitle={o.when} right={<Badge tone={keep === o.id ? 'green' : 'gray'}>{keep === o.id ? 'Keep' : 'Select'}</Badge>} onClick={() => setKeep(o.id)} last={i === 1} />)}</Group>
    <Button full disabled={!keep} onClick={() => { toast('Kept your choice. Other booking cancelled.'); nav.back() }}>Confirm my choice</Button>
  </Page>
}

/* F-BKG-09: vendor booking inbox, separate from RFQs */
export function VendorBooking() {
  const { bookings, patchBooking, me, stamp, toast } = useApp()
  const nav = useNav()
  const [tab, setTab] = useState('requested')
  const mine = bookings.filter((b) => b.vendorId === (me.vendorId || 'v-me'))
  const tabs = [{ id: 'requested', label: 'Requests', count: mine.filter((b) => b.status === 'requested').length }, { id: 'accepted', label: 'Confirmed', count: mine.filter((b) => ['accepted', 'change_requested', 'reschedule'].includes(b.status)).length }, { id: 'done', label: 'Done', count: mine.filter((b) => ['completed', 'closed', 'declined', 'cancelled'].includes(b.status)).length }]
  const shown = mine.filter((b) => (tab === 'requested' ? b.status === 'requested' : tab === 'accepted' ? ['accepted', 'change_requested', 'reschedule', 'in_progress'].includes(b.status) : ['completed', 'closed', 'declined', 'cancelled'].includes(b.status)))
  const act = (b, status, note) => { patchBooking(b.id, (x) => ({ status, history: [...x.history, { s: status, at: stamp(), note }] })); toast(note) }
  return <Page title="Booking requests" subtitle="Bookings only. Quote requests are under Work">
    <Segmented value={tab} onChange={setTab} options={tabs} />
    <Banner tone="blue">You only see requests addressed to you. Other vendors a customer asked are never shown.</Banner>
    {shown.length === 0 ? <EmptyState icon={CalendarCheck} title="Nothing here" /> : shown.map((b) => <Card key={b.id} onClick={() => nav.go(b.status === 'change_requested' || b.status === 'reschedule' ? 'v_booking_mod' : 'c_booking', { id: b.id })}><div className="flex items-center justify-between"><p className="text-sm font-bold">{b.id} · {b.customer}</p><StatusBadge s={b.status} /></div><p className="text-xs text-ink-500">{b.date}, {b.slot}</p>{b.status === 'requested' && <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}><Button size="sm" onClick={() => act(b, 'accepted', 'Booking confirmed')}>Confirm</Button><Button size="sm" variant="secondary" onClick={() => act(b, 'declined', 'Booking declined')}>Decline</Button></div>}</Card>)}
  </Page>
}

/* vendor leads view */
export function VendorLeads() {
  const { rfqs, threads } = useApp()
  const nav = useNav()
  const open = rfqs.filter((r) => !r.mine && ['open', 'quoted'].includes(r.status))
  return <Page title="Leads" subtitle="Enquiries and matching requests">
    <Section title="Matching quote requests"><Group>{open.map((r, i) => <ListRow key={r.id} icon={ClipboardList} title={r.title} subtitle={`${r.id} · ${r.location} · by ${r.deadline}`} onClick={() => nav.go('v_rfq', { id: r.id })} last={i === open.length - 1} />)}</Group></Section>
    <Section title="Customer enquiries"><Group>{(threads.vendor || []).map((t, i, a) => <ListRow key={t.id} title={t.name} subtitle={t.ctx} right={t.unread ? <Badge tone="red">{t.unread} new</Badge> : null} onClick={() => nav.go('chat', { id: t.id })} last={i === a.length - 1} />)}</Group></Section>
  </Page>
}

/* ============ RFQ ============ */

export function RfqEdit({ params = {} }) {
  const { rfqs, patchRfq, stamp, toast, notify } = useApp()
  const nav = useNav()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-308')) || rfqs[0]
  const [f, setF] = useState({ qty: r.qty, deadline: r.deadline, desc: r.desc })
  const save = () => {
    const rev = (r.revisions || []).length + 1
    patchRfq(r.id, (x) => ({ ...f, status: x.quotes.length ? 'revised' : x.status, revisions: [...(x.revisions || []), { n: rev, at: stamp(), before: { qty: x.qty, deadline: x.deadline } }], history: [...x.history, { s: 'revised', at: stamp(), note: `Revision ${rev}` }] }))
    if (r.quotes.length) notify('vendor', 'RFQ revised', `${r.id} changed — please re-confirm your quotation`, 'rfq')
    toast(`Revision ${rev} saved`)
    nav.back()
  }
  return <Page title="Edit RFQ" subtitle={`${r.id} · revision ${(r.revisions || []).length + 1}`} footer={<Button full onClick={save}>Save revision</Button>}>
    {r.quotes.length > 0 && <Banner tone="amber" title="Vendors have already quoted">Editing notifies them and asks them to confirm or revise.</Banner>}
    <Input label="Quantity" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
    <Input label="Deadline" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
    <Input label="Description" textarea value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
    {(r.revisions || []).length > 0 && <Section title="Revision history"><Card><Timeline steps={r.revisions.map((x) => ({ label: `Revision ${x.n}`, at: x.at, note: `Was ${x.before.qty}, due ${x.before.deadline}`, done: true }))} /></Card></Section>}
  </Page>
}

export function RfqNone({ params = {} }) {
  const { rfqs, patchRfq, stamp, toast } = useApp()
  const nav = useNav()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-308')) || rfqs[0]
  const [days, setDays] = useState(3)
  return <Page title="No quotations yet" subtitle={r.id}>
    <Banner tone="amber" title="Deadline reached with no quotes">You can extend the deadline, widen your coverage, or refine the requirement.</Banner>
    <Card className="space-y-3"><p className="text-sm font-bold">Extend deadline</p><Select label="Extend by" value={String(days)} onChange={(e) => setDays(Number(e.target.value))} options={[{ value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} /><Button onClick={() => { patchRfq(r.id, (x) => ({ status: 'open', extended: (x.extended || 0) + days, history: [...x.history, { s: 'open', at: stamp(), note: `Deadline extended by ${days} days` }] })); toast('Deadline extended'); nav.back() }}>Extend</Button></Card>
    <div className="flex gap-2"><Button variant="secondary" onClick={() => nav.go('c_rfq_edit', { id: r.id })}>Refine requirement</Button><Button variant="secondary" onClick={() => nav.go('c_location')}>Widen coverage</Button></div>
  </Page>
}

/* F-GDS-02 goods RFQ */
export function RfqGoods() {
  const { setRfqs, me, stamp, toast } = useApp()
  const nav = useNav()
  const [f, setF] = useState({ item: '', spec: '', qty: '', unit: 'tonne', region: 'Jaipur', by: '' })
  const send = () => {
    if (!f.item.trim() || !f.qty) return toast('Item and quantity are required', 'warn')
    const id = `RFQ-${Date.now().toString().slice(-3)}`
    setRfqs((a) => [{ id, mine: true, kind: 'goods', customer: me.name, title: f.item, cat: 'build', qty: `${f.qty} ${f.unit}`, budget: 'Open', deadline: f.by || '10 Nov 2026', location: f.region, desc: f.spec, files: [], status: 'open', created: stamp().slice(0, 6), history: [{ s: 'open', at: stamp() }], quotes: [], chat: [] }, ...a])
    toast('Goods RFQ sent'); nav.replace('c_rfq', { id })
  }
  return <Page title="Goods RFQ" subtitle="Specs, quantity and delivery" footer={<Button full onClick={send}>Send to suppliers</Button>}>
    <Input label="Item" required value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} placeholder="TMT bars Fe500D 12 mm" />
    <Input label="Specifications" textarea value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} placeholder="Grade, size, standards, certificates" />
    <div className="flex gap-3"><Input label="Quantity" required type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /><Select label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} options={['tonne', 'bag', 'piece', 'kg', 'set']} /></div>
    <Input label="Delivery region" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} />
    <Input label="Need by" value={f.by} onChange={(e) => setF({ ...f, by: e.target.value })} placeholder="10 Nov 2026" />
    <Banner tone="blue">Domestic suppliers only in Phase 1. Currency, Incoterms and samples come in Phase 2.</Banner>
  </Page>
}

/* goods quote comparison */
export function RfqCompare({ params = {} }) {
  const { rfqs, vendor } = useApp()
  const nav = useNav()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-320'))
  if (!r) return <Page title="Compare quotations"><EmptyState title="RFQ not found" /></Page>
  const rows = [...r.quotes].sort((a, b) => a.amount - b.amount)
  return <Page title="Compare goods quotations" subtitle={r.title}>
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="text-xs text-ink-500"><th className="p-2">Supplier</th><th>Price</th><th>Lead time</th><th>Valid until</th><th>Notes</th></tr></thead><tbody>{rows.map((q, i) => <tr key={q.id} className={cx('border-t border-ink-100', i === 0 && 'bg-emerald-50/60')}><td className="p-2 font-semibold">{vendor(q.vendorId)?.name}</td><td>{fmt(q.amount)}{i === 0 && <Badge tone="green" className="ml-1">Lowest</Badge>}</td><td>{q.lead} days</td><td>{q.validity}</td><td className="max-w-[220px] text-xs text-ink-500">{q.notes}</td></tr>)}</tbody></table></div>
    <p className="text-xs text-ink-500">Accepting one quotation closes the others in one step. Only one winner is possible.</p>
    <Button full onClick={() => nav.go('c_rfq', { id: r.id })}>Open RFQ to negotiate or accept</Button>
  </Page>
}

/* F-RFQ-04 accepted terms and work order */
export function WorkOrder({ params = {} }) {
  const { rfqs, vendor, toast } = useApp()
  const r = rfqs.find((x) => x.id === (params.id)) || rfqs.find((x) => x.acceptedTerms) || rfqs[0]
  const t = r.acceptedTerms || { vendorId: r.quotes[0]?.vendorId, amount: r.quotes[0]?.amount || 0, lead: r.quotes[0]?.lead || 0, validity: r.quotes[0]?.validity || '—', acceptedAt: 'Not accepted yet' }
  return <Page title="Work order" subtitle={r.id}>
    {!r.acceptedTerms && <Banner tone="amber">No quotation accepted yet. Preview with the first quotation.</Banner>}
    <Facts title="Accepted terms (frozen)" rows={[['Supplier', vendor(t.vendorId)?.name], ['Price', fmt(t.amount)], ['Lead time', `${t.lead} days`], ['Valid until', t.validity], ['Accepted', t.acceptedAt], ['Payment', 'Paid directly to the vendor']]} />
    <Banner tone="blue">Later edits to the RFQ or quotation do not change these terms.</Banner>
    <Button full onClick={() => toast('Work order shared with the vendor')}>Share work order</Button>
  </Page>
}

/* ============ purchase orders (F-GDS-03/04/06) ============ */

export function CustomerOrders() {
  const { orders, listings } = useApp()
  const nav = useNav()
  return <Page title="Purchase orders" subtitle="Goods and supplier orders" headerClass="vv-purchase-orders-header" scrollClass="vv-purchase-orders-scroll" bg="bg-[#f8f5ee]">
    {orders.length === 0 ? <EmptyState icon={Package} title="No purchase orders" /> : <Group className="vv-purchase-order-list">{orders.map((o, i) => <ListRow key={o.id} icon={Package} title={`${o.id} · ${listings.find((l) => l.id === o.listingId)?.title || 'Order'}`} subtitle={`${o.qty} units · ${o.date}`} right={<StatusBadge s={o.status} className="vv-purchase-order-status" />} onClick={() => nav.go('c_order', { id: o.id })} last={i === orders.length - 1} />)}</Group>}
  </Page>
}

export function VendorOrder({ params = {} }) {
  const { orders, patchOrder, stamp, toast } = useApp()
  const nav = useNav()
  const o = orders.find((x) => x.id === (params.id || 'ORD-24020'))
  if (!o) return <Page title="Purchase order"><EmptyState title="Order not found" /></Page>
  const flow = ['placed', 'confirmed', 'packed', 'shipped', 'delivered']
  const next = flow[flow.indexOf(o.status) + 1]
  const go = (status, note) => { patchOrder(o.id, (x) => ({ status, history: [...x.history, { s: status, at: stamp(), note }] })); toast(note) }
  return <Page title={o.id} subtitle={`Customer: ${o.customer}`} right={<StatusBadge s={o.status} className="vv-purchase-order-status" />} headerClass="vv-purchase-orders-header" scrollClass="vv-purchase-orders-scroll" bg="bg-[#f8f5ee]">
    <Facts rows={[['Quantity', o.qty], ['Ship to', o.address], ['Payment', 'Terms agreed directly with the buyer']]} />
    <Card><Timeline steps={flow.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), done: flow.indexOf(s) <= flow.indexOf(o.status), current: s === o.status }))} /></Card>
    <div className="flex flex-wrap gap-2">
      {next && <Button onClick={() => go(next, `Order ${next}`)}>{next === 'confirmed' ? 'Accept order' : `Mark ${next}`}</Button>}
      {o.status === 'placed' && <Button variant="danger" onClick={() => go('rejected', 'Order rejected by supplier')}>Reject</Button>}
      {['confirmed', 'packed', 'shipped'].includes(o.status) && <Button variant="secondary" onClick={() => go('delivery_exception', 'Delivery exception raised')}>Delivery problem</Button>}
      <Button variant="ghost" onClick={() => nav.go('messages')}>Message buyer</Button>
    </div>
  </Page>
}

const PO_OUTCOMES = [['Replacement sent', 'Supplier ships again at no cost'], ['Partial credit note', 'Agreed amount recorded against the invoice'], ['Order cancelled', 'Both sides agree to cancel'], ['No change', 'Case closed without action']]
export function OrderException({ params = {} }) {
  const { orders, patchOrder, stamp, toast } = useApp()
  const nav = useNav()
  const o = orders.find((x) => x.id === (params.id || 'ORD-24011'))
  const [pick, setPick] = useState(null)
  if (!o) return <Page title="Delivery exception"><EmptyState title="Order not found" /></Page>
  return <Page title="Delivery exception" subtitle={o.id}>
    <Banner tone="amber" title="Delivery did not go as planned">Choose how this should be settled. If you cannot agree, open a case.</Banner>
    <Group>{PO_OUTCOMES.map(([a, b], i) => <ListRow key={a} title={a} subtitle={b} right={<Badge tone={pick === a ? 'green' : 'gray'}>{pick === a ? 'Selected' : 'Choose'}</Badge>} onClick={() => setPick(a)} last={i === 3} />)}</Group>
    <div className="flex gap-2"><Button disabled={!pick} onClick={() => { patchOrder(o.id, (x) => ({ status: 'delivery_exception', history: [...x.history, { s: 'delivery_exception', at: stamp(), note: pick }] })); toast('Outcome recorded'); nav.back() }}>Record outcome</Button><Button variant="secondary" onClick={() => nav.go('c_report', { ref: o.id })}>Open a case</Button></div>
  </Page>
}

/* ============ contracts (F-CON-01/02) ============ */

export function ContractNew({ params = {} }) {
  const { contracts, setContracts, me, vendor, toast } = useApp()
  const nav = useNav()
  const v = vendor(params.vendorId || 'v-me')
  const [f, setF] = useState({ title: '', value: '', term: '6 months', terms: '' })
  const send = () => {
    if (!f.title.trim() || !f.value) return toast('Title and value are required', 'warn')
    const id = `CON-${Date.now().toString().slice(-3)}`
    setContracts([{ id, title: f.title, customer: me.name, vendorId: v.id, status: 'proposed', value: Number(f.value), term: f.term, terms: f.terms, versions: [{ by: 'customer', value: Number(f.value), at: 'Just now' }], milestones: [{ id: 'm1', label: 'Milestone 1', due: 'TBD', status: 'pending' }], payment: 'Invoice / offline terms (Mode B)' }, ...contracts])
    toast('Contract proposed'); nav.replace('c_contract', { id })
  }
  return <Page title="Propose a contract" subtitle={v?.name} footer={<Button full icon={FileSignature} onClick={send}>Send proposal</Button>}>
    <Input label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
    <Input label="Contract value" required prefix="₹" inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/\D/g, '') })} />
    <Select label="Term" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} options={['3 months', '6 months', '12 months']} />
    <Input label="Scope and terms" textarea value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} />
    <Banner tone="blue">Payment is by invoice or offline terms. VendorVerse records the terms and never holds funds. Renewal, amendment, termination and e-signature are Phase 2.</Banner>
  </Page>
}

export function ContractView({ params = {}, side = 'customer' }) {
  const { contracts, patchContract, vendor, toast } = useApp()
  const nav = useNav()
  const c = contracts.find((x) => x.id === (params.id || 'CON-501'))
  const [counter, setCounter] = useState('')
  if (!c) return <Page title="Contract"><EmptyState icon={FileSignature} title="Contract not found" /></Page>
  const set = (changes, msg) => { patchContract(c.id, changes); toast(msg) }
  const vend = side === 'vendor'
  return <Page title={c.title} subtitle={`${c.id} · ${vendor(c.vendorId)?.name}`} right={<StatusBadge s={c.status === 'proposed' ? 'submitted' : c.status === 'countered' ? 'negotiating' : c.status === 'active' ? 'active' : c.status === 'disputed' ? 'disputed' : 'done'} />}>
    <Facts rows={[['Value', fmt(c.value)], ['Term', c.term], ['Payment', c.payment], ['Terms', c.terms], c.signed && ['Accepted in app', c.signed], ['E-signature provider', <P2Badge key="es" />]]} />
    <Section title="Versions"><Card><Timeline steps={c.versions.map((x) => ({ label: `${x.by === 'customer' ? 'Customer' : 'Vendor'} offered ${fmt(x.value)}`, at: x.at, done: true }))} /></Card></Section>
    {['proposed', 'countered'].includes(c.status) && <Card className="space-y-3">
      {vend === (c.versions.at(-1).by === 'customer') && <>
        <Input label="Counter value" prefix="₹" inputMode="numeric" value={counter} onChange={(e) => setCounter(e.target.value.replace(/\D/g, ''))} />
        <div className="flex gap-2"><Button disabled={!counter} variant="secondary" onClick={() => set({ status: 'countered', versions: [...c.versions, { by: vend ? 'vendor' : 'customer', value: Number(counter), at: 'Just now' }], value: Number(counter) }, 'Counter sent')}>Counter</Button><Button onClick={() => set({ status: 'active', signed: '30 Oct 2026' }, 'Accepted in app')}>Accept</Button></div></>}
      {vend !== (c.versions.at(-1).by === 'customer') && <p className="text-sm text-ink-600">Waiting for the other side to respond.</p>}
    </Card>}
    {c.status === 'active' && <Section title="Milestones"><Group>{c.milestones.map((m, i) => <ListRow key={m.id} title={m.label} subtitle={`Due ${m.due}`} right={m.status === 'confirmed' ? <Badge tone="green">Confirmed</Badge> : m.status === 'awaiting' ? (vend ? <Badge tone="amber">Awaiting customer</Badge> : <button className="text-[13px] font-bold text-brand-700" onClick={() => set({ milestones: c.milestones.map((x) => (x.id === m.id ? { ...x, status: 'confirmed' } : x)) }, 'Milestone confirmed')}>Confirm</button>) : (vend ? <button className="text-[13px] font-bold text-brand-700" onClick={() => set({ milestones: c.milestones.map((x) => (x.id === m.id ? { ...x, status: 'awaiting' } : x)) }, 'Marked complete — customer has 7 days to confirm')}>Mark complete</button> : <Badge tone="gray">Pending</Badge>)} last={i === c.milestones.length - 1} />)}</Group></Section>}
    <div className="flex gap-2">{c.status === 'active' && <Button variant="dangerSoft" onClick={() => nav.go('c_report', { ref: c.id })}>Raise a contract case</Button>}<Button variant="ghost" onClick={() => toast('Renewal, amendment and termination are Phase 2', 'warn')}>Renew / amend / terminate <Badge tone="purple">Phase 2</Badge></Button></div>
  </Page>
}
export const ContractCustomer = (p) => <ContractView {...p} side="customer" />
export const ContractVendor = (p) => <ContractView {...p} side="vendor" />

/* ============ payment records (F-PAY-01/02) ============ */
export function TermsRecord({ params = {} }) {
  const { toast } = useApp()
  const [paid, setPaid] = useState(false)
  return <Page title="Agreed price and terms" subtitle={params.ref || 'BKG-1039'}>
    <Banner tone="blue" title="You pay the vendor directly">VendorVerse records the agreed price and terms. It does not take or hold payment.</Banner>
    <Facts rows={[['Agreed price', fmt(params.amount || 399)], ['Terms', 'Pay after the job is done'], ['Mode', params.mode === 'B' ? 'Invoice / offline terms (Mode B)' : 'Direct payment (Mode A)']]} />
    <Card className="space-y-2"><p className="text-sm font-bold">Vendor note</p>{paid ? <Banner tone="green" title="Vendor noted payment received">Informational only. It does not change any status.</Banner> : <Button variant="soft" size="sm" onClick={() => { setPaid(true); toast('Vendor note added') }}>Simulate: vendor adds "payment received" note</Button>}</Card>
  </Page>
}

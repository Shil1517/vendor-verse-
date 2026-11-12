import { useMemo, useState } from 'react'
import {
  CalendarCheck, FileText, Plus, Clock, MessageCircle, Check, X, Star, Crown, Megaphone, Gavel, LogOut, Repeat, Hourglass, TriangleAlert, Flag, Eye, Settings, Info, ShieldCheck, MapPin, CalendarClock,
  BarChart3, Layers, Play, Receipt, RefreshCw, Ban, CircleCheck, Store, ChevronRight, Lock, Zap, Download, Pencil, Send,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { cat, isPublished, firstBlocker, subEligible } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Rating, Banner, EmptyState, Stat, KV, fmt, cx, Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar,
  Countdown, Missing, HBar, BarChart, ReasonSheet, Meta, SponsoredTag, Spark, Evidence,
} from '../ui.jsx'
import { BookingCard, bkTimeline, ModeChip, LangButton } from './shared.jsx'
import { RfqCard, qLabel } from './customer_rfq.jsx'
import { hist } from './customer_book.jsx'
import { useMyVendor } from './vendor_a.jsx'
import { ContractCard } from './contracts.jsx'
import { PhaseTag } from '../ui.jsx'
import { FileSignature, Wallet as WalletIcon, Building2, Inbox, Package } from 'lucide-react'

const limitNum = (x) => (x === 'Unlimited' ? Infinity : x)

/* ================= WORK HUB: bookings + quotations ================= */
export function VendorWork({ params = {} }) {
  const nav = useNav()
  const { me, bookings, rfqs, listings, contracts } = useApp()
  const v = useMyVendor()
  const [tab, setTab] = useState(params.tab || 'bookings')
  const [fl, setFl] = useState(tab === 'rfqs' ? 'todo' : 'req')
  if (!v) return <Screen title="Work" back={false}><EmptyState icon={Store} title="No vendor organization" /></Screen>
  const mb = bookings.filter((b) => b.vendorId === v.id)
  const cats = [...new Set(listings.filter((l) => l.vendorId === v.id).map((l) => l.cat))]
  const mr = rfqs.filter((r) => r.customer !== me.name && cats.includes(r.cat))
  const mine = (r) => r.quotes.find((q) => q.vendorId === v.id)
  const bf = { req: (b) => b.state === 'requested', up: (b) => ['confirmed', 'in_progress'].includes(b.state), done: (b) => b.state === 'awaiting', past: (b) => ['closed', 'declined', 'expired', 'cancelled'].includes(b.state) }
  const rf = { todo: (r) => !mine(r) && r.state === 'open', quoted: (r) => mine(r) && r.state === 'open', closed: (r) => r.state !== 'open' && mine(r) }
  const bl = mb.filter(bf[fl] || bf.req)
  const rl = mr.filter(rf[fl] || rf.todo)
  return (
    <Screen title="Work" back={false}>
      <Segmented value={tab} onChange={(t) => { setTab(t); setFl(t === 'rfqs' ? 'todo' : 'req') }} options={[{ id: 'bookings', label: 'Bookings', count: mb.filter(bf.req).length }, { id: 'rfqs', label: 'RFQs', count: mr.filter(rf.todo).length }, { id: 'contracts', label: 'Contracts', count: contracts.filter((c) => c.vendorId === v.id && ['proposed', 'negotiating'].includes(c.state)).length }]} />
      {tab === 'bookings' ? (
        <>
          <Chips scroll={false} value={fl} onChange={setFl} options={[{ id: 'req', label: `Requests (${mb.filter(bf.req).length})` }, { id: 'up', label: 'Upcoming' }, { id: 'done', label: 'Awaiting customer' }, { id: 'past', label: 'Past' }]} />
          <div className="space-y-2.5">
            {bl.sort((a, b) => (a.leftMin ?? 1e9) - (b.leftMin ?? 1e9)).map((b) => <BookingCard key={b.id} b={b} role="vendor" onClick={() => nav.go('v_booking', { id: b.id })} />)}
            {!bl.length && <EmptyState icon={CalendarCheck} title="Nothing here" body="New booking requests appear here with a response countdown." />}
          </div>
        </>
      ) : tab === 'contracts' ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2"><PhaseTag p="P2" /><span className="text-xs text-ink-500">Recurring, supply, AMC and milestone contracts</span></div>
          {contracts.filter((c) => c.vendorId === v.id).map((c) => <ContractCard key={c.id} c={c} role="vendor" onClick={() => nav.go('v_contract', { id: c.id })} />)}
          {!contracts.some((c) => c.vendorId === v.id) && <EmptyState icon={FileSignature} title="No contracts yet" body="Customers can propose contracts from your listings." />}
        </div>
      ) : (
        <>
          <Banner tone="blue">You see RFQs in your categories and service areas. Send a structured quotation; clarify in the linked chat.</Banner>
          <Chips scroll={false} value={fl} onChange={setFl} options={[{ id: 'todo', label: `To quote (${mr.filter(rf.todo).length})` }, { id: 'quoted', label: 'Quoted' }, { id: 'closed', label: 'Closed' }]} />
          <div className="space-y-2.5">
            {rl.map((r) => <RfqCard key={r.id} r={r} role="vendor" onClick={() => nav.go('v_rfq', { id: r.id })} />)}
            {!rl.length && <EmptyState icon={FileText} title="Nothing here" body="Matching RFQs appear here." />}
          </div>
        </>
      )}
    </Screen>
  )
}

/* ================= BOOKING DETAIL (vendor) ================= */
export function VendorBooking({ params }) {
  const nav = useNav()
  const { bookings, patchBooking, listings, notify, toast, me, vendor, addAudit, threads } = useApp()
  const b = bookings.find((x) => x.id === (params.id || 'BKG-2090'))
  const [decline, setDecline] = useState(false)
  const [cancel, setCancel] = useState(false)
  const [modNo, setModNo] = useState(false)
  if (!b) return <Screen title="Booking"><EmptyState title="Not found" /></Screen>
  const v = vendor(b.vendorId)
  const l = listings.find((x) => x.id === b.listingId)
  const c = cat(l.cat)
  const cancels = bookings.filter((x) => x.vendorId === b.vendorId && x.cancel?.by === 'Vendor').length
  const accept = () => {
    // Atomic capacity check: a slot can't be confirmed twice for the same vendor (spec §8.4)
    const clash = bookings.find((o) => o.id !== b.id && o.vendorId === b.vendorId && ['confirmed', 'in_progress'].includes(o.state) && o.date === b.date && o.slot === b.slot)
    if (clash) return toast(`SLOT_TAKEN — ${clash.id} already holds ${b.slot} on ${b.date}`, 'warn')
    patchBooking(b.id, (x) => ({ state: 'confirmed', leftMin: null, ...hist(x, 'confirmed', 'Vendor accepted', v.name) }))
    notify('customer', 'Booking confirmed', `${v.name} accepted ${b.id}.`, 'booking', ['c_booking', { id: b.id }])
    toast('Booking confirmed — customer notified')
  }
  const doDecline = (why) => {
    patchBooking(b.id, (x) => ({ state: 'declined', leftMin: null, ...hist(x, 'declined', `Vendor declined: ${why}`, v.name) }))
    notify('customer', 'Booking declined', `${v.name} couldn’t take ${b.id}. You can contact another vendor.`, 'booking', ['c_booking', { id: b.id }])
    setDecline(false); toast('Declined — customer notified')
  }
  const doCancel = (why) => {
    patchBooking(b.id, (x) => ({ state: 'cancelled', cancel: { by: 'Vendor', reason: why, policyResult: 'Recorded for pattern review — no automatic penalty' }, ...hist(x, 'cancelled', 'Cancelled by vendor — reason recorded', v.name) }))
    notify('customer', 'Vendor cancelled your booking', `${b.id}: ${why}`, 'booking', ['c_booking', { id: b.id }])
    addAudit('Vendor cancelled accepted booking', b.id, 'booking', why, v.name)
    setCancel(false); toast('Cancelled — customer notified; reason recorded')
  }
  const modAccept = () => { patchBooking(b.id, (x) => ({ date: x.mod.date, slot: x.mod.slot, mod: { ...x.mod, state: 'accepted' }, ...hist(x, 'mod_ok', `Accepted change → ${x.mod.date}, ${x.mod.slot}. Active terms updated`, v.name) })); notify('customer', 'Change accepted', `${b.id} is now ${b.mod.date}, ${b.mod.slot}.`, 'booking', ['c_booking', { id: b.id }]); toast('Change accepted — both parties notified') }
  const modDecline = (why) => { patchBooking(b.id, (x) => ({ mod: { ...x.mod, state: 'declined' }, ...hist(x, 'mod_no', `Declined change: ${why}. Original booking remains confirmed`, v.name) })); notify('customer', 'Change declined', `${b.id} stays as originally booked.`, 'booking', ['c_booking', { id: b.id }]); setModNo(false); toast('Change declined — original terms kept') }
  return (
    <Screen
      title={b.id}
      subtitle={b.customer}
      right={<StatusBadge s={b.state} className="mr-2" />}
      overlay={
        <>
          <ReasonSheet open={decline} onClose={() => setDecline(false)} title="Decline request" reasons={['Schedule full', 'Outside my service area', 'Service not offered', 'Customer details unclear', 'Other']} confirmLabel="Decline" danger onConfirm={doDecline} />
          <ReasonSheet open={cancel} onClose={() => setCancel(false)} title="Cancel confirmed booking" confirmLabel="Cancel booking" danger reasons={['Emergency / technician unavailable', 'Customer unreachable', 'Safety concern', 'Other']} onConfirm={doCancel} extra={<Banner tone="amber" title="Please avoid this">The customer is notified immediately. Reasons are recorded and repeated cancellations are reviewed by support — a single cancellation isn’t penalized automatically.{cancels > 0 && <> You have {cancels} recorded cancellation{cancels > 1 ? 's' : ''}.</>}</Banner>} />
          <ReasonSheet open={modNo} onClose={() => setModNo(false)} title="Decline the change" reasons={['Not available on that date', 'Price/scope would change', 'Other']} confirmLabel="Decline change" onConfirm={modDecline} />
        </>
      }
    >
      <Card className="!p-3.5">
        <div className="flex items-start gap-3"><Avatar name={b.customer} size={46} /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{b.customer}</p><p className="text-xs text-ink-500">{l.title}</p></div></div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm"><CalendarClock size={16} className="text-brand-600" /><b>{b.date}</b><span className="text-ink-500">·</span><b>{b.slot}</b><span className="text-xs text-ink-400">{b.tz}</span></div>
        <KV className="mt-3" rows={[['Address', b.addr], ['Notes', b.notes || '—'], ['Customer contact', <span className="flex items-center gap-1 text-ink-400"><Lock size={12} />Hidden until shared</span>]]} />
      </Card>

      {b.state === 'requested' && (
        <Card className="space-y-3 !ring-2 !ring-sky-200">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Respond before it expires</p><Countdown mins={b.leftMin} label="left" /></div>
          <p className="text-[13px] text-ink-600">Unanswered requests expire automatically at {b.due} and the customer is notified. One late response isn’t penalized; repeated poor responsiveness can lower organic ranking.</p>
          <div className="flex gap-2"><Button className="flex-1" icon={Check} onClick={accept}>Accept</Button><Button className="flex-1" variant="dangerSoft" icon={X} onClick={() => setDecline(true)}>Decline</Button></div>
        </Card>
      )}
      {b.mod?.state === 'pending' && (
        <Card className="space-y-2.5 !ring-2 !ring-violet-200">
          <p className="text-sm font-bold">Customer requested a change</p>
          <KV rows={[['Current', `${b.date}, ${b.slot}`], ['Proposed', <b>{b.mod.date}, {b.mod.slot}</b>], ['Note', b.mod.note]]} />
          <p className="text-xs text-ink-500">Original terms stay in force until you accept. If you decline, the booking stays confirmed as is.</p>
          <div className="flex gap-2"><Button className="flex-1" onClick={modAccept}>Accept change</Button><Button className="flex-1" variant="secondary" onClick={() => setModNo(true)}>Decline</Button></div>
        </Card>
      )}
      {b.state === 'confirmed' && <div className="flex gap-2"><Button className="flex-1" icon={Play} onClick={() => { patchBooking(b.id, (x) => ({ state: 'in_progress', ...hist(x, 'in_progress', 'Service started', v.name) })); toast('Marked in progress') }}>Start service</Button><Button className="flex-1" variant="dangerSoft" onClick={() => setCancel(true)}>Cancel</Button></div>}
      {b.state === 'in_progress' && <Button full size="lg" icon={CircleCheck} onClick={() => { patchBooking(b.id, (x) => ({ state: 'awaiting', leftDays: 7, completedAt: 'Just now', ...hist(x, 'awaiting', 'Vendor marked complete — customer has 7 days to confirm or report an issue', v.name) })); notify('customer', 'Please confirm completion', `${b.id} was marked complete. You have 7 days.`, 'booking', ['c_booking', { id: b.id }]); toast('Marked complete — customer notified') }}>Mark complete</Button>}
      {b.state === 'awaiting' && <Banner tone="amber" title="Waiting for the customer">They have {b.leftDays} days to confirm or report an issue. If they don’t respond, the booking closes — a support issue can still be raised afterwards.</Banner>}
      {b.state === 'cancelled' && b.cancel && <Banner tone="gray" title={`Cancelled by ${b.cancel.by.toLowerCase()}`}><b>Reason:</b> {b.cancel.reason}</Banner>}
      {b.state === 'declined' && <Banner tone="gray" title="You declined this request" />}
      {b.state === 'expired' && <Banner tone="gray" title="Request expired">No response before the deadline. Faster replies improve your standing over time.</Banner>}

      <Section title="Terms snapshot"><Card><KV rows={[['Price basis', b.price], ['Cancellation', b.policy === 'event' ? 'Event policy' : 'Standard policy'], ['Payment', 'Direct between customer and you']]} /><p className="mt-2 text-[11px] text-ink-400">Captured at request time. Customers who contacted other vendors are never revealed to you.</p></Card></Section>
      <Section title="Timeline"><Card><Timeline steps={bkTimeline(b).map((s, i, a) => ({ ...s, current: i === a.length - 1 && !['closed', 'cancelled', 'declined', 'expired'].includes(b.state) }))} /></Card></Section>
      <div className="grid grid-cols-2 gap-2.5"><Button variant="secondary" icon={MessageCircle} onClick={() => { const th = threads.vendor.find((t) => t.link?.id === b.id); th ? nav.go('chat', { id: th.id }) : toast('Conversation opens after the customer sends a message') }}>Message</Button><Button variant="secondary" icon={Flag} onClick={() => nav.go('c_report', { type: 'booking', id: b.id, label: `${b.id} — ${b.customer}`, kind: 'issue' })}>Report no-show / issue</Button></div>
    </Screen>
  )
}

/* ================= QUOTATION (vendor) — spec §9.2–9.3 ================= */
export function VendorRfq({ params }) {
  const nav = useNav()
  const { rfqs, patchRfq, notify, toast, vendor, threads } = useApp()
  const v = useMyVendor()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-315'))
  const mine = r.quotes.find((q) => q.vendorId === v.id)
  const eff = mine ? (mine.status === 'pending' && mine.leftDays <= 0 ? 'expired' : mine.status) : null
  const [f, setF] = useState({ price: mine ? String(mine.price) : '', scope: mine?.scope || '', incl: mine?.incl || '', excl: mine?.excl || '', timeline: mine?.timeline || '', validity: '2026-10-30', notes: mine?.notes || '' })
  const [errs, setErrs] = useState({})
  const [wd, setWd] = useState(false)
  const canQuote = r.state === 'open' && (!mine || ['pending', 'expired'].includes(eff))
  const submit = () => {
    const e = {}
    if (!(+f.price > 0)) e.price = 'Enter your price (INR)'
    if (f.scope.trim().length < 8) e.scope = 'Describe the scope'
    if (f.incl.trim().length < 3) e.incl = 'List what’s included'
    if (!f.timeline.trim()) e.timeline = 'Add an estimated timeline'
    if (!f.validity) e.validity = 'Pick a validity date'
    setErrs(e)
    if (Object.keys(e).length) return
    const [y, m, d] = f.validity.split('-')
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]
    const left = Math.max(1, Math.round((new Date(f.validity) - new Date('2026-10-19')) / 864e5))
    patchRfq(r.id, (x) => {
      const rec = { price: +f.price, scope: f.scope, incl: f.incl, excl: f.excl, timeline: f.timeline, validity: `${d} ${mon} ${y}`, leftDays: left, notes: f.notes, status: 'pending' }
      const quotes = mine ? x.quotes.map((k) => (k.id === mine.id ? { ...k, ...rec, revised: (k.revised || 0) + (eff === 'expired' ? 0 : 1), audit: [...k.audit, `${eff === 'expired' ? 'Re-issued' : 'Revised'} at ${fmt(+f.price)} · just now`] } : k)) : [...x.quotes, { id: 'q' + Date.now(), vendorId: v.id, ...rec, revised: 0, audit: [`Submitted ${fmt(+f.price)} · just now`] }]
      return { quotes }
    })
    notify('customer', mine ? 'Quotation revised' : 'New quotation received', `${v.name} quoted ${fmt(+f.price)} for ${r.id}.`, 'rfq', ['c_rfq', { id: r.id }])
    toast(mine ? 'Quotation updated — customer notified' : 'Quotation submitted')
  }
  const withdraw = (why) => { patchRfq(r.id, (x) => ({ quotes: x.quotes.map((k) => (k.id === mine.id ? { ...k, status: 'withdrawn', audit: [...k.audit, `Withdrawn: ${why}`] } : k)) })); notify('customer', 'Quotation withdrawn', `${v.name} withdrew their quote on ${r.id}.`, 'rfq', ['c_rfq', { id: r.id }]); setWd(false); toast('Quotation withdrawn — customer notified') }
  return (
    <Screen
      title={r.id}
      subtitle={r.customer}
      right={<StatusBadge s={r.state} className="mr-2" />}
      overlay={<ReasonSheet open={wd} onClose={() => setWd(false)} title="Withdraw quotation" intro="Allowed until the customer accepts." reasons={['Can’t take the job any more', 'Pricing error', 'Requirement changed', 'Other']} confirmLabel="Withdraw" danger onConfirm={withdraw} />}
      footer={canQuote && <Button full size="lg" onClick={submit}>{mine ? (eff === 'expired' ? 'Issue a new quotation' : 'Revise quotation') : 'Submit quotation'}</Button>}
    >
      <Card><p className="text-base font-bold">{r.title}</p><div className="mt-3 grid grid-cols-2 gap-2.5"><Meta icon={Layers}>{r.qty}</Meta><Meta icon={Receipt}>{r.budget}</Meta><Meta icon={Clock}>Due {r.deadline}</Meta><Meta icon={MapPin}>{r.location}</Meta></div><p className="mt-2 text-[11px] text-ink-400">Revision {r.rev}{r.rev > 1 ? ' — you were notified of the change' : ''}</p></Card>
      <Card><KV rows={r.specs} /></Card>
      {r.files.length > 0 && <div className="space-y-2">{r.files.map((x) => <div key={x} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><FileText size={18} className="text-brand-600" /><span className="flex-1 truncate text-sm font-medium">{x}</span><Download size={16} className="text-ink-400" /></div>)}</div>}
      <Button variant="secondary" icon={MessageCircle} onClick={() => { const th = threads.vendor.find((t) => t.link?.id === r.id); th ? nav.go('chat', { id: th.id }) : toast('Chat is linked to this RFQ once you or the customer write first') }}>Ask a clarifying question</Button>

      {eff === 'accepted' && r.accepted && (
        <Card className="space-y-2 !ring-2 !ring-emerald-500">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Lock size={15} />You won — work order {r.accepted.workOrder}</p>
          <KV rows={[['Agreed', r.accepted.snapshot.price], ['Scope', r.accepted.snapshot.scope], ['Included', r.accepted.snapshot.incl], ['Timeline', r.accepted.snapshot.timeline]]} />
          <p className="text-[11px] text-ink-500">Accepted terms are locked and can’t be edited or withdrawn from here. For an exceptional issue use a separate agreement or support. Payment is direct with the customer.</p>
          <Button size="sm" variant="secondary" onClick={() => nav.go('c_report', { type: 'booking', id: r.id, label: r.title, kind: 'issue' })}>Open support issue</Button>
        </Card>
      )}
      {r.state !== 'open' && eff !== 'accepted' && mine && <Banner tone="gray" title={eff === 'unsuccessful' ? 'Not selected' : 'RFQ closed'}>{eff === 'unsuccessful' ? 'The customer accepted another quotation. You were notified.' : 'No more quotations can be sent.'}</Banner>}
      {eff === 'expired' && r.state === 'open' && <Banner tone="amber" title="Your quotation expired">It can’t be accepted any more, but the RFQ is still open — you can issue a new one.</Banner>}
      {eff === 'withdrawn' && <Banner tone="gray" title="You withdrew this quotation" />}
      {mine && eff === 'pending' && <Banner tone="blue" title="Quotation sent" action={<Countdown mins={mine.leftDays * 1440} label="valid" />}>The customer can accept it until {mine.validity}. You can revise it while it’s pending — they’re notified.</Banner>}

      {canQuote && (
        <Section title={mine && eff !== 'expired' ? 'Revise quotation' : 'Your quotation'}>
          <div className="space-y-4">
            <Input label="Total price (INR)" required prefix="₹" inputMode="numeric" value={f.price} onChange={(e) => { setF({ ...f, price: e.target.value.replace(/\D/g, '') }); setErrs({ ...errs, price: '' }) }} error={errs.price} hint="Currency: Indian rupees" />
            <Input label="Scope" required textarea rows={2} value={f.scope} onChange={(e) => { setF({ ...f, scope: e.target.value }); setErrs({ ...errs, scope: '' }) }} error={errs.scope} />
            <Input label="Inclusions" required textarea rows={2} value={f.incl} onChange={(e) => { setF({ ...f, incl: e.target.value }); setErrs({ ...errs, incl: '' }) }} error={errs.incl} />
            <Input label="Exclusions" textarea rows={2} value={f.excl} onChange={(e) => setF({ ...f, excl: e.target.value })} />
            <div className="flex gap-3"><Input label="Estimated timeline" required placeholder="18 working days" value={f.timeline} onChange={(e) => { setF({ ...f, timeline: e.target.value }); setErrs({ ...errs, timeline: '' }) }} error={errs.timeline} /><Input label="Valid until" required type="date" value={f.validity} onChange={(e) => setF({ ...f, validity: e.target.value })} /></div>
            <Input label="Notes / attachments" textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Brand, warranty, payment terms agreed directly…" />
            <p className="text-xs text-ink-500">After the validity date the quote can’t be accepted. Once accepted it is locked.</p>
          </div>
          {mine && eff === 'pending' && <Button full className="mt-3" variant="dangerSoft" onClick={() => setWd(true)}>Withdraw quotation</Button>}
        </Section>
      )}
      {mine && <Section title="Audit trail"><Card><Timeline steps={mine.audit.map((a) => ({ label: a, done: true }))} /><p className="mt-2 text-[11px] text-ink-400">Customers see your latest terms; the audit trail and the accepted terms are always retained.</p></Card></Section>}
    </Screen>
  )
}

/* ================= SUBSCRIPTION (spec §11) ================= */
export function Subscription() {
  const nav = useNav()
  const { settings, setSubStatus, patchVendor, listings, published, subEvents, setSubEvents, addAudit, notify, toast, invoices, taxes } = useApp()
  const v = useMyVendor()
  const [cancelOpen, setCancelOpen] = useState(false)
  if (!v) return <Screen title="Subscription"><EmptyState icon={Store} title="No vendor organization" /></Screen>
  const sub = v.sub
  const plan = settings.plans.find((p) => p.name === sub.plan) || settings.plans[0]
  const leadMax = limitNum(plan.leads)
  const mine = listings.filter((l) => l.vendorId === v.id && l.review !== 'draft')
  const pub = mine.filter(published).length
  const tone = { active: 'green', grace: 'amber', expired: 'red', cancelled: 'blue', none: 'gray' }[sub.status]
  const meta = {
    active: ['Active', `Paid until ${sub.paidUntil}. Renews ${sub.autoRenew ? sub.renews : 'never (auto-renew off)'}.`],
    grace: ['Grace period', `Payment failed. Listings stay visible until ${sub.grace}. Pay now to avoid being hidden.`],
    expired: ['Expired', 'Public listings, new enquiries and sponsored placements are off. Your data and conversations are kept.'],
    cancelled: ['Auto-renew off', `You stay eligible until ${sub.paidUntil}, subject to the other checks.`],
    none: ['No paid plan', 'Free accounts can browse and message but can’t publish public listings.'],
  }[sub.status]
  const log = (ev, res, tn) => setSubEvents((e) => [{ id: 'e' + Date.now(), vendorId: v.id, ev, at: 'Just now', res, tone: tn }, ...e])
  const sim = (kind) => {
    if (kind === 'pay') { setSubStatus(v.id, 'active', { paidUntil: '14 Dec 2026', renews: '14 Dec 2026', autoRenew: true, grace: null }); log('Payment successful', 'Paid period active — gates re-evaluated; republished only where every gate passes', 'green'); addAudit('Billing: payment confirmed (webhook)', v.name, 'billing', 'Provider signature verified; reconciled', 'System'); notify('vendor', 'Subscription active', 'Payment received. Listings that pass every check are public again.', 'subscription', ['v_sub', {}]) }
    if (kind === 'fail') { setSubStatus(v.id, 'grace', { grace: '22 Oct 2026' }); log('Renewal failed', '3-day grace period started — listings stay visible', 'amber'); notify('vendor', 'Renewal failed — grace period', 'Visible until 22 Oct 2026. Update your payment method.', 'subscription', ['v_sub', {}]) }
    if (kind === 'expire') { setSubStatus(v.id, 'expired'); log('Grace expired unpaid', 'Listings hidden · new enquiries stopped · sponsored removed · data kept', 'red'); addAudit('Subscription expired after grace', v.name, 'publication', 'Grace period ended unpaid', 'System'); notify('vendor', 'Subscription expired', 'Public listings are hidden. Existing bookings and chats stay open.', 'subscription', ['v_sub', {}]) }
    if (kind === 'cancel') { setSubStatus(v.id, 'cancelled', { autoRenew: false }); log('Auto-renew cancelled', `Eligible until ${sub.paidUntil}`, 'blue') }
    if (kind === 'dup') { log('Webhook evt_9930 duplicate', 'Ignored (idempotent) — no second extension or notification', 'gray'); toast('Duplicate event ignored — nothing changed') }
  }
  return (
    <Screen title="Subscription" back right={<IconBtn label="Plans" onClick={() => nav.go('v_plans')}><Crown size={20} /></IconBtn>}>
      <Card className={cx('!p-5', { green: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-sky-50', gray: 'bg-ink-100' }[tone])}>
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Current plan</p><p className="text-2xl font-extrabold">{plan.name}</p></div><StatusBadge s={sub.status === 'cancelled' ? 'sub_cancelled' : sub.status} /></div>
        <p className="mt-2 text-sm text-ink-700"><b>{meta[0]}.</b> {meta[1]}</p>
        {['grace', 'expired', 'none'].includes(sub.status) && <Button className="mt-3" full onClick={() => nav.go('v_plans')}>{sub.status === 'none' ? 'Choose a plan' : 'Renew now'}</Button>}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-3.5"><p className="text-xs text-ink-500">Lead usage</p><p className="text-xl font-extrabold">{sub.leads}<span className="text-sm font-semibold text-ink-400">/{leadMax === Infinity ? '∞' : leadMax}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${leadMax === Infinity ? 15 : Math.min(100, (sub.leads / (leadMax || 1)) * 100)}%` }} /></div></Card>
        <Card className="!p-3.5"><p className="text-xs text-ink-500">Public listings</p><p className="text-xl font-extrabold">{pub}<span className="text-sm font-semibold text-ink-400">/{plan.listings === 'Unlimited' ? '∞' : plan.listings}</span></p><p className="mt-1 text-[11px] text-ink-400">{mine.length} submitted</p></Card>
      </div>
      {sub.pending && <Banner tone="amber" title={`Downgrade to ${sub.pending} scheduled`} action={<Button size="sm" variant="secondary" onClick={() => { patchVendor(v.id, (x) => ({ sub: { ...x.sub, pending: null } })); toast('Downgrade cancelled') }}>Keep {sub.plan}</Button>}>It starts on {sub.paidUntil}. Until then you keep every {sub.plan} benefit. Listings above the new limit are paused, never deleted.</Banner>}
      {['active', 'grace'].includes(sub.status) && sub.autoRenew && plan.price > 0 && (() => { const t = taxes.find((x) => x.code === v.country) || taxes[0]; const tax = Math.round((plan.price * t.rate) / 100); return <Card className="space-y-2"><p className="text-sm font-bold">Next charge · {sub.renews}</p><KV rows={[[`${plan.name} plan`, fmt(plan.price)], [`${t.label} @ ${t.rate}%`, fmt(tax)], ['Total', <b>{fmt(plan.price + tax)}</b>]]} /><p className="text-[11px] text-ink-400">We email you 7 days before. Change or cancel any time before {sub.renews}.</p></Card> })()}
      <Banner tone="blue" title="How leads are counted">Listing views, contact clicks and enquiries count toward usage (counting rules: CFG-02). When you reach the limit, genuine customer enquiries still reach you — you’ll see usage and upgrade options, never a silent block.</Banner>
      <Group>
        <ListRow icon={Crown} tone="rose" title="Compare & change plan" onClick={() => nav.go('v_plans')} />
        <ListRow icon={Megaphone} tone="amber" title="Sponsored visibility" subtitle="Sold separately · always labelled" onClick={() => nav.go('v_sponsor')} />
        <ListRow icon={Receipt} tone="sky" title="Pricing & fees" subtitle="Who pays what, with a calculator" onClick={() => nav.go('fees')} last />
      </Group>
      <Section title="Invoices"><Group>{invoices.filter((i) => i.vendorId === v.id).slice(0, 4).map((i, k, a) => <ListRow key={i.id} last={k === a.length - 1} icon={Receipt} tone="sky" title={i.id} subtitle={`${i.title} · ${i.date}`} right={<b className="text-sm">{fmt(i.total)}</b>} onClick={() => nav.go('invoice', { id: i.id })} />)}{!invoices.some((i) => i.vendorId === v.id) && <p className="p-4 text-sm text-ink-500">No invoices yet.</p>}</Group></Section>
      <Card className="space-y-2"><Toggle label="Auto-renew" desc={sub.autoRenew ? `Renews ${sub.renews}` : 'Off — plan ends on the paid-until date'} on={sub.autoRenew} onChange={(on) => { if (!on && sub.autoRenew) return setCancelOpen(true); patchVendor(v.id, (x) => ({ sub: { ...x.sub, autoRenew: on, status: on && x.sub.status === 'cancelled' ? 'active' : on ? x.sub.status : x.sub.status === 'active' ? 'cancelled' : x.sub.status } })); toast(on ? 'Auto-renew on' : 'Auto-renew off — eligible until the paid period ends') }} /></Card>
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Turn off auto-renew?" footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>Keep it on</Button><Button variant="danger" className="flex-1" onClick={() => { patchVendor(v.id, (x) => ({ sub: { ...x.sub, autoRenew: false, status: x.sub.status === 'active' ? 'cancelled' : x.sub.status } })); setCancelOpen(false); toast('Auto-renew off — eligible until the paid period ends') }}>Turn off</Button></div>}><KV rows={[['You keep', `${plan.name} until ${sub.paidUntil}`], ['After that', 'Public listings and sponsored placements are hidden'], ['Your data', 'Kept — conversations, bookings, quotations'], ['Refund', 'None for the remaining days'], ['Re-activate', 'Any time — listings return if every other check passes']]} /></Sheet>
      <p className="text-xs text-ink-500"><b>Refunds:</b> generally non-refundable after activation, except duplicate charges, billing errors, applicable law or exceptional support-approved cases. Existing bookings, accepted quotations and conversations stay fully accessible whatever your plan status.</p>
      <Section title="Mockup · billing provider events">
        <Card className="space-y-3 !bg-ink-100 shadow-none">
          <p className="text-xs text-ink-600">A success redirect is never proof of payment — only authenticated, idempotent provider callbacks change state. Try them and watch your listings below recompute.</p>
          <div className="flex flex-wrap gap-2">{[['pay', 'Payment succeeds'], ['fail', 'Renewal fails'], ['expire', 'Grace expires'], ['cancel', 'Cancel auto-renew'], ['dup', 'Duplicate webhook']].map(([k, l]) => <Button key={k} size="sm" variant="secondary" onClick={() => sim(k)}>{l}</Button>)}</div>
        </Card>
        <Group className="mt-2">{listings.filter((l) => l.vendorId === v.id && l.review === 'approved').map((l, i, a) => <ListRow key={l.id} last={i === a.length - 1} icon={published(l) ? Eye : Lock} tone={published(l) ? 'emerald' : 'rose'} title={l.title} subtitle={published(l) ? 'Public' : `Hidden · ${firstBlocker(l, v)?.detail}`} />)}</Group>
      </Section>
      <Section title="Billing events"><Card><Timeline steps={subEvents.filter((e) => e.vendorId === v.id).map((e) => ({ label: e.ev, at: e.at, note: e.res, done: true }))} /></Card></Section>
    </Screen>
  )
}

export function Plans() {
  const nav = useNav()
  const { settings, patchVendor, setSubStatus, toast, listings, published } = useApp()
  const v = useMyVendor()
  const [pick, setPick] = useState(null)
  return (
    <Screen title="Plans" footer={pick && <Button full size="lg" onClick={() => nav.go('v_checkout', { plan: pick.name })}>{pick.price < (settings.plans.find((x) => x.name === v?.sub.plan)?.price ?? 0) ? `Change to ${pick.name}` : `Continue to checkout · ${pick.name}`}</Button>}>
      <Banner tone="amber" title="Sample values">Plan names, prices, limits and entitlements are open configuration (CFG-01, CFG-02). These numbers are placeholders for the mockup.</Banner>
      <Button full variant="soft" icon={Receipt} onClick={() => nav.go('fees')}>How pricing, tax and fees work</Button>
      {settings.plans.map((p) => {
        const cur = v?.sub.plan === p.name
        return (
          <button key={p.id} disabled={!p.publish} onClick={() => !cur && setPick(p)} className={cx('w-full rounded-2xl bg-white p-4 text-left ring-1 ring-inset', pick?.id === p.id ? 'ring-2 ring-brand-600' : 'ring-ink-200', !p.publish && 'opacity-60')}>
            <div className="flex items-center justify-between"><p className="text-base font-extrabold">{p.name}</p>{cur ? <Badge tone="green">Current</Badge> : <p className="text-lg font-extrabold">{p.price ? `₹${p.price.toLocaleString('en-IN')}` : 'Free'}<span className="text-xs font-medium text-ink-400">{p.price ? ' / month' : ''}</span></p>}</div>
            <KV className="mt-3" rows={[['Public listings', p.publish ? p.listings : 'None — can’t publish'], ['Lead limit', p.leads || '—'], ['Tools', p.tools]]} />
          </button>
        )
      })}
      <Card className="space-y-1.5 text-xs text-ink-600"><p className="font-bold text-ink-800">Good to know</p><p>• Plan tier is <b>not</b> a quality signal — it never raises organic ranking or shows as “verified”.</p><p>• Paying doesn’t skip content review or verification.</p><p>• Payment pages and provider callbacks are handled securely; card details never touch our servers.</p></Card>
    </Screen>
  )
}

/* ================= SPONSORED VISIBILITY (spec §11.3, SC-034) ================= */
export function Sponsor({ params = {} }) {
  const nav = useNav()
  const { campaigns, setCampaigns, listings, published, patchListing, toast, vendor } = useApp()
  const v = useMyVendor()
  const mine = listings.filter((l) => l.vendorId === v?.id)
  const [lid, setLid] = useState(params.id || mine[0]?.id)
  const [days, setDays] = useState(14)
  const [msg, setMsg] = useState(null)
  if (!v) return <Screen title="Sponsored"><EmptyState icon={Store} title="No vendor organization" /></Screen>
  const l = mine.find((x) => x.id === lid)
  const camps = campaigns.filter((c) => c.vendorId === v.id)
  const ok = l && published(l) && subEligible(v.sub) && v.sub.status !== 'grace'
  const create = () => {
    if (!ok) return setMsg(`Placement rejected: ${l && firstBlocker(l, v) ? firstBlocker(l, v).detail : 'subscription or eligibility check failed'}. Sponsorship can’t make an ineligible listing appear.`)
    setMsg(null)
    setCampaigns((c) => [{ id: 'sp' + Date.now(), vendorId: v.id, listingId: l.id, start: '20 Oct 2026', end: `${19 + days} Nov 2026`, area: `${l.areas.join(', ')} · ${cat(l.cat).name}`, status: 'live', impressions: 0, clicks: 0 }, ...c])
    patchListing(l.id, { sponsored: true }); toast('Campaign live — always shown with a “Sponsored” label')
  }
  return (
    <Screen title="Sponsored visibility">
      <Banner tone="blue" title="Paid visibility, clearly labelled">Sponsored placements show a <SponsoredTag /> label in search and other placements, and must pass the same publication, safety and verification gates as everyone else. Plan tier is never shown as a quality signal.</Banner>
      <Card className="space-y-3">
        <p className="text-sm font-bold">New campaign</p>
        <Select label="Listing" value={lid} onChange={(e) => { setLid(e.target.value); setMsg(null) }} options={mine.map((x) => ({ value: x.id, label: x.title.slice(0, 44) }))} />
        <Chips scroll={false} value={days} onChange={setDays} options={[{ id: 7, label: '7 days' }, { id: 14, label: '14 days' }, { id: 30, label: '30 days' }]} />
        {l && <p className={cx('flex items-center gap-1.5 text-xs font-semibold', ok ? 'text-emerald-700' : 'text-red-600')}>{ok ? <Check size={13} /> : <X size={13} />}{ok ? 'Listing is eligible' : `Not eligible — ${firstBlocker(l, v)?.detail || 'subscription in grace/expired'}`}</p>}
        {msg && <Banner tone="red" title="Rejected">{msg}</Banner>}
        <Button full onClick={create}>Start campaign</Button>
        <p className="text-[11px] text-ink-400">Sponsorship is sold separately from your plan. Pricing and the campaign manager are being phased in; campaign dates and delivery are audited.</p>
      </Card>
      <Section title="Your campaigns">
        <div className="space-y-2.5">{camps.map((c) => { const ls = listings.find((x) => x.id === c.listingId); return (
          <Card key={c.id} className="!p-3.5"><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">{ls?.title}</p><StatusBadge s={c.status} /></div><p className="mt-1 text-xs text-ink-500">{c.start} → {c.end} · {c.area}</p>{c.status === 'live' && <p className="mt-1.5 text-xs text-ink-600">{c.impressions.toLocaleString('en-IN')} impressions · {c.clicks} clicks</p>}{c.note && <p className="mt-1.5 text-xs font-medium text-red-600">{c.note}</p>}</Card>) })}{!camps.length && <Card><Missing>No campaigns yet</Missing></Card>}</div>
      </Section>
    </Screen>
  )
}

/* ================= REVIEWS ================= */
export function VendorReviews() {
  const nav = useNav()
  const { reviews, setReviews, toast } = useApp()
  const v = useMyVendor()
  const mine = reviews.filter((r) => r.target === v?.id && r.status === 'published')
  const [reply, setReply] = useState(null)
  const [txt, setTxt] = useState('')
  const avg = mine.length ? (mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(1) : null
  return (
    <Screen title="Reviews" overlay={<Sheet open={!!reply} onClose={() => setReply(null)} title="Reply publicly" footer={<Button full disabled={!txt.trim()} onClick={() => { setReviews((rs) => rs.map((r) => (r.id === reply.id ? { ...r, reply: txt } : r))); setReply(null); setTxt(''); toast('Reply posted') }}>Post reply</Button>}>{reply && <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">“{reply.text}”</p>}<Input textarea rows={3} placeholder="Thank the customer or address their concern" value={txt} onChange={(e) => setTxt(e.target.value)} /></Sheet>}>
      <Card className="flex items-center gap-5">{avg ? <div className="text-center"><p className="text-4xl font-extrabold">{avg}</p><Rating value={+avg} /></div> : <Missing>Not yet rated</Missing>}<div className="flex-1 space-y-1.5">{[5, 4, 3].map((s) => <HBar key={s} label={`${s}★`} value={mine.filter((r) => r.rating === s).length} max={mine.length || 1} color="bg-amber-400" />)}</div></Card>
      <p className="text-xs text-ink-500">Only customers with a recorded booking or accepted quote can review you. “No reviews” is never treated as negative. You can reply or report a review — but an honest review isn’t removed just because you disagree.</p>
      {mine.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><Avatar name={r.by} size={34} /><div><p className="text-sm font-bold">{r.by}</p><p className="text-[11px] text-ink-400">{r.at} · {r.via}</p></div></div><Rating value={r.rating} /></div>
          <p className="mt-2 text-[13px] text-ink-600">{r.text}</p>
          {r.reply ? <p className="mt-2 rounded-lg bg-brand-50 p-2.5 text-xs text-brand-900"><b>Your reply:</b> {r.reply}</p> : null}
          <div className="mt-2 flex gap-4">{!r.reply && <button onClick={() => setReply(r)} className="text-xs font-bold text-brand-700">Reply</button>}<button onClick={() => nav.go('c_report', { type: 'review', id: r.id, label: `Review by ${r.by}` })} className="text-xs font-bold text-ink-500">Report review</button></div>
        </Card>
      ))}
      {!mine.length && <EmptyState icon={Star} title="No reviews yet" body="Reviews appear after customers complete a booking or accept your quotation." />}
    </Screen>
  )
}

/* ================= MODERATION CASES & APPEALS (spec §12.2, §12.4) ================= */
export function VendorCases() {
  const nav = useNav()
  const { cases, appeals, setAppeals, patchCase, toast } = useApp()
  const v = useMyVendor()
  const mine = cases.filter((c) => c.against === v?.name)
  const myAppeals = appeals.filter((a) => a.by === v?.name)
  const [ap, setAp] = useState(null)
  const [txt, setTxt] = useState('')
  return (
    <Screen title="Moderation & appeals" overlay={<Sheet open={!!ap} onClose={() => setAp(null)} title="Appeal this decision" footer={<Button full disabled={txt.trim().length < 15} onClick={() => { setAppeals((a) => [{ id: 'AP-' + (32 + a.length), caseId: ap.id, by: v.name, decision: ap.outcome || 'Restriction', note: txt, status: 'open', at: 'Just now', evidence: [] }, ...a]); patchCase(ap.id, { status: 'appealed' }); setAp(null); setTxt(''); toast('Appeal sent for human review') }}>Send appeal</Button>}><p className="text-sm text-ink-600">A human reviewer who wasn’t involved re-evaluates the evidence. The outcome and reason are recorded and sent to you.</p><Input textarea rows={4} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Explain why the decision should change and attach evidence…" /></Sheet>}>
      <Banner tone="blue">Enforcement is proportionate: warnings, content or listing restrictions, or suspension depending on severity and repetition. You can see the reason and appeal where it’s safe to explain.</Banner>
      <Section title="Cases about you">
        <div className="space-y-2.5">{mine.map((c) => (
          <Card key={c.id} className="!p-3.5">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{c.id}</span><StatusBadge s={c.status} /></div>
            <p className="mt-1 text-sm font-bold">{c.title}</p><p className="text-xs text-ink-500">{c.reason} · {c.created}</p>
            {c.outcome && <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-700"><b>Decision:</b> {c.outcome}</p>}
            {c.status === 'decided' && <Button size="sm" className="mt-2" variant="secondary" icon={Gavel} onClick={() => setAp(c)}>Appeal</Button>}
          </Card>))}{!mine.length && <Card><Missing>No cases against you</Missing></Card>}</div>
      </Section>
      <Section title="Your appeals"><div className="space-y-2.5">{myAppeals.map((a) => <Card key={a.id} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{a.id} · {a.caseId}</span><StatusBadge s={a.status === 'open' ? 'appealed' : 'upheld'} /></div><p className="mt-1 text-sm font-bold">{a.decision}</p><p className="mt-1 text-xs text-ink-600">“{a.note}”</p><p className="mt-1 text-[11px] text-ink-400">{a.at}</p></Card>)}{!myAppeals.length && <Card><Missing>No appeals</Missing></Card>}</div></Section>
      <Button full variant="secondary" icon={Flag} onClick={() => nav.go('c_report', { kind: 'appeal', type: 'vendor', label: v?.name })}>Contact support</Button>
    </Screen>
  )
}

/* ================= BASIC OPERATIONAL METRICS (spec §18) ================= */
export function Performance() {
  const { toast, bookings, rfqs } = useApp()
  const v = useMyVendor()
  const [range, setRange] = useState('30')
  const mb = bookings.filter((b) => b.vendorId === v?.id)
  const k = { 7: [14, '92%', '1.4 hrs', '8%'], 30: [61, '94%', '1.2 hrs', '6%'], 90: [172, '95%', '1.1 hrs', '5%'] }[range]
  return (
    <Screen title="Performance" right={<IconBtn label="Export" onClick={() => toast('Report exported (CSV)')}><Download size={20} /></IconBtn>}>
      <Segmented value={range} onChange={setRange} options={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} />
      <div className="grid grid-cols-2 gap-3"><Stat label="Booking requests" value={k[0]} icon={CalendarCheck} tone="sky" delta="+8%" /><Stat label="Acceptance rate" value={k[1]} icon={Check} tone="emerald" delta="+2%" /><Stat label="Median response" value={k[2]} icon={Clock} tone="amber" delta="-10%" /><Stat label="Expired unanswered" value={k[3]} icon={Hourglass} tone="rose" delta="-1%" /></div>
      <Card><p className="mb-3 text-sm font-bold">Requests per week</p><BarChart height={110} data={[{ label: 'W1', value: 32 }, { label: 'W2', value: 41 }, { label: 'W3', value: 38 }, { label: 'W4', value: 55 }, { label: 'W5', value: 49 }, { label: 'W6', value: 68 }]} /></Card>
      <Card className="space-y-3"><p className="text-sm font-bold">Fulfilment</p><HBar label="Completed" value={mb.filter((b) => ['awaiting', 'closed'].includes(b.state)).length} max={mb.length || 1} right={`${mb.filter((b) => ['awaiting', 'closed'].includes(b.state)).length} jobs`} color="bg-emerald-500" /><HBar label="Cancelled by you" value={mb.filter((b) => b.cancel?.by === 'Vendor').length} max={mb.length || 1} color="bg-amber-500" /><HBar label="Declined" value={mb.filter((b) => b.state === 'declined').length} max={mb.length || 1} color="bg-sky-500" /></Card>
      <Banner tone="blue" title="How this affects ranking">Repeated poor responsiveness can lower organic ranking; a single delay or cancellation never triggers an automatic penalty. New vendors with little history aren’t penalized.</Banner>
    </Screen>
  )
}

/* ================= BUSINESS PROFILE / MORE ================= */
export function VendorProfile() {
  const nav = useNav()
  const v = useMyVendor()
  const { patchVendor, toast } = useApp()
  const [f, setF] = useState({ name: v?.name || '', email: v?.email || '', about: 'Trusted local service provider. Licensed, insured and reachable in-app.', showPhone: false })
  if (!v) return <Screen title="Business profile"><EmptyState icon={Store} title="No business profile yet" action={<Button onClick={() => nav.go('v_register')}>Start onboarding</Button>} /></Screen>
  return (
    <Screen title="Business profile" footer={<Button full size="lg" onClick={() => { patchVendor(v.id, { name: f.name, email: f.email }); toast('Business profile saved'); nav.back() }}>Save changes</Button>}>
      <div className="flex justify-center"><Thumb tone={v.tone} icon={Store} size={84} /></div>
      <Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input label="GSTIN" value={v.gstin} readOnly hint="Verified by reviewers — contact support to change" />
      <Input label="Business email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} hint="Hidden from customers" />
      <Input label="About your business" textarea rows={3} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
      <Card><Toggle label="Show phone number to customers" desc="Off by default. Contact is disclosed only through a controlled flow in chat." on={f.showPhone} onChange={(on) => setF({ ...f, showPhone: on })} /></Card>
      <Banner tone="blue" title="Owner-managed">Release 1 has a single Vendor role: the owner. Team members and staff permissions arrive later.</Banner>
    </Screen>
  )
}

export function VendorMore() {
  const nav = useNav()
  const { setMe, me, toast } = useApp()
  const v = useMyVendor()
  return (
    <Screen title="More" back={false} pad={false} right={<LangButton />}>
      <div className="space-y-4 p-4">
        <Card onClick={() => nav.go('v_profile')} className="!p-4"><div className="flex items-center gap-3.5"><Thumb tone={v?.tone || 'teal'} icon={Store} size={56} /><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{v?.name || 'Your business'}</p><p className="text-sm text-ink-500">{me.name} · Owner</p><div className="mt-1.5 flex gap-1.5">{v && <StatusBadge s={v.ver} />}{v && <StatusBadge s={v.sub.status === 'cancelled' ? 'sub_cancelled' : v.sub.status} />}</div></div><ChevronRight size={18} className="text-ink-300" /></div></Card>
        <Group>
          <ListRow icon={Inbox} tone="teal" title="Leads" subtitle="Requests, matched RFQs and new orders" onClick={() => nav.go('v_leads')} />
          <ListRow icon={Package} tone="violet" title="Purchase orders" subtitle="Accept, process and ship" onClick={() => nav.go('v_orders')} />
          <ListRow icon={Building2} tone="indigo" title="Business network" subtitle="Verified companies offering services to vendors — connect by message" onClick={() => nav.go('v_biz_network')} />
          <ListRow icon={Repeat} tone="blue" title="Buy from vendors & companies" subtitle="Your Buy tab - same account" onClick={() => nav.reset('v_buy')} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Verification" subtitle="Documents, expiry & decisions" onClick={() => nav.go('v_verify')} />
          <ListRow icon={ShieldCheck} tone="sky" title="Vendor roles" subtitle="What your business is, verified one by one" onClick={() => nav.go('v_roles')} />
          <ListRow icon={MapPin} tone="teal" title="Service areas" subtitle="Where customers can find you" onClick={() => nav.go('v_areas')} />
          <ListRow icon={CalendarClock} tone="sky" title="Availability" onClick={() => nav.go('v_avail')} />
          <ListRow icon={Building2} tone="teal" title="Public profile & trust" subtitle="Company, certifications, capabilities" onClick={() => nav.go('v_public')} />
          <ListRow icon={WalletIcon} tone="emerald" title="Earnings & payouts" right={<PhaseTag p="P2" />} onClick={() => nav.go('v_payouts')} />
          <ListRow icon={Crown} tone="rose" title="Subscription & plan" subtitle={`${v?.sub.plan || 'Free'} plan`} onClick={() => nav.go('v_sub')} />
          <ListRow icon={Megaphone} tone="amber" title="Sponsored visibility" onClick={() => nav.go('v_sponsor')} last />
        </Group>
        <Group>
          <ListRow icon={Star} tone="amber" title="Customer reviews" onClick={() => nav.go('v_reviews')} />
          <ListRow icon={Gavel} tone="violet" title="Moderation & appeals" onClick={() => nav.go('v_cases')} />
          <ListRow icon={BarChart3} tone="violet" title="Performance" subtitle="Response, acceptance, cancellations" onClick={() => nav.go('v_perf')} last />
        </Group>
        <Group>
          <ListRow icon={Settings} tone="slate" title="Notifications & privacy" onClick={() => nav.go('c_settings')} />
          <ListRow icon={Info} tone="slate" title="Help & support" onClick={() => nav.go('c_report', { kind: 'appeal', type: 'vendor', label: v?.name || 'General' })} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: null, hasVendor: false, name: '' }); nav.reset('welcome') }}>Log out</Button>
      </div>
    </Screen>
  )
}

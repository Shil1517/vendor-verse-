import { useEffect, useRef, useState } from 'react'
import {
  CalendarCheck, FileText, Phone, MessageCircle, Send, Paperclip, Plus, X, Star, Heart, Globe, Bell, Lock, LogOut, ChevronRight, GitCompare, HelpCircle, Smartphone, Trash2, Store,
  Package, BadgeCheck, ImagePlus, ShieldAlert, Flag, Check, EyeOff, Eye, Repeat, Briefcase, Download, BellRing, UserCog, Mail, ShieldCheck, Hourglass, CheckCheck, Info, FileCheck2, Siren,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { remoteInbox, useInbox } from '../useInbox.js'
import { authService } from '../services/authService.js'
import { cat, CATS, REPORT_REASONS, serves, AVAIL_LABEL } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Rating, Banner, EmptyState, SearchBar, KV, cx, Pill, IconBtn, StatusBadge, Stars, ListRow, Group, Timeline,
  Avatar, SOFT, Missing, Price, Scan, Evidence, Countdown, Stepper,
} from '../ui.jsx'
import { LangButton, VendorRow, VerifiedBadge, BookingCard, useStartChat, RatingOrNew } from './shared.jsx'
import { RfqCard } from './customer_rfq.jsx'
import { ContractCard } from './contracts.jsx'
import { RATING_DIMS } from '../globaldata.jsx'
import { PhaseTag } from '../ui.jsx'
import { LayoutDashboard, FileSignature, Wallet as WalletIcon } from 'lucide-react'

export function GuestWall({ title }) {
  const nav = useNav()
  return (
    <Screen title={title} back={false}>
      <EmptyState icon={Lock} title="Log in to continue" body="Browsing is open to everyone. Sign in to book, request quotes and message vendors." action={<div className="flex gap-2"><Button onClick={() => nav.go('login')}>Log in</Button><Button variant="secondary" onClick={() => nav.go('register')}>Create account</Button></div>} />
    </Screen>
  )
}

/* ================= ACTIVITY HUB: bookings + RFQs ================= */
export function Activity({ params = {} }) {
  const nav = useNav()
  const { me, bookings, rfqs, contracts } = useApp()
  const [tab, setTab] = useState(params.tab || 'bookings')
  const [flt, setFlt] = useState('active')
  if (!me.loggedIn) return <GuestWall title="Activity" />
  const mb = bookings.filter((b) => b.customer === me.name)
  const act = ['draft', 'requested', 'confirmed', 'in_progress', 'awaiting']
  const bl = mb.filter((b) => (flt === 'active') === act.includes(b.state))
  const mr = rfqs.filter((r) => r.customer === me.name)
  const rl = mr.filter((r) => (flt === 'active') === (r.state === 'open'))
  const mc = contracts.filter((c) => c.customer === me.name)
  const cl = mc.filter((c) => (flt === 'active') === ['proposed', 'negotiating', 'active', 'renewal_due'].includes(c.state))
  const conflict = mb.find((b) => b.state === 'confirmed' && mb.some((o) => o.id !== b.id && o.req === b.req && o.state === 'confirmed'))
  return (
    <Screen title="Activity" back={me.role === 'vendor'} right={tab === 'rfqs' ? <IconBtn label="New RFQ" onClick={() => nav.go('c_rfq_new')}><Plus size={21} /></IconBtn> : null}>
      <Segmented value={tab} onChange={(v) => { setTab(v); setFlt('active') }} options={[{ id: 'bookings', label: 'Bookings', count: mb.filter((b) => act.includes(b.state)).length }, { id: 'rfqs', label: 'RFQs', count: mr.filter((r) => r.state === 'open').length }, { id: 'contracts', label: 'Contracts', count: mc.filter((c) => ['proposed', 'negotiating', 'active'].includes(c.state)).length }]} />
      <ListRow icon={Package} tone="violet" title="Purchase orders" subtitle="Supplier orders from accepted quotations" onClick={() => nav.go('c_orders', { as: 'buyer' })} />
      <Chips scroll={false} value={flt} onChange={setFlt} options={[{ id: 'active', label: 'Active' }, { id: 'past', label: 'Past' }]} />
      {tab === 'bookings' && (
        <div className="space-y-2.5">
          {conflict && flt === 'active' && <Banner tone="amber" title="Two vendors confirmed the same job" action={<Button size="sm" onClick={() => nav.go('c_conflict', { req: conflict.req })}>Choose which to keep</Button>}>Nothing is cancelled automatically.</Banner>}
          {bl.map((b) => <BookingCard key={b.id} b={b} onClick={() => nav.go('c_booking', { id: b.id })} />)}
          {!bl.length && <EmptyState icon={CalendarCheck} title={`No ${flt} bookings`} body="Find a vendor that serves your area and send a booking request." action={<Button size="sm" onClick={() => nav.go('c_explore')}>Explore</Button>} />}
        </div>
      )}
      {tab === 'rfqs' && (
        <div className="space-y-2.5">
          <Banner tone="blue">Describe the work once. Eligible vendors reply with structured quotations you can compare and accept.</Banner>
          {rl.map((r) => <RfqCard key={r.id} r={r} onClick={() => nav.go('c_rfq', { id: r.id })} />)}
          {!rl.length && <EmptyState icon={FileText} title={`No ${flt} requests`} body="Request a quotation and compare replies from eligible vendors." action={<Button size="sm" onClick={() => nav.go('c_rfq_new')}>Request quotation</Button>} />}
        </div>
      )}
      {tab === 'contracts' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2"><PhaseTag p="P2" /><span className="text-xs text-ink-500">Recurring, supply, AMC and milestone contracts with e-signature</span></div>
          {cl.map((c) => <ContractCard key={c.id} c={c} onClick={() => nav.go('c_contract', { id: c.id })} />)}
          {!cl.length && <EmptyState icon={FileSignature} title={`No ${flt} contracts`} body="Propose a recurring service, supply agreement, AMC or milestone project to a vendor." action={<Button size="sm" onClick={() => nav.go('c_contract_new')}>Propose a contract</Button>} />}
        </div>
      )}
    </Screen>
  )
}

/* ================= FAVORITES + COMPARE (spec §7.4, §7.5) ================= */
export function Saved({ params = {} }) {
  const nav = useNav()
  const { saved, listings, vendors, compare, toggleCompare, vendor, setCompare, notifs, loc, published } = useApp()
  const [tab, setTab] = useState(params.tab || 'saved')
  const sv = vendors.filter((v) => saved.includes(v.id))
  const cl = compare.map((id) => listings.find((l) => l.id === id)).filter(Boolean)
  const alerts = (notifs.customer || []).filter((n) => n.type === 'saved')
  const rows = [
    ['Price', (l) => <Price l={l} />],
    ['Verification', (l) => <VerifiedBadge id={l.vendorId} compact />],
    ['Credentials', (l) => (vendor(l.vendorId).docs.length ? `${vendor(l.vendorId).docs.filter((d) => d.status === 'verified').length} verified` : <Missing>None provided</Missing>)],
    ['Serves you?', (l) => (serves(l, loc) ? <span className="font-bold text-emerald-700">Yes</span> : <span className="font-bold text-amber-700">No</span>)],
    ['Availability', (l) => (l.avail === 'none' ? <Missing>Not listed</Missing> : AVAIL_LABEL[l.avail])],
    ['Rating', (l) => <RatingOrNew value={l.rating} count={l.reviews} />],
    ['Response time', (l) => (vendor(l.vendorId).resp ? `~${vendor(l.vendorId).resp}` : <Missing>Not available</Missing>)],
    ['Experience', (l) => l.exp || <Missing>Not provided</Missing>],
  ]
  return (
    <Screen title="Favorites & compare">
      <Segmented value={tab} onChange={setTab} options={[{ id: 'saved', label: 'Favorites', count: sv.length }, { id: 'compare', label: 'Compare', count: cl.length }]} />
      {tab === 'saved' && (
        <div className="space-y-2.5">
          <p className="text-xs text-ink-500">Saving a vendor never notifies them. We alert you only about meaningful changes — availability or service-area eligibility.</p>
          {alerts.map((n) => <Banner key={n.id} tone="amber" icon={BellRing} title={n.title}>{n.body}</Banner>)}
          {sv.map((v) => <VendorRow key={v.id} v={v} />)}
          {!sv.length && <EmptyState icon={Heart} title="No favorites yet" body="Tap the heart on any vendor to keep them here." action={<Button size="sm" onClick={() => nav.go('c_explore')}>Explore</Button>} />}
        </div>
      )}
      {tab === 'compare' && (
        cl.length < 2 ? (
          <EmptyState icon={GitCompare} title="Pick 2–3 vendors to compare" body={cl.length ? `${cl.length} selected. Add one more from any listing page.` : 'Open a listing and tap “Compare” to add it here. You can compare up to three.'} action={<Button size="sm" onClick={() => nav.go('c_explore')}>Browse</Button>} />
        ) : (
          <>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cl.length}, 1fr)` }}>
              {cl.map((l) => <Card key={l.id} className="relative !p-2.5 text-center"><button aria-label="Remove" onClick={() => toggleCompare(l.id)} className="absolute right-1.5 top-1.5"><X size={14} className="text-ink-400" /></button><Thumb tone={l.tone} icon={cat(l.cat).icon} size={40} className="mx-auto" round="rounded-xl" /><p className="mt-2 line-clamp-2 text-[11px] font-bold leading-tight">{vendor(l.vendorId).name}</p></Card>)}
            </div>
            <Card pad={false} className="overflow-hidden">
              {rows.map(([k, fn], i) => (
                <div key={k} className={cx('px-3 py-2.5', i % 2 === 0 && 'bg-ink-50')}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{k}</p>
                  <div className="mt-1 grid gap-2 text-center text-[13px]" style={{ gridTemplateColumns: `repeat(${cl.length}, 1fr)` }}>{cl.map((l) => <span key={l.id} className="flex justify-center">{fn(l)}</span>)}</div>
                </div>
              ))}
            </Card>
            <p className="text-[11px] text-ink-400">Absent data is labelled, never filled in. A paid plan tier is not shown — it is not a quality signal.</p>
            <Button full variant="secondary" onClick={() => setCompare([])}>Clear comparison</Button>
          </>
        )
      )}
    </Screen>
  )
}

/* ================= NOTIFICATIONS (shared, spec §10.2) ================= */
const NTONE = { booking: ['sky', CalendarCheck], rfq: ['violet', FileText], message: ['amber', MessageCircle], subscription: ['emerald', BadgeCheck], listing: ['indigo', Store], onboarding: ['teal', BadgeCheck], support: ['rose', ShieldAlert], saved: ['rose', Heart], followup: ['orange', CalendarCheck], security: ['slate', ShieldCheck] }
export function Notifications() {
  const nav = useNav()
  const { me, notifs, setNotifs } = useApp()
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
    if (n.to) nav.go(n.to[0], n.to[1] || {})
  }
  const Row = ({ n }) => {
    const [tone, I] = NTONE[n.type] || ['slate', Bell]
    return (
      <button onClick={() => open(n)} className={cx('flex w-full items-start gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset', n.read ? 'bg-white ring-ink-100' : 'bg-brand-50/60 ring-brand-100')}>
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', SOFT[tone])}><I size={19} /></span>
        <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{n.title}</span><span className="shrink-0 text-[11px] text-ink-400">{n.time}</span></span><span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{n.body}</span><span className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-ink-400"><CheckCheck size={11} />In-app · delivered</span></span>
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
      <p className="text-center text-xs text-ink-400">Transactional alerts are always sent. Lock-screen previews hide sensitive case details by default.</p>
    </Screen>
  )
}

/* ================= MESSAGES (customer ↔ vendor, linked to a transaction) ================= */
export function Messages() {
  const nav = useNav()
  const start = useStartChat()
  const { me, threads, vendors, listings, published, vendor, companies } = useApp()
  const biz = me.role === 'business'
  const role = me.role === 'vendor' || biz ? 'vendor' : 'customer'
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [pick, setPick] = useState(false)
  if (!me.loggedIn) return <GuestWall title="Messages" />
  const v = role === 'vendor' ? vendor(me.vendorId) : null
  const all = biz ? threads.business.filter((t) => t.bizId === me.bizId) : role === 'vendor' ? threads.vendor : threads.customer.filter((t) => t.owner === me.name)
  const list = all.filter((t) => (f === 'all' || (f === 'unread' ? t.unread > 0 : f === 'booking' ? t.link?.type === 'booking' : t.link?.type === 'rfq')) && (!q || t.name.toLowerCase().includes(q.toLowerCase())))
  const unread = all.reduce((s, t) => s + t.unread, 0)
  const eligibleVendors = vendors.filter((x) => listings.some((l) => l.vendorId === x.id && published(l)))
  const myCompany = biz ? companies[me.bizId] : null
  return (
    <Screen
      title="Messages"
      back={false}
      pad={false}
      right={role === 'customer' ? <IconBtn label="New enquiry" onClick={() => setPick(true)}><Plus size={21} /></IconBtn> : null}
      overlay={
        <Sheet open={pick} onClose={() => setPick(false)} title="Start an enquiry">
          <p className="text-sm text-ink-500">Choose a vendor. You can message before or after a booking or RFQ.</p>
          <div className="space-y-2">{eligibleVendors.map((x) => (
            <button key={x.id} onClick={() => { setPick(false); start(x.id) }} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ring-1 ring-ink-200 active:bg-ink-50"><Avatar name={x.name} size={40} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{x.name}</span><span className="block text-xs text-ink-500">{cat(x.cat).name} · {x.city}</span></span><ChevronRight size={16} className="text-ink-300" /></button>
          ))}</div>
        </Sheet>
      }
    >
      <div className="space-y-3 bg-white px-4 pb-3 pt-3">
        {biz && <Banner tone="blue" title="Vendor enquiries">Only verified vendors can start a conversation with your company, from the Business network. You can reply here; customers cannot reach this account.</Banner>}
        {role === 'vendor' && ['expired', 'none'].includes(v?.sub.status) && <Banner tone="amber" title="No new public enquiries">Your subscription isn’t active. You can still work on existing conversations and commitments; new enquiries resume after renewal.</Banner>}
        <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder={role === 'customer' ? 'Search vendors' : biz ? 'Search vendors' : 'Search customers'} />
        <Chips scroll={false} value={f} onChange={setF} options={[{ id: 'all', label: `All (${all.length})` }, { id: 'unread', label: `Unread (${unread})` }, { id: 'booking', label: 'Bookings' }, { id: 'rfq', label: 'Quotes' }]} />
      </div>
      {list.length === 0 && <EmptyState icon={MessageCircle} title="No conversations" body={biz ? (myCompany?.status === 'approved' ? 'Vendors who message your company appear here.' : 'Vendors can find and message your company once it is verified.') : role === 'customer' ? 'Tap + or open any vendor or listing to start talking to them.' : 'Customer enquiries and booking chats appear here.'} />}
      <div className="divide-y divide-ink-100 bg-white">
        {list.map((t) => {
          const last = t.msgs[t.msgs.length - 1]
          return (
            <button key={t.id} onClick={() => nav.go('chat', { id: t.id })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-ink-50">
              <Avatar name={t.name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{t.name}</p><span className={cx('shrink-0 text-[11px]', t.unread ? 'font-bold text-brand-700' : 'text-ink-400')}>{last?.at || ''}</span></div>
                <p className="truncate text-xs font-semibold text-brand-700">{t.link?.label}</p>
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
  const { me, threads, setThreads, listings, vendors, toast, contactShare, setContactShare, bookings } = useApp()
  const tk = me.role === 'business' ? 'business' : me.role === 'vendor' ? 'vendor' : 'customer'
  const role = tk === 'customer' ? 'customer' : 'vendor'
  const mine = tk === 'customer' ? threads.customer.filter((t) => t.owner === me.name) : tk === 'business' ? threads.business.filter((t) => t.bizId === me.bizId) : threads.vendor
  const th = mine.find((t) => (params.id ? t.id === params.id : t.vendorId === params.vendorId)) || mine[0]
  const [text, setText] = useState('')
  const [menu, setMenu] = useState(false)
  const [share, setShare] = useState(false)
  const [typing, setTyping] = useState(false)
  const [sent, setSent] = useState(0)
  const end = useRef(null)
  const l = th?.listingId ? listings.find((x) => x.id === th.listingId) : null
  const v = th?.vendorId ? vendors.find((x) => x.id === th.vendorId) : null
  useEffect(() => { if (th) setThreads((t) => ({ ...t, [tk]: t[tk].map((x) => (x.id === th.id ? { ...x, unread: 0 } : x)) })) }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [th?.msgs.length, typing])
  if (!th) return <Screen title="Chat"><EmptyState icon={MessageCircle} title="No conversation" /></Screen>
  const shared = !!contactShare[th.id]
  /* vendor <-> business threads exist on both sides; a message is mirrored so each inbox shows it from its own point of view */
  const other = th.b2b ? (tk === 'vendor' ? 'business' : 'vendor') : null
  const add = (f, t, file, extra) => setThreads((s) => {
    const put = (key, from, bump) => s[key].map((x) => (x.id === th.id ? { ...x, unread: bump ? x.unread + 1 : x.unread, msgs: [...x.msgs, { f: from, t, file, at: 'Now', ...extra }] } : x))
    return { ...s, [tk]: put(tk, f, false), ...(other ? { [other]: put(other, f === 'me' ? 'them' : 'me', f === 'me') } : {}) }
  })
  const reply = () => { setTyping(true); setTimeout(() => { setTyping(false); add('them', role === 'customer' ? 'Thanks for reaching out! Let me check and get back to you shortly.' : 'Noted, thank you. I will confirm shortly.') }, 1500) }
  const send = (m = text) => {
    if (!m.trim()) return
    if (sent >= 5) { toast('Slow down — message rate limit reached. Try again in a minute.', 'warn'); return }
    add('me', m.trim()); setText(''); setSent(sent + 1); reply()
  }
  const attach = () => { add('me', '', role === 'customer' ? 'Site-photo.jpg' : 'Price-list.pdf', { scan: true }); setSent(sent + 1); reply() }
  const quick = tk === 'business' ? ['Happy to help ✅', 'Sharing our rate card', 'Can we schedule a call?'] : role === 'vendor' ? ['Yes, available ✅', 'Sharing a quotation shortly', 'Please share the address', 'Can we talk on a call?'] : ['Is this available?', 'Can you visit for a site survey?', 'Please share your best quote']
  const lk = th.link
  const openLink = () => {
    if (!lk) return
    if (lk.type === 'booking') nav.go(role === 'vendor' ? 'v_booking' : 'c_booking', { id: lk.id })
    else if (lk.type === 'rfq') nav.go(role === 'vendor' ? 'v_rfq' : 'c_rfq', { id: lk.id })
    else if (lk.type === 'enquiry' && l) nav.go('c_listing', { id: l.id })
  }
  return (
    <Screen
      title={th.name}
      subtitle={typing ? 'typing…' : lk?.label}
      right={<IconBtn label="More" onClick={() => setMenu(true)}><Info size={19} /></IconBtn>}
      pad={false}
      bg="bg-ink-100"
      overlay={
        <>
          <Sheet open={menu} onClose={() => setMenu(false)} title={th.name}>
            <div className="space-y-1 pb-2">
              {role === 'customer' && v && <ListRow icon={Store} title="View vendor profile" onClick={() => { setMenu(false); nav.go('c_vendor', { id: v.id }) }} />}
              {role === 'customer' && <ListRow icon={FileText} tone="violet" title="Request a quotation" onClick={() => { setMenu(false); nav.go('c_rfq_new', { cat: v?.cat, vendorId: v?.id }) }} />}
              <ListRow icon={shared ? EyeOff : Eye} tone="sky" title={role === 'customer' ? (shared ? 'Stop sharing my contact' : 'Share my contact details') : 'Request contact details'} subtitle="Phone and email are hidden by default" onClick={() => { setMenu(false); role === 'customer' ? (shared ? (setContactShare({ ...contactShare, [th.id]: false }), toast('Contact hidden again')) : setShare(true)) : (add('me', 'Could you share a contact number for the site visit?'), toast('Request sent — the customer decides')) }} />
              <ListRow icon={ShieldAlert} tone="rose" title="Report this conversation" onClick={() => { setMenu(false); nav.go('c_report', { type: 'message', id: th.id, label: `Conversation with ${th.name}` }) }} last />
            </div>
          </Sheet>
          <Sheet open={share} onClose={() => setShare(false)} title="Share contact details?" footer={<Button full onClick={() => { setContactShare({ ...contactShare, [th.id]: true }); add('me', 'I’ve shared my contact details with you.', null, { system: true }); setShare(false); toast('Contact shared with this vendor only') }}>Share with {th.name}</Button>}>
            <p className="text-sm text-ink-600">Your phone and email will become visible to <b>{th.name}</b> only, for this conversation. You can hide them again any time.</p>
            <Banner tone="blue">Never share OTPs, passwords or card details in chat.</Banner>
          </Sheet>
        </>
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
        {lk && (
          <Card onClick={openLink} className="!p-3"><div className="flex items-center gap-3"><span className={cx('grid size-10 place-items-center rounded-xl', lk.type === 'rfq' ? SOFT.violet : lk.type === 'booking' ? SOFT.sky : SOFT.amber)}>{lk.type === 'rfq' ? <FileText size={18} /> : lk.type === 'booking' ? <CalendarCheck size={18} /> : <MessageCircle size={18} />}</span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Linked to</p><p className="truncate text-sm font-bold">{lk.label}</p></div><ChevronRight size={16} className="text-ink-300" /></div></Card>
        )}
        <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-ink-500"><Lock size={11} />{shared ? 'Customer contact shared with this vendor' : 'Phone & email hidden · only participants can read this chat'}</p>
        <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[11px] font-medium text-ink-500">You pay the vendor directly. Never share OTPs or card details.</p>
        {th.msgs.map((m, i) => m.system ? (
          <p key={i} className="mx-auto w-fit rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-800">{m.t}</p>
        ) : (
          <div key={i} className={cx('flex animate-fade-in', m.f === 'me' ? 'justify-end' : 'justify-start', th.msgs[i - 1] && th.msgs[i - 1].f !== m.f && 'pt-1.5')}>
            <div className={cx('max-w-[78%] rounded-2xl px-3.5 py-2 text-sm', m.f === 'me' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-ink-900 shadow-sm')}>
              {m.file ? <span className="flex items-center gap-2 font-semibold"><FileText size={18} />{m.file}</span> : m.t}
              {m.file && <span className={cx('mt-0.5 block text-[10px]', m.f === 'me' ? 'text-white/70' : 'text-ink-400')}>Scanned for malware ✓</span>}
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

/* ================= REVIEW — only after a recorded booking or accepted quote (spec §12.1, SC-030) ================= */
export function WriteReview({ params }) {
  const nav = useNav()
  const { vendors, bookings, rfqs, reviews, setReviews, reviewed, setReviewed, notify, toast, me, vendor } = useApp()
  const v = vendors.find((x) => x.id === params.vendorId) || vendor('v6')
  const via = bookings.find((b) => (params.via ? b.id === params.via : b.vendorId === v.id) && b.customer === me.name && b.vendorId === v.id && b.state === 'closed')
    || rfqs.find((r) => r.customer === me.name && r.accepted?.vendorId === v.id)
  const ref = via?.id
  const done = ref && reviewed.includes(ref)
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState([])
  const [dims, setDims] = useState({})
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!rating) return setErr('Please select a star rating')
    const flagged = /scam|cheat|idiot|thief/i.test(text)
    setReviews((r) => [{ id: 'r' + Date.now(), by: me.name, rating, text: [text, tags.join(', ')].filter(Boolean).join(' — ') || 'Great!', at: '19 Oct 2026', dims, target: v.id, via: ref.startsWith('RFQ') ? `Accepted quote ${ref}` : `Booking ${ref}`, reply: '', status: flagged ? 'held' : 'published', hold: flagged ? 'Held by automated screening — possible abusive language' : undefined }, ...r])
    setReviewed((r) => [...r, ref])
    notify('vendor', 'New review', `${me.name} rated you ${rating}★`, 'support', ['v_reviews', {}])
    toast(flagged ? 'Thanks — your review is held for a quick human check' : 'Thanks for your review!')
    nav.back()
  }
  return (
    <Screen title="Rate this vendor" footer={via && !done ? <Button full size="lg" onClick={submit}>Submit review</Button> : null}>
      <Card className="!p-3.5"><div className="flex items-center gap-3"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={52} round="rounded-xl" /><div><p className="text-sm font-bold">{v.name}</p><p className="text-xs text-ink-500">{cat(v.cat).name} · {v.city}</p></div></div></Card>
      {!via && <Banner tone="red" title="Not eligible to review yet">Reviews are only accepted from customers with a recorded booking or an accepted quotation with this vendor. The server checks this — it can’t be changed from the app.</Banner>}
      {via && <Banner tone="green" title="Verified transaction">Reviewing {ref.startsWith('RFQ') ? `accepted quote ${ref}` : `booking ${ref}`}.</Banner>}
      {done && <Banner tone="blue" title="Already reviewed">You’ve already reviewed this transaction.</Banner>}
      {via && !done && (
        <>
          <Card className="text-center"><p className="text-sm font-semibold text-ink-600">How was your experience?</p><div className="mt-3 flex justify-center"><Stars value={rating} onChange={(n) => { setRating(n); setErr('') }} size={38} /></div>{err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}</Card>
          <Card className="space-y-3"><p className="text-[13px] font-semibold text-ink-700">Rate each part (optional)</p>{RATING_DIMS.map(([k, l]) => <div key={k} className="flex items-center justify-between"><span className="text-sm text-ink-700">{l}</span><Stars value={dims[k] || 0} onChange={(n) => setDims({ ...dims, [k]: n })} size={22} /></div>)}</Card>
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">What went well?</p><Chips scroll={false} multi value={tags} onChange={setTags} options={['On time', 'Clear communication', 'Fair pricing', 'Professional', 'Quality work']} /></div>
          <Input label="Tell us more (optional)" textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share details to help other customers" />
          <p className="text-xs text-ink-500">Reviews are screened automatically; suspicious ones may be held for a human check. Vendors can reply publicly.</p>
        </>
      )}
    </Screen>
  )
}

/* ================= REPORT / SUPPORT CASE (spec §12.2–12.3) ================= */
export function Report({ params = {} }) {
  const nav = useNav()
  const { cases, setCases, notify, toast, me, vendors } = useApp()
  const kind = params.kind || 'report'
  const type = params.type || 'vendor'
  const label = params.label || (type === 'vendor' ? vendors[0].name : 'General')
  const reasons = kind === 'issue' ? ['Vendor fulfilment failure', 'No-show / disputed arrival', 'Work incomplete or poor quality', 'Direct refund request', 'Other'] : kind === 'appeal' ? ['Account or subscription issue', 'Appeal a restriction', 'Other'] : REPORT_REASONS
  const [reason, setReason] = useState(reasons[0])
  const [desc, setDesc] = useState('')
  const [ev, setEv] = useState([])
  const [err, setErr] = useState('')
  const sev = /fraud|scam|threat|unsafe|harass/i.test(reason) ? 'high' : /Misleading|Fake|Off-platform/i.test(reason) ? 'medium' : 'low'
  const submit = () => {
    if (desc.trim().length < 15) return setErr('Please add a few details (min 15 characters)')
    const id = 'CS-' + (232 + cases.length)
    setCases((c) => [{ id, kind: kind === 'issue' ? 'issue' : 'report', target: { type, id: params.id || 'general', label }, reason, title: desc.slice(0, 60), raisedBy: me.name, against: label, severity: sev, status: 'triage', owner: 'Unassigned', sla: sev === 'high' ? 'Triage within 4 h' : 'Triage within 24 h', slaMin: sev === 'high' ? 240 : 1440, created: '19 Oct 2026', desc, evidence: ev, actions: [{ by: 'System', action: `Case opened — severity ${sev} by rules${type === 'booking' ? '; linked to ' + (params.id || '') : ''}`, at: 'Just now' }] }, ...c])
    if (type === 'booking' && params.id?.startsWith('BKG')) { /* link case to the booking without rewriting its history */ }
    notify('admin', 'New report', `${id} · ${reason}`, 'support', ['ad_case', { id }])
    toast('Report submitted — track it under Support cases')
    nav.replace('c_case', { id })
  }
  return (
    <Screen title={kind === 'issue' ? 'Report an issue' : kind === 'appeal' ? 'Contact support' : 'Report'} subtitle={label} footer={<Button full size="lg" onClick={submit}>Submit</Button>}>
      <Card className="!p-3.5"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">About</p><p className="text-sm font-bold">{label}</p><p className="text-xs capitalize text-ink-500">{type}</p></Card>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Reason</p>
        <div className="space-y-2">{reasons.map((r) => <button key={r} onClick={() => setReason(r)} className={cx('flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold ring-1 ring-inset', reason === r ? 'bg-brand-50 text-brand-800 ring-2 ring-brand-600' : 'bg-white text-ink-700 ring-ink-200')}><span className={cx('grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset', reason === r ? 'bg-brand-600 text-white ring-brand-600' : 'ring-ink-300')}>{reason === r && <Check size={12} strokeWidth={3} />}</span>{r}</button>)}</div>
      </div>
      <Input label="What happened?" required textarea rows={4} value={desc} onChange={(e) => { setDesc(e.target.value); setErr('') }} error={err} />
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Evidence (optional)</p><Evidence items={ev} onAdd={() => setEv([...ev, ['photo-1.jpg', 'screenshot.png', 'invoice.pdf'][ev.length % 3]])} /><div className="mt-2"><Scan>Files are sanitized and malware-scanned; only assigned reviewers can open them.</Scan></div></div>
      <Banner tone={sev === 'high' ? 'amber' : 'blue'} title={`Severity (auto-triage): ${sev}`}>Every report becomes a tracked case with an owner and status. {sev === 'high' ? 'High-severity reports go to Trust & Safety first.' : 'You’ll see updates here.'}</Banner>
    </Screen>
  )
}
export function Cases() {
  const nav = useNav()
  const { cases, me } = useApp()
  const mine = cases.filter((c) => c.raisedBy === me.name)
  return (
    <Screen title="Support cases" right={<IconBtn label="New" onClick={() => nav.go('c_report', { kind: 'issue', type: 'booking', label: 'General' })}><Plus size={21} /></IconBtn>}>
      {mine.length === 0 && <EmptyState icon={HelpCircle} title="No cases" body="If something goes wrong with a booking or a vendor, report it here." action={<Button size="sm" onClick={() => nav.go('c_report', { kind: 'issue', type: 'booking', label: 'General' })}>Report an issue</Button>} />}
      {mine.map((d) => (
        <Card key={d.id} onClick={() => nav.go('c_case', { id: d.id })} className="!p-3.5">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{d.id} · {d.target.label}</span><StatusBadge s={d.status} /></div>
          <p className="mt-1 text-sm font-bold">{d.title}</p><p className="mt-0.5 text-xs text-ink-500">Against {d.against} · {d.created}</p>
          {d.status !== 'closed' && <p className="mt-1.5 text-[11px] font-semibold text-ink-500">{d.sla}</p>}
        </Card>
      ))}
    </Screen>
  )
}
export function CaseDetail({ params }) {
  const nav = useNav()
  const { cases, patchCase, toast } = useApp()
  const d = cases.find((x) => x.id === params.id) || cases[0]
  return (
    <Screen title={d.id} subtitle={d.target.label} right={<StatusBadge s={d.status} className="mr-2" />}>
      <Card><p className="text-base font-bold">{d.title}</p><p className="mt-2 text-sm text-ink-600">{d.desc}</p><div className="mt-3 flex flex-wrap gap-2"><Pill>{d.reason}</Pill><StatusBadge s={d.severity} /></div></Card>
      <Card><KV rows={[['Against', d.against], ['Linked to', `${d.target.type} ${d.target.id}`], ['Owner', d.owner], ['Opened', d.created], ['Next', d.sla]]} /></Card>
      {d.status === 'evidence' && <Banner tone="amber" title="Evidence requested" action={<Button size="sm" onClick={() => { patchCase(d.id, (x) => ({ status: 'triage', evidence: [...x.evidence, 'completion-photo.jpg'], actions: [...x.actions, { by: x.raisedBy, action: 'Uploaded requested evidence', at: 'Just now' }] })); toast('Evidence added') }}>Upload evidence</Button>}>Support asked for more information to continue.</Banner>}
      {d.outcome && <Banner tone="green" title="Outcome">{d.outcome}</Banner>}
      {d.evidence.length > 0 && <Section title="Evidence"><Evidence items={d.evidence} /></Section>}
      <Section title="Activity"><Card><Timeline steps={d.actions.map((a) => ({ label: a.action, at: `${a.by} · ${a.at}`, note: a.reason, done: true }))} /></Card></Section>
      <p className="text-xs text-ink-500">VendorVerse records, facilitates and may enforce platform policy. Refunds are handled directly between you and the vendor — we don’t hold or refund service payments.</p>
    </Screen>
  )
}

/* ================= PROFILE & MODES ================= */
export function Profile() {
  const nav = useNav()
  const { me, setMe, t, lang, setLang, saved, toast, deletion } = useApp()
  if (!me.loggedIn) return <GuestWall title={t('profile')} />
  const toVendor = () => {
    if (me.hasVendor) { setMe({ ...me, role: 'vendor', vendorId: me.vendorId || 'v-me' }); nav.reset('v_dash'); toast('Vendor mode — same identity, vendor permissions come from your organization') }
    else nav.go('v_register')
  }
  return (
    <Screen title={t('profile')} back={false} pad={false} right={<LangButton />}>
      <div className="space-y-4 p-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={me.name} size={60} />
            <div className="min-w-0 flex-1"><p className="text-lg font-extrabold">{me.name}</p><p className="text-sm text-ink-500">+91 98290 ••••1</p><div className="mt-1.5 flex gap-1.5"><Pill>Customer mode</Pill>{me.hasVendor && <Pill>Vendor owner</Pill>}</div></div>
            <Button size="sm" variant="soft" onClick={() => nav.go('c_profile_edit')}>Edit</Button>
          </div>
        </Card>
        {deletion && <Banner tone="amber" title="Deletion requested" action={<Button size="sm" onClick={() => nav.go('c_delete')}>View status</Button>}>We’re verifying your request and legal retention.</Banner>}
        <Card onClick={toVendor} className="!p-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-ink-900 text-white"><Repeat size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{me.hasVendor ? t('switchVendor') : 'List your business'}</p><p className="text-xs text-ink-500">{me.hasVendor ? 'One identity, two modes. Switching is a convenience — vendor actions still need your organization’s ownership.' : 'Become a vendor with this same account.'}</p></div><ChevronRight size={18} className="text-ink-300" /></div></Card>
        <Group>
          <ListRow icon={LayoutDashboard} tone="teal" title="My dashboard" subtitle="Overview and profile completeness" onClick={() => nav.go('c_dash')} />
          <ListRow icon={CalendarCheck} tone="sky" title="My bookings" onClick={() => nav.go('c_activity', { tab: 'bookings' })} />
          <ListRow icon={FileText} tone="violet" title="My quote requests" onClick={() => nav.go('c_activity', { tab: 'rfqs' })} />
          <ListRow icon={Package} tone="violet" title="Purchase orders" onClick={() => nav.go('c_orders')} />
          {me.hasVendor && <ListRow icon={Repeat} tone="blue" title="Buy from other vendors" subtitle="Find suppliers, send bulk RFQs, track purchases" onClick={() => nav.go('v_buy')} />}
          <ListRow icon={Star} tone="amber" title="My reviews" subtitle="Given and pending" onClick={() => nav.go('c_reviews')} />
          <ListRow icon={FileSignature} tone="violet" title="My contracts" onClick={() => nav.go('c_activity', { tab: 'contracts' })} />
          <ListRow icon={FileText} tone="slate" title="Pricing & fees" subtitle="Free for customers — see exactly who pays what" onClick={() => nav.go('fees')} />
          <ListRow icon={WalletIcon} tone="emerald" title="Payments & invoices" right={<PhaseTag p="P2" />} onClick={() => nav.go('c_payments')} />
          <ListRow icon={Heart} tone="rose" title="Favorites & compare" subtitle={`${saved.length} saved vendors`} onClick={() => nav.go('c_saved')} />
          <ListRow icon={Flag} tone="amber" title="Support cases" subtitle="Reports, issues and appeals" onClick={() => nav.go('c_cases')} last />
        </Group>
        <Group>
          <ListRow icon={Globe} tone="sky" title="Region, language & currency" subtitle={`${lang === 'en' ? 'English' : 'हिन्दी'} · country & city`} onClick={() => nav.go('c_location')} />
          <ListRow icon={Globe} tone="sky" title={t('language')} subtitle={lang === 'en' ? 'English' : 'हिन्दी'} onClick={() => { setLang(lang === 'en' ? 'hi' : 'en'); toast(lang === 'en' ? 'भाषा हिन्दी में बदली गई' : 'Language set to English') }} />
          <ListRow icon={Bell} tone="orange" title="Notifications & privacy" subtitle="Alerts, contact sharing, sessions" onClick={() => nav.go('c_settings')} />
          <ListRow icon={UserCog} tone="slate" title="Account status" subtitle="Pending · restricted · suspended · deletion" onClick={() => nav.go('acct_state')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: null, hasVendor: false, name: '' }); nav.reset('welcome') }}>{t('logout')}</Button>
        <p className="text-center text-xs text-ink-400">VendorVerse · Release 1 · ADRS Techno Private Limited</p>
      </div>
    </Screen>
  )
}

function ProfileEditOld() {
  const nav = useNav()
  const { me, setMe, toast } = useApp()
  const [f, setF] = useState({ name: me.name, email: 'aarav.mehta@gmail.com', city: 'Jaipur', address: '24, Vaishali Nagar, Jaipur 302021' })
  const [errs, setErrs] = useState({})
  const save = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email'
    setErrs(e)
    if (Object.keys(e).length) return
    setMe({ ...me, name: f.name }); toast('Profile updated'); nav.back()
  }
  return (
    <Screen title="Edit profile" footer={<Button full size="lg" onClick={save}>Save changes</Button>}>
      <div className="flex justify-center py-2"><div className="relative"><Avatar name={f.name || 'A'} size={84} /><span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-brand-600 text-white ring-4 ring-ink-50"><ImagePlus size={15} /></span></div></div>
      <Input label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} />
      <Input label="Mobile number" value="+91 98290 00001" readOnly hint="Verified · changing it needs OTP re-verification" />
      <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errs.email} />
      <Select label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar']} />
      <Input label="Default address" textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
    </Screen>
  )
}

/* ================= SETTINGS / PRIVACY (spec §10.2, §16) ================= */
export function Settings() {
  const nav = useNav()
  const { me, lang, setLang, prefs, setPrefs, toast } = useApp()
  const [sessions, setSessions] = useState([{ id: 1, d: 'This device · Android app', w: 'Jaipur · Active now' }, { id: 2, d: 'Chrome · Web', w: 'Jaipur · 2 days ago' }])
  const P = (k) => (v) => setPrefs({ ...prefs, [k]: v })
  const required = [['Booking updates', 'Requests, reminders, accept / decline, expiry, changes, completion'], ['Quotation updates', 'New quotes, revisions, validity and acceptance'], ['Account & security', 'Verification, sign-in and access changes'], ['Support & safety', 'Case status, evidence requests, decisions']]
  return (
    <Screen title="Notifications & privacy">
      <Section title="Language"><Segmented value={lang} onChange={setLang} options={[{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिन्दी' }]} /></Section>
      <Section title="Required alerts">
        <Card className="space-y-1">{required.map(([a, b]) => <div key={a} className="flex items-center gap-3 py-1.5"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a}</p><p className="text-xs text-ink-500">{b}</p></div><span className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 text-[11px] font-bold text-ink-500"><Lock size={11} />Always on</span></div>)}</Card>
        <p className="mt-1.5 text-xs text-ink-500">Needed to operate the service, so they are sent even if optional messages are off.</p>
      </Section>
      <Section title="Optional">
        <Card className="space-y-1">
          <Toggle label="Saved-vendor changes" desc="Only meaningful availability or service-area changes" on={prefs.saved} onChange={P('saved')} />
          <Toggle label="New-message alerts" on={prefs.messages} onChange={P('messages')} />
          <Toggle label="Offers & promotions" desc="Requires your consent — off by default" on={prefs.promos} onChange={P('promos')} />
        </Card>
        <Banner tone="blue" title="Channels">In-app is on. Push, email and SMS turn on once providers are ready (CFG-07).</Banner>
      </Section>
      <Section title="Contact privacy"><Card><p className="text-sm text-ink-600">Your phone and email are <b>hidden by default</b>. You decide per conversation whether to share them, and you can hide them again.</p></Card></Section>
      <Section title="Active sessions">
        <Group>{sessions.map((s, i) => <ListRow key={s.id} icon={Smartphone} tone="slate" title={s.d} subtitle={s.w} last={i === sessions.length - 1} right={i > 0 ? <button onClick={() => { setSessions(sessions.filter((x) => x.id !== s.id)); toast('Signed out of device') }} className="text-[13px] font-bold text-red-600">Sign out</button> : <Pill>Current</Pill>} />)}</Group>
      </Section>
      <Section title="Your data">
        <Group>
          <ListRow icon={Download} tone="sky" title="Export my data" subtitle="Sent securely after identity check" onClick={() => toast('Data export requested')} />
          <ListRow icon={Trash2} danger title="Delete my account" subtitle="Verified request · legal retention applies" onClick={() => nav.go('c_delete')} last />
        </Group>
      </Section>
    </Screen>
  )
}

/* ================= DELETE ACCOUNT (SC-040) ================= */
export function DeleteAccount() {
  const nav = useNav()
  const { deletion, setDeletion, me, bookings, toast } = useApp()
  const remote = Boolean(authService.isRemote) // real API: the request is stored on the server (F-ACC-04)
  const [step, setStep] = useState(deletion ? 3 : 0)
  const [code, setCode] = useState('')
  const [reason, setReason] = useState('I no longer use VendorVerse')
  const [pending, setPending] = useState(null) // open server-side deletion request
  const [busy, setBusy] = useState(false)
  const open = bookings.filter((b) => b.customer === me.name && ['requested', 'confirmed', 'in_progress', 'awaiting'].includes(b.state))
  useEffect(() => {
    if (!remote) return
    authService.listDataRequests().then((r) => {
      const found = r.ok && r.requests.find((x) => x.type === 'deletion' && ['requested', 'verified', 'in_progress'].includes(x.status))
      if (found) { setPending(found); setStep(3) }
    })
  }, [remote])
  const requestDeletion = async () => {
    if (!remote) { setDeletion({ at: '19 Oct 2026' }); toast('Deletion requested'); return setStep(3) }
    setBusy(true)
    const r = await authService.requestDataRequest('deletion')
    setBusy(false)
    if (!r.ok) return toast(r.message, 'warn')
    setPending(r.request)
    toast('Deletion requested')
    setStep(3)
  }
  const cancelDeletion = async () => {
    if (!remote) { setDeletion(null); toast('Deletion request cancelled'); return nav.back() }
    setBusy(true)
    const r = await authService.cancelDataRequest(pending.id)
    setBusy(false)
    if (!r.ok) return toast(r.message, 'warn')
    toast('Deletion request cancelled')
    nav.back()
  }
  return (
    <Screen title="Delete account" footer={step < 3 ? <Button full size="lg" variant={step === 2 ? 'danger' : 'primary'} disabled={busy || (step === 1 && !remote && code !== '123456')} onClick={() => { if (step === 2) requestDeletion(); else setStep(step + 1) }}>{step === 0 ? 'Continue' : step === 1 ? 'Verify' : 'Request deletion'}</Button> : <Button full variant="secondary" disabled={busy} onClick={cancelDeletion}>Cancel deletion request</Button>}>
      <Stepper steps={['Review', 'Verify', 'Confirm', 'Status']} current={step} />
      {step === 0 && (<><Banner tone="amber" title="Before you go">Deleting closes your customer account. Records that law or open disputes require us to keep are retained or anonymized — we don’t erase them without review.</Banner>
        {open.length > 0 && <Banner tone="red" title={`${open.length} open booking${open.length > 1 ? 's' : ''}`}>Complete or cancel them first, or they’ll be handled as part of the request.</Banner>}
        <Select label="Why are you leaving?" value={reason} onChange={(e) => setReason(e.target.value)} options={['I no longer use VendorVerse', 'Privacy concerns', 'Too many notifications', 'Other']} /></>)}
      {step === 1 && (remote
        ? <Banner tone="amber" title="Identity check not automated yet">Your request is recorded and reviewed; your account stays active until it is processed. You can cancel it while it is pending.</Banner>
        : <><p className="text-sm text-ink-600">We’ll confirm it’s you. Enter the code sent to +91 98290 ••••1.</p><Input label="One-time code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} hint="Demo code: 123456" /></>)}
      {step === 2 && <Card><p className="mb-2 text-sm font-bold">What happens</p>{['Your profile, favorites and saved preferences are removed or anonymized', 'Booking and quotation records needed by vendors or the law are kept without personal identifiers where possible', 'Support and audit evidence is retained for the legally required period', 'You’ll get status updates by email and in-app until it completes'].map((x) => <p key={x} className="flex gap-2 py-1 text-[13px] text-ink-700"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />{x}</p>)}</Card>}
      {step === 3 && (<><Card className="text-center !p-6"><div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-50 text-amber-600"><Hourglass size={30} /></div><h2 className="mt-3 text-lg font-extrabold">Deletion requested</h2><p className="mt-1 text-sm text-ink-600">Status: identity verified · retention check in progress.</p></Card><Card><Timeline steps={[{ label: 'Request received', at: '19 Oct 2026', done: true }, { label: 'Identity verified', at: '19 Oct 2026', done: true }, { label: 'Legal retention review', current: true, note: 'Records we must keep are retained or anonymized' }, { label: 'Deletion / anonymization complete' }]} /></Card></>)}
    </Screen>
  )
}

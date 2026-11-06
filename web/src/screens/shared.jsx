import { Bell, Heart, MapPin, ShieldCheck, ShieldAlert, Package, CalendarDays, Clock } from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { remoteInbox, useUnreadCount } from '../useInbox.js'
import { Thumb, Rating, Badge, StatusBadge, IconBtn, Card, Avatar, cx, fmt, Pill } from '../ui.jsx'
import { cat } from '../data.jsx'

export const vendorKind = (v) => v?.supplierType === 'business' || ['v-me', 'v-global-2'].includes(v?.id) ? 'Supplier' : cat(v?.cat).type === 'service' ? 'Service provider' : 'Vendor'

export function useGate() {
  const { me, toast } = useApp()
  const nav = useNav()
  return (reason = 'Please log in to continue') => {
    if (me.loggedIn) return true
    toast(reason, 'warn')
    nav.go('login')
    return false
  }
}

/* open (or create) the one conversation with a vendor, optionally about a listing */
export function useStartChat() {
  const { threads, setThreads, vendors, listings, me, toast } = useApp()
  const nav = useNav()
  return (vendorId, listingId) => {
    if (!me.loggedIn) { toast('Log in to message the vendor', 'warn'); nav.go('login'); return }
    const v = vendors.find((x) => x.id === vendorId)
    const l = listingId && listings.find((x) => x.id === listingId)
    const ex = threads.customer.find((t) => t.vendorId === vendorId)
    if (ex) {
      if (l && ex.listingId !== l.id) setThreads((t) => ({ ...t, customer: t.customer.map((x) => (x.id === ex.id ? { ...x, listingId: l.id, ctx: 'Enquiry · ' + l.title.slice(0, 26) } : x)) }))
      nav.go('chat', { id: ex.id })
      return
    }
    const id = 't' + Date.now()
    setThreads((t) => ({ ...t, customer: [{ id, name: v.name, vendorId, listingId: l?.id, ctx: l ? 'Enquiry · ' + l.title.slice(0, 26) : 'Enquiry', unread: 0, msgs: [] }, ...t.customer] }))
    nav.go('chat', { id })
  }
}

export function VerifiedBadge({ id, className }) {
  const { isVerified } = useApp()
  return isVerified(id) ? (
    <Badge tone="green" className={className}><ShieldCheck size={11} />Verified</Badge>
  ) : (
    <Badge tone="gray" className={className}><ShieldAlert size={11} />Unverified</Badge>
  )
}

export function NotifBell({ role }) {
  const { notifs } = useApp()
  const nav = useNav()
  const remoteCount = useUnreadCount(role)
  const n = remoteInbox ? remoteCount : notifs[role]?.filter((x) => !x.read).length || 0
  return (
    <IconBtn label="Notifications" onClick={() => nav.go('notifications')}>
      <Bell size={21} />
      {n > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-[17px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[17px] text-white ring-2 ring-white">{n}</span>}
    </IconBtn>
  )
}

export const listingDisc = (l) => (l.mrp ? Math.round((1 - l.price / l.mrp) * 100) : 0)
const listingCover = (l) => l.cover || ({ elec: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80', build: 'https://images.unsplash.com/photo-1503387762-592­de9c5b7c4?auto=format&fit=crop&w=900&q=80', office: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80', print: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=80', home: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80', clean: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', event: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80' }[l.cat] || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80')

export function ListingCard({ l, onClick, showVendor = true }) {
  const { vendor, saved, toggleSaved, toast } = useApp()
  const nav = useNav()
  const v = vendor(l.vendorId)
  const c = cat(l.cat)
  const isSaved = saved.includes(l.id)
  const out = l.type === 'product' && l.stock === 0
  return (
    <Card onClick={onClick || (() => nav.go('c_listing', { id: l.id }))} className="!p-0 min-w-0 overflow-hidden">
      <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,45,55,.42), rgba(8,45,55,.04)), url(${listingCover(l)})` }} />
      <div className="listing-card-body flex min-w-0 gap-3 p-4">
        <div className="mt-0 grid size-16 shrink-0 place-items-center rounded-2xl border-4 border-white bg-white shadow"><Thumb tone={l.tone} icon={c.icon} size={54} round="rounded-xl" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1"><div className="mb-1"><Badge tone={l.type === 'service' ? 'sky' : 'teal'}>{l.type === 'service' ? 'Service' : 'Product'}</Badge></div><p className="line-clamp-2 text-sm font-bold leading-snug text-ink-900">{l.title}</p></div>
            <span
              role="button"
              aria-label="Save"
              onClick={(e) => { e.stopPropagation(); toggleSaved(l.id); toast(isSaved ? 'Removed from saved' : 'Saved for later') }}
              className="-mr-1 -mt-0.5 p-1"
            >
              <Heart size={18} className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-ink-300'} />
            </span>
          </div>
          {showVendor && v && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
              {v.name}{v.status === 'approved' && <ShieldCheck size={12} className="shrink-0 text-emerald-600" />}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-base font-extrabold text-ink-900">{fmt(l.price)}</span>
            {l.mrp && <span className="text-xs text-ink-400 line-through">{fmt(l.mrp)}</span>}
            {l.mrp && <span className="text-xs font-bold text-emerald-600">{listingDisc(l)}% off</span>}
            <span className="text-xs text-ink-400">/{l.unit} · indicative</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            {l.rating > 0 && <Rating value={l.rating} count={l.reviews} />}
            {l.type === 'service' ? <Pill icon={Clock}>{l.duration} min</Pill> : <Pill icon={Package}>Ships in {l.lead}d</Pill>}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function VendorRow({ v, onClick }) {
  const nav = useNav()
  const c = cat(v.cat)
  const cover = v.cover || ({ elec: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80', build: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80', office: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80', clean: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', home: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80', event: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80' }[v.cat] || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80')
  return (
    <Card onClick={onClick || (() => nav.go('c_vendor', { id: v.id }))} className="!p-0 min-w-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-28 w-full bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,45,55,.45), rgba(8,45,55,.05)), url(${cover})` }} />
      <div className="vendor-card-body flex min-w-0 items-center gap-3 p-4">
        <div className="mt-0 grid size-14 shrink-0 place-items-center rounded-2xl border-4 border-white bg-white shadow"><Avatar name={v.name} size={42} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold">{v.name}</p><Badge tone={vendorKind(v) === 'Supplier' ? 'teal' : vendorKind(v) === 'Service provider' ? 'sky' : 'gray'}>{vendorKind(v)}</Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} />{v.city} · {c.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <VerifiedBadge id={v.id} />
            {v.rating > 0 && <Rating value={v.rating} count={v.reviews} />}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function OrderCard({ o, onClick, role = 'customer' }) {
  const { listings, vendor } = useApp()
  const l = listings.find((x) => x.id === o.listingId)
  if (!l) return null
  const c = cat(l.cat)
  return (
    <Card onClick={onClick} className="!p-3.5">
      <div className="flex items-start gap-3">
        <Thumb tone={l.tone} icon={c.icon} size={52} round="rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-500">{o.id}</span>
            <StatusBadge s={o.status} />
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm font-bold">{l.title}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {role === 'vendor' ? o.customer : vendor(o.vendorId)?.name} · Qty {o.qty} · {o.date}
          </p>
        </div>
      </div>
    </Card>
  )
}

export function BookingCard({ b, onClick, role = 'customer' }) {
  const { listings, vendor } = useApp()
  const l = listings.find((x) => x.id === b.listingId)
  if (!l) return null
  const c = cat(l.cat)
  return (
    <Card onClick={onClick} className="!p-3.5">
      <div className="flex items-start gap-3">
        <Thumb tone={l.tone} icon={c.icon} size={52} round="rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-500">{b.id}</span>
            <StatusBadge s={b.status} />
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm font-bold">{l.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
            <CalendarDays size={12} />{b.date} · {b.slot} · {role === 'vendor' ? b.customer : vendor(b.vendorId)?.name}
          </p>
        </div>
      </div>
    </Card>
  )
}

/* Fixed reference day keeps seeded booking labels deterministic. */
export const TODAY = new Date(2026, 9, 19)
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function nextDays(n = 7, from = 1) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 9, 19 + from + i)
    return { idx: i, dow: D[d.getDay()], day: d.getDate(), label: `${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} 2026` }
  })
}

export function orderBreakdown(o, l, settings, calcPrice) {
  if (o.breakdown) return o.breakdown
  return calcPrice(l.price * o.qty, settings, 'product')
}

export function Tag({ children, tone = 'bg-ink-100 text-ink-600' }) {
  return <span className={cx('rounded-md px-2 py-0.5 text-[11px] font-semibold', tone)}>{children}</span>
}


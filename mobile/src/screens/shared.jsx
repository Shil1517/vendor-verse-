import { Languages, Bell, Heart, MapPin, ShieldCheck, ShieldAlert, CalendarDays, Clock, Zap, FileText, CalendarCheck, BadgeAlert } from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { remoteInbox, useUnreadCount } from '../useInbox.js'
import { Thumb, Rating, Badge, StatusBadge, IconBtn, Card, cx, Pill, Missing, SponsoredTag, Countdown } from '../ui.jsx'
import { cat, serves, MODE_LABEL } from '../data.jsx'
import { KIND_LABEL, country } from '../globaldata.jsx'

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

/* Open (or create) the one conversation with a vendor, linked to a booking / RFQ / enquiry (spec §10.1). */
export function useStartChat() {
  const { threads, setThreads, vendors, listings, me, toast } = useApp()
  const nav = useNav()
  return (vendorId, listingId, link) => {
    if (!me.loggedIn) { toast('Log in to message the vendor', 'warn'); nav.go('login'); return }
    const v = vendors.find((x) => x.id === vendorId)
    const l = listingId && listings.find((x) => x.id === listingId)
    const ex = threads.customer.find((t) => t.vendorId === vendorId && t.owner === me.name && (!link || t.link?.id === link.id))
    if (ex) { nav.go('chat', { id: ex.id }); return }
    const id = 't' + Date.now()
    const lk = link || { type: 'enquiry', id: l?.id || 'general', label: l ? 'Enquiry · ' + l.title.slice(0, 28) : 'Enquiry' }
    setThreads((t) => ({ ...t, customer: [{ id, owner: me.name, name: v.name, vendorId, link: lk, listingId: l?.id, unread: 0, contact: false, msgs: [] }, ...t.customer] }))
    nav.go('chat', { id })
  }
}

/* A vendor reaches a Business account by message only: one shared thread, mirrored into the business inbox */
export function useBizChat() {
  const { threads, setThreads, me, vendor, toast } = useApp()
  const nav = useNav()
  return (biz) => {
    if (me.role !== 'vendor') { toast('Only vendors can message Business accounts', 'warn'); return }
    const ex = threads.vendor.find((t) => t.bizId === biz.id)
    if (ex) { nav.go('chat', { id: ex.id }); return }
    const id = 'bz' + Date.now()
    const link = { type: 'network', id: biz.id, label: 'Business network enquiry' }
    const base = { id, b2b: true, bizId: biz.id, link, unread: 0, contact: false, msgs: [] }
    setThreads((t) => ({
      ...t,
      vendor: [{ ...base, name: biz.brand || biz.legal }, ...t.vendor],
      business: [{ ...base, name: vendor(me.vendorId)?.name || me.name, vendorId: me.vendorId }, ...t.business],
    }))
    nav.go('chat', { id })
  }
}

/* Verification is shown accurately and is never implied by a paid plan (spec §7.4). */
export function VerifiedBadge({ id, className, compact }) {
  const { vendor, isVerified } = useApp()
  const v = vendor(id)
  if (isVerified(id)) return <Badge tone="green" className={className}><ShieldCheck size={11} />{compact ? `Verified · T${v.tier}` : `Verified by VendorVerse · Tier ${v.tier}`}</Badge>
  if (v?.ver === 'expired') return <Badge tone="amber" className={className}><ShieldAlert size={11} />Credential expired</Badge>
  if (v && !cat(v.cat).verifyReq) return <Badge tone="gray" className={className}>Verification not required</Badge>
  return <Badge tone="gray" className={className}><ShieldAlert size={11} />Not verified</Badge>
}

/* Language switch for profile / more headers — toggles English ⇄ Hindi */
export function LangButton() {
  const { lang, setLang, toast } = useApp()
  return (
    <button type="button" aria-label="Change language" onClick={() => { setLang(lang === 'en' ? 'hi' : 'en'); toast(lang === 'en' ? 'भाषा: हिन्दी' : 'Language: English') }} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 active:scale-95">
      <Languages size={18} className="text-brand-600" />{lang === 'en' ? 'हि' : 'EN'}
    </button>
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

export const ModeChip = ({ mode }) => (
  <span className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
    {mode === 'rfq' ? <FileText size={10} /> : mode === 'both' ? <Zap size={10} /> : <CalendarCheck size={10} />}{MODE_LABEL[mode]}
  </span>
)

export function RatingOrNew({ value, count }) {
  return value > 0 ? <Rating value={value} count={count} /> : <Missing>Not yet rated</Missing>
}

export function Coverage({ l, loc, compact }) {
  const ok = serves(l, loc)
  if (l.scope === 'global') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700"><MapPin size={12} />Ships worldwide</span>
  if (l.scope === 'country' && ok) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><MapPin size={12} />Serves {country((l.countries || ['IN'])[0]).name === country(loc.country).name ? 'your country' : 'your country'}</span>
  return ok
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><MapPin size={12} />{compact ? 'Serves your area' : `Serves ${loc.city} ${loc.pin}`}</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><BadgeAlert size={12} />{compact ? 'Outside your area' : `Does not serve ${loc.pin} — serves ${l.areas.join(', ')}`}</span>
}

export function ListingCard({ l, onClick, showVendor = true, outside }) {
  const { vendor, saved, toggleSaved, toast, loc, isVerified } = useApp()
  const nav = useNav()
  const v = vendor(l.vendorId)
  const c = cat(l.cat)
  const isSaved = saved.includes(l.vendorId)
  return (
    <Card onClick={onClick || (() => nav.go(l.type === 'product' ? 'c_product' : 'c_listing', { id: l.id }))} className={cx('!p-3', outside && 'ring-amber-300')}>
      <div className="flex gap-3">
        <Thumb tone={l.tone} icon={c.icon} size={84} round="rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              {l.sponsored && <SponsoredTag className="mb-1" />}
              <p className="line-clamp-2 text-sm font-bold leading-snug text-ink-900">{l.title}</p>
            </div>
            <span role="button" aria-label="Save vendor" onClick={(e) => { e.stopPropagation(); toggleSaved(l.vendorId); toast(isSaved ? 'Removed from favorites' : 'Saved — the vendor is not notified') }} className="-mr-1 -mt-0.5 p-1">
              <Heart size={18} className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-ink-300'} />
            </span>
          </div>
          {showVendor && v && <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><span className="truncate">{v.name}</span>{isVerified(l.vendorId) && <ShieldCheck size={13} aria-label="Verified" className="shrink-0 text-brand-600" />}</p>}
          <div className="mt-1"><RatingOrNew value={l.rating} /></div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><Coverage l={l} loc={loc} compact />{l.instant && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">⚡ Instant</span>}</div>
          {(v?.kind && v.kind !== 'service') && <p className="mt-1.5 text-[11px] font-semibold text-ink-500">{country(v.country).flag} {KIND_LABEL[v.kind]}{l.trade?.moq ? ` · MOQ ${l.trade.moq.toLocaleString('en-IN')} ${l.trade.unit}` : ''}</p>}
        </div>
      </div>
    </Card>
  )
}

export function VendorRow({ v, onClick }) {
  const nav = useNav()
  const c = cat(v.cat)
  return (
    <Card onClick={onClick || (() => nav.go('c_vendor', { id: v.id }))} className="!p-3">
      <div className="flex items-center gap-3">
        <Thumb tone={v.tone} icon={c.icon} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{v.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} />{v.city} · {c.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <VerifiedBadge id={v.id} compact />
            {v.rating > 0 ? <Rating value={v.rating} count={v.reviews} /> : <Missing>Not yet rated</Missing>}
          </div>
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
            <StatusBadge s={b.state} />
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm font-bold">{l.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500"><CalendarDays size={12} />{b.date} · {b.slot} · {role === 'vendor' ? b.customer : vendor(b.vendorId)?.name}</p>
          {b.state === 'requested' && b.leftMin != null && <div className="mt-1.5 flex items-center gap-2"><Countdown mins={b.leftMin} label="to respond" /></div>}
          {b.state === 'awaiting' && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700"><Clock size={12} />{b.leftDays} days left to confirm</p>}
          {b.mod?.state === 'pending' && <p className="mt-1.5 text-xs font-semibold text-violet-700">Change requested — {b.mod.date}, {b.mod.slot}</p>}
          {b.caseId && <p className="mt-1.5 text-xs font-semibold text-violet-700">Support case {b.caseId} linked</p>}
        </div>
      </div>
    </Card>
  )
}

export function Tag({ children, tone = 'bg-ink-100 text-ink-600' }) {
  return <span className={cx('rounded-md px-2 py-0.5 text-[11px] font-semibold', tone)}>{children}</span>
}

/* booking history → timeline labels */
export const BK_LABEL = { requested: 'Request sent', confirmed: 'Confirmed by vendor', declined: 'Declined by vendor', expired: 'Request expired', in_progress: 'Service started', awaiting: 'Marked complete', closed: 'Closed', cancelled: 'Cancelled', mod: 'Modification requested', mod_ok: 'Modification accepted', mod_no: 'Modification declined', case: 'Support case linked' }
export const bkTimeline = (b) => b.history.map((h, i) => ({ label: BK_LABEL[h.s] || h.s, at: [h.at, h.by].filter(Boolean).join(' · '), note: h.note, done: true, current: false }))

export function useMyBookings(role) {
  const { bookings, me } = useApp()
  return role === 'vendor' ? bookings.filter((b) => b.vendorId === me.vendorId) : bookings.filter((b) => b.customer === me.name)
}

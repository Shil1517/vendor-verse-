import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck, Package, Users, Store, FileText, UserPlus, AlertTriangle, ChevronRight, Check, X, Lock, Gavel, Eye, Ban, Flag, Star, MessageSquare, Siren, CreditCard, Trash2, Megaphone, Clock, Copy, Search,
  CircleAlert, Hourglass, UserCheck, ScrollText, FileWarning, Scale, ShieldAlert, BadgeCheck, Undo2, Building2,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { CATS, cat, REPORT, ME } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Banner, EmptyState, Stat, KV, cx, Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar, DocTile,
  BarChart, SOFT, GateRow, ReasonSheet, Evidence, Missing, Countdown, Spark, Price,
} from '../ui.jsx'
import { NotifBell, VerifiedBadge } from './shared.jsx'
import { Logo } from './auth.jsx'
import { TIERS } from '../globaldata.jsx'

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

/* ================= DASHBOARD ================= */
export function AdminDashboard() {
  const nav = useNav()
  const { vendors, listings, cases, appeals, reviews, users, me, companies } = useApp()
  const pendC = Object.values(companies).filter((c) => ['submitted', 'more_info'].includes(c.status)).length
  const pendV = vendors.filter((v) => ['submitted', 'more_info'].includes(v.ver)).length
  const pendL = listings.filter((l) => l.review === 'pending').length
  const risk = cases.filter((c) => c.kind === 'report' && !['closed', 'decided'].includes(c.status)).length
  const supp = cases.filter((c) => c.kind === 'issue' && c.status !== 'closed').length
  const sub = vendors.filter((v) => ['grace', 'expired'].includes(v.sub.status)).length
  const rev = reviews.filter((r) => r.status === 'held').length + appeals.filter((a) => a.status === 'open').length
  const del = users.filter((u) => u.status === 'deletion').length
  const sla = cases.filter((c) => c.status !== 'closed' && c.slaMin > 0 && c.slaMin < 240)
  return (
    <Screen headerless pad={false}>
      <div className="bg-gradient-to-b from-ink-900 to-ink-800 px-4 pb-14 pt-3 text-white">
        <div className="mb-3 flex items-center gap-2"><Logo size={28} light /><span className="text-sm font-extrabold tracking-tight">VendorVerse</span></div>
        <div className="flex items-center justify-between"><div><p className="text-xs text-white/60">Super Admin · MFA verified · session 12 min</p><h1 className="text-xl font-extrabold">Operations overview</h1></div><div className="[&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:ring-ink-900"><NotifBell role="admin" /></div></div>
        <p className="mt-1 text-xs text-white/60">19 Oct 2026 · All locations</p>
      </div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Verification queue" value={pendV} icon={ShieldCheck} tone="amber" onClick={() => nav.go('ad_vendors')} />
          <Stat label="Listings to review" value={pendL} icon={Package} tone="indigo" onClick={() => nav.go('ad_listings')} />
          <Stat label="High-risk reports" value={risk} icon={Siren} tone="rose" onClick={() => nav.go('ad_cases', { tab: 'trust' })} />
          <Stat label="Subscriptions at risk" value={sub} icon={CreditCard} tone="violet" onClick={() => nav.go('ad_subs')} />
          <Stat label="Company verification" value={pendC} icon={Building2} tone="teal" onClick={() => nav.go('ad_company')} />
        </div>
        {sla.length > 0 && <Banner tone="red" title="SLA at risk" action={<Button size="sm" onClick={() => nav.go('ad_case', { id: sla[0].id })}>Open {sla[0].id}</Button>}>{sla.length} case{sla.length > 1 ? 's' : ''} are close to their response target.</Banner>}
        {cases.some((c) => c.emergency) && <Banner tone="amber" title="Emergency restriction awaiting review" action={<Button size="sm" onClick={() => nav.go('ad_case', { id: 'CS-231' })}>Review CS-231</Button>}>Time-bound restrictions must be reviewed after action. Dev Auto Works is restricted until review.</Banner>}
        <Card><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Booking requests per week</p><p className="text-xs text-ink-500">Platform-wide</p></div><Badge tone="green">+15%</Badge></div><div className="mt-3"><BarChart data={REPORT.weeks.map((w, i) => ({ label: w, value: REPORT.bookings[i] }))} height={90} /></div></Card>
        <Section title="Queues" action="All queues" onAction={() => nav.go('ad_approvals')}>
          <Group>
            <ListRow icon={Star} tone="amber" title="Review moderation & appeals" subtitle={`${rev} waiting`} right={<Badge tone="amber">{rev}</Badge>} onClick={() => nav.go('ad_reviews')} />
            <ListRow icon={MessageSquare} tone="sky" title="Support cases" subtitle={`${supp} open`} right={<Badge tone="blue">{supp}</Badge>} onClick={() => nav.go('ad_cases', { tab: 'support' })} />
            <ListRow icon={Trash2} tone="slate" title="Deletion requests" subtitle={`${del} awaiting identity & retention check`} right={<Badge tone="gray">{del}</Badge>} onClick={() => nav.go('ad_users', { f: 'deletion' })} last />
          </Group>
        </Section>
      </div>
    </Screen>
  )
}

export function Approvals() {
  const nav = useNav()
  const { vendors, listings, cases, appeals, reviews, users, campaigns, companies } = useApp()
  const cards = [
    ['Vendor verification', 'Documents, expiry, resubmission', ShieldCheck, 'amber', vendors.filter((v) => ['submitted', 'more_info'].includes(v.ver) || v.docs.some((d) => d.status === 'expired')).length, 'ad_vendors', {}],
    ['Company verification', 'Business accounts: registration, tax ID, owner eligibility', Building2, 'teal', Object.values(companies).filter((c) => ['submitted', 'more_info'].includes(c.status)).length, 'ad_company', {}],
    ['Listing review', 'Reason codes, duplicate flags, change requests', Package, 'indigo', listings.filter((l) => l.review === 'pending').length, 'ad_listings', {}],
    ['High-risk reports', 'Severity, evidence, escalation', Siren, 'rose', cases.filter((c) => c.kind === 'report' && c.status !== 'closed').length, 'ad_cases', { tab: 'trust' }],
    ['Review moderation & appeals', 'Held, reported and appealed content', Star, 'amber', reviews.filter((r) => r.status === 'held').length + appeals.filter((a) => a.status === 'open').length, 'ad_reviews', {}],
    ['Subscription monitoring', 'Failures, grace, expiry, billing investigation', CreditCard, 'violet', vendors.filter((v) => ['grace', 'expired'].includes(v.sub.status)).length, 'ad_subs', {}],
    ['Support cases', 'Assignment, SLA, notes, resolution', MessageSquare, 'sky', cases.filter((c) => c.kind === 'issue' && c.status !== 'closed').length, 'ad_cases', { tab: 'support' }],
    ['Sponsored campaigns', 'Audit dates and delivery', Megaphone, 'teal', campaigns.filter((c) => c.status === 'blocked').length, 'ad_sponsored', {}],
    ['Deletion requests', 'Identity + legal retention', Trash2, 'slate', users.filter((u) => u.status === 'deletion').length, 'ad_users', { f: 'deletion' }],
  ]
  return (
    <Screen title="Operational queues" back={false}>
      {cards.map(([t, s, I, tone, n, to, p]) => (
        <Card key={t} onClick={() => nav.go(to, p)} className="!p-4"><div className="flex items-center gap-3.5"><span className={cx('grid size-12 place-items-center rounded-2xl', SOFT[tone])}><I size={24} /></span><div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{t}</p><p className="text-xs text-ink-500">{s}</p></div>{n > 0 ? <span className="grid min-w-7 place-items-center rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">{n}</span> : <Check size={18} className="text-emerald-500" />}<ChevronRight size={18} className="text-ink-300" /></div></Card>
      ))}
    </Screen>
  )
}

/* ================= VENDOR VERIFICATION QUEUE ================= */
function RemoteAdminVerificationQueue() {
  const [status, setStatus] = useState('submitted')
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [reasons, setReasons] = useState({})
  const [evidenceLinks, setEvidenceLinks] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    authService.listVerificationQueue({ status: status || undefined, limit: 50 }).then((result) => {
      if (!active) return
      if (!result.ok) setError(result.message)
      else { setItems(result.verifications); setNextCursor(result.nextCursor); setReasons({}); setEvidenceLinks({}) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status])

  const loadNext = async () => {
    if (!nextCursor || busy) return
    setBusy(true); setError('')
    const result = await authService.listVerificationQueue({ status: status || undefined, limit: 50, cursor: nextCursor })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    setItems((current) => [...current, ...result.verifications])
    setNextCursor(result.nextCursor)
  }

  const decide = async (item, decision) => {
    const reason = (reasons[item.id] || '').trim()
    if (!reason) { setError('Enter a review reason before recording a decision.'); return }
    setBusy(true); setError('')
    const result = await authService.reviewVerification(item.id, { status: decision, reason })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    setItems((current) => current.map((entry) => entry.id === item.id ? result.verification : entry))
  }

  const openEvidence = async (item, evidence) => {
    setBusy(true); setError('')
    const result = await authService.getVerificationEvidenceUrl(item.id, evidence.fileId)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    setEvidenceLinks((current) => ({ ...current, [evidence.fileId]: result.url }))
  }

  return (
    <Screen title="Vendor verification">
      <Banner tone="blue">Remote reviewer queue. Each decision requires a reason and is audited.</Banner>
      <Chips scroll={false} value={status} onChange={setStatus} options={[{ id: 'submitted', label: 'Submitted' }, { id: 'in_review', label: 'In review' }, { id: 'info_requested', label: 'Info requested' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }, { id: '', label: 'All' }]} />
      {error && <Banner tone="red" title="Verification request failed">{error}</Banner>}
      {loading && <p className="text-sm text-ink-500">Loading review queue…</p>}
      <div className="space-y-3">{items.map((item) => (
        <Card key={item.id} className="space-y-3 !p-3.5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold">{item.level} · Vendor {item.vendorId}</p><p className="mt-1 text-xs text-ink-500">Submitted {new Date(item.submittedAt).toLocaleString()}</p></div><StatusBadge s={item.status} /></div>
          <div className="space-y-1.5">{item.evidence.map((evidence) => <div key={evidence.documentId} className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 p-2"><p className="truncate text-xs font-semibold">{evidence.documentType}</p>{evidenceLinks[evidence.fileId] ? <a href={evidenceLinks[evidence.fileId]} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-bold text-brand-700">Open file</a> : <Button size="sm" variant="secondary" disabled={busy} onClick={() => openEvidence(item, evidence)}>Get file</Button>}</div>)}</div>
          {['submitted', 'in_review'].includes(item.status) && <>
            <Input textarea rows={2} label="Review reason" value={reasons[item.id] || ''} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide(item, 'in_review')}>Start review</Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide(item, 'info_requested')}>Request info</Button>
              <Button size="sm" variant="dangerSoft" disabled={busy} onClick={() => decide(item, 'rejected')}>Reject</Button>
              <Button size="sm" disabled={busy} onClick={() => decide(item, 'approved')}>Approve</Button>
            </div>
          </>}
          {item.reason && <p className="text-sm text-ink-600">{item.reason}</p>}
        </Card>
      ))}</div>
      {!loading && !items.length && <EmptyState icon={ShieldCheck} title="Queue is clear" />}
      {nextCursor && <Button full variant="secondary" disabled={busy || loading} onClick={loadNext}>Load more</Button>}
    </Screen>
  )
}

export function AdminVendors({ params = {} }) {
  const nav = useNav()
  const { vendors } = useApp()
  const [f, setF] = useState(params.f || 'queue')
  if (authService.isRemote) return <RemoteAdminVerificationQueue />
  const expiring = (v) => v.docs.some((d) => d.status === 'expired')
  const list = vendors.filter((v) => (f === 'queue' ? ['submitted', 'more_info'].includes(v.ver) : f === 'expired' ? expiring(v) || v.ver === 'expired' : f === 'rejected' ? ['rejected', 'revoked'].includes(v.ver) : true))
  const cnt = (fn) => vendors.filter(fn).length
  return (
    <Screen title="Vendor verification">
      <Chips scroll={false} value={f} onChange={setF} options={[{ id: 'queue', label: `Queue (${cnt((v) => ['submitted', 'more_info'].includes(v.ver))})` }, { id: 'expired', label: `Expired (${cnt((v) => v.docs.some((d) => d.status === 'expired') || v.ver === 'expired')})` }, { id: 'rejected', label: 'Rejected' }, { id: 'all', label: 'All' }]} />
      <div className="space-y-2.5">
        {list.map((v) => (
          <Card key={v.id} onClick={() => nav.go('ad_vendor', { id: v.id })} className="!p-3.5">
            <div className="flex items-start gap-3"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{v.name}</p><StatusBadge s={v.ver} /></div><p className="mt-0.5 text-xs text-ink-500">{cat(v.cat).name} · {v.city} · {v.history[v.history.length - 1].at}</p>{v.agent && <p className="mt-1 text-[11px] font-semibold text-violet-700">Onboarded by agent {v.agent}</p>}{v.docs.some((d) => d.status === 'expired') && <p className="mt-1 text-[11px] font-bold text-red-600">Credential expired — listings hidden</p>}</div></div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={ShieldCheck} title="Queue is clear" />}
      </div>
    </Screen>
  )
}

export function AdminVendor({ params }) {
  const nav = useNav()
  const { vendors, patchVendor, notify, toast, addAudit, me, listings, published, stamp } = useApp()
  const v = vendors.find((x) => x.id === (params.id || 'v8'))
  const [sheet, setSheet] = useState(null)
  const [asOwner, setAsOwner] = useState(false)
  const [tier, setTier] = useState(Math.max(2, v.tier || 2))
  const c = cat(v.cat)
  const myListings = listings.filter((l) => l.vendorId === v.id)
  const decide = (kind, reason) => {
    const map = { approve: ['approved', 'Approved vendor verification'], reject: ['rejected', 'Rejected vendor verification'], info: ['more_info', 'Requested more information'], revoke: ['revoked', 'Revoked verification approval'] }
    const [ver, label] = map[kind]
    patchVendor(v.id, (x) => ({ ver, tier: kind === 'approve' ? tier : kind === 'revoke' ? 1 : x.tier, acct: kind === 'approve' ? 'active' : kind === 'revoke' ? 'restricted' : x.acct, docs: x.docs.map((d) => (kind === 'approve' ? { ...d, status: 'verified', note: undefined, expires: d.expires || '31 Mar 2028' } : kind === 'info' && d.status === 'pending' ? { ...d, status: 'rejected', note: reason } : d)), history: [...x.history, { s: ver, at: stamp(), by: me.name || ME.admin, note: reason }] }))
    addAudit(label, v.name, 'verification', reason, me.name || ME.admin)
    notify('vendor', kind === 'approve' ? 'Verification approved' : kind === 'info' ? 'More information needed' : kind === 'revoke' ? 'Verification revoked' : 'Verification rejected', reason, 'onboarding', ['v_verify', {}])
    setSheet(null)
    toast(kind === 'approve' ? 'Approved — listings are re-evaluated against all other gates' : label, kind === 'approve' ? 'ok' : 'warn')
  }
  const open = (kind) => { if (kind === 'approve' && (asOwner || v.owner === me.name)) return toast('SELF_APPROVAL_DENIED — a reviewer can’t approve their own vendor account or documents. Logged.', 'warn'); setSheet(kind) }
  const REAS = { approve: ['All documents valid and legible', 'Registry and GSTIN verified', 'Other'], reject: ['GSTIN inactive on portal', 'Documents don’t match business', 'Suspected fraud', 'Other'], info: ['Document unreadable', 'Licence expired', 'Details mismatch', 'Other'], revoke: ['Credential invalid', 'Misrepresentation', 'Other'] }
  const T = { approve: 'Approve verification', reject: 'Reject verification', info: 'Request more information', revoke: 'Revoke approval' }
  return (
    <Screen
      title={v.name}
      subtitle={`Review · ${c.name}`}
      right={<StatusBadge s={v.ver} className="mr-2" />}
      overlay={sheet && <ReasonSheet open onClose={() => setSheet(null)} title={T[sheet]} reasons={REAS[sheet]} danger={sheet !== 'approve'} confirmLabel={T[sheet]} onConfirm={(r) => decide(sheet, r)} />}
      footer={['submitted', 'more_info', 'rejected'].includes(v.ver) ? <div className="flex gap-2"><Button variant="dangerSoft" className="flex-1" onClick={() => open('reject')}>Reject</Button><Button variant="secondary" className="flex-1" onClick={() => open('info')}>Ask info</Button><Button className="flex-1" onClick={() => open('approve')}>Approve</Button></div> : v.ver === 'approved' ? <Button full variant="dangerSoft" onClick={() => open('revoke')}>Revoke approval</Button> : null}
    >
      <Card><div className="flex items-center gap-3"><Thumb tone={v.tone} icon={c.icon} size={54} /><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{v.name}</p><p className="text-sm text-ink-500">{v.owner} · {v.city}</p></div></div><KV className="mt-3" rows={[['GSTIN', v.gstin], ['Category', c.name], ['Required evidence', c.docs.join(', ') || 'None'], ['Areas', v.areas.join(', ')], ['Account', <StatusBadge s={v.acct} />]]} /></Card>
      {v.agent && <Banner tone="blue" title={`Onboarded by agent ${v.agent}`}>Agents can’t approve their own leads — this decision is yours alone.</Banner>}
      <Card className="!p-3.5"><div className="flex items-start gap-2.5"><UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Separation of duties</p><p className="text-xs text-ink-500">Reviewer <b>{me.name || ME.admin}</b> ≠ vendor owner <b>{v.owner}</b>. Approval needs reviewer permission, scope, a reason and an audit entry.</p></div></div><div className="mt-2"><Toggle label="Mock: review as the vendor’s own owner" on={asOwner} onChange={setAsOwner} /></div></Card>
      {['submitted', 'more_info', 'rejected'].includes(v.ver) && (
        <Card className="space-y-2"><p className="text-sm font-bold">Tier to award on approval</p><Chips scroll={false} value={tier} onChange={setTier} options={[{ id: 1, label: 'Tier 1 · Contact' }, { id: 2, label: 'Tier 2 · Identity' }, { id: 3, label: 'Tier 3 · Business' }]} /><p className="text-xs text-ink-500">Tier 4 (audited partner: site audit, ISO, references) is a Phase 2 programme. Currently: {TIERS[v.tier || 0].name}.</p></Card>
      )}
      <Section title="Evidence (access is audited)">
        <div className="space-y-2">{v.docs.map((d) => <DocTile key={d.name} name={d.name} status={d.status === 'verified' ? 'verified' : d.status === 'expired' ? 'rejected' : d.status} note={d.note || (d.expires ? `Valid till ${d.expires}` : 'Awaiting review')} />)}{!v.docs.length && <Card><Missing>No documents submitted</Missing></Card>}</div>
      </Section>
      <Section title="Publication impact"><Card><p className="text-xs text-ink-500">Approval is one gate. It doesn’t publish listings by itself.</p><div className="mt-2 space-y-1.5">{myListings.map((l) => <p key={l.id} className="flex items-center gap-2 text-[13px]">{published(l) ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-red-500" />}<span className="truncate">{l.title}</span></p>)}{!myListings.length && <Missing>No listings yet</Missing>}</div></Card></Section>
      <Section title="History (immutable)"><Card><Timeline steps={v.history.map((h, i) => ({ label: { submitted: 'Submitted', more_info: 'More information requested', approved: 'Approved', rejected: 'Rejected', expired: 'Credential expired', revoked: 'Revoked', restricted: 'Restricted' }[h.s] || h.s, at: `${h.at} · ${h.by}`, note: h.note, done: true }))} /></Card></Section>
    </Screen>
  )
}

/* ================= LISTING REVIEW QUEUE ================= */
export function AdminListings() {
  const nav = useNav()
  const { listings, vendor } = useApp()
  const [f, setF] = useState('pending')
  const list = listings.filter((l) => (f === 'pending' ? l.review === 'pending' : f === 'dup' ? !!l.dupOf : f === 'changes' ? ['changes', 'rejected'].includes(l.review) : l.review !== 'draft'))
  return (
    <Screen title="Listing review">
      <Chips scroll={false} value={f} onChange={setF} options={[{ id: 'pending', label: `Pending (${listings.filter((l) => l.review === 'pending').length})` }, { id: 'dup', label: `Duplicates (${listings.filter((l) => l.dupOf).length})` }, { id: 'changes', label: 'Changes / rejected' }, { id: 'all', label: 'All' }]} />
      <div className="space-y-2.5">
        {list.map((l) => (
          <Card key={l.id} onClick={() => nav.go('ad_listing', { id: l.id })} className="!p-3">
            <div className="flex gap-3"><Thumb tone={l.tone} icon={cat(l.cat).icon} size={56} round="rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold leading-snug">{l.title}</p><StatusBadge s={l.review === 'approved' ? (l.restricted ? 'restricted' : 'approved') : l.review} /></div><p className="mt-0.5 text-xs text-ink-500">{vendor(l.vendorId)?.name}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{l.dupOf && <Badge tone="amber"><Copy size={11} />Duplicate flag</Badge>}{l.sponsored && <Badge tone="amber">Sponsored</Badge>}</div></div></div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={Package} title="Nothing in this queue" />}
      </div>
    </Screen>
  )
}

export function AdminListing({ params }) {
  const nav = useNav()
  const { listings, patchListing, vendor, gates, published, notify, toast, addAudit, me } = useApp()
  const l = listings.find((x) => x.id === (params.id || 'l5'))
  const v = vendor(l.vendorId)
  const g = gates(l)
  const dup = l.dupOf && listings.find((x) => x.id === l.dupOf)
  const [sheet, setSheet] = useState(null)
  const act = (kind, reason) => {
    const m = { approve: ['approved', 'Approved listing content'], changes: ['changes', 'Requested listing changes'], reject: ['rejected', 'Rejected listing'], restrict: ['approved', 'Restricted listing'], remove: ['rejected', 'Removed listing'], variant: ['approved', 'Ruled duplicate flag a legitimate regional variant'], spam: ['rejected', 'Rejected as duplicate spam'] }[kind]
    patchListing(l.id, (x) => ({ review: m[0], reason: ['changes', 'reject', 'spam', 'remove'].includes(kind) ? reason : undefined, restricted: kind === 'restrict' ? true : x.restricted, dupOf: ['variant', 'spam'].includes(kind) ? null : x.dupOf }))
    addAudit(m[1], l.title, 'enforcement', reason, me.name || ME.admin)
    notify('vendor', kind === 'approve' || kind === 'variant' ? 'Listing approved' : 'Listing update', `${l.title}: ${reason || m[1]}`, 'listing', ['v_listing_gate', { id: l.id }])
    setSheet(null); toast(m[1] + (kind === 'approve' ? ' — it goes public only if every gate passes' : ''))
  }
  const R = { approve: ['Meets content policy'], changes: ['Add experience details', 'Improve description', 'Add service-area details', 'Other'], reject: ['Misleading content', 'Prohibited service', 'Low-quality content', 'Other'], restrict: ['Safety concern', 'Under investigation', 'Other'], remove: ['Policy violation', 'Legal request', 'Other'], variant: ['Different service area / team'], spam: ['Duplicate spam', 'Same listing re-posted'] }
  return (
    <Screen
      title="Review listing"
      subtitle={l.title}
      overlay={sheet && <ReasonSheet open onClose={() => setSheet(null)} title={{ approve: 'Approve content', changes: 'Request changes', reject: 'Reject listing', restrict: 'Restrict listing', remove: 'Remove listing', variant: 'Legitimate variant', spam: 'Duplicate spam' }[sheet]} reasons={R[sheet]} danger={['reject', 'restrict', 'remove', 'spam'].includes(sheet)} onConfirm={(r) => act(sheet, r)} />}
      footer={l.review === 'pending' ? <div className="flex gap-2"><Button variant="dangerSoft" className="flex-1" onClick={() => setSheet('reject')}>Reject</Button><Button variant="secondary" className="flex-1" onClick={() => setSheet('changes')}>Changes</Button><Button className="flex-1" onClick={() => setSheet('approve')}>Approve</Button></div> : l.review === 'approved' ? <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setSheet('restrict')}>Restrict</Button><Button variant="dangerSoft" className="flex-1" onClick={() => setSheet('remove')}>Remove</Button></div> : null}
    >
      <Card><div className="flex items-start justify-between gap-2"><p className="text-base font-bold leading-snug">{l.title}</p><StatusBadge s={l.review} /></div><p className="mt-2 text-sm text-ink-600">{l.desc || <Missing>No description</Missing>}</p><KV className="mt-3" rows={[['Vendor', v.name], ['Category', `${cat(l.cat).name} · ${l.sub}`], ['Price', <Price l={l} />], ['Areas', l.areas.join(', ') || '—'], ['Availability', l.avail]]} /></Card>
      {dup && (
        <Card className="space-y-2.5 !ring-amber-300">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><Copy size={15} />Possible duplicate of “{dup.title}”</p>
          <p className="text-xs text-ink-600">Matched on vendor identity, service, location and listing details. {l.dupNote && <><b>Vendor says:</b> “{l.dupNote}”</>}</p>
          <p className="text-xs text-ink-500">You must tell regional/service variants apart from spam. Nothing is merged or deleted automatically.</p>
          <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => setSheet('variant')}>Legit variant</Button><Button size="sm" variant="dangerSoft" className="flex-1" onClick={() => setSheet('spam')}>Spam</Button></div>
        </Card>
      )}
      <Section title="Publication gates (live)"><Group>{g.map((x, i) => <GateRow key={x.id} g={x} last={i === g.length - 1} />)}</Group><p className="mt-1.5 text-xs text-ink-500">Approving content flips one gate. The listing is public only when all six pass — currently <b>{published(l) ? 'public' : 'hidden'}</b>.</p></Section>
      {l.reason && <Banner tone="amber" title="Last decision">{l.reason}</Banner>}
    </Screen>
  )
}

/* ================= CASES: trust & safety + support (spec §12, §13) ================= */
export function AdminCases({ params = {} }) {
  const nav = useNav()
  const { cases } = useApp()
  const [tab, setTab] = useState(params.tab || 'trust')
  const [sev, setSev] = useState('all')
  const list = cases.filter((c) => (tab === 'trust' ? c.kind === 'report' : c.kind === 'issue') && (sev === 'all' || c.severity === sev)).sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
  return (
    <Screen title="Cases">
      <Segmented value={tab} onChange={setTab} options={[{ id: 'trust', label: 'Trust & safety', count: cases.filter((c) => c.kind === 'report' && c.status !== 'closed').length }, { id: 'support', label: 'Support', count: cases.filter((c) => c.kind === 'issue' && c.status !== 'closed').length }]} />
      <Chips scroll={false} value={sev} onChange={setSev} options={['all', 'critical', 'high', 'medium', 'low'].map((x) => ({ id: x, label: x === 'all' ? 'All severities' : x[0].toUpperCase() + x.slice(1) }))} />
      <div className="space-y-2.5">
        {list.map((c) => (
          <Card key={c.id} onClick={() => nav.go('ad_case', { id: c.id })} className="!p-3.5">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{c.id} · {c.target.type}</span><div className="flex gap-1.5"><StatusBadge s={c.severity} /><StatusBadge s={c.status} /></div></div>
            <p className="mt-1 text-sm font-bold">{c.title}</p>
            <p className="mt-0.5 text-xs text-ink-500">{c.reason} · against {c.against}</p>
            <div className="mt-1.5 flex items-center justify-between text-[11px]"><span className="font-semibold text-ink-500">Owner: {c.owner}</span>{c.slaMin > 0 && c.status !== 'closed' && <Countdown mins={c.slaMin} label="to SLA" />}</div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={Flag} title="No cases" />}
      </div>
    </Screen>
  )
}

export function AdminCase({ params }) {
  const nav = useNav()
  const { cases, patchCase, toast, addAudit, notify, me, patchListing, patchVendor, staff, setThreads } = useApp()
  const d = cases.find((x) => x.id === (params.id || 'CS-212'))
  const [sheet, setSheet] = useState(null)
  const [read, setRead] = useState(false)
  const [denied, setDenied] = useState(false)
  const actor = me.name || ME.admin
  const push = (action, extra = {}, reason) => patchCase(d.id, (x) => ({ actions: [...x.actions, { by: actor, action, at: 'Just now', reason }], ...extra }))
  const decide = (kind, reason) => {
    const m = {
      warn: ['Warning issued to the account', 'decided', 'Warning issued'],
      content: ['Content restricted', 'decided', 'Content restricted'],
      listing: ['Listing restricted', 'decided', 'Listing restricted'],
      suspend: ['Account suspended', 'decided', 'Account suspended'],
      dismiss: ['Report dismissed — no violation found', 'closed', 'Dismissed'],
      emergency: ['Emergency restriction applied for 72 h — review due', 'decided', 'Emergency restriction (72 h)'],
      evidence: ['Evidence requested from the reporter', 'evidence'],
    }[kind]
    if (kind === 'listing' && d.target.type === 'listing') patchListing(d.target.id, { restricted: true, hold: `Case ${d.id}` })
    if ((kind === 'suspend' || kind === 'emergency') && d.target.type === 'vendor') patchVendor(d.target.id, { acct: kind === 'suspend' ? 'suspended' : 'restricted', hold: `Case ${d.id}` })
    push(m[0], { status: m[1], owner: actor, outcome: ['evidence'].includes(kind) ? d.outcome : m[2] ?? m[0], emergency: kind === 'emergency' || d.emergency, slaMin: kind === 'evidence' ? 1440 : 0 }, reason)
    addAudit(m[0], `${d.id} · ${d.against}`, 'enforcement', reason, actor)
    notify('customer', `Update on ${d.id}`, m[0], 'support', ['c_case', { id: d.id }])
    setSheet(null); toast(m[0])
  }
  const T = { warn: 'Issue warning', content: 'Restrict content', listing: 'Restrict listing', suspend: 'Suspend account', dismiss: 'Dismiss', emergency: 'Emergency restriction', evidence: 'Request evidence' }
  const R = { warn: ['First minor violation', 'Misleading content'], content: ['Prohibited content', 'Abusive language'], listing: ['Misleading price', 'Unsafe service'], suspend: ['Fraud confirmed', 'Repeated serious misconduct'], dismiss: ['No violation found', 'Honest review — disagreement alone isn’t grounds'], emergency: ['Imminent user harm', 'Fraud in progress'], evidence: ['Need photos', 'Need chat export', 'Need receipt'] }
  return (
    <Screen
      title={d.id}
      subtitle={d.target.label}
      right={<StatusBadge s={d.status} className="mr-2" />}
      overlay={
        <>
          {sheet && <ReasonSheet open onClose={() => setSheet(null)} title={T[sheet]} intro={sheet === 'suspend' || sheet === 'emergency' ? 'This is a high-impact action. It is audited and, for emergency restrictions, reviewed afterwards.' : undefined} reasons={R[sheet]} danger={['suspend', 'emergency', 'content', 'listing'].includes(sheet)} confirmLabel={T[sheet]} onConfirm={(r) => decide(sheet, r)} />}
          <Sheet open={read} onClose={() => setRead(false)} title="Read the linked conversation" footer={<Button full onClick={() => { addAudit('Read conversation (case-bound)', d.id, 'access', `Case ${d.id} evidence`, actor); setRead(false); toast('Access logged — conversation opened for this case only') }}>Open for this case</Button>}><p className="text-sm text-ink-600">Admin access doesn’t grant permission to browse arbitrary conversations. This opens <b>only the conversation attached to {d.id}</b>, and the read is logged with your reason.</p><Banner tone="blue">Reason recorded: “Case {d.id} evidence”.</Banner></Sheet>
        </>
      }
    >
      <Card><div className="flex items-center gap-1.5"><StatusBadge s={d.severity} /><Pill>{d.reason}</Pill></div><p className="mt-2 text-base font-bold">{d.title}</p><p className="mt-1 text-sm text-ink-600">{d.desc}</p><KV className="mt-3" rows={[['Reporter', d.raisedBy], ['Against', d.against], ['Target', `${d.target.type} ${d.target.id}`], ['Owner', d.owner], ['Opened', d.created], ['Response target', d.sla]]} /></Card>
      {d.emergency && <Banner tone="amber" title="Emergency restriction active" action={<Button size="sm" variant="secondary" onClick={() => { push('Emergency restriction reviewed — confirmed and converted to a standard restriction', { emergency: false }, 'Post-action review'); addAudit('Reviewed emergency restriction', d.id, 'enforcement', 'Post-action review', actor); toast('Reviewed and recorded') }}>Complete review</Button>}>Time-bound (72 h). Needs a review after action; the vendor can appeal.</Banner>}
      {d.evidence.length > 0 && <Section title="Evidence"><Evidence items={d.evidence} /><p className="mt-1.5 text-[11px] text-ink-400">Viewing evidence is audited; files are scanned and served through short-lived links.</p></Section>}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" icon={Eye} onClick={() => setRead(true)}>Read conversation</Button>
        <Button variant="secondary" icon={Eye} onClick={() => setDenied(true)}>Read unrelated chat</Button>
      </div>
      {denied && <Banner tone="red" title="Denied — no case-bound permission">Reading an unrelated private conversation isn’t allowed. The attempt was logged.</Banner>}
      {d.status !== 'closed' && (
        <Section title="Decide (all actions need a reason)">
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => setSheet('evidence')}>Request evidence</Button><Button variant="secondary" onClick={() => setSheet('warn')}>Warn</Button>
            <Button variant="secondary" onClick={() => setSheet('content')}>Restrict content</Button><Button variant="secondary" onClick={() => setSheet('listing')}>Restrict listing</Button>
            <Button variant="dangerSoft" onClick={() => setSheet('emergency')} icon={Siren}>Emergency</Button><Button variant="danger" onClick={() => setSheet('suspend')}>Suspend account</Button>
            <Button full variant="secondary" className="col-span-2" onClick={() => setSheet('dismiss')}>Dismiss — no violation</Button>
          </div>
          <p className="mt-2 text-xs text-ink-500">Be proportionate: warnings, content or listing restrictions, then suspension for serious or repeated misconduct. A single cancellation or one late reply is never grounds on its own.</p>
        </Section>
      )}
      {d.outcome && <Banner tone="green" title="Outcome">{d.outcome}</Banner>}
      <Section title="Case history"><Card><Timeline steps={d.actions.map((a) => ({ label: a.action, at: `${a.by} · ${a.at}`, note: a.reason, done: true }))} /></Card></Section>
    </Screen>
  )
}

/* ================= REVIEW MODERATION & APPEALS ================= */
export function AdminReviews() {
  const { reviews, setReviews, appeals, patchAppeal, patchCase, toast, addAudit, me, cases } = useApp()
  const [tab, setTab] = useState('reviews')
  const [rs, setRs] = useState(null)
  const [ap, setAp] = useState(null)
  const actor = me.name || ME.admin
  const held = reviews.filter((r) => r.status === 'held' || cases.some((c) => c.target.id === r.id && c.status !== 'closed'))
  return (
    <Screen
      title="Reviews & appeals"
      overlay={
        <>
          {rs && <ReasonSheet open onClose={() => setRs(null)} title={rs.kind === 'publish' ? 'Publish review' : 'Remove review'} reasons={rs.kind === 'publish' ? ['Passes policy on human review', 'Honest review — vendor disagreement isn’t grounds'] : ['Threats or harassment', 'Abusive language', 'Not a real transaction']} danger={rs.kind === 'remove'} confirmLabel={rs.kind === 'publish' ? 'Publish' : 'Remove'} onConfirm={(r) => { setReviews((x) => x.map((y) => (y.id === rs.r.id ? { ...y, status: rs.kind === 'publish' ? 'published' : 'removed', hold: undefined } : y))); addAudit(rs.kind === 'publish' ? 'Published held review' : 'Removed review', rs.r.id, 'enforcement', r, actor); setRs(null); toast('Recorded with rationale — appeal route open') }} />}
          {ap && <ReasonSheet open onClose={() => setAp(null)} title={ap.kind === 'uphold' ? 'Uphold the original decision' : 'Overturn the decision'} intro="A different reviewer than the original decision-maker re-evaluates the evidence." reasons={ap.kind === 'uphold' ? ['Evidence supports the original decision', 'Appeal adds no new evidence'] : ['New evidence disproves the claim', 'Decision was disproportionate']} confirmLabel={ap.kind === 'uphold' ? 'Uphold' : 'Overturn'} onConfirm={(r) => { patchAppeal(ap.a.id, { status: ap.kind === 'uphold' ? 'upheld' : 'overturned' }); patchCase(ap.a.caseId, (c) => ({ status: ap.kind === 'uphold' ? 'decided' : 'closed', actions: [...c.actions, { by: actor, action: `Appeal ${ap.kind === 'uphold' ? 'upheld' : 'overturned'} by human reviewer`, at: 'Just now', reason: r }] })); addAudit(`Appeal ${ap.kind}`, ap.a.id, 'enforcement', r, actor); setAp(null); toast('Outcome and reason recorded and sent to the vendor') }} />}
        </>
      }
    >
      <Segmented value={tab} onChange={setTab} options={[{ id: 'reviews', label: 'Reviews', count: held.length }, { id: 'appeals', label: 'Appeals', count: appeals.filter((a) => a.status === 'open').length }]} />
      {tab === 'reviews' ? (
        <div className="space-y-2.5">
          <Banner tone="blue">Eligible reviews are screened automatically; suspicious or reported ones wait here for a human. Don’t remove an honest review just because the vendor disagrees.</Banner>
          {held.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between"><p className="text-sm font-bold">{r.by} → {r.target}</p><StatusBadge s={r.status === 'held' ? 'held' : 'approved'} /></div>
              <p className="mt-1.5 text-[13px] text-ink-700">“{r.text}”</p>
              <p className="mt-1 text-[11px] text-ink-400">{r.via} · {r.hold || 'Reported by vendor'}</p>
              <div className="mt-3 flex gap-2"><Button size="sm" className="flex-1" onClick={() => setRs({ r, kind: 'publish' })}>Publish</Button><Button size="sm" className="flex-1" variant="dangerSoft" onClick={() => setRs({ r, kind: 'remove' })}>Remove</Button></div>
            </Card>
          ))}
          {!held.length && <EmptyState icon={Star} title="No reviews waiting" />}
        </div>
      ) : (
        <div className="space-y-2.5">
          {appeals.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{a.id} · {a.caseId}</span><StatusBadge s={a.status === 'open' ? 'appealed' : a.status === 'upheld' ? 'upheld' : 'resolved'} /></div>
              <p className="mt-1 text-sm font-bold">{a.by}</p><p className="text-xs text-ink-500">Decision: {a.decision}</p>
              <p className="mt-2 rounded-xl bg-ink-50 p-3 text-[13px] text-ink-700">“{a.note}”</p>
              {a.evidence.length > 0 && <div className="mt-2"><Evidence items={a.evidence} /></div>}
              {a.status === 'open' && <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" className="flex-1" onClick={() => setAp({ a, kind: 'uphold' })}>Uphold</Button><Button size="sm" className="flex-1" onClick={() => setAp({ a, kind: 'overturn' })}>Overturn</Button></div>}
            </Card>
          ))}
        </div>
      )}
    </Screen>
  )
}

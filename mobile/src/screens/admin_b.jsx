import { useState } from 'react'
import {
  ShieldCheck, Users, Store, ChevronRight, Check, X, Layers, Tag, Settings, ScrollText, LogOut, BarChart3, Download, Plus, Lock, MapPin, Bell, Gavel, Search, Eye, Ban, RotateCcw, KeyRound, CreditCard,
  Megaphone, ListChecks, UserX, Globe, Percent, Rocket, Languages, ShieldAlert, CircleAlert, Webhook, Undo2, Receipt, UserCog, Network, Building2,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CategoryAdminPanel } from './catbuilder.jsx'
import { CATS, cat, REPORT, ME, CFG, AVAIL_LABEL, MODE_LABEL, CANCEL_POLICY, SETTINGS0 } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Banner, EmptyState, Stat, KV, cx, Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar,
  HBar, BarChart, SearchBar, SOFT, ReasonSheet, Missing, Spark, SponsoredTag,
} from '../ui.jsx'
import { NotifBell, VerifiedBadge, LangButton } from './shared.jsx'

/* ================= SUBSCRIPTION MONITORING (spec §11.2, §13.1) ================= */
export function AdminSubs() {
  const nav = useNav()
  const { vendors, subEvents } = useApp()
  const [f, setF] = useState('risk')
  const list = vendors.filter((v) => v.ver !== 'submitted' && (f === 'risk' ? ['grace', 'expired'].includes(v.sub.status) : f === 'cancelled' ? v.sub.status === 'cancelled' || !v.sub.autoRenew : f === 'free' ? ['none'].includes(v.sub.status) : true))
  return (
    <Screen title="Subscriptions">
      <div className="grid grid-cols-3 gap-2">{[['Active', vendors.filter((v) => v.sub.status === 'active').length, 'text-emerald-600'], ['Grace', vendors.filter((v) => v.sub.status === 'grace').length, 'text-amber-600'], ['Expired', vendors.filter((v) => v.sub.status === 'expired').length, 'text-red-600']].map(([a, b, c]) => <Card key={a} className="!p-3 text-center"><p className={cx('text-2xl font-extrabold', c)}>{b}</p><p className="text-[11px] text-ink-500">{a}</p></Card>)}</div>
      <Chips scroll={false} value={f} onChange={setF} options={[{ id: 'risk', label: 'Grace / expired' }, { id: 'cancelled', label: 'Auto-renew off' }, { id: 'free', label: 'No plan' }, { id: 'all', label: 'All' }]} />
      <div className="space-y-2.5">
        {list.map((v) => (
          <Card key={v.id} onClick={() => nav.go('ad_sub', { id: v.id })} className="!p-3.5">
            <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{v.name}</p><StatusBadge s={v.sub.status === 'cancelled' ? 'sub_cancelled' : v.sub.status} /></div>
            <p className="mt-0.5 text-xs text-ink-500">{v.sub.plan} · paid until {v.sub.paidUntil || '—'}{v.sub.grace ? ` · grace to ${v.sub.grace}` : ''}</p>
          </Card>
        ))}
        {!list.length && <EmptyState icon={CreditCard} title="Nothing to show" />}
      </div>
      <Section title="Recent billing events"><Card><Timeline steps={subEvents.slice(0, 5).map((e) => ({ label: `${vendors.find((v) => v.id === e.vendorId)?.name}: ${e.ev}`, at: e.at, note: e.res, done: true }))} /></Card></Section>
    </Screen>
  )
}

export function AdminSub({ params }) {
  const { vendors, patchVendor, subEvents, setSubEvents, toast, addAudit, listings, published, me, notify } = useApp()
  const v = vendors.find((x) => x.id === (params.id || 'v17'))
  const [sheet, setSheet] = useState(null)
  const [deny, setDeny] = useState(false)
  const actor = me.name || ME.admin
  const mine = listings.filter((l) => l.vendorId === v.id && l.review === 'approved')
  const fix = (kind, reason) => {
    if (kind === 'grace') patchVendor(v.id, (x) => ({ sub: { ...x.sub, status: 'grace', grace: '23 Oct 2026' } }))
    if (kind === 'reverse') patchVendor(v.id, (x) => ({ sub: { ...x.sub, status: 'active', paidUntil: '14 Dec 2026', grace: null } }))
    setSubEvents((e) => [{ id: 'e' + Date.now(), vendorId: v.id, ev: kind === 'grace' ? 'Authorized correction: grace extended' : 'Authorized correction: billing error fixed', at: 'Just now', res: `${reason} · by ${actor}`, tone: 'blue' }, ...e])
    addAudit(kind === 'grace' ? 'Extended grace (billing correction)' : 'Corrected billing error', v.name, 'billing', reason, actor)
    notify('vendor', 'Billing updated', 'Support corrected your subscription. Listings re-checked.', 'subscription', ['v_sub', {}])
    setSheet(null); toast('Correction recorded — publication recomputed')
  }
  return (
    <Screen title={v.name} subtitle="Subscription investigation" right={<StatusBadge s={v.sub.status === 'cancelled' ? 'sub_cancelled' : v.sub.status} className="mr-2" />}
      overlay={sheet && <ReasonSheet open onClose={() => setSheet(null)} title={sheet === 'grace' ? 'Extend grace period' : 'Fix billing error'} reasons={sheet === 'grace' ? ['Provider outage on renewal', 'Support-approved exceptional case'] : ['Duplicate charge confirmed', 'Provider reconciliation mismatch', 'Applicable law']} confirmLabel="Apply correction" onConfirm={(r) => fix(sheet, r)} />}>
      <Card><KV rows={[['Plan', v.sub.plan], ['Paid until', v.sub.paidUntil || '—'], ['Grace until', v.sub.grace || '—'], ['Auto-renew', v.sub.autoRenew ? 'On' : 'Off'], ['Lead usage', v.sub.leads]]} /></Card>
      <Banner tone="blue" title="Billing scope">Billing operators can correct subscription state with a reason. They <b>can’t</b> change trust state — a paid or restored plan never overrides moderation or verification.</Banner>
      <Section title="Effect on listings"><Card className="space-y-1.5">{mine.map((l) => <p key={l.id} className="flex items-center gap-2 text-[13px]">{published(l) ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-red-500" />}<span className="truncate">{l.title}</span></p>)}{!mine.length && <Missing>No approved listings</Missing>}</Card></Section>
      <Section title="Provider events (idempotent, signature-verified)"><Card><Timeline steps={subEvents.filter((e) => e.vendorId === v.id).map((e) => ({ label: e.ev, at: e.at, note: e.res, done: true }))} /></Card><p className="mt-1.5 text-xs text-ink-500">Callbacks are authenticated, de-duplicated by event ID and reconciled against server state. A client redirect to a “success” page is never proof of payment.</p></Section>
      <div className="grid grid-cols-2 gap-2.5"><Button variant="secondary" onClick={() => setSheet('grace')}>Extend grace</Button><Button variant="secondary" onClick={() => setSheet('reverse')}>Fix billing error</Button><Button full variant="dangerSoft" className="col-span-2" onClick={() => { setDeny(true); addAudit('Denied: billing operator attempted trust-state change', v.name, 'security', 'Separation of duties', actor) }}>Try to approve verification (billing role)</Button></div>
      {deny && <Banner tone="red" title="Denied">Billing operators can’t change trust state by default. The attempt was logged.</Banner>}
    </Screen>
  )
}

/* ================= SPONSORED AUDIT ================= */
export function AdminSponsored() {
  const { campaigns, listings, vendor, patchCampaign, patchListing, toast, addAudit, me } = useApp()
  return (
    <Screen title="Sponsored campaigns">
      <Banner tone="blue">Every campaign is checked against the same gates. Sponsorship never overrides publication, verification or safety. Dates, entitlement and delivery are auditable.</Banner>
      {campaigns.map((c) => { const l = listings.find((x) => x.id === c.listingId); return (
        <Card key={c.id}>
          <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">{l?.title}</p><p className="text-xs text-ink-500">{vendor(c.vendorId)?.name}</p></div><StatusBadge s={c.status} /></div>
          <KV className="mt-2" rows={[['Dates', `${c.start} → ${c.end}`], ['Placement', c.area], c.status === 'live' ? ['Delivery', `${c.impressions.toLocaleString('en-IN')} impr · ${c.clicks} clicks`] : null]} />
          {c.note && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{c.note}</p>}
          {c.status === 'live' && <Button size="sm" variant="dangerSoft" className="mt-2" onClick={() => { patchCampaign(c.id, { status: 'removed', note: 'Removed by admin' }); patchListing(c.listingId, { sponsored: false }); addAudit('Removed sponsored campaign', c.id, 'enforcement', 'Admin review', me.name || ME.admin); toast('Campaign removed') }}>Remove campaign</Button>}
        </Card>) })}
    </Screen>
  )
}

/* ================= USERS ================= */
export function UsersScreen({ params = {} }) {
  const nav = useNav()
  const { users } = useApp()
  const [q, setQ] = useState('')
  const [f, setF] = useState(params.f || 'all')
  const list = users.filter((u) => (f === 'all' || (f === 'deletion' ? u.status === 'deletion' : f === 'restricted' ? ['restricted', 'suspended'].includes(u.status) : u.role === f)) && (!q || u.name.toLowerCase().includes(q.toLowerCase())))
  return (
    <Screen title="Users" back={false}>
      <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" />
      <Chips value={f} onChange={setF} options={[{ id: 'all', label: 'All' }, { id: 'Customer', label: 'Customers' }, { id: 'Vendor', label: 'Vendors' }, { id: 'Sales Agent', label: 'Agents' }, { id: 'Super Admin', label: 'Admins' }, { id: 'restricted', label: 'Restricted' }, { id: 'deletion', label: 'Deletion requests' }]} />
      <Group>{list.map((u, i) => <ListRow key={u.id} last={i === list.length - 1} onClick={() => nav.go('ad_user', { id: u.id })} icon={Users} tone={u.status === 'active' ? 'teal' : 'rose'} title={u.name} subtitle={`${u.modes} · joined ${u.joined}`} right={<StatusBadge s={u.status} />} />)}</Group>
      {!list.length && <EmptyState icon={Users} title="No users match" />}
    </Screen>
  )
}

export function UserDetail({ params }) {
  const { users, patchUser, toast, addAudit, me } = useApp()
  const u = users.find((x) => x.id === (params.id || 'u1'))
  const [sheet, setSheet] = useState(null)
  const actor = me.name || ME.admin
  const set = (status, reason) => { patchUser(u.id, { status }); addAudit(`Set account ${status}`, u.name, 'user', reason, actor); setSheet(null); toast(`Account ${status}${status !== 'active' ? ' — enforced server-side on every platform' : ''}`) }
  const finish = () => { addAudit('Completed deletion / anonymization', u.name, 'user', 'Identity verified; legal retention checked', actor); patchUser(u.id, { status: 'inactive' }); toast('Deletion executed — records legally required are retained / anonymized') }
  return (
    <Screen title={u.name} subtitle={u.role} right={<StatusBadge s={u.status} className="mr-2" />}
      overlay={sheet && <ReasonSheet open onClose={() => setSheet(null)} title={sheet === 'active' ? 'Restore account' : `Set ${sheet}`} reasons={sheet === 'active' ? ['Review completed', 'Appeal upheld'] : ['Fraud risk', 'Policy violation', 'Under investigation', 'Other']} danger={sheet !== 'active'} onConfirm={(r) => set(sheet, r)} />}>
      <Card><div className="flex items-center gap-3"><Avatar name={u.name} size={56} /><div><p className="text-lg font-extrabold">{u.name}</p><p className="text-sm text-ink-500">{u.phone}</p></div></div><KV className="mt-3" rows={[['Role', u.role], ['Modes', u.modes], ['Joined', u.joined], ['Status', <StatusBadge s={u.status} />]]} /></Card>
      <Banner tone="blue" title="One identity, several modes">Customer and vendor modes belong to the same identity. Mode is a convenience, never a privilege — vendor access comes from organization ownership.</Banner>
      {u.status === 'deletion' && (
        <Card className="space-y-2 !ring-amber-300"><p className="text-sm font-bold">Deletion requested {u.delReq}</p><p className="text-xs text-ink-600">Verify the requester, check legal retention and open commitments, then execute or anonymize. Don’t erase records needed for legal obligations without review.</p><Button onClick={finish}>Verified — execute deletion</Button></Card>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {u.status !== 'active' && u.status !== 'deletion' && <Button full className="col-span-2" icon={RotateCcw} onClick={() => setSheet('active')}>Restore account</Button>}
        {u.status === 'active' && <><Button variant="secondary" onClick={() => setSheet('restricted')}>Restrict</Button><Button variant="dangerSoft" onClick={() => setSheet('suspended')}>Suspend</Button></>}
      </div>
      <p className="text-xs text-ink-500">Restricted: some capabilities off, with a user-facing explanation. Suspended: access substantially disabled; records and case evidence preserved.</p>
    </Screen>
  )
}

/* ================= ROLES & RBAC (spec §4) ================= */
const MATRIX = [
  ['Browse published listings', 'Yes', 'Yes', 'Limited to sales need', 'Yes'],
  ['Manage own profile', 'Own profile', 'Own identity + organization', 'Own + assigned sales profile', 'Audited support only'],
  ['Create / manage listings', 'No', 'Own organization', 'Assist onboarding; can’t publish as vendor', 'Yes, audited'],
  ['Create booking / RFQ', 'Own requests', 'If acting as customer', 'No', 'No routine action'],
  ['Respond to booking / RFQ', 'Own customer requests', 'Own organization requests', 'No', 'No routine action'],
  ['Manage subscription', 'No', 'Own organization', 'Assist + track conversion; no billing override', 'Oversight + authorized corrections'],
  ['Review / moderate content', 'Report only', 'Respond / report own content', 'No', 'Yes, with audit trail'],
  ['Manage sales leads', 'No', 'No', 'Assigned leads only', 'All leads + agent oversight'],
  ['Manage users, roles, settings', 'No', 'No', 'No', 'Yes — strong auth + audit'],
  ['Read audit records', 'Own exposed activity', 'Own relevant activity', 'Assigned sales activity', 'Global authorized access'],
]
export function Roles() {
  const { staff, setStaff, toast, addAudit, me } = useApp()
  const [tab, setTab] = useState('matrix')
  const [sheet, setSheet] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const actor = me.name || ME.admin
  return (
    <Screen title="Roles & permissions"
      overlay={sheet && <ReasonSheet open onClose={() => setSheet(null)} title={`Revoke access — ${sheet.name}`} intro="Revocation ends sessions and tokens immediately. A reason and audit event are required." reasons={['Left the team', 'Role change', 'Security concern']} danger confirmLabel="Revoke" onConfirm={(r) => { setStaff((s) => s.map((x) => (x.id === sheet.id ? { ...x, scopes: [], session: 'Revoked' } : x))); addAudit('Revoked staff permissions', sheet.name, 'security', r, actor); setSheet(null); toast('Revoked — the next sensitive request is denied and sessions are invalidated') }} />}>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'matrix', label: 'Matrix' }, { id: 'staff', label: 'Staff scopes' }, { id: 'rules', label: 'Rules' }]} />
      {tab === 'matrix' && (<>
        <p className="text-xs text-ink-500">Four business roles. Access is denied by default and checked server-side against role, ownership, assignment, account state and workflow state.</p>
        <Card pad={false} className="overflow-x-auto no-scrollbar"><table className="w-full min-w-[520px] text-left text-[11.5px]"><thead><tr className="border-b border-ink-100 bg-ink-50">{['Action', 'Customer', 'Vendor', 'Sales Agent', 'Super Admin'].map((h) => <th key={h} className="p-2.5 font-bold text-ink-600">{h}</th>)}</tr></thead><tbody>{MATRIX.map((r) => <tr key={r[0]} className="border-b border-ink-100 align-top last:border-0">{r.map((c, i) => <td key={i} className={cx('p-2.5', i === 0 ? 'font-semibold text-ink-800' : c === 'No' || c === 'No routine action' ? 'text-ink-400' : 'text-ink-700')}>{c}</td>)}</tr>)}</tbody></table></Card>
      </>)}
      {tab === 'staff' && (<>
        <Banner tone="blue">Admins are individual accounts with MFA and short-lived sessions — shared super-admin accounts are prohibited. Permissions are granted by scope.</Banner>
        <div className="space-y-2.5">{staff.map((s) => (
          <Card key={s.id}><div className="flex items-center gap-3"><Avatar name={s.name} size={42} /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{s.name}</p><p className="truncate text-xs text-ink-500">{s.email}</p></div><Badge tone={s.mfa ? 'green' : 'red'}>{s.mfa ? 'MFA on' : 'MFA off'}</Badge></div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{s.scopes.length ? s.scopes.map((x) => <Pill key={x}>{x}</Pill>) : <Missing>No permissions</Missing>}</div><p className="mt-2 text-[11px] text-ink-400">Session: {s.session}</p>
            <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setAttempt(s.id); addAudit('Denied: self-grant of Super Admin', s.name, 'security', 'Taxonomy admins can’t elevate themselves', s.name) }}>Try self-grant</Button>{s.scopes.length > 0 && <Button size="sm" variant="dangerSoft" onClick={() => setSheet(s)}>Revoke</Button>}</div>
            {attempt === s.id && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">Denied and audited — nobody can grant themselves a role.</p>}
          </Card>))}</div>
      </>)}
      {tab === 'rules' && (
        <Card className="space-y-2.5">{['Every private-object read/write checks ownership and scope — including nested resources, attachments, exports, search and background tasks.', 'Client-supplied role, tenant, verification and subscription values are ignored or rejected; they’re derived from server state.', 'Changing an ID never exposes another vendor’s or user’s record — the response doesn’t reveal whether it exists, and the attempt is logged.', 'Vendors can’t approve their own verification. Billing operators can’t change trust state. Taxonomy admins can’t edit transaction terms.', 'Support access to messages or documents must be linked to a case or an approved purpose, and is logged.', 'Role grants, scope changes and elevation need an authorized actor, a reason and an audit event — with revocation behaviour.', 'Background jobs run under an explicit service identity with narrowly scoped permissions.'].map((x) => <p key={x} className="flex gap-2 text-[13px] text-ink-700"><Lock size={14} className="mt-0.5 shrink-0 text-brand-600" />{x}</p>)}</Card>
      )}
    </Screen>
  )
}

/* ================= CATEGORY CONFIGURATION (spec §6.2) ================= */
export function AdminCategories() {
  const nav = useNav()
  return (
    <Screen title="Categories & workflows" right={<Button size="sm" onClick={() => nav.go('ad_cat_new')}>New</Button>}>
      <Banner tone="blue">Category differences are configuration. Changes are versioned; existing bookings and accepted quotations keep the terms they were agreed under.</Banner>
      {CATS.map((c) => (
        <Card key={c.id} onClick={() => nav.go('ad_category', { id: c.id })}><div className="flex items-center gap-3"><Thumb tone={c.tone} icon={c.icon} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{c.name}</p><p className="text-xs text-ink-500">{MODE_LABEL[c.mode]} · {c.subs.length} sub-categories · {c.ver}{c.active === false ? ' · Inactive' : ''}</p></div><ChevronRight size={17} className="text-ink-300" /></div></Card>
      ))}
    </Screen>
  )
}
export function AdminCategory({ params }) {
  const nav = useNav()
  const { toast, addAudit, me } = useApp()
  const c0 = cat(params.id || 'home')
  const [f, setF] = useState({ mode: c0.mode, avail: c0.avail, resp: String(c0.respHrs), cancel: c0.cancel, verifyReq: c0.verifyReq, aliases: c0.aliases.join(', '), docs: c0.docs.join(', '), rfq: c0.rfq.join(', '), fields: c0.fields.join(', '), restricted: c0.restricted })
  const [ver, setVer] = useState(c0.ver)
  const save = () => { const nv = 'v' + (+ver.slice(1) + 1); setVer(nv); addAudit(`Category config ${ver} → ${nv}`, c0.name, 'config', 'Config change', me.name || ME.admin); toast(`Saved as ${nv} — new bookings use it; existing ones keep their snapshot`) }
  return (
    <Screen title={c0.name} subtitle={`Configuration ${ver}`} footer={<Button full size="lg" onClick={save}>Save new version</Button>}>
      <Segmented value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[{ id: 'booking', label: 'Booking' }, { id: 'rfq', label: 'RFQ' }, { id: 'both', label: 'Both' }]} />
      <Select label="Availability model" value={f.avail} onChange={(e) => setF({ ...f, avail: e.target.value })} options={Object.entries(AVAIL_LABEL).map(([value, label]) => ({ value, label }))} />
      <Input label="Response deadline (hours)" inputMode="numeric" value={f.resp} onChange={(e) => setF({ ...f, resp: e.target.value.replace(/\D/g, '') })} hint="Time before an unanswered booking request expires (CFG-03)" />
      <Select label="Cancellation policy" value={f.cancel} onChange={(e) => setF({ ...f, cancel: e.target.value })} options={[{ value: 'standard', label: 'Standard baseline' }, { value: 'event', label: 'Event exception' }, { value: 'project', label: 'Project / RFQ terms' }]} />
      <p className="-mt-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">{CANCEL_POLICY[f.cancel]} <i>(sample text — CFG-04)</i></p>
      <Card><Toggle label="Requires verification" desc="Blocks publication until evidence is approved and valid" on={f.verifyReq} onChange={(v) => setF({ ...f, verifyReq: v })} /></Card>
      <Input label="Required documents" value={f.docs} onChange={(e) => setF({ ...f, docs: e.target.value })} hint="Comma separated · expiry tracked per document" />
      <Input label="Localized aliases (EN / HI)" value={f.aliases} onChange={(e) => setF({ ...f, aliases: e.target.value })} hint="Search synonyms, e.g. bijli wala" />
      <CategoryAdminPanel id={c0.id} />
      <Input label="RFQ schema (customer questions)" value={f.rfq} onChange={(e) => setF({ ...f, rfq: e.target.value })} />
      <Input label="Restricted-content rule" textarea rows={2} value={f.restricted} onChange={(e) => setF({ ...f, restricted: e.target.value })} />
      <Card><KV rows={[['Subscription entitlements', c0.ent], ['Version', ver]]} /></Card>
    </Screen>
  )
}

/* ================= PLANS (sample values) ================= */
export function AdminPlans() {
  const { settings, setSettings, toast, addAudit, me } = useApp()
  const [plans, setPlans] = useState(settings.plans)
  const set = (i, k, v) => setPlans(plans.map((p, j) => (j === i ? { ...p, [k]: v } : p)))
  return (
    <Screen title="Plans & entitlements" footer={<Button full size="lg" onClick={() => { setSettings({ ...settings, plans }); addAudit('Updated plan configuration', 'Plans', 'config', 'Plan config change', me.name || ME.admin); toast('Saved — new plan version; existing subscribers keep theirs until renewal') }}>Save plan version</Button>}>
      <Banner tone="amber" title="Sample values (CFG-01, CFG-02)">Plan names, prices, cadence, taxes, trial policy, caps and counted-event definitions are still open business decisions. Values here are placeholders.</Banner>
      {plans.map((p, i) => (
        <Card key={p.id} className="space-y-3"><p className="text-sm font-extrabold">{p.name}</p>
          <div className="flex gap-3"><Input label="Price / month (₹)" inputMode="numeric" value={String(p.price)} onChange={(e) => set(i, 'price', +e.target.value.replace(/\D/g, ''))} /><Input label="Public listings" value={String(p.listings)} onChange={(e) => set(i, 'listings', /^\d+$/.test(e.target.value) ? +e.target.value : e.target.value)} /></div>
          <Input label="Lead limit" value={String(p.leads)} onChange={(e) => set(i, 'leads', /^\d+$/.test(e.target.value) ? +e.target.value : e.target.value)} />
          <Toggle label="Can publish public listings" on={p.publish} onChange={(v) => set(i, 'publish', v)} />
        </Card>
      ))}
      <p className="text-xs text-ink-500">Plan tier is never a quality or ranking signal. Free accounts can’t publish.</p>
    </Screen>
  )
}

/* ================= PLATFORM SETTINGS ================= */
export function AdminSettings() {
  const { settings, setSettings, toast, addAudit, me } = useApp()
  const [s, setS] = useState(settings)
  const [lang, setLang] = useState('en')
  const [reason, setReason] = useState(false)
  const T = { en: 'Hi {name}, {vendor} accepted your booking {id} for {date}.', hi: 'नमस्ते {name}, {vendor} ने {date} के लिए आपकी बुकिंग {id} स्वीकार कर ली है।' }
  return (
    <Screen title="Platform settings" right={<Button size="sm" variant="ghost" className="mr-1" onClick={() => window.dispatchEvent(new CustomEvent('vv-jump', { detail: 'ad_country' }))}>Countries</Button>} overlay={<ReasonSheet open={reason} onClose={() => setReason(false)} title="Save settings" reasons={['Policy update', 'Rollout change', 'Correction']} confirmLabel="Save" onConfirm={(r) => { setSettings(s); addAudit('Changed platform settings', 'Settings', 'config', r, me.name || ME.admin); setReason(false); toast('Saved and audited') }} />} footer={<Button full size="lg" onClick={() => setReason(true)}>Save changes</Button>}>
      <Section title="Time rules">
        <Card className="space-y-3">
          <div className="flex gap-3"><Input label="Renewal grace (days)" inputMode="numeric" value={String(s.graceDays)} onChange={(e) => setS({ ...s, graceDays: +e.target.value.replace(/\D/g, '') })} hint="Confirmed: 3" /><Input label="Completion response (days)" inputMode="numeric" value={String(s.completionDays)} onChange={(e) => setS({ ...s, completionDays: +e.target.value.replace(/\D/g, '') })} hint="Confirmed: 7" /></div>
          <p className="text-xs text-ink-500">Booking response deadlines are configured per category (CFG-03). All instants are stored in UTC; local service times carry an explicit timezone.</p>
        </Card>
      </Section>
      <Section title="Feature availability"><Card className="space-y-1">{Object.entries({ booking: 'Service booking', rfq: 'RFQ & quotations', sponsored: 'Sponsored placements', hindi: 'Hindi', instant: 'Instant confirmation (needs reliable availability)' }).map(([k, l]) => <Toggle key={k} label={l} on={s.features[k]} onChange={(v) => setS({ ...s, features: { ...s.features, [k]: v } })} />)}</Card></Section>
      <Section title="Notification channels & providers (CFG-07)"><Card className="space-y-1">{[['inapp', 'In-app'], ['push', 'Push'], ['email', 'Email'], ['sms', 'SMS / OTP']].map(([k, l]) => <Toggle key={k} label={l} desc={k === 'inapp' ? 'Baseline — always on' : 'Waiting for provider selection'} on={s.channels[k]} onChange={(v) => k !== 'inapp' && setS({ ...s, channels: { ...s.channels, [k]: v } })} />)}</Card></Section>
      <Section title="Notification copy (CFG-10)">
        <Card className="space-y-3"><Segmented value={lang} onChange={setLang} options={[{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिन्दी' }]} /><Input textarea rows={3} value={T[lang]} readOnly hint="booking.confirmed · transactional · cannot be disabled by the user" /></Card>
      </Section>
      <Banner tone="blue" title="Providers still to select">OTP/SMS, email/push, maps/geocoding, subscription billing, file storage and malware scanning are chosen during technical discovery.</Banner>
    </Screen>
  )
}

/* ================= ANALYTICS (spec §18) ================= */
export function AdminAnalytics() {
  const { toast } = useApp()
  const [d, setD] = useState('discovery')
  const W = REPORT.weeks
  return (
    <Screen title="Analytics" back={false} right={<IconBtn label="Export" onClick={() => toast('Aggregated report exported')}><Download size={20} /></IconBtn>}>
      <Chips value={d} onChange={setD} options={[['supply', 'Supply'], ['discovery', 'Discovery'], ['booking', 'Booking'], ['rfq', 'RFQ'], ['subscription', 'Subscription'], ['trust', 'Trust & support'], ['reliability', 'Reliability']].map(([id, label]) => ({ id, label }))} />
      {d === 'supply' && (<><div className="grid grid-cols-2 gap-3"><Stat label="Eligible vendors" value="412" icon={Store} tone="emerald" delta="+6%" /><Stat label="Listing rejection" value="14%" icon={Ban} tone="rose" delta="-2%" /></div><Card className="space-y-3"><p className="text-sm font-bold">Published vendors by category</p>{REPORT.byCat.map(([k, v]) => <HBar key={k} label={k} value={v} max={REPORT.byCat[0][1]} />)}</Card><Banner tone="amber" title="Coverage gaps">Home services in Sikar and Logistics in Kota have searches but no eligible vendors.</Banner></>)}
      {d === 'discovery' && (<><div className="grid grid-cols-2 gap-3"><Stat label="Searches / wk" value="2,910" icon={Search} tone="sky" delta="+11%" /><Stat label="Zero-result rate" value="9%" icon={CircleAlert} tone="amber" delta="-1%" /><Stat label="Contact clicks" value="1,204" icon={Eye} tone="violet" delta="+8%" /><Stat label="Search → contact" value="41%" icon={Layers} tone="emerald" delta="+3%" /></div><Card><p className="mb-3 text-sm font-bold">Searches per week</p><BarChart data={W.map((w, i) => ({ label: w, value: REPORT.searches[i] }))} height={100} /></Card><p className="text-xs text-ink-500">Aggregated by default; private activity is not exposed.</p></>)}
      {d === 'booking' && (<><div className="grid grid-cols-2 gap-3"><Stat label="Requests / wk" value={REPORT.bookings[5]} icon={Layers} tone="sky" delta="+15%" /><Stat label="Accept rate" value="78%" icon={Check} tone="emerald" /><Stat label="Expired unanswered" value="9%" icon={Ban} tone="amber" /><Stat label="Issue reports" value="2.1%" icon={ShieldAlert} tone="rose" /></div><Card><p className="mb-3 text-sm font-bold">Booking requests per week</p><BarChart data={W.map((w, i) => ({ label: w, value: REPORT.bookings[i] }))} height={100} /></Card><Card className="space-y-3"><p className="text-sm font-bold">Outcomes</p><HBar label="Completed / closed" value={71} max={100} right="71%" color="bg-emerald-500" /><HBar label="Declined" value={13} max={100} right="13%" color="bg-sky-500" /><HBar label="Expired" value={9} max={100} right="9%" color="bg-amber-500" /><HBar label="Cancelled" value={7} max={100} right="7%" color="bg-rose-400" /></Card></>)}
      {d === 'rfq' && (<><div className="grid grid-cols-2 gap-3"><Stat label="RFQs / wk" value={REPORT.rfqs[5]} icon={Layers} tone="violet" delta="+14%" /><Stat label="First quote" value="5.2 h" icon={Check} tone="emerald" /><Stat label="Avg. quotes" value="3.4" icon={Users} tone="sky" /><Stat label="No-response rate" value="11%" icon={Ban} tone="amber" /></div><Card><p className="mb-3 text-sm font-bold">RFQs per week</p><BarChart data={W.map((w, i) => ({ label: w, value: REPORT.rfqs[i] }))} height={100} color="bg-violet-500" /></Card></>)}
      {d === 'subscription' && (<><div className="grid grid-cols-2 gap-3"><Stat label="Conversion" value="34%" icon={CreditCard} tone="emerald" delta="+4%" /><Stat label="Renewal failures" value="6%" icon={Ban} tone="rose" /><Stat label="Grace recovery" value="58%" icon={RotateCcw} tone="teal" /><Stat label="Churn" value="3.1%" icon={UserX} tone="amber" /></div><Card className="space-y-3"><p className="text-sm font-bold">Lead / listing usage</p><HBar label="Within lead limits" value={88} max={100} right="88%" /><HBar label="At lead limit" value={12} max={100} right="12%" color="bg-amber-500" /></Card></>)}
      {d === 'trust' && (<><div className="grid grid-cols-2 gap-3"><Stat label="Reports / wk" value="38" icon={Gavel} tone="rose" /><Stat label="Median resolution" value="1.6 d" icon={Check} tone="emerald" /><Stat label="Appeal rate" value="7%" icon={Gavel} tone="violet" /><Stat label="Repeat offenders" value="4" icon={UserX} tone="amber" /></div><p className="text-xs text-ink-500">Restricted to Support / Trust & Safety roles.</p></>)}
      {d === 'reliability' && (<><div className="grid grid-cols-2 gap-3"><Stat label="Search p95" value="612 ms" icon={Search} tone="emerald" /><Stat label="CRUD p95" value="388 ms" icon={Check} tone="emerald" /><Stat label="Uptime (30d)" value="99.7%" icon={Layers} tone="sky" /><Stat label="Webhook backlog" value="0" icon={Webhook} tone="teal" /></div><p className="text-xs text-ink-500">Targets to validate: search p95 under 800 ms, core CRUD p95 under 500 ms, 99.5% monthly availability.</p></>)}
    </Screen>
  )
}

/* ================= AUDIT LOG (spec §13, §16) ================= */
export function AuditLog() {
  const { audit } = useApp()
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  const kinds = ['all', 'verification', 'enforcement', 'publication', 'billing', 'access', 'security', 'config', 'user']
  const list = audit.filter((a) => (f === 'all' || a.kind === f) && (!q || (a.action + a.target + a.actor).toLowerCase().includes(q.toLowerCase())))
  const tone = { verification: 'teal', enforcement: 'red', publication: 'amber', billing: 'blue', access: 'purple', security: 'red', config: 'gray', user: 'amber' }
  return (
    <Screen title="Audit log">
      <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action or target" />
      <Chips value={f} onChange={setF} options={kinds.map((k) => ({ id: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      <Banner tone="blue">Reads of high-risk records are logged as well as writes. Access is limited by role and scope; entries are stored tamper-resistantly.</Banner>
      <div className="space-y-2.5">
        {list.map((a) => (
          <Card key={a.id} className="!p-3.5">
            <div className="flex items-center justify-between"><Badge tone={tone[a.kind] || 'gray'}>{a.kind}</Badge><span className="text-[11px] text-ink-400">{a.at}</span></div>
            <p className="mt-1.5 text-sm font-bold">{a.action}</p>
            <p className="text-xs text-ink-500">{a.actor} → {a.target}</p>
            {a.reason && <p className="mt-1.5 rounded-lg bg-ink-50 p-2 text-xs text-ink-700"><b>Reason:</b> {a.reason}</p>}
            <p className="mt-1 text-[10.5px] font-mono text-ink-400">corr {a.corr}</p>
          </Card>
        ))}
      </div>
    </Screen>
  )
}

/* ================= SALES AGENTS (oversight; no commission engine in R1) ================= */
export function AdminAgents() {
  const nav = useNav()
  const { agents } = useApp()
  return (
    <Screen title="Sales agents">
      <Banner tone="blue">Agents see only assigned leads and onboarding status. They can’t approve verification, publish as a vendor or override billing. Release 1 tracks registration and subscription conversion.</Banner>
      <Group>{agents.map((a, i) => <ListRow key={a.id} last={i === agents.length - 1} onClick={() => nav.go('ad_agent', { id: a.id })} icon={UserCog} tone="teal" title={a.name} subtitle={`${a.region} · ${a.leads} leads · ${a.subscribed} subscribed`} right={<StatusBadge s={a.status} />} />)}</Group>
    </Screen>
  )
}
export function AdminAgent({ params }) {
  const { agents, leads, toast, addAudit, me } = useApp()
  const a = agents.find((x) => x.id === (params.id || 'ag1'))
  const mine = leads.filter((l) => a.name === 'Neha Verma')
  const [sheet, setSheet] = useState(false)
  return (
    <Screen title={a.name} subtitle={a.region} overlay={<ReasonSheet open={sheet} onClose={() => setSheet(false)} title="Reassign leads" reasons={['Agent on leave', 'Region change', 'Performance review']} onConfirm={(r) => { addAudit('Reassigned agent leads', a.name, 'user', r, me.name || ME.admin); setSheet(false); toast('Leads reassigned') }} />}>
      <div className="grid grid-cols-3 gap-2">{[['Leads', a.leads], ['Registered', a.registered], ['Subscribed', a.subscribed]].map(([k, v]) => <Card key={k} className="!p-3 text-center"><p className="text-xl font-extrabold">{v}</p><p className="text-[11px] text-ink-500">{k}</p></Card>)}</div>
      <Card className="space-y-3"><HBar label="Lead → registered" value={a.registered} max={a.leads || 1} /><HBar label="Registered → subscribed" value={a.subscribed} max={a.registered || 1} color="bg-emerald-500" /></Card>
      {mine.length > 0 && <Section title="Assigned leads"><Group>{mine.map((l, i) => <ListRow key={l.id} last={i === mine.length - 1} icon={Store} tone="sky" title={l.name} subtitle={`${l.stage} · ${l.city}`} />)}</Group></Section>}
      <Button full variant="secondary" onClick={() => setSheet(true)}>Reassign leads</Button>
    </Screen>
  )
}

/* ================= OPEN CONFIGURATION REGISTER (spec §23) ================= */
export function AdminCfg() {
  return (
    <Screen title="Open configuration">
      <Banner tone="blue">These items don’t reopen confirmed product decisions. They’re configuration and implementation details to settle in discovery or before the dependent feature ships. The mockup uses clearly-marked sample values where it must show something.</Banner>
      <div className="space-y-2.5">{CFG.map(([id, t, o, d, st]) => (
        <Card key={id} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{id}</span><Badge tone={st === 'sample' ? 'amber' : 'gray'}>{st === 'sample' ? 'Sample in mockup' : 'Open'}</Badge></div><p className="mt-1 text-sm font-bold">{t}</p><p className="mt-0.5 text-xs text-ink-500">{d}</p><p className="mt-1.5 text-[11px] font-semibold text-brand-700">Owner: {o}</p></Card>
      ))}</div>
    </Screen>
  )
}

export function AdminMore() {
  const nav = useNav()
  const { setMe, me } = useApp()
  return (
    <Screen title="More" back={false} pad={false} right={<LangButton />}>
      <div className="space-y-4 p-4">
        <Card className="!p-4"><div className="flex items-center gap-3.5"><Avatar name={me.name || ME.admin} size={56} /><div><p className="text-base font-extrabold">{me.name || ME.admin}</p><p className="text-sm text-ink-500">Super Admin · individual account</p><Badge tone="green" className="mt-1.5"><KeyRound size={11} />MFA · session 12 min</Badge></div></div></Card>
        <Group>
          <ListRow icon={Globe} tone="sky" title="Geo rollout" subtitle="Country · state · city launch control" onClick={() => nav.go('ad_geo')} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Vendor role reviews" subtitle="Verify, reject or revoke a role" onClick={() => nav.go('ad_role_reviews')} />
          <ListRow icon={Layers} tone="teal" title="Vendor roles catalogue" subtitle="Add or retire a kind of vendor" onClick={() => nav.go('ad_role_defs')} />
          <ListRow icon={Building2} tone="teal" title="Company verification" subtitle="Business accounts opened by company owners" onClick={() => nav.go('ad_company')} />
          <ListRow icon={Layers} tone="indigo" title="Taxonomy builder" subtitle="Unlimited industries, categories, attributes" onClick={() => nav.go('ad_taxonomy')} />
          <ListRow icon={Layers} tone="indigo" title="Category workflows" subtitle="Versioned configuration" onClick={() => nav.go('ad_categories')} />
          <ListRow icon={Percent} tone="violet" title="Revenue & commission" subtitle="Subscriptions now · commission Phase 2" onClick={() => nav.go('ad_commission')} />
          <ListRow icon={CreditCard} tone="emerald" title="Plans & entitlements" onClick={() => nav.go('ad_plans')} />
          <ListRow icon={Megaphone} tone="amber" title="Sponsored campaigns" onClick={() => nav.go('ad_sponsored')} />
          <ListRow icon={Network} tone="teal" title="Sales agents" onClick={() => nav.go('ad_agents')} last />
        </Group>
        <Group>
          <ListRow icon={KeyRound} tone="violet" title="Roles & permissions" subtitle="RBAC matrix, staff scopes, revocation" onClick={() => nav.go('ad_roles')} />
          <ListRow icon={ScrollText} tone="slate" title="Audit log" onClick={() => nav.go('ad_audit')} />
          <ListRow icon={Settings} tone="slate" title="Platform settings" onClick={() => nav.go('ad_settings')} />
          <ListRow icon={Rocket} tone="teal" title="Product vision & roadmap" subtitle="MVP vs Phase 2 vs Phase 3" onClick={() => nav.go('vision')} />
          <ListRow icon={ListChecks} tone="rose" title="Open configuration register" subtitle="CFG-01 … CFG-12" onClick={() => nav.go('ad_cfg')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: null, hasVendor: false, name: '' }); nav.reset('welcome') }}>Log out</Button>
      </div>
    </Screen>
  )
}

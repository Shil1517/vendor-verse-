import { useState } from 'react'
import { Crown, Eye, Lock, Receipt, Megaphone, Gavel, Flag } from 'lucide-react'
import { Badge, Banner, Button, Card, EmptyState, Group, HBar, ListRow, Section, Sheet, Input, StatusBadge, Stat, Timeline, Toggle, cx } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { Page, SampleBadge } from './blocks.jsx'

/* Depth ported from the mobile mockup (read-only reference): subscription lifecycle with billing events,
   lead and listing usage, moderation cases and appeals, and agent conversion performance. */

const num = (x) => (x === 'Unlimited' || x == null ? Infinity : Number(x))
export const subOf = (v) => v?.sub || { plan: v?.plan || 'Free', status: v?.plan && v.plan !== 'Free' ? 'active' : 'none', paidUntil: '14 Nov 2026', renews: '14 Nov 2026', autoRenew: true, leads: 42, grace: null, pending: null }
/* A listing is public only while it is approved, not paused, and the subscription allows it. Computed, never stored. */
export const isPublic = (l, sub) => l.status === 'approved' && !l.paused && ['active', 'grace', 'cancelled'].includes(sub.status)
export const blocker = (l, sub) => (l.status !== 'approved' ? 'Waiting for content review' : l.paused ? 'Paused by you' : !['active', 'grace', 'cancelled'].includes(sub.status) ? 'Subscription is not active' : null)

/* usage cards used by v_sub and v_listings (F-SUB-05) */
export function UsageMeter({ compact }) {
  const { me, vendor, listings, settings } = useApp()
  const nav = useNav()
  const v = vendor(me.vendorId)
  const sub = subOf(v)
  const plan = settings.plans.find((p) => p.name === sub.plan) || settings.plans[0]
  const leadMax = num(plan.leads)
  const mine = listings.filter((l) => l.vendorId === v?.id && l.status !== 'draft')
  const pub = mine.filter((l) => isPublic(l, sub)).length
  const listMax = num(plan.listings)
  const pct = (a, m) => (m === Infinity ? 8 : Math.min(100, Math.round((a / m) * 100)))
  const near = leadMax !== Infinity && sub.leads / leadMax >= 0.8
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <Card className="!p-3.5"><p className="text-xs text-ink-500">Lead usage</p><p className="text-xl font-extrabold">{sub.leads}<span className="text-sm font-semibold text-ink-400">/{leadMax === Infinity ? '∞' : leadMax}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100"><div className={cx('h-full rounded-full', near ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${pct(sub.leads, leadMax)}%` }} /></div><p className="mt-1"><SampleBadge /></p></Card>
      <Card className="!p-3.5"><p className="text-xs text-ink-500">Public listings</p><p className="text-xl font-extrabold">{pub}<span className="text-sm font-semibold text-ink-400">/{listMax === Infinity ? '∞' : listMax}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct(pub, listMax)}%` }} /></div><p className="mt-1 text-[11px] text-ink-400">{mine.length} submitted</p></Card>
    </div>
    {near && <Banner tone="amber" title="You are close to your lead limit" action={!compact && <Button size="sm" onClick={() => nav.go('v_plans')}>See plans</Button>}>Genuine customer enquiries still reach you at the limit. You will see usage and upgrade options, never a silent block.</Banner>}
  </div>
}

/* ============ F-SUB-02 subscription lifecycle with billing events (v_sub) ============ */
export function Subscription() {
  const nav = useNav()
  const { me, vendor, patchVendor, listings, subEvents, setSubEvents, addAudit, notify, toast, settings } = useApp()
  const v = vendor(me.vendorId)
  const [cancelOpen, setCancelOpen] = useState(false)
  if (!v) return <Page title="Subscription"><EmptyState title="No vendor organisation" /></Page>
  const sub = subOf(v)
  const plan = settings.plans.find((p) => p.name === sub.plan) || settings.plans[0]
  const setSub = (changes) => patchVendor(v.id, { sub: { ...sub, ...changes }, plan: changes.plan || sub.plan })
  const tone = { active: 'green', grace: 'amber', expired: 'red', cancelled: 'blue', none: 'gray' }[sub.status]
  const meta = {
    active: ['Active', `Paid until ${sub.paidUntil}. ${sub.autoRenew ? `Renews ${sub.renews}.` : 'Auto-renew is off.'}`],
    grace: ['Grace period', `Payment failed. Listings stay visible until ${sub.grace || '3 days after the failure'}. Pay now to avoid being hidden.`],
    expired: ['Expired', 'Public listings, new enquiries and sponsored placements are off. Your data and conversations are kept.'],
    cancelled: ['Auto-renew off', `You stay eligible until ${sub.paidUntil}, subject to the other checks.`],
    none: ['No paid plan', 'Free accounts can browse and message but cannot publish public listings.'],
  }[sub.status]
  const log = (ev, res, tn) => setSubEvents((e) => [{ id: 'e' + Date.now(), vendorId: v.id, ev, at: 'Just now', res, tone: tn }, ...e])
  const sim = (kind) => {
    if (kind === 'pay') { setSub({ status: 'active', paidUntil: '14 Dec 2026', renews: '14 Dec 2026', autoRenew: true, grace: null }); log('Payment successful', 'Paid period active. Listings republish only where every gate passes.', 'green'); addAudit('Billing: payment confirmed', v.name, 'financial'); toast('Payment confirmed') }
    if (kind === 'fail') { setSub({ status: 'grace', grace: '22 Oct 2026' }); log('Renewal failed', '3-day grace period started. Listings stay visible.', 'amber'); notify('vendor', 'Renewal failed: grace period', 'Visible until 22 Oct 2026. Update your payment method.', 'payment') }
    if (kind === 'expire') { setSub({ status: 'expired' }); log('Grace expired unpaid', 'Listings hidden, new enquiries stopped, sponsored removed. Data kept.', 'red'); addAudit('Subscription expired after grace', v.name, 'financial'); notify('vendor', 'Subscription expired', 'Public listings are hidden until you renew.', 'payment') }
    if (kind === 'cancel') { setSub({ status: 'cancelled', autoRenew: false }); log('Auto-renew cancelled', `Eligible until ${sub.paidUntil}`, 'blue') }
    if (kind === 'dup') { log('Webhook evt_9930 duplicate', 'Ignored (idempotent). No second extension or notification.', 'gray'); toast('Duplicate event ignored. Nothing changed.') }
  }
  const mine = listings.filter((l) => l.vendorId === v.id && l.status === 'approved')
  return <Page title="My subscription" subtitle={`${sub.plan} plan`} right={<button className="px-2 text-brand-700" aria-label="Plans" onClick={() => nav.go('v_plans')}><Crown size={20} /></button>}>
    <Card className={cx('!p-5', { green: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-sky-50', gray: 'bg-ink-100' }[tone])}>
      <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Current plan</p><p className="text-2xl font-extrabold">{plan.name}</p></div><StatusBadge s={sub.status === 'cancelled' ? 'sub_cancelled' : sub.status === 'none' ? 'inactive' : sub.status} /></div>
      <p className="mt-2 text-sm text-ink-700"><b>{meta[0]}.</b> {meta[1]}</p>
      {['grace', 'expired', 'none'].includes(sub.status) && <Button className="mt-3" full onClick={() => nav.go('v_plans')}>{sub.status === 'none' ? 'Choose a plan' : 'Renew now'}</Button>}
    </Card>
    <UsageMeter compact />
    {sub.pending && <Banner tone="amber" title={`Downgrade to ${sub.pending} scheduled`} action={<Button size="sm" variant="secondary" onClick={() => { setSub({ pending: null }); toast('Downgrade cancelled') }}>Keep {sub.plan}</Button>}>It starts on {sub.paidUntil}. Until then you keep everything on your current plan.</Banner>}
    <Banner tone="blue" title="How leads are counted">Listing views, contact clicks and enquiries count toward usage (counting rules are open: CFG). At the limit, genuine enquiries still reach you.</Banner>
    <Group>
      <ListRow icon={Crown} tone="rose" title="Compare and change plan" onClick={() => nav.go('v_plans')} />
      <ListRow icon={Megaphone} tone="amber" title="Sponsored visibility" subtitle="Sold separately, always labelled" onClick={() => nav.go('v_sponsor')} />
      <ListRow icon={Receipt} tone="sky" title="Tax invoices and fees" onClick={() => nav.go('invoice')} last />
    </Group>
    <Card className="space-y-2"><Toggle label="Auto-renew" desc={sub.autoRenew ? `Renews ${sub.renews}` : 'Off: plan ends on the paid-until date'} on={sub.autoRenew} onChange={(on) => { if (!on && sub.autoRenew) return setCancelOpen(true); setSub({ autoRenew: on, status: on && sub.status === 'cancelled' ? 'active' : sub.status }); log(on ? 'Auto-renew turned on' : 'Auto-renew off', on ? 'Plan will renew' : 'Plan ends at period end', on ? 'green' : 'blue') }} /></Card>
    <p className="text-xs text-ink-500"><b>Refunds:</b> the refund rules are open (CFG). Existing bookings, accepted quotations and conversations stay accessible whatever your plan status.</p>
    <Section title="Mockup: billing provider events">
      <Card className="space-y-3 !bg-ink-100 shadow-none">
        <p className="text-xs text-ink-600">A success redirect is never proof of payment. Only authenticated, idempotent provider callbacks change state. Try them and watch your listings recompute.</p>
        <div className="flex flex-wrap gap-2">{[['pay', 'Payment succeeds'], ['fail', 'Renewal fails'], ['expire', 'Grace expires'], ['cancel', 'Cancel auto-renew'], ['dup', 'Duplicate webhook']].map(([k, l]) => <Button key={k} size="sm" variant="secondary" onClick={() => sim(k)}>{l}</Button>)}</div>
      </Card>
      <Group className="mt-2">{mine.map((l, i) => { const b = blocker(l, sub); return <ListRow key={l.id} icon={b ? Lock : Eye} tone={b ? 'rose' : 'emerald'} title={l.title} subtitle={b ? `Hidden: ${b}` : 'Public'} last={i === mine.length - 1} /> })}</Group>
    </Section>
    <Section title="Billing events"><Card><Timeline steps={subEvents.filter((e) => e.vendorId === v.id).map((e) => ({ label: e.ev, at: e.at, note: e.res, done: true }))} /></Card></Section>
    <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Turn off auto-renew?" footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>Keep it on</Button><Button variant="danger" className="flex-1" onClick={() => { sim('cancel'); setCancelOpen(false) }}>Turn off</Button></div>}>
      <p className="text-sm text-ink-600">You keep your plan until {sub.paidUntil}. After that, public listings are hidden unless you renew. Your data stays.</p>
    </Sheet>
  </Page>
}

/* ============ F-TRU-04 moderation and appeals (v_cases) ============ */
export function VendorCases() {
  const nav = useNav()
  const { me, vendor, disputes, patchDispute, appeals, setAppeals, addAudit, toast } = useApp()
  const v = vendor(me.vendorId)
  const mine = disputes.filter((c) => c.against === v?.name)
  const myAppeals = appeals.filter((a) => a.by === v?.name)
  const [ap, setAp] = useState(null)
  const [txt, setTxt] = useState('')
  const submit = () => {
    setAppeals((a) => [{ id: 'AP-' + (32 + a.length), caseId: ap.id, by: v.name, decision: ap.outcome || 'Restriction', text: txt.trim(), status: 'open', at: 'Just now' }, ...a])
    patchDispute(ap.id, (c) => ({ status: 'appealed', actions: [...(c.actions || []), { by: v.name, action: 'Appeal filed', at: 'Just now' }] }))
    addAudit('Appeal filed', ap.id, 'approval')
    toast('Appeal sent to a human reviewer'); setAp(null); setTxt('')
  }
  return <Page title="Moderation and appeals" subtitle="Cases about you, decisions you can appeal">
    <Banner tone="blue">Enforcement is proportionate: warnings, content or listing restrictions, or suspension depending on severity and repetition. You see the reason and can appeal where it is safe to explain.</Banner>
    <Section title="Cases about you"><div className="space-y-2.5">
      {mine.map((c) => <Card key={c.id} className="!p-3.5">
        <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{c.id}</span><StatusBadge s={c.status} /></div>
        <p className="mt-1 text-sm font-bold">{c.title}</p><p className="text-xs text-ink-500">{c.kind} · {c.created}</p>
        {c.outcome && <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-700"><b>Decision:</b> {c.outcome}</p>}
        <div className="mt-2 flex gap-2"><Button size="sm" variant="ghost" onClick={() => nav.go('ad_case', { id: c.id })}>Timeline</Button>{c.status === 'decided' && <Button size="sm" variant="secondary" icon={Gavel} onClick={() => setAp(c)}>Appeal</Button>}</div>
      </Card>)}
      {!mine.length && <Card><p className="py-4 text-center text-sm text-ink-500">No cases against you</p></Card>}
    </div></Section>
    <Section title="Your appeals"><div className="space-y-2.5">
      {myAppeals.map((a) => <Card key={a.id} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{a.id} · {a.caseId}</span><StatusBadge s={a.status === 'open' ? 'appealed' : a.status === 'upheld' ? 'upheld' : 'appeal_rejected'} /></div><p className="mt-1 text-xs text-ink-600">{a.text}</p>{a.reply && <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-700"><b>Reviewer:</b> {a.reply}</p>}</Card>)}
      {!myAppeals.length && <Card><p className="py-4 text-center text-sm text-ink-500">No appeals yet</p></Card>}
    </div></Section>
    <Button full variant="secondary" icon={Flag} onClick={() => nav.go('c_report', { kind: 'appeal' })}>Contact support</Button>
    <Sheet open={!!ap} onClose={() => setAp(null)} title="Appeal this decision" footer={<Button full disabled={txt.trim().length < 15} onClick={submit}>Send appeal</Button>}>
      <p className="text-sm text-ink-600">A human reviewer, not the person who decided, will look again. Explain what the decision missed (at least 15 characters).</p>
      <Input textarea rows={4} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="What should the reviewer know?" />
    </Sheet>
  </Page>
}

/* ============ admin side of appeals (used by ad_reviews) ============ */
export function AppealQueue() {
  const { appeals, patchAppeal, patchDispute, addAudit, toast } = useApp()
  const open = appeals.filter((a) => a.status === 'open')
  const decide = (a, status) => {
    patchAppeal(a.id, { status, reply: status === 'upheld' ? 'Decision reversed after review.' : 'Original decision stands after review.' })
    patchDispute(a.caseId, { status: status === 'upheld' ? 'resolved' : 'decided' })
    addAudit(`Appeal ${status}`, a.caseId, 'approval'); toast(`Appeal ${status}`)
  }
  return <Section title="Vendor appeals">{open.length === 0 ? <Card><p className="py-3 text-center text-sm text-ink-500">No appeals waiting</p></Card> : <div className="space-y-2">{open.map((a) => <Card key={a.id}><div className="flex items-center justify-between"><p className="text-sm font-bold">{a.id} · {a.by}</p><Badge tone="amber">Open</Badge></div><p className="mt-1 text-xs text-ink-500">Case {a.caseId}: {a.decision}</p><p className="mt-1 text-sm text-ink-700">{a.text}</p><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => decide(a, 'upheld')}>Uphold appeal</Button><Button size="sm" variant="secondary" onClick={() => decide(a, 'rejected')}>Keep decision</Button></div></Card>)}</div>}</Section>
}

/* ============ F-AGT-05 conversion performance (a_perf, a tab) ============ */
export function AgentPerformance() {
  const nav = useNav()
  const { leads, vendors } = useApp()
  const total = leads.length || 1
  const reg = leads.filter((l) => ['Registered/Submitted', 'Approved/Converted'].includes(l.stage)).length
  const appr = leads.filter((l) => l.stage === 'Approved/Converted').length
  const subd = leads.filter((l) => l.vendorId && subOf(vendors.find((v) => v.id === l.vendorId)).status === 'active' && l.stage === 'Approved/Converted').length
  const risk = leads.filter((l) => l.vendorId && ['grace', 'expired'].includes(subOf(vendors.find((v) => v.id === l.vendorId)).status))
  const pc = (a, b) => `${Math.round((a / (b || 1)) * 100)}%`
  return <Page title="Performance" subtitle="Conversion of your own leads" back={false}>
    <div className="vv-agent-performance-kpis grid grid-cols-3 gap-2">{[['Registered', reg], ['Approved', appr], ['Subscribed', subd]].map(([a, b]) => <Stat key={a} label={a} value={b} />)}</div>
    <Card className="vv-agent-performance-card space-y-3"><p className="text-sm font-bold">Conversion</p><HBar label="Leads to registered" value={reg} max={total} right={pc(reg, total)} /><HBar label="Registered to approved" value={appr} max={reg || 1} right={pc(appr, reg)} /><HBar label="Approved to subscribed" value={subd} max={appr || 1} right={pc(subd, appr)} /></Card>
    {risk.length > 0 && <Section title="Renewals at risk"><Group>{risk.map((l, i) => <ListRow key={l.id} title={l.name} subtitle={`${l.contact} · ${l.city}`} onClick={() => nav.go('a_lead', { id: l.id })} last={i === risk.length - 1} />)}</Group></Section>}
    <Group><ListRow title="Commissions" subtitle="Model not decided yet (O-03)" onClick={() => nav.go('a_earnings')} last /></Group>
    <Banner tone="blue" title="Scope of your access">You see conversion for your own leads only. Subscription status helps vendors renew. You cannot change billing, approve verification or read customer transactions.</Banner>
  </Page>
}

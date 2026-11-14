import { useState } from 'react'
import { Building2, Search, ClipboardList, ShoppingBag, Users, MessageCircle, Package, FileText } from 'lucide-react'
import { Badge, Banner, Button, Card, Checkbox, Chips, EmptyState, Group, Input, ListRow, Section, Select, Stepper, StatusBadge, Toggle } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { ME } from '../data.jsx'
import { Page, Facts, Links, SampleBadge } from './blocks.jsx'

/* ============ F-BIZ-01 business account (D-005): separate account type ============ */

const BIZ_STEPS = ['Company', 'Owner', 'Address', 'Registration', 'Documents', 'Review']
/* ============ F-BIZ-05 vendor as buyer ============ */

export function BuyerHome() {
  return <Page title="Buy from other vendors" subtitle="Find a supplier, request a bulk quote, order" back={false}>
    <Banner tone="blue">You are buying in Customer mode. Switch back to Vendor mode any time from the header.</Banner>
    <Links items={[[Search, 'Find a supplier', 'Search suppliers and manufacturers', 'vb_explore'], [ClipboardList, 'Bulk RFQ', 'Describe goods and quantity', 'vb_rfq'], [ShoppingBag, 'Compare quotations', 'Side by side, one winner', 'vb_compare'], [Package, 'Purchase orders', 'Create and track', 'vb_order']]} />
  </Page>
}

/* ============ team (F-BIZ-06, Phase 2) ============ */
export function Team() {
  return <Page title="Team" subtitle="Roles, approvals, spending limits" phase2>
    <Group>{[['Owner', 'You', 'Full access'], ['Procurement lead', 'Invite', 'Can raise RFQs and POs up to a limit'], ['Accountant', 'Invite', 'View invoices only']].map(([a, b, c], i) => <ListRow key={a} icon={Users} title={a} subtitle={c} right={<Badge tone="gray">{b}</Badge>} last={i === 2} />)}</Group>
  </Page>
}

/* ============ subscriptions (F-SUB-01..08). Plan names only; values are samples (D-007). ============ */

export const planList = (settings) => settings.plans.filter((p) => p.active)

export function Plans() {
  const { settings, me, vendor } = useApp()
  const nav = useNav()
  const cur = vendor(me.vendorId)?.plan
  return <Page title="Plans" subtitle="Compare entitlements">
    <Banner tone="amber" title="Prices are not decided"><span>Plan names and values below are samples until CFG-01 and CFG-02 are set.</span></Banner>
    {planList(settings).map((p) => <Card key={p.id}><div className="flex items-start justify-between"><div><p className="text-lg font-extrabold">{p.name}</p><SampleBadge /></div>{cur === p.name && <Badge tone="green">Current</Badge>}</div><p className="mt-2 text-sm text-ink-600">{p.listings} listings · {p.leads} leads / month</p><Button className="mt-3" variant={cur === p.name ? 'secondary' : 'primary'} disabled={cur === p.name} onClick={() => nav.go('v_checkout', { plan: p.name })}>{cur === p.name ? 'Current plan' : `Choose ${p.name}`}</Button></Card>)}
  </Page>
}

const SUB_STATES = ['Active', 'Renewal upcoming', 'Payment failed (3-day grace)', 'Expired', 'Cancelled — ends at period end', 'Restored']
export function Checkout({ params = {} }) {
  const { me, patchVendor, toast } = useApp()
  const nav = useNav()
  const [ok, setOk] = useState(false)
  const plan = params.plan || 'Growth'
  return <Page title="Plan checkout" subtitle={plan}>
    <Banner tone="amber" title="Values shown are samples">Amounts appear here once prices are decided (CFG-01, CFG-02).</Banner>
    <Facts rows={[['Plan fee', 'Sample'], ['Proration credit', 'Unused days on current plan'], ['Tax', 'Calculated by your country (CFG)'], ['Total', 'Shown at checkout']]} />
    <Banner tone="blue">Payment of the subscription is handled outside this demo. No money moves here.</Banner>
    {ok ? <Banner tone="green" title="Plan changed">{plan} is active. A tax invoice is available.</Banner> : <Button full onClick={() => { patchVendor(me.vendorId, { plan }); setOk(true); toast(`${plan} activated`) }}>Confirm {plan}</Button>}
    {ok && <Button full variant="secondary" onClick={() => nav.go('invoice')}>View tax invoice</Button>}
  </Page>
}

export function CheckoutDown({ params = {} }) {
  const { toast } = useApp()
  const nav = useNav()
  return <Page title="Downgrade" subtitle={`To ${params.plan || 'Starter'} at period end`}>
    <Banner tone="blue" title="Scheduled, not immediate">You keep your current plan until the period ends. Listings above the new limit are paused then, not deleted.</Banner>
    <Button full onClick={() => { toast('Downgrade scheduled'); nav.back() }}>Schedule downgrade</Button>
  </Page>
}

export function Sponsor() {
  const { toast } = useApp()
  const [on, setOn] = useState(false)
  return <Page title="Sponsored visibility" subtitle="Promote a listing">
    <Banner tone="blue" title="Always labelled">Sponsored results show a "Sponsored" label and never replace verification or ratings.</Banner>
    <Select label="Listing" value="l1" onChange={() => {}} options={[{ value: 'l1', label: 'Havells 1.5 sq mm FR Copper Wire' }, { value: 'l3', label: 'Bosch GSB 500 Impact Drill' }]} />
    <Select label="City" value="Jaipur" onChange={() => {}} options={['Jaipur', 'Ajmer', 'Sikar', 'Delhi NCR']} />
    <p className="text-xs text-ink-500">Campaign price is open (CFG). Advanced bidding and ad analytics are Phase 3.</p>
    <Button full onClick={() => { setOn(!on); toast(on ? 'Campaign paused' : 'Campaign submitted for review') }}>{on ? 'Pause campaign' : 'Submit campaign'}</Button>
  </Page>
}
export function AdminSponsored() {
  const { toast } = useApp()
  const [rows, setRows] = useState([{ id: 'sp1', vendor: 'Sharma Electricals & Hardware', city: 'Jaipur', status: 'pending' }, { id: 'sp2', vendor: 'BrightSpark Home Services', city: 'Jaipur', status: 'live' }])
  return <Page title="Sponsored campaigns" subtitle="Review and monitor">
    {rows.map((r) => <Card key={r.id}><div className="flex items-center justify-between"><p className="text-sm font-bold">{r.vendor}</p><StatusBadge s={r.status === 'pending' ? 'pending' : 'live'} /></div><p className="text-xs text-ink-500">{r.city}</p>{r.status === 'pending' && <Button className="mt-2" size="sm" onClick={() => { setRows(rows.map((x) => (x.id === r.id ? { ...x, status: 'live' } : x))); toast('Campaign approved') }}>Approve</Button>}</Card>)}
  </Page>
}

export function AdminPlans() {
  const { settings, setSettings, addAudit, toast } = useApp()
  return <Page title="Plans and entitlements" subtitle="Values are samples until CFG-01 / CFG-02" footer={<Button full onClick={() => { addAudit('Edited plan entitlements', 'Plans', 'setting'); toast('Entitlements saved') }}>Save</Button>}>
    {settings.plans.map((p) => <Card key={p.id} className="space-y-3"><div className="flex items-center justify-between"><p className="font-bold">{p.name}</p><SampleBadge /></div><div className="flex gap-3"><Input label="Listings" value={String(p.listings)} onChange={(e) => setSettings({ ...settings, plans: settings.plans.map((x) => (x.id === p.id ? { ...x, listings: e.target.value } : x)) })} /><Input label="Leads / month" value={String(p.leads)} onChange={(e) => setSettings({ ...settings, plans: settings.plans.map((x) => (x.id === p.id ? { ...x, leads: e.target.value } : x)) })} /></div></Card>)}
  </Page>
}

export function AdminSubs() {
  const { vendors } = useApp()
  const nav = useNav()
  const rows = vendors.filter((v) => v.status === 'approved').slice(0, 8)
  return <Page title="Subscriptions" subtitle="Monitoring and billing investigation">
    <Group>{rows.map((v, i) => <ListRow key={v.id} title={v.name} subtitle={`${v.plan || 'Free'} · ${i % 4 === 2 ? 'Payment failed · grace' : 'Active'}`} right={i % 4 === 2 ? <Badge tone="amber">Grace</Badge> : <Badge tone="green">Active</Badge>} onClick={() => nav.go('ad_sub', { id: v.id })} last={i === rows.length - 1} />)}</Group>
  </Page>
}
export function AdminSub({ params = {} }) {
  const { vendor, toast, addAudit } = useApp()
  const v = vendor(params.id || 'v-me')
  return <Page title={v.name} subtitle="Billing events">
    <Facts rows={[['Plan', v.plan || 'Free'], ['State', 'Active'], ['Grace period', '3 days on payment failure']]} />
    <Section title="Events"><Card><div className="space-y-2 text-sm">{['Plan activated', 'Renewal reminder sent', 'Invoice generated'].map((e, i) => <p key={e} className="flex justify-between"><span>{e}</span><span className="text-ink-400">{20 - i * 10} Oct</span></p>)}</div></Card></Section>
    <Button full variant="secondary" onClick={() => { addAudit('Opened billing investigation', v.name, 'financial'); toast('Investigation opened') }}>Open billing investigation</Button>
  </Page>
}

export function Invoice() {
  return <Page title="Tax invoice" subtitle="INV-2026-0142">
    <Facts rows={[['Billed to', 'Sharma Electricals & Hardware'], ['GSTIN', '08ABCPS1234F1Z5'], ['Item', 'Subscription — plan fee (sample)'], ['Tax', 'Shown by country on the real invoice'], ['Reverse charge', 'Applies for foreign buyers where required']]} />
    <Banner tone="gray">Amounts appear once plan prices are decided.</Banner>
  </Page>
}
export function Fees() {
  return <Page title="Fees explained" subtitle="What you pay and why">
    <Group>{[['Customers', 'Free to browse, book, request quotes. Pay vendors directly.'], ['Vendors', 'Plan subscription (tiers, values open). Sponsored visibility is optional.'], ['Platform commission', 'Phase 2 — only when checkout and escrow launch.']].map(([a, b], i) => <ListRow key={a} title={a} subtitle={b} last={i === 2} />)}</Group>
  </Page>
}

export { BizEligibility, BizRegister, BizCompany, BizHome, BizServices, BizMessages, BizMore, BizNetwork, BizProfile, AdminCompany } from './biz-screens.jsx'

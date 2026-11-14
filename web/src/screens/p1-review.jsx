import { useNav } from '../nav.jsx'
import { Badge, Button, Card, Group, ListRow, Section } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { Page } from './blocks.jsx'

/* F-MCK-01: vision, flows and the five required demo journeys (same as mobile J1 to J5). */
export const JOURNEYS = [
  { id: 'J1', t: 'Customer books a local service', who: 'Customer', role: 'customer', steps: [['Search and filter near you', 'c_explore'], ['Open provider profile', 'c_vendor'], ['Choose service and time', 'c_book_new'], ['Booking status', 'c_booking']] },
  { id: 'J2', t: 'Business requests bulk manufacturer quotations', who: 'Business buyer', role: 'customer', steps: [['Search suppliers and manufacturers', 'c_explore_suppliers'], ['Product with MOQ and tiers', 'c_product'], ['Submit a goods RFQ', 'c_rfq_goods'], ['Compare quotations', 'c_rfq_compare'], ['Purchase order', 'c_order']] },
  { id: 'J3', t: 'Vendor registers and manages products / services', who: 'Vendor', role: 'vendor', steps: [['Choose vendor type', 'v_register_type'], ['Verification evidence', 'v_verify'], ['Publication checklist', 'v_listing_gate'], ['My listings', 'v_listings']] },
  { id: 'J4', t: 'Admin creates a category and approves a vendor', who: 'Admin', role: 'admin', steps: [['Create category', 'ad_cat_new'], ['Configure fields and rules', 'ad_category'], ['Taxonomy builder', 'ad_taxonomy'], ['Review vendor', 'ad_vendors']] },
  { id: 'J5', t: 'Vendor-to-vendor procurement', who: 'Vendor owner in Customer mode', role: 'customer', steps: [['Switch to Customer mode, open Buy', 'vb_home'], ['Find a supplier', 'vb_explore'], ['Send bulk RFQ', 'vb_rfq'], ['Compare and accept quotes', 'vb_compare'], ['Track the purchase order', 'vb_order']] },
]

export function Vision() {
  return <Page title="Vision" subtitle="What VendorVerse is">
    <Card className="space-y-2 text-sm text-ink-700"><p>One marketplace where customers book services, request quotations and order goods, and where vendors, suppliers and companies get found by verified trust.</p><p>Web, Android and iOS launch together and behave the same (decision D-013).</p></Card>
    <Section title="Phase 1 at a glance"><Group>{['Services, RFQs, purchase orders and contracts', 'Direct payment between parties; invoice or offline terms for contracts', 'Verified vendors, business accounts and sales agents', 'India launch cities, English and Hindi'].map((t, i) => <ListRow key={t} title={t} last={i === 3} />)}</Group></Section>
    <Section title="Later"><Group><ListRow title="Phase 2" subtitle="Checkout and escrow, wallet, payouts, more countries and currencies" right={<Badge tone="purple">Phase 2</Badge>} /><ListRow title="Phase 3" subtitle="Cart checkout, enterprise procurement, AI search, field tools" right={<Badge tone="gray">Phase 3</Badge>} last /></Group></Section>
  </Page>
}

export function Flows() {
  const nav = useNav()
  const flows = [['Booking', ['Requested', 'Confirmed', 'In progress', 'Completed', 'Closed'], 'c_book_new'], ['RFQ', ['Open', 'Quotes received', 'Accepted', 'Work order'], 'c_rfq_new'], ['Purchase order', ['Placed', 'Confirmed', 'Shipped', 'Delivered'], 'c_orders'], ['Contract', ['Proposed', 'Countered', 'Accepted', 'Milestones'], 'c_contract']]
  return <Page title="Flows" subtitle="Workflow states, one vocabulary">
    {flows.map(([n, s, to]) => <Card key={n} onClick={() => nav.go(to)}><p className="text-sm font-bold">{n}</p><div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">{s.map((x, i) => <span key={x} className="flex items-center gap-1.5"><Badge tone="teal">{x}</Badge>{i < s.length - 1 && <span className="text-ink-300">→</span>}</span>)}</div></Card>)}
  </Page>
}

export function JourneysPick() {
  const nav = useNav()
  return <Page title="Demo journeys" subtitle="Pick one to walk through">
    <Group>{JOURNEYS.map((j, i) => <ListRow key={j.id} title={`${j.id} · ${j.t}`} subtitle={`${j.who} · ${j.steps.length} steps`} onClick={() => nav.go('journeys', { id: j.id })} last={i === JOURNEYS.length - 1} />)}</Group>
  </Page>
}

export function Journeys({ params = {} }) {
  const nav = useNav()
  const { me, setMe, toast } = useApp()
  const j = JOURNEYS.find((x) => x.id === (params.id || 'J1')) || JOURNEYS[0]
  const open = (screen) => {
    if (me.role !== j.role) { setMe({ ...me, role: j.role, loggedIn: true, guest: false, name: j.who }); toast(`Signed in as ${j.who} for this demo`) }
    nav.go(screen)
  }
  return <Page title={j.t} subtitle={`${j.id} · ${j.who}`}>
    <Group>{j.steps.map(([label, screen], i) => <ListRow key={label} title={`${i + 1}. ${label}`} subtitle={screen} onClick={() => open(screen)} last={i === j.steps.length - 1} />)}</Group>
    <Button full variant="secondary" onClick={() => nav.go('journeys_pick')}>All journeys</Button>
  </Page>
}

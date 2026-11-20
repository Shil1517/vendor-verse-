/*
 * Real-API vendor dashboard (F-VND-10), used instead of the seed-data dashboard when
 * VITE_API_BASE_URL is set (see the registry, `live(...)`).
 *
 * Every number comes from an API the backend has today: the vendor's listings, the RFQs
 * sent to it, its own quotes on those RFQs and its booking requests. Nothing is invented:
 *  - there is no messaging or enquiry-analytics API yet, so the unread-messages tile and the
 *    "customer enquiries" trend are not shown (they stay on the seed-data dashboard);
 *  - the RFQ funnel is built from the vendor's own quotes, looked up for its 25 most recently
 *    updated RFQs, and says so when there are more.
 */
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, BarChart3, CalendarCheck, Check, ChevronRight, FileText, Package, Plus, Send, ShieldCheck, Store } from 'lucide-react'
import { Button, EmptyState, Screen } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { ErrorBox, Loading, useLoad } from './remote-discovery.jsx'
import { VendorWorkspace } from './vendor.jsx'

const QUOTE_LOOKUP_LIMIT = 25
const LISTING_STATUS = [
  ['approved', 'Live'], ['pending_review', 'In review'], ['changes_requested', 'Changes requested'],
  ['draft', 'Draft'], ['paused', 'Paused'], ['rejected', 'Rejected'], ['unpublished', 'Unpublished'],
]

/** Loads the core data the dashboard shows; fails with the first error so nothing is shown half-true.
 *  Quote lookups (one request per RFQ) are loaded afterwards so the page can paint first. */
async function loadDashboard(country) {
  const mine = await authService.listMyVendors()
  if (!mine.ok) return mine
  const vendor = mine.vendors?.[0] || null
  if (!vendor) return { ok: true, vendor: null }
  const [listings, rfqs, bookings, categories] = await Promise.all([
    authService.listVendorListings(vendor.id),
    authService.listVendorRfqs(vendor.id),
    authService.listVendorBookings(vendor.id),
    authService.listCategories({ countryCode: country }),
  ])
  for (const r of [listings, rfqs, bookings]) if (!r.ok) return r
  return {
    ok: true,
    vendor,
    listings: listings.listings,
    rfqs: rfqs.rfqs,
    bookings: bookings.bookings,
    categoryNames: new Map((categories.ok ? categories.categories : []).map((c) => [c.categoryId, c.name])),
    lookupCapped: rfqs.rfqs.length > QUOTE_LOOKUP_LIMIT,
  }
}

export function RemoteVendorDashboard() {
  const nav = useNav()
  const app = useApp()
  const country = (app.locale ?? app.loc ?? {}).country || 'IN'
  const me = app.me || {}
  const load = useCallback(() => loadDashboard(country), [country])
  const dash = useLoad(load, [load])
  const [quotes, setQuotes] = useState({ ready: false, map: new Map() })
  useEffect(() => {
    const d0 = dash.data
    if (!d0?.vendor) return undefined
    let live = true
    const looked = d0.rfqs.slice(0, QUOTE_LOOKUP_LIMIT)
    Promise.all(looked.map((rfq) => authService.listRfqQuotes(rfq.id))).then((results) => {
      if (!live) return
      const map = new Map(looked.map((rfq, i) => [rfq.id, results[i].ok ? results[i].quotes.filter((q) => q.vendorId === d0.vendor.id && q.state !== 'withdrawn') : []]))
      setQuotes({ ready: true, map })
    })
    return () => { live = false }
  }, [dash.data])

  const firstName = me.name?.split(/\s+/)[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  if (dash.loading && !dash.data) return <VendorWorkspace><div className="vx-perf-shell vx-vendor-dash vx-dash-skeleton" aria-busy="true" aria-label="Loading dashboard"><div className="vx-sk vx-sk-head" /><div className="vx-perf-grid stats-grid vx-kpi-strip">{[0, 1, 2, 3].map((i) => <div key={i} className="vx-sk vx-sk-kpi" />)}</div><div className="vx-perf-grid wide-grid"><div className="vx-sk vx-sk-card" /><div className="vx-sk vx-sk-card" /></div></div></VendorWorkspace>
  if (dash.error) return <VendorWorkspace><div className="vx-perf-shell vx-vendor-dash"><ErrorBox message={dash.error} onRetry={dash.reload} /></div></VendorWorkspace>
  const d = dash.data
  if (!d?.vendor) return <VendorWorkspace><Screen title="Vendor" back={false}><EmptyState icon={Store} title="Complete your registration" action={<Button onClick={() => nav.go('v_register')}>Start</Button>} /></Screen></VendorWorkspace>

  const { vendor, listings, rfqs, bookings, categoryNames } = d
  const myQuotes = quotes.map
  const quotesReady = quotes.ready
  const businessName = vendor.tradingName || vendor.legalName
  const live = listings.filter((l) => l.contentState === 'approved')
  const fix = listings.filter((l) => ['rejected', 'changes_requested'].includes(l.contentState))
  const toQuote = rfqs.filter((r) => r.state === 'open' && myQuotes.has(r.id) && !myQuotes.get(r.id).length)
  const quoted = rfqs.filter((r) => myQuotes.get(r.id)?.length)
  const accepted = rfqs.filter((r) => myQuotes.get(r.id)?.some((q) => q.state === 'accepted'))
  const bookingRequests = bookings.filter((b) => b.state === 'requested')
  const todo = toQuote.length + fix.length + bookingRequests.length
  const funnelMax = Math.max(rfqs.length, quoted.length, accepted.length, 1)
  const statusRows = LISTING_STATUS.map(([id, label]) => ({ id, label, value: listings.filter((l) => l.contentState === id).length })).filter((row) => row.value > 0)
  const statusMax = Math.max(...statusRows.map((row) => row.value), 1)

  const topCategories = [...live.reduce((m, l) => m.set(l.categoryId, (m.get(l.categoryId) || 0) + 1), new Map())]
    .map(([id, count]) => ({ id, count, name: categoryNames.get(id) || 'Other category' }))
    .sort((a, b) => b.count - a.count).slice(0, 5)

  const stats = [
    { label: 'Quote requests', value: quotesReady ? toQuote.length : '…', icon: FileText, caption: 'Ready for your quotation', route: 'v_work' },
    { label: 'Quotes sent', value: quotesReady ? quoted.length : '…', icon: Send, caption: quotesReady ? `${accepted.length} accepted` : 'Checking your quotes', route: 'v_work' },
    { label: 'Live listings', value: live.length, icon: Package, caption: `${listings.length} total listings`, route: 'v_listings' },
    { label: 'Booking requests', value: bookingRequests.length, icon: CalendarCheck, caption: 'Awaiting your response', route: 'v_work' },
  ]
  const funnelRows = [{ label: 'Requests', value: rfqs.length }, { label: 'Quotes sent', value: quotesReady ? quoted.length : '…' }, { label: 'Accepted', value: quotesReady ? accepted.length : '…' }]
  const verified = vendor.roles?.some((role) => role.status === 'verified')

  return <VendorWorkspace><div className="vx-perf-shell vx-vendor-dash">
    <header className="vx-perf-header">
      <div>
        <p className="vx-perf-kicker">Workspace overview · {today}</p>
        <h2>{greeting}, {firstName}</h2>
        <p className="vx-perf-subtitle">{businessName} · Your business activity at a glance</p>
      </div>
      <div className="vx-perf-actions">
        {verified && <span className="vx-perf-pill"><ShieldCheck size={14} /> Verified business</span>}
        <Button size="sm" variant="secondary" icon={BarChart3} onClick={() => nav.go('v_perf')}>Performance</Button>
        <Button size="sm" icon={Plus} onClick={() => nav.go('v_listing_edit')}>Add listing</Button>
      </div>
    </header>

    <div className="vx-perf-grid stats-grid vx-kpi-strip">
      {stats.map(({ label, value, icon: Icon, caption, route }) => (
        <button type="button" key={label} className="vx-card vx-perf-stat" onClick={() => nav.go(route)}>
          <span className="vx-perf-ic sky"><Icon size={18} /></span>
          <span className="vx-perf-stat-text"><b>{value}</b><span>{label}</span></span>
          <small>View</small>
          <span className="vx-dash-stat-caption">{caption}</span>
        </button>
      ))}
    </div>

    <div className="vx-perf-grid wide-grid">
      <section className="vx-card vx-perf-card">
        <div className="vx-top-row">
          <div><h3>Quote conversion</h3><p className="s">Your RFQ pipeline{d.lookupCapped ? ` · quotes checked on your ${QUOTE_LOOKUP_LIMIT} latest RFQs` : ''}</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_work')}>View requests <ChevronRight size={14} /></button>
        </div>
        <div className="vx-conversion-list">
          {funnelRows.map((row) => (
            <div key={row.label} className="vx-conversion-row">
              <div className="vx-conversion-meta"><span>{row.label}</span><b>{row.value}</b></div>
              <div className="vx-conversion-bar"><i className="sky" style={{ width: `${(row.value / funnelMax) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="vx-card vx-perf-card">
        <div className="vx-top-row">
          <div><h3>Listings by status</h3><p className="s">Where your catalogue stands</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_listings')}>Manage <ChevronRight size={14} /></button>
        </div>
        <div className="vx-conversion-list">
          {statusRows.map((row) => (
            <div key={row.id} className="vx-conversion-row">
              <div className="vx-conversion-meta"><span>{row.label}</span><b>{row.value}</b></div>
              <div className="vx-conversion-bar"><i className="sky" style={{ width: `${(row.value / statusMax) * 100}%` }} /></div>
            </div>
          ))}
          {!statusRows.length && <EmptyState icon={Package} title="No listings yet" body="Create a listing. It stays a draft until you submit it and it is approved." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
        </div>
      </section>
    </div>

    <div className="vx-perf-grid lower-grid">
      <section className="vx-card vx-perf-card vx-attention vx-dash-attention">
        <div className="vx-top-row">
          <div><h3>Needs your attention {todo > 0 && <span className="vx-count">{todo}</span>}</h3><p className="s">Items that may need a response</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_work')}>View work <ChevronRight size={14} /></button>
        </div>
        <div className="vx-rows">
          {bookingRequests.map((booking) => <button type="button" className="vx-row" key={booking.id} onClick={() => nav.go('v_booking', { id: booking.id })}><span className="ri violet"><CalendarCheck size={17} /></span><span className="rt"><b>Booking request</b><small>Awaiting your response</small></span><ChevronRight size={16} /></button>)}
          {toQuote.map((request) => <button type="button" className="vx-row" key={request.id} onClick={() => nav.go('v_rfq', { id: request.id })}><span className="ri amber"><FileText size={17} /></span><span className="rt"><b>{request.requirements?.title || 'Quote request'}</b><small>Open for your quotation</small></span><ChevronRight size={16} /></button>)}
          {fix.map((item) => <button type="button" className="vx-row" key={item.id} onClick={() => nav.go('v_listing_edit', { id: item.id })}><span className="ri rose"><AlertTriangle size={17} /></span><span className="rt"><b>{item.contentState === 'rejected' ? 'Listing rejected' : 'Listing needs changes'}</b><small>{item.title}</small></span><ChevronRight size={16} /></button>)}
          {!quotesReady && <div className="vx-empty"><span>Checking your quote requests…</span></div>}
          {quotesReady && todo === 0 && <div className="vx-empty"><Check size={19} /><span>You are all caught up.</span></div>}
        </div>
      </section>

      <section className="vx-card vx-perf-card">
        <div className="vx-top-row">
          <div><h3>Top categories</h3><p className="s">Live listings in your catalogue</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_listings')}>View all <ChevronRight size={14} /></button>
        </div>
        <div className="vx-cat-list">
          {topCategories.map((category) => <button type="button" key={category.id} className="vx-cat-row" onClick={() => nav.go('v_listings')}><span className="ci"><Package size={18} /></span><b>{category.name}</b><em>{category.count}</em></button>)}
          {!topCategories.length && <EmptyState icon={Store} title="No live listings yet" body="Approved products and services will appear by category here." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
        </div>
      </section>
    </div>
  </div></VendorWorkspace>
}

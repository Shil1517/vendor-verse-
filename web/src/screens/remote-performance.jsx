/*
 * Real-API vendor performance report (F-VND-10), used instead of the seed-data screen when
 * VITE_API_BASE_URL is set (see the registry, `live(...)`).
 *
 * Every figure is counted from records the backend returns today: the RFQs sent to the vendor,
 * the vendor's own quotes on them, its bookings, purchase orders and live listings, filtered by
 * each record's createdAt. Nothing is invented:
 *  - there is no enquiry-analytics or reply-time API yet, so the "enquiries", "reply rate" and
 *    "avg. reply time" cards and the period-over-period % changes are not shown;
 *  - quotes are looked up for the 25 most recently updated RFQs (one request each) and the page
 *    says so when there are more;
 *  - there is no annual range because only 7, 30 and 90 days are specified.
 */
import { useCallback, useEffect, useState } from 'react'
import { BarChart3, CalendarCheck, ChevronRight, Download, FileText, Package, Send, Store, Trophy } from 'lucide-react'
import { Button, EmptyState, Screen } from '../ui.jsx'
import { VendorWorkspace } from './vendor.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { ErrorBox, useLoad } from './remote-discovery.jsx'
import { loadDashboard, QUOTE_LOOKUP_LIMIT } from './remote-dashboard.jsx'

const DAY = 86400000
const RANGES = [7, 30, 90]
const BOOKING_STATES = [['requested', 'Requested'], ['confirmed', 'Confirmed'], ['in_progress', 'In progress'], ['completed_awaiting', 'Awaiting completion'], ['completed', 'Completed'], ['declined', 'Declined'], ['cancelled', 'Cancelled']]
const ORDER_STATES = [['created', 'New'], ['accepted', 'Accepted'], ['rejected', 'Rejected']]

async function loadPerformance(country) {
  const base = await loadDashboard(country)
  if (!base.ok || !base.vendor) return base
  const orders = await authService.listVendorPurchaseOrders(base.vendor.id)
  return { ...base, orders: orders.ok ? orders.purchaseOrders : null }
}

const inRange = (iso, days, now) => !!iso && now - new Date(iso).getTime() <= days * DAY

/** Counts per bucket, oldest first. 7 days is daily; 30 and 90 days are weekly. */
function buckets(items, days, now) {
  const step = days === 7 ? DAY : 7 * DAY
  const n = Math.ceil(days / (step / DAY))
  const out = Array.from({ length: n }, (_, i) => ({ label: days === 7 ? new Date(now - (n - 1 - i) * DAY).toLocaleDateString(undefined, { weekday: 'narrow' }) : `W${i + 1}`, value: 0 }))
  for (const iso of items) {
    const age = now - new Date(iso).getTime()
    if (age < 0 || age > days * DAY) continue
    out[Math.max(0, n - 1 - Math.floor(age / step))].value += 1
  }
  return out
}

function Trend({ data }) {
  const max = Math.max(...data.map((p) => p.value), 1)
  const x = (i) => 36 + i * (524 / Math.max(1, data.length - 1))
  const y = (v) => 170 - (v / max) * 118
  const path = data.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ')
  return <svg className="vx-analytics-line" viewBox="0 0 560 220" role="img" aria-label="Quote requests received over time">
    {[0, 1, 2, 3].map((l) => <g key={l}><line x1="36" x2="528" y1={35 + l * 42} y2={35 + l * 42} className="vx-analytics-grid" /><text x="4" y={38 + l * 42} className="vx-analytics-axis-label">{Math.round((max * (3 - l)) / 3)}</text></g>)}
    <path d={`${path} L ${x(data.length - 1)} 190 L 36 190 Z`} className="vx-analytics-area" />
    <path d={path} className="vx-analytics-curve" />
    {data.map((p, i) => <g key={i} className="vx-chart-point"><circle className="vx-point-dot" cx={x(i)} cy={y(p.value)} r="5" /><title>{p.label}: {p.value} requests</title><text x={x(i)} y="206" textAnchor="middle">{p.label}</text></g>)}
  </svg>
}

const num = (v) => (typeof v === 'number' ? v : 0)
const Bars = ({ rows }) => {
  const max = Math.max(...rows.map((r) => num(r.value)), 1)
  return <div className="vx-conversion-list">{rows.map((r) => <div key={r.label} className="vx-conversion-row">
    <div className="vx-conversion-meta"><span>{r.label}</span><b>{r.value}</b></div>
    <div className="vx-conversion-bar"><i className="sky" style={{ width: `${(num(r.value) / max) * 100}%` }} /></div>
  </div>)}</div>
}

export function RemoteVendorPerformance() {
  const nav = useNav()
  const app = useApp()
  const country = (app.locale ?? app.loc ?? {}).country || 'IN'
  const [days, setDays] = useState(30)
  const load = useCallback(() => loadPerformance(country), [country])
  const perf = useLoad(load, [load])
  const [quotes, setQuotes] = useState({ ready: false, list: [] })
  useEffect(() => {
    const d0 = perf.data
    if (!d0?.vendor) return undefined
    let live = true
    const looked = d0.rfqs.slice(0, QUOTE_LOOKUP_LIMIT)
    Promise.all(looked.map((rfq) => authService.listRfqQuotes(rfq.id))).then((results) => {
      if (live) setQuotes({ ready: true, list: results.flatMap((r) => (r.ok ? r.quotes.filter((q) => q.vendorId === d0.vendor.id && q.state !== 'withdrawn') : [])) })
    })
    return () => { live = false }
  }, [perf.data])

  const shell = (body) => <VendorWorkspace><div className="vx-perf-shell">{body}</div></VendorWorkspace>
  if (perf.loading && !perf.data) return shell(<div className="vx-sk vx-sk-card" aria-busy="true" aria-label="Loading performance" />)
  if (perf.error) return shell(<ErrorBox message={perf.error} onRetry={perf.reload} />)
  const d = perf.data
  if (!d?.vendor) return <VendorWorkspace><Screen title="Performance" back={false}><EmptyState icon={Store} title="Complete your registration" action={<Button onClick={() => nav.go('v_register')}>Start</Button>} /></Screen></VendorWorkspace>

  const now = Date.now()
  const rfqs = d.rfqs.filter((r) => inRange(r.createdAt, days, now))
  const sent = quotes.list.filter((q) => inRange(q.createdAt, days, now))
  const won = sent.filter((q) => q.state === 'accepted')
  const bookings = d.bookings.filter((b) => inRange(b.createdAt, days, now))
  const orders = (d.orders || []).filter((o) => inRange(o.createdAt, days, now))
  const ready = quotes.ready
  const winRate = ready && sent.length ? `${Math.round((won.length / sent.length) * 100)}%` : ready ? '—' : '…'
  const live = d.listings.filter((l) => l.contentState === 'approved')
  const topCategories = [...live.reduce((m, l) => m.set(l.categoryId, (m.get(l.categoryId) || 0) + 1), new Map())]
    .map(([id, count]) => ({ label: d.categoryNames.get(id) || 'Other category', value: count })).sort((a, b) => b.value - a.value).slice(0, 5)
  const stats = [
    { label: 'Quote requests', value: rfqs.length, icon: FileText, caption: 'Received in this period' },
    { label: 'Quotes sent', value: ready ? sent.length : '…', icon: Send, caption: 'Submitted in this period' },
    { label: 'Win rate', value: winRate, icon: Trophy, caption: ready ? `${won.length} accepted of ${sent.length}` : 'Checking your quotes' },
    { label: 'Bookings', value: bookings.length, icon: CalendarCheck, caption: 'Requested in this period' },
  ]
  const exportCsv = () => {
    const rows = [['Metric', `Last ${days} days`], ...stats.map((s) => [s.label, s.value]), ['Purchase orders', orders.length]]
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `performance-${days}d.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    app.toast?.('Report exported (CSV)')
  }
  const orderRows = ORDER_STATES.map(([id, label]) => ({ label, value: orders.filter((o) => o.state === id).length }))
    .concat([{ label: 'In progress or closed', value: orders.filter((o) => !ORDER_STATES.some(([id]) => id === o.state)).length }]).filter((r) => r.value > 0)
  const bookingRows = BOOKING_STATES.map(([id, label]) => ({ label, value: bookings.filter((b) => b.state === id).length })).filter((r) => r.value > 0)

  return shell(<>
    <div className="vx-perf-header">
      <div>
        <p className="vx-perf-kicker">Analytics</p>
        <h2>Sales performance</h2>
        <p className="vx-perf-subtitle">Counted from your requests, quotes, bookings and orders{d.lookupCapped ? ` · quotes checked on your ${QUOTE_LOOKUP_LIMIT} latest RFQs` : ''}</p>
      </div>
      <div className="vx-perf-actions">
        <div className="vx-seg vx-perf-period" aria-label="Performance date range">
          {RANGES.map((n) => <button type="button" key={n} className={days === n ? 'on' : ''} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}
        </div>
        <Button size="sm" icon={Download} onClick={exportCsv}>Export report</Button>
      </div>
    </div>

    <div className="vx-perf-grid stats-grid">
      {stats.map(({ label, value, icon: Icon, caption }) => (
        <div key={label} className="vx-card vx-perf-stat">
          <div className="vx-perf-ic sky"><Icon size={18} /></div>
          <div className="vx-perf-stat-text"><b>{value}</b><span>{label}</span></div>
          <small>{caption}</small>
        </div>
      ))}
    </div>

    <div className="vx-perf-grid wide-grid">
      <section className="vx-card vx-perf-card">
        <div className="vx-top-row"><div><h3>Quote requests trend</h3><p className="s">Requests received over the last {days} days</p></div></div>
        <Trend data={buckets(rfqs.map((r) => r.createdAt), days, now)} />
      </section>
      <section className="vx-card vx-perf-card">
        <div className="vx-top-row">
          <div><h3>Conversion</h3><p className="s">Your RFQ pipeline</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_work')}>View details <ChevronRight size={14} /></button>
        </div>
        <Bars rows={[{ label: 'Requests', value: rfqs.length }, { label: 'Quotes sent', value: ready ? sent.length : '…' }, { label: 'Accepted', value: ready ? won.length : '…' }]} />
      </section>
    </div>

    <div className="vx-perf-grid wide-grid">
      <section className="vx-card vx-perf-card">
        <div className="vx-top-row"><div><h3>Bookings by status</h3><p className="s">Requested in the last {days} days</p></div></div>
        {bookingRows.length ? <Bars rows={bookingRows} /> : <EmptyState icon={CalendarCheck} title="No bookings in this period" />}
      </section>
      <section className="vx-card vx-perf-card">
        <div className="vx-top-row">
          <div><h3>Purchase orders</h3><p className="s">Received in the last {days} days</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_orders')}>View orders <ChevronRight size={14} /></button>
        </div>
        {d.orders === null ? <p className="s">Orders could not be loaded.</p> : orderRows.length ? <Bars rows={orderRows} /> : <EmptyState icon={Package} title="No purchase orders in this period" />}
      </section>
    </div>

    <section className="vx-card vx-perf-card">
      <div className="vx-top-row">
        <div><h3>Top categories</h3><p className="s">Live listings in your catalogue</p></div>
        <button type="button" className="vx-text-link" onClick={() => nav.go('v_listings')}>View all <ChevronRight size={14} /></button>
      </div>
      {topCategories.length ? <Bars rows={topCategories} /> : <EmptyState icon={BarChart3} title="No live listings yet" body="Approved products and services will appear by category here." />}
    </section>
  </>)
}

import { useEffect, useState } from 'react'
import { Banner, Button, Card, EmptyState, Input, Screen, Section } from '../ui.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'

const errText = (result) => result.message || 'Could not load this information. Try again.'
const stamp = (value) => value ? new Date(value).toLocaleDateString() : '—'
const money = (minor, currency) => minor == null || !currency ? 'Not configured' : `${currency} ${(Number(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

function useVendor() {
  const [state, setState] = useState({ loading: true, vendors: [], error: '' })
  const [selected, setSelected] = useState('')
  useEffect(() => {
    let live = true
    authService.listMyVendors().then((result) => {
      if (!live) return
      if (result.ok) {
        setState({ loading: false, vendors: result.vendors || [], error: '' })
        setSelected((id) => id || result.vendors?.[0]?.id || '')
      } else setState({ loading: false, vendors: [], error: errText(result) })
    })
    return () => { live = false }
  }, [])
  return { ...state, vendorId: selected, setSelected }
}

function VendorPicker({ vendor }) {
  if (vendor.loading) return <Card>Loading your vendor profiles…</Card>
  if (vendor.error) return <Banner tone="red">{vendor.error}</Banner>
  if (!vendor.vendors.length) return <EmptyState title="No vendor profile" body="Create a vendor profile before using these tools." />
  if (vendor.vendors.length === 1) return <p className="text-sm font-semibold">{vendor.vendors[0].legalName || vendor.vendors[0].name}</p>
  return <label className="block text-sm font-semibold">Vendor<select className="mt-1 w-full rounded-xl border p-3" value={vendor.vendorId} onChange={(e) => vendor.setSelected(e.target.value)}>{vendor.vendors.map((v) => <option key={v.id} value={v.id}>{v.legalName || v.name}</option>)}</select></label>
}

function useGet(path, refresh = 0) {
  const [state, setState] = useState({ loading: Boolean(path), data: null, error: '' })
  useEffect(() => {
    if (!path) { setState({ loading: false, data: null, error: '' }); return }
    let live = true
    setState({ loading: true, data: null, error: '' })
    authService.apiRequest(path).then((result) => { if (live) setState(result.ok ? { loading: false, data: result.data, error: '' } : { loading: false, data: null, error: errText(result) }) })
    return () => { live = false }
  }, [path, refresh])
  return state
}

function ReadState({ value }) {
  if (value.loading) return <Card>Loading…</Card>
  if (value.error) return <Banner tone="red">{value.error}</Banner>
  return null
}

export function RemoteSubscription() {
  const vendor = useVendor()
  const nav = useNav()
  const sub = useGet(vendor.vendorId ? `/vendors/${encodeURIComponent(vendor.vendorId)}/subscription` : null)
  const usage = useGet(vendor.vendorId ? `/vendors/${encodeURIComponent(vendor.vendorId)}/lead-usage` : null)
  const current = sub.data?.subscription
  return <Screen title="My subscription">
    <VendorPicker vendor={vendor} />
    {vendor.vendorId && <><ReadState value={sub} /><ReadState value={usage} />
      {!sub.loading && !sub.error && (current ? <Card><h2 className="text-lg font-bold">{current.planName}</h2><p>Status: {current.state}</p><p>Current period: {stamp(current.currentPeriodStart)} to {stamp(current.currentPeriodEnd)}</p>{current.graceEndsAt && <p>Grace ends: {stamp(current.graceEndsAt)}</p>}</Card> : <EmptyState title="No subscription" body="No active or previous subscription is recorded for this vendor." />)}
      <Section title="Lead usage">{usage.data?.items?.map((row) => <Card key={row.periodStart}><b>{row.leadCount} leads</b><p className="text-xs text-ink-500">{stamp(row.periodStart)} to {stamp(row.periodEnd)}</p></Card>)}{usage.data?.items?.length === 0 && <p className="text-sm text-ink-500">No usage periods recorded.</p>}</Section>
      <Button full variant="secondary" onClick={() => nav.go('v_plans')}>View plans</Button>
      <Button full variant="secondary" onClick={() => nav.go('invoice')}>View invoices</Button>
    </>}
  </Screen>
}

export function RemotePlans() {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => { authService.apiRequest('/plans', { publicRead: true }).then((result) => setState(result.ok ? { loading: false, data: result.data, error: '' } : { loading: false, data: null, error: errText(result) })) }, [])
  return <Screen title="Plans" subtitle="Configured plan catalog">
    <Banner tone="blue">Checkout is unavailable until billing, tax and plan terms are approved.</Banner>
    <ReadState value={state} />
    {state.data?.items?.map((plan) => <Card key={plan.id}><h2 className="text-lg font-bold">{plan.name}</h2><p>{money(plan.priceMinor, plan.currency)}{plan.billingInterval ? ` / ${plan.billingInterval}` : ''}</p><div className="mt-2 text-sm">{Object.entries(plan.entitlements || {}).map(([key, value]) => <p key={key}>{key}: {JSON.stringify(value)}</p>)}</div></Card>)}
    {state.data?.items?.length === 0 && <EmptyState title="No plans configured" body="Plans will appear after an administrator activates them." />}
  </Screen>
}

export function RemoteCheckoutUnavailable() {
  return <Screen title="Plan checkout"><Banner tone="amber" title="Checkout unavailable">Plan pricing, tax and the billing provider are still being decided. No subscription has been changed.</Banner></Screen>
}

export function RemoteSponsor() {
  const vendor = useVendor()
  const [refresh, setRefresh] = useState(0)
  const campaigns = useGet(vendor.vendorId ? `/vendors/${encodeURIComponent(vendor.vendorId)}/sponsored-campaigns` : null, refresh)
  const [placement, setPlacement] = useState('')
  const [listingId, setListingId] = useState('')
  const [error, setError] = useState('')
  const mutate = async (path, body) => {
    const result = await authService.apiRequest(path, { method: path.endsWith('/status') ? 'PATCH' : 'POST', body })
    if (result.ok) { setError(''); setRefresh((n) => n + 1) } else setError(errText(result))
  }
  const prefix = vendor.vendorId ? `/vendors/${encodeURIComponent(vendor.vendorId)}/sponsored-campaigns` : ''
  return <Screen title="Sponsored campaigns" subtitle="Draft and submit for review">
    <Banner tone="blue">Campaign activation is unavailable until publication gates and commercial rules are ready. Sponsored placement never overrides publication eligibility.</Banner>
    <VendorPicker vendor={vendor} />
    {vendor.vendorId && <>
      <Card><Input label="Placement" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="Configured placement name" /><Input label="Listing ID (optional)" value={listingId} onChange={(e) => setListingId(e.target.value)} /><Button onClick={() => placement.trim() ? mutate(prefix, { placement: placement.trim(), ...(listingId.trim() ? { listingId: listingId.trim() } : {}) }) : setError('Enter a placement.')}>Create draft</Button></Card>
      <ReadState value={campaigns} />
      {campaigns.data?.items?.map((campaign) => <Card key={campaign.id}><b>{campaign.placement}</b><p>Status: {campaign.status}</p>{campaign.listingId && <p className="text-xs">Listing {campaign.listingId}</p>}{campaign.status === 'draft' && <Button size="sm" onClick={() => mutate(`${prefix}/${encodeURIComponent(campaign.id)}/status`, { status: 'pending_review', reason: 'Submitted by vendor for review' })}>Submit for review</Button>}</Card>)}
      {campaigns.data?.items?.length === 0 && <EmptyState title="No campaigns yet" />}
    </>}
    {error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteInvoice({ params = {} }) {
  const vendor = useVendor()
  const invoices = useGet(vendor.vendorId ? `/vendors/${encodeURIComponent(vendor.vendorId)}/invoices${params.id ? `/${encodeURIComponent(params.id)}` : ''}` : null)
  const rows = params.id ? (invoices.data ? [invoices.data] : []) : invoices.data?.items || []
  return <Screen title="Subscription invoices">
    <VendorPicker vendor={vendor} /><ReadState value={invoices} />
    {rows.map((invoice) => <Card key={invoice.id}><b>{invoice.invoiceNumber}</b><p>{money(invoice.amountMinor, invoice.currency)} · {invoice.status}</p><p className="text-xs text-ink-500">Issued {stamp(invoice.issuedAt)}</p>{invoice.documentFileId && <p className="text-xs">Document on file: {invoice.documentFileId}</p>}</Card>)}
    {!invoices.loading && !invoices.error && rows.length === 0 && <EmptyState title="No invoices recorded" body="Tax invoice issuance is unavailable until tax and numbering rules are approved." />}
  </Screen>
}

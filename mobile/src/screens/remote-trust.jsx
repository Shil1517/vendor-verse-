import { useEffect, useState } from 'react'
import { Banner, Button, Card, EmptyState, Input, Screen, Section } from '../ui.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'

const enc = encodeURIComponent
const date = (value) => value ? new Date(value).toLocaleDateString() : '—'
const errorText = (result) => result.message || 'Could not complete the request.'
const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')

function useGet(path) {
  const [state, setState] = useState({ loading: Boolean(path), data: null, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!path) { setState({ loading: false, data: null, error: '' }); return }
    let live = true
    setState({ loading: true, data: null, error: '' })
    authService.apiRequest(path).then((result) => { if (live) setState(result.ok ? { loading: false, data: result.data, error: '' } : { loading: false, data: null, error: errorText(result) }) })
    return () => { live = false }
  }, [path, version])
  return { ...state, reload: () => setVersion((n) => n + 1) }
}

function ReadState({ resource }) {
  if (resource.loading) return <Card>Loading…</Card>
  if (resource.error) return <Banner tone="red">{resource.error}<Button size="sm" onClick={resource.reload}>Retry</Button></Banner>
  return null
}

export function RemoteWriteReview({ params = {} }) {
  const nav = useNav()
  const [eligible, setEligible] = useState({ loading: true, items: [], error: '' })
  const [selected, setSelected] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all([authService.listMyLocalBookings(), authService.listMyWorkOrders(), authService.listMyPurchaseOrders()]).then(([bookings, orders, purchases]) => {
      if (!live) return
      const failures = [bookings, orders, purchases].filter((r) => !r.ok)
      if (failures.length) return setEligible({ loading: false, items: [], error: errorText(failures[0]) })
      const items = [
        ...(bookings.bookings || []).filter((b) => b.state === 'closed').map((b) => ({ type: 'booking', id: b.id, vendorId: b.vendorId, label: `Booking ${b.id}` })),
        ...(orders.workOrders || []).filter((w) => w.state === 'closed').map((w) => ({ type: 'work_order', id: w.id, vendorId: w.vendorId, label: `Work order ${w.id}` })),
        ...(purchases.purchaseOrders || []).filter((p) => p.state === 'completed').map((p) => ({ type: 'purchase_order', id: p.id, vendorId: p.supplierVendorId, label: `Purchase order ${p.id}` })),
      ].filter((item) => !params.vendorId || item.vendorId === params.vendorId)
      setEligible({ loading: false, items, error: '' })
      const preferred = items.find((item) => item.id === params.via)
      setSelected(preferred ? `${preferred.type}:${preferred.id}` : items[0] ? `${items[0].type}:${items[0].id}` : '')
    })
    return () => { live = false }
  }, [params.vendorId, params.via])
  const submit = async () => {
    const match = eligible.items.find((item) => `${item.type}:${item.id}` === selected)
    if (!match || rating < 1) return setError('Select an eligible transaction and a rating.')
    setSaving(true); setError('')
    const result = await authService.apiRequest('/reviews', { method: 'POST', body: {
      transactionType: match.type, transactionId: match.id, overallRating: rating,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    } })
    setSaving(false)
    if (result.ok) nav.replace('c_reviews'); else setError(errorText(result))
  }
  return <Screen title="Rate a vendor" footer={<Button full disabled={saving || !selected || rating < 1} onClick={submit}>Submit review</Button>}>
    <Banner tone="blue">Reviews are accepted only for your completed transactions. Each transaction can be reviewed once.</Banner>
    {eligible.loading && <Card>Loading eligible transactions…</Card>}{eligible.error && <Banner tone="red">{eligible.error}</Banner>}
    {eligible.items.length > 0 && <><label className="block text-sm font-semibold">Transaction<select className="mt-1 w-full rounded-xl border p-3" value={selected} onChange={(e) => setSelected(e.target.value)}>{eligible.items.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.label}</option>)}</select></label>
      <label className="block text-sm font-semibold">Overall rating<select className="mt-1 w-full rounded-xl border p-3" value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={0}>Choose rating</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label>
      <Input label="Comment (optional)" textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
    </>}
    {!eligible.loading && !eligible.error && eligible.items.length === 0 && <EmptyState title="No eligible transaction yet" body="Complete a recorded booking, work order or purchase order first." />}
    {error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteMyReviews() {
  const resource = useGet('/reviews/mine')
  return <Screen title="My reviews"><ReadState resource={resource} />
    {resource.data?.items?.map((review) => <Card key={review.id}><b>{review.overallRating} / 5</b><p>{review.comment || 'No comment'}</p><p className="text-xs text-ink-500">{review.transactionType} · {date(review.createdAt)}</p>{review.vendorResponse && <p className="mt-2 text-sm">Vendor response: {review.vendorResponse}</p>}</Card>)}
    {resource.data?.items?.length === 0 && <EmptyState title="No reviews yet" />}
  </Screen>
}

export function RemoteReport({ params = {} }) {
  const nav = useNav()
  const initialType = ['vendor', 'listing', 'booking', 'work_order', 'purchase_order', 'contract', 'conversation'].includes(params.type) ? params.type : params.bookingId ? 'booking' : 'vendor'
  const [form, setForm] = useState({ targetType: initialType, targetId: uuid(params.id) ? params.id : uuid(params.bookingId) ? params.bookingId : '', reason: '', details: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!uuid(form.targetId) || !form.reason.trim()) return setError('Select a valid record ID and enter a reason.')
    setSaving(true); setError('')
    const result = await authService.apiRequest('/reports', { method: 'POST', body: {
      targetType: form.targetType, targetId: form.targetId.trim(), reason: form.reason.trim(),
      ...(form.details.trim() ? { details: form.details.trim() } : {}),
    } })
    setSaving(false)
    if (result.ok) nav.replace('c_cases'); else setError(errorText(result))
  }
  return <Screen title="Report a problem" footer={<Button full disabled={saving} onClick={submit}>Submit report</Button>}>
    <Banner tone="blue">Reports are reviewed by support staff. A case appears after triage.</Banner>
    <label className="block text-sm font-semibold">About<select className="mt-1 w-full rounded-xl border p-3" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, targetId: '' })}>{['vendor', 'listing', 'booking', 'work_order', 'purchase_order', 'contract', 'conversation'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></label>
    <Input label="Record ID" value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} placeholder="Record ID from the detail screen" />
    <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
    <Input label="What happened? (optional)" textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
    {error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteCases() {
  const nav = useNav()
  const reports = useGet('/me/reports')
  const cases = useGet('/me/cases')
  return <Screen title="Support cases" right={<Button size="sm" onClick={() => nav.go('c_report')}>Report</Button>}>
    <ReadState resource={reports} /><ReadState resource={cases} />
    <Section title="Cases">{cases.data?.items?.map((item) => <Card key={item.id} onClick={() => nav.go('c_case', { id: item.id })}><b>{item.subject}</b><p>{item.state}</p><p className="text-xs text-ink-500">{date(item.createdAt)}</p></Card>)}{cases.data?.items?.length === 0 && <EmptyState title="No cases yet" />}</Section>
    <Section title="Reports awaiting triage">{reports.data?.items?.filter((item) => !item.caseId).map((item) => <Card key={item.id}><b>{item.reason}</b><p className="text-xs text-ink-500">Submitted {date(item.createdAt)} · {item.targetType}</p></Card>)}{reports.data?.items?.filter((item) => !item.caseId).length === 0 && <p className="text-sm text-ink-500">No reports awaiting triage.</p>}</Section>
  </Screen>
}

export function RemoteCaseDetail({ params = {} }) {
  const id = params.id
  const resource = useGet(uuid(id) ? `/cases/${enc(id)}` : null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const appeal = async () => {
    if (!reason.trim()) return setError('Enter why the decision should be reviewed.')
    const result = await authService.apiRequest(`/cases/${enc(id)}/appeals`, { method: 'POST', body: { reason: reason.trim() } })
    if (result.ok) { setSent(true); setError('') } else setError(errorText(result))
  }
  return <Screen title="Case status">{!uuid(id) && <Banner tone="red">Choose a case from your case list.</Banner>}<ReadState resource={resource} />
    {resource.data && <><Card><b>{resource.data.subject}</b><p>{resource.data.state} · {resource.data.severity}</p><p className="text-xs text-ink-500">Opened {date(resource.data.createdAt)}</p>{resource.data.resolution && <p>Resolution: {resource.data.resolution}</p>}</Card>
      {resource.data.resolvedAt && !sent && <Card><Input label="Reason for appeal" textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /><Button onClick={appeal}>Request a human review</Button></Card>}
      {sent && <Banner tone="green">Your appeal was submitted.</Banner>}
    </>}{error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteVendorReviews() {
  const [vendorId, setVendorId] = useState('')
  const [ownerError, setOwnerError] = useState('')
  const [response, setResponse] = useState({})
  const [error, setError] = useState('')
  const resource = useGet(vendorId ? `/vendors/${enc(vendorId)}/reviews` : null)
  useEffect(() => { authService.listMyVendors().then((result) => result.ok ? setVendorId(result.vendors?.[0]?.id || '') : setOwnerError(errorText(result))) }, [])
  const reply = async (id) => {
    const result = await authService.apiRequest(`/reviews/${enc(id)}/response`, { method: 'POST', body: { response: response[id]?.trim() } })
    if (result.ok) { setError(''); resource.reload() } else setError(errorText(result))
  }
  return <Screen title="Customer reviews">{ownerError && <Banner tone="red">{ownerError}</Banner>}{!vendorId && !ownerError && <Card>Loading your vendor profile…</Card>}<ReadState resource={resource} />
    {resource.data && <Card><b>{resource.data.ratingAverage ?? 'No rating yet'}</b><p>{resource.data.ratingCount} published reviews</p></Card>}
    {resource.data?.items?.map((review) => <Card key={review.id}><b>{review.overallRating} / 5</b><p>{review.comment}</p>{review.vendorResponse ? <p className="mt-2 text-sm">Your response: {review.vendorResponse}</p> : <><Input label="Public response" value={response[review.id] || ''} onChange={(e) => setResponse({ ...response, [review.id]: e.target.value })} /><Button size="sm" disabled={!response[review.id]?.trim()} onClick={() => reply(review.id)}>Post response</Button></>}</Card>)}
    {resource.data?.items?.length === 0 && <EmptyState title="No published reviews yet" />}{error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteTrustUnavailable({ title }) {
  return <Screen title={title}><Banner tone="amber">This workflow is not available in the live API yet. Review moderation and vendor-target appeals still need backend support.</Banner></Screen>
}

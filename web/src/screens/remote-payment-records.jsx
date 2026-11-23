import { useEffect, useState } from 'react'
import { Banner, Button, Card, Input, Section } from '../ui.jsx'
import { authService } from '../services/authService.js'

const eligible = {
  purchase_order: ['accepted', 'processing', 'shipped', 'delivered', 'completed'],
  contract: ['active', 'completed', 'closed'],
}

export function RemotePaymentRecords({ parentType, parentId, state, vendorSide }) {
  const [records, setRecords] = useState({ loading: true, items: [], error: '' })
  const [version, setVersion] = useState(0)
  const [mode, setMode] = useState('B')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [status, setStatus] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  useEffect(() => {
    if (!parentId) return
    let live = true
    setRecords({ loading: true, items: [], error: '' })
    authService.apiRequest(`/payment-records?parentType=${encodeURIComponent(parentType)}&parentId=${encodeURIComponent(parentId)}`).then((result) => {
      if (live) setRecords(result.ok ? { loading: false, items: result.data?.items || [], error: '' } : { loading: false, items: [], error: result.message || 'Could not load payment records.' })
    })
    return () => { live = false }
  }, [parentType, parentId, version])
  const canAdd = eligible[parentType]?.includes(state)
  const minor = Math.round(Number(amount) * 100)
  const valid = /^\\d+(?:\\.\\d{1,2})?$/.test(amount.trim()) && Number.isSafeInteger(minor) && /^[A-Za-z]{3}$/.test(currency.trim()) && status.trim()
  const save = async () => {
    if (!valid || busy) return
    setBusy(true); setFailure('')
    const result = await authService.apiRequest('/payment-records', { method: 'POST', body: {
      parentType, parentId, mode, amountMinor: minor, currency: currency.trim().toUpperCase(), status: status.trim(),
      ...(reference.trim() ? { externalReference: reference.trim() } : {}),
    } })
    setBusy(false)
    if (!result.ok) { setFailure(result.message || 'Could not save payment record.'); return }
    setAmount(''); setStatus(''); setReference(''); setVersion((n) => n + 1)
  }
  return <Section title="Payment records">
    <Banner tone="blue">These records describe payments handled directly between the parties. VendorVerse does not verify or collect the money.</Banner>
    {records.loading && <Card>Loading records…</Card>}
    {records.error && <Banner tone="red">{records.error}<Button onClick={() => setVersion((n) => n + 1)}>Retry</Button></Banner>}
    {!records.loading && !records.error && records.items.length === 0 && <Card>No payment records yet.</Card>}
    {records.items.map((item) => <Card key={item.id}><strong>{item.mode === 'A' ? 'Direct payment' : 'Offline terms'} · {item.status}</strong><p>{item.currency} {(Number(item.amountMinor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>{item.externalReference && <p>Reference: {item.externalReference}</p>}<small>Recorded {new Date(item.createdAt).toLocaleString()}</small></Card>)}
    {canAdd && <Card className="space-y-3"><h3 className="font-semibold">Add an informational record</h3><label>Mode<select className="ml-2 rounded border p-2" value={mode} onChange={(event) => setMode(event.target.value)}>{vendorSide && <option value="A">A · direct payment receipt</option>}<option value="B">B · offline terms</option></select></label><Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><Input label="Currency (3 letters)" value={currency} onChange={(event) => setCurrency(event.target.value)} /><Input label="Status (informational)" value={status} onChange={(event) => setStatus(event.target.value)} /><Input label="External reference (optional)" value={reference} onChange={(event) => setReference(event.target.value)} />{failure && <Banner tone="red">{failure}</Banner>}<Button disabled={!valid || busy} onClick={save}>Save record</Button></Card>}
  </Section>
}

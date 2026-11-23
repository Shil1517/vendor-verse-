import { useEffect, useState } from 'react'
import { Banner, Button, Card, EmptyState, Input, Screen, Section } from '../ui.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'

const date = (value) => value ? new Date(value).toLocaleString() : '—'
const message = (result) => result.message || 'Could not load this information. Try again.'

function useResource(path) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    authService.apiRequest(path).then((result) => {
      if (live) setState(result.ok ? { loading: false, data: result.data, error: '' } : { loading: false, data: null, error: message(result) })
    })
    return () => { live = false }
  }, [path, version])
  return { ...state, reload: () => setVersion((n) => n + 1) }
}

function Result({ resource }) {
  if (resource.loading) return <Card>Loading…</Card>
  if (resource.error) return <Banner tone="red" title="Could not load"><p>{resource.error}</p><Button size="sm" onClick={resource.reload}>Retry</Button></Banner>
  return null
}

export function RemoteAgentHome() {
  const nav = useNav()
  const leads = useResource('/agent/leads')
  const performance = useResource('/agent/performance')
  return <Screen title="Sales agent" subtitle="Your assigned prospective vendors">
    <Result resource={leads} /><Result resource={performance} />
    {performance.data && <div className="grid grid-cols-3 gap-2">{[
      ['Leads', performance.data.totalLeads], ['Converted', performance.data.convertedLeads], ['Elapsed follow-ups', performance.data.followUpActivitiesElapsed],
    ].map(([label, value]) => <Card key={label}><p className="text-xs text-ink-500">{label}</p><p className="text-xl font-bold">{value}</p></Card>)}</div>}
    <Button full onClick={() => nav.go('a_lead_new')}>Add prospective vendor</Button>
    <Button full variant="secondary" onClick={() => nav.go('a_leads')}>View assigned leads</Button>
    <Section title="Recent leads">{leads.data?.items?.slice(0, 5).map((lead) => <Card key={lead.id} onClick={() => nav.go('a_lead', { id: lead.id })}><b>{lead.businessName || lead.prospectName}</b><p className="text-xs text-ink-500">{lead.status}</p></Card>)}{leads.data?.items?.length === 0 && <EmptyState title="No assigned leads" />}</Section>
  </Screen>
}

export function RemoteAgentLeads() {
  const nav = useNav()
  const leads = useResource('/agent/leads')
  return <Screen title="Assigned leads" right={<Button size="sm" onClick={() => nav.go('a_lead_new')}>Add</Button>}>
    <Result resource={leads} />
    {leads.data?.items?.map((lead) => <Card key={lead.id} onClick={() => nav.go('a_lead', { id: lead.id })}>
      <b>{lead.businessName || lead.prospectName}</b><p className="text-sm">{lead.prospectName} · {lead.status}</p>
      <p className="text-xs text-ink-500">Updated {date(lead.updatedAt)}</p>
    </Card>)}
    {leads.data?.items?.length === 0 && <EmptyState title="No assigned leads" body="Add a prospective vendor to begin." />}
  </Screen>
}

export function RemoteAgentLeadNew() {
  const nav = useNav()
  const [form, setForm] = useState({ prospectName: '', businessName: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (!form.prospectName.trim()) return setError('Enter the contact name.')
    setSaving(true); setError('')
    const result = await authService.apiRequest('/agent/leads', { method: 'POST', body: {
      prospectName: form.prospectName.trim(), ...(form.businessName.trim() ? { businessName: form.businessName.trim() } : {}),
      contactDetails: { ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), ...(form.email.trim() ? { email: form.email.trim() } : {}) },
    } })
    setSaving(false)
    if (result.ok) nav.replace('a_lead', { id: result.data.id })
    else setError(message(result))
  }
  return <Screen title="New lead" footer={<Button full disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save lead'}</Button>}>
    <Input label="Contact name" value={form.prospectName} onChange={(e) => setForm({ ...form, prospectName: e.target.value })} />
    <Input label="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
    <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
    <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    {error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteAgentLeadDetail({ params = {} }) {
  const nav = useNav()
  const id = params.id
  const lead = useResource(id ? `/agent/leads/${encodeURIComponent(id)}` : null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const saveStatus = async () => {
    if (!status.trim()) return setError('Enter a pipeline status.')
    const result = await authService.apiRequest(`/agent/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: status.trim() } })
    if (result.ok) { setStatus(''); setError(''); lead.reload() } else setError(message(result))
  }
  return <Screen title={lead.data?.businessName || lead.data?.prospectName || 'Lead'} subtitle="Assigned prospective vendor">
    {!id && <Banner tone="red">No lead selected.</Banner>}<Result resource={lead} />
    {lead.data && <>
      <Card><p><b>Contact:</b> {lead.data.prospectName}</p><p><b>Status:</b> {lead.data.status}</p>
        {Object.entries(lead.data.contactDetails || {}).map(([key, value]) => <p key={key}><b>{key}:</b> {String(value)}</p>)}</Card>
      <Card><Input label="Update pipeline status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder={lead.data.status} /><Button onClick={saveStatus}>Save status</Button></Card>
      <Button full variant="secondary" onClick={() => nav.go('a_log', { id })}>Log activity</Button>
      <Section title="Activity">{lead.data.activities?.map((activity) => <Card key={activity.id}><b>{activity.activityType}</b><p>{activity.notes}</p><p className="text-xs text-ink-500">{date(activity.createdAt)}{activity.followUpAt ? ` · Follow up ${date(activity.followUpAt)}` : ''}</p></Card>)}{lead.data.activities?.length === 0 && <EmptyState title="No activity yet" />}</Section>
    </>}
    {error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteAgentLogActivity({ params = {} }) {
  const nav = useNav()
  const [form, setForm] = useState({ activityType: 'call', notes: '', followUpAt: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!params.id) return setError('No lead selected.')
    setSaving(true)
    const result = await authService.apiRequest(`/agent/leads/${encodeURIComponent(params.id)}/activities`, { method: 'POST', body: {
      activityType: form.activityType, ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      ...(form.followUpAt ? { followUpAt: new Date(form.followUpAt).toISOString() } : {}),
    } })
    setSaving(false)
    if (result.ok) nav.replace('a_lead', { id: params.id }); else setError(message(result))
  }
  return <Screen title="Log activity" footer={<Button full disabled={saving} onClick={save}>Save activity</Button>}>
    <label className="block text-sm font-semibold">Activity type<select className="mt-1 w-full rounded-xl border p-3" value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}>{['call', 'message', 'visit', 'note'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
    <Input label="Notes" textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    <Input label="Follow-up date and time (optional)" type="datetime-local" value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} />
    {error && <Banner tone="red">{error}</Banner>}
  </Screen>
}

export function RemoteAgentFollowups() {
  const nav = useNav()
  const leads = useResource('/agent/leads')
  return <Screen title="Follow-ups" subtitle="Open a lead to see and log follow-up activity">
    <Result resource={leads} />
    {leads.data?.items?.map((lead) => <Card key={lead.id} onClick={() => nav.go('a_lead', { id: lead.id })}><b>{lead.businessName || lead.prospectName}</b><p className="text-xs text-ink-500">{lead.status}</p></Card>)}
    {leads.data?.items?.length === 0 && <EmptyState title="No leads yet" />}
  </Screen>
}

export function RemoteAgentPerformance() {
  const performance = useResource('/agent/performance')
  return <Screen title="Performance" subtitle="Your assigned leads only">
    <Result resource={performance} />
    {performance.data && <>
      <Card><b>Total leads</b><p className="text-2xl font-bold">{performance.data.totalLeads}</p></Card>
      <Card><b>Converted vendors</b><p className="text-2xl font-bold">{performance.data.convertedLeads}</p></Card>
      <Card><b>Elapsed follow-up activities</b><p className="text-2xl font-bold">{performance.data.followUpActivitiesElapsed}</p></Card>
    </>}
    <Banner tone="blue">Commission amounts are unavailable while the commission model remains undecided.</Banner>
  </Screen>
}

export function RemoteAgentUnavailable({ title }) {
  return <Screen title={title}><Banner tone="amber">This workflow is not available in the live API yet. Assisted onboarding needs a recorded vendor consent; commission terms remain undecided.</Banner></Screen>
}

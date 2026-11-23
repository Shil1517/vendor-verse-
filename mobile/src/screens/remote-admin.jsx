import { useEffect, useState } from 'react'
import { Banner, Button, Card, EmptyState, Input, Screen, Section } from '../ui.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'

const enc = encodeURIComponent
const date = (value) => value ? new Date(value).toLocaleString() : '—'
const errorText = (result) => result.message || 'The request could not be completed.'

function useGet(path) {
  const [state, setState] = useState({ loading: Boolean(path), data: null, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!path) { setState({ loading: false, data: null, error: '' }); return }
    let live = true
    setState({ loading: true, data: null, error: '' })
    authService.apiRequest(path).then((result) => {
      if (live) setState(result.ok ? { loading: false, data: result.data, error: '' } : { loading: false, data: null, error: errorText(result) })
    })
    return () => { live = false }
  }, [path, version])
  return { ...state, reload: () => setVersion((n) => n + 1) }
}

function State({ resource }) {
  if (resource.loading) return <Card>Loading…</Card>
  if (resource.error) return <Banner tone="red">{resource.error}<Button size="sm" onClick={resource.reload}>Retry</Button></Banner>
  return null
}

function useAction(reload) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (path, method, body) => {
    setBusy(true); setError('')
    const result = await authService.apiRequest(path, { method, body })
    setBusy(false)
    if (result.ok) reload?.(); else setError(errorText(result))
    return result
  }
  return { run, busy, error }
}

export function RemoteAdminDashboard() {
  const nav = useNav()
  const resource = useGet('/admin/dashboard')
  const links = {
    verification_queue: ['Verification queue', 'ad_vendors'], listing_queue: ['Listings to review', 'ad_listings'],
    untriaged_reports: ['Untriaged reports', 'ad_cases'], appeal_queue: ['Appeals', 'ad_cases'],
    open_cases: ['Open cases', 'ad_cases'], failed_subscriptions: ['Failed subscriptions', 'ad_subs'],
    elapsed_grace_periods: ['Grace periods elapsed', 'ad_subs'], category_suggestions: ['Category suggestions', 'ad_categories'],
    inactive_markets: ['Inactive markets', 'ad_geo'],
  }
  return <Screen title="Operations overview"><State resource={resource} />
    {resource.data && <div className="grid grid-cols-2 gap-3">{Object.entries(resource.data.counts || {}).map(([key, value]) => <Card key={key} onClick={() => links[key]?.[1] && nav.go(links[key][1])}><p className="text-xs text-ink-500">{links[key]?.[0] || key}</p><p className="text-2xl font-bold">{value}</p></Card>)}</div>}
    <Button full variant="secondary" onClick={() => nav.go('ad_audit')}>Audit log</Button>
  </Screen>
}

export function RemoteAdminCases() {
  const nav = useNav()
  const cases = useGet('/admin/cases')
  const reports = useGet('/admin/reports')
  const appeals = useGet('/admin/appeals')
  const [reportId, setReportId] = useState('')
  const [subject, setSubject] = useState('')
  const [severity, setSeverity] = useState('')
  const [appealDecision, setAppealDecision] = useState({})
  const action = useAction(() => { cases.reload(); reports.reload(); appeals.reload() })
  const openCase = async () => {
    if (!reportId || !subject.trim() || !severity.trim()) return
    const result = await action.run(`/admin/reports/${enc(reportId)}/case`, 'POST', { subject: subject.trim(), severity: severity.trim() })
    if (result.ok) { setReportId(''); setSubject(''); setSeverity('') }
  }
  return <Screen title="Cases and reports"><State resource={cases} /><State resource={reports} /><State resource={appeals} />
    <Section title="Reports awaiting triage">{reports.data?.items?.filter((r) => !r.caseId).map((report) => <Card key={report.id}><b>{report.reason}</b><p className="text-sm">{report.targetType} · {report.targetId}</p><p className="text-xs text-ink-500">{report.details}</p><Button size="sm" onClick={() => { setReportId(report.id); setSubject(report.reason) }}>Open case</Button></Card>)}{reports.data?.items?.filter((r) => !r.caseId).length === 0 && <EmptyState title="No untriaged reports" />}</Section>
    {reportId && <Card><h2 className="font-bold">Open case for report {reportId}</h2><Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} /><Input label="Severity (configured value)" value={severity} onChange={(e) => setSeverity(e.target.value)} /><Button disabled={action.busy || !subject.trim() || !severity.trim()} onClick={openCase}>Create case</Button></Card>}
    <Section title="Cases">{cases.data?.items?.map((item) => <Card key={item.id} onClick={() => nav.go('ad_case', { id: item.id })}><b>{item.subject}</b><p>{item.state} · {item.severity}</p><p className="text-xs text-ink-500">{item.id}</p></Card>)}{cases.data?.items?.length === 0 && <EmptyState title="No cases" />}</Section>
    <Section title="Appeals awaiting decision">{appeals.data?.items?.map((appeal) => <Card key={appeal.id}><b>Case {appeal.caseId}</b><p>{appeal.reason}</p><Input label="Outcome" value={appealDecision[appeal.id]?.outcome || ''} onChange={(e) => setAppealDecision({ ...appealDecision, [appeal.id]: { ...appealDecision[appeal.id], outcome: e.target.value } })} /><Input label="Decision reason" value={appealDecision[appeal.id]?.reason || ''} onChange={(e) => setAppealDecision({ ...appealDecision, [appeal.id]: { ...appealDecision[appeal.id], reason: e.target.value } })} /><Button disabled={!appealDecision[appeal.id]?.outcome?.trim() || !appealDecision[appeal.id]?.reason?.trim() || action.busy} onClick={() => action.run(`/admin/appeals/${enc(appeal.id)}/decision`, 'POST', appealDecision[appeal.id])}>Record decision</Button></Card>)}{appeals.data?.items?.length === 0 && <EmptyState title="No appeals waiting" />}</Section>
    {action.error && <Banner tone="red">{action.error}</Banner>}
  </Screen>
}

export function RemoteAdminCaseDetail({ params = {} }) {
  const caseId = params.id
  const item = useGet(caseId ? `/admin/cases/${enc(caseId)}` : null)
  const [form, setForm] = useState({ state: '', severity: '', resolution: '', reason: '' })
  const action = useAction(item.reload)
  return <Screen title="Case detail"><State resource={item} />
    {item.data && <><Card><h2 className="font-bold">{item.data.subject}</h2><p>{item.data.state} · {item.data.severity}</p><p>Opened {date(item.data.createdAt)}</p>{item.data.resolution && <p>Resolution: {item.data.resolution}</p>}</Card>
      <Card><Input label="State (optional)" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder={item.data.state} /><Input label="Severity (optional)" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} placeholder={item.data.severity} /><Input label="Resolution (optional; requires state)" textarea value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} /><Input label="Reason for change" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /><Button disabled={action.busy || !form.reason.trim() || (!form.state.trim() && !form.severity.trim() && !form.resolution.trim()) || (Boolean(form.resolution.trim()) && !form.state.trim())} onClick={() => action.run(`/admin/cases/${enc(caseId)}`, 'PATCH', { reason: form.reason.trim(), ...(form.state.trim() ? { state: form.state.trim() } : {}), ...(form.severity.trim() ? { severity: form.severity.trim() } : {}), ...(form.resolution.trim() ? { resolution: form.resolution.trim() } : {}) })}>Save case</Button></Card>
    </>}{action.error && <Banner tone="red">{action.error}</Banner>}
  </Screen>
}

export function RemoteAdminAudit() {
  const [filter, setFilter] = useState('')
  const resource = useGet(`/admin/audit${filter ? `?action=${enc(filter)}` : ''}`)
  return <Screen title="Audit log"><Input label="Exact action filter" value={filter} onChange={(e) => setFilter(e.target.value)} /><State resource={resource} />
    {resource.data?.items?.map((entry) => <Card key={entry.id}><b>{entry.action}</b><p className="text-sm">{entry.targetType} · {entry.targetId}</p><p className="text-xs text-ink-500">{date(entry.occurredAt)} · {entry.actorUserId || entry.actorService || 'System'}</p>{entry.reason && <p>{entry.reason}</p>}</Card>)}
    {resource.data?.items?.length === 0 && <EmptyState title="No audit events match" />}
  </Screen>
}

export function RemoteAdminConfig() {
  const resource = useGet('/admin/config')
  const [selected, setSelected] = useState('')
  const [value, setValue] = useState('{}')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState('')
  const action = useAction(resource.reload)
  const save = async () => {
    try {
      const decidedValue = JSON.parse(value)
      if (!decidedValue || Array.isArray(decidedValue) || typeof decidedValue !== 'object') throw new Error('Enter a JSON object.')
      if (!reason.trim()) throw new Error('Enter a decision reason.')
      setLocalError('')
      const result = await action.run(`/admin/config/${enc(selected)}`, 'PATCH', { decidedValue, reason: reason.trim() })
      if (result.ok) { setSelected(''); setValue('{}'); setReason('') }
    } catch (error) { setLocalError(error.message) }
  }
  return <Screen title="Configuration register"><State resource={resource} />
    {resource.data?.items?.map((item) => <Card key={item.code}><b>{item.code} · {item.title}</b><p>{item.status} · Owner: {item.owner}</p><p className="text-sm">{item.requiredDecision}</p>{item.decidedValue && <pre className="overflow-auto text-xs">{JSON.stringify(item.decidedValue, null, 2)}</pre>}<Button size="sm" variant="secondary" onClick={() => setSelected(item.code)}>Record decision</Button></Card>)}
    {selected && <Card><h2 className="font-bold">Decision for {selected}</h2><Input label="Decision value (JSON object)" textarea value={value} onChange={(e) => setValue(e.target.value)} /><Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} /><Button disabled={action.busy} onClick={save}>Save decision</Button></Card>}
    {(localError || action.error) && <Banner tone="red">{localError || action.error}</Banner>}
  </Screen>
}

export function RemoteAdminSettings() {
  const resource = useGet('/admin/settings')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('{}')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState('')
  const action = useAction(resource.reload)
  const save = async () => {
    try {
      const parsed = JSON.parse(value)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Enter a JSON object.')
      if (!key.trim() || !reason.trim()) throw new Error('Enter the setting key and reason.')
      setLocalError('')
      const result = await action.run(`/admin/settings/${enc(key.trim())}`, 'PUT', { value: parsed, reason: reason.trim() })
      if (result.ok) { setKey(''); setValue('{}'); setReason('') }
    } catch (error) { setLocalError(error.message) }
  }
  return <Screen title="Platform settings"><Banner tone="blue">Settings are stored and audited. Runtime behavior is enabled only where the backend has a consumer.</Banner><State resource={resource} />
    {resource.data?.items?.map((item) => <Card key={item.key}><b>{item.key}</b><pre className="overflow-auto text-xs">{JSON.stringify(item.value, null, 2)}</pre></Card>)}
    <Card><Input label="Setting key" value={key} onChange={(e) => setKey(e.target.value)} /><Input label="Value (JSON object)" textarea value={value} onChange={(e) => setValue(e.target.value)} /><Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} /><Button disabled={action.busy} onClick={save}>Store setting</Button></Card>
    {(localError || action.error) && <Banner tone="red">{localError || action.error}</Banner>}
  </Screen>
}

export function RemoteAdminAgents() {
  const resource = useGet('/admin/agents/leads')
  return <Screen title="Agent oversight" subtitle="Assigned prospective vendor leads"><State resource={resource} />
    {resource.data?.items?.map((lead) => <Card key={lead.id}><b>{lead.businessName || lead.prospectName}</b><p>{lead.status}</p><p className="text-xs text-ink-500">Assigned agent {lead.assignedAgentUserId}</p></Card>)}
    {resource.data?.items?.length === 0 && <EmptyState title="No agent leads" />}
  </Screen>
}

export function RemoteAdminSubscriptions({ params = {} }) {
  const nav = useNav()
  const [state, setState] = useState('')
  const resource = useGet(`/admin/subscriptions${state ? `?state=${enc(state)}` : ''}`)
  const selected = params.id && resource.data?.items?.find((item) => item.id === params.id || item.vendorId === params.id)
  const rows = params.id ? (selected ? [selected] : []) : resource.data?.items || []
  return <Screen title="Subscription monitoring"><label className="block text-sm">State<select className="mt-1 w-full rounded-xl border p-3" value={state} onChange={(e) => setState(e.target.value)}>{['', 'active', 'payment_failed', 'expired', 'cancel_at_period_end', 'cancelled'].map((option) => <option key={option} value={option}>{option || 'All'}</option>)}</select></label><State resource={resource} />
    {rows.map((item) => <Card key={item.id} onClick={() => !params.id && nav.go('ad_sub', { id: item.id })}><b>{item.planName}</b><p>{item.state} · Vendor {item.vendorId}</p><p className="text-xs text-ink-500">Period ends {date(item.currentPeriodEnd)}{item.graceEndsAt ? ` · Grace ends ${date(item.graceEndsAt)}` : ''}</p></Card>)}
    {!resource.loading && !resource.error && rows.length === 0 && <EmptyState title="No subscriptions match" />}
  </Screen>
}

export function RemoteAdminPlans() {
  const resource = useGet('/admin/plans')
  const action = useAction(resource.reload)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState('')
  const [version, setVersion] = useState({ priceMinor: '', currency: '', billingInterval: '', entitlements: '{}' })
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState('')
  const addVersion = async () => {
    try {
      const entitlements = JSON.parse(version.entitlements)
      if (!entitlements || Array.isArray(entitlements) || typeof entitlements !== 'object') throw new Error('Entitlements must be a JSON object.')
      const body = { entitlements, ...(version.priceMinor !== '' ? { priceMinor: Number(version.priceMinor) } : {}), ...(version.currency.trim() ? { currency: version.currency.trim().toUpperCase() } : {}), ...(version.billingInterval.trim() ? { billingInterval: version.billingInterval.trim() } : {}) }
      const result = await action.run(`/admin/plans/${enc(selected)}/versions`, 'POST', body)
      if (result.ok) setSelected('')
      setLocalError('')
    } catch (error) { setLocalError(error.message) }
  }
  return <Screen title="Plans and entitlements"><State resource={resource} />
    <Card><Input label="New plan name" value={name} onChange={(e) => setName(e.target.value)} /><Button disabled={action.busy || !name.trim()} onClick={async () => { const result = await action.run('/admin/plans', 'POST', { name: name.trim() }); if (result.ok) setName('') }}>Create draft plan</Button></Card>
    {resource.data?.items?.map((plan) => <Card key={plan.id}><h2 className="font-bold">{plan.name} · {plan.status}</h2><p>Version {plan.version || 'none'} · {plan.priceMinor == null ? 'No price' : `${plan.currency} ${(Number(plan.priceMinor) / 100).toFixed(2)}`} {plan.billingInterval || ''}</p><pre className="overflow-auto text-xs">{JSON.stringify(plan.entitlements, null, 2)}</pre><Button size="sm" variant="secondary" onClick={() => setSelected(plan.id)}>Add version</Button><div className="mt-2 flex gap-2">{['draft', 'active', 'retired'].filter((status) => status !== plan.status).map((status) => <Button key={status} size="sm" disabled={!reason.trim() || action.busy} onClick={() => action.run(`/admin/plans/${enc(plan.id)}/status`, 'PATCH', { status, reason: reason.trim() })}>{status}</Button>)}</div></Card>)}
    <Input label="Reason for status change" value={reason} onChange={(e) => setReason(e.target.value)} />
    {selected && <Card><h2 className="font-bold">New version for {selected}</h2><Input label="Price (minor units)" type="number" value={version.priceMinor} onChange={(e) => setVersion({ ...version, priceMinor: e.target.value })} /><Input label="Currency" value={version.currency} onChange={(e) => setVersion({ ...version, currency: e.target.value })} /><Input label="Billing interval" value={version.billingInterval} onChange={(e) => setVersion({ ...version, billingInterval: e.target.value })} /><Input label="Entitlements (JSON object)" textarea value={version.entitlements} onChange={(e) => setVersion({ ...version, entitlements: e.target.value })} /><Button disabled={action.busy} onClick={addVersion}>Add version</Button></Card>}
    {(localError || action.error) && <Banner tone="red">{localError || action.error}</Banner>}
  </Screen>
}

export function RemoteAdminSponsored() {
  const resource = useGet('/admin/sponsored-campaigns')
  const action = useAction(resource.reload)
  const [reason, setReason] = useState('')
  return <Screen title="Sponsored campaigns"><Banner tone="blue">Activation is unavailable until commercial rules and all publication gates are ready.</Banner><State resource={resource} />
    <Input label="Reason for pause or end" value={reason} onChange={(e) => setReason(e.target.value)} />
    {resource.data?.items?.map((campaign) => <Card key={campaign.id}><b>{campaign.placement}</b><p>{campaign.status} · Vendor {campaign.vendorId}</p><p className="text-xs">{campaign.listingId || 'Vendor-level campaign'}</p><div className="flex gap-2">{campaign.status === 'active' && <Button size="sm" disabled={!reason.trim() || action.busy} onClick={() => action.run(`/admin/sponsored-campaigns/${enc(campaign.id)}/status`, 'PATCH', { status: 'paused', reason: reason.trim() })}>Pause</Button>}{campaign.status !== 'ended' && <Button size="sm" variant="secondary" disabled={!reason.trim() || action.busy} onClick={() => action.run(`/admin/sponsored-campaigns/${enc(campaign.id)}/status`, 'PATCH', { status: 'ended', reason: reason.trim() })}>End</Button>}</div></Card>)}
    {resource.data?.items?.length === 0 && <EmptyState title="No campaigns" />}{action.error && <Banner tone="red">{action.error}</Banner>}
  </Screen>
}

export function RemoteAdminReports() {
  const reports = useGet('/admin/reports')
  const nav = useNav()
  return <Screen title="Reports"><Banner tone="blue">Detailed analytics and exports are not available in the live API yet.</Banner><State resource={reports} />
    {reports.data?.items?.map((report) => <Card key={report.id} onClick={() => nav.go('ad_cases')}><b>{report.reason}</b><p>{report.targetType} · {report.targetId}</p><p className="text-xs text-ink-500">{date(report.createdAt)}</p></Card>)}
    {reports.data?.items?.length === 0 && <EmptyState title="No reports" />}
  </Screen>
}

export function RemoteAdminRoles({ params = {}, userLookup = false }) {
  const roles = useGet('/admin/roles')
  const [userId, setUserId] = useState(params.id || '')
  const [selectedId, setSelectedId] = useState(params.id || '')
  const assignments = useGet(selectedId ? `/admin/users/${enc(selectedId)}/roles` : null)
  const action = useAction(assignments.reload)
  const [role, setRole] = useState('SALES_AGENT')
  const [reason, setReason] = useState('')
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId.trim())
  const change = async (method, roleCode) => {
    const path = `/admin/users/${enc(selectedId)}/roles${method === 'DELETE' ? `/${roleCode}` : ''}`
    const result = await action.run(path, method, method === 'DELETE' ? { reason: reason.trim() } : { roleCode, reason: reason.trim() })
    if (result.ok) setReason('')
  }
  return <Screen title="Roles and permissions">
    {userLookup && <Banner tone="blue">The live API does not offer a user directory or account-state management yet. You can inspect roles by user ID.</Banner>}
    <State resource={roles} />
    {roles.data?.roles?.map((item) => <Card key={item.code}><b>{item.displayName || item.code}</b><p>{item.code}{item.assignable ? ' · manually assignable' : ' · system managed'}</p><p className="text-xs">{item.permissions?.join(', ') || 'No permissions listed'}</p></Card>)}
    <Section title="User role assignments"><Banner tone="blue">Enter a user ID to inspect or change assigned staff roles. Customer and vendor roles are managed by the system.</Banner><Input label="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} /><Button disabled={!validId} onClick={() => setSelectedId(userId.trim())}>Load assignments</Button><State resource={assignments} />
      {assignments.data?.roles?.map((item) => <Card key={item.id}><b>{item.roleCode}</b><p>Granted {date(item.grantedAt)}</p>{['SALES_AGENT', 'SUPER_ADMIN'].includes(item.roleCode) && <Button size="sm" variant="secondary" disabled={!reason.trim() || action.busy} onClick={() => change('DELETE', item.roleCode)}>Revoke with reason</Button>}</Card>)}
      {assignments.data && !assignments.data.roles?.length && <Card>No active staff-role assignments.</Card>}
      {assignments.data && <Card><h3 className="font-semibold">Grant staff role</h3><select className="rounded border p-2" aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}><option value="SALES_AGENT">Sales Agent</option><option value="SUPER_ADMIN">Super Admin</option></select><Input label="Audit reason" value={reason} onChange={(event) => setReason(event.target.value)} /><Button disabled={!reason.trim() || action.busy} onClick={() => change('POST', role)}>Grant role</Button></Card>}
      {action.error && <Banner tone="red">{action.error}</Banner>}
    </Section>
  </Screen>
}

export function RemoteAdminUsers({ params = {} }) {
  return <RemoteAdminRoles params={params} userLookup />
}

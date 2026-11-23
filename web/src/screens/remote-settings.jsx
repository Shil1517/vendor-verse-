/*
 * Customer Settings & privacy on the real API (F-ACC-04/05/07/08), used instead of the
 * seed-data screen when VITE_API_BASE_URL is set. Everything here is saved server-side:
 * notification preferences, signed-in devices, data export and deletion requests.
 * Language is a device setting and stays local.
 */
import { useCallback, useEffect, useState } from 'react'
import { Download, Laptop, LogOut, Trash2 } from 'lucide-react'
import { Badge, Banner, Button, Card, Dialog, Group, ListRow, Screen, Section, Segmented, Toggle } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { authService } from '../services/authService.js'
import { ErrorBox, Loading, useLoad } from './remote-discovery.jsx'

const CATEGORIES = [['orders', 'Order updates'], ['bookings', 'Booking updates'], ['quotes', 'Quotation alerts'], ['promos', 'Offers & promotions']]
const DEFAULT_ON = { orders: true, bookings: true, quotes: true, promos: false } // shown until the user saves a choice
const deviceName = (d = {}) => d.name || d.userAgent || 'Signed-in device'
const openRequest = (requests, type) => (requests || []).find((r) => r.type === type && ['requested', 'verified', 'in_progress'].includes(r.status))

export function RemoteCustomerSettings() {
  const { lang, setLang, toast } = useApp()
  const [prefs, setPrefs] = useState(DEFAULT_ON)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const stored = useLoad(useCallback(() => authService.getNotificationPreferences(), []), [])
  const sessions = useLoad(useCallback(() => authService.listSessions(), []), [])
  const requests = useLoad(useCallback(() => authService.listDataRequests(), []), [])

  useEffect(() => {
    const rows = stored.data?.preferences
    if (!rows?.length) return
    setPrefs((p) => ({
      ...p,
      ...Object.fromEntries(CATEGORIES.map(([k]) => {
        const row = rows.find((x) => x.channel === 'in_app' && x.category === k)
        return [k, row ? row.enabled : p[k]]
      })),
    }))
  }, [stored.data])

  const toggle = async (key, value) => {
    const before = prefs
    setPrefs({ ...prefs, [key]: value })
    const r = await authService.saveNotificationPreferences([{ channel: 'in_app', category: key, enabled: value }])
    if (!r.ok) { setPrefs(before); toast(r.message, 'warn') }
  }

  const signOut = async (id) => {
    const r = await authService.revokeSession(id)
    if (!r.ok) return toast(r.message, 'warn')
    toast('Signed out of that device')
    sessions.reload()
  }
  const signOutOthers = async () => {
    const results = await Promise.all(list.filter((s) => !s.current).map((s) => authService.revokeSession(s.id)))
    const all = results.every((r) => r.ok)
    toast(all ? 'Signed out everywhere else' : 'Some devices could not be signed out', all ? undefined : 'warn')
    sessions.reload()
  }

  const dataRequest = async (type, done) => {
    setBusy(true)
    const r = await authService.requestDataRequest(type)
    setBusy(false)
    if (!r.ok) return toast(r.message, 'warn')
    toast(done)
    requests.reload()
  }
  const cancelRequest = async (id) => {
    setBusy(true)
    const r = await authService.cancelDataRequest(id)
    setBusy(false)
    if (!r.ok) return toast(r.message, 'warn')
    toast('Request cancelled')
    requests.reload()
  }

  const list = sessions.data?.sessions || []
  const exportOpen = openRequest(requests.data?.requests, 'export')
  const deleteOpen = openRequest(requests.data?.requests, 'deletion')
  const cancelBtn = (id) => <button type="button" disabled={busy} onClick={() => cancelRequest(id)} className="text-[13px] font-bold text-red-600">Cancel</button>

  return (
    <Screen
      title="Settings & privacy"
      overlay={<Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Request account deletion?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" className="flex-1" disabled={busy} onClick={() => { setConfirmDelete(false); dataRequest('deletion', 'Deletion request submitted') }}>Request deletion</Button></>}><p>Open bookings, orders, RFQs or contracts must be closed first, and some records are kept where the law requires it. You can cancel the request while it is pending.</p></Dialog>}
    >
      <Section title="Language"><Segmented value={lang} onChange={setLang} options={[{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिन्दी' }]} /></Section>

      <Section title="Notifications">
        {stored.error && <ErrorBox message={stored.error} onRetry={stored.reload} />}
        <Card className="space-y-1">
          <Toggle label="In-app notifications" desc="Always on: security and account notices cannot be switched off" on={true} onChange={() => toast('In-app alerts are required')} />
          <div className="h-px bg-ink-100" />
          {CATEGORIES.map(([k, label]) => <Toggle key={k} label={label} on={!!prefs[k]} onChange={(v) => toggle(k, v)} />)}
        </Card>
        <Banner tone="blue" title="More channels coming">Email, SMS, push and WhatsApp alerts will be enabled once providers are ready.</Banner>
      </Section>

      <Section title="Active sessions">
        {sessions.loading && !sessions.data && <Loading />}
        {sessions.error && <ErrorBox message={sessions.error} onRetry={sessions.reload} />}
        {sessions.data && <>
          <Group>{list.map((s, i) => <ListRow key={s.id} icon={Laptop} tone="slate" title={deviceName(s.device)} subtitle={`Signed in ${new Date(s.createdAt).toLocaleString()}`} last={i === list.length - 1} right={s.current ? <Badge tone="green">Current</Badge> : <button type="button" onClick={() => signOut(s.id)} className="text-[13px] font-bold text-red-600">Sign out</button>} />)}</Group>
          {list.some((s) => !s.current) && <Button full variant="secondary" icon={LogOut} onClick={signOutOthers}>Sign out of all other devices</Button>}
        </>}
      </Section>

      <Section title="Your data">
        {requests.error && <ErrorBox message={requests.error} onRetry={requests.reload} />}
        <Group>
          {exportOpen
            ? <ListRow icon={Download} tone="sky" title="Data export requested" subtitle="Your request is recorded. Fulfilment is not automated yet." right={cancelBtn(exportOpen.id)} />
            : <ListRow icon={Download} tone="sky" title="Export my data" subtitle="Request a copy of your profile, bookings, RFQs and orders" onClick={() => !busy && !requests.loading && dataRequest('export', 'Export requested')} />}
          {deleteOpen
            ? <ListRow icon={Trash2} danger title="Deletion requested" subtitle="Your account stays active while the request is pending." right={cancelBtn(deleteOpen.id)} last />
            : <ListRow icon={Trash2} danger title="Delete my account" subtitle="Subject to legal retention rules" onClick={() => !requests.loading && setConfirmDelete(true)} last />}
        </Group>
      </Section>
    </Screen>
  )
}

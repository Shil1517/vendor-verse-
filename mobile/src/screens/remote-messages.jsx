import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Banner, Button, Card, EmptyState, Screen } from '../ui.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'

const enc = encodeURIComponent
const errorText = (result) => result.message || 'Request failed. Please try again.'

function useRemote(path) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState({ loading: Boolean(path), data: null, error: '' })
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

function LoadState({ state }) {
  if (state.loading) return <Card>Loading…</Card>
  if (state.error) return <Banner tone="red">{state.error}<Button onClick={state.reload}>Retry</Button></Banner>
  return null
}

export function RemoteVendorProfile({ params = {} }) {
  const nav = useNav()
  const [state, setState] = useState({ loading: true, vendor: null, error: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    authService.getPublicVendor(params.id).then((result) => {
      if (live) setState(result.ok ? { loading: false, vendor: result.vendor, error: '' } : { loading: false, vendor: null, error: errorText(result) })
    })
    return () => { live = false }
  }, [params.id])
  const start = async () => {
    setBusy(true)
    const result = await authService.apiRequest('/conversations', { method: 'POST', body: { vendorId: state.vendor.id } })
    setBusy(false)
    if (result.ok) nav.go('chat', { id: result.data.id })
    else setState((old) => ({ ...old, error: errorText(result) }))
  }
  return <Screen title="Vendor profile"><LoadState state={state} />{state.vendor && <Card><h1 className="text-xl font-bold">{state.vendor.name}</h1>{state.vendor.description && <p>{state.vendor.description}</p>}<Button disabled={busy} onClick={start}>{busy ? 'Opening…' : 'Message vendor'}</Button></Card>}</Screen>
}

export function RemoteMessages() {
  const nav = useNav()
  const inbox = useRemote('/conversations')
  return <Screen title="Messages" back={false}>
    <LoadState state={inbox} />
    {!inbox.loading && !inbox.error && !inbox.data?.conversations?.length && <EmptyState icon={MessageCircle} title="No conversations" body="Open a vendor profile to start a conversation." />}
    <div className="space-y-2">{inbox.data?.conversations?.map((item) => <button key={item.id} className="w-full rounded-xl border bg-white p-4 text-left" onClick={() => nav.go('chat', { id: item.id })}>
      <strong>{item.viewerRole === 'vendor' ? 'Customer conversation' : item.vendorName || 'Vendor'}</strong>
      <p className="text-xs text-ink-500">{item.lastMessageAt ? `Last message ${new Date(item.lastMessageAt).toLocaleString()}` : 'Start the conversation'}</p>
    </button>)}</div>
  </Screen>
}

export function RemoteChat({ params = {} }) {
  const id = params.id
  const thread = useRemote(id ? `/conversations/${enc(id)}` : null)
  const consents = useRemote(id ? `/conversations/${enc(id)}/contact-consents` : null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [scope, setScope] = useState('phone')
  const [ownUserId, setOwnUserId] = useState('')
  useEffect(() => { authService.apiRequest('/me').then((result) => { if (result.ok) setOwnUserId(result.data?.userId || '') }) }, [])
  const send = async () => {
    if (!id || !message.trim() || busy) return
    setBusy(true); setFailure('')
    const result = await authService.apiRequest(`/conversations/${enc(id)}/messages`, { method: 'POST', body: { body: message.trim() } })
    setBusy(false)
    if (!result.ok) { setFailure(errorText(result)); return }
    setMessage(''); thread.reload()
  }
  const consent = consents.data?.consents?.filter((item) => item.userId === ownUserId) || []
  const hasScope = consent.some((item) => item.scope === scope)
  const changeConsent = async () => {
    if (!id || busy) return
    setBusy(true); setFailure('')
    const path = `/conversations/${enc(id)}/contact-consents${hasScope ? `/${scope}` : ''}`
    const result = await authService.apiRequest(path, { method: hasScope ? 'DELETE' : 'POST', body: hasScope ? undefined : { scope } })
    setBusy(false)
    if (!result.ok) { setFailure(errorText(result)); return }
    consents.reload()
  }
  return <Screen title={thread.data?.vendorName || 'Conversation'}>
    {!id && <EmptyState icon={MessageCircle} title="Choose a conversation" />}
    <LoadState state={thread} />
    {failure && <Banner tone="red">{failure}</Banner>}
    <div className="space-y-2">{thread.data?.messages?.map((item) => <div key={item.id} className={`rounded-xl p-3 ${item.mine ? 'bg-blue-50' : 'bg-white'}`}><p>{item.body}</p><small>{new Date(item.sentAt).toLocaleString()}{item.contactFiltered ? ' · Contact details hidden' : ''}</small></div>)}</div>
    {thread.data && <div className="mt-4 space-y-2"><textarea aria-label="Message" className="w-full rounded-xl border p-3" value={message} onChange={(event) => setMessage(event.target.value)} /><Button disabled={busy || !message.trim()} onClick={send}>Send</Button></div>}
    {thread.data && <Card><h2 className="font-semibold">Share contact details</h2><p className="text-sm text-ink-500">Your contact details in messages are hidden unless you allow sharing. You can revoke permission at any time.</p><select aria-label="Contact detail type" className="my-2 w-full rounded-xl border p-2" value={scope} onChange={(event) => setScope(event.target.value)}><option value="phone">Phone</option><option value="email">Email</option><option value="phone_and_email">Phone and email</option></select><LoadState state={consents} />{!consents.loading && !consents.error && ownUserId && <Button disabled={busy} onClick={changeConsent}>{hasScope ? 'Stop sharing' : 'Allow sharing'}</Button>}</Card>}
  </Screen>
}

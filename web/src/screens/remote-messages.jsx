import { useEffect, useState } from 'react'
import { MessageCircle, Send, Store } from 'lucide-react'
import { Banner, Button, Card, EmptyState, Input, KV, Screen, Section } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { openAuthDialog } from '../components/MarketplaceAuthDialog.jsx'
import { ErrorBox, Loading, fmtWhen, useLoad } from './remote-discovery.jsx'

export function RemoteVendorProfile({ params = {} }) {
  const nav = useNav()
  const { me } = useApp()
  const vendor = useLoad(() => authService.getPublicVendor(params.id), [params.id])
  const listing = useLoad(() => params.listingId ? authService.getPublicListing(params.listingId) : Promise.resolve({ ok: true, listing: null }), [params.listingId])
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  if (vendor.loading && !vendor.data) return <Screen title="Vendor profile"><Loading /></Screen>
  if (vendor.error) return <Screen title="Vendor profile"><ErrorBox message={vendor.error} onRetry={vendor.reload} /></Screen>
  const v = vendor.data.vendor
  const l = listing.data?.listing
  const message = async () => {
    if (!me.loggedIn) return openAuthDialog('signin')
    setBusy(true)
    setFailure('')
    const r = await authService.startConversation(v.id, l?.id)
    setBusy(false)
    if (!r.ok) return setFailure(r.message || 'Could not open a conversation.')
    nav.go('chat', { id: r.conversation.id })
  }
  return <Screen title="Vendor profile" subtitle={v.name} footer={<Button full icon={MessageCircle} disabled={busy} onClick={message}>{busy ? 'Opening…' : 'Message vendor'}</Button>}>
    {failure && <Banner tone="red" title="Could not message vendor">{failure}</Banner>}
    <Card><h1 className="text-xl font-bold text-ink-900">{v.name}</h1><p className="mt-1 text-sm text-ink-500">{v.roles?.map((role) => role.label).join(' · ') || 'Verified vendor'}</p></Card>
    {v.description && <Card><p className="text-sm text-ink-700">{v.description}</p></Card>}
    <Card><KV rows={[
      ['Country', v.registrationCountry || 'Not provided'],
      ['Established', v.yearEstablished || 'Not provided'],
      ['Languages', v.languages?.join(', ') || 'Not provided'],
    ]} /></Card>
    {listing.loading && params.listingId && <Loading />}
    {l && l.vendor?.id === v.id && <Section title="Listing"><Card onClick={() => nav.go('c_listing', { id: l.id })}><p className="text-sm font-bold">{l.title}</p><p className="text-xs text-ink-500">Open listing</p></Card></Section>}
  </Screen>
}

export function RemoteMessages() {
  const nav = useNav()
  const { me } = useApp()
  const state = useLoad(() => authService.listConversations(), [me.role])
  if (!me.loggedIn) return <Screen title="Messages"><EmptyState icon={MessageCircle} title="Sign in to see messages" action={<Button onClick={() => openAuthDialog('signin')}>Sign in</Button>} /></Screen>
  return <Screen title="Messages" back={false}>
    {state.loading && !state.data && <Loading />}
    {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
    {state.data?.conversations?.length === 0 && <EmptyState icon={MessageCircle} title="No conversations yet" body="Open a vendor profile to start one." />}
    <div className="space-y-3">{state.data?.conversations?.map((c) => <Card key={c.id} onClick={() => nav.go('chat', { id: c.id })}>
      <div className="flex items-center gap-3"><Store size={18} /><div><p className="text-sm font-bold">{c.vendorName}</p><p className="text-xs text-ink-500">{c.lastMessageAt ? `Last message ${fmtWhen(c.lastMessageAt)}` : 'Start the conversation'}</p></div></div>
    </Card>)}</div>
  </Screen>
}

export function RemoteChat({ params = {} }) {
  const { me } = useApp()
  const state = useLoad(() => authService.getConversation(params.id), [params.id])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  useEffect(() => {
    if (!me.loggedIn || !params.id) return undefined
    const timer = setInterval(() => state.reload(), 5000)
    return () => clearInterval(timer)
  }, [me.loggedIn, params.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (state.loading && !state.data) return <Screen title="Conversation"><Loading /></Screen>
  if (state.error && !state.data) return <Screen title="Conversation"><ErrorBox message={state.error} onRetry={state.reload} /></Screen>
  const c = state.data?.conversation
  const send = async () => {
    if (!message.trim() || busy) return
    setBusy(true)
    setFailure('')
    const r = await authService.sendConversationMessage(c.id, message.trim())
    setBusy(false)
    if (!r.ok) return setFailure(r.message || 'Could not send the message.')
    setMessage('')
    state.reload()
  }
  return <Screen title={c?.vendorName || 'Conversation'} subtitle={c?.viewerRole === 'vendor' ? 'Customer conversation' : 'Vendor conversation'} footer={<div className="flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm" aria-label="Message" placeholder="Type a message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} /><Button icon={Send} disabled={busy || !message.trim()} onClick={send}>Send</Button></div>}>
    {failure && <Banner tone="red" title="Message not sent">{failure}</Banner>}
    {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
    {!c?.messages?.length && <EmptyState icon={MessageCircle} title="Say hello" body="Messages you send here reach the vendor's inbox." />}
    <div className="space-y-2">{c?.messages?.map((item) => <div key={item.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${item.mine ? 'ml-auto bg-brand-600 text-white' : 'bg-white text-ink-900'}`}><p className="whitespace-pre-wrap break-words">{item.body}</p><p className="mt-1 text-[11px] opacity-70">{fmtWhen(item.sentAt)}</p></div>)}</div>
  </Screen>
}

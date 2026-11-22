import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Globe2, MessageCircle, Send, Store } from 'lucide-react'
import { Banner, Button, EmptyState, Screen } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { openAuthDialog } from '../components/MarketplaceAuthDialog.jsx'
import { ErrorBox, Loading, fmtWhen, priceLabel, useLoad } from './remote-discovery.jsx'
import './remote-vendor-profile.css'

const displayName = (code, type) => {
  try { return new Intl.DisplayNames(['en'], { type }).of(code) || code } catch { return code }
}

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
  const featuredListing = l?.vendor?.id === v.id ? l : null
  const country = v.registrationCountry ? displayName(v.registrationCountry, 'region') : null
  const languages = v.languages?.map((code) => displayName(code, 'language')).join(', ')
  const roles = v.roles?.map((role) => role.label).filter(Boolean) || []
  const message = async () => {
    if (!me.loggedIn) return openAuthDialog('signin')
    setBusy(true)
    setFailure('')
    const r = await authService.startConversation(v.id, l?.id)
    setBusy(false)
    if (!r.ok) return setFailure(r.message || 'Could not open a conversation.')
    nav.go('chat', { id: r.conversation.id })
  }
  return <Screen title="Vendor profile" subtitle={v.name} pad={false} scrollClass="vv-remote-vendor-scroll">
    <div className="vv-remote-vendor-page">
      <div className="vv-remote-vendor-inner">
        <section className="vv-remote-vendor-hero" aria-labelledby="vendor-name">
          <span className="vv-remote-vendor-eyebrow">Vendor profile</span>
          <div className="vv-remote-vendor-avatar" aria-hidden="true">{v.name?.trim().charAt(0).toUpperCase() || 'V'}</div>
          <h1 id="vendor-name">{v.name}</h1>
          <p className="vv-remote-vendor-role">{roles.join(' · ') || 'Marketplace vendor'}</p>
          {v.description && <p className="vv-remote-vendor-description">{v.description}</p>}
          <div className="vv-remote-vendor-action">
            {failure && <Banner tone="red" title="Could not message vendor">{failure}</Banner>}
            <button type="button" className="vv-remote-vendor-message" disabled={busy} onClick={message}>
              <MessageCircle size={19} aria-hidden="true" />{busy ? 'Opening…' : 'Message vendor'}
            </button>
            <p>Ask a question or discuss your requirements directly.</p>
          </div>
        </section>

        <div className="vv-remote-vendor-content">
          <section className="vv-remote-vendor-offerings" aria-labelledby="vendor-offerings-title">
            <div className="vv-remote-vendor-section-heading"><span>Explore</span><h2 id="vendor-offerings-title">What this vendor offers</h2></div>
            {listing.loading && params.listingId && <Loading />}
            {featuredListing && <button type="button" className="vv-remote-vendor-listing" onClick={() => nav.go('c_listing', { id: featuredListing.id })}>
              <span className="vv-remote-vendor-listing-icon"><Store size={25} aria-hidden="true" /></span>
              <span className="vv-remote-vendor-listing-copy">
                <span className="vv-remote-vendor-listing-type">{featuredListing.listingType === 'product' ? 'Product' : 'Service'}{featuredListing.categoryName ? ` · ${featuredListing.categoryName}` : ''}</span>
                <strong>{featuredListing.title}</strong>
                <span className="vv-remote-vendor-listing-price">{priceLabel(featuredListing.price)}</span>
              </span>
              <ArrowUpRight className="vv-remote-vendor-listing-arrow" size={20} aria-hidden="true" />
            </button>}
            {!params.listingId && <p className="vv-remote-vendor-empty">Browse this vendor's profile or send a message to ask about their products and services.</p>}
          </section>

          <aside className="vv-remote-vendor-about" aria-labelledby="vendor-about-title">
            <div className="vv-remote-vendor-section-heading"><span>Details</span><h2 id="vendor-about-title">About this vendor</h2></div>
            <div className="vv-remote-vendor-facts">
              {country && <div><span>Based in</span><strong><Globe2 size={16} aria-hidden="true" />{country}</strong></div>}
              {v.yearEstablished && <div><span>Established</span><strong>{v.yearEstablished}</strong></div>}
              {languages && <div><span>Languages</span><strong>{languages}</strong></div>}
              {!country && !v.yearEstablished && !languages && <p>Business details will appear here when provided by the vendor.</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  </Screen>
}

export function RemoteMessages() {
  const { me } = useApp()
  const state = useLoad(() => authService.listConversations(), [me.role])
  if (!me.loggedIn) return <Screen title="Messages"><EmptyState icon={MessageCircle} title="Sign in to see messages" action={<Button onClick={() => openAuthDialog('signin')}>Sign in</Button>} /></Screen>
  if (state.loading && !state.data) return <Screen title="Messages" back={false}><Loading /></Screen>
  if (state.error) return <Screen title="Messages" back={false}><ErrorBox message={state.error} onRetry={state.reload} /></Screen>
  if (!state.data?.conversations?.length) return <Screen title="Messages" back={false}><EmptyState icon={MessageCircle} title="No conversations yet" body="Open a vendor profile to start one." /></Screen>
  return <RemoteChat params={{ id: state.data.conversations[0].id }} initialConversations={state.data.conversations} />
}

export function RemoteChat({ params = {}, initialConversations }) {
  const nav = useNav()
  const { me } = useApp()
  const [selectedId, setSelectedId] = useState(params.id)
  const state = useLoad(() => authService.getConversation(selectedId), [selectedId])
  const inbox = useLoad(() => authService.listConversations(), [me.role])
  const conversations = inbox.data?.conversations || initialConversations || []
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  useEffect(() => {
    if (!me.loggedIn || !selectedId) return undefined
    const timer = setInterval(() => state.reload(), 5000)
    return () => clearInterval(timer)
  }, [me.loggedIn, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps
  const c = state.data?.conversation?.id === selectedId ? state.data.conversation : null
  const selectedThread = conversations.find((thread) => thread.id === selectedId)
  const send = async () => {
    if (!c || !message.trim() || busy) return
    setBusy(true)
    setFailure('')
    const r = await authService.sendConversationMessage(c.id, message.trim())
    setBusy(false)
    if (!r.ok) return setFailure(r.message || 'Could not send the message.')
    setMessage('')
    state.reload()
    inbox.reload()
  }
  const isVendor = c?.viewerRole === 'vendor' || me.role === 'vendor'
  const conversationName = (thread) => isVendor ? (thread.customerName || thread.vendorName || 'Customer') : (thread.vendorName || 'Vendor')
  return <Screen headerless pad={false} scrollClass="vv-conversation-scroll">
    <div className="vv-conversation-page">
    <div className="vv-conversation-page-title">Messages</div>
    <div className="vv-conversation-workspace">
      <aside className="vv-conversation-list" aria-label={isVendor ? 'Customer conversations' : 'Vendor conversations'}>
        <div className="vv-conversation-list-heading"><h2>{isVendor ? 'Customers' : 'Vendors'}</h2><span>{conversations.length}</span></div>
        {inbox.loading && conversations.length === 0 && <p className="vv-conversation-list-note">Loading conversations…</p>}
        {inbox.error && <div className="vv-conversation-list-note"><ErrorBox message={inbox.error} onRetry={inbox.reload} /></div>}
        {!inbox.loading && conversations.length === 0 && <p className="vv-conversation-list-note">Your conversations will appear here.</p>}
        <div className="vv-conversation-list-items">{conversations.map((thread) => <button type="button" key={thread.id} aria-current={thread.id === selectedId ? 'page' : undefined} className={`vv-conversation-item${thread.id === selectedId ? ' is-selected' : ''}`} onClick={() => { setFailure(''); setMessage(''); setSelectedId(thread.id) }}>
          <span className="vv-conversation-avatar" aria-hidden="true">{conversationName(thread).trim().charAt(0).toUpperCase()}</span>
          <span className="vv-conversation-item-copy"><strong>{conversationName(thread)}</strong><small>{thread.lastMessageAt ? `Last message ${fmtWhen(thread.lastMessageAt)}` : 'Start the conversation'}</small></span>
        </button>)}</div>
      </aside>
      <section className="vv-conversation-chat" aria-label="Conversation">
        <header className="vv-conversation-chat-heading">{nav.id === 'chat' && <button type="button" aria-label="Back to messages" onClick={() => nav.go('messages')}><ArrowLeft size={21} /></button>}<div><h1>{isVendor ? (c?.customerName || selectedThread?.customerName || 'Customer') : (c?.vendorName || selectedThread?.vendorName || 'Vendor')}</h1><p>{isVendor ? 'Customer conversation' : 'Vendor conversation'}</p></div></header>
        <div className="vv-conversation-messages">
          {failure && <Banner tone="red" title="Message not sent">{failure}</Banner>}
          {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
          {state.loading && !c && <Loading />}
          {c && !c.messages?.length && <EmptyState icon={MessageCircle} title="Say hello" body="Messages you send here reach the conversation." />}
          {c?.messages?.map((item) => <div key={item.id} className={`vv-conversation-bubble${item.mine ? ' is-mine' : ''}`}><p>{item.body}</p><small>{fmtWhen(item.sentAt)}</small></div>)}
        </div>
        <div className="vv-conversation-compose"><input aria-label="Message" placeholder="Type a message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} /><Button icon={Send} disabled={!c || busy || !message.trim()} onClick={send}>Send</Button></div>
      </section>
    </div>
    </div>
  </Screen>
}

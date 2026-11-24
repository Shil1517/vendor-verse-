import { useEffect, useRef, useState } from 'react'
import { Phone, Mail, KeyRound, ShieldCheck, Store, User, ArrowRight, Lock, Sparkles, Truck, FileText, Globe } from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { HOME } from '../roles.js'
import { ME } from '../data.jsx'
import { Button, Input, Segmented, Screen, Checkbox, Banner, useForm, cx } from '../ui.jsx'
import { authService, isEmail, isPhone, normalizePhone, roleForAccount } from '../services/authService.js'
import { openAuthDialog } from '../components/MarketplaceAuthDialog.jsx'
import './auth-visuals.css'

export function Logo({ size = 64, light, blue = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="18" fill={blue ? '#1769aa' : light ? '#fff' : '#00857c'} />
      <circle cx="32" cy="32" r="21" stroke={blue ? '#fff' : light ? '#00857c' : '#fff'} strokeOpacity=".28" strokeWidth="2" />
      <path d="M18 21h8.2l5.8 15.6L37.8 21H46L35.5 46h-7L18 21Z" fill={blue ? '#fff' : light ? '#00857c' : '#fff'} />
      <circle cx="48" cy="19" r="4.5" fill={blue ? '#9ccfff' : light ? '#14284b' : '#ffd166'} />
    </svg>
  )
}

export function useSignIn() {
  const { setMe } = useApp()
  const nav = useNav()
  return (role, extra = {}, destination = HOME[role], destinationParams = {}) => {
    setMe({ role, loggedIn: true, guest: false, vendorId: 'v-me', name: ME[role], ...extra })
    nav.reset(destination || HOME[role], destinationParams)
  }
}

export function Splash() {
  const nav = useNav()
  useEffect(() => {
    const t = setTimeout(() => nav.reset('c_home'), 1600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div onClick={() => nav.reset('c_home')} className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ink-900 text-white">
      <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-white/5" />
      <div className="vv-splash-loader"><div className="vv-splash-orbit vv-splash-orbit-a" /><div className="vv-splash-orbit vv-splash-orbit-b" /><div className="vv-splash-core"><Logo size={78} light /></div></div>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">VendorVerse</h1>
      <p className="mt-1.5 text-sm text-white/75">Global Marketplace · Products · Services · Quotes</p>
      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/65"><span className="size-2 animate-pulse rounded-full bg-teal-300" />Preparing your marketplace</div>
      <p className="absolute bottom-10 text-[11px] tracking-widest text-white/50">ADRSTECHNO PRIVATE LIMITED</p>
    </div>
  )
}

export function Welcome() {
  const nav = useNav()
  const { t, lang, setLang, setMe } = useApp()
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 px-6 pt-5 text-white">
        <div className="absolute -right-24 top-10 size-72 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2"><Logo size={34} light /><span className="text-lg font-extrabold">VendorVerse</span></div>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <Globe size={13} />{lang === 'en' ? 'हिन्दी' : 'English'}
          </button>
        </div>
        <div className="vv-root-hero-scene" aria-hidden="true">
          <div className="vv-root-hero-orbit vv-root-hero-orbit-one" />
          <div className="vv-root-hero-orbit vv-root-hero-orbit-two" />
          <div className="vv-root-hero-cube"><span>V</span><span>RFQ</span><span>✓</span><span>GO</span><span>+</span><span>★</span></div>
        </div>
        <div className="relative my-auto space-y-3.5 pb-6">
          {[[Truck, 'Order products', 'Track every status in real time'], [Sparkles, 'Book services', 'Pick a slot — no double booking'], [FileText, 'Compare quotes', 'RFQs from verified vendors']].map(([I, a, b], i) => (
            <div key={a} className="flex items-center gap-3 rounded-2xl bg-white/12 p-3.5 backdrop-blur" style={{ marginLeft: i * 14 }}>
              <span className="grid size-10 place-items-center rounded-xl bg-white/20"><I size={20} /></span>
              <div><p className="text-sm font-bold">{a}</p><p className="text-xs text-white/70">{b}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 pb-7 pt-6">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{t('welcomeTitle')}</h1>
        <p className="mt-2 text-sm text-ink-500">{t('welcomeBody')}</p>
        <div className="mt-5 space-y-2.5">
          <Button full size="lg" onClick={() => openAuthDialog('signin')}>{t('login')} <ArrowRight size={18} /></Button>
          <Button full size="lg" variant="secondary" onClick={() => openAuthDialog('signup')}>Create account</Button>
          <button
            onClick={() => { setMe({ role: 'customer', loggedIn: false, guest: true, vendorId: 'v-me', name: 'Guest' }); nav.reset('c_home') }}
            className="w-full py-2 text-sm font-semibold text-brand-700"
          >{t('browse')}</button>
        </div>
      </div>
    </div>
  )
}

/* OTP codes come from services/authService.js (random per request, mock provider shows the code). Super Admin is asked once on web; the mobile second step is open item O-14. */

/** The signed-in user's own number: the stored profile phone, else the number they just verified. Never a placeholder. */
const accountPhone = (profile, contact) => {
  const raw = profile?.phone || (!isEmail(contact) && isPhone(contact) ? contact : '')
  return /^\+91\d{10}$/.test(String(raw).replace(/\s/g, '')) ? `+91 ${String(raw).replace(/\s/g, '').slice(3, 8)} ${String(raw).replace(/\s/g, '').slice(8)}` : raw || ''
}

export function Otp({ params, embedded = false, onComplete }) {
  const { contact = '+91 98290 00001', role = 'customer', mode, name, email, biz, next, nextParams } = params
  const nav = useNav()
  const { setMe, toast } = useApp()
  const signIn = useSignIn()
  const finish = (screenId, screenParams = {}) => embedded ? onComplete?.(screenId, screenParams) : nav.reset(screenId, screenParams)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [devCode, setDevCode] = useState('')
  const [sending, setSending] = useState(true)
  const [secs, setSecs] = useState(30)
  const [checking, setChecking] = useState(false)
  const [linkingEmail, setLinkingEmail] = useState(false)
  const [emailChallenge, setEmailChallenge] = useState('')
  const verifying = useRef(false)
  const sendCode = async () => {
    setSending(true); setErr('')
    const r = linkingEmail
      ? await authService.requestEmailLink(email)
      : await authService.requestOtp(contact, { intent: mode === 'register' ? 'register' : 'login', mode: role === 'vendor' ? 'VENDOR' : 'CUSTOMER' })
    setSending(false)
    if (!r.ok) return setErr(r.message)
    if (linkingEmail) setEmailChallenge(r.challengeId)
    setDevCode(r.devCode || '')
    setSecs(30)
  }
  useEffect(() => { sendCode() }, [])
  useEffect(() => {
    if (secs <= 0) return
    const t = setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs])
  const verify = async (candidate = code) => {
    if (verifying.current) return
    verifying.current = true
    setChecking(true)
    if (linkingEmail && !emailChallenge) { setChecking(false); verifying.current = false; return setErr('Request a new email code to continue.') }
    const r = linkingEmail
      ? await authService.verifyEmailLink(emailChallenge, candidate)
      : await authService.verifyOtp(contact, candidate)
    verifying.current = false
    setChecking(false)
    if (!r.ok) return setErr(r.message)
    // F-ACC-06: the server holds the name and email. Sign-up saves what it collected (without overwriting an
    // existing profile); plain sign-in reads the stored profile so an account with no name is asked for one.
    let profile = null
    if (authService.isRemote && !linkingEmail) {
      const stored = await authService.getProfile()
      profile = stored.ok ? stored.profile : null
      if (mode === 'register' && stored.ok) {
        const patch = {}
        if (!profile.displayName && name) patch.displayName = name
        if (!profile.email && email) patch.email = email
        if (Object.keys(patch).length) {
          const saved = await authService.saveProfile(patch)
          if (saved.ok) profile = saved.profile
          else toast('Account created, but your details were not saved. Add them from Edit profile.')
        }
      }
    }
    if (authService.isRemote && mode === 'register' && email && !linkingEmail) {
      setLinkingEmail(true)
      setCode('')
      setDevCode('')
      setSecs(0)
      const linked = await authService.requestEmailLink(email)
      if (!linked.ok) { setErr(linked.message); return }
      setEmailChallenge(linked.challengeId)
      setCode('')
      setDevCode(linked.devCode || '')
      setSecs(30)
      return
    }
    // Super Admin signs in with the same single OTP as every other role (owner request, 2026-10-30).
    if (mode === 'register') {
      if (role === 'business') {
        setMe({ role: 'business', loggedIn: true, guest: false, vendorId: 'v-me', name: name || 'Company owner', businessName: biz, bizId: 'biz-me', businessWorkspace: true, phone: contact })
        toast('Account created. Confirm your eligibility to open a Business account.')
        finish('b_eligibility')
      } else if (role === 'vendor') {
        setMe({ role: 'vendor', loggedIn: true, guest: false, vendorId: 'v-new', name: name || 'New Vendor', biz, phone: contact, isNew: true })
        toast('Account created. Tell us what kind of vendor you are.')
        // All vendor entry points use the canonical four-step registration
        // wizard. The older type-specific screens remain available only as
        // legacy previews and are no longer part of signup onboarding.
        finish('v_register', { biz })
      } else {
        setMe({ role: 'customer', loggedIn: true, guest: false, vendorId: 'v-me', name: name || ME.customer, phone: contact })
        toast('Welcome to VendorVerse!')
        finish('c_home')
      }
      return
    }
    const privilegedRole = r.account ? roleForAccount(r.account) : null
    const accountRole = privilegedRole === 'admin' || privilegedRole === 'agent' ? privilegedRole : role
    if (r.account && !['admin', 'agent'].includes(accountRole) && !r.account.availableModes?.includes(role.toUpperCase())) {
      await authService.endSession()
      setErr(role === 'vendor' ? 'No vendor account exists for this sign-in.' : 'No customer account exists for this sign-in.')
      return
    }
    if (r.account && !['admin', 'agent'].includes(accountRole) && r.account.currentMode !== role.toUpperCase()) {
      const switched = await authService.switchMode(role.toUpperCase())
      if (!switched.ok) { await authService.endSession(); setErr(switched.message); return }
    }
    const same = accountRole === role
    const extra = { ...(r.account ? { userId: r.account.userId, hasVendorAccount: !!r.account.availableModes?.includes('VENDOR') } : {}), ...(accountPhone(profile, contact) ? { phone: accountPhone(profile, contact) } : {}), ...(profile?.displayName ? { name: profile.displayName } : authService.isRemote ? { name: 'Customer' } : {}) }
    const destination = same ? next || HOME[role] : HOME[accountRole]
    const destinationParams = same ? nextParams || {} : {}
    if (embedded) {
      setMe({ role: accountRole, loggedIn: true, guest: false, vendorId: 'v-me', name: ME[accountRole], ...extra })
      finish(destination, destinationParams)
    } else signIn(accountRole, extra, destination, destinationParams)
    toast(same ? 'Signed in successfully' : `Signed in to your ${accountRole} account`)
  }
  const content = (
      <div className={embedded ? 'vv-otp-embedded-stage' : 'vv-otp-stage'}>
        <div className="vv-otp-card">
          {!embedded && <div className="vv-otp-heading">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><ShieldCheck size={28} /></div>
            <div className="vv-otp-scene" aria-hidden="true">
              <div className="vv-otp-orbit vv-otp-orbit-one" /><div className="vv-otp-orbit vv-otp-orbit-two" />
              <div className="vv-otp-mini-cube"><span>V</span><span>+</span><span>✓</span></div>
              <span className="vv-otp-float vv-otp-float-one">Verified</span><span className="vv-otp-float vv-otp-float-two">Secure</span>
            </div>
          </div>}
          <div className="vv-otp-copy">
            <p className="vv-login-eyebrow">SECURE ACCOUNT ACCESS</p>
            <h2 id={embedded ? 'vv-market-auth-title' : undefined} className="text-2xl font-extrabold tracking-tight">Enter the code</h2>
            <p className="mt-1 text-sm text-ink-500">
              {sending ? 'Sending your code…' : <>We sent a 6-digit code to <b className="text-ink-800">{linkingEmail ? email : contact}</b></>}
            </p>
          </div>
          <div className="vv-otp-entry relative">
            <div className="flex justify-between gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cx('grid h-14 flex-1 place-items-center rounded-xl text-xl font-extrabold ring-1 ring-inset', i === code.length ? 'ring-2 ring-brand-500' : err ? 'ring-red-300' : 'ring-ink-200', code[i] ? 'bg-brand-50' : 'bg-white')}>{code[i] || ''}</div>
              ))}
            </div>
            <input autoFocus aria-label="One-time code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => { const nextCode = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(nextCode); setErr(''); if (nextCode.length === 6) window.setTimeout(() => verify(nextCode), 0) }} className="absolute inset-0 h-full w-full cursor-text opacity-0" />
          </div>
          {err && <p className="text-sm font-medium text-red-600" role="alert">{err}</p>}
          {devCode && <Banner tone="blue" title="Development mode: no delivery provider configured">The code for this request is <b>{devCode}</b>. A real provider replaces this banner. <button type="button" className="font-bold underline" onClick={() => { setCode(devCode); setErr(''); window.setTimeout(() => verify(devCode), 0) }}>Auto-fill</button></Banner>}
          <Button full size="lg" disabled={sending || checking} onClick={() => verify()}>{linkingEmail ? 'Verify email & continue' : mode === 'register' ? 'Verify phone & continue' : 'Verify & log in'}</Button>
          <p className="text-center text-sm text-ink-500">
            {secs > 0 ? `Resend code in 0:${String(secs).padStart(2, '0')}` : <button onClick={() => { sendCode().then(() => toast('A new OTP has been sent')) }} className="font-bold text-brand-700">Resend OTP</button>}
          </p>
        </div>
      </div>
  )
  return embedded ? content : <Screen title="Verify OTP" pad={false} bg="bg-white">{content}</Screen>
}

/** Secret Super Admin sign-in (/admin/login). Not linked from anywhere and hidden from the page directory.
 *  Admin ID + password against the real API; success opens the admin dashboard. */
export function AdminLogin() {
  const nav = useNav()
  const { setMe, toast } = useApp()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    const r = await authService.adminLogin(id, password)
    if (r.ok && roleForAccount(r.account) !== 'admin') {
      await authService.endSession()
      setBusy(false)
      return setErr('Invalid admin ID or password.')
    }
    setBusy(false)
    if (!r.ok) return setErr(r.message)
    setPassword('')
    setMe({ role: 'admin', loggedIn: true, guest: false, vendorId: 'v-me', name: ME.admin, userId: r.account.userId })
    toast('Signed in successfully')
    nav.reset(HOME.admin)
  }
  return (
    <Screen title="Admin sign in" pad={false} bg="bg-white">
      <div className="vv-otp-stage">
        <form className="vv-otp-card" onSubmit={submit}>
          <div className="vv-otp-copy">
            <p className="vv-login-eyebrow">RESTRICTED ACCESS</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Admin sign in</h2>
          </div>
          {!authService.isRemote && <Banner tone="amber" title="Backend not connected">Admin sign-in needs the API. Set VITE_API_BASE_URL and restart the web app.</Banner>}
          <Input label="Admin ID" icon={Mail} type="email" autoComplete="username" autoFocus value={id} onChange={(e) => { setId(e.target.value); setErr('') }} />
          <Input label="Password" icon={KeyRound} type="password" autoComplete="current-password" value={password} error={err} onChange={(e) => { setPassword(e.target.value); setErr('') }} />
          <Button full size="lg" type="submit" disabled={busy || !authService.isRemote}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </div>
    </Screen>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Phone, Mail, ShieldCheck, Store, User, ArrowRight, Lock, Sparkles, Truck, FileText, Globe } from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { HOME, VISIBLE_ROLES } from '../roles.js'
import { ME } from '../data.jsx'
import { Button, Input, Segmented, Screen, Checkbox, Banner, useForm, cx } from '../ui.jsx'
import { authService, isEmail, isPhone, normalizePhone, roleForMode } from '../services/authService.js'
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
          <Button full size="lg" onClick={() => nav.go('login')}>{t('login')} <ArrowRight size={18} /></Button>
          <Button full size="lg" variant="secondary" onClick={() => nav.go('register')}>Create account</Button>
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

export function Login({ params = {} }) {
  const nav = useNav()
  const [method, setMethod] = useState('phone')
  const [role, setRole] = useState(params.role || 'customer')
  const [val, setVal] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [err, setErr] = useState('')
  useEffect(() => setRole(params.role || 'customer'), [params.role])
  const submit = (event) => {
    event?.preventDefault()
    const phone = method === 'phone' ? normalizePhone(val) : val
    if (method === 'phone' && phone !== val) setVal(phone)
    const ok = method === 'phone' ? isPhone(phone) : isEmail(val)
    if (!ok) return setErr(method === 'phone' ? 'Enter a valid 10-digit mobile number' : 'Enter a valid email address')
    nav.go('otp', { contact: method === 'phone' ? `${countryCode} ${phone}` : val, role, method, next: params.next, nextParams: params.nextParams })
  }
  return (
    <Screen title="Log in" pad={false} bg="bg-white" scrollClass="vv-login-scroll">
      <div className="vv-login-layout">
        <aside className="vv-login-art">
          <span className="vv-login-kicker"><ShieldCheck size={14} /> VENDORVERSE ACCOUNT ACCESS</span>
          <div className="vv-login-scene" aria-hidden="true">
            <div className="vv-login-orbit vv-login-orbit-one" /><div className="vv-login-orbit vv-login-orbit-two" />
            <div className="vv-login-cube">{['V', 'RFQ', 'OK', 'VV', '+', '★'].map((face) => <span key={face}>{face}</span>)}</div>
            <span className="vv-login-float vv-login-float-one"><ShieldCheck size={14} /> Trusted providers</span>
            <span className="vv-login-float vv-login-float-two"><Store size={14} /> Quotes and bookings</span>
          </div>
          <div className="vv-login-art-copy"><h2>Plan with confidence</h2><p>Compare proposals, confirm bookings and keep every detail in one place.</p></div>
        </aside>
        <form className="vv-login-form p-5 sm:p-7" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Enter' && event.target?.tagName === 'INPUT') { event.preventDefault(); submit(event) } }}>
          <div>
            <p className="vv-login-eyebrow">WELCOME BACK</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-ink-500">Choose your workspace and enter your phone or email to continue.</p>
          </div>
          <Segmented value={method} onChange={(m) => { setMethod(m); setVal(''); setErr('') }} options={[{ id: 'phone', label: 'Phone' }, { id: 'email', label: 'Email' }]} />
          {method === 'phone' ? (
            <div><label className="mb-1.5 block text-[13px] font-semibold text-ink-700">Mobile number</label><div className="flex h-12 overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-ink-200 focus-within:ring-2 focus-within:ring-brand-500"><select aria-label="Country calling code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-[92px] shrink-0 border-r border-ink-200 bg-ink-50 px-2 text-sm font-bold text-ink-700 outline-none"><option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+971">🇦🇪 +971</option><option value="+81">🇯🇵 +81</option><option value="+46">🇸🇪 +46</option></select><div className="relative flex min-w-0 flex-1 items-center"><Phone size={17} className="pointer-events-none absolute left-3 text-ink-400" /><input inputMode="numeric" maxLength={10} placeholder="98290 00001" value={val} onChange={(e) => { setVal(e.target.value.replace(/\D/g, '')); setErr('') }} className="h-full min-w-0 flex-1 bg-transparent pl-10 pr-3 text-sm outline-none" /></div></div>{err && <p className="mt-1.5 text-xs font-medium text-red-600">{err}</p>}<p className="mt-1.5 text-xs text-ink-500">Standard SMS rates may apply</p></div>
          ) : (
            <Input label="Email address" icon={Mail} type="email" placeholder="you@company.com" value={val} error={err} onChange={(e) => { setVal(e.target.value); setErr('') }} />
          )}
          <Button full size="lg" type="submit">Send OTP</Button>

          <div className="vv-login-roles rounded-2xl p-4 ring-1 ring-inset ring-ink-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Choose your workspace</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {VISIBLE_ROLES.map((r) => (
                <button type="button" key={r.id} onClick={() => setRole(r.id)} className={cx('rounded-xl px-3 py-2.5 text-[13px] font-semibold ring-1 ring-inset transition', role === r.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-700 ring-ink-200')}>
                  {r.short}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-ink-500">Sales Agents and Super Admins are invited by the platform — they cannot self-register.</p>
          </div>
          <p className="text-center text-sm text-ink-500">New to VendorVerse? <button type="button" onClick={() => nav.replace('register')} className="font-bold text-brand-700">Create account</button></p>
        </form>
      </div>
    </Screen>
  )
}

export function Otp({ params }) {
  const { contact = '+91 98290 00001', role = 'customer', mode, name, email, biz, next, nextParams } = params
  const nav = useNav()
  const { setMe, toast } = useApp()
  const signIn = useSignIn()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [devCode, setDevCode] = useState('')
  const [sending, setSending] = useState(true)
  const [secs, setSecs] = useState(30)
  const [checking, setChecking] = useState(false)
  const verifying = useRef(false)
  const sendCode = async () => {
    setSending(true); setErr('')
    const r = await authService.requestOtp(contact)
    setSending(false)
    if (!r.ok) return setErr(r.message)
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
    const r = await authService.verifyOtp(contact, candidate)
    verifying.current = false
    setChecking(false)
    if (!r.ok) return setErr(r.message)
    // F-ACC-06: the server holds the name and email. Sign-up saves what it collected (without overwriting an
    // existing profile); plain sign-in reads the stored profile so an account with no name is asked for one.
    let profile = null
    if (authService.isRemote) {
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
    // Super Admin signs in with the same single OTP as every other role (owner request, 2026-10-30).
    if (mode === 'register') {
      if (role === 'business') {
        setMe({ role: 'business', loggedIn: true, guest: false, vendorId: 'v-me', name: name || 'Company owner', businessName: biz, bizId: 'biz-me', businessWorkspace: true, phone: contact })
        toast('Account created. Confirm your eligibility to open a Business account.')
        nav.reset('b_eligibility')
      } else if (role === 'vendor') {
        setMe({ role: 'vendor', loggedIn: true, guest: false, vendorId: 'v-new', name: name || 'New Vendor', biz, phone: contact, isNew: true })
        toast('Account created. Tell us what kind of vendor you are.')
        nav.reset('v_register_type', { biz })
      } else {
        setMe({ role: 'customer', loggedIn: true, guest: false, vendorId: 'v-me', name: name || ME.customer, phone: contact })
        toast('Welcome to VendorVerse!')
        nav.reset('c_home')
      }
      return
    }
    const accountRole = r.account ? roleForMode(r.account.currentMode) : role
    const same = accountRole === role
    const needsName = authService.isRemote && accountRole === 'customer' && !profile?.displayName
    const extra = { ...(r.account ? { userId: r.account.userId } : {}), ...(profile?.displayName ? { name: profile.displayName } : authService.isRemote ? { name: 'Customer' } : {}) }
    if (needsName) {
      signIn(accountRole, extra, 'c_profile_edit', { firstRun: true })
      toast('Welcome! Add your name to finish your profile.')
      return
    }
    signIn(accountRole, extra, same ? next || HOME[role] : HOME[accountRole], same ? nextParams || {} : {})
    toast(same ? 'Signed in successfully' : `Signed in to your ${accountRole} account`)
  }
  return (
    <Screen title="Verify OTP" pad={false} bg="bg-white">
      <div className="vv-otp-stage">
        <div className="vv-otp-card">
          <div className="vv-otp-heading">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><ShieldCheck size={28} /></div>
            <div className="vv-otp-scene" aria-hidden="true">
              <div className="vv-otp-orbit vv-otp-orbit-one" /><div className="vv-otp-orbit vv-otp-orbit-two" />
              <div className="vv-otp-mini-cube"><span>V</span><span>+</span><span>✓</span></div>
              <span className="vv-otp-float vv-otp-float-one">Verified</span><span className="vv-otp-float vv-otp-float-two">Secure</span>
            </div>
          </div>
          <div className="vv-otp-copy">
            <p className="vv-login-eyebrow">SECURE ACCOUNT ACCESS</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Enter the code</h2>
            <p className="mt-1 text-sm text-ink-500">
              {sending ? 'Sending your code…' : <>We sent a 6-digit code to <b className="text-ink-800">{contact}</b></>}
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
          {devCode && <Banner tone="blue" title="Development mode: no SMS provider configured">The code for this request is <b>{devCode}</b>. A real provider replaces this banner. <button type="button" className="font-bold underline" onClick={() => { setCode(devCode); setErr(''); window.setTimeout(() => verify(devCode), 0) }}>Auto-fill</button></Banner>}
          <Button full size="lg" disabled={sending || checking} onClick={() => verify()}>{mode === 'register' ? 'Verify & create account' : 'Verify & log in'}</Button>
          <p className="text-center text-sm text-ink-500">
            {secs > 0 ? `Resend code in 0:${String(secs).padStart(2, '0')}` : <button onClick={() => { sendCode().then(() => toast('A new OTP has been sent')) }} className="font-bold text-brand-700">Resend OTP</button>}
          </p>
        </div>
      </div>
    </Screen>
  )
}

export function Register() {
  const nav = useNav()
  const [role, setRole] = useState('customer')
  const [f, set] = useForm({ name: '', phone: '', email: '', biz: '', agree: false })
  const [errs, setErrs] = useState({})
  const submit = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Enter your full name'
    if (!isPhone(f.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (f.email && !isEmail(f.email)) e.email = 'Enter a valid email address'
    if (role !== 'customer' && f.biz.trim().length < 3) e.biz = 'Enter your business name'
    if (!f.agree) e.agree = 'Please accept to continue'
    setErrs(e)
    if (Object.keys(e).length === 0) nav.go('otp', { contact: `+91 ${f.phone}`, role, mode: 'register', name: f.name, email: f.email, biz: f.biz })
  }
  return (
    <Screen title="Create account" pad={false} bg="bg-white">
      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Join VendorVerse</h2>
          <p className="mt-1 text-sm text-ink-500">Choose how you want to use the marketplace.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[['customer', User, 'Customer', 'Buy products, book services, request quotes'], ['vendor', Store, 'Vendor', 'Sell products and services to customers']].map(([id, I, a, b]) => (
            <button key={id} onClick={() => setRole(id)} className={cx('rounded-2xl p-3.5 text-left ring-1 ring-inset transition', role === id ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200')}>
              <span className={cx('grid size-10 place-items-center rounded-xl', role === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500')}><I size={20} /></span>
              <p className="mt-2.5 text-sm font-bold">{a}</p>
              <p className="mt-0.5 text-xs leading-snug text-ink-500">{b}</p>
            </button>
          ))}
        </div>
        <Input label="Full name" required placeholder="As per ID" value={f.name} onChange={set('name')} error={errs.name} />
        {role !== 'customer' && <Input label="Business name" required placeholder="Registered business name" value={f.biz} onChange={set('biz')} error={errs.biz} />}
        <Input label="Mobile number" required icon={Phone} inputMode="numeric" maxLength={10} placeholder="98290 00001" value={f.phone} onChange={(e) => set('phone')(normalizePhone(e.target.value))} error={errs.phone} className="!pl-10" />
        <Input label="Email (optional)" icon={Mail} type="email" placeholder="you@company.com" value={f.email} onChange={set('email')} error={errs.email} />
        <div>
          <Checkbox checked={f.agree} onChange={(v) => set('agree')(v)}>I agree to the <b className="text-brand-700">Terms of Service</b> and <b className="text-brand-700">Privacy Policy</b>, and consent to my data being processed to provide this service.</Checkbox>
          {errs.agree && <p className="mt-1 text-xs font-medium text-red-600">{errs.agree}</p>}
        </div>
        {role === 'vendor' && <Banner tone="amber" title="Verification required">Vendors are shown as <b>Verified</b> only after Super Admin approves your business documents.</Banner>}
        <Button full size="lg" onClick={submit}>Continue</Button>
        <p className="text-center text-sm text-ink-500">Already have an account? <button onClick={() => nav.replace('login')} className="font-bold text-brand-700">Log in</button></p>
      </div>
    </Screen>
  )
}

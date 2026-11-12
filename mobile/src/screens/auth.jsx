import { authService, roleForMode } from '../services/authService.js'
import { useEffect, useRef, useState } from 'react'
import { Phone, Mail, ShieldCheck, Store, User, ArrowRight, Lock, CalendarCheck, FileText, Globe, Search, Ban, Hourglass, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { HOME, VISIBLE_ROLES } from '../roles.js'
import { ME } from '../data.jsx'
import { Button, Input, Segmented, Screen, Checkbox, Banner, Card, useForm, cx } from '../ui.jsx'

export function Logo({ size = 64, light }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="18" fill={light ? '#fff' : '#00857c'} />
      <circle cx="32" cy="32" r="21" stroke={light ? '#00857c' : '#fff'} strokeOpacity=".28" strokeWidth="2" />
      <path d="M18 21h8.2l5.8 15.6L37.8 21H46L35.5 46h-7L18 21Z" fill={light ? '#00857c' : '#fff'} />
      <circle cx="48" cy="19" r="4.5" fill={light ? '#14284b' : '#ffd166'} />
    </svg>
  )
}

export function useSignIn() {
  const { setMe } = useApp()
  const nav = useNav()
  return (role, extra = {}) => {
    setMe({ role, loggedIn: true, guest: false, vendorId: role === 'vendor' ? 'v-me' : null, hasVendor: role === 'vendor', bizId: role === 'business' ? 'biz-me' : null, name: ME[role], ...extra })
    nav.reset(HOME[role])
  }
}

export function Splash() {
  const nav = useNav()
  useEffect(() => {
    const t = setTimeout(() => nav.reset('welcome'), 1600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div onClick={() => nav.reset('welcome')} className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ink-900 text-white">
      <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-white/5" />
      <div className="animate-fade-in"><Logo size={92} light /></div>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">VendorVerse</h1>
      <p className="mt-1.5 text-sm text-white/75">Discover · Book · Quote</p>
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
        <div className="relative my-auto space-y-3.5 pb-6">
          {[[Search, 'Every industry, every vendor', 'Services, suppliers, manufacturers, contractors'], [CalendarCheck, 'Book instantly or schedule', 'RFQs and long-term contracts too'], [FileText, 'Trusted worldwide', 'Verified tiers and ratings from real jobs']].map(([I, a, b], i) => (
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
          <button onClick={() => window.dispatchEvent(new CustomEvent('vv-jump', { detail: 'journeys_pick' }))} className="w-full py-1 text-center text-xs font-bold text-white/80 underline">Explore demo journeys · sample data</button>
          <button
            onClick={() => { setMe({ role: 'customer', loggedIn: false, guest: true, vendorId: null, hasVendor: false, name: 'Guest' }); nav.reset('c_home') }}
            className="w-full py-2 text-sm font-semibold text-brand-700"
          >{t('browse')}</button>
          <button onClick={() => nav.go('vision')} className="w-full pb-1 text-center text-xs font-semibold text-ink-500 underline">See the product vision & roadmap</button>
        </div>
      </div>
    </div>
  )
}

const isPhone = (s) => /^[6-9]\d{9}$/.test(s)
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export function Login() {
  const nav = useNav()
  const [method, setMethod] = useState('phone')
  const [role, setRole] = useState('customer')
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    const ok = method === 'phone' ? isPhone(val) : isEmail(val)
    if (!ok) return setErr(method === 'phone' ? 'Enter a valid 10-digit mobile number' : 'Enter a valid email address')
    nav.go('otp', { contact: method === 'phone' ? `+91 ${val}` : val, role, method })
  }
  return (
    <Screen title="Log in" pad={false} bg="bg-white">
      <div className="space-y-5 p-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-500">We will send a one-time password to verify it is you.</p>
        </div>
        <Segmented value={method} onChange={(m) => { setMethod(m); setVal(''); setErr('') }} options={[{ id: 'phone', label: 'Phone' }, { id: 'email', label: 'Email' }]} />
        {method === 'phone' ? (
          <Input label="Mobile number" icon={Phone} prefix="" inputMode="numeric" maxLength={10} placeholder="98290 00001" value={val} error={err} onChange={(e) => { setVal(e.target.value.replace(/\D/g, '')); setErr('') }} className="!pl-10" hint="Standard SMS rates may apply" />
        ) : (
          <Input label="Email address" icon={Mail} type="email" placeholder="you@company.com" value={val} error={err} onChange={(e) => { setVal(e.target.value); setErr('') }} />
        )}
        <Button full size="lg" onClick={submit}>Send OTP</Button>

        <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Demo — sign in as</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {VISIBLE_ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)} className={cx('rounded-xl px-3 py-2.5 text-[13px] font-semibold ring-1 ring-inset transition', role === r.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-700 ring-ink-200')}>
                {r.short}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-ink-500">Sales Agents and Super Admins are invited by the platform and sign in with their own individual accounts (admins also need MFA).</p>
        </div>
        <p className="text-center text-sm text-ink-500">New to VendorVerse? <button onClick={() => nav.replace('register')} className="font-bold text-brand-700">Create account</button></p>
      </div>
    </Screen>
  )
}

export function Otp({ params }) {
  const { contact = '+91 98290 00001', role = 'customer', mode, name, email, biz } = params
  const nav = useNav()
  const { setMe, toast } = useApp()
  const signIn = useSignIn()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [step, setStep] = useState(0)
  const [secs, setSecs] = useState(30)
  const [devCode, setDevCode] = useState('')
  const [sending, setSending] = useState(true)
  const [checking, setChecking] = useState(false)
  const verifying = useRef(false)
  const needsMfaStep = role === 'admin' && !authService.isRemote // real API: privileged sign-in is blocked server-side until MFA exists
  const factor = step === 0 ? 'otp' : 'mfa'
  const sendCode = async (f = factor) => {
    setSending(true); setErr('')
    const r = await authService.requestOtp(contact, { factor: f })
    setSending(false)
    if (!r.ok) return setErr(r.message)
    setDevCode(r.devCode || '')
    setSecs(30)
  }
  useEffect(() => { sendCode('otp') }, [])
  useEffect(() => {
    if (secs <= 0) return
    const t = setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs])
  const verify = async () => {
    if (verifying.current) return
    verifying.current = true
    setChecking(true)
    const r = await authService.verifyOtp(contact, code, { factor })
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
    if (step === 0 && needsMfaStep) { setStep(1); setCode(''); setErr(''); sendCode('mfa'); return }
    if (mode === 'register') {
      if (role === 'business') {
        setMe({ role: 'business', loggedIn: true, guest: false, vendorId: null, hasVendor: false, bizId: 'biz-me', name: name || ME.business, biz })
        toast('Account created — confirm you are the company owner')
        nav.reset('b_eligibility')
      } else if (role === 'vendor') {
        setMe({ role: 'vendor', loggedIn: true, guest: false, vendorId: 'v-new', hasVendor: true, name: name || 'New Vendor', biz, isNew: true })
        toast('Account created — complete verification')
        nav.reset('v_register')
      } else {
        setMe({ role: 'customer', loggedIn: true, guest: false, vendorId: null, hasVendor: false, name: name || ME.customer })
        toast('Welcome to VendorVerse!')
        nav.reset('c_home')
      }
      return
    }
    const accountRole = r.account ? roleForMode(r.account.currentMode) : role
    const same = accountRole === role
    const needsName = authService.isRemote && accountRole === 'customer' && !profile?.displayName
    const extra = { ...(r.account ? { userId: r.account.userId } : {}), ...(profile?.displayName ? { name: profile.displayName } : authService.isRemote ? { name: 'Customer' } : {}) }
    signIn(accountRole, extra)
    if (needsName) {
      nav.reset('c_profile_edit', { firstRun: true })
      toast('Welcome! Add your name to finish your profile.')
      return
    }
    toast(same ? 'Signed in successfully' : `Signed in to your ${accountRole} account`)
  }
  return (
    <Screen title={step === 0 ? 'Verify OTP' : 'Two-step verification'} pad={false} bg="bg-white">
      <div className="space-y-5 p-5">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">{step === 0 ? <ShieldCheck size={28} /> : <Lock size={28} />}</div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{step === 0 ? 'Enter the code' : 'Authenticator code'}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {step === 0 ? <>We sent a 6-digit code to <b className="text-ink-800">{contact}</b></> : 'Super Admin accounts require a second factor. Open your authenticator app and enter the current code.'}
          </p>
        </div>
        <div className="relative">
          <div className="flex justify-between gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cx('grid h-14 flex-1 place-items-center rounded-xl text-xl font-extrabold ring-1 ring-inset', i === code.length ? 'ring-2 ring-brand-500' : err ? 'ring-red-300' : 'ring-ink-200', code[i] ? 'bg-brand-50' : 'bg-white')}>{code[i] || ''}</div>
            ))}
          </div>
          <input autoFocus aria-label="One-time code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setErr('') }} className="absolute inset-0 h-full w-full cursor-text opacity-0" />
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        {devCode && <Banner tone="blue" title="Development mode: no SMS provider configured">The code for this request is <b>{devCode}</b>. A real provider replaces this banner. <button className="font-bold underline" onClick={() => { setCode(devCode); setErr('') }}>Auto-fill</button></Banner>}
        <Button full size="lg" disabled={sending || checking} onClick={verify}>{step === 0 && needsMfaStep ? 'Continue' : mode === 'register' ? 'Verify & create account' : 'Verify & log in'}</Button>
        {step === 0 && (
          <p className="text-center text-sm text-ink-500">
            {secs > 0 ? `Resend code in 0:${String(secs).padStart(2, '0')}` : <button onClick={() => { sendCode().then(() => toast('A new OTP has been sent')) }} className="font-bold text-brand-700">Resend OTP</button>}
          </p>
        )}
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
    if (role === 'vendor' && f.biz.trim().length < 3) e.biz = 'Enter your business name'
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
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {[['customer', User, 'Customer', 'Find vendors, book services, request quotes'], ['vendor', Store, 'Vendor', 'Sell your products or services — one identity, switch modes anytime']].map(([id, I, a, b]) => (
            <button key={id} onClick={() => setRole(id)} className={cx('rounded-2xl p-3.5 text-left ring-1 ring-inset transition', role === id ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200')}>
              <span className={cx('grid size-10 place-items-center rounded-xl', role === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500')}><I size={20} /></span>
              <p className="mt-2.5 text-sm font-bold">{a}</p>
              <p className="mt-0.5 text-xs leading-snug text-ink-500">{b}</p>
            </button>
          ))}
        </div>
        <Input label="Full name" required placeholder="As per ID" value={f.name} onChange={set('name')} error={errs.name} />
        {role === 'vendor' && <Input label="Business name" required placeholder="Registered business name" value={f.biz} onChange={set('biz')} error={errs.biz} />}
        <Input label="Mobile number" required icon={Phone} inputMode="numeric" maxLength={10} placeholder="98290 00001" value={f.phone} onChange={(e) => set('phone')(e.target.value.replace(/\D/g, ''))} error={errs.phone} className="!pl-10" />
        <Input label="Email (optional)" icon={Mail} type="email" placeholder="you@company.com" value={f.email} onChange={set('email')} error={errs.email} />
        <div>
          <Checkbox checked={f.agree} onChange={(v) => set('agree')(v)}>I agree to the <b className="text-brand-700">Terms</b> and <b className="text-brand-700">Privacy Policy</b>. My phone and email stay hidden from vendors unless I choose to share them.</Checkbox>
          {errs.agree && <p className="mt-1 text-xs font-medium text-red-600">{errs.agree}</p>}
        </div>
        {role === 'vendor' && <Banner tone="amber" title="Publication has gates">Your listings go public only when your account, a paid subscription, content review and any required verification all pass. Paying never skips a check.</Banner>}
        <Button full size="lg" onClick={submit}>Continue</Button>
        <p className="text-center text-sm text-ink-500">Already have an account? <button onClick={() => nav.replace('login')} className="font-bold text-brand-700">Log in</button></p>
      </div>
    </Screen>
  )
}


/* Account states (spec §3.2): restrictions are enforced server-side; the app explains what is limited and why. */
const ACCT = {
  pending: { icon: Hourglass, tone: 'blue', title: 'Pending verification', body: 'Required identity or contact checks are incomplete. Sensitive actions stay limited until they finish.', blocked: ['Publishing listings', 'Accepting bookings', 'Sending quotations'], ok: ['Browsing and messaging', 'Completing verification', 'Contacting support'] },
  restricted: { icon: Ban, tone: 'amber', title: 'Account restricted', body: 'Some capabilities are switched off while we review a risk or policy concern. Your records are safe.', blocked: ['Creating new listings', 'New public enquiries', 'Sponsored placements'], ok: ['Managing existing bookings', 'Replying to messages', 'Appealing this decision'] },
  suspended: { icon: XCircle, tone: 'red', title: 'Account suspended', body: 'Access is disabled by an authorized action. Records and evidence are preserved for the case.', blocked: ['New bookings, RFQs and quotes', 'Listings and messaging', 'Profile changes'], ok: ['Viewing the decision', 'Appealing for human review', 'Contacting support'] },
  deletion: { icon: Trash2, tone: 'gray', title: 'Deletion requested', body: 'We are verifying your identity and checking legal retention. Records we must keep by law are retained or anonymized.', blocked: ['New bookings and RFQs'], ok: ['Cancelling the request', 'Completing open commitments', 'Checking status'] },
}
export function AccountState({ params = {} }) {
  const nav = useNav()
  const [st, setSt] = useState(params.state || 'restricted')
  const a = ACCT[st]
  const tone = { blue: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', gray: 'bg-ink-100 text-ink-600' }[a.tone]
  return (
    <Screen title="Account status">
      <Segmented value={st} onChange={setSt} options={[{ id: 'pending', label: 'Pending' }, { id: 'restricted', label: 'Restricted' }, { id: 'suspended', label: 'Suspended' }, { id: 'deletion', label: 'Deletion' }]} />
      <Card className="text-center !p-6">
        <div className={cx('mx-auto grid size-16 place-items-center rounded-full', tone)}><a.icon size={32} /></div>
        <h2 className="mt-3 text-lg font-extrabold">{a.title}</h2>
        <p className="mt-1 text-sm text-ink-600">{a.body}</p>
      </Card>
      <Card><p className="mb-2 text-sm font-bold">Limited right now</p>{a.blocked.map((x) => <p key={x} className="flex items-center gap-2 py-1 text-sm text-ink-700"><XCircle size={15} className="text-red-500" />{x}</p>)}</Card>
      <Card><p className="mb-2 text-sm font-bold">Still available</p>{a.ok.map((x) => <p key={x} className="flex items-center gap-2 py-1 text-sm text-ink-700"><CheckCircle2 size={15} className="text-emerald-600" />{x}</p>)}</Card>
      <Banner tone="blue" title="Enforced on every platform">The same restriction applies on web, Android and iOS because it is decided by the server — not by what the app shows.</Banner>
      <div className="flex gap-2"><Button className="flex-1" onClick={() => nav.go('c_report', { kind: 'appeal' })}>Contact support / appeal</Button></div>
    </Screen>
  )
}

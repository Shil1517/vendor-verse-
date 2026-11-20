import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useNav } from '../nav.jsx'
import { useApp } from '../store.jsx'
import { isEmail, isPhone, normalizePhone } from '../services/authService.js'
import { Otp } from '../screens/auth.jsx'

const CALLING_CODES = [
  ['+91', 'India'], ['+971', 'UAE'], ['+44', 'UK'], ['+1', 'USA'], ['+81', 'Japan'], ['+46', 'Sweden'],
]

/* Lets any screen open the marketplace sign-in / sign-up popup (hosted in WebHeader). */
export const OPEN_AUTH_EVENT = 'vv:open-auth'
export const openAuthDialog = (mode = 'signin') => window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT, { detail: { mode } }))

export function MarketplaceAuthDialog({ mode, onClose, onChangeMode }) {
  const nav = useNav()
  const { toast } = useApp()
  const dialogRef = useRef(null)
  const [loginMethod, setLoginMethod] = useState('email')
  const [countryCode, setCountryCode] = useState('+91')
  const [loginContact, setLoginContact] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', biz: '', role: 'customer', agree: false })
  const [error, setError] = useState('')
  const [otpParams, setOtpParams] = useState(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }
  const submitLogin = (event) => {
    event.preventDefault()
    const phone = normalizePhone(loginContact)
    const valid = loginMethod === 'email' ? isEmail(loginContact) : isPhone(phone)
    if (!valid) { setError(loginMethod === 'email' ? 'Enter a valid email address.' : 'Enter a valid 10-digit mobile number.'); return }
    const contact = loginMethod === 'email' ? loginContact.trim() : `${countryCode} ${phone}`
    setOtpParams({ contact, role: form.role, method: loginMethod })
  }
  const submitSignup = (event) => {
    event.preventDefault()
    const phone = normalizePhone(form.phone)
    if (form.name.trim().length < 3) { setError('Enter your full name.'); return }
    if (!isPhone(phone)) { setError('Enter a valid 10-digit mobile number.'); return }
    if (!isEmail(form.email)) { setError('Enter a valid email address.'); return }
    if (form.role === 'vendor' && form.biz.trim().length < 3) { setError('Enter your business name.'); return }
    if (!form.agree) { setError('Please accept the Terms and Privacy Policy.'); return }
    setOtpParams({ contact: `${countryCode} ${phone}`, role: form.role, mode: 'register', name: form.name.trim(), email: form.email.trim(), biz: form.biz.trim() })
  }

  return <dialog ref={dialogRef} className={`vv-market-auth-dialog${otpParams ? ' vv-market-auth-dialog-otp' : ''}`} aria-labelledby="vv-market-auth-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    {otpParams ? <div className="vv-market-auth-otp-shell">
      <button className="vv-market-auth-close" type="button" aria-label="Close" onClick={onClose}><X size={19}/></button>
      <div className="vv-market-auth-wordmark">VENDOR<span>VERSE</span></div>
      <Otp params={otpParams} embedded onComplete={(screenId, params) => { onClose(); nav.reset(screenId, params) }} />
    </div> : <div className="vv-market-auth-card">
      <button className="vv-market-auth-close" type="button" aria-label="Close" onClick={onClose}><X size={19}/></button>
      <div className="vv-market-auth-wordmark">VENDOR<span>VERSE</span></div>
      <h2 id="vv-market-auth-title">{mode === 'signin' ? 'Welcome back' : 'Get started with VendorVerse'}</h2>

      {mode === 'signin' ? <form onSubmit={submitLogin}>
        <div className="vv-market-auth-roles" role="group" aria-label="Account type"><button type="button" aria-pressed={form.role === 'customer'} className={form.role === 'customer' ? 'is-active' : ''} onClick={() => setForm((value) => ({ ...value, role: 'customer' }))}>Customer</button><button type="button" aria-pressed={form.role === 'vendor'} className={form.role === 'vendor' ? 'is-active' : ''} onClick={() => setForm((value) => ({ ...value, role: 'vendor' }))}>Vendor</button></div>
        <div className="vv-market-auth-switch" role="group" aria-label="Sign in method"><button type="button" aria-pressed={loginMethod === 'email'} className={loginMethod === 'email' ? 'is-active' : ''} onClick={() => { setLoginMethod('email'); setLoginContact(''); setError('') }}>Email</button><button type="button" aria-pressed={loginMethod === 'phone'} className={loginMethod === 'phone' ? 'is-active' : ''} onClick={() => { setLoginMethod('phone'); setLoginContact(''); setError('') }}>Phone</button></div>
        {loginMethod === 'email' ? <label className="vv-market-auth-field"><b>Email</b><input type="email" autoComplete="email" autoFocus value={loginContact} onChange={(event) => { setLoginContact(event.target.value); setError('') }} placeholder="you@company.com" /></label> : <label className="vv-market-auth-field"><b>Mobile phone</b><span className="vv-market-auth-phone"><select aria-label="Country calling code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>{CALLING_CODES.map(([code, country]) => <option key={code} value={code}>{country} {code}</option>)}</select><input inputMode="numeric" autoComplete="tel-national" maxLength={10} autoFocus value={loginContact} onChange={(event) => { setLoginContact(normalizePhone(event.target.value)); setError('') }} placeholder="98290 00001" /></span></label>}
        {error && <p className="vv-market-auth-error" role="alert">{error}</p>}
        <button className="vv-market-auth-submit" type="submit">Continue with OTP</button>
        <p className="vv-market-auth-note">We’ll send a one-time code to verify your account.</p>
        <div className="vv-market-auth-or" aria-hidden="true"><span>or</span></div>
        <button className="vv-market-auth-google" type="button" onClick={() => toast('Google sign-in is not configured yet. Continue with an email or phone OTP.')}><GoogleMark/>Sign in with Google</button>
        <div className="vv-market-auth-links"><span>New to VendorVerse? <button type="button" onClick={() => onChangeMode('signup')}>Get started</button></span></div>
      </form> : <form onSubmit={submitSignup}>
        <div className="vv-market-auth-roles"><button type="button" aria-pressed={form.role === 'customer'} className={form.role === 'customer' ? 'is-active' : ''} onClick={() => setForm((value) => ({ ...value, role: 'customer' }))}>Customer</button><button type="button" aria-pressed={form.role === 'vendor'} className={form.role === 'vendor' ? 'is-active' : ''} onClick={() => setForm((value) => ({ ...value, role: 'vendor' }))}>Vendor</button></div>
        <label className="vv-market-auth-field"><b>Full name</b><input autoComplete="name" autoFocus value={form.name} onChange={update('name')} placeholder="Your name" /></label>
        {form.role === 'vendor' && <label className="vv-market-auth-field"><b>Business name</b><input autoComplete="organization" value={form.biz} onChange={update('biz')} placeholder="Registered business name" /></label>}
        <label className="vv-market-auth-field"><b>Email</b><input type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@company.com" /></label>
        <label className="vv-market-auth-field"><b>Mobile phone</b><span className="vv-market-auth-phone"><select aria-label="Country calling code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>{CALLING_CODES.map(([code, country]) => <option key={code} value={code}>{country} {code}</option>)}</select><input inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: normalizePhone(event.target.value) }))} placeholder="98290 00001" /></span></label>
        <label className="vv-market-auth-consent"><input type="checkbox" checked={form.agree} onChange={update('agree')}/><span>By proceeding, you agree to our <b>Terms</b> and <b>Privacy Policy</b>.</span></label>
        {error && <p className="vv-market-auth-error" role="alert">{error}</p>}
        <button className="vv-market-auth-submit" type="submit">Create {form.role} account</button>
        <button className="vv-market-auth-google" type="button" onClick={() => toast('Google sign-up is not configured yet. Continue with an email or phone OTP.')}><GoogleMark/>Sign up with Google</button>
        <p className="vv-market-auth-note">We’ll verify your phone number with a one-time code.</p>
        <div className="vv-market-auth-links"><span>Have an account? <button type="button" onClick={() => onChangeMode('signin')}>Sign in</button></span></div>
      </form>}
    </div>}
  </dialog>
}

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
}

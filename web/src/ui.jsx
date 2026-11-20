import { Children, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Check, ChevronRight, ChevronDown, Star, X, Search, Info, AlertTriangle, CheckCircle2, XCircle, Clock, Smartphone, ShieldCheck,
  FileText, Upload, Inbox,
} from 'lucide-react'
import { useNav } from './nav.jsx'

export const cx = (...a) => a.filter(Boolean).join(' ')
export const fmt = (n, currency) => {
  let active = currency
  if (!active && typeof window !== 'undefined') {
    try { active = JSON.parse(window.localStorage.getItem('vendorverse.website.state.v3') || '{}')?.locale?.currency } catch { /* use INR */ }
  }
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: active || 'INR', maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))
}

/* ---------- colour tones ---------- */
export const GRAD = {
  amber: 'from-amber-400 to-orange-500',
  sky: 'from-sky-400 to-blue-500',
  emerald: 'from-emerald-400 to-teal-500',
  violet: 'from-violet-400 to-purple-500',
  rose: 'from-rose-400 to-pink-500',
  teal: 'from-teal-400 to-cyan-600',
  indigo: 'from-indigo-400 to-blue-600',
  slate: 'from-slate-400 to-slate-600',
  lime: 'from-lime-400 to-green-600',
  orange: 'from-orange-400 to-red-500',
}
export const SOFT = {
  amber: 'bg-amber-50 text-amber-700',
  sky: 'bg-sky-50 text-sky-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  rose: 'bg-rose-50 text-rose-700',
  teal: 'bg-teal-50 text-teal-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  slate: 'bg-slate-100 text-slate-700',
  lime: 'bg-lime-50 text-lime-700',
  orange: 'bg-orange-50 text-orange-700',
}

const TONE = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  gray: 'bg-ink-100 text-ink-600 ring-ink-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-brand-50 text-brand-700 ring-brand-200',
}

/* status → label + tone, shared across every workflow */
export const STATUS = {
  // verification
  draft: ['Draft', 'gray'], submitted: ['Submitted', 'blue'], info: ['More info needed', 'amber'],
  approved: ['Approved', 'green'], rejected: ['Rejected', 'red'], suspended: ['Suspended', 'red'], pending: ['Pending review', 'amber'],
  removed: ['Removed', 'gray'], verified: ['Verified', 'green'], missing: ['Missing', 'red'],
  // orders
  placed: ['Placed', 'blue'], confirmed: ['Confirmed', 'teal'], packed: ['Packed', 'purple'], shipped: ['Shipped', 'purple'],
  delivered: ['Delivered', 'green'], cancelled: ['Cancelled', 'gray'], rejected: ['Rejected', 'red'], payment_confirmed: ['Payment / terms confirmed', 'teal'], payment_failed: ['Payment failed', 'red'], delivery_exception: ['Delivery exception', 'amber'], disputed: ['Disputed', 'red'], return_requested: ['Return requested', 'amber'], returned: ['Returned', 'gray'], refunded: ['Refunded', 'gray'],
  // bookings
  requested: ['Requested', 'blue'], accepted: ['Confirmed', 'teal'], declined: ['Declined', 'red'], in_progress: ['In progress', 'purple'],
  completed: ['Completed', 'green'], payment_failed: ['Payment failed', 'red'], disputed: ['Disputed', 'red'], reschedule: ['Reschedule requested', 'amber'],
  // rfq
  open: ['Open', 'blue'], submitted: ['Submitted', 'blue'], quoted: ['Quotes received', 'teal'], comparing: ['Comparing', 'purple'], negotiating: ['Negotiating', 'amber'], withdrawn: ['Withdrawn', 'gray'], expired: ['Expired', 'gray'], no_quotes: ['No quotes', 'amber'], closed: ['Closed', 'gray'], revised: ['Revised', 'purple'],
  // payments
  paid: ['Paid', 'green'], unpaid: ['Unpaid', 'amber'], failed: ['Failed', 'red'], cod: ['Pay on delivery', 'gray'], settled: ['Settled', 'green'], processing: ['Processing', 'blue'],
  // disputes
  under_review: ['Under review', 'purple'], resolved: ['Resolved', 'green'], escalated: ['Escalated', 'red'],
  // users / misc
  active: ['Active', 'green'], inactive: ['Inactive', 'gray'], live: ['Live', 'green'], scheduled: ['Scheduled', 'blue'], done: ['Done', 'green'],
  overdue: ['Overdue', 'red'], new: ['New', 'blue'],
  decided: ['Decided', 'purple'], appealed: ['Appeal pending', 'amber'], upheld: ['Appeal upheld', 'green'], appeal_rejected: ['Appeal rejected', 'gray'], sub_cancelled: ['Auto-renew off', 'blue'], grace: ['Grace period', 'amber'], processing_co: ['Processing', 'purple'],
}

export function Badge({ tone = 'gray', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONE[tone], className)}>
      {children}
    </span>
  )
}
export function StatusBadge({ s, className }) {
  const [label, tone] = STATUS[s] || [String(s), 'gray']
  return <Badge tone={tone} className={className}>{label}</Badge>
}

/* ---------- buttons ---------- */
const BTN = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-700/20 active:bg-brand-700 hover:bg-brand-700',
  secondary: 'bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 active:bg-ink-100',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-100',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-700',
  dangerSoft: 'bg-red-50 text-red-700 hover:bg-red-100',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
}
export function Button({ variant = 'primary', size = 'md', icon: Icon, full, children, className, ...p }) {
  const sz = size === 'sm' ? 'h-9 px-3 text-[13px] gap-1.5' : size === 'lg' ? 'h-13 px-5 text-[15px] gap-2' : 'h-11 px-4 text-sm gap-2'
  return (
    <button
      {...p}
      type={p.type || 'button'}
      className={cx('inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45', sz, BTN[variant], full && 'w-full', className)}
    >
      {Icon && <Icon size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  )
}

/* ---------- PhonePe-like browser demo payment ---------- */
export function DemoPhonePePayment({ open, amount, title = 'PhonePe demo payment', onClose, onSuccess }) {
  const [step, setStep] = useState('upi')
  const [upi, setUpi] = useState('demo.user@upi')
  const [pin, setPin] = useState('')
  useEffect(() => { if (open) { setStep('upi'); setPin('') } }, [open])
  if (!open) return null
  const proceed = () => { if (/^[\w.-]+@[\w.-]+$/.test(upi.trim())) setStep('pin') }
  const pay = () => {
    if (!/^\d{4,6}$/.test(pin)) return
    setStep('processing')
    setTimeout(() => { setStep('success'); onSuccess?.({ ref: `PHPE-DEMO-${Date.now().toString().slice(-8)}` }) }, 1600)
  }
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/65 p-4">
    <div className="w-full max-w-sm overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-black/10">
      <div className="bg-gradient-to-r from-[#5f259f] to-[#7b35c7] px-5 pb-5 pt-4 text-white"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><span className="grid size-10 place-items-center rounded-xl bg-white text-xl font-black text-[#5f259f]">पे</span><div><p className="text-base font-black">PhonePe</p><p className="text-[11px] text-white/70">Secure demo checkout</p></div></div>{step !== 'processing' && <button aria-label="Close payment" onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/10"><X size={19} /></button>}</div><div className="mt-5 flex items-end justify-between"><div><p className="text-[11px] text-white/70">{title}</p><p className="mt-1 text-2xl font-black">₹{Number(amount || 0).toLocaleString('en-IN')}</p></div><ShieldCheck size={25} className="text-emerald-200" /></div></div>
      <div className="space-y-4 p-5">
        {step === 'upi' && <><div><p className="text-sm font-bold text-ink-900">Pay using UPI</p><p className="mt-1 text-xs text-ink-500">Enter a demo UPI ID to continue to PIN verification.</p></div><div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center"><div className="mx-auto grid size-24 place-items-center rounded-xl bg-white text-4xl font-black text-[#5f259f] shadow-sm">⌁</div><p className="mt-2 text-[11px] font-semibold text-violet-800">Scan / enter UPI ID</p></div><label className="block text-xs font-semibold text-ink-700">UPI ID<input value={upi} onChange={(e) => setUpi(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-ink-50 px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-[#5f259f]" placeholder="name@upi" /></label><Button full onClick={proceed}>Continue</Button></>}
        {step === 'pin' && <><div><p className="text-sm font-bold text-ink-900">Enter UPI PIN</p><p className="mt-1 text-xs text-ink-500">Demo only — use any 4 to 6 digit PIN.</p></div><div className="rounded-2xl bg-ink-50 p-4 text-center"><Smartphone size={25} className="mx-auto text-[#5f259f]" /><p className="mt-2 text-sm font-bold">{upi}</p><p className="mt-1 text-xs text-ink-500">Amount ₹{Number(amount || 0).toLocaleString('en-IN')}</p></div><input autoFocus type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="h-14 w-full rounded-xl bg-white text-center text-2xl font-black tracking-[.6em] outline-none ring-2 ring-inset ring-[#5f259f]" placeholder="••••••" aria-label="UPI PIN" /><Button full onClick={pay}>Pay securely</Button><button onClick={() => setStep('upi')} className="w-full text-center text-xs font-bold text-[#5f259f]">Change UPI ID</button></>}
        {step === 'processing' && <div className="py-8 text-center"><div className="mx-auto size-14 animate-spin rounded-full border-4 border-violet-100 border-t-[#5f259f]" /><p className="mt-5 text-base font-black text-ink-900">Processing payment…</p><p className="mt-1 text-xs text-ink-500">Do not close this window</p></div>}
        {step === 'success' && <div className="py-5 text-center"><div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={34} strokeWidth={3} /></div><p className="mt-4 text-xl font-black">Payment successful</p><p className="mt-1 text-sm text-ink-500">Demo transaction completed securely.</p><p className="mt-4 rounded-xl bg-ink-50 p-3 text-xs font-bold text-ink-700">Reference: PHPE-DEMO</p><Button full className="mt-5" onClick={onClose}>Done</Button></div>}
        <p className="text-center text-[10px] text-ink-400">PhonePe-style UI for demonstration only. No real money is charged.</p>
      </div>
    </div>
  </div>
}
export function IconBtn({ children, className, label, ...p }) {
  return (
    <button aria-label={label} {...p} className={cx('relative grid size-10 shrink-0 place-items-center rounded-full text-ink-800 transition hover:bg-ink-100 active:bg-ink-200', className)}>
      {children}
    </button>
  )
}

/* ---------- layout ---------- */
export function Screen({ title, subtitle, back = true, right, children, footer, overlay, pad = true, bg = 'bg-ink-50', headerless, headerClass, scrollClass = '' }) {
  const nav = useNav()
  const [scrolled, setScrolled] = useState(false)
  return (
    <div className="vv-screen-layout relative flex h-full flex-col bg-white">
      {!headerless && (
        <header className={cx('z-10 flex h-14 shrink-0 items-center gap-1 border-b bg-white/95 px-2 backdrop-blur transition-shadow duration-200', scrolled ? 'border-transparent shadow-[0_6px_16px_-8px_rgba(20,40,75,0.28)]' : 'border-ink-100', headerClass)}>
          {back ? (
            <IconBtn label="Back" onClick={nav.back}><ArrowLeft size={21} /></IconBtn>
          ) : <div className="w-2" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold leading-tight text-ink-900">{title}</h1>
            {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
          </div>
          <div className="flex items-center">{right}</div>
        </header>
      )}
      <div onScroll={(e) => { const s = e.currentTarget.scrollTop > 4; if (s !== scrolled) setScrolled(s) }} className={cx('vv-screen-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth no-scrollbar', bg, scrollClass)}>
        <div className={cx(pad && 'space-y-4 p-4')}>{children}</div>
      </div>
      {footer && <div className="shrink-0 border-t border-ink-100 bg-white p-3">{footer}</div>}
      {overlay}
    </div>
  )
}

export function Card({ children, className, onClick, pad = true }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('block w-full rounded-2xl bg-white text-left shadow-[0_1px_2px_rgba(20,40,75,0.05),0_8px_24px_-12px_rgba(20,40,75,0.12)] ring-1 ring-ink-100/80', pad && 'p-4', onClick && 'transition duration-150 active:scale-[0.985] active:bg-ink-50', className)}>
      {children}
    </Tag>
  )
}

export function Section({ title, action, onAction, children, className }) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
          {action && <button onClick={onAction} className="flex items-center text-[13px] font-semibold text-brand-700">{action}<ChevronRight size={15} /></button>}
        </div>
      )}
      {children}
    </section>
  )
}

export function ListRow({ icon: Icon, tone = 'teal', title, subtitle, right, onClick, danger, last }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('flex w-full items-center gap-3 px-4 py-3 text-left', onClick && 'active:bg-ink-50', !last && 'border-b border-ink-100')}>
      {Icon && (
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', danger ? 'bg-red-50 text-red-600' : SOFT[tone] || SOFT.teal)}><Icon size={18} /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cx('block truncate text-sm font-semibold', danger ? 'text-red-600' : 'text-ink-900')}>{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-ink-500">{subtitle}</span>}
      </span>
      {right}
      {onClick && !right && <ChevronRight size={17} className="shrink-0 text-ink-300" />}
    </Tag>
  )
}
export function Group({ children, className }) {
  return <Card pad={false} className={cx('overflow-hidden', className)}>{children}</Card>
}

export function Thumb({ tone = 'teal', icon: Icon, size = 56, className, round = 'rounded-2xl' }) {
  return (
    <div style={{ width: size, height: size }} className={cx('relative grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br text-white', GRAD[tone] || GRAD.teal, round, className)}>
      <div className="absolute -right-3 -top-3 size-1/2 rounded-full bg-white/20" />
      <div className="absolute -bottom-4 -left-2 size-2/3 rounded-full bg-black/10" />
      {Icon && <Icon size={Math.round(size * 0.44)} className="relative" strokeWidth={1.8} />}
    </div>
  )
}

export function Avatar({ name = '?', size = 40, tone }) {
  const t = tone || Object.keys(GRAD)[(name.charCodeAt(0) + name.length) % 8]
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }} className={cx('grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white', GRAD[t])}>{initials}</div>
  )
}

export function Rating({ value, count, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-800">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      {value?.toFixed ? value.toFixed(1) : value}
      {count != null && <span className="font-normal text-ink-400">({count})</span>}
    </span>
  )
}
export function Stars({ value, onChange, size = 28 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)} aria-label={`${n} star`}>
          <Star size={size} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-300'} />
        </button>
      ))}
    </div>
  )
}

export function Banner({ tone = 'blue', icon, title, children, action }) {
  const map = { blue: 'bg-sky-50 text-sky-900 ring-sky-200', amber: 'bg-amber-50 text-amber-900 ring-amber-200', red: 'bg-red-50 text-red-900 ring-red-200', green: 'bg-emerald-50 text-emerald-900 ring-emerald-200', teal: 'bg-brand-50 text-brand-900 ring-brand-200', gray: 'bg-ink-100 text-ink-800 ring-ink-200' }
  const Icon = icon || { blue: Info, amber: AlertTriangle, red: XCircle, green: CheckCircle2, teal: Info, gray: Info }[tone]
  return (
    <div className={cx('flex gap-3 rounded-2xl p-3.5 ring-1 ring-inset', map[tone])}>
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-[13px] leading-snug">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, body, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-ink-100 text-ink-400"><Icon size={28} /></div>
      <p className="mt-4 text-[15px] font-bold text-ink-900">{title}</p>
      {body && <p className="mt-1 text-[13px] text-ink-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, icon: Icon, tone = 'teal', delta, onClick }) {
  return (
    <Card onClick={onClick} className="!p-3.5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        {Icon && <span className={cx('grid size-8 place-items-center rounded-lg', SOFT[tone])}><Icon size={16} /></span>}
      </div>
      <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight text-ink-900">{value}</p>
      {delta && <p className={cx('mt-1.5 text-[11px] font-semibold', delta.startsWith('-') ? 'text-red-600' : 'text-emerald-600')}>{delta} <span className="font-normal text-ink-400">vs last week</span></p>}
    </Card>
  )
}

/* ---------- forms ---------- */
export function useForm(initial) {
  const [v, setV] = useState(initial)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  return [v, set, setV]
}

const fieldBase = 'w-full rounded-xl bg-white px-3.5 text-sm text-ink-900 outline-none ring-1 ring-inset ring-ink-200 transition placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500'
export function Field({ label, hint, error, children, required }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{label}{required && <span className="text-red-500"> *</span>}</span>}
      {children}
      {error ? <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle size={12} />{error}</span>
        : hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}
export function Input({ label, hint, error, required, icon: Icon, textarea, rows = 3, prefix, className, ...p }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        {Icon && <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />}
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">{prefix}</span>}
        {textarea ? (
          <textarea rows={rows} {...p} className={cx(fieldBase, 'resize-none py-3', error && '!ring-red-400', className)} />
        ) : (
          <input {...p} className={cx(fieldBase, 'h-12', Icon && '!pl-10', prefix && '!pl-8', error && '!ring-red-400', className)} />
        )}
      </div>
    </Field>
  )
}
export function Select({ label, hint, error, required, options, ...p }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <select {...p} className={cx(fieldBase, 'h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%238793ab%27 stroke-width=%272.2%27%3E%3Cpath d=%27m3 6 5 5 5-5%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10', error && '!ring-red-400')}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </Field>
  )
}

export function CategorySelect({ label, hint, error, required, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => (typeof option === 'string' ? option : option.value) === value)
  const selectedLabel = selected ? (typeof selected === 'string' ? selected : selected.label) : (options[0]?.label || 'Choose a category')
  const choose = (nextValue) => {
    onChange({ target: { value: nextValue } })
    setOpen(false)
  }
  return (
    <Field label={label} hint={hint} error={error} required>
      <div className="relative" onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
        <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((state) => !state)} className={cx('group flex h-12 w-full items-center justify-between rounded-xl bg-white px-3.5 text-left text-sm text-ink-900 outline-none ring-1 ring-inset transition hover:bg-white', open ? 'ring-2 ring-[#0e1b2c]' : 'ring-[#e4ddd0] hover:ring-[#b9b2a5]', error && '!ring-red-400')}>
          <span className={cx(!value && 'text-ink-400')}>{selectedLabel}</span>
          <ChevronDown size={17} className={cx('text-[#8c9a98] transition-transform', open && 'rotate-180 text-[#0e1b2c]')} />
        </button>
        {open && <div role="listbox" className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#e4ddd0] bg-[#fffdf8] p-1.5 shadow-[0_16px_35px_-18px_rgba(15,43,53,.28)]">
          {options.map((option) => {
            const optionValue = typeof option === 'string' ? option : option.value
            const optionLabel = typeof option === 'string' ? option : option.label
            const active = optionValue === value
            return <button key={optionValue} type="button" role="option" aria-selected={active} onClick={() => choose(optionValue)} className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition', active ? 'bg-[#efeae0] font-bold text-[#0e1b2c]' : 'text-ink-700 hover:bg-[#f7f4ee] hover:text-ink-900')}>{optionLabel}{active && <Check size={16} className="text-[#8a6420]" />}</button>
          })}
        </div>}
      </div>
    </Field>
  )
}
export function Toggle({ on, onChange, label, desc }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="min-w-0 flex-1">
        {label && <p className="text-sm font-semibold text-ink-900">{label}</p>}
        {desc && <p className="text-xs text-ink-500">{desc}</p>}
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cx('relative h-7 w-12 shrink-0 rounded-full transition', on ? 'bg-brand-600' : 'bg-ink-300')}>
        <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  )
}
export function Checkbox({ checked, onChange, children }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1 ring-inset transition', checked ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white ring-ink-300')}>
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="text-[13px] leading-snug text-ink-700">{children}</span>
    </button>
  )
}
export function Chips({ options, value, onChange, multi, className, scroll = true }) {
  const isOn = (id) => (multi ? value.includes(id) : value === id)
  const pick = (id) => onChange(multi ? (value.includes(id) ? value.filter((x) => x !== id) : [...value, id]) : id)
  return (
    <div className={cx('flex gap-2', scroll ? 'no-scrollbar -mx-4 overflow-x-auto px-4' : 'flex-wrap', className)}>
      {options.map((o) => {
        const id = o.id ?? o
        const label = o.label ?? o
        return (
          <button key={id} type="button" onClick={() => pick(id)} className={cx('shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset transition', isOn(id) ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-600 ring-ink-200 hover:bg-ink-50')}>
            {label}
          </button>
        )
      })}
    </div>
  )
}
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('flex rounded-xl bg-ink-100 p-1', className)}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition', value === o.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
          {o.label}
          {o.count != null && <span className={cx('rounded-full px-1.5 text-[10px]', value === o.id ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600')}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
export function SearchBar({ value, onChange, placeholder = 'Search', right, onClick, autoFocus }) {
  return (
    <div className="flex items-center gap-2">
      <div onClick={onClick} className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input autoFocus={autoFocus} readOnly={!onChange} value={value} onChange={onChange} placeholder={placeholder} className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm text-ink-900 outline-none ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500" />
      </div>
      {right}
    </div>
  )
}

/* ---------- overlays ---------- */
export function Sheet({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div onClick={onClose} className="absolute inset-0 animate-fade-in bg-ink-900/50" />
      <div className="relative flex max-h-[88%] animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink-200" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h3 className="text-base font-bold">{title}</h3>
          <IconBtn label="Close" onClick={onClose} className="!size-8"><X size={18} /></IconBtn>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto no-scrollbar px-5 pb-4 pt-1">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink-100 p-3">{footer}</div>}
      </div>
    </div>
  )
}
export function Dialog({ open, onClose, title, children, actions }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-50 grid place-items-center p-6">
      <div onClick={onClose} className="absolute inset-0 animate-fade-in bg-ink-900/55" />
      <div className="relative w-full animate-fade-in rounded-3xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-bold">{title}</h3>
        <div className="mt-2 space-y-3 text-sm text-ink-600">{children}</div>
        <div className="mt-5 flex gap-2">{actions}</div>
      </div>
    </div>
  )
}

/* ---------- data display ---------- */
export function Timeline({ steps }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className={cx('absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5', s.done ? 'bg-brand-500' : 'bg-ink-200')} />}
          <span className={cx('z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-white', s.done ? 'bg-brand-600 text-white' : s.current ? 'bg-white text-brand-600 ring-brand-100' : 'bg-ink-200 text-ink-400')}>
            {s.done ? <Check size={13} strokeWidth={3} /> : s.current ? <span className="size-2.5 rounded-full bg-brand-600" /> : <span className="size-2 rounded-full bg-ink-300" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cx('text-sm font-semibold', s.done || s.current ? 'text-ink-900' : 'text-ink-400')}>{s.label}</p>
            {(s.at || s.note) && <p className="text-xs text-ink-500">{[s.at, s.note].filter(Boolean).join(' · ')}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function KV({ rows, className }) {
  return (
    <dl className={cx('space-y-2.5', className)}>
      {rows.filter(Boolean).map(([k, v, strong]) => (
        <div key={k} className="flex items-start justify-between gap-4 text-sm">
          <dt className="shrink-0 text-ink-500">{k}</dt>
          <dd className={cx('text-right text-ink-900', strong ? 'font-extrabold' : 'font-semibold')}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PriceBreakdown({ lines, total, note }) {
  return (
    <Card>
      <p className="mb-3 text-sm font-bold">Price breakdown</p>
      <div className="space-y-2">
        {lines.map(([k, v, hint]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-ink-500">{k}{hint && <span className="ml-1 text-xs text-ink-400">{hint}</span>}</span>
            <span className={cx('font-semibold', v === 'FREE' && 'text-emerald-600')}>{typeof v === 'number' ? fmt(v) : v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink-200 pt-3">
        <span className="text-sm font-bold">Total payable</span>
        <span className="text-xl font-extrabold text-brand-700">{fmt(total)}</span>
      </div>
      {note && <p className="mt-2 text-xs text-ink-500">{note}</p>}
    </Card>
  )
}

export function DocTile({ name, status = 'pending', note, onAction, actionLabel }) {
  const tone = { verified: 'text-emerald-600 bg-emerald-50', pending: 'text-amber-600 bg-amber-50', rejected: 'text-red-600 bg-red-50', missing: 'text-ink-400 bg-ink-100' }[status]
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-inset ring-ink-200">
      <span className={cx('grid size-10 place-items-center rounded-lg', tone)}>{status === 'missing' ? <Upload size={18} /> : <FileText size={18} />}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-ink-500">{note || (status === 'missing' ? 'Not uploaded yet' : 'PDF · 1.2 MB')}</p>
      </div>
      {onAction ? <button onClick={onAction} className="text-[13px] font-bold text-brand-700">{actionLabel}</button> : <StatusBadge s={status === 'pending' ? 'pending' : status} />}
    </div>
  )
}

export function Stepper({ steps, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 flex-col gap-1.5">
          <div className={cx('h-1.5 rounded-full', i <= current ? 'bg-brand-600' : 'bg-ink-200')} />
          <span className={cx('text-[10px] font-semibold', i === current ? 'text-brand-700' : 'text-ink-400')}>{s}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- mini charts ---------- */
export function BarChart({ data, height = 120, color = 'bg-brand-500', money }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: height + 22 }}>
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <div title={String(d.value)} className={cx('w-full rounded-t-md', color)} style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }} />
          </div>
          <span className="text-[10px] font-medium text-ink-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
export function Spark({ points, color = '#00857c', h = 36, w = 110 }) {
  const max = Math.max(...points), min = Math.min(...points)
  const xs = points.map((p, i) => [(i / (points.length - 1)) * w, h - 4 - ((p - min) / (max - min || 1)) * (h - 8)])
  const d = xs.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function HBar({ label, value, max, right, color = 'bg-brand-500' }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-ink-700">{label}</span><span className="text-ink-500">{right ?? value}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100"><div className={cx('h-full rounded-full', color)} style={{ width: `${(value / (max || 1)) * 100}%` }} /></div>
    </div>
  )
}

export function Pill({ children, icon: Icon, className }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600', className)}>{Icon && <Icon size={12} />}{children}</span>
}

export function Meta({ icon: Icon, children }) {
  return <span className="inline-flex items-center gap-1 text-xs text-ink-500"><Icon size={13} className="shrink-0" />{children}</span>
}

export function Due({ date }) {
  return <span className="inline-flex items-center gap-1 text-xs text-ink-500"><Clock size={12} />{date}</span>
}

/* swipeable scroll-snap carousel with dots (and optional auto-advance) */
export function Carousel({ children, auto = 0, counter, dotsClass }) {
  const ref = useRef(null)
  const idx = useRef(0)
  const [i, setI] = useState(0)
  const n = Children.count(children)
  const go = (k) => ref.current?.scrollTo({ left: k * ref.current.clientWidth, behavior: 'smooth' })
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => go((idx.current + 1) % n), auto)
    return () => clearInterval(t)
  }, [auto, n])
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => { const k = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth); if (k !== idx.current) { idx.current = k; setI(k) } }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {Children.map(children, (c) => <div className="w-full shrink-0 snap-center">{c}</div>)}
      </div>
      {counter && <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{i + 1}/{n}</span>}
      <div className={cx('absolute inset-x-0 flex justify-center gap-1.5', dotsClass || 'bottom-3')}>
        {Array.from({ length: n }).map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => go(k)} className={cx('h-1.5 rounded-full transition-all', k === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50')} />)}
      </div>
    </div>
  )
}

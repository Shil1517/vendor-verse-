import { useEffect, useState } from 'react'
import {
  ShieldCheck, CreditCard, Landmark, Wallet, Smartphone, FileText, Download, Plus, Check, Lock, Banknote, Receipt, TrendingUp, ArrowDownToLine, Info, Percent, Globe, Hourglass, X, RefreshCw, Tag,
  CircleAlert, Undo2, Calculator, Loader2, BadgeCheck, ChevronRight, ArrowRightLeft, Printer, Repeat,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { PAY_METHODS, fmtC, convert, CUR, COUPONS, planInvoice, feeSplit, COMMISSION0, GEO } from '../globaldata.jsx'
import {
  Screen, Card, Section, Button, Chips, Segmented, Sheet, Input, Select, Toggle, Badge, Banner, EmptyState, Stat, KV, cx, Pill, StatusBadge, ListRow, Group, Timeline, PhaseBanner, PhaseTag, ReasonSheet, HBar, Checkbox,
} from '../ui.jsx'
import { useMyVendor } from './vendor_a.jsx'
import { authService } from '../services/authService.js'
import { RemoteCheckoutUnavailable, RemoteInvoice } from './remote-revenue.jsx'

const M_ICON = { upi: Smartphone, card: CreditCard, bank: Landmark, wallet: Wallet, lc: FileText }
const DAY0 = new Date('19 Oct 2026')
const daysTo = (label) => (label && label !== '—' ? Math.max(0, Math.round((new Date(label) - DAY0) / 864e5)) : 0)

/* ---------- itemised amounts: negatives (discounts, credits) are green, totals are bold ---------- */
export function Breakdown({ rows, total, totalLabel = 'Total', cur = 'INR', note, tone = 'brand' }) {
  return (
    <Card>
      <div className="space-y-2">
        {rows.map(([k, v, hint]) => (
          <div key={k} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 text-ink-600">{k}{hint && <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span>}</span>
            <span className={cx('shrink-0 font-semibold', typeof v === 'number' && v < 0 && 'text-emerald-600', v === 0 && 'text-ink-400')}>{typeof v === 'number' ? (v < 0 ? '−' : '') + fmtC(Math.abs(v), cur) : v}</span>
          </div>
        ))}
      </div>
      {total != null && <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink-200 pt-3"><span className="text-sm font-bold">{totalLabel}</span><span className={cx('text-xl font-extrabold', tone === 'brand' && 'text-brand-700')}>{fmtC(total, cur)}</span></div>}
      {note && <p className="mt-2 text-[11px] leading-snug text-ink-400">{note}</p>}
    </Card>
  )
}

function MethodList({ value, onChange, methods }) {
  return (
    <div className="space-y-2">
      {methods.map((x) => { const I = M_ICON[x.id]; return (
        <button key={x.id} onClick={() => onChange(x.id)} className={cx('flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset', value === x.id ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-ink-200')}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600"><I size={19} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{x.name}</span><span className="block text-xs text-ink-500">{x.sub}</span></span>
          <span className={cx('grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset', value === x.id ? 'bg-brand-600 text-white ring-brand-600' : 'ring-ink-300')}>{value === x.id && <Check size={12} strokeWidth={3} />}</span>
        </button>
      ) })}
    </div>
  )
}

/* simulated processing → success / failure, with an explicit "no money moved" message on failure */
function useProcessing(onDone) {
  const [stage, setStage] = useState('form')
  const run = (fail) => { setStage('processing'); setTimeout(() => { const ok = !fail; setStage(ok ? 'done' : 'failed'); onDone?.(ok) }, 1100) }
  return [stage, setStage, run]
}
function Processing({ label = 'Contacting your bank…' }) {
  return <div className="flex flex-col items-center gap-3 py-16 text-center"><Loader2 size={34} className="animate-spin text-brand-600" /><p className="text-sm font-bold">{label}</p><p className="max-w-[16rem] text-xs text-ink-500">Don’t close the app. If anything goes wrong we never charge you twice — retries are idempotent.</p></div>
}
function FailedCard({ reason, onRetry, onChange, extra }) {
  return (
    <div className="space-y-3">
      <Card className="text-center !p-6"><div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600"><X size={34} /></div><h2 className="mt-3 text-lg font-extrabold">Payment didn’t go through</h2><p className="mt-1 text-sm text-ink-600">{reason}</p><p className="mt-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">No money has left your account. If your bank shows a hold it is released automatically within 3–5 days.</p></Card>
      {extra}
      <div className="grid grid-cols-2 gap-2.5"><Button icon={RefreshCw} onClick={onRetry}>Try again</Button><Button variant="secondary" onClick={onChange}>Change method</Button></div>
    </div>
  )
}

/* ================= PLAN CHECKOUT (MVP — subscription) ================= */
export function PlanCheckout({ params = {} }) {
  if (authService.isRemote) return <RemoteCheckoutUnavailable />
  const nav = useNav()
  const { settings, taxes, patchVendor, invoices, setInvoices, notify, toast, addAudit, setSubStatus } = useApp()
  const v = useMyVendor()
  const cur = settings.plans.find((p) => p.name === v?.sub.plan) || settings.plans[0]
  const target = settings.plans.find((p) => p.name === (params.plan || 'Growth')) || settings.plans[2]
  const [cycle, setCycle] = useState('monthly')
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [cerr, setCerr] = useState('')
  const [m, setM] = useState('upi')
  const [agree, setAgree] = useState(false)
  const [fail, setFail] = useState(false)
  const [inv, setInv] = useState(null)
  const [stage, setStage, run] = useProcessing()
  if (!v) return <Screen title="Checkout"><EmptyState icon={Lock} title="No vendor organization" /></Screen>
  const tx = taxes.find((t) => t.code === v.country) || taxes[0]
  const active = ['active', 'grace', 'cancelled'].includes(v.sub.status)
  const left = active ? daysTo(v.sub.paidUntil) : 0
  const down = active && target.price < cur.price
  const same = active && target.name === cur.name
  const bill = planInvoice({ plan: target, cycle, taxRate: tx.rate, taxLabel: tx.label, coupon, current: active && !down && !same ? cur : null, daysLeft: left })
  const methods = PAY_METHODS.filter((x) => ['upi', 'card', 'bank'].includes(x.id))
  const applyCode = () => { const c = code.trim().toUpperCase(); if (COUPONS[c]) { setCoupon(c); setCerr('') } else { setCoupon(null); setCerr('This code isn’t valid or has expired') } }
  const finish = () => {
    const id = `INV-2026-${1042 + invoices.length}`
    setInvoices((i) => [{ id, kind: 'subscription', vendorId: v.id, title: `${target.name} plan — ${cycle === 'yearly' ? '12 months' : '1 month'}`, date: '19 Oct 2026', cur: 'INR', lines: bill.lines, subtotal: bill.subtotal, taxLabel: tx.label, taxRate: tx.rate, tax: bill.tax, total: bill.total, status: 'paid', method: methods.find((x) => x.id === m).name, seller: 'ADRS Techno Private Limited', sellerTax: 'GSTIN 08AAGCA1234F1Z5', buyer: v.name, buyerTax: `GSTIN ${v.gstin}`, place: v.state || v.city }, ...i])
    patchVendor(v.id, (x) => ({ sub: { ...x.sub, plan: target.name, status: 'active', paidUntil: cycle === 'yearly' ? '19 Oct 2027' : '19 Nov 2026', renews: cycle === 'yearly' ? '19 Oct 2027' : '19 Nov 2026', autoRenew: true, grace: null, pending: null } }))
    addAudit('Billing: payment confirmed (webhook)', v.name, 'billing', `${target.name} ${cycle} · ${id}`, 'System')
    notify('vendor', 'Payment received', `${target.name} plan is active. Invoice ${id}.`, 'subscription', ['invoice', { id }])
    setInv(id)
  }
  const pay = () => { if (!agree) return toast('Please accept the terms to continue', 'warn'); run(fail); if (!fail) setTimeout(finish, 1100) }
  if (stage === 'processing') return <Screen title="Processing payment" back={false}><Processing /></Screen>
  if (stage === 'failed') return <Screen title="Payment failed" back={false}><FailedCard reason="Your bank declined the transaction (code 05 — do not honour)." onRetry={() => { setFail(false); setStage('form') }} onChange={() => { setStage('form'); setFail(false) }} extra={active && v.sub.status === 'grace' ? <Banner tone="amber" title="Your grace period is still running">Listings stay visible until {v.sub.grace}. Pay before then to avoid being hidden.</Banner> : null} /></Screen>
  if (stage === 'done') {
    return (
      <Screen title="Payment successful" back={false} footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => nav.replace('invoice', { id: inv })}>View invoice</Button><Button className="flex-1" onClick={() => nav.reset('v_sub')}>Done</Button></div>}>
        <Card className="text-center !p-6"><div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={34} /></div><h2 className="mt-3 text-lg font-extrabold">{fmtC(bill.total)} paid</h2><p className="mt-1 text-sm text-ink-600">{target.name} plan active. Next renewal {cycle === 'yearly' ? '19 Oct 2027' : '19 Nov 2026'}.</p></Card>
        <Banner tone="blue" title="What happens now">Your listings are re-checked right away. Any that already pass content review and verification go public — payment never skips those checks.</Banner>
      </Screen>
    )
  }
  return (
    <Screen title={same ? 'Renew plan' : down ? 'Change plan' : 'Upgrade plan'} subtitle={`${cur.name} → ${target.name}`} footer={down ? <Button full size="lg" onClick={() => { patchVendor(v.id, (x) => ({ sub: { ...x.sub, pending: target.name } })); toast(`${target.name} starts on ${v.sub.paidUntil}`); nav.reset('v_sub') }}>Schedule downgrade</Button> : <Button full size="lg" icon={Lock} onClick={pay}>Pay {fmtC(bill.total)}</Button>}>
      <Segmented value={cycle} onChange={setCycle} options={[{ id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly · 2 months free' }]} />
      <Card className="!p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-ink-400">You’re getting</p><p className="text-lg font-extrabold">{target.name}</p></div><Pill>{fmtC(target.price)} / month</Pill></div><KV className="mt-3" rows={[['Public listings', target.listings], ['Lead limit', target.leads], ['Tools', target.tools]]} /></Card>
      {down ? (
        <Banner tone="amber" title="Downgrades start at the end of your paid period">You keep {cur.name} until {v.sub.paidUntil} ({left} days). No refund is issued for the unused days. If you have more listings than {target.name} allows, the extra ones are paused — nothing is deleted.</Banner>
      ) : (
        <>
          <Section title="What you pay"><Breakdown cur="INR" rows={[...bill.lines, ['Subtotal', bill.subtotal], [`${tx.label} @ ${tx.rate}%`, bill.tax, `Place of supply: ${v.city} · ${v.gstin}`]]} total={bill.total} totalLabel="Total today" note={`Invoice issued by ADRS Techno Private Limited. Renews automatically ${bill.renewsAt}; you can turn auto-renew off any time and keep the plan until the period ends.`} /></Section>
          <Card className="space-y-2"><p className="flex items-center gap-2 text-sm font-bold"><Tag size={15} />Coupon</p><div className="flex gap-2"><input value={code} onChange={(e) => { setCode(e.target.value); setCerr('') }} placeholder="Try LAUNCH20" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm uppercase outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={applyCode}>Apply</Button></div>{cerr && <p className="text-xs font-medium text-red-600">{cerr}</p>}{coupon && <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} />{COUPONS[coupon].label} applied</p>}</Card>
          <Section title="Pay with"><MethodList value={m} onChange={setM} methods={methods} /></Section>
          <Checkbox checked={agree} onChange={setAgree}>I agree to the subscription terms. Payment is for platform access only — it never overrides content review or verification, and it isn’t a quality signal.</Checkbox>
          <Card className="!bg-ink-100 shadow-none"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Mockup control</p><Toggle label="Simulate a bank decline" desc="See the failed-payment flow" on={fail} onChange={setFail} /></Card>
        </>
      )}
    </Screen>
  )
}

/* ================= INVOICE DOCUMENT (subscription or payment) ================= */
export function Invoice({ params = {} }) {
  if (authService.isRemote) return <RemoteInvoice params={params} />
  const { invoices, payments, toast, vendor } = useApp()
  let d = invoices.find((x) => x.id === params.id)
  if (!d && params.pay) {
    const p = payments.find((x) => x.id === params.pay) || payments[0]
    const net = p.amount
    d = { id: p.id.replace('PY', 'INV'), kind: 'service', title: p.ref, date: p.at, cur: p.cur, lines: [[`${p.ref} — services by ${p.vendor}`, net]], subtotal: net, taxLabel: 'Tax', taxRate: 0, tax: 0, total: net, status: p.status === 'refunded' ? 'refunded' : 'paid', method: p.method, seller: p.vendor, sellerTax: 'Tax invoice issued by the vendor — VendorVerse shows a copy', buyer: 'Aarav Mehta', buyerTax: '—', place: 'Jaipur', note: 'Vendor’s price is tax-inclusive. VendorVerse charged you no platform fee.' }
  }
  d = d || invoices[0]
  return (
    <Screen title={d.id} subtitle={d.title} right={<StatusBadge s={d.status === 'paid' ? 'paid' : 'refunded'} className="mr-2" />} footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" icon={Printer} onClick={() => toast('Opening print dialog')}>Print</Button><Button className="flex-1" icon={Download} onClick={() => toast('Invoice PDF downloaded')}>Download PDF</Button></div>}>
      <Card className="space-y-4 !p-5">
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-ink-400">Tax invoice</p><p className="text-lg font-extrabold">{d.id}</p><p className="text-xs text-ink-500">{d.date}</p></div><span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Receipt size={22} /></span></div>
        <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-ink-50 p-3"><p className="font-bold text-ink-400">FROM</p><p className="mt-1 font-bold text-ink-900">{d.seller}</p><p className="mt-0.5 text-ink-500">{d.sellerTax}</p></div><div className="rounded-xl bg-ink-50 p-3"><p className="font-bold text-ink-400">TO</p><p className="mt-1 font-bold text-ink-900">{d.buyer}</p><p className="mt-0.5 text-ink-500">{d.buyerTax}</p></div></div>
        <div><div className="grid grid-cols-[1fr_auto] gap-2 border-b border-ink-200 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400"><span>Description</span><span>Amount</span></div>{d.lines.map(([k, n]) => <div key={k} className="grid grid-cols-[1fr_auto] gap-2 border-b border-ink-100 py-2 text-sm"><span className="text-ink-700">{k}</span><span className={cx('font-semibold', n < 0 && 'text-emerald-600')}>{n < 0 ? '−' : ''}{fmtC(Math.abs(n), d.cur)}</span></div>)}</div>
        <div className="space-y-1.5 text-sm"><div className="flex justify-between"><span className="text-ink-500">Subtotal</span><b>{fmtC(d.subtotal, d.cur)}</b></div><div className="flex justify-between"><span className="text-ink-500">{d.taxLabel} @ {d.taxRate}%</span><b>{fmtC(d.tax, d.cur)}</b></div><div className="flex justify-between border-t border-dashed border-ink-200 pt-2 text-base"><span className="font-bold">Total</span><span className="text-xl font-extrabold text-brand-700">{fmtC(d.total, d.cur)}</span></div></div>
        <KV rows={[['Paid with', d.method], ['Place of supply', d.place], ['Status', d.status === 'paid' ? 'Paid in full' : 'Refunded']]} />
        {d.note && <p className="text-[11px] text-ink-400">{d.note}</p>}
      </Card>
    </Screen>
  )
}

/* ================= CUSTOMER CHECKOUT (Phase 2) ================= */
export function Checkout({ params = {} }) {
  const nav = useNav()
  const { vendor, payments, setPayments, toast, loc, wallet, setWallet, dispCur, me } = useApp()
  const v = vendor(params.vendorId || 'v6')
  const amount = +(params.amount || 3499)
  const cur = params.cur || 'INR'
  const mine = (me.profile?.cur) || 'INR'
  const ref = params.ref || 'BKG-2099'
  const [m, setM] = useState('upi')
  const [escrow, setEscrow] = useState(true)
  const [useWallet, setUseWallet] = useState(false)
  const [fail, setFail] = useState(false)
  const [done, setDone] = useState(null)
  const [stage, setStage, run] = useProcessing()
  const methods = PAY_METHODS.filter((x) => (x.country === '*' || x.country === (loc.country || 'IN')) && x.id !== 'wallet')
  const fx = cur !== mine
  const FX_MARGIN = 0.015
  const base = fx ? convert(amount, cur, mine) : amount
  const fxFee = fx ? Math.round(base * FX_MARGIN) : 0
  const credit = useWallet ? Math.min(wallet.balance, base + fxFee) : 0
  const total = Math.round(base + fxFee - credit)
  const rate = convert(1, cur, mine)
  const split = feeSplit({ amount, rate: 8, min: 20, cap: 2500, taxRate: 18 })
  const pay = () => {
    run(fail)
    if (fail) return
    setTimeout(() => {
      const id = 'PY-' + (9005 + payments.length)
      setPayments((p) => [{ id, ref, vendor: v.name, amount, cur, fee: split.commission, status: escrow ? 'held' : 'released', method: useWallet ? 'Wallet + ' + methods.find((x) => x.id === m).name : methods.find((x) => x.id === m).name, at: '19 Oct 2026' }, ...p])
      if (useWallet) setWallet((w) => ({ balance: w.balance - credit, txns: [{ id: 'w' + Date.now(), t: `Paid · ${ref}`, n: -credit, at: '19 Oct 2026' }, ...w.txns] }))
      setDone(id)
    }, 1100)
  }
  if (stage === 'processing') return <Screen title="Processing payment" back={false}><Processing label="Confirming with your bank…" /></Screen>
  if (stage === 'failed') return <Screen title="Payment failed" back={false}><FailedCard reason="The payment could not be authorised (insufficient funds / limit exceeded)." onRetry={() => { setFail(false); setStage('form') }} onChange={() => { setStage('form'); setFail(false) }} extra={<Banner tone="blue" title="Your booking is unaffected">{ref} stays as it was. Nothing was sent to the vendor.</Banner>} /></Screen>
  if (done) {
    return (
      <Screen title="Payment received" back={false} footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => nav.replace('invoice', { pay: done })}>Receipt</Button><Button className="flex-1" onClick={() => nav.reset('c_activity')}>Done</Button></div>}>
        <Card className="text-center !p-6"><div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={34} /></div><h2 className="mt-3 text-lg font-extrabold">{fmtC(total, mine)} {escrow ? 'held in escrow' : 'paid'}</h2><p className="mt-1 text-sm text-ink-600">{escrow ? `${v.name} is paid only when you confirm the work (or milestone). Receipt ${done}.` : `Receipt ${done}.`}</p></Card>
        <PhaseBanner p="P2" title="Escrow is a Phase 2 feature">In the MVP you pay the vendor directly and VendorVerse never holds funds.</PhaseBanner>
      </Screen>
    )
  }
  return (
    <Screen title="Checkout" subtitle={`${ref} · ${v.name}`} footer={<Button full size="lg" icon={Lock} onClick={pay}>Pay {fmtC(total, mine)}</Button>}>
      <PhaseBanner p="P2" title="Payments are not in the MVP launch">Shown so the long-term flow can be reviewed. MVP = pay the vendor directly.</PhaseBanner>
      <Section title="What you pay"><Breakdown cur={mine} rows={[[`${ref} — price set by ${v.name}`, base, fx ? `${fmtC(amount, cur)} at ${fmtC(rate, mine)} per ${CUR[cur].sym.trim()}1 (mid-market rate)` : 'Taxes included in the vendor’s price'], ['VendorVerse platform fee', 0, 'Customers never pay a platform fee'], ['Escrow protection', 0], ...(fx ? [['Currency conversion margin (1.5%)', fxFee, 'Shown up-front — the bank may add its own charge']] : []), ...(useWallet ? [['Wallet credit', -credit]] : [])]} total={total} totalLabel="You pay today" note="Refunds follow the booking’s cancellation policy and go back to the original method (or wallet)." /></Section>
      <Card className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-bold"><Percent size={15} className="text-violet-600" />Where the money goes</p>
        <div className="flex h-3 overflow-hidden rounded-full"><div className="bg-emerald-500" style={{ width: `${100 - split.effective}%` }} /><div className="bg-violet-500" style={{ width: `${split.effective}%` }} /></div>
        <div className="flex justify-between text-xs"><span className="text-emerald-700"><b>{v.name.split(' ')[0]}</b> receives {fmtC(split.vendorNet, cur)}</span><span className="text-violet-700">Commission + tax {fmtC(split.commission + split.commissionTax, cur)} ({split.effective.toFixed(1)}%)</span></div>
        <p className="text-[11px] text-ink-400">The vendor pays our commission out of their payout. It is never added to your price.</p>
      </Card>
      <Card><Toggle label="Protect with escrow" desc="Funds are held and released to the vendor when you confirm completion or a milestone" on={escrow} onChange={setEscrow} /></Card>
      {wallet.balance > 0 && <Card><Toggle label={`Use wallet balance (${fmtC(wallet.balance)})`} desc="Applied before your card or UPI is charged" on={useWallet} onChange={setUseWallet} /></Card>}
      <Section title="Pay with"><MethodList value={m} onChange={setM} methods={methods} /></Section>
      <Card className="!bg-ink-100 shadow-none"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Mockup controls</p><Toggle label="Simulate a declined payment" on={fail} onChange={setFail} /></Card>
      <p className="flex items-start gap-2 text-[11px] text-ink-400"><ShieldCheck size={13} className="mt-0.5 shrink-0" />Card details are handled by a licensed payment processor and never stored by VendorVerse.</p>
    </Screen>
  )
}

/* ================= CUSTOMER PAYMENTS HUB (Phase 2) ================= */
export function PaymentsHub() {
  const nav = useNav()
  const { payments, setPayments, refunds, wallet, toast } = useApp()
  const [tab, setTab] = useState('payments')
  const [why, setWhy] = useState(null)
  const [rel, setRel] = useState(null)
  const [pct, setPct] = useState(100)
  const held = payments.filter((p) => p.status === 'held').reduce((s, p) => s + p.amount, 0)
  const release = () => {
    const p = rel
    const part = Math.round((p.amount * pct) / 100)
    setPayments((x) => pct === 100 ? x.map((y) => (y.id === p.id ? { ...y, status: 'released' } : y)) : [{ ...p, id: p.id + 'R', amount: part, status: 'released', ref: p.ref + ` · ${pct}% released` }, ...x.map((y) => (y.id === p.id ? { ...y, amount: p.amount - part } : y))])
    toast(`Released ${fmtC(part, p.cur)} to ${p.vendor}${pct < 100 ? ` — ${fmtC(p.amount - part, p.cur)} stays held` : ''}`); setRel(null); setPct(100)
  }
  return (
    <Screen title="Payments & invoices" overlay={<>
      {why && <ReasonSheet open onClose={() => setWhy(null)} title="Raise a payment dispute" intro="Funds stay held while support reviews. VendorVerse records, facilitates and may enforce platform policy." reasons={['Work not completed', 'Not as described', 'Vendor unreachable', 'Other']} confirmLabel="Open dispute" onConfirm={() => { toast('Dispute opened — funds stay held'); setWhy(null); nav.go('c_report', { kind: 'issue', type: 'booking', id: why.ref, label: why.ref }) }} />}
      <Sheet open={!!rel} onClose={() => setRel(null)} title="Release payment" footer={<Button full onClick={release}>Release {rel ? fmtC(Math.round((rel.amount * pct) / 100), rel.cur) : ''}</Button>}>
        {rel && <><p className="text-sm text-ink-600">Release funds to <b>{rel.vendor}</b> for {rel.ref}. You can release part now (e.g. a milestone) and keep the rest protected.</p><Chips scroll={false} value={pct} onChange={setPct} options={[{ id: 25, label: '25%' }, { id: 50, label: '50%' }, { id: 75, label: '75%' }, { id: 100, label: 'All' }]} /><Breakdown cur={rel.cur} rows={[['Released to vendor now', Math.round((rel.amount * pct) / 100)], ['Stays in escrow', rel.amount - Math.round((rel.amount * pct) / 100)]]} /></>}
      </Sheet></>}>
      <PhaseBanner p="P2" title="Phase 2 — payments, wallet and invoices" />
      <div className="grid grid-cols-2 gap-3"><Stat label="Held in escrow" value={fmtC(held, 'INR')} icon={Lock} tone="amber" /><Stat label="Wallet" value={fmtC(wallet.balance, 'INR')} icon={Wallet} tone="emerald" onClick={() => nav.go('c_wallet')} /></div>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'payments', label: 'Payments' }, { id: 'refunds', label: 'Refunds', count: refunds.length }, { id: 'methods', label: 'Methods' }, { id: 'invoices', label: 'Invoices' }]} />
      {tab === 'payments' && payments.map((p) => (
        <Card key={p.id} className="!p-3.5">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{p.id} · {p.at}</span><StatusBadge s={p.status} /></div>
          <p className="mt-1 text-sm font-bold">{p.vendor}</p><p className="text-xs text-ink-500">{p.ref} · {p.method}</p>
          <p className="mt-1 text-lg font-extrabold">{fmtC(p.amount, p.cur)}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {p.status === 'held' && <><Button size="sm" onClick={() => setRel(p)}>Confirm & release</Button><Button size="sm" variant="secondary" onClick={() => setWhy(p)}>Dispute</Button><Button size="sm" variant="secondary" className="col-span-2" icon={Undo2} onClick={() => nav.go('c_refund', { pay: p.id })}>Request refund</Button></>}
            {p.status === 'released' && <><Button size="sm" variant="secondary" icon={Undo2} onClick={() => nav.go('c_refund', { pay: p.id })}>Refund</Button><Button size="sm" variant="secondary" icon={Receipt} onClick={() => nav.go('invoice', { pay: p.id })}>Receipt</Button></>}
          </div>
        </Card>
      ))}
      {tab === 'refunds' && (refunds.length ? refunds.map((r) => <Card key={r.id} onClick={() => nav.go('c_refund', { id: r.id })} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{r.id} · {r.ref}</span><StatusBadge s={r.status === 'refunded' ? 'refunded' : r.status === 'requested' ? 'pending' : r.status} /></div><p className="mt-1 text-sm font-bold">{r.vendor}</p><p className="text-lg font-extrabold">{fmtC(r.amount, r.cur)}</p></Card>) : <EmptyState icon={Undo2} title="No refunds" />)}
      {tab === 'methods' && <div className="space-y-2">{PAY_METHODS.map((x) => { const I = M_ICON[x.id]; return <Card key={x.id} className="!p-3.5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-ink-100 text-ink-600"><I size={19} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{x.name}</p><p className="text-xs text-ink-500">{x.sub}</p></div>{['upi', 'card'].includes(x.id) ? <Badge tone="green">Saved</Badge> : <button onClick={() => toast('Method added')} className="text-xs font-bold text-brand-700">Add</button>}</div></Card> })}</div>}
      {tab === 'invoices' && <Group>{payments.filter((p) => p.status !== 'refunded').map((p, i, a) => <ListRow key={p.id} last={i === a.length - 1} icon={Receipt} tone="sky" title={`Receipt ${p.id.replace('PY', 'INV')}`} subtitle={`${p.vendor} · ${p.at} · ${fmtC(p.amount, p.cur)}`} onClick={() => nav.go('invoice', { pay: p.id })} />)}</Group>}
    </Screen>
  )
}

/* ================= REFUND: request + status (Phase 2) ================= */
export function Refund({ params = {} }) {
  const nav = useNav()
  const { payments, setPayments, refunds, setRefunds, notify, toast } = useApp()
  const existing = params.id ? refunds.find((r) => r.id === params.id) : null
  const p = existing ? payments.find((x) => x.id === existing.paymentId) || payments[0] : payments.find((x) => x.id === params.pay) || payments[1]
  const [reason, setReason] = useState('Work not completed')
  const [mode, setMode] = useState('full')
  const [amt, setAmt] = useState('')
  const [done, setDone] = useState(null)
  const held = p.status === 'held'
  const val = mode === 'full' ? p.amount : Math.min(p.amount, +amt || 0)
  const submit = () => {
    const id = 'RF-' + (72 + refunds.length)
    const auto = held
    const rec = { id, paymentId: p.id, ref: p.ref, vendor: p.vendor, amount: val, cur: p.cur, reason, status: auto ? 'refunded' : 'requested', at: '19 Oct 2026', policy: auto ? 'Funds still in escrow — returned immediately' : 'Already released — the vendor responds within 3 days; VendorVerse can step in', steps: [['requested', 'Just now', 'Customer'], ...(auto ? [['approved', 'Just now', 'Auto — funds still held in escrow'], ['refunded', 'Just now', `Returned to ${p.method}`]] : [])] }
    setRefunds((r) => [rec, ...r])
    if (auto) setPayments((x) => x.map((y) => (y.id === p.id ? { ...y, status: val >= p.amount ? 'refunded' : y.status, amount: val >= p.amount ? y.amount : y.amount - val } : y)))
    notify('vendor', 'Refund requested', `${p.ref} · ${fmtC(val, p.cur)} — ${reason}`, 'support', ['v_payouts', { tab: 'refunds' }])
    toast(auto ? 'Refunded from escrow' : 'Refund requested — vendor has 3 days to respond'); setDone(id)
  }
  if (existing || done) {
    const r = existing || refunds.find((x) => x.id === done) || { id: done, steps: [], amount: val, cur: p.cur, status: 'requested', policy: '', reason, ref: p.ref, vendor: p.vendor }
    return (
      <Screen title={r.id} subtitle={r.ref} right={<StatusBadge s={r.status === 'refunded' ? 'refunded' : 'pending'} className="mr-2" />} footer={<Button full onClick={() => nav.reset('c_payments')}>Back to payments</Button>}>
        <Card className="text-center !p-5"><p className="text-xs text-ink-500">Refund amount</p><p className="text-3xl font-extrabold">{fmtC(r.amount, r.cur)}</p><p className="mt-1 text-sm text-ink-600">{r.status === 'refunded' ? 'Back with you.' : 'Waiting for the vendor.'}</p></Card>
        <Card><KV rows={[['Vendor', r.vendor], ['Reason', r.reason], ['Policy result', r.policy]]} /></Card>
        <Section title="Progress"><Card><Timeline steps={[...r.steps.map(([s, at, by]) => ({ label: { requested: 'Refund requested', approved: 'Approved', refunded: 'Refunded', declined: 'Declined' }[s] || s, at, note: by, done: true })), ...(r.status === 'requested' ? [{ label: 'Vendor responds (within 3 days)', current: true }, { label: 'Refund to original method (3–5 days)' }] : [])]} /></Card></Section>
        {r.status === 'requested' && <Banner tone="blue" title="If the vendor declines or stays silent">You can escalate to support. VendorVerse records the case and may enforce platform policy, but refunds of released payments are the vendor’s to give.</Banner>}
      </Screen>
    )
  }
  return (
    <Screen title="Request a refund" subtitle={`${p.id} · ${p.vendor}`} footer={<Button full size="lg" disabled={!(val > 0)} onClick={submit}>{held ? `Refund ${fmtC(val, p.cur)} now` : `Request ${fmtC(val, p.cur)} refund`}</Button>}>
      <PhaseBanner p="P2" title="Phase 2 — refunds on platform payments" />
      <Card><KV rows={[['Paid', fmtC(p.amount, p.cur)], ['Status', <StatusBadge s={p.status} />], ['Method', p.method]]} /></Card>
      <Banner tone={held ? 'green' : 'amber'} title={held ? 'Funds are still in escrow' : 'Funds were already released'}>{held ? 'You’ll get the money back immediately — the vendor hasn’t been paid yet.' : 'The vendor has been paid. They respond within 3 days; if they decline you can escalate to support.'}</Banner>
      <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={['Work not completed', 'Not as described', 'Service cancelled', 'Duplicate payment', 'Other']} />
      <Segmented value={mode} onChange={setMode} options={[{ id: 'full', label: `Full · ${fmtC(p.amount, p.cur)}` }, { id: 'part', label: 'Partial' }]} />
      {mode === 'part' && <Input label={`Amount (${p.cur})`} inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} hint={`Up to ${fmtC(p.amount, p.cur)}`} />}
      <Breakdown cur={p.cur} rows={[['Refund to you', val], ['Returned to', p.method], ['Arrives', held ? 'Instantly (wallet) / 3–5 days (bank)' : '3–5 days after the vendor approves']]} note="Platform fees on this payment are also refunded; taxes are reversed on a credit note." />
    </Screen>
  )
}

/* ================= WALLET ================= */
export function WalletScreen() {
  const { wallet, setWallet, toast } = useApp()
  const [amt, setAmt] = useState(1000)
  const [m, setM] = useState('upi')
  const [stage, , run] = useProcessing(() => {})
  const methods = PAY_METHODS.filter((x) => ['upi', 'card', 'bank'].includes(x.id))
  const top = () => { run(false); setTimeout(() => { setWallet((w) => ({ balance: w.balance + amt, txns: [{ id: 'w' + Date.now(), t: `Top-up · ${methods.find((x) => x.id === m).name}`, n: amt, at: '19 Oct 2026' }, ...w.txns] })); toast(`${fmtC(amt)} added to your wallet`) }, 1100) }
  return (
    <Screen title="Wallet" subtitle="Refund credits & top-ups">
      <PhaseBanner p="P2" title="Phase 2 — wallet" />
      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 !text-white"><p className="text-xs text-white/75">Balance</p><p className="text-3xl font-extrabold">{fmtC(wallet.balance)}</p><p className="mt-1 text-[11px] text-white/70">Held by VendorVerse’s payment partner · refundable to your bank on request</p></Card>
      {stage === 'processing' ? <Processing label="Adding money…" /> : (
        <>
          <Section title="Add money"><Chips scroll={false} value={amt} onChange={setAmt} options={[500, 1000, 2500, 5000].map((n) => ({ id: n, label: fmtC(n) }))} /></Section>
          <MethodList value={m} onChange={setM} methods={methods} />
          <Breakdown rows={[['Top-up amount', amt], ['Fees', 0, 'No fee to add money'], ['Tax', 0, 'Top-ups aren’t a taxable supply']]} total={amt} totalLabel="You pay" />
          <Button full size="lg" onClick={top}>Add {fmtC(amt)}</Button>
        </>
      )}
      <Section title="History"><Group>{wallet.txns.map((t, i) => <ListRow key={t.id} last={i === wallet.txns.length - 1} icon={t.n > 0 ? ArrowDownToLine : Banknote} tone={t.n > 0 ? 'emerald' : 'slate'} title={t.t} subtitle={t.at} right={<b className={cx('text-sm', t.n > 0 ? 'text-emerald-600' : 'text-ink-800')}>{t.n > 0 ? '+' : '−'}{fmtC(Math.abs(t.n))}</b>} />)}</Group></Section>
    </Screen>
  )
}

/* ================= VENDOR PAYOUTS, REFUND REQUESTS, BANK VERIFICATION (Phase 2) ================= */
export function VendorPayouts({ params = {} }) {
  const { payments, payouts, commission, refunds, patchRefund, banks, setBanks, patchBank, toast } = useApp()
  const v = useMyVendor()
  const [tab, setTab] = useState(params.tab || 'payouts')
  const [bank, setBank] = useState(false)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ holder: v?.name || '', acct: '', ifsc: '', amt: '' })
  const [decl, setDecl] = useState(null)
  const rate = commission.find((c) => c.scope === 'Home services')?.rate || 8
  const gross = payments.reduce((s, p) => s + (p.status === 'released' ? p.amount : 0), 0)
  const escrow = payments.reduce((s, p) => s + (p.status === 'held' ? p.amount : 0), 0)
  const incoming = refunds.filter((r) => r.status === 'requested')
  const verified = banks.some((b) => b.status === 'verified')
  return (
    <Screen
      title="Earnings & payouts"
      subtitle={v?.name}
      overlay={<>
        {decl && <ReasonSheet open onClose={() => setDecl(null)} title="Decline refund" intro="The customer can escalate to support. Give a clear reason." reasons={['Service was delivered as agreed', 'Outside the cancellation policy', 'Offered a partial refund instead', 'Other']} danger confirmLabel="Decline" onConfirm={(r) => { patchRefund(decl.id, (x) => ({ status: 'declined', steps: [...x.steps, ['declined', 'Just now', r]] })); toast('Declined — the customer was told why'); setDecl(null) }} />}
        <Sheet open={bank} onClose={() => { setBank(false); setStep(0) }} title="Add payout account" footer={step === 0 ? <Button full disabled={!f.acct || !f.ifsc} onClick={() => setStep(1)}>Send ₹1 verification</Button> : <Button full disabled={!f.amt} onClick={() => { if (f.amt !== '1.37') return toast('That amount doesn’t match — check your bank app', 'warn'); setBanks((b) => [...b, { id: 'bk' + Date.now(), bank: 'ICICI Bank', acct: '••' + f.acct.slice(-4), holder: f.holder, ifsc: f.ifsc, status: 'verified' }]); toast('Account verified'); setBank(false); setStep(0) }}>Verify</Button>}>
          {step === 0 ? <><Input label="Account holder" value={f.holder} onChange={(e) => setF({ ...f, holder: e.target.value })} hint="Must match your verified business name" /><Input label="Account number" inputMode="numeric" value={f.acct} onChange={(e) => setF({ ...f, acct: e.target.value.replace(/\D/g, '') })} /><Input label="IFSC / routing code" value={f.ifsc} onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase() })} /></> : <><Banner tone="blue" title="₹1.37 sent to your account">We sent a small random amount (penny-drop). Enter it exactly as it shows in your bank statement. Demo answer: <b>1.37</b></Banner><Input label="Amount received (₹)" inputMode="decimal" value={f.amt} onChange={(e) => setF({ ...f, amt: e.target.value.replace(/[^\d.]/g, '') })} /></>}
        </Sheet></>}
    >
      <PhaseBanner p="P2" title="Phase 2 — in the MVP customers pay you directly">Commission, escrow and payouts begin when platform payments launch. Your subscription is the only platform charge in the MVP.</PhaseBanner>
      <div className="grid grid-cols-2 gap-3"><Stat label="Available" value={fmtC(gross * 0.92, 'INR')} icon={Banknote} tone="emerald" /><Stat label="In escrow" value={fmtC(escrow, 'INR')} icon={Lock} tone="amber" /><Stat label="Next payout" value={fmtC(17340, 'INR')} icon={ArrowDownToLine} tone="sky" /><Stat label="Commission rate" value={`${rate}%`} icon={Percent} tone="violet" /></div>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'payouts', label: 'Payouts' }, { id: 'statement', label: 'Statement' }, { id: 'refunds', label: 'Refunds', count: incoming.length }, { id: 'bank', label: 'Bank' }]} />
      {tab === 'payouts' && (<>
        <Card className="space-y-1.5 text-[13px] text-ink-700"><p className="text-sm font-extrabold">Payout schedule</p><p>• Paid every 15 days for completed, un-disputed work</p><p>• Minimum payout ₹500 — smaller balances roll over</p><p>• Held if your bank account isn’t verified, or a dispute / fraud review is open</p><p>• TDS / withholding tax is shown on your statement where applicable</p></Card>
        {!verified && <Banner tone="red" title="Verify a bank account first">Payouts are paused until a payout account is verified.</Banner>}
        <div className="space-y-2">{payouts.map((p) => <Card key={p.id} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{p.id} · {p.items} payments</span><StatusBadge s={p.status === 'paid' ? 'paid' : 'scheduled'} /></div><p className="mt-1 text-xl font-extrabold">{fmtC(p.amount, p.cur)}</p><p className="text-xs text-ink-500">{p.status === 'paid' ? 'Paid' : 'Scheduled'} {p.at} → {p.bank}</p></Card>)}</div>
      </>)}
      {tab === 'statement' && (<>
        <Card pad={false} className="overflow-hidden">{payments.filter((p) => p.status !== 'refunded').map((p, i) => { const sp = feeSplit({ amount: p.amount, rate, taxRate: 18 }); return <div key={p.id} className={cx('px-4 py-3', i % 2 === 0 && 'bg-ink-50')}><div className="flex justify-between text-sm"><span className="font-bold">{p.ref}</span><StatusBadge s={p.status} /></div><div className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-2 text-[11px]"><span><span className="block text-ink-400">Gross</span><b>{fmtC(p.amount, p.cur)}</b></span><span><span className="block text-ink-400">Commission</span><b>−{fmtC(sp.commission, p.cur)}</b></span><span><span className="block text-ink-400">GST 18%</span><b>−{fmtC(sp.commissionTax, p.cur)}</b></span><span><span className="block text-ink-400">Net</span><b className="text-emerald-700">{fmtC(sp.vendorNet, p.cur)}</b></span></div></div> })}</Card>
        <p className="text-[11px] text-ink-400">Commission = rate × amount, with a minimum and a cap per category; GST applies to our fee. Rates are published on the Pricing & fees page.</p>
        <Button full variant="secondary" icon={Download} onClick={() => toast('Statement exported (CSV)')}>Export statement</Button>
      </>)}
      {tab === 'refunds' && (incoming.length || refunds.length ? refunds.map((r) => (
        <Card key={r.id} className="!p-3.5">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{r.id} · {r.ref}</span><StatusBadge s={r.status === 'requested' ? 'pending' : r.status} /></div>
          <p className="mt-1 text-lg font-extrabold">{fmtC(r.amount, r.cur)}</p><p className="text-xs text-ink-500">{r.reason} · {r.policy}</p>
          {r.status === 'requested' && <div className="mt-2 flex gap-2"><Button size="sm" className="flex-1" onClick={() => { patchRefund(r.id, (x) => ({ status: 'refunded', steps: [...x.steps, ['approved', 'Just now', 'Vendor'], ['refunded', 'Just now', 'Returned to customer']] })); toast(`Refunded ${fmtC(r.amount, r.cur)} — deducted from your next payout`) }}>Approve</Button><Button size="sm" variant="dangerSoft" className="flex-1" onClick={() => setDecl(r)}>Decline</Button></div>}
        </Card>
      )) : <EmptyState icon={Undo2} title="No refund requests" />)}
      {tab === 'bank' && (<>
        {banks.map((b) => <Card key={b.id} className="!p-3.5"><div className="flex items-center gap-3"><Landmark size={20} className="text-brand-600" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{b.bank} {b.acct}</p><p className="text-xs text-ink-500">{b.holder} · {b.ifsc}</p></div><Badge tone={b.status === 'verified' ? 'green' : 'amber'}>{b.status === 'verified' ? 'Verified' : 'Pending'}</Badge></div></Card>)}
        <Button full variant="secondary" icon={Plus} onClick={() => setBank(true)}>Add payout account</Button>
        <p className="text-xs text-ink-500">Accounts are verified by a small test deposit (penny-drop) or documents before the first transfer. The account holder must match your verified business. International vendors are paid in their own currency.</p>
      </>)}
    </Screen>
  )
}

/* ================= PRICING & FEES — public, with a live calculator (MVP) ================= */
export function Fees() {
  const nav = useNav()
  const { taxes } = useApp()
  const [amt, setAmt] = useState('10000')
  const [sc, setSc] = useState('cm1')
  const [cc, setCc] = useState('IN')
  const rule = COMMISSION0.find((c) => c.id === sc)
  const tx = taxes.find((t) => t.code === cc) || taxes[0]
  const sp = feeSplit({ amount: +amt || 0, rate: rule.rate, min: rule.min, cap: rule.cap, taxRate: tx.rate })
  return (
    <Screen title="Pricing & fees" subtitle="Who pays what — no surprises">
      <Card className="space-y-3">
        <div className="flex items-center gap-2"><PhaseTag p="MVP" /><p className="text-sm font-extrabold">At launch</p></div>
        <KV rows={[['Customers', <b className="text-emerald-700">Free — no platform fee</b>], ['Booking / quote payment', 'Direct to the vendor'], ['Vendors', 'Monthly or yearly subscription'], ['Sponsored visibility', 'Optional, sold separately, always labelled'], ['Commission', 'None']]} />
        <Button size="sm" variant="secondary" onClick={() => nav.go('v_plans')}>See subscription plans</Button>
      </Card>
      <Card className="space-y-2.5">
        <div className="flex items-center gap-2"><PhaseTag p="P2" /><p className="text-sm font-extrabold">When platform payments launch</p></div>
        {['Customers still pay no platform fee. Taxes are included in the vendor’s price.', 'Vendors pay a commission only on payments made through VendorVerse — a percentage with a minimum and a cap, by category.', 'Commission is taken from the vendor’s payout; it’s never added to the customer’s price.', 'Currency conversion (cross-border) shows a 1.5% margin up-front.', 'Refunds follow the booking’s cancellation policy. Unused subscription time isn’t refunded except for duplicate charges, billing errors or law.'].map((x) => <p key={x} className="flex gap-2 text-[13px] text-ink-700"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />{x}</p>)}
      </Card>
      <Section title="Fee calculator (Phase 2 preview)">
        <Card className="space-y-3">
          <Input label="Payment amount (₹)" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} />
          <Select label="Category" value={sc} onChange={(e) => setSc(e.target.value)} options={COMMISSION0.map((c) => ({ value: c.id, label: `${c.scope} — ${c.rate}%` }))} />
          <Select label="Vendor’s country (tax on our fee)" value={cc} onChange={(e) => setCc(e.target.value)} options={taxes.map((t) => ({ value: t.code, label: `${t.name} — ${t.label} ${t.rate}%` }))} />
          <Breakdown rows={[['Customer pays', sp.customerPays], ['Platform fee charged to customer', 0], [`Commission (${rule.rate}%, min ${fmtC(rule.min)}, cap ${fmtC(rule.cap)})`, -sp.commission], [`${tx.label} on commission (${tx.rate}%)`, -sp.commissionTax]]} total={sp.vendorNet} totalLabel="Vendor receives" note={`Effective cost to the vendor: ${sp.effective.toFixed(1)}% of the payment. Illustrative — rates are configured by Super Admin (CFG-01/02) and versioned.`} />
        </Card>
      </Section>
    </Screen>
  )
}

/* ================= ADMIN: REVENUE, COMMISSION, TAX, REFUNDS ================= */
export function AdminCommission() {
  const { commission, setCommission, payments, payouts, vendors, refunds, taxes, setTaxes, invoices, toast, addAudit, me } = useApp()
  const [tab, setTab] = useState('revenue')
  const [rules, setRules] = useState(commission)
  const [tx, setTx] = useState(taxes)
  const [sheet, setSheet] = useState(null)
  const subRev = vendors.reduce((s, v) => s + ({ Starter: 499, Growth: 1499, Pro: 3999 }[v.sub.plan] || 0) * (['active', 'grace', 'cancelled'].includes(v.sub.status) ? 1 : 0), 0)
  const gstCollected = Math.round(subRev * 0.18)
  const set = (i, k, val) => setRules(rules.map((r, j) => (j === i ? { ...r, [k]: val } : r)))
  return (
    <Screen title="Revenue & commission" overlay={sheet && <ReasonSheet open onClose={() => setSheet(null)} title={sheet === 'tax' ? 'Save tax rates' : 'Save commission rules'} reasons={['Rollout of a new region', 'Pricing review', 'Tax rate change', 'Correction']} confirmLabel="Save" onConfirm={(r) => { if (sheet === 'tax') setTaxes(tx); else setCommission(rules); addAudit(sheet === 'tax' ? 'Changed tax rates' : 'Changed commission rules', sheet === 'tax' ? 'Tax' : 'Commission', 'config', r, me.name); setSheet(null); toast('Saved — applies to new invoices and payments only') }} />}>
      <Chips value={tab} onChange={setTab} options={[['revenue', 'Revenue'], ['rules', 'Commission'], ['tax', 'Tax'], ['payouts', 'Payouts'], ['refunds', 'Refunds']].map(([id, label]) => ({ id, label }))} />
      {tab === 'revenue' && (<>
        <div className="grid grid-cols-2 gap-3"><Stat label="Subscriptions / mo" value={fmtC(subRev)} icon={CreditCard} tone="emerald" delta="+9%" /><Stat label="GST collected / mo" value={fmtC(gstCollected)} icon={Receipt} tone="sky" /><Stat label="Sponsored / mo" value={fmtC(18600)} icon={TrendingUp} tone="amber" delta="+14%" /><Stat label="Invoices issued" value={invoices.length} icon={FileText} tone="violet" /></div>
        <div className="flex items-center gap-2"><PhaseTag p="MVP" /><span className="text-xs text-ink-500">Subscription + sponsored are the only platform revenue at launch</span></div>
        <PhaseBanner p="P2" title="Commission & payment fees" />
        <div className="grid grid-cols-2 gap-3"><Stat label="GMV in escrow" value={fmtC(payments.filter((p) => p.status === 'held').reduce((s, p) => s + p.amount, 0))} icon={Lock} tone="violet" /><Stat label="Commission (est.)" value={fmtC(payments.reduce((s, p) => s + p.fee, 0))} icon={Percent} tone="sky" /></div>
        <Card><p className="mb-3 text-sm font-bold">Revenue mix (projected at scale)</p><div className="space-y-3"><HBar label="Subscriptions" value={46} max={100} right="46%" /><HBar label="Commission" value={38} max={100} right="38%" color="bg-sky-500" /><HBar label="Sponsored visibility" value={16} max={100} right="16%" color="bg-amber-500" /></div></Card>
      </>)}
      {tab === 'rules' && (<>
        <PhaseBanner p="P2" title="Commission rules by category & region" />
        {rules.map((r, i) => <Card key={r.id} className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">{r.scope}</p><Pill icon={Globe}>{r.region}</Pill></div><div className="grid grid-cols-3 gap-3"><Input label="Rate %" inputMode="decimal" value={String(r.rate)} onChange={(e) => set(i, 'rate', e.target.value.replace(/[^\d.]/g, ''))} /><Input label="Min fee" inputMode="numeric" value={String(r.min)} onChange={(e) => set(i, 'min', e.target.value.replace(/\D/g, ''))} /><Input label="Cap" inputMode="numeric" value={String(r.cap)} onChange={(e) => set(i, 'cap', e.target.value.replace(/\D/g, ''))} /></div><p className="text-xs text-ink-500">Example on ₹10,000: vendor pays {fmtC(feeSplit({ amount: 10000, rate: +r.rate || 0, min: +r.min || 0, cap: +r.cap || 1e9 }).commission)} + tax.</p></Card>)}
        <Button full size="lg" onClick={() => setSheet('rules')}>Save rules</Button>
      </>)}
      {tab === 'tax' && (<>
        <Banner tone="blue" title="Tax on platform charges">Applied to subscriptions, sponsored visibility and (Phase 2) commission. Vendors’ own taxes appear on their invoices.</Banner>
        {tx.map((t, i) => <Card key={t.code} className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">{t.name}</p><Pill>{t.label}</Pill></div><Input label="Rate %" inputMode="decimal" value={String(t.rate)} onChange={(e) => setTx(tx.map((x, j) => (j === i ? { ...x, rate: +e.target.value.replace(/[^\d.]/g, '') || 0 } : x)))} />{t.note && <p className="text-xs text-ink-500">{t.note}</p>}</Card>)}
        <Button full size="lg" onClick={() => setSheet('tax')}>Save tax rates</Button>
      </>)}
      {tab === 'payouts' && (<>
        <PhaseBanner p="P2" title="Payout queue" />
        {payouts.map((p) => <Card key={p.id} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{p.id}</span><StatusBadge s={p.status === 'paid' ? 'paid' : 'scheduled'} /></div><p className="mt-1 text-lg font-extrabold">{fmtC(p.amount, p.cur)}</p><p className="text-xs text-ink-500">{p.items} payments · {p.bank}</p>{p.status === 'scheduled' && <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" className="flex-1" onClick={() => toast('Payout placed on hold — reason required in production')}>Hold</Button><Button size="sm" className="flex-1" onClick={() => toast('Released to bank')}>Release now</Button></div>}</Card>)}
        <Banner tone="blue" title="Controls">Holds apply for disputes, fraud review and unverified bank accounts. Billing operators can’t change trust state; trust staff can’t release funds.</Banner>
      </>)}
      {tab === 'refunds' && (<>
        <PhaseBanner p="P2" title="Refunds & disputes" />
        {refunds.map((r) => <Card key={r.id} className="!p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{r.id} · {r.ref}</span><StatusBadge s={r.status === 'refunded' ? 'refunded' : r.status === 'requested' ? 'pending' : r.status} /></div><p className="mt-1 text-sm font-bold">{r.vendor}</p><p className="text-lg font-extrabold">{fmtC(r.amount, r.cur)}</p><p className="text-xs text-ink-500">{r.reason} · {r.policy}</p></Card>)}
        <Banner tone="blue" title="Policy">Escrowed funds refund instantly under the cancellation policy. Released funds are the vendor’s to refund; support facilitates and can enforce platform policy but never refunds from its own funds.</Banner>
      </>)}
    </Screen>
  )
}

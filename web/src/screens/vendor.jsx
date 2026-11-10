import { UsageMeter } from './p1-depth.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Package, CalendarCheck, FileText, IndianRupee, Plus, AlertTriangle, ChevronRight, Store, ShieldCheck, Clock, MessageCircle, Truck, Check, X, Briefcase,
  Upload, Wallet, BarChart3, Star, Settings, LogOut, MapPin, Boxes, CalendarClock, Crown, Download, Trash2, ImagePlus, Phone, TrendingUp, BadgeCheck, Minus, Info,
  LayoutDashboard, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { CATS, cat, listing as findListing, calcPrice, VENDOR_TX, PAYOUTS, SLOTS, ME } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Rating, Banner, EmptyState, Stat, KV, fmt, cx,
  Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar, DocTile, Stepper, BarChart, HBar, Spark, Checkbox, Meta, SOFT, DemoPhonePePayment,
} from '../ui.jsx'
import { NotifBell } from './shared.jsx'

export const useMyVendor = () => {
  const { me, vendors } = useApp()
  return vendors.find((v) => v.id === me.vendorId) || null
}

const VENDOR_NAV = [
  [LayoutDashboard, 'Dashboard', 'v_dash'], [Store, 'Supplier shop', 'v_explore'], [FileText, 'Quote requests', 'v_work'],
  [Package, 'Listings', 'v_listings'], [MessageCircle, 'Messages', 'messages'],
  [BarChart3, 'Analytics', 'v_perf'], [Store, 'More', 'v_more'],
  [Settings, 'Business profile', 'v_profile'], [Star, 'Reviews', 'v_reviews'], [ShieldCheck, 'Verification', 'v_verify'],
]

function VendorSidebar({ active, vendor, collapsed, onToggle }) {
  const nav = useNav()
  const { setMe, me } = useApp()
  const businessSupplier = me.role === 'business'
  const logout = () => {
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' })
    nav.reset('c_home')
  }
  return (
    <aside className="vv-vendor-sidebar">
      <div className="vv-vendor-brand"><span className="vv-vendor-mark">V</span><span className="vv-vendor-brand-name">VendorVerse</span></div>
      <button type="button" className="vv-sidebar-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={onToggle}>
        {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}<span className="vv-sidebar-label">{collapsed ? 'Expand menu' : 'Collapse menu'}</span>
      </button>
      <nav className="vv-vendor-nav" aria-label={businessSupplier ? 'Business supplier workspace' : 'Vendor workspace'}>
        {VENDOR_NAV.map(([I, label, id]) => <button type="button" key={id} title={collapsed ? label : undefined} aria-current={active === id ? 'page' : undefined} className={cx('vv-vendor-nav-item', active === id && 'is-active')} onClick={() => nav.go(id)}><I size={19} /><span className="vv-sidebar-label">{businessSupplier && label === 'Quote requests' ? 'Vendor RFQs' : businessSupplier && label === 'Customer reviews' ? 'Buyer reviews' : label}</span></button>)}
      </nav>
      <div className="vv-sidebar-business"><Thumb tone={vendor?.tone || 'teal'} icon={vendor ? cat(vendor.cat).icon : Store} size={38} round="rounded-xl" /><div className="vv-sidebar-label vv-business-copy"><b>{businessSupplier ? me.businessName || 'Business / Company' : vendor?.name || 'Your business'}</b><small>{businessSupplier ? 'Supplier workspace' : vendor?.status === 'approved' ? 'Verified vendor' : 'Vendor workspace'}</small></div></div>
      <button type="button" className="vv-vendor-nav-item vv-sidebar-logout" title={collapsed ? 'Log out' : undefined} onClick={logout}><LogOut size={19} /><span className="vv-sidebar-label">Log out</span></button>
    </aside>
  )
}

function VendorWorkspace({ children }) {
  const nav = useNav()
  const vendor = useMyVendor()
  const [collapsed, setCollapsed] = useState(false)
  return <div className={cx('vv-vendor-dashboard vv-vendor-workspace', collapsed && 'is-collapsed')}><VendorSidebar active={nav.id} vendor={vendor} collapsed={collapsed} onToggle={() => setCollapsed((x) => !x)} /><main className="vv-vendor-content vv-vendor-workspace-content">{children}</main></div>
}

/* ================= BUSINESS SUPPLIER ONBOARDING ================= */
export function BusinessOnboarding() {
  const nav = useNav()
  const { me, vendors, setMe, notify, toast } = useApp()
  const v = vendors.find((x) => x.id === me.vendorId)
  const [step, setStep] = useState(0)
  const [source, setSource] = useState('vendor')
  const [consent, setConsent] = useState(false)
  const [errs, setErrs] = useState({})
  const [f, setF] = useState({ name: me.businessName || v?.name || '', type: 'manufacturer_supplier', cat: v?.cat || 'build', gstin: v?.gstin || '', email: v?.email || '', phone: v?.phone || '', areas: v?.areas || ['Jaipur'], moq: '', lead: '', certifications: '' })
  const update = (key) => (event) => { setF({ ...f, [key]: event?.target ? event.target.value : event }); setErrs({ ...errs, [key]: '' }) }
  const chooseSource = (value) => {
    setSource(value)
    if (value === 'vendor') setF({ ...f, name: v?.name || f.name, gstin: v?.gstin || f.gstin, email: v?.email || f.email, phone: v?.phone || f.phone, areas: v?.areas || f.areas })
  }
  const next = () => {
    const e = {}
    if (step === 0) { if (f.name.trim().length < 3) e.name = 'Enter a business/company name'; if (!f.cat) e.cat = 'Select a primary category' }
    if (step === 1) { if (!f.areas.length) e.areas = 'Select at least one delivery area'; if (!f.lead.trim()) e.lead = 'Enter an indicative lead time' }
    if (step === 2) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid business email'; if (!consent) e.consent = 'Confirm the supplier details before continuing' }
    setErrs(e)
    if (Object.keys(e).length) return
    if (step < 2) return setStep(step + 1)
    setMe({ ...me, role: 'business', businessWorkspace: true, businessName: f.name.trim(), businessSetup: { ...f, detailSource: source, createdAt: new Date().toISOString() }, vendorOwnerName: me.vendorOwnerName || me.name, name: f.name.trim(), buyerMode: false })
    notify('admin', 'Business supplier workspace created', `${f.name.trim()} is ready to receive vendor RFQs.`, 'onboarding')
    toast('Business supplier workspace created')
    nav.reset('v_dash')
  }
  return (
    <VendorWorkspace>
      <Screen title="Business supplier onboarding" subtitle={`Step ${step + 1} of 3`} back={step > 0} footer={<div className="flex gap-2">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="flex-1" size="lg" onClick={next}>{step === 2 ? 'Create business workspace' : 'Continue'}</Button></div>}>
        <Stepper steps={['Business details', 'Supplier coverage', 'Verification']} current={step} />
        {step === 0 && <div className="space-y-4"><Select label="Select details source" value={source} onChange={(e) => chooseSource(e.target.value)} options={[{ value: 'vendor', label: 'Use details from my vendor profile' }, { value: 'manual', label: 'Enter business details manually' }]} /><Banner tone="blue">Your vendor profile details are used only to prefill this form. You can edit the business details before creating the workspace.</Banner><Input label="Business / company name" required value={f.name} onChange={update('name')} error={errs.name} /><Segmented value={f.type} onChange={update('type')} options={[{ id: 'manufacturer_supplier', label: 'Manufacturer / supplier' }, { id: 'service_provider', label: 'Service provider' }]} /><Select label="Primary supplier category" value={f.cat} onChange={update('cat')} options={CATS.map((c) => ({ value: c.id, label: c.name }))} />{errs.cat && <p className="text-xs font-medium text-red-600">{errs.cat}</p>}</div>}
        {step === 1 && <div className="space-y-4"><div><p className="mb-2 text-[13px] font-semibold text-ink-700">Delivery / service coverage</p><Chips scroll={false} multi value={f.areas} onChange={(areas) => { setF({ ...f, areas }); setErrs({ ...errs, areas: '' }) }} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar', 'Jodhpur', 'Kota', 'North India', 'International']} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div><div className="flex gap-3"><Input label="MOQ / minimum batch (optional)" placeholder="e.g. 20 units" value={f.moq} onChange={update('moq')} /><Input label="Typical lead time" required placeholder="e.g. 7 days" value={f.lead} onChange={update('lead')} error={errs.lead} /></div><Input label="Certifications / capabilities" textarea rows={3} placeholder="ISO, GST, product certifications, installation or delivery capabilities" value={f.certifications} onChange={update('certifications')} /></div>}
        {step === 2 && <div className="space-y-4"><Input label="GSTIN / registration number" value={f.gstin} onChange={update('gstin')} /><Input label="Business email" required type="email" value={f.email} onChange={update('email')} error={errs.email} /><Input label="Business phone" value={f.phone} onChange={update('phone')} /><Card><Checkbox checked={consent} onChange={(value) => { setConsent(value); setErrs({ ...errs, consent: '' }) }}>I confirm these supplier details are accurate and can be shared with vendor buyers for RFQs and purchase orders.</Checkbox>{errs.consent && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.consent}</p>}</Card><Banner tone="amber" title="Supplier workspace demo">Your verified vendor identity remains the account owner. This creates a separate supplier workspace view for receiving vendor procurement requests.</Banner></div>}
      </Screen>
    </VendorWorkspace>
  )
}

/* ================= DASHBOARD ================= */

/* ================= REGISTRATION WIZARD ================= */
const DOCS = ['GST Registration Certificate', 'PAN Card', 'Shop & Establishment Licence', 'Cancelled Cheque / Bank Proof']
const VERIFICATION_LEVEL_OPTIONS = ['L1', 'L2', 'L3'].map((level) => ({ value: level, label: level }))

async function loadRemoteVerification(vendorId) {
  const [documents, verifications] = await Promise.all([
    authService.listVendorDocuments(vendorId),
    authService.listVendorVerifications(vendorId),
  ])
  if (!documents.ok) return documents
  if (!verifications.ok) return verifications
  return { ok: true, documents: documents.documents, verifications: verifications.verifications }
}

function RemoteVendorVerification({ vendor }) {
  const [documents, setDocuments] = useState([])
  const [verifications, setVerifications] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [level, setLevel] = useState('L1')
  const [documentType, setDocumentType] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    const result = await loadRemoteVerification(vendor.id)
    if (!result.ok) { setError(result.message); return false }
    setDocuments(result.documents)
    setVerifications(result.verifications)
    setError('')
    return true
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loadRemoteVerification(vendor.id).then((result) => {
      if (!active) return
      if (!result.ok) setError(result.message)
      else { setDocuments(result.documents); setVerifications(result.verifications); setError('') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [vendor.id])

  const registerFile = async (file) => {
    const result = await authService.registerVendorDocument(vendor.id, { fileId: file.fileId, documentType: file.documentType })
    if (!result.ok) { setError(result.message); return false }
    setPendingFiles((items) => items.filter((item) => item.fileId !== file.fileId))
    await refresh()
    return true
  }

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    const result = await authService.uploadVendorEvidence(file)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    const pending = { fileId: result.file.id, fileName: file.name, documentType: documentType.trim() || file.name }
    if (result.file.scanStatus === 'clean') await registerFile(pending)
    else if (['infected', 'failed'].includes(result.file.scanStatus)) setError('The evidence file did not pass the security scan. Choose a different file.')
    else setPendingFiles((items) => [...items, pending])
  }

  const checkScan = async (file) => {
    setBusy(true); setError('')
    const result = await authService.getFile(file.fileId)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    if (result.file.scanStatus === 'clean') await registerFile(file)
    else if (['infected', 'failed'].includes(result.file.scanStatus)) {
      setPendingFiles((items) => items.filter((item) => item.fileId !== file.fileId))
      setError('The evidence file did not pass the security scan. Choose a different file.')
    } else setError('The security scan is still in progress. Check again later.')
  }

  const submit = async () => {
    setBusy(true); setError('')
    const result = await authService.submitVendorVerification(vendor.id, { level, documentIds: documents.map((document) => document.id) })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    await refresh()
  }

  const latest = verifications[0]
  const statusLabels = { submitted: 'Submitted — awaiting review', in_review: 'In review', info_requested: 'More information requested', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', revoked: 'Revoked' }

  return (
    <Screen title="Verification" footer={<Button full size="lg" disabled={busy || loading} onClick={submit}>Submit {level} for review</Button>}>
      <Banner tone="blue">Upload evidence below, then submit an L1–L3 verification request. Files are attached only after the security scan passes.</Banner>
      {error && <Banner tone="red" title="Verification request failed">{error}</Banner>}
      <Card><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-ink-400">Current status</p><p className="mt-1 text-sm font-bold">{latest ? statusLabels[latest.status] || latest.status : 'Not submitted'}</p></div>{latest && <Badge tone={latest.status === 'approved' ? 'green' : latest.status === 'rejected' || latest.status === 'revoked' ? 'red' : latest.status === 'info_requested' ? 'amber' : 'blue'}>{latest.level}</Badge>}</div>{latest?.reason && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{latest.reason}</p>}{latest?.expiresAt && <p className="mt-2 text-xs text-ink-500">Expires {new Date(latest.expiresAt).toLocaleDateString()}</p>}</Card>
      <Section title="Evidence documents">
        <Input label="Evidence label" value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="e.g. Business registration" />
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-4 text-sm font-semibold text-brand-700">
          <Upload size={17} />{busy ? 'Uploading or checking scan…' : 'Choose evidence file'}
          <input type="file" className="sr-only" disabled={busy} onChange={upload} />
        </label>
        {pendingFiles.map((file) => <Card key={file.fileId} className="mt-2 !p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.fileName}</p><p className="text-xs text-ink-500">Security scan pending</p></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => checkScan(file)}>Check</Button></div></Card>)}
        {loading && <p className="mt-3 text-sm text-ink-500">Loading verification records…</p>}
        {!loading && documents.length === 0 && <p className="mt-3 text-sm text-ink-500">No evidence documents registered yet.</p>}
        <div className="mt-3 space-y-2">{documents.map((document) => <Card key={document.id} className="!p-3"><p className="text-sm font-semibold">{document.documentType}</p><p className="mt-1 text-xs text-ink-500">Uploaded {new Date(document.submittedAt).toLocaleString()}</p></Card>)}</div>
      </Section>
      <Select label="Verification level" value={level} onChange={(event) => setLevel(event.target.value)} options={VERIFICATION_LEVEL_OPTIONS} />
      <Section title="Submission history">
        {verifications.length === 0 && <p className="text-sm text-ink-500">No verification requests yet.</p>}
        <div className="space-y-2">{verifications.map((verification) => <Card key={verification.id} className="!p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{verification.level} · {statusLabels[verification.status] || verification.status}</p><Badge tone="gray">{new Date(verification.submittedAt).toLocaleDateString()}</Badge></div>{verification.reason && <p className="mt-2 text-sm text-ink-600">{verification.reason}</p>}</Card>)}</div>
      </Section>
    </Screen>
  )
}

export function VendorRegister({ params = {} }) {
  const nav = useNav()
  const { me, setMe, vendors, setVendors, notify, toast, stamp } = useApp()
  const existing = me.role === 'vendor' ? vendors.find((v) => v.id === me.vendorId) : null
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ name: params.name || me.biz || existing?.name || '', owner: me.name || '', vendorType: params.vendorType || existing?.vendorType || 'service_provider', cat: params.cat || 'elec', gstin: '', pan: '', email: '', years: '2020', areas: ['Jaipur'], branches: ['Main outlet — Jaipur'], certifications: '' })
  const [br, setBr] = useState('')
  const [docs, setDocs] = useState({})
  const [consent, setConsent] = useState(false)
  const [errs, setErrs] = useState({})
  const [paying, setPaying] = useState(null)
  const [paidPlan, setPaidPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const created = useRef(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const validate = () => {
    const e = {}
    if (step === 0) {
      if (f.name.trim().length < 3) e.name = 'Enter your business name'
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.toUpperCase())) e.gstin = 'Enter a valid 15-character GSTIN (e.g. 08ABCPS1234F1Z5)'
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan.toUpperCase())) e.pan = 'Enter a valid PAN (e.g. ABCPS1234F)'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid business email'
    }
    if (step === 1) { if (!f.areas.length) e.areas = 'Select at least one service area'; if (!f.branches.length) e.branches = 'Add at least one branch / outlet' }
    if (step === 2 && !authService.isRemote) { const miss = DOCS.filter((d) => !docs[d]); if (miss.length) e.docs = `${miss.length} required document${miss.length > 1 ? 's' : ''} missing` }
    if (step === 3 && !consent) e.consent = 'Please confirm to submit'
    setErrs(e)
    return Object.keys(e).length === 0
  }
  const next = async () => {
    if (!validate()) return
    if (step < 3) return setStep(step + 1)
    let vendorId = 'v-new'
    if (authService.isRemote && !created.current) {
      setBusy(true)
      const businessType = params.businessType || (f.vendorType === 'manufacturer_supplier' ? 'MANUFACTURER' : 'SERVICE_PROVIDER')
      const result = await authService.createVendor({ registrationCountry: params.country || 'IN', businessType, legalName: f.name.trim() })
      setBusy(false)
      if (!result.ok) return toast(result.message, 'warn')
      if (!result.vendor?.id) return toast('Vendor was created without an ID; reload and contact support before continuing.', 'warn')
      vendorId = result.vendor.id
      created.current = true
    }
    const rec = { id: vendorId, name: f.name, owner: f.owner, vendorType: f.vendorType, cat: f.cat, city: f.areas[0], areas: f.areas, branches: f.branches.length, rating: 0, reviews: 0, status: authService.isRemote ? 'pending' : 'submitted', tone: cat(f.cat).tone, since: +f.years, gstin: f.gstin.toUpperCase(), phone: me.phone || '+91 98290 00099', email: f.email, plan: 'Starter', certifications: f.certifications, docs: authService.isRemote ? [] : DOCS.map((d) => ({ name: d, status: 'pending' })), history: authService.isRemote ? [] : [{ s: 'submitted', at: stamp(), by: f.owner }] }
    setVendors((vs) => [rec, ...vs.filter((x) => x.id !== vendorId && x.id !== 'v-new')])
    const fromCustomer = me.role === 'customer'
    setMe({ ...me, role: fromCustomer ? 'vendor' : me.role, loggedIn: true, guest: false, vendorId, vendorName: f.name, customerName: fromCustomer ? me.name : me.customerName, hasVendorAccount: true, buyerMode: false })
    if (authService.isRemote) toast('Vendor profile created — upload evidence and submit verification')
    else { notify('admin', 'Vendor awaiting review', `${f.name} submitted for verification.`, 'onboarding'); toast('Submitted for verification') }
    nav.reset(fromCustomer ? 'v_dash' : 'v_verify')
  }
  return (
    <Screen title="Vendor registration" subtitle={`Step ${step + 1} of 4`} back={step > 0} right={step === 0 ? null : null} footer={<div className="flex gap-2">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="flex-1" size="lg" disabled={busy} onClick={next}>{busy ? 'Creating profile…' : step === 3 ? authService.isRemote ? 'Create vendor profile' : 'Submit for verification' : 'Continue'}</Button></div>}>
      <Stepper steps={['Business', 'Locations', 'Documents', 'Review']} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <Input label="Business name" required value={f.name} onChange={set('name')} error={errs.name} />
          <Input label="Owner / authorised person" value={f.owner} onChange={set('owner')} />
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Vendor type</p><Segmented value={f.vendorType} onChange={set('vendorType')} options={[{ id: 'service_provider', label: 'Service provider' }, { id: 'manufacturer_supplier', label: 'Manufacturer / supplier' }]} /><p className="mt-1.5 text-xs text-ink-500">This changes the evidence and catalogue journey shown after approval.</p></div>
          <Select label="Primary category" value={f.cat} onChange={set('cat')} options={CATS.map((c) => ({ value: c.id, label: c.name }))} />
          <Input label="GSTIN" required placeholder="08ABCPS1234F1Z5" maxLength={15} value={f.gstin} onChange={(e) => set('gstin')(e.target.value.toUpperCase())} error={errs.gstin} />
          <Input label="PAN" required placeholder="ABCPS1234F" maxLength={10} value={f.pan} onChange={(e) => set('pan')(e.target.value.toUpperCase())} error={errs.pan} />
          <Input label="Business email" required type="email" value={f.email} onChange={set('email')} error={errs.email} />
          <Input label={f.vendorType === 'manufacturer_supplier' ? 'Product certifications / standards' : 'Service licences / certifications'} value={f.certifications} onChange={set('certifications')} placeholder={f.vendorType === 'manufacturer_supplier' ? 'e.g. ISO, BIS, export certificates' : 'e.g. trade licence, safety certification'} />
          <Select label="Operating since" value={f.years} onChange={set('years')} options={Array.from({ length: 15 }, (_, i) => String(2026 - i))} />
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service areas</p><Chips scroll={false} multi value={f.areas} onChange={set('areas')} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar', 'Jodhpur', 'Kota']} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Branches / outlets</p>
            <div className="space-y-2">{f.branches.map((b) => <div key={b} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><MapPin size={17} className="text-brand-600" /><span className="flex-1 text-sm font-medium">{b}</span><button aria-label="Remove" onClick={() => setF({ ...f, branches: f.branches.filter((x) => x !== b) })}><X size={17} className="text-ink-400" /></button></div>)}</div>
            <div className="mt-2 flex gap-2"><input value={br} onChange={(e) => setBr(e.target.value)} placeholder="Add branch address" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (br.trim()) { setF({ ...f, branches: [...f.branches, br.trim()] }); setBr('') } }}>Add</Button></div>
            {errs.branches && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.branches}</p>}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          {authService.isRemote
            ? <Banner tone="blue">Evidence files are uploaded from the verification screen after your vendor profile is created. No evidence is submitted in this mock registration step.</Banner>
            : <><Banner tone="blue">Upload clear PDF or photo copies. Documents are stored securely and visible only to verification staff.</Banner>
              {DOCS.map((d) => <DocTile key={d} name={d} status={docs[d] ? 'pending' : 'missing'} onAction={() => setDocs({ ...docs, [d]: !docs[d] })} actionLabel={docs[d] ? 'Remove' : 'Upload'} note={docs[d] ? 'Uploaded · awaiting review' : 'Required'} />)}
              {errs.docs && <p className="text-xs font-medium text-red-600">{errs.docs}</p>}</>}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <Card><KV rows={ [['Business', f.name], ['Vendor type', f.vendorType === 'manufacturer_supplier' ? 'Manufacturer / supplier' : 'Service provider'], ['Category', cat(f.cat).name], ['GSTIN', f.gstin.toUpperCase()], ['PAN', f.pan.toUpperCase()], ['Coverage', f.areas.join(', ')], ['Branches', f.branches.length], ['Certifications', f.certifications || 'To be reviewed'], ['Documents', authService.isRemote ? 'Upload from verification after profile creation' : `${Object.values(docs).filter(Boolean).length}/4 uploaded`]]} /></Card>
          <Banner tone="amber" title="What happens next">Super Admin reviews your application and will approve, reject with a reason, or request more information. You will not be shown as Verified until approved.</Banner>
          <div><Checkbox checked={consent} onChange={(v) => { setConsent(v); setErrs({}) }}>I confirm the details are accurate and consent to VendorVerse verifying my documents.</Checkbox>{errs.consent && <p className="mt-1 text-xs font-medium text-red-600">{errs.consent}</p>}</div>
        </div>
      )}
    </Screen>
  )
}

/* ================= VERIFICATION STATUS ================= */
export function VendorVerify() {
  const nav = useNav()
  const v = useMyVendor()
  const { patchVendor, notify, toast, stamp, settings } = useApp()
  const [fixed, setFixed] = useState({})
  const [paying, setPaying] = useState(null)
  const [paidPlan, setPaidPlan] = useState(null)
  if (!v) return <VendorWorkspace><Screen title="Verification"><EmptyState icon={ShieldCheck} title="No application yet" action={<Button onClick={() => nav.go('v_register')}>Start registration</Button>} /></Screen></VendorWorkspace>
  if (authService.isRemote) return <VendorWorkspace><RemoteVendorVerification vendor={v} /></VendorWorkspace>
  const meta = {
    submitted: ['blue', 'Under review', 'We usually respond within 1–2 business days.'],
    info: ['amber', 'More information needed', 'Please correct the items below and resubmit.'],
    rejected: ['red', 'Application rejected', 'You can correct the issues and resubmit.'],
    approved: ['green', 'Verified vendor', 'Your business is shown as Verified to customers.'],
    suspended: ['red', 'Account suspended', 'Contact support for assistance.'],
  }[v.status] || ['gray', v.status, '']
  const last = v.history[v.history.length - 1]
  const needsFix = ['info', 'rejected'].includes(v.status)
  const resubmit = () => {
    patchVendor(v.id, (x) => ({ status: 'submitted', docs: x.docs.map((d) => (fixed[d.name] ? { ...d, status: 'pending', note: undefined } : d)), history: [...x.history, { s: 'submitted', at: stamp(), by: x.owner, note: 'Corrected and resubmitted' }] }))
    notify('admin', 'Vendor resubmitted', `${v.name} corrected their application.`, 'onboarding')
    toast('Resubmitted for review')
  }
  const bad = v.docs.filter((d) => ['rejected', 'missing'].includes(d.status))
  return (
    <VendorWorkspace>
    <Screen title="Verification" footer={needsFix ? <Button full size="lg" disabled={bad.some((d) => !fixed[d.name])} onClick={resubmit}>Resubmit for review</Button> : null}>
      <DemoPhonePePayment open={!!paying} amount={paying?.price} title={`${paying?.name || ''} subscription`} onClose={() => setPaying(null)} onSuccess={() => { patchVendor(v.id, { plan: paying.name }); setPaidPlan(paying); setPaying(null) }} />
      <div className="vv-vendor-verify-body">
      <Card className={cx('!p-5 text-center', { green: 'bg-emerald-50', blue: 'bg-sky-50', amber: 'bg-amber-50', red: 'bg-red-50' }[meta[0]])}>
        <div className={cx('mx-auto grid size-16 place-items-center rounded-full bg-white shadow', { green: 'text-emerald-600', blue: 'text-sky-600', amber: 'text-amber-600', red: 'text-red-600' }[meta[0]])}>{v.status === 'approved' ? <BadgeCheck size={36} /> : v.status === 'submitted' ? <Clock size={34} /> : <AlertTriangle size={34} />}</div>
        <h2 className="mt-3 text-lg font-extrabold">{meta[1]}</h2>
        <p className="mt-1 text-sm text-ink-600">{meta[2]}</p>
        {needsFix && last?.note && <div className="mt-3 rounded-xl bg-white p-3 text-left text-sm"><p className="text-xs font-bold uppercase text-ink-400">Reviewer note</p><p className="mt-0.5 font-medium text-ink-800">{last.note}</p></div>}
      </Card>
      <Section title="Documents">
        <div className="space-y-2">
          {v.docs.map((d) => {
            const fix = ['rejected', 'missing'].includes(d.status)
            return <DocTile key={d.name} name={d.name} status={fixed[d.name] ? 'pending' : d.status} note={fixed[d.name] ? 'New file uploaded' : d.note} onAction={fix && needsFix ? () => setFixed({ ...fixed, [d.name]: !fixed[d.name] }) : undefined} actionLabel={fixed[d.name] ? 'Undo' : 'Re-upload'} />
          })}
        </div>
      </Section>
      <Section title="Status history"><Card><Timeline steps={v.history.map((h, i) => ({ label: { submitted: 'Submitted for review', info: 'More information requested', approved: 'Approved', rejected: 'Rejected' }[h.s] || h.s, at: `${h.at} · ${h.by}`, note: h.note, done: i < v.history.length - 1 || h.s === 'approved', current: i === v.history.length - 1 && h.s !== 'approved' }))} /></Card></Section>
      <Section title="Subscription plans"><div className="grid gap-3">{settings.plans.map((p) => <Card key={p.id} className={cx('relative overflow-hidden', p.name === 'Growth' && 'ring-2 ring-brand-500')}><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-extrabold">{p.name}</p><p className="mt-1 text-sm font-bold text-amber-700">Price open (CFG-02) · sample values</p></div>{p.name === 'Growth' && <Badge tone="teal">Popular</Badge>}</div><p className="mt-3 text-sm text-ink-500">{p.listings} listings · {p.leads} enquiries/month</p><Button full className="mt-4" variant={v.plan === p.name ? 'secondary' : 'primary'} disabled={v.plan === p.name} onClick={() => nav.go('v_checkout', { plan: p.name })}>{v.plan === p.name ? 'Current plan' : `Choose ${p.name}`}</Button></Card>)}</div></Section>
      {paying && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm !p-0 overflow-hidden"><div className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-700">Secure checkout demo</p><p className="mt-1 text-xl font-black">{paying.name} plan</p></div><button aria-label="Close payment" onClick={() => setPaying(null)}><X /></button></div><div className="my-5 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-600 p-5 text-white"><p className="text-sm text-white/70">VendorVerse subscription</p><p className="mt-2 text-3xl font-black">₹{paying.price}<span className="text-sm font-semibold text-white/70"> / month</span></p><p className="mt-4 text-xs text-white/70">Demo payment · no real money is charged</p></div><Button full disabled={paying.loading} onClick={() => { setPaying({ ...paying, loading: true }); setTimeout(() => { setPaidPlan(paying); setPaying(null) }, 1600) }}>{paying.loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing payment…</> : <><Wallet size={17} /> Pay securely with PhonePe</>}</Button><p className="mt-3 text-center text-[11px] text-ink-400">UPI · Cards · Net banking</p></div></Card></div>}
      </div>
      {paidPlan && <div className="fixed inset-0 z-[51] grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm text-center"><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={40} strokeWidth={3} /></div><p className="mt-5 text-2xl font-black">Payment successful</p><p className="mt-2 text-sm text-ink-500">Your {paidPlan.name} subscription is active.</p><p className="mt-5 rounded-xl bg-ink-50 p-3 text-sm font-bold">₹{paidPlan.price} · Demo transaction</p><Button full className="mt-5" onClick={() => setPaidPlan(null)}>Done</Button></Card></div>}
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= LISTINGS ================= */
export function VendorListings() {
  const nav = useNav()
  const { me, listings } = useApp()
  const [tab, setTab] = useState('all')
  const mine = listings.filter((l) => l.vendorId === me.vendorId)
  const list = mine.filter((l) => tab === 'all' || (tab === 'live' ? l.status === 'approved' : tab === 'pending' ? l.status === 'pending' : ['rejected', 'suspended'].includes(l.status)))
  const cnt = (f) => mine.filter(f).length
  return (
    <VendorWorkspace>
    <Screen title="My listings" back={false} right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('v_listing_edit')}>Add</Button>}>
      <UsageMeter compact />
      <Segmented value={tab} onChange={setTab} options={[{ id: 'all', label: 'All', count: mine.length }, { id: 'live', label: 'Live', count: cnt((l) => l.status === 'approved') }, { id: 'pending', label: 'Review', count: cnt((l) => l.status === 'pending') }, { id: 'issues', label: 'Issues', count: cnt((l) => ['rejected', 'suspended'].includes(l.status)) }]} />
      <div className="vv-vendor-listing-grid space-y-2.5">
        {list.map((l) => (
          <Card key={l.id} onClick={() => nav.go('v_listing_edit', { id: l.id })} className="!p-3">
            <div className="flex gap-3">
              <Thumb tone={l.tone} icon={cat(l.cat).icon} size={68} round="rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold leading-snug">{l.title}</p><StatusBadge s={l.status} /></div>
                <p className="mt-1 text-sm font-extrabold">{fmt(l.price)}<span className="text-xs font-normal text-ink-400">/{l.unit}</span></p>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">{l.type === 'product' ? <span>Lead time {l.lead}d</span> : <span>{l.duration} min service</span>}{l.rating > 0 && <Rating value={l.rating} />}</div>
              </div>
            </div>
            {l.reason && <p className="mt-2.5 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{l.reason}</p>}
          </Card>
        ))}
        {!list.length && <EmptyState icon={Package} title="No listings here" body="Create a listing to start receiving orders and bookings." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

export function ListingEdit({ params = {} }) {
  const nav = useNav()
  const { me, listings, setListings, patchListing, notify, toast, vendors } = useApp()
  const ex = params.id ? listings.find((l) => l.id === params.id) : null
  const [f, setF] = useState(ex ? { ...ex, price: String(ex.price), mrp: ex.mrp ? String(ex.mrp) : '', stock: String(ex.stock ?? ''), moq: String(ex.moq ?? 1), lead: String(ex.lead ?? 1), duration: String(ex.duration ?? 60), imgs: 2, specVals: Object.fromEntries((ex.specs || []).map(([k, v]) => [k, v === '—' ? '' : v])) } : { type: 'product', cat: vendors.find((v) => v.id === me.vendorId)?.cat || 'elec', sub: '', title: '', desc: '', price: '', mrp: '', unit: 'piece', stock: '', moq: '1', lead: '1', duration: '60', variants: [], imgs: 0, specVals: {} })
  const [vi, setVi] = useState('')
  const [errs, setErrs] = useState({})
  const [del, setDel] = useState(false)
  const c = cat(f.cat)
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const save = (submit) => {
    const e = {}
    if (f.title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (f.desc.trim().length < 20) e.desc = 'Add a description (min 20 characters)'
    if (!(+f.price > 0)) e.price = 'Enter a price greater than 0'
    if (f.mrp && +f.mrp < +f.price) e.mrp = 'MRP cannot be lower than the selling price'
    if (f.imgs < 1) e.imgs = 'Add at least one image'
    setErrs(e)
    if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'warn')
    const body = { type: f.type, cat: f.cat, sub: f.sub || c.subs[0], title: f.title.trim(), desc: f.desc.trim(), price: +f.price, mrp: f.mrp ? +f.mrp : undefined, unit: f.unit, tone: c.tone, specs: c.fields.map((k) => [k, f.specVals[k] || '—']), ...(f.type === 'product' ? { stock: +f.stock, moq: +f.moq, lead: +f.lead, variants: f.variants } : { duration: +f.duration }) }
    if (ex) {
      patchListing(ex.id, { ...body, status: ex.status === 'rejected' ? 'pending' : ex.status, reason: undefined })
      toast(ex.status === 'rejected' ? 'Resubmitted for approval' : 'Listing updated')
    } else {
      setListings((l) => [{ id: 'l' + Date.now(), vendorId: me.vendorId, rating: 0, reviews: 0, status: submit ? 'pending' : 'draft', ...body }, ...l])
      if (submit) notify('admin', 'Listing pending moderation', body.title, 'listing')
      toast(submit ? 'Submitted for approval' : 'Saved as draft')
    }
    nav.back()
  }
  return (
    <Screen
      title={ex ? 'Edit listing' : 'New listing'}
      right={ex && <IconBtn label="Delete" onClick={() => setDel(true)}><Trash2 size={19} className="text-red-500" /></IconBtn>}
      overlay={<Dialog open={del} onClose={() => setDel(false)} title="Remove this listing?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setDel(false)}>Keep</Button><Button variant="danger" className="flex-1" onClick={() => { setListings((l) => l.filter((x) => x.id !== ex.id)); toast('Listing removed'); nav.back() }}>Remove</Button></>}><p>It will no longer appear to customers. Open orders are not affected.</p></Dialog>}
      footer={<div className="flex gap-2">{!ex && <Button variant="secondary" onClick={() => save(false)}>Save draft</Button>}<Button className="flex-1" size="lg" onClick={() => save(true)}>{ex ? (ex.status === 'rejected' ? 'Resubmit' : 'Save changes') : 'Submit for approval'}</Button></div>}
    >
      {ex && <div className="flex items-center justify-between rounded-2xl bg-white p-3.5 ring-1 ring-ink-100"><span className="text-sm font-semibold">Moderation status</span><StatusBadge s={ex.status} /></div>}
      {ex?.reason && <Banner tone="red" title="Rejected by admin">{ex.reason}</Banner>}
      {!ex && <Segmented value={f.type} onChange={(t) => setF({ ...f, type: t, unit: t === 'service' ? 'visit' : 'piece' })} options={[{ id: 'product', label: 'Product' }, { id: 'service', label: 'Service' }]} />}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Images <span className="text-red-500">*</span></p>
        <div className="flex gap-2">{Array.from({ length: f.imgs }).map((_, i) => <div key={i} className="relative grid size-[72px] place-items-center rounded-xl bg-gradient-to-br from-ink-200 to-ink-300 text-ink-500"><ImagePlus size={20} /><button aria-label="Remove image" onClick={() => setF({ ...f, imgs: f.imgs - 1 })} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink-900 text-white"><X size={11} /></button></div>)}{f.imgs < 5 && <button onClick={() => { setF({ ...f, imgs: f.imgs + 1 }); setErrs({ ...errs, imgs: '' }) }} className="grid size-[72px] place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400"><Plus size={20} /></button>}</div>
        {errs.imgs && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.imgs}</p>}
      </div>
      <Input label="Title" required value={f.title} onChange={set('title')} error={errs.title} placeholder="e.g. Havells 1.5 sq mm wire – 90 m" />
      <div className="flex gap-3">
        <Select label="Category" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value, sub: '', specVals: {} })} options={CATS.filter((x) => x.type === f.type).map((x) => ({ value: x.id, label: x.name }))} />
        <Select label="Subcategory" value={f.sub || c.subs[0]} onChange={set('sub')} options={c.subs} />
      </div>
      <Input label="Description" required textarea rows={4} value={f.desc} onChange={set('desc')} error={errs.desc} />
      <div className="flex gap-3"><Input label="Price (₹)" required prefix="₹" inputMode="numeric" value={f.price} onChange={(e) => set('price')(e.target.value.replace(/\D/g, ''))} error={errs.price} /><Input label="MRP (₹)" prefix="₹" inputMode="numeric" value={f.mrp} onChange={(e) => set('mrp')(e.target.value.replace(/\D/g, ''))} error={errs.mrp} /></div>
      <Select label="Unit" value={f.unit} onChange={set('unit')} options={f.type === 'product' ? ['piece', 'set', 'pack', 'bag', 'coil', 'tonne', 'box'] : ['visit', 'job', 'hour', 'plate', 'sofa']} />
      {f.type === 'product' ? (
        <>
          <Input label="Typical lead time (days)" inputMode="numeric" value={f.lead} onChange={(e) => set('lead')(e.target.value.replace(/\D/g, ''))} hint="Shown to customers as an estimate" />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Variants</p>
            <div className="mb-2 flex flex-wrap gap-2">{(f.variants || []).map((v) => <span key={v} className="flex items-center gap-1.5 rounded-full bg-ink-900 py-1.5 pl-3 pr-2 text-xs font-semibold text-white">{v}<button aria-label={`Remove ${v}`} onClick={() => setF({ ...f, variants: f.variants.filter((x) => x !== v) })}><X size={13} /></button></span>)}</div>
            <div className="flex gap-2"><input value={vi} onChange={(e) => setVi(e.target.value)} placeholder="e.g. Red, 12 mm" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (vi.trim()) { setF({ ...f, variants: [...(f.variants || []), vi.trim()] }); setVi('') } }}>Add</Button></div>
          </div>
        </>
      ) : (
        <Select label="Service duration" value={f.duration} onChange={set('duration')} options={[{ value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }, { value: '180', label: '3 hours' }, { value: '240', label: '4 hours' }, { value: '480', label: 'Full day' }]} hint="Availability is managed under More → Availability" />
      )}
      <Section title={`${c.name} details`}>
        <div className="space-y-3">{c.fields.map((k) => <Input key={k} label={k} value={f.specVals[k] || ''} onChange={(e) => setF({ ...f, specVals: { ...f.specVals, [k]: e.target.value } })} />)}</div>
        <p className="mt-2 text-xs text-ink-500">Required fields are defined per category by the Super Admin.</p>
      </Section>
    </Screen>
  )
}

/* ================= WORK (orders / bookings / RFQs) ================= */

const NEXT_ORDER = { placed: ['confirmed', 'Confirm order'], confirmed: ['packed', 'Mark as packed'], packed: ['shipped', 'Mark as shipped'], shipped: ['delivered', 'Mark as delivered'] }
const ORDER_STEPS = [['placed', 'Order placed'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered']]


export function VendorRfq({ params }) {
  const nav = useNav()
  const { rfqs, patchRfq, me, notify, toast, vendor } = useApp()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-315'))
  const mine = r.quotes.find((q) => q.vendorId === me.vendorId)
  const [f, setF] = useState({ amount: mine ? String(mine.amount) : '', lead: mine ? String(mine.lead) : '', validity: mine?.validity ? new Date(mine.validity).toISOString().slice(0, 10) : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })(), notes: mine?.notes || '' })
  const [errs, setErrs] = useState({})
  const locked = r.status === 'accepted' || r.status === 'closed'
  const submit = () => {
    const e = {}
    if (!(+f.amount > 0)) e.amount = 'Enter your quoted amount'
    if (!(+f.lead > 0)) e.lead = 'Enter delivery time in days'
    if (!f.validity || f.validity < new Date().toISOString().slice(0, 10)) e.validity = 'Choose a current or future validity date'
    if (f.notes.trim().length < 5) e.notes = 'Add a short note for the customer'
    setErrs(e)
    if (Object.keys(e).length) return
    const [y, m, d] = f.validity.split('-'); const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]
    patchRfq(r.id, (x) => {
      const q = x.quotes.find((k) => k.vendorId === me.vendorId)
      const entry = { amount: +f.amount, at: 'Just now' }
      const quotes = q ? x.quotes.map((k) => (k.vendorId === me.vendorId ? { ...k, amount: +f.amount, lead: +f.lead, validity: `${d} ${mon} ${y}`, notes: f.notes, status: 'submitted', history: [...k.history, entry] } : k)) : [...x.quotes, { id: 'q' + Date.now(), vendorId: me.vendorId, amount: +f.amount, lead: +f.lead, validity: `${d} ${mon} ${y}`, notes: f.notes, status: 'submitted', history: [entry] }]
      return { status: 'quoted', quotes, history: [...x.history, { s: 'quoted', at: 'Just now', note: `${vendor(me.vendorId)?.name} ${q ? 'revised' : 'submitted'} a quotation` }] }
    })
    if (r.mine && r.buyerType === 'vendor') notify('vendor', mine ? 'Supplier quotation revised' : 'Supplier quotation received', `${vendor(me.vendorId)?.name} quoted ${fmt(+f.amount)} for ${r.id}.`, 'rfq')
    else if (r.mine) notify('customer', mine ? 'Quotation revised' : 'New quotation received', `${vendor(me.vendorId)?.name} quoted ${fmt(+f.amount)} for ${r.id}.`, 'rfq')
    toast(mine ? 'Quotation revised' : 'Quotation submitted')
  }
  return (
    <Screen title={r.id} subtitle={r.customer} right={<StatusBadge s={r.status} className="mr-2" />} footer={!locked && <Button full size="lg" onClick={submit}>{mine ? 'Revise quotation' : 'Submit quotation'}</Button>}>
      <Card><p className="text-base font-bold">{r.title}</p><p className="mt-2 text-sm text-ink-600">{r.desc}</p><div className="mt-3 grid grid-cols-2 gap-2.5"><Meta icon={Package}>{r.qty}</Meta><Meta icon={IndianRupee}>{r.budget}</Meta><Meta icon={Clock}>Due {r.deadline}</Meta><Meta icon={MapPin}>{r.location}</Meta></div></Card>
      {r.files.length > 0 && <div className="space-y-2">{r.files.map((x) => <div key={x} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><FileText size={18} className="text-brand-600" /><span className="flex-1 truncate text-sm font-medium">{x}</span><Download size={16} className="text-ink-400" /></div>)}</div>}
      {mine?.status === 'accepted' && <Banner tone="green" title="You won this RFQ 🎉">Your quotation was accepted. Prepare to fulfil as agreed.</Banner>}
      {locked && mine && mine.status !== 'accepted' && <Banner tone="gray" title="Not selected">The customer chose another vendor.</Banner>}
      {r.chat.filter((c) => c.from === 'me').length > 0 && r.mine && <Banner tone="blue" title="Customer question">{r.chat.filter((c) => c.from === 'me').slice(-1)[0].text}</Banner>}
      {!locked && (
        <Section title={mine ? 'Your quotation' : 'Submit quotation'}>
          <div className="space-y-4">
            <div className="flex gap-3"><Input label="Total amount (₹)" required prefix="₹" inputMode="numeric" value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value.replace(/\D/g, '') }); setErrs({ ...errs, amount: '' }) }} error={errs.amount} /><Input label="Delivery (days)" required inputMode="numeric" value={f.lead} onChange={(e) => { setF({ ...f, lead: e.target.value.replace(/\D/g, '') }); setErrs({ ...errs, lead: '' }) }} error={errs.lead} /></div>
            <Input label="Quote valid until" type="date" min={new Date().toISOString().slice(0, 10)} value={f.validity} onChange={(e) => { setF({ ...f, validity: e.target.value }); setErrs({ ...errs, validity: '' }) }} error={errs.validity} />
            <Input label="Notes to customer" required textarea rows={3} value={f.notes} onChange={(e) => { setF({ ...f, notes: e.target.value }); setErrs({ ...errs, notes: '' }) }} error={errs.notes} placeholder="Brand, warranty, inclusions, payment terms…" />
          </div>
        </Section>
      )}
      {mine && <Section title="Quotation history"><Card><Timeline steps={[...mine.history].reverse().map((h, i) => ({ label: fmt(h.amount), at: h.at, note: i === 0 ? 'Current' : 'Superseded', done: true }))} /></Card></Section>}
    </Screen>
  )
}

export function VendorOrders() {
  const nav = useNav()
  const { me, orders, listings, patchOrder, notify, toast, stamp } = useApp()
  const mine = orders.filter((o) => o.vendorId === me.vendorId)
  const next = { placed: ['confirmed', 'Accept order'], confirmed: ['packed', 'Start processing'], packed: ['shipped', 'Mark shipped'], shipped: ['delivered', 'Mark delivered'] }
  const advance = (o) => { const n = next[o.status]; if (!n) return; patchOrder(o.id, (x) => ({ ...x, status: n[0], history: [...(x.history || []), { s: n[0], at: stamp(), note: n[1] }] })); notify('customer', `Order ${n[0]}`, `${o.id} · ${n[1]}`, 'order'); toast(`${o.id} updated`) }
  const reject = (o) => { patchOrder(o.id, (x) => ({ ...x, status: 'rejected', history: [...(x.history || []), { s: 'rejected', at: stamp(), note: 'Supplier declined the order' }] })); notify('customer', 'Order rejected', `${o.id} · Supplier declined the order`, 'order'); toast(`${o.id} rejected`, 'warn') }
  return <VendorWorkspace><Screen title="Purchase orders" back={false}>
    <Banner tone="blue">Supplier orders from direct catalogue purchases and accepted quotations appear here. Progress updates are visible to the buyer.</Banner>
    <div className="space-y-2.5">{mine.map((o) => { const l = listings.find((x) => x.id === o.listingId); return <Card key={o.id} className="!p-3.5"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold text-ink-500">{o.id} · {o.customer}</p><p className="mt-1 text-sm font-bold">{l?.title || 'Supplier order'}</p><p className="mt-1 text-xs text-ink-500">{o.qty} {l?.unit || 'units'} · {fmt(o.total || 0)} · {o.address}</p></div><StatusBadge s={o.status} /></div>{o.status === 'placed' && <Button size="sm" variant="dangerSoft" className="mt-3 mr-2" onClick={() => reject(o)}>Reject order</Button>}{next[o.status] && <Button size="sm" className="mt-3" onClick={() => advance(o)}>{next[o.status][1]}</Button>}<button className="ml-2 mt-3 text-xs font-bold text-brand-700" onClick={() => nav.go('c_order', { id: o.id })}>View tracking</button></Card> })}{!mine.length && <EmptyState icon={Package} title="No purchase orders yet" body="Orders created by buyers will appear here." />}</div>
  </Screen></VendorWorkspace>
}

/* ================= AVAILABILITY ================= */

/* ================= INVENTORY ================= */

/* ================= EARNINGS ================= */

/* ================= PERFORMANCE ================= */
export function Performance() {
  const { toast, me, listings } = useApp()
  const [range, setRange] = useState('30')
  const k = { 7: [14, '92%', '9', '1.5 hrs'], 30: [61, '94%', '34', '1.2 hrs'], 90: [172, '95%', '97', '1.1 hrs'] }[range]
  const top = listings.filter((l) => l.vendorId === me.vendorId && l.status === 'approved').sort((a, b) => b.reviews - a.reviews).slice(0, 4)
  return (
    <VendorWorkspace>
    <Screen title="Performance" right={<IconBtn label="Export" onClick={() => toast('Report exported (CSV)')}><Download size={20} /></IconBtn>}>
      <div className="vv-vendor-perf-body">
      <Segmented value={range} onChange={setRange} options={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} />
      <div className="grid grid-cols-2 gap-3"><Stat label="Enquiries" value={k[0]} icon={MessageCircle} tone="amber" delta="+8%" /><Stat label="Reply rate" value={k[1]} icon={TrendingUp} tone="emerald" delta="+2%" /><Stat label="Quotes sent" value={k[2]} icon={FileText} tone="violet" delta="+3%" /><Stat label="Avg. reply time" value={k[3]} icon={Clock} tone="sky" delta="-10%" /></div>
      <Card><p className="mb-3 text-sm font-bold">Enquiries trend</p><BarChart height={110} data={[{ label: 'W1', value: 32 }, { label: 'W2', value: 41 }, { label: 'W3', value: 38 }, { label: 'W4', value: 55 }, { label: 'W5', value: 49 }, { label: 'W6', value: 68 }]} /></Card>
      <Card className="space-y-3"><p className="text-sm font-bold">Most enquired listings</p>{top.map((l, i) => <HBar key={l.id} label={l.title.slice(0, 30)} value={l.reviews} max={top[0].reviews} right={`${l.reviews} enquiries`} color={['bg-brand-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500'][i]} />)}</Card>
      <Card className="space-y-3"><p className="text-sm font-bold">RFQ conversion</p><HBar label="Quotes sent" value={34} max={34} /><HBar label="Shortlisted" value={19} max={34} color="bg-sky-500" /><HBar label="Won" value={9} max={34} color="bg-emerald-500" /></Card>
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

export function VendorReviews() {
  const { me, reviews, setReviews, toast } = useApp()
  const mine = reviews.filter((r) => r.target === me.vendorId)
  const [reply, setReply] = useState(null)
  const [txt, setTxt] = useState('')
  const avg = mine.length ? (mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(1) : '—'
  return (
    <VendorWorkspace>
    <Screen title="Reviews" overlay={<Sheet open={!!reply} onClose={() => setReply(null)} title="Reply publicly" footer={<Button full disabled={!txt.trim()} onClick={() => { setReviews((rs) => rs.map((r) => (r.id === reply.id ? { ...r, reply: txt } : r))); setReply(null); setTxt(''); toast('Reply posted') }}>Post reply</Button>}>{reply && <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">“{reply.text}”</p>}<Input textarea rows={3} placeholder="Thank the customer or address their concern" value={txt} onChange={(e) => setTxt(e.target.value)} /></Sheet>}>
      <div className="vv-vendor-reviews-body">
      <Card className="flex items-center gap-5"><div className="text-center"><p className="text-4xl font-extrabold">{avg}</p><Rating value={+avg || 0} /></div><div className="flex-1 space-y-1.5">{[5, 4, 3].map((s) => <HBar key={s} label={`${s}★`} value={mine.filter((r) => r.rating === s).length} max={mine.length || 1} color="bg-amber-400" />)}</div></Card>
      {mine.map((r) => (
        <Card key={r.id}><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><Avatar name={r.by} size={34} /><div><p className="text-sm font-bold">{r.by}</p><p className="text-[11px] text-ink-400">{r.at}</p></div></div><Rating value={r.rating} /></div><p className="mt-2 text-[13px] text-ink-600">{r.text}</p>{r.reply ? <p className="mt-2 rounded-lg bg-brand-50 p-2.5 text-xs text-brand-900"><b>Your reply:</b> {r.reply}</p> : <button onClick={() => setReply(r)} className="mt-2 text-xs font-bold text-brand-700">Reply</button>}</Card>
      ))}
      {!mine.length && <EmptyState icon={Star} title="No reviews yet" body="Reviews appear after customers complete a transaction." />}
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= MORE / PROFILE ================= */

export function VendorProfile() {
  const nav = useNav()
  const v = useMyVendor()
  const { me, setMe, patchVendor, toast, settings } = useApp()
  const [f, setF] = useState({ name: v?.name || '', phone: v?.phone || '', email: v?.email || '', about: 'Trusted supplier of electrical and hardware products since 2019. Genuine brands, fast delivery.', areas: v?.areas || [] })
  const [errs, setErrs] = useState({})
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentDone, setPaymentDone] = useState(null)
  const [businessOpen, setBusinessOpen] = useState(false)
  const [businessName, setBusinessName] = useState(me.businessName || v?.name || '')
  const [deleteOpen, setDeleteOpen] = useState(false)
  if (!v) return <VendorWorkspace><Screen title="Business profile"><EmptyState icon={Store} title="No business profile yet" body="Complete vendor registration to set up your profile." action={<Button onClick={() => nav.go('v_register')}>Start registration</Button>} /></Screen></VendorWorkspace>
  const save = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Business name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email'
    if (!f.areas.length) e.areas = 'Select at least one area'
    setErrs(e)
    if (Object.keys(e).length) return
    patchVendor(v.id, { name: f.name, phone: f.phone, email: f.email, areas: f.areas }); toast('Business profile saved'); nav.back()
  }
  const createBusinessWorkspace = () => {
    const name = businessName.trim()
    if (name.length < 3) return toast('Enter a business/company name', 'warn')
    setMe({ ...me, role: 'business', businessWorkspace: true, businessName: name, vendorOwnerName: me.name, name, buyerMode: false })
    toast('Business workspace created')
    setBusinessOpen(false)
    nav.reset('v_dash')
  }
  const deleteAccount = () => {
    if (me.role === 'business' && me.businessWorkspace) {
      setMe({ ...me, role: 'vendor', businessWorkspace: false, businessName: undefined, businessSetup: undefined, name: me.vendorOwnerName || me.vendorName || v?.name || me.name, buyerMode: false })
      toast('Business workspace deleted')
      setDeleteOpen(false)
      nav.reset('v_dash')
      return
    }
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '', accountState: 'deleted' })
    toast('Vendor account deletion recorded')
    setDeleteOpen(false)
    nav.reset('welcome')
  }
  return (
    <VendorWorkspace>
    <Screen title="Business profile" footer={<Button full size="lg" onClick={save}>Save changes</Button>}>
      <DemoPhonePePayment open={!!selectedPlan} amount={selectedPlan?.price} title={`${selectedPlan?.name || ''} subscription`} onClose={() => setSelectedPlan(null)} onSuccess={() => { patchVendor(v.id, { plan: selectedPlan.name }); setPaymentDone(selectedPlan); setSelectedPlan(null) }} />
      <div className="vv-vendor-profile-body">
      <Section title="Business workspace"><Card className="!border-violet-200 !bg-violet-50/60 !p-4"><div className="flex items-start gap-3"><Thumb tone="violet" icon={Briefcase} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{me.businessWorkspace ? 'Business workspace active' : 'Create business workspace'}</p><p className="mt-1 text-xs leading-relaxed text-ink-600">{me.businessWorkspace ? `Open ${me.businessName || 'your company'} supplier dashboard and manage vendor RFQs.` : 'Create a supplier workspace for your company. Vendors can send bulk RFQs and purchase requirements to you.'}</p><Button size="sm" className="mt-3" variant={me.businessWorkspace ? 'secondary' : 'primary'} onClick={() => { if (me.businessWorkspace) { setMe({ ...me, role: 'business', name: me.businessName || me.name, buyerMode: false }); nav.reset('b_home') } else nav.go('b_eligibility') }}>{me.businessWorkspace ? 'Open workspace' : 'Create workspace'}</Button></div></div></Card></Section>
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} title="Create business workspace" actions={<><Button variant="secondary" className="flex-1" onClick={() => setBusinessOpen(false)}>Cancel</Button><Button className="flex-1" onClick={createBusinessWorkspace}>Create & open</Button></>}><p className="text-sm leading-relaxed text-ink-600">This workspace uses your verified vendor account as the supplier identity. Vendors will be able to send bulk RFQs, compare terms and place purchase orders with you.</p><div className="mt-4"><Input label="Business / company name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div></Dialog>
      <Section title="Danger zone"><Card className="!border-red-200 !bg-red-50/60 !p-4"><p className="text-sm font-bold text-red-900">{me.role === 'business' ? 'Delete business workspace' : 'Delete vendor account'}</p><p className="mt-1 text-xs leading-relaxed text-red-800/75">{me.role === 'business' ? 'Remove this supplier workspace and return to your vendor account.' : 'Sign out and record deletion of this vendor account in the demo.'}</p><Button variant="dangerSoft" className="mt-3" onClick={() => setDeleteOpen(true)}>Delete account</Button></Card></Section>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={me.role === 'business' ? 'Delete business workspace?' : 'Delete vendor account?'} actions={<><Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Keep account</Button><Button variant="danger" className="flex-1" onClick={deleteAccount}>Confirm delete</Button></>}><p className="text-sm leading-relaxed text-ink-600">{me.role === 'business' ? 'Your vendor workspace and marketplace listings will remain available. Only the Business Supplier workspace will be removed.' : 'This demo will close the vendor session and record the account as deleted. Production deletion would require backend data-retention and verification rules.'}</p></Dialog>
      <div className="flex justify-center"><Thumb tone={v.tone} icon={Store} size={84} /></div>
      <Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} />
      <Input label="GSTIN" value={v.gstin} readOnly hint="Verified by admin — contact support to change" />
      <Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Input label="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errs.email} />
      <Input label="About your business" textarea rows={3} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service areas</p><Chips scroll={false} multi value={f.areas} onChange={(a) => setF({ ...f, areas: a })} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar', 'Jodhpur', 'Kota']} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div>
      <Section title="Your plan"><Card><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{v.plan || 'No active plan'}</p><p className="text-xs text-ink-500">{v.plan ? `Commission ${settings.plans.find((p) => p.name === v.plan)?.commission ?? settings.vendorCommissionPct}% · ${settings.plans.find((p) => p.name === v.plan)?.listings} listings` : 'Choose a subscription below to unlock marketplace growth tools.'}</p></div><Badge tone={v.plan ? 'teal' : 'amber'}>{v.plan ? <><Crown size={11} />Active</> : 'Unsubscribed'}</Badge></div><p className="mt-2 text-xs text-ink-500">Paid plans and subscriptions are managed by VendorVerse admin.</p></Card></Section>
      <Section title="Compare and upgrade"><div className="grid gap-3">{settings.plans.map((p) => <Card key={p.id} className={cx('relative', p.name === 'Growth' && 'ring-2 ring-brand-500')}><div className="flex items-start justify-between"><div><p className="text-lg font-extrabold">{p.name}</p><p className="text-sm font-bold text-amber-700">Price open (CFG-02) · sample values</p></div>{p.name === 'Growth' && <Badge tone="teal">Popular</Badge>}</div><p className="mt-2 text-sm text-ink-500">{p.listings} listings · {p.leads} enquiries/month</p><Button full className="mt-3" disabled={v.plan === p.name} onClick={() => nav.go('v_checkout', { plan: p.name })}>{v.plan === p.name ? 'Current plan' : `Add / upgrade to ${p.name}`}</Button></Card>)}</div></Section>
      {selectedPlan && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm"><button className="float-right" aria-label="Close payment" onClick={() => setSelectedPlan(null)}><X /></button><p className="text-xs font-bold uppercase tracking-wider text-brand-700">Subscription payment demo</p><h2 className="mt-1 text-xl font-black">{selectedPlan.name} plan</h2><div className="my-5 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-600 p-5 text-white"><p className="text-3xl font-black">₹{selectedPlan.price}<span className="text-sm text-white/70"> / month</span></p><p className="mt-3 text-xs text-white/70">Demo checkout · no real money is charged</p></div><Button full disabled={selectedPlan.loading} onClick={() => { setSelectedPlan({ ...selectedPlan, loading: true }); setTimeout(() => { patchVendor(v.id, { plan: selectedPlan.name }); setPaymentDone(selectedPlan); setSelectedPlan(null) }, 1600) }}>{selectedPlan.loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing payment…</> : <><Wallet size={17} /> Pay securely with PhonePe</>}</Button><p className="mt-3 text-center text-[11px] text-ink-400">UPI · Cards · Net banking</p></Card></div>}
      {paymentDone && <div className="fixed inset-0 z-[51] grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm text-center"><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={40} strokeWidth={3} /></div><h2 className="mt-5 text-2xl font-black">Payment successful</h2><p className="mt-2 text-sm text-ink-500">{paymentDone.name} is now active on your vendor profile.</p><p className="mt-5 rounded-xl bg-ink-50 p-3 text-sm font-bold">₹{paymentDone.price} · Demo transaction</p><Button full className="mt-5" onClick={() => setPaymentDone(null)}>Done</Button></Card></div>}
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= DASHBOARD ================= */
export function VendorDashboard() {
  const nav = useNav()
  const { me, rfqs, listings, threads } = useApp()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const v = useMyVendor()
  const vid = me.vendorId
  const th = threads.vendor
  const unread = th.reduce((s, t) => s + t.unread, 0)
  const toQuote = rfqs.filter((r) => v && (me.role === 'business' || r.cat === v.cat) && !r.mine && r.status !== 'accepted' && !r.quotes.find((q) => q.vendorId === vid))
  const mine = listings.filter((l) => l.vendorId === vid)
  const live = mine.filter((l) => l.status === 'approved').length
  const fix = mine.filter((l) => ['rejected', 'suspended'].includes(l.status))
  const todo = unread + toQuote.length + fix.length
  if (!v) return <Screen title="Vendor" back={false}><EmptyState icon={Store} title="Complete your registration" action={<Button onClick={() => nav.go('v_register')}>Start</Button>} /></Screen>
  const banner = {
    submitted: <Banner tone="blue" title="Verification under review" action={<Button size="sm" variant="secondary" onClick={() => nav.go('v_verify')}>View status</Button>}>Our team is reviewing your documents. Listings go live once you are verified.</Banner>,
    info: <Banner tone="amber" title="More information needed" action={<Button size="sm" onClick={() => nav.go('v_verify')}>Update documents</Button>}>Super Admin needs a few corrections before approval.</Banner>,
    rejected: <Banner tone="red" title="Verification rejected" action={<Button size="sm" onClick={() => nav.go('v_verify')}>Correct & resubmit</Button>}>{v.history[v.history.length - 1]?.note}</Banner>,
  }[v.status]
  return (
    <Screen headerless pad={false} bg="bg-transparent">
      <div className={cx('vv-vendor-dashboard', sidebarCollapsed && 'is-collapsed')}>
        <VendorSidebar active={nav.id} vendor={v} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((x) => !x)} />
        <main className="vv-vendor-content">
          <header className="vv-vendor-topbar">
            <div className="vv-vendor-mobile-brand"><span className="vv-vendor-mark">V</span><b>VendorVerse</b></div>
            <div className="vv-vendor-page-title"><span>{me.role === 'business' ? 'BUSINESS SUPPLIER WORKSPACE' : 'VENDOR WORKSPACE'}</span><h1>{me.role === 'business' ? 'Supplier dashboard' : 'Dashboard'}</h1></div>
            <div className="vv-vendor-notifications [&_button]:text-ink-700"><NotifBell role="vendor" /></div>
          </header>
          <div className="vv-vendor-content-inner">
          <section className="vv-vendor-hero">
            <div className="vv-vendor-hero-copy"><span className="vv-vendor-eyebrow">{v.status === 'approved' ? '✓ VERIFIED BUSINESS' : 'BUSINESS OVERVIEW'}</span><h2>Welcome back, {me.name?.split(' ')[0] || 'there'}.</h2><p>Here’s what’s happening with {v.name} today.</p></div>
            <div className="vv-vendor-hero-business"><Thumb tone={v.tone} icon={cat(v.cat).icon} size={50} round="rounded-2xl" /><div><b>{v.name}</b><small>{v.status === 'approved' ? 'Verified vendor' : 'Unverified vendor'}</small></div></div>
            <div className="vv-vendor-orb vv-orb-one" /><div className="vv-vendor-orb vv-orb-two" />
          </section>
          <div className="vv-vendor-dashboard-body space-y-4">
        {banner}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Unread messages" value={unread} icon={MessageCircle} tone="amber" onClick={() => nav.go('messages')} />
          <Stat label={me.role === 'business' ? 'Vendor RFQs' : 'Quote requests'} value={toQuote.length} icon={FileText} tone="violet" onClick={() => nav.go('v_work')} />
          <Stat label="Live listings" value={live} icon={Package} tone="sky" onClick={() => nav.go('v_listings')} />
          <Stat label="Enquiries (7d)" value={v.status === 'approved' ? 18 : 0} icon={TrendingUp} tone="emerald" delta="+12%" onClick={() => nav.go('v_perf')} />
        </div>
        <Section title={`Needs your attention${todo ? ` (${todo})` : ''}`}>
          <Group>
            {th.filter((t) => t.unread > 0).map((t) => <ListRow key={t.id} icon={MessageCircle} tone="amber" title={`${t.unread} new from ${t.name}`} subtitle={t.msgs[t.msgs.length - 1]?.t} onClick={() => nav.go('chat', { id: t.id })} />)}
            {toQuote.map((r) => <ListRow key={r.id} icon={FileText} tone="violet" title={`Quote ${r.id}`} subtitle={r.title} onClick={() => nav.go('v_rfq', { id: r.id })} />)}
            {fix.map((l) => <ListRow key={l.id} icon={AlertTriangle} tone="rose" title={`Listing ${l.status}`} subtitle={l.title} onClick={() => nav.go('v_listing_edit', { id: l.id })} />)}
            {todo === 0 && <p className="p-5 text-center text-sm text-ink-500">You are all caught up 🎉</p>}
          </Group>
        </Section>
        <Card>
          <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Customer enquiries</p><p className="text-xs text-ink-500">Last 6 weeks</p></div><Spark points={[12, 18, 15, 24, 22, 31]} /></div>
          <div className="mt-3"><BarChart data={[{ label: 'W1', value: 12 }, { label: 'W2', value: 18 }, { label: 'W3', value: 15 }, { label: 'W4', value: 24 }, { label: 'W5', value: 22 }, { label: 'W6', value: 31 }]} height={90} /></div>
        </Card>
        <div className="grid grid-cols-4 gap-2">
          {[[Plus, 'Add listing', () => nav.go('v_listing_edit')], [MessageCircle, 'Messages', () => nav.go('messages')], [FileText, 'Quotes', () => nav.go('v_work')], [BarChart3, 'Reports', () => nav.go('v_perf')]].map(([I, l, fn]) => (
            <button key={l} onClick={fn} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 ring-1 ring-ink-100 active:scale-95"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><I size={18} /></span><span className="text-[11px] font-semibold">{l}</span></button>
          ))}
        </div>
          </div>
          </div>
        </main>
      </div>
    </Screen>
  )
}

/* ================= QUOTE REQUESTS ================= */
export function VendorQuotes() {
  const nav = useNav()
  const { me, rfqs, bookings, listings } = useApp()
  const v = useMyVendor()
  const [fl, setFl] = useState('todo')
  const [kind, setKind] = useState('rfqs')
  const mr = rfqs.filter((r) => v && (me.role === 'business' || r.cat === v.cat) && (!r.mine || r.buyerType === 'vendor') && r.buyerVendorId !== me.vendorId && (!r.targetVendorId || r.targetVendorId === me.vendorId))
  const mine = (x) => x.quotes.find((q) => q.vendorId === me.vendorId)
  const list = mr.filter((x) => (fl === 'todo' ? !mine(x) && x.status !== 'accepted' : fl === 'active' ? mine(x) && x.status !== 'accepted' : x.status === 'accepted'))
  const myBookings = bookings.filter((b) => b.vendorId === me.vendorId)
  const bookingList = myBookings.filter((b) => fl === 'todo' ? ['requested', 'change_requested'].includes(b.status) : fl === 'active' ? ['accepted', 'in_progress'].includes(b.status) : ['completed', 'closed', 'declined', 'cancelled'].includes(b.status))
  return (
    <VendorWorkspace>
    <Screen title="Quote requests" back={false}>
      <Segmented value={kind} onChange={(v) => { setKind(v); setFl('todo') }} options={[{ id: 'rfqs', label: 'Quote requests' }, { id: 'bookings', label: `Service bookings (${myBookings.length})` }]} />
      <Banner tone="blue">{kind === 'rfqs' ? (me.role === 'business' ? 'Vendors submit bulk requirements here. Respond with your supplier quotation, MOQ, lead time and terms.' : 'Customers post requirements here. Send your quotation, then continue the conversation in Messages.') : 'Review customer booking requests, confirm availability, and track service progress. Payment stays directly between you and the customer.'}</Banner>
      <Chips scroll={false} value={fl} onChange={setFl} options={kind === 'rfqs' ? [{ id: 'todo', label: `To quote (${mr.filter((x) => !mine(x) && x.status !== 'accepted').length})` }, { id: 'active', label: 'Quoted' }, { id: 'done', label: 'Closed' }] : [{ id: 'todo', label: `Needs reply (${myBookings.filter((b) => ['requested', 'change_requested'].includes(b.status)).length})` }, { id: 'active', label: 'Upcoming' }, { id: 'done', label: 'Past' }]} />
      {kind === 'rfqs' ? <>
      <div className="vv-vendor-quote-grid space-y-2.5">
        {list.map((x) => {
          const q = mine(x)
          return (
            <Card key={x.id} onClick={() => nav.go('v_rfq', { id: x.id })} className="!p-3.5">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{x.id} · {x.customer}</span>{q ? <StatusBadge s={x.status === 'accepted' ? (q.status === 'accepted' ? 'accepted' : 'closed') : q.history.length > 1 ? 'revised' : 'submitted'} /> : <StatusBadge s="open" />}</div>
              <p className="mt-1 text-sm font-bold">{x.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink-500"><span>{x.qty}</span>·<span>{x.budget}</span>{q && <><span>·</span><b className="text-ink-800">Your quote {fmt(q.amount)}</b></>}</p>
            </Card>
          )
        })}
        {!list.length && <EmptyState icon={FileText} title="Nothing here" body="New quote requests matching your category will appear here." />}
      </div>
      </> : <div className="vv-vendor-quote-grid space-y-2.5">{bookingList.map((b) => { const l = listings.find((x) => x.id === b.listingId); return <Card key={b.id} onClick={() => nav.go('c_booking', { id: b.id })} className="!p-3.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-ink-500">{b.id} · {b.customer}</span><StatusBadge s={b.status} /></div><p className="mt-1 text-sm font-bold">{l?.title || 'Service booking'}</p><p className="mt-1 text-xs text-ink-500">{b.date} at {b.slot} · {b.address}</p><p className="mt-1 text-xs text-ink-500">Indicative amount {fmt(b.total || 0)} · payment agreed directly</p></Card> })}{!bookingList.length && <EmptyState icon={CalendarCheck} title="No service bookings here" body="Customer requests for your service listings will appear here." />}</div>}
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= MORE / PROFILE ================= */
export function VendorMore() {
  const nav = useNav()
  const { setMe, me } = useApp()
  const v = useMyVendor()
  const [businessOpen, setBusinessOpen] = useState(false)
  const [businessName, setBusinessName] = useState(me.businessName || v?.name || '')
  const createBusinessWorkspace = () => {
    const name = businessName.trim()
    if (name.length < 3) return
    setMe({ ...me, role: 'business', businessWorkspace: true, businessName: name, vendorOwnerName: me.vendorOwnerName || me.name, name, buyerMode: false })
    nav.reset('v_dash')
  }
  return (
    <VendorWorkspace>
    <Screen title="More" back={false} pad={false}>
      <div className="vv-vendor-more-body space-y-4 p-4">
        <Card onClick={() => nav.go('v_profile')} className="!p-4"><div className="flex items-center gap-3.5"><Thumb tone={v?.tone || 'teal'} icon={Store} size={56} /><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{v?.name || 'Your business'}</p><p className="text-sm text-ink-500">{me.name}</p><div className="mt-1.5">{v?.status === 'approved' ? <Badge tone="green"><ShieldCheck size={11} />Verified</Badge> : <StatusBadge s={v?.status || 'draft'} />}</div></div><ChevronRight size={18} className="text-ink-300" /></div></Card>
        <Group>
          {me.role === 'business' && me.businessWorkspace && <ListRow icon={Store} tone="sky" title="Open vendor workspace" subtitle="Return to your vendor listings and customer work" onClick={() => { setMe({ ...me, role: 'vendor', name: me.vendorOwnerName || me.vendorName || me.name, buyerMode: false }); nav.reset('v_dash') }} />}
          <ListRow icon={Briefcase} tone="teal" title={me.businessWorkspace ? 'Open business workspace' : 'Become a supplier / business'} subtitle={me.businessWorkspace ? `Manage ${me.businessName || 'your supplier account'} and vendor RFQs` : 'Create a supplier account and receive vendor bulk RFQs'} onClick={() => { if (me.businessWorkspace) { setMe({ ...me, role: 'business', name: me.businessName || me.name, buyerMode: false }); nav.reset('v_dash') } else nav.go('v_business_onboard') }} />
          <ListRow icon={Package} tone="violet" title="Buy as a business" subtitle="Open supplier-only marketplace" onClick={() => { setMe({ ...me, buyerMode: true }); nav.go('vb_home') }} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Verification" subtitle="Documents & status" onClick={() => nav.go('v_verify')} />
          <ListRow icon={Package} tone="sky" title="Purchase orders" subtitle="Supplier fulfilment & tracking" onClick={() => nav.go('v_orders')} />
          <ListRow icon={Star} tone="amber" title="Customer reviews" onClick={() => nav.go('v_reviews')} />
          <ListRow icon={BarChart3} tone="violet" title="Performance reports" subtitle="Enquiries, replies, quotes" onClick={() => nav.go('v_perf')} />
          <ListRow icon={Crown} tone="rose" title="Subscription plan" subtitle={`${v?.plan || 'Free'} plan`} onClick={() => nav.go('v_sub')} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Publication checklist" subtitle="Six gates" onClick={() => nav.go('v_listing_gate')} />
          <ListRow icon={Store} tone="sky" title="Public profile & trust" onClick={() => nav.go('v_public')} />
          <ListRow icon={Settings} tone="slate" title="Service areas & availability" onClick={() => nav.go('v_areas')} />
          <ListRow icon={Settings} tone="slate" title="Contracts" onClick={() => nav.go('v_contract')} />
          <ListRow icon={Star} tone="amber" title="Cases & appeals" onClick={() => nav.go('v_cases')} />
          <ListRow icon={Package} tone="violet" title="Sponsored visibility" onClick={() => nav.go('v_sponsor')} />
          <ListRow icon={Info} tone="slate" title="Business network" onClick={() => nav.go('v_biz_network')} />
          <ListRow icon={Settings} tone="slate" title="Booking requests" onClick={() => nav.go('v_booking')} />
          <ListRow icon={Info} tone="slate" title="Leads" onClick={() => nav.go('v_leads')} />
          <ListRow icon={Package} tone="violet" title="Suggest a category" onClick={() => nav.go('c_cat_suggest')} last />
        </Group>
        <Group>
          <ListRow icon={Settings} tone="slate" title="Notifications & privacy" onClick={() => nav.go('c_notif_prefs')} />
          <ListRow icon={Settings} tone="slate" title="Sessions & devices" onClick={() => nav.go('c_sessions')} />
          <ListRow icon={Info} tone="slate" title="Fees explained" onClick={() => nav.go('fees')} />
          <ListRow icon={Info} tone="slate" title="Help & support" onClick={() => nav.go('c_report')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' }); nav.reset('c_home') }}>Log out</Button>
      </div>
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} title="Become a supplier / business" actions={<><Button variant="secondary" className="flex-1" onClick={() => setBusinessOpen(false)}>Cancel</Button><Button className="flex-1" onClick={() => { createBusinessWorkspace(); setBusinessOpen(false) }}>Create & open</Button></>}><p className="text-sm leading-relaxed text-ink-600">Use your existing vendor identity as a Business / Company supplier. Vendors can send bulk RFQs, review quotations and place purchase orders with you.</p><div className="mt-4"><Input label="Business / company name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div></Dialog>
    </Screen>
    </VendorWorkspace>
  )
}

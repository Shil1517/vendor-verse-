import { useEffect, useState } from 'react'
import { ShieldCheck, Eye, EyeOff, Plus, Trash2, Tag } from 'lucide-react'
import { authService } from '../services/authService.js'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { Screen, Card, Button, Chips, Banner, EmptyState, Badge, Input, Select } from '../ui.jsx'
import { VENDOR_TYPES } from '../mvpdata.jsx'
import { vendorRoles } from '../globaldata.jsx'
import { useMyVendor } from './vendor_a.jsx'

/* Vendor roles (D-023, D-024). A vendor holds one or more roles; each is reviewed on its own (D-020)
   and appears publicly only once verified (D-021). The role list is data: in remote mode it comes from
   the backend catalogue, in the mockup from the single VENDOR_TYPES registry. */

const STATE = { pending: ['amber', 'Pending review'], verified: ['green', 'Verified'], rejected: ['red', 'Rejected'], revoked: ['red', 'Revoked'] }
const OFFER = { products: 'Products', services: 'Services' }

/** The mockup catalogue, shaped like the backend's role definitions. */
const mockCatalogue = () => Object.entries(VENDOR_TYPES).map(([code, t]) => ({ code, label: t.label, offerType: t.offer, requiredDocuments: t.docs, isActive: true }))
const labelOf = (code) => VENDOR_TYPES[code]?.label || code

function DocsNeeded({ docs }) {
  if (!docs?.length) return <p className="text-xs text-ink-500">No documents are required for this role.</p>
  return <p className="text-xs text-ink-500">Needs: {docs.join(' · ')}</p>
}

/* ================= VENDOR: my roles ================= */
export function VendorRoles() {
  const nav = useNav()
  const v = useMyVendor()
  const { patchVendor, notify, toast } = useApp()
  const remote = authService.isRemote
  const [remoteRoles, setRemoteRoles] = useState([])
  const [catalogue, setCatalogue] = useState(remote ? [] : mockCatalogue())
  const [loading, setLoading] = useState(remote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!remote || !v) return undefined
    let active = true
    setLoading(true); setError('')
    Promise.all([authService.listVendorRoles(v.id), authService.listVendorRoleCatalogue()]).then(([mine, all]) => {
      if (!active) return
      if (!mine.ok) setError(mine.message)
      else if (!all.ok) setError(all.message)
      else { setRemoteRoles(mine.roles); setCatalogue(all.roles) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [remote, v?.id])

  if (!v) return <Screen title="Vendor roles" back={false}><EmptyState icon={ShieldCheck} title="No vendor organization yet" body="Create an organization first, then add the roles it plays." action={<Button onClick={() => nav.go('v_register')}>Become a vendor</Button>} /></Screen>

  const roles = remote
    ? remoteRoles.map((r) => ({ id: r.roleCode, label: r.label, status: r.status, reason: r.reason }))
    : vendorRoles(v).map((r) => ({ id: r.id, label: labelOf(r.id), status: r.status, reason: r.reason }))
  const held = (code) => roles.some((r) => r.id === code && ['pending', 'verified'].includes(r.status))
  const available = catalogue.filter((c) => c.isActive !== false && !held(c.code))
  const defOf = (code) => catalogue.find((c) => c.code === code)

  const add = async (code) => {
    if (remote) {
      setBusy(true); setError('')
      const r = await authService.addVendorRole(v.id, code)
      setBusy(false)
      if (!r.ok) { setError(r.message); return }
      setRemoteRoles(r.roles)
    } else {
      patchVendor(v.id, (x) => ({ roles: [...vendorRoles(x).filter((r) => r.id !== code), { id: code, status: 'pending' }] }))
      notify('admin', 'Vendor role awaiting review', `${v.name} added ${labelOf(code)}.`, 'onboarding', ['ad_role_reviews', {}])
    }
    toast(`${labelOf(code)} added. It stays hidden until it is verified.`)
  }

  const remove = async (code) => {
    if (roles.length <= 1) { toast('A vendor must keep at least one role', 'warn'); return }
    if (remote) {
      setBusy(true); setError('')
      const r = await authService.removeVendorRole(v.id, code)
      setBusy(false)
      if (!r.ok) { setError(r.message); return }
      setRemoteRoles(r.roles)
    } else {
      patchVendor(v.id, (x) => {
        const left = vendorRoles(x).filter((r) => r.id !== code)
        return { roles: left, kind: x.kind === code ? left[0].id : x.kind }
      })
    }
    toast(`${labelOf(code)} removed`)
  }

  return (
    <Screen title="Vendor roles" subtitle={v.name}>
      <Banner tone="blue" title="Roles are verified one by one">A role appears on your public profile and in role filters only after a reviewer verifies it. You submit only the documents your roles require.</Banner>
      {error && <Banner tone="red" title="Roles request failed">{error}</Banner>}
      {loading && <p className="text-sm text-ink-500">Loading roles…</p>}
      <div className="space-y-2.5">
        {roles.map((r) => {
          const [tone, label] = STATE[r.status] || ['gray', r.status]
          const pub = r.status === 'verified'
          return (
            <Card key={r.id} className="space-y-2 !p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-sm font-bold">{r.label}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">{pub ? <><Eye size={13} /> Shown publicly</> : <><EyeOff size={13} /> Hidden until verified</>}</p></div>
                <Badge tone={tone}>{label}</Badge>
              </div>
              {r.reason && <p className="rounded-lg bg-ink-50 p-2 text-xs text-ink-600">Reviewer: {r.reason}</p>}
              <DocsNeeded docs={defOf(r.id)?.requiredDocuments} />
              <div className="flex gap-2">
                {['rejected', 'revoked'].includes(r.status) && <Button size="sm" disabled={busy} onClick={() => add(r.id)}>Resubmit</Button>}
                {roles.length > 1 && <Button size="sm" variant="secondary" icon={Trash2} disabled={busy} onClick={() => remove(r.id)}>Remove</Button>}
              </div>
            </Card>
          )
        })}
        {!loading && !roles.length && <EmptyState icon={ShieldCheck} title="No roles yet" body="Add the role your business plays." />}
      </div>
      <p className="pt-2 text-[13px] font-semibold text-ink-700">Add another role</p>
      <div className="space-y-2.5">
        {available.filter((c) => !roles.some((r) => r.id === c.code)).map((c) => (
          <Card key={c.code} className="space-y-1.5 !p-3.5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold">{c.label}</p>{c.offerType && <p className="text-xs text-ink-500">{OFFER[c.offerType]}</p>}</div><Button size="sm" icon={Plus} disabled={busy} onClick={() => add(c.code)}>Add</Button></div>
            <DocsNeeded docs={c.requiredDocuments} />
          </Card>
        ))}
        {!loading && !available.filter((c) => !roles.some((r) => r.id === c.code)).length && <p className="text-xs text-ink-500">There are no other roles to add.</p>}
      </div>
    </Screen>
  )
}

/* ================= ADMIN: role reviews ================= */
export function AdminRoleReviews() {
  const { vendors, patchVendor, notify, toast, addAudit, me } = useApp()
  const remote = authService.isRemote
  const [status, setStatus] = useState('pending')
  const [remoteItems, setRemoteItems] = useState([])
  const [catalogue, setCatalogue] = useState(remote ? [] : mockCatalogue())
  const [reasons, setReasons] = useState({})
  const [loading, setLoading] = useState(remote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!remote) return undefined
    let active = true
    setLoading(true); setError('')
    Promise.all([authService.listVendorRoleReviews(status), authService.listVendorRoleCatalogue()]).then(([queue, all]) => {
      if (!active) return
      if (!queue.ok) setError(queue.message)
      else { setRemoteItems(queue.roles); if (all.ok) setCatalogue(all.roles) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [remote, status, version])

  const items = remote
    ? remoteItems.map((r) => ({ vendorId: r.vendorId, code: r.roleCode, label: r.label, vendorName: r.legalName || r.vendorId, status: r.status, reason: r.reason }))
    : vendors.flatMap((v) => vendorRoles(v).filter((r) => r.status === status).map((r) => ({ vendorId: v.id, code: r.id, label: labelOf(r.id), vendorName: v.name, status: r.status, reason: r.reason })))
  const key = (i) => `${i.vendorId}:${i.code}`
  const docsOf = (code) => catalogue.find((c) => c.code === code)?.requiredDocuments

  const decide = async (item, decision) => {
    const reason = (reasons[key(item)] || '').trim()
    if (!reason) { setError('Enter a review reason before recording a decision.'); return }
    setError('')
    if (remote) {
      setBusy(true)
      const r = await authService.decideVendorRole(item.vendorId, item.code, decision, reason)
      setBusy(false)
      if (!r.ok) { setError(r.message); return }
      setVersion((n) => n + 1)
    } else {
      patchVendor(item.vendorId, (x) => ({ roles: vendorRoles(x).map((r) => (r.id === item.code ? { ...r, status: decision, reason } : r)) }))
      addAudit(`Role ${decision}`, `${item.vendorName} · ${item.label}`, 'verification', reason, me.name)
      notify('vendor', `Role ${decision}`, `${item.label}: ${reason}`, 'onboarding', ['v_roles', {}])
    }
    setReasons((cur) => ({ ...cur, [key(item)]: '' }))
    toast(`${item.label} ${decision}`, decision === 'verified' ? 'ok' : 'warn')
  }

  return (
    <Screen title="Vendor role reviews">
      <Banner tone="blue">Each role is reviewed on its own. A reason is required and audited. A role is shown publicly only once it is verified.</Banner>
      <Chips scroll={false} value={status} onChange={setStatus} options={[{ id: 'pending', label: 'Pending' }, { id: 'verified', label: 'Verified' }, { id: 'rejected', label: 'Rejected' }, { id: 'revoked', label: 'Revoked' }]} />
      {error && <Banner tone="red" title="Review request failed">{error}</Banner>}
      {loading && <p className="text-sm text-ink-500">Loading review queue…</p>}
      <div className="space-y-3">
        {items.map((i) => (
          <Card key={key(i)} className="space-y-2.5 !p-3.5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold">{i.label}</p><p className="text-xs text-ink-500">{i.vendorName}</p></div><Badge tone={(STATE[i.status] || ['gray'])[0]}>{(STATE[i.status] || [0, i.status])[1]}</Badge></div>
            <DocsNeeded docs={docsOf(i.code)} />
            {i.reason && <p className="rounded-lg bg-ink-50 p-2 text-xs text-ink-600">Last decision: {i.reason}</p>}
            {['pending', 'verified'].includes(i.status) && <>
              <Input textarea rows={2} label="Review reason" value={reasons[key(i)] || ''} onChange={(e) => setReasons((cur) => ({ ...cur, [key(i)]: e.target.value }))} />
              <div className="flex gap-2">
                {i.status === 'pending' && <><Button size="sm" disabled={busy} onClick={() => decide(i, 'verified')}>Verify</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => decide(i, 'rejected')}>Reject</Button></>}
                {i.status === 'verified' && <Button size="sm" variant="danger" disabled={busy} onClick={() => decide(i, 'revoked')}>Revoke</Button>}
              </div>
            </>}
          </Card>
        ))}
        {!loading && !items.length && <EmptyState icon={ShieldCheck} title="Nothing here" body="No roles in this state." />}
      </div>
    </Screen>
  )
}

/* ================= ADMIN: role catalogue (D-024) ================= */
export function AdminRoleDefinitions() {
  const { toast } = useApp()
  const remote = authService.isRemote
  const [roles, setRoles] = useState(remote ? [] : mockCatalogue())
  const [loading, setLoading] = useState(remote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({ code: '', label: '', offerType: '', docs: '' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!remote) return undefined
    let active = true
    setLoading(true); setError('')
    authService.listVendorRoleDefinitions().then((r) => {
      if (!active) return
      if (!r.ok) setError(r.message); else setRoles(r.roles)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [remote, version])

  const create = async () => {
    const code = f.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(code) || !f.label.trim()) { setError('Enter a role name and a code made of letters, digits and underscores.'); return }
    setBusy(true); setError('')
    const requiredDocuments = f.docs.split('\n').map((d) => d.trim()).filter(Boolean)
    const r = await authService.createVendorRoleDefinition({ code, label: f.label.trim(), ...(f.offerType ? { offerType: f.offerType } : {}), ...(requiredDocuments.length ? { requiredDocuments } : {}) })
    setBusy(false)
    if (!r.ok) { setError(r.message); return }
    setF({ code: '', label: '', offerType: '', docs: '' }); setVersion((n) => n + 1); toast('Role created')
  }

  const setActive = async (role, isActive) => {
    setBusy(true); setError('')
    const r = await authService.updateVendorRoleDefinition(role.code, { isActive })
    setBusy(false)
    if (!r.ok) { setError(r.message); return }
    setVersion((n) => n + 1); toast(isActive ? `${role.label} restored` : `${role.label} retired`)
  }

  return (
    <Screen title="Vendor roles catalogue">
      <Banner tone="blue" title="Roles are configuration">A new kind of vendor is added here, not in code. Retiring a role stops new vendors picking it; vendors that already hold it keep it.</Banner>
      {!remote && <Banner tone="amber" title="Backend not connected">This list is the mockup registry. Connect the backend to create or retire roles.</Banner>}
      {error && <Banner tone="red" title="Role request failed">{error}</Banner>}
      {loading && <p className="text-sm text-ink-500">Loading roles…</p>}
      <div className="space-y-2.5">
        {roles.map((r) => (
          <Card key={r.code} className="space-y-1.5 !p-3.5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold">{r.label}</p><p className="text-xs text-ink-500">{r.code}{r.offerType ? ` · ${OFFER[r.offerType]}` : ''}</p></div><Badge tone={r.isActive === false ? 'gray' : 'green'}>{r.isActive === false ? 'Retired' : 'Active'}</Badge></div>
            <DocsNeeded docs={r.requiredDocuments} />
            {remote && <Button size="sm" variant="secondary" disabled={busy} onClick={() => setActive(r, r.isActive === false)}>{r.isActive === false ? 'Restore' : 'Retire'}</Button>}
          </Card>
        ))}
      </div>
      {remote && (
        <Card className="space-y-3 !p-3.5">
          <p className="flex items-center gap-1.5 text-sm font-bold"><Tag size={15} /> Add a role</p>
          <Input label="Role name" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Retailer" />
          <Input label="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="RETAILER" hint="Upper case letters, digits and underscores. It cannot change later." />
          <Select label="What it offers" value={f.offerType} onChange={(e) => setF({ ...f, offerType: e.target.value })} options={[{ value: '', label: 'Not decided' }, { value: 'products', label: 'Products' }, { value: 'services', label: 'Services' }]} />
          <Input textarea rows={3} label="Required documents (one per line)" value={f.docs} onChange={(e) => setF({ ...f, docs: e.target.value })} hint="Leave empty if the role needs none yet." />
          <Button full disabled={busy} onClick={create}>Create role</Button>
        </Card>
      )}
    </Screen>
  )
}

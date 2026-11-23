import { useState } from 'react'
import { UserPlus, Check, X, Globe, ShieldCheck, Ban, Star, Clock, ClipboardList } from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { RemoteMyReviews } from './remote-trust.jsx'
import { GEO, country } from '../globaldata.jsx'
import { ROLES_TEAM, AGENT_CAN, AGENT_CANNOT, COUNTRY_PACKS, packOf } from '../mvpdata.jsx'
import { Screen, Card, Button, Banner, Input, Select, Sheet, KV, Pill, Segmented, ListRow, Avatar, Money, EmptyState, PhaseTag, Badge, Chips, cx } from '../ui.jsx'

/* ---------- business account: team roles and spending limits (enforcement is Phase 2) ---------- */
export function Team() {
  const { team, setTeam, toast } = useApp()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', email: '', role: 'buyer', limit: '' })
  const [err, setErr] = useState('')
  const invite = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Enter a valid email')
    if (team.some((m) => m.email === f.email)) return setErr('This person is already on the team')
    setTeam((t) => [...t, { id: 'tm' + (t.length + 1), name: f.name || f.email.split('@')[0], email: f.email, role: f.role, status: 'invited', limit: f.limit ? +f.limit : null }])
    setOpen(false); setF({ name: '', email: '', role: 'buyer', limit: '' }); setErr(''); toast('Invitation sent')
  }
  const setRole = (id, role) => setTeam((t) => t.map((m) => (m.id === id ? { ...m, role } : m)))
  return (
    <Screen
      title="Team & roles"
      subtitle="Business account"
      right={<Button size="sm" icon={UserPlus} className="mr-2" onClick={() => setOpen(true)}>Invite</Button>}
      overlay={
        <Sheet open={open} onClose={() => setOpen(false)} title="Invite a team member" footer={<Button full onClick={invite}>Send invitation</Button>}>
          <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Work email" required value={f.email} error={err} onChange={(e) => { setF({ ...f, email: e.target.value }); setErr('') }} />
          <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={ROLES_TEAM.filter((r) => r[0] !== 'owner').map(([value, label]) => ({ value, label }))} />
          <Input label="Spending limit per order (₹)" inputMode="numeric" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value.replace(/\D/g, '') })} hint="Orders above this need an Approver" />
        </Sheet>
      }
    >
      <Banner tone="amber" title="Concept — enforcement is Phase 2">Roles and limits are stored and shown here; automatic approval routing is not part of the MVP.</Banner>
      <Card className="space-y-2">{ROLES_TEAM.map(([id, label, d]) => <div key={id} className="text-[13px]"><b>{label}</b> <span className="text-ink-500">— {d}</span></div>)}</Card>
      {team.map((m) => (
        <Card key={m.id} className="space-y-2.5">
          <div className="flex items-center gap-3"><Avatar name={m.name} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{m.name}</p><p className="truncate text-xs text-ink-500">{m.email}</p></div><Badge tone={m.status === 'active' ? 'green' : 'amber'}>{m.status === 'active' ? 'Active' : 'Invited'}</Badge></div>
          <div className="flex items-center gap-2"><div className="min-w-0 flex-1"><Select value={m.role} disabled={m.role === 'owner'} onChange={(e) => setRole(m.id, e.target.value)} options={ROLES_TEAM.map(([value, label]) => ({ value, label }))} /></div><p className="shrink-0 text-xs text-ink-500">{m.limit ? <>Limit <Money n={m.limit} /></> : 'No limit'}</p></div>
          {m.role !== 'owner' && <button className="text-xs font-bold text-red-600" onClick={() => { setTeam((t) => t.filter((x) => x.id !== m.id)); toast('Member removed') }}>Remove</button>}
        </Card>
      ))}
    </Screen>
  )
}

/* ---------- agent: assigned onboarding tasks (consent-gated) ---------- */
export function AgentTasks() {
  const nav = useNav()
  const { tasks, patchTask, toast } = useApp()
  const [flt, setFlt] = useState('open')
  const list = tasks.filter((t) => (flt === 'open') === (t.state !== 'done'))
  return (
    <Screen title="My tasks" subtitle="Assisted onboarding work" right={<Button size="sm" variant="ghost" className="mr-1" onClick={() => nav.go('a_perms')}>What I can do</Button>}>
      <Segmented value={flt} onChange={setFlt} options={[{ id: 'open', label: 'Open' }, { id: 'done', label: 'Done' }]} />
      {list.length === 0 && <EmptyState icon={ClipboardList} title="No tasks here" body="Assigned onboarding work appears in this list." />}
      {list.map((t) => (
        <Card key={t.id} className="space-y-2">
          <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">{t.lead}</p><Badge tone={t.state === 'done' ? 'green' : t.state === 'doing' ? 'blue' : 'gray'}>{t.state === 'doing' ? 'In progress' : t.state === 'done' ? 'Done' : 'To do'}</Badge></div>
          <p className="text-[13px] text-ink-600">{t.task}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-500"><Clock size={12} />Due {t.due} · {t.consent ? <span className="font-semibold text-emerald-700">Consent recorded</span> : <span className="font-semibold text-amber-700">Consent needed</span>}</p>
          {t.state !== 'done' && (
            <div className="flex gap-2">
              {!t.consent && <Button size="sm" variant="secondary" className="flex-1" onClick={() => { patchTask(t.id, { consent: true }); toast('Vendor consent recorded') }}>Record consent</Button>}
              <Button size="sm" className="flex-1" disabled={!t.consent} onClick={() => { patchTask(t.id, { state: t.state === 'todo' ? 'doing' : 'done' }); toast(t.state === 'todo' ? 'Task started' : 'Task completed') }}>{t.state === 'todo' ? 'Start' : 'Mark done'}</Button>
            </div>
          )}
        </Card>
      ))}
    </Screen>
  )
}

export function AgentPerms() {
  return (
    <Screen title="Agent permissions" subtitle="Assisted onboarding boundaries">
      <Card className="space-y-2.5"><p className="flex items-center gap-2 text-sm font-extrabold text-emerald-800"><ShieldCheck size={16} />You can</p>{AGENT_CAN.map((x) => <p key={x} className="flex gap-2 text-[13px]"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />{x}</p>)}</Card>
      <Card className="space-y-2.5"><p className="flex items-center gap-2 text-sm font-extrabold text-red-800"><Ban size={16} />You cannot</p>{AGENT_CANNOT.map((x) => <p key={x} className="flex gap-2 text-[13px]"><X size={15} className="mt-0.5 shrink-0 text-red-600" />{x}</p>)}</Card>
      <Banner tone="blue" title="Everything you do is logged">Actions on a vendor’s behalf are recorded with the vendor’s consent and appear in the audit trail.</Banner>
    </Screen>
  )
}

/* ---------- admin: country packs (international readiness) ---------- */
export function AdminCountry({ params = {} }) {
  const [code, setCode] = useState(params.code || 'IN')
  const c = country(code)
  const pk = packOf(code)
  const live = Object.keys(COUNTRY_PACKS)
  return (
    <Screen title="Country packs" subtitle="Per-country rules without code changes">
      <Chips scroll value={code} onChange={setCode} options={[...live, ...GEO.map((g) => g.code).filter((x) => !live.includes(x)).slice(0, 8)].map((id) => ({ id, label: `${country(id).flag} ${country(id).name}` }))} />
      {!COUNTRY_PACKS[code] && <Banner tone="amber" title="Pack not configured">Defaults are shown. Configure tax ID, evidence and rules before launching {c.name}.</Banner>}
      <Card className="space-y-2"><p className="text-sm font-extrabold">{c.flag} {c.name}</p><KV rows={[['Currency', c.cur || '—'], ['Time zone', pk.tz], ['Tax ID', pk.taxId], ['Date format', pk.calendar], ['SMS / OTP', pk.sms]]} /></Card>
      <Card className="space-y-2"><p className="text-sm font-extrabold">Verification evidence</p>{Object.entries(pk.docs).map(([k, v]) => <div key={k}><p className="text-xs font-bold capitalize text-ink-500">{k}</p><ul className="list-disc pl-5 text-[13px]">{v.map((d) => <li key={d}>{d}</li>)}</ul></div>)}</Card>
      <Card className="space-y-1.5"><p className="text-sm font-extrabold">Local rules</p>{pk.rules.map((r) => <p key={r} className="text-[13px]">• {r}</p>)}</Card>
    </Screen>
  )
}

/* ---------- customer: reviews I gave and ones still pending ---------- */
export function MyReviews() {
  if (authService.isRemote) return <RemoteMyReviews />
  const nav = useNav()
  const { bookings, reviewed, reviews, me, vendor } = useApp()
  const done = bookings.filter((b) => b.customer === me.name && b.state === 'closed')
  const pending = done.filter((b) => !reviewed.includes(b.id))
  const given = done.filter((b) => reviewed.includes(b.id))
  return (
    <Screen title="My reviews" subtitle="Only completed work can be reviewed">
      <Card className="space-y-1"><p className="text-sm font-extrabold">Waiting for your review <span className="text-ink-400">· {pending.length}</span></p>{pending.length ? pending.map((b) => <ListRow key={b.id} icon={Star} tone="amber" title={vendor(b.vendorId)?.name} subtitle={`${b.id} · ${b.date}`} onClick={() => nav.go('c_review', { vendorId: b.vendorId, via: b.id })} />) : <p className="text-xs text-ink-500">Nothing pending.</p>}</Card>
      <Card className="space-y-1"><p className="text-sm font-extrabold">Reviews you gave <span className="text-ink-400">· {given.length}</span></p>{given.length ? given.map((b) => <ListRow key={b.id} icon={Check} tone="emerald" title={vendor(b.vendorId)?.name} subtitle={`${b.id} · ${b.date}`} />) : <p className="text-xs text-ink-500">No reviews yet.</p>}</Card>
    </Screen>
  )
}

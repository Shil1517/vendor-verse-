import { useState } from 'react'
import {
  Users, Phone, MessageSquare, MapPin, Plus, CalendarClock, ChevronRight, Check, Store, User, Wallet, ShieldCheck, Lock, FileText, Clock,
  TrendingUp, LogOut, Globe, Bell, Flag, Upload, Target, BadgeCheck, AlertTriangle, Search, ArrowDown, ArrowRight, List, Columns3,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { STAGES, STAGE_TONE, cat, CATS, liveCats, CITIES } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Badge, Banner, EmptyState, Stat, KV, fmt, cx,
  Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar, DocTile, Stepper, HBar, Checkbox, SearchBar, SOFT,
} from '../ui.jsx'
import { NotifBell, LangButton } from './shared.jsx'
import { Logo } from './auth.jsx'
import { authService } from '../services/authService.js'
import { RemoteAgentHome, RemoteAgentLeads, RemoteAgentLeadNew, RemoteAgentLeadDetail, RemoteAgentLogActivity, RemoteAgentFollowups, RemoteAgentPerformance, RemoteAgentUnavailable } from './remote-agent.jsx'

const parseD = (s) => (s ? new Date(s) : null)
const TODAY = new Date('19 Oct 2026')
const dueKind = (s) => {
  const d = parseD(s)
  if (!d) return null
  const diff = Math.round((d - TODAY) / 864e5)
  return diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming'
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const isoToLabel = (iso) => { const [y, m, d] = iso.split('-'); return `${d} ${MONTHS[+m - 1]} ${y}` }
const ICON = { call: Phone, message: MessageSquare, visit: MapPin }
const PRIORITY = { High: 'bg-red-500', Medium: 'bg-amber-500', Low: 'bg-ink-300' }

function StageBadge({ s }) {
  const tone = STAGE_TONE[s]
  const map = { blue: 'bg-sky-50 text-sky-700 ring-sky-200', purple: 'bg-violet-50 text-violet-700 ring-violet-200', amber: 'bg-amber-50 text-amber-700 ring-amber-200', teal: 'bg-brand-50 text-brand-700 ring-brand-200', green: 'bg-emerald-50 text-emerald-700 ring-emerald-200', red: 'bg-red-50 text-red-700 ring-red-200', gray: 'bg-ink-100 text-ink-600 ring-ink-200' }
  return <span className={cx('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', map[tone])}>{s}</span>
}

function LeadCard({ l, onClick }) {
  const k = dueKind(l.next?.date)
  return (
    <Card onClick={onClick} className="!p-3.5">
      <div className="flex items-start gap-3">
        <div className="relative"><Thumb tone={cat(l.cat).tone} icon={Store} size={46} round="rounded-xl" /><span className={cx('absolute -right-0.5 -top-0.5 size-3 rounded-full ring-2 ring-white', PRIORITY[l.priority])} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{l.name}</p><StageBadge s={l.stage} /></div>
          <p className="mt-0.5 truncate text-xs text-ink-500">Prospective vendor · {cat(l.cat).name} · {l.city}</p>
          {l.next?.date && <p className={cx('mt-1.5 flex items-center gap-1 text-xs font-semibold', k === 'overdue' ? 'text-red-600' : k === 'today' ? 'text-amber-600' : 'text-ink-500')}><CalendarClock size={12} />{k === 'today' ? 'Today' : l.next.date} · {l.next.action}</p>}
        </div>
      </div>
    </Card>
  )
}

/* ================= PIPELINE VISUALS ================= */
const MAIN = STAGES.slice(0, 7)
const LOCKED = ['Approved', 'Subscribed']   // set by Super Admin approval / billing — never by an agent
const SHORT = ['New', 'Contacted', 'Interested', 'Reg. started', 'Submitted', 'Approved', 'Subscribed']
const FUNNEL = ['from-sky-500 to-sky-400', 'from-violet-500 to-violet-400', 'from-amber-500 to-amber-400', 'from-orange-500 to-orange-400', 'from-brand-600 to-brand-500', 'from-teal-600 to-teal-500', 'from-emerald-600 to-emerald-500']

export function PipelineFunnel({ leads, onPick }) {
  const cum = MAIN.map((_, i) => leads.filter((l) => MAIN.indexOf(l.stage) >= i).length)
  const cur = MAIN.map((s) => leads.filter((l) => l.stage === s).length)
  const base = cum[0] || 1
  const win = leads.length ? Math.round((cum[6] / leads.length) * 100) : 0
  const lost = leads.filter((l) => l.stage === 'Lost').length
  const idle = leads.filter((l) => l.stage === 'Inactive').length
  return (
    <Card className="!p-4">
      <div className="flex items-end justify-between">
        <div><p className="text-2xl font-extrabold leading-none">{leads.length}<span className="ml-1.5 text-sm font-semibold text-ink-400">leads</span></p><p className="mt-1 text-xs text-ink-500">{cum[0]} in active pipeline</p></div>
        <div className="text-right"><p className="text-2xl font-extrabold leading-none text-emerald-600">{win}%</p><p className="mt-1 text-xs text-ink-500">subscribed</p></div>
      </div>
      <div className="mt-4">
        {MAIN.map((s, i) => (
          <div key={s}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-1 pl-[84px] text-[10.5px] font-bold text-ink-400">
                <ArrowDown size={11} />{cum[i - 1] ? Math.round((cum[i] / cum[i - 1]) * 100) : 0}% move on
              </div>
            )}
            <button onClick={() => onPick(s)} className="grid w-full grid-cols-[76px_1fr_46px] items-center gap-2 text-left active:opacity-70">
              <span className="text-[12px] font-bold text-ink-700">{SHORT[i]}</span>
              <span className="flex justify-center">
                <span className={cx('flex h-9 items-center justify-center rounded-lg bg-gradient-to-r text-sm font-extrabold text-white shadow-sm transition-all', FUNNEL[i])} style={{ width: `${Math.max((cum[i] / base) * 100, 16)}%` }}>{cum[i]}</span>
              </span>
              <span className="text-right text-[11px] font-semibold text-ink-500">{cur[i]} now</span>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 border-t border-ink-100 pt-3">
        <button onClick={() => onPick('Lost')} className="flex flex-1 items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><span>Lost</span><span className="text-base">{lost}</span></button>
        <button onClick={() => onPick('Inactive')} className="flex flex-1 items-center justify-between rounded-xl bg-ink-100 px-3 py-2 text-xs font-bold text-ink-600"><span>Inactive</span><span className="text-base">{idle}</span></button>
      </div>
      <p className="mt-2.5 text-[11px] text-ink-400">Bars show leads that reached each stage; tap a stage to see them.</p>
    </Card>
  )
}

export function StageTracker({ stage }) {
  const idx = MAIN.indexOf(stage)
  const off = idx < 0
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">Pipeline stage</p>{off && <StageBadge s={stage} />}</div>
      <div className={cx('relative mt-4 flex justify-between', off && 'opacity-40')}>
        <div className="absolute left-3 right-3 top-3 h-0.5 bg-ink-200" />
        <div className="absolute left-3 top-3 h-0.5 bg-brand-500 transition-all" style={{ width: `calc((100% - 24px) * ${Math.max(idx, 0) / 6})` }} />
        {MAIN.map((s, i) => (
          <div key={s} className="relative z-10 flex w-11 flex-col items-center gap-1.5">
            <span className={cx('grid size-6 place-items-center rounded-full text-[10px] font-extrabold ring-4 ring-white', i < idx ? 'bg-brand-600 text-white' : i === idx ? 'bg-brand-600 text-white shadow-[0_0_0_4px_rgba(0,133,124,0.2)]' : 'bg-ink-200 text-ink-400')}>{i < idx ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            <span className={cx('text-center text-[9.5px] font-semibold leading-tight', i === idx ? 'text-brand-700' : 'text-ink-400')}>{SHORT[i]}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ================= HOME ================= */
export function AgentHome() {
  if (authService.isRemote) return <RemoteAgentHome />
  const nav = useNav()
  const { leads, me, t, vendors } = useApp()
  const today = leads.filter((l) => dueKind(l.next?.date) === 'today' || dueKind(l.next?.date) === 'overdue')
  const active = leads.filter((l) => !['Lost', 'Inactive', 'Subscribed'].includes(l.stage))
  const conv = leads.filter((l) => l.stage === 'Subscribed').length
  const atRisk = leads.filter((l) => l.vendorId && ['grace', 'expired'].includes(vendors.find((v) => v.id === l.vendorId)?.sub.status)).length
  return (
    <Screen headerless pad={false}>
      <div className="bg-gradient-to-b from-brand-700 to-brand-600 px-4 pb-14 pt-3 text-white">
        <div className="mb-3 flex items-center gap-2"><Logo size={28} light /><span className="text-sm font-extrabold tracking-tight">VendorVerse</span></div>
        <div className="flex items-center justify-between"><div><p className="text-sm text-white/75">{t('hello')},</p><h1 className="text-xl font-extrabold">{(me.name || 'Neha Verma').split(' ')[0]} 👋</h1></div><div className="[&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:ring-brand-700"><NotifBell role="agent" /></div></div>
      </div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3"><Stat label="Active leads" value={active.length} icon={Users} tone="sky" onClick={() => nav.go('a_leads')} /><Stat label="Follow-ups due" value={today.length} icon={CalendarClock} tone="amber" onClick={() => nav.go('a_followups')} /><Stat label="Subscribed" value={conv} icon={BadgeCheck} tone="emerald" onClick={() => nav.go('a_perf')} /><Stat label="Renewals at risk" value={atRisk} icon={AlertTriangle} tone="rose" onClick={() => nav.go('a_perf')} /></div>
        <Banner tone="blue" title="What you can see">Only your assigned leads and their onboarding status. No customer bookings, private chats or verification decisions.</Banner>
        <Button full size="lg" icon={Plus} onClick={() => nav.go('a_lead_new')}>Add new lead</Button>
        <div className="grid grid-cols-2 gap-2"><Button full variant="secondary" onClick={() => nav.go('a_tasks')}>My tasks</Button><Button full variant="secondary" onClick={() => nav.go('a_perms')}>My permissions</Button></div>
        <Section title="Pipeline" action="Board" onAction={() => nav.go('a_leads')}>
          <PipelineFunnel leads={leads} onPick={(s) => nav.go('a_leads', { stage: s })} />
        </Section>
        <Section title="Today’s follow-ups" action="All" onAction={() => nav.go('a_followups')}>
          <div className="space-y-2.5">{today.slice(0, 3).map((l) => <LeadCard key={l.id} l={l} onClick={() => nav.go('a_lead', { id: l.id })} />)}{today.length === 0 && <Card className="text-center text-sm text-ink-500">Nothing due — great job! 🎉</Card>}</div>
        </Section>
      </div>
    </Screen>
  )
}

/* ================= LEADS ================= */
export function Leads({ params = {} }) {
  if (authService.isRemote) return <RemoteAgentLeads />
  const nav = useNav()
  const { leads, patchLead, toast } = useApp()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [view, setView] = useState('list')
  const [stage, setStage] = useState(params.stage || 'All')
  const base = leads.filter((l) => (type === 'all' || l.type === type) && (!q || l.name.toLowerCase().includes(q.toLowerCase()) || l.contact.toLowerCase().includes(q.toLowerCase())))
  const list = base.filter((l) => stage === 'All' || l.stage === stage)
  const move = (l) => {
    const next = STAGES[STAGES.indexOf(l.stage) + 1]
    if (LOCKED.includes(next)) return toast('Approval is set by Super Admin and subscription by billing — not by agents', 'warn')
    patchLead(l.id, { stage: next }); toast(`${l.name} → ${next}`)
  }
  return (
    <Screen title="Leads" back={false} right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('a_lead_new')}>Add</Button>}>
      <SearchBar value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or contact" />
      <div className="flex gap-2">
        <p className="flex-1 self-center text-xs font-semibold text-ink-500">Prospective vendors assigned to you</p>
        <div className="flex rounded-xl bg-ink-100 p-1">{[['list', List], ['board', Columns3]].map(([id, I]) => <button key={id} aria-label={`${id} view`} onClick={() => setView(id)} className={cx('grid w-10 place-items-center rounded-lg', view === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400')}><I size={17} /></button>)}</div>
      </div>
      {view === 'list' ? (
        <>
          <Chips value={stage} onChange={setStage} options={['All', ...STAGES]} />
          <p className="text-xs text-ink-500">{list.length} leads · only leads assigned to you are shown</p>
          <div className="space-y-2.5">{list.map((l) => <LeadCard key={l.id} l={l} onClick={() => nav.go('a_lead', { id: l.id })} />)}</div>
          {!list.length && <EmptyState icon={Users} title="No leads match" body="Try another stage or add a new lead." action={<Button size="sm" onClick={() => nav.go('a_lead_new')}>Add lead</Button>} />}
        </>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {STAGES.map((s) => {
            const col = base.filter((l) => l.stage === s)
            return (
              <div key={s} className="w-[236px] shrink-0 snap-start rounded-2xl bg-ink-100/70 p-2.5">
                <div className="mb-2.5 flex items-center justify-between px-1"><StageBadge s={s} /><span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold text-ink-600">{col.length}</span></div>
                <div className="space-y-2">
                  {col.map((l) => (
                    <div key={l.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-ink-100">
                      <button onClick={() => nav.go('a_lead', { id: l.id })} className="block w-full text-left">
                        <div className="flex items-center gap-2"><span className={cx('size-2 shrink-0 rounded-full', PRIORITY[l.priority])} /><p className="truncate text-[13px] font-bold">{l.name}</p></div>
                        <p className="mt-0.5 truncate text-[11px] text-ink-500">{cat(l.cat).name} · {l.city}</p>
                        {l.next?.date && <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600"><CalendarClock size={11} />{l.next.date}</p>}
                      </button>
                      {!['Subscribed', 'Lost', 'Inactive'].includes(s) && <button onClick={() => move(l)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-brand-50 py-1.5 text-[11px] font-bold text-brand-700 active:scale-95">Move to {LOCKED.includes(STAGES[STAGES.indexOf(s) + 1]) ? STAGES[STAGES.indexOf(s) + 1] + ' 🔒' : STAGES[STAGES.indexOf(s) + 1]}<ArrowRight size={12} /></button>}
                    </div>
                  ))}
                  {col.length === 0 && <p className="rounded-xl border border-dashed border-ink-300 py-6 text-center text-[11px] text-ink-400">No leads</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Screen>
  )
}

export function LeadNew() {
  if (authService.isRemote) return <RemoteAgentLeadNew />
  const nav = useNav()
  const { leads, setLeads, toast } = useApp()
  const [f, setF] = useState({ type: 'vendor', name: '', contact: '', phone: '', cat: 'home', city: 'Jaipur', source: 'Field visit', priority: 'Medium', notes: '', date: '2026-10-21' })
  const [errs, setErrs] = useState({})
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const save = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Enter the business name'
    if (f.contact.trim().length < 3) e.contact = 'Enter a contact person'
    const digits = f.phone.replace(/\D/g, '')
    if (!/^[6-9]\d{9}$/.test(digits)) e.phone = 'Enter a valid 10-digit mobile number'
    else if (leads.some((l) => l.phone.replace(/\D/g, '').endsWith(digits))) e.phone = 'A lead with this number already exists'
    setErrs(e)
    if (Object.keys(e).length) return
    const id = 'ld' + Date.now()
    setLeads((l) => [{ id, type: f.type, name: f.name, contact: f.contact, phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, cat: f.cat, city: f.city, source: f.source, priority: f.priority, stage: 'New', notes: f.notes, next: { date: isoToLabel(f.date), action: 'First contact' }, consent: false, docs: [], activities: [] }, ...l])
    toast('Lead created')
    nav.replace('a_lead', { id })
  }
  return (
    <Screen title="New lead" footer={<Button full size="lg" onClick={save}>Save lead</Button>}>
      <Banner tone="blue">Leads are prospective vendors you will help onboard. Add them only with a legitimate business reason.</Banner>
      <Input label="Business name" required value={f.name} onChange={set('name')} error={errs.name} />
      <Input label="Contact person" required value={f.contact} onChange={set('contact')} error={errs.contact} />
      <Input label="Phone" required icon={Phone} inputMode="numeric" maxLength={10} placeholder="98290 12345" value={f.phone} onChange={(e) => set('phone')(e.target.value.replace(/\D/g, ''))} error={errs.phone} className="!pl-10" />
      <div className="flex gap-3"><Select label="Category" value={f.cat} onChange={set('cat')} options={liveCats().map((c) => ({ value: c.id, label: c.name }))} /><Select label="City" value={f.city} onChange={set('city')} options={CITIES} /></div>
      <div className="flex gap-3"><Select label="Source" value={f.source} onChange={set('source')} options={['Field visit', 'Referral', 'Cold call', 'Walk-in', 'Social media', 'Event']} /><Select label="Priority" value={f.priority} onChange={set('priority')} options={['High', 'Medium', 'Low']} /></div>
      <Input label="First follow-up" type="date" value={f.date} onChange={set('date')} />
      <Input label="Notes" textarea rows={3} value={f.notes} onChange={set('notes')} placeholder="Anything useful for the next conversation" />
    </Screen>
  )
}

export function LeadDetail({ params }) {
  if (authService.isRemote) return <RemoteAgentLeadDetail params={params} />
  const nav = useNav()
  const { leads, patchLead, toast, vendors } = useApp()
  const l = leads.find((x) => x.id === (params.id || 'ld1'))
  const [stg, setStg] = useState(false)
  const [lost, setLost] = useState(null)
  const v = l.vendorId ? vendors.find((x) => x.id === l.vendorId) : null
  const stage = v ? (v.ver === 'approved' ? (['active', 'grace', 'cancelled'].includes(v.sub.status) ? 'Subscribed' : 'Approved') : l.stage) : l.stage
  const setStage = (s) => {
    if (LOCKED.includes(s)) return toast('Set automatically after Super Admin approval and subscription', 'warn')
    patchLead(l.id, { stage: s }); setStg(false); toast(`Moved to ${s}`)
  }
  return (
    <Screen
      title={l.name}
      subtitle="Prospective vendor"
      overlay={
        <Sheet open={stg} onClose={() => setStg(false)} title="Move to stage">
          <div className="space-y-2">{STAGES.map((s) => <button key={s} onClick={() => setStage(s)} className={cx('flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ring-1 ring-inset', s === stage ? 'bg-brand-50 ring-brand-300' : 'ring-ink-200')}><StageBadge s={s} />{s === stage ? <Check size={18} className="text-brand-600" /> : LOCKED.includes(s) ? <Lock size={15} className="text-ink-400" /> : null}</button>)}</div>
          <p className="text-xs text-ink-500"><Lock size={11} className="mr-1 inline" />Agents cannot approve vendors. “Approved” follows a reviewer’s decision and “Subscribed” follows a paid plan — both are set automatically.</p>
        </Sheet>
      }
      footer={<div className="flex gap-2"><Button variant="secondary" icon={Phone} onClick={() => toast(`Calling ${l.phone}…`)}>Call</Button><Button className="flex-1" icon={Plus} onClick={() => nav.go('a_log', { id: l.id })}>Log activity</Button>{!['Submitted for verification', 'Approved', 'Subscribed'].includes(stage) && <Button variant="soft" onClick={() => nav.go('a_onboard', { id: l.id })}>Onboard</Button>}</div>}
    >
      <Card>
        <div className="flex items-center gap-3"><Thumb tone={cat(l.cat).tone} icon={Store} size={54} /><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{l.name}</p><p className="text-sm text-ink-500">{l.contact} · {l.phone}</p></div></div>
        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3"><button onClick={() => setStg(true)} className="flex items-center gap-2"><StageBadge s={stage} /><span className="text-xs font-bold text-brand-700">Change</span></button><span className="flex items-center gap-1.5 text-xs font-semibold text-ink-600"><span className={cx('size-2.5 rounded-full', PRIORITY[l.priority])} />{l.priority} priority</span></div>
      </Card>
      <StageTracker stage={stage} />
      {v && <Card className="space-y-2"><p className="text-sm font-bold">Onboarding status</p><KV rows={[['Verification', <StatusBadge s={v.ver} />], ['Subscription', <StatusBadge s={v.sub.status === 'cancelled' ? 'sub_cancelled' : v.sub.status} />]]} />{v.sub.status === 'grace' && <p className="rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">Payment failed — help them renew before {v.sub.grace}. You can’t override billing.</p>}<p className="text-[11px] text-ink-400">You see onboarding progress only — not their bookings, quotes or chats.</p></Card>}
      <Card><KV rows={[['Category', cat(l.cat).name], ['City', l.city], ['Source', l.source], ['Consent', l.consent ? '✓ Given' : 'Not recorded']]} />{l.notes && <p className="mt-3 rounded-xl bg-ink-50 p-3 text-[13px] text-ink-600">{l.notes}</p>}</Card>
      {l.next?.date && <Card className="!bg-amber-50 !ring-amber-200"><div className="flex items-center gap-3"><CalendarClock size={22} className="text-amber-600" /><div><p className="text-sm font-bold">Next: {l.next.action}</p><p className="text-xs text-ink-600">{l.next.date}</p></div></div></Card>}
      {l.docs.length > 0 && <Section title="Documents collected"><div className="space-y-2">{l.docs.map((d) => <DocTile key={d} name={d} status="pending" note="Collected with consent" />)}</div></Section>}
      <Section title="Activity log">
        {l.activities.length === 0 ? <Card className="text-center text-sm text-ink-500">No activity yet. Log your first call, message or visit.</Card> : (
          <Card><Timeline steps={l.activities.map((a) => ({ label: `${a.kind[0].toUpperCase() + a.kind.slice(1)} · ${a.outcome}`, at: a.at, note: a.note, done: true }))} /></Card>
        )}
      </Section>
    </Screen>
  )
}

export function LogActivity({ params }) {
  if (authService.isRemote) return <RemoteAgentLogActivity params={params} />
  const nav = useNav()
  const { leads, patchLead, toast } = useApp()
  const l = leads.find((x) => x.id === (params.id || 'ld1'))
  const [f, setF] = useState({ kind: 'call', outcome: 'Connected', note: '', action: '', date: '' })
  const [err, setErr] = useState('')
  const save = () => {
    if (f.note.trim().length < 5) return setErr('Add a short note about the conversation')
    if (f.action && !f.date) return setErr('Select a date for the next action')
    patchLead(l.id, (x) => ({ stage: x.stage === 'New' ? 'Contacted' : x.stage, activities: [{ kind: f.kind, outcome: f.outcome, note: f.note, at: 'Just now' }, ...x.activities], next: f.action ? { date: isoToLabel(f.date), action: f.action } : x.next }))
    toast('Activity logged'); nav.back()
  }
  return (
    <Screen title="Log activity" subtitle={l.name} footer={<Button full size="lg" onClick={save}>Save</Button>}>
      <div className="grid grid-cols-3 gap-2">{[['call', 'Call', Phone], ['message', 'Message', MessageSquare], ['visit', 'Visit', MapPin]].map(([id, label, I]) => <button key={id} onClick={() => setF({ ...f, kind: id })} className={cx('flex flex-col items-center gap-1.5 rounded-2xl py-3.5 ring-1 ring-inset', f.kind === id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white ring-ink-200')}><I size={20} /><span className="text-xs font-semibold">{label}</span></button>)}</div>
      <Select label="Outcome" value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })} options={['Connected', 'No answer', 'Interested', 'Call back later', 'Docs collected', 'Declined']} />
      <Input label="Notes" required textarea rows={4} value={f.note} onChange={(e) => { setF({ ...f, note: e.target.value }); setErr('') }} placeholder="What was discussed?" />
      <Input label="Next action (optional)" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} placeholder="e.g. Share pricing deck" />
      <Input label="Follow-up date" type="date" value={f.date} onChange={(e) => { setF({ ...f, date: e.target.value }); setErr('') }} />
      {err && <p className="text-sm font-medium text-red-600">{err}</p>}
    </Screen>
  )
}

/* ================= FOLLOW-UPS ================= */
export function Followups() {
  if (authService.isRemote) return <RemoteAgentFollowups />
  const nav = useNav()
  const { leads, patchLead, toast } = useApp()
  const [tab, setTab] = useState('today')
  const scheduled = leads.filter((l) => l.next?.date)
  const groups = { overdue: scheduled.filter((l) => dueKind(l.next.date) === 'overdue'), today: scheduled.filter((l) => dueKind(l.next.date) === 'today'), upcoming: scheduled.filter((l) => dueKind(l.next.date) === 'upcoming') }
  const done = (l) => { patchLead(l.id, (x) => ({ next: { date: '', action: '' }, activities: [{ kind: 'call', outcome: 'Follow-up done', note: x.next.action, at: 'Just now' }, ...x.activities] })); toast('Follow-up marked done') }
  const snooze = (l) => { patchLead(l.id, (x) => { const d = new Date(x.next.date); d.setDate(d.getDate() + 1); return { next: { ...x.next, date: `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` } } }); toast('Snoozed by 1 day') }
  const list = groups[tab]
  return (
    <Screen title="Follow-ups" back={false}>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'overdue', label: 'Overdue', count: groups.overdue.length }, { id: 'today', label: 'Today', count: groups.today.length }, { id: 'upcoming', label: 'Upcoming', count: groups.upcoming.length }]} />
      <div className="space-y-2.5">
        {list.map((l) => (
          <Card key={l.id} className="!p-3.5">
            <button onClick={() => nav.go('a_lead', { id: l.id })} className="flex w-full items-center gap-3 text-left"><Avatar name={l.name} size={42} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{l.name}</p><p className="text-xs text-ink-500">{l.next.action}</p><p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock size={12} />{l.next.date}</p></div><StageBadge s={l.stage} /></button>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" icon={Phone} className="flex-1" onClick={() => toast(`Calling ${l.phone}…`)}>Call</Button><Button size="sm" variant="secondary" className="flex-1" onClick={() => snooze(l)}>Snooze</Button><Button size="sm" className="flex-1" icon={Check} onClick={() => done(l)}>Done</Button></div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={CalendarClock} title={`No ${tab} follow-ups`} body="Schedule follow-ups from a lead’s detail page." />}
      </div>
    </Screen>
  )
}

/* ================= ASSISTED ONBOARDING ================= */
export function Onboard({ params }) {
  if (authService.isRemote) return <RemoteAgentUnavailable title="Assisted onboarding" />
  const nav = useNav()
  const { leads, patchLead, setVendors, notify, toast, stamp } = useApp()
  const l = leads.find((x) => x.id === (params.id || 'ld1'))
  const [step, setStep] = useState(l.consent ? 1 : 0)
  const [consent, setConsent] = useState(l.consent)
  const [f, setF] = useState({ name: l.name, owner: l.contact, gstin: '', email: '' })
  const ADOCS = cat(l.cat).docs
  const [docs, setDocs] = useState(Object.fromEntries(l.docs.map((d) => [d, true])))
  const [errs, setErrs] = useState({})
  const next = () => {
    const e = {}
    if (step === 0 && !consent) e.c = 'Consent is required before collecting any information'
    if (step === 1) {
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.toUpperCase())) e.gstin = 'Enter a valid 15-character GSTIN'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email'
    }
    if (step === 2 && ADOCS.some((d) => !docs[d])) e.docs = 'Collect all required documents to submit'
    setErrs(e)
    if (Object.keys(e).length) return
    if (step === 0) patchLead(l.id, { consent: true, stage: ['New', 'Contacted', 'Interested'].includes(l.stage) ? 'Registration started' : l.stage })
    if (step < 2) return setStep(step + 1)
    const id = 'v-ag' + Date.now()
    setVendors((vs) => [{ id, name: f.name, owner: f.owner, cat: l.cat, city: l.city, areas: [l.city], branches: 1, acct: 'pending', ver: 'submitted', tone: cat(l.cat).tone, since: 2024, gstin: f.gstin.toUpperCase(), phone: l.phone, email: f.email, resp: null, jobs: 0, rating: 0, reviews: 0, langs: ['Hindi'], agent: 'Neha Verma', docs: ADOCS.map((d) => ({ name: d, status: 'pending' })), sub: { plan: 'Free', status: 'none', renews: '—', paidUntil: null, autoRenew: false, leads: 0 }, history: [{ s: 'submitted', at: stamp(), by: 'Neha Verma (agent, with owner consent)' }] }, ...vs])
    patchLead(l.id, { stage: 'Submitted for verification', docs: Object.keys(docs).filter((d) => docs[d]), vendorId: id })
    notify('admin', 'Vendor submitted by agent', `${f.name} — assisted onboarding by Neha Verma.`, 'onboarding', ['ad_vendors', {}])
    toast('Submitted for verification — a reviewer decides')
    nav.back()
  }
  return (
    <Screen title="Assisted onboarding" subtitle={l.name} footer={<Button full size="lg" onClick={next}>{step === 2 ? 'Submit for approval' : step === 0 ? 'I have the owner’s consent' : 'Continue'}</Button>}>
      <Stepper steps={['Consent', 'Details', 'Documents']} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <Banner tone="blue" title="Consent first">You may only collect documents and personal data on the owner’s behalf with their explicit consent.</Banner>
          <Card className="space-y-2 text-sm text-ink-600"><p className="font-bold text-ink-900">Read out to the owner</p><p>“VendorVerse will use your business details and documents only to verify and onboard your business. You can withdraw consent at any time, and your data is stored securely.”</p></Card>
          <Checkbox checked={consent} onChange={(v) => { setConsent(v); setErrs({}) }}>The owner, <b>{l.contact}</b>, has given verbal/written consent for me to collect and submit their data on their behalf.</Checkbox>
          {errs.c && <p className="text-xs font-medium text-red-600">{errs.c}</p>}
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <Input label="Business name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} />
          <Input label="GSTIN" required placeholder="08ABCPS1234F1Z5" maxLength={15} value={f.gstin} onChange={(e) => { setF({ ...f, gstin: e.target.value.toUpperCase() }); setErrs({}) }} error={errs.gstin} />
          <Input label="Business email" required type="email" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); setErrs({}) }} error={errs.email} />
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <Banner tone="amber" title="Assist, don’t decide">You can’t approve verification, publish listings as the vendor or touch billing. A reviewer decides, and the vendor subscribes themselves.</Banner>
          {ADOCS.map((d) => <DocTile key={d} name={d} status={docs[d] ? 'pending' : 'missing'} note={docs[d] ? 'Captured with consent' : 'Required'} onAction={() => setDocs({ ...docs, [d]: !docs[d] })} actionLabel={docs[d] ? 'Remove' : 'Capture'} />)}
          {errs.docs && <p className="text-xs font-medium text-red-600">{errs.docs}</p>}
        </div>
      )}
    </Screen>
  )
}

/* ================= PERFORMANCE (assigned sales metrics only) ================= */
export function AgentPerformance() {
  if (authService.isRemote) return <RemoteAgentPerformance />
  const nav = useNav()
  const { leads, vendors } = useApp()
  const reg = leads.filter((l) => ['Submitted for verification', 'Approved', 'Subscribed'].includes(l.stage)).length
  const appr = leads.filter((l) => ['Approved', 'Subscribed'].includes(l.stage)).length
  const subd = leads.filter((l) => l.stage === 'Subscribed').length
  const risk = leads.filter((l) => l.vendorId && ['grace', 'expired'].includes(vendors.find((v) => v.id === l.vendorId)?.sub.status))
  return (
    <Screen title="Performance" back={false}>
      <div className="grid grid-cols-3 gap-2">{[['Registered', reg, 'sky'], ['Approved', appr, 'teal'], ['Subscribed', subd, 'emerald']].map(([a, b, t]) => <Card key={a} className="!p-3 text-center"><p className="text-2xl font-extrabold">{b}</p><p className="text-[11px] text-ink-500">{a}</p></Card>)}</div>
      <Card className="space-y-3"><p className="text-sm font-bold">Conversion</p><HBar label="Leads → registered" value={reg} max={leads.length || 1} right={`${Math.round((reg / (leads.length || 1)) * 100)}%`} /><HBar label="Registered → approved" value={appr} max={reg || 1} right={`${Math.round((appr / (reg || 1)) * 100)}%`} color="bg-sky-500" /><HBar label="Approved → subscribed" value={subd} max={appr || 1} right={`${Math.round((subd / (appr || 1)) * 100)}%`} color="bg-emerald-500" /></Card>
      {risk.length > 0 && <Section title="Renewals at risk"><div className="space-y-2.5">{risk.map((l) => <LeadCard key={l.id} l={l} onClick={() => nav.go('a_lead', { id: l.id })} />)}</div></Section>}
      <Banner tone="blue" title="Scope of your access">You see conversion for your own leads only. Subscription status is shown to help vendors renew — you can’t change billing, approve verification or read customer transactions.</Banner>
    </Screen>
  )
}

export function AgentProfile() {
  const nav = useNav()
  const { me, setMe, lang, setLang, toast, leads } = useApp()
  const conv = leads.filter((l) => l.stage === 'Subscribed').length
  return (
    <Screen title="Profile" back={false} pad={false} right={<LangButton />}>
      <div className="space-y-4 p-4">
        <Card className="!p-4"><div className="flex items-center gap-3.5"><Avatar name={me.name || 'Neha Verma'} size={60} /><div><p className="text-lg font-extrabold">{me.name || 'Neha Verma'}</p><p className="text-sm text-ink-500">Sales Agent · Jaipur North</p><Badge tone="teal" className="mt-1.5">ID SA-0142</Badge></div></div></Card>
        <div className="grid grid-cols-3 gap-2">{[['Leads', leads.length], ['Subscribed', conv], ['Rate', `${Math.round((conv / leads.length) * 100)}%`]].map(([a, b]) => <Card key={a} className="!p-3 text-center"><p className="text-lg font-extrabold">{b}</p><p className="text-[11px] text-ink-500">{a}</p></Card>)}</div>
        <Card><p className="mb-2 text-sm font-bold">Monthly target</p><HBar label="Vendors registered" value={4} max={6} right="4 / 6" /><div className="mt-3"><HBar label="Vendors subscribed" value={2} max={4} right="2 / 4" color="bg-emerald-500" /></div></Card>
        <Group>
          <ListRow icon={Globe} tone="sky" title="Language" subtitle={lang === 'en' ? 'English' : 'हिन्दी'} onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} />
          <ListRow icon={Bell} tone="orange" title="Notifications" onClick={() => nav.go('notifications')} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Permissions" subtitle="Assigned leads only · no approval or billing rights" onClick={() => toast('Agents cannot approve verification, publish listings or change platform settings')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: null, hasVendor: false, name: '' }); nav.reset('welcome') }}>Log out</Button>
      </div>
    </Screen>
  )
}

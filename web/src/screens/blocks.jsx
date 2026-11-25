import { useState } from 'react'
import { Badge, Banner, Button, Card, Group, KV, ListRow, Section, Screen, Timeline } from '../ui.jsx'
import { useNav } from '../nav.jsx'
import { useApp } from '../store.jsx'

/* Shared building blocks for the Phase 1 / Phase 2 sync screens (docs/03-mockup-sync-matrix.md). */

export const P2Badge = () => <Badge tone="purple">Phase 2</Badge>
export const SampleBadge = () => <Badge tone="amber">Sample value · CFG open</Badge>

export function Phase2Notice({ children }) {
  return <Banner tone="gray" title="Phase 2 preview">{children || 'Shown so stakeholders can see the roadmap. This feature is not part of the Phase 1 launch.'}</Banner>
}

/* Page: a Screen with an optional Phase 2 badge in the header. */
export function Page({ title, subtitle, phase2, right, children, footer, overlay, back = true, onBack, headerClass, scrollClass, bg }) {
  return <Screen title={title} subtitle={subtitle} back={back} onBack={onBack} overlay={overlay} right={<>{right}{phase2 ? <span className="px-2"><P2Badge /></span> : null}</>} footer={footer} headerClass={headerClass} scrollClass={scrollClass} bg={bg}>
    {phase2 && <Phase2Notice />}
    {children}
  </Screen>
}

/* Rows of label/value pairs inside a card. */
export function Facts({ title, rows }) {
  return <Card>{title && <p className="mb-3 text-sm font-bold">{title}</p>}<KV rows={rows} /></Card>
}

/* Static list of links to other screens. */
export function Links({ items, title }) {
  const nav = useNav()
  return <Section title={title}><Group>{items.map(([icon, label, sub, to, params], i) => <ListRow key={label} icon={icon} title={label} subtitle={sub} onClick={() => nav.go(to, params || {})} last={i === items.length - 1} />)}</Group></Section>
}

/* A checklist whose items show done / blocked, used by gates and onboarding. */
export function Checklist({ items }) {
  return <Group>{items.map(([label, ok, note], i) => <ListRow key={label} title={label} subtitle={note} right={<Badge tone={ok ? 'green' : 'amber'}>{ok ? 'Met' : 'Open'}</Badge>} last={i === items.length - 1} />)}</Group>
}

/* Tabs to preview each UI state of a screen (loading, empty, error, ...). */
export function StatePreview({ states }) {
  const [id, setId] = useState(states[0].id)
  const cur = states.find((s) => s.id === id)
  return <div className="space-y-3">
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{states.map((s) => <button key={s.id} onClick={() => setId(s.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${id === s.id ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-600 ring-ink-200'}`}>{s.label}</button>)}</div>
    {cur.node}
  </div>
}

/* Mock status stepper that the user can advance, to show a lifecycle. */
export function Lifecycle({ steps, start = 0, onChange, advanceLabel = 'Advance status' }) {
  const [i, setI] = useState(start)
  const { toast } = useApp()
  return <Card>
    <Timeline steps={steps.map((s, k) => ({ label: s, done: k < i, current: k === i }))} />
    {i < steps.length - 1 && <Button className="mt-4" size="sm" variant="soft" onClick={() => { setI(i + 1); onChange?.(steps[i + 1]); toast(`Status: ${steps[i + 1]}`) }}>{advanceLabel}</Button>}
  </Card>
}

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { format, isValid, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { DeliveryTwinResult } from '@/core/intelligence/delivery-twin/deliveryTwinTypes'

type TimelineEvent = {
  id: string
  event_type: string
  occurred_at: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  title?: string | null
  payload: Record<string, unknown> | null
}

type Snapshot = {
  date: string
  label: string
  progress: number
  health: number
  eventCount: number
  newDelays: number
  completed: number
  risksOpened: number
  risksClosed: number
  approvals: number
  receipts: number
  highlights: string[]
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const numeric = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const readable = (event: TimelineEvent) =>
  event.title || event.event_type.toLowerCase().replace(/_/g, ' ').replace(/^./, value => value.toUpperCase())

function currentHealth(twin: DeliveryTwinResult) {
  return Math.round(twin.packages.reduce((sum, item) => sum + item.healthScore, 0) / Math.max(1, twin.packages.length))
}

function buildSnapshots(events: TimelineEvent[], twin: DeliveryTwinResult): Snapshot[] {
  if (!events.length) return [{
    date: twin.generatedAt,
    label: 'Current state',
    progress: twin.overallProgress,
    health: currentHealth(twin),
    eventCount: 0,
    newDelays: 0,
    completed: 0,
    risksOpened: 0,
    risksClosed: 0,
    approvals: 0,
    receipts: 0,
    highlights: ['Live delivery state. Historical positions will appear as project events accumulate.'],
  }]

  const ordered = [...events].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
  const days = new Map<string, TimelineEvent[]>()
  ordered.forEach(event => {
    const parsed = parseISO(event.occurred_at)
    if (!isValid(parsed)) return
    const key = format(parsed, 'yyyy-MM-dd')
    days.set(key, [...(days.get(key) || []), event])
  })

  const activityProgress = new Map<string, number>()
  let health = 100
  let processed = 0
  const snapshots: Snapshot[] = []

  days.forEach((dayEvents, key) => {
    let newDelays = 0
    let completed = 0
    let risksOpened = 0
    let risksClosed = 0
    let approvals = 0
    let receipts = 0

    dayEvents.forEach(event => {
      processed += 1
      const payload = record(event.payload)
      const after = record(payload.after)
      const entityId = String(after.id || payload.entityId || event.id)
      const progress = numeric(after.progress ?? after.progress_pct ?? payload.progress)
      if (progress !== null && event.event_type.startsWith('ACTIVITY_')) activityProgress.set(entityId, progress)
      if (event.event_type === 'ACTIVITY_DELAYED') newDelays += 1
      if (event.event_type === 'ACTIVITY_COMPLETED') completed += 1
      if (event.event_type === 'RISK_CREATED' || event.event_type === 'RISK_ESCALATED') risksOpened += 1
      if (event.event_type === 'RISK_CLOSED') risksClosed += 1
      if (event.event_type === 'APPROVAL_GRANTED') approvals += 1
      if (event.event_type === 'PROCUREMENT_RECEIVED') receipts += 1
      if (event.event_type === 'HEALTH_RECALCULATED') {
        const score = numeric(payload.score ?? record(payload.health).score)
        if (score !== null) health = Math.max(0, Math.min(100, Math.round(score)))
      }
    })

    const observed = activityProgress.size
      ? Math.round([...activityProgress.values()].reduce((sum, value) => sum + value, 0) / activityProgress.size)
      : Math.round((processed / ordered.length) * twin.overallProgress)

    const priority = (value: TimelineEvent['priority']) => value === 'critical' ? 3 : value === 'high' ? 2 : 1
    snapshots.push({
      date: `${key}T12:00:00.000Z`,
      label: format(parseISO(`${key}T12:00:00.000Z`), 'd MMM yyyy'),
      progress: Math.min(twin.overallProgress, observed),
      health,
      eventCount: dayEvents.length,
      newDelays,
      completed,
      risksOpened,
      risksClosed,
      approvals,
      receipts,
      highlights: [...dayEvents].sort((a, b) => priority(b.priority) - priority(a.priority)).slice(0, 3).map(readable),
    })
  })

  const last = snapshots[snapshots.length - 1]
  if (last && (last.progress !== twin.overallProgress || last.date.slice(0, 10) !== twin.generatedAt.slice(0, 10))) {
    snapshots.push({ ...last, date: twin.generatedAt, label: 'Today', progress: twin.overallProgress, health: currentHealth(twin), eventCount: 0, highlights: ['Live project state'] })
  }
  return snapshots
}

export default function ProjectTwinTimeMachine({ twin }: { twin: DeliveryTwinResult }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [speed, setSpeed] = useState(1200)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const { data } = await supabase.from('project_activity_feed')
        .select('id,event_type,occurred_at,priority,title,payload')
        .eq('project_id', twin.projectId).order('occurred_at', { ascending: true }).limit(500)
      if (active) { setEvents((data || []) as TimelineEvent[]); setLoading(false) }
    })()
    return () => { active = false }
  }, [twin.projectId])

  const snapshots = useMemo(() => buildSnapshots(events, twin), [events, twin])
  useEffect(() => setIndex(Math.max(0, snapshots.length - 1)), [snapshots.length])
  useEffect(() => {
    if (!playing || snapshots.length < 2) return
    const timer = window.setInterval(() => setIndex(current => {
      if (current >= snapshots.length - 1) { setPlaying(false); return current }
      return current + 1
    }), speed)
    return () => window.clearInterval(timer)
  }, [playing, snapshots.length, speed])

  const snapshot = snapshots[index] || snapshots[0]
  const previous = snapshots[Math.max(0, index - 1)] || snapshot
  const delta = snapshot.progress - previous.progress

  return <section className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]"><RotateCcw size={14}/> Project time machine</div><p className="mt-1 text-sm text-[var(--pmx-muted)]">Replay the event-backed delivery history and inspect how the project position changed.</p></div>
      <div className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface)] px-3 py-2 text-right"><div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Selected point</div><div className="mt-0.5 text-sm font-semibold text-[var(--pmx-text)]">{snapshot.label}</div></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[['Replayed progress', `${snapshot.progress}%`, `${delta >= 0 ? '+' : ''}${delta}% step`], ['Health at point', `${snapshot.health}%`, ''], ['Events in period', String(snapshot.eventCount), ''], ['Schedule movement', `${snapshot.completed} complete`, `${snapshot.newDelays} new delays`]].map(([label, value, note]) => <div key={label} className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3"><div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">{label}</div><div className="mt-1 flex items-end gap-2"><span className="text-xl font-semibold text-[var(--pmx-text)]">{value}</span>{note && <span className="pb-0.5 text-xs text-[var(--pmx-muted)]">{note}</span>}</div></div>)}
    </div>
    <div className="mt-4 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3">
      <input aria-label="Project history point" type="range" min={0} max={Math.max(0, snapshots.length - 1)} value={index} onChange={event => { setPlaying(false); setIndex(Number(event.target.value)) }} className="w-full accent-[var(--pmx-primary)]"/>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2">
        <button type="button" onClick={() => setIndex(value => Math.max(0, value - 1))} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--pmx-border)] text-[var(--pmx-text)] disabled:opacity-40"><ChevronLeft size={16}/></button>
        <button type="button" onClick={() => setPlaying(value => !value)} disabled={snapshots.length < 2} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--pmx-primary)] px-3 text-xs font-semibold text-white disabled:opacity-40">{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => setIndex(value => Math.min(snapshots.length - 1, value + 1))} disabled={index >= snapshots.length - 1} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--pmx-border)] text-[var(--pmx-text)] disabled:opacity-40"><ChevronRight size={16}/></button>
      </div><label className="flex items-center gap-2 text-xs text-[var(--pmx-muted)]">Speed <select value={speed} onChange={event => setSpeed(Number(event.target.value))} className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] px-2 py-1.5 text-[var(--pmx-text)]"><option value={1800}>0.5×</option><option value={1200}>1×</option><option value={650}>2×</option></select></label></div>
    </div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]"><div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--pmx-text)]"><Sparkles size={14}/> Executive period insight</div><div className="mt-2 space-y-1.5 text-sm text-[var(--pmx-muted)]">{snapshot.highlights.map((item, i) => <div key={`${item}-${i}`}>• {item}</div>)}{(snapshot.risksOpened || snapshot.risksClosed) && <div>• Risk movement: {snapshot.risksOpened} opened/escalated and {snapshot.risksClosed} closed.</div>}{(snapshot.approvals || snapshot.receipts) && <div>• Delivery enablers: {snapshot.approvals} approvals and {snapshot.receipts} procurement receipts.</div>}</div></div><div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3 text-xs leading-5 text-[var(--pmx-muted)]">{loading ? 'Loading project event history…' : events.length ? `${events.length} persisted events available for replay.` : 'No persisted activity-feed events were found. This view will populate automatically as events are published.'}</div></div>
  </section>
}

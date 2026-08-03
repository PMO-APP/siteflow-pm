import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  GitBranch,
  History,
  Network,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProjectRow = {
  project: any
  progress: number
  plannedProgress: number
  scheduleVariance: number
  delayDays: number
  recoveryConfidence: number
  score: number
  health: string
  highRisks: number
  openRisks: number
  openSnags: number
  pendingApprovals: number
  pendingProcurement: number
  delayedProcurement: number
  overdueTasks: number
  failedQualityGates: number
  openIncidents: number
  dependencyResources: Array<{ companyName: string; role: string }>
}

type Props = {
  rows: ProjectRow[]
  portfolioProgress: number
  portfolioConfidence: number
  onOpenProject: (projectId: string | number) => void
}

type View = 'twin' | 'heatmap' | 'dependencies' | 'decisions' | 'replay'

type ActivityEvent = {
  id: string
  project_id: string | number
  event_type?: string
  title?: string
  summary?: string
  priority?: string
  created_at?: string
}

const views: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: 'twin', label: 'Portfolio twin', icon: Building2 },
  { id: 'heatmap', label: 'Heat map', icon: Activity },
  { id: 'dependencies', label: 'Dependencies', icon: Network },
  { id: 'decisions', label: 'Decision centre', icon: Sparkles },
  { id: 'replay', label: 'Replay', icon: History },
]

export function ExecutiveCommandCentre({ rows, portfolioProgress, portfolioConfidence, onOpenProject }: Props) {
  const [view, setView] = useState<View>('twin')
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [replayIndex, setReplayIndex] = useState(0)

  useEffect(() => {
    let active = true
    const projectIds = rows.map(row => row.project.id).filter(Boolean)
    if (!projectIds.length) {
      setEvents([])
      return () => { active = false }
    }

    Promise.all([
      supabase.from('project_activity_feed')
        .select('id, project_id, event_type, title, summary, priority, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true })
        .limit(500),
      supabase.from('audit_logs')
        .select('id, project_id, action, module, description, severity, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true })
        .limit(500),
      supabase.from('project_health_snapshots')
        .select('id, project_id, overall_score, health_label, summary, calculated_at')
        .in('project_id', projectIds)
        .order('calculated_at', { ascending: true })
        .limit(500),
    ]).then(([activityResult, auditResult, healthResult]) => {
      if (!active) return
      const activityEvents = (activityResult.data || []).map((item: any) => ({
        id: `activity-${item.id}`, project_id: item.project_id,
        event_type: item.event_type || 'project activity',
        title: item.title, summary: item.summary, priority: item.priority,
        created_at: item.created_at,
      }))
      const auditEvents = (auditResult.data || []).map((item: any) => ({
        id: `audit-${item.id}`, project_id: item.project_id,
        event_type: item.action || item.module || 'audit event',
        title: `${item.action || 'Update'} · ${item.module || 'project'}`,
        summary: item.description, priority: item.severity,
        created_at: item.created_at,
      }))
      const healthEvents = (healthResult.data || []).map((item: any) => ({
        id: `health-${item.id}`, project_id: item.project_id,
        event_type: 'health snapshot',
        title: `${item.health_label || 'Health'} · ${Math.round(Number(item.overall_score || 0))}%`,
        summary: item.summary || 'Project health position recalculated.',
        priority: Number(item.overall_score || 0) < 50 ? 'critical' : 'normal',
        created_at: item.calculated_at,
      }))
      const combined = [...activityEvents, ...auditEvents, ...healthEvents]
        .filter(item => item.created_at)
        .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
      setEvents(combined)
      setReplayIndex(Math.max(0, combined.length - 1))
    })
    return () => { active = false }
  }, [rows, portfolioProgress])


  const portfolio = useMemo(() => {
    const averageHealth = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0
    const averageProgress = portfolioProgress
    const atRisk = rows.filter(row => row.score < 65).length
    const deliveryConfidence = portfolioConfidence
    return { averageHealth, averageProgress, atRisk, deliveryConfidence }
  }, [rows, portfolioProgress, portfolioConfidence])

  const decisions = useMemo(() => rows.flatMap(row => buildDecisions(row)).sort((a, b) => b.weight - a.weight).slice(0, 8), [rows])
  const dependencies = useMemo(() => buildSharedDependencies(rows), [rows])
  const selectedEvent = events[replayIndex]
  const replayDate = selectedEvent?.created_at ? new Date(selectedEvent.created_at) : null

  return (
    <section className="mt-6 overflow-hidden rounded-[26px] border border-[#d7e2e5] bg-[#102f47] text-white shadow-[0_18px_50px_rgba(16,47,71,0.14)]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a9c1ce]"><Sparkles size={13} /> Executive command centre</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">One operational view across the portfolio.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#bfd0d8]">Live project position, pressure points, shared delivery exposure and the decisions with the greatest portfolio impact.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CommandMetric label="Health" value={`${portfolio.averageHealth}%`} />
            <CommandMetric label="Progress" value={`${portfolio.averageProgress}%`} />
            <CommandMetric label="At risk" value={portfolio.atRisk} alert={portfolio.atRisk > 0} />
            <CommandMetric label="Confidence" value={`${portfolio.deliveryConfidence}%`} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {views.map(item => {
            const Icon = item.icon
            return <button key={item.id} onClick={() => setView(item.id)} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${view === item.id ? 'bg-white text-[#173f5f]' : 'border border-white/15 bg-white/5 text-[#c8d8df] hover:bg-white/10'}`}><Icon size={14} />{item.label}</button>
          })}
        </div>
      </div>

      <div className="bg-[#f7f9f8] p-5 text-[#183044] sm:p-7">
        {view === 'twin' && <PortfolioTwin rows={rows} onOpenProject={onOpenProject} />}
        {view === 'heatmap' && <PortfolioHeatMap rows={rows} onOpenProject={onOpenProject} />}
        {view === 'dependencies' && <DependencyView dependencies={dependencies} />}
        {view === 'decisions' && <DecisionView decisions={decisions} onOpenProject={onOpenProject} />}
        {view === 'replay' && <ReplayView events={events} replayIndex={replayIndex} setReplayIndex={setReplayIndex} selectedEvent={selectedEvent} replayDate={replayDate} rows={rows} />}
      </div>
    </section>
  )
}

function PortfolioTwin({ rows, onOpenProject }: Pick<Props, 'rows' | 'onOpenProject'>) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {rows.slice().sort((a, b) => a.score - b.score).map(row => {
      const blocker = primaryBlocker(row)
      const forecastDays = Math.max(0, row.delayDays)
      return <button key={row.project.id} onClick={() => onOpenProject(row.project.id)} className="group rounded-2xl border border-[#dce5e8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#a9c2cd] hover:shadow-md">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8799a1]">{row.project.status || row.project.phase || 'Active project'}</div><h3 className="mt-1 text-lg font-semibold text-[#173f5f]">{nameOf(row.project)}</h3></div><HealthDot score={row.score} /></div>
        <div className="mt-5 grid grid-cols-3 gap-3"><SmallMetric label="Health" value={`${row.score}%`} /><SmallMetric label="Progress" value={`${row.progress}%`} /><SmallMetric label="Forecast" value={forecastDays ? `+${forecastDays}d` : 'On plan'} alert={forecastDays > 7} /></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e9eff1]"><div className="h-full rounded-full bg-[#2f6f91]" style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }} /></div>
        <div className="mt-4 rounded-xl bg-[#f4f7f7] p-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8799a1]">Primary blocker</div><div className="mt-1 text-sm font-semibold text-[#405b69]">{blocker}</div></div>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#2f6f91]"><span>Open project command centre</span><ArrowRight size={14} className="transition group-hover:translate-x-1" /></div>
      </button>
    })}
  </div>
}

function PortfolioHeatMap({ rows, onOpenProject }: Pick<Props, 'rows' | 'onOpenProject'>) {
  const dimensions = [
    { key: 'schedule', label: 'Schedule delay', value: (row: ProjectRow) => Math.max(0, row.delayDays) },
    { key: 'risk', label: 'Risk', value: (row: ProjectRow) => Math.min(100, row.highRisks * 22 + row.openRisks * 4) },
    { key: 'approvals', label: 'Approvals', value: (row: ProjectRow) => Math.min(100, row.pendingApprovals * 12) },
    { key: 'procurement', label: 'Procurement', value: (row: ProjectRow) => Math.min(100, row.delayedProcurement * 25 + row.pendingProcurement * 5) },
    { key: 'quality', label: 'Quality', value: (row: ProjectRow) => Math.min(100, row.failedQualityGates * 25 + row.openSnags * 3) },
    { key: 'hse', label: 'HSE', value: (row: ProjectRow) => Math.min(100, row.openIncidents * 35) },
  ]
  return <div className="overflow-x-auto rounded-2xl border border-[#dce5e8] bg-white">
    <table className="w-full min-w-[920px] border-collapse text-left">
      <thead><tr className="border-b border-[#e2e9eb] bg-[#f5f8f8] text-[10px] font-bold uppercase tracking-[0.13em] text-[#7c8f98]"><th className="px-4 py-3">Project</th>{dimensions.map(d => <th key={d.key} className="px-3 py-3 text-center">{d.label}</th>)}<th className="px-4 py-3">Overall</th></tr></thead>
      <tbody>{rows.slice().sort((a,b) => a.score-b.score).map(row => <tr key={row.project.id} className="border-b border-[#edf2f2] last:border-0"><td className="px-4 py-4"><button onClick={() => onOpenProject(row.project.id)} className="font-semibold text-[#173f5f] hover:text-[#2f6f91]">{nameOf(row.project)}</button></td>{dimensions.map(d => <td key={d.key} className="px-3 py-3"><PressureCell value={d.value(row)} /></td>)}<td className="px-4 py-3"><div className="flex items-center gap-2"><HealthDot score={row.score} /><span className="font-semibold text-[#405b69]">{row.score}%</span></div></td></tr>)}</tbody>
    </table>
  </div>
}

function DependencyView({ dependencies }: { dependencies: ReturnType<typeof buildSharedDependencies> }) {
  return <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
    <div className="rounded-2xl border border-[#dce5e8] bg-white p-5"><div className="flex items-center gap-2"><GitBranch size={17} className="text-[#2f6f91]" /><h3 className="font-semibold text-[#173f5f]">Cross-project exposure</h3></div><div className="mt-4 space-y-3">{dependencies.length ? dependencies.map(item => <div key={item.label} className="rounded-xl border border-[#e3eaec] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-[#173f5f]">{item.label}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a9aa2]">{item.roles.join(' · ') || 'Delivery partner'}</div><div className="mt-1 text-xs text-[#7a8e98]">{item.projects.join(' • ')}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.projectCount >= 3 ? 'bg-[#fff0e9] text-[#c95b36]' : 'bg-[#eef3f4] text-[#2f6f91]'}`}>{item.projectCount} projects</span></div><div className="mt-3 text-sm text-[#5d727d]">{item.projectCount >= 3 ? 'Portfolio-wide single point of failure. Confirm capacity and escalation cover.' : 'Shared delivery dependency. Coordinate dates and ownership across projects.'}</div></div>) : <EmptyMessage text="No verified cross-project dependency is available yet. Add contractor, consultant, vendor or specialist company names on each project’s Team page. A company will appear here only when it is assigned to two or more projects." />}</div></div>
    <div className="rounded-2xl border border-[#dce5e8] bg-white p-5"><div className="flex items-center gap-2"><UsersRound size={17} className="text-[#2f6f91]" /><h3 className="font-semibold text-[#173f5f]">Executive interpretation</h3></div><div className="mt-5 space-y-4"><Insight icon={ShieldAlert} title="Capacity concentration" text={`${dependencies.filter(d => d.projectCount >= 3).length} shared resources currently span three or more projects.`} /><Insight icon={Network} title="Coordination priority" text="Use this view to identify contractors, consultants or specialist firms carrying work across several projects before approving overlapping recovery plans." /><Insight icon={CheckCircle2} title="Control safeguard" text="Dependencies are advisory and do not automatically alter project ownership, programme or contracts." /></div></div>
  </div>
}

function DecisionView({ decisions, onOpenProject }: { decisions: ReturnType<typeof buildDecisions>; onOpenProject: Props['onOpenProject'] }) {
  return <div className="grid gap-4 lg:grid-cols-2">{decisions.length ? decisions.map((decision, index) => <div key={`${decision.projectId}-${decision.title}`} className="rounded-2xl border border-[#dce5e8] bg-white p-5"><div className="flex items-start gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${index < 3 ? 'bg-[#fff0e9] text-[#d86335]' : 'bg-[#eaf1f4] text-[#2f6f91]'}`}>{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#173f5f]">{decision.title}</h3><span className="rounded-full bg-[#f0f4f5] px-2 py-1 text-[10px] font-bold text-[#607985]">{decision.priority}</span></div><div className="mt-1 text-xs font-semibold text-[#7b8e97]">{decision.projectName}</div><p className="mt-3 text-sm leading-6 text-[#5c727d]">{decision.reason}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs font-semibold text-[#2f6f91]">Expected impact: {decision.impact}</span><button onClick={() => onOpenProject(decision.projectId)} className="inline-flex items-center gap-1 text-xs font-bold text-[#173f5f] hover:text-[#2f6f91]">View evidence <ArrowRight size={13} /></button></div></div></div></div>) : <EmptyMessage text="No portfolio intervention is currently required." />}</div>
}

function ReplayView({ events, replayIndex, setReplayIndex, selectedEvent, replayDate, rows }: { events: ActivityEvent[]; replayIndex: number; setReplayIndex: (value: number) => void; selectedEvent?: ActivityEvent; replayDate: Date | null; rows: ProjectRow[] }) {
  const project = rows.find(row => String(row.project.id) === String(selectedEvent?.project_id))
  return <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
    <div className="rounded-2xl border border-[#dce5e8] bg-white p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#82949d]">Portfolio time machine</div><h3 className="mt-1 text-lg font-semibold text-[#173f5f]">Replay executive events</h3></div><CalendarClock className="text-[#2f6f91]" size={22} /></div>{events.length ? <><input className="mt-7 w-full accent-[#2f6f91]" type="range" min={0} max={events.length - 1} value={replayIndex} onChange={e => setReplayIndex(Number(e.target.value))} /><div className="mt-3 flex justify-between text-xs text-[#82949d]"><span>{events[0]?.created_at ? new Date(events[0].created_at).toLocaleDateString() : 'Start'}</span><span>{replayDate?.toLocaleString() || 'Current'}</span><span>{events[events.length - 1]?.created_at ? new Date(events[events.length - 1].created_at!).toLocaleDateString() : 'Today'}</span></div><div className="mt-6 rounded-xl bg-[#f4f7f7] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#82949d]">Selected event</div><div className="mt-2 font-semibold text-[#173f5f]">{selectedEvent?.title || selectedEvent?.event_type || 'Project event'}</div><div className="mt-1 text-sm text-[#607580]">{selectedEvent?.summary || (project ? `${nameOf(project.project)} project activity.` : 'Portfolio activity event.')}</div></div></> : <div className="mt-6"><EmptyMessage text="Portfolio replay will populate automatically as connected project events are recorded." /></div>}</div>
    <div className="rounded-2xl border border-[#dce5e8] bg-white p-5"><div className="flex items-center gap-2"><TrendingUp size={17} className="text-[#2f6f91]" /><h3 className="font-semibold text-[#173f5f]">Replay interpretation</h3></div><div className="mt-5 space-y-4"><Insight icon={Clock3} title="Historical position" text={replayDate ? `Reviewing the portfolio as at ${replayDate.toLocaleDateString()}.` : 'No historical event selected.'} /><Insight icon={Building2} title="Affected project" text={project ? nameOf(project.project) : 'Select an event to identify the affected project.'} /><Insight icon={Activity} title="Portfolio learning" text="Use event history to understand how risks emerged, which interventions were made and whether recovery actions improved delivery confidence." /></div></div>
  </div>
}

function buildDecisions(row: ProjectRow) {
  const decisions: Array<{ projectId: string | number; projectName: string; title: string; reason: string; impact: string; priority: string; weight: number }> = []
  const base = { projectId: row.project.id, projectName: nameOf(row.project) }
  if (row.delayedProcurement > 0) decisions.push({ ...base, title: 'Expedite delayed procurement', reason: `${row.delayedProcurement} procurement item${row.delayedProcurement === 1 ? '' : 's'} are delayed and may constrain downstream work.`, impact: 'Protect near-term activities', priority: 'Immediate', weight: 90 + row.delayedProcurement * 5 })
  if (row.pendingApprovals > 0) decisions.push({ ...base, title: 'Escalate approval queue', reason: `${row.pendingApprovals} approval${row.pendingApprovals === 1 ? '' : 's'} remain unresolved. Confirm decision owners and required dates.`, impact: 'Reduce waiting time', priority: row.pendingApprovals > 3 ? 'High' : 'Medium', weight: 65 + row.pendingApprovals * 4 })
  if (row.highRisks > 0) decisions.push({ ...base, title: 'Review high-risk exposure', reason: `${row.highRisks} high-impact risk${row.highRisks === 1 ? '' : 's'} require treatment confirmation and executive ownership.`, impact: 'Reduce delivery exposure', priority: 'High', weight: 80 + row.highRisks * 6 })
  if (row.scheduleVariance < -5) decisions.push({ ...base, title: 'Approve a recovery response', reason: `Recorded schedule variance is ${row.scheduleVariance}%. Review resequencing, resources and protected milestones.`, impact: 'Improve finish-date confidence', priority: row.scheduleVariance < -15 ? 'Immediate' : 'High', weight: 75 + Math.abs(row.scheduleVariance) })
  if (row.failedQualityGates > 0 || row.openIncidents > 0) decisions.push({ ...base, title: 'Resolve assurance blockers', reason: `${row.failedQualityGates} quality gate issue${row.failedQualityGates === 1 ? '' : 's'} and ${row.openIncidents} open HSE incident${row.openIncidents === 1 ? '' : 's'} remain.`, impact: 'Protect safe, compliant progress', priority: 'Immediate', weight: 95 + row.openIncidents * 10 })
  return decisions
}

function buildSharedDependencies(rows: ProjectRow[]) {
  const map = new Map<string, {
    label: string
    roles: Set<string>
    projects: Set<string>
  }>()

  rows.forEach(row => {
    ;(row.dependencyResources || []).forEach(resource => {
      const label = String(resource.companyName || '').trim()
      if (!label) return
      const key = label.toLowerCase()

      if (!map.has(key)) {
        map.set(key, {
          label,
          roles: new Set<string>(),
          projects: new Set<string>(),
        })
      }

      const item = map.get(key)!
      item.projects.add(nameOf(row.project))
      if (resource.role) item.roles.add(resource.role)
    })
  })

  return Array.from(map.values())
    .map(item => ({
      label: item.label,
      roles: Array.from(item.roles),
      projects: Array.from(item.projects),
      projectCount: item.projects.size,
    }))
    .filter(item => item.projectCount > 1)
    .sort((a, b) => b.projectCount - a.projectCount || a.label.localeCompare(b.label))
}


function primaryBlocker(row: ProjectRow) {
  if (row.openIncidents) return `${row.openIncidents} open HSE incident${row.openIncidents === 1 ? '' : 's'}`
  if (row.delayedProcurement) return `${row.delayedProcurement} delayed procurement item${row.delayedProcurement === 1 ? '' : 's'}`
  if (row.highRisks) return `${row.highRisks} high-impact risk${row.highRisks === 1 ? '' : 's'}`
  if (row.pendingApprovals) return `${row.pendingApprovals} pending approval${row.pendingApprovals === 1 ? '' : 's'}`
  if (row.overdueTasks) return `${row.overdueTasks} overdue task${row.overdueTasks === 1 ? '' : 's'}`
  return 'No material blocker recorded'
}

function nameOf(project: any) { return project.project_name || project.name || 'Unnamed project' }
function HealthDot({ score }: { score: number }) { const style = score >= 80 ? 'bg-[#3b9b70]' : score >= 65 ? 'bg-[#4f8eac]' : score >= 50 ? 'bg-[#d49a39]' : 'bg-[#d86335]'; return <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${style}`} title={`${score}% health`} /> }
function CommandMetric({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) { return <div className="min-w-[112px] rounded-xl border border-white/10 bg-white/5 px-3 py-3"><div className={`text-xl font-semibold ${alert ? 'text-[#ffb18f]' : 'text-white'}`}>{value}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9fb8c4]">{label}</div></div> }
function SmallMetric({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) { return <div><div className={`text-base font-semibold ${alert ? 'text-[#d86335]' : 'text-[#173f5f]'}`}>{value}</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#8799a1]">{label}</div></div> }
function PressureCell({ value }: { value: number }) { const level = value >= 60 ? 'bg-[#d86335] text-white' : value >= 30 ? 'bg-[#f3c36b] text-[#684c18]' : value > 0 ? 'bg-[#dceaf0] text-[#2f6f91]' : 'bg-[#edf5f0] text-[#39745b]'; return <div className={`mx-auto flex h-9 w-16 items-center justify-center rounded-lg text-xs font-bold ${level}`}>{Math.round(value)}</div> }
function Insight({ icon: Icon, title, text }: { icon: typeof Activity; title: string; text: string }) { return <div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf1f4] text-[#2f6f91]"><Icon size={16} /></div><div><div className="text-sm font-semibold text-[#173f5f]">{title}</div><div className="mt-1 text-xs leading-5 text-[#6d818b]">{text}</div></div></div> }
function EmptyMessage({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-[#cfdcdf] bg-[#f7f9f9] p-5 text-sm text-[#6c808a]">{text}</div> }

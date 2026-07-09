import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/store/project'
import { useTasks } from '@/hooks/useTasks'
import { Activity, CheckCircle2, FileWarning, RefreshCw, Route, Save, ShieldCheck, Target, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProjectScope = 'Carcass' | 'Shell & Core' | 'Fully Finished' | 'Infrastructure' | 'MEP Only' | 'External Works' | 'Custom'
type RecoveryStatus = 'On Target' | 'Recoverable' | 'At Risk' | 'Critical'
type Tone = 'red' | 'amber' | 'green' | 'blue' | 'violet' | 'slate'

type Task = {
  id: string
  project_id?: number | string
  task_number?: number | string | null
  name?: string | null
  phase?: string | null
  category?: string | null
  discipline?: string | null
  package_name?: string | null
  start_date?: string | null
  finish_date?: string | null
  planned_start?: string | null
  planned_finish?: string | null
  duration_days?: number | string | null
  dependencies?: string | null
  responsible?: string | null
  status?: string | null
  rag?: string | null
  progress_pct?: number | string | null
  procurement_deadline?: string | null
  approval_deadline?: string | null
  notes?: string | null
  is_milestone?: boolean | null
  actual_start?: string | null
  actual_finish?: string | null
  weight_pct?: number | string | null
  schedule_source?: string | null
  imported_batch_id?: string | null
  schedule_revision_id?: string | null
  block_id?: string | null
  is_on_hold?: boolean | null
  is_blocked?: boolean | null
}

type Kpi = { label: string; value: string | number; helper?: string; icon: React.ElementType; tone: Tone }

const PROJECT_SCOPES: ProjectScope[] = ['Carcass', 'Shell & Core', 'Fully Finished', 'Infrastructure', 'MEP Only', 'External Works', 'Custom']

const SCOPE_KEYWORDS: Record<ProjectScope, string[]> = {
  Carcass: ['excavation', 'foundation', 'blinding', 'ground beam', 'substructure', 'superstructure', 'ground floor', 'slab', 'column', 'beam', 'blockwork', 'staircase', 'floor', 'roof', 'parapet', 'external plaster', 'external plastering', 'cleaning', 'practical completion'],
  'Shell & Core': ['excavation', 'foundation', 'structure', 'slab', 'column', 'beam', 'blockwork', 'roof', 'external wall', 'external plaster', 'external plastering', 'facade', 'mep first fix', 'core', 'staircase', 'practical completion'],
  'Fully Finished': [],
  Infrastructure: ['road', 'drain', 'stormwater', 'water', 'sewer', 'electrical', 'streetlight', 'paving', 'kerb', 'infrastructure'],
  'MEP Only': ['mep', 'mechanical', 'electrical', 'plumbing', 'hvac', 'fire', 'elv', 'first fix', 'second fix', 'testing', 'commissioning'],
  'External Works': ['external', 'landscape', 'driveway', 'paving', 'fence', 'gate', 'road', 'drain', 'kerb', 'walkway'],
  Custom: [],
}

function sameId(a: any, b: any) { return String(a) === String(b) }
function sameProject(a: any, b: any) { return String(a) === String(b) }
function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)) }
function safeDate(value?: string | null) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d }
function daysBetween(later: Date, earlier: Date) { return Math.ceil((later.getTime() - earlier.getTime()) / 86400000) }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d }
function fdate(date?: Date | null) { return date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function normalise(value?: string | null) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ') }
function getTaskName(task?: Task | null) { return task ? String(task.name || `Task ${task.task_number || ''}`).trim() : '—' }
function getTaskNo(task?: Task | null) { return Number(task?.task_number || 0) }
function getStart(task: Task) { return task.planned_start || task.start_date || null }
function getFinish(task: Task) { return task.planned_finish || task.finish_date || null }
function getDuration(task: Task) { const n = Number(task.duration_days || 0); if (n > 0) return n; const s = safeDate(getStart(task)); const f = safeDate(getFinish(task)); return s && f ? Math.max(1, daysBetween(f, s)) : 1 }
function getProgress(task: Task) { const s = String(task.status || '').toLowerCase(); if (['completed', 'complete', 'done'].includes(s)) return 100; if (s === 'not started') return 0; return clamp(Number(task.progress_pct || 0)) }
function isComplete(task: Task) { return getProgress(task) >= 100 }
function isActiveOnDate(task: Task, date: Date) { const s = safeDate(getStart(task)); const f = safeDate(getFinish(task)); return !!s && !!f && s <= date && f >= date }
function getScope(project: any): ProjectScope { const raw = String(project?.project_scope || project?.scope || 'Fully Finished'); return PROJECT_SCOPES.includes(raw as ProjectScope) ? raw as ProjectScope : 'Fully Finished' }

function isSummaryTask(task: Task) {
  // SchedulePage imports MS Project outline level 1 rows with phase = name.
  // Those rows are summary headers like SUPERSTRUCTURE and should not drive actual production.
  const name = normalise(task.name)
  const phase = normalise(task.phase)
  return !!name && !!phase && name === phase
}

function isScopeTask(task: Task, scope: ProjectScope) {
  if (scope === 'Fully Finished' || scope === 'Custom') return true
  const keywords = SCOPE_KEYWORDS[scope] || []
  if (!keywords.length) return true
  const text = [task.name, task.phase, task.category, task.discipline, task.package_name, task.notes].filter(Boolean).join(' ').toLowerCase()
  return keywords.some(k => text.includes(k.toLowerCase()))
}

function sequenceSort(a: Task, b: Task) {
  // Important: use schedule dates first, not task number. Task numbers can put summary rows before real workfront rows.
  const as = safeDate(getStart(a))?.getTime() ?? 0
  const bs = safeDate(getStart(b))?.getTime() ?? 0
  if (as !== bs) return as - bs
  const af = safeDate(getFinish(a))?.getTime() ?? 0
  const bf = safeDate(getFinish(b))?.getTime() ?? 0
  if (af !== bf) return af - bf
  return getTaskNo(a) - getTaskNo(b)
}

function toneClass(tone: Tone) {
  if (tone === 'red') return 'text-red-400'
  if (tone === 'amber') return 'text-amber-400'
  if (tone === 'green') return 'text-emerald-400'
  if (tone === 'blue') return 'text-sky-400'
  if (tone === 'violet') return 'text-violet-400'
  return 'text-slate-300'
}
function statusTone(status: RecoveryStatus): Tone { return status === 'On Target' ? 'green' : status === 'Recoverable' ? 'blue' : status === 'At Risk' ? 'amber' : 'red' }

function emptyContext() { return { project: null as any, procurement: [] as any[], approvals: [] as any[], snags: [] as any[], risks: [] as any[] } }

export default function RecoveryForecastPage() {
  const { projectId, projectName } = useProjectStore()
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks()

  const [context, setContext] = useState(emptyContext())
  const [selectedScope, setSelectedScope] = useState<ProjectScope>('Fully Finished')
  const [contextLoading, setContextLoading] = useState(false)
  const [savingScope, setSavingScope] = useState(false)
  const [notice, setNotice] = useState('')

  const projectTasks = useMemo(() => (allTasks as Task[]).filter(t => sameProject(t.project_id, projectId)), [allTasks, projectId])

  useEffect(() => {
    setNotice('')
    setContext(emptyContext())
    if (projectId) fetchProjectContext(projectId)
  }, [projectId])

  useEffect(() => setSelectedScope(getScope(context.project)), [context.project])

  async function fetchProjectContext(activeProjectId: string | number) {
    setContextLoading(true)
    const [projectRes, procurementRes, approvalRes, snagRes, riskRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', activeProjectId).maybeSingle(),
      supabase.from('procurement_items').select('*').eq('project_id', activeProjectId),
      supabase.from('approvals').select('*').eq('project_id', activeProjectId),
      supabase.from('snags').select('*').eq('project_id', activeProjectId),
      supabase.from('risks').select('*').eq('project_id', activeProjectId),
    ])

    if (projectRes.error) console.error(projectRes.error.message)
    if (procurementRes.error) console.error(procurementRes.error.message)
    if (approvalRes.error) console.error(approvalRes.error.message)
    if (snagRes.error) console.error(snagRes.error.message)
    if (riskRes.error) console.error(riskRes.error.message)

    setContext({
      project: projectRes.data || null,
      procurement: procurementRes.data || [],
      approvals: approvalRes.data || [],
      snags: snagRes.data || [],
      risks: riskRes.data || [],
    })
    setContextLoading(false)
  }

  async function saveProjectScope() {
    if (!projectId) return
    setSavingScope(true)
    setNotice('')
    const { data, error } = await supabase
      .from('projects')
      .update({
        project_scope: selectedScope,
        scope_notes: selectedScope === 'Carcass' ? 'Current forecast is measured as carcass scope, not fully finished handover.' : null,
      })
      .eq('id', projectId)
      .select('*')
      .maybeSingle()

    if (error) setNotice(error.message)
    else {
      setContext(prev => ({ ...prev, project: data }))
      setNotice('Project scope updated.')
    }
    setSavingScope(false)
  }

  const engine = useMemo(() => {
    const today = new Date()
    const scope = getScope(context.project)

    const dated = projectTasks.filter(t => safeDate(getStart(t)) && safeDate(getFinish(t))).sort(sequenceSort)
    const scoped = dated.filter(t => isScopeTask(t, scope))
    const scopedSchedule = (scoped.length ? scoped : dated).sort(sequenceSort)
    const productionTasks = scopedSchedule.filter(t => !isSummaryTask(t)).sort(sequenceSort)
    const forecastTasks = productionTasks.length ? productionTasks : scopedSchedule

    const firstTask = forecastTasks[0] || null
    const lastTask = forecastTasks[forecastTasks.length - 1] || null
    const projectStart = safeDate(context.project?.start_date) || (firstTask ? safeDate(getStart(firstTask)) : null)
    const targetDate = safeDate(context.project?.handover_date) || safeDate(context.project?.planned_finish) || (lastTask ? safeDate(getFinish(lastTask)) : null)
    const targetDateSource = context.project?.handover_date ? 'Project handover date' : context.project?.planned_finish ? 'Project planned finish' : lastTask ? `Last in-scope schedule task: ${getTaskName(lastTask)}` : 'No target source'

    const plannedCurrentTask =
      forecastTasks.find(t => isActiveOnDate(t, today)) ||
      [...forecastTasks].filter(t => {
        const f = safeDate(getFinish(t))
        return !!f && f < today
      }).sort((a, b) => (safeDate(getFinish(b))?.getTime() ?? 0) - (safeDate(getFinish(a))?.getTime() ?? 0))[0] ||
      firstTask

    const actualCurrentTask =
      [...forecastTasks].filter(t => getProgress(t) > 0 && getProgress(t) < 100).sort((a, b) => sequenceSort(b, a))[0] ||
      [...forecastTasks].filter(t => getProgress(t) >= 100).sort((a, b) => sequenceSort(b, a))[0] ||
      [...forecastTasks].filter(t => getProgress(t) === 0).sort(sequenceSort)[0] ||
      firstTask

    const plannedIndex = plannedCurrentTask ? forecastTasks.findIndex(t => sameId(t.id, plannedCurrentTask.id)) : -1
    const actualIndex = actualCurrentTask ? forecastTasks.findIndex(t => sameId(t.id, actualCurrentTask.id)) : -1
    const productionGapActivities = plannedIndex >= 0 && actualIndex >= 0 ? Math.max(0, plannedIndex - actualIndex) : 0
    const gapTasks = productionGapActivities > 0 ? forecastTasks.slice(actualIndex + 1, plannedIndex + 1) : []

    const productionGapDays = gapTasks.reduce((sum, t) => sum + getDuration(t) * ((100 - getProgress(t)) / 100), 0)
    const avgDuration = forecastTasks.length ? forecastTasks.reduce((sum, t) => sum + getDuration(t), 0) / forecastTasks.length : 1
    const calculatedProductionGapDays = productionGapDays > 0 ? Math.ceil(productionGapDays) : Math.ceil(productionGapActivities * avgDuration)

    const completedTasks = forecastTasks.filter(isComplete)
    const remainingTasks = forecastTasks.filter(t => !isComplete(t))
    const staleProgrammeItems = scopedSchedule.filter(t => {
      const f = safeDate(getFinish(t))
      return !!f && f < today && !isComplete(t) && !gapTasks.some(g => sameId(g.id, t.id))
    })

    const totalWeight = forecastTasks.reduce((sum, t) => sum + (Number(t.weight_pct || 0) > 0 ? Number(t.weight_pct) : getDuration(t)), 0)
    const earnedWeight = forecastTasks.reduce((sum, t) => {
      const w = Number(t.weight_pct || 0) > 0 ? Number(t.weight_pct) : getDuration(t)
      return sum + w * (getProgress(t) / 100)
    }, 0)
    const progressPct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : Number(context.project?.completion_percent || 0)

    const plannedEarned = projectStart && targetDate ? forecastTasks.reduce((sum, t) => {
      const s = safeDate(getStart(t)); const f = safeDate(getFinish(t))
      if (!s || !f) return sum
      if (f <= today) return sum + getDuration(t)
      if (s > today) return sum
      return sum + clamp(daysBetween(today, s), 0, getDuration(t))
    }, 0) : 0
    const totalDuration = forecastTasks.reduce((sum, t) => sum + getDuration(t), 0)
    const plannedPct = totalDuration > 0 ? Math.round((plannedEarned / totalDuration) * 100) : null
    const variancePct = plannedPct === null ? null : progressPct - plannedPct

    const scheduleWindowRemaining = targetDate && today < targetDate ? Math.max(0, daysBetween(targetDate, today)) : 0
    const remainingDurationDays = remainingTasks.reduce((sum, t) => sum + getDuration(t) * ((100 - getProgress(t)) / 100), 0)
    const requiredPace = scheduleWindowRemaining > 0 ? Math.round((remainingDurationDays / scheduleWindowRemaining) * 100) : 100
    const pacePressure = requiredPace <= 100 ? 'Normal' : requiredPace <= 130 ? 'Tight' : requiredPace <= 160 ? 'Aggressive' : 'Critical'

    const openRisks = context.risks.filter(r => ['open', 'active'].includes(String(r.status || '').toLowerCase()))
    const highRisks = openRisks.filter(r => Number(r.risk_score || 0) >= 12)
    const pendingApprovals = context.approvals.filter(a => !['approved', 'rejected', 'closed'].includes(String(a.status || '').toLowerCase()))
    const overdueApprovals = pendingApprovals.filter(a => { const d = safeDate(a.deadline || a.due_date); return !!d && d < today })
    const procurementRisks = context.procurement.filter(i => {
      const status = String(i.status || '').toLowerCase()
      if (['delivered', 'ordered', 'closed'].includes(status)) return false
      const d = safeDate(i.order_by_date || i.required_by || i.due_date)
      return !!d && daysBetween(d, today) <= 14
    })
    const openSnags = context.snags.filter(s => !['closed', 'resolved'].includes(String(s.status || '').toLowerCase()))
    const criticalSnags = openSnags.filter(s => String(s.severity || '').toLowerCase() === 'critical')

    const baselineSlipDays = productionGapActivities === 0 ? 0 : Math.ceil(calculatedProductionGapDays * 0.65)
    const paceSlipDays = Math.max(0, Math.round((requiredPace - 120) * 0.08))
    const riskSlipDays = Math.min(10, Math.round(openRisks.length * 0.5 + pendingApprovals.length * 0.35))
    const projectedSlipDays = clamp(baselineSlipDays + paceSlipDays + riskSlipDays, 0, scope === 'Carcass' ? 35 : 90)
    const forecastFinish = targetDate && projectedSlipDays > 0 ? addDays(targetDate, projectedSlipDays) : targetDate
    const forecastStatus: RecoveryStatus = projectedSlipDays === 0 ? 'On Target' : projectedSlipDays <= 10 ? 'Recoverable' : projectedSlipDays <= 30 ? 'At Risk' : 'Critical'
    const targetCanBeMet = forecastStatus === 'On Target' || forecastStatus === 'Recoverable' ? 'Yes' : forecastStatus === 'At Risk' ? 'Yes, with recovery' : 'No'
    const requiredAcceleration = projectedSlipDays === 0 ? '0%' : `${clamp(Math.round(productionGapActivities * 2.5 + projectedSlipDays * 1.2), 5, 60)}%`
    const additionalCrews = productionGapActivities === 0 ? 0 : projectedSlipDays <= 10 ? 1 : projectedSlipDays <= 25 ? 2 : 3

    let confidenceScore = 95
    confidenceScore -= productionGapActivities * 3
    confidenceScore -= projectedSlipDays * 1.5
    confidenceScore -= overdueApprovals.length * 4
    confidenceScore -= procurementRisks.length * 3
    confidenceScore -= highRisks.length * 5
    confidenceScore -= criticalSnags.length * 5
    confidenceScore -= Math.max(0, requiredPace - 120) * 0.2
    if (staleProgrammeItems.length > 0) confidenceScore -= 5
    if (pacePressure === 'Critical') confidenceScore -= 10
    if (pacePressure === 'Aggressive') confidenceScore -= 5
    confidenceScore = clamp(Math.round(confidenceScore), 5, 95)

    const phaseMap = remainingTasks.reduce((acc: Record<string, any>, t) => {
      const phase = t.phase || t.discipline || 'Unassigned'
      const inGap = gapTasks.some(g => sameId(g.id, t.id))
      if (!acc[phase]) acc[phase] = { phase, total: 0, remaining: 0, gapItems: 0, progressSum: 0 }
      acc[phase].total += 1
      acc[phase].remaining += isComplete(t) ? 0 : 1
      acc[phase].progressSum += getProgress(t)
      if (inGap) acc[phase].gapItems += 1
      return acc
    }, {})
    const phaseHealth = Object.values(phaseMap).map((p: any) => ({ ...p, progress: p.total ? Math.round(p.progressSum / p.total) : 0 }))

    const scopeNote = scope === 'Carcass'
      ? 'Forecast is based on carcass scope only. It excludes full finishing and final customer handover works.'
      : scope === 'Shell & Core'
      ? 'Forecast is based on shell and core scope.'
      : scope === 'Fully Finished'
      ? 'Forecast is based on full completion scope.'
      : `Forecast is based on ${scope} scope.`

    const executiveSummary = productionGapActivities === 0
      ? 'The project is aligned with the planned production position for today. Maintain current production rhythm and keep blockers under control.'
      : forecastStatus === 'Recoverable'
      ? `The project is ${productionGapActivities} activity step(s) behind the planned position. The gap is recoverable if the current workfront is accelerated immediately.`
      : forecastStatus === 'At Risk'
      ? `The project is ${productionGapActivities} activity step(s) behind the planned position. A formal recovery plan is required to protect the ${fdate(targetDate)} target.`
      : `The project is ${productionGapActivities} activity step(s) behind the planned position. Management intervention is required because normal sequencing is unlikely to recover the target.`

    const recommendations: string[] = []
    if (productionGapActivities > 0) recommendations.push(`Close the production gap between ${getTaskName(actualCurrentTask)} and ${getTaskName(plannedCurrentTask)}.`)
    if (additionalCrews > 0) recommendations.push(`Add ${additionalCrews} additional workfront ${additionalCrews === 1 ? 'crew' : 'crews'} or equivalent labour capacity.`)
    if (actualCurrentTask && getProgress(actualCurrentTask) < 80) recommendations.push(`Prioritise completion of ${getTaskName(actualCurrentTask)} before opening too many new workfronts.`)
    if (requiredPace > 120) recommendations.push('Increase weekly production rate and track output daily against planned floor/activity sequence.')
    if (procurementRisks.length > 0) recommendations.push('Fast-track procurement items required within the next 14 days.')
    if (overdueApprovals.length > 0) recommendations.push('Escalate overdue approvals because they may block recovery execution.')
    if (staleProgrammeItems.length > 0) recommendations.push('Clean up stale overdue schedule items so the programme reflects the true site position.')
    if (recommendations.length === 0) recommendations.push('Maintain current controls and continue weekly monitoring.')

    return {
      projectScope: scope, scopeNote, targetDate, targetDateSource, forecastFinish, forecastStatus, projectedSlipDays,
      targetCanBeMet, requiredAcceleration, additionalCrews, confidenceScore, progressPct, plannedPct, variancePct,
      plannedCurrentTask, actualCurrentTask, productionGapActivities, calculatedProductionGapDays, gapTasks,
      staleProgrammeItems, remainingTasks, totalTasks: forecastTasks.length, remainingDurationDays, scheduleWindowRemaining,
      requiredPace, pacePressure, procurementRisks, overdueApprovals, phaseHealth, executiveSummary, recommendations,
    }
  }, [projectTasks, context])

  const loading = tasksLoading || contextLoading
  const kpis: Kpi[] = [
    { label: 'Recovery Status', value: engine.forecastStatus, helper: `${engine.projectedSlipDays} forecast slip day(s)`, icon: Target, tone: statusTone(engine.forecastStatus) },
    { label: 'How Far Behind Are We?', value: engine.productionGapActivities, helper: 'Activity step(s) between actual and planned position', icon: Route, tone: engine.productionGapActivities === 0 ? 'green' : engine.productionGapActivities <= 3 ? 'amber' : 'red' },
    { label: 'Can Target Date Still Be Met?', value: engine.targetCanBeMet, helper: engine.additionalCrews > 0 ? `Recommended: +${engine.additionalCrews} crew(s)` : 'No extra crew required', icon: ShieldCheck, tone: engine.targetCanBeMet === 'Yes' ? 'green' : engine.targetCanBeMet === 'Yes, with recovery' ? 'amber' : 'red' },
    { label: 'Forecast Confidence', value: `${engine.confidenceScore}%`, helper: 'Based on production gap, risks and pace', icon: TrendingUp, tone: engine.confidenceScore >= 70 ? 'green' : engine.confidenceScore >= 45 ? 'amber' : 'red' },
  ]

  if (loading) return <div className="p-8 text-white">Loading Recovery Forecast...</div>
  if (!projectId) return <div className="card p-8 text-slate-400">No project selected.</div>
  if (projectTasks.length === 0) return <div className="card p-8 text-slate-400">No schedule tasks found for this project. Import or add tasks on the Schedule page first.</div>

  return (
    <div className="space-y-5 text-white">
      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recovery Forecast</p>
            <h1 className="text-2xl font-bold mt-1">Schedule-linked Production Recovery Forecast</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">Reads the same schedule tasks used by the Schedule page, compares planned position today against actual site position, then converts the production gap into a forecast finish.</p>
          </div>
          <button type="button" onClick={() => projectId && fetchProjectContext(projectId)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"><RefreshCw size={16} />Refresh</button>
        </div>
        {notice && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{notice}</div>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2"><div className="grid md:grid-cols-4 gap-4">
          <InfoBlock title="Project" value={projectName || context.project?.project_name || '—'} helper={`${engine.totalTasks} in-scope production tasks`} />
          <InfoBlock title="Scope" value={engine.projectScope} helper={engine.scopeNote} />
          <InfoBlock title="Target Date" value={fdate(engine.targetDate)} helper={engine.targetDateSource} />
          <InfoBlock title="Forecast Finish" value={fdate(engine.forecastFinish)} helper={`${engine.projectedSlipDays} day forecast slip`} />
        </div></div>
        <div className="card p-5">
          <label className="text-xs uppercase tracking-wider text-slate-500">Project Scope</label>
          <div className="mt-2 flex gap-2"><select value={selectedScope} onChange={e => setSelectedScope(e.target.value as ProjectScope)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">{PROJECT_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}</select><button type="button" onClick={saveProjectScope} disabled={savingScope} className="inline-flex items-center gap-2 rounded-xl bg-[#c49e48] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"><Save size={16} />{savingScope ? 'Saving' : 'Save'}</button></div>
          <p className="mt-3 text-xs text-slate-500">Set this correctly before relying on the forecast.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <PositionCard label="Planned Position Today" task={engine.plannedCurrentTask} helper="Should be active/completed by today" icon={Target} />
        <PositionCard label="Actual Site Position" task={engine.actualCurrentTask} helper={engine.actualCurrentTask ? `${getProgress(engine.actualCurrentTask)}% complete` : 'No active site position'} icon={Activity} />
        <div className="card p-4"><p className="text-xs uppercase tracking-wider text-slate-500">How Far Behind Are We?</p><h2 className={`mt-2 text-2xl font-bold ${engine.productionGapActivities > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{engine.productionGapActivities} Activity Step(s)</h2><p className="mt-1 text-xs text-slate-500">Estimated production gap: {engine.calculatedProductionGapDays} day(s)</p></div>
        <div className="card p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Forecast Slip</p><h2 className={`mt-2 text-2xl font-bold ${engine.projectedSlipDays > 10 ? 'text-red-400' : engine.projectedSlipDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{engine.projectedSlipDays} Day(s)</h2><p className="mt-1 text-xs text-slate-500">Forecast: {fdate(engine.forecastFinish)}</p></div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">{kpis.map(item => { const Icon = item.icon; return <div key={item.label} className="card p-4"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">{item.label}</p><h2 className={`mt-2 text-2xl font-bold ${toneClass(item.tone)}`}>{item.value}</h2>{item.helper && <p className="mt-1 text-xs text-slate-500">{item.helper}</p>}</div><Icon size={18} className={toneClass(item.tone)} /></div></div> })}</div>

      <div className="grid md:grid-cols-4 gap-4">
        <MiniMetric title="Scope Progress" value={`${engine.progressPct}%`} />
        <MiniMetric title="Planned Progress" value={engine.plannedPct === null ? '—' : `${engine.plannedPct}%`} />
        <MiniMetric title="Variance" value={engine.variancePct === null ? '—' : `${engine.variancePct}%`} />
        <MiniMetric title="Pace Pressure" value={engine.pacePressure} />
        <MiniMetric title="Remaining Scope Items" value={engine.remainingTasks.length} />
        <MiniMetric title="Stale Programme Items" value={engine.staleProgrammeItems.length} />
        <MiniMetric title="Procurement Risks" value={engine.procurementRisks.length} />
        <MiniMetric title="Overdue Approvals" value={engine.overdueApprovals.length} />
      </div>

      {engine.staleProgrammeItems.length > 0 && <div className="card border border-amber-500/30 p-5"><div className="flex items-start gap-3"><FileWarning className="mt-1 text-amber-400" size={20} /><div><h2 className="font-semibold text-amber-200">Programme data cleanup required</h2><p className="mt-1 text-sm text-slate-300">{engine.staleProgrammeItems.length} overdue task(s) are behind the actual production position. They are not used as the main delay driver, but they should be updated so the programme reflects the true site position.</p></div></div></div>}

      <div className="grid lg:grid-cols-3 gap-4"><div className="card p-5 lg:col-span-2"><h2 className="text-lg font-semibold">Executive Interpretation</h2><p className="mt-3 text-slate-300">{engine.executiveSummary}</p><div className="mt-5 grid md:grid-cols-3 gap-3 text-sm"><InfoBlock title="Planned" value={getTaskName(engine.plannedCurrentTask)} helper={`Task #${engine.plannedCurrentTask?.task_number || '—'}`} /><InfoBlock title="Actual" value={getTaskName(engine.actualCurrentTask)} helper={`Task #${engine.actualCurrentTask?.task_number || '—'}`} /><InfoBlock title="Target Basis" value={engine.targetDateSource} helper="Date source used for forecast finish." /></div></div><div className="card p-5"><h2 className="text-lg font-semibold">Recovery Actions</h2><div className="mt-4 space-y-3">{engine.recommendations.map((item, index) => <Action key={index} text={item} />)}</div></div></div>

      <TableCard title="Activities Between Actual and Planned Position" helper="These are the activities separating where site currently is from where the programme says it should be today." tasks={engine.gapTasks} empty="No production gap detected. Actual position is aligned with planned position." gap />

      <div className="card p-5"><h2 className="text-lg font-semibold mb-4">Phase / Workfront Health</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="py-3 text-left">Phase</th><th className="text-left">Remaining</th><th className="text-left">Gap Items</th><th className="text-left">Progress</th><th className="text-left">Pressure</th></tr></thead><tbody>{engine.phaseHealth.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-slate-500">No phase data available.</td></tr> : engine.phaseHealth.map((phase: any) => <tr key={phase.phase} className="border-b border-slate-900"><td className="py-3">{phase.phase}</td><td>{phase.remaining}</td><td className={phase.gapItems > 0 ? 'text-red-400' : 'text-emerald-400'}>{phase.gapItems}</td><td><div className="flex items-center gap-3"><div className="h-2 w-28 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-[#c49e48]" style={{ width: `${phase.progress}%` }} /></div><span>{phase.progress}%</span></div></td><td>{phase.gapItems > 0 ? <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300">Recovery Needed</span> : <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Stable</span>}</td></tr>)}</tbody></table></div></div>

      {engine.staleProgrammeItems.length > 0 && <TableCard title="Stale Programme Items to Clean Up" tasks={engine.staleProgrammeItems.slice(0, 12)} empty="No stale programme items." />}
    </div>
  )
}

function InfoBlock({ title, value, helper }: { title: string; value: string | number; helper?: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"><div className="text-xs uppercase tracking-wider text-slate-500">{title}</div><div className="mt-1 font-bold text-white">{value}</div>{helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}</div> }
function PositionCard({ label, task, helper, icon: Icon }: { label: string; task?: Task | null; helper?: string; icon: React.ElementType }) { return <div className="card p-4"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><h2 className="mt-2 text-xl font-bold text-white">{getTaskName(task)}</h2><p className="mt-1 text-xs text-slate-500">{task ? `Task #${task.task_number || '—'} · ${helper || ''}` : helper || '—'}</p></div><Icon size={18} className="text-[#c49e48]" /></div></div> }
function MiniMetric({ title, value }: { title: string; value: string | number }) { return <div className="card p-4"><div className="text-xs uppercase tracking-wider text-slate-500">{title}</div><div className="mt-2 text-xl font-bold text-[#c49e48]">{value}</div></div> }
function Action({ text }: { text: string }) { return <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-300"><CheckCircle2 size={16} className="mt-0.5 text-[#c49e48]" /><span>{text}</span></div> }
function TableCard({ title, helper, tasks, empty, gap = false }: { title: string; helper?: string; tasks: Task[]; empty: string; gap?: boolean }) { return <div className="card p-5"><h2 className="text-lg font-semibold mb-1">{title}</h2>{helper && <p className="text-sm text-slate-500 mb-4">{helper}</p>}<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="py-3 text-left">#</th><th className="text-left">Activity</th><th className="text-left">Phase</th><th className="text-left">Planned Start</th><th className="text-left">Planned Finish</th><th className="text-left">Progress</th>{gap && <th className="text-left">Status</th>}</tr></thead><tbody>{tasks.length === 0 ? <tr><td colSpan={gap ? 7 : 6} className="py-6 text-center text-emerald-400">{empty}</td></tr> : tasks.map(task => <tr key={task.id} className="border-b border-slate-900"><td className="py-3">{task.task_number || '—'}</td><td>{getTaskName(task)}</td><td>{task.phase || task.discipline || '—'}</td><td>{fdate(safeDate(getStart(task)))}</td><td>{fdate(safeDate(getFinish(task)))}</td><td>{getProgress(task)}%</td>{gap && <td><span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300">Gap Item</span></td>}</tr>)}</tbody></table></div></div> }

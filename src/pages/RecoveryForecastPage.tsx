import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/store/project'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileWarning,
  Gauge,
  Hammer,
  RefreshCw,
  Save,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProjectScope =
  | 'Carcass'
  | 'Shell & Core'
  | 'Fully Finished'
  | 'Infrastructure'
  | 'MEP Only'
  | 'External Works'
  | 'Custom'

type Task = {
  id: string
  project_id?: number | string
  task_number?: number | string | null
  name?: string | null
  activity?: string | null
  task_name?: string | null
  title?: string | null
  phase?: string | null
  package?: string | null
  discipline?: string | null
  description?: string | null
  start_date?: string | null
  finish_date?: string | null
  planned_start?: string | null
  planned_finish?: string | null
  baseline_start?: string | null
  baseline_finish?: string | null
  duration_days?: number | string | null
  dependencies?: string | null
  progress_pct?: number | string | null
  progress?: number | string | null
  status?: string | null
  rag?: string | null
}

type Kpi = {
  label: string
  value: string | number
  helper?: string
  icon: React.ElementType
  tone: 'red' | 'amber' | 'green' | 'blue' | 'violet' | 'slate'
}

const PROJECT_SCOPES: ProjectScope[] = [
  'Carcass',
  'Shell & Core',
  'Fully Finished',
  'Infrastructure',
  'MEP Only',
  'External Works',
  'Custom',
]

const SCOPE_KEYWORDS: Record<ProjectScope, string[]> = {
  Carcass: [
    'excavation',
    'foundation',
    'blinding',
    'ground beam',
    'substructure',
    'superstructure',
    'ground floor',
    'slab',
    'column',
    'beam',
    'blockwork',
    'staircase',
    'floor',
    'roof',
    'parapet',
    'external plaster',
    'external plastering',
    'cleaning',
    'practical completion',
  ],
  'Shell & Core': [
    'excavation',
    'foundation',
    'structure',
    'slab',
    'column',
    'beam',
    'blockwork',
    'roof',
    'external wall',
    'external plaster',
    'external plastering',
    'facade',
    'mep first fix',
    'core',
    'staircase',
    'practical completion',
  ],
  'Fully Finished': [],
  Infrastructure: [
    'road',
    'drain',
    'stormwater',
    'water',
    'sewer',
    'electrical',
    'streetlight',
    'paving',
    'kerb',
    'infrastructure',
  ],
  'MEP Only': [
    'mep',
    'mechanical',
    'electrical',
    'plumbing',
    'hvac',
    'fire',
    'elv',
    'first fix',
    'second fix',
    'testing',
    'commissioning',
  ],
  'External Works': [
    'external',
    'landscape',
    'driveway',
    'paving',
    'fence',
    'gate',
    'road',
    'drain',
    'kerb',
    'walkway',
  ],
  Custom: [],
}

function sameId(a: any, b: any) {
  return String(a) === String(b)
}

function safeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(later: Date, earlier: Date) {
  return Math.ceil((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function formatDate(date?: Date | null) {
  if (!date) return '—'

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getTaskName(task: Task) {
  return String(
    task.name ||
      task.activity ||
      task.task_name ||
      task.title ||
      `Task ${task.task_number || ''}`
  ).trim()
}

function getTaskNumber(task: Task) {
  return Number(task.task_number || 0)
}

function getTaskStart(task: Task) {
  return task.planned_start || task.start_date || task.baseline_start || null
}

function getTaskFinish(task: Task) {
  return task.planned_finish || task.finish_date || task.baseline_finish || null
}

function getTaskProgress(task: Task) {
  const status = String(task.status || '').toLowerCase()

  if (status === 'completed' || status === 'complete' || status === 'done') return 100
  if (status === 'not started') return 0

  return clamp(Number(task.progress_pct ?? task.progress ?? 0))
}

function isComplete(task: Task) {
  return getTaskProgress(task) >= 100
}

function getScope(project: any): ProjectScope {
  const raw = String(project?.project_scope || project?.scope || 'Fully Finished')

  return PROJECT_SCOPES.includes(raw as ProjectScope)
    ? (raw as ProjectScope)
    : 'Fully Finished'
}

function isScopeTask(task: Task, scope: ProjectScope) {
  if (scope === 'Fully Finished' || scope === 'Custom') return true

  const keywords = SCOPE_KEYWORDS[scope] || []

  if (!keywords.length) return true

  const text = [
    getTaskName(task),
    task.phase,
    task.package,
    task.discipline,
    task.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return keywords.some(keyword => text.includes(keyword.toLowerCase()))
}

function toneClass(tone: Kpi['tone']) {
  if (tone === 'red') return 'text-red-400'
  if (tone === 'amber') return 'text-amber-400'
  if (tone === 'green') return 'text-emerald-400'
  if (tone === 'blue') return 'text-sky-400'
  if (tone === 'violet') return 'text-violet-400'
  return 'text-slate-300'
}

export default function RecoveryForecastPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [project, setProject] = useState<any>(null)
  const [procurement, setProcurement] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [snags, setSnags] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [selectedScope, setSelectedScope] = useState<ProjectScope>('Fully Finished')
  const [savingScope, setSavingScope] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const { projectId } = useProjectStore()

  useEffect(() => {
    fetchRecoveryData()
  }, [projectId])

  useEffect(() => {
    setSelectedScope(getScope(project))
  }, [project])

  async function fetchRecoveryData() {
    setLoading(true)
    setNotice('')

    if (!projectId) {
      setTasks([])
      setProject(null)
      setProcurement([])
      setApprovals([])
      setSnags([])
      setRisks([])
      setLoading(false)
      return
    }

    const [
      taskRes,
      projectRes,
      procurementRes,
      approvalRes,
      snagRes,
      riskRes,
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('task_number', { ascending: true }),

      supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle(),

      supabase
        .from('procurement_items')
        .select('*')
        .eq('project_id', projectId),

      supabase
        .from('approvals')
        .select('*')
        .eq('project_id', projectId),

      supabase
        .from('snags')
        .select('*')
        .eq('project_id', projectId),

      supabase
        .from('risks')
        .select('*')
        .eq('project_id', projectId),
    ])

    if (taskRes.error) console.error(taskRes.error.message)
    if (projectRes.error) console.error(projectRes.error.message)
    if (procurementRes.error) console.error(procurementRes.error.message)
    if (approvalRes.error) console.error(approvalRes.error.message)
    if (snagRes.error) console.error(snagRes.error.message)
    if (riskRes.error) console.error(riskRes.error.message)

    setTasks((taskRes.data || []) as Task[])
    setProject(projectRes.data || null)
    setProcurement(procurementRes.data || [])
    setApprovals(approvalRes.data || [])
    setSnags(snagRes.data || [])
    setRisks(riskRes.data || [])

    setLoading(false)
  }

  async function saveProjectScope() {
    if (!projectId) return

    setSavingScope(true)
    setNotice('')

    const { data, error } = await supabase
      .from('projects')
      .update({
        project_scope: selectedScope,
        scope_notes:
          selectedScope === 'Carcass'
            ? 'Current forecast is measured as carcass scope, not fully finished handover.'
            : null,
      })
      .eq('id', projectId)
      .select('*')
      .maybeSingle()

    if (error) {
      setNotice(error.message)
    } else {
      setProject(data)
      setNotice('Project scope updated.')
    }

    setSavingScope(false)
  }

  const engine = useMemo(() => {
    const today = new Date()
    const projectScope = getScope(project)

    const validTasks = tasks
      .filter(task => safeDate(getTaskStart(task)) && safeDate(getTaskFinish(task)))
      .sort((a, b) => getTaskNumber(a) - getTaskNumber(b))

    const scopeFilteredTasks = validTasks.filter(task =>
      isScopeTask(task, projectScope)
    )

    const scopeTasks = scopeFilteredTasks.length > 0 ? scopeFilteredTasks : validTasks

    const firstTask =
      [...scopeTasks]
        .filter(task => safeDate(getTaskStart(task)))
        .sort((a, b) => {
          const aDate = safeDate(getTaskStart(a))?.getTime() ?? 0
          const bDate = safeDate(getTaskStart(b))?.getTime() ?? 0
          return aDate - bDate
        })[0] || null

    const lastTask =
      [...scopeTasks]
        .filter(task => safeDate(getTaskFinish(task)))
        .sort((a, b) => {
          const aDate = safeDate(getTaskFinish(a))?.getTime() ?? 0
          const bDate = safeDate(getTaskFinish(b))?.getTime() ?? 0
          return bDate - aDate
        })[0] || null

    const targetDate =
      safeDate(project?.handover_date) ||
      safeDate(project?.planned_finish) ||
      (lastTask ? safeDate(getTaskFinish(lastTask)) : null)

    const targetDateSource = project?.handover_date
      ? 'Project handover date'
      : project?.planned_finish
      ? 'Project planned finish'
      : lastTask
      ? `Last in-scope schedule task: ${getTaskName(lastTask)}`
      : 'No target source'

    const projectStart =
      safeDate(project?.start_date) ||
      (firstTask ? safeDate(getTaskStart(firstTask)) : null)

    const plannedPct =
      projectStart && targetDate
        ? clamp(
            Math.round(
              (daysBetween(today, projectStart) /
                Math.max(1, daysBetween(targetDate, projectStart))) *
                100
            )
          )
        : null

    const progressPct = scopeTasks.length
      ? Math.round(
          scopeTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) /
            scopeTasks.length
        )
      : Number(project?.completion_percent || 0)

    const completedTasks = scopeTasks.filter(isComplete)
    const remainingTasks = scopeTasks.filter(task => !isComplete(task))

    const currentWorkfront =
      [...scopeTasks]
        .filter(task => getTaskProgress(task) > 0 && getTaskProgress(task) < 100)
        .sort((a, b) => getTaskNumber(b) - getTaskNumber(a))[0] ||
      [...remainingTasks].sort((a, b) => getTaskNumber(a) - getTaskNumber(b))[0] ||
      null

    const currentTaskNumber = currentWorkfront ? getTaskNumber(currentWorkfront) : 0

    const historicalOverdueTasks = remainingTasks.filter(task => {
      const finish = safeDate(getTaskFinish(task))
      return !!finish && finish < today
    })

    /*
      Important:
      We do not allow one old, stale task to push the forecast by hundreds of days.
      Enterprise recovery forecasts separate:
      1. historical data-quality backlog, and
      2. active/current workfront delay.
      The forecast is driven by the current workfront and remaining scope.
    */
    const activeDelayedTasks = historicalOverdueTasks.filter(task => {
      const taskNo = getTaskNumber(task)
      return currentTaskNumber === 0 || taskNo >= currentTaskNumber - 2
    })

    const dataQualityBacklog = historicalOverdueTasks.filter(
      task => !activeDelayedTasks.some(active => sameId(active.id, task.id))
    )

    const currentTaskFinish = currentWorkfront
      ? safeDate(getTaskFinish(currentWorkfront))
      : null

    const currentWorkfrontDelay =
      currentTaskFinish && currentTaskFinish < today && currentWorkfront
        ? Math.max(0, daysBetween(today, currentTaskFinish))
        : 0

    const activeDelayDays =
      activeDelayedTasks.length === 0
        ? currentWorkfrontDelay
        : Math.max(
            currentWorkfrontDelay,
            ...activeDelayedTasks.map(task => {
              const finish = safeDate(getTaskFinish(task))
              return finish ? Math.max(0, daysBetween(today, finish)) : 0
            })
          )

    const remainingDurationDays = remainingTasks.reduce((sum, task) => {
      const duration = Number(task.duration_days || 0)
      const progress = getTaskProgress(task)
      const remainingRatio = clamp(100 - progress) / 100

      if (duration > 0) return sum + duration * remainingRatio

      const start = safeDate(getTaskStart(task))
      const finish = safeDate(getTaskFinish(task))

      if (start && finish) {
        return sum + Math.max(1, daysBetween(finish, start)) * remainingRatio
      }

      return sum + 1
    }, 0)

    const remainingCalendarDays = Math.ceil(remainingDurationDays)

    const scheduleWindowRemaining =
      targetDate && today < targetDate ? Math.max(0, daysBetween(targetDate, today)) : 0

    const requiredPace =
      scheduleWindowRemaining > 0
        ? Math.round((remainingCalendarDays / scheduleWindowRemaining) * 100)
        : 100

    const pacePressure =
      requiredPace <= 100
        ? 'Normal'
        : requiredPace <= 130
        ? 'Tight'
        : requiredPace <= 160
        ? 'Aggressive'
        : 'Critical'

    const projectedSlipDays = targetDate
      ? clamp(
          Math.round(
            activeDelayDays * 0.45 +
              activeDelayedTasks.length * 0.75 +
              Math.max(0, requiredPace - 120) * 0.12
          ),
          0,
          projectScope === 'Carcass' ? 21 : 45
        )
      : activeDelayDays

    const forecastFinish =
      targetDate && projectedSlipDays > 0
        ? addDays(targetDate, projectedSlipDays)
        : targetDate

    const forecastStatus =
      projectedSlipDays === 0
        ? 'On Target'
        : projectedSlipDays <= 7
        ? 'Recoverable'
        : projectedSlipDays <= 21
        ? 'At Risk'
        : 'Critical'

    const recoverable =
      projectedSlipDays <= 7
        ? 'YES'
        : projectedSlipDays <= 21
        ? 'WITH RECOVERY'
        : 'NO'

    const requiredAcceleration =
      projectedSlipDays === 0
        ? '0%'
        : `${clamp(Math.round(projectedSlipDays * 2.5 + activeDelayedTasks.length), 5, 50)}%`

    const procurementRisks = procurement.filter(item => {
      const status = String(item.status || '').toLowerCase()
      if (status === 'delivered' || status === 'ordered' || status === 'closed') {
        return false
      }

      const orderDate = safeDate(item.order_by_date || item.required_by || item.due_date)
      if (!orderDate) return false

      return daysBetween(orderDate, today) <= 14
    })

    const openRisks = risks.filter(risk =>
      ['open', 'active'].includes(String(risk.status || '').toLowerCase())
    )

    const highRisks = openRisks.filter(risk => Number(risk.risk_score || 0) >= 12)

    const pendingApprovals = approvals.filter(approval => {
      const status = String(approval.status || '').toLowerCase()
      return status !== 'approved' && status !== 'rejected' && status !== 'closed'
    })

    const overdueApprovals = pendingApprovals.filter(approval => {
      const deadline = safeDate(approval.deadline || approval.due_date)
      return !!deadline && deadline < today
    })

    const openSnags = snags.filter(snag =>
      !['closed', 'resolved'].includes(String(snag.status || '').toLowerCase())
    )

    const criticalSnags = openSnags.filter(
      snag => String(snag.severity || '').toLowerCase() === 'critical'
    )

    let confidenceScore = 95

    confidenceScore -= projectedSlipDays * 2.2
    confidenceScore -= activeDelayedTasks.length * 2
    confidenceScore -= overdueApprovals.length * 4
    confidenceScore -= procurementRisks.length * 3
    confidenceScore -= highRisks.length * 5
    confidenceScore -= criticalSnags.length * 5
    confidenceScore -= Math.max(0, requiredPace - 120) * 0.2

    if (dataQualityBacklog.length > 0) confidenceScore -= 5
    if (pacePressure === 'Critical') confidenceScore -= 10
    if (pacePressure === 'Aggressive') confidenceScore -= 5

    confidenceScore = clamp(Math.round(confidenceScore), 5, 95)

    const phaseMap = remainingTasks.reduce((acc: Record<string, any>, task) => {
      const phase = task.phase || task.discipline || 'Unassigned'
      const finish = safeDate(getTaskFinish(task))
      const isActiveDelayed = activeDelayedTasks.some(active =>
        sameId(active.id, task.id)
      )

      if (!acc[phase]) {
        acc[phase] = {
          phase,
          total: 0,
          remaining: 0,
          delayed: 0,
          progressSum: 0,
        }
      }

      acc[phase].total += 1
      acc[phase].remaining += isComplete(task) ? 0 : 1
      acc[phase].progressSum += getTaskProgress(task)

      if (finish && finish < today && !isComplete(task)) {
        acc[phase].delayed += 1
      }

      return acc
    }, {})

    const phaseHealth = Object.values(phaseMap).map((phase: any) => ({
      ...phase,
      progress: phase.total
        ? Math.round(phase.progressSum / phase.total)
        : 0,
    }))

    const criticalTasks = [
      ...activeDelayedTasks,
      ...remainingTasks
        .filter(task => !activeDelayedTasks.some(active => sameId(active.id, task.id)))
        .slice(0, 8),
    ].slice(0, 10)

    const scopeNote =
      projectScope === 'Carcass'
        ? 'Forecast is based on carcass scope only. It excludes full finishing and final customer handover works.'
        : projectScope === 'Shell & Core'
        ? 'Forecast is based on shell and core scope.'
        : projectScope === 'Fully Finished'
        ? 'Forecast is based on full completion scope.'
        : `Forecast is based on ${projectScope} scope.`

    const executiveSummary =
      forecastStatus === 'On Target'
        ? 'The current in-scope programme remains achievable. Maintain the current work rate and keep approvals, procurement and snag close-out under control.'
        : forecastStatus === 'Recoverable'
        ? 'The current in-scope programme is slightly pressured but recoverable. Focus on the current workfront and close short-term blockers within the next week.'
        : forecastStatus === 'At Risk'
        ? 'The current in-scope programme is at risk. A short recovery plan is required, with additional supervision, sequencing control and daily tracking of delayed activities.'
        : 'The current in-scope programme is under critical pressure. Immediate management intervention is required to protect the target date.'

    const recommendations: string[] = []

    if (activeDelayedTasks.length > 0) {
      recommendations.push(
        'Agree a 7-day recovery action plan for the current delayed workfront.'
      )
    }

    if (dataQualityBacklog.length > 0) {
      recommendations.push(
        'Clean up historical overdue activities so the programme reflects the true site position.'
      )
    }

    if (requiredPace > 120) {
      recommendations.push(
        'Increase labour/resource density on remaining in-scope activities.'
      )
    }

    if (procurementRisks.length > 0) {
      recommendations.push(
        'Fast-track procurement items required within the next 14 days.'
      )
    }

    if (overdueApprovals.length > 0) {
      recommendations.push(
        'Escalate overdue approvals because they may block recovery execution.'
      )
    }

    if (criticalSnags.length > 0) {
      recommendations.push(
        'Assign critical snags to accountable owners with close-out dates.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current controls and continue weekly monitoring.')
    }

    return {
      projectScope,
      scopeNote,
      projectStart,
      targetDate,
      targetDateSource,
      forecastFinish,
      forecastStatus,
      projectedSlipDays,
      recoverable,
      requiredAcceleration,
      confidenceScore,
      progressPct,
      plannedPct,
      variancePct: plannedPct === null ? null : progressPct - plannedPct,
      firstTask,
      lastTask,
      currentWorkfront,
      activeDelayDays,
      activeDelayedTasks,
      historicalOverdueTasks,
      dataQualityBacklog,
      remainingTasks,
      completedTasks,
      totalTasks: scopeTasks.length,
      remainingCalendarDays,
      requiredPace,
      pacePressure,
      procurementRisks,
      openRisks,
      highRisks,
      pendingApprovals,
      overdueApprovals,
      openSnags,
      criticalSnags,
      phaseHealth,
      criticalTasks,
      executiveSummary,
      recommendations,
    }
  }, [tasks, project, procurement, approvals, snags, risks])

  const kpis: Kpi[] = [
    {
      label: 'Forecast Status',
      value: engine.forecastStatus,
      helper: `${engine.projectedSlipDays} projected slip day(s)`,
      icon: Target,
      tone:
        engine.forecastStatus === 'On Target'
          ? 'green'
          : engine.forecastStatus === 'Recoverable'
          ? 'blue'
          : engine.forecastStatus === 'At Risk'
          ? 'amber'
          : 'red',
    },
    {
      label: 'Current Workfront Delay',
      value: `${engine.activeDelayDays} Days`,
      helper: engine.currentWorkfront
        ? getTaskName(engine.currentWorkfront)
        : 'No active workfront',
      icon: Clock3,
      tone: engine.activeDelayDays > 7 ? 'red' : engine.activeDelayDays > 0 ? 'amber' : 'green',
    },
    {
      label: 'Recoverable',
      value: engine.recoverable,
      helper: `Speed increase: ${engine.requiredAcceleration}`,
      icon: ShieldCheck,
      tone: engine.recoverable === 'YES' ? 'green' : engine.recoverable === 'WITH RECOVERY' ? 'amber' : 'red',
    },
    {
      label: 'Confidence',
      value: `${engine.confidenceScore}%`,
      helper: 'Based on active delay, pace, risks and approvals',
      icon: TrendingUp,
      tone: engine.confidenceScore >= 70 ? 'green' : engine.confidenceScore >= 45 ? 'amber' : 'red',
    },
  ]

  if (loading) {
    return <div className="p-8 text-white">Loading Recovery Forecast...</div>
  }

  if (tasks.length === 0) {
    return (
      <div className="card p-8 text-slate-400">
        No recovery forecast data available for this project yet.
      </div>
    )
  }

  return (
    <div className="space-y-5 text-white">
      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Recovery Forecast
            </p>
            <h1 className="text-2xl font-bold mt-1">
              Scope-aware Recovery Forecast
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">
              This page now separates historical data backlog from active workfront delay, so one stale task cannot push a carcass programme into the following year.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRecoveryData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {notice}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="grid md:grid-cols-4 gap-4">
            <InfoBlock title="Scope" value={engine.projectScope} helper={engine.scopeNote} />
            <InfoBlock title="Target Date" value={formatDate(engine.targetDate)} helper={engine.targetDateSource} />
            <InfoBlock title="Forecast Finish" value={formatDate(engine.forecastFinish)} helper={`${engine.projectedSlipDays} day projected slip`} />
            <InfoBlock title="Current Workfront" value={engine.currentWorkfront ? getTaskName(engine.currentWorkfront) : 'None'} helper={engine.currentWorkfront ? `${getTaskProgress(engine.currentWorkfront)}% complete` : 'No active activity'} />
          </div>
        </div>

        <div className="card p-5">
          <label className="text-xs uppercase tracking-wider text-slate-500">
            Project Scope
          </label>

          <div className="mt-2 flex gap-2">
            <select
              value={selectedScope}
              onChange={e => setSelectedScope(e.target.value as ProjectScope)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {PROJECT_SCOPES.map(scope => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={saveProjectScope}
              disabled={savingScope}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c49e48] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              <Save size={16} />
              {savingScope ? 'Saving' : 'Save'}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Set this correctly before relying on the forecast.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {kpis.map(item => {
          const Icon = item.icon

          return (
            <div key={item.label} className="card p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <h2 className={`mt-2 text-2xl font-bold ${toneClass(item.tone)}`}>
                    {item.value}
                  </h2>
                  {item.helper && (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.helper}
                    </p>
                  )}
                </div>

                <Icon size={18} className={toneClass(item.tone)} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MiniMetric title="Scope Progress" value={`${engine.progressPct}%`} />
        <MiniMetric title="Planned Progress" value={engine.plannedPct === null ? '—' : `${engine.plannedPct}%`} />
        <MiniMetric title="Variance" value={engine.variancePct === null ? '—' : `${engine.variancePct}%`} />
        <MiniMetric title="Pace Pressure" value={engine.pacePressure} />
        <MiniMetric title="Remaining Scope Items" value={engine.remainingTasks.length} />
        <MiniMetric title="Historical Backlog" value={engine.dataQualityBacklog.length} />
        <MiniMetric title="Procurement Risks" value={engine.procurementRisks.length} />
        <MiniMetric title="Overdue Approvals" value={engine.overdueApprovals.length} />
      </div>

      {engine.dataQualityBacklog.length > 0 && (
        <div className="card border border-amber-500/30 p-5">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-1 text-amber-400" size={20} />
            <div>
              <h2 className="font-semibold text-amber-200">
                Data quality warning
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {engine.dataQualityBacklog.length} old overdue task(s) exist behind the current workfront. They are shown for cleanup, but they are not allowed to push the forecast into an unrealistic delivery date.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Executive Interpretation</h2>
          <p className="mt-3 text-slate-300">
            {engine.executiveSummary}
          </p>

          <div className="mt-5 grid md:grid-cols-3 gap-3 text-sm">
            <InfoBlock title="Active delay source" value={engine.currentWorkfront ? getTaskName(engine.currentWorkfront) : 'None'} helper="Forecast uses current workfront, not stale historical tasks." />
            <InfoBlock title="Recovery speed required" value={engine.requiredAcceleration} helper="Estimated acceleration needed to hold target." />
            <InfoBlock title="Target basis" value={engine.targetDateSource} helper="Date source used for recovery forecast." />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold">Recommended Actions</h2>

          <div className="mt-4 space-y-3">
            {engine.recommendations.map((item, index) => (
              <Action key={index} text={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Phase / Workfront Health</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 text-left">Phase</th>
                <th className="text-left">Remaining</th>
                <th className="text-left">Delayed</th>
                <th className="text-left">Progress</th>
                <th className="text-left">Pressure</th>
              </tr>
            </thead>

            <tbody>
              {engine.phaseHealth.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No phase data available.
                  </td>
                </tr>
              ) : (
                engine.phaseHealth.map((phase: any) => (
                  <tr key={phase.phase} className="border-b border-slate-900">
                    <td className="py-3">{phase.phase}</td>
                    <td>{phase.remaining}</td>
                    <td className={phase.delayed > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {phase.delayed}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 rounded-full bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-[#c49e48]"
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                        <span>{phase.progress}%</span>
                      </div>
                    </td>
                    <td>
                      {phase.delayed > 0 ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300">
                          Attention
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                          Stable
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Activities Requiring Recovery Attention</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 text-left">#</th>
                <th className="text-left">Activity</th>
                <th className="text-left">Phase</th>
                <th className="text-left">Planned Finish</th>
                <th className="text-left">Progress</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {engine.criticalTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-emerald-400">
                    No recovery-critical activity found for the current scope.
                  </td>
                </tr>
              ) : (
                engine.criticalTasks.map(task => {
                  const isActiveDelay = engine.activeDelayedTasks.some(active =>
                    sameId(active.id, task.id)
                  )

                  return (
                    <tr key={task.id} className="border-b border-slate-900">
                      <td className="py-3">{task.task_number || '—'}</td>
                      <td>{getTaskName(task)}</td>
                      <td>{task.phase || task.discipline || '—'}</td>
                      <td>{formatDate(safeDate(getTaskFinish(task)))}</td>
                      <td>{getTaskProgress(task)}%</td>
                      <td>
                        {isActiveDelay ? (
                          <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300">
                            Active Delay
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-700/60 px-2 py-1 text-xs text-slate-300">
                            Remaining
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {engine.dataQualityBacklog.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Historical Overdue Items to Clean Up</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 text-left">#</th>
                  <th className="text-left">Activity</th>
                  <th className="text-left">Planned Finish</th>
                  <th className="text-left">Progress</th>
                </tr>
              </thead>

              <tbody>
                {engine.dataQualityBacklog.slice(0, 12).map(task => (
                  <tr key={task.id} className="border-b border-slate-900">
                    <td className="py-3">{task.task_number || '—'}</td>
                    <td>{getTaskName(task)}</td>
                    <td>{formatDate(safeDate(getTaskFinish(task)))}</td>
                    <td>{getTaskProgress(task)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoBlock({
  title,
  value,
  helper,
}: {
  title: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="mt-1 font-bold text-white">
        {value}
      </div>
      {helper && (
        <div className="mt-1 text-xs text-slate-500">
          {helper}
        </div>
      )}
    </div>
  )
}

function MiniMetric({
  title,
  value,
}: {
  title: string
  value: string | number
}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-xl font-bold text-[#c49e48]">
        {value}
      </div>
    </div>
  )
}

function Action({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-300">
      <CheckCircle2 size={16} className="mt-0.5 text-[#c49e48]" />
      <span>{text}</span>
    </div>
  )
}

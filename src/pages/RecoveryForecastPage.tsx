import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/store/project'
import {
  Activity,
  CheckCircle2,
  FileWarning,
  RefreshCw,
  Route,
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

type RecoveryStatus = 'On Target' | 'Recoverable' | 'At Risk' | 'Critical'

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

function getTaskName(task?: Task | null) {
  if (!task) return '—'

  return String(
    task.name ||
      task.activity ||
      task.task_name ||
      task.title ||
      `Task ${task.task_number || ''}`
  ).trim()
}

function getTaskNumber(task?: Task | null) {
  return Number(task?.task_number || 0)
}

function getTaskStart(task: Task) {
  return task.planned_start || task.start_date || task.baseline_start || null
}

function getTaskFinish(task: Task) {
  return task.planned_finish || task.finish_date || task.baseline_finish || null
}

function getTaskDuration(task: Task) {
  const explicitDuration = Number(task.duration_days || 0)

  if (explicitDuration > 0) return explicitDuration

  const start = safeDate(getTaskStart(task))
  const finish = safeDate(getTaskFinish(task))

  if (start && finish) return Math.max(1, daysBetween(finish, start))

  return 1
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

function getStatusTone(status: RecoveryStatus): Kpi['tone'] {
  if (status === 'On Target') return 'green'
  if (status === 'Recoverable') return 'blue'
  if (status === 'At Risk') return 'amber'
  return 'red'
}

function isTaskActiveOnDate(task: Task, date: Date) {
  const start = safeDate(getTaskStart(task))
  const finish = safeDate(getTaskFinish(task))

  return !!start && !!finish && start <= date && finish >= date
}

function taskSort(a: Task, b: Task) {
  const numberDiff = getTaskNumber(a) - getTaskNumber(b)
  if (numberDiff !== 0) return numberDiff

  const aStart = safeDate(getTaskStart(a))?.getTime() ?? 0
  const bStart = safeDate(getTaskStart(b))?.getTime() ?? 0

  return aStart - bStart
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
      .sort(taskSort)

    const scopeFilteredTasks = validTasks.filter(task => isScopeTask(task, projectScope))
    const scopeTasks = (scopeFilteredTasks.length > 0 ? scopeFilteredTasks : validTasks).sort(taskSort)

    const firstTask = scopeTasks[0] || null
    const lastTask = scopeTasks[scopeTasks.length - 1] || null

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

    const plannedCurrentTask =
      scopeTasks.find(task => isTaskActiveOnDate(task, today)) ||
      [...scopeTasks]
        .filter(task => {
          const finish = safeDate(getTaskFinish(task))
          return !!finish && finish < today
        })
        .sort((a, b) => {
          const aFinish = safeDate(getTaskFinish(a))?.getTime() ?? 0
          const bFinish = safeDate(getTaskFinish(b))?.getTime() ?? 0
          return bFinish - aFinish
        })[0] ||
      firstTask

    const actualCurrentTask =
      [...scopeTasks]
        .filter(task => getTaskProgress(task) > 0 && getTaskProgress(task) < 100)
        .sort((a, b) => taskSort(b, a))[0] ||
      [...scopeTasks]
        .filter(task => getTaskProgress(task) >= 100)
        .sort((a, b) => taskSort(b, a))[0] ||
      [...scopeTasks]
        .filter(task => getTaskProgress(task) === 0)
        .sort(taskSort)[0] ||
      firstTask

    const plannedIndex = plannedCurrentTask
      ? Math.max(0, scopeTasks.findIndex(task => sameId(task.id, plannedCurrentTask.id)))
      : -1

    const actualIndex = actualCurrentTask
      ? Math.max(0, scopeTasks.findIndex(task => sameId(task.id, actualCurrentTask.id)))
      : -1

    const productionGapActivities =
      plannedIndex >= 0 && actualIndex >= 0 ? Math.max(0, plannedIndex - actualIndex) : 0

    const gapTasks =
      productionGapActivities > 0 ? scopeTasks.slice(actualIndex + 1, plannedIndex + 1) : []

    const productionGapDays = gapTasks.reduce((sum, task) => {
      const progress = getTaskProgress(task)
      const remainingRatio = clamp(100 - progress) / 100
      return sum + getTaskDuration(task) * remainingRatio
    }, 0)

    const averageScopeDuration =
      scopeTasks.length > 0
        ? scopeTasks.reduce((sum, task) => sum + getTaskDuration(task), 0) / scopeTasks.length
        : 1

    const calculatedProductionGapDays =
      productionGapDays > 0
        ? Math.ceil(productionGapDays)
        : Math.ceil(productionGapActivities * averageScopeDuration)

    const completedTasks = scopeTasks.filter(isComplete)
    const remainingTasks = scopeTasks.filter(task => !isComplete(task))

    const historicalOverdueTasks = scopeTasks.filter(task => {
      const finish = safeDate(getTaskFinish(task))
      return !!finish && finish < today && !isComplete(task)
    })

    const staleProgrammeItems = historicalOverdueTasks.filter(
      task => !gapTasks.some(gapTask => sameId(gapTask.id, task.id))
    )

    const totalScopeDuration = scopeTasks.reduce((sum, task) => sum + getTaskDuration(task), 0)

    const earnedDuration = scopeTasks.reduce((sum, task) => {
      return sum + getTaskDuration(task) * (getTaskProgress(task) / 100)
    }, 0)

    const progressPct =
      totalScopeDuration > 0
        ? Math.round((earnedDuration / totalScopeDuration) * 100)
        : Number(project?.completion_percent || 0)

    const plannedEarnedDuration =
      projectStart && targetDate
        ? scopeTasks.reduce((sum, task) => {
            const start = safeDate(getTaskStart(task))
            const finish = safeDate(getTaskFinish(task))

            if (!start || !finish) return sum
            if (finish <= today) return sum + getTaskDuration(task)
            if (start > today) return sum

            const elapsed = clamp(daysBetween(today, start), 0, getTaskDuration(task))
            return sum + elapsed
          }, 0)
        : 0

    const plannedPct =
      totalScopeDuration > 0 ? Math.round((plannedEarnedDuration / totalScopeDuration) * 100) : null

    const variancePct = plannedPct === null ? null : progressPct - plannedPct

    const scheduleWindowRemaining =
      targetDate && today < targetDate ? Math.max(0, daysBetween(targetDate, today)) : 0

    const remainingDurationDays = remainingTasks.reduce((sum, task) => {
      const progress = getTaskProgress(task)
      const remainingRatio = clamp(100 - progress) / 100
      return sum + getTaskDuration(task) * remainingRatio
    }, 0)

    const requiredPace =
      scheduleWindowRemaining > 0
        ? Math.round((remainingDurationDays / scheduleWindowRemaining) * 100)
        : 100

    const pacePressure =
      requiredPace <= 100
        ? 'Normal'
        : requiredPace <= 130
        ? 'Tight'
        : requiredPace <= 160
        ? 'Aggressive'
        : 'Critical'

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

    const procurementRisks = procurement.filter(item => {
      const status = String(item.status || '').toLowerCase()
      if (status === 'delivered' || status === 'ordered' || status === 'closed') return false

      const orderDate = safeDate(item.order_by_date || item.required_by || item.due_date)
      if (!orderDate) return false

      return daysBetween(orderDate, today) <= 14
    })

    const openSnags = snags.filter(snag =>
      !['closed', 'resolved'].includes(String(snag.status || '').toLowerCase())
    )

    const criticalSnags = openSnags.filter(
      snag => String(snag.severity || '').toLowerCase() === 'critical'
    )

    const baselineSlipDays =
      productionGapActivities === 0 ? 0 : Math.ceil(calculatedProductionGapDays * 0.65)

    const paceSlipDays = Math.max(0, Math.round((requiredPace - 120) * 0.08))

    const riskSlipDays = Math.min(
      10,
      Math.round(openRisks.length * 0.5 + pendingApprovals.length * 0.35)
    )

    const projectedSlipDays = clamp(
      baselineSlipDays + paceSlipDays + riskSlipDays,
      0,
      projectScope === 'Carcass' ? 35 : 90
    )

    const forecastFinish =
      targetDate && projectedSlipDays > 0 ? addDays(targetDate, projectedSlipDays) : targetDate

    const forecastStatus: RecoveryStatus =
      projectedSlipDays === 0
        ? 'On Target'
        : projectedSlipDays <= 10
        ? 'Recoverable'
        : projectedSlipDays <= 30
        ? 'At Risk'
        : 'Critical'

    const recoverable =
      forecastStatus === 'On Target'
        ? 'YES'
        : forecastStatus === 'Recoverable'
        ? 'YES'
        : forecastStatus === 'At Risk'
        ? 'WITH RECOVERY'
        : 'NO'

    const requiredAcceleration =
      projectedSlipDays === 0
        ? '0%'
        : `${clamp(Math.round(productionGapActivities * 2.5 + projectedSlipDays * 1.2), 5, 60)}%`

    const additionalCrews =
      productionGapActivities === 0
        ? 0
        : projectedSlipDays <= 10
        ? 1
        : projectedSlipDays <= 25
        ? 2
        : 3

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

    const phaseMap = remainingTasks.reduce((acc: Record<string, any>, task) => {
      const phase = task.phase || task.discipline || 'Unassigned'
      const inProductionGap = gapTasks.some(gapTask => sameId(gapTask.id, task.id))

      if (!acc[phase]) {
        acc[phase] = {
          phase,
          total: 0,
          remaining: 0,
          gapItems: 0,
          progressSum: 0,
        }
      }

      acc[phase].total += 1
      acc[phase].remaining += isComplete(task) ? 0 : 1
      acc[phase].progressSum += getTaskProgress(task)

      if (inProductionGap) acc[phase].gapItems += 1

      return acc
    }, {})

    const phaseHealth = Object.values(phaseMap).map((phase: any) => ({
      ...phase,
      progress: phase.total ? Math.round(phase.progressSum / phase.total) : 0,
    }))

    const criticalTasks = [
      ...gapTasks,
      ...remainingTasks.filter(
        task => !gapTasks.some(gapTask => sameId(gapTask.id, task.id))
      ),
    ].slice(0, 12)

    const scopeNote =
      projectScope === 'Carcass'
        ? 'Forecast is based on carcass scope only. It excludes full finishing and final customer handover works.'
        : projectScope === 'Shell & Core'
        ? 'Forecast is based on shell and core scope.'
        : projectScope === 'Fully Finished'
        ? 'Forecast is based on full completion scope.'
        : `Forecast is based on ${projectScope} scope.`

    const executiveSummary =
      productionGapActivities === 0
        ? 'The project is aligned with the planned production position for today. Maintain current production rhythm and keep blockers under control.'
        : forecastStatus === 'Recoverable'
        ? `The project is ${productionGapActivities} activity step(s) behind the planned position. The gap is recoverable if the current workfront is accelerated immediately.`
        : forecastStatus === 'At Risk'
        ? `The project is ${productionGapActivities} activity step(s) behind the planned position. A formal recovery plan is required to protect the ${formatDate(targetDate)} target.`
        : `The project is ${productionGapActivities} activity step(s) behind the planned position. Management intervention is required because normal sequencing is unlikely to recover the target.`

    const recommendations: string[] = []

    if (productionGapActivities > 0) {
      recommendations.push(
        `Close the production gap between ${getTaskName(actualCurrentTask)} and ${getTaskName(plannedCurrentTask)}.`
      )
    }

    if (additionalCrews > 0) {
      recommendations.push(
        `Add ${additionalCrews} additional workfront ${additionalCrews === 1 ? 'crew' : 'crews'} or equivalent labour capacity.`
      )
    }

    if (actualCurrentTask && getTaskProgress(actualCurrentTask) < 80) {
      recommendations.push(
        `Prioritise completion of ${getTaskName(actualCurrentTask)} before opening too many new workfronts.`
      )
    }

    if (requiredPace > 120) {
      recommendations.push(
        'Increase weekly production rate and track output daily against planned floor/activity sequence.'
      )
    }

    if (procurementRisks.length > 0) {
      recommendations.push('Fast-track procurement items required within the next 14 days.')
    }

    if (overdueApprovals.length > 0) {
      recommendations.push('Escalate overdue approvals because they may block recovery execution.')
    }

    if (staleProgrammeItems.length > 0) {
      recommendations.push(
        'Clean up stale overdue schedule items so the programme reflects the true site position.'
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
      additionalCrews,
      confidenceScore,
      progressPct,
      plannedPct,
      variancePct,
      firstTask,
      lastTask,
      plannedCurrentTask,
      actualCurrentTask,
      plannedIndex,
      actualIndex,
      productionGapActivities,
      calculatedProductionGapDays,
      gapTasks,
      historicalOverdueTasks,
      staleProgrammeItems,
      remainingTasks,
      completedTasks,
      totalTasks: scopeTasks.length,
      remainingDurationDays,
      scheduleWindowRemaining,
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
      label: 'Recovery Status',
      value: engine.forecastStatus,
      helper: `${engine.projectedSlipDays} forecast slip day(s)`,
      icon: Target,
      tone: getStatusTone(engine.forecastStatus),
    },
    {
      label: 'Production Gap',
      value: `${engine.productionGapActivities}`,
      helper: 'Activity step(s) behind planned position',
      icon: Route,
      tone:
        engine.productionGapActivities === 0
          ? 'green'
          : engine.productionGapActivities <= 3
          ? 'amber'
          : 'red',
    },
    {
      label: 'Recoverable',
      value: engine.recoverable,
      helper:
        engine.additionalCrews > 0
          ? `Recommended: +${engine.additionalCrews} crew(s)`
          : 'No extra crew required',
      icon: ShieldCheck,
      tone:
        engine.recoverable === 'YES'
          ? 'green'
          : engine.recoverable === 'WITH RECOVERY'
          ? 'amber'
          : 'red',
    },
    {
      label: 'Confidence',
      value: `${engine.confidenceScore}%`,
      helper: 'Based on production gap, risks and pace',
      icon: TrendingUp,
      tone:
        engine.confidenceScore >= 70
          ? 'green'
          : engine.confidenceScore >= 45
          ? 'amber'
          : 'red',
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
              Production-based Recovery Forecast
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">
              Compares where the project should be today against where site production actually is, then converts the production gap into a forecast finish.
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
            <InfoBlock title="Forecast Finish" value={formatDate(engine.forecastFinish)} helper={`${engine.projectedSlipDays} day forecast slip`} />
            <InfoBlock
              title="Additional Capacity"
              value={engine.additionalCrews > 0 ? `+${engine.additionalCrews} crew(s)` : 'Not required'}
              helper={`Required acceleration: ${engine.requiredAcceleration}`}
            />
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
        <PositionCard label="Planned Position Today" task={engine.plannedCurrentTask} helper="Should be active/completed by today" icon={Target} />
        <PositionCard
          label="Actual Site Position"
          task={engine.actualCurrentTask}
          helper={engine.actualCurrentTask ? `${getTaskProgress(engine.actualCurrentTask)}% complete` : 'No active site position'}
          icon={Activity}
        />

        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Production Gap</p>
          <h2 className={`mt-2 text-2xl font-bold ${engine.productionGapActivities > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {engine.productionGapActivities} Activity Step(s)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Estimated production gap: {engine.calculatedProductionGapDays} day(s)
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Forecast Slip</p>
          <h2 className={`mt-2 text-2xl font-bold ${engine.projectedSlipDays > 10 ? 'text-red-400' : engine.projectedSlipDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {engine.projectedSlipDays} Day(s)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Forecast: {formatDate(engine.forecastFinish)}
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
                  {item.helper && <p className="mt-1 text-xs text-slate-500">{item.helper}</p>}
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
        <MiniMetric title="Stale Programme Items" value={engine.staleProgrammeItems.length} />
        <MiniMetric title="Procurement Risks" value={engine.procurementRisks.length} />
        <MiniMetric title="Overdue Approvals" value={engine.overdueApprovals.length} />
      </div>

      {engine.staleProgrammeItems.length > 0 && (
        <div className="card border border-amber-500/30 p-5">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-1 text-amber-400" size={20} />
            <div>
              <h2 className="font-semibold text-amber-200">Programme data cleanup required</h2>
              <p className="mt-1 text-sm text-slate-300">
                {engine.staleProgrammeItems.length} overdue task(s) are behind the actual production position. They are not used as the main delay driver, but they should be updated so the programme reflects the true site position.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Executive Interpretation</h2>
          <p className="mt-3 text-slate-300">{engine.executiveSummary}</p>

          <div className="mt-5 grid md:grid-cols-3 gap-3 text-sm">
            <InfoBlock title="Planned" value={getTaskName(engine.plannedCurrentTask)} helper={`Task #${engine.plannedCurrentTask?.task_number || '—'}`} />
            <InfoBlock title="Actual" value={getTaskName(engine.actualCurrentTask)} helper={`Task #${engine.actualCurrentTask?.task_number || '—'}`} />
            <InfoBlock title="Target Basis" value={engine.targetDateSource} helper="Date source used for forecast finish." />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold">Recovery Actions</h2>

          <div className="mt-4 space-y-3">
            {engine.recommendations.map((item, index) => (
              <Action key={index} text={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Production Gap Activities</h2>

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
              {engine.gapTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-emerald-400">
                    No production gap detected. Actual position is aligned with planned position.
                  </td>
                </tr>
              ) : (
                engine.gapTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-900">
                    <td className="py-3">{task.task_number || '—'}</td>
                    <td>{getTaskName(task)}</td>
                    <td>{task.phase || task.discipline || '—'}</td>
                    <td>{formatDate(safeDate(getTaskFinish(task)))}</td>
                    <td>{getTaskProgress(task)}%</td>
                    <td>
                      <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300">
                        Gap Item
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <th className="text-left">Gap Items</th>
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
                    <td className={phase.gapItems > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {phase.gapItems}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 rounded-full bg-slate-800">
                          <div className="h-2 rounded-full bg-[#c49e48]" style={{ width: `${phase.progress}%` }} />
                        </div>
                        <span>{phase.progress}%</span>
                      </div>
                    </td>
                    <td>
                      {phase.gapItems > 0 ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300">
                          Recovery Needed
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

      {engine.staleProgrammeItems.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Stale Programme Items to Clean Up</h2>

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
                {engine.staleProgrammeItems.slice(0, 12).map(task => (
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
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-1 font-bold text-white">{value}</div>
      {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
    </div>
  )
}

function PositionCard({
  label,
  task,
  helper,
  icon: Icon,
}: {
  label: string
  task?: Task | null
  helper?: string
  icon: React.ElementType
}) {
  return (
    <div className="card p-4">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <h2 className="mt-2 text-xl font-bold text-white">{getTaskName(task)}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {task ? `Task #${task.task_number || '—'} · ${helper || ''}` : helper || '—'}
          </p>
        </div>

        <Icon size={18} className="text-[#c49e48]" />
      </div>
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
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-bold text-[#c49e48]">{value}</div>
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

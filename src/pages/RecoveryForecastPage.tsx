import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/store/project'
import { useTasks } from '@/hooks/useTasks'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
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

type RecoveryStatus = 'On Track' | 'Watch' | 'Recovery Required' | 'Critical'

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

type KpiTone = 'red' | 'amber' | 'green' | 'blue' | 'violet' | 'slate'

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
    'rendering',
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
    'rendering',
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

const STAGE_ORDER = [
  {
    key: 'substructure',
    label: 'Substructure',
    keywords: ['substructure', 'foundation', 'excavation', 'blinding', 'ground beam'],
  },
  {
    key: 'superstructure',
    label: 'Superstructure',
    keywords: ['superstructure', 'column', 'beam', 'slab', 'staircase', 'floor'],
  },
  {
    key: 'blockwork',
    label: 'Blockwork',
    keywords: ['blockwork', 'block work', 'walling', 'walls'],
  },
  {
    key: 'roofing',
    label: 'Roofing / Watertightness',
    keywords: ['roof', 'roofing', 'roof carcass', 'roof covering', 'parapet'],
  },
  {
    key: 'mep-first-fix',
    label: 'M&E First Fix',
    keywords: ['m&e first fix', 'mep first fix', 'first fix', 'conduit', 'pipe', 'plumbing', 'electrical'],
  },
  {
    key: 'external-plastering',
    label: 'External Plastering / Rendering',
    keywords: ['external plaster', 'external plastering', 'rendering'],
  },
  {
    key: 'internal-wet-works',
    label: 'Internal Wet Works',
    keywords: ['internal plaster', 'internal plastering', 'waterproofing', 'wet works', 'screed'],
  },
  {
    key: 'ceiling',
    label: 'Ceiling',
    keywords: ['ceiling', 'pop', 'gypsum'],
  },
  {
    key: 'finishes',
    label: 'Finishes',
    keywords: ['tiling', 'tile', 'painting', 'paint', 'doors', 'window', 'ironmongery', 'sanitary', 'kitchen', 'wardrobe'],
  },
  {
    key: 'testing',
    label: 'Testing / Commissioning',
    keywords: ['testing', 'commissioning', 'test', 'pressure test'],
  },
  {
    key: 'handover',
    label: 'Practical Completion / Handover',
    keywords: ['practical completion', 'handover', 'snag', 'cleaning'],
  },
]

function sameProject(a: any, b: any) {
  return String(a) === String(b)
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

function normalise(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getTaskName(task?: Task | null) {
  if (!task) return '—'
  return String(task.name || `Task ${task.task_number || ''}`).trim()
}

function getTaskNumber(task?: Task | null) {
  return Number(task?.task_number || 0)
}

function getTaskStart(task: Task) {
  return task.planned_start || task.start_date || null
}

function getTaskFinish(task: Task) {
  return task.planned_finish || task.finish_date || null
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
  const status = normalise(task.status)

  if (['completed', 'complete', 'done'].includes(status)) return 100
  if (['not started', 'not-started'].includes(status)) return 0

  return clamp(Number(task.progress_pct || 0))
}

function isComplete(task: Task) {
  return getTaskProgress(task) >= 100
}

function isStarted(task: Task) {
  return getTaskProgress(task) > 0
}

function isNotStarted(task: Task) {
  return getTaskProgress(task) === 0
}

function isTaskActiveOnDate(task: Task, date: Date) {
  const start = safeDate(getTaskStart(task))
  const finish = safeDate(getTaskFinish(task))

  return !!start && !!finish && start <= date && finish >= date
}

function sequenceSort(a: Task, b: Task) {
  const aStart = safeDate(getTaskStart(a))?.getTime() ?? 0
  const bStart = safeDate(getTaskStart(b))?.getTime() ?? 0
  if (aStart !== bStart) return aStart - bStart

  const aFinish = safeDate(getTaskFinish(a))?.getTime() ?? 0
  const bFinish = safeDate(getTaskFinish(b))?.getTime() ?? 0
  if (aFinish !== bFinish) return aFinish - bFinish

  return getTaskNumber(a) - getTaskNumber(b)
}

function getScope(project: any): ProjectScope {
  const raw = String(project?.project_scope || project?.scope || 'Fully Finished')

  return PROJECT_SCOPES.includes(raw as ProjectScope)
    ? (raw as ProjectScope)
    : 'Fully Finished'
}

function taskSearchText(task: Task) {
  return [
    getTaskName(task),
    task.phase,
    task.category,
    task.discipline,
    task.package_name,
    task.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isSummaryTask(task: Task) {
  const name = normalise(task.name)
  const phase = normalise(task.phase)

  return !!name && !!phase && name === phase
}

function isScopeTask(task: Task, scope: ProjectScope) {
  if (scope === 'Fully Finished' || scope === 'Custom') return true

  const keywords = SCOPE_KEYWORDS[scope] || []
  if (!keywords.length) return true

  const text = taskSearchText(task)

  return keywords.some(keyword => text.includes(keyword.toLowerCase()))
}

function getStageIndex(task?: Task | null) {
  if (!task) return -1

  const text = taskSearchText(task)

  const index = STAGE_ORDER.findIndex(stage =>
    stage.keywords.some(keyword => text.includes(keyword))
  )

  return index
}

function getStageLabel(task?: Task | null) {
  const index = getStageIndex(task)
  return index >= 0 ? STAGE_ORDER[index].label : task?.phase || 'Unclassified'
}

function toneClass(tone: KpiTone) {
  if (tone === 'red') return 'text-red-400'
  if (tone === 'amber') return 'text-amber-400'
  if (tone === 'green') return 'text-emerald-400'
  if (tone === 'blue') return 'text-sky-400'
  if (tone === 'violet') return 'text-violet-400'
  return 'text-slate-300'
}

function statusTone(status: RecoveryStatus): KpiTone {
  if (status === 'On Track') return 'green'
  if (status === 'Watch') return 'blue'
  if (status === 'Recovery Required') return 'amber'
  return 'red'
}

function makeEmptyContext() {
  return {
    project: null,
    procurement: [] as any[],
    approvals: [] as any[],
    snags: [] as any[],
    risks: [] as any[],
  }
}

export default function RecoveryForecastPage() {
  const { projectId, projectName } = useProjectStore()
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks()

  const [context, setContext] = useState(makeEmptyContext())
  const [selectedScope, setSelectedScope] = useState<ProjectScope>('Fully Finished')
  const [contextLoading, setContextLoading] = useState(false)
  const [savingScope, setSavingScope] = useState(false)
  const [notice, setNotice] = useState('')

  const projectTasks = useMemo(() => {
    return (allTasks as Task[]).filter(task => sameProject(task.project_id, projectId))
  }, [allTasks, projectId])

  useEffect(() => {
    setContext(makeEmptyContext())
    setNotice('')

    if (!projectId) return

    fetchProjectContext(projectId)
  }, [projectId])

  useEffect(() => {
    setSelectedScope(getScope(context.project))
  }, [context.project])

  async function fetchProjectContext(activeProjectId: string | number) {
    setContextLoading(true)

    const [projectRes, procurementRes, approvalRes, snagRes, riskRes] =
      await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', activeProjectId)
          .maybeSingle(),

        supabase
          .from('procurement_items')
          .select('*')
          .eq('project_id', activeProjectId),

        supabase
          .from('approvals')
          .select('*')
          .eq('project_id', activeProjectId),

        supabase
          .from('snags')
          .select('*')
          .eq('project_id', activeProjectId),

        supabase
          .from('risks')
          .select('*')
          .eq('project_id', activeProjectId),
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
      setContext(previous => ({
        ...previous,
        project: data,
      }))
      setNotice('Project scope updated.')
    }

    setSavingScope(false)
  }

  const engine = useMemo(() => {
    const today = new Date()
    const projectScope = getScope(context.project)

    const datedTasks = projectTasks
      .filter(task => safeDate(getTaskStart(task)) && safeDate(getTaskFinish(task)))
      .sort(sequenceSort)

    const scopedTasks = datedTasks.filter(task => isScopeTask(task, projectScope))
    const schedule = (scopedTasks.length > 0 ? scopedTasks : datedTasks).sort(sequenceSort)

    const productionTasks = schedule.filter(task => !isSummaryTask(task)).sort(sequenceSort)
    const workingTasks = productionTasks.length > 0 ? productionTasks : schedule

    const firstTask = workingTasks[0] || null
    const lastTask = workingTasks[workingTasks.length - 1] || null

    const targetDate =
      safeDate(context.project?.handover_date) ||
      safeDate(context.project?.planned_finish) ||
      (lastTask ? safeDate(getTaskFinish(lastTask)) : null)

    const targetDateSource = context.project?.handover_date
      ? 'Project handover date'
      : context.project?.planned_finish
      ? 'Project planned finish'
      : lastTask
      ? `Last in-scope activity: ${getTaskName(lastTask)}`
      : 'No target source'

    const plannedTodayActivities = workingTasks.filter(task =>
      isTaskActiveOnDate(task, today)
    )

    const plannedPosition =
      plannedTodayActivities.length > 0
        ? plannedTodayActivities.sort(sequenceSort)[plannedTodayActivities.length - 1]
        : [...workingTasks]
            .filter(task => {
              const finish = safeDate(getTaskFinish(task))
              return !!finish && finish < today
            })
            .sort((a, b) => {
              const aFinish = safeDate(getTaskFinish(a))?.getTime() ?? 0
              const bFinish = safeDate(getTaskFinish(b))?.getTime() ?? 0
              return bFinish - aFinish
            })[0] || firstTask

    const activeSiteTasks = workingTasks
      .filter(task => isStarted(task) && !isComplete(task))
      .sort(sequenceSort)

    const latestActiveSiteTask =
      activeSiteTasks.length > 0 ? activeSiteTasks[activeSiteTasks.length - 1] : null

    /*
      Actual site position should not always be the latest active task.
      If a later task has started lightly while an earlier critical prerequisite is still incomplete,
      the true recovery position is the earliest incomplete active prerequisite.
      Example: external MEP can be 60%, but if roofing/M&E first fix/plastering are incomplete,
      the project is still constrained at that earlier workfront.
    */
    const earliestIncompleteStarted =
      activeSiteTasks.length > 0 ? activeSiteTasks[0] : null

    const latestCompleted =
      [...workingTasks].filter(isComplete).sort(sequenceSort).slice(-1)[0] || null

    const firstNotStarted =
      [...workingTasks].filter(isNotStarted).sort(sequenceSort)[0] || null

    const actualPosition =
      earliestIncompleteStarted || latestCompleted || firstNotStarted || firstTask

    const plannedIndex = plannedPosition
      ? workingTasks.findIndex(task => sameId(task.id, plannedPosition.id))
      : -1

    const actualIndex = actualPosition
      ? workingTasks.findIndex(task => sameId(task.id, actualPosition.id))
      : -1

    const sequenceGap =
      plannedIndex >= 0 && actualIndex >= 0
        ? Math.max(0, plannedIndex - actualIndex)
        : 0

    const stageGap =
      Math.max(0, getStageIndex(plannedPosition) - getStageIndex(actualPosition))

    const gapActivities =
      sequenceGap > 0
        ? workingTasks.slice(actualIndex + 1, plannedIndex + 1)
        : []

    const missedDueActivities = workingTasks.filter(task => {
      const finish = safeDate(getTaskFinish(task))
      return !!finish && finish < today && !isComplete(task)
    })

    const activeBlockers = workingTasks.filter(task => {
      const taskStage = getStageIndex(task)
      const plannedStage = getStageIndex(plannedPosition)

      if (plannedStage < 0 || taskStage < 0) return false
      if (taskStage > plannedStage) return false
      if (isComplete(task)) return false

      const start = safeDate(getTaskStart(task))
      return !!start && start <= today
    })

    const criticalBlockers = activeBlockers.slice(0, 8)

    const gapDurationDays = [...gapActivities, ...criticalBlockers].reduce(
      (sum, task) => {
        const progress = getTaskProgress(task)
        const remainingRatio = clamp(100 - progress) / 100
        return sum + getTaskDuration(task) * remainingRatio
      },
      0
    )

    const uniqueBlockerIds = new Set(criticalBlockers.map(task => String(task.id)))

    const sequenceGapDays = Math.ceil(
      Math.max(
        gapDurationDays,
        sequenceGap * 2,
        stageGap * 5,
        uniqueBlockerIds.size * 2
      )
    )

    const remainingTasks = workingTasks.filter(task => !isComplete(task))
    const completedTasks = workingTasks.filter(isComplete)

    const totalWeight = workingTasks.reduce((sum, task) => {
      const weight = Number(task.weight_pct || 0)
      return sum + (weight > 0 ? weight : getTaskDuration(task))
    }, 0)

    const actualEarned = workingTasks.reduce((sum, task) => {
      const weight = Number(task.weight_pct || 0)
      const effectiveWeight = weight > 0 ? weight : getTaskDuration(task)
      return sum + effectiveWeight * (getTaskProgress(task) / 100)
    }, 0)

    const actualProgress =
      totalWeight > 0
        ? Math.round((actualEarned / totalWeight) * 100)
        : Number(context.project?.completion_percent || 0)

    const plannedEarned = workingTasks.reduce((sum, task) => {
      const start = safeDate(getTaskStart(task))
      const finish = safeDate(getTaskFinish(task))
      const duration = getTaskDuration(task)

      if (!start || !finish) return sum
      if (finish <= today) return sum + duration
      if (start > today) return sum

      const elapsed = clamp(daysBetween(today, start), 0, duration)
      return sum + elapsed
    }, 0)

    const totalDuration = workingTasks.reduce((sum, task) => {
      return sum + getTaskDuration(task)
    }, 0)

    const plannedProgress =
      totalDuration > 0 ? Math.round((plannedEarned / totalDuration) * 100) : null

    const progressVariance =
      plannedProgress === null ? null : actualProgress - plannedProgress

    const scheduleWindowRemaining =
      targetDate && today < targetDate ? daysBetween(targetDate, today) : 0

    const remainingDuration = remainingTasks.reduce((sum, task) => {
      const remainingRatio = clamp(100 - getTaskProgress(task)) / 100
      return sum + getTaskDuration(task) * remainingRatio
    }, 0)

    const requiredPace =
      scheduleWindowRemaining > 0
        ? Math.round((remainingDuration / scheduleWindowRemaining) * 100)
        : 100

    const pacePressure =
      requiredPace <= 100
        ? 'Normal'
        : requiredPace <= 125
        ? 'Tight'
        : requiredPace <= 160
        ? 'Aggressive'
        : 'Critical'

    const openRisks = context.risks.filter(risk =>
      ['open', 'active'].includes(normalise(risk.status))
    )

    const highRisks = openRisks.filter(risk => Number(risk.risk_score || 0) >= 12)

    const pendingApprovals = context.approvals.filter(approval => {
      const status = normalise(approval.status)
      return !['approved', 'rejected', 'closed'].includes(status)
    })

    const overdueApprovals = pendingApprovals.filter(approval => {
      const deadline = safeDate(approval.deadline || approval.due_date)
      return !!deadline && deadline < today
    })

    const procurementRisks = context.procurement.filter(item => {
      const status = normalise(item.status)

      if (['delivered', 'ordered', 'closed'].includes(status)) return false

      const orderDate = safeDate(item.order_by_date || item.required_by || item.due_date)
      if (!orderDate) return false

      return daysBetween(orderDate, today) <= 14
    })

    const openSnags = context.snags.filter(snag =>
      !['closed', 'resolved'].includes(normalise(snag.status))
    )

    const criticalSnags = openSnags.filter(
      snag => normalise(snag.severity) === 'critical'
    )

    const dependencySlip =
      criticalBlockers.length > 0
        ? Math.ceil(
            criticalBlockers.reduce((sum, task) => {
              const progress = getTaskProgress(task)
              return sum + getTaskDuration(task) * ((100 - progress) / 100)
            }, 0) * 0.55
          )
        : 0

    const paceSlip = Math.max(0, Math.round((requiredPace - 120) * 0.08))

    const riskSlip = Math.min(
      10,
      Math.round(
        overdueApprovals.length * 1.5 +
          procurementRisks.length * 0.8 +
          highRisks.length * 1.5 +
          criticalSnags.length * 1.5
      )
    )

    const forecastSlip = clamp(
      Math.ceil(Math.max(sequenceGapDays * 0.7, dependencySlip) + paceSlip + riskSlip),
      0,
      projectScope === 'Carcass' ? 35 : 90
    )

    const forecastFinish =
      targetDate && forecastSlip > 0 ? addDays(targetDate, forecastSlip) : targetDate

    const recoveryStatus: RecoveryStatus =
      forecastSlip === 0 && criticalBlockers.length === 0
        ? 'On Track'
        : forecastSlip <= 7 && criticalBlockers.length <= 2
        ? 'Watch'
        : forecastSlip <= 30
        ? 'Recovery Required'
        : 'Critical'

    const targetCanBeMet =
      recoveryStatus === 'On Track'
        ? 'Yes'
        : recoveryStatus === 'Watch'
        ? 'Yes, monitor closely'
        : recoveryStatus === 'Recovery Required'
        ? 'Yes, with recovery'
        : 'No, unless re-sequenced'

    let confidenceScore = 90

    confidenceScore -= sequenceGap * 2.5
    confidenceScore -= stageGap * 8
    confidenceScore -= forecastSlip * 1.1
    confidenceScore -= criticalBlockers.length * 4
    confidenceScore -= overdueApprovals.length * 3
    confidenceScore -= procurementRisks.length * 2
    confidenceScore -= highRisks.length * 4
    confidenceScore -= criticalSnags.length * 4

    if (pacePressure === 'Critical') confidenceScore -= 12
    if (pacePressure === 'Aggressive') confidenceScore -= 7

    confidenceScore = clamp(Math.round(confidenceScore), 5, 95)

    const additionalCrews =
      forecastSlip === 0
        ? 0
        : forecastSlip <= 7
        ? 1
        : forecastSlip <= 21
        ? 2
        : 3

    const requiredDecisions: string[] = []

    if (additionalCrews > 0) {
      requiredDecisions.push(
        `Approve ${additionalCrews} additional crew${additionalCrews > 1 ? 's' : ''} or extended working hours.`
      )
    }

    if (criticalBlockers.length > 0) {
      requiredDecisions.push(
        `Escalate ${criticalBlockers.length} critical blocker${criticalBlockers.length > 1 ? 's' : ''} before the next workfront can progress.`
      )
    }

    if (procurementRisks.length > 0) {
      requiredDecisions.push('Fast-track procurement items due within 14 days.')
    }

    if (overdueApprovals.length > 0) {
      requiredDecisions.push('Resolve overdue approvals affecting the recovery sequence.')
    }

    if (requiredDecisions.length === 0) {
      requiredDecisions.push('No major management decision required. Continue monitoring.')
    }

    const recoveryActions: string[] = []

    if (criticalBlockers.length > 0) {
      recoveryActions.push(
        `Close ${getTaskName(criticalBlockers[0])} before relying on later activities.`
      )
    }

    if (getStageIndex(actualPosition) < getStageIndex(plannedPosition)) {
      recoveryActions.push(
        `Re-sequence the programme from ${getStageLabel(actualPosition)} to ${getStageLabel(plannedPosition)}.`
      )
    }

    if (actualPosition && getTaskProgress(actualPosition) < 80) {
      recoveryActions.push(
        `Push ${getTaskName(actualPosition)} from ${getTaskProgress(actualPosition)}% to practical completion before opening too many new fronts.`
      )
    }

    if (requiredPace > 120) {
      recoveryActions.push('Introduce daily production targets by workfront and track actual output against plan.')
    }

    if (procurementRisks.length > 0) {
      recoveryActions.push('Update procurement dates and confirm delivery commitments.')
    }

    if (overdueApprovals.length > 0) {
      recoveryActions.push('Escalate pending approvals to avoid idle labour and abortive sequencing.')
    }

    if (recoveryActions.length === 0) {
      recoveryActions.push('Maintain current rhythm and continue weekly recovery monitoring.')
    }

    const positionStatement =
      getStageIndex(actualPosition) < getStageIndex(plannedPosition)
        ? `The project is behind the planned construction sequence. Planned position is ${getTaskName(plannedPosition)}, but the site is still constrained around ${getTaskName(actualPosition)}.`
        : sequenceGap > 0
        ? `The project is behind by ${sequenceGap} activity step(s), even though the stage gap is not severe.`
        : `The project is generally aligned with the planned sequence today.`

    const executiveSummary =
      recoveryStatus === 'On Track'
        ? 'Project sequence is aligned. Maintain current output and continue monitoring blockers.'
        : recoveryStatus === 'Watch'
        ? 'The programme is slightly pressured. Close current blockers quickly to prevent the forecast slipping.'
        : recoveryStatus === 'Recovery Required'
        ? 'A recovery plan is required. The project is not simply behind by percentage; it is behind in workfront sequence.'
        : 'Critical recovery intervention is required. Current sequence, blockers and remaining duration indicate that the target date is unlikely without re-sequencing and extra resources.'

    const blockerReasons = criticalBlockers.map(task => ({
      task,
      reason:
        getTaskProgress(task) > 0
          ? `${getTaskName(task)} is only ${getTaskProgress(task)}% complete.`
          : `${getTaskName(task)} has not started but should have progressed by now.`,
    }))

    const phaseMap = remainingTasks.reduce((acc: Record<string, any>, task) => {
      const phase = task.phase || task.discipline || 'Unassigned'

      if (!acc[phase]) {
        acc[phase] = {
          phase,
          total: 0,
          remaining: 0,
          blockers: 0,
          progressSum: 0,
        }
      }

      acc[phase].total += 1
      acc[phase].remaining += 1
      acc[phase].progressSum += getTaskProgress(task)

      if (criticalBlockers.some(blocker => sameId(blocker.id, task.id))) {
        acc[phase].blockers += 1
      }

      return acc
    }, {})

    const phaseHealth = Object.values(phaseMap).map((phase: any) => ({
      ...phase,
      progress: phase.total ? Math.round(phase.progressSum / phase.total) : 0,
    }))

    return {
      projectScope,
      firstTask,
      lastTask,
      targetDate,
      targetDateSource,
      forecastFinish,
      forecastSlip,
      recoveryStatus,
      targetCanBeMet,
      confidenceScore,
      actualProgress,
      plannedProgress,
      progressVariance,
      plannedPosition,
      actualPosition,
      latestActiveSiteTask,
      plannedTodayActivities,
      activeSiteTasks,
      sequenceGap,
      stageGap,
      gapActivities,
      criticalBlockers,
      blockerReasons,
      missedDueActivities,
      remainingTasks,
      completedTasks,
      totalTasks: workingTasks.length,
      remainingDuration,
      scheduleWindowRemaining,
      requiredPace,
      pacePressure,
      additionalCrews,
      requiredDecisions,
      recoveryActions,
      positionStatement,
      executiveSummary,
      phaseHealth,
      procurementRisks,
      overdueApprovals,
      highRisks,
      criticalSnags,
    }
  }, [projectTasks, context])

  const loading = tasksLoading || contextLoading

  if (loading) {
    return <div className="p-8 text-white">Loading Recovery Forecast...</div>
  }

  if (!projectId) {
    return <div className="card p-8 text-slate-400">No project selected.</div>
  }

  if (projectTasks.length === 0) {
    return (
      <div className="card p-8 text-slate-400">
        No schedule tasks found for this project. Import or add tasks on the Schedule page first.
      </div>
    )
  }

  const statusColor = statusTone(engine.recoveryStatus)

  return (
    <div className="space-y-5 text-white">
      <div className="card p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Recovery Forecast
            </p>
            <h1 className="text-2xl font-bold mt-1">
              Sequence-Based Recovery Forecast
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-4xl">
              Reads directly from the Schedule page data. It compares what should be happening today against what is actually happening on site, then identifies blockers, recovery decisions and forecast finish.
            </p>
          </div>

          <button
            type="button"
            onClick={() => projectId && fetchProjectContext(projectId)}
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

      <div className="grid xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <div className="grid md:grid-cols-4 gap-4">
            <InfoBlock
              title="Project"
              value={projectName || context.project?.project_name || '—'}
              helper={`${engine.totalTasks} in-scope production tasks`}
            />
            <InfoBlock
              title="Scope"
              value={engine.projectScope}
              helper="Set this based on the real contract deliverable."
            />
            <InfoBlock
              title="Target Date"
              value={formatDate(engine.targetDate)}
              helper={engine.targetDateSource}
            />
            <InfoBlock
              title="Forecast Finish"
              value={formatDate(engine.forecastFinish)}
              helper={`${engine.forecastSlip} day forecast slip`}
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
              onChange={event => setSelectedScope(event.target.value as ProjectScope)}
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
        </div>
      </div>

      <div className="card p-5 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Project Position Statement
            </p>
            <h2 className="text-xl font-semibold mt-2">
              {engine.positionStatement}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {engine.executiveSummary}
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Recovery Status
            </p>
            <h3 className={`text-2xl font-bold mt-2 ${toneClass(statusColor)}`}>
              {engine.recoveryStatus}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Confidence: {engine.confidenceScore}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <PositionCard
          label="Planned Today"
          task={engine.plannedPosition}
          helper={`Stage: ${getStageLabel(engine.plannedPosition)}`}
          icon={Target}
        />

        <PositionCard
          label="Actual Site Constraint"
          task={engine.actualPosition}
          helper={`${getTaskProgress(engine.actualPosition as Task)}% complete · ${getStageLabel(engine.actualPosition)}`}
          icon={Activity}
        />

        <MetricCard
          label="Sequence Gap"
          value={`${engine.sequenceGap} activity step(s)`}
          helper={`${engine.stageGap} major stage gap(s)`}
          icon={ArrowRight}
          tone={engine.sequenceGap > 0 || engine.stageGap > 0 ? 'red' : 'green'}
        />

        <MetricCard
          label="Forecast Slip"
          value={`${engine.forecastSlip} day(s)`}
          helper={`Forecast finish: ${formatDate(engine.forecastFinish)}`}
          icon={Clock3}
          tone={engine.forecastSlip > 21 ? 'red' : engine.forecastSlip > 0 ? 'amber' : 'green'}
        />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          label="Can Target Date Still Be Met?"
          value={engine.targetCanBeMet}
          helper={engine.additionalCrews > 0 ? `Recommended: +${engine.additionalCrews} crew(s)` : 'No extra crew required'}
          icon={ShieldCheck}
          tone={
            engine.targetCanBeMet === 'Yes'
              ? 'green'
              : engine.targetCanBeMet.includes('recovery')
              ? 'amber'
              : 'red'
          }
        />

        <MetricCard
          label="Actual Progress"
          value={`${engine.actualProgress}%`}
          helper="Weighted by task duration/weight"
          icon={TrendingUp}
          tone="blue"
        />

        <MetricCard
          label="Planned Progress"
          value={engine.plannedProgress === null ? '—' : `${engine.plannedProgress}%`}
          helper="Expected progress as at today"
          icon={Target}
          tone="slate"
        />

        <MetricCard
          label="Progress Variance"
          value={engine.progressVariance === null ? '—' : `${engine.progressVariance}%`}
          helper="Secondary indicator only"
          icon={AlertTriangle}
          tone={
            engine.progressVariance === null
              ? 'slate'
              : engine.progressVariance < -10
              ? 'red'
              : engine.progressVariance < 0
              ? 'amber'
              : 'green'
          }
        />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MiniMetric title="Remaining Activities" value={engine.remainingTasks.length} />
        <MiniMetric title="Remaining Duration" value={`${Math.ceil(engine.remainingDuration)} days`} />
        <MiniMetric title="Pace Pressure" value={engine.pacePressure} />
        <MiniMetric title="Critical Blockers" value={engine.criticalBlockers.length} />
        <MiniMetric title="Procurement Risks" value={engine.procurementRisks.length} />
        <MiniMetric title="Overdue Approvals" value={engine.overdueApprovals.length} />
        <MiniMetric title="High Risks" value={engine.highRisks.length} />
        <MiniMetric title="Critical Snags" value={engine.criticalSnags.length} />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold mb-1">Blockers to Next Workfront</h2>
          <p className="text-sm text-slate-500 mb-4">
            These are the activities preventing the project from moving cleanly from the actual site position to the planned position.
          </p>

          <div className="space-y-3">
            {engine.blockerReasons.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                No critical sequence blocker detected.
              </div>
            ) : (
              engine.blockerReasons.map(({ task, reason }) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-red-200">
                        {getTaskName(task)}
                      </h3>
                      <p className="text-sm text-slate-300 mt-1">{reason}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Planned: {formatDate(safeDate(getTaskStart(task)))} → {formatDate(safeDate(getTaskFinish(task)))}
                      </p>
                    </div>

                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200">
                      {getTaskProgress(task)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Management Decisions Needed</h2>

          <div className="space-y-3">
            {engine.requiredDecisions.map((item, index) => (
              <Action key={index} icon={ShieldAlert} text={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold mb-1">Activities Between Actual and Planned Position</h2>
          <p className="text-sm text-slate-500 mb-4">
            If this table is empty but blockers exist, the issue is not just task distance; it is sequence dependency.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 text-left">#</th>
                  <th className="text-left">Activity</th>
                  <th className="text-left">Stage</th>
                  <th className="text-left">Planned Finish</th>
                  <th className="text-left">Progress</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {engine.gapActivities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No activity-distance gap detected. Check blocker list for dependency issues.
                    </td>
                  </tr>
                ) : (
                  engine.gapActivities.map(task => (
                    <tr key={task.id} className="border-b border-slate-900">
                      <td className="py-3">{task.task_number || '—'}</td>
                      <td>{getTaskName(task)}</td>
                      <td>{getStageLabel(task)}</td>
                      <td>{formatDate(safeDate(getTaskFinish(task)))}</td>
                      <td>{getTaskProgress(task)}%</td>
                      <td>
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
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
          <h2 className="text-lg font-semibold mb-4">Recovery Actions</h2>

          <div className="space-y-3">
            {engine.recoveryActions.map((item, index) => (
              <Action key={index} icon={CheckCircle2} text={item} />
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
                <th className="text-left">Blockers</th>
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
                    <td className={phase.blockers > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {phase.blockers}
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
                      {phase.blockers > 0 ? (
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

      {engine.missedDueActivities.length > 0 && (
        <div className="card p-5">
          <div className="flex items-start gap-3 mb-4">
            <FileWarning className="text-amber-400 mt-1" size={18} />
            <div>
              <h2 className="text-lg font-semibold">Overdue Activities to Clean Up</h2>
              <p className="text-sm text-slate-500">
                These activities are past planned finish and not complete. Update progress or recovery dates on the Schedule page.
              </p>
            </div>
          </div>

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
                {engine.missedDueActivities.slice(0, 15).map(task => (
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

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  helper?: string
  icon: React.ElementType
  tone: KpiTone
}) {
  return (
    <div className="card p-4">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <h2 className={`mt-2 text-2xl font-bold ${toneClass(tone)}`}>{value}</h2>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>

        <Icon size={18} className={toneClass(tone)} />
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

function Action({
  text,
  icon: Icon,
}: {
  text: string
  icon: React.ElementType
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-300">
      <Icon size={16} className="mt-0.5 text-[#c49e48]" />
      <span>{text}</span>
    </div>
  )
}

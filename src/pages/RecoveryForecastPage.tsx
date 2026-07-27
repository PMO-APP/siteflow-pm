import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  RefreshCw,
  Save,
  ShieldAlert,
  Target,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'

type ProjectScope =
  | 'Carcass'
  | 'Shell & Core'
  | 'Fully Finished'
  | 'Infrastructure'
  | 'MEP Only'
  | 'External Works'
  | 'Custom'

type RecoveryStatus = 'On Track' | 'Watch' | 'Recovery Required' | 'Critical'
type Tone = 'green' | 'amber' | 'red' | 'blue' | 'slate'

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
    'foundation',
    'substructure',
    'superstructure',
    'ground floor',
    'slab',
    'column',
    'beam',
    'blockwork',
    'staircase',
    'roof',
    'parapet',
    'external plaster',
    'external plastering',
    'rendering',
    'practical completion',
  ],
  'Shell & Core': [
    'foundation',
    'substructure',
    'superstructure',
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
    key: 'roof',
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
    label: 'Ceiling Installation',
    keywords: ['ceiling', 'pop', 'gypsum'],
  },
  {
    key: 'finishes',
    label: 'Finishes',
    keywords: ['tiling', 'tile', 'painting', 'paint', 'doors', 'window', 'ironmongery', 'sanitary', 'kitchen', 'wardrobe', 'joinery'],
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

function normalise(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function safeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateValue(value?: string | null) {
  return safeDate(value)?.getTime() || 0
}

function daysBetween(later: Date, earlier: Date) {
  return Math.ceil((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
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
  return String(task.name || `Task ${task.task_number || ''}`).trim()
}

function getTaskStart(task: Task) {
  return (task as any).planned_start || task.start_date || null
}

function getTaskFinish(task: Task) {
  return (task as any).planned_finish || task.finish_date || null
}

function getTaskNumber(task?: Task | null) {
  return Number(task?.task_number || 0)
}

function getTaskProgress(task?: Task | null) {
  if (!task) return 0
  const status = normalise(task.status)

  if (['completed', 'complete', 'done'].includes(status)) return 100
  if (['not started', 'not-started'].includes(status)) return 0

  return clamp(Number((task as any).progress_pct || 0))
}

function getTaskDuration(task: Task) {
  const explicitDuration = Number((task as any).duration_days || 0)
  if (explicitDuration > 0) return explicitDuration

  const start = safeDate(getTaskStart(task))
  const finish = safeDate(getTaskFinish(task))

  if (start && finish) return Math.max(1, daysBetween(finish, start))
  return 1
}

function isComplete(task: Task) {
  return getTaskProgress(task) >= 100
}

function isStarted(task: Task) {
  return getTaskProgress(task) > 0
}

function sameId(a: any, b: any) {
  return String(a) === String(b)
}

function sameProject(a: any, b: any) {
  return String(a) === String(b)
}

function taskText(task: Task) {
  return [
    getTaskName(task),
    task.phase,
    (task as any).category,
    (task as any).discipline,
    (task as any).package_name,
    (task as any).notes,
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

  const text = taskText(task)
  return keywords.some(keyword => text.includes(keyword.toLowerCase()))
}

function sequenceSort(a: Task, b: Task) {
  const aStart = dateValue(getTaskStart(a))
  const bStart = dateValue(getTaskStart(b))
  if (aStart !== bStart) return aStart - bStart

  const aFinish = dateValue(getTaskFinish(a))
  const bFinish = dateValue(getTaskFinish(b))
  if (aFinish !== bFinish) return aFinish - bFinish

  return getTaskNumber(a) - getTaskNumber(b)
}

function isActiveToday(task: Task, today: Date) {
  const start = safeDate(getTaskStart(task))
  const finish = safeDate(getTaskFinish(task))

  return !!start && !!finish && start <= today && finish >= today
}

function getStageIndex(task?: Task | null) {
  if (!task) return -1
  const text = taskText(task)
  return STAGE_ORDER.findIndex(stage =>
    stage.keywords.some(keyword => text.includes(keyword))
  )
}

function getStageLabel(task?: Task | null) {
  const index = getStageIndex(task)
  return index >= 0 ? STAGE_ORDER[index].label : task?.phase || 'Unclassified'
}

function getScope(project: any): ProjectScope {
  const raw = String(project?.project_scope || project?.scope || 'Fully Finished')
  return PROJECT_SCOPES.includes(raw as ProjectScope)
    ? (raw as ProjectScope)
    : 'Fully Finished'
}

function toneClass(tone: Tone) {
  if (tone === 'green') return 'text-emerald-400'
  if (tone === 'amber') return 'text-amber-400'
  if (tone === 'red') return 'text-red-400'
  if (tone === 'blue') return 'text-sky-400'
  return 'text-slate-300'
}

function statusTone(status: RecoveryStatus): Tone {
  if (status === 'On Track') return 'green'
  if (status === 'Watch') return 'blue'
  if (status === 'Recovery Required') return 'amber'
  return 'red'
}

function makeEmptyContext() {
  return {
    project: null as any,
    procurement: [] as any[],
    approvals: [] as any[],
    snags: [] as any[],
    risks: [] as any[],
  }
}

export default function RecoveryForecastPage() {
  const { projectId, projectName } = useProjectStore()
  const { data: tasksFromHook = [], isLoading: tasksLoading } = useTasks()

  const [context, setContext] = useState(makeEmptyContext())
  const [selectedScope, setSelectedScope] = useState<ProjectScope>('Fully Finished')
  const [contextLoading, setContextLoading] = useState(false)
  const [savingScope, setSavingScope] = useState(false)
  const [notice, setNotice] = useState('')

  const projectTasks = useMemo(() => {
    return (tasksFromHook as Task[]).filter(task =>
      !projectId || sameProject(task.project_id, projectId)
    )
  }, [tasksFromHook, projectId])

  useEffect(() => {
    setContext(makeEmptyContext())
    setNotice('')

    if (!projectId) return
    fetchProjectContext(projectId)
  }, [projectId])

  useEffect(() => {
    setSelectedScope(getScope(context.project))
  }, [context.project])

  async function fetchOptionalTable(table: string, activeProjectId: string | number) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('project_id', activeProjectId)

    if (error) {
      console.warn(`${table}: ${error.message}`)
      return []
    }

    return data || []
  }

  async function fetchProjectContext(activeProjectId: string | number) {
    setContextLoading(true)

    const projectRes = await supabase
      .from('projects')
      .select('*')
      .eq('id', activeProjectId)
      .maybeSingle()

    if (projectRes.error) console.warn(projectRes.error.message)

    const [procurement, approvals, snags, risks] = await Promise.all([
      fetchOptionalTable('procurement_items', activeProjectId),
      fetchOptionalTable('approvals', activeProjectId),
      fetchOptionalTable('snags', activeProjectId),
      fetchOptionalTable('risks', activeProjectId),
    ])

    setContext({
      project: projectRes.data || null,
      procurement,
      approvals,
      snags,
      risks,
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
            ? 'Forecast is measured against carcass deliverables only.'
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
    const project = context.project as any
    const projectScope = getScope(project)

    const datedTasks = projectTasks
      .filter(task => safeDate(getTaskStart(task)) && safeDate(getTaskFinish(task)))
      .sort(sequenceSort)

    const scopeFiltered = datedTasks.filter(task => isScopeTask(task, projectScope))
    const schedule = (scopeFiltered.length ? scopeFiltered : datedTasks).sort(sequenceSort)

    const productionTasks = schedule.filter(task => !isSummaryTask(task)).sort(sequenceSort)
    const workingTasks = productionTasks.length ? productionTasks : schedule

    const firstTask = workingTasks[0] || null
    const lastTask = workingTasks[workingTasks.length - 1] || null

    const targetDate =
      safeDate(project?.handover_date) ||
      safeDate(project?.planned_finish) ||
      safeDate(project?.finish_date) ||
      safeDate(project?.target_date) ||
      safeDate(project?.completion_date) ||
      (lastTask ? safeDate(getTaskFinish(lastTask)) : null)

    const targetDateSource = project?.handover_date
      ? 'Project handover date'
      : project?.planned_finish || project?.finish_date || project?.target_date || project?.completion_date
      ? 'Project target date'
      : lastTask
      ? `Last in-scope schedule activity: ${getTaskName(lastTask)}`
      : 'No target date found'

    const plannedTodayActivities = workingTasks.filter(task => isActiveToday(task, today))

    const plannedPosition =
      plannedTodayActivities.length > 0
        ? [...plannedTodayActivities].sort(sequenceSort).slice(-1)[0]
        : [...workingTasks]
            .filter(task => {
              const finish = safeDate(getTaskFinish(task))
              return !!finish && finish < today
            })
            .sort((a, b) => dateValue(getTaskFinish(b)) - dateValue(getTaskFinish(a)))[0] ||
          firstTask

    /*
      Actual site position:
      This uses the earliest incomplete activity that has genuinely started.
      It prevents a later lightly-started activity from hiding the true site constraint.
      Example: if external works has started but M&E first fix is still incomplete, M&E remains the constraint.
    */
    const activeIncomplete = workingTasks
      .filter(task => isStarted(task) && !isComplete(task))
      .sort(sequenceSort)

    const actualPosition =
      activeIncomplete[0] ||
      [...workingTasks].filter(isComplete).sort(sequenceSort).slice(-1)[0] ||
      workingTasks.find(task => !isComplete(task)) ||
      firstTask

    const plannedIndex = plannedPosition
      ? workingTasks.findIndex(task => sameId(task.id, plannedPosition.id))
      : -1

    const actualIndex = actualPosition
      ? workingTasks.findIndex(task => sameId(task.id, actualPosition.id))
      : -1

    const activityGap =
      plannedIndex >= 0 && actualIndex >= 0
        ? Math.max(0, plannedIndex - actualIndex)
        : 0

    const stageGap =
      getStageIndex(plannedPosition) >= 0 && getStageIndex(actualPosition) >= 0
        ? Math.max(0, getStageIndex(plannedPosition) - getStageIndex(actualPosition))
        : 0

    const gapActivities =
      activityGap > 0 && actualIndex >= 0 && plannedIndex >= 0
        ? workingTasks.slice(actualIndex + 1, plannedIndex + 1)
        : []

    /*
      TRUE DELAY LOGIC:
      Delay is not calculated from risk scores, procurement risks or arbitrary caps.
      Delay = how far apart the actual site position and today's planned position are on the approved schedule.

      Example:
      - Today the programme says "Ceiling Installation" should be active.
      - Actual site is still at "M&E First Fix".
      - The delay is the calendar distance between those two schedule positions.
    */
    const plannedStart = plannedPosition ? safeDate(getTaskStart(plannedPosition)) : null
    const plannedFinish = plannedPosition ? safeDate(getTaskFinish(plannedPosition)) : null
    const actualStart = actualPosition ? safeDate(getTaskStart(actualPosition)) : null
    const actualFinish = actualPosition ? safeDate(getTaskFinish(actualPosition)) : null

    const actualReferenceDate = actualFinish || actualStart
    const plannedReferenceDate = plannedStart || plannedFinish

    const schedulePositionDelay =
      actualReferenceDate && plannedReferenceDate
        ? Math.max(0, daysBetween(plannedReferenceDate, actualReferenceDate))
        : 0

    const daysBehind = schedulePositionDelay

    const forecastDate =
      targetDate && daysBehind > 0 ? addDays(targetDate, daysBehind) : targetDate

    const dueButIncomplete = workingTasks.filter(task => {
      const finish = safeDate(getTaskFinish(task))
      return !!finish && finish < today && !isComplete(task)
    })

    const blockers = workingTasks
      .filter(task => {
        const start = safeDate(getTaskStart(task))
        if (!start || start > today || isComplete(task)) return false

        const taskStage = getStageIndex(task)
        const plannedStage = getStageIndex(plannedPosition)

        if (taskStage >= 0 && plannedStage >= 0 && taskStage > plannedStage) {
          return false
        }

        return true
      })
      .sort(sequenceSort)
      .slice(0, 8)

    const totalDuration = workingTasks.reduce((sum, task) => sum + getTaskDuration(task), 0)

    const plannedEarnedDuration = workingTasks.reduce((sum, task) => {
      const start = safeDate(getTaskStart(task))
      const finish = safeDate(getTaskFinish(task))
      const duration = getTaskDuration(task)

      if (!start || !finish) return sum
      if (finish <= today) return sum + duration
      if (start > today) return sum

      const elapsed = clamp(daysBetween(today, start), 0, duration)
      return sum + elapsed
    }, 0)

    const plannedProgress =
      totalDuration > 0 ? Math.round((plannedEarnedDuration / totalDuration) * 100) : 0

    const actualEarnedDuration = workingTasks.reduce((sum, task) => {
      return sum + getTaskDuration(task) * (getTaskProgress(task) / 100)
    }, 0)

    const actualProgress =
      totalDuration > 0 ? Math.round((actualEarnedDuration / totalDuration) * 100) : 0

    const progressVariance = actualProgress - plannedProgress

    const remainingTasks = workingTasks.filter(task => !isComplete(task)
    )

    const remainingDuration = remainingTasks.reduce((sum, task) => {
      return sum + getTaskDuration(task) * ((100 - getTaskProgress(task)) / 100)
    }, 0)

    const remainingToTarget = targetDate && targetDate > today ? daysBetween(targetDate, today) : 0

    const requiredPace =
      remainingToTarget > 0 ? Math.round((remainingDuration / remainingToTarget) * 100) : 100

    const pacePressure =
      requiredPace <= 100
        ? 'Normal'
        : requiredPace <= 125
        ? 'Tight'
        : requiredPace <= 160
        ? 'Aggressive'
        : 'Critical'

    const pendingApprovals = context.approvals.filter(item => {
      const status = normalise(item.status)
      return !['approved', 'rejected', 'closed'].includes(status)
    })

    const overdueApprovals = pendingApprovals.filter(item => {
      const deadline = safeDate(item.deadline || item.due_date || item.approval_deadline)
      return !!deadline && deadline < today
    })

    const procurementRisks = context.procurement.filter(item => {
      const status = normalise(item.status)
      if (['delivered', 'ordered', 'closed'].includes(status)) return false

      const due = safeDate(item.order_by_date || item.required_by || item.due_date)
      return due ? daysBetween(due, today) <= 14 : false
    })

    const openRisks = context.risks.filter(item =>
      ['open', 'active'].includes(normalise(item.status))
    )

    const highRisks = openRisks.filter(item => Number(item.risk_score || 0) >= 12)

    const openSnags = context.snags.filter(item =>
      !['closed', 'resolved'].includes(normalise(item.status))
    )

    const criticalSnags = openSnags.filter(item => normalise(item.severity) === 'critical')

    const recoveryStatus: RecoveryStatus =
      daysBehind === 0 && blockers.length === 0
        ? 'On Track'
        : daysBehind <= 7
        ? 'Watch'
        : daysBehind <= 30
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

    const additionalCrews =
      daysBehind === 0 ? 0 : daysBehind <= 10 ? 1 : daysBehind <= 30 ? 2 : 3

    let confidence = 92
    confidence -= activityGap * 2
    confidence -= stageGap * 8
    confidence -= daysBehind * 0.7
    confidence -= blockers.length * 2
    confidence -= overdueApprovals.length * 2
    confidence -= procurementRisks.length * 1
    confidence -= highRisks.length * 3
    confidence -= criticalSnags.length * 3
    if (pacePressure === 'Critical') confidence -= 8
    if (pacePressure === 'Aggressive') confidence -= 5
    confidence = clamp(Math.round(confidence), 5, 95)

    const recoveryIndex = clamp(
      Math.round(
        100 -
          activityGap * 2.5 -
          stageGap * 8 -
          daysBehind * 0.5 -
          blockers.length * 2 -
          procurementRisks.length * 1 -
          overdueApprovals.length * 1.5 -
          highRisks.length * 2
      ),
      0,
      100
    )

    const delayBasis =
      actualReferenceDate && plannedReferenceDate
        ? `${formatDate(actualReferenceDate)} → ${formatDate(plannedReferenceDate)}`
        : 'Insufficient schedule dates'

    const executiveSummary =
      recoveryStatus === 'On Track'
        ? 'The project is aligned with the current programme sequence. Maintain daily output and continue monitoring constraints.'
        : `The project is ${daysBehind} day(s) behind based on the approved schedule position. As at today, the programme expected ${getTaskName(plannedPosition)}, but site is constrained around ${getTaskName(actualPosition)}. The delay is measured from ${delayBasis}, not from percentage variance.`

    const requiredDecisions: string[] = []

    if (additionalCrews > 0) {
      requiredDecisions.push(
        `Approve ${additionalCrews} additional crew${additionalCrews > 1 ? 's' : ''} or extended working hours.`
      )
    }

    if (blockers.length > 0) {
      requiredDecisions.push(
        `Escalate ${blockers.length} blocker${blockers.length > 1 ? 's' : ''} preventing the next workfront.`
      )
    }

    if (procurementRisks.length > 0) {
      requiredDecisions.push('Fast-track procurement items due within the next 14 days.')
    }

    if (overdueApprovals.length > 0) {
      requiredDecisions.push('Resolve overdue approvals affecting the recovery sequence.')
    }

    if (!requiredDecisions.length) {
      requiredDecisions.push('No major management decision required. Continue weekly monitoring.')
    }

    const recoveryActions: string[] = []

    if (blockers[0]) {
      recoveryActions.push(`Close ${getTaskName(blockers[0])} first. This is the current recovery constraint.`)
    }

    if (stageGap > 0) {
      recoveryActions.push(
        `Re-sequence production from ${getStageLabel(actualPosition)} to ${getStageLabel(plannedPosition)}.`
      )
    }

    if (actualPosition && getTaskProgress(actualPosition) < 80) {
      recoveryActions.push(
        `Push ${getTaskName(actualPosition)} from ${getTaskProgress(actualPosition)}% to completion before relying on downstream works.`
      )
    }

    if (requiredPace > 120) {
      recoveryActions.push('Set daily production targets and track output against each workfront.')
    }

    if (procurementRisks.length > 0) {
      recoveryActions.push('Confirm material delivery commitments for the next two-week lookahead.')
    }

    if (!recoveryActions.length) {
      recoveryActions.push('Maintain current rhythm and update progress weekly.')
    }

    const phaseMap = remainingTasks.reduce((acc: Record<string, any>, task) => {
      const phase = task.phase || (task as any).discipline || 'Unassigned'

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

      if (blockers.some(blocker => sameId(blocker.id, task.id))) {
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
      targetDate,
      targetDateSource,
      forecastDate,
      daysBehind,
      delayBasis,
      recoveryStatus,
      targetCanBeMet,
      additionalCrews,
      confidence,
      recoveryIndex,
      plannedPosition,
      actualPosition,
      activityGap,
      stageGap,
      gapActivities,
      blockers,
      dueButIncomplete,
      actualProgress,
      plannedProgress,
      progressVariance,
      remainingTasks,
      remainingDuration,
      remainingToTarget,
      requiredPace,
      pacePressure,
      procurementRisks,
      overdueApprovals,
      highRisks,
      criticalSnags,
      executiveSummary,
      requiredDecisions,
      recoveryActions,
      phaseHealth,
      totalTasks: workingTasks.length,
    }
  }, [projectTasks, context])

  const loading = tasksLoading || contextLoading
  const statusColour = statusTone(engine.recoveryStatus)

  if (loading) {
    return <div className="p-8 text-[#ede8de]">Loading recovery intelligence...</div>
  }

  if (!projectId) {
    return <div className="card p-8 text-[#6e7d8c]">No project selected.</div>
  }

  if (!projectTasks.length) {
    return (
      <div className="card p-8 text-[#6e7d8c]">
        No schedule tasks found for this project. Import or add tasks on the Schedule page first.
      </div>
    )
  }

  return (
    <div className="pmx-command-page space-y-5 text-[#18212b]">
      <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#6e7d8c]">
              Project Recovery Intelligence
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              {projectName || context.project?.name || context.project?.project_name || 'Selected Project'}
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-[#9aa7b3]">
              A sequence-based recovery view that calculates delay by comparing today's planned schedule position with the actual site position.
            </p>
          </div>

          <button
            type="button"
            onClick={() => projectId && fetchProjectContext(projectId)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#cbd5df] hover:bg-white/[0.04]"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {notice}
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-5">
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#17222d] to-[#0c1117] p-6 shadow-xl">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-[#6e7d8c]">
                Forecast Completion
              </div>

              <div className={`mt-3 text-5xl xl:text-6xl font-black leading-none ${toneClass(statusColour)}`}>
                {formatDate(engine.forecastDate)}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    engine.daysBehind > 30
                      ? 'bg-red-500/15 text-red-300'
                      : engine.daysBehind > 7
                      ? 'bg-amber-500/15 text-amber-300'
                      : engine.daysBehind > 0
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {engine.daysBehind === 0 ? 'On Target' : `+${engine.daysBehind} Days Behind`}
                </span>

                <span className="rounded-full bg-white/[0.05] px-4 py-2 text-sm text-[#9aa7b3]">
                  Target: {formatDate(engine.targetDate)}
                </span>
              </div>

              <p className="mt-4 text-sm text-[#9aa7b3]">
                Delay basis: {engine.delayBasis}
              </p>
              <p className="mt-1 text-xs text-[#6e7d8c]">
                {engine.targetDateSource}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric title="Recovery Status" value={engine.recoveryStatus} tone={statusColour} />
              <HeroMetric title="Recovery Index" value={`${engine.recoveryIndex}/100`} tone={engine.recoveryIndex >= 75 ? 'green' : engine.recoveryIndex >= 50 ? 'amber' : 'red'} />
              <HeroMetric title="Can Target Date Be Met?" value={engine.targetCanBeMet} tone={engine.targetCanBeMet.includes('No') ? 'red' : engine.targetCanBeMet.includes('recovery') ? 'amber' : 'green'} />
              <HeroMetric title="Forecast Confidence" value={`${engine.confidence}%`} tone={engine.confidence >= 70 ? 'green' : engine.confidence >= 45 ? 'amber' : 'red'} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 shadow-xl">
          <label className="text-[10px] uppercase tracking-[0.3em] text-[#6e7d8c]">
            Contract Scope
          </label>

          <div className="mt-3 flex gap-2">
            <select
              value={selectedScope}
              onChange={event => setSelectedScope(event.target.value as ProjectScope)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#081018] px-3 py-2 text-sm text-[#ede8de] outline-none"
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#c49e48] px-4 py-2 text-sm font-semibold text-[#0c1014] disabled:opacity-60"
            >
              <Save size={15} />
              {savingScope ? 'Saving' : 'Save'}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0c141d] p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6e7d8c]">
              Days Behind
            </div>
            <div
              className={`mt-2 text-4xl font-black ${
                engine.daysBehind > 30
                  ? 'text-red-400'
                  : engine.daysBehind > 7
                  ? 'text-amber-400'
                  : engine.daysBehind > 0
                  ? 'text-sky-400'
                  : 'text-emerald-400'
              }`}
            >
              {engine.daysBehind}
            </div>
            <div className="mt-1 text-sm text-[#6e7d8c]">
              {engine.daysBehind === 0
                ? 'project is aligned with today’s schedule position'
                : 'calendar day(s) behind current schedule position'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 shadow-xl">
        <div className="grid xl:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
          <PositionPanel
            title="Should Be Today"
            task={engine.plannedPosition}
            helper={getStageLabel(engine.plannedPosition)}
            tone="blue"
          />

          <div className="hidden xl:flex items-center justify-center text-[#6e7d8c]">
            <ArrowRight size={24} />
          </div>

          <PositionPanel
            title="Actual Site Position"
            task={engine.actualPosition}
            helper={`${getStageLabel(engine.actualPosition)} · ${getTaskProgress(engine.actualPosition)}%`}
            tone="amber"
          />

          <div className="hidden xl:flex items-center justify-center text-[#6e7d8c]">
            <ArrowRight size={24} />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c141d] p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6e7d8c]">
              Schedule Position Gap
            </div>
            <div className={`mt-2 text-3xl font-black ${engine.activityGap || engine.stageGap ? 'text-red-400' : 'text-emerald-400'}`}>
              {engine.activityGap} Steps
            </div>
            <div className="mt-1 text-sm text-[#9aa7b3]">
              {engine.stageGap} major stage gap(s)
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0c141d] p-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#6e7d8c]">
            Executive Interpretation
          </div>
          <p className="mt-2 text-sm leading-6 text-[#cbd5df]">
            {engine.executiveSummary}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard title="Actual Progress" value={`${engine.actualProgress}%`} helper="Secondary indicator" icon={TrendingUp} tone="blue" />
        <MetricCard title="Planned Progress" value={`${engine.plannedProgress}%`} helper="Expected as at today" icon={Target} tone="slate" />
        <MetricCard title="Progress Variance" value={`${engine.progressVariance}%`} helper="Do not rely on this alone" icon={AlertTriangle} tone={engine.progressVariance < -10 ? 'red' : engine.progressVariance < 0 ? 'amber' : 'green'} />
        <MetricCard title="Pace Pressure" value={engine.pacePressure} helper={`${engine.requiredPace}% required pace`} icon={Clock3} tone={engine.pacePressure === 'Critical' ? 'red' : engine.pacePressure === 'Aggressive' ? 'amber' : 'green'} />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <SmallCard title="Remaining Activities" value={engine.remainingTasks.length} />
        <SmallCard title="Critical Blockers" value={engine.blockers.length} />
        <SmallCard title="Procurement Risks" value={engine.procurementRisks.length} />
        <SmallCard title="Overdue Approvals" value={engine.overdueApprovals.length} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 xl:col-span-2 shadow-xl">
          <SectionHeader
            title="Blockers to Next Workfront"
            subtitle="These are incomplete activities that should already be progressing before the planned position can be achieved."
          />

          <div className="mt-4 space-y-3">
            {engine.blockers.length === 0 ? (
              <EmptyGood text="No critical sequence blocker detected." />
            ) : (
              engine.blockers.map(task => (
                <BlockerCard key={task.id} task={task} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 shadow-xl">
          <SectionHeader
            title="Management Decisions"
            subtitle="Actions that need leadership approval or escalation."
          />

          <div className="mt-4 space-y-3">
            {engine.requiredDecisions.map((item, index) => (
              <ActionItem key={index} icon={ShieldAlert} text={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 xl:col-span-2 shadow-xl">
          <SectionHeader
            title="Activities Between Actual and Planned Position"
            subtitle="This shows the schedule activities between where site is and where the programme says it should be."
          />

          <Table
            emptyText="No activity-distance gap detected. Check blockers for dependency issues."
            columns={['#', 'Activity', 'Stage', 'Planned Finish', 'Progress', 'Status']}
            rows={engine.gapActivities.map(task => [
              task.task_number || '—',
              getTaskName(task),
              getStageLabel(task),
              formatDate(safeDate(getTaskFinish(task))),
              `${getTaskProgress(task)}%`,
              'Gap Item',
            ])}
          />
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 shadow-xl">
          <SectionHeader
            title="Recovery Actions"
            subtitle="Practical actions to protect or recover the forecast."
          />

          <div className="mt-4 space-y-3">
            {engine.recoveryActions.map((item, index) => (
              <ActionItem key={index} icon={CheckCircle2} text={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-[#111a22] p-5 shadow-xl">
        <SectionHeader
          title="Workfront Health"
          subtitle="Remaining work grouped by phase, with blocker pressure highlighted."
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.08] text-[#6e7d8c]">
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
                  <td colSpan={5} className="py-6 text-center text-[#6e7d8c]">
                    No phase data available.
                  </td>
                </tr>
              ) : (
                engine.phaseHealth.map((phase: any) => (
                  <tr key={phase.phase} className="border-b border-white/[0.04]">
                    <td className="py-3 font-medium">{phase.phase}</td>
                    <td>{phase.remaining}</td>
                    <td className={phase.blockers > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {phase.blockers}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 rounded-full bg-white/[0.06]">
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

      {engine.dueButIncomplete.length > 0 && (
        <div className="rounded-3xl border border-amber-500/20 bg-[#111a22] p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-1 text-amber-400" size={18} />
            <SectionHeader
              title="Overdue Activities to Clean Up"
              subtitle="These items are past planned finish and not complete. Update progress or recovery dates on the Schedule page."
            />
          </div>

          <Table
            emptyText="No overdue activities."
            columns={['#', 'Activity', 'Planned Finish', 'Progress']}
            rows={engine.dueButIncomplete.slice(0, 15).map(task => [
              task.task_number || '—',
              getTaskName(task),
              formatDate(safeDate(getTaskFinish(task))),
              `${getTaskProgress(task)}%`,
            ])}
          />
        </div>
      )}
    </div>
  )
}

function HeroMetric({
  title,
  value,
  tone,
}: {
  title: string
  value: string | number
  tone: Tone
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c141d] p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#6e7d8c]">
        {title}
      </div>
      <div className={`mt-2 text-xl font-black ${toneClass(tone)}`}>
        {value}
      </div>
    </div>
  )
}

function PositionPanel({
  title,
  task,
  helper,
  tone,
}: {
  title: string
  task?: Task | null
  helper: string
  tone: Tone
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c141d] p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#6e7d8c]">
        {title}
      </div>
      <div className={`mt-2 text-2xl font-black ${toneClass(tone)}`}>
        {getTaskName(task)}
      </div>
      <div className="mt-1 text-sm text-[#9aa7b3]">
        Task #{task?.task_number || '—'} · {helper}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string
  value: string | number
  helper: string
  icon: React.ElementType
  tone: Tone
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111a22] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#6e7d8c]">
            {title}
          </div>
          <div className={`mt-2 text-2xl font-black ${toneClass(tone)}`}>
            {value}
          </div>
          <div className="mt-1 text-xs text-[#6e7d8c]">{helper}</div>
        </div>
        <Icon size={18} className={toneClass(tone)} />
      </div>
    </div>
  )
}

function SmallCard({
  title,
  value,
}: {
  title: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111a22] p-4 shadow-xl">
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#6e7d8c]">
        {title}
      </div>
      <div className="mt-2 text-2xl font-black text-[#c49e48]">{value}</div>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#ede8de]">{title}</h2>
      <p className="mt-1 text-sm text-[#6e7d8c]">{subtitle}</p>
    </div>
  )
}

function EmptyGood({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
      {text}
    </div>
  )
}

function BlockerCard({ task }: { task: Task }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-red-200">{getTaskName(task)}</div>
          <div className="mt-1 text-sm text-[#cbd5df]">
            {getTaskProgress(task) > 0
              ? `${getTaskName(task)} is only ${getTaskProgress(task)}% complete.`
              : `${getTaskName(task)} has not started but should have progressed by now.`}
          </div>
          <div className="mt-1 text-xs text-[#6e7d8c]">
            Planned: {formatDate(safeDate(getTaskStart(task)))} → {formatDate(safeDate(getTaskFinish(task)))}
          </div>
        </div>

        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200">
          {getTaskProgress(task)}%
        </span>
      </div>
    </div>
  )
}

function ActionItem({
  text,
  icon: Icon,
}: {
  text: string
  icon: React.ElementType
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#0c141d] p-3 text-sm text-[#cbd5df]">
      <Icon size={16} className="mt-0.5 text-[#c49e48]" />
      <span>{text}</span>
    </div>
  )
}

function Table({
  columns,
  rows,
  emptyText,
}: {
  columns: string[]
  rows: Array<Array<string | number>>
  emptyText: string
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-white/[0.08] text-[#6e7d8c]">
          <tr>
            {columns.map(column => (
              <th key={column} className="py-3 text-left">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-[#6e7d8c]">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-white/[0.04]">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

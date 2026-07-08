import { useMemo } from 'react'
import { differenceInDays, addDays } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useData'

export type ProjectScope =
  | 'Carcass'
  | 'Shell & Core'
  | 'Fully Finished'
  | 'Infrastructure'
  | 'MEP Only'
  | 'External Works'
  | 'Custom'

const DEFAULT_SCOPE: ProjectScope = 'Fully Finished'

const SCOPE_KEYWORDS: Record<ProjectScope, string[]> = {
  Carcass: [
    'excavation',
    'foundation',
    'blinding',
    'ground beam',
    'ground floor',
    'slab',
    'column',
    'beam',
    'blockwork',
    'floor',
    'roof',
    'parapet',
    'staircase',
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

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function sameId(a: any, b: any) {
  return String(a) === String(b)
}

function safeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getTaskName(task: any) {
  return String(task.name || task.activity || task.task_name || task.title || '')
}

function getTaskStart(task: any) {
  return task?.planned_start || task?.start_date || task?.baseline_start || null
}

function getTaskFinish(task: any) {
  return task?.planned_finish || task?.finish_date || task?.baseline_finish || null
}

function getTaskProgress(task: any): number {
  const status = String(task.status || '').toLowerCase()

  if (status === 'completed' || status === 'done') return 100
  if (status === 'not started') return 0

  return clamp(Number(task.progress_pct ?? task.progress ?? 0))
}

function calcWeightedProgress(tasks: any[]) {
  if (!tasks.length) return 0

  const totalWeight = tasks.reduce(
    (sum, task) => sum + Number(task.weight_pct || 0),
    0
  )

  if (totalWeight === 0) {
    return Math.round(
      tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) /
        tasks.length
    )
  }

  const earnedWeight = tasks.reduce(
    (sum, task) =>
      sum + (Number(task.weight_pct || 0) * getTaskProgress(task)) / 100,
    0
  )

  return Math.round((earnedWeight / totalWeight) * 100)
}

function getScope(project: any): ProjectScope {
  const raw = String(project?.project_scope || project?.scope || DEFAULT_SCOPE)

  const validScopes: ProjectScope[] = [
    'Carcass',
    'Shell & Core',
    'Fully Finished',
    'Infrastructure',
    'MEP Only',
    'External Works',
    'Custom',
  ]

  return validScopes.includes(raw as ProjectScope)
    ? (raw as ProjectScope)
    : DEFAULT_SCOPE
}

function getScopeTasks(tasks: any[], scope: ProjectScope) {
  if (scope === 'Fully Finished' || scope === 'Custom') return tasks

  const keywords = SCOPE_KEYWORDS[scope] || []

  if (!keywords.length) return tasks

  const matched = tasks.filter(task => {
    const haystack = [
      getTaskName(task),
      task.phase,
      task.package,
      task.discipline,
      task.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return keywords.some(keyword => haystack.includes(keyword.toLowerCase()))
  })

  return matched.length ? matched : tasks
}

function getFirstTask(tasks: any[]) {
  return (
    [...tasks]
      .filter(task => safeDate(getTaskStart(task)))
      .sort((a, b) => {
        const aDate = safeDate(getTaskStart(a))?.getTime() ?? 0
        const bDate = safeDate(getTaskStart(b))?.getTime() ?? 0
        return aDate - bDate
      })[0] || null
  )
}

function getLastTask(tasks: any[]) {
  return (
    [...tasks]
      .filter(task => safeDate(getTaskFinish(task)))
      .sort((a, b) => {
        const aDate = safeDate(getTaskFinish(a))?.getTime() ?? 0
        const bDate = safeDate(getTaskFinish(b))?.getTime() ?? 0
        return bDate - aDate
      })[0] || null
  )
}

export function useProjectIntelligence(projectId?: string | number | null) {
  const { data: taskData = [] } = useTasks()
  const { data: projectData = [] } = useProjects()

  return useMemo(() => {
    const today = new Date()

    const allTasks = (taskData as any[])
      .filter(task => !projectId || sameId(task.project_id, projectId))
      .sort((a, b) => Number(a.task_number || 0) - Number(b.task_number || 0))

    const project = (projectData as any[]).find(item =>
      projectId ? sameId(item.id, projectId) : false
    )

    const projectScope = getScope(project)
    const scopeTasks = getScopeTasks(allTasks, projectScope)

    const firstScheduleTask = getFirstTask(scopeTasks)
    const lastScheduleTask = getLastTask(scopeTasks)

    const projectStart =
      safeDate(project?.start_date) ||
      (firstScheduleTask ? safeDate(getTaskStart(firstScheduleTask)) : null)

    const explicitHandoverDate = safeDate(project?.handover_date)
    const plannedFinishDate = safeDate(project?.planned_finish)
    const scheduleFinishDate = lastScheduleTask
      ? safeDate(getTaskFinish(lastScheduleTask))
      : null

    const plannedFinish =
      explicitHandoverDate || plannedFinishDate || scheduleFinishDate

    const handoverDateSource = explicitHandoverDate
      ? 'Project Handover Date'
      : plannedFinishDate
      ? 'Project Planned Finish'
      : lastScheduleTask
      ? `Schedule (${getTaskName(lastScheduleTask) || 'Last Task'})`
      : 'Not Set'

    const totalDays =
      projectStart && plannedFinish
        ? Math.max(1, differenceInDays(plannedFinish, projectStart))
        : 0

    const elapsedDays =
      projectStart && plannedFinish
        ? clamp(differenceInDays(today, projectStart), 0, totalDays)
        : 0

    const daysRemaining = plannedFinish
      ? Math.max(0, differenceInDays(plannedFinish, today))
      : null

    const plannedProgress =
      totalDays > 0 ? clamp(Math.round((elapsedDays / totalDays) * 100)) : 0

    const actualProgress = calcWeightedProgress(scopeTasks)

    const delayedTasks = scopeTasks.filter(task => {
      const finish = safeDate(getTaskFinish(task))
      return (
        !!finish &&
        finish < today &&
        getTaskProgress(task) < 100 &&
        !['completed', 'done'].includes(String(task.status || '').toLowerCase())
      )
    })

    const activeDelayedTask =
      [...delayedTasks].sort((a, b) => {
        const aFinish = safeDate(getTaskFinish(a))?.getTime() ?? 0
        const bFinish = safeDate(getTaskFinish(b))?.getTime() ?? 0
        return aFinish - bFinish
      })[0] || null

    const delayDays = activeDelayedTask
      ? Math.max(
          0,
          differenceInDays(today, safeDate(getTaskFinish(activeDelayedTask))!)
        )
      : 0

    const forecastFinish =
      plannedFinish && delayDays > 0 ? addDays(plannedFinish, delayDays) : plannedFinish

    const varianceDays = delayDays > 0 ? -delayDays : 0

    const varianceLabel =
      varianceDays < 0 ? `${Math.abs(varianceDays)} Days Behind` : 'On Schedule'

    const variancePct = actualProgress - plannedProgress

    let status = 'On Track'

    if (actualProgress >= 100) {
      status = 'Completed'
    } else if (varianceDays <= -15) {
      status = 'Behind Schedule'
    } else if (varianceDays < 0) {
      status = 'At Risk'
    }

    const confidenceScore = clamp(
      100 -
        delayedTasks.length * 3 -
        delayDays * 1.2 -
        Math.max(0, -variancePct) * 2,
      5,
      95
    )

    const scopeNote =
      projectScope === 'Carcass'
        ? 'Forecast is based on carcass scope only. It should not be interpreted as fully finished project handover.'
        : projectScope === 'Shell & Core'
        ? 'Forecast is based on shell and core scope.'
        : projectScope === 'Fully Finished'
        ? 'Forecast is based on full completion scope.'
        : `Forecast is based on ${projectScope} scope.`

    return {
      project,
      allTasks,
      tasks: scopeTasks,
      projectScope,
      scopeNote,

      firstScheduleTask,
      lastScheduleTask,

      projectStart,
      plannedFinish,
      handoverDate: plannedFinish,
      handoverDateSource,

      projectStartIso: projectStart ? projectStart.toISOString() : null,
      plannedFinishIso: plannedFinish ? plannedFinish.toISOString() : null,
      handoverDateIso: plannedFinish ? plannedFinish.toISOString() : null,

      forecastFinish,
      forecastFinishIso: forecastFinish ? forecastFinish.toISOString() : null,

      totalDays,
      elapsedDays,
      daysRemaining,

      plannedProgress,
      actualProgress,
      overallProgress: actualProgress,

      variancePct,
      varianceDays,
      varianceLabel,
      varianceStatus: varianceDays < 0 ? 'BEHIND' : 'ON TRACK',

      status,
      projectHealth: status,
      confidenceScore,

      delayedTasks,
      delayedTask: activeDelayedTask,
      delayDays,

      housebuildProgress: calcWeightedProgress(
        scopeTasks.filter(task => task.discipline === 'Housebuild')
      ),
      mepProgress: calcWeightedProgress(
        scopeTasks.filter(task => task.discipline === 'MEP')
      ),
      infrastructureProgress: calcWeightedProgress(
        scopeTasks.filter(task => task.discipline === 'Infrastructure')
      ),
    }
  }, [taskData, projectData, projectId])
}

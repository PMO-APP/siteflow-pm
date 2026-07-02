import { useMemo } from 'react'
import { differenceInDays, addDays } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useData'

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function getTaskProgress(task: any): number {
  if (task.status === 'Completed') return 100
  if (task.status === 'Not Started') return 0
  return Number(task.progress_pct || 0)
}

function calcWeightedProgress(tasks: any[]) {
  if (!tasks.length) return 0

  const totalWeight = tasks.reduce(
    (sum, task) => sum + Number(task.weight_pct || 0),
    0
  )

  if (totalWeight === 0) return 0

  const earnedWeight = tasks.reduce(
    (sum, task) =>
      sum + (Number(task.weight_pct || 0) * getTaskProgress(task)) / 100,
    0
  )

  return Math.round((earnedWeight / totalWeight) * 100)
}

export function useProjectHealth(projectId?: string | number | null) {
  const { data: taskData = [] } = useTasks()
  const { data: projectData = [] } = useProjects()

  return useMemo(() => {
    const tasks = (taskData as any[]).filter(
      task => !projectId || String(task.project_id) === String(projectId)
    )

    const projects = projectData as any[]
    const project = projects.find(
      item => String(item.id) === String(projectId)
    )

    const today = new Date()

    const projectStart = project?.start_date
      ? new Date(project.start_date)
      : null

    const plannedFinish = project?.handover_date
      ? new Date(project.handover_date)
      : null

    const hasTimeline = Boolean(projectStart && plannedFinish)

    const totalDays = hasTimeline
      ? Math.max(1, differenceInDays(plannedFinish!, projectStart!))
      : 0

    const elapsedDays = hasTimeline
      ? clamp(differenceInDays(today, projectStart!), 0, totalDays)
      : 0

    const daysRemaining = plannedFinish
      ? Math.max(0, differenceInDays(plannedFinish, today))
      : null

    const plannedProgress = hasTimeline
      ? clamp(Math.round((elapsedDays / totalDays) * 100))
      : 0

    const actualProgress = calcWeightedProgress(tasks)

    const variancePct =
      hasTimeline && tasks.length > 0 ? actualProgress - plannedProgress : null

    const progressRate =
      elapsedDays > 0 && actualProgress > 0
        ? actualProgress / elapsedDays
        : 0

    const forecastDuration =
      progressRate > 0
        ? Math.ceil(100 / progressRate)
        : totalDays

    const forecastFinish =
      hasTimeline && projectStart
        ? addDays(projectStart, forecastDuration)
        : null

    const varianceDays =
      forecastFinish && plannedFinish
        ? differenceInDays(forecastFinish, plannedFinish)
        : null

    const varianceLabel =
      varianceDays === null
        ? 'No Baseline'
        : varianceDays > 0
        ? `+${varianceDays} Days`
        : varianceDays < 0
        ? `${varianceDays} Days`
        : 'On Schedule'

    const varianceStatus =
      varianceDays === null
        ? 'NO BASELINE'
        : varianceDays > 0
        ? 'BEHIND'
        : varianceDays < 0
        ? 'AHEAD'
        : 'ON TRACK'

    let projectHealth = 'On Track'

    if (actualProgress >= 100) {
      projectHealth = 'Completed'
    } else if (varianceDays !== null && varianceDays >= 15) {
      projectHealth = 'Behind Schedule'
    } else if (varianceDays !== null && varianceDays > 0) {
      projectHealth = 'At Risk'
    } else if (varianceDays !== null && varianceDays < 0) {
      projectHealth = 'Ahead of Programme'
    }

    const inProgressTasks = tasks
      .filter(
        task =>
          Number(getTaskProgress(task)) > 0 &&
          Number(getTaskProgress(task)) < 100
      )
      .sort(
        (a, b) =>
          Number(getTaskProgress(b)) - Number(getTaskProgress(a))
      )

    const leadingTask = inProgressTasks[0]

    const statusSummary = leadingTask
      ? `${leadingTask.name || `Task ${leadingTask.task_number}`} is currently at ${getTaskProgress(leadingTask)}% completion.`
      : actualProgress >= 100
      ? 'Project activities are fully completed.'
      : 'No active in-progress schedule activity has been recorded yet.'

    const housebuildProgress = calcWeightedProgress(
      tasks.filter(task => task.discipline === 'Housebuild')
    )

    const mepProgress = calcWeightedProgress(
      tasks.filter(task => task.discipline === 'MEP')
    )

    const infrastructureProgress = calcWeightedProgress(
      tasks.filter(task => task.discipline === 'Infrastructure')
    )

    return {
      project,
      tasks,

      projectStart,
      plannedFinish,
      forecastFinish,

      projectStartIso: projectStart ? projectStart.toISOString() : null,
      plannedFinishIso: plannedFinish ? plannedFinish.toISOString() : null,
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
      varianceStatus,

      projectHealth,
      status: projectHealth,
      statusSummary,

      housebuildProgress,
      mepProgress,
      infrastructureProgress,
    }
  }, [taskData, projectData, projectId])
}

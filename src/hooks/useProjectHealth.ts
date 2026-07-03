import { useMemo } from 'react'
import { differenceInDays } from 'date-fns'
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

function getTaskDate(task: any, key: 'start' | 'finish') {
  const value =
    key === 'start'
      ? task.planned_start || task.start_date
      : task.planned_finish || task.finish_date

  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function useProjectHealth(projectId?: string | number | null) {
  const { data: taskData = [] } = useTasks()
  const { data: projectData = [] } = useProjects()

  return useMemo(() => {
    const today = new Date()

    const tasks = (taskData as any[])
      .filter(task => !projectId || String(task.project_id) === String(projectId))
      .sort((a, b) => Number(a.task_number || 0) - Number(b.task_number || 0))

    const project = (projectData as any[]).find(
      item => String(item.id) === String(projectId)
    )

    const projectStart = project?.start_date ? new Date(project.start_date) : null
    const plannedFinish = project?.handover_date
      ? new Date(project.handover_date)
      : null

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

    const actualProgress = calcWeightedProgress(tasks)

    const delayedTasks = tasks.filter(task => {
      const finish = getTaskDate(task, 'finish')
      return finish && finish < today && getTaskProgress(task) < 100
    })

    const activeDelayedTask =
      delayedTasks.sort((a, b) => {
        const aFinish = getTaskDate(a, 'finish')?.getTime() || 0
        const bFinish = getTaskDate(b, 'finish')?.getTime() || 0
        return aFinish - bFinish
      })[0] || null

    const currentPlannedTask =
      tasks.find(task => {
        const start = getTaskDate(task, 'start')
        const finish = getTaskDate(task, 'finish')
        return start && finish && start <= today && finish >= today
      }) || null

    const varianceDays = activeDelayedTask
      ? -Math.max(
          0,
          differenceInDays(today, getTaskDate(activeDelayedTask, 'finish')!)
        )
      : 0

    const varianceLabel =
      varianceDays < 0
        ? `${Math.abs(varianceDays)} Days Behind`
        : varianceDays > 0
        ? `+${varianceDays} Days Ahead`
        : 'On Schedule'

    const varianceStatus =
      varianceDays < 0 ? 'BEHIND' : varianceDays > 0 ? 'AHEAD' : 'ON TRACK'

    let projectHealth = 'On Track'

    if (actualProgress >= 100) {
      projectHealth = 'Completed'
    } else if (varianceDays <= -15) {
      projectHealth = 'Behind Schedule'
    } else if (varianceDays < 0) {
      projectHealth = 'At Risk'
    }

    const inProgressTasks = tasks
      .filter(task => getTaskProgress(task) > 0 && getTaskProgress(task) < 100)
      .sort((a, b) => Number(b.task_number || 0) - Number(a.task_number || 0))

    const leadingTask = inProgressTasks[0]

    const statusSummary = activeDelayedTask
      ? `${activeDelayedTask.name || `Task ${activeDelayedTask.task_number}`} should have finished by ${
          getTaskDate(activeDelayedTask, 'finish')?.toLocaleDateString('en-GB') || 'the planned date'
        }, but is currently at ${getTaskProgress(activeDelayedTask)}%.`
      : leadingTask
      ? `${leadingTask.name || `Task ${leadingTask.task_number}`} is currently at ${getTaskProgress(leadingTask)}% completion.`
      : actualProgress >= 100
      ? 'Project activities are fully completed.'
      : 'No active in-progress schedule activity has been recorded yet.'

    return {
      project,
      tasks,

      projectStart,
      plannedFinish,

      projectStartIso: projectStart ? projectStart.toISOString() : null,
      plannedFinishIso: plannedFinish ? plannedFinish.toISOString() : null,

      forecastFinish: null,
      forecastFinishIso: null,

      totalDays,
      elapsedDays,
      daysRemaining,

      plannedProgress,
      actualProgress,
      overallProgress: actualProgress,

      variancePct: actualProgress - plannedProgress,
      varianceDays,
      varianceLabel,
      varianceStatus,

      projectHealth,
      status: projectHealth,
      statusSummary,

      delayedTask: activeDelayedTask,
      currentPlannedTask,

      housebuildProgress: calcWeightedProgress(
        tasks.filter(task => task.discipline === 'Housebuild')
      ),
      mepProgress: calcWeightedProgress(
        tasks.filter(task => task.discipline === 'MEP')
      ),
      infrastructureProgress: calcWeightedProgress(
        tasks.filter(task => task.discipline === 'Infrastructure')
      ),
    }
  }, [taskData, projectData, projectId])
}

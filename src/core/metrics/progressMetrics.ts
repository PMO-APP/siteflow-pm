export type ProgressTask = {
  status?: string | null
  progress_pct?: number | string | null
  progress?: number | string | null
  percent_complete?: number | string | null
  weight_pct?: number | string | null
  duration?: number | string | null
  duration_days?: number | string | null
  planned_start?: string | null
  planned_finish?: string | null
  start_date?: string | null
  finish_date?: string | null
  project_id?: string | number | null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function number(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function status(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function taskProgress(task: ProgressTask) {
  const taskStatus = status(task.status)
  if (['completed', 'complete', 'done'].includes(taskStatus)) return 100
  if (['not started', 'not_started'].includes(taskStatus)) return 0
  return clamp(number(task.progress_pct, task.progress, task.percent_complete))
}

function date(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function durationWeight(task: ProgressTask) {
  const explicit = number(task.weight_pct)
  if (explicit > 0) return explicit

  const storedDuration = number(task.duration_days, task.duration)
  if (storedDuration > 0) return storedDuration

  const start = date(task.planned_start || task.start_date)
  const finish = date(task.planned_finish || task.finish_date)
  if (start && finish) {
    return Math.max(1, Math.round((finish.getTime() - start.getTime()) / 86400000) + 1)
  }

  return 1
}

export function calculateProjectProgress(tasks: ProgressTask[]) {
  if (!tasks.length) return 0
  const weights = tasks.map(durationWeight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) return 0

  const earned = tasks.reduce(
    (sum, task, index) => sum + weights[index] * (taskProgress(task) / 100),
    0,
  )

  return Math.round(clamp((earned / totalWeight) * 100))
}

export function calculateProjectPlannedProgress(tasks: ProgressTask[], today = new Date()) {
  if (!tasks.length) return 0
  const weights = tasks.map(durationWeight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) return 0

  const plannedEarned = tasks.reduce((sum, task, index) => {
    const start = date(task.planned_start || task.start_date)
    const finish = date(task.planned_finish || task.finish_date)
    let planned = 0

    if (start && finish) {
      if (today >= finish) planned = 100
      else if (today > start) {
        const duration = Math.max(1, finish.getTime() - start.getTime())
        planned = clamp(((today.getTime() - start.getTime()) / duration) * 100)
      }
    }

    return sum + weights[index] * (planned / 100)
  }, 0)

  return Math.round(clamp((plannedEarned / totalWeight) * 100))
}

export function calculatePortfolioProgress(
  projects: Array<{ id: string | number; weight_pct?: number | string | null; budget?: number | string | null }>,
  tasks: ProgressTask[],
) {
  if (!projects.length) return 0

  const rows = projects.map(project => {
    const projectTasks = tasks.filter(task => String(task.project_id) === String(project.id))
    const progress = calculateProjectProgress(projectTasks)
    const explicitWeight = number(project.weight_pct)
    const budgetWeight = number(project.budget)
    const scheduleWeight = projectTasks.reduce((sum, task) => sum + durationWeight(task), 0)
    const weight = explicitWeight > 0 ? explicitWeight : budgetWeight > 0 ? budgetWeight : Math.max(1, scheduleWeight)
    return { progress, weight }
  })

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0)
  if (totalWeight <= 0) return 0
  return Math.round(clamp(rows.reduce((sum, row) => sum + row.progress * row.weight, 0) / totalWeight))
}

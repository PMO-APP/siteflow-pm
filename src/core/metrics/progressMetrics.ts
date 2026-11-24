export type ProgressTask = {
  is_summary?: boolean | null
  is_milestone?: boolean | null
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
    if (value == null || value === '') continue
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
  const storedDuration = number(task.duration_days, task.duration)
  if (storedDuration > 0) return storedDuration

  const start = date(task.planned_start || task.start_date)
  const finish = date(task.planned_finish || task.finish_date)
  if (start && finish) {
    return Math.max(1, Math.round((finish.getTime() - start.getTime()) / 86400000) + 1)
  }

  return 1
}

export function executableTasks<T extends ProgressTask>(tasks: T[]): T[] {
  return tasks.filter(t => !t.is_summary && !['cancelled', 'canceled'].includes(status(t.status)))
}

export function progressBasis(tasks: ProgressTask[]) {
  const rows = executableTasks(tasks).filter(t => !t.is_milestone)
  const explicit = rows.length > 0 && rows.every(t => t.weight_pct != null && t.weight_pct !== '' && Number.isFinite(Number(t.weight_pct)) && Number(t.weight_pct) >= 0)
    && Math.abs(rows.reduce((sum, t) => sum + Number(t.weight_pct), 0) - 100) < 0.01
  return explicit ? 'Recorded activity weights' : 'Duration-weighted estimate'
}

function day(value: string | Date | null | undefined) {
  if (!value) return NaN
  const key = typeof value === 'string' ? value.slice(0, 10) : new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
  return Date.parse(key + 'T00:00:00Z') / 86400000
}

export function activityTiming(tasks: ProgressTask[], today = new Date()) {
  const asOf = day(today)
  const rows = executableTasks(tasks).filter(t => taskProgress(t) < 100)
  return {
    lateStarts: rows.filter(t => taskProgress(t) === 0 && day(t.planned_start || t.start_date) < asOf).length,
    overdue: rows.filter(t => day(t.planned_finish || t.finish_date) < asOf).length,
  }
}

export function calculateProgressPosition(tasks: ProgressTask[], today = new Date()) {
  const rows = executableTasks(tasks).filter(t => !t.is_milestone)
  const basis = progressBasis(tasks)
  const weights = rows.map(t => basis === 'Recorded activity weights' ? Number(t.weight_pct) : durationWeight(t))
  const total = weights.reduce((sum, w) => sum + w, 0)
  const asOf = day(today)
  const actual = rows.reduce((sum, t, i) => sum + weights[i] * taskProgress(t), 0)
  const planned = rows.reduce((sum, t, i) => {
    const start = day(t.planned_start || t.start_date)
    const finish = day(t.planned_finish || t.finish_date)
    // End-of-reporting-day convention; inclusive calendar days.
    const fraction = Number.isFinite(start) && Number.isFinite(finish) && finish >= start
      ? clamp((asOf - start + 1) / (finish - start + 1), 0, 1) : 0
    return sum + weights[i] * fraction * 100
  }, 0)
  return { actual: total ? Math.round(actual / total) : 0, planned: total ? Math.round(planned / total) : 0, basis, ...activityTiming(tasks, today) }
}

export function calculateProjectProgress(tasks: ProgressTask[]) {
  return calculateProgressPosition(tasks).actual
}

export function calculateProjectPlannedProgress(tasks: ProgressTask[], today = new Date()) {
  return calculateProgressPosition(tasks, today).planned
}

export function calculatePortfolioProgress(
  projects: Array<{ id: string | number; weight_pct?: number | string | null; budget?: number | string | null }>,
  tasks: ProgressTask[],
) {
  if (!projects.length) return 0

  const eligible = projects.filter(project => executableTasks(tasks.filter(task => String(task.project_id) === String(project.id))).some(t => !t.is_milestone))
  const useExplicit = eligible.every(p => number(p.weight_pct) > 0)
  const useBudget = !useExplicit && eligible.every(p => number(p.budget) > 0)
  const rows = eligible.map(project => {
    const projectTasks = tasks.filter(task => String(task.project_id) === String(project.id))
    const progress = calculateProjectProgress(projectTasks)
    const explicitWeight = number(project.weight_pct)
    const budgetWeight = number(project.budget)
    const scheduleWeight = executableTasks(projectTasks).filter(t => !t.is_milestone).reduce((sum, task) => sum + durationWeight(task), 0)
    const weight = useExplicit ? explicitWeight : useBudget ? budgetWeight : Math.max(1, scheduleWeight)
    return { progress, weight }
  })

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0)
  if (totalWeight <= 0) return 0
  return Math.round(clamp(rows.reduce((sum, row) => sum + row.progress * row.weight, 0) / totalWeight))
}

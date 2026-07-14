import { differenceInDays, addDays } from 'date-fns'

export type ForecastTask = {
  id: string
  name?: string | null
  status?: string | null
  progress_pct?: number | string | null
  planned_start?: string | null
  planned_finish?: string | null
  start_date?: string | null
  finish_date?: string | null
  task_number?: number | string | null
}

export type ForecastResult = {
  targetDate: Date | null
  plannedPosition: ForecastTask | null
  actualPosition: ForecastTask | null
  daysBehind: number
  forecastDate: Date | null
  activityGap: number
  status: 'on_track' | 'watch' | 'recovery_required' | 'critical'
}

function toDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getStart(task: ForecastTask) {
  return task.planned_start || task.start_date || null
}

function getFinish(task: ForecastTask) {
  return task.planned_finish || task.finish_date || null
}

function getProgress(task: ForecastTask) {
  if (task.status === 'Completed') return 100
  if (task.status === 'Not Started') return 0
  return Math.max(0, Math.min(100, Number(task.progress_pct || 0)))
}

function sortTasks(a: ForecastTask, b: ForecastTask) {
  const aStart = toDate(getStart(a))?.getTime() || 0
  const bStart = toDate(getStart(b))?.getTime() || 0
  if (aStart !== bStart) return aStart - bStart
  return Number(a.task_number || 0) - Number(b.task_number || 0)
}

export function calculateForecast({
  tasks,
  targetDate,
  today = new Date(),
}: {
  tasks: ForecastTask[]
  targetDate?: string | Date | null
  today?: Date
}): ForecastResult {
  const schedule = [...tasks]
    .filter(task => toDate(getStart(task)) && toDate(getFinish(task)))
    .sort(sortTasks)

  const resolvedTarget =
    targetDate instanceof Date
      ? targetDate
      : toDate(targetDate || null) ||
        toDate(getFinish(schedule[schedule.length - 1]))

  const plannedPosition =
    schedule.filter(task => {
      const start = toDate(getStart(task))
      const finish = toDate(getFinish(task))
      return !!start && !!finish && start <= today && finish >= today
    }).slice(-1)[0] ||
    schedule.filter(task => {
      const finish = toDate(getFinish(task))
      return !!finish && finish <= today
    }).slice(-1)[0] ||
    null

  const actualPosition =
    schedule
      .filter(task => getProgress(task) > 0 && getProgress(task) < 100)
      .sort(sortTasks)[0] ||
    schedule.filter(task => getProgress(task) >= 100).slice(-1)[0] ||
    schedule.find(task => getProgress(task) === 0) ||
    null

  const plannedIndex = plannedPosition
    ? schedule.findIndex(task => String(task.id) === String(plannedPosition.id))
    : -1

  const actualIndex = actualPosition
    ? schedule.findIndex(task => String(task.id) === String(actualPosition.id))
    : -1

  const activityGap =
    plannedIndex >= 0 && actualIndex >= 0
      ? Math.max(0, plannedIndex - actualIndex)
      : 0

  const actualReference = actualPosition
    ? toDate(getFinish(actualPosition)) || toDate(getStart(actualPosition))
    : null

  const plannedReference = plannedPosition
    ? toDate(getStart(plannedPosition)) || toDate(getFinish(plannedPosition))
    : null

  const daysBehind =
    actualReference && plannedReference
      ? Math.max(0, differenceInDays(plannedReference, actualReference))
      : 0

  const forecastDate =
    resolvedTarget && daysBehind > 0
      ? addDays(resolvedTarget, daysBehind)
      : resolvedTarget

  const status =
    daysBehind === 0
      ? 'on_track'
      : daysBehind <= 7
      ? 'watch'
      : daysBehind <= 30
      ? 'recovery_required'
      : 'critical'

  return {
    targetDate: resolvedTarget,
    plannedPosition,
    actualPosition,
    daysBehind,
    forecastDate,
    activityGap,
    status,
  }
}

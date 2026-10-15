import type { Task } from '@/types'

export interface PackageForecast {
  packageId: string
  target: string | null
  forecast: string | null
  varianceDays: number | null
  taskCount: number
  completedCount: number
  overdueCount: number
  confidence: 'Indicative' | 'Insufficient data'
  reason: string
}

const DAY = 86_400_000
const dateValue = (value?: string | null) => {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}
const dateOnly = (time: number) => new Date(time).toISOString().slice(0, 10)
const progress = (task: Task) => {
  if (['completed', 'complete', 'done'].includes(String(task.status).toLowerCase())) return 100
  return Math.min(100, Math.max(0, Number(task.progress_pct || 0)))
}

/**
 * First-stage, non-critical-path package projection. Does not infer task dependencies,
 * resources, or production rates. Never presents a missing programme as on-time.
 */
export function calculatePackageForecast(
  packageId: string,
  target: string | null,
  allTasks: Task[],
  now = new Date(),
): PackageForecast {
  const tasks = allTasks.filter(task => String(task.delivery_package_id || '') === packageId)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const base = { packageId, target, taskCount: tasks.length, completedCount: tasks.filter(t => progress(t) >= 100).length }
  const unfinished = tasks.filter(t => progress(t) < 100)
  const overdueCount = unfinished.filter(t => {
    const finish = dateValue((t as Task & { planned_finish?: string }).planned_finish || t.finish_date)
    return finish !== null && finish < today
  }).length
  const unavailable = (reason: string): PackageForecast => ({ ...base, forecast: null, varianceDays: null, overdueCount, confidence: 'Insufficient data', reason })
  if (!tasks.length) return unavailable('No schedule activities linked to this package')
  if (!target || dateValue(target) === null) return unavailable('Package handover target is missing')
  if (tasks.some(t => dateValue((t as Task & { planned_finish?: string }).planned_finish || t.finish_date) === null)) {
    return unavailable('Some schedule activities have no valid finish date')
  }
  if (unfinished.some(t => !Number.isFinite(Number(t.duration_days)) || Number(t.duration_days) <= 0)) {
    return unavailable('Remaining activity durations are missing')
  }
  // A duration-based lower-confidence projection; parallel work is permitted.
  // Future tasks retain their planned start, overdue tasks restart remaining work today.
  const projected = tasks.map(task => {
    const finish = dateValue((task as Task & { planned_finish?: string }).planned_finish || task.finish_date)!
    if (progress(task) >= 100) return dateValue(task.actual_finish) ?? finish
    const start = dateValue((task as Task & { planned_start?: string }).planned_start || task.start_date) ?? finish
    const remaining = Math.max(1, Math.ceil(Number(task.duration_days) * (100 - progress(task)) / 100))
    return Math.max(today, start) + (remaining - 1) * DAY
  })
  const forecastTime = Math.max(...projected)
  const targetTime = dateValue(target)!
  return {
    ...base, overdueCount, forecast: dateOnly(forecastTime),
    varianceDays: Math.ceil((forecastTime - targetTime) / DAY),
    confidence: 'Indicative',
    reason: 'Duration-based estimate; dependencies, crew capacity and actual production rates are not validated',
  }
}

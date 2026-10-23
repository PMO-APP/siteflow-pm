import type { Task } from '@/types'
import type { MeasuredDurationResult } from './measuredDurationEvidence'

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
  dependencyCount?: number
  dependencyIssues?: number
  scenarioRate?: number
  evidence?: PackageEvidence
  measuredDurationCount?: number
  assumedDurationCount?: number
}

export interface PackageEvidence {
  totalTasks: number
  datedActualStarts: number
  datedActualFinishes: number
  updatedInLast14Days: number
  verifiedProductionRates: number
  verifiedCrewAllocations: number
  issues: string[]
}

/** An evidence audit, not a substitute for measured production quantities. */
export function auditPackageEvidence(packageId: string, allTasks: Task[], now = new Date()): PackageEvidence {
  const tasks = allTasks.filter(task => String(task.delivery_package_id || '') === packageId)
  const recentCutoff = now.getTime() - 14 * 86_400_000
  const datedActualStarts = tasks.filter(task => dateValue(task.actual_start) !== null).length
  const datedActualFinishes = tasks.filter(task => dateValue(task.actual_finish) !== null).length
  const updatedInLast14Days = tasks.filter(task => {
    const timestamp = Date.parse(task.updated_at || '')
    return Number.isFinite(timestamp) && timestamp >= recentCutoff && timestamp <= now.getTime()
  }).length
  const issues: string[] = []
  if (!tasks.length) issues.push('No linked package activities')
  if (tasks.length && !datedActualStarts) issues.push('No dated actual starts')
  if (tasks.length && !datedActualFinishes) issues.push('No dated actual finishes')
  if (tasks.length && !updatedInLast14Days) issues.push('No activity updates in the past 14 days')
  issues.push('Measured production quantities and crew allocations are not available in the task records')
  return { totalTasks: tasks.length, datedActualStarts, datedActualFinishes, updatedInLast14Days,
    verifiedProductionRates: 0, verifiedCrewAllocations: 0, issues }
}

const DAY = 86_400_000
const dateValue = (value?: string | null) => {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? Date.UTC(new Date(time).getUTCFullYear(), new Date(time).getUTCMonth(), new Date(time).getUTCDate()) : null
}
const dateOnly = (time: number) => new Date(time).toISOString().slice(0, 10)
const progress = (task: Task) => {
  if (['completed', 'complete', 'done'].includes(String(task.status).toLowerCase())) return 100
  return Math.min(100, Math.max(0, Number(task.progress_pct || 0)))
}
const plannedStart = (task: Task) => dateValue((task as Task & { planned_start?: string }).planned_start || task.start_date)
const plannedFinish = (task: Task) => dateValue((task as Task & { planned_finish?: string }).planned_finish || task.finish_date)

/**
 * Preliminary, dependency-aware finish-to-start projection. Never represents an
 * indicative calculation as an approved recovery programme or validated forecast.
 * Dependencies must reference task IDs or unambiguous task numbers within the package.
 * Unresolved or cyclic dependencies make the estimate unavailable rather than silently
 * ignoring schedule logic. Crew capacity and actual productivity still require validation.
 */
export function calculatePackageForecast(
  packageId: string,
  target: string | null,
  allTasks: Task[],
  now = new Date(),
  scenarioRate = 1,
  measuredDurations: ReadonlyMap<string, MeasuredDurationResult> = new Map(),
): PackageForecast {
  const tasks = allTasks.filter(task => String(task.delivery_package_id || '') === packageId)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const completedCount = tasks.filter(t => progress(t) >= 100).length
  const unfinished = tasks.filter(t => progress(t) < 100)
  const overdueCount = unfinished.filter(t => (plannedFinish(t) ?? Infinity) < today).length
  const evidence = auditPackageEvidence(packageId, allTasks, now)
  // Keys are activity IDs; only results supplied for this package's activities are used.
  // Callers must validate activity/package identity before supplying measurements.
  const measuredDurationCount = unfinished.filter(task => measuredDurations.get(String(task.id))?.available === true).length
  const assumedDurationCount = unfinished.length - measuredDurationCount
  const base = { packageId, target, taskCount: tasks.length, completedCount, overdueCount, evidence, measuredDurationCount, assumedDurationCount }
  const unavailable = (reason: string, dependencyCount = 0, dependencyIssues = 0): PackageForecast => ({
    ...base, forecast: null, varianceDays: null, confidence: 'Insufficient data', reason, dependencyCount, dependencyIssues,
  })
  if (!Number.isFinite(scenarioRate) || scenarioRate < 0.5 || scenarioRate > 2) return unavailable('Scenario productivity factor must be between 0.5 and 2')
  if (!tasks.length) return unavailable('No schedule activities linked to this package')
  if (dateValue(target) === null) return unavailable('Package handover target is missing')
  if (tasks.some(t => plannedFinish(t) === null)) return unavailable('Some activities have no valid planned finish')
  if (unfinished.some(t => plannedStart(t) === null)) return unavailable('Some unfinished activities have no valid planned start')
  if (unfinished.some(t => measuredDurations.get(String(t.id))?.available !== true && (!Number.isFinite(Number(t.duration_days)) || Number(t.duration_days) <= 0))) {
    return unavailable('Some unfinished activities have no valid duration')
  }

  const byId = new Map(tasks.map(t => [String(t.id), t]))
  const byNumber = new Map<string, Task | null>()
  tasks.forEach(t => {
    if (t.task_number == null) return
    const key = String(t.task_number)
    byNumber.set(key, byNumber.has(key) ? null : t)
  })
  const predecessors = new Map<string, Task[]>()
  let dependencyCount = 0
  let dependencyIssues = 0
  for (const task of tasks) {
    const raw = String(task.dependencies || '').trim()
    if (!raw) { predecessors.set(task.id, []); continue }
    // Only simple FS references are supported. Other relationship types and lags
    // must be explicitly modelled before any forecast can be published.
    const refs = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
    const resolved: Task[] = []
    for (const ref of refs) {
      dependencyCount++
      // Preserve non-FS/lagged links in the register, but never project them as FS.
      if (!/^\d+$/.test(ref) && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ref)) {
        return unavailable('MS Project SS/FF/SF or lead/lag links require a relationship-aware forecast engine', dependencyCount, 1)
      }
      const match = byId.get(ref) ?? byNumber.get(ref)
      if (!match || match.id === task.id) { dependencyIssues++; continue }
      resolved.push(match)
    }
    predecessors.set(task.id, resolved)
  }
  if (dependencyIssues) return unavailable(`${dependencyIssues} unresolved, ambiguous or self-referencing predecessor links; verify package schedule`, dependencyCount, dependencyIssues)

  const projected = new Map<string, number>()
  const visiting = new Set<string>()
  let cyclic = false
  const finishOf = (task: Task): number => {
    if (projected.has(task.id)) return projected.get(task.id)!
    if (visiting.has(task.id)) { cyclic = true; return NaN }
    visiting.add(task.id)
    const predecessorFinishes = (predecessors.get(task.id) || []).map(finishOf)
    let finish: number
    if (progress(task) >= 100) {
      finish = dateValue(task.actual_finish) ?? plannedFinish(task)!
    } else {
      const measured = measuredDurations.get(String(task.id))
      // A measured result is ALREADY a remaining-work duration. Never multiply it
      // by remaining progress or the hypothetical scenario slider a second time.
      const remaining = measured?.available
        ? Math.max(1, Math.ceil(measured.days))
        : Math.max(1, Math.ceil(Number(task.duration_days) * (100 - progress(task)) / (100 * scenarioRate)))
      const earliest = Math.max(today, plannedStart(task)!, ...predecessorFinishes.map(value => value + DAY))
      finish = earliest + (remaining - 1) * DAY
    }
    visiting.delete(task.id)
    projected.set(task.id, finish)
    return finish
  }
  const dates = tasks.map(finishOf)
  if (cyclic || dates.some(value => !Number.isFinite(value))) return unavailable('Cyclic or invalid schedule dependencies; correct predecessor links', dependencyCount, 1)
  const forecastTime = Math.max(...dates)
  return {
    ...base, forecast: dateOnly(forecastTime), varianceDays: Math.round((forecastTime - dateValue(target)!) / DAY),
    confidence: 'Indicative', dependencyCount, dependencyIssues: 0, scenarioRate,
    reason: `${dependencyCount} predecessor links modelled; ${overdueCount} overdue activities. ${measuredDurationCount} measured remaining durations, ${assumedDurationCount} schedule/scenario durations. Scenario factor ${scenarioRate.toFixed(2)}x applies only to unmeasured activities. Preliminary finish-to-start estimate only: crew availability, overlaps, calendars and actual production rates remain unverified`,
  }
}

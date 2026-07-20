import { addDays, differenceInCalendarDays } from 'date-fns'
import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import { toDate } from '@/core/intelligence/normalizers/dateUtils'
import { analyseSchedule } from './scheduleAnalysis'
import { detectWorkfronts } from './workfrontEngine'
import type { ForecastV7Result, V7ActivityState } from './types'

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function projectTarget(state: ProjectState) {
  return toDate(state.project.handoverDate) || toDate(state.project.targetDate) || toDate(state.schedule.finishDate)
}

function impactDays(item: V7ActivityState, today: Date) {
  const start = toDate(item.activity.plannedStart)
  const finish = toDate(item.activity.plannedFinish)
  if (item.actualProgress >= 100 || !item.isDue) return 0
  if (item.actualProgress === 0 && start && today > start) {
    return Math.max(item.varianceDays, differenceInCalendarDays(today, start))
  }
  if (finish && today > finish && item.actualProgress < 100) {
    return Math.max(item.varianceDays, differenceInCalendarDays(today, finish) + Math.ceil((100 - item.actualProgress) / 100 * item.durationDays))
  }
  return item.varianceDays
}

export function calculateForecastV7(state: ProjectState, today = new Date()): ForecastV7Result {
  const activities = analyseSchedule(state, today)
  const workfronts = detectWorkfronts(activities)
  const detailed = activities.filter(item => !item.isSummary)
  const targetDate = projectTarget(state)

  const criticalDrivers = detailed
    .filter(item => item.isCriticalImpact && item.isDue && item.actualProgress < 100)
    .map(item => ({ item, days: impactDays(item, today) }))
    .filter(entry => entry.days > 0)
    .sort((a, b) => b.days - a.days)

  const grossDelayDays = criticalDrivers[0]?.days || 0
  const healthyParallelWorkfronts = workfronts.filter(workfront => ['ahead', 'on_track'].includes(workfront.status) && workfront.progress > 0).length
  const blockedWorkfronts = workfronts.filter(workfront => workfront.status === 'blocked').length

  // Conservative recovery allowance: parallel progress can recover part of a delay,
  // but never more than 35% without explicit resource/productivity data.
  const recoverableDays = grossDelayDays > 0
    ? Math.min(Math.floor(grossDelayDays * 0.35), healthyParallelWorkfronts * 2)
    : 0
  const delayDays = Math.max(0, grossDelayDays - recoverableDays)
  const forecastDate = targetDate ? addDays(targetDate, delayDays) : null

  const elapsed = Math.max(1, differenceInCalendarDays(today, toDate(state.schedule.startDate) || today))
  const remaining = targetDate ? Math.max(1, differenceInCalendarDays(targetDate, today)) : 1
  const actualPerDay = state.schedule.weightedProgress / elapsed
  const requiredPerDay = Math.max(0, 100 - state.schedule.weightedProgress) / remaining
  const efficiency = requiredPerDay > 0 ? clamp(actualPerDay / requiredPerDay * 100) : 100

  const dependencyCoverage = detailed.length
    ? detailed.filter(item => item.activity.predecessorIds.length > 0 || item.activity.isCritical).length / detailed.length
    : 0
  const datedCoverage = detailed.length
    ? detailed.filter(item => item.activity.plannedStart && item.activity.plannedFinish).length / detailed.length
    : 0
  const confidenceReasons: string[] = []
  if (dependencyCoverage < 0.35) confidenceReasons.push('Dependency and critical-path data are incomplete.')
  if (datedCoverage < 0.8) confidenceReasons.push('Some schedule activities do not have complete planned dates.')
  if (!targetDate) confidenceReasons.push('No approved project target date is available.')
  if (!criticalDrivers.length && state.schedule.variancePercent < -5) confidenceReasons.push('Progress variance exists, but no completion-driving activity could be confirmed.')

  const confidence = Math.round(clamp(
    45 + dependencyCoverage * 30 + datedCoverage * 20 - blockedWorkfronts * 5 - (confidenceReasons.length ? 5 : 0)
  ))
  const recoverable = delayDays === 0 || (delayDays <= 30 && confidence >= 55)
  const status: ForecastV7Result['status'] = !targetDate || datedCoverage < 0.5
    ? 'insufficient_data'
    : delayDays === 0
      ? 'on_track'
      : delayDays <= 7
        ? 'watch'
        : delayDays <= 30
          ? 'recovery_required'
          : 'critical'

  const currentWorkfronts = workfronts.map(item => item.leadActivity).filter(Boolean) as V7ActivityState[]
  const primaryConstraint = criticalDrivers[0]?.item.activity.name || null
  const explanation = status === 'on_track'
    ? `No confirmed critical-path delay is currently affecting the approved completion date. ${workfronts.length} active or ready workfront(s) were assessed.`
    : status === 'insufficient_data'
      ? 'The forecast is limited because the schedule network or approved target date is incomplete.'
      : `${criticalDrivers.length} completion-driving activit${criticalDrivers.length === 1 ? 'y' : 'ies'} were identified. The largest verified gross impact is ${grossDelayDays} day(s), with ${recoverableDays} day(s) of conservative parallel-work recovery allowance.`

  return {
    targetDate,
    forecastDate,
    grossDelayDays,
    recoverableDays,
    delayDays,
    status,
    confidence,
    confidenceReasons,
    activities,
    workfronts,
    criticalDrivers: criticalDrivers.map(entry => entry.item),
    currentWorkfronts,
    primaryConstraint,
    production: {
      actualPerDay: Number(actualPerDay.toFixed(2)),
      requiredPerDay: Number(requiredPerDay.toFixed(2)),
      efficiency: Math.round(efficiency),
    },
    recoverable,
    explanation,
  }
}

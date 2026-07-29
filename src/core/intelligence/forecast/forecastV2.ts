import { addDays, differenceInCalendarDays } from 'date-fns'
import { analyseScheduleSequence } from '@/core/intelligence/sequence/sequenceEngine'
import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import { toDate } from '@/core/intelligence/normalizers/dateUtils'

export type ProductionRate = {
  actualPerDay: number
  requiredPerDay: number
  efficiency: number
}

export type ForecastV2Result = {
  targetDate: Date | null
  forecastDate: Date | null
  delayDays: number

  plannedPosition: ProjectState['schedule']['activities'][number] | null
  actualPosition: ProjectState['schedule']['activities'][number] | null

  activityGap: number
  recoverable: boolean
  recoveryConfidence: number

  production: ProductionRate

  status: 'on_track' | 'watch' | 'recovery_required' | 'critical'
  primaryConstraint: string | null
}

type Activity = ProjectState['schedule']['activities'][number]

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function sortActivities(activities: Activity[]) {
  return [...activities].sort((a, b) => {
    if (a.taskNumber !== b.taskNumber) return a.taskNumber - b.taskNumber

    const aStart = toDate(a.plannedStart)?.getTime() || 0
    const bStart = toDate(b.plannedStart)?.getTime() || 0
    return aStart - bStart
  })
}

/**
 * Imported MS Project schedules commonly contain summary rows whose progress is
 * rolled up from their children. Those rows must not be treated as the physical
 * workfront. Without an explicit `is_summary` field, we conservatively identify
 * obvious headings and roll-up rows from their names and date spans.
 */
function isLikelySummaryActivity(activity: Activity, activities: Activity[]) {
  const name = activity.name.trim()
  const words = name.split(/\s+/).filter(Boolean)
  const isUppercaseHeading =
    name.length > 2 &&
    name === name.toUpperCase() &&
    /[A-Z]/.test(name) &&
    words.length <= 8

  const start = toDate(activity.plannedStart)
  const finish = toDate(activity.plannedFinish)
  const duration =
    start && finish
      ? Math.max(0, differenceInCalendarDays(finish, start))
      : 0

  const hasContainedActivities =
    start && finish
      ? activities.some(candidate => {
          if (candidate.id === activity.id) return false
          const childStart = toDate(candidate.plannedStart)
          const childFinish = toDate(candidate.plannedFinish)
          return (
            childStart &&
            childFinish &&
            childStart >= start &&
            childFinish <= finish &&
            candidate.taskNumber > activity.taskNumber
          )
        })
      : false

  return isUppercaseHeading || (duration >= 30 && hasContainedActivities)
}

function getDetailedActivities(activities: Activity[]) {
  const detailed = activities.filter(
    activity => !isLikelySummaryActivity(activity, activities)
  )

  // Never return an empty schedule merely because an imported programme uses
  // unusual naming. Falling back is safer than producing no intelligence.
  return detailed.length > 0 ? detailed : activities
}

function getPlannedPosition(activities: Activity[], today: Date) {
  return (
    activities
      .filter(activity => {
        const start = toDate(activity.plannedStart)
        const finish = toDate(activity.plannedFinish)
        return start && finish && start <= today && finish >= today
      })
      .slice(-1)[0] ||
    activities
      .filter(activity => {
        const finish = toDate(activity.plannedFinish)
        return finish && finish <= today
      })
      .slice(-1)[0] ||
    null
  )
}

/**
 * The current workfront is the first incomplete detailed activity after the
 * latest completed detailed activity. This avoids selecting programme summary
 * rows such as “MAIN BUILDING”, whose rolled-up progress can span years.
 */
function getActualWorkfront(activities: Activity[]) {
  let latestCompletedIndex = -1

  activities.forEach((activity, index) => {
    if (activity.progress >= 100) latestCompletedIndex = index
  })

  if (latestCompletedIndex >= 0) {
    const nextIncomplete = activities
      .slice(latestCompletedIndex + 1)
      .find(activity => activity.progress < 100)

    if (nextIncomplete) return nextIncomplete
  }

  return activities.find(activity => activity.progress < 100) || null
}

/**
 * Calculates delay from the current physical workfront rather than from the
 * overall percentage gap.
 *
 * - Not started after planned start: calendar days from planned start to today.
 * - In progress: compare actual progress with linear planned progress today.
 *   A task that is ahead of its expected progress returns zero delay.
 * - Completed: no current workfront delay.
 */
function getWorkfrontDelayDays(activity: Activity | null, today: Date) {
  if (!activity || activity.progress >= 100) return 0

  const plannedStart = toDate(activity.plannedStart)
  const plannedFinish = toDate(activity.plannedFinish)

  if (!plannedStart || plannedStart > today) return 0

  if (activity.progress <= 0) {
    return Math.max(0, differenceInCalendarDays(today, plannedStart))
  }

  if (!plannedFinish) {
    const actualStart = toDate(activity.actualStart)
    return actualStart
      ? Math.max(0, differenceInCalendarDays(actualStart, plannedStart))
      : 0
  }

  const durationDays = Math.max(
    1,
    differenceInCalendarDays(plannedFinish, plannedStart) + 1
  )

  const elapsedPlannedDays = clamp(
    differenceInCalendarDays(today, plannedStart) + 1,
    0,
    durationDays
  )

  const expectedProgress = clamp(
    (elapsedPlannedDays / durationDays) * 100
  )

  if (activity.progress >= expectedProgress) return 0

  const progressShortfall = expectedProgress - activity.progress
  return Math.max(
    0,
    Math.ceil((progressShortfall / 100) * durationDays)
  )
}

function getElapsedDays(state: ProjectState, today: Date) {
  const start = toDate(state.schedule.startDate)
  if (!start) return 0
  return Math.max(1, differenceInCalendarDays(today, start))
}

function getRemainingDays(state: ProjectState, today: Date) {
  const finish =
    toDate(state.project.handoverDate) ||
    toDate(state.project.targetDate) ||
    toDate(state.schedule.finishDate)

  if (!finish) return 0
  return Math.max(1, differenceInCalendarDays(finish, today))
}

export function calculateForecastV2(
  state: ProjectState,
  today = new Date()
): ForecastV2Result {
  const sequence = analyseScheduleSequence(
    state.schedule.activities.map(activity => ({
      id: activity.id,
      name: activity.name,
      taskNumber: activity.taskNumber,
      plannedStart: toDate(activity.plannedStart),
      plannedFinish: toDate(activity.plannedFinish),
      progress: activity.progress,
      phase: activity.phase,
      source: activity,
    })),
    today
  )

  const activities = sequence.activities.map(activity => activity.source)
  const plannedPosition = sequence.plannedPosition?.source || null
  const actualPosition = sequence.actualPosition?.source || null
  const activityGap = sequence.activityGap

  const elapsedDays = getElapsedDays(state, today)
  const remainingDays = getRemainingDays(state, today)
  const actualPerDay =
    elapsedDays > 0 ? state.schedule.weightedProgress / elapsedDays : 0
  const remainingProgress = Math.max(0, 100 - state.schedule.weightedProgress)
  const requiredPerDay =
    remainingDays > 0 ? remainingProgress / remainingDays : remainingProgress
  const efficiency =
    requiredPerDay > 0
      ? clamp((actualPerDay / requiredPerDay) * 100)
      : 100

  const delayDays = sequence.delayDays

  // The approved project target defines the relevant scope completion. The
  // imported programme finish is used only when no project target is available.
  const targetDate =
    toDate(state.project.handoverDate) ||
    toDate(state.project.targetDate) ||
    toDate(state.schedule.finishDate)

  const forecastDate =
    targetDate && delayDays > 0 ? addDays(targetDate, delayDays) : targetDate

  const blockedCritical = activities.filter(activity => {
    const plannedStart = toDate(activity.plannedStart)
    return (
      activity.isCritical &&
      activity.isBlocked &&
      activity.progress < 100 &&
      !!plannedStart &&
      plannedStart <= today
    )
  })

  const primaryConstraint =
    delayDays > 0 || blockedCritical.length > 0
      ? blockedCritical[0]?.name || actualPosition?.name || null
      : null

  const recoveryConfidence = clamp(
    100 -
      delayDays * 1.3 -
      blockedCritical.length * 12 -
      Math.max(0, requiredPerDay - actualPerDay) * 18 +
      Math.min(15, state.schedule.weightedProgress * 0.1)
  )

  const recoverable = recoveryConfidence >= 55 && delayDays <= 60
  const status =
    delayDays === 0
      ? 'on_track'
      : delayDays <= 7
        ? 'watch'
        : delayDays <= 30
          ? 'recovery_required'
          : 'critical'

  return {
    targetDate,
    forecastDate,
    delayDays,
    plannedPosition,
    actualPosition,
    activityGap,
    recoverable,
    recoveryConfidence: Math.round(recoveryConfidence),
    production: {
      actualPerDay: Number(actualPerDay.toFixed(2)),
      requiredPerDay: Number(requiredPerDay.toFixed(2)),
      efficiency: Math.round(efficiency),
    },
    status,
    primaryConstraint,
  }
}

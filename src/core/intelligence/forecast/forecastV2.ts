import { addDays, differenceInDays } from 'date-fns'
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

  status:
    | 'on_track'
    | 'watch'
    | 'recovery_required'
    | 'critical'

  primaryConstraint: string | null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function sortActivities(
  activities: ProjectState['schedule']['activities']
) {
  return [...activities].sort((a, b) => {
    if (a.taskNumber !== b.taskNumber) {
      return a.taskNumber - b.taskNumber
    }

    const aStart = toDate(a.plannedStart)?.getTime() || 0
    const bStart = toDate(b.plannedStart)?.getTime() || 0
    return aStart - bStart
  })
}

function getElapsedDays(state: ProjectState, today: Date) {
  const start = toDate(state.schedule.startDate)
  if (!start) return 0
  return Math.max(1, differenceInDays(today, start))
}

function getRemainingDays(state: ProjectState, today: Date) {
  const finish =
    toDate(state.project.handoverDate) ||
    toDate(state.project.targetDate) ||
    toDate(state.schedule.finishDate)

  if (!finish) return 0
  return Math.max(1, differenceInDays(finish, today))
}

function getActualWorkfront(
  activities: ProjectState['schedule']['activities']
) {
  const active = activities.find(
    activity => activity.progress > 0 && activity.progress < 100
  )

  if (active) return active

  const latestStartedIndex = activities.reduce(
    (latestIndex, activity, index) =>
      activity.progress > 0 ? index : latestIndex,
    -1
  )

  if (latestStartedIndex >= 0) {
    const nextIncomplete = activities
      .slice(latestStartedIndex + 1)
      .find(activity => activity.progress < 100)

    if (nextIncomplete) return nextIncomplete
  }

  return activities.find(activity => activity.progress < 100) || null
}

function getWorkfrontDelayDays(
  actualPosition: ProjectState['schedule']['activities'][number] | null,
  today: Date
) {
  if (!actualPosition || actualPosition.progress >= 100) return 0

  const plannedStart = toDate(actualPosition.plannedStart)
  if (!plannedStart || plannedStart >= today) return 0

  const actualStart = toDate(actualPosition.actualStart)
  const comparisonDate = actualStart && actualStart <= today ? actualStart : today

  return Math.max(0, differenceInDays(comparisonDate, plannedStart))
}

export function calculateForecastV2(
  state: ProjectState,
  today = new Date()
): ForecastV2Result {
  const activities = sortActivities(state.schedule.activities)

  const plannedPosition =
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

  const actualPosition = getActualWorkfront(activities)

  const plannedIndex = plannedPosition
    ? activities.findIndex(activity => activity.id === plannedPosition.id)
    : -1

  const actualIndex = actualPosition
    ? activities.findIndex(activity => activity.id === actualPosition.id)
    : -1

  const activityGap =
    plannedIndex >= 0 && actualIndex >= 0
      ? Math.max(0, plannedIndex - actualIndex)
      : 0

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

  // Delivery variance is based on the current physical workfront.
  // Example: if the next activity should have started on 5 June but is only
  // starting on 20 July, the project is 45 calendar days behind that workfront.
  const delayDays = getWorkfrontDelayDays(actualPosition, today)

  // The project target date represents the approved scope completion date.
  // The schedule finish is only a fallback when the project has no target date.
  const targetDate =
    toDate(state.project.handoverDate) ||
    toDate(state.project.targetDate) ||
    toDate(state.schedule.finishDate)

  const forecastDate =
    targetDate && delayDays > 0 ? addDays(targetDate, delayDays) : targetDate

  const blockedCritical = activities.filter(
    activity =>
      activity.isCritical &&
      activity.isBlocked &&
      activity.progress < 100 &&
      (toDate(activity.plannedStart)?.getTime() || Infinity) <= today.getTime()
  )

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

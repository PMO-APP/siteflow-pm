import { differenceInCalendarDays } from 'date-fns'

export type SequenceActivity = {
  id: string
  name: string
  taskNumber: number
  plannedStart: Date | null
  plannedFinish: Date | null
  progress: number
  phase?: string | null
  isSummary?: boolean
}

export type SequenceAnalysis<T extends SequenceActivity = SequenceActivity> = {
  activities: T[]
  plannedPosition: T | null
  actualPosition: T | null
  plannedIndex: number
  actualIndex: number
  activityGap: number
  delayDays: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function dateValue(value: Date | null) {
  return value?.getTime() || 0
}

/**
 * Programme order is primarily chronological. Task number is only a tie-breaker
 * because imported package schedules may reuse task numbers across packages.
 */
export function sortSequenceActivities<T extends SequenceActivity>(activities: T[]) {
  return [...activities].sort((a, b) => {
    const startDifference = dateValue(a.plannedStart) - dateValue(b.plannedStart)
    if (startDifference !== 0) return startDifference

    const finishDifference = dateValue(a.plannedFinish) - dateValue(b.plannedFinish)
    if (finishDifference !== 0) return finishDifference

    return a.taskNumber - b.taskNumber
  })
}

function looksLikeSummary<T extends SequenceActivity>(activity: T, activities: T[]) {
  if (activity.isSummary) return true

  const name = activity.name.trim()
  const words = name.split(/\s+/).filter(Boolean)
  const uppercaseHeading =
    name.length > 2 &&
    name === name.toUpperCase() &&
    /[A-Z]/.test(name) &&
    words.length <= 8

  const start = activity.plannedStart
  const finish = activity.plannedFinish
  const duration =
    start && finish
      ? Math.max(0, differenceInCalendarDays(finish, start))
      : 0

  const containsOtherRows =
    start && finish
      ? activities.some(candidate => {
          if (candidate.id === activity.id) return false
          return Boolean(
            candidate.plannedStart &&
              candidate.plannedFinish &&
              candidate.plannedStart >= start &&
              candidate.plannedFinish <= finish &&
              candidate.taskNumber >= activity.taskNumber
          )
        })
      : false

  return uppercaseHeading || (duration >= 30 && containsOtherRows)
}

function detailedActivities<T extends SequenceActivity>(activities: T[]) {
  const detailed = activities.filter(activity => !looksLikeSummary(activity, activities))
  return detailed.length > 0 ? detailed : activities
}

function getPlannedPosition<T extends SequenceActivity>(activities: T[], today: Date) {
  const activeToday = activities.filter(activity =>
    Boolean(
      activity.plannedStart &&
        activity.plannedFinish &&
        activity.plannedStart <= today &&
        activity.plannedFinish >= today
    )
  )

  if (activeToday.length > 0) return activeToday[activeToday.length - 1]

  const latestDue = activities
    .filter(activity => activity.plannedFinish && activity.plannedFinish < today)
    .slice(-1)[0]

  return latestDue || activities[0] || null
}

/**
 * The physical workfront is the earliest incomplete detailed activity in the
 * approved programme sequence. This intentionally does not jump forward to a
 * later completed or lightly-started activity, because out-of-sequence work
 * must not hide an earlier unfinished workfront.
 */
function getActualPosition<T extends SequenceActivity>(activities: T[], today: Date) {
  const dueOrStarted = activities.find(activity =>
    activity.progress < 100 &&
    Boolean(
      (activity.plannedStart && activity.plannedStart <= today) ||
        activity.progress > 0
    )
  )

  return dueOrStarted || activities.find(activity => activity.progress < 100) || activities[activities.length - 1] || null
}

function calculatePositionDelay<T extends SequenceActivity>(
  plannedPosition: T | null,
  actualPosition: T | null
) {
  if (!plannedPosition || !actualPosition) return 0

  const plannedReference = plannedPosition.plannedStart || plannedPosition.plannedFinish
  const actualReference = actualPosition.plannedFinish || actualPosition.plannedStart

  if (!plannedReference || !actualReference) return 0

  return Math.max(0, differenceInCalendarDays(plannedReference, actualReference))
}

export function analyseScheduleSequence<T extends SequenceActivity>(
  sourceActivities: T[],
  today = new Date()
): SequenceAnalysis<T> {
  const valid = sourceActivities
    .filter(activity => activity.plannedStart && activity.plannedFinish)
    .map(activity => ({
      ...activity,
      progress: clamp(Number(activity.progress) || 0),
    })) as T[]

  const sorted = sortSequenceActivities(valid)
  const activities = detailedActivities(sorted)
  const plannedPosition = getPlannedPosition(activities, today)
  const actualPosition = getActualPosition(activities, today)

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

  return {
    activities,
    plannedPosition,
    actualPosition,
    plannedIndex,
    actualIndex,
    activityGap,
    delayDays: calculatePositionDelay(plannedPosition, actualPosition),
  }
}

import { differenceInCalendarDays } from 'date-fns'
import { analyseScheduleSequence } from '@/core/intelligence/sequence/sequenceEngine'
import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import { toDate } from '@/core/intelligence/normalizers/dateUtils'

export type ProductionRate = {
  actualPerDay: number
  requiredPerDay: number
  efficiency: number
}

export type PackageDeliveryPosition = {
  packageId: string
  packageName: string
  contractorName: string | null
  discipline: string | null
  progress: number
  plannedPosition: ProjectState['schedule']['activities'][number] | null
  actualPosition: ProjectState['schedule']['activities'][number] | null
  activityGap: number
  delayDays: number
  overdueActivities: number
  plannedFinish: Date | null
  forecastFinish: Date | null
  status: 'on_track' | 'watch' | 'recovery_required' | 'critical'
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
  packagePositions: PackageDeliveryPosition[]
  pressurePackage: PackageDeliveryPosition | null
  incompletePackageForecasts: number
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

/**
 * Progress-driven, inferred-sequence forecast for programmes without usable links.
 *
 * Each incomplete work item is rescheduled from the as-of date if its planned
 * start has passed. Later activities retain their planned overlaps. Where a
 * successor was planned to begin within three days AFTER a predecessor was
 * planned to finish, the successor is moved only if that predecessor is now
 * projected to finish later. This is a heuristic, not a critical-path result.
 *
 * Historical completed work is ignored; no actual date is inferred from when
 * someone updated the task in PMOCorex.
 */
function estimatePackageFinish(all: Activity[], target: Date, today: Date) {
  const detailed = getDetailedActivities(all)
  const remaining = detailed
    .filter(a => a.progress < 100)
    .map(a => ({
      activity: a,
      start: toDate(a.plannedStart),
      finish: toDate(a.plannedFinish),
    }))
    .filter((a): a is { activity: Activity; start: Date; finish: Date } =>
      a.start !== null && a.finish !== null && a.finish >= a.start
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.finish.getTime() - b.finish.getTime())

  if (!remaining.length) return { finish: target, delay: 0 }

  const projected = new Map<string, Date>()
  const DAY = 86400000
  let latest = target.getTime()

  for (const item of remaining) {
    const duration = Math.max(1, differenceInCalendarDays(item.finish, item.start) + 1)
    const remainingDays = Math.max(1, Math.ceil(duration * (100 - clamp(item.activity.progress)) / 100))
    const baseStart = item.start > today ? item.start : today
    let inferredStart = baseStart.getTime()

    // Use only a close planned finish-to-start handoff. Tasks planned to
    // overlap are not forced into a sequential chain.
    for (const prior of remaining) {
      if (prior === item || prior.start >= item.start) continue
      const gap = differenceInCalendarDays(item.start, prior.finish)
      if (gap < 0 || gap > 3) continue
      const priorProjected = projected.get(prior.activity.id)
      if (!priorProjected) continue
      const earliest = priorProjected.getTime() + Math.max(0, gap) * DAY
      inferredStart = Math.max(inferredStart, earliest)
    }

    // Respect the planned finish when the activity is still in the future;
    // otherwise use its progress-based remaining duration.
    const finish = new Date(Math.max(
      item.start > today ? item.finish.getTime() : 0,
      inferredStart + (remainingDays - 1) * DAY
    ))
    projected.set(item.activity.id, finish)
    latest = Math.max(latest, finish.getTime())
  }

  const finish = new Date(latest)
  return { finish, delay: Math.max(0, differenceInCalendarDays(finish, target)) }
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

  const packageMetadata = new Map(
    state.schedule.packages.map(pkg => [pkg.id, pkg])
  )
  const packageGroups = new Map<string, Activity[]>()

  state.schedule.activities.forEach(activity => {
    const packageId = activity.deliveryPackageId || '__unassigned__'
    const group = packageGroups.get(packageId) || []
    group.push(activity)
    packageGroups.set(packageId, group)
  })

  const packagePositions: PackageDeliveryPosition[] = Array.from(packageGroups.entries())
    .map(([packageId, packageActivities]) => {
      const packageSequence = analyseScheduleSequence(
        packageActivities.map(activity => ({
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
      const metadata = packageId === '__unassigned__' ? null : packageMetadata.get(packageId)
      const packageProgress = packageActivities.length
        ? Math.round(packageActivities.reduce((sum, item) => sum + item.progress, 0) / packageActivities.length)
        : 0
      const finishes = packageActivities.map(item => toDate(item.plannedFinish)).filter((date): date is Date => date !== null)
      const plannedFinish = finishes.length ? new Date(Math.max(...finishes.map(date => date.getTime()))) : null
      const estimate = plannedFinish ? estimatePackageFinish(packageActivities, plannedFinish, today) : null
      const delayDays = estimate?.delay ?? 0
      // An activity that is past its planned finish and remains incomplete is
      // schedule pressure even when available float absorbs the handover delay.
      const overdueActivities = getDetailedActivities(packageActivities).filter(activity => {
        const finish = toDate(activity.plannedFinish)
        return activity.progress < 100 && !!finish && finish < today
      }).length
      const forecastFinish = estimate?.finish ?? null
      const status: PackageDeliveryPosition['status'] =
        delayDays <= 0
          ? (overdueActivities > 0 ? 'watch' : 'on_track')
          : delayDays <= 7
            ? 'watch'
            : delayDays <= 30
              ? 'recovery_required'
              : 'critical'

      return {
        packageId,
        packageName:
          metadata?.name ||
          packageActivities[0]?.deliveryPackageName ||
          'General project works',
        contractorName: metadata?.contractorName || null,
        discipline: metadata?.discipline || packageActivities[0]?.discipline || null,
        progress: packageProgress,
        plannedPosition: packageSequence.plannedPosition?.source || null,
        actualPosition: packageSequence.actualPosition?.source || null,
        activityGap: packageSequence.activityGap,
        delayDays,
        overdueActivities,
        plannedFinish,
        forecastFinish,
        status,
      }
    })
    .filter(item => item.plannedPosition || item.actualPosition)
    .sort((a, b) =>
      b.delayDays - a.delayDays ||
      b.activityGap - a.activityGap ||
      a.packageName.localeCompare(b.packageName)
    )

  const pressurePackage = packagePositions[0] || null
  const isMultiPackage = packagePositions.length > 1
  const plannedPosition = isMultiPackage
    ? pressurePackage?.plannedPosition || null
    : sequence.plannedPosition?.source || null
  const actualPosition = isMultiPackage
    ? pressurePackage?.actualPosition || null
    : sequence.actualPosition?.source || null
  const activityGap = isMultiPackage
    ? pressurePackage?.activityGap || 0
    : sequence.activityGap

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

  const projectTarget =
    toDate(state.project.handoverDate) ||
    toDate(state.project.targetDate) ||
    toDate(state.schedule.finishDate)
  // Each package owns its own programme finish. A master date is valid only
  // when every identified package has a dated programme.
  const incompletePackageForecasts = isMultiPackage
    ? Array.from(packageGroups.keys()).filter(id => !packagePositions.some(p => p.packageId === id && p.forecastFinish)).length
    : 0
  const datedPackages = packagePositions.filter(p => p.plannedFinish && p.forecastFinish)
  const targetDate = isMultiPackage
    ? (incompletePackageForecasts === 0 && datedPackages.length
      ? new Date(Math.max(...datedPackages.map(p => p.plannedFinish!.getTime()))) : null)
    : projectTarget
  const forecastDate = isMultiPackage
    ? (incompletePackageForecasts === 0 && datedPackages.length
      ? new Date(Math.max(...datedPackages.map(p => p.forecastFinish!.getTime()))) : null)
    : projectTarget ? estimatePackageFinish(state.schedule.activities, projectTarget, today).finish : null
  // Compare master dates on the same calendar-day basis, never a pressure
  // package's delay against another package's target.
  const delayDays = isMultiPackage
    ? (forecastDate && targetDate ? Math.max(0, differenceInCalendarDays(forecastDate, targetDate)) : 0)
    : (forecastDate && targetDate ? Math.max(0, differenceInCalendarDays(forecastDate, targetDate)) : 0)

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
      ? (packagePositions.some(p => p.overdueActivities > 0) ? 'watch' : 'on_track')
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
    packagePositions,
    pressurePackage,
    incompletePackageForecasts,
  }
}

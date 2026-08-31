import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import type {
  DependencyNode,
  RootCauseResult,
  ScheduleActivity,
} from './rootCauseTypes'

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function declaredDelayReason(activity: ScheduleActivity): string | null {
  const value = (activity as any).delayReason
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function toNode(activity: ScheduleActivity): DependencyNode {
  return {
    id: activity.id,
    name: activity.name,
    progress: activity.progress,
    status: activity.status,
    isCritical: activity.isCritical,
    isBlocked: activity.isBlocked,
  }
}

function buildSuccessorMap(
  activities: ScheduleActivity[]
): Map<string, ScheduleActivity[]> {
  const map = new Map<string, ScheduleActivity[]>()

  activities.forEach(activity => {
    activity.predecessorIds.forEach(predecessorId => {
      const current = map.get(predecessorId) || []
      current.push(activity)
      map.set(predecessorId, current)
    })
  })

  return map
}

function walkImpactChain(
  startId: string,
  successorMap: Map<string, ScheduleActivity[]>,
  visited = new Set<string>(),
  depth = 0
): ScheduleActivity[] {
  if (visited.has(startId) || depth > 12) {
    return []
  }

  visited.add(startId)

  const successors = successorMap.get(startId) || []
  const chain: ScheduleActivity[] = []

  successors.forEach(successor => {
    chain.push(successor)
    chain.push(
      ...walkImpactChain(
        successor.id,
        successorMap,
        visited,
        depth + 1
      )
    )
  })

  return chain
}

function safeDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function sortByProgramme(
  activities: ScheduleActivity[]
): ScheduleActivity[] {
  return [...activities].sort((a, b) => {
    const aStart = safeDate((a as any).plannedStart)?.getTime() || 0
    const bStart = safeDate((b as any).plannedStart)?.getTime() || 0
    if (aStart !== bStart) return aStart - bStart

    return Number((a as any).taskNumber || 0) -
      Number((b as any).taskNumber || 0)
  })
}

function getPlannedPosition(
  activities: ScheduleActivity[],
  today: Date
): ScheduleActivity | null {
  return (
    activities
      .filter(activity => {
        const start = safeDate((activity as any).plannedStart)
        const finish = safeDate((activity as any).plannedFinish)
        return Boolean(
          start &&
          finish &&
          start <= today &&
          finish >= today
        )
      })
      .slice(-1)[0] ||
    activities
      .filter(activity => {
        const finish = safeDate((activity as any).plannedFinish)
        return Boolean(finish && finish <= today)
      })
      .slice(-1)[0] ||
    null
  )
}

function getSchedulePositionInference(
  activities: ScheduleActivity[],
  today: Date
): {
  cause: ScheduleActivity
  plannedPosition: ScheduleActivity
  activityGap: number
  overdueDays: number
} | null {
  const ordered = sortByProgramme(activities)
  const plannedPosition = getPlannedPosition(ordered, today)

  if (!plannedPosition) return null

  const plannedIndex = ordered.findIndex(
    activity => activity.id === plannedPosition.id
  )

  if (plannedIndex < 0) return null

  // The first unresolved activity up to today's planned workfront is the
  // workfront constraint. This avoids blaming the downstream activity that
  // merely has not started because an earlier activity is still incomplete.
  const unresolvedIndex = ordered.findIndex(
    (activity, index) =>
      index <= plannedIndex &&
      activity.progress < 100
  )

  if (unresolvedIndex < 0 || unresolvedIndex >= plannedIndex) {
    return null
  }

  const cause = ordered[unresolvedIndex]
  const finish = safeDate((cause as any).plannedFinish)
  const overdueDays =
    finish && finish < today
      ? Math.max(
          1,
          Math.ceil(
            (today.getTime() - finish.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0

  return {
    cause,
    plannedPosition,
    activityGap: plannedIndex - unresolvedIndex,
    overdueDays,
  }
}

export function calculateRootCause(
  state: ProjectState
): RootCauseResult {
  const activities = state.schedule.activities

  if (!activities.length) {
    return {
      primaryCause: null,
      secondaryCause: null,
      dependencyChain: [],
      blockedActivities: [],
      impactedActivities: [],
      confidence: 0,
      explanation:
        'No schedule activities are available for root-cause analysis.',
      recommendedOwner: null,
      recommendedAction:
        'Import or update the project schedule.',
      generatedAt: new Date().toISOString(),
    }
  }

  const today = new Date()
  const successorMap = buildSuccessorMap(activities)

  // 1. Explicit Project Controls evidence always wins.
  const declaredCandidates = activities
    .filter(
      activity =>
        activity.progress < 100 &&
        Boolean(declaredDelayReason(activity))
    )
    .sort((a, b) => {
      const aFinish = safeDate((a as any).plannedFinish)?.getTime() || Infinity
      const bFinish = safeDate((b as any).plannedFinish)?.getTime() || Infinity
      return aFinish - bFinish
    })

  // 2. Then use genuine blocked / critical-path evidence.
  const dependencyCandidates = activities
    .filter(
      activity =>
        activity.progress < 100 &&
        (
          activity.isBlocked ||
          activity.isCritical
        )
    )
    .sort((a, b) => {
      const score = (item: ScheduleActivity) =>
        (item.isBlocked ? 40 : 0) +
        (item.isCritical ? 30 : 0) +
        (100 - item.progress) * 0.15

      return score(b) - score(a)
    })

  // 3. If neither exists, infer the constraint from the gap between today's
  // planned workfront and the first unresolved workfront in the sequence.
  const scheduleInference =
    declaredCandidates.length === 0 &&
    dependencyCandidates.length === 0
      ? getSchedulePositionInference(activities, today)
      : null

  const primary =
    declaredCandidates[0] ||
    dependencyCandidates[0] ||
    scheduleInference?.cause ||
    null

  const secondary =
    declaredCandidates
      .slice(1)
      .concat(dependencyCandidates)
      .find(activity => activity.id !== primary?.id) ||
    null

  const impacted =
    primary
      ? walkImpactChain(
          primary.id,
          successorMap
        )
      : []

  const uniqueImpacted =
    Array.from(
      new Map(
        impacted.map(item => [
          item.id,
          item,
        ])
      ).values()
    )

  const dependencyChain =
    primary
      ? [
          primary,
          ...uniqueImpacted.slice(0, 8),
        ]
      : []

  const blockedActivities =
    activities.filter(
      activity =>
        activity.isBlocked &&
        activity.progress < 100
    )

  const primaryDeclaredReason =
    primary ? declaredDelayReason(primary) : null

  const isDependencyCause =
    Boolean(
      primary &&
      !primaryDeclaredReason &&
      (
        primary.isBlocked ||
        primary.isCritical
      )
    )

  const isScheduleInference =
    Boolean(
      primary &&
      scheduleInference &&
      primary.id === scheduleInference.cause.id
    )

  const confidence =
    primaryDeclaredReason
      ? clamp(
          80 +
          (primary?.isBlocked ? 8 : 0) +
          (primary?.isCritical ? 7 : 0)
        )
      : isDependencyCause
        ? clamp(
            60 +
            (primary?.isBlocked ? 15 : 0) +
            (primary?.isCritical ? 15 : 0) +
            Math.min(
              10,
              uniqueImpacted.length * 2
            )
          )
        : isScheduleInference && scheduleInference
          ? clamp(
              52 +
              Math.min(
                18,
                scheduleInference.activityGap * 5
              ) +
              Math.min(
                15,
                scheduleInference.overdueDays * 0.4
              )
            )
          : 0

  const explanation =
    primaryDeclaredReason && primary
      ? `${primary.name} has a recorded delay reason in Project Controls: ${primaryDeclaredReason}. This is treated as declared project evidence${
          primary.isCritical
            ? ' on a critical-path activity'
            : ''
        }${
          uniqueImpacted.length
            ? ` and may affect ${uniqueImpacted.length} downstream activit${uniqueImpacted.length === 1 ? 'y' : 'ies'}`
            : ''
        }.`
      : isDependencyCause && primary
        ? `${primary.name} is the most likely root cause because it is ${
            primary.isBlocked
              ? 'blocked'
              : 'not complete'
          }${
            primary.isCritical
              ? ' and sits on the critical path'
              : ''
          }. It affects ${
            uniqueImpacted.length
          } downstream activit${
            uniqueImpacted.length === 1
              ? 'y'
              : 'ies'
          }.`
        : isScheduleInference && scheduleInference
          ? `System-inferred cause: ${scheduleInference.cause.name} is the most likely schedule-position constraint. The programme indicates ${scheduleInference.plannedPosition.name} should be the current workfront, but ${scheduleInference.cause.name} is only ${scheduleInference.cause.progress}% complete${
              scheduleInference.overdueDays
                ? ` and is ${scheduleInference.overdueDays} day${scheduleInference.overdueDays === 1 ? '' : 's'} beyond its planned finish`
                : ''
            }. The project is ${scheduleInference.activityGap} programme activit${scheduleInference.activityGap === 1 ? 'y' : 'ies'} behind this planned workfront. No manual delay reason has been recorded for this constraint.`
          : 'No reliable root cause has been identified from the current project-control or schedule-position data.'

  const recommendedAction =
    primaryDeclaredReason && primary
      ? `Address the recorded cause "${primaryDeclaredReason}" affecting ${primary.name}, confirm ownership and maintain a dated recovery action in Project Controls.`
      : isDependencyCause && primary
        ? `Resolve the blocker affecting ${primary.name}, confirm ownership and establish a dated recovery action.`
        : isScheduleInference && scheduleInference
          ? `Validate the inferred constraint at ${scheduleInference.cause.name}, record the actual delay reason in Project Controls, and establish a recovery action to move the workfront toward ${scheduleInference.plannedPosition.name}.`
          : 'Review the active workfront and record any known delay reason in Project Controls.'

  return {
    primaryCause:
      primary ? toNode(primary) : null,
    secondaryCause:
      secondary ? toNode(secondary) : null,
    dependencyChain:
      dependencyChain.map(toNode),
    blockedActivities:
      blockedActivities.map(toNode),
    impactedActivities:
      uniqueImpacted.map(toNode),
    confidence,
    explanation,
    recommendedOwner:
      primary?.discipline || null,
    recommendedAction,
    generatedAt:
      new Date().toISOString(),
  }
}

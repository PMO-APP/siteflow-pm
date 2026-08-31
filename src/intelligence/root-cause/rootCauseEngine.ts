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

function rootScore(activity: ScheduleActivity) {
  let score = 0

  if (declaredDelayReason(activity)) score += 60
  if (activity.isBlocked) score += 40
  if (activity.isCritical) score += 30
  if (activity.progress < 100) score += 15
  if (activity.status === 'Not Started') score += 10
  if (activity.predecessorIds.length === 0) score += 5

  return score
}

export function calculateRootCause(
  state: ProjectState
): RootCauseResult {
  const activities =
    state.schedule.activities

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

  const successorMap =
    buildSuccessorMap(activities)

  const candidates =
    activities
      .filter(
        activity =>
          activity.progress < 100 &&
          (
            Boolean(declaredDelayReason(activity)) ||
            activity.isBlocked ||
            activity.isCritical ||
            activity.status === 'Not Started'
          )
      )
      .sort(
        (a, b) =>
          rootScore(b) - rootScore(a)
      )

  const primary =
    candidates[0] ||
    activities.find(
      activity =>
        activity.progress > 0 &&
        activity.progress < 100
    ) ||
    null

  const secondary =
    candidates.find(
      activity =>
        activity.id !== primary?.id
    ) ||
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

  const primaryDeclaredReason = primary ? declaredDelayReason(primary) : null

  const confidence = clamp(
    45 +
      (primaryDeclaredReason ? 30 : 0) +
      (primary?.isBlocked ? 20 : 0) +
      (primary?.isCritical ? 20 : 0) +
      Math.min(
        15,
        uniqueImpacted.length * 3
      )
  )

  const explanation = primary
    ? primaryDeclaredReason
      ? `${primary.name} has a recorded delay reason in Project Controls: ${primaryDeclaredReason}. This is treated as declared project evidence${
          primary.isCritical ? ' on a critical-path activity' : ''
        }${
          uniqueImpacted.length
            ? ` and may affect ${uniqueImpacted.length} downstream activit${uniqueImpacted.length === 1 ? 'y' : 'ies'}`
            : ''
        }.`
      : `${primary.name} is the most likely root cause because it is ${
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
    : 'No clear root cause was identified from the current schedule data.'

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
    recommendedAction: primary
      ? primaryDeclaredReason
        ? `Address the recorded cause "${primaryDeclaredReason}" affecting ${primary.name}, confirm ownership and maintain a dated recovery action in Project Controls.`
        : `Resolve the blocker affecting ${primary.name}, confirm ownership and establish a dated recovery action.`
      : 'Review the active workfront and update blocked or critical activities.',
    generatedAt:
      new Date().toISOString(),
  }
}

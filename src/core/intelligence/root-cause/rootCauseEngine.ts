import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import type {
  DependencyNode,
  RootCauseResult,
  ScheduleActivity,
} from './rootCauseTypes'

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
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

  if (activity.isBlocked) score += 40
  if (activity.isCritical) score += 30
  if (activity.progress < 100) score += 15
  if (activity.status === 'Not Started') score += 10
  if (activity.predecessorIds.length === 0) score += 5

  return score
}

export function calculateRootCause(
  state: ProjectState,
  options: { enabled?: boolean; today?: Date } = {}
): RootCauseResult {
  const activities =
    state.schedule.activities
  const today = options.today || new Date()

  if (options.enabled === false) {
    return {
      primaryCause: null,
      secondaryCause: null,
      dependencyChain: [],
      blockedActivities: [],
      impactedActivities: [],
      confidence: 0,
      explanation: 'No root cause analysis is required because the project is currently on track.',
      recommendedOwner: null,
      recommendedAction: 'Continue monitoring the current workfront and maintain planned production.',
      generatedAt: new Date().toISOString(),
    }
  }

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
      .filter(activity => {
        const plannedStart = activity.plannedStart
          ? new Date(activity.plannedStart)
          : null
        const isDueOrStarted =
          activity.progress > 0 ||
          activity.isBlocked ||
          (plannedStart && !Number.isNaN(plannedStart.getTime()) && plannedStart <= today)

        return (
          activity.progress < 100 &&
          isDueOrStarted &&
          (activity.isBlocked || activity.isCritical)
        )
      })
      .sort(
        (a, b) =>
          rootScore(b) - rootScore(a)
      )

  const primary = candidates[0] || null

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

  const confidence = clamp(
    45 +
      (primary?.isBlocked ? 20 : 0) +
      (primary?.isCritical ? 20 : 0) +
      Math.min(
        15,
        uniqueImpacted.length * 3
      )
  )

  const explanation = primary
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
      ? `Resolve the blocker affecting ${primary.name}, confirm ownership and establish a dated recovery action.`
      : 'Review the active workfront and update blocked or critical activities.',
    generatedAt:
      new Date().toISOString(),
  }
}

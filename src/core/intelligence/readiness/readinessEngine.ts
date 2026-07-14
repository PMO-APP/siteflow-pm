import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import type {
  MilestoneReadinessResult,
  ReadinessRequirement,
} from './readinessTypes'

function scoreRequirement(
  status: ReadinessRequirement['status']
) {
  if (status === 'ready') return 100
  if (status === 'not_ready') return 0
  return 50
}

export function calculateMilestoneReadiness(
  state: ProjectState
): MilestoneReadinessResult {
  const nextMilestone =
    state.schedule.activities.find(
      activity =>
        activity.progress < 100 &&
        (
          activity.isCritical ||
          activity.status === 'Milestone' ||
          activity.phase === 'Milestone'
        )
    ) ||
    state.schedule.activities.find(
      activity => activity.progress < 100
    ) ||
    null

  if (!nextMilestone) {
    return {
      milestoneId: null,
      milestoneName: 'No upcoming milestone',
      score: 100,
      status: 'ready',
      requirements: [],
      blockers: [],
      generatedAt: new Date().toISOString(),
    }
  }

  const predecessorReady =
    nextMilestone.predecessorIds.length === 0 ||
    nextMilestone.predecessorIds.every(id => {
      const predecessor =
        state.schedule.activities.find(
          activity => activity.id === id
        )

      return predecessor?.progress === 100
    })

  const requirements: ReadinessRequirement[] = [
    {
      id: 'previous-activity',
      label: 'Previous activity complete',
      status: predecessorReady
        ? 'ready'
        : 'not_ready',
      reason: predecessorReady
        ? undefined
        : 'One or more predecessor activities remain incomplete.',
      route: '/app/schedule',
    },
    {
      id: 'approvals',
      label: 'Required approvals available',
      status:
        state.approvals.overdueApprovals > 0
          ? 'not_ready'
          : state.approvals.pendingApprovals > 0
          ? 'unknown'
          : 'ready',
      reason:
        state.approvals.overdueApprovals > 0
          ? `${state.approvals.overdueApprovals} approval item(s) are overdue.`
          : state.approvals.pendingApprovals > 0
          ? `${state.approvals.pendingApprovals} approval item(s) remain pending.`
          : undefined,
      route: '/app/approvals',
    },
    {
      id: 'procurement',
      label: 'Materials and equipment available',
      status:
        state.procurement.overdueItems > 0 ||
        state.procurement.atRiskItems > 0
          ? 'not_ready'
          : state.procurement.totalItems === 0
          ? 'unknown'
          : 'ready',
      reason:
        state.procurement.overdueItems > 0
          ? `${state.procurement.overdueItems} procurement item(s) are overdue.`
          : state.procurement.atRiskItems > 0
          ? `${state.procurement.atRiskItems} procurement item(s) are at risk.`
          : state.procurement.totalItems === 0
          ? 'No linked procurement data is available.'
          : undefined,
      route: '/app/procurement',
    },
    {
      id: 'quality',
      label: 'Quality requirements cleared',
      status:
        state.quality.failedInspections > 0 ||
        state.quality.criticalSnags > 0
          ? 'not_ready'
          : state.quality.overdueInspections > 0
          ? 'unknown'
          : 'ready',
      reason:
        state.quality.failedInspections > 0
          ? `${state.quality.failedInspections} failed inspection(s) remain unresolved.`
          : state.quality.criticalSnags > 0
          ? `${state.quality.criticalSnags} critical snag(s) remain open.`
          : state.quality.overdueInspections > 0
          ? `${state.quality.overdueInspections} inspection(s) are overdue.`
          : undefined,
      route: '/app/quality',
    },
    {
      id: 'hse',
      label: 'HSE actions cleared',
      status:
        state.hse.overdueActions > 0
          ? 'not_ready'
          : state.hse.openActions > 0
          ? 'unknown'
          : 'ready',
      reason:
        state.hse.overdueActions > 0
          ? `${state.hse.overdueActions} HSE action(s) are overdue.`
          : state.hse.openActions > 0
          ? `${state.hse.openActions} HSE action(s) remain open.`
          : undefined,
      route: '/app/hse',
    },
    {
      id: 'blocked',
      label: 'Activity is not blocked',
      status: nextMilestone.isBlocked
        ? 'not_ready'
        : 'ready',
      reason: nextMilestone.isBlocked
        ? 'The schedule marks this activity as blocked or on hold.'
        : undefined,
      route: '/app/schedule',
    },
  ]

  const score = Math.round(
    requirements.reduce(
      (sum, item) => sum + scoreRequirement(item.status),
      0
    ) / Math.max(1, requirements.length)
  )

  const status =
    score >= 85
      ? 'ready'
      : score >= 65
      ? 'nearly_ready'
      : score > 0
      ? 'not_ready'
      : 'unknown'

  return {
    milestoneId: nextMilestone.id,
    milestoneName: nextMilestone.name,
    score,
    status,
    requirements,
    blockers: requirements.filter(
      requirement =>
        requirement.status === 'not_ready'
    ),
    generatedAt: new Date().toISOString(),
  }
}

import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import {
  getApplicableStageTemplates,
  resolveProjectScopeTemplate,
  type DeliveryStageTemplate,
} from './deliveryStageConfig'
import type {
  DeliveryStage,
  DeliveryStageBlocker,
  DeliveryStageStatus,
  DeliveryTwinResult,
} from './deliveryTwinTypes'

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function activityMatchesStage(
  stage: DeliveryStageTemplate,
  activity: ProjectState['schedule']['activities'][number]
) {
  const haystack = [
    activity.name,
    activity.phase,
    activity.discipline,
  ]
    .map(normalize)
    .join(' ')

  if (
    stage.disciplines?.length &&
    activity.discipline &&
    stage.disciplines.some(
      discipline =>
        normalize(discipline) === normalize(activity.discipline)
    )
  ) {
    return true
  }

  return stage.aliases.some(alias =>
    haystack.includes(normalize(alias))
  )
}

function getStatus({
  progress,
  blockers,
  hasStarted,
  applicable,
}: {
  progress: number
  blockers: number
  hasStarted: boolean
  applicable: boolean
}): DeliveryStageStatus {
  if (!applicable) return 'not_applicable'
  if (progress >= 100) return 'completed'
  if (blockers > 0) return 'blocked'
  if (hasStarted) return 'in_progress'
  return 'not_started'
}

function buildGlobalBlockers(
  state: ProjectState,
  stage: DeliveryStageTemplate
): DeliveryStageBlocker[] {
  const blockers: DeliveryStageBlocker[] = []

  if (state.approvals.overdueApprovals > 0) {
    blockers.push({
      id: `${stage.id}-approval`,
      title: `${state.approvals.overdueApprovals} overdue approval item(s)`,
      source: 'approval',
      ownerId: null,
      ownerName: 'Design / Approval Owner',
      route: '/app/approvals',
      severity: state.approvals.overdueApprovals >= 3 ? 'critical' : 'warning',
    })
  }

  if (state.procurement.atRiskItems > 0) {
    blockers.push({
      id: `${stage.id}-procurement`,
      title: `${state.procurement.atRiskItems} procurement item(s) at risk`,
      source: 'procurement',
      ownerId: null,
      ownerName: 'Procurement Owner',
      route: '/app/procurement',
      severity: state.procurement.atRiskItems >= 3 ? 'critical' : 'warning',
    })
  }

  if (state.quality.failedInspections > 0) {
    blockers.push({
      id: `${stage.id}-quality`,
      title: `${state.quality.failedInspections} failed inspection(s)`,
      source: 'quality',
      ownerId: null,
      ownerName: 'Quality Owner',
      route: '/app/quality',
      severity: 'critical',
    })
  }

  if (state.risk.unmitigatedHighRisks > 0) {
    blockers.push({
      id: `${stage.id}-risk`,
      title: `${state.risk.unmitigatedHighRisks} high risk(s) without mitigation`,
      source: 'risk',
      ownerId: null,
      ownerName: 'Risk Owner',
      route: '/app/risk',
      severity: 'critical',
    })
  }

  if (state.hse.overdueActions > 0) {
    blockers.push({
      id: `${stage.id}-hse`,
      title: `${state.hse.overdueActions} overdue HSE action(s)`,
      source: 'hse',
      ownerId: null,
      ownerName: 'HSE Owner',
      route: '/app/hse',
      severity: 'critical',
    })
  }

  return blockers
}

export function calculateDeliveryTwin(
  state: ProjectState
): DeliveryTwinResult {
  const scopeTemplate = resolveProjectScopeTemplate(
    state.project.scope
  )

  const templates = getApplicableStageTemplates(
    state.project.scope
  )

  const stages: DeliveryStage[] = templates.map(stage => {
    const activities = state.schedule.activities.filter(activity =>
      activityMatchesStage(stage, activity)
    )

    const activityWeight = activities.reduce(
      (sum, activity) => sum + Number(activity.weight || 0),
      0
    )

    const progress =
      activities.length === 0
        ? 0
        : activityWeight > 0
        ? Math.round(
            activities.reduce(
              (sum, activity) =>
                sum +
                activity.progress *
                  (Number(activity.weight || 0) /
                    activityWeight),
              0
            )
          )
        : Math.round(
            activities.reduce(
              (sum, activity) => sum + activity.progress,
              0
            ) / activities.length
          )

    const scheduleBlockers: DeliveryStageBlocker[] =
      activities
        .filter(
          activity =>
            activity.isBlocked &&
            activity.progress < 100
        )
        .map(activity => ({
          id: `schedule-${activity.id}`,
          title: `${activity.name} is blocked`,
          source: 'schedule',
          ownerId: null,
          ownerName: activity.discipline || 'Project Team',
          route: '/app/schedule',
          severity: activity.isCritical ? 'critical' : 'warning',
        }))

    const shouldApplyGlobalBlockers =
      progress < 100 &&
      (
        activities.some(activity => activity.isCritical) ||
        activities.some(activity => activity.progress > 0)
      )

    const blockers = [
      ...scheduleBlockers,
      ...(shouldApplyGlobalBlockers
        ? buildGlobalBlockers(state, stage)
        : []),
    ]

    const criticalActivityCount = activities.filter(
      activity =>
        activity.isCritical &&
        activity.progress < 100
    ).length

    const readinessScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          blockers.filter(item => item.severity === 'critical').length * 20 -
          blockers.filter(item => item.severity === 'warning').length * 10 -
          criticalActivityCount * 5
      )
    )

    const hasStarted = activities.some(
      activity => activity.progress > 0
    )

    return {
      id: stage.id,
      name: stage.name,
      progress,
      status: getStatus({
        progress,
        blockers: blockers.length,
        hasStarted,
        applicable: true,
      }),
      activityIds: activities.map(activity => activity.id),
      blockerCount: blockers.length,
      criticalActivityCount,
      readinessScore,
      route: stage.defaultRoute,
      blockers,
      ownerLabel:
        activities.find(activity => activity.discipline)
          ?.discipline || null,
      applicable: true,
    }
  })

  const activeStage =
    stages.find(
      stage =>
        stage.status === 'in_progress' ||
        stage.status === 'blocked'
    ) || null

  const activeIndex = activeStage
    ? stages.findIndex(stage => stage.id === activeStage.id)
    : -1

  const nextStage =
    activeIndex >= 0
      ? stages
          .slice(activeIndex + 1)
          .find(stage => stage.status !== 'completed') || null
      : stages.find(stage => stage.status !== 'completed') || null

  return {
    scopeTemplate,
    stages,
    activeStage,
    nextStage,
    completedStages: stages.filter(
      stage => stage.status === 'completed'
    ).length,
    totalApplicableStages: stages.length,
    overallProgress: state.schedule.weightedProgress,
    generatedAt: new Date().toISOString(),
  }
}

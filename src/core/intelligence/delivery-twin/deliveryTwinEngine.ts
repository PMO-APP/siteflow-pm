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

type ScheduleActivity = ProjectState['schedule']['activities'][number]

function normalize(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_–—-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Scores an activity against a delivery stage.
 *
 * Activity name is deliberately given much more weight than phase. Imported
 * schedules frequently repeat a phase value across several activities, which
 * previously caused one activity to be counted in multiple delivery stages.
 * Discipline is not used as a standalone match because a Housebuild activity
 * can belong to mobilisation, substructure, superstructure, roofing or finishes.
 */
function getStageMatchScore(
  stage: DeliveryStageTemplate,
  activity: ScheduleActivity
) {
  const name = normalize(activity.name)
  const phase = normalize(activity.phase)

  let score = 0

  for (const rawAlias of stage.aliases) {
    const alias = normalize(rawAlias)
    if (!alias) continue

    if (name === alias) {
      score = Math.max(score, 120)
    } else if (name.startsWith(`${alias} `) || name.endsWith(` ${alias}`)) {
      score = Math.max(score, 105)
    } else if (name.includes(alias)) {
      score = Math.max(score, 95)
    }

    if (phase === alias) {
      score = Math.max(score, 45)
    } else if (phase.includes(alias)) {
      score = Math.max(score, 30)
    }
  }

  // Discipline may break a tie, but can never classify an activity by itself.
  if (
    score > 0 &&
    stage.disciplines?.some(
      discipline => normalize(discipline) === normalize(activity.discipline)
    )
  ) {
    score += 3
  }

  return score
}

/** Assign every schedule activity to one, and only one, delivery stage. */
function classifyActivities(
  templates: DeliveryStageTemplate[],
  activities: ScheduleActivity[]
) {
  const stageActivities = new Map<string, ScheduleActivity[]>()

  templates.forEach(stage => stageActivities.set(stage.id, []))

  for (const activity of activities) {
    const ranked = templates
      .map(stage => ({ stage, score: getStageMatchScore(stage, activity) }))
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.stage.order - b.stage.order
      })

    const best = ranked[0]
    if (!best) continue

    stageActivities.get(best.stage.id)?.push(activity)
  }

  return stageActivities
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

function calculateStageProgress(activities: ScheduleActivity[]) {
  if (activities.length === 0) return 0

  const activityWeight = activities.reduce(
    (sum, activity) => sum + Math.max(0, Number(activity.weight || 0)),
    0
  )

  if (activityWeight > 0) {
    return Math.round(
      activities.reduce(
        (sum, activity) =>
          sum +
          Math.max(0, Math.min(100, activity.progress)) *
            (Math.max(0, Number(activity.weight || 0)) / activityWeight),
        0
      )
    )
  }

  return Math.round(
    activities.reduce(
      (sum, activity) =>
        sum + Math.max(0, Math.min(100, activity.progress)),
      0
    ) / activities.length
  )
}

export function calculateDeliveryTwin(
  state: ProjectState
): DeliveryTwinResult {
  const scopeTemplate = resolveProjectScopeTemplate(state.project.scope)
  const templates = getApplicableStageTemplates(state.project.scope)
  const classifiedActivities = classifyActivities(
    templates,
    state.schedule.activities
  )

  const stages: DeliveryStage[] = templates.map(stage => {
    const activities = classifiedActivities.get(stage.id) || []
    const progress = calculateStageProgress(activities)

    const scheduleBlockers: DeliveryStageBlocker[] = activities
      .filter(activity => activity.isBlocked && activity.progress < 100)
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
      (activities.some(activity => activity.isCritical) ||
        activities.some(activity => activity.progress > 0))

    const blockers = [
      ...scheduleBlockers,
      ...(shouldApplyGlobalBlockers ? buildGlobalBlockers(state, stage) : []),
    ]

    const criticalActivityCount = activities.filter(
      activity => activity.isCritical && activity.progress < 100
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

    const hasStarted = activities.some(activity => activity.progress > 0)

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
        activities.find(activity => activity.discipline)?.discipline || null,
      applicable: true,
    }
  })

  const activeStage =
    stages.find(
      stage => stage.status === 'in_progress' || stage.status === 'blocked'
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
    completedStages: stages.filter(stage => stage.status === 'completed').length,
    totalApplicableStages: stages.length,
    overallProgress: state.schedule.weightedProgress,
    generatedAt: new Date().toISOString(),
  }
}

import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import type {
  DeliveryStage,
  DeliveryStageStatus,
  DeliveryTwinResult,
} from './deliveryTwinTypes'

const DEFAULT_STAGE_ORDER = [
  'Mobilisation',
  'Substructure',
  'Superstructure',
  'Roofing',
  'MEP First Fix',
  'Internal Finishes',
  'External Works',
  'Testing & Commissioning',
  'Snagging',
  'Handover',
]

function normalizePhase(value?: string | null) {
  const text = String(value || '').trim().toLowerCase()

  if (!text) return 'Other'
  if (text.includes('mobil')) return 'Mobilisation'
  if (
    text.includes('foundation') ||
    text.includes('substructure') ||
    text.includes('ground beam')
  ) return 'Substructure'
  if (
    text.includes('superstructure') ||
    text.includes('frame') ||
    text.includes('slab') ||
    text.includes('blockwork')
  ) return 'Superstructure'
  if (text.includes('roof')) return 'Roofing'
  if (
    text.includes('mep') ||
    text.includes('first fix') ||
    text.includes('electrical') ||
    text.includes('mechanical') ||
    text.includes('plumbing')
  ) return 'MEP First Fix'
  if (
    text.includes('finish') ||
    text.includes('ceiling') ||
    text.includes('painting') ||
    text.includes('tiling') ||
    text.includes('joinery')
  ) return 'Internal Finishes'
  if (
    text.includes('external') ||
    text.includes('landscape') ||
    text.includes('road') ||
    text.includes('drainage')
  ) return 'External Works'
  if (
    text.includes('test') ||
    text.includes('commission')
  ) return 'Testing & Commissioning'
  if (
    text.includes('snag') ||
    text.includes('defect')
  ) return 'Snagging'
  if (
    text.includes('handover') ||
    text.includes('practical completion')
  ) return 'Handover'

  return 'Other'
}

function stageStatus({
  progress,
  blocked,
  hasStarted,
}: {
  progress: number
  blocked: boolean
  hasStarted: boolean
}): DeliveryStageStatus {
  if (progress >= 100) return 'completed'
  if (blocked) return 'blocked'
  if (hasStarted) return 'in_progress'
  if (progress === 0) return 'not_started'
  return 'waiting'
}

function stageRoute(stage: string) {
  if (stage === 'Snagging') return '/app/snags'
  if (stage === 'Handover') return '/app/handover'
  if (stage === 'MEP First Fix') return '/app/schedule'
  if (stage === 'Testing & Commissioning') return '/app/quality'
  return '/app/schedule'
}

export function calculateDeliveryTwin(
  state: ProjectState
): DeliveryTwinResult {
  const grouped = new Map<
    string,
    ProjectState['schedule']['activities']
  >()

  state.schedule.activities.forEach(activity => {
    const stage = normalizePhase(
      activity.phase ||
      activity.name
    )

    const current = grouped.get(stage) || []
    current.push(activity)
    grouped.set(stage, current)
  })

  const stages: DeliveryStage[] = Array.from(
    grouped.entries()
  ).map(([phase, activities]) => {
    const weightTotal = activities.reduce(
      (sum, item) => sum + (item.weight || 0),
      0
    )

    const progress =
      weightTotal > 0
        ? Math.round(
            activities.reduce(
              (sum, item) =>
                sum +
                item.progress *
                  (item.weight / weightTotal),
              0
            )
          )
        : Math.round(
            activities.reduce(
              (sum, item) => sum + item.progress,
              0
            ) / Math.max(1, activities.length)
          )

    const blockerCount = activities.filter(
      item => item.isBlocked
    ).length

    const criticalActivityCount = activities.filter(
      item =>
        item.isCritical &&
        item.progress < 100
    ).length

    const hasStarted = activities.some(
      item => item.progress > 0
    )

    const readinessScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          blockerCount * 25 -
          criticalActivityCount * 10 -
          Math.max(
            0,
            state.approvals.overdueApprovals * 4
          ) -
          Math.max(
            0,
            state.procurement.atRiskItems * 4
          )
      )
    )

    return {
      id: phase
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      name: phase,
      phase,
      discipline:
        activities.find(item => item.discipline)
          ?.discipline || null,
      progress,
      status: stageStatus({
        progress,
        blocked: blockerCount > 0,
        hasStarted,
      }),
      activityIds: activities.map(item => item.id),
      blockerCount,
      criticalActivityCount,
      readinessScore,
      route: stageRoute(phase),
    }
  })

  stages.sort((a, b) => {
    const ai = DEFAULT_STAGE_ORDER.indexOf(a.name)
    const bi = DEFAULT_STAGE_ORDER.indexOf(b.name)

    if (ai === -1 && bi === -1) {
      return a.name.localeCompare(b.name)
    }
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const activeStage =
    stages.find(
      stage =>
        stage.status === 'in_progress' ||
        stage.status === 'blocked'
    ) || null

  const activeIndex = activeStage
    ? stages.findIndex(
        stage => stage.id === activeStage.id
      )
    : -1

  const nextStage =
    activeIndex >= 0
      ? stages
          .slice(activeIndex + 1)
          .find(
            stage =>
              stage.status !== 'completed'
          ) || null
      : stages.find(
          stage =>
            stage.status !== 'completed'
        ) || null

  return {
    stages,
    activeStage,
    nextStage,
    completedStages: stages.filter(
      stage => stage.status === 'completed'
    ).length,
    totalStages: stages.length,
    overallProgress:
      state.schedule.weightedProgress,
    generatedAt: new Date().toISOString(),
  }
}

import type { ProjectState } from '@/platform/project-state'
import type { V6ProjectIntelligence } from '../contracts/types'
import { adaptV6StateToLegacy } from '../adapters/projectStateAdapter'
import { buildProjectIntelligenceV4 } from '@/core/intelligence/projectIntelligenceV4'

export function buildV6Intelligence(
  state: ProjectState
): V6ProjectIntelligence {
  const legacyState =
    adaptV6StateToLegacy(state)

  const intelligence =
    buildProjectIntelligenceV4(
      legacyState
    )

  return {
    state,

    health: {
      score:
        intelligence.health.score,
      label:
        intelligence.health.label as V6ProjectIntelligence['health']['label'],
      drivers:
        intelligence.health.drivers,
    },

    forecast: {
      targetDate:
        intelligence.forecastV2.targetDate
          ?.toISOString() || null,
      forecastDate:
        intelligence.forecastV2.forecastDate
          ?.toISOString() || null,
      delayDays:
        intelligence.forecastV2.delayDays,
      recoverable:
        intelligence.forecastV2.recoverable,
      recoveryConfidence:
        intelligence.forecastV2
          .recoveryConfidence,
      plannedPosition:
        intelligence.forecastV2
          .plannedPosition?.name || null,
      actualPosition:
        intelligence.forecastV2
          .actualPosition?.name || null,
      activityGap:
        intelligence.forecastV2.activityGap,
    },

    readiness: {
      milestoneName:
        intelligence.readiness
          .milestoneName,
      score:
        intelligence.readiness.score,
      blockerCount:
        intelligence.readiness
          .blockers.length,
    },

    narrative: {
      headline:
        intelligence.narrative.headline,
      summary:
        intelligence.narrative.summary,
      outlook:
        intelligence.narrative.outlook,
    },

    generatedAt:
      new Date().toISOString(),
  }
}

import type { ProjectState } from './models/ProjectState'
import { buildProjectIntelligenceV2 } from './projectIntelligenceV2'
import { calculateRootCause } from './root-cause/rootCauseEngine'
import { calculateRecommendations } from './recommendation/recommendationEngine'
import { buildExecutiveNarrative } from './narrative/narrativeEngine'

export function buildProjectIntelligenceV3(
  state: ProjectState
) {
  const base =
    buildProjectIntelligenceV2(state)

  const rootCause =
    calculateRootCause(state)

  const recommendations =
    calculateRecommendations({
      state,
      forecast: base.forecastV2,
      rootCause,
    })

  const narrative =
    buildExecutiveNarrative({
      state,
      forecast: base.forecastV2,
      rootCause,
      readiness: base.readiness,
    })

  return {
    ...base,
    rootCause,
    recommendations,
    narrative,
  }
}

export type ProjectIntelligenceV3 =
  ReturnType<
    typeof buildProjectIntelligenceV3
  >

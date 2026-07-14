import type { ProjectState } from './models/ProjectState'
import { buildProjectIntelligence } from './projectIntelligence'
import { calculateForecastV2 } from './forecast/forecastV2'
import { calculateMilestoneReadiness } from './readiness/readinessEngine'

export function buildProjectIntelligenceV2(
  state: ProjectState
) {
  const base =
    buildProjectIntelligence(state)

  return {
    ...base,
    forecastV2:
      calculateForecastV2(state),
    readiness:
      calculateMilestoneReadiness(state),
  }
}

export type ProjectIntelligenceV2 =
  ReturnType<
    typeof buildProjectIntelligenceV2
  >

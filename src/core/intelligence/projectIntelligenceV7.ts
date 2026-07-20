import type { ProjectState } from './models/ProjectState'
import { buildProjectIntelligenceV4 } from './projectIntelligenceV4'
import { calculateForecastV7 } from './v7'

export function buildProjectIntelligenceV7(state: ProjectState) {
  return {
    ...buildProjectIntelligenceV4(state),
    forecastV7: calculateForecastV7(state),
  }
}

export type ProjectIntelligenceV7 = ReturnType<typeof buildProjectIntelligenceV7>

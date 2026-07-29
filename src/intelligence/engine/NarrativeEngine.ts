import type { ProjectHealth } from '../models/ProjectHealth'
import type { ForecastResult } from '../models/Forecast'
import type { Recommendation } from '../models/Recommendation'

export interface ExecutiveNarrative {
  overallStatus: string
  keyIssues: string
  immediateActions: string
  executiveOutlook: string
}

function bandLabel(band: ProjectHealth['overallBand']) {
  return band === 'green' ? 'Green' : band === 'amber' ? 'Amber' : 'Red'
}

export function createExecutiveNarrative(
  projectName: string,
  health: ProjectHealth,
  forecast: ForecastResult,
  recommendations: Recommendation[]
): ExecutiveNarrative {
  const weakest = Object.values(health.dimensions).sort((a, b) => a.score - b.score)[0]
  const finishText = forecast.forecastFinish
    ? new Date(forecast.forecastFinish).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'not yet available'

  return {
    overallStatus: `${projectName} is currently ${bandLabel(health.overallBand)} with an overall health score of ${health.overallScore}%.`,
    keyIssues: forecast.drivers.length
      ? `The primary constraints are ${forecast.drivers.slice(0, 3).join(', ')}. ${weakest?.explanation || ''}`
      : 'No material open constraints were identified from the available evidence.',
    immediateActions: recommendations.length
      ? recommendations.slice(0, 3).map(item => item.action).join(' ')
      : 'Maintain current controls and continue weekly validation of schedule, approvals, procurement, quality, safety and commercial evidence.',
    executiveOutlook: forecast.forecastDelayDays > 0
      ? `Without effective intervention, completion is forecast for ${finishText}, approximately ${forecast.forecastDelayDays} day${forecast.forecastDelayDays === 1 ? '' : 's'} behind plan, at ${forecast.confidence}% confidence.`
      : 'The current evidence does not indicate a forecast delay against the recorded planned finish.',
  }
}

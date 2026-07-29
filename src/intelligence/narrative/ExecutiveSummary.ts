import type { ProjectHealth } from '../models/ProjectHealth'
import type { ForecastResult } from '../models/Forecast'
import type { Recommendation } from '../models/Recommendation'
import { formatExecutiveDate, joinNatural } from './NarrativeTemplates'

export interface ExecutiveSummaryOutput {
  headline: string
  summary: string
  keyIssues: string[]
  immediatePriorities: string[]
  outlook: string
}

export function generateExecutiveSummary(
  projectName: string,
  health: ProjectHealth,
  forecast: ForecastResult,
  recommendations: Recommendation[]
): ExecutiveSummaryOutput {
  const weakest = Object.values(health.dimensions).sort((a, b) => a.score - b.score).slice(0, 2)
  const keyIssues = [
    ...forecast.drivers.slice(0, 3),
    ...weakest.filter(item => item.score < 70).map(item => item.explanation),
  ].filter((item, index, list) => item && list.indexOf(item) === index).slice(0, 4)
  const priorities = recommendations.slice(0, 4).map(item => item.action)
  const status = health.overallBand === 'green' ? 'stable' : health.overallBand === 'amber' ? 'under pressure' : 'requiring immediate intervention'
  const forecastText = forecast.forecastFinish ? formatExecutiveDate(forecast.forecastFinish) : 'not yet established'

  return {
    headline: `${projectName} is ${status}`,
    summary: `${projectName} is currently ${health.overallBand.toUpperCase()} at ${health.overallScore}% health. ${keyIssues.length ? `The main control pressures are ${joinNatural(keyIssues.slice(0, 3))}.` : 'No material control pressure is evident from the available records.'}`,
    keyIssues,
    immediatePriorities: priorities,
    outlook: forecast.forecastDelayDays > 0
      ? `Without timely intervention, completion is forecast for ${forecastText}, approximately ${forecast.forecastDelayDays} day${forecast.forecastDelayDays === 1 ? '' : 's'} behind the current plan.`
      : `The recorded evidence currently supports the planned completion position, with forecast confidence of ${forecast.confidence}%.`,
  }
}

import type { ForecastResult } from '../models/Forecast'
import type { ProjectHealth } from '../models/ProjectHealth'
import type { TrendSignal } from '../pulse/TrendEngine'
import type { GovernanceAssessment } from '../governance/GovernanceEngine'

export interface EscalationPrediction {
  probability: number
  horizonDays: number
  likelyBand: ProjectHealth['overallBand']
  explanation: string
}

export function predictEscalation(
  health: ProjectHealth,
  forecast: ForecastResult,
  trends: TrendSignal[],
  governance: GovernanceAssessment,
  horizonDays = 14,
): EscalationPrediction {
  const overall = trends.find(item => item.source === 'overall')
  const trendRisk = overall?.direction === 'declining' ? 24 : overall?.direction === 'improving' ? -12 : 0
  const probability = Math.max(5, Math.min(97, Math.round(
    (100 - health.overallScore) * 0.62 + Math.max(0, forecast.forecastDelayDays) * 2.4 + Math.max(0, 70 - governance.score) * 0.5 + trendRisk,
  )))
  const likelyBand: ProjectHealth['overallBand'] = probability >= 72 ? 'red' : probability >= 42 ? 'amber' : health.overallBand
  return {
    probability,
    horizonDays,
    likelyBand,
    explanation: probability >= 72
      ? `There is a high probability that the project will move to Red within ${horizonDays} days without intervention.`
      : probability >= 42
      ? `The project has a material risk of deterioration within ${horizonDays} days.`
      : `Current evidence indicates a low probability of material deterioration within ${horizonDays} days.`,
  }
}

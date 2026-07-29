import type { ProjectHealth } from '../models/ProjectHealth'
import type { ForecastResult } from '../models/Forecast'
import type { GovernanceAssessment } from '../governance/GovernanceEngine'
import type { TrendSignal } from './TrendEngine'
import type { MomentumAssessment } from './MomentumCalculator'
import type { AttentionAssessment } from './AttentionIndex'

export type ProjectPulseStatus = 'stable' | 'improving' | 'watch' | 'deteriorating' | 'critical'

export interface ProjectPulse {
  status: ProjectPulseStatus
  label: string
  score: number
  stability: number
  confidence: number
  trend: TrendSignal['direction']
  momentum: MomentumAssessment
  attention: AttentionAssessment
  explanation: string
}

export function calculateProjectPulse(
  health: ProjectHealth,
  forecast: ForecastResult,
  governance: GovernanceAssessment,
  trends: TrendSignal[],
  momentum: MomentumAssessment,
  attention: AttentionAssessment,
): ProjectPulse {
  const overallTrend = trends.find(item => item.source === 'overall')
  const delayPenalty = Math.min(30, Math.max(0, forecast.forecastDelayDays) * 1.5)
  const attentionPenalty = attention.score * 0.24
  const score = Math.max(0, Math.min(100, Math.round(
    health.overallScore * 0.48 + governance.score * 0.2 + momentum.score * 0.32 - delayPenalty - attentionPenalty,
  )))
  const stability = Math.max(0, Math.min(100, Math.round(100 - Math.abs(overallTrend?.change || 0) - attention.score * 0.25)))
  const confidence = Math.max(45, Math.min(98, Math.round((forecast.confidence + (overallTrend?.confidence || 55) + governance.score) / 3)))
  let status: ProjectPulseStatus = 'stable'
  if (score < 38 || attention.level === 'executive_intervention') status = 'critical'
  else if (overallTrend?.direction === 'declining' && score < 65) status = 'deteriorating'
  else if (score < 70) status = 'watch'
  else if (overallTrend?.direction === 'improving') status = 'improving'

  const labels: Record<ProjectPulseStatus, string> = {
    stable: 'Stable',
    improving: 'Improving',
    watch: 'Watch',
    deteriorating: 'Deteriorating',
    critical: 'Critical',
  }
  const explanation = status === 'improving'
    ? 'Health and closure trends indicate improving delivery control.'
    : status === 'deteriorating' || status === 'critical'
    ? 'The project is accumulating delivery pressure and requires targeted intervention.'
    : status === 'watch'
    ? 'Delivery remains recoverable, but current exceptions require active control.'
    : 'The project is maintaining a consistent delivery position.'

  return { status, label: labels[status], score, stability, confidence, trend: overallTrend?.direction || 'stable', momentum, attention, explanation }
}

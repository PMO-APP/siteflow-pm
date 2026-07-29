import type { ForecastResult } from '../models/Forecast'
import type { Recommendation } from '../models/Recommendation'
import type { ProjectHealth } from '../models/ProjectHealth'

export interface ConfidenceAssessment {
  score: number
  band: 'high' | 'moderate' | 'low'
  label: string
  explanation: string
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function assessForecastConfidence(
  forecast: ForecastResult,
  health: ProjectHealth
): ConfidenceAssessment {
  const dimensionSpread = Math.max(...Object.values(health.dimensions).map(item => item.score)) -
    Math.min(...Object.values(health.dimensions).map(item => item.score))
  const score = clamp(forecast.confidence - Math.min(15, dimensionSpread * 0.15))
  const band = score >= 80 ? 'high' : score >= 60 ? 'moderate' : 'low'

  return {
    score,
    band,
    label: band === 'high' ? 'High confidence' : band === 'moderate' ? 'Moderate confidence' : 'Low confidence',
    explanation: band === 'high'
      ? 'The available project evidence is sufficiently consistent for management use.'
      : band === 'moderate'
      ? 'The outlook is usable, but should be reviewed as new schedule and control data is added.'
      : 'The outlook is indicative because the available evidence is limited or inconsistent.',
  }
}

export function rankRecommendationConfidence(recommendations: Recommendation[]) {
  return [...recommendations]
    .sort((a, b) => b.confidence - a.confidence || b.expectedRecoveryDays - a.expectedRecoveryDays)
    .map(item => ({
      ...item,
      confidenceBand: item.confidence >= 80 ? 'high' as const : item.confidence >= 60 ? 'moderate' as const : 'low' as const,
    }))
}

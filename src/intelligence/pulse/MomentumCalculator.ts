import type { ProjectHealth } from '../models/ProjectHealth'
import type { TrendSignal } from './TrendEngine'

export type DeliveryMomentum = 'positive' | 'neutral' | 'negative'

export interface MomentumAssessment {
  score: number
  direction: DeliveryMomentum
  explanation: string
}

export function calculateMomentum(health: ProjectHealth, trends: TrendSignal[]): MomentumAssessment {
  const overall = trends.find(item => item.source === 'overall')
  const trendAdjustment = overall?.direction === 'improving' ? 14 : overall?.direction === 'declining' ? -18 : 0
  const score = Math.max(0, Math.min(100, Math.round(health.overallScore + trendAdjustment)))
  const direction: DeliveryMomentum = score >= 72 ? 'positive' : score >= 52 ? 'neutral' : 'negative'
  return {
    score,
    direction,
    explanation: direction === 'positive'
      ? 'Current controls and closure activity support forward delivery momentum.'
      : direction === 'negative'
      ? 'Open constraints are accumulating faster than recovery actions are taking effect.'
      : 'Delivery momentum is balanced, with no sustained movement in either direction.',
  }
}

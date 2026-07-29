import type { Recommendation } from '../models/Recommendation'

export interface RecommendationExplanation extends Recommendation {
  impactScore: number
  confidenceBand: 'high' | 'moderate' | 'low'
  valueLabel: string
}

export function buildRecommendationExplorer(recommendations: Recommendation[]): RecommendationExplanation[] {
  const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 }
  return recommendations
    .map(item => ({
      ...item,
      impactScore: Math.round((priorityWeight[item.priority] * 20) + item.expectedRecoveryDays * 3 + item.confidence * 0.2),
      confidenceBand: item.confidence >= 80 ? 'high' as const : item.confidence >= 60 ? 'moderate' as const : 'low' as const,
      valueLabel: item.expectedRecoveryDays > 0
        ? `Potential recovery of ${item.expectedRecoveryDays} day${item.expectedRecoveryDays === 1 ? '' : 's'}`
        : 'Protects current delivery position',
    }))
    .sort((a, b) => b.impactScore - a.impactScore)
}

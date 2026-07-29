export type RecommendationCost = 'low' | 'medium' | 'high' | 'unknown'

export interface Recommendation {
  id: string
  title: string
  action: string
  rationale: string
  expectedRecoveryDays: number
  confidence: number
  estimatedCost: RecommendationCost
  relatedEventIds: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface IntelligenceAlert {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  relatedEventIds: string[]
  recommendedAction?: string
}

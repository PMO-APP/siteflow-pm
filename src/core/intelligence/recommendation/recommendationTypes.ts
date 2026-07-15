export type RecommendationPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export type RecommendationItem = {
  id: string
  title: string
  description: string
  priority: RecommendationPriority
  category:
    | 'schedule'
    | 'quality'
    | 'commercial'
    | 'approval'
    | 'procurement'
    | 'risk'
    | 'governance'
    | 'hse'
  route?: string
  expectedImpact?: string
}

export type RecommendationResult = {
  items: RecommendationItem[]
  criticalCount: number
  highCount: number
  generatedAt: string
}

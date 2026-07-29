export type HealthDimension =
  | 'schedule'
  | 'commercial'
  | 'quality'
  | 'safety'
  | 'procurement'
  | 'approval'

export type HealthBand = 'green' | 'amber' | 'red'

export interface HealthDimensionResult {
  dimension: HealthDimension
  score: number
  band: HealthBand
  openIssues: number
  criticalIssues: number
  explanation: string
}

export interface ProjectHealth {
  overallScore: number
  overallBand: HealthBand
  dimensions: Record<HealthDimension, HealthDimensionResult>
  calculatedAt: string
  explanation: string
}

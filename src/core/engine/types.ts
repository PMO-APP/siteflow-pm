export type HealthTone = 'healthy' | 'recoverable' | 'at_risk' | 'critical'
export type ContributorTone = HealthTone | 'not_assessed'

export type HealthContributorKey =
  | 'schedule'
  | 'commercial'
  | 'quality'
  | 'risk'
  | 'safety'
  | 'approvals'
  | 'procurement'
  | 'governance'

export type HealthBreakdown = Record<HealthContributorKey, number>

export type ProjectHealthContributor = {
  key: HealthContributorKey
  label: string
  score: number | null
  status: 'assessed' | 'not_assessed'
  tone: ContributorTone
  configuredWeight: number
  normalizedWeight: number
  explanations: string[]
  recommendations: string[]
  metrics: Record<string, number | string | null>
}

export type ProjectHealthConfidence = {
  score: number
  label: 'High' | 'Medium' | 'Low'
  assessedWeight: number
  assessedContributors: number
  totalContributors: number
}

export type ProjectHealthResult = {
  score: number
  tone: HealthTone
  label: string
  breakdown: HealthBreakdown
  contributors: ProjectHealthContributor[]
  drivers: string[]
  recommendations: string[]
  summary: string
  confidence: ProjectHealthConfidence
  methodologyVersion: string
  calculatedAt: string
}

export type GovernanceException = {
  id: string
  code: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  module: string
  route?: string
}

export type GovernanceResult = {
  score: number
  complianceLabel: string
  exceptions: GovernanceException[]
  calculatedAt: string
}

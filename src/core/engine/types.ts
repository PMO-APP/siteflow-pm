export type HealthTone = 'healthy' | 'recoverable' | 'at_risk' | 'critical'

export type HealthBreakdown = {
  schedule: number
  commercial: number
  quality: number
  risk: number
  safety: number
  approvals: number
  procurement: number
  governance: number
}

export type ProjectHealthResult = {
  score: number
  tone: HealthTone
  label: string
  breakdown: HealthBreakdown
  drivers: string[]
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

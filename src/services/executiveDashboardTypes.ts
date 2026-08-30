export type ExecutiveHealth = 'healthy' | 'attention' | 'critical'

export type ExecutiveProjectRow = {
  id: number
  name: string
  organizationId: number | null
  portfolioId: number | null
  status: string
  progress: number
  plannedProgress: number
  scheduleVarianceDays: number
  healthScore: number
  health: ExecutiveHealth
  ragLabel: string
  primaryBlocker: string
  overdueActivities: number
  highRisks: number
  overdueProcurement: number
  overdueApprovals: number
  qualityExceptions: number
  qualityScore: number | null
  qualityEvidenceCount: number
  openHseIncidents: number
  openSnags: number
  budget: number
  actualCost: number
  committedCost: number
  forecastCost: number | null
  forecastCostSource: 'explicit' | 'run-rate' | 'none'
  costProgressGap: number | null
  budgetUtilization: number | null
  spi: number | null
  cpi: number | null
  plannedCompletion: string | null
  forecastCompletion: string | null
  forecastDelayDays: number
  latitude: number | null
  longitude: number | null
}

export type ExecutiveAttentionItem = {
  id: string
  projectId: number
  projectName: string
  category: string
  title: string
  reason: string
  severity: 'warning' | 'critical'
  daysOverdue: number
  owner: string
  suggestedAction: string
  actionUrl: string
  score: number
}

export type ExecutiveDecision = {
  id: string
  projectId: number | null
  portfolioId: number | null
  projectName: string | null
  decision: string
  rationale: string | null
  ownerName: string | null
  dueDate: string | null
  priority: string
  status: string
  actionUrl: string | null
  createdAt: string
}

export type ExecutiveTimelineItem = {
  id: string
  projectId: number | null
  projectName: string | null
  type: string
  title: string
  date: string
  status: string
  actionUrl: string | null
}

export type ExecutiveTrendPoint = {
  date: string
  projectId: number
  projectName: string
  progress: number
  plannedProgress: number
  budgetUtilization: number | null
  costProgressGap: number | null
  scheduleVarianceDays: number
  highRisks: number
  qualityScore: number | null
}

export type ExecutivePortfolioSnapshot = {
  projects: ExecutiveProjectRow[]
  attention: ExecutiveAttentionItem[]
  decisions: ExecutiveDecision[]
  timeline: ExecutiveTimelineItem[]
  insights: string[]
  trends: ExecutiveTrendPoint[]
  metrics: {
    activeProjects: number
    healthyProjects: number
    attentionProjects: number
    criticalProjects: number
    portfolioHealthScore: number
    overallProgress: number
    portfolioSpi: number | null
    portfolioCpi: number | null
    budgetUtilization: number | null
    totalBudget: number
    totalActualCost: number
    totalCommittedCost: number
    totalForecastCost: number | null
    forecastCostVariance: number | null
    projectsForecastLate: number
    forecastCompletion: string | null
  }
  rankings: {
    bestDelivery: ExecutiveProjectRow[]
    lowestRisk: ExecutiveProjectRow[]
    bestQuality: ExecutiveProjectRow[]
    mostDelayed: ExecutiveProjectRow[]
  }
}

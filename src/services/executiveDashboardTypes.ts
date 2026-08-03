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
  openHseIncidents: number
  openSnags: number
  budget: number
  actualCost: number
  budgetUtilization: number | null
  spi: number | null
  cpi: number | null
  forecastCompletion: string | null
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

export type ExecutivePortfolioSnapshot = {
  projects: ExecutiveProjectRow[]
  attention: ExecutiveAttentionItem[]
  decisions: ExecutiveDecision[]
  timeline: ExecutiveTimelineItem[]
  insights: string[]
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
    forecastCompletion: string | null
  }
  rankings: {
    bestDelivery: ExecutiveProjectRow[]
    lowestRisk: ExecutiveProjectRow[]
    bestQuality: ExecutiveProjectRow[]
    mostDelayed: ExecutiveProjectRow[]
  }
}

export type DeliveryStageStatus =
  | 'completed'
  | 'in_progress'
  | 'blocked'
  | 'waiting'
  | 'not_started'
  | 'not_applicable'

export type DeliveryStageBlocker = {
  id: string
  title: string
  source: 'schedule' | 'approval' | 'procurement' | 'quality' | 'risk' | 'hse'
  ownerId: string | null
  ownerName: string | null
  route: string
  severity: 'warning' | 'critical'
}

export type DeliveryStage = {
  id: string
  name: string
  progress: number
  status: DeliveryStageStatus
  activityIds: string[]
  blockerCount: number
  criticalActivityCount: number
  readinessScore: number
  route: string
  blockers: DeliveryStageBlocker[]
  ownerLabel: string | null
  applicable: boolean
}

export type DeliveryPackageIssueSummary = {
  delayedActivities: number
  openApprovals: number
  procurementBlockers: number
  openRisks: number
  openSnags: number
  qualityFailures: number
  hseIncidents: number
}

export type DeliveryPackagePerformance = {
  id: string
  name: string
  discipline: string | null
  contractorName: string | null
  weight: number
  progress: number
  plannedProgress: number
  variance: number
  overdueActivities: number
  totalActivities: number
  healthScore: number
  healthLabel: 'Healthy' | 'Watch' | 'At Risk' | 'Critical'
  primaryDelayActivity: string | null
  currentStageId: string | null
  currentStageName: string | null
  daysVariance: number
  issueSummary: DeliveryPackageIssueSummary
  recentActivityNames: string[]
  upcomingMilestones: Array<{ id: string; name: string; plannedFinish: string | null }>
}

export type DeliveryTwinResult = {
  projectId: string
  scopeTemplate: string
  stages: DeliveryStage[]
  activeStage: DeliveryStage | null
  nextStage: DeliveryStage | null
  completedStages: number
  totalApplicableStages: number
  overallProgress: number
  packages: DeliveryPackagePerformance[]
  isMultiPackage: boolean
  generatedAt: string
  dependencyIntelligence: DeliveryDependencyIntelligence
}

export type DependencyHealth = 'healthy' | 'at_risk' | 'blocked'

export type DependencyNode = {
  id: string
  name: string
  packageId: string | null
  packageName: string | null
  progress: number
  isCritical: boolean
  isMilestone: boolean
  plannedFinish: string | null
  health: DependencyHealth
  predecessorIds: string[]
  successorIds: string[]
}

export type DependencyEdge = {
  id: string
  from: string
  to: string
  health: DependencyHealth
  reason: string
}

export type DependencyBottleneck = {
  activityId: string
  activityName: string
  downstreamCount: number
  packageCount: number
  isCritical: boolean
  health: DependencyHealth
}

export type DeliveryDependencyIntelligence = {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  criticalPathIds: string[]
  bottlenecks: DependencyBottleneck[]
  crossPackageLinks: number
  blockedLinks: number
  atRiskLinks: number
}

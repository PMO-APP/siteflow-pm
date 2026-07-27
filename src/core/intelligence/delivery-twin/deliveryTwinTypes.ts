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
}

export type DeliveryTwinResult = {
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
}

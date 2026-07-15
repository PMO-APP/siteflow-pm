export type DeliveryStageStatus =
  | 'completed'
  | 'in_progress'
  | 'blocked'
  | 'waiting'
  | 'not_started'

export type DeliveryStage = {
  id: string
  name: string
  phase: string
  discipline: string | null
  progress: number
  status: DeliveryStageStatus
  activityIds: string[]
  blockerCount: number
  criticalActivityCount: number
  readinessScore: number
  route: string
}

export type DeliveryTwinResult = {
  stages: DeliveryStage[]
  activeStage: DeliveryStage | null
  nextStage: DeliveryStage | null
  completedStages: number
  totalStages: number
  overallProgress: number
  generatedAt: string
}

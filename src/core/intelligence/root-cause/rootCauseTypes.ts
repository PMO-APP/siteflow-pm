import type { ProjectState } from '@/core/intelligence/models/ProjectState'

export type DependencyNode = {
  id: string
  name: string
  progress: number
  status: string | null
  isCritical: boolean
  isBlocked: boolean
}

export type RootCauseResult = {
  primaryCause: DependencyNode | null
  secondaryCause: DependencyNode | null
  dependencyChain: DependencyNode[]
  blockedActivities: DependencyNode[]
  impactedActivities: DependencyNode[]
  confidence: number
  explanation: string
  recommendedOwner: string | null
  recommendedAction: string
  generatedAt: string
}

export type ScheduleActivity =
  ProjectState['schedule']['activities'][number]

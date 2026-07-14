export type ReadinessRequirementStatus =
  | 'ready'
  | 'not_ready'
  | 'unknown'

export type ReadinessRequirement = {
  id: string
  label: string
  status: ReadinessRequirementStatus
  reason?: string
  route?: string
}

export type MilestoneReadinessResult = {
  milestoneId: string | null
  milestoneName: string
  score: number
  status:
    | 'ready'
    | 'nearly_ready'
    | 'not_ready'
    | 'unknown'
  requirements: ReadinessRequirement[]
  blockers: ReadinessRequirement[]
  generatedAt: string
}

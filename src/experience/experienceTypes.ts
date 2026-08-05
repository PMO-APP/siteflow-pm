
export type ExperienceAudience =
  | 'workspace_creator' | 'workspace_admin' | 'pmo' | 'executive'
  | 'design' | 'costing' | 'housebuild' | 'infrastructure' | 'mep'
  | 'hse' | 'contractor' | 'consultant' | 'vendor' | 'viewer' | 'member'

export type ExperienceKind =
  | 'workspace_setup' | 'product_tour' | 'role_tour'
  | 'contextual_tip' | 'announcement' | 'ai_coach'

export type ExperienceStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'dismissed'

export type ExperienceState = {
  userId: string | null
  workspaceId: string | null
  role: string | null
  audience: ExperienceAudience
  isFirstLogin: boolean
  isWorkspaceCreator: boolean
  hasOrganization: boolean
  hasWorkspace: boolean
  hasPortfolio: boolean
  hasProject: boolean
  hasSchedule: boolean
  setupCompleted: boolean
  productTourCompleted: boolean
  recommendedExperience: ExperienceKind
  recommendedReason: string
  loading: boolean
  error: string | null
}

export type ExperienceDefinition = {
  id: string
  key: string
  name: string
  kind: ExperienceKind
  audience: ExperienceAudience[]
  description: string
  version: number
  isActive: boolean
  steps: ExperienceStepDefinition[]
}

export type ExperienceStepDefinition = {
  id: string
  experienceId: string
  stepKey: string
  title: string
  body: string
  targetSelector: string | null
  route: string | null
  placement: 'top' | 'right' | 'bottom' | 'left' | 'center'
  actionType: 'next' | 'click' | 'input' | 'navigation' | 'complete'
  validation: Record<string, unknown>
  sortOrder: number
}

export type ExperienceProgress = {
  id?: string
  workspaceId: string | null
  userId: string
  experienceKey: string
  status: ExperienceStatus
  currentStepKey: string | null
  completedStepKeys: string[]
  startedAt: string | null
  completedAt: string | null
  skippedAt: string | null
  lastSeenAt: string
  metadata: Record<string, unknown>
}

export type ExperienceEventName =
  | 'recommended' | 'launched' | 'step_viewed' | 'step_completed'
  | 'completed' | 'skipped' | 'dismissed' | 'resumed' | 'error'

export type ExperienceEvent = {
  workspaceId: string | null
  userId: string
  experienceKey: string
  sessionId?: string | null
  eventName: ExperienceEventName
  stepKey?: string | null
  route?: string | null
  metadata?: Record<string, unknown>
}

export type ExperienceAnalytics = {
  totalUsers: number
  started: number
  completed: number
  skipped: number
  completionRate: number
  averageCompletionMinutes: number
  mostAbandonedStep: string | null
}

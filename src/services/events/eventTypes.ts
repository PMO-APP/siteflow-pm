export const PROJECT_EVENT_TYPES = [
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'ACTIVITY_CREATED',
  'ACTIVITY_UPDATED',
  'ACTIVITY_DELAYED',
  'ACTIVITY_COMPLETED',
  'PROCUREMENT_CREATED',
  'PROCUREMENT_UPDATED',
  'PROCUREMENT_DELAYED',
  'PROCUREMENT_RECEIVED',
  'APPROVAL_CREATED',
  'APPROVAL_UPDATED',
  'APPROVAL_GRANTED',
  'APPROVAL_REJECTED',
  'APPROVAL_OVERDUE',
  'QUALITY_GATE_CREATED',
  'QUALITY_GATE_FAILED',
  'QUALITY_GATE_PASSED',
  'RFI_CREATED',
  'RFI_UPDATED',
  'RFI_CLOSED',
  'SNAG_CREATED',
  'SNAG_UPDATED',
  'SNAG_CLOSED',
  'RISK_CREATED',
  'RISK_UPDATED',
  'RISK_ESCALATED',
  'RISK_CLOSED',
  'HEALTH_RECALCULATION_REQUESTED',
  'HEALTH_RECALCULATED',
  'RECOVERY_RECALCULATION_REQUESTED',
  'RECOVERY_UPDATED',
  'EXECUTIVE_SUMMARY_UPDATED',
  'NOTIFICATION_REQUESTED',
] as const

export type ProjectEventType = (typeof PROJECT_EVENT_TYPES)[number]

export type ProjectEventPriority = 'low' | 'normal' | 'high' | 'critical'
export type ProjectEventSource =
  | 'ui'
  | 'service'
  | 'database'
  | 'system'
  | 'integration'

export interface ProjectEvent<TPayload = Record<string, unknown>> {
  id: string
  type: ProjectEventType
  occurredAt: string
  publishedAt: string
  source: ProjectEventSource
  priority: ProjectEventPriority
  projectId?: string | number | null
  portfolioId?: string | number | null
  organizationId?: string | number | null
  actorId?: string | null
  entityType?: string | null
  entityId?: string | number | null
  correlationId: string
  causationId?: string | null
  schemaVersion: 1
  payload: TPayload
  metadata?: Record<string, unknown>
}

export interface PublishProjectEventInput<TPayload = Record<string, unknown>> {
  type: ProjectEventType
  payload?: TPayload
  occurredAt?: string
  source?: ProjectEventSource
  priority?: ProjectEventPriority
  projectId?: string | number | null
  portfolioId?: string | number | null
  organizationId?: string | number | null
  actorId?: string | null
  entityType?: string | null
  entityId?: string | number | null
  correlationId?: string
  causationId?: string | null
  metadata?: Record<string, unknown>
  persist?: boolean
}

export type ProjectEventHandler<TPayload = Record<string, unknown>> = (
  event: ProjectEvent<TPayload>
) => void | Promise<void>

export interface EventDeliveryFailure {
  eventId: string
  handlerName: string
  message: string
  occurredAt: string
}

export interface EventPublishResult {
  event: ProjectEvent
  deliveredHandlers: number
  failures: EventDeliveryFailure[]
  persisted: boolean
}

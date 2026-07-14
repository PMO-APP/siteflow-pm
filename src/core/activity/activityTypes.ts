export type ActivitySeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'critical'

export type ActivityModule =
  | 'schedule'
  | 'approvals'
  | 'procurement'
  | 'quality'
  | 'risk'
  | 'hse'
  | 'documents'
  | 'reports'
  | 'commercial'
  | 'handover'
  | 'system'

export type ActivityEventInput = {
  projectId?: string | number | null
  organizationId?: string | number | null
  portfolioId?: string | number | null

  eventType: string
  module: ActivityModule
  title: string
  description?: string | null

  entityType?: string | null
  entityId?: string | number | null
  route?: string | null

  severity?: ActivitySeverity
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null

  metadata?: Record<string, unknown>
}

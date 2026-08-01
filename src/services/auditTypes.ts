
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT' | 'ACCESS' | 'EXPORT' | string
export type AuditSeverity = 'info' | 'warning' | 'critical'

export type AuditLogRecord = {
  id: string
  workspaceId: string | null
  projectId: string | number | null
  portfolioId: string | number | null
  actorId: string | null
  actorEmail: string | null
  actorRole: string | null
  action: AuditAction
  module: string
  tableName: string | null
  recordId: string | null
  description: string | null
  severity: AuditSeverity
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  changedFields: string[]
  correlationId: string | null
  sessionId: string | null
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
}

export type RecordVersion = {
  id: string
  workspaceId: string | null
  tableName: string
  recordId: string
  versionNumber: number
  operation: string
  snapshot: Record<string, unknown>
  actorId: string | null
  createdAt: string
}

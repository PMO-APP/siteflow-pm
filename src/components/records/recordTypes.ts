export type RecordKind = 'task' | 'procurement' | 'approval' | 'risk' | 'rfi' | 'snag' | 'quality'

export interface RecordSummary {
  id: string
  kind: RecordKind
  title: string
  subtitle?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  taskId?: string | null
  procurementId?: string | null
  projectId?: string | null
  metadata?: Array<{ label: string; value?: string | number | null }>
  notes?: string | null
}

export interface RelatedRecord {
  id: string
  kind: RecordKind
  title: string
  status?: string | null
  relationship: string
}

export interface RecordTimelineEvent {
  id: string
  occurredAt: string
  title: string
  description?: string | null
  actor?: string | null
  tone?: 'neutral' | 'positive' | 'warning' | 'critical'
}

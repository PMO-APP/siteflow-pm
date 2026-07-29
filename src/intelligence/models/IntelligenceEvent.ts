export type IntelligenceSource =
  | 'schedule'
  | 'approval'
  | 'procurement'
  | 'risk'
  | 'quality'
  | 'finance'
  | 'site'
  | 'consultant'
  | 'contractor'
  | 'hse'
  | 'snag'
  | 'rfi'

export type IntelligenceSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IntelligenceStatus = 'open' | 'closed'

export interface IntelligenceLink {
  type: 'blocks' | 'depends_on' | 'relates_to' | 'caused_by' | 'assigned_to'
  targetId: string
  targetType?: string
}

export interface IntelligenceEvent {
  id: string
  projectId: string | number
  packageId?: string | number
  activityId?: string | number
  source: IntelligenceSource
  severity: IntelligenceSeverity
  status: IntelligenceStatus
  title: string
  description?: string
  dueDate?: string
  occurredAt?: string
  createdAt: string
  value?: number
  weight?: number
  links?: IntelligenceLink[]
  metadata?: Record<string, unknown>
}

export interface ProjectIntelligenceInput {
  projectId: string | number
  projectName?: string
  plannedFinish?: string
  currentProgress?: number
  events: IntelligenceEvent[]
  now?: Date
}


export type DistributionChannel = 'email' | 'secure_link' | 'workspace_feed' | 'download'
export type DistributionFormat = 'pdf' | 'excel' | 'word'
export type DistributionStatus = 'draft' | 'pending_approval' | 'approved' | 'queued' | 'sent' | 'failed' | 'cancelled'
export type ScheduleFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type DistributionList = {
  id?: string
  workspaceId: string
  name: string
  description: string
  recipients: Array<{name:string;email:string;role?:string|null;external?:boolean}>
}

export type ReportDistribution = {
  id: string
  workspaceId: string
  reportId: string
  reportTitle: string
  reportVersion: number
  channel: DistributionChannel
  format: DistributionFormat
  status: DistributionStatus
  recipients: string[]
  approvalRequired: boolean
  approvalStatus: string
  lastSentAt: string | null
  nextScheduledAt: string | null
  createdAt: string
}

export type ReportSchedule = {
  id?: string
  workspaceId: string
  name: string
  templateId: string | null
  reportType: string
  scopeType: 'workspace' | 'portfolio' | 'project'
  scopeId: string | null
  frequency: ScheduleFrequency
  cronExpression: string | null
  timezone: string
  runTime: string
  recipients: string[]
  channel: DistributionChannel
  format: DistributionFormat
  approvalRequired: boolean
  isActive: boolean
  nextRunAt: string | null
}

export type ShareLink = {
  id: string
  token: string
  reportId: string
  expiresAt: string | null
  viewOnly: boolean
  downloadLimit: number | null
  downloadCount: number
  watermark: string | null
  revokedAt: string | null
  createdAt: string
}

export type DistributionAnalytics = {
  totalDistributions: number
  successful: number
  failed: number
  scheduled: number
  downloads: number
  secureLinks: number
}

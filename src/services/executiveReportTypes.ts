
export type ExecutiveReportType =
  | 'executive_portfolio'
  | 'weekly_pmo'
  | 'monthly_board'
  | 'project_health'
  | 'risk'
  | 'procurement'
  | 'cost'
  | 'contractor_performance'
  | 'consultant_performance'
  | 'quality'
  | 'hse'
  | 'schedule_recovery'

export type ReportStatus = 'draft' | 'generated' | 'approved' | 'archived'

export type ReportTemplate = {
  id: string
  workspaceId: string
  name: string
  reportType: ExecutiveReportType
  description: string | null
  sections: string[]
  isDefault: boolean
  isActive: boolean
  createdAt: string
}

export type GeneratedReport = {
  id: string
  workspaceId: string
  projectId: string | number | null
  portfolioId: string | number | null
  templateId: string | null
  reportType: ExecutiveReportType
  title: string
  reportingPeriodStart: string | null
  reportingPeriodEnd: string | null
  status: ReportStatus
  versionNumber: number
  executiveSummary: string
  dataSnapshot: Record<string, unknown>
  generatedBy: string | null
  generatedAt: string
  approvedBy: string | null
  approvedAt: string | null
}

export type ReportGenerationInput = {
  workspaceId: string
  projectId?: string | number | null
  portfolioId?: string | number | null
  reportType: ExecutiveReportType
  title: string
  reportingPeriodStart?: string | null
  reportingPeriodEnd?: string | null
  templateId?: string | null
}

export type ReportSnapshot = {
  generatedAt: string
  workspaceName: string
  projectName?: string | null
  metrics: Record<string, number | string>
  highlights: string[]
  concerns: string[]
  decisionsRequired: string[]
  tables: Record<string, Array<Record<string, unknown>>>
}


export type ReportWidgetType =
  | 'cover' | 'heading' | 'text' | 'executive_summary' | 'kpi_cards'
  | 'project_health' | 'rag_heatmap' | 'schedule' | 'risk_table'
  | 'procurement_table' | 'approvals_table' | 'cost_summary' | 'quality_hse'
  | 'image_gallery' | 'timeline' | 'decision_list' | 'page_break'

export type ReportWidget = {
  id: string
  type: ReportWidgetType
  title: string
  description: string
  dataSource: string | null
  chartType: 'none' | 'bar' | 'line' | 'pie'
  maxRecords: number
  hidden: boolean
  pageBreakBefore: boolean
  commentary: string
  filters: Record<string, unknown>
}

export type DesignerTemplate = {
  id?: string
  workspaceId: string
  name: string
  reportType: string
  description: string
  defaultScope: 'workspace' | 'portfolio' | 'project'
  orientation: 'portrait' | 'landscape'
  confidentialityLabel: string
  signatory: string
  approvalRole: string
  defaultRecipients: string[]
  widgets: ReportWidget[]
  isDefault: boolean
  isActive: boolean
}

export type ProjectStateSectionId =
  | 'project'
  | 'schedule'
  | 'commercial'
  | 'quality'
  | 'risk'
  | 'approvals'
  | 'procurement'
  | 'hse'
  | 'reports'
  | 'documents'

export type InspectorMetricTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'

export type InspectorMetric = {
  label: string
  value: string | number
  helper?: string
  tone?: InspectorMetricTone
}

export type ProjectStateSection = {
  id: ProjectStateSectionId
  label: string
  description: string
  count?: number
  metrics: InspectorMetric[]
  rawData: unknown
}

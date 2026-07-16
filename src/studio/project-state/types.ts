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

export type ProjectStateSection = {
  id: ProjectStateSectionId
  label: string
  description: string
  count?: number
}

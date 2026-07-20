import type { RFIDiscipline, RFIPriority, RFIStatus } from './types'

export const RFI_STATUSES: RFIStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Answered',
  'Closed',
  'Rejected',
]

export const RFI_PRIORITIES: RFIPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
]

export const RFI_DISCIPLINES: RFIDiscipline[] = [
  'Architectural',
  'Structural',
  'MEP',
  'Civil',
  'Commercial',
  'HSE',
  'General',
]

export const RFI_RESPONSE_ROLES = new Set([
  'workspace_admin',
  'admin',
  'pmo',
  'consultant',
  'design',
  'project_owner',
  'overall_project_owner',
  'housebuild_project_owner',
  'mep_project_owner',
  'infrastructure_project_owner',
])

export const RFI_EDIT_ROLES = new Set([
  'workspace_admin',
  'admin',
  'pmo',
  'project_owner',
  'overall_project_owner',
  'housebuild_project_owner',
  'mep_project_owner',
  'infrastructure_project_owner',
  'contractor',
])

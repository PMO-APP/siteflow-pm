export type OrganizationStatus = 'active' | 'suspended' | 'inactive'

export type OrganizationType =
  | 'contractor'
  | 'subcontractor'
  | 'architect'
  | 'structural_consultant'
  | 'mep_consultant'
  | 'quantity_surveyor'
  | 'external_project_manager'
  | 'consultant'
  | 'vendor'
  | 'supplier'
  | 'utility_provider'
  | 'auditor'
  | 'other'

export interface Organization {
  id: number
  name: string
  organization_type: OrganizationType
  registration_number: string | null
  email: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  status: OrganizationStatus
  created_at: string
  updated_at: string
}

export interface OrganizationEngagement {
  id: number
  organization_id: number
  project_id: number
  title: string
  contract_number: string | null
  contract_role: string | null
  scope_of_work: string | null
  start_date: string | null
  planned_completion_date: string | null
  actual_completion_date: string | null
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'terminated'
}

export interface OrganizationUser {
  id: number
  organization_id: number
  user_id: string | null
  email: string
  full_name: string | null
  portal_role: string
  job_title: string | null
  status: 'invited' | 'active' | 'suspended' | 'inactive'
}

export const INTERNAL_VIEW_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
  'project_owner',
  'design',
  'housebuild',
  'costing',
  'infrastructure',
  'mep',
]

export const ADMIN_CONSOLE_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
]

export const EXTERNAL_ROLES = [
  'consultant',
  'contractor',
  'vendor',
  'subcontractor',
]

export const PROJECT_ROLES = [
  'consultant',
  'contractor',
  'vendor',
  'subcontractor',
  'project_owner',
  'design',
  'housebuild',
  'mep',
  'infrastructure',
  'costing',
  'viewer',
  'guest',
]

export function canViewInternalPages(role?: string | null) {
  return INTERNAL_VIEW_ROLES.includes(role || '')
}

export function canAccessAdminConsole(role?: string | null) {
  return ADMIN_CONSOLE_ROLES.includes(role || '')
}

export function isExternalRole(role?: string | null) {
  return EXTERNAL_ROLES.includes(role || '')
}

export function canManageWorkspace(role?: string | null) {
  return ['workspace_admin', 'admin'].includes(role || '')
}

export function canManageUsers(role?: string | null) {
  return ADMIN_CONSOLE_ROLES.includes(role || '')
}

export function canManagePortfolio(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo', 'portfolio_manager'].includes(
    role || ''
  )
}

export function canEditProjectInfo(role?: string | null) {
  return role === 'project_owner'
}

export function canEditSchedule(role?: string | null) {
  return role === 'project_owner'
}

export function canEditDocuments(role?: string | null) {
  return role === 'project_owner'
}

export function canEditRisk(role?: string | null) {
  return role === 'project_owner'
}

export function canEditProcurement(role?: string | null) {
  return role === 'project_owner'
}

export function canEditHousebuild(role?: string | null) {
  return role === 'project_owner'
}

export function canEditDesign(role?: string | null) {
  return role === 'project_owner'
}

export function canEditInfrastructure(role?: string | null) {
  return role === 'project_owner'
}

export function canEditMEP(role?: string | null) {
  return role === 'project_owner'
}

export function canEditCosting(role?: string | null) {
  return role === 'costing'
}

export function canManageFinancials(role?: string | null) {
  return role === 'costing'
}

export function canApprove(role?: string | null) {
  return role === 'project_owner'
}

export function canExportReports(role?: string | null) {
  return ['project_owner', 'pmo', 'portfolio_manager', 'admin', 'workspace_admin'].includes(
    role || ''
  )
}

export function canEditExternalReview(role?: string | null) {
  return ['project_owner', 'pmo', 'portfolio_manager', 'admin', 'workspace_admin'].includes(
    role || ''
  )
}

export function canEditPage(role?: string | null, page?: string) {
  if (isExternalRole(role)) return false

  if (page === 'financial') return canManageFinancials(role)
  if (page === 'costing') return canEditCosting(role)
  if (page === 'external-review') return canEditExternalReview(role)

  return role === 'project_owner'
}

export function canDelete(role?: string | null) {
  return role === 'project_owner'
}

export function isReadOnly(role?: string | null) {
  if (isExternalRole(role)) return true
  if (['viewer', 'guest'].includes(role || '')) return true

  return !['project_owner', 'costing'].includes(role || '')
}

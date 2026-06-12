export const PROJECT_ROLES = [
  'consultant',
  'contractor',
  'project_manager',
  'project_owner',
  'design',
  'housebuild',
  'mep',
  'infrastructure',
  'costing',
  'viewer',
  'guest',
]

export function canManageWorkspace(role?: string | null) {
  return ['workspace_admin', 'admin'].includes(role || '')
}

export function canManageUsers(role?: string | null) {
  return ['workspace_admin', 'admin'].includes(role || '')
}

export function canManagePortfolio(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo', 'portfolio_manager'].includes(
    role || ''
  )
}

export function canEditSchedule(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'contractor',
  ].includes(role || '')
}

export function canEditDocuments(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'consultant',
    'contractor',
    'design',
    'housebuild',
    'mep',
    'infrastructure',
  ].includes(role || '')
}

export function canEditRisk(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'consultant',
    'contractor',
    'design',
    'housebuild',
    'mep',
    'infrastructure',
    'costing',
  ].includes(role || '')
}

export function canEditProcurement(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'costing',
    'project_owner',
    'project_manager',
    'consultant',
    'contractor',
  ].includes(role || '')
}

export function canEditProjectInfo(
  role?: string | null,
  userEmail?: string | null,
  projectOwnerEmail?: string | null
) {
  if (
    [
      'workspace_admin',
      'admin',
      'pmo',
      'portfolio_manager',
      'project_owner',
      'project_manager',
    ].includes(role || '')
  ) {
    return true
  }

  if (
    role === 'project_owner' &&
    userEmail &&
    projectOwnerEmail &&
    userEmail.toLowerCase() === projectOwnerEmail.toLowerCase()
  ) {
    return true
  }

  return false
}

export function canEditHousebuild(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'housebuild',
    'contractor',
  ].includes(role || '')
}

export function canEditDesign(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'design',
    'consultant',
  ].includes(role || '')
}

export function canEditInfrastructure(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'infrastructure',
    'contractor',
  ].includes(role || '')
}

export function canEditMEP(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'mep',
    'contractor',
    'consultant',
  ].includes(role || '')
}

export function canEditCosting(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'costing',
  ].includes(role || '')
}

export function canApprove(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
  ].includes(role || '')
}

export function canManageFinancials(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'costing',
  ].includes(role || '')
}

export function canExportReports(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
    'consultant',
  ].includes(role || '')
}

export function canEditPage(
  role?: string | null,
  page?: string,
  userEmail?: string | null,
  projectOwnerEmail?: string | null
) {
  if (
    [
      'workspace_admin',
      'admin',
      'pmo',
      'portfolio_manager',
      'project_owner',
      'project_manager',
    ].includes(role || '')
  ) {
    return true
  }

  if (
    role === 'project_owner' &&
    userEmail &&
    projectOwnerEmail &&
    userEmail.toLowerCase() === projectOwnerEmail.toLowerCase()
  ) {
    return true
  }

  if (page === 'financial') return canManageFinancials(role)
  if (page === 'documents') return canEditDocuments(role)
  if (page === 'risk') return canEditRisk(role)
  if (page === 'reports') return canExportReports(role)
  if (page === 'procurement') return canEditProcurement(role)
  if (page === 'schedule') return canEditSchedule(role)
  if (page === 'housebuild') return canEditHousebuild(role)
  if (page === 'design') return canEditDesign(role)
  if (page === 'infrastructure') return canEditInfrastructure(role)
  if (page === 'mep') return canEditMEP(role)

  return false
}

export function canDelete(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'project_manager',
  ].includes(role || '')
}

export function isReadOnly(role?: string | null) {
  return ['guest', 'viewer'].includes(role || '')
}

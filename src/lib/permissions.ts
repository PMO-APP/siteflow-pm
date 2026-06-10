export function canManageWorkspace(role?: string | null) {
  return ['workspace_admin', 'admin'].includes(role || '')
}

export function canManageUsers(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo'].includes(role || '')
}

export function canEditSchedule(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'project_manager',
  ].includes(role || '')
}

export function canEditDocuments(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'project_manager',
    'design',
    'housebuild',
    'infrastructure',
  ].includes(role || '')
}

export function canEditRisk(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'project_manager',
    'design',
    'housebuild',
    'infrastructure',
    'costing',
  ].includes(role || '')
}

export function canEditProcurement(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'costing',
    'project_owner',
    'project_manager',
  ].includes(role || '')
}

export function canManagePortfolio(role?: string | null) {
  return ['workspace_admin', 'admin', 'portfolio_manager'].includes(role || '')
}

export function canEditProjectInfo(
  role?: string | null,
  userEmail?: string | null,
  projectOwnerEmail?: string | null
) {
  if (['workspace_admin', 'admin', 'pmo'].includes(role || '')) return true

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
    'project_owner',
    'housebuild',
  ].includes(role || '')
}

export function canEditDesign(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'design',
  ].includes(role || '')
}

export function canEditInfrastructure(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'infrastructure',
  ].includes(role || '')
}

export function canEditCosting(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'costing',
  ].includes(role || '')
}

export function canApprove(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_manager',
  ].includes(role || '')
}

export function canManageFinancials(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'costing',
    'portfolio_manager',
  ].includes(role || '')
}

export function canExportReports(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'project_manager',
  ].includes(role || '')
}

export function canEditPage(
  role?: string | null,
  page?: string,
  userEmail?: string | null,
  projectOwnerEmail?: string | null
) {
  if (['workspace_admin', 'admin', 'pmo'].includes(role || '')) return true

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

  return false
}

export function canDelete(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo'].includes(role || '')
}

export function isReadOnly(role?: string | null) {
  return role === 'guest'
}

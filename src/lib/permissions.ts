export type Discipline =
  | 'Housebuild'
  | 'MEP'
  | 'Infrastructure'

export interface DisciplinePermissionContext {
  isOverallProjectOwner?: boolean
  isHousebuildOwner?: boolean
  isMEPOwner?: boolean
  isInfrastructureOwner?: boolean
}
export const HSE_ROLES = [
  'hse',
  'hse_lead',
  'hse_manager',
]
export const PROJECT_OWNER_ROLES = [
  'overall_project_owner',
  'housebuild_project_owner',
  'mep_project_owner',
  'infrastructure_project_owner',
]

export const INTERNAL_VIEW_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
  ...HSE_ROLES,
  ...PROJECT_OWNER_ROLES,
  'project_owner',
  'design',
  'housebuild',
  'costing',
  'infrastructure',
  'mep',
  'viewer',
  'guest',
]

export const ADMIN_CONSOLE_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
]

export const EXTERNAL_ROLES = [
  'consultant',
  'contractor',
  'vendor',
  'subcontractor',
]

export const INTERNAL_CONTRIBUTOR_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
  ...HSE_ROLES,
  ...PROJECT_OWNER_ROLES,
  'project_owner',
  'design',
  'housebuild',
  'costing',
  'infrastructure',
  'mep',
]

export const PROJECT_ROLES = [
  ...PROJECT_OWNER_ROLES,
  ...HSE_ROLES,
  'project_owner',
  'consultant',
  'contractor',
  'vendor',
  'subcontractor',
  'design',
  'housebuild',
  'mep',
  'infrastructure',
  'costing',
  'viewer',
  'guest',
]
export function isHSERole(role?: string | null) {
  return HSE_ROLES.includes(role || '')
}

export function canViewHSE(role?: string | null) {
  return (
    isProjectAdmin(role) ||
    isHSERole(role) ||
    [...PROJECT_OWNER_ROLES, 'project_owner'].includes(role || '')
  )
}

export function canCreateHSE(role?: string | null) {
  return isProjectAdmin(role) || isHSERole(role)
}

export function canCloseHSE(role?: string | null) {
  return isProjectAdmin(role) || ['hse_lead', 'hse_manager'].includes(role || '')
}
export function canViewInternalPages(role?: string | null) {
  return INTERNAL_VIEW_ROLES.includes(role || '')
}

export function canAccessAdminConsole(role?: string | null) {
  return ADMIN_CONSOLE_ROLES.includes(role || '')
}

export function isExternalRole(role?: string | null) {
  return EXTERNAL_ROLES.includes(role || '')
}

export function isViewerRole(role?: string | null) {
  return ['viewer', 'guest'].includes(role || '')
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

export function canCreateWorkspaceItems(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo', 'portfolio_manager'].includes(
    role || ''
  )
}

export function canViewAllProjects(role?: string | null) {
  return INTERNAL_VIEW_ROLES.includes(role || '')
}

export function canCreateInternalContribution(role?: string | null) {
  return INTERNAL_CONTRIBUTOR_ROLES.includes(role || '')
}

export function isProjectAdmin(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo'].includes(role || '')
}

export function canEditOwnOrAdmin(
  role?: string | null,
  createdBy?: string | null,
  userId?: string | null
) {
  if (isProjectAdmin(role)) return true
  if (isExternalRole(role)) return false
  if (isViewerRole(role)) return false

  return !!createdBy && !!userId && createdBy === userId
}

export function canDeleteOwnOrAdmin(
  role?: string | null,
  createdBy?: string | null,
  userId?: string | null
) {
  return canEditOwnOrAdmin(role, createdBy, userId)
}

export function canEditAssignedProject(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  if (isProjectAdmin(role)) return true

  if (
    [...PROJECT_OWNER_ROLES, 'project_owner'].includes(role || '') &&
    isAssignedProjectOwner
  ) {
    return true
  }

  return false
}

export function canEditDiscipline(
  role?: string | null,
  discipline?: Discipline,
  permissions?: DisciplinePermissionContext
) {
  if (isProjectAdmin(role)) return true

  if (
    role === 'overall_project_owner' ||
    permissions?.isOverallProjectOwner
  ) {
    return true
  }

  if (discipline === 'Housebuild') {
    return (
      role === 'housebuild_project_owner' ||
      !!permissions?.isHousebuildOwner
    )
  }

  if (discipline === 'MEP') {
    return (
      role === 'mep_project_owner' ||
      !!permissions?.isMEPOwner
    )
  }

  if (discipline === 'Infrastructure') {
    return (
      role === 'infrastructure_project_owner' ||
      !!permissions?.isInfrastructureOwner
    )
  }

  return false
}

export function canEditProjectInfo(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canEditSchedule(
  role?: string | null,
  discipline?: Discipline,
  permissions?: DisciplinePermissionContext
) {
  return canEditDiscipline(role, discipline, permissions)
}

export function canImportSchedule(
  role?: string | null,
  discipline?: Discipline,
  permissions?: DisciplinePermissionContext
) {
  return canEditDiscipline(role, discipline, permissions)
}

export function canUploadDocuments(role?: string | null) {
  return canCreateInternalContribution(role)
}

export function canEditDocument(
  role?: string | null,
  uploadedBy?: string | null,
  userId?: string | null,
  discipline?: Discipline,
  permissions?: DisciplinePermissionContext
) {
  if (isProjectAdmin(role)) return true

  if (uploadedBy && userId && uploadedBy === userId) {
    return true
  }

  return canEditDiscipline(role, discipline, permissions)
}

export function canEditRisk(
  role?: string | null,
  discipline?: Discipline,
  permissions?: DisciplinePermissionContext
) {
  return canEditDiscipline(role, discipline, permissions)
}

export function canEditProcurement(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canEditHousebuild(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canEditDesign(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canEditInfrastructure(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canEditMEP(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canEditReports(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return (
    [
      'workspace_admin',
      'admin',
      'pmo',
      'portfolio_manager',
      ...PROJECT_OWNER_ROLES,
      'project_owner',
      'design',
      'housebuild',
      'infrastructure',
      'mep',
      'costing',
    ].includes(role || '') ||
    canEditAssignedProject(role, isAssignedProjectOwner)
  )
}

export function canEditCosting(role?: string | null) {
  return role === 'costing'
}

export function canManageFinancials(role?: string | null) {
  return role === 'costing'
}

export function canApprove(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canExportReports(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    ...PROJECT_OWNER_ROLES,
    'project_owner',
    'design',
    'housebuild',
    'infrastructure',
    'mep',
    'costing',
  ].includes(role || '')
}

export function canEditExternalReview(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  return (
    [
      'workspace_admin',
      'admin',
      'pmo',
      'portfolio_manager',
      ...PROJECT_OWNER_ROLES,
      'project_owner',
    ].includes(role || '') || canEditAssignedProject(role, isAssignedProjectOwner)
  )
}

export function canCreateSnags(role?: string | null) {
  return canCreateInternalContribution(role)
}

export function canEditSnag(
  role?: string | null,
  createdBy?: string | null,
  userId?: string | null
) {
  return canEditOwnOrAdmin(role, createdBy, userId)
}

export function canCreateExternalAssignments(role?: string | null) {
  return canCreateInternalContribution(role)
}

export function canEditPage(
  role?: string | null,
  page?: string,
  isAssignedProjectOwner?: boolean
) {
  if (isExternalRole(role)) return false
  if (isViewerRole(role)) return false

  if (page === 'financial') return canManageFinancials(role)
  if (page === 'costing') return canEditCosting(role)
  if (page === 'reports') return canEditReports(role, isAssignedProjectOwner)
  if (page === 'documents') return canUploadDocuments(role)
  if (page === 'snags') return canCreateSnags(role)
  if (page === 'hse') return canCreateHSE(role)

  if (page === 'external-assignments') {
    return canCreateExternalAssignments(role)
  }

  if (page === 'external-review') {
    return canEditExternalReview(role, isAssignedProjectOwner)
  }

  return canEditAssignedProject(role, isAssignedProjectOwner)
}

export function canDelete(role?: string | null) {
  return isProjectAdmin(role)
}

export function isReadOnly(
  role?: string | null,
  isAssignedProjectOwner?: boolean
) {
  if (isExternalRole(role)) return true
  if (isViewerRole(role)) return true

  if (isProjectAdmin(role)) return false
  if (role === 'costing') return false

  if (
    [...PROJECT_OWNER_ROLES, 'project_owner'].includes(role || '') &&
    isAssignedProjectOwner
  ) {
    return false
  }

  return true
}

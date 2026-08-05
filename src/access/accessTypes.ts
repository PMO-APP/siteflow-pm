
export type AccessScopeType =
  | 'workspace'
  | 'portfolio'
  | 'project'
  | 'package'
  | 'discipline'

export type AccessLevel = 'view' | 'contribute' | 'edit' | 'manage'

export type CanonicalAccessAssignment = {
  id: string
  workspaceId: string
  userId: string
  scopeType: AccessScopeType
  scopeId: string | null
  discipline: string | null
  accessLevel: AccessLevel
  assignmentRole: string | null
  source: string
}

export type CanonicalAccessSession = {
  loading: boolean
  error: string | null
  workspaceId: string | null
  userId: string | null
  role: string | null
  permissionProfileKey: string | null
  discipline: string | null
  status: string | null
  isDefault: boolean
  portalRole: string | null
  workspaceType: string | null
  assignments: CanonicalAccessAssignment[]
}

export type PermissionAction =
  | 'workspace.view'
  | 'workspace.manage'
  | 'portfolio.view'
  | 'portfolio.edit'
  | 'project.view'
  | 'project.contribute'
  | 'project.edit'
  | 'project.manage'
  | 'schedule.view'
  | 'schedule.edit'
  | 'documents.upload'
  | 'hse.create'
  | 'hse.close'
  | 'team.invite'
  | 'team.manage'
  | 'project.delete'

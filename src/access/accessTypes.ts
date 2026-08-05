
export type WorkspaceMemberRole =
  | 'workspace_admin' | 'admin' | 'pmo' | 'portfolio_manager'
  | 'project_manager' | 'project_owner'
  | 'design' | 'costing' | 'housebuild' | 'infrastructure'
  | 'mep' | 'hse' | 'hse_lead' | 'hse_manager'
  | 'consultant' | 'contractor' | 'vendor' | 'subcontractor'
  | 'viewer' | 'guest' | string

export type AccessScopeType =
  | 'workspace' | 'portfolio' | 'project' | 'package' | 'discipline'

export type AccessLevel = 'view' | 'contribute' | 'edit' | 'manage'

export type MemberAccessAssignment = {
  id: string
  workspaceId: string
  userId: string
  scopeType: AccessScopeType
  scopeId: string | null
  discipline: string | null
  accessLevel: AccessLevel
  assignmentRole: string | null
  source: string
  startsAt: string | null
  endsAt: string | null
}

export type CanonicalWorkspaceMember = {
  workspaceId: string
  userId: string
  role: WorkspaceMemberRole
  status: string
  isDefault: boolean
  discipline: string | null
  permissionProfileKey: string | null
  source: string
  assignments: MemberAccessAssignment[]
}

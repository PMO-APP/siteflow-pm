export type WorkspaceType =
  | 'internal'
  | 'consultant'
  | 'contractor'
  | 'vendor'

export type WorkspaceAccess = {
  workspace: WorkspaceType
  role: string
  portalRole: string | null
  organizationId: number | null
  projectIds: number[]
}

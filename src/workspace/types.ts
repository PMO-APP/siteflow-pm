export type WorkspacePlan = 'starter' | 'professional' | 'enterprise'
export type WorkspaceStatus = 'active' | 'trial' | 'suspended' | 'archived'

export type WorkspaceBranding = {
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  loginBackgroundUrl: string | null
  emailHeaderUrl: string | null
  reportFooter: string | null
}

export type WorkspaceSettings = {
  timezone: string
  currency: string
  dateFormat: string
  locale: string
  industry: string | null
}

export type Workspace = {
  id: string
  name: string
  slug: string
  status: WorkspaceStatus
  plan: WorkspacePlan
  createdAt: string
  settings: WorkspaceSettings
  branding: WorkspaceBranding
}

export type WorkspaceMembership = {
  workspaceId: string
  userId: string
  role: string
  isDefault: boolean
}

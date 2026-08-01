
export type WorkspaceDepartment = {
  id: string
  workspaceId: string
  name: string
  code: string | null
  description: string | null
  isActive: boolean
}

export type WorkspaceCostCentre = {
  id: string
  workspaceId: string
  name: string
  code: string
  description: string | null
  isActive: boolean
}

export type WorkspaceLocation = {
  id: string
  workspaceId: string
  name: string
  type: string
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  isActive: boolean
}

export type WorkspaceCompanyProfile = {
  workspaceId: string
  legalName: string
  registrationNumber: string
  contactEmail: string
  contactPhone: string
  website: string
  address: string
  city: string
  state: string
  country: string
}

export type WorkspaceSecurityPolicy = {
  workspaceId: string
  sessionTimeoutMinutes: number
  requireMfa: boolean
  enforceStrongPasswords: boolean
  inviteExpiryDays: number
  allowedEmailDomains: string[]
  ssoEnabled: boolean
}

export type CustomerAdminMember = {
  userId: string
  email: string
  fullName: string
  role: string
  status: 'active' | 'inactive'
  departmentId: string | null
  departmentName: string | null
  jobTitle: string | null
  joinedAt: string
}

export type WorkspaceLicenseSummary = {
  plan: string
  status: string
  seats: number | null
  activeMembers: number
  availableSeats: number | null
  utilizationPercent: number | null
}

export type CustomerAdministrationData = {
  profile: WorkspaceCompanyProfile
  security: WorkspaceSecurityPolicy
  departments: WorkspaceDepartment[]
  costCentres: WorkspaceCostCentre[]
  locations: WorkspaceLocation[]
  members: CustomerAdminMember[]
  license: WorkspaceLicenseSummary
  pendingInvites: number
}

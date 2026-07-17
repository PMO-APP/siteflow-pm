import { create } from 'zustand'
import type { WorkspaceType } from '@/platform/access'

export type AccessScope = 'workspace' | 'portfolio' | 'project' | null

interface MembershipState {
  role: string | null
  portalRole: string | null
  workspaceType: WorkspaceType | null
  accessScope: AccessScope
  organizationId: number | null
  portfolioId: number | null
  projectId: number | null
  projectIds: number[]

  setMembership: (membership: {
    role: string | null
    portalRole?: string | null
    workspaceType?: WorkspaceType | null
    accessScope: AccessScope
    organizationId?: number | null
    portfolioId?: number | null
    projectId?: number | null
    projectIds?: number[]
  }) => void

  clearMembership: () => void
}

export const useMembershipStore = create<MembershipState>(set => ({
  role: null,
  portalRole: null,
  workspaceType: null,
  accessScope: null,
  organizationId: null,
  portfolioId: null,
  projectId: null,
  projectIds: [],

  setMembership: membership =>
    set({
      role: membership.role,
      portalRole: membership.portalRole ?? null,
      workspaceType: membership.workspaceType ?? null,
      accessScope: membership.accessScope,
      organizationId: membership.organizationId ?? null,
      portfolioId: membership.portfolioId ?? null,
      projectId: membership.projectId ?? null,
      projectIds: membership.projectIds ?? [],
    }),

  clearMembership: () =>
    set({
      role: null,
      portalRole: null,
      workspaceType: null,
      accessScope: null,
      organizationId: null,
      portfolioId: null,
      projectId: null,
      projectIds: [],
    }),
}))

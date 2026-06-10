import { create } from 'zustand'

export type AccessScope = 'workspace' | 'portfolio' | 'project' | null

interface MembershipState {
  role: string | null
  accessScope: AccessScope
  organizationId: number | null
  portfolioId: number | null
  projectId: number | null

  setMembership: (membership: {
    role: string | null
    accessScope: AccessScope
    organizationId?: number | null
    portfolioId?: number | null
    projectId?: number | null
  }) => void

  clearMembership: () => void
}

export const useMembershipStore = create<MembershipState>(set => ({
  role: null,
  accessScope: null,
  organizationId: null,
  portfolioId: null,
  projectId: null,

  setMembership: membership =>
    set({
      role: membership.role,
      accessScope: membership.accessScope,
      organizationId: membership.organizationId ?? null,
      portfolioId: membership.portfolioId ?? null,
      projectId: membership.projectId ?? null,
    }),

  clearMembership: () =>
    set({
      role: null,
      accessScope: null,
      organizationId: null,
      portfolioId: null,
      projectId: null,
    }),
}))

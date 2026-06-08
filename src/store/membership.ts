import { create } from 'zustand'

export type AccessScope = 'workspace' | 'portfolio' | 'project' | null

interface MembershipState {
  role: string | null
  accessScope: AccessScope
  organizationId: number | null
  portfolioId: number | null
  projectId: number | null
  loading: boolean

  setMembership: (membership: {
    role: string | null
    accessScope: AccessScope
    organizationId?: number | null
    portfolioId?: number | null
    projectId?: number | null
  }) => void

  setMembershipLoading: (loading: boolean) => void
  clearMembership: () => void
}

export const useMembershipStore = create<MembershipState>(set => ({
  role: null,
  accessScope: null,
  organizationId: null,
  portfolioId: null,
  projectId: null,
  loading: true,

  setMembership: membership =>
    set({
      role: membership.role,
      accessScope: membership.accessScope,
      organizationId: membership.organizationId ?? null,
      portfolioId: membership.portfolioId ?? null,
      projectId: membership.projectId ?? null,
      loading: false,
    }),

  setMembershipLoading: loading => set({ loading }),

  clearMembership: () =>
    set({
      role: null,
      accessScope: null,
      organizationId: null,
      portfolioId: null,
      projectId: null,
      loading: false,
    }),
}))

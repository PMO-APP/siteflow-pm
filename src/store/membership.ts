import { create } from 'zustand'

interface MembershipState {
  role: string | null
  accessScope: string | null

  setMembership: (
    role: string,
    accessScope: string
  ) => void
}

export const useMembershipStore =
  create<MembershipState>(set => ({
    role: null,
    accessScope: null,

    setMembership: (role, accessScope) =>
      set({
        role,
        accessScope,
      }),
  }))

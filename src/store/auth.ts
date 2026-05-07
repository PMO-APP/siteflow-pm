import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

type AuthUser = {
  id: string
  email?: string
  full_name?: string
  role?: string
  [key: string]: any
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (v: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      loading: false,
    })
  },
}))

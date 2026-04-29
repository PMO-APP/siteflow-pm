import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  loading: boolean
  setUser: (user: Profile | null) => void
  setLoading: (v: boolean) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

 initialize: async () => {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error(error)
    }

    set({
      user: data?.session?.user as any || null,
      loading: false
    })
  } catch (err) {
    console.error(err)

    set({
      user: null,
      loading: false
    })
  }
},

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, loading: false })
  },
}))

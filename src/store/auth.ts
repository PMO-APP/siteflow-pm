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
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) {
        console.error(sessionError)
        set({ user: null, loading: false })
        return
      }

      const authUser = sessionData?.session?.user

      if (!authUser) {
        set({ user: null, loading: false })
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        console.error(profileError)

        set({
          user: {
            id: authUser.id,
            email: authUser.email,
            full_name: 'Admin',
            role: 'admin',
          } as any,
          loading: false,
        })

        return
      }

      set({
        user: {
          ...profile,
          full_name: profile?.full_name || 'Admin',
          role: profile?.role || 'admin',
          email: profile?.email || authUser.email,
        },
        loading: false,
      })
    } catch (err) {
      console.error(err)

      set({
        user: null,
        loading: false,
      })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, loading: false })
  },
}))

import { create } from 'zustand'

type ThemeMode = 'dark' | 'light'

interface ThemeStore {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

export const useThemeStore = create<ThemeStore>(set => ({
  theme: (localStorage.getItem('pmocorex-theme') as ThemeMode) || 'dark',

  setTheme: theme => {
    localStorage.setItem('pmocorex-theme', theme)
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
    set({ theme })
  },
}))

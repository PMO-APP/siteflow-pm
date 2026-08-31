import { useLayoutEffect, type ReactNode } from 'react'
import { useThemeStore } from '@/store/theme'

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore(state => state.theme)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    root.dataset.productTheme = 'pmocorex'
    root.style.colorScheme = theme
  }, [theme])

  return <>{children}</>
}

import { useEffect, type ReactNode } from 'react'
export default function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
    root.dataset.productTheme = 'pmocorex'
  }, [])
  return <>{children}</>
}

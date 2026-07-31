import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'

const TIMEOUT_MS = 30 * 60 * 1000
export default function SessionGuard() {
  const signOut = useAuthStore(state => state.signOut)
  const timer = useRef<number>()
  useEffect(() => {
    const reset = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void signOut(), TIMEOUT_MS)
    }
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    events.forEach(event => window.addEventListener(event, reset, { passive: true }))
    reset()
    return () => { events.forEach(event => window.removeEventListener(event, reset)); window.clearTimeout(timer.current) }
  }, [signOut])
  return null
}

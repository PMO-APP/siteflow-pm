import { useEffect, type ReactNode } from 'react'
import { flushProjectEventOutbox, registerConnectedIntelligenceHandlers } from '@/services/events'

export default function EventInfrastructureProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unregisterHandlers = registerConnectedIntelligenceHandlers()
    const flush = () => {
      void flushProjectEventOutbox()
    }

    flush()
    window.addEventListener('online', flush)
    const timer = window.setInterval(flush, 60_000)

    return () => {
      window.removeEventListener('online', flush)
      window.clearInterval(timer)
      unregisterHandlers()
    }
  }, [])

  return <>{children}</>
}

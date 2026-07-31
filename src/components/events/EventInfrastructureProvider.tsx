import { useEffect, type ReactNode } from 'react'
import { flushProjectEventOutbox } from '@/services/events'

export default function EventInfrastructureProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const flush = () => {
      void flushProjectEventOutbox()
    }

    flush()
    window.addEventListener('online', flush)
    const timer = window.setInterval(flush, 60_000)

    return () => {
      window.removeEventListener('online', flush)
      window.clearInterval(timer)
    }
  }, [])

  return <>{children}</>
}

import { useEffect } from 'react'
import { emitTelemetry, installPerformanceObservers } from './telemetry'

export default function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const dispose = installPerformanceObservers()
    const onError = (event: ErrorEvent) => void emitTelemetry('error', event.message, undefined, { stack: event.error?.stack })
    const onRejection = (event: PromiseRejectionEvent) => void emitTelemetry('error', 'unhandled-rejection', undefined, { reason: String(event.reason) })
    window.addEventListener('error', onError); window.addEventListener('unhandledrejection', onRejection)
    return () => { dispose(); window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [])
  return <>{children}</>
}

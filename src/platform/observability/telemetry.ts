import { supabase } from '@/lib/supabase'

type TelemetryKind = 'error' | 'performance' | 'job' | 'release'
export async function emitTelemetry(kind: TelemetryKind, name: string, value?: number, metadata: Record<string, unknown> = {}) {
  const payload = { kind, name, value: value ?? null, metadata, route: location.pathname, app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0' }
  const { error } = await supabase.from('system_telemetry').insert(payload)
  if (error && import.meta.env.DEV) console.debug('Telemetry persistence unavailable', error.message)
}

export function installPerformanceObservers() {
  if (!('PerformanceObserver' in window)) return () => {}
  const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) void emitTelemetry('performance', entry.name, Math.round(entry.duration), { entryType: entry.entryType })
  })
  try { observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'longtask'] }) } catch { observer.observe({ entryTypes: ['navigation'] }) }
  return () => observer.disconnect()
}

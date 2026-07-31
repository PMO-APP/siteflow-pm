import { supabase } from '@/lib/supabase'

export async function recordSecurityEvent(input: {
  eventType: string
  severity?: 'info' | 'warning' | 'critical'
  projectId?: number | null
  metadata?: Record<string, unknown>
}) {
  const { data } = await supabase.auth.getUser()
  const payload = {
    event_type: input.eventType,
    severity: input.severity ?? 'info',
    user_id: data.user?.id ?? null,
    project_id: input.projectId ?? null,
    metadata: input.metadata ?? {},
    user_agent: navigator.userAgent,
  }
  const { error } = await supabase.from('security_events').insert(payload)
  if (error && import.meta.env.DEV) console.warn('Security event was not persisted', error.message)
}

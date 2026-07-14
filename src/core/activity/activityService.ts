import { supabase } from '@/lib/supabase'

export type ActivityEventInput = {
  projectId?: string | number | null
  organizationId?: string | number | null
  portfolioId?: string | number | null
  eventType: string
  module: string
  title: string
  description?: string | null
  entityType?: string | null
  entityId?: string | number | null
  route?: string | null
  severity?: 'info' | 'success' | 'warning' | 'critical'
  actorId?: string | null
  actorName?: string | null
  metadata?: Record<string, unknown>
}

export async function recordActivity(input: ActivityEventInput) {
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      project_id: input.projectId || null,
      organization_id: input.organizationId || null,
      portfolio_id: input.portfolioId || null,
      event_type: input.eventType,
      module: input.module,
      title: input.title,
      description: input.description || null,
      entity_type: input.entityType || null,
      entity_id: input.entityId == null ? null : String(input.entityId),
      route: input.route || null,
      severity: input.severity || 'info',
      actor_id: input.actorId || null,
      actor_name: input.actorName || null,
      metadata: input.metadata || {},
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

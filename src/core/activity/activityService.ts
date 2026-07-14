import { supabase } from '@/lib/supabase'
import type {
  ActivityEventInput,
} from './activityTypes'

export async function recordActivity(
  input: ActivityEventInput
) {
  const payload = {
    project_id: input.projectId || null,

    organization_id:
      input.organizationId || null,

    portfolio_id:
      input.portfolioId || null,

    event_type: input.eventType,

    module: input.module,

    title: input.title,

    description:
      input.description || null,

    entity_type:
      input.entityType || null,

    entity_id:
      input.entityId !== undefined &&
      input.entityId !== null
        ? String(input.entityId)
        : null,

    route:
      input.route || null,

    severity:
      input.severity || 'info',

    actor_id:
      input.actorId || null,

    actor_name:
      input.actorName || null,

    actor_role:
      input.actorRole || null,

    metadata:
      input.metadata || {},
  }

  const { data, error } = await supabase
    .from('activity_log')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function recordActivitySafely(
  input: ActivityEventInput
): Promise<void> {
  try {
    await recordActivity(input)
  } catch (error) {
    console.error(
      'Failed to record PMOCorex activity:',
      error
    )
  }
}

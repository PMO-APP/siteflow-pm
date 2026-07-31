import { supabase } from '@/lib/supabase'
import { publishProjectEvent } from './eventBus'
import type { PublishProjectEventInput } from './eventTypes'

/**
 * Adds the authenticated actor automatically and provides one entry point for
 * UI/services to publish domain events. Module-specific handlers are added in
 * later Connected Intelligence batches.
 */
export async function dispatchProjectEvent<TPayload extends Record<string, unknown> = Record<string, unknown>>(
  input: PublishProjectEventInput<TPayload>
) {
  let actorId = input.actorId
  if (actorId === undefined) {
    const { data } = await supabase.auth.getUser()
    actorId = data.user?.id ?? null
  }

  return publishProjectEvent({
    ...input,
    actorId,
  })
}

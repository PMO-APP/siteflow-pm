import { supabase } from '@/lib/supabase'
import type { ProjectEvent } from './eventTypes'

const OUTBOX_KEY = 'pmocorex:event-outbox:v1'
const MAX_LOCAL_EVENTS = 250

type PersistedEventRow = {
  id: string
  event_type: string
  occurred_at: string
  published_at: string
  source: string
  priority: string
  project_id: string | number | null
  portfolio_id: string | number | null
  organization_id: string | number | null
  actor_id: string | null
  entity_type: string | null
  entity_id: string | number | null
  correlation_id: string
  causation_id: string | null
  schema_version: number
  payload: Record<string, unknown>
  metadata: Record<string, unknown>
}

function toRow(event: ProjectEvent): PersistedEventRow {
  return {
    id: event.id,
    event_type: event.type,
    occurred_at: event.occurredAt,
    published_at: event.publishedAt,
    source: event.source,
    priority: event.priority,
    project_id: event.projectId ?? null,
    portfolio_id: event.portfolioId ?? null,
    organization_id: event.organizationId ?? null,
    actor_id: event.actorId ?? null,
    entity_type: event.entityType ?? null,
    entity_id: event.entityId ?? null,
    correlation_id: event.correlationId,
    causation_id: event.causationId ?? null,
    schema_version: event.schemaVersion,
    payload: event.payload ?? {},
    metadata: event.metadata ?? {},
  }
}

function readOutbox(): ProjectEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeOutbox(events: ProjectEvent[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(events.slice(-MAX_LOCAL_EVENTS)))
}

function queue(event: ProjectEvent) {
  const current = readOutbox()
  if (!current.some(item => item.id === event.id)) current.push(event)
  writeOutbox(current)
}

export async function persistProjectEvent(event: ProjectEvent): Promise<boolean> {
  try {
    const { error } = await supabase.from('project_events').insert(toRow(event))
    if (error) throw error
    return true
  } catch (error) {
    console.warn('[PMOCorex Events] Persistence deferred:', error)
    queue(event)
    return false
  }
}

export async function flushProjectEventOutbox(): Promise<number> {
  const pending = readOutbox()
  if (!pending.length) return 0

  const delivered = new Set<string>()
  for (const event of pending) {
    try {
      const { error } = await supabase.from('project_events').insert(toRow(event))
      if (!error || error.code === '23505') delivered.add(event.id)
    } catch {
      break
    }
  }

  if (delivered.size) {
    writeOutbox(pending.filter(event => !delivered.has(event.id)))
  }
  return delivered.size
}

export function getProjectEventOutboxSize(): number {
  return readOutbox().length
}

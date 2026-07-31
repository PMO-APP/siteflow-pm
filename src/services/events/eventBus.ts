import { persistProjectEvent } from './eventStore'
import type {
  EventDeliveryFailure,
  EventPublishResult,
  ProjectEvent,
  ProjectEventHandler,
  ProjectEventType,
  PublishProjectEventInput,
} from './eventTypes'

type Subscription = {
  id: string
  name: string
  handler: ProjectEventHandler
}

const subscriptions = new Map<ProjectEventType | '*', Map<string, Subscription>>()

function createId(prefix = 'evt'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function createEvent<TPayload extends Record<string, unknown>>(input: PublishProjectEventInput<TPayload>): ProjectEvent<TPayload> {
  const now = new Date().toISOString()
  return {
    id: createId(),
    type: input.type,
    occurredAt: input.occurredAt ?? now,
    publishedAt: now,
    source: input.source ?? 'service',
    priority: input.priority ?? 'normal',
    projectId: input.projectId ?? null,
    portfolioId: input.portfolioId ?? null,
    organizationId: input.organizationId ?? null,
    actorId: input.actorId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    correlationId: input.correlationId ?? createId('corr'),
    causationId: input.causationId ?? null,
    schemaVersion: 1,
    payload: (input.payload ?? {}) as TPayload,
    metadata: input.metadata ?? {},
  }
}

function handlersFor(type: ProjectEventType): Subscription[] {
  return [
    ...Array.from(subscriptions.get(type)?.values() ?? []),
    ...Array.from(subscriptions.get('*')?.values() ?? []),
  ]
}

export function subscribeProjectEvent<TPayload = Record<string, unknown>>(
  type: ProjectEventType | '*',
  handler: ProjectEventHandler<TPayload>,
  options?: { name?: string }
): () => void {
  const id = createId('sub')
  const bucket = subscriptions.get(type) ?? new Map<string, Subscription>()
  bucket.set(id, {
    id,
    name: options?.name ?? handler.name ?? `handler:${type}`,
    handler: handler as ProjectEventHandler,
  })
  subscriptions.set(type, bucket)

  return () => {
    const current = subscriptions.get(type)
    current?.delete(id)
    if (current?.size === 0) subscriptions.delete(type)
  }
}

export async function publishProjectEvent<TPayload extends Record<string, unknown> = Record<string, unknown>>(
  input: PublishProjectEventInput<TPayload>
): Promise<EventPublishResult> {
  const event = createEvent(input)
  const failures: EventDeliveryFailure[] = []
  let deliveredHandlers = 0

  for (const subscription of handlersFor(event.type)) {
    try {
      await subscription.handler(event)
      deliveredHandlers += 1
    } catch (error) {
      failures.push({
        eventId: event.id,
        handlerName: subscription.name,
        message: error instanceof Error ? error.message : String(error),
        occurredAt: new Date().toISOString(),
      })
      console.error(`[PMOCorex Events] ${subscription.name} failed`, error)
    }
  }

  const persisted = input.persist === false ? false : await persistProjectEvent(event)
  return { event, deliveredHandlers, failures, persisted }
}

export async function publishProjectEvents(
  inputs: PublishProjectEventInput[]
): Promise<EventPublishResult[]> {
  const results: EventPublishResult[] = []
  for (const input of inputs) results.push(await publishProjectEvent(input))
  return results
}

export function getProjectEventSubscriptionCount(type?: ProjectEventType | '*'): number {
  if (type) return subscriptions.get(type)?.size ?? 0
  return Array.from(subscriptions.values()).reduce((sum, bucket) => sum + bucket.size, 0)
}

export function clearProjectEventSubscriptions(): void {
  subscriptions.clear()
}

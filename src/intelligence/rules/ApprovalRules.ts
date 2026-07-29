import type { IntelligenceEvent } from '../models/IntelligenceEvent'

export function approvalRules(events: IntelligenceEvent[], now = new Date()) {
  return events.filter(event => event.source === 'approval' && event.status === 'open').map(event => ({
    ruleId: 'approval-overdue',
    eventId: event.id,
    triggered: Boolean(event.dueDate && new Date(event.dueDate) < now),
    reason: event.dueDate ? `${event.title} has a decision deadline of ${event.dueDate}.` : `${event.title} has no decision deadline.`,
  }))
}

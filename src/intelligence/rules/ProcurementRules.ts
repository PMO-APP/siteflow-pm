import type { IntelligenceEvent } from '../models/IntelligenceEvent'

export function procurementRules(events: IntelligenceEvent[], now = new Date()) {
  return events.filter(event => event.source === 'procurement' && event.status === 'open').map(event => ({
    ruleId: 'procurement-overdue',
    eventId: event.id,
    triggered: Boolean(event.dueDate && new Date(event.dueDate) < now),
    reason: event.dueDate ? `${event.title} has a required date of ${event.dueDate}.` : `${event.title} has no required date.`,
  }))
}

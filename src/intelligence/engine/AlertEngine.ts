import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { IntelligenceAlert } from '../models/Recommendation'

export function generateAlerts(events: IntelligenceEvent[], now = new Date()): IntelligenceAlert[] {
  return events
    .filter(event => event.status === 'open')
    .filter(event => event.severity === 'critical' || (event.dueDate && new Date(event.dueDate) < now))
    .map(event => {
      const overdue = event.dueDate && new Date(event.dueDate) < now
      return {
        id: `alert-${event.id}`,
        title: overdue ? `Overdue: ${event.title}` : `Critical: ${event.title}`,
        message: event.description || `${event.title} requires immediate management attention.`,
        severity: event.severity === 'critical' ? 'critical' : 'warning',
        relatedEventIds: [event.id],
        recommendedAction: 'Assign an owner, agree a deadline, and confirm the impact on dependent work.',
      }
    })
}

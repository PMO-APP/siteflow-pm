import type { IntelligenceEvent } from '../models/IntelligenceEvent'

export function scheduleRules(events: IntelligenceEvent[]) {
  return events.filter(event => event.source === 'schedule' && event.status === 'open').map(event => ({
    ruleId: 'schedule-open-constraint',
    eventId: event.id,
    triggered: ['high', 'critical'].includes(event.severity),
    reason: `${event.title} is an open ${event.severity} schedule constraint.`,
  }))
}

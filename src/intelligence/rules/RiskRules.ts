import type { IntelligenceEvent } from '../models/IntelligenceEvent'

export function riskRules(events: IntelligenceEvent[]) {
  return events.filter(event => event.source === 'risk' && event.status === 'open').map(event => ({
    ruleId: 'risk-escalation',
    eventId: event.id,
    triggered: ['high', 'critical'].includes(event.severity),
    reason: `${event.title} is rated ${event.severity}.`,
  }))
}

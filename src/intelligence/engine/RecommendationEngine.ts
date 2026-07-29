import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { Recommendation } from '../models/Recommendation'

const ACTIONS: Partial<Record<IntelligenceEvent['source'], string>> = {
  schedule: 'Agree and resource a recovery programme for the affected activities.',
  approval: 'Escalate the outstanding review and confirm a decision deadline.',
  procurement: 'Expedite the item, confirm logistics, and assess an approved alternative.',
  risk: 'Assign an owner and execute the highest-value mitigation action.',
  quality: 'Close the failed quality gate before dependent work proceeds.',
  snag: 'Deploy the responsible trade and verify closure against the agreed standard.',
  hse: 'Stop or control the unsafe condition and verify corrective action.',
  finance: 'Confirm funding availability and resolve the commercial constraint.',
  rfi: 'Escalate the response and protect the dependent activity from further delay.',
}

export function generateRecommendations(events: IntelligenceEvent[]): Recommendation[] {
  return events
    .filter(event => event.status === 'open' && ['medium', 'high', 'critical'].includes(event.severity))
    .sort((a, b) => {
      const order = { low: 0, medium: 1, high: 2, critical: 3 }
      return order[b.severity] - order[a.severity]
    })
    .slice(0, 8)
    .map((event, index) => ({
      id: `recommendation-${event.id}`,
      title: `Resolve ${event.title}`,
      action: ACTIONS[event.source] || 'Assign an accountable owner and define a dated close-out action.',
      rationale: event.description || `${event.title} is an open ${event.severity} ${event.source} constraint.`,
      expectedRecoveryDays: event.severity === 'critical' ? 10 : event.severity === 'high' ? 6 : 3,
      confidence: Math.max(55, 90 - index * 4),
      estimatedCost: event.source === 'schedule' || event.source === 'procurement' ? 'medium' : 'low',
      relatedEventIds: [event.id],
      priority: event.severity,
    }))
}

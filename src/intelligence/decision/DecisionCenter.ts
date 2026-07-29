import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { Recommendation } from '../models/Recommendation'
import type { IntelligenceAlert } from '../models/Recommendation'

export type DecisionUrgency = 'today' | 'this_week' | 'monitor'

export interface ProjectDecision {
  id: string
  title: string
  action: string
  rationale: string
  impactScore: number
  urgency: DecisionUrgency
  deadline?: string
  owner?: string
  confidence: number
  recoveryDays: number
  source: IntelligenceEvent['source'] | 'recommendation'
  relatedEventIds: string[]
}

const severityImpact: Record<IntelligenceEvent['severity'], number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 95,
}

function daysUntil(value?: string, now = new Date()) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
}

function eventAction(event: IntelligenceEvent) {
  switch (event.source) {
    case 'approval': return `Secure approval for ${event.title}`
    case 'procurement': return `Resolve procurement constraint: ${event.title}`
    case 'schedule': return `Agree and implement a recovery action for ${event.title}`
    case 'risk': return `Confirm mitigation and owner for ${event.title}`
    case 'quality':
    case 'snag': return `Close quality constraint: ${event.title}`
    case 'hse': return `Escalate and close the HSE action for ${event.title}`
    case 'finance': return `Resolve the commercial decision for ${event.title}`
    default: return `Review and close ${event.title}`
  }
}

export function buildDecisionCenter(
  events: IntelligenceEvent[],
  recommendations: Recommendation[],
  alerts: IntelligenceAlert[],
  now = new Date(),
): ProjectDecision[] {
  const alertEventIds = new Set(alerts.flatMap(alert => alert.relatedEventIds))
  const eventDecisions = events
    .filter(event => event.status === 'open' && (event.severity === 'high' || event.severity === 'critical'))
    .map(event => {
      const dueIn = daysUntil(event.dueDate, now)
      const linkedImpact = (event.links?.filter(link => link.type === 'blocks').length || 0) * 7
      const alertBoost = alertEventIds.has(event.id) ? 8 : 0
      const overdueBoost = dueIn !== null && dueIn < 0 ? Math.min(15, Math.abs(dueIn)) : 0
      const impactScore = Math.min(100, severityImpact[event.severity] + linkedImpact + alertBoost + overdueBoost)
      const urgency: DecisionUrgency = impactScore >= 88 || (dueIn !== null && dueIn <= 1)
        ? 'today'
        : impactScore >= 68 || (dueIn !== null && dueIn <= 7)
        ? 'this_week'
        : 'monitor'
      const owner = typeof event.metadata?.owner === 'string'
        ? event.metadata.owner
        : typeof event.metadata?.vendor === 'string'
        ? event.metadata.vendor
        : undefined

      return {
        id: `decision:${event.id}`,
        title: event.title,
        action: eventAction(event),
        rationale: event.description || `${event.source} evidence requires management attention.`,
        impactScore,
        urgency,
        deadline: event.dueDate,
        owner,
        confidence: event.links?.length ? 88 : 74,
        recoveryDays: Math.max(0, Math.round(impactScore / 18)),
        source: event.source,
        relatedEventIds: [event.id],
      } satisfies ProjectDecision
    })

  const recommendationDecisions = recommendations
    .filter(item => item.priority === 'critical' || item.priority === 'high')
    .map(item => ({
      id: `decision:${item.id}`,
      title: item.title,
      action: item.action,
      rationale: item.rationale,
      impactScore: Math.min(100, (item.priority === 'critical' ? 90 : 74) + Math.min(10, item.expectedRecoveryDays)),
      urgency: item.priority === 'critical' ? 'today' as const : 'this_week' as const,
      confidence: item.confidence,
      recoveryDays: item.expectedRecoveryDays,
      source: 'recommendation' as const,
      relatedEventIds: item.relatedEventIds,
    }))

  return [...eventDecisions, ...recommendationDecisions]
    .sort((a, b) => b.impactScore - a.impactScore || b.confidence - a.confidence)
    .filter((item, index, list) => list.findIndex(other => other.action.toLowerCase() === item.action.toLowerCase()) === index)
    .slice(0, 7)
}

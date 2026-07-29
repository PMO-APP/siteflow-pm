import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { EscalationPrediction } from './EscalationPredictor'

export type EarlyWarningType = 'escalation' | 'schedule' | 'approval' | 'procurement' | 'risk' | 'governance' | 'quality'

export interface EarlyWarning {
  id: string
  type: EarlyWarningType
  title: string
  description: string
  probability: number
  impact: 'medium' | 'high' | 'critical'
  urgency: 'now' | 'seven_days' | 'fourteen_days'
  recommendedAction: string
  relatedEventIds: string[]
  priorityScore: number
}

function warningForEvent(event: IntelligenceEvent): EarlyWarning | null {
  if (event.status !== 'open' || !['high', 'critical'].includes(event.severity)) return null
  const blocked = event.links?.filter(link => link.type === 'blocks').length || 0
  const probability = Math.min(96, (event.severity === 'critical' ? 82 : 65) + blocked * 5)
  const type: EarlyWarningType = ['schedule', 'approval', 'procurement', 'risk', 'quality'].includes(event.source)
    ? event.source as EarlyWarningType
    : 'schedule'
  const action = event.source === 'approval'
    ? 'Escalate the approval owner and agree a firm response date.'
    : event.source === 'procurement'
    ? 'Confirm expediting action, accountable owner and revised delivery date.'
    : event.source === 'risk'
    ? 'Implement the agreed mitigation and verify residual exposure.'
    : event.source === 'quality'
    ? 'Close the failed quality gate before successor work continues.'
    : 'Agree a recovery action and protect affected successor activities.'

  return {
    id: `warning:${event.id}`,
    type,
    title: event.title,
    description: event.description || `${event.source} exposure may affect delivery performance.`,
    probability,
    impact: event.severity === 'critical' ? 'critical' : blocked > 0 ? 'high' : 'medium',
    urgency: event.severity === 'critical' ? 'now' : 'seven_days',
    recommendedAction: action,
    relatedEventIds: [event.id],
    priorityScore: Math.min(100, probability + blocked * 4),
  }
}

export function generateEarlyWarnings(events: IntelligenceEvent[], escalation: EscalationPrediction): EarlyWarning[] {
  const warnings = events.map(warningForEvent).filter((item): item is EarlyWarning => Boolean(item))
  if (escalation.probability >= 42) {
    warnings.push({
      id: 'warning:project-escalation',
      type: 'escalation',
      title: `Project deterioration risk: ${escalation.probability}%`,
      description: escalation.explanation,
      probability: escalation.probability,
      impact: escalation.probability >= 72 ? 'critical' : 'high',
      urgency: escalation.probability >= 72 ? 'now' : 'fourteen_days',
      recommendedAction: 'Review the top decision queue and approve the highest-impact recovery action.',
      relatedEventIds: [],
      priorityScore: escalation.probability,
    })
  }
  return warnings.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 8)
}

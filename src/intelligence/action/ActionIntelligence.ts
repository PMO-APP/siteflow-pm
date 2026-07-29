import type { IntelligenceEvent, IntelligenceSource } from '../models/IntelligenceEvent'
import type { ProjectDecision } from '../decision/DecisionCenter'
import type { EarlyWarning } from '../warning/EarlyWarningEngine'
import type { MeetingAction } from '../meeting/MeetingIntelligence'

export type ActionStatus = 'overdue' | 'due_today' | 'due_soon' | 'planned' | 'completed'
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

export interface IntelligentAction {
  id: string
  title: string
  rationale: string
  owner: string
  dueDate?: string
  status: ActionStatus
  priority: ActionPriority
  source?: IntelligenceSource
  confidence: number
  impactScore: number
  recoveryDays: number
  evidence: string[]
  relatedEventIds: string[]
}

export interface DecisionTimelineEntry {
  id: string
  date: string
  title: string
  description: string
  kind: 'decision' | 'warning' | 'closure' | 'milestone'
  source?: IntelligenceSource
  outcome: 'positive' | 'neutral' | 'negative'
}

export interface ActionIntelligenceResult {
  actions: IntelligentAction[]
  timeline: DecisionTimelineEntry[]
  overdueCount: number
  dueSoonCount: number
  completionRate: number
  controlScore: number
  executiveSummary: string
}

const DAY = 86_400_000

function validDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function actionStatus(dueDate: string | undefined, completed: boolean, now: Date): ActionStatus {
  if (completed) return 'completed'
  const due = validDate(dueDate)
  if (!due) return 'planned'
  const days = Math.ceil((due.getTime() - now.getTime()) / DAY)
  if (days < 0) return 'overdue'
  if (days === 0) return 'due_today'
  if (days <= 7) return 'due_soon'
  return 'planned'
}

function priorityFromImpact(impact: number): ActionPriority {
  if (impact >= 88) return 'critical'
  if (impact >= 70) return 'high'
  if (impact >= 48) return 'medium'
  return 'low'
}

function ownerFromEvent(event?: IntelligenceEvent) {
  const value = event?.metadata?.owner ?? event?.metadata?.assignee ?? event?.metadata?.vendor
  return typeof value === 'string' && value.trim() ? value : 'Project team'
}

export function buildActionIntelligence(
  events: IntelligenceEvent[],
  decisions: ProjectDecision[],
  warnings: EarlyWarning[],
  meetingActions: MeetingAction[],
  now = new Date(),
): ActionIntelligenceResult {
  const eventById = new Map(events.map(event => [event.id, event]))
  const actions = new Map<string, IntelligentAction>()

  decisions.forEach(decision => {
    const event = decision.relatedEventIds.map(id => eventById.get(id)).find(Boolean)
    const id = `decision:${decision.id}`
    actions.set(id, {
      id,
      title: decision.action,
      rationale: decision.rationale,
      owner: decision.owner || ownerFromEvent(event),
      dueDate: decision.deadline,
      status: actionStatus(decision.deadline, false, now),
      priority: priorityFromImpact(decision.impactScore),
      source: decision.source === 'recommendation' ? undefined : decision.source,
      confidence: decision.confidence,
      impactScore: decision.impactScore,
      recoveryDays: decision.recoveryDays,
      evidence: [
        `Impact score ${decision.impactScore}/100`,
        `Confidence ${decision.confidence}%`,
        decision.recoveryDays > 0 ? `Potential recovery ${decision.recoveryDays} days` : 'Control action required',
      ],
      relatedEventIds: decision.relatedEventIds,
    })
  })

  warnings.forEach(warning => {
    const event = warning.relatedEventIds.map(id => eventById.get(id)).find(Boolean)
    const id = `warning:${warning.id}`
    if (actions.has(id)) return
    const impact = warning.impact === 'critical' ? 94 : warning.impact === 'high' ? 78 : 58
    actions.set(id, {
      id,
      title: warning.recommendedAction,
      rationale: warning.description,
      owner: ownerFromEvent(event),
      dueDate: event?.dueDate,
      status: actionStatus(event?.dueDate, false, now),
      priority: priorityFromImpact(impact),
      source: event?.source,
      confidence: warning.probability,
      impactScore: impact,
      recoveryDays: 0,
      evidence: [`${warning.probability}% probability`, `${warning.impact} impact`, warning.title],
      relatedEventIds: warning.relatedEventIds,
    })
  })

  meetingActions.forEach((item, index) => {
    const id = `meeting:${index}:${item.action}`
    if ([...actions.values()].some(action => action.title.toLowerCase() === item.action.toLowerCase())) return
    actions.set(id, {
      id,
      title: item.action,
      rationale: 'Follow-up action generated from the latest project review intelligence.',
      owner: item.owner,
      dueDate: item.deadline,
      status: actionStatus(item.deadline, false, now),
      priority: item.confidence >= 85 ? 'high' : 'medium',
      source: item.source,
      confidence: item.confidence,
      impactScore: item.confidence,
      recoveryDays: 0,
      evidence: [`Generated from project review`, `Confidence ${item.confidence}%`],
      relatedEventIds: [],
    })
  })

  const ranked = [...actions.values()].sort((a, b) => {
    const statusWeight: Record<ActionStatus, number> = { overdue: 5, due_today: 4, due_soon: 3, planned: 2, completed: 0 }
    return (statusWeight[b.status] - statusWeight[a.status]) || (b.impactScore - a.impactScore)
  }).slice(0, 12)

  const timeline: DecisionTimelineEntry[] = events
    .filter(event => event.status === 'closed' || event.severity === 'critical' || event.severity === 'high')
    .map((event): DecisionTimelineEntry => ({
      id: `event:${event.id}`,
      date: event.occurredAt || event.createdAt,
      title: event.title,
      description: event.description || `${event.source} control event`,
      kind: event.status === 'closed' ? 'closure' : event.source === 'schedule' ? 'milestone' : 'warning',
      source: event.source,
      outcome: event.status === 'closed' ? 'positive' : 'negative',
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const overdueCount = ranked.filter(action => action.status === 'overdue').length
  const dueSoonCount = ranked.filter(action => action.status === 'due_today' || action.status === 'due_soon').length
  const completedEvents = events.filter(event => event.status === 'closed').length
  const completionRate = events.length ? Math.round((completedEvents / events.length) * 100) : 100
  const controlScore = Math.max(0, Math.min(100, Math.round(100 - overdueCount * 12 - dueSoonCount * 4 + completionRate * 0.15)))
  const executiveSummary = overdueCount
    ? `${overdueCount} management action${overdueCount === 1 ? ' is' : 's are'} overdue. Immediate ownership confirmation and closure dates are required.`
    : dueSoonCount
      ? `${dueSoonCount} priority action${dueSoonCount === 1 ? ' is' : 's are'} due within seven days. Delivery remains controllable if these actions are closed on time.`
      : 'No immediate action-control exception is open. Continue routine follow-up and evidence-based closure.'

  return { actions: ranked, timeline, overdueCount, dueSoonCount, completionRate, controlScore, executiveSummary }
}

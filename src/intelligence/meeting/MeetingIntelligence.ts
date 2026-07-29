import type { IntelligenceEvent, IntelligenceSource } from '../models/IntelligenceEvent'
import type { ProjectDecision } from '../decision/DecisionCenter'
import type { EarlyWarning } from '../warning/EarlyWarningEngine'
import type { ProjectTimelineStory } from '../timeline/TimelineStory'
import type { ProjectHealth } from '../models/ProjectHealth'
import type { ForecastResult } from '../models/Forecast'

export interface MeetingAgendaItem {
  id: string
  title: string
  purpose: string
  source?: IntelligenceSource
  priority: 'critical' | 'high' | 'normal'
  evidence: string[]
  owner?: string
  dueDate?: string
}

export interface MeetingAction {
  id: string
  action: string
  owner: string
  deadline: string
  source?: IntelligenceSource
  confidence: number
}

export interface ProjectReviewBrief {
  meetingTitle: string
  openingStatement: string
  sinceLastReview: string[]
  agenda: MeetingAgendaItem[]
  decisionsRequired: MeetingAgendaItem[]
  discussionPoints: MeetingAgendaItem[]
  followUpActions: MeetingAction[]
  closingOutlook: string
  readinessScore: number
  generatedAt: string
}

function eventDate(event: IntelligenceEvent) {
  return new Date(event.occurredAt || event.createdAt)
}

function isRecent(event: IntelligenceEvent, now: Date, days = 7) {
  const date = eventDate(event)
  return !Number.isNaN(date.getTime()) && now.getTime() - date.getTime() <= days * 86_400_000
}

function ownerFromEvent(event?: IntelligenceEvent) {
  if (!event) return undefined
  const value = event.metadata?.owner ?? event.metadata?.assignee ?? event.metadata?.vendor
  return typeof value === 'string' && value.trim() ? value : undefined
}

function formatDueDate(value?: string) {
  if (!value) return 'Before next review'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Before next review'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function buildSinceLastReview(events: IntelligenceEvent[], health: ProjectHealth, forecast: ForecastResult, now: Date) {
  const recent = events.filter(event => isRecent(event, now))
  const completed = recent.filter(event => event.status === 'closed')
  const opened = recent.filter(event => event.status === 'open')
  const criticalOpened = opened.filter(event => event.severity === 'critical' || event.severity === 'high')
  const lines: string[] = []

  if (completed.length) lines.push(`${completed.length} control item${completed.length === 1 ? '' : 's'} closed since the last review.`)
  if (opened.length) lines.push(`${opened.length} new or updated open item${opened.length === 1 ? '' : 's'} recorded.`)
  if (criticalOpened.length) lines.push(`${criticalOpened.length} high-priority exposure${criticalOpened.length === 1 ? '' : 's'} now require management attention.`)
  lines.push(`Overall project health is ${health.overallScore}% (${health.overallBand}).`)
  lines.push(forecast.forecastDelayDays > 0 ? `Forecast completion is currently ${forecast.forecastDelayDays} day${forecast.forecastDelayDays === 1 ? '' : 's'} behind plan.` : 'Forecast completion remains within the current planned position.')
  return lines
}

export function buildProjectReviewBrief(
  projectName: string,
  events: IntelligenceEvent[],
  health: ProjectHealth,
  forecast: ForecastResult,
  decisions: ProjectDecision[],
  warnings: EarlyWarning[],
  timeline: ProjectTimelineStory,
  now = new Date(),
): ProjectReviewBrief {
  const eventById = new Map(events.map(event => [event.id, event]))
  const decisionItems: MeetingAgendaItem[] = decisions.slice(0, 5).map(decision => {
    const event = decision.relatedEventIds.map(id => eventById.get(id)).find(Boolean)
    return {
      id: decision.id,
      title: decision.action,
      purpose: decision.rationale,
      source: decision.source === 'recommendation' ? undefined : decision.source,
      priority: decision.impactScore >= 88 ? 'critical' : decision.impactScore >= 68 ? 'high' : 'normal',
      evidence: [
        `Impact score: ${decision.impactScore}/100`,
        `Confidence: ${decision.confidence}%`,
        decision.recoveryDays > 0 ? `Potential recovery: ${decision.recoveryDays} days` : 'Control action required',
      ],
      owner: decision.owner || ownerFromEvent(event),
      dueDate: decision.deadline,
    }
  })

  const warningItems: MeetingAgendaItem[] = warnings.slice(0, 4).map(warning => {
    const event = warning.relatedEventIds.map(id => eventById.get(id)).find(Boolean)
    return {
      id: warning.id,
      title: warning.title,
      purpose: warning.description,
      source: event?.source,
      priority: warning.impact === 'critical' ? 'critical' : warning.impact === 'high' ? 'high' : 'normal',
      evidence: [`Probability: ${warning.probability}%`, `Urgency: ${warning.urgency.replace('_', ' ')}`, warning.recommendedAction],
      owner: ownerFromEvent(event),
      dueDate: event?.dueDate,
    }
  })

  const timelineItems: MeetingAgendaItem[] = [
    ...timeline.currentCritical.slice(0, 2).map(item => ({
      id: `timeline-current:${item.id}`,
      title: item.title,
      purpose: 'Confirm current delivery status, blockers and accountable owner.',
      source: item.source,
      priority: 'high' as const,
      evidence: item.date ? [`Target: ${formatDueDate(item.date)}`] : ['Current critical work'],
      dueDate: item.date,
    })),
    ...timeline.nextMilestones.slice(0, 2).map(item => ({
      id: `timeline-next:${item.id}`,
      title: item.title,
      purpose: 'Confirm readiness and prerequisites for the next milestone.',
      source: item.source,
      priority: 'normal' as const,
      evidence: item.date ? [`Planned: ${formatDueDate(item.date)}`] : ['Upcoming milestone'],
      dueDate: item.date,
    })),
  ]

  const combined = [...decisionItems, ...warningItems, ...timelineItems]
    .filter((item, index, list) => list.findIndex(other => other.title.toLowerCase() === item.title.toLowerCase()) === index)

  const followUpActions: MeetingAction[] = decisionItems.slice(0, 5).map((item, index) => ({
    id: `meeting-action:${index}:${item.id}`,
    action: item.title,
    owner: item.owner || 'Project owner',
    deadline: formatDueDate(item.dueDate),
    source: item.source,
    confidence: decisions[index]?.confidence || 75,
  }))

  const readinessScore = Math.max(0, Math.min(100,
    100
    - Math.min(35, warnings.filter(item => item.impact === 'critical').length * 14)
    - Math.min(25, decisions.filter(item => item.urgency === 'today').length * 8)
    - Math.min(20, forecast.forecastDelayDays * 2)
    + Math.round(health.overallScore * 0.15),
  ))

  return {
    meetingTitle: `${projectName} Project Review`,
    openingStatement: `${projectName} is currently ${health.overallBand} at ${health.overallScore}% health. ${forecast.forecastDelayDays > 0 ? `The forecast indicates ${forecast.forecastDelayDays} days of delay and the meeting should focus on decisions that protect the completion date.` : 'The forecast remains controlled, with the review focused on protecting current momentum and closing emerging constraints.'}`,
    sinceLastReview: buildSinceLastReview(events, health, forecast, now),
    agenda: combined.slice(0, 9),
    decisionsRequired: decisionItems.filter(item => item.priority !== 'normal').slice(0, 5),
    discussionPoints: warningItems.slice(0, 4),
    followUpActions,
    closingOutlook: readinessScore >= 80
      ? 'The project is ready for a focused review. Current controls provide a credible basis for maintaining or recovering the delivery position.'
      : readinessScore >= 60
      ? 'The review should close the highest-impact decisions and assign firm owners before the next reporting cycle.'
      : 'Executive intervention is required. The meeting should not close without agreed recovery actions, named owners and committed deadlines.',
    readinessScore,
    generatedAt: now.toISOString(),
  }
}

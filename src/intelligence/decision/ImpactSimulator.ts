import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { ForecastResult } from '../models/Forecast'

export type SimulationType =
  | 'approval_slip'
  | 'procurement_slip'
  | 'additional_crew'
  | 'weekend_work'
  | 'parallel_work'

export interface ImpactSimulationRequest {
  type: SimulationType
  days?: number
  eventId?: string
}

export interface ImpactSimulationResult {
  id: string
  type: SimulationType
  title: string
  description: string
  scheduleImpactDays: number
  forecastDelayDays: number
  forecastFinish?: string
  confidence: number
  costImpact: 'none' | 'low' | 'medium' | 'high'
  operationalImpact: string
  affectedEventIds: string[]
  dependencyPath: string[]
  recommendation: string
}

const DAY = 86_400_000

function shiftDate(value: string | undefined, days: number) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  date.setTime(date.getTime() + days * DAY)
  return date.toISOString()
}

function openEvents(events: IntelligenceEvent[], source?: IntelligenceEvent['source']) {
  return events.filter(event => event.status === 'open' && (!source || event.source === source))
}

function linkedEvents(seed: IntelligenceEvent | undefined, events: IntelligenceEvent[]) {
  if (!seed) return []
  const ids = new Set<string>([seed.id])
  let changed = true
  while (changed) {
    changed = false
    for (const event of events) {
      const touches = event.links?.some(link => ids.has(link.targetId)) || false
      const referenced = seed.links?.some(link => link.targetId === event.id) || false
      if ((touches || referenced) && !ids.has(event.id)) {
        ids.add(event.id)
        changed = true
      }
    }
  }
  return events.filter(event => ids.has(event.id))
}

function selectConstraint(events: IntelligenceEvent[], request: ImpactSimulationRequest) {
  if (request.eventId) return events.find(event => event.id === request.eventId)
  const source = request.type === 'approval_slip'
    ? 'approval'
    : request.type === 'procurement_slip'
    ? 'procurement'
    : 'schedule'
  return openEvents(events, source).sort((a, b) => {
    const rank = { critical: 4, high: 3, medium: 2, low: 1 }
    return rank[b.severity] - rank[a.severity]
  })[0]
}

function impactFactor(event: IntelligenceEvent | undefined, related: IntelligenceEvent[]) {
  const severity = event ? { low: 0.25, medium: 0.45, high: 0.7, critical: 0.9 }[event.severity] : 0.5
  const blocked = related.filter(item => item.source === 'schedule').length
  return Math.min(1, severity + Math.min(0.25, blocked * 0.05))
}

export function simulateProjectImpact(
  events: IntelligenceEvent[],
  forecast: ForecastResult,
  request: ImpactSimulationRequest,
): ImpactSimulationResult {
  const requestedDays = Math.max(1, Math.round(request.days || 5))
  const constraint = selectConstraint(events, request)
  const related = linkedEvents(constraint, events)
  const factor = impactFactor(constraint, related)
  const affectedIds = related.length ? related.map(event => event.id) : constraint ? [constraint.id] : []
  const path = related
    .sort((a, b) => (a.source === 'approval' ? -1 : b.source === 'schedule' ? -1 : 0))
    .map(event => event.title)
    .slice(0, 6)

  let scheduleImpactDays = 0
  let title = ''
  let description = ''
  let costImpact: ImpactSimulationResult['costImpact'] = 'none'
  let operationalImpact = ''
  let recommendation = ''
  let confidence = constraint ? 86 : 68

  switch (request.type) {
    case 'approval_slip':
      scheduleImpactDays = Math.max(1, Math.round(requestedDays * factor))
      title = `Approval slips by ${requestedDays} days`
      description = `${constraint?.title || 'The selected approval'} remains unresolved for another ${requestedDays} days.`
      operationalImpact = 'Dependent design, procurement and site activities may lose available float.'
      recommendation = 'Escalate the approval owner and agree a fixed decision date before dependent work is released.'
      break
    case 'procurement_slip':
      scheduleImpactDays = Math.max(1, Math.round(requestedDays * Math.min(1, factor + 0.08)))
      title = `Procurement slips by ${requestedDays} days`
      description = `${constraint?.title || 'The selected procurement item'} arrives ${requestedDays} days later than currently expected.`
      operationalImpact = 'Installation sequencing and downstream trades may be disrupted.'
      recommendation = 'Confirm an expediting plan, approved substitute or resequencing option immediately.'
      break
    case 'additional_crew':
      scheduleImpactDays = -Math.max(1, Math.round(requestedDays * 0.65 * factor))
      title = 'Add an additional delivery crew'
      description = `An additional crew is deployed to ${constraint?.title || 'the leading delayed activity'}.`
      costImpact = 'medium'
      operationalImpact = 'Higher coordination and supervision demand with limited disruption to other trades.'
      recommendation = 'Confirm workface availability, supervision and material readiness before adding labour.'
      confidence = constraint ? 88 : 70
      break
    case 'weekend_work':
      scheduleImpactDays = -Math.max(1, Math.round(requestedDays * 0.45 * factor))
      title = 'Introduce weekend working'
      description = `Weekend shifts are introduced for ${requestedDays} working days of targeted acceleration.`
      costImpact = 'medium'
      operationalImpact = 'Overtime cost, fatigue and HSE controls require active management.'
      recommendation = 'Use weekend working only on critical, fully released activities with clear output targets.'
      confidence = constraint ? 78 : 64
      break
    case 'parallel_work':
      scheduleImpactDays = -Math.max(1, Math.round(requestedDays * 0.75 * factor))
      title = 'Execute compatible activities in parallel'
      description = `Selected downstream work starts in parallel where interfaces and access permit.`
      costImpact = 'low'
      operationalImpact = 'Requires tighter coordination, interface control and daily planning.'
      recommendation = 'Validate technical dependencies and approve a coordinated look-ahead plan before resequencing.'
      confidence = related.length > 1 ? 84 : 66
      break
  }

  const forecastDelayDays = Math.max(0, forecast.forecastDelayDays + scheduleImpactDays)

  return {
    id: `simulation:${request.type}:${constraint?.id || 'project'}:${requestedDays}`,
    type: request.type,
    title,
    description,
    scheduleImpactDays,
    forecastDelayDays,
    forecastFinish: shiftDate(forecast.forecastFinish, scheduleImpactDays),
    confidence,
    costImpact,
    operationalImpact,
    affectedEventIds: affectedIds,
    dependencyPath: path.length ? path : [constraint?.title || 'Project forecast'],
    recommendation,
  }
}

export function buildDefaultImpactScenarios(events: IntelligenceEvent[], forecast: ForecastResult) {
  return [
    simulateProjectImpact(events, forecast, { type: 'approval_slip', days: 5 }),
    simulateProjectImpact(events, forecast, { type: 'procurement_slip', days: 7 }),
    simulateProjectImpact(events, forecast, { type: 'additional_crew', days: 10 }),
    simulateProjectImpact(events, forecast, { type: 'weekend_work', days: 8 }),
    simulateProjectImpact(events, forecast, { type: 'parallel_work', days: 10 }),
  ]
}

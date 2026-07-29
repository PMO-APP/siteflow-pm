import type { IntelligenceEvent } from '../models/IntelligenceEvent'

export type TimelineStage = 'recently_completed' | 'current_critical' | 'next_milestone' | 'decision_point' | 'recovery_opportunity'

export interface TimelineItem {
  id: string
  stage: TimelineStage
  title: string
  date?: string
  source: IntelligenceEvent['source']
  progress?: number
  explanation: string
}

function daysBetween(value: string | undefined, now: Date) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
}

export function classifyMilestones(events: IntelligenceEvent[], now = new Date()): TimelineItem[] {
  const items: TimelineItem[] = []
  events.forEach(event => {
    const dueIn = daysBetween(event.dueDate, now)
    const progress = Number(event.metadata?.progress || 0)
    if (event.source === 'schedule' && event.status === 'closed') {
      const age = Math.abs(daysBetween(event.dueDate || event.createdAt, now) || 999)
      if (age <= 21) items.push({ id: event.id, stage: 'recently_completed', title: event.title, date: event.dueDate, source: event.source, progress: 100, explanation: 'Completed within the latest reporting window.' })
      return
    }
    if (event.source === 'schedule' && event.status === 'open' && (event.severity === 'high' || event.severity === 'critical')) {
      items.push({ id: event.id, stage: 'current_critical', title: event.title, date: event.dueDate, source: event.source, progress, explanation: event.description || 'Current activity requires active control.' })
      return
    }
    if (event.source === 'schedule' && event.status === 'open' && dueIn !== null && dueIn >= 0 && dueIn <= 30) {
      items.push({ id: event.id, stage: 'next_milestone', title: event.title, date: event.dueDate, source: event.source, progress, explanation: `Planned within the next ${dueIn} day${dueIn === 1 ? '' : 's'}.` })
      return
    }
    if ((event.source === 'approval' || event.source === 'procurement') && event.status === 'open' && event.severity !== 'low') {
      items.push({ id: event.id, stage: 'decision_point', title: event.title, date: event.dueDate, source: event.source, explanation: event.description || 'Management decision required.' })
      return
    }
    if (event.status === 'open' && event.links?.some(link => link.type === 'blocks')) {
      items.push({ id: event.id, stage: 'recovery_opportunity', title: event.title, date: event.dueDate, source: event.source, explanation: 'Closing this constraint may release blocked work.' })
    }
  })
  return items
}

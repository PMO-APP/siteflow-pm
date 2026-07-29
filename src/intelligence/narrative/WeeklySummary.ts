import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { ProjectHealth } from '../models/ProjectHealth'
import type { Recommendation } from '../models/Recommendation'

export interface WeeklyNarrative {
  completed: string[]
  newPressures: string[]
  decisionsRequired: string[]
  focusNextWeek: string[]
  narrative: string
}

export function generateWeeklySummary(events: IntelligenceEvent[], health: ProjectHealth, recommendations: Recommendation[]): WeeklyNarrative {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = events.filter(event => new Date(event.occurredAt || event.createdAt).getTime() >= sevenDaysAgo)
  const completed = recent.filter(event => event.status === 'closed').slice(0, 5).map(event => event.title)
  const newPressures = recent.filter(event => event.status === 'open' && ['high', 'critical'].includes(event.severity)).slice(0, 5).map(event => event.title)
  const decisionsRequired = recent.filter(event => ['approval', 'procurement', 'rfi'].includes(event.source) && event.status === 'open').slice(0, 5).map(event => event.title)
  const focusNextWeek = recommendations.slice(0, 4).map(item => item.action)

  return {
    completed,
    newPressures,
    decisionsRequired,
    focusNextWeek,
    narrative: `This week, ${completed.length || 'no'} material item${completed.length === 1 ? ' was' : 's were'} closed. ${newPressures.length ? `${newPressures.length} new high-priority pressure${newPressures.length === 1 ? ' requires' : 's require'} attention.` : 'No new high-priority pressure was recorded.'} Overall project health is ${health.overallScore}%.`,
  }
}

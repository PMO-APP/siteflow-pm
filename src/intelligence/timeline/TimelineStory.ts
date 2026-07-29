import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import { classifyMilestones, type TimelineItem, type TimelineStage } from './MilestoneClassifier'

export interface ProjectTimelineStory {
  recentlyCompleted: TimelineItem[]
  currentCritical: TimelineItem[]
  nextMilestones: TimelineItem[]
  decisionPoints: TimelineItem[]
  recoveryOpportunities: TimelineItem[]
}

function byDate(items: TimelineItem[]) {
  return [...items].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
}

export function buildTimelineStory(events: IntelligenceEvent[], now = new Date()): ProjectTimelineStory {
  const items = classifyMilestones(events, now)
  const take = (stage: TimelineStage, count = 5) => byDate(items.filter(item => item.stage === stage)).slice(0, count)
  return {
    recentlyCompleted: take('recently_completed'),
    currentCritical: take('current_critical'),
    nextMilestones: take('next_milestone'),
    decisionPoints: take('decision_point'),
    recoveryOpportunities: take('recovery_opportunity'),
  }
}

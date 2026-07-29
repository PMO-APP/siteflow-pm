import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import type { DeliveryPattern } from './PatternMatcher'

export interface ProjectLesson {
  id: string
  title: string
  observation: string
  recommendedPractice: string
  applicability: 'now' | 'next_phase' | 'future_projects'
  confidence: number
  evidenceCount: number
}

const recommendations: Record<string, Pick<ProjectLesson, 'title' | 'recommendedPractice' | 'applicability'>> = {
  'approval-bottleneck': { title: 'Protect approval lead time', recommendedPractice: 'Set named reviewers, response SLAs, and escalation dates before dependent activities enter the look-ahead window.', applicability: 'now' },
  'procurement-critical-path': { title: 'Procure from the programme, not the request date', recommendedPractice: 'Tie order-by dates to task dependencies and escalate imported or long-lead items before float is consumed.', applicability: 'now' },
  'risk-concentration': { title: 'Convert severe risks into owned controls', recommendedPractice: 'Assign one accountable owner, a dated mitigation action, and a measurable trigger for every high-severity risk.', applicability: 'now' },
  'quality-repeat': { title: 'Close defects before trade progression', recommendedPractice: 'Use hold points and repeat-defect reviews before subsequent trades conceal or multiply quality failures.', applicability: 'next_phase' },
  'schedule-slippage': { title: 'Intervene at activity level', recommendedPractice: 'Require activity-specific recovery measures, additional resources, and revised logic instead of relying only on overall progress.', applicability: 'now' },
  'control-closure': { title: 'Reuse proven close-out controls', recommendedPractice: 'Document the owner, decision, and action that closed each constraint so the same response can be reused on similar projects.', applicability: 'future_projects' },
}

export function generateProjectLessons(events: IntelligenceEvent[], patterns: DeliveryPattern[]): ProjectLesson[] {
  return patterns.slice(0, 6).map(pattern => {
    const template = recommendations[pattern.id] || {
      title: pattern.title,
      recommendedPractice: 'Review the supporting evidence and capture the effective control for reuse.',
      applicability: 'future_projects' as const,
    }
    return {
      id: `lesson:${pattern.id}`,
      title: template.title,
      observation: pattern.explanation,
      recommendedPractice: template.recommendedPractice,
      applicability: template.applicability,
      confidence: pattern.confidence,
      evidenceCount: pattern.relatedEventIds.filter(id => events.some(event => event.id === id)).length,
    }
  })
}

import type { IntelligenceEvent, IntelligenceSource } from '../models/IntelligenceEvent'

export type GovernanceStatus = 'compliant' | 'attention' | 'non_compliant' | 'not_available'

export interface GovernanceCheck {
  id: string
  label: string
  status: GovernanceStatus
  score: number
  evidence: string
  source?: IntelligenceSource
}

export interface GovernanceAssessment {
  score: number
  level: 'Initial' | 'Developing' | 'Managed' | 'Optimised'
  checks: GovernanceCheck[]
  strengths: string[]
  gaps: string[]
}

function sourceEvents(events: IntelligenceEvent[], source: IntelligenceSource) {
  return events.filter(event => event.source === source)
}

function checkSource(
  events: IntelligenceEvent[],
  id: string,
  label: string,
  source: IntelligenceSource,
  highPenalty = 22,
): GovernanceCheck {
  const records = sourceEvents(events, source)
  if (!records.length) return { id, label, status: 'not_available', score: 55, evidence: 'No supporting records are available yet.', source }
  const openHigh = records.filter(event => event.status === 'open' && (event.severity === 'high' || event.severity === 'critical')).length
  const open = records.filter(event => event.status === 'open').length
  const score = Math.max(20, Math.min(100, 100 - openHigh * highPenalty - Math.max(0, open - openHigh) * 5))
  return {
    id,
    label,
    status: score >= 80 ? 'compliant' : score >= 60 ? 'attention' : 'non_compliant',
    score,
    evidence: openHigh ? `${openHigh} high-priority exception${openHigh === 1 ? '' : 's'} remain open.` : open ? `${open} routine item${open === 1 ? '' : 's'} remain open.` : 'Records are current with no open exception.',
    source,
  }
}

export function assessGovernance(events: IntelligenceEvent[]): GovernanceAssessment {
  const schedule = sourceEvents(events, 'schedule')
  const hasBaseline = schedule.some(event => Boolean(event.dueDate))
  const scheduleCheck: GovernanceCheck = schedule.length
    ? {
        id: 'baseline-schedule',
        label: 'Baseline schedule governance',
        status: hasBaseline ? 'compliant' : 'attention',
        score: hasBaseline ? 92 : 62,
        evidence: hasBaseline ? 'Schedule activities include planned completion dates.' : 'Schedule exists, but baseline dates are incomplete.',
        source: 'schedule',
      }
    : { id: 'baseline-schedule', label: 'Baseline schedule governance', status: 'non_compliant', score: 25, evidence: 'No schedule evidence is available.', source: 'schedule' }

  const checks = [
    scheduleCheck,
    checkSource(events, 'risk-discipline', 'Risk register discipline', 'risk', 18),
    checkSource(events, 'approval-discipline', 'Approval control', 'approval', 24),
    checkSource(events, 'procurement-readiness', 'Procurement readiness', 'procurement', 22),
    checkSource(events, 'quality-control', 'Quality control and close-out', 'quality', 20),
    checkSource(events, 'snag-closeout', 'Snag close-out discipline', 'snag', 16),
    checkSource(events, 'site-reporting', 'Site reporting evidence', 'site', 14),
    checkSource(events, 'hse-control', 'HSE control', 'hse', 28),
  ]

  const available = checks.filter(check => check.status !== 'not_available')
  const score = Math.round((available.length ? available : checks).reduce((sum, check) => sum + check.score, 0) / (available.length || checks.length))
  const level = score >= 90 ? 'Optimised' : score >= 75 ? 'Managed' : score >= 55 ? 'Developing' : 'Initial'
  const strengths = checks.filter(check => check.score >= 80).map(check => check.label)
  const gaps = checks.filter(check => check.score < 65).map(check => check.label)

  return { score, level, checks, strengths, gaps }
}

import type { ProjectHealth } from '../models/ProjectHealth'
import type { ForecastResult } from '../models/Forecast'
import type { GovernanceAssessment } from '../governance/GovernanceEngine'
import type { EarlyWarning } from '../warning/EarlyWarningEngine'
import type { ActionIntelligenceResult } from '../action/ActionIntelligence'
import type { ProjectReviewBrief } from '../meeting/MeetingIntelligence'
import type { ProjectPulse } from '../pulse/PulseEngine'

export interface BoardPackMetric {
  label: string
  value: string
  commentary: string
  status: 'good' | 'watch' | 'critical' | 'neutral'
}

export interface BoardPackSection {
  id: string
  title: string
  summary: string
  items: string[]
}

export interface ExecutiveBoardPack {
  title: string
  projectName: string
  reportingDate: string
  status: ProjectHealth['overallBand']
  executiveSummary: string
  outlook: string
  metrics: BoardPackMetric[]
  sections: BoardPackSection[]
  decisionsRequired: Array<{
    title: string
    owner: string
    deadline: string
    impact: string
  }>
  assuranceStatement: string
  generatedAt: string
}

interface BoardPackInput {
  projectName: string
  health: ProjectHealth
  forecast: ForecastResult
  governance: GovernanceAssessment
  warnings: EarlyWarning[]
  actionIntelligence: ActionIntelligenceResult
  meeting: ProjectReviewBrief
  pulse: ProjectPulse
  now?: Date
}

function metricStatus(score: number): BoardPackMetric['status'] {
  if (score >= 80) return 'good'
  if (score >= 60) return 'watch'
  return 'critical'
}

export function buildExecutiveBoardPack(input: BoardPackInput): ExecutiveBoardPack {
  const now = input.now || new Date()
  const criticalWarnings = input.warnings.filter(item => item.impact === 'critical')
  const highWarnings = input.warnings.filter(item => item.impact === 'high')
  const urgentActions = input.actionIntelligence.actions.filter(item => item.status === 'overdue' || item.status === 'due_today')

  const executiveSummary = `${input.projectName} is ${input.health.overallBand} with overall health of ${input.health.overallScore}%. ${input.forecast.forecastDelayDays > 0 ? `The current forecast is ${input.forecast.forecastDelayDays} days behind plan.` : 'The current completion forecast remains within the planned position.'} ${urgentActions.length ? `${urgentActions.length} urgent management action${urgentActions.length === 1 ? '' : 's'} require closure.` : 'No urgent management action is currently overdue.'}`

  const outlook = input.pulse.status === 'critical' || input.pulse.status === 'deteriorating'
    ? 'Delivery conditions are deteriorating. Executive intervention should focus on the highest-impact decisions, firm action ownership and protection of the critical path.'
    : input.forecast.forecastDelayDays > 0
      ? 'Recovery remains achievable, provided the listed decisions and actions are closed within the current reporting cycle.'
      : 'The delivery position is controlled. Management attention should remain focused on preserving momentum and preventing emerging constraints from entering the critical path.'

  const metrics: BoardPackMetric[] = [
    { label: 'Project health', value: `${input.health.overallScore}%`, commentary: input.health.overallBand, status: metricStatus(input.health.overallScore) },
    { label: 'Governance maturity', value: `${input.governance.score}%`, commentary: input.governance.level, status: metricStatus(input.governance.score) },
    { label: 'Forecast delay', value: `${input.forecast.forecastDelayDays} days`, commentary: input.forecast.forecastDelayDays > 0 ? 'Behind plan' : 'Controlled', status: input.forecast.forecastDelayDays > 10 ? 'critical' : input.forecast.forecastDelayDays > 0 ? 'watch' : 'good' },
    { label: 'Action control', value: `${input.actionIntelligence.controlScore}%`, commentary: `${input.actionIntelligence.overdueCount} overdue`, status: metricStatus(input.actionIntelligence.controlScore) },
    { label: 'Review readiness', value: `${input.meeting.readinessScore}%`, commentary: input.meeting.readinessScore >= 80 ? 'Ready' : 'Attention required', status: metricStatus(input.meeting.readinessScore) },
    { label: 'Early warnings', value: String(input.warnings.length), commentary: `${criticalWarnings.length} critical`, status: criticalWarnings.length ? 'critical' : highWarnings.length ? 'watch' : 'good' },
  ]

  const sections: BoardPackSection[] = [
    {
      id: 'delivery',
      title: 'Delivery position',
      summary: input.meeting.openingStatement,
      items: input.meeting.sinceLastReview.slice(0, 5),
    },
    {
      id: 'risks',
      title: 'Principal risks and early warnings',
      summary: criticalWarnings.length ? `${criticalWarnings.length} critical warning${criticalWarnings.length === 1 ? ' requires' : 's require'} executive attention.` : 'No critical early warning is currently open.',
      items: input.warnings.slice(0, 5).map(item => `${item.title}: ${item.description}`),
    },
    {
      id: 'actions',
      title: 'Management action control',
      summary: input.actionIntelligence.executiveSummary,
      items: input.actionIntelligence.actions.slice(0, 6).map(item => `${item.title} — ${item.owner} (${item.status.replace('_', ' ')})`),
    },
    {
      id: 'assurance',
      title: 'Governance and assurance',
      summary: `Governance maturity is ${input.governance.score}% (${input.governance.level}).`,
      items: input.governance.checks.slice(0, 6).map(item => `${item.label}: ${item.score}% — ${item.evidence || 'Control evidence recorded.'}`),
    },
  ]

  const decisionsRequired = input.meeting.decisionsRequired.slice(0, 6).map(item => ({
    title: item.title,
    owner: item.owner || 'Project owner',
    deadline: item.dueDate || 'Before next review',
    impact: item.evidence[0] || item.priority,
  }))

  return {
    title: `${input.projectName} Executive Board Pack`,
    projectName: input.projectName,
    reportingDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    status: input.health.overallBand,
    executiveSummary,
    outlook,
    metrics,
    sections,
    decisionsRequired,
    assuranceStatement: `This board pack was generated from the PMOCorex Intelligence Framework using verified project controls available at ${now.toLocaleString('en-GB')}. Management should validate material decisions against the latest contractual and site information before approval.`,
    generatedAt: now.toISOString(),
  }
}

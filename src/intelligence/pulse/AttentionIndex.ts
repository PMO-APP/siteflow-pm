import type { IntelligenceAlert } from '../models/Recommendation'
import type { ProjectDecision } from '../decision/DecisionCenter'
import type { ForecastResult } from '../models/Forecast'
import type { GovernanceAssessment } from '../governance/GovernanceEngine'

export type ExecutiveAttentionLevel = 'routine' | 'pmo_review' | 'senior_review' | 'executive_intervention'

export interface AttentionAssessment {
  score: number
  level: ExecutiveAttentionLevel
  label: string
  reasons: string[]
}

export function calculateAttentionIndex(
  forecast: ForecastResult,
  alerts: IntelligenceAlert[],
  decisions: ProjectDecision[],
  governance: GovernanceAssessment,
): AttentionAssessment {
  const criticalAlerts = alerts.filter(item => item.severity === 'critical').length
  const highAlerts = alerts.filter(item => item.severity === 'warning').length
  const todayDecisions = decisions.filter(item => item.urgency === 'today').length
  const delay = Math.max(0, forecast.forecastDelayDays)
  const governanceGap = Math.max(0, 75 - governance.score)
  const score = Math.min(100, Math.round(delay * 2.2 + criticalAlerts * 18 + highAlerts * 9 + todayDecisions * 8 + governanceGap * 0.8))
  const level: ExecutiveAttentionLevel = score >= 75
    ? 'executive_intervention'
    : score >= 52
    ? 'senior_review'
    : score >= 28
    ? 'pmo_review'
    : 'routine'
  const reasons = [
    delay > 0 ? `${delay} forecast delay day${delay === 1 ? '' : 's'}` : '',
    criticalAlerts ? `${criticalAlerts} critical alert${criticalAlerts === 1 ? '' : 's'}` : '',
    todayDecisions ? `${todayDecisions} decision${todayDecisions === 1 ? '' : 's'} required today` : '',
    governance.score < 65 ? `governance maturity is ${governance.level.toLowerCase()}` : '',
  ].filter(Boolean)

  const labels: Record<ExecutiveAttentionLevel, string> = {
    routine: 'Routine monitoring',
    pmo_review: 'PMO review',
    senior_review: 'Senior management review',
    executive_intervention: 'Executive intervention required',
  }

  return { score, level, label: labels[level], reasons }
}

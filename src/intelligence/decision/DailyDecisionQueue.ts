import type { ProjectDecision } from './DecisionCenter'
import type { EarlyWarning } from '../warning/EarlyWarningEngine'

export interface DailyDecisionItem extends ProjectDecision {
  queueScore: number
  warningProbability?: number
}

export function buildDailyDecisionQueue(decisions: ProjectDecision[], warnings: EarlyWarning[]): DailyDecisionItem[] {
  return decisions.map(decision => {
    const warning = warnings.find(item => item.relatedEventIds.some(id => decision.relatedEventIds.includes(id)))
    const urgencyBoost = decision.urgency === 'today' ? 18 : decision.urgency === 'this_week' ? 8 : 0
    const queueScore = Math.min(100, Math.round(decision.impactScore * 0.55 + decision.confidence * 0.2 + Math.min(20, decision.recoveryDays * 2) + urgencyBoost + (warning?.probability || 0) * 0.08))
    return { ...decision, queueScore, warningProbability: warning?.probability }
  }).sort((a, b) => b.queueScore - a.queueScore).slice(0, 5)
}

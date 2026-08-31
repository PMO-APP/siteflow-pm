import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import type { ForecastV2Result } from '@/core/intelligence/forecast/forecastV2'
import type { RootCauseResult } from '@/core/intelligence/root-cause/rootCauseTypes'
import type { MilestoneReadinessResult } from '@/core/intelligence/readiness/readinessTypes'
import type { ExecutiveNarrative } from './narrativeTypes'

export function buildExecutiveNarrative({
  state,
  forecast,
  rootCause,
  readiness,
}: {
  state: ProjectState
  forecast: ForecastV2Result
  rootCause: RootCauseResult
  readiness: MilestoneReadinessResult
}): ExecutiveNarrative {
  const projectName =
    state.project.name

  const headline =
    forecast.delayDays === 0
      ? `${projectName} is currently on target.`
      : forecast.recoverable
      ? `${projectName} remains recoverable despite a ${forecast.delayDays}-day delay.`
      : `${projectName} is in a critical delivery position with a ${forecast.delayDays}-day delay.`

  const declaredDelayReasons = state.schedule.activities
    .filter(activity => activity.progress < 100 && activity.delayReason)
    .map(activity => ({
      activity: activity.name,
      reason: activity.delayReason as string,
    }))

  const causeSentence =
    rootCause.primaryCause
      ? rootCause.explanation
      : declaredDelayReasons.length
        ? `${declaredDelayReasons[0].activity} has a recorded delay reason in Project Controls: ${declaredDelayReasons[0].reason}.`
        : 'No reliable root cause has been identified from the current dependency data.'

  const productionSentence =
    forecast.production.efficiency >= 100
      ? 'Current production performance supports the target completion date.'
      : `Current production efficiency is ${forecast.production.efficiency}%, below the rate required to meet the target.`

  const readinessSentence =
    readiness.status === 'ready'
      ? `${readiness.milestoneName} is ready to proceed.`
      : `${readiness.milestoneName} has a readiness score of ${readiness.score}% with ${readiness.blockers.length} blocker${
          readiness.blockers.length === 1
            ? ''
            : 's'
        }.`

  const keyMessages: string[] = []

  declaredDelayReasons.slice(0, 3).forEach(item => {
    keyMessages.push(`${item.activity}: ${item.reason}.`)
  })

  if (state.approvals.overdueApprovals > 0) {
    keyMessages.push(
      `${state.approvals.overdueApprovals} approval item(s) are overdue.`
    )
  }

  if (state.procurement.atRiskItems > 0) {
    keyMessages.push(
      `${state.procurement.atRiskItems} procurement item(s) may affect delivery.`
    )
  }

  if (state.quality.criticalSnags > 0) {
    keyMessages.push(
      `${state.quality.criticalSnags} critical snag(s) remain open.`
    )
  }

  if (state.risk.unmitigatedHighRisks > 0) {
    keyMessages.push(
      `${state.risk.unmitigatedHighRisks} high risk(s) remain without mitigation.`
    )
  }

  const outlook =
    forecast.recoverable
      ? `Recovery remains achievable with ${forecast.recoveryConfidence}% confidence if the primary constraint is resolved and the required production rate is sustained.`
      : 'Executive intervention is required because the current production and constraint position does not support recovery.'

  return {
    headline,
    summary: `${causeSentence} ${productionSentence} ${readinessSentence}`,
    keyMessages,
    outlook,
    generatedAt:
      new Date().toISOString(),
  }
}

import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import { approvalRules } from './ApprovalRules'
import { procurementRules } from './ProcurementRules'
import { riskRules } from './RiskRules'
import { scheduleRules } from './ScheduleRules'

export interface RuleEvaluation {
  ruleId: string
  eventId: string
  triggered: boolean
  reason: string
}

export function evaluateIntelligenceRules(events: IntelligenceEvent[], now = new Date()): RuleEvaluation[] {
  return [
    ...scheduleRules(events),
    ...procurementRules(events, now),
    ...approvalRules(events, now),
    ...riskRules(events),
  ]
}

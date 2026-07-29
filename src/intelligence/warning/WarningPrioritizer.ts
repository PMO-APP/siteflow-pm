import type { EarlyWarning } from './EarlyWarningEngine'

export function prioritizeWarnings(warnings: EarlyWarning[]) {
  return [...warnings].sort((a, b) => {
    const urgency = { now: 3, seven_days: 2, fourteen_days: 1 }
    const impact = { critical: 3, high: 2, medium: 1 }
    return urgency[b.urgency] - urgency[a.urgency] || impact[b.impact] - impact[a.impact] || b.priorityScore - a.priorityScore
  })
}

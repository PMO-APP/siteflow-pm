import type { HealthBreakdown, ProjectHealthResult } from './types'

export type HealthInput = {
  scheduleProgress: number
  plannedProgress: number
  overdueTasks: number
  totalTasks: number
  contractSum: number
  projectedFinalCost: number
  pendingPayments: number
  openSnags: number
  criticalSnags: number
  failedInspections?: number
  openRisks: number
  highRisks: number
  safetyIncidents?: number
  openHSEActions?: number
  pendingApprovals: number
  overdueApprovals: number
  procurementRisks: number
  procurementItems: number
  governanceScore: number
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value))

const ratio = (part: number, total: number) =>
  total > 0 ? part / total : 0

function labelFor(score: number) {
  if (score >= 85) return { label: 'Healthy', tone: 'healthy' as const }
  if (score >= 70) return { label: 'Recoverable', tone: 'recoverable' as const }
  if (score >= 50) return { label: 'At Risk', tone: 'at_risk' as const }
  return { label: 'Critical', tone: 'critical' as const }
}

export function calculateProjectHealth(input: HealthInput): ProjectHealthResult {
  const variance = input.scheduleProgress - input.plannedProgress
  const overrunPct =
    input.contractSum > 0
      ? ((input.projectedFinalCost - input.contractSum) / input.contractSum) * 100
      : 0

  const breakdown: HealthBreakdown = {
    schedule: Math.round(
      clamp(100 + Math.min(0, variance) * 1.6 - ratio(input.overdueTasks, input.totalTasks) * 35)
    ),
    commercial: Math.round(
      clamp(100 - Math.max(0, overrunPct) * 2.2 - (input.pendingPayments > 0 ? 8 : 0))
    ),
    quality: Math.round(
      clamp(100 - input.openSnags * 0.8 - input.criticalSnags * 8 - Number(input.failedInspections || 0) * 5)
    ),
    risk: Math.round(clamp(100 - input.openRisks * 1.1 - input.highRisks * 8)),
    safety: Math.round(
      clamp(100 - Number(input.safetyIncidents || 0) * 20 - Number(input.openHSEActions || 0) * 3)
    ),
    approvals: Math.round(
      clamp(100 - input.pendingApprovals * 1.5 - input.overdueApprovals * 9)
    ),
    procurement: Math.round(
      clamp(100 - ratio(input.procurementRisks, input.procurementItems) * 55 - input.procurementRisks * 2)
    ),
    governance: Math.round(clamp(input.governanceScore)),
  }

  const score = Math.round(
    breakdown.schedule * 0.28 +
      breakdown.commercial * 0.16 +
      breakdown.quality * 0.14 +
      breakdown.risk * 0.11 +
      breakdown.safety * 0.10 +
      breakdown.approvals * 0.08 +
      breakdown.procurement * 0.06 +
      breakdown.governance * 0.07
  )

  const state = labelFor(score)
  const drivers = (Object.entries(breakdown) as Array<[keyof HealthBreakdown, number]>)
    .sort((a, b) => a[1] - b[1])
    .filter(([, value]) => value < 75)
    .slice(0, 3)
    .map(([key, value]) => `${key[0].toUpperCase()}${key.slice(1)} health is ${value}/100`)

  return {
    score,
    tone: state.tone,
    label: state.label,
    breakdown,
    drivers,
    calculatedAt: new Date().toISOString(),
  }
}

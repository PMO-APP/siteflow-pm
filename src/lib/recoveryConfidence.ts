export function calculateRecoveryConfidence({
  progressPct,
  variancePct,
  totalTasks,
  overdueTasks,
  procurementRisks,
  highRisks,
  openRisks,
  criticalSnags,
  openSnags,
  overdueApprovals,
  pendingApprovals,
}: {
  progressPct: number
  variancePct: number | null
  totalTasks: number
  overdueTasks: number
  procurementRisks: number
  highRisks: number
  openRisks: number
  criticalSnags: number
  openSnags: number
  overdueApprovals: number
  pendingApprovals: number
}) {
  if (totalTasks === 0) return 0

  let score = 100

  score -= (100 - progressPct) * 0.2
  score -= overdueTasks * 4
  score -= procurementRisks * 2
  score -= highRisks * 6
  score -= openRisks * 1.5
  score -= criticalSnags * 6
  score -= openSnags * 1
  score -= overdueApprovals * 5
  score -= pendingApprovals * 1

  if (variancePct !== null && variancePct < 0) {
    score -= Math.abs(variancePct) * 2
  }

  return Math.max(5, Math.min(95, Math.round(score)))
}

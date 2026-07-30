import {
  buildProjectHealthSummary,
  clampHealthScore,
  createContributor,
  healthLabelForScore,
  healthToneForScore,
  safeRatio,
} from './healthRules'
import {
  HEALTH_METHODOLOGY_VERSION,
  PROJECT_HEALTH_WEIGHTS,
} from './healthWeights'
import type {
  HealthBreakdown,
  HealthContributorKey,
  ProjectHealthContributor,
  ProjectHealthResult,
} from './types'

export type HealthInput = {
  scheduleProgress?: number | null
  plannedProgress?: number | null
  overdueTasks?: number | null
  totalTasks?: number | null
  criticalDelayedTasks?: number | null
  forecastVarianceDays?: number | null

  contractSum?: number | null
  projectedFinalCost?: number | null
  pendingPayments?: number | null
  pendingVariations?: number | null

  openSnags?: number | null
  criticalSnags?: number | null
  failedInspections?: number | null
  openNCRs?: number | null

  openRisks?: number | null
  highRisks?: number | null
  overdueMitigations?: number | null

  safetyIncidents?: number | null
  openHSEActions?: number | null
  overdueHSEActions?: number | null

  pendingApprovals?: number | null
  overdueApprovals?: number | null
  averageApprovalDays?: number | null

  procurementRisks?: number | null
  procurementItems?: number | null
  overdueProcurementItems?: number | null
  longLeadItems?: number | null

  governanceScore?: number | null
}

const numberOrZero = (value: number | null | undefined) =>
  Number.isFinite(Number(value)) ? Number(value) : 0

const isProvided = (value: unknown) =>
  value !== null && value !== undefined && Number.isFinite(Number(value))

function calculateContributors(input: HealthInput): ProjectHealthContributor[] {
  const actual = numberOrZero(input.scheduleProgress)
  const planned = numberOrZero(input.plannedProgress)
  const overdueTasks = numberOrZero(input.overdueTasks)
  const totalTasks = numberOrZero(input.totalTasks)
  const criticalDelayed = numberOrZero(input.criticalDelayedTasks)
  const forecastVariance = numberOrZero(input.forecastVarianceDays)
  const scheduleVariance = actual - planned
  const scheduleAssessed = totalTasks > 0 || isProvided(input.scheduleProgress)
  const scheduleScore = clampHealthScore(
    100 +
      Math.min(0, scheduleVariance) * 1.6 -
      safeRatio(overdueTasks, totalTasks) * 35 -
      criticalDelayed * 7 -
      Math.max(0, forecastVariance) * 0.8
  )

  const contractSum = numberOrZero(input.contractSum)
  const projectedFinalCost = numberOrZero(input.projectedFinalCost)
  const pendingPayments = numberOrZero(input.pendingPayments)
  const pendingVariations = numberOrZero(input.pendingVariations)
  const overrunPct =
    contractSum > 0
      ? ((projectedFinalCost - contractSum) / contractSum) * 100
      : 0
  const commercialAssessed =
    contractSum > 0 || projectedFinalCost > 0 || pendingPayments > 0
  const commercialScore = clampHealthScore(
    100 -
      Math.max(0, overrunPct) * 2.2 -
      (pendingPayments > 0 ? 8 : 0) -
      pendingVariations * 1.5
  )

  const openSnags = numberOrZero(input.openSnags)
  const criticalSnags = numberOrZero(input.criticalSnags)
  const failedInspections = numberOrZero(input.failedInspections)
  const openNCRs = numberOrZero(input.openNCRs)
  const qualityAssessed =
    isProvided(input.openSnags) ||
    isProvided(input.criticalSnags) ||
    isProvided(input.failedInspections) ||
    isProvided(input.openNCRs)
  const qualityScore = clampHealthScore(
    100 - openSnags * 0.8 - criticalSnags * 8 - failedInspections * 5 - openNCRs * 6
  )

  const openRisks = numberOrZero(input.openRisks)
  const highRisks = numberOrZero(input.highRisks)
  const overdueMitigations = numberOrZero(input.overdueMitigations)
  const riskAssessed = isProvided(input.openRisks) || isProvided(input.highRisks)
  const riskScore = clampHealthScore(
    100 - openRisks * 1.1 - highRisks * 8 - overdueMitigations * 5
  )

  const safetyIncidents = numberOrZero(input.safetyIncidents)
  const openHSEActions = numberOrZero(input.openHSEActions)
  const overdueHSEActions = numberOrZero(input.overdueHSEActions)
  const safetyAssessed =
    isProvided(input.safetyIncidents) ||
    isProvided(input.openHSEActions) ||
    isProvided(input.overdueHSEActions)
  const safetyScore = clampHealthScore(
    100 - safetyIncidents * 20 - openHSEActions * 3 - overdueHSEActions * 5
  )

  const pendingApprovals = numberOrZero(input.pendingApprovals)
  const overdueApprovals = numberOrZero(input.overdueApprovals)
  const averageApprovalDays = numberOrZero(input.averageApprovalDays)
  const approvalsAssessed =
    isProvided(input.pendingApprovals) || isProvided(input.overdueApprovals)
  const approvalsScore = clampHealthScore(
    100 -
      pendingApprovals * 1.5 -
      overdueApprovals * 9 -
      Math.max(0, averageApprovalDays - 3) * 2
  )

  const procurementRisks = numberOrZero(input.procurementRisks)
  const procurementItems = numberOrZero(input.procurementItems)
  const overdueProcurementItems = numberOrZero(input.overdueProcurementItems)
  const longLeadItems = numberOrZero(input.longLeadItems)
  const procurementAssessed = procurementItems > 0 || procurementRisks > 0
  const procurementScore = clampHealthScore(
    100 -
      safeRatio(procurementRisks, procurementItems) * 55 -
      procurementRisks * 2 -
      overdueProcurementItems * 5 -
      longLeadItems * 2
  )

  const governanceScore = numberOrZero(input.governanceScore)
  const governanceAssessed = isProvided(input.governanceScore)

  return [
    createContributor({
      key: 'schedule',
      score: scheduleScore,
      assessed: scheduleAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.schedule,
      explanations: [
        `Actual progress is ${Math.round(actual)}% against ${Math.round(planned)}% planned.`,
        `${overdueTasks} of ${totalTasks} activities are overdue.`,
        criticalDelayed > 0 ? `${criticalDelayed} critical activities are delayed.` : '',
        forecastVariance > 0 ? `Forecast completion is ${forecastVariance} days late.` : '',
      ],
      recommendations:
        scheduleScore < 70
          ? ['Agree and track a recovery plan for delayed critical activities.']
          : [],
      metrics: { actual, planned, overdueTasks, totalTasks, criticalDelayed, forecastVariance },
    }),
    createContributor({
      key: 'procurement',
      score: procurementScore,
      assessed: procurementAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.procurement,
      explanations: [
        `${procurementRisks} of ${procurementItems} procurement items are at risk.`,
        overdueProcurementItems > 0 ? `${overdueProcurementItems} items are overdue.` : '',
        longLeadItems > 0 ? `${longLeadItems} long-lead items require monitoring.` : '',
      ],
      recommendations:
        procurementScore < 70
          ? ['Prioritise at-risk and long-lead items linked to near-term schedule activities.']
          : [],
      metrics: { procurementRisks, procurementItems, overdueProcurementItems, longLeadItems },
    }),
    createContributor({
      key: 'approvals',
      score: approvalsScore,
      assessed: approvalsAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.approvals,
      explanations: [
        `${pendingApprovals} approvals are pending.`,
        `${overdueApprovals} approvals are overdue.`,
        averageApprovalDays > 0 ? `Average approval cycle is ${averageApprovalDays} days.` : '',
      ],
      recommendations:
        approvalsScore < 70
          ? ['Escalate overdue approvals that constrain critical or near-term work.']
          : [],
      metrics: { pendingApprovals, overdueApprovals, averageApprovalDays },
    }),
    createContributor({
      key: 'quality',
      score: qualityScore,
      assessed: qualityAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.quality,
      explanations: [
        `${openSnags} snags remain open, including ${criticalSnags} critical snags.`,
        `${failedInspections} inspections have failed.`,
        openNCRs > 0 ? `${openNCRs} NCRs remain open.` : '',
      ],
      recommendations:
        qualityScore < 70
          ? ['Close critical defects and failed inspections before dependent work proceeds.']
          : [],
      metrics: { openSnags, criticalSnags, failedInspections, openNCRs },
    }),
    createContributor({
      key: 'safety',
      score: safetyScore,
      assessed: safetyAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.safety,
      explanations: [
        `${safetyIncidents} HSE incidents are recorded.`,
        `${openHSEActions} HSE actions remain open.`,
        overdueHSEActions > 0 ? `${overdueHSEActions} HSE actions are overdue.` : '',
      ],
      recommendations:
        safetyScore < 70
          ? ['Close overdue HSE actions and verify corrective actions before work continues.']
          : [],
      metrics: { safetyIncidents, openHSEActions, overdueHSEActions },
    }),
    createContributor({
      key: 'risk',
      score: riskScore,
      assessed: riskAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.risk,
      explanations: [
        `${openRisks} risks remain open, including ${highRisks} high risks.`,
        overdueMitigations > 0 ? `${overdueMitigations} mitigations are overdue.` : '',
      ],
      recommendations:
        riskScore < 70
          ? ['Assign and close overdue mitigations for the highest-exposure risks.']
          : [],
      metrics: { openRisks, highRisks, overdueMitigations },
    }),
    createContributor({
      key: 'commercial',
      score: commercialScore,
      assessed: commercialAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.commercial,
      explanations: [
        contractSum > 0 ? `Forecast cost variance is ${overrunPct.toFixed(1)}%.` : '',
        pendingPayments > 0 ? 'Outstanding payments may affect delivery continuity.' : '',
        pendingVariations > 0 ? `${pendingVariations} variations remain pending.` : '',
      ],
      recommendations:
        commercialScore < 70
          ? ['Resolve material cost variances, payment constraints and pending variations.']
          : [],
      metrics: { contractSum, projectedFinalCost, pendingPayments, pendingVariations, overrunPct },
    }),
    createContributor({
      key: 'governance',
      score: governanceScore,
      assessed: governanceAssessed,
      weight: PROJECT_HEALTH_WEIGHTS.governance,
      explanations: [`Governance compliance is ${Math.round(governanceScore)}%.`],
      recommendations:
        governanceScore < 70
          ? ['Resolve overdue reporting, review and control exceptions.']
          : [],
      metrics: { governanceScore },
    }),
  ]
}

function normalizeWeights(contributors: ProjectHealthContributor[]) {
  const assessedWeight = contributors
    .filter(item => item.status === 'assessed')
    .reduce((sum, item) => sum + item.configuredWeight, 0)

  return contributors.map(item => ({
    ...item,
    normalizedWeight:
      item.status === 'assessed' && assessedWeight > 0
        ? item.configuredWeight / assessedWeight
        : 0,
  }))
}

export function calculateProjectHealth(input: HealthInput): ProjectHealthResult {
  const contributors = normalizeWeights(calculateContributors(input))
  const assessedForScore = contributors.filter(
    item => item.status === 'assessed' && item.score !== null && item.normalizedWeight > 0
  )

  const score = Math.round(
    assessedForScore.reduce(
      (sum, item) => sum + Number(item.score) * item.normalizedWeight,
      0
    )
  )
  const safeScore = assessedForScore.length ? score : 0

  const breakdown = contributors.reduce((result, item) => {
    result[item.key] = item.score ?? 0
    return result
  }, {} as HealthBreakdown)

  const ranked = [...assessedForScore].sort(
    (a, b) => Number(a.score) - Number(b.score)
  )
  const drivers = ranked
    .filter(item => Number(item.score) < 75)
    .slice(0, 3)
    .map(item => `${item.label} health is ${item.score}/100`)
  const recommendations = Array.from(
    new Set(ranked.flatMap(item => item.recommendations))
  ).slice(0, 4)

  const assessedWeight = assessedForScore.reduce(
    (sum, item) => sum + item.configuredWeight,
    0
  )
  const confidenceScore = Math.round(clampHealthScore(assessedWeight * 100))
  const confidenceLabel =
    confidenceScore >= 80 ? 'High' : confidenceScore >= 50 ? 'Medium' : 'Low'

  return {
    score: safeScore,
    tone: healthToneForScore(safeScore),
    label: assessedForScore.length ? healthLabelForScore(safeScore) : 'Not Assessed',
    breakdown,
    contributors,
    drivers,
    recommendations,
    summary: buildProjectHealthSummary(safeScore, contributors),
    confidence: {
      score: confidenceScore,
      label: confidenceLabel,
      assessedWeight,
      assessedContributors: contributors.filter(item => item.status === 'assessed').length,
      totalContributors: contributors.length,
    },
    methodologyVersion: HEALTH_METHODOLOGY_VERSION,
    calculatedAt: new Date().toISOString(),
  }
}

export type { HealthContributorKey }

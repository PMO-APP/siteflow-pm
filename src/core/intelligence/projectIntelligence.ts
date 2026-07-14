import type { ProjectState } from './models/ProjectState'
import { calculateProjectHealth } from '@/core/engine/projectHealthEngine'
import { calculateGovernance } from '@/core/engine/governanceEngine'
import { calculateForecast } from '@/core/engine/forecastEngine'

export function buildProjectIntelligence(state: ProjectState) {
  const governance = calculateGovernance({
    scheduleLastUpdatedAt: state.schedule.lastUpdatedAt,
    weeklyReportSubmitted: state.reports.weeklyReportSubmitted,
    weeklyReportDeadlinePassed: false,
    costReportSubmitted: state.reports.costReportSubmitted,
    designReportSubmitted: state.reports.designReportSubmitted,
    overdueApprovals: state.approvals.overdueApprovals,
    highRisksWithoutMitigation: state.risk.unmitigatedHighRisks,
    overdueInspections: state.quality.overdueInspections,
    overdueHSEActions: state.hse.overdueActions,
    criticalSnagsWithoutOwner: 0,
    documentsAwaitingReview: state.documents.awaitingReview,
  })

  const health = calculateProjectHealth({
    scheduleProgress: state.schedule.weightedProgress,
    plannedProgress: state.schedule.plannedProgress,
    overdueTasks: state.schedule.overdueActivities,
    totalTasks: state.schedule.totalActivities,
    contractSum: state.commercial.contractSum,
    projectedFinalCost: state.commercial.projectedFinalCost,
    pendingPayments: state.commercial.pendingPayments,
    openSnags: state.quality.openSnags,
    criticalSnags: state.quality.criticalSnags,
    failedInspections: state.quality.failedInspections,
    openRisks: state.risk.openRisks,
    highRisks: state.risk.highRisks,
    safetyIncidents: state.hse.incidents,
    openHSEActions: state.hse.openActions,
    pendingApprovals: state.approvals.pendingApprovals,
    overdueApprovals: state.approvals.overdueApprovals,
    procurementRisks: state.procurement.atRiskItems,
    procurementItems: state.procurement.totalItems,
    governanceScore: governance.score,
  })

  const forecast = calculateForecast({
    tasks: state.schedule.activities.map(activity => ({
      id: activity.id,
      name: activity.name,
      status: activity.status,
      progress_pct: activity.progress,
      planned_start: activity.plannedStart,
      planned_finish: activity.plannedFinish,
      task_number: activity.taskNumber,
    })),
    targetDate:
      state.project.handoverDate ||
      state.project.targetDate ||
      state.schedule.finishDate,
  })

  return {
    state,
    health,
    governance,
    forecast,
    metrics: {
      scheduleProgress: state.schedule.weightedProgress,
      plannedProgress: state.schedule.plannedProgress,
      progressVariance: state.schedule.variancePercent,
      overdueTasks: state.schedule.overdueActivities,
      pendingApprovals: state.approvals.pendingApprovals,
      overdueApprovals: state.approvals.overdueApprovals,
      openSnags: state.quality.openSnags,
      criticalSnags: state.quality.criticalSnags,
      openRisks: state.risk.openRisks,
      highRisks: state.risk.highRisks,
      procurementRisks: state.procurement.atRiskItems,
      contractSum: state.commercial.contractSum,
      projectedFinalCost: state.commercial.projectedFinalCost,
      pendingPayments: state.commercial.pendingPayments,
    },
  }
}

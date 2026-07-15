import type { ProjectState as V6ProjectState } from '@/platform/project-state'
import type { ProjectState as LegacyProjectState } from '@/core/intelligence/models/ProjectState'

export function adaptV6StateToLegacy(
  state: V6ProjectState
): LegacyProjectState {
  const financialItems = state.commercial as any[]
  const contractSum = financialItems
    .filter(item => item.type === 'Contract Sum')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const approvedVariations = financialItems
    .filter(
      item =>
        item.type === 'Variation' &&
        item.status === 'Approved'
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const pendingPayments = financialItems
    .filter(
      item =>
        item.type === 'Payment' &&
        item.status === 'Pending'
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const openSnags = (state.quality as any[]).filter(
    item => !['Closed', 'Resolved'].includes(item.status || '')
  )

  const criticalSnags = openSnags.filter(
    item =>
      item.severity === 'Critical' ||
      item.priority === 'Critical'
  )

  const openRisks = (state.risks as any[]).filter(
    item =>
      !['Closed', 'Resolved', 'Mitigated'].includes(item.status || '')
  )

  const highRisks = openRisks.filter(
    item =>
      Number(item.risk_score || item.score || 0) >= 12 ||
      item.rating === 'High' ||
      item.rating === 'Critical'
  )

  const pendingApprovals = (state.approvals as any[]).filter(
    item =>
      !['Approved', 'Rejected', 'Closed'].includes(item.status || '')
  )

  const completedProcurementStatuses = [
    'Delivered',
    'Installed',
    'Completed',
    'Cancelled',
  ]

  return {
    project: {
      id: state.project.id,
      name: state.project.name,
      organizationId: state.project.organizationId,
      portfolioId: state.project.portfolioId,
      scope: state.project.scope,
      startDate: state.project.startDate,
      targetDate: state.project.targetDate,
      handoverDate: state.project.handoverDate,
      status: state.project.status,
    },

    schedule: {
      activities: state.schedule.map(task => ({
        id: task.id,
        taskNumber: task.taskNumber,
        name: task.name,
        discipline: task.discipline,
        phase: task.phase,
        status: task.status,
        progress: task.progress,
        weight: task.weight,
        plannedStart: task.plannedStart,
        plannedFinish: task.plannedFinish,
        actualStart: task.actualStart,
        actualFinish: task.actualFinish,
        predecessorIds: task.predecessorIds,
        isCritical: task.isCritical,
        isBlocked: task.isBlocked,
        updatedAt: task.updatedAt,
      })),
      totalActivities: state.schedule.length,
      completedActivities: state.schedule.filter(
        task => task.progress >= 100
      ).length,
      overdueActivities: 0,
      weightedProgress:
        state.schedule.length === 0
          ? 0
          : Math.round(
              state.schedule.reduce(
                (sum, task) => sum + task.progress,
                0
              ) / state.schedule.length
            ),
      plannedProgress: 0,
      variancePercent: 0,
      startDate: state.project.startDate,
      finishDate:
        state.project.handoverDate ||
        state.project.targetDate,
      lastUpdatedAt:
        [...state.schedule]
          .map(task => task.updatedAt)
          .filter(Boolean)
          .sort()
          .at(-1) || null,
    },

    commercial: {
      items: financialItems.map(item => ({
        id: String(item.id),
        type: item.type || 'Other',
        status: item.status || null,
        amount: Number(item.amount || 0),
        title:
          item.title ||
          item.description ||
          item.type ||
          'Commercial item',
        dueDate: item.due_date || null,
      })),
      contractSum,
      approvedVariations,
      pendingVariations: 0,
      paidToDate: 0,
      pendingPayments,
      projectedFinalCost:
        contractSum + approvedVariations,
    },

    quality: {
      snags: (state.quality as any[]).map(item => ({
        id: String(item.id),
        title:
          item.title ||
          item.description ||
          'Snag',
        status: item.status || null,
        severity:
          item.severity ||
          item.priority ||
          null,
        ownerId:
          item.owner_id
            ? String(item.owner_id)
            : null,
        dueDate: item.due_date || null,
      })),
      openSnags: openSnags.length,
      criticalSnags: criticalSnags.length,
      closedSnags:
        state.quality.length - openSnags.length,
      failedInspections: 0,
      overdueInspections: 0,
    },

    risk: {
      items: (state.risks as any[]).map(item => ({
        id: String(item.id),
        title:
          item.title ||
          item.risk ||
          'Untitled risk',
        status: item.status || null,
        score: Number(
          item.risk_score ||
          item.score ||
          0
        ),
        rating: item.rating || null,
        mitigation:
          item.mitigation ||
          item.mitigation_action ||
          null,
        ownerId:
          item.owner_id
            ? String(item.owner_id)
            : null,
        dueDate:
          item.due_date ||
          item.review_date ||
          null,
      })),
      openRisks: openRisks.length,
      highRisks: highRisks.length,
      unmitigatedHighRisks: highRisks.filter(
        item =>
          !item.mitigation &&
          !item.mitigation_action
      ).length,
    },

    approvals: {
      items: (state.approvals as any[]).map(item => ({
        id: String(item.id),
        title:
          item.title ||
          item.name ||
          item.item ||
          'Approval item',
        status: item.status || null,
        discipline: item.discipline || null,
        dueDate:
          item.deadline ||
          item.due_date ||
          item.approval_deadline ||
          null,
        ownerId:
          item.owner_id
            ? String(item.owner_id)
            : null,
      })),
      pendingApprovals: pendingApprovals.length,
      overdueApprovals: 0,
      approvedApprovals:
        state.approvals.length -
        pendingApprovals.length,
    },

    procurement: {
      items: (state.procurement as any[]).map(item => ({
        id: String(item.id),
        title:
          item.title ||
          item.item ||
          item.material ||
          'Procurement item',
        status: item.status || null,
        requiredDate:
          item.required_date ||
          item.due_date ||
          null,
        expectedDeliveryDate:
          item.expected_delivery_date || null,
        orderByDate:
          item.order_by_date || null,
        linkedTaskId:
          item.task_id
            ? String(item.task_id)
            : null,
      })),
      atRiskItems: 0,
      overdueItems: 0,
      completedItems: state.procurement.filter(
        item =>
          completedProcurementStatuses.includes(
            item.status || ''
          )
      ).length,
    },

    hse: state.hse,

    reports: {
      latestWeeklyReportAt: null,
      latestCostReportAt: null,
      latestDesignReportAt: null,
      weeklyReportSubmitted:
        Boolean(state.reports.latestWeeklyReport),
      costReportSubmitted:
        Boolean(state.reports.latestCostReport),
      designReportSubmitted:
        Boolean(state.reports.latestDesignReport),
    },

    documents: state.documents,

    governance: {
      scheduleLastUpdatedAt:
        [...state.schedule]
          .map(task => task.updatedAt)
          .filter(Boolean)
          .sort()
          .at(-1) || null,
      weeklyReportSubmitted:
        Boolean(state.reports.latestWeeklyReport),
      costReportSubmitted:
        Boolean(state.reports.latestCostReport),
      designReportSubmitted:
        Boolean(state.reports.latestDesignReport),
      overdueApprovals: 0,
      unmitigatedHighRisks:
        highRisks.filter(
          item =>
            !item.mitigation &&
            !item.mitigation_action
        ).length,
      overdueInspections: 0,
      overdueHSEActions:
        state.hse.overdueActions,
      criticalSnagsWithoutOwner:
        criticalSnags.filter(
          item => !item.owner_id
        ).length,
      documentsAwaitingReview:
        state.documents.awaitingReview,
    },

    generatedAt: state.generatedAt,
  }
}

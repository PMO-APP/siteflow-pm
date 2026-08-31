import type {
  ProjectState as V6ProjectState,
} from '@/platform/project-state'

import type {
  ProjectState as LegacyProjectState,
} from '@/core/intelligence/models/ProjectState'

function normalizeStatus(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isPastDate(value: unknown) {
  if (!value) return false

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  date.setHours(0, 0, 0, 0)

  return date.getTime() < today.getTime()
}

function isClosedStatus(value: unknown) {
  const status = normalizeStatus(value)

  return [
    'closed',
    'completed',
    'resolved',
    'cancelled',
    'canceled',
  ].includes(status)
}

function isApprovedStatus(value: unknown) {
  const status = normalizeStatus(value)

  return [
    'approved',
    'completed',
    'closed',
  ].includes(status)
}

function isDeliveredStatus(value: unknown) {
  const status = normalizeStatus(value)

  return [
    'delivered',
    'installed',
    'completed',
    'closed',
    'cancelled',
    'canceled',
  ].includes(status)
}

function latestScheduleUpdate(
  state: V6ProjectState
): string | null {
  const dates = state.schedule
    .map(task => task.updatedAt)
    .filter(
      (value): value is string =>
        Boolean(value)
    )
    .sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    )

  return dates.length > 0
    ? dates[0]
    : null
}

function calculateWeightedProgress(
  state: V6ProjectState
) {
  if (state.schedule.length === 0) {
    return 0
  }

  const totalWeight = state.schedule.reduce(
    (sum, task) =>
      sum + numberValue(task.weight),
    0
  )

  if (totalWeight > 0) {
    const weightedTotal =
      state.schedule.reduce(
        (sum, task) =>
          sum +
          numberValue(task.progress) *
            numberValue(task.weight),
        0
      )

    return Math.round(
      weightedTotal / totalWeight
    )
  }

  const average =
    state.schedule.reduce(
      (sum, task) =>
        sum +
        numberValue(task.progress),
      0
    ) / state.schedule.length

  return Math.round(average)
}

function calculatePlannedProgress(
  state: V6ProjectState
) {
  if (state.schedule.length === 0) {
    return 0
  }

  const now = new Date()

  const plannedValues =
    state.schedule.map(task => {
      if (
        !task.plannedStart ||
        !task.plannedFinish
      ) {
        return 0
      }

      const start = new Date(
        task.plannedStart
      )

      const finish = new Date(
        task.plannedFinish
      )

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(finish.getTime())
      ) {
        return 0
      }

      if (now >= finish) {
        return 100
      }

      if (now <= start) {
        return 0
      }

      const duration =
        finish.getTime() -
        start.getTime()

      if (duration <= 0) {
        return now >= finish ? 100 : 0
      }

      const elapsed =
        now.getTime() -
        start.getTime()

      return Math.max(
        0,
        Math.min(
          100,
          (elapsed / duration) * 100
        )
      )
    })

  const totalWeight =
    state.schedule.reduce(
      (sum, task) =>
        sum + numberValue(task.weight),
      0
    )

  if (totalWeight > 0) {
    const weightedPlanned =
      plannedValues.reduce(
        (sum, planned, index) =>
          sum +
          planned *
            numberValue(
              state.schedule[index].weight
            ),
        0
      )

    return Math.round(
      weightedPlanned / totalWeight
    )
  }

  return Math.round(
    plannedValues.reduce(
      (sum, value) => sum + value,
      0
    ) / plannedValues.length
  )
}

function calculateCommercial(
  state: V6ProjectState
) {
  const items = state.commercial || []

  const contractSum = items
    .filter(item => {
      const type = normalizeText(
        item.type ||
          item.category ||
          item.item_type
      )

      return (
        type === 'contract sum' ||
        type === 'contract_sum' ||
        type === 'original contract sum'
      )
    })
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.amount ||
            item.value ||
            item.contract_sum
        ),
      0
    )

  const approvedVariations = items
    .filter(item => {
      const type = normalizeText(
        item.type ||
          item.category ||
          item.item_type
      )

      return (
        type.includes('variation') &&
        isApprovedStatus(item.status)
      )
    })
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.amount ||
            item.value
        ),
      0
    )

  const pendingVariations = items
    .filter(item => {
      const type = normalizeText(
        item.type ||
          item.category ||
          item.item_type
      )

      return (
        type.includes('variation') &&
        !isApprovedStatus(item.status) &&
        !isClosedStatus(item.status)
      )
    })
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.amount ||
            item.value
        ),
      0
    )

  const paidToDate = items
    .filter(item => {
      const type = normalizeText(
        item.type ||
          item.category ||
          item.item_type
      )

      const status = normalizeStatus(
        item.status
      )

      return (
        type.includes('payment') &&
        [
          'paid',
          'completed',
          'settled',
        ].includes(status)
      )
    })
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.amount ||
            item.value
        ),
      0
    )

  const pendingPayments = items
    .filter(item => {
      const type = normalizeText(
        item.type ||
          item.category ||
          item.item_type
      )

      return (
        type.includes('payment') &&
        ![
          'paid',
          'completed',
          'settled',
          'cancelled',
          'canceled',
        ].includes(
          normalizeStatus(item.status)
        )
      )
    })
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.amount ||
            item.value
        ),
      0
    )

  return {
    contractSum,
    approvedVariations,
    pendingVariations,
    paidToDate,
    pendingPayments,
    projectedFinalCost:
      contractSum +
      approvedVariations +
      pendingVariations,
  }
}

export function adaptV6StateToLegacy(
  state: V6ProjectState
): LegacyProjectState {
  const weightedProgress =
    calculateWeightedProgress(state)

  const plannedProgress =
    calculatePlannedProgress(state)

  const overdueActivities =
    state.schedule.filter(task => {
      return (
        task.progress < 100 &&
        isPastDate(task.plannedFinish)
      )
    }).length

  const completedActivities =
    state.schedule.filter(
      task => task.progress >= 100
    ).length

  const pendingApprovals =
    state.approvals.filter(
      item =>
        !isApprovedStatus(item.status) &&
        !isClosedStatus(item.status)
    )

  const overdueApprovals =
    pendingApprovals.filter(item =>
      isPastDate(
        item.deadline ||
          item.due_date ||
          item.approval_deadline
      )
    )

  const approvedApprovals =
    state.approvals.filter(item =>
      isApprovedStatus(item.status)
    )

  const openProcurement =
    state.procurement.filter(
      item =>
        !isDeliveredStatus(item.status)
    )

  const overdueProcurement =
    openProcurement.filter(item =>
      isPastDate(
        item.required_date ||
          item.due_date ||
          item.expected_delivery_date
      )
    )

  const atRiskProcurement =
    openProcurement.filter(item => {
      const status = normalizeStatus(
        item.status
      )

      return (
        status.includes('risk') ||
        status.includes('delay') ||
        status.includes('overdue') ||
        isPastDate(
          item.required_date ||
            item.due_date ||
            item.order_by_date
        )
      )
    })

  const completedProcurement =
    state.procurement.filter(item =>
      isDeliveredStatus(item.status)
    )

  const openRisks =
    state.risks.filter(
      item =>
        ![
          'closed',
          'resolved',
          'mitigated',
          'cancelled',
          'canceled',
        ].includes(
          normalizeStatus(item.status)
        )
    )

  const highRisks =
    openRisks.filter(item => {
      const rating = normalizeText(
        item.rating ||
          item.risk_rating ||
          item.level
      )

      const score = numberValue(
        item.risk_score ||
          item.score
      )

      return (
        rating === 'high' ||
        rating === 'critical' ||
        score >= 12
      )
    })

  const unmitigatedHighRisks =
    highRisks.filter(
      item =>
        !item.mitigation &&
        !item.mitigation_action &&
        !item.response_action
    )

  const openSnags =
    state.quality.filter(
      item =>
        ![
          'closed',
          'resolved',
          'completed',
          'verified',
        ].includes(
          normalizeStatus(item.status)
        )
    )

  const criticalSnags =
    openSnags.filter(item => {
      const severity = normalizeText(
        item.severity ||
          item.priority ||
          item.rating
      )

      return (
        severity === 'critical' ||
        severity === 'high'
      )
    })

  const closedSnags =
    state.quality.length -
    openSnags.length

  const failedInspections =
    state.quality.filter(item => {
      const status = normalizeStatus(
        item.status
      )

      return [
        'failed',
        'rejected',
        'not approved',
      ].includes(status)
    }).length

  const overdueInspections =
    state.quality.filter(item => {
      const status = normalizeStatus(
        item.status
      )

      return (
        ![
          'closed',
          'resolved',
          'completed',
          'approved',
        ].includes(status) &&
        isPastDate(item.due_date)
      )
    }).length

  const commercial =
    calculateCommercial(state)

  return {
    project: {
      id: state.project.id,
      name: state.project.name,
      organizationId:
        state.project.organizationId,
      portfolioId:
        state.project.portfolioId,
      scope: state.project.scope,
      startDate:
        state.project.startDate,
      targetDate:
        state.project.targetDate,
      handoverDate:
        state.project.handoverDate,
      status:
        state.project.status,
    },

    schedule: {
      activities: state.schedule.map(
        task => ({
          id: task.id,
          taskNumber:
            task.taskNumber,
          name: task.name,
          discipline:
            task.discipline,
          phase: task.phase,
          status: task.status,
          progress:
            numberValue(task.progress),
          weight:
            numberValue(task.weight),
          plannedStart:
            task.plannedStart,
          plannedFinish:
            task.plannedFinish,
          actualStart:
            task.actualStart,
          actualFinish:
            task.actualFinish,
          predecessorIds:
            task.predecessorIds,
          isCritical:
            task.isCritical,
          isBlocked:
            task.isBlocked,
          delayReason: null,
          recoveryAction: null,
          progressComment: null,
          updatedAt:
            task.updatedAt,
          deliveryPackageId: null,
          deliveryPackageName: null,
        })
      ),

      totalActivities:
        state.schedule.length,

      completedActivities,

      overdueActivities,

      weightedProgress,

      plannedProgress,

      variancePercent:
        weightedProgress -
        plannedProgress,

      startDate:
        state.project.startDate,

      finishDate:
        state.project.handoverDate ||
        state.project.targetDate,

      lastUpdatedAt:
        latestScheduleUpdate(state),

      packages: [],
    },

    commercial,

    quality: {
      openSnags:
        openSnags.length,

      criticalSnags:
        criticalSnags.length,

      closedSnags,

      failedInspections,

      overdueInspections,
    },

    risk: {
      openRisks:
        openRisks.length,

      highRisks:
        highRisks.length,

      unmitigatedHighRisks:
        unmitigatedHighRisks.length,
    },

    approvals: {
      pendingApprovals:
        pendingApprovals.length,

      overdueApprovals:
        overdueApprovals.length,

      approvedApprovals:
        approvedApprovals.length,
    },

    procurement: {
      atRiskItems:
        atRiskProcurement.length,

      overdueItems:
        overdueProcurement.length,

      completedItems:
        completedProcurement.length,

      totalItems:
        state.procurement.length,
    },

    hse: {
      incidents:
        numberValue(
          state.hse.incidents
        ),

      openActions:
        numberValue(
          state.hse.openActions
        ),

      overdueActions:
        numberValue(
          state.hse.overdueActions
        ),
    },

    reports: {
      weeklyReportSubmitted:
        Boolean(
          state.reports
            .latestWeeklyReport
        ),

      costReportSubmitted:
        Boolean(
          state.reports
            .latestCostReport
        ),

      designReportSubmitted:
        Boolean(
          state.reports
            .latestDesignReport
        ),
    },

    documents: {
      awaitingReview:
        numberValue(
          state.documents
            .awaitingReview
        ),

      approved:
        numberValue(
          state.documents.approved
        ),

      uploadedThisWeek:
        numberValue(
          state.documents
            .uploadedThisWeek
        ),
    },

    generatedAt:
      state.generatedAt,
  }
}

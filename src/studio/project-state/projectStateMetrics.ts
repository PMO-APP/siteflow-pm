import type { ProjectState } from '@/platform/project-state'
import type {
  InspectorMetric,
  ProjectStateSection,
} from './types'

function normalise(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isPast(value: unknown) {
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

function isClosed(value: unknown) {
  return [
    'closed',
    'completed',
    'resolved',
    'cancelled',
    'canceled',
    'verified',
  ].includes(normalise(value))
}

function isApproved(value: unknown) {
  return [
    'approved',
    'completed',
    'closed',
  ].includes(normalise(value))
}

function isDelivered(value: unknown) {
  return [
    'delivered',
    'installed',
    'completed',
    'closed',
    'cancelled',
    'canceled',
  ].includes(normalise(value))
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
}

function calculateSchedule(state: ProjectState) {
  const totalActivities = state.schedule.length

  const completedActivities = state.schedule.filter(
    task => toNumber(task.progress) >= 100
  ).length

  const overdueActivities = state.schedule.filter(
    task =>
      toNumber(task.progress) < 100 &&
      isPast(task.plannedFinish)
  ).length

  const totalWeight = state.schedule.reduce(
    (sum, task) => sum + toNumber(task.weight),
    0
  )

  const weightedProgress =
    totalActivities === 0
      ? 0
      : totalWeight > 0
      ? Math.round(
          state.schedule.reduce(
            (sum, task) =>
              sum +
              toNumber(task.progress) *
                toNumber(task.weight),
            0
          ) / totalWeight
        )
      : Math.round(
          state.schedule.reduce(
            (sum, task) =>
              sum + toNumber(task.progress),
            0
          ) / totalActivities
        )

  const plannedValues = state.schedule.map(task => {
    if (!task.plannedStart || !task.plannedFinish) {
      return 0
    }

    const start = new Date(task.plannedStart)
    const finish = new Date(task.plannedFinish)
    const now = new Date()

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(finish.getTime())
    ) {
      return 0
    }

    if (now >= finish) return 100
    if (now <= start) return 0

    const duration = finish.getTime() - start.getTime()

    if (duration <= 0) {
      return now >= finish ? 100 : 0
    }

    return Math.max(
      0,
      Math.min(
        100,
        ((now.getTime() - start.getTime()) /
          duration) *
          100
      )
    )
  })

  const plannedProgress =
    totalActivities === 0
      ? 0
      : totalWeight > 0
      ? Math.round(
          plannedValues.reduce(
            (sum, planned, index) =>
              sum +
              planned *
                toNumber(
                  state.schedule[index].weight
                ),
            0
          ) / totalWeight
        )
      : Math.round(
          plannedValues.reduce(
            (sum, value) => sum + value,
            0
          ) / totalActivities
        )

  return {
    totalActivities,
    completedActivities,
    overdueActivities,
    weightedProgress,
    plannedProgress,
    variance:
      weightedProgress - plannedProgress,
  }
}

function calculateCommercial(state: ProjectState) {
  const items = state.commercial as any[]

  const byType = (
    typeMatcher: (type: string) => boolean,
    statusMatcher?: (status: string) => boolean
  ) =>
    items
      .filter(item => {
        const type = normalise(
          item.type ||
            item.category ||
            item.item_type
        )

        const status = normalise(item.status)

        return (
          typeMatcher(type) &&
          (!statusMatcher ||
            statusMatcher(status))
        )
      })
      .reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.amount ||
              item.value ||
              item.contract_sum
          ),
        0
      )

  const contractSum = byType(
    type =>
      type === 'contract sum' ||
      type === 'contract_sum' ||
      type === 'original contract sum'
  )

  const approvedVariations = byType(
    type => type.includes('variation'),
    status =>
      ['approved', 'completed', 'closed'].includes(status)
  )

  const pendingVariations = byType(
    type => type.includes('variation'),
    status =>
      ![
        'approved',
        'completed',
        'closed',
        'rejected',
        'cancelled',
        'canceled',
      ].includes(status)
  )

  const paidToDate = byType(
    type => type.includes('payment'),
    status =>
      ['paid', 'completed', 'settled'].includes(status)
  )

  const pendingPayments = byType(
    type => type.includes('payment'),
    status =>
      ![
        'paid',
        'completed',
        'settled',
        'cancelled',
        'canceled',
      ].includes(status)
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

export function buildProjectStateSections(
  state: ProjectState
): ProjectStateSection[] {
  const schedule = calculateSchedule(state)
  const commercial = calculateCommercial(state)

  const openSnags = (state.quality as any[]).filter(
    item => !isClosed(item.status)
  )

  const criticalSnags = openSnags.filter(item =>
    ['critical', 'high'].includes(
      normalise(
        item.severity ||
          item.priority ||
          item.rating
      )
    )
  )

  const failedInspections = (state.quality as any[]).filter(
    item =>
      ['failed', 'rejected', 'not approved'].includes(
        normalise(item.status)
      )
  )

  const overdueInspections = (state.quality as any[]).filter(
    item =>
      !isClosed(item.status) &&
      isPast(item.due_date)
  )

  const openRisks = (state.risks as any[]).filter(
    item =>
      ![
        'closed',
        'resolved',
        'mitigated',
        'cancelled',
        'canceled',
      ].includes(normalise(item.status))
  )

  const highRisks = openRisks.filter(item => {
    const rating = normalise(
      item.rating ||
        item.risk_rating ||
        item.level
    )

    const score = toNumber(
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

  const pendingApprovals = (state.approvals as any[]).filter(
    item =>
      !isApproved(item.status) &&
      !isClosed(item.status)
  )

  const overdueApprovals = pendingApprovals.filter(item =>
    isPast(
      item.deadline ||
        item.due_date ||
        item.approval_deadline
    )
  )

  const approvedApprovals = (state.approvals as any[]).filter(
    item => isApproved(item.status)
  )

  const openProcurement = (state.procurement as any[]).filter(
    item => !isDelivered(item.status)
  )

  const overdueProcurement = openProcurement.filter(item =>
    isPast(
      item.required_date ||
        item.due_date ||
        item.expected_delivery_date
    )
  )

  const atRiskProcurement = openProcurement.filter(item => {
    const status = normalise(item.status)

    return (
      status.includes('risk') ||
      status.includes('delay') ||
      status.includes('overdue') ||
      isPast(
        item.required_date ||
          item.due_date ||
          item.order_by_date
      )
    )
  })

  const completedProcurement = (state.procurement as any[]).filter(
    item => isDelivered(item.status)
  )

  const reportStatus = (
    value: unknown
  ): InspectorMetric['tone'] =>
    value ? 'success' : 'warning'

  return [
    {
      id: 'project',
      label: 'Project',
      description:
        'Project identity, status, scope and key dates.',
      count: 1,
      metrics: [
        {
          label: 'Project Name',
          value: state.project.name,
        },
        {
          label: 'Status',
          value: state.project.status || 'Not set',
        },
        {
          label: 'Scope',
          value: state.project.scope || 'Not set',
        },
        {
          label: 'Start Date',
          value: formatDate(state.project.startDate),
        },
        {
          label: 'Target Date',
          value: formatDate(state.project.targetDate),
        },
        {
          label: 'Handover Date',
          value: formatDate(state.project.handoverDate),
        },
        {
          label: 'Organization ID',
          value:
            state.project.organizationId || 'Not set',
        },
        {
          label: 'Portfolio ID',
          value:
            state.project.portfolioId || 'Not set',
        },
      ],
      rawData: state.project,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      description:
        'Activities, completion, overdue work and progress position.',
      count: schedule.totalActivities,
      metrics: [
        {
          label: 'Activities',
          value: schedule.totalActivities,
        },
        {
          label: 'Completed',
          value: schedule.completedActivities,
          tone: 'success',
        },
        {
          label: 'Overdue',
          value: schedule.overdueActivities,
          tone:
            schedule.overdueActivities > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Weighted Progress',
          value: `${schedule.weightedProgress}%`,
        },
        {
          label: 'Planned Progress',
          value: `${schedule.plannedProgress}%`,
        },
        {
          label: 'Variance',
          value: `${
            schedule.variance > 0 ? '+' : ''
          }${schedule.variance}%`,
          tone:
            schedule.variance >= 0
              ? 'success'
              : 'danger',
        },
      ],
      rawData: state.schedule,
    },
    {
      id: 'commercial',
      label: 'Commercial',
      description:
        'Contract sum, variations, payments and forecast cost.',
      count: state.commercial.length,
      metrics: [
        {
          label: 'Contract Sum',
          value: formatCurrency(
            commercial.contractSum
          ),
        },
        {
          label: 'Approved Variations',
          value: formatCurrency(
            commercial.approvedVariations
          ),
        },
        {
          label: 'Pending Variations',
          value: formatCurrency(
            commercial.pendingVariations
          ),
          tone:
            commercial.pendingVariations > 0
              ? 'warning'
              : 'neutral',
        },
        {
          label: 'Paid To Date',
          value: formatCurrency(
            commercial.paidToDate
          ),
        },
        {
          label: 'Pending Payments',
          value: formatCurrency(
            commercial.pendingPayments
          ),
          tone:
            commercial.pendingPayments > 0
              ? 'warning'
              : 'neutral',
        },
        {
          label: 'Projected Final Cost',
          value: formatCurrency(
            commercial.projectedFinalCost
          ),
        },
      ],
      rawData: state.commercial,
    },
    {
      id: 'quality',
      label: 'Quality',
      description:
        'Snags, inspections and critical quality exceptions.',
      count: openSnags.length,
      metrics: [
        {
          label: 'Open Snags',
          value: openSnags.length,
          tone:
            openSnags.length > 0
              ? 'warning'
              : 'success',
        },
        {
          label: 'Critical Snags',
          value: criticalSnags.length,
          tone:
            criticalSnags.length > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Closed Snags',
          value:
            state.quality.length -
            openSnags.length,
          tone: 'success',
        },
        {
          label: 'Failed Inspections',
          value: failedInspections.length,
          tone:
            failedInspections.length > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Overdue Inspections',
          value: overdueInspections.length,
          tone:
            overdueInspections.length > 0
              ? 'warning'
              : 'success',
        },
      ],
      rawData: state.quality,
    },
    {
      id: 'risk',
      label: 'Risk',
      description:
        'Open risks, high risks and mitigation coverage.',
      count: openRisks.length,
      metrics: [
        {
          label: 'Open Risks',
          value: openRisks.length,
        },
        {
          label: 'High Risks',
          value: highRisks.length,
          tone:
            highRisks.length > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Unmitigated High Risks',
          value: unmitigatedHighRisks.length,
          tone:
            unmitigatedHighRisks.length > 0
              ? 'danger'
              : 'success',
        },
      ],
      rawData: state.risk,
    },
    {
      id: 'approvals',
      label: 'Approvals',
      description:
        'Pending, overdue and approved reviews.',
      count: pendingApprovals.length,
      metrics: [
        {
          label: 'Pending',
          value: pendingApprovals.length,
          tone:
            pendingApprovals.length > 0
              ? 'warning'
              : 'success',
        },
        {
          label: 'Overdue',
          value: overdueApprovals.length,
          tone:
            overdueApprovals.length > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Approved',
          value: approvedApprovals.length,
          tone: 'success',
        },
      ],
      rawData: state.approvals,
    },
    {
      id: 'procurement',
      label: 'Procurement',
      description:
        'At-risk, overdue and completed procurement items.',
      count: state.procurement.length,
      metrics: [
        {
          label: 'At Risk',
          value: atRiskProcurement.length,
          tone:
            atRiskProcurement.length > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Overdue',
          value: overdueProcurement.length,
          tone:
            overdueProcurement.length > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Completed',
          value: completedProcurement.length,
          tone: 'success',
        },
        {
          label: 'Total Items',
          value: state.procurement.length,
        },
      ],
      rawData: state.procurement,
    },
    {
      id: 'hse',
      label: 'HSE',
      description:
        'Incidents, open actions and overdue actions.',
      count: state.hse.openActions,
      metrics: [
        {
          label: 'Incidents',
          value: state.hse.incidents,
          tone:
            state.hse.incidents > 0
              ? 'danger'
              : 'success',
        },
        {
          label: 'Open Actions',
          value: state.hse.openActions,
          tone:
            state.hse.openActions > 0
              ? 'warning'
              : 'success',
        },
        {
          label: 'Overdue Actions',
          value: state.hse.overdueActions,
          tone:
            state.hse.overdueActions > 0
              ? 'danger'
              : 'success',
        },
      ],
      rawData: state.hse,
    },
    {
      id: 'reports',
      label: 'Reports',
      description:
        'Weekly, cost and design report submission status.',
      count: [
        state.reports.latestWeeklyReport,
        state.reports.latestCostReport,
        state.reports.latestDesignReport,
      ].filter(Boolean).length,
      metrics: [
        {
          label: 'Weekly Report',
          value: state.reports.latestWeeklyReport
            ? 'Submitted'
            : 'Missing',
          tone: reportStatus(
            state.reports.latestWeeklyReport
          ),
        },
        {
          label: 'Cost Report',
          value: state.reports.latestCostReport
            ? 'Submitted'
            : 'Missing',
          tone: reportStatus(
            state.reports.latestCostReport
          ),
        },
        {
          label: 'Design Report',
          value: state.reports.latestDesignReport
            ? 'Submitted'
            : 'Missing',
          tone: reportStatus(
            state.reports.latestDesignReport
          ),
        },
      ],
      rawData: state.reports,
    },
    {
      id: 'documents',
      label: 'Documents',
      description:
        'Documents awaiting review, approved and uploaded this week.',
      count:
        state.documents.awaitingReview +
        state.documents.approved,
      metrics: [
        {
          label: 'Awaiting Review',
          value:
            state.documents.awaitingReview,
          tone:
            state.documents.awaitingReview > 0
              ? 'warning'
              : 'success',
        },
        {
          label: 'Approved',
          value: state.documents.approved,
          tone: 'success',
        },
        {
          label: 'Uploaded This Week',
          value:
            state.documents.uploadedThisWeek,
        },
      ],
      rawData: state.documents,
    },
  ]
}

import { differenceInDays } from 'date-fns'
import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import { isPast, toDate, toISO } from './dateUtils'
import { calculateProjectProgress, taskProgress } from '@/core/metrics/progressMetrics'

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function id(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

function progress(task: any) {
  return taskProgress(task)
}

function predecessors(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(id).filter(Boolean)
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

export function normalizeProjectState({
  project,
  tasks = [],
  deliveryPackages = [],
  financial = [],
  snags = [],
  risks = [],
  approvals = [],
  procurement = [],
  latestWeeklyReport,
  latestCostReport,
  latestDesignReport,
  documents = {},
  hse = {},
  inspections = [],
  today = new Date(),
}: {
  project?: any
  tasks?: any[]
  deliveryPackages?: any[]
  financial?: any[]
  snags?: any[]
  risks?: any[]
  approvals?: any[]
  procurement?: any[]
  latestWeeklyReport?: any
  latestCostReport?: any
  latestDesignReport?: any
  documents?: any
  hse?: any
  inspections?: any[]
  today?: Date
}): ProjectState {
  const packageMap = new Map(deliveryPackages.map((pkg: any) => [String(pkg.id), pkg]))

  const activities = tasks.map(task => {
    const packageId = task.delivery_package_id ? String(task.delivery_package_id) : null
    const deliveryPackage = packageId ? packageMap.get(packageId) : null
    return ({
    id: id(task.id),
    taskNumber: Number(task.task_number || 0),
    name: task.name || task.task_name || 'Untitled activity',
    discipline: task.discipline || null,
    phase: task.phase || task.stage || null,
    status: task.status || null,
    progress: progress(task),
    weight: Number(task.weight_pct || 0),
    plannedStart: toISO(task.planned_start || task.start_date),
    plannedFinish: toISO(task.planned_finish || task.finish_date),
    actualStart: toISO(task.actual_start),
    actualFinish: toISO(task.actual_finish),
    predecessorIds: predecessors(task.predecessor_ids || task.predecessors || task.predecessor),
    isCritical: Boolean(task.is_critical || task.critical_path || task.total_float === 0),
    isBlocked: Boolean(task.is_blocked || task.is_on_hold || task.status === 'Blocked'),
    updatedAt: toISO(task.updated_at),
    deliveryPackageId: packageId,
    deliveryPackageName: deliveryPackage?.name || task.delivery_package_name || null,
  })
  })

  const scheduleStart =
    toDate(project?.start_date) ||
    activities.map(item => toDate(item.plannedStart)).filter(Boolean).sort((a: any, b: any) => a.getTime() - b.getTime())[0] ||
    null

  const scheduleFinish =
    toDate(project?.handover_date || project?.planned_finish) ||
    activities.map(item => toDate(item.plannedFinish)).filter(Boolean).sort((a: any, b: any) => b.getTime() - a.getTime())[0] ||
    null

  const actual = calculateProjectProgress(tasks)
  const planned =
    scheduleStart && scheduleFinish
      ? clamp(Math.round(
          (differenceInDays(today, scheduleStart) /
            Math.max(1, differenceInDays(scheduleFinish, scheduleStart))) * 100
        ))
      : 0

  const openSnags = snags.filter(item => !['Closed', 'Resolved'].includes(item.status || ''))
  const criticalSnags = openSnags.filter(item =>
    item.severity === 'Critical' || item.priority === 'Critical'
  )

  const openRisks = risks.filter(item =>
    !['Closed', 'Resolved', 'Mitigated'].includes(item.status || '')
  )

  const highRisks = openRisks.filter(item =>
    Number(item.risk_score || item.score || 0) >= 12 ||
    item.rating === 'High' ||
    item.rating === 'Critical'
  )

  const pendingApprovals = approvals.filter(item =>
    !['Approved', 'Rejected', 'Closed'].includes(item.status || '')
  )

  const completeProcurementStatuses = ['Delivered', 'Installed', 'Completed', 'Cancelled']

  const atRiskItems = procurement.filter(item => {
    const due = toDate(
      item.order_by_date ||
      item.expected_delivery_date ||
      item.required_date ||
      item.due_date
    )
    return due &&
      differenceInDays(due, today) <= 14 &&
      !completeProcurementStatuses.includes(item.status || '')
  })

  const contractSum = financial
    .filter(item => item.type === 'Contract Sum')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const approvedVariations = financial
    .filter(item => item.type === 'Variation' && item.status === 'Approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const pendingVariations = financial
    .filter(item => item.type === 'Variation' && !['Approved', 'Rejected'].includes(item.status || ''))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const paidToDate = financial
    .filter(item => item.type === 'Payment' && ['Paid', 'Completed'].includes(item.status || ''))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const pendingPayments = financial
    .filter(item => item.type === 'Payment' && item.status === 'Pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return {
    project: {
      id: id(project?.id),
      name: project?.project_name || project?.name || 'Unnamed project',
      organizationId: project?.organization_id ? id(project.organization_id) : null,
      portfolioId: project?.portfolio_id ? id(project.portfolio_id) : null,
      scope: project?.project_scope || project?.scope || null,
      startDate: toISO(project?.start_date),
      targetDate: toISO(project?.planned_finish),
      handoverDate: toISO(project?.handover_date),
      status: project?.status || null,
    },
    schedule: {
      activities,
      totalActivities: activities.length,
      completedActivities: activities.filter(item => item.progress >= 100).length,
      overdueActivities: activities.filter(item => isPast(item.plannedFinish, today) && item.progress < 100).length,
      weightedProgress: actual,
      plannedProgress: planned,
      variancePercent: actual - planned,
      startDate: toISO(scheduleStart),
      finishDate: toISO(scheduleFinish),
      packages: deliveryPackages.map((pkg: any) => ({
        id: id(pkg.id),
        name: pkg.name || 'Unnamed package',
        discipline: pkg.discipline || null,
        contractorName: pkg.contractor_name || null,
        weight: Number(pkg.weight_pct || 0),
        packageType: pkg.package_type || null,
      })),
      lastUpdatedAt: activities
        .map(item => toDate(item.updatedAt))
        .filter(Boolean)
        .sort((a: any, b: any) => b.getTime() - a.getTime())[0]
        ?.toISOString() || null,
    },
    commercial: {
      contractSum,
      approvedVariations,
      pendingVariations,
      paidToDate,
      pendingPayments,
      projectedFinalCost: contractSum + approvedVariations,
    },
    quality: {
      openSnags: openSnags.length,
      criticalSnags: criticalSnags.length,
      closedSnags: snags.length - openSnags.length,
      failedInspections: inspections.filter(item =>
        item.status === 'Failed' || item.result === 'Failed'
      ).length,
      overdueInspections: inspections.filter(item =>
        isPast(item.due_date || item.inspection_date, today) &&
        !['Passed', 'Completed', 'Closed'].includes(item.status || '')
      ).length,
    },
    risk: {
      openRisks: openRisks.length,
      highRisks: highRisks.length,
      unmitigatedHighRisks: highRisks.filter(item =>
        !item.mitigation && !item.mitigation_action
      ).length,
    },
    approvals: {
      pendingApprovals: pendingApprovals.length,
      overdueApprovals: pendingApprovals.filter(item =>
        isPast(item.deadline || item.due_date || item.approval_deadline, today)
      ).length,
      approvedApprovals: approvals.filter(item => item.status === 'Approved').length,
    },
    procurement: {
      atRiskItems: atRiskItems.length,
      overdueItems: procurement.filter(item =>
        isPast(item.required_date || item.due_date, today) &&
        !completeProcurementStatuses.includes(item.status || '')
      ).length,
      completedItems: procurement.filter(item =>
        completeProcurementStatuses.includes(item.status || '')
      ).length,
      totalItems: procurement.length,
    },
    hse: {
      incidents: Number(hse.incidents || 0),
      openActions: Number(hse.openActions || 0),
      overdueActions: Number(hse.overdueActions || 0),
    },
    reports: {
      weeklyReportSubmitted: Boolean(latestWeeklyReport),
      costReportSubmitted: Boolean(latestCostReport),
      designReportSubmitted: Boolean(latestDesignReport),
    },
    documents: {
      awaitingReview: Number(documents.awaitingReview || 0),
      approved: Number(documents.approved || 0),
      uploadedThisWeek: Number(documents.uploadedThisWeek || 0),
    },
    generatedAt: today.toISOString(),
  }
}

import { useMemo } from 'react'
import { differenceInDays } from 'date-fns'

import { useTasks } from '@/hooks/useTasks'

import {
  useApprovals,
  useFinancial,
  useProcurement,
  useRisks,
  useSnags,
} from '@/hooks/useData'

import {
  calculateProjectHealth,
} from '@/core/engine/projectHealthEngine'

import {
  calculateGovernance,
} from '@/core/engine/governanceEngine'

import {
  calculateForecast,
} from '@/core/engine/forecastEngine'

function toDate(
  value?: string | Date | null
): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : date
}

function getTaskProgress(task: any) {
  if (task.status === 'Completed') {
    return 100
  }

  if (task.status === 'Not Started') {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      Number(task.progress_pct || 0)
    )
  )
}

function calculateWeightedProgress(
  tasks: any[]
) {
  if (!tasks.length) {
    return 0
  }

  const totalWeight = tasks.reduce(
    (sum, task) =>
      sum +
      Number(task.weight_pct || 0),
    0
  )

  if (totalWeight <= 0) {
    return Math.round(
      tasks.reduce(
        (sum, task) =>
          sum + getTaskProgress(task),
        0
      ) / tasks.length
    )
  }

  const earnedWeight = tasks.reduce(
    (sum, task) =>
      sum +
      Number(task.weight_pct || 0) *
        (getTaskProgress(task) / 100),
    0
  )

  return Math.round(
    (earnedWeight / totalWeight) * 100
  )
}

export type ProjectIntelligenceOptions = {
  project?: any

  latestWeeklyReport?: any
  latestCostReport?: any
  latestDesignReport?: any

  scheduleLastUpdatedAt?: string | null

  overdueInspections?: number
  overdueHSEActions?: number

  safetyIncidents?: number
  openHSEActions?: number

  failedInspections?: number

  criticalSnagsWithoutOwner?: number

  documentsAwaitingReview?: number
}

export function useProjectIntelligence(
  options: ProjectIntelligenceOptions = {}
) {
  const {
    data: taskData = [],
  } = useTasks()

  const {
    data: approvalData = [],
  } = useApprovals()

  const {
    data: procurementData = [],
  } = useProcurement()

  const {
    data: riskData = [],
  } = useRisks()

  const {
    data: snagData = [],
  } = useSnags()

  const {
    data: financialData = [],
  } = useFinancial()

  return useMemo(() => {
    const today = new Date()

    const project =
      options.project || {}

    const tasks =
      taskData as any[]

    const approvals =
      approvalData as any[]

    const procurement =
      procurementData as any[]

    const risks =
      riskData as any[]

    const snags =
      snagData as any[]

    const financial =
      financialData as any[]

    const scheduleProgress =
      calculateWeightedProgress(tasks)

    const scheduleStart =
      toDate(project.start_date) ||
      tasks
        .map(task =>
          toDate(
            task.planned_start ||
              task.start_date
          )
        )
        .filter(
          (date): date is Date =>
            Boolean(date)
        )
        .sort(
          (a, b) =>
            a.getTime() -
            b.getTime()
        )[0] ||
      null

    const lastScheduleDate =
      tasks
        .map(task =>
          toDate(
            task.planned_finish ||
              task.finish_date
          )
        )
        .filter(
          (date): date is Date =>
            Boolean(date)
        )
        .sort(
          (a, b) =>
            b.getTime() -
            a.getTime()
        )[0] ||
      null

    const targetFinish =
      toDate(project.handover_date) ||
      toDate(project.planned_finish) ||
      lastScheduleDate

    const plannedProgress =
      scheduleStart && targetFinish
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (
                  differenceInDays(
                    today,
                    scheduleStart
                  ) /
                  Math.max(
                    1,
                    differenceInDays(
                      targetFinish,
                      scheduleStart
                    )
                  )
                ) * 100
              )
            )
          )
        : 0

    const overdueTasks =
      tasks.filter(task => {
        const plannedFinish =
          toDate(
            task.planned_finish ||
              task.finish_date
          )

        return (
          plannedFinish &&
          plannedFinish < today &&
          getTaskProgress(task) < 100
        )
      })

    const pendingApprovals =
      approvals.filter(item => {
        return ![
          'Approved',
          'Rejected',
          'Closed',
        ].includes(item.status || '')
      })

    const overdueApprovals =
      pendingApprovals.filter(item => {
        const deadline =
          toDate(
            item.deadline ||
              item.due_date ||
              item.approval_deadline
          )

        return (
          deadline &&
          deadline < today
        )
      })

    const openSnags =
      snags.filter(item => {
        return ![
          'Closed',
          'Resolved',
        ].includes(item.status || '')
      })

    const criticalSnags =
      openSnags.filter(item => {
        return (
          item.severity === 'Critical' ||
          item.priority === 'Critical'
        )
      })

    const openRisks =
      risks.filter(item => {
        return ![
          'Closed',
          'Resolved',
          'Mitigated',
        ].includes(item.status || '')
      })

    const highRisks =
      openRisks.filter(item => {
        const riskScore =
          Number(
            item.risk_score ||
              item.score ||
              0
          )

        return (
          riskScore >= 12 ||
          item.rating === 'High' ||
          item.rating === 'Critical'
        )
      })

    const procurementRisks =
      procurement.filter(item => {
        const dueDate =
          toDate(
            item.order_by_date ||
              item.expected_delivery_date ||
              item.required_date ||
              item.due_date
          )

        const completeStatuses = [
          'Delivered',
          'Installed',
          'Completed',
          'Cancelled',
        ]

        return (
          dueDate &&
          differenceInDays(
            dueDate,
            today
          ) <= 14 &&
          !completeStatuses.includes(
            item.status || ''
          )
        )
      })

    const contractSum =
      financial
        .filter(
          item =>
            item.type ===
            'Contract Sum'
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        )

    const approvedVariations =
      financial
        .filter(
          item =>
            item.type ===
              'Variation' &&
            item.status ===
              'Approved'
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        )

    const projectedFinalCost =
      contractSum +
      approvedVariations

    const pendingPayments =
      financial
        .filter(
          item =>
            item.type ===
              'Payment' &&
            item.status ===
              'Pending'
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        )

    const weeklyReportDeadlinePassed =
      today.getDay() === 5 &&
      today.getHours() >= 12

    const governance =
      calculateGovernance({
        scheduleLastUpdatedAt:
          options.scheduleLastUpdatedAt ||
          null,

        weeklyReportSubmitted:
          Boolean(
            options.latestWeeklyReport
          ),

        weeklyReportDeadlinePassed,

        costReportSubmitted:
          Boolean(
            options.latestCostReport
          ),

        designReportSubmitted:
          Boolean(
            options.latestDesignReport
          ),

        overdueApprovals:
          overdueApprovals.length,

        highRisksWithoutMitigation:
          highRisks.filter(
            risk =>
              !risk.mitigation &&
              !risk.mitigation_action
          ).length,

        overdueInspections:
          options.overdueInspections ||
          0,

        overdueHSEActions:
          options.overdueHSEActions ||
          0,

        criticalSnagsWithoutOwner:
          options
            .criticalSnagsWithoutOwner ||
          0,

        documentsAwaitingReview:
          options
            .documentsAwaitingReview ||
          0,
      })

    const health =
      calculateProjectHealth({
        scheduleProgress,
        plannedProgress,

        overdueTasks:
          overdueTasks.length,

        totalTasks:
          tasks.length,

        contractSum,

        projectedFinalCost,

        pendingPayments,

        openSnags:
          openSnags.length,

        criticalSnags:
          criticalSnags.length,

        failedInspections:
          options.failedInspections ||
          0,

        openRisks:
          openRisks.length,

        highRisks:
          highRisks.length,

        safetyIncidents:
          options.safetyIncidents ||
          0,

        openHSEActions:
          options.openHSEActions ||
          0,

        pendingApprovals:
          pendingApprovals.length,

        overdueApprovals:
          overdueApprovals.length,

        procurementRisks:
          procurementRisks.length,

        procurementItems:
          procurement.length,

        governanceScore:
          governance.score,
      })

    const forecast =
      calculateForecast({
        tasks,

        targetDate:
          project.handover_date ||
          project.planned_finish ||
          targetFinish,

        today,
      })

    return {
      project,

      health,

      forecast,

      governance,

      metrics: {
        scheduleProgress,

        plannedProgress,

        progressVariance:
          scheduleProgress -
          plannedProgress,

        overdueTasks:
          overdueTasks.length,

        pendingApprovals:
          pendingApprovals.length,

        overdueApprovals:
          overdueApprovals.length,

        openSnags:
          openSnags.length,

        criticalSnags:
          criticalSnags.length,

        openRisks:
          openRisks.length,

        highRisks:
          highRisks.length,

        procurementRisks:
          procurementRisks.length,

        contractSum,

        projectedFinalCost,

        pendingPayments,
      },
    }
  }, [
    taskData,
    approvalData,
    procurementData,
    riskData,
    snagData,
    financialData,

    options.project,

    options.latestWeeklyReport,

    options.latestCostReport,

    options.latestDesignReport,

    options.scheduleLastUpdatedAt,

    options.overdueInspections,

    options.overdueHSEActions,

    options.safetyIncidents,

    options.openHSEActions,

    options.failedInspections,

    options.criticalSnagsWithoutOwner,

    options.documentsAwaitingReview,
  ])
}

import type { GovernanceException, GovernanceResult } from './types'

export type GovernanceInput = {
  scheduleLastUpdatedAt?: string | null
  weeklyReportSubmitted?: boolean
  weeklyReportDeadlinePassed?: boolean
  costReportSubmitted?: boolean
  designReportSubmitted?: boolean
  overdueApprovals: number
  highRisksWithoutMitigation?: number
  overdueInspections?: number
  overdueHSEActions?: number
  criticalSnagsWithoutOwner?: number
  documentsAwaitingReview?: number
}

function daysSince(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

export function calculateGovernance(input: GovernanceInput): GovernanceResult {
  const exceptions: GovernanceException[] = []
  let score = 100
  const add = (
    penalty: number,
    item: GovernanceException
  ) => {
    score -= penalty
    exceptions.push(item)
  }

  const scheduleAge = daysSince(input.scheduleLastUpdatedAt)

  if (scheduleAge === null || scheduleAge > 14) {
    add(15, {
      id: 'schedule-stale',
      code: 'SCHEDULE_STALE',
      title: 'Schedule update overdue',
      description:
        scheduleAge === null
          ? 'No valid schedule update date was found.'
          : `The programme has not been updated for ${scheduleAge} days.`,
      severity: 'critical',
      module: 'schedule',
      route: '/app/schedule',
    })
  } else if (scheduleAge > 7) {
    add(7, {
      id: 'schedule-aging',
      code: 'SCHEDULE_AGING',
      title: 'Schedule becoming stale',
      description: `The last programme update was ${scheduleAge} days ago.`,
      severity: 'warning',
      module: 'schedule',
      route: '/app/schedule',
    })
  }

  if (input.weeklyReportDeadlinePassed && !input.weeklyReportSubmitted) {
    add(12, {
      id: 'weekly-report-missing',
      code: 'WEEKLY_REPORT_MISSING',
      title: 'Weekly report not submitted',
      description: 'The reporting deadline passed without a submitted report.',
      severity: 'critical',
      module: 'reports',
      route: '/app/reports',
    })
  }

  if (!input.costReportSubmitted) {
    add(6, {
      id: 'cost-report-missing',
      code: 'COST_REPORT_MISSING',
      title: 'Cost report missing',
      description: 'No current cost report was found for the reporting period.',
      severity: 'warning',
      module: 'cost',
      route: '/app/costing',
    })
  }

  if (!input.designReportSubmitted) {
    add(5, {
      id: 'design-report-missing',
      code: 'DESIGN_REPORT_MISSING',
      title: 'Design report missing',
      description: 'No current design report was found for the reporting period.',
      severity: 'warning',
      module: 'reports',
      route: '/app/design-reports',
    })
  }

  if (input.overdueApprovals > 0) {
    add(Math.min(15, input.overdueApprovals * 3), {
      id: 'approvals-overdue',
      code: 'APPROVALS_OVERDUE',
      title: 'Approvals overdue',
      description: `${input.overdueApprovals} approval item(s) exceeded their deadline.`,
      severity: input.overdueApprovals >= 3 ? 'critical' : 'warning',
      module: 'approvals',
      route: '/app/approvals',
    })
  }

  const optionalRules = [
    {
      count: Number(input.highRisksWithoutMitigation || 0),
      penalty: 4,
      max: 12,
      item: {
        id: 'risk-mitigation-missing',
        code: 'RISK_MITIGATION_MISSING',
        title: 'High risks lack mitigation',
        severity: 'critical' as const,
        module: 'risk',
        route: '/app/risk',
      },
    },
    {
      count: Number(input.overdueInspections || 0),
      penalty: 3,
      max: 10,
      item: {
        id: 'inspections-overdue',
        code: 'INSPECTIONS_OVERDUE',
        title: 'Quality inspections overdue',
        severity: 'warning' as const,
        module: 'quality',
        route: '/app/quality',
      },
    },
    {
      count: Number(input.overdueHSEActions || 0),
      penalty: 3,
      max: 10,
      item: {
        id: 'hse-actions-overdue',
        code: 'HSE_ACTIONS_OVERDUE',
        title: 'HSE actions overdue',
        severity: 'critical' as const,
        module: 'hse',
        route: '/app/hse',
      },
    },
  ]

  optionalRules.forEach(rule => {
    if (rule.count > 0) {
      add(Math.min(rule.max, rule.count * rule.penalty), {
        ...rule.item,
        description: `${rule.count} item(s) require action.`,
      })
    }
  })

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))

  return {
    score: finalScore,
    complianceLabel:
      finalScore >= 90
        ? 'Strong'
        : finalScore >= 75
        ? 'Acceptable'
        : finalScore >= 55
        ? 'Weak'
        : 'Critical',
    exceptions,
    calculatedAt: new Date().toISOString(),
  }
}

import type {
  FocusItem,
  TodayFocusResult,
} from './focusTypes'

type TodayFocusInput = {
  overdueTasks: number
  overdueApprovals: number
  criticalSnags: number
  highRisks: number
  procurementRisks: number
  governanceExceptions: Array<{
    id: string
    title: string
    description: string
    severity: 'info' | 'warning' | 'critical'
    route?: string
  }>
  forecastDaysBehind: number
  scheduleProgress: number
  plannedProgress: number
}

function add(
  items: FocusItem[],
  item: FocusItem
) {
  items.push(item)
}

export function calculateTodayFocus(
  input: TodayFocusInput
): TodayFocusResult {
  const items: FocusItem[] = []

  if (input.forecastDaysBehind > 0) {
    add(items, {
      id: 'forecast-delay',
      title: `Recovery action required for ${input.forecastDaysBehind} day delay`,
      description:
        'Review the current workfront, blockers and recovery sequence before further slippage occurs.',
      category: 'schedule',
      severity:
        input.forecastDaysBehind > 30
          ? 'critical'
          : 'warning',
      priority:
        100 + Math.min(50, input.forecastDaysBehind),
      route: '/app/recovery',
      dueLabel: 'Today',
    })
  }

  const progressGap =
    input.plannedProgress -
    input.scheduleProgress

  if (progressGap > 0) {
    add(items, {
      id: 'progress-gap',
      title: `${progressGap}% progress gap requires review`,
      description:
        'Actual progress is behind the planned position for today.',
      category: 'schedule',
      severity:
        progressGap >= 15
          ? 'critical'
          : 'warning',
      priority:
        85 + Math.min(20, progressGap),
      route: '/app/schedule',
      dueLabel: 'Today',
    })
  }

  if (input.overdueApprovals > 0) {
    add(items, {
      id: 'overdue-approvals',
      title: `${input.overdueApprovals} overdue approval${input.overdueApprovals === 1 ? '' : 's'}`,
      description:
        'Resolve overdue reviews to prevent design, procurement or site delays.',
      category: 'approval',
      severity:
        input.overdueApprovals >= 3
          ? 'critical'
          : 'warning',
      priority:
        90 + input.overdueApprovals,
      route: '/app/approvals',
      dueLabel: 'Overdue',
    })
  }

  if (input.criticalSnags > 0) {
    add(items, {
      id: 'critical-snags',
      title: `${input.criticalSnags} critical snag${input.criticalSnags === 1 ? '' : 's'} remain open`,
      description:
        'Assign owners and closure dates to critical quality issues.',
      category: 'quality',
      severity: 'critical',
      priority:
        95 + input.criticalSnags,
      route: '/app/snags',
      dueLabel: 'Immediate',
    })
  }

  if (input.highRisks > 0) {
    add(items, {
      id: 'high-risks',
      title: `${input.highRisks} high risk${input.highRisks === 1 ? '' : 's'} require mitigation`,
      description:
        'Confirm mitigation owners, deadlines and escalation requirements.',
      category: 'risk',
      severity: 'critical',
      priority:
        92 + input.highRisks,
      route: '/app/risk',
      dueLabel: 'Today',
    })
  }

  if (input.procurementRisks > 0) {
    add(items, {
      id: 'procurement-risks',
      title: `${input.procurementRisks} procurement item${input.procurementRisks === 1 ? '' : 's'} threaten delivery`,
      description:
        'Review order dates, delivery commitments and critical material dependencies.',
      category: 'procurement',
      severity:
        input.procurementRisks >= 3
          ? 'critical'
          : 'warning',
      priority:
        80 + input.procurementRisks,
      route: '/app/procurement',
      dueLabel: 'This week',
    })
  }

  input.governanceExceptions
    .slice(0, 4)
    .forEach(exception => {
      add(items, {
        id: `governance-${exception.id}`,
        title: exception.title,
        description: exception.description,
        category: 'governance',
        severity: exception.severity,
        priority:
          exception.severity === 'critical'
            ? 88
            : exception.severity === 'warning'
            ? 70
            : 40,
        route: exception.route,
        dueLabel:
          exception.severity === 'critical'
            ? 'Immediate'
            : 'This week',
      })
    })

  const sorted = items.sort(
    (a, b) => b.priority - a.priority
  )

  return {
    items: sorted,
    criticalCount: sorted.filter(
      item => item.severity === 'critical'
    ).length,
    warningCount: sorted.filter(
      item => item.severity === 'warning'
    ).length,
    generatedAt: new Date().toISOString(),
  }
}

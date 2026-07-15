import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import type { ForecastV2Result } from '@/core/intelligence/forecast/forecastV2'
import type { RootCauseResult } from '@/core/intelligence/root-cause/rootCauseTypes'
import type {
  RecommendationItem,
  RecommendationResult,
} from './recommendationTypes'

export function calculateRecommendations({
  state,
  forecast,
  rootCause,
}: {
  state: ProjectState
  forecast: ForecastV2Result
  rootCause: RootCauseResult
}): RecommendationResult {
  const items: RecommendationItem[] = []

  if (
    forecast.production.actualPerDay <
    forecast.production.requiredPerDay
  ) {
    items.push({
      id: 'increase-production',
      title: 'Increase production output',
      description:
        'The actual production rate is below the rate required to meet the target completion date.',
      priority:
        forecast.production.efficiency < 60
          ? 'critical'
          : 'high',
      category: 'schedule',
      route: '/app/recovery',
      expectedImpact:
        'Improves recovery confidence and reduces forecast delay.',
    })
  }

  if (rootCause.primaryCause) {
    items.push({
      id: 'resolve-root-cause',
      title: `Resolve ${rootCause.primaryCause.name}`,
      description:
        rootCause.explanation,
      priority: rootCause.primaryCause.isCritical
        ? 'critical'
        : 'high',
      category: 'schedule',
      route: '/app/schedule',
      expectedImpact: `${rootCause.impactedActivities.length} downstream activities may be released.`,
    })
  }

  if (state.approvals.overdueApprovals > 0) {
    items.push({
      id: 'clear-overdue-approvals',
      title: 'Clear overdue approvals',
      description: `${state.approvals.overdueApprovals} approval item(s) have exceeded their due dates.`,
      priority:
        state.approvals.overdueApprovals >= 3
          ? 'critical'
          : 'high',
      category: 'approval',
      route: '/app/approvals',
      expectedImpact:
        'Reduces design, procurement and workfront constraints.',
    })
  }

  if (state.procurement.atRiskItems > 0) {
    items.push({
      id: 'protect-procurement',
      title: 'Protect critical procurement dates',
      description: `${state.procurement.atRiskItems} procurement item(s) are at risk.`,
      priority:
        state.procurement.atRiskItems >= 3
          ? 'critical'
          : 'high',
      category: 'procurement',
      route: '/app/procurement',
      expectedImpact:
        'Prevents materials from becoming a critical-path constraint.',
    })
  }

  if (state.quality.criticalSnags > 0) {
    items.push({
      id: 'close-critical-snags',
      title: 'Close critical quality issues',
      description: `${state.quality.criticalSnags} critical snag(s) remain open.`,
      priority: 'high',
      category: 'quality',
      route: '/app/snags',
      expectedImpact:
        'Improves milestone readiness and handover quality.',
    })
  }

  if (state.risk.unmitigatedHighRisks > 0) {
    items.push({
      id: 'mitigate-high-risks',
      title: 'Assign mitigation to high risks',
      description: `${state.risk.unmitigatedHighRisks} high risk(s) do not have adequate mitigation.`,
      priority: 'critical',
      category: 'risk',
      route: '/app/risk',
      expectedImpact:
        'Reduces unmanaged exposure and governance risk.',
    })
  }

  if (state.hse.overdueActions > 0) {
    items.push({
      id: 'close-hse-actions',
      title: 'Close overdue HSE actions',
      description: `${state.hse.overdueActions} HSE action(s) are overdue.`,
      priority: 'critical',
      category: 'hse',
      route: '/app/hse',
      expectedImpact:
        'Reduces safety exposure and work stoppage risk.',
    })
  }

  const rank = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  }

  const sorted =
    items.sort(
      (a, b) =>
        rank[b.priority] -
        rank[a.priority]
    )

  return {
    items: sorted,
    criticalCount:
      sorted.filter(
        item =>
          item.priority === 'critical'
      ).length,
    highCount:
      sorted.filter(
        item =>
          item.priority === 'high'
      ).length,
    generatedAt:
      new Date().toISOString(),
  }
}

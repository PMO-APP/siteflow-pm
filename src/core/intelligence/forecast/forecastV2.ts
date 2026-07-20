import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import { calculateForecastV7 } from '@/core/intelligence/v7'

export type ProductionRate = {
  actualPerDay: number
  requiredPerDay: number
  efficiency: number
}

export type ForecastV2Result = {
  targetDate: Date | null
  forecastDate: Date | null
  delayDays: number
  plannedPosition: ProjectState['schedule']['activities'][number] | null
  actualPosition: ProjectState['schedule']['activities'][number] | null
  activityGap: number
  recoverable: boolean
  recoveryConfidence: number
  production: ProductionRate
  status: 'on_track' | 'watch' | 'recovery_required' | 'critical'
  primaryConstraint: string | null
}

/**
 * Compatibility adapter for the existing dashboard.
 * The calculation is now performed by the multi-workfront V7 engine.
 */
export function calculateForecastV2(state: ProjectState, today = new Date()): ForecastV2Result {
  const v7 = calculateForecastV7(state, today)
  const plannedPosition = v7.activities
    .filter(item => item.isDue)
    .sort((a, b) => b.expectedProgress - a.expectedProgress)[0]?.activity || null
  const actualPosition = v7.currentWorkfronts[0]?.activity || null

  return {
    targetDate: v7.targetDate,
    forecastDate: v7.forecastDate,
    delayDays: v7.delayDays,
    plannedPosition,
    actualPosition,
    activityGap: v7.criticalDrivers.length,
    recoverable: v7.recoverable,
    recoveryConfidence: v7.confidence,
    production: v7.production,
    status: v7.status === 'insufficient_data' ? 'watch' : v7.status,
    primaryConstraint: v7.primaryConstraint,
  }
}

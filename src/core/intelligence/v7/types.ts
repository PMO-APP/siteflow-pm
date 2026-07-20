import type { ProjectState } from '@/core/intelligence/models/ProjectState'

export type ScheduleActivity = ProjectState['schedule']['activities'][number]

export type V7ActivityState = {
  activity: ScheduleActivity
  durationDays: number
  expectedProgress: number
  actualProgress: number
  variancePercent: number
  varianceDays: number
  isSummary: boolean
  isMilestone: boolean
  isDue: boolean
  isOverdue: boolean
  isActive: boolean
  isReady: boolean
  isBlocking: boolean
  isCriticalImpact: boolean
  successors: string[]
  health: 'completed' | 'ahead' | 'on_track' | 'watch' | 'behind' | 'blocked' | 'future'
}

export type V7Workfront = {
  id: string
  label: string
  discipline: string | null
  activities: V7ActivityState[]
  leadActivity: V7ActivityState | null
  progress: number
  expectedProgress: number
  variancePercent: number
  status: 'completed' | 'ahead' | 'on_track' | 'watch' | 'behind' | 'blocked'
  critical: boolean
}

export type ForecastV7Result = {
  targetDate: Date | null
  forecastDate: Date | null
  grossDelayDays: number
  recoverableDays: number
  delayDays: number
  status: 'on_track' | 'watch' | 'recovery_required' | 'critical' | 'insufficient_data'
  confidence: number
  confidenceReasons: string[]
  activities: V7ActivityState[]
  workfronts: V7Workfront[]
  criticalDrivers: V7ActivityState[]
  currentWorkfronts: V7ActivityState[]
  primaryConstraint: string | null
  production: {
    actualPerDay: number
    requiredPerDay: number
    efficiency: number
  }
  recoverable: boolean
  explanation: string
}

import type { ProjectState } from '@/platform/project-state'

export type V6Health = {
  score: number
  label: 'Healthy' | 'Recoverable' | 'At Risk' | 'Critical'
  drivers: string[]
}

export type V6Forecast = {
  targetDate: string | null
  forecastDate: string | null
  delayDays: number
  recoverable: boolean
  recoveryConfidence: number
  plannedPosition: string | null
  actualPosition: string | null
  activityGap: number
}

export type V6Readiness = {
  milestoneName: string
  score: number
  blockerCount: number
}

export type V6Narrative = {
  headline: string
  summary: string
  outlook: string
}

export type V6ProjectIntelligence = {
  state: ProjectState
  health: V6Health
  forecast: V6Forecast
  readiness: V6Readiness
  narrative: V6Narrative
  generatedAt: string
}

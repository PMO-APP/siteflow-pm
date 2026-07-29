export interface ForecastResult {
  plannedFinish?: string
  forecastFinish?: string
  forecastDelayDays: number
  confidence: number
  drivers: string[]
  calculatedAt: string
}

import type { ForecastResult } from '../models/Forecast'

export interface ForecastBreakdown {
  position: 'ahead' | 'on-track' | 'behind' | 'unknown'
  headline: string
  delayDays: number
  plannedFinish?: string
  forecastFinish?: string
  drivers: string[]
  explanation: string
}

export function buildForecastBreakdown(forecast: ForecastResult): ForecastBreakdown {
  const position = !forecast.plannedFinish || !forecast.forecastFinish
    ? 'unknown'
    : forecast.forecastDelayDays > 0
    ? 'behind'
    : forecast.forecastDelayDays < 0
    ? 'ahead'
    : 'on-track'

  return {
    position,
    headline: position === 'behind'
      ? `${forecast.forecastDelayDays} day${forecast.forecastDelayDays === 1 ? '' : 's'} behind plan`
      : position === 'ahead'
      ? `${Math.abs(forecast.forecastDelayDays)} days ahead of plan`
      : position === 'on-track'
      ? 'Forecast remains aligned with plan'
      : 'Forecast requires a valid baseline finish',
    delayDays: forecast.forecastDelayDays,
    plannedFinish: forecast.plannedFinish,
    forecastFinish: forecast.forecastFinish,
    drivers: forecast.drivers,
    explanation: forecast.drivers.length
      ? `The forecast is primarily influenced by ${forecast.drivers.slice(0, 3).join(', ')}.`
      : 'No material forecast driver was identified from the current evidence.',
  }
}

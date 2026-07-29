import type { ForecastResult } from '../models/Forecast'
import type { IntelligenceEvent } from '../models/IntelligenceEvent'

const DELAY_DAYS: Record<IntelligenceEvent['severity'], number> = {
  low: 1,
  medium: 3,
  high: 7,
  critical: 14,
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function calculateForecast(
  plannedFinish: string | undefined,
  events: IntelligenceEvent[],
  now = new Date()
): ForecastResult {
  const drivers = events
    .filter(event => event.status === 'open' && ['schedule', 'approval', 'procurement', 'risk'].includes(event.source))
    .sort((a, b) => DELAY_DAYS[b.severity] - DELAY_DAYS[a.severity])

  const rawDelay = drivers.reduce((total, event) => {
    const overdueFactor = event.dueDate && new Date(event.dueDate) < now ? 1.2 : 1
    return total + DELAY_DAYS[event.severity] * overdueFactor * Math.max(0.5, Number(event.weight || 1))
  }, 0)

  const forecastDelayDays = Math.round(Math.min(180, rawDelay))
  const plannedDate = plannedFinish ? new Date(plannedFinish) : null
  const validPlannedDate = plannedDate && !Number.isNaN(plannedDate.getTime()) ? plannedDate : null
  const confidence = Math.max(35, Math.min(95, 90 - Math.max(0, drivers.length - 3) * 5))

  return {
    plannedFinish: validPlannedDate?.toISOString(),
    forecastFinish: validPlannedDate ? addDays(validPlannedDate, forecastDelayDays).toISOString() : undefined,
    forecastDelayDays,
    confidence,
    drivers: drivers.slice(0, 5).map(event => event.title),
    calculatedAt: now.toISOString(),
  }
}

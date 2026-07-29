import type { IntelligenceEvent, IntelligenceSource } from '../models/IntelligenceEvent'

export type TrendDirection = 'improving' | 'stable' | 'declining'

export interface TrendSignal {
  source: IntelligenceSource | 'overall'
  direction: TrendDirection
  score: number
  change: number
  confidence: number
  explanation: string
}

const severityWeight: Record<IntelligenceEvent['severity'], number> = {
  low: 4,
  medium: 12,
  high: 24,
  critical: 38,
}

function ageDays(value: string, now: Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 999
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000))
}

function exposure(events: IntelligenceEvent[], fromDays: number, toDays: number, now: Date) {
  return events.reduce((sum, event) => {
    const age = ageDays(event.occurredAt || event.createdAt, now)
    if (age < fromDays || age >= toDays) return sum
    const statusFactor = event.status === 'closed' ? -0.45 : 1
    return sum + severityWeight[event.severity] * statusFactor
  }, 0)
}

function directionFromChange(change: number): TrendDirection {
  if (change <= -8) return 'improving'
  if (change >= 8) return 'declining'
  return 'stable'
}

export function analyseTrends(events: IntelligenceEvent[], now = new Date()): TrendSignal[] {
  const sources = Array.from(new Set(events.map(event => event.source)))
  const sourceSignals = sources.map(source => {
    const records = events.filter(event => event.source === source)
    const current = exposure(records, 0, 14, now)
    const previous = exposure(records, 14, 28, now)
    const rawChange = current - previous
    const change = Math.max(-100, Math.min(100, Math.round(rawChange)))
    const direction = directionFromChange(change)
    const score = Math.max(0, Math.min(100, Math.round(100 - current)))
    const confidence = Math.max(45, Math.min(96, 50 + records.length * 5))
    const explanation = direction === 'improving'
      ? `${source} exposure has reduced over the latest 14-day period.`
      : direction === 'declining'
      ? `${source} exposure has increased over the latest 14-day period.`
      : `${source} exposure is broadly unchanged.`

    return { source, direction, score, change, confidence, explanation } satisfies TrendSignal
  })

  const current = exposure(events, 0, 14, now)
  const previous = exposure(events, 14, 28, now)
  const change = Math.max(-100, Math.min(100, Math.round(current - previous)))
  const direction = directionFromChange(change)
  const overall: TrendSignal = {
    source: 'overall',
    direction,
    score: Math.max(0, Math.min(100, Math.round(100 - current / Math.max(1, sources.length)))),
    change,
    confidence: Math.max(50, Math.min(97, 55 + events.length * 2)),
    explanation: direction === 'improving'
      ? 'The project is closing exceptions faster than new exposure is being created.'
      : direction === 'declining'
      ? 'New or worsening exceptions are outpacing closure activity.'
      : 'The overall delivery position is stable across the latest review period.',
  }

  return [overall, ...sourceSignals].sort((a, b) => a.source === 'overall' ? -1 : b.source === 'overall' ? 1 : a.score - b.score)
}

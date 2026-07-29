import type {
  HealthBand,
  HealthDimension,
  HealthDimensionResult,
  ProjectHealth,
} from '../models/ProjectHealth'
import type { IntelligenceEvent } from '../models/IntelligenceEvent'

const DIMENSION_SOURCES: Record<HealthDimension, IntelligenceEvent['source'][]> = {
  schedule: ['schedule', 'site'],
  commercial: ['finance', 'contractor'],
  quality: ['quality', 'snag', 'rfi'],
  safety: ['hse'],
  procurement: ['procurement'],
  approval: ['approval', 'consultant'],
}

const DEFAULT_WEIGHTS: Record<HealthDimension, number> = {
  schedule: 0.3,
  commercial: 0.15,
  quality: 0.15,
  safety: 0.15,
  procurement: 0.15,
  approval: 0.1,
}

const SEVERITY_PENALTY: Record<IntelligenceEvent['severity'], number> = {
  low: 3,
  medium: 8,
  high: 16,
  critical: 28,
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function getHealthBand(score: number): HealthBand {
  if (score >= 80) return 'green'
  if (score >= 60) return 'amber'
  return 'red'
}

function scoreDimension(
  dimension: HealthDimension,
  events: IntelligenceEvent[],
  now: Date
): HealthDimensionResult {
  const sources = DIMENSION_SOURCES[dimension]
  const relevant = events.filter(
    event => event.status === 'open' && sources.includes(event.source)
  )

  const penalty = relevant.reduce((total, event) => {
    const overdueMultiplier = event.dueDate && new Date(event.dueDate) < now ? 1.25 : 1
    const eventWeight = Math.max(0.5, Number(event.weight || 1))
    return total + SEVERITY_PENALTY[event.severity] * overdueMultiplier * eventWeight
  }, 0)

  const score = Math.round(clamp(100 - penalty))
  const criticalIssues = relevant.filter(event => event.severity === 'critical').length
  const explanation = relevant.length
    ? `${relevant.length} open issue${relevant.length === 1 ? '' : 's'} affecting ${dimension} health.`
    : `No open ${dimension} issues detected.`

  return {
    dimension,
    score,
    band: getHealthBand(score),
    openIssues: relevant.length,
    criticalIssues,
    explanation,
  }
}

export interface HealthEngineOptions {
  weights?: Partial<Record<HealthDimension, number>>
  now?: Date
}

export function calculateProjectHealth(
  events: IntelligenceEvent[],
  options: HealthEngineOptions = {}
): ProjectHealth {
  const now = options.now || new Date()
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights }
  const dimensions = Object.fromEntries(
    (Object.keys(DIMENSION_SOURCES) as HealthDimension[]).map(dimension => [
      dimension,
      scoreDimension(dimension, events, now),
    ])
  ) as Record<HealthDimension, HealthDimensionResult>

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0) || 1
  const overallScore = Math.round(
    (Object.keys(dimensions) as HealthDimension[]).reduce(
      (sum, dimension) => sum + dimensions[dimension].score * weights[dimension],
      0
    ) / totalWeight
  )

  const weakest = Object.values(dimensions).sort((a, b) => a.score - b.score)[0]

  return {
    overallScore,
    overallBand: getHealthBand(overallScore),
    dimensions,
    calculatedAt: now.toISOString(),
    explanation: weakest
      ? `${weakest.dimension[0].toUpperCase()}${weakest.dimension.slice(1)} is the weakest health dimension at ${weakest.score}%.`
      : 'No intelligence evidence is available.',
  }
}

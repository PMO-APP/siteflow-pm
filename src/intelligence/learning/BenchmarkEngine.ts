import type { IntelligenceEvent, IntelligenceSource } from '../models/IntelligenceEvent'

export interface ProjectBenchmark {
  id: string
  label: string
  projectValue: number
  referenceValue: number
  unit: '%' | 'items'
  position: 'better' | 'in_line' | 'worse'
  explanation: string
}

const openRate = (events: IntelligenceEvent[], source: IntelligenceSource) => {
  const matching = events.filter(event => event.source === source)
  return matching.length ? Math.round((matching.filter(event => event.status === 'open').length / matching.length) * 100) : 0
}

export function buildProjectBenchmarks(events: IntelligenceEvent[]): ProjectBenchmark[] {
  const references: Array<[string, string, IntelligenceSource, number]> = [
    ['approval-open-rate', 'Approval open rate', 'approval', 35],
    ['procurement-open-rate', 'Procurement open rate', 'procurement', 40],
    ['risk-open-rate', 'Risk open rate', 'risk', 45],
    ['quality-open-rate', 'Quality issue open rate', 'quality', 30],
    ['snag-open-rate', 'Snag open rate', 'snag', 35],
  ]

  return references.map(([id, label, source, referenceValue]) => {
    const projectValue = openRate(events, source)
    const delta = projectValue - referenceValue
    return {
      id,
      label,
      projectValue,
      referenceValue,
      unit: '%' as const,
      position: delta <= -8 ? 'better' as const : delta >= 8 ? 'worse' as const : 'in_line' as const,
      explanation: projectValue === 0 && !events.some(event => event.source === source)
        ? `No ${source} evidence is available; the comparison is provisional.`
        : `${Math.abs(delta)} percentage points ${delta > 0 ? 'above' : delta < 0 ? 'below' : 'at'} the initial PMOCorex reference threshold.`,
    }
  })
}

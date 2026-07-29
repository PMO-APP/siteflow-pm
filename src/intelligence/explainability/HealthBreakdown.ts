import type { ProjectHealth } from '../models/ProjectHealth'

export interface HealthBreakdownItem {
  key: string
  label: string
  score: number
  band: 'green' | 'amber' | 'red'
  openIssues: number
  criticalIssues: number
  explanation: string
  impact: 'positive' | 'watch' | 'material'
}

const labels: Record<string, string> = {
  schedule: 'Schedule', commercial: 'Commercial', quality: 'Quality', safety: 'Safety',
  procurement: 'Procurement', approval: 'Approvals',
}

export function buildHealthBreakdown(health: ProjectHealth): HealthBreakdownItem[] {
  return Object.entries(health.dimensions)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      score: value.score,
      band: value.band,
      openIssues: value.openIssues,
      criticalIssues: value.criticalIssues,
      explanation: value.explanation,
      impact: value.score >= 80 ? 'positive' as const : value.score >= 60 ? 'watch' as const : 'material' as const,
    }))
    .sort((a, b) => a.score - b.score)
}

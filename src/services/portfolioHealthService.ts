import { getProjectHealth } from '@/services/healthService'

export type PortfolioHealthBand = 'Healthy' | 'Recoverable' | 'At Risk' | 'Critical' | 'Not Assessed'

export type PortfolioProjectHealth = {
  projectId: number
  score: number
  label: PortfolioHealthBand
  confidenceScore: number
  assessedContributors: number
  summary: string
}

function normalizeLabel(label: unknown): PortfolioHealthBand {
  const value = String(label || '').toLowerCase().trim()
  if (value === 'healthy') return 'Healthy'
  if (value === 'recoverable') return 'Recoverable'
  if (value === 'at risk' || value === 'at_risk') return 'At Risk'
  if (value === 'critical') return 'Critical'
  return 'Not Assessed'
}

export async function loadPortfolioProjectHealth(projects: Array<{ id: string | number }>) {
  const entries = await Promise.all(projects.map(async project => {
    try {
      const result = await getProjectHealth(project.id)
      return [String(project.id), {
        projectId: Number(project.id),
        score: Number(result.health.score || 0),
        label: normalizeLabel(result.health.label),
        confidenceScore: Number(result.health.confidence?.score || 0),
        assessedContributors: Number(result.health.confidence?.assessedContributors || 0),
        summary: String(result.health.summary || ''),
      } satisfies PortfolioProjectHealth] as const
    } catch (error) {
      console.warn(`[Portfolio Health] Project ${project.id} could not be assessed:`, error)
      return [String(project.id), {
        projectId: Number(project.id),
        score: 0,
        label: 'Not Assessed' as const,
        confidenceScore: 0,
        assessedContributors: 0,
        summary: 'Project health could not be assessed from the currently available verified data.',
      }] as const
    }
  }))
  return new Map(entries)
}

export function isHealthyProject(health?: PortfolioProjectHealth | null) {
  return health?.label === 'Healthy'
}

export function isCriticalProject(health?: PortfolioProjectHealth | null) {
  return health?.label === 'Critical'
}

export function isAtRiskProject(health?: PortfolioProjectHealth | null) {
  return health?.label === 'Recoverable' || health?.label === 'At Risk'
}

export function needsHealthAttention(health?: PortfolioProjectHealth | null) {
  return health != null && health.label !== 'Healthy' && health.label !== 'Not Assessed'
}

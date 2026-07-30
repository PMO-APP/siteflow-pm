import type {
  HealthContributorKey,
  HealthTone,
  ProjectHealthContributor,
} from './types'

export const clampHealthScore = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0))

export const safeRatio = (part: number, total: number) =>
  total > 0 ? part / total : 0

export function healthToneForScore(score: number): HealthTone {
  if (score >= 85) return 'healthy'
  if (score >= 70) return 'recoverable'
  if (score >= 50) return 'at_risk'
  return 'critical'
}

export function healthLabelForScore(score: number) {
  const tone = healthToneForScore(score)
  if (tone === 'healthy') return 'Healthy'
  if (tone === 'recoverable') return 'Recoverable'
  if (tone === 'at_risk') return 'At Risk'
  return 'Critical'
}

const contributorLabels: Record<HealthContributorKey, string> = {
  schedule: 'Schedule',
  procurement: 'Procurement',
  approvals: 'Approvals',
  quality: 'Quality',
  safety: 'HSE',
  risk: 'Risk',
  commercial: 'Cost',
  governance: 'Governance',
}

export function createContributor({
  key,
  score,
  assessed,
  weight,
  explanations,
  recommendations = [],
  metrics = {},
}: {
  key: HealthContributorKey
  score: number
  assessed: boolean
  weight: number
  explanations: string[]
  recommendations?: string[]
  metrics?: Record<string, number | string | null>
}): ProjectHealthContributor {
  const normalizedScore = Math.round(clampHealthScore(score))

  return {
    key,
    label: contributorLabels[key],
    score: assessed ? normalizedScore : null,
    status: assessed ? 'assessed' : 'not_assessed',
    tone: assessed ? healthToneForScore(normalizedScore) : 'not_assessed',
    configuredWeight: weight,
    normalizedWeight: 0,
    explanations: assessed
      ? explanations.filter(Boolean)
      : ['No reliable project data is available for this contributor.'],
    recommendations: assessed ? recommendations.filter(Boolean) : [],
    metrics,
  }
}

export function buildProjectHealthSummary(
  score: number,
  contributors: ProjectHealthContributor[]
) {
  const assessed = contributors.filter(
    contributor => contributor.status === 'assessed' && contributor.score !== null
  )
  const weakest = [...assessed]
    .filter(contributor => contributor.key !== 'governance')
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
    .slice(0, 2)

  if (!assessed.length) {
    return 'Project health cannot yet be assessed because there is insufficient verified project data.'
  }

  const label = healthLabelForScore(score).toLowerCase()
  if (!weakest.length || (weakest[0].score ?? 100) >= 85) {
    return `Overall project health is ${label} at ${score}%. All assessed contributors are currently performing strongly.`
  }

  const constraints = weakest.map(item => item.label.toLowerCase()).join(' and ')
  return `Overall project health is ${label} at ${score}%. ${constraints[0].toUpperCase()}${constraints.slice(1)} are the main contributors requiring management attention.`
}

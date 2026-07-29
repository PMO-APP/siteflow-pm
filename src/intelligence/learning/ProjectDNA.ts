import type { IntelligenceEvent, IntelligenceSource } from '../models/IntelligenceEvent'

export type DNAProfile = 'low' | 'moderate' | 'high' | 'very_high'

export interface ProjectDNADimension {
  id: 'delivery_complexity' | 'procurement_exposure' | 'approval_dependency' | 'quality_discipline' | 'risk_exposure' | 'governance_strength'
  label: string
  score: number
  profile: DNAProfile
  explanation: string
  evidence: string[]
}

export interface ProjectDNAResult {
  score: number
  confidence: number
  archetype: string
  summary: string
  dominantConstraint: string
  strengths: string[]
  vulnerabilities: string[]
  dimensions: ProjectDNADimension[]
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const profile = (score: number): DNAProfile => score >= 80 ? 'very_high' : score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low'
const bySource = (events: IntelligenceEvent[], source: IntelligenceSource) => events.filter(event => event.source === source)
const openSeverity = (events: IntelligenceEvent[]) => events.filter(event => event.status === 'open').reduce((total, event) => total + ({ low: 1, medium: 2, high: 4, critical: 7 }[event.severity]), 0)
const blockedLinks = (events: IntelligenceEvent[]) => events.reduce((total, event) => total + (event.links || []).filter(link => link.type === 'blocks').length, 0)

function dimension(
  id: ProjectDNADimension['id'],
  label: string,
  score: number,
  explanation: string,
  evidence: string[],
): ProjectDNADimension {
  const normalized = clamp(score)
  return { id, label, score: normalized, profile: profile(normalized), explanation, evidence: evidence.slice(0, 4) }
}

export function buildProjectDNA(events: IntelligenceEvent[]): ProjectDNAResult {
  const schedule = bySource(events, 'schedule')
  const procurement = bySource(events, 'procurement')
  const approvals = bySource(events, 'approval')
  const quality = [...bySource(events, 'quality'), ...bySource(events, 'snag')]
  const risks = bySource(events, 'risk')
  const governanceSources: IntelligenceSource[] = ['schedule', 'approval', 'procurement', 'risk', 'quality', 'site', 'hse']

  const packageCount = new Set(schedule.map(event => event.packageId).filter(Boolean)).size
  const disciplineCount = new Set(schedule.map(event => String(event.metadata?.discipline || '')).filter(Boolean)).size
  const complexityScore = clamp(25 + Math.min(30, packageCount * 8) + Math.min(25, disciplineCount * 5) + Math.min(20, schedule.length / 3))
  const procurementScore = clamp(20 + openSeverity(procurement) * 4 + blockedLinks(procurement) * 7)
  const approvalScore = clamp(15 + openSeverity(approvals) * 5 + blockedLinks(approvals) * 8)
  const qualityOpen = quality.filter(event => event.status === 'open')
  const qualityClosed = quality.filter(event => event.status === 'closed')
  const qualityDiscipline = clamp(80 + qualityClosed.length * 3 - openSeverity(qualityOpen) * 5)
  const riskScore = clamp(10 + openSeverity(risks) * 6)
  const representedSources = governanceSources.filter(source => events.some(event => event.source === source)).length
  const staleOpen = events.filter(event => event.status === 'open' && Date.now() - new Date(event.createdAt).getTime() > 21 * 86_400_000).length
  const governanceScore = clamp(35 + representedSources * 9 - staleOpen * 4)

  const dimensions = [
    dimension('delivery_complexity', 'Delivery complexity', complexityScore, `${packageCount || 1} delivery package${packageCount === 1 ? '' : 's'} and ${disciplineCount || 1} active discipline${disciplineCount === 1 ? '' : 's'} shape the coordination load.`, schedule.filter(event => event.severity !== 'low').map(event => event.title)),
    dimension('procurement_exposure', 'Procurement exposure', procurementScore, `${procurement.filter(event => event.status === 'open').length} open procurement item${procurement.filter(event => event.status === 'open').length === 1 ? '' : 's'} contribute to delivery exposure.`, procurement.filter(event => event.status === 'open').map(event => event.title)),
    dimension('approval_dependency', 'Approval dependency', approvalScore, `${blockedLinks(approvals)} downstream link${blockedLinks(approvals) === 1 ? '' : 's'} currently depend on approval outcomes.`, approvals.filter(event => event.status === 'open').map(event => event.title)),
    dimension('quality_discipline', 'Quality discipline', qualityDiscipline, `${qualityClosed.length} quality item${qualityClosed.length === 1 ? '' : 's'} closed against ${qualityOpen.length} still open.`, qualityOpen.map(event => event.title)),
    dimension('risk_exposure', 'Risk exposure', riskScore, `${risks.filter(event => event.status === 'open').length} open risk${risks.filter(event => event.status === 'open').length === 1 ? '' : 's'} define the current exposure profile.`, risks.filter(event => event.status === 'open').map(event => event.title)),
    dimension('governance_strength', 'Governance strength', governanceScore, `${representedSources} of ${governanceSources.length} core control areas currently provide project evidence.`, governanceSources.filter(source => !events.some(event => event.source === source)).map(source => `No ${source} evidence available`)),
  ]

  const constraintDimensions = dimensions.filter(item => item.id !== 'quality_discipline' && item.id !== 'governance_strength')
  const dominant = [...constraintDimensions].sort((a, b) => b.score - a.score)[0]
  const strengths = dimensions.filter(item => (item.id === 'quality_discipline' || item.id === 'governance_strength') && item.score >= 70).map(item => item.label)
  const vulnerabilities = constraintDimensions.filter(item => item.score >= 55).sort((a, b) => b.score - a.score).map(item => item.label)
  const score = clamp(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length)
  const confidence = clamp(45 + Math.min(45, events.length * 1.5) + representedSources)
  const archetype = procurementScore >= 65 && approvalScore >= 60
    ? 'Approval and procurement constrained'
    : complexityScore >= 70
      ? 'Coordination intensive'
      : riskScore >= 65
        ? 'Risk exposed delivery'
        : qualityDiscipline >= 80 && governanceScore >= 75
          ? 'Controlled delivery'
          : 'Balanced delivery'

  return {
    score,
    confidence,
    archetype,
    summary: `${archetype} project with ${profile(complexityScore).replace('_', ' ')} delivery complexity and ${profile(governanceScore).replace('_', ' ')} governance evidence.`,
    dominantConstraint: dominant?.label || 'No dominant constraint identified',
    strengths,
    vulnerabilities,
    dimensions,
  }
}

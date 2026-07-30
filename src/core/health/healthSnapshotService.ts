import { supabase } from '@/lib/supabase'
import type { HealthContributorKey, ProjectHealthResult } from '@/core/engine/types'

export type HealthSnapshot = {
  id: number | string
  project_id: number | string
  overall_score: number
  health_label: string
  health_tone: string
  schedule_score: number | null
  commercial_score: number | null
  quality_score: number | null
  risk_score: number | null
  safety_score: number | null
  approvals_score: number | null
  procurement_score: number | null
  governance_score: number | null
  confidence_score: number | null
  confidence_label: string | null
  drivers: string[]
  recommendations: string[]
  summary: string | null
  source: string
  methodology_version: string | null
  calculated_at: string
}

export type HealthTrend = {
  direction: 'improving' | 'stable' | 'declining' | 'insufficient_history'
  delta: number
  label: string
  explanation: string
  current: number | null
  previous: number | null
}

const contributorColumn: Record<HealthContributorKey, keyof HealthSnapshot> = {
  schedule: 'schedule_score', commercial: 'commercial_score', quality: 'quality_score',
  risk: 'risk_score', safety: 'safety_score', approvals: 'approvals_score',
  procurement: 'procurement_score', governance: 'governance_score',
}

function nullableScore(health: ProjectHealthResult, key: HealthContributorKey) {
  const contributor = health.contributors.find(item => item.key === key)
  return contributor?.status === 'assessed' ? contributor.score : null
}

export async function saveProjectHealthSnapshot({ projectId, organizationId, portfolioId, health, source = 'health_engine' }: {
  projectId: string | number
  organizationId?: string | number | null
  portfolioId?: string | number | null
  health: ProjectHealthResult
  source?: string
}) {
  const payload = {
    project_id: projectId,
    organization_id: organizationId || null,
    portfolio_id: portfolioId || null,
    overall_score: health.score,
    health_label: health.label,
    health_tone: health.tone,
    schedule_score: nullableScore(health, 'schedule'),
    commercial_score: nullableScore(health, 'commercial'),
    quality_score: nullableScore(health, 'quality'),
    risk_score: nullableScore(health, 'risk'),
    safety_score: nullableScore(health, 'safety'),
    approvals_score: nullableScore(health, 'approvals'),
    procurement_score: nullableScore(health, 'procurement'),
    governance_score: nullableScore(health, 'governance'),
    confidence_score: health.confidence.score,
    confidence_label: health.confidence.label,
    drivers: health.drivers,
    recommendations: health.recommendations,
    summary: health.summary,
    source,
    methodology_version: health.methodologyVersion,
    calculated_at: health.calculatedAt,
  }
  const { data, error } = await supabase.from('project_health_snapshots').insert(payload).select('*').single()
  if (error) throw error
  return data as HealthSnapshot
}

export async function saveSnapshotIfDue(args: Parameters<typeof saveProjectHealthSnapshot>[0], minimumHours = 20) {
  const { data, error } = await supabase.from('project_health_snapshots')
    .select('calculated_at').eq('project_id', args.projectId)
    .order('calculated_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  const latest = data?.calculated_at ? new Date(data.calculated_at).getTime() : 0
  if (latest && Date.now() - latest < minimumHours * 60 * 60 * 1000) return null
  return saveProjectHealthSnapshot(args)
}

export async function getProjectHealthHistory(projectId: string | number, days = 30) {
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await supabase.from('project_health_snapshots').select('*')
    .eq('project_id', projectId).gte('calculated_at', from).order('calculated_at', { ascending: true })
  if (error) throw error
  return (data || []) as HealthSnapshot[]
}

export function calculateHealthTrend(history: HealthSnapshot[]): HealthTrend {
  if (history.length < 2) return { direction: 'insufficient_history', delta: 0, label: 'Insufficient history', explanation: 'At least two health snapshots are required to calculate a trend.', current: history[history.length - 1]?.overall_score ?? null, previous: null }
  const current = Number(history[history.length - 1]?.overall_score || 0)
  const comparisonPool = history.slice(Math.max(0, history.length - 8), -1)
  const previous = comparisonPool.reduce((sum, row) => sum + Number(row.overall_score || 0), 0) / comparisonPool.length
  const delta = Math.round((current - previous) * 10) / 10
  const direction = delta >= 2 ? 'improving' : delta <= -2 ? 'declining' : 'stable'
  const latest = history[history.length - 1]!
  const previousSnapshot = history[history.length - 2]!
  const movements = Object.entries(contributorColumn).map(([label, column]) => {
    const a = Number(latest[column] ?? NaN); const b = Number(previousSnapshot[column] ?? NaN)
    return Number.isFinite(a) && Number.isFinite(b) ? { label, delta: a - b } : null
  }).filter(Boolean) as { label: string; delta: number }[]
  movements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const driver = movements[0]
  const explanation = direction === 'stable'
    ? `Project health is stable at ${current}%, with no material movement against the recent average.`
    : `Project health is ${direction} by ${Math.abs(delta)} points${driver ? `, led by ${driver.label} (${driver.delta > 0 ? '+' : ''}${Math.round(driver.delta)} points)` : ''}.`
  return { direction, delta, label: direction === 'improving' ? 'Improving' : direction === 'declining' ? 'Declining' : 'Stable', explanation, current, previous: Math.round(previous * 10) / 10 }
}

export function evaluateHealthAlerts(health: ProjectHealthResult, previous?: HealthSnapshot | null, threshold = 70) {
  const alerts: { severity: 'warning' | 'critical'; title: string; message: string }[] = []
  if (health.score < threshold) alerts.push({ severity: health.score < 50 ? 'critical' : 'warning', title: 'Project health threshold breached', message: `Overall health is ${health.score}%, below the ${threshold}% management threshold.` })
  health.contributors.filter(item => item.status === 'assessed' && Number(item.score) < 50).forEach(item => alerts.push({ severity: 'critical', title: `${item.label} is critical`, message: `${item.label} health is ${item.score}%. ${item.recommendations[0] || 'Immediate management action is required.'}` }))
  if (previous && health.confidence.score < Number(previous.confidence_score || 100) - 15) alerts.push({ severity: 'warning', title: 'Health confidence reduced', message: `Data confidence fell to ${health.confidence.score}%. Review unavailable or stale project records.` })
  return alerts
}

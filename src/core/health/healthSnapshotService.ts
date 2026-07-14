import { supabase } from '@/lib/supabase'
import type { ProjectHealthResult } from '@/core/engine/types'

export async function saveProjectHealthSnapshot({
  projectId,
  organizationId,
  portfolioId,
  health,
  source = 'command_center',
}: {
  projectId: string | number
  organizationId?: string | number | null
  portfolioId?: string | number | null
  health: ProjectHealthResult
  source?: string
}) {
  const { data, error } = await supabase
    .from('project_health_snapshots')
    .insert({
      project_id: projectId,
      organization_id: organizationId || null,
      portfolio_id: portfolioId || null,

      overall_score: health.score,
      health_label: health.label,
      health_tone: health.tone,

      schedule_score: health.breakdown.schedule,
      commercial_score: health.breakdown.commercial,
      quality_score: health.breakdown.quality,
      risk_score: health.breakdown.risk,
      safety_score: health.breakdown.safety,
      approvals_score: health.breakdown.approvals,
      procurement_score: health.breakdown.procurement,
      governance_score: health.breakdown.governance,

      drivers: health.drivers,
      source,
      calculated_at: health.calculatedAt,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

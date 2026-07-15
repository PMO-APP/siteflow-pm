import { supabase } from '@/lib/supabase'
import { toId, toISO } from '../utils'
import type { ProjectSummary } from '../types'

export async function loadProject(projectId: string | number): Promise<ProjectSummary> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error

  return {
    id: toId(data.id),
    name: data.project_name || data.name || 'Unnamed project',
    status: data.status || null,
    scope: data.project_scope || data.scope || null,
    startDate: toISO(data.start_date),
    targetDate: toISO(data.planned_finish),
    handoverDate: toISO(data.handover_date),
    organizationId: data.organization_id ? toId(data.organization_id) : null,
    portfolioId: data.portfolio_id ? toId(data.portfolio_id) : null,
  }
}

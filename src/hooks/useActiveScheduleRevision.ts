import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ActiveScheduleRevision = {
  id: string
  project_id: string
  revision_name: string | null
  revision_no: string | null
  revision_type: string | null
  planned_start: string | null
  planned_finish: string | null
  baseline_finish: string | null
  current_finish: string | null
  forecast_finish: string | null
  block_id: string | null
  package_name: string | null
  programme_activities: unknown[] | null
  is_active: boolean
}

export function getRevisionTargetDate(revision?: Partial<ActiveScheduleRevision> | null) {
  if (!revision) return null
  // An approved revision changes the contractual/current programme target. Forecast
  // remains a forecast and is only used when the revision has no current/planned finish.
  return revision.current_finish || revision.planned_finish || revision.forecast_finish || null
}

export function isRevisedProgramme(revision?: Partial<ActiveScheduleRevision> | null) {
  if (!revision) return false
  return (revision.revision_type || '').toLowerCase() !== 'baseline'
}

export function useActiveScheduleRevision(projectId?: string | number | null) {
  return useQuery({
    queryKey: ['active-schedule-revision', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_revisions')
        .select('id, project_id, revision_name, revision_no, revision_type, planned_start, planned_finish, baseline_finish, current_finish, forecast_finish, block_id, package_name, programme_activities, is_active')
        .eq('project_id', projectId as string | number)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return (data || null) as ActiveScheduleRevision | null
    },
    staleTime: 15_000,
  })
}

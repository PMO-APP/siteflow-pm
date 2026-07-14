import { useQuery } from '@tanstack/react-query'
import { subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export function useProjectHealthHistory(days = 30) {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: [
      'project-health-history',
      projectId,
      days,
    ],

    enabled: Boolean(projectId),

    queryFn: async () => {
      if (!projectId) {
        return []
      }

      const fromDate = subDays(
        new Date(),
        days
      ).toISOString()

      const { data, error } = await supabase
        .from('project_health_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .gte('calculated_at', fromDate)
        .order('calculated_at', {
          ascending: true,
        })

      if (error) {
        throw error
      }

      return data || []
    },
  })
}

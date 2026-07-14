import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export function useActivityFeed(limit = 20) {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['activity-feed', projectId, limit],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },
    refetchInterval: 30_000,
  })
}

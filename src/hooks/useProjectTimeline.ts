import { useQuery } from '@tanstack/react-query'
import { useProjectStore } from '@/store/project'
import { fetchProjectTimeline } from '@/services/intelligence/projectTimelineService'

export function useProjectTimeline(limit = 100) {
  const { projectId } = useProjectStore()
  return useQuery({
    queryKey: ['project-timeline', projectId, limit],
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectTimeline(projectId as string | number, limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

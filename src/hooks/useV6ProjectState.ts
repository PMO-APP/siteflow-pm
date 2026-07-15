import { useQuery } from '@tanstack/react-query'
import { useProjectStore } from '@/store/project'
import { buildProjectState } from '@/platform/project-state/buildProjectState'

export function useV6ProjectState() {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['v6-project-state', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('No project selected')
      return buildProjectState(projectId)
    },
    staleTime: 60 * 1000,
  })
}

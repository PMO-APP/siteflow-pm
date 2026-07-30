import { useQuery } from '@tanstack/react-query'
import { useProjectStore } from '@/store/project'
import { calculateHealthTrend, getProjectHealthHistory } from '@/core/health/healthSnapshotService'

export function useProjectHealthHistory(days = 30, explicitProjectId?: string | number | null) {
  const storedProjectId = useProjectStore(state => state.projectId)
  const projectId = explicitProjectId ?? storedProjectId
  const query = useQuery({
    queryKey: ['project-health-history', projectId, days],
    enabled: Boolean(projectId),
    queryFn: () => getProjectHealthHistory(projectId as string | number, days),
    staleTime: 60_000,
  })
  return { ...query, history: query.data || [], trend: calculateHealthTrend(query.data || []) }
}

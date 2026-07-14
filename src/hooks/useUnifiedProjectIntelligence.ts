import { useMemo } from 'react'
import { useProjectState } from '@/hooks/useProjectState'
import { buildProjectIntelligence } from '@/core/intelligence/projectIntelligence'

export function useUnifiedProjectIntelligence(
  options: Parameters<typeof useProjectState>[0] = {}
) {
  const projectState = useProjectState(options)

  const intelligence = useMemo(
    () => buildProjectIntelligence(projectState.state),
    [projectState.state]
  )

  return {
    ...intelligence,
    isLoading: projectState.isLoading,
    isError: projectState.isError,
  }
}

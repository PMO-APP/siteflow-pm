import { useMemo } from 'react'
import { useProjectState } from '@/hooks/useProjectState'
import { buildProjectIntelligenceV2 } from '@/core/intelligence/projectIntelligenceV2'

export function useUnifiedProjectIntelligence(
  options: Parameters<
    typeof useProjectState
  >[0] = {}
) {
  const projectState =
    useProjectState(options)

  const intelligence =
    useMemo(
      () =>
        buildProjectIntelligenceV2(
          projectState.state
        ),
      [projectState.state]
    )

  return {
    ...intelligence,
    isLoading:
      projectState.isLoading,
    isError:
      projectState.isError,
  }
}

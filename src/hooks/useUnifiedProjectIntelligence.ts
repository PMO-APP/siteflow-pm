import { useMemo } from 'react'
import { useProjectState } from '@/hooks/useProjectState'
import { buildProjectIntelligenceV3 } from '@/core/intelligence/projectIntelligenceV3'

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
        buildProjectIntelligenceV3(
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

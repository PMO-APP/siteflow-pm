import { useMemo } from 'react'
import { useV6ProjectState } from '@/hooks/useV6ProjectState'
import { buildV6Intelligence } from '@/intelligence/v6/orchestrator/buildV6Intelligence'

export function useV6ProjectIntelligence() {
  const stateQuery =
    useV6ProjectState()

  const intelligence =
    useMemo(() => {
      if (!stateQuery.data) {
        return null
      }

      return buildV6Intelligence(
        stateQuery.data
      )
    }, [stateQuery.data])

  return {
    data: intelligence,
    isLoading:
      stateQuery.isLoading,
    isError:
      stateQuery.isError,
    error:
      stateQuery.error,
    refetch:
      stateQuery.refetch,
  }
}

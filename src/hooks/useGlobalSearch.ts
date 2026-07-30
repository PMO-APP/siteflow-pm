import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchWorkspace } from '@/services/search'
import type { SearchContext } from '@/services/search'

export function useGlobalSearch(query: string, context: SearchContext) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220)
    return () => window.clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ['global-search', debouncedQuery, context.projectId],
    enabled: debouncedQuery.length >= 2,
    queryFn: () => searchWorkspace(debouncedQuery, context),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  })
}

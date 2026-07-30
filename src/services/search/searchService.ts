import { sortAndDedupeResults } from './searchIndex'
import { searchProviders } from './searchProviders'
import type { SearchCategory, SearchContext, SearchResponse } from './searchTypes'

export async function searchWorkspace(query: string, context: SearchContext): Promise<SearchResponse> {
  const term = query.trim()
  if (term.length < 2) return { query: term, results: [], groups: {}, errors: [] }

  const settled = await Promise.allSettled(
    searchProviders.map(async provider => ({ provider, results: await provider.search(term, context) }))
  )

  const errors: SearchResponse['errors'] = []
  const combined = settled.flatMap((entry, index) => {
    if (entry.status === 'fulfilled') return entry.value.results
    errors.push({
      provider: searchProviders[index].id,
      message: entry.reason instanceof Error ? entry.reason.message : 'Search provider unavailable',
    })
    return []
  })

  const results = sortAndDedupeResults(combined, term).slice(0, 40)
  const groups: Partial<Record<SearchCategory, typeof results>> = {}
  for (const result of results) {
    ;(groups[result.category] ||= []).push(result)
  }

  return { query: term, results, groups, errors }
}

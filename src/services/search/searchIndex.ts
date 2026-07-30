import type { SearchResult } from './searchTypes'

function normalize(value: string) {
  return value.toLocaleLowerCase().trim()
}

export function rankSearchResult(result: SearchResult, query: string): number {
  const needle = normalize(query)
  const title = normalize(result.title)
  const subtitle = normalize(result.subtitle || '')

  if (!needle) return result.score
  if (title === needle) return result.score + 1000
  if (title.startsWith(needle)) return result.score + 700
  if (title.includes(needle)) return result.score + 450
  if (subtitle.startsWith(needle)) return result.score + 220
  if (subtitle.includes(needle)) return result.score + 120

  const words = needle.split(/\s+/).filter(Boolean)
  const searchable = `${title} ${subtitle}`
  const matchedWords = words.filter(word => searchable.includes(word)).length
  return result.score + matchedWords * 35
}

export function sortAndDedupeResults(results: SearchResult[], query: string) {
  const seen = new Set<string>()

  return results
    .map(result => ({ ...result, score: rankSearchResult(result, query) }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .filter(result => {
      const key = `${result.type}:${result.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

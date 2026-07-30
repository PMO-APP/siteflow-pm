import type { LucideIcon } from 'lucide-react'

export type SearchResultType =
  | 'project'
  | 'activity'
  | 'procurement'
  | 'approval'
  | 'risk'
  | 'rfi'
  | 'snag'
  | 'document'

export type SearchCategory =
  | 'Projects'
  | 'Schedule Activities'
  | 'Procurement'
  | 'Approvals'
  | 'Risks'
  | 'RFIs'
  | 'Snags'
  | 'Documents'

export interface SearchContext {
  projectId: number | null
  projectName?: string
}

export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: SearchResultType
  category: SearchCategory
  icon?: LucideIcon
  url: string
  projectId?: number | null
  projectName?: string
  score: number
  metadata?: Record<string, string | number | boolean | null | undefined>
}

export interface SearchProvider {
  id: string
  category: SearchCategory
  search: (query: string, context: SearchContext) => Promise<SearchResult[]>
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  groups: Partial<Record<SearchCategory, SearchResult[]>>
  errors: Array<{ provider: string; message: string }>
}

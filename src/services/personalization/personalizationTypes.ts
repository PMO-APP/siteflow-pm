export type PersonalItemType = 'project' | 'page' | 'activity' | 'rfi' | 'risk' | 'snag' | 'document' | 'approval' | 'package' | 'report'

export type PersonalItem = {
  id: string
  itemType: PersonalItemType
  itemId?: string | number | null
  title: string
  subtitle?: string | null
  route: string
  projectId?: number | null
  projectName?: string | null
  organizationId?: number | null
  portfolioId?: number | null
  metadata?: Record<string, unknown>
  viewedAt?: string
}

export type WorkspacePreference = {
  favorites: PersonalItem[]
  pinnedModules: string[]
  usage: Record<string, number>
}

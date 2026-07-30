import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderOpen,
  MessageSquareText,
  Shield,
  ShoppingCart,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { SearchContext, SearchProvider, SearchResult } from './searchTypes'

const clean = (value: string) => value.trim().replace(/[%(),]/g, ' ')
const text = (value: unknown, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback
const id = (value: unknown) => String(value ?? '')

function projectFilter<T extends { eq: (column: string, value: number) => T }>(query: T, context: SearchContext) {
  return context.projectId ? query.eq('project_id', context.projectId) : query
}

const projectsProvider: SearchProvider = {
  id: 'projects',
  category: 'Projects',
  async search(query) {
    const term = clean(query)
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, project_code, status, organization_id, portfolio_id')
      .or(`project_name.ilike.%${term}%,project_code.ilike.%${term}%`)
      .limit(8)

    if (error) throw error
    return (data || []).map((row: any): SearchResult => ({
      id: id(row.id),
      title: text(row.project_name, 'Untitled project'),
      subtitle: [text(row.project_code), text(row.status)].filter(Boolean).join(' · '),
      type: 'project',
      category: 'Projects',
      icon: FolderOpen,
      url: '/app',
      projectId: Number(row.id),
      projectName: text(row.project_name),
      score: 100,
      metadata: {
        organizationId: row.organization_id,
        portfolioId: row.portfolio_id,
        status: row.status,
      },
    }))
  },
}

const activitiesProvider: SearchProvider = {
  id: 'activities',
  category: 'Schedule Activities',
  async search(query, context) {
    const term = clean(query)
    let request: any = supabase
      .from('tasks')
      .select('id, project_id, task_name, name, status, progress_pct, wbs_code')
      .or(`task_name.ilike.%${term}%,name.ilike.%${term}%,wbs_code.ilike.%${term}%`)
      .limit(10)
    request = projectFilter(request, context)
    const { data, error } = await request
    if (error) throw error

    return (data || []).map((row: any): SearchResult => ({
      id: id(row.id),
      title: text(row.task_name, text(row.name, 'Untitled activity')),
      subtitle: [text(row.wbs_code), text(row.status), row.progress_pct != null ? `${row.progress_pct}%` : ''].filter(Boolean).join(' · '),
      type: 'activity',
      category: 'Schedule Activities',
      icon: CalendarDays,
      url: `/app/schedule?search=${encodeURIComponent(text(row.task_name, text(row.name)))}`,
      projectId: row.project_id,
      score: 85,
      metadata: { status: row.status, progress: row.progress_pct },
    }))
  },
}

function moduleProvider(config: {
  id: string
  category: SearchProvider['category']
  table: string
  select: string
  or: (term: string) => string
  title: (row: any) => string
  subtitle: (row: any) => string
  type: SearchResult['type']
  url: string
  icon: SearchResult['icon']
  score: number
}): SearchProvider {
  return {
    id: config.id,
    category: config.category,
    async search(query, context) {
      const term = clean(query)
      let request: any = supabase
        .from(config.table)
        .select(config.select)
        .or(config.or(term))
        .limit(8)
      request = projectFilter(request, context)
      const { data, error } = await request
      if (error) throw error
      return (data || []).map((row: any): SearchResult => ({
        id: id(row.id),
        title: config.title(row),
        subtitle: config.subtitle(row),
        type: config.type,
        category: config.category,
        icon: config.icon,
        url: `${config.url}?search=${encodeURIComponent(config.title(row))}`,
        projectId: row.project_id,
        score: config.score,
        metadata: { status: row.status },
      }))
    },
  }
}

export const searchProviders: SearchProvider[] = [
  projectsProvider,
  activitiesProvider,
  moduleProvider({
    id: 'procurement', category: 'Procurement', table: 'procurement_items',
    select: 'id, project_id, name, specification, vendor, status, po_number',
    or: term => `name.ilike.%${term}%,specification.ilike.%${term}%,vendor.ilike.%${term}%,po_number.ilike.%${term}%`,
    title: row => text(row.name, 'Untitled procurement item'),
    subtitle: row => [text(row.vendor), text(row.status), text(row.po_number)].filter(Boolean).join(' · '),
    type: 'procurement', url: '/app/procurement', icon: ShoppingCart, score: 72,
  }),
  moduleProvider({
    id: 'approvals', category: 'Approvals', table: 'approvals',
    select: 'id, project_id, title, type, status, submitted_by',
    or: term => `title.ilike.%${term}%,type.ilike.%${term}%,submitted_by.ilike.%${term}%`,
    title: row => text(row.title, 'Untitled approval'),
    subtitle: row => [text(row.type), text(row.status), text(row.submitted_by)].filter(Boolean).join(' · '),
    type: 'approval', url: '/app/approvals', icon: CheckSquare, score: 70,
  }),
  moduleProvider({
    id: 'risks', category: 'Risks', table: 'risks',
    select: 'id, project_id, title, description, category, status, severity',
    or: term => `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`,
    title: row => text(row.title, 'Untitled risk'),
    subtitle: row => [text(row.category), text(row.severity), text(row.status)].filter(Boolean).join(' · '),
    type: 'risk', url: '/app/risk', icon: Shield, score: 68,
  }),
  moduleProvider({
    id: 'rfis', category: 'RFIs', table: 'rfis',
    select: 'id, project_id, reference_no, title, question, discipline, priority, status',
    or: term => `reference_no.ilike.%${term}%,title.ilike.%${term}%,question.ilike.%${term}%`,
    title: row => [text(row.reference_no), text(row.title)].filter(Boolean).join(' — ') || 'Untitled RFI',
    subtitle: row => [text(row.discipline), text(row.priority), text(row.status)].filter(Boolean).join(' · '),
    type: 'rfi', url: '/app/rfis', icon: MessageSquareText, score: 74,
  }),
  moduleProvider({
    id: 'snags', category: 'Snags', table: 'snags',
    select: 'id, project_id, title, description, location, room, severity, status',
    or: term => `title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%,room.ilike.%${term}%`,
    title: row => text(row.title, 'Untitled snag'),
    subtitle: row => [text(row.location, text(row.room)), text(row.severity), text(row.status)].filter(Boolean).join(' · '),
    type: 'snag', url: '/app/snags', icon: AlertTriangle, score: 66,
  }),
  moduleProvider({
    id: 'documents', category: 'Documents', table: 'documents',
    select: 'id, project_id, name, title, document_number, category, status, file_name',
    or: term => `name.ilike.%${term}%,title.ilike.%${term}%,document_number.ilike.%${term}%,file_name.ilike.%${term}%`,
    title: row => text(row.name, text(row.title, text(row.file_name, 'Untitled document'))),
    subtitle: row => [text(row.document_number), text(row.category), text(row.status)].filter(Boolean).join(' · '),
    type: 'document', url: '/app/documents', icon: FileText, score: 64,
  }),
]

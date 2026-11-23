import { useQuery } from '@tanstack/react-query'
import { useAccessSession } from '@/access/AccessSessionProvider'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'
import { listManagementActions } from '@/services/managementActionService'
import {
  type Approval, type Decision, type Handover, type Milestone, type Package, type ProjectBlock, type Contract, type CostNote, type Data, type Design, type DesignPhoto, type DesignSubmission,
  type DocumentRow, type Finance, type Payment, type Photo, type Procurement, type Project,
  type Report, type ReportPhoto, type Revision, type Risk, type TaskRow, type Variation,
  isoDay, lagosDay, photoReportingWeek, projectPosition,
} from './model'

const PAGE_SIZE = 500
const REFRESH_INTERVAL = 60_000
const COMMERCIAL_ROLES = new Set(['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'costing'])

export function useManagementAccess() {
  const { session, can } = useAccessSession()
  const workspace = useWorkspace()
  const loading = session.loading || workspace.loading || Boolean(workspace.activeWorkspace && workspace.activeWorkspace.id !== session.workspaceId && !session.error)
  const context = { scopeType: 'workspace' as const }
  const permitted = !loading && !!workspace.activeWorkspace && !!session.workspaceId && !!session.userId &&
    session.workspaceType !== 'external' && can('reports.view', context)
  return {
    permitted,
    loading,
    workspaceId: session.workspaceId,
    userId: session.userId,
    canManage: permitted && can('notifications.announce', context),
    includeFinance: permitted && COMMERCIAL_ROLES.has(session.role || '') && can('costing.view', context),
  }
}

type Page<T> = { data: T[] | null; error: { message: string } | null }
async function readPages<T>(read: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = []
  while (true) {
    const { data, error } = await read(rows.length, rows.length + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data?.length || data.length < PAGE_SIZE) return rows
  }
}

async function readScoped<T>(table: string, ids: (string | number)[], signal: AbortSignal, column = 'project_id', filters: Record<string, string | boolean> = {}): Promise<T[] | null> {
  try {
    const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, (i + 1) * 100))
    const records = await Promise.all(chunks.map(chunk => readPages<T>((from, to) => {
      let query = supabase.from(table).select('*').in(column, chunk)
      for (const [field, value] of Object.entries(filters)) query = query.eq(field, value)
      return query.order('id').range(from, to).abortSignal(signal) as unknown as PromiseLike<Page<T>>
    })))
    return records.flat()
  } catch {
    return null
  }
}

function byProject<T extends { project_id: number }>(rows: T[] | null) {
  if (rows === null) return null
  const grouped = new Map<string, T[]>()
  for (const item of rows) {
    const key = String(item.project_id)
    const group = grouped.get(key) || []
    group.push(item)
    grouped.set(key, group)
  }
  return grouped
}

const knownReportPhotoUrl = (value?: string) => {
  if (!value) return undefined
  try {
    const parsed = new URL(value)
    const backend = new URL(import.meta.env.VITE_SUPABASE_URL)
    return parsed.origin === backend.origin && parsed.pathname.startsWith('/storage/v1/object/public/report-photos/')
      ? parsed.href : undefined
  } catch {
    return undefined
  }
}

export type SitePhotoReport = Pick<Report, 'id' | 'project_id' | 'report_date'>

async function loadReportPhotos(reports: SitePhotoReport[], signal: AbortSignal): Promise<Photo[] | null> {
  const reportById = new Map(reports.map(report => [String(report.id), report]))
  const reportPhotos = await readScoped<ReportPhoto>('report_photos', [...reportById.keys()], signal, 'report_id')
  if (!reportPhotos) return null
  return reportPhotos.flatMap(photo => {
    const report = reportById.get(String(photo.report_id))
    const date = isoDay(report?.report_date)
    const src = knownReportPhotoUrl(photo.photo_url)
    if (!report || !date || !src || (photo.report_type && photo.report_type.toLowerCase() !== 'ipd')) return []
    return [{
      id: `ipd:${photo.id}`, projectId: report.project_id, src,
      title: photo.caption || photo.photo_name || 'Site photograph', date,
    }]
  })
}

export function useHistoricalReportPhotos(reports: SitePhotoReport[], enabled: boolean) {
  const { permitted, workspaceId, userId } = useManagementAccess()
  return useQuery({
    queryKey: ['site-photo-history', workspaceId, userId, reports.map(report => [report.id, report.project_id, report.report_date])],
    queryFn: async ({ signal }) => {
      const photos = await loadReportPhotos(reports, signal)
      if (!photos) throw new Error('Photo history could not be loaded')
      return photos
    },
    enabled: enabled && permitted && reports.length > 0,
    staleTime: 30_000,
  })
}

async function loadManagement(workspaceId: string, includeFinance: boolean, signal: AbortSignal) {
  const projects = await readPages<Project>((from, to) => supabase.from('projects').select('*')
    .eq('workspace_id', workspaceId).is('archived_at', null).order('id').range(from, to).abortSignal(signal))
  const ids = projects.map(p => p.id)
  const [tasks, reports, revisions, finance, payments, contracts, variations, design, costNotes, approvals, procurement, risks, documents, designPhotos, designSubmissions, portfolios, packages, blocks, handovers, milestones, decisions, actions] = await Promise.all([
    readScoped<TaskRow>('tasks', ids, signal),
    readScoped<Report>('weekly_reports', ids, signal),
    readScoped<Revision>('schedule_revisions', ids, signal, 'project_id', { is_active: true }),
    includeFinance ? readScoped<Finance>('financial_items', ids, signal) : [],
    includeFinance ? readScoped<Payment>('cost_payments', ids, signal) : [],
    includeFinance ? readScoped<Contract>('cost_contracts', ids, signal) : [],
    includeFinance ? readScoped<Variation>('cost_variations', ids, signal) : [],
    readScoped<Design>('design_reports', ids, signal),
    includeFinance ? readScoped<CostNote>('cost_reports', ids, signal) : [],
    readScoped<Approval>('approvals', ids, signal),
    readScoped<Procurement>('procurement_items', ids, signal),
    readScoped<Risk>('risks', ids, signal),
    readScoped<DocumentRow>('documents', ids, signal),
    readScoped<DesignPhoto>('design_collaboration_files', ids, signal, 'project_id', { context_type: 'weekly' }),
    readScoped<DesignSubmission>('design_report_submissions', ids, signal),
    readScoped<{ id: number; name?: string | null }>('portfolios', [...new Set(projects.flatMap(p => p.portfolio_id == null ? [] : [p.portfolio_id]))], signal, 'id'),
    readScoped<Package>('delivery_packages', ids, signal),
    readScoped<ProjectBlock>('project_blocks', ids, signal),
    readScoped<Handover>('handover_packages', ids, signal),
    readScoped<Milestone>('project_milestones', ids, signal),
    readScoped<Decision>('executive_decisions', [workspaceId], signal, 'workspace_id'),
    listManagementActions(workspaceId).catch(() => null),
  ])
  const today = lagosDay()
  const grouped = {
    tasks: byProject(tasks), reports: byProject(reports), revisions: byProject(revisions),
    finance: byProject<Finance>(finance), payments: byProject<Payment>(payments), contracts: byProject<Contract>(contracts),
    variations: byProject<Variation>(variations), design: byProject(design), costNotes: byProject<CostNote>(costNotes),
    approvals: byProject(approvals), procurement: byProject(procurement), risks: byProject(risks),
    documents: byProject(documents),
    designSubmissions: byProject(designSubmissions),
    packages: byProject(packages),
    blocks: byProject(blocks),
    handovers: byProject(handovers),
    milestones: byProject(milestones),
  }
  const rows = projects.map(project => {
    const data = Object.fromEntries(Object.entries(grouped).map(([key, records]) => [
      key, records ? records.get(String(project.id)) ?? [] : null,
    ])) as Data
    return projectPosition(project, data, today, includeFinance)
  })
  const historyReports = (reports ?? []).flatMap(report => {
    const day = isoDay(report.report_date)
    return day && day <= today ? [{ id: report.id, project_id: report.project_id, report_date: day }] : []
  })
  const latestReportIds = new Set(rows.flatMap(row => row.sitePhotos.reportIds))
  const latestDesignReports = new Map(rows
    .filter(row => row.sitePhotos.designWeek && row.sitePhotos.designWeek === row.sitePhotos.week)
    .map(({ project, sitePhotos }) => [String(project.id), {
      week: sitePhotos.designWeek,
      ids: sitePhotos.designEvidenceIds === null ? null : new Set(sitePhotos.designEvidenceIds),
    }]))
  const reportPhotos = await loadReportPhotos(historyReports.filter(report => latestReportIds.has(String(report.id))), signal)
  const photos: Photo[] = reportPhotos ?? []
  const historyDesignPhotos: Photo[] = []
  const currentWeek = photoReportingWeek(today)!
  for (const photo of designPhotos ?? []) {
    if (!photo.storage_path || !/\.(jpeg|jpg|png|webp|gif|avif)$/i.test(photo.file_name)) continue
    const date = isoDay(photo.context_id) ?? isoDay(photo.created_at)
    if (!date) continue
    const week = photoReportingWeek(date)
    if (!week || week > currentWeek) continue
    const entry = {
      id: `design:${photo.id}`, projectId: photo.project_id, path: photo.storage_path,
      title: photo.caption || photo.location || photo.file_name, date,
    }
    historyDesignPhotos.push(entry)
    const report = latestDesignReports.get(String(photo.project_id))
    if (report?.week === week && (report.ids === null || report.ids.has(String(photo.id)))) photos.push(entry)
  }
  return {
    rows, photos, historyReports, historyDesignPhotos, today,
    decisions: decisions?.filter(row => row.project_id == null || ids.includes(Number(row.project_id))) ?? null,
    actions: actions?.filter(row => row.projectId == null || ids.includes(row.projectId)) ?? null,
    portfolioNames: new Map((portfolios ?? []).map(p => [String(p.id), p.name || `Portfolio ${p.id}`])),
    incomplete: Object.entries(grouped).some(([key, records]) => !['milestones', 'blocks', 'handovers', 'designSubmissions'].includes(key) && records === null) || reportPhotos === null || designPhotos === null,
  }
}
export type ManagementData = Awaited<ReturnType<typeof loadManagement>>

export function useManagementData(access: ReturnType<typeof useManagementAccess>) {
  const { workspaceId, userId, permitted, includeFinance } = access
  return useQuery({
    queryKey: ['management-intelligence', workspaceId, userId, includeFinance],
    queryFn: ({ signal }) => loadManagement(workspaceId!, includeFinance, signal),
    enabled: permitted,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: REFRESH_INTERVAL,
  })
}

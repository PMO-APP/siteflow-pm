
import { supabase } from '@/lib/supabase'
import type { AuditLogRecord, AuditSeverity, RecordVersion } from './auditTypes'

function mapAudit(row: any): AuditLogRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    portfolioId: row.portfolio_id,
    actorId: row.actor_id || row.user_id,
    actorEmail: row.actor_email || row.user_email,
    actorRole: row.actor_role,
    action: row.action,
    module: row.module || row.table_name || 'system',
    tableName: row.table_name,
    recordId: row.record_id || row.item_id,
    description: row.description,
    severity: (row.severity || 'info') as AuditSeverity,
    beforeData: row.before_data,
    afterData: row.after_data,
    changedFields: row.changed_fields || [],
    correlationId: row.correlation_id,
    sessionId: row.session_id,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  }
}

export async function listAuditLogs(filters: {
  workspaceId: string
  projectId?: string | number | null
  module?: string
  action?: string
  severity?: string
  search?: string
  from?: string
  to?: string
  limit?: number
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', filters.workspaceId)
    .order('created_at', { ascending: false })
    .limit(filters.limit || 500)

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.module) query = query.eq('module', filters.module)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)
  if (filters.search) {
    const q = filters.search.replace(/[%_,]/g, ' ').trim()
    if (q) query = query.or(`actor_email.ilike.%${q}%,description.ilike.%${q}%,module.ilike.%${q}%,action.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapAudit)
}

export async function listRecordVersions(workspaceId: string, tableName: string, recordId: string) {
  const { data, error } = await supabase
    .from('record_versions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return (data || []).map((row: any): RecordVersion => ({
    id: row.id,
    workspaceId: row.workspace_id,
    tableName: row.table_name,
    recordId: row.record_id,
    versionNumber: row.version_number,
    operation: row.operation,
    snapshot: row.snapshot || {},
    actorId: row.actor_id,
    createdAt: row.created_at,
  }))
}

export async function restoreRecordVersion(versionId: string) {
  const { data, error } = await supabase.rpc('restore_record_version', { target_version_id: versionId })
  if (error) throw error
  return data
}

export async function writeAuditEvent(input: {
  workspaceId: string
  projectId?: string | number | null
  portfolioId?: string | number | null
  action: string
  module: string
  tableName?: string | null
  recordId?: string | null
  description?: string
  severity?: AuditSeverity
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
}) {
  const { data: session } = await supabase.auth.getSession()
  const user = session.session?.user
  const { error } = await supabase.from('audit_logs').insert({
    workspace_id: input.workspaceId,
    project_id: input.projectId || null,
    portfolio_id: input.portfolioId || null,
    actor_id: user?.id || null,
    actor_email: user?.email || null,
    action: input.action,
    module: input.module,
    table_name: input.tableName || null,
    record_id: input.recordId || null,
    description: input.description || null,
    severity: input.severity || 'info',
    before_data: input.beforeData || null,
    after_data: input.afterData || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    session_id: session.session?.access_token?.slice(-24) || null,
  })
  if (error) throw error
}

export function exportAuditCsv(logs: AuditLogRecord[]) {
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const headers = ['Time','User','Role','Module','Action','Severity','Record','Project','Description','Changed Fields']
  const rows = logs.map(log => [
    log.createdAt, log.actorEmail, log.actorRole, log.module, log.action, log.severity,
    log.recordId, log.projectId, log.description, log.changedFields.join('; ')
  ])
  const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `siteflow-audit-${new Date().toISOString().slice(0,10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

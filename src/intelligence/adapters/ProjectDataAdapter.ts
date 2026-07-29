import type {
  Approval,
  FinancialItem,
  ProcurementItem,
  QualityGate,
  Risk,
  SiteReport,
  Snag,
  Task,
} from '@/types'
import type {
  IntelligenceEvent,
  IntelligenceSeverity,
  ProjectIntelligenceInput,
} from '../models/IntelligenceEvent'

export interface ProjectDataSnapshot {
  projectId: string | number
  projectName?: string
  plannedFinish?: string
  currentProgress?: number
  tasks?: Task[]
  procurement?: ProcurementItem[]
  approvals?: Approval[]
  risks?: Risk[]
  snags?: Snag[]
  financial?: FinancialItem[]
  qualityGates?: QualityGate[]
  siteReports?: SiteReport[]
  now?: Date
}

const asDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const isOverdue = (value: string | undefined, now: Date) => {
  const date = asDate(value)
  return Boolean(date && date < now)
}

const sourceId = (source: string, id: string | number) => `${source}:${id}`

function taskSeverity(task: Task, now: Date): IntelligenceSeverity {
  if (task.status === 'Blocked') return 'critical'
  if (task.status === 'On Hold') return 'high'
  if (task.rag === 'RED') return 'high'
  if (isOverdue(task.finish_date, now) && Number(task.progress_pct || 0) < 100) {
    const finish = asDate(task.finish_date)!
    const days = Math.ceil((now.getTime() - finish.getTime()) / 86_400_000)
    return days > 14 ? 'critical' : days > 5 ? 'high' : 'medium'
  }
  return task.rag === 'AMBER' ? 'medium' : 'low'
}

function riskSeverity(risk: Risk): IntelligenceSeverity {
  const score = Number(risk.risk_score ?? risk.likelihood * risk.impact)
  if (score >= 20) return 'critical'
  if (score >= 15) return 'high'
  if (score >= 8) return 'medium'
  return 'low'
}

function procurementSeverity(item: ProcurementItem, now: Date): IntelligenceSeverity {
  if (item.status === 'Rejected') return 'critical'
  if (item.status === 'Delivered') return 'low'
  if (isOverdue(item.required_on_site, now)) return 'high'
  if (isOverdue(item.order_by_date, now)) return 'medium'
  return 'low'
}

function approvalSeverity(item: Approval, now: Date): IntelligenceSeverity {
  if (item.status === 'Rejected') return 'high'
  if (item.status === 'Approved') return 'low'
  if (isOverdue(item.deadline, now)) return 'high'
  return item.status === 'Resubmit' ? 'medium' : 'low'
}

function snagSeverity(item: Snag): IntelligenceSeverity {
  if (item.severity === 'Critical') return 'critical'
  if (item.severity === 'Major') return 'high'
  return 'medium'
}

export function buildIntelligenceEvents(snapshot: ProjectDataSnapshot): IntelligenceEvent[] {
  const now = snapshot.now || new Date()
  const createdAt = now.toISOString()
  const events: IntelligenceEvent[] = []

  snapshot.tasks?.forEach(task => {
    const open = task.status !== 'Completed' && Number(task.progress_pct || 0) < 100
    const links = (task.dependencies || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
      .map(targetId => ({ type: 'depends_on' as const, targetId: sourceId('schedule', targetId) }))

    events.push({
      id: sourceId('schedule', task.id),
      projectId: snapshot.projectId,
      packageId: task.delivery_package_id,
      activityId: task.id,
      source: 'schedule',
      severity: open ? taskSeverity(task, now) : 'low',
      status: open ? 'open' : 'closed',
      title: task.name,
      description: task.notes || `${task.phase || task.discipline || 'Schedule'} activity at ${Number(task.progress_pct || 0)}% progress.`,
      dueDate: task.finish_date,
      createdAt: task.created_at || createdAt,
      weight: Number(task.weight_pct || 1),
      links,
      metadata: { phase: task.phase, discipline: task.discipline, progress: task.progress_pct, rag: task.rag },
    })
  })

  snapshot.procurement?.forEach(item => {
    const open = item.status !== 'Delivered'
    events.push({
      id: sourceId('procurement', item.id),
      projectId: snapshot.projectId,
      activityId: item.task_id,
      source: 'procurement',
      severity: open ? procurementSeverity(item, now) : 'low',
      status: open ? 'open' : 'closed',
      title: item.name,
      description: item.notes || `${item.status} procurement item${item.vendor ? ` from ${item.vendor}` : ''}.`,
      dueDate: item.required_on_site || item.order_by_date,
      createdAt: item.created_at || createdAt,
      links: item.task_id ? [{ type: 'blocks', targetId: sourceId('schedule', item.task_id) }] : [],
      metadata: { status: item.status, imported: item.is_imported, leadTimeDays: item.lead_time_days },
    })
  })

  snapshot.approvals?.forEach(item => {
    const open = item.status !== 'Approved'
    const links = [] as NonNullable<IntelligenceEvent['links']>
    if (item.task_id) links.push({ type: 'blocks', targetId: sourceId('schedule', item.task_id) })
    if (item.procurement_id) links.push({ type: 'blocks', targetId: sourceId('procurement', item.procurement_id) })
    events.push({
      id: sourceId('approval', item.id),
      projectId: snapshot.projectId,
      activityId: item.task_id,
      source: 'approval',
      severity: open ? approvalSeverity(item, now) : 'low',
      status: open ? 'open' : 'closed',
      title: item.title,
      description: item.description || `${item.type} approval is ${item.status.toLowerCase()}.`,
      dueDate: item.deadline,
      createdAt: item.created_at || createdAt,
      links,
      metadata: { status: item.status, type: item.type, revision: item.revision_number },
    })
  })

  snapshot.risks?.forEach(item => {
    const open = !['Closed', 'Mitigated'].includes(item.status)
    events.push({
      id: sourceId('risk', item.id),
      projectId: snapshot.projectId,
      source: 'risk',
      severity: open ? riskSeverity(item) : 'low',
      status: open ? 'open' : 'closed',
      title: item.title,
      description: item.description || item.mitigation_action,
      dueDate: item.review_date,
      createdAt: item.created_at || createdAt,
      metadata: { category: item.category, likelihood: item.likelihood, impact: item.impact, owner: item.owner },
    })
  })

  snapshot.snags?.forEach(item => {
    const open = item.status !== 'Closed'
    events.push({
      id: sourceId('snag', item.id),
      projectId: snapshot.projectId,
      activityId: item.task_id,
      source: 'snag',
      severity: open ? snagSeverity(item) : 'low',
      status: open ? 'open' : 'closed',
      title: item.title,
      description: item.description || `${item.severity} snag at ${item.location || item.room || 'project site'}.`,
      dueDate: item.target_close_date,
      createdAt: item.created_at || createdAt,
      links: item.task_id ? [{ type: 'relates_to', targetId: sourceId('schedule', item.task_id) }] : [],
      metadata: { severity: item.severity, location: item.location, contractor: item.assigned_contractor },
    })
  })

  snapshot.qualityGates?.forEach(item => {
    const open = !['Approved', 'Reapproved'].includes(item.status)
    events.push({
      id: sourceId('quality', item.id),
      projectId: snapshot.projectId,
      activityId: item.task_id,
      source: 'quality',
      severity: item.status === 'Rejected' ? 'high' : open ? 'medium' : 'low',
      status: open ? 'open' : 'closed',
      title: item.gate_name,
      description: item.inspection_comments || item.comments,
      createdAt: item.created_at || createdAt,
      links: item.blocks_task_id ? [{ type: 'blocks', targetId: sourceId('schedule', item.blocks_task_id) }] : [],
      metadata: { gateType: item.gate_type, inspectionStatus: item.inspection_status },
    })
  })

  snapshot.financial?.forEach(item => {
    const open = ['Pending', 'Submitted'].includes(item.status)
    if (!open) return
    events.push({
      id: sourceId('finance', item.id),
      projectId: snapshot.projectId,
      source: 'finance',
      severity: item.type === 'Payment' ? 'medium' : item.type === 'Variation' ? 'high' : 'low',
      status: 'open',
      title: item.description,
      description: `${item.type} is ${item.status.toLowerCase()}.`,
      createdAt: item.created_at || createdAt,
      value: item.amount,
      metadata: { type: item.type, currency: item.currency, direction: item.direction },
    })
  })

  snapshot.siteReports?.forEach(item => {
    const hasIssue = Boolean(item.issues_encountered || item.actions_required || item.safety_incidents || item.near_misses)
    if (!hasIssue) return
    events.push({
      id: sourceId('site', item.id),
      projectId: snapshot.projectId,
      source: item.safety_incidents > 0 ? 'hse' : 'site',
      severity: item.safety_incidents > 0 ? 'critical' : item.near_misses > 0 ? 'high' : 'medium',
      status: 'open',
      title: `${item.report_type} site report – ${item.report_date}`,
      description: item.issues_encountered || item.actions_required || item.safety_notes,
      occurredAt: item.report_date,
      createdAt: item.created_at || createdAt,
      metadata: { safetyIncidents: item.safety_incidents, nearMisses: item.near_misses },
    })
  })

  return events
}

export function adaptProjectData(snapshot: ProjectDataSnapshot): ProjectIntelligenceInput {
  return {
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    plannedFinish: snapshot.plannedFinish,
    currentProgress: snapshot.currentProgress,
    events: buildIntelligenceEvents(snapshot),
    now: snapshot.now,
  }
}

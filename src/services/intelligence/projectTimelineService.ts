import { supabase } from '@/lib/supabase'

export type TimelinePriority = 'low' | 'normal' | 'high' | 'critical'

export interface ProjectTimelineItem {
  id: string
  eventId?: string | null
  eventType: string
  title: string
  message: string
  module: string
  priority: TimelinePriority
  occurredAt: string
  actorId?: string | null
  entityType?: string | null
  entityId?: string | null
  payload: Record<string, unknown>
}

export interface DependencyNode {
  id: string
  type: string
  title: string
  status?: string | null
  relationship: string
  route?: string
}

export interface DependencyGraph {
  activity: DependencyNode | null
  predecessors: DependencyNode[]
  successors: DependencyNode[]
  connected: DependencyNode[]
}

export interface EventImpactAnalysis {
  severity: TimelinePriority
  affectedActivities: DependencyNode[]
  affectedMilestones: DependencyNode[]
  healthImpact: string
  recoveryImpact: string
  recommendedAction: string
}

const MODULE_LABELS: Record<string, string> = {
  ACTIVITY: 'Schedule',
  PROCUREMENT: 'Procurement',
  APPROVAL: 'Approvals',
  QUALITY_GATE: 'Quality',
  HSE: 'HSE',
  RFI: 'RFIs',
  SNAG: 'Snags',
  RISK: 'Risk',
  HANDOVER: 'Handover',
  HEALTH: 'Health',
  RECOVERY: 'Recovery',
  EXECUTIVE: 'Executive',
  NOTIFICATION: 'Notifications',
}

function moduleFromEventType(eventType: string) {
  const key = Object.keys(MODULE_LABELS).find(prefix => eventType.startsWith(prefix))
  return key ? MODULE_LABELS[key] : 'Project'
}

function normalisePriority(value: unknown): TimelinePriority {
  return value === 'critical' || value === 'high' || value === 'low' ? value : 'normal'
}

function titleFromEventType(eventType: string) {
  return eventType
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export async function fetchProjectTimeline(projectId: string | number, limit = 100): Promise<ProjectTimelineItem[]> {
  const feed = await supabase
    .from('project_activity_feed')
    .select('id,event_id,event_type,title,message,priority,actor_id,entity_type,entity_id,occurred_at,payload')
    .eq('project_id', String(projectId))
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (!feed.error && feed.data?.length) {
    return feed.data.map(row => ({
      id: String(row.id),
      eventId: row.event_id,
      eventType: row.event_type,
      title: row.title || titleFromEventType(row.event_type),
      message: row.message || '',
      module: moduleFromEventType(row.event_type),
      priority: normalisePriority(row.priority),
      occurredAt: row.occurred_at,
      actorId: row.actor_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: (row.payload || {}) as Record<string, unknown>,
    }))
  }

  const events = await supabase
    .from('project_events')
    .select('id,event_type,priority,actor_id,entity_type,entity_id,occurred_at,payload')
    .eq('project_id', String(projectId))
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (events.error) throw events.error

  return (events.data || []).map(row => {
    const payload = (row.payload || {}) as Record<string, unknown>
    return {
      id: String(row.id),
      eventId: String(row.id),
      eventType: row.event_type,
      title: text(payload.title) || text(payload.name) || titleFromEventType(row.event_type),
      message: text(payload.message) || text(payload.summary) || text(payload.description),
      module: moduleFromEventType(row.event_type),
      priority: normalisePriority(row.priority),
      occurredAt: row.occurred_at,
      actorId: row.actor_id,
      entityType: row.entity_type,
      entityId: row.entity_id ? String(row.entity_id) : null,
      payload,
    }
  })
}

function node(row: any, type: string, relationship: string, route?: string): DependencyNode {
  return {
    id: String(row.id),
    type,
    title: row.task_name || row.name || row.title || row.description || `${type} ${row.id}`,
    status: row.status || row.rag || row.priority || null,
    relationship,
    route,
  }
}

async function optionalRows(table: string, projectId: string | number, activityId: string, columns: string[]) {
  for (const column of columns) {
    const response = await supabase.from(table).select('*').eq('project_id', projectId).eq(column, activityId).limit(50)
    if (!response.error) return response.data || []
  }
  return []
}

export async function fetchActivityDependencyGraph(projectId: string | number, activityId: string): Promise<DependencyGraph> {
  const activityResponse = await supabase.from('tasks').select('*').eq('id', activityId).maybeSingle()
  const activity = activityResponse.data ? node(activityResponse.data, 'Activity', 'Selected activity', '/app/schedule') : null
  const row = activityResponse.data as any

  const predecessorIds = Array.isArray(row?.predecessors)
    ? row.predecessors
    : String(row?.predecessor_ids || row?.predecessor || '')
        .split(',')
        .map((value: string) => value.trim())
        .filter(Boolean)

  const predecessorRows = predecessorIds.length
    ? (await supabase.from('tasks').select('*').in('id', predecessorIds)).data || []
    : []

  const successorQueries = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', projectId).contains('predecessors', [activityId]).limit(50),
    supabase.from('tasks').select('*').eq('project_id', projectId).ilike('predecessor_ids', `%${activityId}%`).limit(50),
  ])
  const successorRows = successorQueries.find(result => !result.error)?.data || []

  const lookups = await Promise.all([
    optionalRows('procurement_items', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
    optionalRows('approvals', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
    optionalRows('rfis', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
    optionalRows('risks', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
    optionalRows('quality_gates', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
    optionalRows('snags', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
    optionalRows('documents', projectId, activityId, ['task_id', 'linked_task_id', 'activity_id']),
  ])

  const configs: Array<[string, string, string]> = [
    ['Procurement', 'Material or service requirement', '/app/procurement'],
    ['Approval', 'Required approval', '/app/approvals'],
    ['RFI', 'Technical clarification', '/app/rfis'],
    ['Risk', 'Delivery exposure', '/app/risk'],
    ['Quality Gate', 'Inspection or hold point', '/app/quality-gates'],
    ['Snag', 'Completion constraint', '/app/snags'],
    ['Document', 'Supporting document', '/app/documents'],
  ]

  return {
    activity,
    predecessors: predecessorRows.map(item => node(item, 'Activity', 'Predecessor', '/app/schedule')),
    successors: successorRows.map(item => node(item, 'Activity', 'Successor', '/app/schedule')),
    connected: lookups.flatMap((rows, index) => rows.map(item => node(item, configs[index][0], configs[index][1], configs[index][2]))),
  }
}

function getLinkedActivityIds(event: ProjectTimelineItem) {
  const payload = event.payload || {}
  const values = [
    payload.taskId,
    payload.task_id,
    payload.linkedTaskId,
    payload.linked_task_id,
    payload.activityId,
    payload.activity_id,
    event.entityType === 'task' || event.entityType === 'activity' ? event.entityId : null,
  ]
  return Array.from(new Set(values.filter(Boolean).map(String)))
}

export async function analyseEventImpact(projectId: string | number, event: ProjectTimelineItem): Promise<EventImpactAnalysis> {
  const linkedIds = getLinkedActivityIds(event)
  const activities = linkedIds.length
    ? (await supabase.from('tasks').select('*').in('id', linkedIds)).data || []
    : []
  const milestones = activities.filter((item: any) => item.is_milestone || String(item.task_type || '').toLowerCase() === 'milestone')
  const severe = event.priority === 'critical' || event.eventType.includes('FAILED') || event.eventType.includes('DELAYED') || event.eventType.includes('OVERDUE')
  const activityNodes = activities.map(item => node(item, 'Activity', 'Directly affected', '/app/schedule'))

  let recommendedAction = 'Review the event, confirm ownership, and record the next action.'
  if (event.eventType.includes('PROCUREMENT')) recommendedAction = 'Confirm the supplier recovery date and resequence any affected activity where practical.'
  if (event.eventType.includes('APPROVAL')) recommendedAction = 'Escalate the outstanding decision and confirm the latest date that protects the programme.'
  if (event.eventType.includes('QUALITY_GATE_FAILED')) recommendedAction = 'Close the inspection findings before releasing dependent work.'
  if (event.eventType.includes('RISK_ESCALATED')) recommendedAction = 'Review mitigation ownership, due date, and residual exposure with the project team.'
  if (event.eventType.includes('HANDOVER_BLOCKED')) recommendedAction = 'Resolve the blocking completion evidence and critical snags before the next readiness review.'

  return {
    severity: severe ? event.priority === 'critical' ? 'critical' : 'high' : event.priority,
    affectedActivities: activityNodes,
    affectedMilestones: milestones.map(item => node(item, 'Milestone', 'Milestone exposure', '/app/schedule')),
    healthImpact: severe ? 'This event can reduce the relevant health contributor until the constraint is closed.' : 'No immediate negative health movement is expected from this event.',
    recoveryImpact: linkedIds.length ? 'Recovery forecasting should test the linked activity and its successors.' : 'No direct schedule relationship was identified; confirm the linked activity to enable quantified impact.',
    recommendedAction,
  }
}

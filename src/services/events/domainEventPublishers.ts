import type { Approval, ProcurementItem, Task } from '@/types'
import { dispatchProjectEvent } from './eventDispatcher'
import type { EventPublishResult, ProjectEventType } from './eventTypes'

const asTime = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

const todayStart = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const changedFields = <T extends Record<string, unknown>>(before: T | null, after: T) => {
  if (!before) return Object.keys(after)
  return Object.keys(after).filter((key) => before[key] !== after[key])
}

function taskIsComplete(task: Partial<Task>) {
  return task.status === 'Completed' || Number(task.progress_pct ?? 0) >= 100
}

function taskIsDelayed(task: Partial<Task>) {
  const finish = asTime(task.finish_date)
  return !!finish && finish < todayStart() && !taskIsComplete(task)
}

function procurementIsReceived(item: Partial<ProcurementItem>) {
  return item.status === 'Delivered'
}

function procurementIsDelayed(item: Partial<ProcurementItem>) {
  if (procurementIsReceived(item)) return false
  const due = asTime(item.required_on_site ?? item.order_by_date)
  return !!due && due < todayStart()
}

function approvalIsGranted(item: Partial<Approval>) {
  return item.status === 'Approved'
}

function approvalIsRejected(item: Partial<Approval>) {
  return item.status === 'Rejected' || item.status === 'Resubmit'
}

function approvalIsOverdue(item: Partial<Approval>) {
  if (approvalIsGranted(item) || approvalIsRejected(item)) return false
  const deadline = asTime(item.deadline)
  return !!deadline && deadline < todayStart()
}

async function dispatchMany(inputs: Parameters<typeof dispatchProjectEvent>[0][]) {
  const results: EventPublishResult[] = []
  for (const input of inputs) results.push(await dispatchProjectEvent(input))
  return results
}

export async function publishTaskMutationEvents({
  projectId,
  before,
  after,
  source = 'service',
  metadata,
}: {
  projectId: number | string
  before: Task | null
  after: Task
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
  metadata?: Record<string, unknown>
}) {
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = []
  const isCreate = !before

  inputs.push({
    type: isCreate ? 'ACTIVITY_CREATED' : 'ACTIVITY_UPDATED',
    projectId,
    entityType: 'task',
    entityId: after.id,
    source,
    payload: {
      before,
      after,
      changedFields: changedFields(before as unknown as Record<string, unknown> | null, after as unknown as Record<string, unknown>),
    },
    metadata,
  })

  if ((!before || !taskIsComplete(before)) && taskIsComplete(after)) {
    inputs.push({
      type: 'ACTIVITY_COMPLETED',
      projectId,
      entityType: 'task',
      entityId: after.id,
      source,
      priority: 'normal',
      payload: { before, after },
      metadata,
    })
  }

  if ((!before || !taskIsDelayed(before)) && taskIsDelayed(after)) {
    inputs.push({
      type: 'ACTIVITY_DELAYED',
      projectId,
      entityType: 'task',
      entityId: after.id,
      source,
      priority: after.rag === 'RED' ? 'critical' : 'high',
      payload: { before, after, finishDate: after.finish_date },
      metadata,
    })
  }

  return dispatchMany(inputs)
}

export async function publishProcurementMutationEvents({
  projectId,
  before,
  after,
  source = 'service',
}: {
  projectId: number | string
  before: ProcurementItem | null
  after: ProcurementItem
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
}) {
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = []
  const isCreate = !before

  inputs.push({
    type: isCreate ? 'PROCUREMENT_CREATED' : 'PROCUREMENT_UPDATED',
    projectId,
    entityType: 'procurement_item',
    entityId: after.id,
    source,
    payload: {
      before,
      after,
      changedFields: changedFields(before as unknown as Record<string, unknown> | null, after as unknown as Record<string, unknown>),
      taskId: after.task_id ?? null,
    },
  })

  if ((!before || !procurementIsReceived(before)) && procurementIsReceived(after)) {
    inputs.push({
      type: 'PROCUREMENT_RECEIVED',
      projectId,
      entityType: 'procurement_item',
      entityId: after.id,
      source,
      payload: { before, after, taskId: after.task_id ?? null },
    })
  }

  if ((!before || !procurementIsDelayed(before)) && procurementIsDelayed(after)) {
    inputs.push({
      type: 'PROCUREMENT_DELAYED',
      projectId,
      entityType: 'procurement_item',
      entityId: after.id,
      source,
      priority: after.task_id ? 'critical' : 'high',
      payload: {
        before,
        after,
        taskId: after.task_id ?? null,
        requiredOnSite: after.required_on_site ?? null,
        orderByDate: after.order_by_date ?? null,
      },
    })
  }

  return dispatchMany(inputs)
}

export async function publishApprovalMutationEvents({
  projectId,
  before,
  after,
  source = 'service',
}: {
  projectId: number | string
  before: Approval | null
  after: Approval
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
}) {
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = []
  const isCreate = !before

  inputs.push({
    type: isCreate ? 'APPROVAL_CREATED' : 'APPROVAL_UPDATED',
    projectId,
    entityType: 'approval',
    entityId: after.id,
    source,
    payload: {
      before,
      after,
      changedFields: changedFields(before as unknown as Record<string, unknown> | null, after as unknown as Record<string, unknown>),
      taskId: after.task_id ?? null,
      procurementId: after.procurement_id ?? null,
    },
  })

  if ((!before || !approvalIsGranted(before)) && approvalIsGranted(after)) {
    inputs.push({
      type: 'APPROVAL_GRANTED',
      projectId,
      entityType: 'approval',
      entityId: after.id,
      source,
      payload: { before, after, taskId: after.task_id ?? null, procurementId: after.procurement_id ?? null },
    })
  }

  if ((!before || !approvalIsRejected(before)) && approvalIsRejected(after)) {
    inputs.push({
      type: 'APPROVAL_REJECTED',
      projectId,
      entityType: 'approval',
      entityId: after.id,
      source,
      priority: after.task_id ? 'high' : 'normal',
      payload: { before, after, taskId: after.task_id ?? null, procurementId: after.procurement_id ?? null },
    })
  }

  if ((!before || !approvalIsOverdue(before)) && approvalIsOverdue(after)) {
    inputs.push({
      type: 'APPROVAL_OVERDUE',
      projectId,
      entityType: 'approval',
      entityId: after.id,
      source,
      priority: after.task_id ? 'critical' : 'high',
      payload: {
        before,
        after,
        taskId: after.task_id ?? null,
        procurementId: after.procurement_id ?? null,
        deadline: after.deadline ?? null,
      },
    })
  }

  return dispatchMany(inputs)
}

export function classifyProjectEventType(value: string): ProjectEventType | null {
  return value as ProjectEventType
}

const recordStatus = (record: Record<string, unknown> | null | undefined) =>
  String(record?.status ?? record?.inspection_status ?? '').trim().toLowerCase()

export async function publishQualityGateMutationEvents({
  projectId,
  before,
  after,
  source = 'service',
}: {
  projectId: number | string
  before: Record<string, unknown> | null
  after: Record<string, unknown>
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
}) {
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = [{
    type: before ? 'QUALITY_GATE_CREATED' : 'QUALITY_GATE_CREATED',
    projectId,
    entityType: 'quality_gate',
    entityId: String(after.id ?? before?.id ?? ''),
    source,
    payload: { before, after, changedFields: changedFields(before, after), taskId: after.blocks_task_id ?? after.task_id ?? null },
  }]
  const wasPassed = ['approved', 'reapproved'].includes(recordStatus(before))
  const isPassed = ['approved', 'reapproved'].includes(recordStatus(after))
  const wasFailed = recordStatus(before) === 'rejected'
  const isFailed = recordStatus(after) === 'rejected'
  if (!wasPassed && isPassed) inputs.push({
    type: 'QUALITY_GATE_PASSED', projectId, entityType: 'quality_gate', entityId: String(after.id ?? ''), source,
    payload: { before, after, taskId: after.blocks_task_id ?? after.task_id ?? null },
  })
  if (!wasFailed && isFailed) inputs.push({
    type: 'QUALITY_GATE_FAILED', projectId, entityType: 'quality_gate', entityId: String(after.id ?? ''), source, priority: 'critical',
    payload: { before, after, taskId: after.blocks_task_id ?? after.task_id ?? null, reason: after.rejection_reason ?? null },
  })
  return dispatchMany(inputs)
}

export async function publishRiskMutationEvents({ projectId, before, after, source = 'service' }: {
  projectId: number | string; before: Record<string, unknown> | null; after: Record<string, unknown>;
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
}) {
  const score = Number(after.risk_score ?? Number(after.likelihood ?? 0) * Number(after.impact ?? 0))
  const previousScore = Number(before?.risk_score ?? Number(before?.likelihood ?? 0) * Number(before?.impact ?? 0))
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = [{
    type: before ? 'RISK_UPDATED' : 'RISK_CREATED', projectId, entityType: 'risk', entityId: String(after.id ?? ''), source,
    priority: score >= 15 ? 'critical' : score >= 10 ? 'high' : 'normal',
    payload: { before, after, changedFields: changedFields(before, after), score },
  }]
  if ((score >= 15 && previousScore < 15) || (score >= 10 && score > previousScore + 2)) inputs.push({
    type: 'RISK_ESCALATED', projectId, entityType: 'risk', entityId: String(after.id ?? ''), source,
    priority: score >= 15 ? 'critical' : 'high', payload: { before, after, previousScore, score },
  })
  if (recordStatus(before) !== 'closed' && recordStatus(after) === 'closed') inputs.push({
    type: 'RISK_CLOSED', projectId, entityType: 'risk', entityId: String(after.id ?? ''), source,
    payload: { before, after, score },
  })
  return dispatchMany(inputs)
}

export async function publishSnagMutationEvents({ projectId, before, after, source = 'service' }: {
  projectId: number | string; before: Record<string, unknown> | null; after: Record<string, unknown>;
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
}) {
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = [{
    type: before ? 'SNAG_UPDATED' : 'SNAG_CREATED', projectId, entityType: 'snag', entityId: String(after.id ?? ''), source,
    priority: String(after.severity ?? '').toLowerCase() === 'critical' ? 'critical' : 'normal',
    payload: { before, after, changedFields: changedFields(before, after), taskId: after.task_id ?? null },
  }]
  if (recordStatus(before) !== 'closed' && recordStatus(after) === 'closed') inputs.push({
    type: 'SNAG_CLOSED', projectId, entityType: 'snag', entityId: String(after.id ?? ''), source,
    payload: { before, after, taskId: after.task_id ?? null },
  })
  return dispatchMany(inputs)
}

export async function publishHSEMutationEvents({ projectId, kind, before, after, source = 'service' }: {
  projectId: number | string; kind: 'observation' | 'incident'; before: Record<string, unknown> | null; after: Record<string, unknown>;
  source?: 'ui' | 'service' | 'database' | 'system' | 'integration'
}) {
  const prefix = kind === 'incident' ? 'HSE_INCIDENT' : 'HSE_OBSERVATION'
  const baseType = `${prefix}_${before ? 'UPDATED' : 'CREATED'}` as ProjectEventType
  const inputs: Parameters<typeof dispatchProjectEvent>[0][] = [{
    type: baseType, projectId, entityType: `hse_${kind}`, entityId: String(after.id ?? before?.id ?? ''), source,
    priority: kind === 'incident' && recordStatus(after) !== 'closed' ? 'high' : 'normal',
    payload: { before, after, changedFields: changedFields(before, after) },
  }]
  if (recordStatus(before) !== 'closed' && recordStatus(after) === 'closed') inputs.push({
    type: `${prefix}_CLOSED` as ProjectEventType, projectId, entityType: `hse_${kind}`, entityId: String(after.id ?? before?.id ?? ''), source,
    payload: { before, after },
  })
  return dispatchMany(inputs)
}

export async function publishHandoverEvent({ projectId, packageId, type, payload, priority = 'normal' }: {
  projectId: number | string; packageId: number | string; type: 'HANDOVER_READINESS_UPDATED' | 'HANDOVER_BLOCKED' | 'HANDOVER_APPROVED';
  payload: Record<string, unknown>; priority?: 'low' | 'normal' | 'high' | 'critical'
}) {
  return dispatchProjectEvent({ type, projectId, entityType: 'handover_package', entityId: packageId, source: 'ui', priority, payload })
}

import { supabase } from '@/lib/supabase'
import { notifyUsers } from '@/lib/notifications'
import { getProjectHealth } from '@/services/healthService'
import {
  evaluateHealthAlerts,
  saveProjectHealthSnapshot,
} from '@/core/health/healthSnapshotService'
import { dispatchProjectEvent } from './eventDispatcher'
import { subscribeProjectEvent } from './eventBus'
import type { ProjectEvent, ProjectEventType } from './eventTypes'

const HEALTH_TRIGGERS: ProjectEventType[] = [
  'ACTIVITY_CREATED',
  'ACTIVITY_UPDATED',
  'ACTIVITY_DELAYED',
  'ACTIVITY_COMPLETED',
  'PROCUREMENT_CREATED',
  'PROCUREMENT_UPDATED',
  'PROCUREMENT_DELAYED',
  'PROCUREMENT_RECEIVED',
  'APPROVAL_CREATED',
  'APPROVAL_UPDATED',
  'APPROVAL_GRANTED',
  'APPROVAL_REJECTED',
  'APPROVAL_OVERDUE',
  'QUALITY_GATE_FAILED',
  'QUALITY_GATE_PASSED',
  'RISK_ESCALATED',
  'RISK_CLOSED',
  'SNAG_CREATED',
  'SNAG_CLOSED',
  'HEALTH_RECALCULATION_REQUESTED',
]

const RECOVERY_TRIGGERS: ProjectEventType[] = [
  'ACTIVITY_DELAYED',
  'ACTIVITY_COMPLETED',
  'PROCUREMENT_DELAYED',
  'PROCUREMENT_RECEIVED',
  'APPROVAL_OVERDUE',
  'APPROVAL_GRANTED',
  'RECOVERY_RECALCULATION_REQUESTED',
]

const NOTIFICATION_TRIGGERS = new Set<ProjectEventType>([
  'ACTIVITY_DELAYED',
  'PROCUREMENT_DELAYED',
  'APPROVAL_OVERDUE',
  'APPROVAL_REJECTED',
  'QUALITY_GATE_FAILED',
  'RISK_ESCALATED',
  'HEALTH_RECALCULATED',
])

const inFlightHealth = new Map<string, Promise<void>>()
const inFlightRecovery = new Map<string, Promise<void>>()

function projectKey(event: ProjectEvent) {
  return event.projectId == null ? null : String(event.projectId)
}

function eventTitle(event: ProjectEvent) {
  const labels: Partial<Record<ProjectEventType, string>> = {
    ACTIVITY_DELAYED: 'Schedule activity delayed',
    ACTIVITY_COMPLETED: 'Schedule activity completed',
    PROCUREMENT_DELAYED: 'Procurement item delayed',
    PROCUREMENT_RECEIVED: 'Procurement item received',
    APPROVAL_OVERDUE: 'Approval overdue',
    APPROVAL_GRANTED: 'Approval granted',
    APPROVAL_REJECTED: 'Approval rejected',
    QUALITY_GATE_FAILED: 'Quality gate failed',
    QUALITY_GATE_PASSED: 'Quality gate passed',
    RISK_ESCALATED: 'Project risk escalated',
    RISK_CLOSED: 'Project risk closed',
    SNAG_CREATED: 'Snag created',
    SNAG_CLOSED: 'Snag closed',
    HEALTH_RECALCULATED: 'Project health recalculated',
    RECOVERY_UPDATED: 'Recovery forecast updated',
    EXECUTIVE_SUMMARY_UPDATED: 'Executive summary updated',
  }
  return labels[event.type] ?? event.type.split('_').join(' ').toLowerCase()
}

function payloadName(event: ProjectEvent) {
  const payload = event.payload as Record<string, unknown>
  return String(
    payload.name ?? payload.title ?? payload.activityName ?? payload.itemName ?? payload.reference ?? '',
  ).trim()
}

function activityMessage(event: ProjectEvent) {
  const name = payloadName(event)
  return name ? `${eventTitle(event)}: ${name}` : eventTitle(event)
}

async function upsertIntelligenceState(
  projectId: string,
  kind: 'recovery' | 'executive_summary',
  value: Record<string, unknown>,
  event: ProjectEvent,
) {
  const { error } = await supabase.from('project_intelligence_state').upsert(
    {
      project_id: projectId,
      state_type: kind,
      state: value,
      source_event_id: event.id,
      correlation_id: event.correlationId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,state_type' },
  )
  if (error) throw error
}

async function persistActivityFeed(event: ProjectEvent) {
  const projectId = projectKey(event)
  if (!projectId) return

  const { error } = await supabase.from('project_activity_feed').upsert({
    id: `feed_${event.id}`,
    project_id: projectId,
    event_id: event.id,
    event_type: event.type,
    title: eventTitle(event),
    message: activityMessage(event),
    priority: event.priority,
    actor_id: event.actorId ?? null,
    entity_type: event.entityType ?? null,
    entity_id: event.entityId == null ? null : String(event.entityId),
    occurred_at: event.occurredAt,
    payload: event.payload,
  })
  if (error) throw error
}

async function recalculateHealth(event: ProjectEvent) {
  const projectId = projectKey(event)
  if (!projectId) return

  const existing = inFlightHealth.get(projectId)
  if (existing) return existing

  const operation = (async () => {
    const result = await getProjectHealth(projectId)
    const snapshot = await saveProjectHealthSnapshot({
      projectId,
      organizationId: event.organizationId,
      portfolioId: event.portfolioId,
      health: result.health,
      source: `event:${event.type.toLowerCase()}`,
    })
    const alerts = evaluateHealthAlerts(result.health)

    await dispatchProjectEvent({
      type: 'HEALTH_RECALCULATED',
      source: 'system',
      priority: alerts.some(alert => alert.severity === 'critical') ? 'critical' : result.health.score < 70 ? 'high' : 'normal',
      projectId,
      portfolioId: event.portfolioId,
      organizationId: event.organizationId,
      correlationId: event.correlationId,
      causationId: event.id,
      entityType: 'project_health_snapshot',
      entityId: snapshot.id,
      payload: {
        score: result.health.score,
        label: result.health.label,
        tone: result.health.tone,
        confidence: result.health.confidence.score,
        summary: result.health.summary,
        drivers: result.health.drivers,
        recommendations: result.health.recommendations,
        alerts,
        partial: result.partial,
      },
    })
  })().finally(() => inFlightHealth.delete(projectId))

  inFlightHealth.set(projectId, operation)
  return operation
}

function deriveRecoveryState(source: Awaited<ReturnType<typeof getProjectHealth>>) {
  const now = Date.now()
  const delayed = source.sourceData.tasks.filter(task => {
    const finish = task.planned_finish ?? task.finish_date
    const progress = Number(task.progress_pct ?? task.progress ?? 0)
    return finish && new Date(String(finish)).getTime() < now && progress < 100
  })
  const critical = delayed.filter(task => Boolean(task.is_critical ?? task.critical) || String(task.priority ?? '').toLowerCase() === 'critical')
  const overdueProcurement = source.sourceData.procurement.filter(item => {
    const due = item.required_on_site ?? item.order_by_date
    return due && new Date(String(due)).getTime() < now && !['delivered', 'received', 'closed'].includes(String(item.status ?? '').toLowerCase())
  })
  const overdueApprovals = source.sourceData.approvals.filter(item => {
    return item.deadline && new Date(String(item.deadline)).getTime() < now && !['approved', 'granted', 'closed'].includes(String(item.status ?? '').toLowerCase())
  })
  const grossDelayDays = Number(source.input.forecastVarianceDays ?? 0)
  const recoverableDays = Math.max(0, Math.min(grossDelayDays, Math.round((100 - critical.length * 8 - overdueProcurement.length * 4 - overdueApprovals.length * 3) / 10)))
  const netDelayDays = Math.max(0, grossDelayDays - recoverableDays)
  const status = netDelayDays === 0 && critical.length === 0
    ? 'on_track'
    : netDelayDays <= 7 && critical.length <= 2
      ? 'watch'
      : netDelayDays <= 30
        ? 'recovery_required'
        : 'critical'
  const confidence = Math.max(10, Math.min(95, 85 - critical.length * 8 - overdueProcurement.length * 4 - overdueApprovals.length * 3))
  const primaryConstraint = critical[0]?.name
    ?? overdueProcurement[0]?.item_name
    ?? overdueApprovals[0]?.title
    ?? 'No material constraint identified'

  return {
    status,
    grossDelayDays,
    recoverableDays,
    netDelayDays,
    confidence,
    criticalDelayedActivities: critical.length,
    overdueProcurementItems: overdueProcurement.length,
    overdueApprovals: overdueApprovals.length,
    primaryConstraint,
    recommendation: status === 'on_track'
      ? 'Maintain current production and protect upcoming approvals and deliveries.'
      : `Resolve ${primaryConstraint} and agree a dated recovery action with the accountable owner.`,
    calculatedAt: new Date().toISOString(),
  }
}

async function recalculateRecovery(event: ProjectEvent) {
  const projectId = projectKey(event)
  if (!projectId) return

  const existing = inFlightRecovery.get(projectId)
  if (existing) return existing

  const operation = (async () => {
    const source = await getProjectHealth(projectId)
    const recovery = deriveRecoveryState(source)
    await upsertIntelligenceState(projectId, 'recovery', recovery, event)
    await dispatchProjectEvent({
      type: 'RECOVERY_UPDATED',
      source: 'system',
      priority: recovery.status === 'critical' ? 'critical' : recovery.status === 'recovery_required' ? 'high' : 'normal',
      projectId,
      portfolioId: event.portfolioId,
      organizationId: event.organizationId,
      correlationId: event.correlationId,
      causationId: event.id,
      entityType: 'project_recovery',
      entityId: projectId,
      payload: recovery,
    })
  })().finally(() => inFlightRecovery.delete(projectId))

  inFlightRecovery.set(projectId, operation)
  return operation
}

async function regenerateExecutiveSummary(event: ProjectEvent) {
  const projectId = projectKey(event)
  if (!projectId) return

  const healthResult = await getProjectHealth(projectId)
  const { data: recoveryRow } = await supabase
    .from('project_intelligence_state')
    .select('state')
    .eq('project_id', projectId)
    .eq('state_type', 'recovery')
    .maybeSingle()
  const recovery = (recoveryRow?.state ?? {}) as Record<string, unknown>

  const weakest = [...healthResult.health.contributors]
    .filter(item => item.status === 'assessed')
    .sort((a, b) => Number(a.score) - Number(b.score))[0]
  const managementFocus = (weakest?.recommendations?.[0]
    ?? String(recovery.recommendation ?? ''))
    || 'Maintain current controls and close emerging constraints promptly.'
  const summary = `${healthResult.health.summary} Recovery status is ${String(recovery.status ?? 'not yet assessed').split('_').join(' ')}${recovery.netDelayDays != null ? ` with ${recovery.netDelayDays} forecast net delay day(s)` : ''}. Management focus: ${managementFocus}`
  const state = {
    summary,
    healthScore: healthResult.health.score,
    healthLabel: healthResult.health.label,
    primaryConstraint: recovery.primaryConstraint ?? weakest?.label ?? null,
    managementFocus,
    generatedAt: new Date().toISOString(),
    deterministic: true,
  }
  await upsertIntelligenceState(projectId, 'executive_summary', state, event)
  await dispatchProjectEvent({
    type: 'EXECUTIVE_SUMMARY_UPDATED',
    source: 'system',
    priority: event.priority,
    projectId,
    portfolioId: event.portfolioId,
    organizationId: event.organizationId,
    correlationId: event.correlationId,
    causationId: event.id,
    entityType: 'executive_summary',
    entityId: projectId,
    payload: state,
  })
}

async function sendEventNotification(event: ProjectEvent) {
  if (!NOTIFICATION_TRIGGERS.has(event.type) || !event.projectId) return

  const healthPayload = event.type === 'HEALTH_RECALCULATED' ? event.payload as Record<string, unknown> : null
  if (healthPayload && Number(healthPayload.score ?? 100) >= 70 && event.priority !== 'critical') return

  const title = eventTitle(event)
  const message = event.type === 'HEALTH_RECALCULATED'
    ? String(healthPayload?.summary ?? activityMessage(event))
    : activityMessage(event)

  await Promise.all([
    notifyUsers({ projectId: Number(event.projectId), recipientRole: 'pmo', type: event.type.toLowerCase(), title, message }),
    notifyUsers({ projectId: Number(event.projectId), recipientRole: 'project_owner', type: event.type.toLowerCase(), title, message }),
  ])
}

export function registerConnectedIntelligenceHandlers() {
  const unsubscribe: Array<() => void> = []

  HEALTH_TRIGGERS.forEach(type => {
    unsubscribe.push(subscribeProjectEvent(type, recalculateHealth, { name: `health-handler:${type}` }))
  })
  RECOVERY_TRIGGERS.forEach(type => {
    unsubscribe.push(subscribeProjectEvent(type, recalculateRecovery, { name: `recovery-handler:${type}` }))
  })

  unsubscribe.push(subscribeProjectEvent('HEALTH_RECALCULATED', regenerateExecutiveSummary, { name: 'executive-summary:health' }))
  unsubscribe.push(subscribeProjectEvent('RECOVERY_UPDATED', regenerateExecutiveSummary, { name: 'executive-summary:recovery' }))
  unsubscribe.push(subscribeProjectEvent('*', persistActivityFeed, { name: 'project-activity-feed' }))
  unsubscribe.push(subscribeProjectEvent('*', sendEventNotification, { name: 'connected-notifications' }))

  return () => unsubscribe.forEach(stop => stop())
}

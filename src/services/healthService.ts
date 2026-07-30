import { differenceInCalendarDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import {
  calculateProjectHealth,
  type HealthInput,
} from '@/core/engine/projectHealthEngine'
import type { ProjectHealthResult } from '@/core/engine/types'

export type HealthDataSourceKey =
  | 'project'
  | 'schedule'
  | 'procurement'
  | 'approvals'
  | 'quality'
  | 'snags'
  | 'risk'
  | 'safety'
  | 'commercial'
  | 'governance'

export type HealthSourceStatus = {
  key: HealthDataSourceKey
  available: boolean
  count: number
  error?: string
}

export type ProjectHealthSourceData = {
  project: Record<string, any> | null
  tasks: Record<string, any>[]
  procurement: Record<string, any>[]
  approvals: Record<string, any>[]
  qualityGates: Record<string, any>[]
  snags: Record<string, any>[]
  risks: Record<string, any>[]
  siteReports: Record<string, any>[]
  safetyLogs: Record<string, any>[]
  financialItems: Record<string, any>[]
  governanceExceptions: Record<string, any>[]
}

export type ProjectHealthServiceResult = {
  health: ProjectHealthResult
  input: HealthInput
  sourceData: ProjectHealthSourceData
  sources: HealthSourceStatus[]
  partial: boolean
  fetchedAt: string
}

type FetchResult<T> = {
  data: T
  available: boolean
  error?: string
}

const CLOSED_STATUSES = new Set([
  'completed',
  'complete',
  'closed',
  'approved',
  'delivered',
  'paid',
  'certified',
  'mitigated',
  'transferred',
  'reapproved',
])

const ACTIVE_APPROVAL_STATUSES = new Set([
  'draft',
  'submitted',
  'under review',
  'resubmit',
])

function text(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function validDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function isPast(value: unknown, now: Date) {
  const date = validDate(value)
  return Boolean(date && date < now)
}

function isOpenStatus(value: unknown) {
  return !CLOSED_STATUSES.has(text(value))
}

function progressOf(task: Record<string, any>) {
  const status = text(task.status)
  if (status === 'completed' || status === 'complete') return 100
  return Math.max(0, Math.min(100, number(task.progress_pct ?? task.progress)))
}

function weightedProgress(tasks: Record<string, any>[]) {
  if (!tasks.length) return 0
  const totalWeight = tasks.reduce(
    (sum, task) => sum + Math.max(0, number(task.weight_pct ?? task.weight)),
    0,
  )
  if (totalWeight <= 0) {
    return tasks.reduce((sum, task) => sum + progressOf(task), 0) / tasks.length
  }
  return tasks.reduce(
    (sum, task) =>
      sum + Math.max(0, number(task.weight_pct ?? task.weight)) * progressOf(task),
    0,
  ) / totalWeight
}

function plannedProgress(
  tasks: Record<string, any>[],
  project: Record<string, any> | null,
  now: Date,
) {
  const datedTasks = tasks
    .map(task => ({
      start: validDate(task.planned_start ?? task.start_date),
      finish: validDate(task.planned_finish ?? task.finish_date),
    }))
    .filter(item => item.start && item.finish) as Array<{ start: Date; finish: Date }>

  const taskStart = datedTasks.length
    ? new Date(Math.min(...datedTasks.map(item => item.start.getTime())))
    : null
  const taskFinish = datedTasks.length
    ? new Date(Math.max(...datedTasks.map(item => item.finish.getTime())))
    : null
  const start = validDate(project?.start_date) ?? taskStart
  const finish =
    validDate(project?.handover_date ?? project?.finish_date ?? project?.end_date) ??
    taskFinish

  if (!start || !finish || finish <= start) return 0
  const total = Math.max(1, differenceInCalendarDays(finish, start))
  const elapsed = Math.max(0, Math.min(total, differenceInCalendarDays(now, start)))
  return (elapsed / total) * 100
}

function forecastVarianceDays(
  tasks: Record<string, any>[],
  project: Record<string, any> | null,
) {
  const plannedFinish = validDate(
    project?.handover_date ?? project?.finish_date ?? project?.end_date,
  )
  const forecastDates = tasks
    .map(task =>
      validDate(
        task.forecast_finish ??
          task.forecast_finish_date ??
          task.actual_finish ??
          task.finish_date ??
          task.planned_finish,
      ),
    )
    .filter(Boolean) as Date[]
  const forecastFinish = forecastDates.length
    ? new Date(Math.max(...forecastDates.map(date => date.getTime())))
    : null
  if (!plannedFinish || !forecastFinish) return 0
  return Math.max(0, differenceInCalendarDays(forecastFinish, plannedFinish))
}

async function fetchRows(
  table: string,
  projectId: string | number,
): Promise<FetchResult<Record<string, any>[]>> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('project_id', projectId)

  if (error) {
    return { data: [], available: false, error: error.message }
  }
  return { data: (data ?? []) as Record<string, any>[], available: true }
}

async function fetchProject(
  projectId: string | number,
): Promise<FetchResult<Record<string, any> | null>> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error) return { data: null, available: false, error: error.message }
  return { data: (data as Record<string, any> | null) ?? null, available: true }
}

function sourceStatus(
  key: HealthDataSourceKey,
  result: FetchResult<Record<string, any>[] | Record<string, any> | null>,
): HealthSourceStatus {
  const count = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0
  return {
    key,
    available: result.available,
    count,
    ...(result.error ? { error: result.error } : {}),
  }
}

export async function getProjectHealth(
  projectId: string | number,
  options: { now?: Date } = {},
): Promise<ProjectHealthServiceResult> {
  const now = options.now ?? new Date()

  const [
    projectResult,
    tasksResult,
    procurementResult,
    approvalsResult,
    qualityResult,
    snagsResult,
    risksResult,
    siteReportsResult,
    safetyLogsResult,
    financialResult,
    governanceResult,
  ] = await Promise.all([
    fetchProject(projectId),
    fetchRows('tasks', projectId),
    fetchRows('procurement_items', projectId),
    fetchRows('approvals', projectId),
    fetchRows('quality_gates', projectId),
    fetchRows('snags', projectId),
    fetchRows('risks', projectId),
    fetchRows('site_reports', projectId),
    fetchRows('safety_logs', projectId),
    fetchRows('financial_items', projectId),
    fetchRows('governance_exceptions', projectId),
  ])

  const project = projectResult.data
  const tasks = tasksResult.data
  const procurement = procurementResult.data
  const approvals = approvalsResult.data
  const qualityGates = qualityResult.data
  const snags = snagsResult.data
  const risks = risksResult.data
  const siteReports = siteReportsResult.data
  const safetyLogs = safetyLogsResult.data
  const financialItems = financialResult.data
  const governanceExceptions = governanceResult.data

  const overdueTasks = tasks.filter(task => {
    const finish = task.planned_finish ?? task.finish_date
    return isPast(finish, now) && progressOf(task) < 100
  })
  const criticalDelayedTasks = overdueTasks.filter(task =>
    Boolean(task.is_critical ?? task.critical ?? text(task.priority) === 'critical'),
  )

  const openProcurement = procurement.filter(item => isOpenStatus(item.status))
  const procurementRisks = openProcurement.filter(item => {
    const status = text(item.status)
    return (
      status === 'rejected' ||
      isPast(item.order_by_date, now) ||
      (isPast(item.required_on_site, now) && status !== 'delivered')
    )
  })
  const overdueProcurementItems = openProcurement.filter(item =>
    isPast(item.required_on_site ?? item.order_by_date, now),
  )
  const longLeadItems = openProcurement.filter(
    item => number(item.lead_time_days) >= 30 || Boolean(item.is_imported),
  )

  const pendingApprovals = approvals.filter(item =>
    ACTIVE_APPROVAL_STATUSES.has(text(item.status)),
  )
  const overdueApprovals = pendingApprovals.filter(item => isPast(item.deadline, now))
  const completedApprovalDurations = approvals
    .map(item => {
      const start = validDate(item.submitted_date ?? item.created_at)
      const end = validDate(item.approved_date ?? item.reviewed_at)
      return start && end ? Math.max(0, differenceInCalendarDays(end, start)) : null
    })
    .filter((value): value is number => value !== null)

  const failedInspections = qualityGates.filter(item => {
    const status = text(item.inspection_status ?? item.status)
    return status === 'rejected' || status === 'failed'
  })
  const openNCRs = qualityGates.filter(item => {
    const type = text(item.gate_type ?? item.type)
    return type.includes('ncr') && isOpenStatus(item.status)
  })

  const openSnags = snags.filter(item => isOpenStatus(item.status))
  const criticalSnags = openSnags.filter(item => text(item.severity) === 'critical')

  const openRisks = risks.filter(item => text(item.status) === 'open')
  const highRisks = openRisks.filter(
    item => number(item.risk_score) >= 15 || number(item.likelihood) * number(item.impact) >= 15,
  )
  const overdueMitigations = openRisks.filter(item => isPast(item.review_date, now))

  const safetyIncidentsFromReports = siteReports.reduce(
    (sum, report) => sum + number(report.safety_incidents) + number(report.accidents),
    0,
  )
  const safetyIncidentsFromLogs = safetyLogs.reduce(
    (sum, log) => sum + number(log.accidents) + number(log.lti) + number(log.fatalities),
    0,
  )
  const openHSEActions = governanceExceptions.filter(item => {
    const module = text(item.module ?? item.category)
    return module.includes('hse') || module.includes('safety')
  })
  const overdueHSEActions = openHSEActions.filter(item =>
    isPast(item.due_date ?? item.deadline ?? item.review_date, now),
  )

  const contractSum = financialItems
    .filter(item => text(item.type) === 'contract sum')
    .reduce((sum, item) => sum + number(item.amount), 0)
  const approvedVariations = financialItems
    .filter(item => text(item.type) === 'variation' && ['approved', 'certified', 'paid'].includes(text(item.status)))
    .reduce((sum, item) => sum + number(item.amount) * (text(item.direction) === 'omission' ? -1 : 1), 0)
  const pendingPayments = financialItems
    .filter(item => text(item.type) === 'payment' && !['paid', 'certified'].includes(text(item.status)))
    .reduce((sum, item) => sum + number(item.amount), 0)
  const pendingVariations = financialItems.filter(
    item => text(item.type) === 'variation' && ['pending', 'submitted'].includes(text(item.status)),
  ).length

  const governancePenalty = governanceExceptions.reduce((sum, item) => {
    const severity = text(item.severity)
    return sum + (severity === 'critical' ? 15 : severity === 'warning' ? 7 : 2)
  }, 0)

  const input: HealthInput = {
    ...(tasksResult.available
      ? {
          scheduleProgress: weightedProgress(tasks),
          plannedProgress: plannedProgress(tasks, project, now),
          overdueTasks: overdueTasks.length,
          totalTasks: tasks.length,
          criticalDelayedTasks: criticalDelayedTasks.length,
          forecastVarianceDays: forecastVarianceDays(tasks, project),
        }
      : {}),
    ...(procurementResult.available
      ? {
          procurementItems: procurement.length,
          procurementRisks: procurementRisks.length,
          overdueProcurementItems: overdueProcurementItems.length,
          longLeadItems: longLeadItems.length,
        }
      : {}),
    ...(approvalsResult.available
      ? {
          pendingApprovals: pendingApprovals.length,
          overdueApprovals: overdueApprovals.length,
          averageApprovalDays: completedApprovalDurations.length
            ? completedApprovalDurations.reduce((sum, days) => sum + days, 0) /
              completedApprovalDurations.length
            : 0,
        }
      : {}),
    ...(qualityResult.available || snagsResult.available
      ? {
          openSnags: snagsResult.available ? openSnags.length : undefined,
          criticalSnags: snagsResult.available ? criticalSnags.length : undefined,
          failedInspections: qualityResult.available ? failedInspections.length : undefined,
          openNCRs: qualityResult.available ? openNCRs.length : undefined,
        }
      : {}),
    ...(risksResult.available
      ? {
          openRisks: openRisks.length,
          highRisks: highRisks.length,
          overdueMitigations: overdueMitigations.length,
        }
      : {}),
    ...(siteReportsResult.available || safetyLogsResult.available || governanceResult.available
      ? {
          safetyIncidents: safetyIncidentsFromReports + safetyIncidentsFromLogs,
          openHSEActions: governanceResult.available ? openHSEActions.length : undefined,
          overdueHSEActions: governanceResult.available ? overdueHSEActions.length : undefined,
        }
      : {}),
    ...(financialResult.available
      ? {
          contractSum,
          projectedFinalCost: contractSum + approvedVariations,
          pendingPayments,
          pendingVariations,
        }
      : {}),
    ...(governanceResult.available
      ? { governanceScore: Math.max(0, 100 - governancePenalty) }
      : {}),
  }

  const sources: HealthSourceStatus[] = [
    sourceStatus('project', projectResult),
    sourceStatus('schedule', tasksResult),
    sourceStatus('procurement', procurementResult),
    sourceStatus('approvals', approvalsResult),
    sourceStatus('quality', qualityResult),
    sourceStatus('snags', snagsResult),
    sourceStatus('risk', risksResult),
    sourceStatus('safety', {
      data: [...siteReports, ...safetyLogs],
      available: siteReportsResult.available || safetyLogsResult.available,
      error: [siteReportsResult.error, safetyLogsResult.error].filter(Boolean).join('; ') || undefined,
    }),
    sourceStatus('commercial', financialResult),
    sourceStatus('governance', governanceResult),
  ]

  return {
    health: calculateProjectHealth(input),
    input,
    sourceData: {
      project,
      tasks,
      procurement,
      approvals,
      qualityGates,
      snags,
      risks,
      siteReports,
      safetyLogs,
      financialItems,
      governanceExceptions,
    },
    sources,
    partial: sources.some(source => !source.available),
    fetchedAt: new Date().toISOString(),
  }
}

import { calculateForecastV2 } from '@/core/intelligence/forecast/forecastV2'
import { normalizeProjectState } from '@/core/intelligence/normalizers/projectStateNormalizer'
import { applyControlledProgramme, latestControlledRevisions, type ControlledRevision } from '@/features/schedule/controlledProgramme'
import type { RevisionProgrammeActivity } from '@/features/schedule/revisionProgramme'
import { calculateProjectPlannedProgress, calculateProjectProgress, taskProgress, type ProgressTask } from '@/core/metrics/progressMetrics'

type Amount = number | string | null
type RecordRow = { id: string | number; project_id: number; updated_at?: string | null; created_at?: string | null }
export type Project = {
  id: number
  project_name: string
  portfolio_id?: number | null
  organization_id?: number | null
  status?: string | null
  phase?: string | null
  handover_date?: string | null
  planned_completion_date?: string | null
  actual_completion_date?: string | null
  initial_budget?: Amount
  original_budget?: Amount
  current_approved_budget?: Amount
  cost_to_complete?: Amount
  approved_budget?: Amount
  currency?: string | null
  overall_owner_email?: string | null
  updated_at?: string | null
}
type PackageReference = {
  delivery_package_id?: string | number | null
  block_id?: string | number | null
  package_name?: string | null
}
export type TaskRow = RecordRow & ProgressTask & PackageReference & {
  name?: string
  task_number?: number | null
  actual_finish?: string | null
  delay_reason?: string | null
  recovery_action?: string | null
  responsible?: string | null
  is_milestone?: boolean
  is_summary?: boolean
  is_blocked?: boolean
  is_on_hold?: boolean
}
export type Report = RecordRow & {
  report_date: string
  workflow_status?: string | null
  discipline?: string
  delivery_package_id?: string | number | null
  block_id?: string | number | null
  package_name?: string
  status?: string
  status_summary?: string
  pending_issues?: string
  matters_arising?: string
  payment_issues?: string
  procurement_tracking?: string
  look_ahead?: string
  snapshot_actual_progress?: Amount
  snapshot_planned_progress?: Amount
  sent_to_pmo_at?: string
}
export type Revision = RecordRow & ControlledRevision & { package_name?: string; current_finish?: string; planned_finish?: string; forecast_finish?: string; approval_status?: string; status?: string }
export type Package = RecordRow & { name?: string | null; code?: string | null; status?: string | null; planned_finish?: string | null; archived_at?: string | null }
export type ProjectBlock = RecordRow & { block_name?: string | null; package_name?: string | null; planned_finish?: string | null; status?: string | null; is_active?: boolean }
export type Handover = RecordRow & PackageReference & { status?: string | null; target_handover_date?: string | null; actual_handover_date?: string | null }
export type Milestone = RecordRow & PackageReference & { title?: string; name?: string; milestone_name?: string; planned_date?: string; target_date?: string; due_date?: string; status?: string }
export type Decision = { id: string; project_id: number | null; portfolio_id?: number | null; decision: string; rationale?: string; owner_name?: string; due_date?: string; status?: string }
export type TimelineEvent = {
  id: string; title: string; date: string; module: string; kind: string
  packageName?: string; overdueDays?: number
}
export type Finance = RecordRow & { type: string; amount: Amount; currency?: string | null; direction?: string; status?: string; certified_date?: string; payment_date?: string }
export type Payment = RecordRow & { payment_title?: string; amount: Amount; payment_status?: string; due_date?: string; paid_date?: string; remarks?: string }
export type Contract = RecordRow & { contract_value: Amount; status?: string; contract_type?: string }
export type Variation = RecordRow & { amount: Amount; status?: string }
export type Design = RecordRow & { report_week: string; title: string; description?: string; category?: string; consultant_name?: string; status?: string; management_attention?: boolean; due_date?: string }
export type CostNote = RecordRow & { report_week: string; item_title: string; description?: string; section?: string; status?: string }
export type Approval = RecordRow & PackageReference & { title?: string; status?: string; deadline?: string; due_date?: string; required_date?: string; approver?: string }
export type Procurement = RecordRow & PackageReference & { name?: string; status?: string; required_on_site?: string; delivery_date?: string; expected_delivery_date?: string; required_date?: string; supplier?: string }
export type Risk = RecordRow & { title?: string; status?: string; risk_score?: number; score?: number; severity?: string; rating?: string; owner?: string; mitigation_action?: string }
export type DocumentRow = RecordRow & { title: string; type: string; storage_path?: string; file_type?: string; file_size_kb?: number; revision_date?: string; status?: string; approval_status?: string; review_status?: string; issued_for?: string; drawing_number?: string; document_number?: string; discipline?: string; description?: string }
export type ReportPhoto = { id: string | number; report_id: string | number; photo_url?: string; photo_name?: string; caption?: string; created_at?: string; report_type?: string | null }
export type DesignSubmission = RecordRow & { report_week: string; status?: string | null; snapshot_data?: { progressEvidence?: { id: string | number }[] } | null }
export type DesignPhoto = RecordRow & { file_name: string; storage_path: string; caption?: string; location?: string; context_id?: string }
export type Photo = { id: string; projectId: number; title: string; date: string; src?: string; path?: string }
export type ReportDocument = { excerpt: string | null; photos: Photo[] }
export type Data = {
  tasks: TaskRow[] | null
  packages?: Package[] | null
  blocks?: ProjectBlock[] | null
  handovers?: Handover[] | null
  milestones?: Milestone[] | null
  reports: Report[] | null
  revisions: Revision[] | null
  finance: Finance[] | null
  payments: Payment[] | null
  contracts: Contract[] | null
  variations: Variation[] | null
  design: Design[] | null
  designSubmissions?: DesignSubmission[] | null
  costNotes: CostNote[] | null
  approvals: Approval[] | null
  procurement: Procurement[] | null
  risks: Risk[] | null
  documents: DocumentRow[] | null
}
export const ratings = ['Off track', 'Watch', 'On track / done', 'Unrated', 'Withdrawn'] as const
type Rating = typeof ratings[number]
export type ConstraintCategory = 'Funding / payment' | 'Procurement' | 'Approvals' | 'Design / drawings' | 'Mobilisation' | 'Other'
type Constraint = {
  category: ConstraintCategory
  text: string
  reason?: boolean
  action?: string
  owner?: string
  due?: string
  source?: string
  recordedOn?: string | null
}

const normal = (value?: string | null) => (value ?? '').trim().toLowerCase().replace(/_/g, ' ')
const open = (value?: string | null) => !['closed', 'completed', 'resolved', 'approved', 'delivered', 'installed', 'cancelled', 'canceled', 'rejected', 'paid', 'void', 'superseded'].includes(normal(value))
const hold = (value?: string | null) => ['stuck', 'stalled', 'on hold', 'suspended'].includes(normal(value))
const done = (value?: string | null) => ['complete', 'completed', 'done', 'handed over', 'closed out'].includes(normal(value))
const withdrawn = (value?: string | null) => ['withdrawn', 'cancelled', 'canceled', 'inactive'].includes(normal(value))

export function number(value?: Amount) {
  if (value == null || String(value).trim() === '') return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}
const percent = (value?: Amount) => {
  const result = number(value)
  return result !== null && result >= 0 && result <= 100 ? result : null
}
export function isoDay(value?: string | null) {
  const day = value?.slice(0, 10)
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day ? day : null
}
export function lagosDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function dayDifference(a: string, b: string) {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000)
}
const shortText = (value?: string | null) => {
  const text = value?.trim()
  return text && !/^(?:none(?: reported)?|nil|n\/?a|no (?:issues?|blockers?|delays?|updates?)(?: recorded| reported)?|[-—–]+)[.\s]*$/i.test(text) ? text : ''
}

function category(text: string): ConstraintCategory {
  if (/\b(funding|payment|valuations?|fincon|cash flow)\b/i.test(text)) return 'Funding / payment'
  if (/\b(drawings?|design|rfi)\b/i.test(text)) return 'Design / drawings'
  if (/\b(approv\w+|engagement|sign.off|permit)\b/i.test(text)) return 'Approvals'
  if (/\b(procurement|materials?|supplier|purchase|delivery of)\b/i.test(text)) return 'Procurement'
  if (/\b(?:re)?mobilis\w*|\b(?:re)?mobiliz\w*/i.test(text)) return 'Mobilisation'
  return 'Other'
}

function explicitConstraint(text: string) {
  return text.split(/[.;\n]/).some(line =>
    !/\b(?:no (?:delays?|issues?|impact)|not (?:due to|because of|blocked|delayed|holding up)|previously|resolved|cleared)\b/i.test(line)
    && /\b(due to|because of|awaiting|waiting (?:for|on)|blocked by|held up by|pending release|stalled for|on hold pending|causing (?:the )?delay|preventing (?:work|progress|mobilisation))\b/i.test(line)
  )
}

function latestBy<T>(rows: T[], key: (row: T) => string, date: (row: T) => string) {
  const ordered = [...rows].sort((a, b) => date(b).localeCompare(date(a)))
  return [...new Map(ordered.reverse().map(row => [key(row), row])).values()].reverse()
}
const reportTime = (r: Report) => r.updated_at || r.sent_to_pmo_at || r.created_at || r.report_date
const masterReport = (r: Report) => !r.delivery_package_id && !r.block_id && (!r.package_name || /^(project wide|overall|master)$/i.test(r.package_name.trim()))
const latestReports = (reports: Report[]) => latestBy(reports,
  r => [normal(r.discipline), r.delivery_package_id ?? '', r.block_id ?? '', normal(r.package_name)].join(':'),
  r => `${r.report_date}:${reportTime(r)}`)
// Pair actual and plan from the same dated, project-wide report. Newer
// revisions of a report replace its older figures for that reporting date.
function reportedProgress(reports: Report[], today: string) {
  return latestBy(reports.filter(r => masterReport(r) && !!isoDay(r.report_date) && r.report_date <= today
    && percent(r.snapshot_actual_progress) !== null && percent(r.snapshot_planned_progress) !== null),
  r => r.report_date, reportTime).map(r => ({
    date: r.report_date,
    actual: percent(r.snapshot_actual_progress)!,
    planned: percent(r.snapshot_planned_progress)!,
  }))
}

export function portfolioProgress(rows: ProjectPosition[]) {
  // Keep the comparison cohort consistent over time. Still show coverage so
  // management can see how many of the selected projects have paired reports.
  const reporting = rows.filter(row => row.progressHistory.length > 0)
  if (!reporting.length) return []
  const indexed = reporting.map(row => new Map(row.progressHistory.map(point => [point.date, point])))
  return reporting[0].progressHistory.flatMap(({ date }) => {
    const points = indexed.flatMap(history => history.get(date) ?? [])
    if (points.length !== reporting.length) return []
    const average = (key: 'actual' | 'planned') =>
      Math.round(points.reduce((total, point) => total + point[key], 0) / points.length * 10) / 10
    return [{ date, actual: average('actual'), planned: average('planned'), coverage: points.length }]
  }).sort((a, b) => a.date.localeCompare(b.date))
}

function highRisk(item: Risk) {
  return open(item.status) && !['mitigated', 'transferred'].includes(normal(item.status)) &&
    ((number(item.risk_score ?? item.score) ?? 0) >= 12 ||
      ['high', 'critical'].includes(normal(item.severity || item.rating)))
}

const packageKey = (value?: string | null) => normal(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ')
const packageLabel = (name?: string | null) => name?.trim() || ''
const isPackageName = (name?: string | null) => !!packageKey(name) && !/^(?:master|project wide|project programme|overall)$/.test(packageKey(name))
const handoverTitle = (title?: string | null) => /\b(?:hand[- ]*over|handing[- ]+over)\b/i.test(title ?? '') &&
  !/\b(?:pre[- ]*hand|inspection|preparation|checklist|readiness|documentation|snagging)/i.test(title ?? '')
const completionTitle = (title?: string | null) => /^(?:completion|(?:target|project|package|practical|substantial|works|overall) completion)$/i.test(title?.trim() ?? '')
const deliveryClosed = (status?: string | null) => done(status) || withdrawn(status) || !open(status)
const taskFinish = (task: TaskRow) => isoDay(task.planned_finish) ?? isoDay(task.finish_date)
const milestoneTitle = (item: Milestone) => item.title || item.name || item.milestone_name || 'Project milestone'
const milestoneDate = (item: Milestone) => isoDay(item.due_date) ?? isoDay(item.target_date) ?? isoDay(item.planned_date)
const taskDone = (task: TaskRow) => taskProgress(task) >= 100 || !!isoDay(task.actual_finish)
function latestDay(values: (string | null | undefined)[]) {
  return values.reduce<string | null>((latest, value) => {
    const day = isoDay(value)
    return day && (!latest || day > latest) ? day : latest
  }, null)
}

type DeliveryScope = {
  id: string
  name: string
  code?: string | null
  excluded?: boolean
  recordedFinish?: string | null
  status?: string | null
  handover?: Handover
  revision?: Revision
  activities: TaskRow[]
  milestones: Milestone[]
}

function upcomingEvents(data: Data, tasks: TaskRow[], revisions: Revision[], target: string | null, recordedTarget: string | null, today: string) {
  const scopes: DeliveryScope[] = []
  const scopedById = new Map<string, DeliveryScope>()
  const createScope = (id: string, name: string, fields: Partial<DeliveryScope> = {}) => {
    const scope: DeliveryScope = { id, name, activities: [], milestones: [], ...fields }
    scopes.push(scope)
    scopedById.set(id, scope)
    return scope
  }
  const byName = (name?: string | null) => {
    const key = packageKey(name)
    return key ? scopes.filter(scope => packageKey(scope.name) === key || packageKey(scope.code) === key) : []
  }
  const uniqueName = (name?: string | null) => {
    const matches = byName(name)
    return matches.length === 1 ? matches[0] : undefined
  }
  const byReference = (item: PackageReference) =>
    scopedById.get(String(item.delivery_package_id ?? '')) ?? scopedById.get(String(item.block_id ?? '')) ?? uniqueName(item.package_name)
  const hasScope = (item: PackageReference) => item.delivery_package_id != null || item.block_id != null || isPackageName(item.package_name)

  for (const pkg of data.packages ?? []) {
    createScope(String(pkg.id), packageLabel(pkg.name) || packageLabel(pkg.code) || 'Unnamed package', {
      code: pkg.code, recordedFinish: pkg.planned_finish, status: pkg.status,
      excluded: Boolean(pkg.archived_at) || withdrawn(pkg.status),
    })
  }
  for (const block of data.blocks ?? []) {
    const name = packageLabel(block.package_name) || packageLabel(block.block_name)
    if (!name) continue
    const scope = scopedById.get(String(block.id)) ?? uniqueName(name) ?? createScope(String(block.id), name, {
      recordedFinish: block.planned_finish, status: block.status,
      excluded: block.is_active === false || withdrawn(block.status),
    })
    scopedById.set(String(block.id), scope)
    scope.recordedFinish ??= block.planned_finish
  }
  for (const revision of revisions) {
    const id = revision.delivery_package_id ?? revision.block_id
    const name = packageLabel(revision.package_name)
    if (id == null && !isPackageName(name)) continue
    const scope = byReference(revision) ?? (name && byName(name).length === 0
      ? createScope(id != null ? String(id) : `revision:${revision.id}`, name) : undefined)
    if (scope) {
      if (id != null) scopedById.set(String(id), scope)
      scope.revision ??= revision
    }
  }
  const handovers = [...(data.handovers ?? [])].sort((a, b) =>
    (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
  for (const handover of handovers) {
    const name = packageLabel(handover.package_name)
    const scope = byReference(handover) ?? (name && byName(name).length === 0 ? createScope(`handover:${handover.id}`, name) : undefined)
    if (scope) scope.handover ??= handover
  }
  for (const task of tasks) byReference(task)?.activities.push(task)
  for (const item of data.milestones ?? []) byReference(item)?.milestones.push(item)

  const events = new Map<string, TimelineEvent>()
  const deliveryDates = new Set<string>()
  const add = (id: string, title: string, value: string | null | undefined, module: string, kind: string, scope?: DeliveryScope, delivery = false) => {
    const date = isoDay(value)
    if (!date || scope?.excluded || (date < today && !delivery)) return
    const label = scope?.code && packageKey(scope.code) !== packageKey(scope.name)
      ? `${scope.name} (${scope.code})` : scope?.name
    const key = `${scope?.id ?? 'project'}:${kind}:${date}:${normal(title)}`
    if (scope && delivery) deliveryDates.add(date)
    if (!events.has(key)) events.set(key, { id: `${id}:${key}`, title, date, module, kind, packageName: label, overdueDays: date < today ? dayDifference(today, date) : undefined })
  }

  for (const scope of scopes.filter(item => !item.excluded)) {
    const { handover, revision, activities, milestones } = scope
    const deliveryMilestones = milestones.filter(item => handoverTitle(milestoneTitle(item)))
    const scheduledHandovers = activities.filter(task => handoverTitle(task.name))
    const revisionHandovers = Array.isArray(revision?.programme_activities)
      ? (revision.programme_activities as RevisionProgrammeActivity[]).filter(activity => handoverTitle(activity.name))
      : []
    const revisedFinish = isoDay(revision?.current_finish) ?? isoDay(revision?.planned_finish)
    const revisedHandover = latestDay(revisionHandovers.map(activity => activity.finish_date))
    const programmeHandover = latestDay(scheduledHandovers.map(taskFinish))
    const registeredHandover = latestDay(deliveryMilestones.map(milestoneDate))
    const handoverDate = revisedHandover ?? (revision && (programmeHandover || registeredHandover || handover) ? revisedFinish : null)
      ?? programmeHandover ?? isoDay(handover?.target_handover_date) ?? registeredHandover

    const scheduledCompletions = activities.filter(task => completionTitle(task.name))
    const completionMilestones = milestones.filter(item => completionTitle(milestoneTitle(item)))
    const packageDone = deliveryClosed(scope.status) || (activities.length > 0 && activities.every(taskDone))
    const handoverDone = handover
      ? deliveryClosed(handover.status) || !!isoDay(handover.actual_handover_date)
      : deliveryClosed(scope.status) || scheduledHandovers.some(task =>
        taskFinish(task) === programmeHandover && taskDone(task)) ||
        deliveryMilestones.some(item => milestoneDate(item) === registeredHandover && deliveryClosed(item.status))
    const completionTarget = revisedFinish ?? latestDay(completionMilestones.map(milestoneDate))
      ?? latestDay(scheduledCompletions.map(taskFinish)) ?? isoDay(scope.recordedFinish)
    const completion = completionTarget ?? (handoverDate ? null : latestDay(activities.map(taskFinish)))
    const completionDone = packageDone || scheduledCompletions.some(task => taskFinish(task) === completion && taskDone(task))
      || completionMilestones.some(item => milestoneDate(item) === completion && deliveryClosed(item.status))

    if (handoverDate) deliveryDates.add(handoverDate)
    if (completion) deliveryDates.add(completion)
    if (!handoverDone) add('handover', 'Package handover', handoverDate, handover ? '/app/handover' : '/app/recovery', 'Handover', scope, true)
    if (!completionDone && !handoverDone && completion !== handoverDate) {
      add('completion', completionTarget ? 'Package completion target' : 'Scheduled package finish', completion, '/app/recovery', 'Completion', scope, true)
    }
  }

  // A roll-up inferred from the latest package should not reappear as another handover.
  const projectTarget = scopes.some(scope => !scope.excluded) ? recordedTarget : target
  const standaloneTaskHandover = tasks.some(task => !hasScope(task) && task.is_milestone && !taskDone(task)
    && handoverTitle(task.name) && taskFinish(task) === projectTarget)
  const standaloneMilestoneHandover = (data.milestones ?? []).some(item => !hasScope(item) && !deliveryClosed(item.status)
    && handoverTitle(milestoneTitle(item)) && milestoneDate(item) === projectTarget)
  if (projectTarget && !deliveryDates.has(projectTarget) && !standaloneTaskHandover && !standaloneMilestoneHandover) {
    add('target', 'Project completion target', projectTarget, '/app/recovery', 'Target')
  }
  const retainedMilestone = (title: string, date: string | null, scope?: DeliveryScope) => {
    if (!handoverTitle(title) && !completionTitle(title)) return true
    return !scope && !!date && !deliveryDates.has(date) && !(completionTitle(title) && date === projectTarget)
  }
  for (const task of tasks) {
    const scope = byReference(task)
    const title = task.name || 'Programme milestone'
    const date = taskFinish(task)
    if ((scope || !hasScope(task)) && task.is_milestone && !taskDone(task) && retainedMilestone(title, date, scope)) {
      add(`task:${task.id}`, title, date, '/app/schedule', 'Milestone', scope)
    }
  }
  for (const item of data.milestones ?? []) {
    const scope = byReference(item)
    const title = milestoneTitle(item)
    const date = milestoneDate(item)
    if ((scope || !hasScope(item)) && !deliveryClosed(item.status) && retainedMilestone(title, date, scope)) {
      add(`milestone:${item.id}`, title, date, '/app/schedule', 'Milestone', scope)
    }
  }
  for (const item of data.approvals ?? []) {
    if (open(item.status)) add(`approval:${item.id}`, item.title || 'Approval due', item.deadline || item.due_date || item.required_date, '/app/approvals', 'Approval', byReference(item))
  }
  for (const item of data.procurement ?? []) {
    if (open(item.status)) add(`procurement:${item.id}`, item.name || 'Procurement delivery', item.required_on_site || item.expected_delivery_date || item.required_date, '/app/procurement', 'Procurement', byReference(item))
  }
  return [...events.values()]
}
const latestDocuments = (documents: DocumentRow[]) => latestBy(documents,
  r => [normal(r.discipline), normal(r.drawing_number || r.document_number || r.title)].join(':'),
  r => `${r.revision_date || ''}:${r.updated_at || r.created_at || ''}`)
export function photoReportingWeek(value?: string | null) {
  const day = isoDay(value)
  if (!day) return null
  const date = new Date(day)
  // Weekly reports use the Friday of their Monday–Sunday reporting week.
  date.setUTCDate(date.getUTCDate() + 5 - (date.getUTCDay() || 7))
  return date.toISOString().slice(0, 10)
}

const draftOrInvalid = (status?: string | null) =>
  ['draft', 'returned', 'rejected', 'void', 'cancelled', 'canceled'].includes(normal(status))

function reportPhotoScope(data: Data, today: string) {
  const submittedReports = latestReports((data.reports ?? []).filter(report =>
    !!isoDay(report.report_date) && report.report_date <= today && !draftOrInvalid(report.workflow_status)))
  const currentWeek = photoReportingWeek(today)!
  const designReport = latestBy((data.designSubmissions ?? []).filter(submission => {
    const week = photoReportingWeek(submission.report_week)
    return !!week && week <= currentWeek && !draftOrInvalid(submission.status)
  }), submission => submission.report_week,
  submission => `${submission.report_week}:${submission.updated_at || submission.created_at || ''}`)[0]
  const designWeek = photoReportingWeek(designReport?.report_week)
  const designEvidence = designReport?.snapshot_data?.progressEvidence
  const documentDay = (document: DocumentRow) => isoDay(document.revision_date) ?? isoDay(document.created_at)
  const historyDocuments = (data.documents ?? []).filter(document => {
    const day = documentDay(document)
    return normal(document.type) === 'report' && !!day && day <= today && !draftOrInvalid(document.status)
  })
  const reportDocuments = historyDocuments.filter(document => normal(document.status) !== 'superseded')
  const weeks = [
    ...submittedReports.map(report => photoReportingWeek(report.report_date)),
    ...reportDocuments.map(document => photoReportingWeek(documentDay(document))),
    designWeek,
  ].filter((week): week is string => week !== null)
  const week = weeks.sort().pop() ?? null
  return {
    week,
    designWeek,
    designEvidenceIds: Array.isArray(designEvidence) ? designEvidence.map(photo => String(photo.id)) : null,
    reportIds: submittedReports.filter(report => photoReportingWeek(report.report_date) === week).map(report => String(report.id)),
    documents: latestDocuments(reportDocuments.filter(document => photoReportingWeek(documentDay(document)) === week)),
    historyDocuments,
  }
}

const sum = (values: Amount[]) => values.reduce<number | null>((acc, value) => {
  const next = number(value)
  return acc === null || next === null ? null : acc + next
}, 0)
const recordedTotal = (values: Amount[]) => values.length ? sum(values) : null
const ratio = (value: number | null, base: number | null) => value !== null && base !== null && base > 0 ? Math.round(value / base * 1000) / 10 : null

export function commercialPosition(project: Project, data: Data, progress: number | null) {
  const register = data.finance ?? []
  const currency = (project.currency || register.find(item => item.currency)?.currency || 'NGN').toUpperCase()
  const conflict = register.some(row => (row.currency || currency).toUpperCase() !== currency)
  const byType = (type: string) => register.filter(row => normal(row.type) === type)
  const baseline = byType('contract sum').filter(row => ['approved', 'certified', 'paid'].includes(normal(row.status)))
  const variations = byType('variation').filter(row => ['approved', 'implemented'].includes(normal(row.status)))
  const costContracts = (data.contracts ?? []).filter(row => ['active', 'completed', 'on hold'].includes(normal(row.status)) && normal(row.contract_type) !== 'variation')
  const costVariantsKnown = data.variations !== null && data.contracts !== null && costContracts.length > 0
  const costVariations = (data.variations ?? []).filter(row => ['approved', 'implemented'].includes(normal(row.status)))
  const moneyValues = (rows: { amount: Amount }[]) => rows.map(row => row.amount)

  // Project budget fields take precedence. Either contractual register may
  // provide a comparison, with its own approved variations and matching scope.
  const budgetBaseline = number(project.initial_budget) ?? number(project.original_budget)
  const budgetCurrent = number(project.current_approved_budget) ?? number(project.approved_budget)
  const useFinancialRegister = baseline.length > 0
  const contractBaseline = conflict ? null : useFinancialRegister
    ? recordedTotal(moneyValues(baseline))
    : currency === 'NGN' ? recordedTotal(costContracts.map(row => row.contract_value)) : null
  const approvedChanges = conflict ? null : useFinancialRegister
    ? sum(variations.map(row => {
      const amount = number(row.amount)
      return amount === null ? null : normal(row.direction) === 'omission' ? -Math.abs(amount) : amount
    }))
    : currency === 'NGN' && data.variations !== null ? sum(moneyValues(costVariations)) : null
  const contractCurrent = contractBaseline !== null && approvedChanges !== null ? contractBaseline + approvedChanges : null
  const hasBudget = budgetBaseline !== null || budgetCurrent !== null
  const initial = hasBudget ? budgetBaseline : contractBaseline
  const current = hasBudget ? budgetCurrent : contractCurrent
  const paymentRows = byType('payment')
  const costingPaymentRows = data.payments ?? []
  const paid = conflict ? null : paymentRows.length
    ? recordedTotal(moneyValues(paymentRows.filter(row => normal(row.status) === 'paid')))
    : currency === 'NGN' && costingPaymentRows.length
      ? recordedTotal(moneyValues(costingPaymentRows.filter(row => normal(row.payment_status) === 'paid')))
      : null
  const certified = conflict ? null : recordedTotal(moneyValues(register.filter(row =>
    !['payment', 'contract sum', 'variation', 'retention', 'contingency', 'provisional sum', 'pc sum'].includes(normal(row.type)) &&
    (Boolean(row.certified_date) || normal(row.status) === 'certified'))))
  const paidPct = conflict ? null : ratio(paid, current)
  const pendingStatuses = ['pending', 'on hold', 'approved', 'certified', 'submitted']
  const outstanding = conflict ? null : paymentRows.length
    ? sum(moneyValues(paymentRows.filter(row => pendingStatuses.includes(normal(row.status)) && !row.payment_date)))
    : currency === 'NGN' && costingPaymentRows.length
      ? sum(moneyValues(costingPaymentRows.filter(row => pendingStatuses.includes(normal(row.payment_status)) && !row.paid_date)))
      : null
  return {
    currency, conflict, initial, current, certified, paid, paidPct,
    basis: hasBudget ? 'Approved project budget' : 'Contract value',
    growth: current !== null && initial !== null ? ratio(current - initial, initial) : null,
    gap: paidPct !== null && progress !== null ? Math.round((paidPct - progress) * 10) / 10 : null,
    approvedChanges: useFinancialRegister || costVariantsKnown ? approvedChanges : null,
    outstanding, costToComplete: number(project.cost_to_complete),
  }
}

function constraintsFor(data: Data, reports: Report[], today: string, includeFinance: boolean) {
  const constraints: Constraint[] = []
  const add = (category: ConstraintCategory, text?: string | null, details: Omit<Constraint, 'text' | 'category'> = {}) => {
    const content = shortText(text)
    if (content) constraints.push({ category, text: content, ...details })
  }
  // Prioritise reasons attached to blocked or overdue work.
  const activityPriority = (task: TaskRow) => {
    if (task.is_blocked || task.is_on_hold || normal(task.status) === 'blocked' || hold(task.status)) return 2
    const finish = isoDay(task.planned_finish || task.finish_date)
    return finish && finish < today ? 1 : 0
  }
  const activitiesWithReasons = (data.tasks ?? [])
    .filter(task => !task.is_summary && taskProgress(task) < 100 && shortText(task.delay_reason)
      && !['cancelled', 'canceled'].includes(normal(task.status)))
    .sort((a, b) => activityPriority(b) - activityPriority(a) || (b.updated_at || '').localeCompare(a.updated_at || ''))
  for (const task of activitiesWithReasons) {
    const reason = shortText(task.delay_reason)
    const kind = category(reason)
    if (kind !== 'Funding / payment' || includeFinance) {
      add(kind, reason, {
        reason: true,
        source: task.name ? `Project Controls · ${task.name}` : 'Project Controls',
        recordedOn: isoDay(task.updated_at),
        owner: task.responsible || undefined,
        action: shortText(task.recovery_action) || undefined,
      })
    }
  }
  for (const report of reports) {
    const scope = [report.discipline, report.package_name].filter(Boolean).join(' · ')
    const evidence = {
      source: scope ? `Weekly report · ${scope}` : 'Weekly report',
      recordedOn: isoDay(report.report_date),
    }
    for (const text of [report.pending_issues, report.matters_arising, hold(report.status) || explicitConstraint(report.status_summary || '') ? report.status_summary : null]) {
      const content = shortText(text)
      const kind = category(content)
      if (kind !== 'Funding / payment' || includeFinance) {
        add(kind, content, { ...evidence, reason: explicitConstraint(content), action: shortText(report.look_ahead) || undefined })
      }
    }
    if (includeFinance) add('Funding / payment', report.payment_issues, { ...evidence, reason: explicitConstraint(shortText(report.payment_issues)) })
    const procurement = shortText(report.procurement_tracking)
    if (explicitConstraint(procurement) || /\b(delayed|overdue|stalled|pending)\b/i.test(procurement)) {
      add('Procurement', procurement, { ...evidence, reason: explicitConstraint(procurement) })
    }
  }
  const design = latestBy(data.design ?? [], r => `${normal(r.category)}:${normal(r.title)}`, r => `${r.report_week}:${r.updated_at || r.created_at || ''}`)
  for (const item of design.filter(r => open(r.status) && (r.management_attention || ['design issue', 'weekly challenge'].includes(normal(r.category))))) {
    const detail = shortText(item.description)
    add('Design / drawings', [item.title, detail].filter(Boolean).join(' · '), { reason: explicitConstraint(detail), source: 'Design report', recordedOn: isoDay(item.report_week), owner: item.consultant_name, due: item.due_date })
  }
  for (const item of latestDocuments((data.documents ?? []).filter(r => normal(r.type) === 'drawing'))) {
    if (['void', 'superseded', 'approved', 'current'].some(status => [item.status, item.approval_status].some(value => normal(value) === status))) continue
    if (['pending review', 'for review', 'rejected'].some(s => [item.status, item.review_status, item.approval_status].some(v => normal(v) === s)) || normal(item.issued_for) === 'approval') {
      add('Design / drawings', item.title, { source: 'Drawing register', action: 'Review outstanding drawing' })
    }
  }
  for (const item of data.procurement ?? []) {
    const due = isoDay(item.required_on_site)
    if (open(item.status) && (!item.delivery_date || item.delivery_date > today) && ((due && due < today) || ['delayed', 'on hold'].includes(normal(item.status)))) add('Procurement', item.name, { source: 'Procurement register', due: due ?? undefined, owner: item.supplier })
  }
  for (const item of data.approvals ?? []) {
    const due = isoDay(item.deadline)
    if (open(item.status) && ((due && due < today) || ['delayed', 'on hold'].includes(normal(item.status)))) add('Approvals', item.title, { source: 'Approvals register', due: due ?? undefined, owner: item.approver })
  }
  if (includeFinance) {
    for (const item of data.payments ?? []) {
      const due = isoDay(item.due_date)
      if (!['paid', 'rejected', 'cancelled', 'canceled'].includes(normal(item.payment_status)) && !item.paid_date && ((due && due < today) || hold(item.payment_status))) add('Funding / payment', item.payment_title, { source: 'Costing payments', due: due ?? undefined, action: 'Review outstanding payment' })
    }
    const costing = latestBy(data.costNotes ?? [], r => `${normal(r.section)}:${normal(r.item_title)}`, r => `${r.report_week}:${r.updated_at || r.created_at || ''}`)
    for (const item of costing.filter(r => ['delayed', 'on hold', 'stalled'].includes(normal(r.status)))) {
      const detail = shortText(item.description)
      add(normal(item.section) === 'payments' ? 'Funding / payment' : category(`${item.section} ${item.item_title}`),
        [item.item_title, detail].filter(Boolean).join(' · '), { reason: explicitConstraint(detail), source: 'Costing report', recordedOn: isoDay(item.report_week) })
    }
  }
  for (const item of data.risks ?? []) {
    if (highRisk(item)) {
      const kind = category(item.title || '')
      if (kind !== 'Funding / payment' || includeFinance) add(kind, item.title, { source: 'Risk register', action: item.mitigation_action, owner: item.owner })
    }
  }
  const result = new Map<string, Constraint>()
  for (const item of constraints.sort((a, b) => Number(!!b.reason) - Number(!!a.reason))) {
    const key = `${item.category}:${normal(item.text)}`
    if (!result.has(key)) result.set(key, item)
  }
  return [...result.values()]
}

export function projectPosition(project: Project, data: Data, today: string, includeFinance: boolean) {
  const reports = latestReports(data.reports ?? [])
  const projectReports = reports.filter(masterReport)
  const snapshot = projectReports.find(r => percent(r.snapshot_actual_progress) !== null)
  const revisions = latestControlledRevisions(data.revisions ?? [])
  const activePackages = data.packages?.filter(pkg => !pkg.archived_at) ?? []
  const tasks = applyControlledProgramme(data.tasks ?? [], revisions)
    .filter(t => !t.is_summary && !['cancelled', 'canceled'].includes(normal(t.status)))
  const measured = tasks.length > 0 && tasks.every(t => percent(t.progress_pct) !== null || done(t.status) || normal(t.status) === 'not started')
  const dated = tasks.length > 0 && tasks.every(t => {
    const start = isoDay(t.planned_start || t.start_date)
    const finish = isoDay(t.planned_finish || t.finish_date)
    return start && finish && finish >= start
  })
  const lastTaskUpdate = tasks.reduce((last, task) => {
    const timestamp = task.updated_at || task.created_at || ''
    return timestamp > last ? timestamp : last
  }, '')
  const useTaskProgress = measured && (!snapshot || lastTaskUpdate >= reportTime(snapshot) || isoDay(lastTaskUpdate) === snapshot.report_date)
  const actual = useTaskProgress ? calculateProjectProgress(tasks) : percent(snapshot?.snapshot_actual_progress)
  const isMaster = (r: Revision) => !r.block_id && !r.delivery_package_id && !isPackageName(r.package_name)
  const master = revisions.find(isMaster)
  const masterTarget = isoDay(master?.current_finish) ?? isoDay(master?.planned_finish)
  const recordedTarget = masterTarget ?? isoDay(project.handover_date) ?? isoDay(project.planned_completion_date)
  const matchesProgramme = !masterTarget || tasks.some(t => isoDay(t.planned_finish || t.finish_date) === masterTarget)
  const asOf = new Date(`${today}T12:00:00+01:00`)
  const scheduleResult = measured && dated && matchesProgramme && data.revisions !== null
    ? calculateForecastV2(normalizeProjectState({
      project: { ...project, handover_date: recordedTarget },
      tasks: tasks.map(task => ({ ...task, progress_pct: taskProgress(task) })),
      deliveryPackages: activePackages, today: asOf,
    }), asOf)
    : null
  const forecastResult = data.packages !== null || tasks.every(task => !task.delivery_package_id) ? scheduleResult : null
  const target = recordedTarget ?? isoDay(forecastResult?.targetDate?.toISOString())

  const planned = useTaskProgress
    ? dated && matchesProgramme && data.revisions !== null
      ? calculateProjectPlannedProgress(tasks, asOf) : null
    : percent(snapshot?.snapshot_planned_progress)
  const estimatedFinish = isoDay(forecastResult?.forecastDate?.toISOString())
  const forecast = estimatedFinish ?? isoDay(master?.forecast_finish)
  const forecastBasis = estimatedFinish ? 'Recovery Forecast' : forecast ? 'Recorded forecast' : null
  const variance = target && forecast ? dayDifference(forecast, target) : null
  const overduePackage = (forecastResult?.packagePositions ?? []).some(pkg => pkg.packageId !== '__unassigned__' && pkg.delayDays > 0) || revisions.some(r => {
    const plannedFinish = isoDay(r.current_finish || r.planned_finish)
    const forecastFinish = isoDay(r.forecast_finish)
    return !isMaster(r) && plannedFinish && forecastFinish && forecastFinish > plannedFinish
  })
  const activeReports = reports.filter(r => {
    const date = isoDay(r.report_date)
    return date && dayDifference(today, date) >= 0 && dayDifference(today, date) <= 14
  })
  const recordedProjectCompletion = done(project.status) || Boolean(isoDay(project.actual_completion_date))
  const complete = recordedProjectCompletion || (useTaskProgress ? tasks.every(task => taskProgress(task) >= 100) : actual === 100)
  const active = !withdrawn(project.status) && !complete
  const stalled = active && (hold(project.status) || activeReports.some(r => (hold(r.status) || /\b(?:work|site|project) (?:is |remains )?(?:stalled|on hold|suspended)\b/i.test(r.status_summary || '')) && (!lastTaskUpdate || reportTime(r) >= lastTaskUpdate)))
  const overdueDays = active && target && target < today ? dayDifference(today, target) : null
  const overdue = overdueDays !== null
  const progressGap = actual !== null && planned !== null ? actual - planned : null
  const reportsBehind = activeReports.some(r => masterReport(r) && ['behind', 'behind programme', 'behind schedule', 'delayed'].includes(normal(r.status)))
  const behind = active && (progressGap !== null
    ? progressGap < 0
    : ['behind', 'behind programme', 'behind schedule', 'delayed'].includes(normal(project.status)) || reportsBehind)
  const constraints = active ? constraintsFor(data, activeReports, today, includeFinance) : []
  const rating: Rating = withdrawn(project.status) ? 'Withdrawn' : complete ? 'On track / done' :
    stalled || overdue || (variance ?? 0) > 0 || overduePackage || ['off track', 'critical'].includes(normal(project.status)) ? 'Off track' :
    constraints.length || behind || (scheduleResult?.maximumActivityDelayDays ?? 0) > 0 || ['delayed', 'at risk', 'watch'].includes(normal(project.status)) || activeReports.some(r => ['behind', 'delayed', 'at risk'].includes(normal(r.status))) ? 'Watch' :
    (actual !== null && progressGap !== null) || activeReports.some(r => ['on track', 'ahead'].includes(normal(r.status))) ? 'On track / done' : 'Unrated'
  const documents = latestDocuments((data.documents ?? []).filter(r => normal(r.type) === 'report' && !['draft', 'void', 'superseded', 'rejected'].includes(normal(r.status))))
  const updates = [
    ...reports.map(r => ({ key: `weekly:${r.id}`, date: isoDay(r.report_date), text: shortText(r.status_summary) || shortText(r.matters_arising) || shortText(r.look_ahead) })),
    ...latestBy(data.design ?? [], r => `${normal(r.category)}:${normal(r.title)}`, r => `${r.report_week}:${r.updated_at || r.created_at || ''}`)
      .map(r => ({ key: `design:${r.id}`, date: isoDay(r.report_week), text: [r.title, shortText(r.description)].filter(Boolean).join(' · ') })),
    ...(includeFinance ? latestBy(data.costNotes ?? [], r => `${normal(r.section)}:${normal(r.item_title)}`, r => `${r.report_week}:${r.updated_at || r.created_at || ''}`) : [])
      .map(r => ({ key: `cost:${r.id}`, date: isoDay(r.report_week), text: [r.item_title, shortText(r.description)].filter(Boolean).join(' · ') })),
    ...documents.map(r => ({ key: `doc:${r.id}`, date: isoDay(r.revision_date || r.created_at), text: shortText(r.description) })),
  ].filter(update => update.date && update.date <= today && update.text).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4)
  const sitePhotos = reportPhotoScope(data, today)
  const timeline = withdrawn(project.status) || recordedProjectCompletion ? []
    : upcomingEvents(data, tasks, revisions, target, recordedTarget, today).filter(event => active || !!event.packageName)
  return {
    project, rating, active, complete, stalled, behind, actual, planned, progressGap, target, forecast, forecastBasis, variance, overdue, overdueDays, constraints,
    maximumActivityDelay: active ? scheduleResult?.maximumActivityDelayDays ?? null : null,
    overdueActivities: active ? scheduleResult?.overdueActivities ?? null : null,
    scheduleSeverity: active ? scheduleResult?.scheduleSeverity ?? null : null,
    highRisks: data.risks?.length ? data.risks.filter(highRisk).length : null,
    progressHistory: reportedProgress(data.reports ?? [], today),
    timeline,
    primary: constraints.find(item => item.reason),
    updates, sitePhotos,
    commercial: includeFinance ? commercialPosition(project, data, actual) : null,
  }
}
export type ProjectPosition = ReturnType<typeof projectPosition>

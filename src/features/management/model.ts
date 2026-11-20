import { calculateProjectPlannedProgress, calculateProjectProgress, taskProgress, type ProgressTask } from '@/core/metrics/progressMetrics'

type Amount = number | string | null
type RecordRow = { id: string | number; project_id: number; updated_at?: string | null; created_at?: string | null }
export type Project = {
  id: number
  project_name: string
  portfolio_id?: number | null
  status?: string | null
  phase?: string | null
  handover_date?: string | null
  initial_budget?: Amount
  original_budget?: Amount
  current_approved_budget?: Amount
  cost_to_complete?: Amount
  approved_budget?: Amount
  currency?: string | null
  overall_owner_email?: string | null
  updated_at?: string | null
}
export type TaskRow = RecordRow & ProgressTask & { name?: string; delay_reason?: string | null; recovery_action?: string | null; is_summary?: boolean; is_blocked?: boolean }
export type Report = RecordRow & {
  report_date: string
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
export type Revision = RecordRow & { package_name?: string; block_id?: string; delivery_package_id?: string; current_finish?: string; planned_finish?: string; forecast_finish?: string; approval_status?: string; status?: string }
export type Finance = RecordRow & { type: string; amount: Amount; currency?: string | null; direction?: string; status?: string; certified_date?: string; payment_date?: string }
export type Payment = RecordRow & { payment_title?: string; amount: Amount; payment_status?: string; due_date?: string; paid_date?: string; remarks?: string }
export type Contract = RecordRow & { contract_value: Amount; status?: string; contract_type?: string }
export type Variation = RecordRow & { amount: Amount; status?: string }
export type Design = RecordRow & { report_week: string; title: string; description?: string; category?: string; consultant_name?: string; status?: string; management_attention?: boolean; due_date?: string }
export type CostNote = RecordRow & { report_week: string; item_title: string; description?: string; section?: string; status?: string }
export type Approval = RecordRow & { title?: string; status?: string; deadline?: string; approver?: string }
export type Procurement = RecordRow & { name?: string; status?: string; required_on_site?: string; delivery_date?: string; supplier?: string }
export type Risk = RecordRow & { title?: string; status?: string; risk_score?: number; severity?: string; owner?: string; mitigation_action?: string }
export type DocumentRow = RecordRow & { title: string; type: string; storage_path?: string; file_type?: string; file_size_kb?: number; revision_date?: string; status?: string; approval_status?: string; review_status?: string; issued_for?: string; drawing_number?: string; document_number?: string; discipline?: string; description?: string }
export type ReportPhoto = { id: string | number; report_id: string | number; photo_url?: string; photo_name?: string; caption?: string; created_at?: string; report_type?: string | null }
export type DesignPhoto = RecordRow & { file_name: string; storage_path: string; caption?: string; location?: string; context_id?: string }
export type Photo = { id: string; projectId: number; title: string; date: string; src?: string; path?: string }
export type ReportDocument = { excerpt: string | null; photos: Photo[] }
export type Data = {
  tasks: TaskRow[] | null
  reports: Report[] | null
  revisions: Revision[] | null
  finance: Finance[] | null
  payments: Payment[] | null
  contracts: Contract[] | null
  variations: Variation[] | null
  design: Design[] | null
  costNotes: CostNote[] | null
  approvals: Approval[] | null
  procurement: Procurement[] | null
  risks: Risk[] | null
  documents: DocumentRow[] | null
}
export const ratings = ['Off track', 'Watch', 'On track / done', 'Unrated', 'Withdrawn'] as const
type Rating = typeof ratings[number]
export type ConstraintCategory = 'Funding / payment' | 'Procurement' | 'Approvals' | 'Design / drawings' | 'Mobilisation' | 'Other'
type Constraint = { category: ConstraintCategory; text: string; reason?: boolean; action?: string; owner?: string; due?: string }

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
  return text && !/^(?:none(?: reported)?|nil|n\/?a|no (?:issues?|blockers?|delays?|updates?)(?: recorded| reported)?)[.\s]*$/i.test(text) ? text : ''
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
  return !/\b(no|not|neither|without|previously|was|were|now resolved)\b/i.test(text)
    && /\b(due to|because of|awaiting|waiting (?:for|on)|blocked by|held up by|pending release|stalled for|on hold pending|causing (?:the )?delay|preventing (?:work|progress|mobilisation))\b/i.test(text)
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
const latestDocuments = (documents: DocumentRow[]) => latestBy(documents,
  r => [normal(r.discipline), normal(r.drawing_number || r.document_number || r.title)].join(':'),
  r => `${r.revision_date || ''}:${r.updated_at || r.created_at || ''}`)
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
    ? sum(moneyValues(paymentRows.filter(row => normal(row.status) === 'paid')))
    : currency === 'NGN' && costingPaymentRows.length
      ? sum(moneyValues(costingPaymentRows.filter(row => normal(row.payment_status) === 'paid')))
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
  for (const report of reports) {
    for (const text of [report.pending_issues, report.matters_arising, hold(report.status) || explicitConstraint(report.status_summary || '') ? report.status_summary : null]) {
      const content = shortText(text)
      const kind = category(content)
      if (kind !== 'Funding / payment' || includeFinance) {
        add(kind, content, { reason: explicitConstraint(content), action: shortText(report.look_ahead) || undefined })
      }
    }
    if (includeFinance) add('Funding / payment', report.payment_issues, { reason: explicitConstraint(shortText(report.payment_issues)) })
    const procurement = shortText(report.procurement_tracking)
    if (explicitConstraint(procurement) || /\b(delayed|overdue|stalled|pending)\b/i.test(procurement)) {
      add('Procurement', procurement, { reason: explicitConstraint(procurement) })
    }
  }
  for (const task of data.tasks ?? []) {
    if (taskProgress(task) >= 100 || !shortText(task.delay_reason) || ['cancelled', 'canceled'].includes(normal(task.status))) continue
    const kind = category(task.delay_reason!)
    if (kind !== 'Funding / payment' || includeFinance) {
      add(kind, task.delay_reason, { reason: Boolean(task.is_blocked || hold(task.status)), action: shortText(task.recovery_action) || undefined })
    }
  }
  const design = latestBy(data.design ?? [], r => `${normal(r.category)}:${normal(r.title)}`, r => `${r.report_week}:${r.updated_at || r.created_at || ''}`)
  for (const item of design.filter(r => open(r.status) && (r.management_attention || ['design issue', 'weekly challenge'].includes(normal(r.category))))) {
    const detail = shortText(item.description)
    add('Design / drawings', [item.title, detail].filter(Boolean).join(' · '), { reason: explicitConstraint(detail), owner: item.consultant_name, due: item.due_date })
  }
  for (const item of latestDocuments((data.documents ?? []).filter(r => normal(r.type) === 'drawing'))) {
    if (['void', 'superseded', 'approved', 'current'].some(status => [item.status, item.approval_status].some(value => normal(value) === status))) continue
    if (['pending review', 'for review', 'rejected'].some(s => [item.status, item.review_status, item.approval_status].some(v => normal(v) === s)) || normal(item.issued_for) === 'approval') {
      add('Design / drawings', item.title, { action: 'Review outstanding drawing' })
    }
  }
  for (const item of data.procurement ?? []) {
    const due = isoDay(item.required_on_site)
    if (open(item.status) && (!item.delivery_date || item.delivery_date > today) && ((due && due < today) || ['delayed', 'on hold'].includes(normal(item.status)))) add('Procurement', item.name, { due: due ?? undefined, owner: item.supplier })
  }
  for (const item of data.approvals ?? []) {
    const due = isoDay(item.deadline)
    if (open(item.status) && ((due && due < today) || ['delayed', 'on hold'].includes(normal(item.status)))) add('Approvals', item.title, { due: due ?? undefined, owner: item.approver })
  }
  if (includeFinance) {
    for (const item of data.payments ?? []) {
      const due = isoDay(item.due_date)
      if (!['paid', 'rejected', 'cancelled', 'canceled'].includes(normal(item.payment_status)) && !item.paid_date && ((due && due < today) || hold(item.payment_status))) add('Funding / payment', item.payment_title, { due: due ?? undefined, action: 'Review outstanding payment' })
    }
    const costing = latestBy(data.costNotes ?? [], r => `${normal(r.section)}:${normal(r.item_title)}`, r => `${r.report_week}:${r.updated_at || r.created_at || ''}`)
    for (const item of costing.filter(r => ['delayed', 'on hold', 'stalled'].includes(normal(r.status)))) {
      const detail = shortText(item.description)
      add(normal(item.section) === 'payments' ? 'Funding / payment' : category(`${item.section} ${item.item_title}`),
        [item.item_title, detail].filter(Boolean).join(' · '), { reason: explicitConstraint(detail) })
    }
  }
  for (const item of data.risks ?? []) {
    if (open(item.status) && (Number(item.risk_score) >= 12 || ['high', 'critical'].includes(normal(item.severity)))) {
      const kind = category(item.title || '')
      if (kind !== 'Funding / payment' || includeFinance) add(kind, item.title, { action: item.mitigation_action, owner: item.owner })
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
  const tasks = (data.tasks ?? []).filter(t => !t.is_summary && !['cancelled', 'canceled'].includes(normal(t.status)))
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
  const isMaster = (r: Revision) => !r.block_id && !r.delivery_package_id && (!r.package_name || /^(master|project programme|overall)$/i.test(r.package_name.trim()))
  const master = (data.revisions ?? []).find(isMaster)
  const target = isoDay(master?.current_finish || master?.planned_finish) ?? isoDay(project.handover_date)
  const planned = useTaskProgress
    ? dated && (!master || !target || tasks.some(t => isoDay(t.planned_finish || t.finish_date) === target))
      ? calculateProjectPlannedProgress(tasks, new Date(`${today}T12:00:00+01:00`)) : null
    : percent(snapshot?.snapshot_planned_progress)
  const forecast = isoDay(master?.forecast_finish)
  const variance = target && forecast ? dayDifference(forecast, target) : null
  const overduePackage = (data.revisions ?? []).some(r => {
    const plannedFinish = isoDay(r.current_finish || r.planned_finish)
    const forecastFinish = isoDay(r.forecast_finish)
    return !isMaster(r) && plannedFinish && forecastFinish && forecastFinish > plannedFinish
  })
  const activeReports = reports.filter(r => {
    const date = isoDay(r.report_date)
    return date && dayDifference(today, date) >= 0 && dayDifference(today, date) <= 14
  })
  const active = !withdrawn(project.status) && !done(project.status)
  const stalled = active && (hold(project.status) || activeReports.some(r => (hold(r.status) || /\b(?:work|site|project) (?:is |remains )?(?:stalled|on hold|suspended)\b/i.test(r.status_summary || '')) && (!lastTaskUpdate || reportTime(r) >= lastTaskUpdate)))
  const overdue = active && !!target && target < today && actual !== 100
  const progressGap = actual !== null && planned !== null ? actual - planned : null
  const constraints = active ? constraintsFor(data, activeReports, today, includeFinance) : []
  const rating: Rating = withdrawn(project.status) ? 'Withdrawn' : done(project.status) ? 'On track / done' :
    stalled || overdue || (variance ?? 0) > 0 || overduePackage || ['off track', 'critical'].includes(normal(project.status)) ? 'Off track' :
    constraints.length || (progressGap ?? 0) < 0 || ['delayed', 'at risk', 'watch'].includes(normal(project.status)) || activeReports.some(r => ['behind', 'delayed', 'at risk'].includes(normal(r.status))) ? 'Watch' :
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
  const photosScope = reports.map(r => String(r.id))
  return {
    project, rating, stalled, actual, planned, progressGap, target, forecast, variance, overdue, constraints,
    primary: constraints.find(item => item.reason),
    updates, photosScope, documents,
    commercial: includeFinance ? commercialPosition(project, data, actual) : null,
  }
}
export type ProjectPosition = ReturnType<typeof projectPosition>

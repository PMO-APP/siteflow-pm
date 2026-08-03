
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import type {
  ExecutiveReportType, GeneratedReport, ReportGenerationInput, ReportSnapshot, ReportTemplate
} from './executiveReportTypes'
import type { Workspace } from '@/workspace/types'
import { calculateProjectProgress } from '@/core/metrics/progressMetrics'

function mapTemplate(row: any): ReportTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    reportType: row.report_type,
    description: row.description,
    sections: row.sections || [],
    isDefault: Boolean(row.is_default),
    isActive: row.is_active !== false,
    createdAt: row.created_at,
  }
}

function mapReport(row: any): GeneratedReport {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    portfolioId: row.portfolio_id,
    templateId: row.template_id,
    reportType: row.report_type,
    title: row.title,
    reportingPeriodStart: row.reporting_period_start,
    reportingPeriodEnd: row.reporting_period_end,
    status: row.status,
    versionNumber: Number(row.version_number || 1),
    executiveSummary: row.executive_summary || '',
    dataSnapshot: row.data_snapshot || {},
    generatedBy: row.generated_by,
    generatedAt: row.generated_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
  }
}

export async function listReportTemplates(workspaceId: string) {
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data || []).map(mapTemplate)
}

export async function listGeneratedReports(workspaceId: string, limit = 100) {
  const { data, error } = await supabase
    .from('generated_reports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('generated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map(mapReport)
}

export async function buildReportSnapshot(
  workspace: Workspace,
  input: ReportGenerationInput
): Promise<ReportSnapshot> {
  const projectFilter = input.projectId ? String(input.projectId) : null

  const [
    projectsRes,
    tasksRes,
    risksRes,
    procurementRes,
    approvalsRes,
    qualityRes,
    hseRes,
    snagsRes,
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('tasks').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('risks').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('procurement_items').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('approvals').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('quality_gates').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('hse_incidents').select('*').eq('workspace_id', input.workspaceId),
    supabase.from('snags').select('*').eq('workspace_id', input.workspaceId),
  ])

  const responses = [projectsRes,tasksRes,risksRes,procurementRes,approvalsRes,qualityRes,hseRes,snagsRes]
  const firstError = responses.find(response => response.error)?.error
  if (firstError) throw firstError

  const projects = projectsRes.data || []
  const scoped = <T extends { project_id?: unknown }>(rows: T[]) =>
    projectFilter ? rows.filter(row => String(row.project_id) === projectFilter) : rows

  const tasks = scoped(tasksRes.data || [])
  const risks = scoped(risksRes.data || [])
  const procurement = scoped(procurementRes.data || [])
  const approvals = scoped(approvalsRes.data || [])
  const quality = scoped(qualityRes.data || [])
  const hse = scoped(hseRes.data || [])
  const snags = scoped(snagsRes.data || [])
  const project = projectFilter ? projects.find((p: any) => String(p.id) === projectFilter) : null

  const now = new Date()
  const overdueTasks = tasks.filter((task: any) => {
    const finish = task.planned_finish || task.finish_date
    return task.status !== 'Completed' && finish && new Date(finish) < now
  })
  const avgProgress = calculateProjectProgress(tasks)
  const highRisks = risks.filter((risk: any) => risk.status !== 'Closed' && Number(risk.risk_score || 0) >= 12)
  const overdueProcurement = procurement.filter((item: any) => {
    const due = item.expected_delivery_date || item.required_date
    return !['Received','Delivered','Completed'].includes(item.status) && due && new Date(due) < now
  })
  const overdueApprovals = approvals.filter((item: any) => item.status === 'Pending' && item.due_date && new Date(item.due_date) < now)
  const failedQuality = quality.filter((item: any) => ['Failed','Rejected'].includes(item.status))
  const openIncidents = hse.filter((item: any) => !['Closed','Resolved'].includes(item.status))
  const openSnags = snags.filter((item: any) => !['Closed','Resolved'].includes(item.status))

  const concerns: string[] = []
  if (overdueTasks.length) concerns.push(`${overdueTasks.length} schedule activities are overdue.`)
  if (highRisks.length) concerns.push(`${highRisks.length} high-exposure risks remain open.`)
  if (overdueProcurement.length) concerns.push(`${overdueProcurement.length} procurement items are overdue.`)
  if (overdueApprovals.length) concerns.push(`${overdueApprovals.length} approvals are beyond their due dates.`)
  if (failedQuality.length) concerns.push(`${failedQuality.length} quality gates are failed or rejected.`)
  if (openIncidents.length) concerns.push(`${openIncidents.length} HSE incidents remain open.`)

  const highlights: string[] = []
  if (avgProgress >= 80) highlights.push(`Average programme progress is ${avgProgress}%.`)
  if (!highRisks.length) highlights.push('No open high-exposure risks were detected.')
  if (!failedQuality.length) highlights.push('No failed quality gates were detected.')
  if (!openIncidents.length) highlights.push('No open HSE incidents were detected.')

  const decisionsRequired = [
    ...overdueTasks.slice(0,3).map((task: any) => `Confirm recovery action for ${task.task_name}.`),
    ...highRisks.slice(0,3).map((risk: any) => `Confirm mitigation owner and deadline for ${(risk.risk_title || risk.title || risk.description || 'risk')}.`),
    ...overdueProcurement.slice(0,3).map((item: any) => `Escalate delivery plan for ${(item.item_name || item.name || item.description || 'procurement item')}.`),
  ].slice(0,5)

  return {
    generatedAt: new Date().toISOString(),
    workspaceName: workspace.name,
    projectName: (project?.project_name || project?.name) || null,
    metrics: {
      Projects: projectFilter ? 1 : projects.length,
      'Average progress': `${avgProgress}%`,
      'Overdue activities': overdueTasks.length,
      'High risks': highRisks.length,
      'Overdue procurement': overdueProcurement.length,
      'Overdue approvals': overdueApprovals.length,
      'Failed quality gates': failedQuality.length,
      'Open HSE incidents': openIncidents.length,
      'Open snags': openSnags.length,
    },
    highlights,
    concerns,
    decisionsRequired,
    tables: {
      Projects: projects,
      'Overdue Activities': overdueTasks,
      'High Risks': highRisks,
      'Overdue Procurement': overdueProcurement,
      'Overdue Approvals': overdueApprovals,
      'Quality Exceptions': failedQuality,
      'Open HSE Incidents': openIncidents,
      'Open Snags': openSnags,
    },
  }
}

export function createExecutiveSummary(reportType: ExecutiveReportType, snapshot: ReportSnapshot) {
  const progress = snapshot.metrics['Average progress']
  const scope = snapshot.projectName ? snapshot.projectName : snapshot.workspaceName
  const opening = `${scope} is reporting ${progress} average programme progress.`
  const concern = snapshot.concerns.length
    ? `Management attention is required on ${snapshot.concerns.slice(0,3).join(' ')}`
    : 'No critical schedule, risk, procurement, approval, quality or HSE exceptions were detected from the available data.'
  const decision = snapshot.decisionsRequired.length
    ? `The immediate executive focus is to ${snapshot.decisionsRequired[0].charAt(0).toLowerCase()}${snapshot.decisionsRequired[0].slice(1)}`
    : 'Continue protecting upcoming milestones and monitoring emerging constraints.'
  return `${opening} ${concern} ${decision}`
}

export async function generateExecutiveReport(workspace: Workspace, input: ReportGenerationInput) {
  const snapshot = await buildReportSnapshot(workspace, input)
  const executiveSummary = createExecutiveSummary(input.reportType, snapshot)
  const { data: auth } = await supabase.auth.getUser()

  const { data: previous } = await supabase
    .from('generated_reports')
    .select('version_number')
    .eq('workspace_id', input.workspaceId)
    .eq('report_type', input.reportType)
    .eq('title', input.title)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const versionNumber = Number(previous?.version_number || 0) + 1
  const { data, error } = await supabase
    .from('generated_reports')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId ? String(input.projectId) : null,
      portfolio_id: input.portfolioId ? String(input.portfolioId) : null,
      template_id: input.templateId || null,
      report_type: input.reportType,
      title: input.title,
      reporting_period_start: input.reportingPeriodStart || null,
      reporting_period_end: input.reportingPeriodEnd || null,
      status: 'generated',
      version_number: versionNumber,
      executive_summary: executiveSummary,
      data_snapshot: snapshot,
      generated_by: auth.user?.id || null,
      generated_at: new Date().toISOString(),
      source_data_timestamp: snapshot.generatedAt,
    })
    .select('*')
    .single()
  if (error) throw error

  await supabase.from('report_versions').insert({
    workspace_id: input.workspaceId,
    report_id: data.id,
    version_number: versionNumber,
    snapshot: data,
    created_by: auth.user?.id || null,
  })

  return mapReport(data)
}

export async function approveReport(reportId: string) {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('generated_reports')
    .update({
      status: 'approved',
      approved_by: auth.user?.id || null,
      approved_at: new Date().toISOString(),
    })
    .eq('id', reportId)
  if (error) throw error
}

export function exportReportPdf(report: GeneratedReport, workspace: Workspace) {
  const snapshot = report.dataSnapshot as unknown as ReportSnapshot
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const primary = workspace.branding.primaryColor || '#173f5f'
  const rgb = hexToRgb(primary)
  doc.setFillColor(rgb.r, rgb.g, rgb.b)
  doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(18)
  doc.text(workspace.branding.reportHeaderText || workspace.name, 15, 12)
  doc.setFontSize(10)
  doc.text(report.title, 15, 20)

  doc.setTextColor(30,45,60)
  doc.setFontSize(11)
  doc.text(`Version ${report.versionNumber} · Generated ${new Date(report.generatedAt).toLocaleString()}`,15,38)
  doc.setFontSize(12)
  doc.text('Executive Summary',15,49)
  doc.setFontSize(10)
  const summary = doc.splitTextToSize(report.executiveSummary,180)
  doc.text(summary,15,57)

  let y = 57 + summary.length * 5 + 7
  doc.setFontSize(12); doc.text('Key Metrics',15,y); y+=7
  doc.setFontSize(9)
  Object.entries(snapshot.metrics || {}).forEach(([label,value])=>{
    if(y>270){doc.addPage();y=20}
    doc.text(`${label}: ${value}`,15,y);y+=5
  })

  if(snapshot.concerns?.length){
    y+=3;doc.setFontSize(12);doc.text('Management Concerns',15,y);y+=7;doc.setFontSize(9)
    snapshot.concerns.forEach(item=>{if(y>270){doc.addPage();y=20};doc.text(`• ${item}`,15,y);y+=5})
  }
  if(snapshot.decisionsRequired?.length){
    y+=3;doc.setFontSize(12);doc.text('Decisions Required',15,y);y+=7;doc.setFontSize(9)
    snapshot.decisionsRequired.forEach(item=>{if(y>270){doc.addPage();y=20};doc.text(`• ${item}`,15,y);y+=5})
  }

  const footer = workspace.branding.reportFooter
  if(footer){
    const pages = doc.getNumberOfPages()
    for(let page=1;page<=pages;page++){
      doc.setPage(page);doc.setFontSize(8);doc.setTextColor(120,130,140);doc.text(footer,15,291)
    }
  }
  doc.save(`${safeFileName(report.title)}-v${report.versionNumber}.pdf`)
}

export function exportReportExcel(report: GeneratedReport) {
  const snapshot = report.dataSnapshot as unknown as ReportSnapshot
  const workbook = XLSX.utils.book_new()
  const summaryRows = [
    ['Report', report.title],
    ['Version', report.versionNumber],
    ['Generated', report.generatedAt],
    ['Executive Summary', report.executiveSummary],
    [],
    ['Metric','Value'],
    ...Object.entries(snapshot.metrics || {}),
  ]
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Executive Summary')
  Object.entries(snapshot.tables || {}).forEach(([name, rows])=>{
    const safeRows = rows.length ? rows : [{ Message: 'No records available' }]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeRows), name.slice(0,31))
  })
  XLSX.writeFile(workbook, `${safeFileName(report.title)}-v${report.versionNumber}.xlsx`)
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#','')
  const value = parseInt(normalized.length === 3 ? normalized.split('').map(x=>x+x).join('') : normalized,16)
  return { r:(value>>16)&255, g:(value>>8)&255, b:value&255 }
}

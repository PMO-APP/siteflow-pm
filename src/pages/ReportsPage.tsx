import { useEffect, useMemo, useRef, useState } from 'react'
import { Printer, Plus, FileText, Image as ImageIcon, UploadCloud, CheckCircle, Lock, RotateCcw, Send, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import { canExportReports } from '@/lib/permissions'
import ReportDocument from '@/components/reports/ReportDocument'
import { useWeeklyReports, useUpsertWeeklyReport, useRisks, useSnags, useApprovals, useProcurement, useFinancial } from '@/hooks/useData'
import { fdate } from '@/lib/utils'
import type { WeeklyReport } from '@/types'
import { useProjectHealth } from '@/hooks/useProjectHealth'

const IPD_DISCIPLINES = ['Housebuild', 'Infrastructure', 'MEP']
const PMO_ROLES = ['workspace_admin', 'admin', 'pmo']

function isPMO(role?: string | null) { return PMO_ROLES.includes(role || '') }
function inferDiscipline(role?: string | null) {
  if (role === 'housebuild') return 'Housebuild'
  if (role === 'infrastructure') return 'Infrastructure'
  if (role === 'mep') return 'MEP'
  return ''
}
function workflowBadge(status?: string | null) {
  if (status === 'Approved' || status === 'Locked') return 'badge-green'
  if (status === 'Submitted' || status === 'Resubmitted') return 'badge-amber'
  if (status === 'Returned' || status === 'Rejected') return 'badge-red'
  return 'badge-muted'
}
function getWeekRange(dateValue?: string | null) {
  const date = dateValue ? new Date(dateValue) : new Date()
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}
export default function ReportsPage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()
  const canExport = canExportReports(role)
  const canReview = isPMO(role)
  const reportRef = useRef<HTMLDivElement>(null)
  const allReportsRef = useRef<HTMLDivElement>(null)

  const { data: reports = [], isLoading } = useWeeklyReports()
  const { data: risks = [] } = useRisks()
  const { data: snags = [] } = useSnags()
  const { data: approvals = [] } = useApprovals()
  const { data: procurement = [] } = useProcurement()
  const { data: financial = [] } = useFinancial()
  const upsertReport = useUpsertWeeklyReport()

  const [packages, setPackages] = useState<any[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({})
  const [reportPhotos, setReportPhotos] = useState<any[]>([])
  const [allReportPhotos, setAllReportPhotos] = useState<Record<string, any[]>>({})
  const [allReportActivities, setAllReportActivities] = useState<Record<string, any[]>>({})
  const [scheduleActivities, setScheduleActivities] = useState<any[]>([])
  const [reviewHistory, setReviewHistory] = useState<any[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [workflowComment, setWorkflowComment] = useState('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const projectHealth = useProjectHealth(projectId)

  const selectedReport = reports.find(report => report.id === selectedReportId) || reports[0]
  const selectedReportAny = selectedReport as any
  const workflowStatus = selectedReportAny?.workflow_status || 'Draft'
  const isLocked = workflowStatus === 'Locked' || Boolean(selectedReportAny?.locked_at)
  const isApproved = workflowStatus === 'Approved' || Boolean(selectedReportAny?.approved_at)
  const isSubmitted = workflowStatus === 'Submitted' || workflowStatus === 'Resubmitted'
  const currentEmail = user?.email?.toLowerCase().trim() || ''
  const isCreator = Boolean(user?.id) && (selectedReportAny?.created_by === user?.id || selectedReportAny?.reporting_officer_email?.toLowerCase().trim() === currentEmail)
  const canCreatorEdit = Boolean(selectedReport) && isCreator && (workflowStatus === 'Draft' || workflowStatus === 'Returned')
  const canCreatorSubmit = Boolean(selectedReport) && isCreator && !canReview && (workflowStatus === 'Draft' || workflowStatus === 'Returned')
  const canReviewerAct = Boolean(selectedReport) && canReview && !isCreator && isSubmitted && !isLocked && !isApproved

  const emptyForm = {
    department: inferDiscipline(role), block_id: '', package_name: '', contractor_name: '',
    reporting_officer: user?.full_name || '', reporting_officer_email: user?.email || '', status: 'On Track',
    status_summary: '', pending_issues: '', matters_arising: '', look_ahead: '', look_ahead_percentage: 0,
    look_ahead_timeline: '', next_meeting: '', quality_tracking: '', procurement_tracking: '', safety_tracking: '',
    infrastructure_landscaping_tracking: '', site_presentation_cleanliness: '', payment_issues: '',
  }
  const [reportForm, setReportForm] = useState(emptyForm)

  useEffect(() => { loadPackages() }, [projectId])
  useEffect(() => { loadReportPhotos(selectedReport?.id); loadReviewHistory(); loadScheduleActivities() }, [selectedReport?.id])

  function notify(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text }); setTimeout(() => setNotice(null), 4500)
  }

  async function loadPackages() {
    if (!projectId) { setPackages([]); return }
    const { data, error } = await supabase.from('project_blocks').select('*').eq('project_id', projectId).eq('is_active', true).order('sort_order', { ascending: true })
    if (error) { console.error(error.message); setPackages([]); return }
    setPackages(data || [])
  }

  async function loadReportPhotos(reportId?: string | null) {
    if (!reportId) { setReportPhotos([]); return }
    const { data, error } = await supabase.from('report_photos').select('*').eq('report_id', reportId).order('created_at', { ascending: true })
    if (error) { console.error(error.message); setReportPhotos([]); return }
    setReportPhotos(data || [])
  }

  async function loadReviewHistory() {
    if (!selectedReport?.id) { setReviewHistory([]); return }
    const { data, error } = await supabase.from('report_review_history').select('*').eq('report_id', selectedReport.id).order('created_at', { ascending: true })
    if (error) { console.error(error.message); setReviewHistory([]); return }
    setReviewHistory(data || [])
  }

  function mapActivity(item: any) {
    return {
      id: item.id,
      activity: item.tasks?.task_name || item.tasks?.name || item.tasks?.activity || item.tasks?.title || `Task ${item.task_id || ''}`,
      last_week: Number(item.previous_progress || 0),
      this_week: Number(item.new_progress || 0),
      planned: Number(item.tasks?.planned_progress || item.tasks?.progress_pct || item.new_progress || 0),
      activity_status: Number(item.new_progress || 0) >= Number(item.previous_progress || 0) ? 'Updated' : 'Reduced',
      remarks: item.comments || item.recovery_action || item.delay_reason || 'Progress updated from schedule.',
    }
  }

  async function loadScheduleActivities() {
    if (!selectedReport?.id || !projectId) { setScheduleActivities([]); return }
    const { start, end } = getWeekRange((selectedReport as any).report_date)
    let query = supabase.from('task_progress_logs').select('*, tasks(*)').eq('project_id', projectId).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true })
    if ((selectedReport as any).block_id) query = query.eq('block_id', (selectedReport as any).block_id)
    const { data, error } = await query
    if (error) { console.error(error.message); setScheduleActivities([]); return }
    setScheduleActivities((data || []).map(mapActivity))
  }

  async function loadAllPrintData() {
    if (!reports.length || !projectId) return
    const reportIds = reports.map((r: any) => r.id)
    const photoResult = await supabase.from('report_photos').select('*').in('report_id', reportIds).order('created_at', { ascending: true })
    const photoMap: Record<string, any[]> = {}
    ;(photoResult.data || []).forEach((p: any) => { if (!photoMap[p.report_id]) photoMap[p.report_id] = []; photoMap[p.report_id].push(p) })
    const activityMap: Record<string, any[]> = {}
    for (const report of reports as any[]) {
      const { start, end } = getWeekRange(report.report_date)
      let query = supabase.from('task_progress_logs').select('*, tasks(*)').eq('project_id', projectId).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true })
      if (report.block_id) query = query.eq('block_id', report.block_id)
      const { data } = await query
      activityMap[report.id] = (data || []).map(mapActivity)
    }
    setAllReportPhotos(photoMap); setAllReportActivities(activityMap)
  }

  const selectedPackage = packages.find(item => item.id === selectedReportAny?.block_id)
  const reportProjectHealth = {
  ...projectHealth,
  startDate: projectHealth?.projectStartIso || null,
  finishDate: projectHealth?.plannedFinishIso || null,
  forecastFinish: projectHealth?.forecastFinishIso || null,
  status: projectHealth?.projectHealth || 'On Track',
}

  const reportGroups = useMemo(() => {
    const map: Record<string, any[]> = {}
    reports.forEach(r => { const key = r.report_date || 'No date'; if (!map[key]) map[key] = []; map[key].push(r) })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [reports])

  const openRisks = risks.filter(r => r.status === 'Open').length
  const highRisks = risks.filter(r => r.status === 'Open' && (r.risk_score || 0) >= 12).length
  const openSnags = snags.filter(s => s.status !== 'Closed').length
  const criticalSnags = snags.filter(s => s.severity === 'Critical' && s.status !== 'Closed').length
  const pendingApprovals = approvals.filter(a => a.status !== 'Approved' && a.status !== 'Rejected').length
  const pendingProcurement = procurement.filter(i => i.status !== 'Delivered').length
  const contractSum = financial.filter(i => i.type === 'Contract Sum').reduce((sum, i) => sum + i.amount, 0)

  function openNewReport() { setReportForm(emptyForm); setPhotoCaptions({}); setPhotos([]); setSelectedReportId(null); setShowReportModal(true) }
  function openEditReport(report: WeeklyReport) {
    const r = report as any
    setReportForm({
      department: r.department || r.discipline || '', block_id: r.block_id || '', package_name: r.package_name || '', contractor_name: r.contractor_name || '',
      reporting_officer: r.reporting_officer || '', reporting_officer_email: r.reporting_officer_email || '', status: r.status || 'On Track',
      status_summary: r.status_summary || '', pending_issues: r.pending_issues || '', matters_arising: r.matters_arising || '', look_ahead: r.look_ahead || '',
      look_ahead_percentage: Number(r.look_ahead_percentage || 0), look_ahead_timeline: r.look_ahead_timeline || '', next_meeting: r.next_meeting || '',
      quality_tracking: r.quality_tracking || '', procurement_tracking: r.procurement_tracking || '', safety_tracking: r.safety_tracking || '',
      infrastructure_landscaping_tracking: r.infrastructure_landscaping_tracking || '', site_presentation_cleanliness: r.site_presentation_cleanliness || '', payment_issues: r.payment_issues || '',
    })
    setPhotoCaptions({}); setPhotos([]); setSelectedReportId(report.id); setShowReportModal(true)
  }
  function onPackageChange(packageId: string) {
    const pkg = packages.find(item => item.id === packageId)
    setReportForm(c => ({ ...c, block_id: packageId, package_name: pkg?.package_name || pkg?.block_name || '', contractor_name: pkg?.contractor_name || c.contractor_name || '' }))
  }

  function getSavedReportId(savedReport: any) {
    if (!savedReport) return null
    if (savedReport.id) return savedReport.id
    if (Array.isArray(savedReport) && savedReport[0]?.id) return savedReport[0].id
    if (savedReport.data?.id) return savedReport.data.id
    if (Array.isArray(savedReport.data) && savedReport.data[0]?.id) return savedReport.data[0].id
    return null
  }
  async function findReportIdFallback() {
    if (!projectId) return null
    const { data } = await supabase.from('weekly_reports').select('id').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    return data?.id || null
  }
  async function uploadReportPhotos(reportId: string) {
    if (!reportId || photos.length === 0) return
    setUploadingPhotos(true)
    for (const photo of photos) {
      const safeName = photo.name.replace(/\s+/g, '-').toLowerCase()
      const filePath = `${reportId}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('report-photos').upload(filePath, photo, { cacheControl: '3600', upsert: false })
      if (uploadError) { notify('error', `Photo upload failed: ${uploadError.message}`); setUploadingPhotos(false); return }
      const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(filePath)
      const { error: photoInsertError } = await supabase.from('report_photos').insert({ report_id: reportId, photo_url: publicUrl, photo_name: photo.name, caption: photoCaptions[photo.name] || null, uploaded_by: user?.full_name || user?.email || 'User', created_by: user?.id || null, report_type: 'IPD' })
      if (photoInsertError) notify('error', photoInsertError.message)
    }
    setUploadingPhotos(false); setPhotos([])
  }
  async function saveReport() {
    try {
      const now = new Date().toISOString()
      const isNewReport = !selectedReportId
      const initialWorkflowStatus = canReview ? 'Approved' : 'Draft'
      const savedReport = await upsertReport.mutateAsync({
        id: selectedReportId || undefined,
        ...reportForm,
        report_date: isNewReport ? new Date().toISOString().slice(0, 10) : selectedReportAny?.report_date,
        block_id: reportForm.block_id || null,
        next_meeting: reportForm.next_meeting || null,
        discipline: reportForm.department,
        reporting_officer_email: reportForm.reporting_officer_email || user?.email || '',
        created_by_role: selectedReportId ? selectedReportAny?.created_by_role || role : role,
        created_by: selectedReportId ? selectedReportAny?.created_by || user?.id || null : user?.id || null,
        updated_by: user?.id || null,
        workflow_status: selectedReportId ? selectedReportAny?.workflow_status || initialWorkflowStatus : initialWorkflowStatus,
        ...(isNewReport && canReview ? { approved_at: now, approved_by: user?.id || null, reviewed_at: now, reviewed_by: user?.id || null, workflow_updated_at: now, workflow_updated_by: user?.id || null, workflow_updated_by_name: user?.full_name || user?.email || 'PMO/Admin' } : {}),
      } as any)
      const reportId = selectedReportId || getSavedReportId(savedReport) || (await findReportIdFallback())
      if (!reportId) { notify('error', 'Report saved, but report ID could not be found for photo upload.'); return }
      if (photos.length > 0) await uploadReportPhotos(reportId)
      await loadReportPhotos(reportId)
      setSelectedReportId(reportId); setShowReportModal(false); setPhotos([]); setPhotoCaptions({})
      notify('success', canReview && isNewReport ? 'PMO report created and approved automatically.' : 'Report saved successfully.')
    } catch (error: any) { notify('error', error?.message || 'Failed to save report.') }
  }
  async function insertHistory(action: string, comment?: string | null) {
    if (!selectedReport?.id) return
    await supabase.from('report_review_history').insert({ report_id: selectedReport.id, action, comment: comment || null, acted_by: user?.id || null, acted_by_name: user?.full_name || user?.email || 'User', acted_by_role: role || null })
  }
  async function updateWorkflow(status: string, comment?: string | null) {
    if (!selectedReport?.id) return
    const now = new Date().toISOString()
    const payload: any = { workflow_status: status, workflow_comment: comment || null, workflow_updated_at: now, workflow_updated_by: user?.id || null, workflow_updated_by_name: user?.full_name || user?.email || 'User', updated_by: user?.id || null }
    if (status === 'Submitted' || status === 'Resubmitted') { payload.submitted_at = now; payload.submitted_by = user?.id || null }
    if (status === 'Approved') { payload.approved_at = now; payload.approved_by = user?.id || null; payload.reviewed_at = now; payload.reviewed_by = user?.id || null }
    if (status === 'Returned') { payload.returned_at = now; payload.returned_by = user?.id || null; payload.return_comment = comment || null }
    if (status === 'Rejected') { payload.rejected_at = now; payload.rejected_by = user?.id || null; payload.rejected_comment = comment || null }
    if (status === 'Locked') { payload.locked_at = now; payload.locked_by = user?.id || null }
    const { error } = await supabase.from('weekly_reports').update(payload).eq('id', selectedReport.id)
    if (error) { notify('error', error.message); return }
    await insertHistory(status, comment); await loadReviewHistory()
    if (status === 'Returned') setShowReturnModal(false)
    if (status === 'Rejected') setShowRejectModal(false)
    setWorkflowComment('')
    notify(status === 'Returned' || status === 'Rejected' ? 'info' : 'success', `Report ${status.toLowerCase()} successfully.`)
  }
  function printHtml(html: string, title: string) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!doctype html><html><head><title>${title}</title><style>body{margin:0;background:white;}@page{size:A4;margin:0;}.page-break{page-break-after:always;}img{max-width:100%;}</style></head><body>${html}</body></html>`)
    printWindow.document.close()
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close() }, 700)
  }
  function printSelectedReport() { if (reportRef.current) printHtml(reportRef.current.innerHTML, 'IPD Report') }
  async function printAllReports() { await loadAllPrintData(); setTimeout(() => { if (allReportsRef.current) printHtml(allReportsRef.current.innerHTML, 'All IPD Reports') }, 300) }

  return (
    <div className="space-y-5">
      {notice && <div className={`fixed top-5 right-5 z-[100] rounded-xl px-4 py-3 shadow-xl text-sm border ${notice.type === 'success' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' : notice.type === 'error' ? 'bg-red-500/15 border-red-400/30 text-red-200' : 'bg-amber-500/15 border-amber-400/30 text-amber-200'}`}>{notice.text}</div>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="text-xl font-semibold text-[#ede8de]">IPD Reports</div><div className="text-[11px] text-[#6e7d8c] mt-1">Internal Project Delivery Weekly Reporting · {projectName}</div></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm btn" onClick={printSelectedReport}><Printer size={13} />Print Selected</button>
          <button className="btn-ghost btn-sm btn" onClick={printAllReports}><Printer size={13} />Print All IPD</button>
          {canExport && <button className="btn-gold btn-sm btn" onClick={openNewReport}><Plus size={13} />New IPD Report</button>}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric title="IPD Reports" value={reports.length} color="text-[#c49e48]" />
        <Metric title="Open Risks" value={openRisks} color={openRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="High Risks" value={highRisks} color={highRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="Open Snags" value={openSnags} color={openSnags > 0 ? 'text-amber-400' : 'text-emerald-400'} />
        <Metric title="Pending Approvals" value={pendingApprovals} color={pendingApprovals > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#ede8de] font-semibold"><FileText size={16} className="text-[#c49e48]" />Report History</div>
          {isLoading ? <div className="text-sm text-[#6e7d8c]">Loading reports…</div> : reports.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-[#6e7d8c]">No IPD reports yet.</div> : reportGroups.map(([date, dateReports]) => (
            <div key={date} className="space-y-2"><div className="text-[10px] uppercase tracking-widest text-[#c49e48] pt-2">Week Ending {fdate(date)}</div>{dateReports.map(report => {
              const r = report as any
              const packageName = r.package_name || packages.find(item => item.id === r.block_id)?.package_name || packages.find(item => item.id === r.block_id)?.block_name || 'Project Wide'
              return <button key={report.id} onClick={() => setSelectedReportId(report.id)} className={`w-full text-left rounded-xl border p-3 transition ${selectedReport?.id === report.id ? 'border-[#c49e48]/40 bg-[#c49e48]/10' : 'border-white/10 bg-white/[0.03] hover:border-[#c49e48]/30'}`}>
                <div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold text-[#ede8de]">{r.department || r.discipline || 'IPD'}</div><span className={`badge ${workflowBadge(r.workflow_status || 'Draft')}`}>{r.workflow_status || 'Draft'}</span></div>
                <div className="text-[11px] text-[#c49e48] mt-1">{packageName}</div><div className="text-[11px] text-[#6e7d8c] mt-1">Officer: {r.reporting_officer || '—'}</div>
                {selectedReport?.id === report.id && reportPhotos.length > 0 && <div className="text-[10px] text-[#6e7d8c] mt-1 flex items-center gap-1"><ImageIcon size={11} />{reportPhotos.length} photo(s)</div>}
              </button>
            })}</div>
          ))}
        </div>
        <div className="space-y-3">
          {!selectedReport ? <div className="card p-8 text-center text-[#6e7d8c]">Select or create an IPD report.</div> : <>
            {workflowStatus === 'Returned' && isCreator && <div className="card p-4 border border-amber-400/30 bg-amber-500/10"><div className="text-sm font-semibold text-amber-300 mb-2">PMO Review Comment</div><div className="text-sm text-[#ede8de] whitespace-pre-wrap">{selectedReportAny.workflow_comment || selectedReportAny.return_comment || 'No comment provided.'}</div></div>}
            <div className="card p-3 flex flex-wrap gap-2">
              {canCreatorEdit && <button className="btn-ghost btn-sm btn" onClick={() => openEditReport(selectedReport)}>Edit Report</button>}
              {canCreatorSubmit && workflowStatus === 'Draft' && <button className="btn-gold btn-sm btn" onClick={() => updateWorkflow('Submitted')}><Send size={13} />Submit</button>}
              {canCreatorSubmit && workflowStatus === 'Returned' && <button className="btn-gold btn-sm btn" onClick={() => updateWorkflow('Resubmitted')}><Send size={13} />Resubmit</button>}
              {canReviewerAct && <><button className="btn-gold btn-sm btn" onClick={() => updateWorkflow('Approved')}><CheckCircle size={13} />Approve</button><button className="btn-ghost btn-sm btn" onClick={() => setShowReturnModal(true)}><RotateCcw size={13} />Return</button><button className="btn-ghost btn-sm btn" onClick={() => setShowRejectModal(true)}><XCircle size={13} />Reject</button></>}
              {canReview && !isCreator && isApproved && !isLocked && <button className="btn-gold btn-sm btn" onClick={() => updateWorkflow('Locked')}><Lock size={13} />Lock Report</button>}
              <button className="btn-ghost btn-sm btn" onClick={printSelectedReport}><Printer size={13} />Print Report</button>
            </div>
            <div className="grid grid-cols-1 2xl:grid-cols-[1fr_320px] gap-4"><div ref={reportRef}><ReportDocument report={{ ...selectedReport, status_summary: selectedReportAny.status_summary || projectHealth?.statusSummary, look_ahead_percentage: selectedReportAny.look_ahead_percentage, look_ahead_timeline: selectedReportAny.look_ahead_timeline, infrastructure_landscaping_tracking: selectedReportAny.infrastructure_landscaping_tracking, site_presentation_cleanliness: selectedReportAny.site_presentation_cleanliness, payment_issues: selectedReportAny.payment_issues }} projectName={projectName} selectedPackage={selectedPackage} activities={scheduleActivities} photos={reportPhotos} contractSum={contractSum} openSnags={openSnags} criticalSnags={criticalSnags} openRisks={openRisks} pendingProcurement={pendingProcurement} projectHealth={reportProjectHealth} /></div><WorkflowTimeline history={reviewHistory} /></div>
          </>}
        </div>
      </div>
      <div style={{ display: 'none' }}><div ref={allReportsRef}>{reports.map((report: any) => <div key={report.id} className="page-break"><ReportDocument report={{ ...report, status_summary: report.status_summary || projectHealth?.statusSummary, look_ahead_percentage: report.look_ahead_percentage, look_ahead_timeline: report.look_ahead_timeline, infrastructure_landscaping_tracking: report.infrastructure_landscaping_tracking, site_presentation_cleanliness: report.site_presentation_cleanliness, payment_issues: report.payment_issues }} projectName={projectName} selectedPackage={packages.find(item => item.id === report.block_id)} activities={allReportActivities[report.id] || []} photos={allReportPhotos[report.id] || []} contractSum={contractSum} openSnags={openSnags} criticalSnags={criticalSnags} openRisks={openRisks} pendingProcurement={pendingProcurement} projectHealth={reportProjectHealth} /></div>)}</div></div>
      {showReturnModal && <CommentModal title="Return Report" actionLabel="Return Report" value={workflowComment} onChange={setWorkflowComment} onClose={() => setShowReturnModal(false)} onSubmit={() => { if (!workflowComment.trim()) { notify('error', 'Return comment is required.'); return } updateWorkflow('Returned', workflowComment) }} />}
      {showRejectModal && <CommentModal title="Reject Report" actionLabel="Reject Report" value={workflowComment} onChange={setWorkflowComment} onClose={() => setShowRejectModal(false)} onSubmit={() => { if (!workflowComment.trim()) { notify('error', 'Rejection comment is required.'); return } updateWorkflow('Rejected', workflowComment) }} />}
      {showReportModal && <Modal title={selectedReportId ? 'Edit IPD Report' : 'New IPD Report'} onClose={() => { setShowReportModal(false); setSelectedReportId(null) }}>
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#9aa6b2]">Report date is generated automatically on submission date and cannot be backdated.</div>
          <select className="form-control" value={reportForm.department} onChange={e => setReportForm(c => ({ ...c, department: e.target.value }))}><option value="">Select IPD Discipline</option>{IPD_DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}</select>
          <select className="form-control" value={reportForm.block_id} onChange={e => onPackageChange(e.target.value)}><option value="">Project Wide / No Package</option>{packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.package_name || pkg.block_name}{pkg.contractor_name ? ` — ${pkg.contractor_name}` : ''}</option>)}</select>
          <input className="form-control" placeholder="Contractor" value={reportForm.contractor_name} onChange={e => setReportForm(c => ({ ...c, contractor_name: e.target.value }))} />
          <input className="form-control" placeholder="Reporting Officer" value={reportForm.reporting_officer} onChange={e => setReportForm(c => ({ ...c, reporting_officer: e.target.value }))} />
          <input className="form-control" placeholder="Reporting Officer Email" value={reportForm.reporting_officer_email} onChange={e => setReportForm(c => ({ ...c, reporting_officer_email: e.target.value }))} />
          <select className="form-control" value={reportForm.status} onChange={e => setReportForm(c => ({ ...c, status: e.target.value }))}><option>Ahead</option><option>On Track</option><option>Behind</option><option>Stuck</option></select>
          <input type="number" className="form-control" placeholder="Look Ahead Percentage e.g. 75" value={reportForm.look_ahead_percentage} onChange={e => setReportForm(c => ({ ...c, look_ahead_percentage: Number(e.target.value || 0) }))} />
          {[
            ['status_summary', 'Status Summary e.g. Works are currently at 5th floor'], ['pending_issues', 'Pending Issues'], ['matters_arising', 'Matters Arising'], ['look_ahead', 'Look Ahead Activities'], ['look_ahead_timeline', 'Look Ahead Timeline e.g. 08 Jul - 15 Jul'], ['quality_tracking', 'Quality Tracking'], ['procurement_tracking', 'Procurement Tracking'], ['safety_tracking', 'Safety Tracking'], ['infrastructure_landscaping_tracking', 'Infrastructure / Landscaping Tracking'], ['site_presentation_cleanliness', 'Site Presentation / Cleanliness'], ['payment_issues', 'Payment Issues'],
          ].map(([key, label]) => <textarea key={key} className="form-control" rows={2} placeholder={label} value={(reportForm as any)[key]} onChange={e => setReportForm(c => ({ ...c, [key]: e.target.value }))} />)}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"><div className="flex items-center gap-2 text-sm font-semibold text-[#ede8de]"><UploadCloud size={15} className="text-[#c49e48]" />Upload Progress Photos</div><input type="file" multiple accept="image/*" className="form-control" onChange={e => { setPhotos(Array.from(e.target.files || [])); setPhotoCaptions({}) }} />{photos.map(photo => <div key={photo.name} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"><div className="text-xs text-[#ede8de]">{photo.name}</div><input className="form-control" placeholder="Photo caption" value={photoCaptions[photo.name] || ''} onChange={e => setPhotoCaptions(c => ({ ...c, [photo.name]: e.target.value }))} /><img src={URL.createObjectURL(photo)} alt={photo.name} className="w-full max-h-48 object-cover rounded-xl border border-white/10" /></div>)}</div>
          <button className="btn-gold btn w-full justify-center" onClick={saveReport} disabled={upsertReport.isPending || uploadingPhotos}>{upsertReport.isPending || uploadingPhotos ? 'Saving…' : 'Save Report'}</button>
        </div>
      </Modal>}
    </div>
  )
}

function WorkflowTimeline({ history }: { history: any[] }) {
  return <div className="card p-4 h-fit"><div className="text-sm font-semibold text-[#ede8de] mb-4">Workflow History</div>{history.length === 0 ? <div className="text-xs text-[#6e7d8c]">No workflow history yet.</div> : <div className="space-y-4">{history.map(item => <div key={item.id} className="border-l border-[#c49e48]/30 pl-3"><div className="text-xs font-semibold text-[#c49e48]">{item.action}</div><div className="text-[11px] text-[#6e7d8c] mt-1">{item.acted_by_name || 'User'} · {fdate(item.created_at)}</div>{item.comment && <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/10 p-2 text-xs text-[#bfb9ae] whitespace-pre-wrap">{item.comment}</div>}</div>)}</div>}</div>
}
function Metric({ title, value, color }: { title: string; value: number; color: string }) { return <div className="card p-3"><div className={`font-display text-3xl font-bold ${color}`}>{value}</div><div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">{title}</div></div> }
function CommentModal({ title, actionLabel, value, onChange, onClose, onSubmit }: { title: string; actionLabel: string; value: string; onChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) { return <Modal title={title} onClose={onClose}><div className="space-y-4"><textarea className="form-control" rows={6} placeholder="Enter review comment..." value={value} onChange={e => onChange(e.target.value)} /><div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-gold" onClick={onSubmit}>{actionLabel}</button></div></div></Modal> }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-[#ede8de]">{title}</h2><button onClick={onClose} className="text-[#6e7d8c] hover:text-white">✕</button></div>{children}</div></div> }

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Printer,
  Plus,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle,
  Lock,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import { useAccessSession } from '@/access/AccessSessionProvider'
import ReportDocument from '@/components/reports/ReportDocument'
import {
  useWeeklyReports,
  useUpsertWeeklyReport,
  useRisks,
  useSnags,
  useApprovals,
  useProcurement,
  useFinancial,
} from '@/hooks/useData'
import { fdate } from '@/lib/utils'
import type { WeeklyReport } from '@/types'
import { useProjectHealth } from '@/hooks/useProjectHealth'
import { ExecutiveHealthReportPanel, HealthHistoryChart } from '@/components/health'

const IPD_DISCIPLINES = ['Housebuild', 'Infrastructure', 'MEP']
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

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function buildSnapshotHealth(report: any, liveHealth: any) {
  return {
    ...liveHealth,

    startDate:
      report?.snapshot_project_start ??
      liveHealth?.startDate ??
      null,

    finishDate:
      report?.snapshot_planned_finish ??
      liveHealth?.finishDate ??
      null,

    forecastFinish:
      report?.snapshot_forecast_finish ??
      liveHealth?.forecastFinish ??
      null,

    plannedProgress:
      report?.snapshot_planned_progress ??
      liveHealth?.plannedProgress ??
      0,

   overallProgress:
  report?.snapshot_actual_progress !== null &&
  report?.snapshot_actual_progress !== undefined
    ? Number(report.snapshot_actual_progress)
    : liveHealth?.overallProgress ?? 0,

    varianceDays:
      report?.snapshot_variance_days ??
      liveHealth?.varianceDays ??
      0,

    varianceLabel:
      report?.snapshot_variance_label ??
      liveHealth?.varianceLabel ??
      'On Schedule',

    status:
      report?.snapshot_project_health ??
      liveHealth?.status ??
      'On Track',

    statusSummary:
      report?.snapshot_status_summary ??
      liveHealth?.statusSummary ??
      '',
  }
}

export default function ReportsPage() {
  const { projectId, projectName } = useProjectStore()
  const { discipline: routeDiscipline } = useParams<{ discipline: string }>()
  const role = useMembershipStore(state => state.role)
  const {session,can}=useAccessSession()
  const { user } = useAuthStore()

  const canExport = can('reports.export',{scopeType:'project',scopeId:projectId})
  const canReview = can('reports.review',{scopeType:'project',scopeId:projectId})

  const reportRef = useRef<HTMLDivElement>(null)
  const allReportsRef = useRef<HTMLDivElement>(null)

  const { data: allReports = [], isLoading } = useWeeklyReports()
  const disciplineLabel = routeDiscipline
    ? routeDiscipline.charAt(0).toUpperCase() + routeDiscipline.slice(1)
    : ''
  const reports = useMemo(
    () => allReports.filter((report: any) => {
      if (!disciplineLabel) return true
      const department = String(report.department || report.discipline || '').toLowerCase()
      if (routeDiscipline === 'mechanical' || routeDiscipline === 'electrical') {
        return department === routeDiscipline || department === 'mep'
      }
      return department === routeDiscipline
    }),
    [allReports, disciplineLabel, routeDiscipline]
  )
  const canWriteDiscipline = useMemo(() => {
    const memberRole = String(role || '').toLowerCase()
    const memberDiscipline = String(session.discipline || '').toLowerCase()
    if (['workspace_admin', 'admin', 'pmo'].includes(memberRole)) return true
    if (routeDiscipline === 'mechanical' || routeDiscipline === 'electrical') {
      return memberRole === 'mep' || memberDiscipline === 'mep' || memberDiscipline === routeDiscipline
    }
    return memberRole === routeDiscipline || memberDiscipline === routeDiscipline
  }, [role, session.discipline, routeDiscipline])
  const { data: risks = [] } = useRisks()
  const { data: snags = [] } = useSnags()
  const { data: approvals = [] } = useApprovals()
  const { data: procurement = [] } = useProcurement()
  const { data: financial = [] } = useFinancial()

  const upsertReport = useUpsertWeeklyReport()
  const projectHealth = useProjectHealth(projectId)

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

  const selectedReport =
    reports.find(report => report.id === selectedReportId) || reports[0]

  const selectedReportAny = selectedReport as any
  const workflowStatus = selectedReportAny?.workflow_status || 'Draft'

  const isLocked =
    workflowStatus === 'Locked' || Boolean(selectedReportAny?.locked_at)

  const isApproved =
    workflowStatus === 'Approved' || Boolean(selectedReportAny?.approved_at)

  const isSubmitted =
    workflowStatus === 'Submitted' || workflowStatus === 'Resubmitted'

  const currentEmail = user?.email?.toLowerCase().trim() || ''

  const isCreator =
    Boolean(user?.id) &&
    (
      selectedReportAny?.created_by === user?.id ||
      selectedReportAny?.reporting_officer_email?.toLowerCase().trim() === currentEmail
    )

  const canCreatorEdit =
    Boolean(selectedReport) &&
    isCreator &&
    (workflowStatus === 'Draft' || workflowStatus === 'Returned')

  const canCreatorSubmit =
    Boolean(selectedReport) &&
    isCreator &&
    !canReview &&
    (workflowStatus === 'Draft' || workflowStatus === 'Returned')

  const canReviewerAct =
    Boolean(selectedReport) &&
    canReview &&
    !isCreator &&
    isSubmitted &&
    !isLocked &&
    !isApproved

  const emptyForm = {
    department: disciplineLabel || (session.discipline ? session.discipline.charAt(0).toUpperCase()+session.discipline.slice(1) : ''),
    block_id: '',
    package_name: '',
    contractor_name: '',
    reporting_officer: user?.full_name || '',
    reporting_officer_email: user?.email || '',
    status: 'On Track',
    status_summary: '',
    pending_issues: '',
    matters_arising: '',
    look_ahead: '',
    look_ahead_percentage: 0,
    look_ahead_timeline: '',
    next_meeting: '',
    quality_tracking: '',
    procurement_tracking: '',
    safety_tracking: '',
    infrastructure_landscaping_tracking: '',
    site_presentation_cleanliness: '',
    payment_issues: '',
  }

  const [reportForm, setReportForm] = useState(emptyForm)

  useEffect(() => {
    loadPackages()
  }, [projectId])

  useEffect(() => {
    loadReportPhotos(selectedReport?.id)
    loadReviewHistory()
    loadScheduleActivities()
  }, [selectedReport?.id])

  const selectedPackage = packages.find(
    item => item.id === selectedReportAny?.block_id
  )

  const reportProjectHealth = {
    ...projectHealth,
    startDate: projectHealth?.projectStartIso || null,
    finishDate: projectHealth?.plannedFinishIso || null,
    forecastFinish: projectHealth?.forecastFinishIso || null,
    status: projectHealth?.projectHealth || 'On Track',
  }

  const reportSnapshot = buildSnapshotHealth(selectedReportAny, reportProjectHealth)

  const reportGroups = useMemo(() => {
    const map: Record<string, any[]> = {}

    reports.forEach(report => {
      const key = report.report_date || 'No date'
      if (!map[key]) map[key] = []
      map[key].push(report)
    })

    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [reports])

  const openRisks = risks.filter(risk => risk.status === 'Open').length

  const highRisks = risks.filter(
    risk => risk.status === 'Open' && Number(risk.risk_score || 0) >= 12
  ).length

  const openSnags = snags.filter(snag => snag.status !== 'Closed').length

  const criticalSnags = snags.filter(
    snag => snag.severity === 'Critical' && snag.status !== 'Closed'
  ).length

  const pendingApprovals = approvals.filter(
    approval => approval.status !== 'Approved' && approval.status !== 'Rejected'
  ).length

  const pendingProcurement = procurement.filter(
    item => item.status !== 'Delivered'
  ).length

  const contractSum = financial
    .filter(item => item.type === 'Contract Sum')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  function notify(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text })
    setTimeout(() => setNotice(null), 4500)
  }

  async function loadPackages() {
    if (!projectId) {
      setPackages([])
      return
    }

    const { data, error } = await supabase
      .from('project_blocks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error(error.message)
      setPackages([])
      return
    }

    setPackages(data || [])
  }

  async function loadReportPhotos(reportId?: string | null) {
    if (!reportId) {
      setReportPhotos([])
      return
    }

    const { data, error } = await supabase
      .from('report_photos')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error.message)
      setReportPhotos([])
      return
    }

    setReportPhotos(data || [])
  }

  async function loadReviewHistory() {
    if (!selectedReport?.id) {
      setReviewHistory([])
      return
    }

    const { data, error } = await supabase
      .from('report_review_history')
      .select('*')
      .eq('report_id', selectedReport.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error.message)
      setReviewHistory([])
      return
    }

    setReviewHistory(data || [])
  }

  function mapActivity(item: any) {
  const previous = Number(item.previous_progress || 0)
  const current = Number(item.new_progress || 0)

  return {
    id: item.id,
    taskId: item.task_id,
    activity:
      item.tasks?.task_name ||
      item.tasks?.name ||
      item.tasks?.activity ||
      item.tasks?.title ||
      `Task ${item.task_id || ''}`,
    last_week: previous,
    this_week: current,
    planned: Number(
      item.tasks?.planned_progress ||
      item.tasks?.progress_pct ||
      current ||
      0
    ),
    remarks:
      item.comments ||
      item.recovery_action ||
      item.delay_reason ||
      `Progress updated from ${previous}% to ${current}%`,
  }
}
  function dedupeActivities(items: any[]) {
  const map = new Map<string, any>()

  items.forEach(item => {
    const key = item.taskId || item.activity

    if (!map.has(key)) {
      map.set(key, item)
      return
    }

    const existing = map.get(key)

    map.set(key, {
      ...existing,
      this_week: item.this_week,
      planned: item.planned,
      remarks: item.remarks || existing.remarks,
    })
  })

  return Array.from(map.values())
}

  async function loadScheduleActivities() {
    if (!selectedReport?.id || !projectId) {
      setScheduleActivities([])
      return
    }

    const { start, end } = getWeekRange((selectedReport as any).report_date)

    let query = supabase
      .from('task_progress_logs')
      .select('*, tasks(*)')
      .eq('project_id', projectId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if ((selectedReport as any).block_id) {
      query = query.eq('block_id', (selectedReport as any).block_id)
    }

    const { data, error } = await query

    if (error) {
      console.error(error.message)
      setScheduleActivities([])
      return
    }

   setScheduleActivities(dedupeActivities((data || []).map(mapActivity)))
  }

  async function loadAllPrintData() {
    if (!reports.length || !projectId) return

    const reportIds = reports.map((report: any) => report.id)

    const photoResult = await supabase
      .from('report_photos')
      .select('*')
      .in('report_id', reportIds)
      .order('created_at', { ascending: true })

    const photoMap: Record<string, any[]> = {}

    ;(photoResult.data || []).forEach((photo: any) => {
      if (!photoMap[photo.report_id]) photoMap[photo.report_id] = []
      photoMap[photo.report_id].push(photo)
    })

    const activityMap: Record<string, any[]> = {}

    for (const report of reports as any[]) {
      const { start, end } = getWeekRange(report.report_date)

      let query = supabase
        .from('task_progress_logs')
        .select('*, tasks(*)')
        .eq('project_id', projectId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })

      if (report.block_id) query = query.eq('block_id', report.block_id)

      const { data } = await query

      activityMap[report.id] = dedupeActivities((data || []).map(mapActivity))
    }

    setAllReportPhotos(photoMap)
    setAllReportActivities(activityMap)
  }

  function openNewReport() {
    if (!canWriteDiscipline) {
      notify('info', `You can view ${disciplineLabel || 'this'} reports, but only the responsible department can write here.`)
      return
    }
    setReportForm({
      ...emptyForm,
      department: disciplineLabel || (session.discipline ? session.discipline.charAt(0).toUpperCase()+session.discipline.slice(1) : ''),
      reporting_officer: user?.full_name || '',
      reporting_officer_email: user?.email || '',
    })
    setPhotoCaptions({})
    setPhotos([])
    setSelectedReportId(null)
    setShowReportModal(true)
  }

  function openEditReport(report: WeeklyReport) {
    const reportAny = report as any

    setReportForm({
      department: reportAny.department || reportAny.discipline || '',
      block_id: reportAny.block_id || '',
      package_name: reportAny.package_name || '',
      contractor_name: reportAny.contractor_name || '',
      reporting_officer: reportAny.reporting_officer || '',
      reporting_officer_email: reportAny.reporting_officer_email || '',
      status: report.status || 'On Track',
      status_summary: reportAny.status_summary || '',
      pending_issues: report.pending_issues || '',
      matters_arising: report.matters_arising || '',
      look_ahead: report.look_ahead || '',
      look_ahead_percentage: Number(reportAny.look_ahead_percentage || 0),
      look_ahead_timeline: reportAny.look_ahead_timeline || '',
      next_meeting: report.next_meeting || '',
      quality_tracking: report.quality_tracking || '',
      procurement_tracking: report.procurement_tracking || '',
      safety_tracking: report.safety_tracking || '',
      infrastructure_landscaping_tracking:
        reportAny.infrastructure_landscaping_tracking || '',
      site_presentation_cleanliness:
        reportAny.site_presentation_cleanliness || '',
      payment_issues: reportAny.payment_issues || '',
    })

    setPhotoCaptions({})
    setPhotos([])
    setSelectedReportId(report.id)
    setShowReportModal(true)
  }

  function onPackageChange(packageId: string) {
    const pkg = packages.find(item => item.id === packageId)

    setReportForm(current => ({
      ...current,
      block_id: packageId,
      package_name: pkg?.package_name || pkg?.block_name || '',
      contractor_name: pkg?.contractor_name || current.contractor_name || '',
    }))
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

    const { data } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data?.id || null
  }

  async function uploadReportPhotos(reportId: string) {
    if (!reportId || photos.length === 0) return

    setUploadingPhotos(true)

    for (const photo of photos) {
      const safeName = photo.name.replace(/\s+/g, '-').toLowerCase()
      const filePath = `${reportId}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(filePath, photo, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        notify('error', `Photo upload failed: ${uploadError.message}`)
        setUploadingPhotos(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('report-photos').getPublicUrl(filePath)

      const { error: photoInsertError } = await supabase
        .from('report_photos')
        .insert({
          report_id: reportId,
          photo_url: publicUrl,
          photo_name: photo.name,
          caption: photoCaptions[photo.name] || null,
          uploaded_by: user?.full_name || user?.email || 'User',
          created_by: user?.id || null,
          report_type: 'IPD',
        })

      if (photoInsertError) notify('error', photoInsertError.message)
    }

    setUploadingPhotos(false)
    setPhotos([])
  }

  async function saveReport() {
    if (!canWriteDiscipline) {
      notify('error', `This report is read-only for you. Only the ${disciplineLabel || 'responsible'} team can write here.`)
      return
    }
    try {
      const now = new Date().toISOString()
      const isNewReport = !selectedReportId
      const initialWorkflowStatus = canReview ? 'Approved' : 'Draft'

      const snapshot = {
  startDate: reportProjectHealth.startDate,
  finishDate: reportProjectHealth.finishDate,
  plannedProgress: reportProjectHealth.plannedProgress,
  overallProgress: reportProjectHealth.overallProgress,
  varianceDays: reportProjectHealth.varianceDays,
  varianceLabel: reportProjectHealth.varianceLabel,
  status: reportProjectHealth.status,
  statusSummary: reportProjectHealth.statusSummary,
}
      const savedReport = await upsertReport.mutateAsync({
        id: selectedReportId || undefined,

        ...reportForm,

        report_date: isNewReport
          ? new Date().toISOString().slice(0, 10)
          : selectedReportAny?.report_date,

        block_id: reportForm.block_id || null,
        next_meeting: reportForm.next_meeting || null,
        discipline: reportForm.department,

        reporting_officer_email:
          reportForm.reporting_officer_email || user?.email || '',

        // Project health snapshot. This freezes the report at the point it was saved.
        snapshot_project_start: snapshot.startDate,
        snapshot_planned_finish: snapshot.finishDate,
        snapshot_planned_progress: snapshot.plannedProgress,
        snapshot_actual_progress: snapshot.overallProgress,
        snapshot_variance_days: snapshot.varianceDays,
        snapshot_variance_label: snapshot.varianceLabel,
        snapshot_project_health: snapshot.status,
        snapshot_status_summary: snapshot.statusSummary,

        created_by_role: selectedReportId
          ? selectedReportAny?.created_by_role || role
          : role,

        created_by: selectedReportId
          ? selectedReportAny?.created_by || user?.id || null
          : user?.id || null,

        updated_by: user?.id || null,

        workflow_status: selectedReportId
          ? selectedReportAny?.workflow_status || initialWorkflowStatus
          : initialWorkflowStatus,

        ...(isNewReport && canReview
          ? {
              approved_at: now,
              approved_by: user?.id || null,
              reviewed_at: now,
              reviewed_by: user?.id || null,
              workflow_updated_at: now,
              workflow_updated_by: user?.id || null,
              workflow_updated_by_name:
                user?.full_name || user?.email || 'PMO/Admin',
            }
          : {}),
      } as any)

      const reportId =
        selectedReportId ||
        getSavedReportId(savedReport) ||
        (await findReportIdFallback())

      if (!reportId) {
        notify('error', 'Report saved, but report ID could not be found for photo upload.')
        return
      }

      if (photos.length > 0) await uploadReportPhotos(reportId)

      await loadReportPhotos(reportId)

      setSelectedReportId(reportId)
      setShowReportModal(false)
      setPhotos([])
      setPhotoCaptions({})

      notify(
        'success',
        canReview && isNewReport
          ? 'PMO report created and approved automatically.'
          : 'Report saved successfully.'
      )
    } catch (error: any) {
      notify('error', error?.message || 'Failed to save report.')
    }
  }

  async function insertHistory(action: string, comment?: string | null) {
    if (!selectedReport?.id) return

    await supabase.from('report_review_history').insert({
      report_id: selectedReport.id,
      action,
      comment: comment || null,
      acted_by: user?.id || null,
      acted_by_name: user?.full_name || user?.email || 'User',
      acted_by_role: role || null,
    })
  }

  async function updateWorkflow(status: string, comment?: string | null) {
    if (!selectedReport?.id) return

    const now = new Date().toISOString()

    const payload: any = {
      workflow_status: status,
      workflow_comment: comment || null,
      workflow_updated_at: now,
      workflow_updated_by: user?.id || null,
      workflow_updated_by_name: user?.full_name || user?.email || 'User',
      updated_by: user?.id || null,
    }

    if (status === 'Submitted' || status === 'Resubmitted') {
      payload.submitted_at = now
      payload.submitted_by = user?.id || null
    }

    if (status === 'Approved') {
      payload.approved_at = now
      payload.approved_by = user?.id || null
      payload.reviewed_at = now
      payload.reviewed_by = user?.id || null
    }

    if (status === 'Returned') {
      payload.returned_at = now
      payload.returned_by = user?.id || null
      payload.return_comment = comment || null
    }

    if (status === 'Rejected') {
      payload.rejected_at = now
      payload.rejected_by = user?.id || null
      payload.rejected_comment = comment || null
    }

    if (status === 'Locked') {
      payload.locked_at = now
      payload.locked_by = user?.id || null
    }

    const { error } = await supabase
      .from('weekly_reports')
      .update(payload)
      .eq('id', selectedReport.id)

    if (error) {
      notify('error', error.message)
      return
    }

    await insertHistory(status, comment)
    await loadReviewHistory()

    if (status === 'Returned') setShowReturnModal(false)
    if (status === 'Rejected') setShowRejectModal(false)

    setWorkflowComment('')

    notify(
      status === 'Returned' || status === 'Rejected' ? 'info' : 'success',
      `Report ${status.toLowerCase()} successfully.`
    )
  }

  function printHtml(html: string, title: string) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { margin: 0; background: white; }
            @page { size: A4; margin: 0; }
            .page-break { page-break-after: always; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)

    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 700)
  }

  function printSelectedReport() {
    if (!reportRef.current) return
    printHtml(reportRef.current.innerHTML, 'IPD Report')
  }

  async function printAllReports() {
    await loadAllPrintData()

    setTimeout(() => {
      if (!allReportsRef.current) return
      printHtml(allReportsRef.current.innerHTML, 'All IPD Reports')
    }, 300)
  }

  return (
    <div className="pmx-command-page min-h-screen -m-4 space-y-5 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
      {notice && (
        <div
          className={`fixed top-5 right-5 z-[100] rounded-xl px-4 py-3 shadow-xl text-sm border ${
            notice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
              : notice.type === 'error'
              ? 'bg-red-500/15 border-red-400/30 text-red-200'
              : 'bg-amber-500/15 border-amber-400/30 text-amber-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold text-[#102943]">IPD Reports</div>
          <div className="text-[11px] text-[#74818d] mt-1">
            Internal Project Delivery Weekly Reporting · {projectName}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm btn" onClick={printSelectedReport}>
            <Printer size={13} />
            Print Selected
          </button>

          <button className="btn-ghost btn-sm btn" onClick={printAllReports}>
            <Printer size={13} />
            Print All IPD
          </button>

          {canExport && (
            <button className="btn-gold btn-sm btn" onClick={openNewReport}>
              <Plus size={13} />
              New IPD Report
            </button>
          )}
        </div>
      </div>

      <ExecutiveHealthReportPanel projectId={projectId} health={projectHealth.health} />
      <HealthHistoryChart projectId={projectId} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric title="IPD Reports" value={reports.length} color="text-[#df5f41]" />
        <Metric title="Open Risks" value={openRisks} color={openRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="High Risks" value={highRisks} color={highRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="Open Snags" value={openSnags} color={openSnags > 0 ? 'text-amber-400' : 'text-emerald-400'} />
        <Metric title="Pending Approvals" value={pendingApprovals} color={pendingApprovals > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#102943] font-semibold">
            <FileText size={16} className="text-[#df5f41]" />
            Report History
          </div>

          {isLoading ? (
            <div className="text-sm text-[#74818d]">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-[#74818d]">
              No IPD reports yet.
            </div>
          ) : (
            reportGroups.map(([date, dateReports]) => (
              <div key={date} className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-[#df5f41] pt-2">
                  Week Ending {fdate(date)}
                </div>

                {dateReports.map(report => {
                  const reportAny = report as any

                  const packageName =
                    reportAny.package_name ||
                    packages.find(item => item.id === reportAny.block_id)?.package_name ||
                    packages.find(item => item.id === reportAny.block_id)?.block_name ||
                    'Project Wide'

                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        selectedReport?.id === report.id
                          ? 'border-[#c49e48]/40 bg-[#ff7657]/10'
                          : 'border-white/10 bg-white hover:border-[#ffd1c5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[#102943]">
                          {reportAny.department || reportAny.discipline || 'IPD'}
                        </div>

                        <span className={`badge ${workflowBadge(reportAny.workflow_status || 'Draft')}`}>
                          {reportAny.workflow_status || 'Draft'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#df5f41] mt-1">
                        {packageName}
                      </div>

                      <div className="text-[11px] text-[#74818d] mt-1">
                        Officer: {reportAny.reporting_officer || '—'}
                      </div>

                      {selectedReport?.id === report.id && reportPhotos.length > 0 && (
                        <div className="text-[10px] text-[#74818d] mt-1 flex items-center gap-1">
                          <ImageIcon size={11} />
                          {reportPhotos.length} photo(s)
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="min-w-0 space-y-3">
          {!selectedReport ? (
            <div className="card p-8 text-center text-[#74818d]">
              Select or create an IPD report.
            </div>
          ) : (
            <>
              {workflowStatus === 'Returned' && isCreator && (
                <div className="card p-4 border border-amber-400/30 bg-amber-500/10">
                  <div className="text-sm font-semibold text-amber-300 mb-2">
                    PMO Review Comment
                  </div>

                  <div className="text-sm text-[#102943] whitespace-pre-wrap">
                    {selectedReportAny.workflow_comment ||
                      selectedReportAny.return_comment ||
                      'No comment provided.'}
                  </div>
                </div>
              )}

              <div className="card p-3 flex flex-wrap gap-2">
                {canCreatorEdit && (
                  <button
                    className="btn-ghost btn-sm btn"
                    onClick={() => openEditReport(selectedReport)}
                  >
                    Edit Report
                  </button>
                )}

                {canCreatorSubmit && workflowStatus === 'Draft' && (
                  <button
                    className="btn-gold btn-sm btn"
                    onClick={() => updateWorkflow('Submitted')}
                  >
                    <Send size={13} />
                    Submit
                  </button>
                )}

                {canCreatorSubmit && workflowStatus === 'Returned' && (
                  <button
                    className="btn-gold btn-sm btn"
                    onClick={() => updateWorkflow('Resubmitted')}
                  >
                    <Send size={13} />
                    Resubmit
                  </button>
                )}

                {canReviewerAct && (
                  <>
                    <button
                      className="btn-gold btn-sm btn"
                      onClick={() => updateWorkflow('Approved')}
                    >
                      <CheckCircle size={13} />
                      Approve
                    </button>

                    <button
                      className="btn-ghost btn-sm btn"
                      onClick={() => setShowReturnModal(true)}
                    >
                      <RotateCcw size={13} />
                      Return
                    </button>

                    <button
                      className="btn-ghost btn-sm btn"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </>
                )}

                {canReview && !isCreator && isApproved && !isLocked && (
                  <button
                    className="btn-gold btn-sm btn"
                    onClick={() => updateWorkflow('Locked')}
                  >
                    <Lock size={13} />
                    Lock Report
                  </button>
                )}

                <button className="btn-ghost btn-sm btn" onClick={printSelectedReport}>
                  <Printer size={13} />
                  Print Report
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div ref={reportRef} className="min-w-0 overflow-hidden">
                  <ReportDocument
                    report={{
                      ...selectedReport,
                      status_summary:
                        selectedReportAny.status_summary ||
                        reportSnapshot.statusSummary,
                      look_ahead_percentage:
                        selectedReportAny.look_ahead_percentage,
                      look_ahead_timeline:
                        selectedReportAny.look_ahead_timeline,
                      infrastructure_landscaping_tracking:
                        selectedReportAny.infrastructure_landscaping_tracking,
                      site_presentation_cleanliness:
                        selectedReportAny.site_presentation_cleanliness,
                      payment_issues:
                        selectedReportAny.payment_issues,
                    }}
                    projectName={projectName}
                    selectedPackage={selectedPackage}
                    activities={scheduleActivities}
                    photos={reportPhotos}
                    contractSum={contractSum}
                    openSnags={openSnags}
                    criticalSnags={criticalSnags}
                    openRisks={openRisks}
                    pendingProcurement={pendingProcurement}
                    projectHealth={reportSnapshot}
                  />
                </div>

                <WorkflowTimeline history={reviewHistory} />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={allReportsRef}>
          {reports.map((report: any) => {
            const snapshotHealth = buildSnapshotHealth(report, reportProjectHealth)

            return (
              <div key={report.id} className="page-break">
                <ReportDocument
                  report={{
                    ...report,
                    status_summary:
                      report.status_summary ||
                      snapshotHealth.statusSummary,
                    look_ahead_percentage: report.look_ahead_percentage,
                    look_ahead_timeline: report.look_ahead_timeline,
                    infrastructure_landscaping_tracking:
                      report.infrastructure_landscaping_tracking,
                    site_presentation_cleanliness:
                      report.site_presentation_cleanliness,
                    payment_issues: report.payment_issues,
                  }}
                  projectName={projectName}
                  selectedPackage={packages.find(item => item.id === report.block_id)}
                  activities={allReportActivities[report.id] || []}
                  photos={allReportPhotos[report.id] || []}
                  contractSum={contractSum}
                  openSnags={openSnags}
                  criticalSnags={criticalSnags}
                  openRisks={openRisks}
                  pendingProcurement={pendingProcurement}
                  projectHealth={snapshotHealth}
                />
              </div>
            )
          })}
        </div>
      </div>

      {showReturnModal && (
        <CommentModal
          title="Return Report"
          actionLabel="Return Report"
          value={workflowComment}
          onChange={setWorkflowComment}
          onClose={() => setShowReturnModal(false)}
          onSubmit={() => {
            if (!workflowComment.trim()) {
              notify('error', 'Return comment is required.')
              return
            }
            updateWorkflow('Returned', workflowComment)
          }}
        />
      )}

      {showRejectModal && (
        <CommentModal
          title="Reject Report"
          actionLabel="Reject Report"
          value={workflowComment}
          onChange={setWorkflowComment}
          onClose={() => setShowRejectModal(false)}
          onSubmit={() => {
            if (!workflowComment.trim()) {
              notify('error', 'Rejection comment is required.')
              return
            }
            updateWorkflow('Rejected', workflowComment)
          }}
        />
      )}

      {showReportModal && (
        <Modal
          title={selectedReportId ? 'Edit IPD Report' : 'New IPD Report'}
          onClose={() => {
            setShowReportModal(false)
            setSelectedReportId(null)
          }}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white p-3 text-xs text-[#9aa6b2]">
              Report date is generated automatically on submission date and cannot be backdated.
            </div>

            <select
              className="form-control"
              value={reportForm.department}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  department: event.target.value,
                }))
              }
            >
              <option value="">Select IPD Discipline</option>
              {IPD_DISCIPLINES.map(department => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={reportForm.block_id}
              onChange={event => onPackageChange(event.target.value)}
            >
              <option value="">Project Wide / No Package</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.package_name || pkg.block_name}
                  {pkg.contractor_name ? ` — ${pkg.contractor_name}` : ''}
                </option>
              ))}
            </select>

            <input
              className="form-control"
              placeholder="Contractor"
              value={reportForm.contractor_name}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  contractor_name: event.target.value,
                }))
              }
            />

            <input
              className="form-control"
              placeholder="Reporting Officer"
              value={reportForm.reporting_officer}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  reporting_officer: event.target.value,
                }))
              }
            />

            <input
              className="form-control"
              placeholder="Reporting Officer Email"
              value={reportForm.reporting_officer_email}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  reporting_officer_email: event.target.value,
                }))
              }
            />

            <select
              className="form-control"
              value={reportForm.status}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option>Ahead</option>
              <option>On Track</option>
              <option>Behind</option>
              <option>Stuck</option>
            </select>

            <input
              type="number"
              className="form-control"
              placeholder="Look Ahead Percentage e.g. 75"
              value={reportForm.look_ahead_percentage}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  look_ahead_percentage: Number(event.target.value || 0),
                }))
              }
            />

            {[
              ['status_summary', 'Status Summary e.g. Works are currently at 5th floor'],
              ['pending_issues', 'Pending Issues'],
              ['matters_arising', 'Matters Arising'],
              ['look_ahead', 'Look Ahead Activities'],
              ['look_ahead_timeline', 'Look Ahead Timeline e.g. 08 Jul - 15 Jul'],
              ['quality_tracking', 'Quality Tracking'],
              ['procurement_tracking', 'Procurement Tracking'],
              ['safety_tracking', 'Safety Tracking'],
              ['infrastructure_landscaping_tracking', 'Infrastructure / Landscaping Tracking'],
              ['site_presentation_cleanliness', 'Site Presentation / Cleanliness'],
              ['payment_issues', 'Payment Issues'],
            ].map(([key, label]) => (
              <textarea
                key={key}
                className="form-control"
                rows={2}
                placeholder={label}
                value={(reportForm as any)[key]}
                onChange={event =>
                  setReportForm(current => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            ))}

            <div className="rounded-xl border border-white/10 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#102943]">
                <UploadCloud size={15} className="text-[#df5f41]" />
                Upload Progress Photos
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="form-control"
                onChange={event => {
                  setPhotos(Array.from(event.target.files || []))
                  setPhotoCaptions({})
                }}
              />

              {photos.map(photo => (
                <div
                  key={photo.name}
                  className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
                >
                  <div className="text-xs text-[#102943]">{photo.name}</div>

                  <input
                    className="form-control"
                    placeholder="Photo caption"
                    value={photoCaptions[photo.name] || ''}
                    onChange={event =>
                      setPhotoCaptions(current => ({
                        ...current,
                        [photo.name]: event.target.value,
                      }))
                    }
                  />

                  <img
                    src={URL.createObjectURL(photo)}
                    alt={photo.name}
                    className="w-full max-h-48 object-cover rounded-xl border border-white/10"
                  />
                </div>
              ))}
            </div>

            <button
              className="btn-gold btn w-full justify-center"
              onClick={saveReport}
              disabled={upsertReport.isPending || uploadingPhotos}
            >
              {upsertReport.isPending || uploadingPhotos
                ? 'Saving…'
                : 'Save Report'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function WorkflowTimeline({ history }: { history: any[] }) {
  return (
    <div className="card p-4 h-fit">
      <div className="text-sm font-semibold text-[#102943] mb-4">
        Workflow History
      </div>

      {history.length === 0 ? (
        <div className="text-xs text-[#74818d]">No workflow history yet.</div>
      ) : (
        <div className="pmx-command-page min-h-screen -m-4 space-y-5 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
          {history.map(item => (
            <div key={item.id} className="border-l border-[#ffd1c5] pl-3">
              <div className="text-xs font-semibold text-[#df5f41]">
                {item.action}
              </div>

              <div className="text-[11px] text-[#74818d] mt-1">
                {item.acted_by_name || 'User'} · {fdate(item.created_at)}
              </div>

              {item.comment && (
                <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/10 p-2 text-xs text-[#536170] whitespace-pre-wrap">
                  {item.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({
  title,
  value,
  color,
}: {
  title: string
  value: number
  color: string
}) {
  return (
    <div className="card p-3">
      <div className={`font-display text-3xl font-bold ${color}`}>
        {value}
      </div>

      <div className="text-[9px] text-[#74818d] uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  )
}

function CommentModal({
  title,
  actionLabel,
  value,
  onChange,
  onClose,
  onSubmit,
}: {
  title: string
  actionLabel: string
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <textarea
          className="form-control"
          rows={6}
          placeholder="Enter review comment..."
          value={value}
          onChange={event => onChange(event.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>

          <button className="btn btn-gold" onClick={onSubmit}>
            {actionLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#102943]">{title}</h2>

          <button
            onClick={onClose}
            className="text-[#74818d] hover:text-[#102943]"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

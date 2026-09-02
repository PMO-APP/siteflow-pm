import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Printer,
  Plus,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Send,
  Eye,
  History,
  Download,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import { useAccessSession } from '@/access/AccessSessionProvider'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import ReportDocument from '@/components/reports/ReportDocument'
import {
  useWeeklyReports,
  useUpsertWeeklyReport,
  useRisks,
  useSnags,
  useProcurement,
  useFinancial,
} from '@/hooks/useData'
import { fdate } from '@/lib/utils'
import type { WeeklyReport } from '@/types'
import { useProjectHealth } from '@/hooks/useProjectHealth'
import { ExecutiveHealthReportPanel, HealthHistoryChart } from '@/components/health'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { projectedTaskDiscipline } from '@/features/schedule/disciplineProjection'

const IPD_DISCIPLINES = ['Housebuild', 'Mechanical', 'Electrical', 'Infrastructure']
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
  // Weekly delivery reporting covers Monday through Friday.
  end.setDate(start.getDate() + 4)
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
  const navigate = useNavigate()
  const { projectId, projectName } = useProjectStore()
  const { discipline: routeDiscipline } = useParams<{ discipline: string }>()
  const role = useMembershipStore(state => state.role)
  const {session,can}=useAccessSession()
  const { user } = useAuthStore()
  const { activeWorkspace } = useWorkspace()

  const canExport = can('reports.export',{scopeType:'project',scopeId:projectId})

  const reportRef = useRef<HTMLDivElement>(null)
  const allReportsRef = useRef<HTMLDivElement>(null)
  const downloadReportRef = useRef<HTMLDivElement>(null)

  const { data: allReports = [], isLoading, refetch: refetchReports } = useWeeklyReports()
  const isCombinedIPD = routeDiscipline === 'combined'
  const disciplineLabel = isCombinedIPD
    ? 'Combined IPD Report'
    : routeDiscipline
      ? routeDiscipline.charAt(0).toUpperCase() + routeDiscipline.slice(1)
      : ''
  const reports = useMemo(
    () => allReports.filter((report: any) => {
      if (!routeDiscipline || isCombinedIPD) return true
      const department = String(report.department || report.discipline || '').toLowerCase()
      if (routeDiscipline === 'mechanical' || routeDiscipline === 'electrical') {
        return department === routeDiscipline || department === 'mep'
      }
      return department === routeDiscipline
    }),
    [allReports, isCombinedIPD, routeDiscipline]
  )
  const reportDiscipline =
    routeDiscipline === 'mechanical' || routeDiscipline === 'electrical'
      ? 'mep'
      : routeDiscipline || null
  const canWriteDiscipline = !isCombinedIPD && Boolean(projectId && reportDiscipline) && (
    can('reports.edit', { scopeType: 'project', scopeId: projectId, discipline: reportDiscipline }) ||
    (routeDiscipline ? can('reports.edit', { scopeType: 'project', scopeId: projectId, discipline: routeDiscipline }) : false)
  )
  const { data: risks = [] } = useRisks()
  const { data: snags = [] } = useSnags()
  const { data: procurement = [] } = useProcurement()
  const { data: financial = [] } = useFinancial()

  const upsertReport = useUpsertWeeklyReport()
  const projectHealth = useProjectHealth(projectId)

  const [packages, setPackages] = useState<any[]>([])
  const [projectImageUrl, setProjectImageUrl] = useState<string | null>(null)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [downloadReportId, setDownloadReportId] = useState<string | null>(null)
  const [isDownloadingHistory, setIsDownloadingHistory] = useState(false)
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)
  const [lastProgressUpdateAt, setLastProgressUpdateAt] = useState<string | null>(null)

  const [photos, setPhotos] = useState<File[]>([])
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({})
  const [reportPhotos, setReportPhotos] = useState<any[]>([])
  const [allReportPhotos, setAllReportPhotos] = useState<Record<string, any[]>>({})
  const [allReportActivities, setAllReportActivities] = useState<Record<string, any[]>>({})
  const [scheduleActivities, setScheduleActivities] = useState<any[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const combinedQueueReports = useMemo(
    () => reports.filter((report: any) => Boolean(report.submitted_to_combined_at) && !report.sent_to_pmo_at),
    [reports]
  )

  const disciplineActiveReports = useMemo(
    () => reports.filter((report: any) => String(report.workflow_status || 'Draft') === 'Draft'),
    [reports]
  )

  const visibleReports = isCombinedIPD ? combinedQueueReports : disciplineActiveReports

  const selectedReport =
    visibleReports.find(report => report.id === selectedReportId) || visibleReports[0]

  const selectedReportAny = selectedReport as any
  const workflowStatus = selectedReportAny?.workflow_status || 'Draft'

  const currentEmail = user?.email?.toLowerCase().trim() || ''

  const isCreator =
    Boolean(user?.id) &&
    (
      selectedReportAny?.created_by === user?.id ||
      selectedReportAny?.reporting_officer_email?.toLowerCase().trim() === currentEmail
    )

  const isPrivilegedEditor = ['workspace_admin', 'admin'].includes(role || '')

  const canCreatorEdit =
    Boolean(selectedReport) &&
    (isCreator || isPrivilegedEditor) &&
    !Boolean(selectedReportAny?.sent_to_pmo_at) &&
    String(workflowStatus || 'Draft') === 'Draft'

  const canCreatorSubmit = canCreatorEdit

  const emptyForm = {
    department: disciplineLabel || (session.discipline ? session.discipline.charAt(0).toUpperCase()+session.discipline.slice(1) : ''),
    block_id: '',
    delivery_package_id: '',
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
    async function loadLatestProgressUpdate() {
      if (!projectId) { setLastProgressUpdateAt(null); return }
      const { data } = await supabase
        .from('task_progress_logs')
        .select('created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setLastProgressUpdateAt(data?.created_at || null)
    }
    void loadLatestProgressUpdate()
  }, [projectId, allReports.length])

  useEffect(() => {
    async function loadProjectImage() {
      if (!projectId) { setProjectImageUrl(null); return }
      const { data, error } = await supabase
        .from('projects')
        .select('project_image_url')
        .eq('id', projectId)
        .maybeSingle()
      if (error) { console.error(error.message); setProjectImageUrl(null); return }
      setProjectImageUrl(data?.project_image_url || null)
    }
    void loadProjectImage()
  }, [projectId])

  useEffect(() => {
    loadReportPhotos(selectedReport?.id)
    loadScheduleActivities()
  }, [selectedReport?.id])

  const selectedPackage = packages.find(
    item => item.id === (selectedReportAny?.delivery_package_id || selectedReportAny?.block_id)
  )

  const reportProjectHealth = {
    ...projectHealth,
    startDate: projectHealth?.projectStartIso || null,
    finishDate: projectHealth?.plannedFinishIso || null,
    forecastFinish: projectHealth?.forecastFinishIso || null,
    status: projectHealth?.projectHealth || 'On Track',
  }

  const automaticVarianceDays = Number(reportProjectHealth.varianceDays || 0)
  const automaticDaysBehind = automaticVarianceDays < 0 ? Math.abs(automaticVarianceDays) : 0
  const daysSinceProgressUpdate = lastProgressUpdateAt
    ? Math.floor((Date.now() - new Date(lastProgressUpdateAt).getTime()) / 86400000)
    : null
  const projectHasStarted = Boolean(reportProjectHealth.startDate && new Date(reportProjectHealth.startDate).getTime() <= Date.now())
  const projectIncomplete = Number(reportProjectHealth.overallProgress || 0) < 100
  const isOperationallyStuck = projectIncomplete && projectHasStarted && daysSinceProgressUpdate !== null && daysSinceProgressUpdate >= 30
  const automaticReportStatus = isOperationallyStuck
    ? 'Stuck'
    : automaticVarianceDays < 0
      ? 'Behind'
      : automaticVarianceDays > 0
        ? 'Ahead'
        : 'On Track'

  const reportSnapshot = buildSnapshotHealth(selectedReportAny, reportProjectHealth)

  const historyReports = useMemo(
    () => isCombinedIPD
      ? reports.filter((report: any) => Boolean(report.sent_to_pmo_at))
      : reports.filter((report: any) => !disciplineActiveReports.some((active: any) => active.id === report.id)),
    [disciplineActiveReports, isCombinedIPD, reports]
  )

  const reportGroups = useMemo(() => {
    const map: Record<string, any[]> = {}

    historyReports.forEach(report => {
      const key = report.report_date || 'No date'
      if (!map[key]) map[key] = []
      map[key].push(report)
    })

    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [historyReports])

  const currentReport = visibleReports[0] || null
  const downloadReport = reports.find((report: any) => report.id === downloadReportId) as any
  const previewReport = reports.find((report: any) => report.id === previewReportId) as any

  function findReportPackage(report: any) {
    if (!report) return undefined
    return packages.find(item =>
      (report.delivery_package_id && String(item.scope_source) === 'delivery_package' && String(item.scope_id) === String(report.delivery_package_id)) ||
      (report.block_id && String(item.scope_source) === 'project_block' && String(item.scope_id) === String(report.block_id)) ||
      String(item.id) === String(report.delivery_package_id || report.block_id || '')
    )
  }

  async function downloadHistoricalReport(report: any) {
    if (!report?.id || isDownloadingHistory) return
    setIsDownloadingHistory(true)
    try {
      await loadAllPrintData()
      setDownloadReportId(report.id)
      await new Promise(resolve => setTimeout(resolve, 450))

      const node = downloadReportRef.current
      if (!node) throw new Error('The report could not be prepared for download.')

      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const safeProject = String(projectName || 'Project').replace(/[^a-z0-9_-]+/gi, '-')
      const safeDiscipline = String(disciplineLabel || 'IPD').replace(/[^a-z0-9_-]+/gi, '-')
      const safeDate = String(report.report_date || 'report').replace(/[^0-9-]+/g, '')
      pdf.save(`${safeProject}-${safeDiscipline}-${safeDate}.pdf`)
    } catch (error: any) {
      notify('error', error?.message || 'Could not download the report.')
    } finally {
      setDownloadReportId(null)
      setIsDownloadingHistory(false)
    }
  }

  const openRisks = risks.filter(risk => risk.status === 'Open').length

  const highRisks = risks.filter(
    risk => risk.status === 'Open' && Number(risk.risk_score || 0) >= 12
  ).length

  const openSnags = snags.filter(snag => snag.status !== 'Closed').length

  const criticalSnags = snags.filter(
    snag => snag.severity === 'Critical' && snag.status !== 'Closed'
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
    if (!projectId) { setPackages([]); return }

    const [deliveryResult, projectBlockResult] = await Promise.all([
      supabase.from('delivery_packages').select('*').eq('project_id', projectId).is('archived_at', null).order('name', { ascending: true }),
      supabase.from('project_blocks').select('*').eq('project_id', projectId).eq('is_active', true).order('sort_order', { ascending: true }),
    ])

    const delivery = (deliveryResult.data || []).map((pkg: any) => ({ ...pkg, scope_source: 'delivery_package', scope_id: pkg.id }))
    const blocks = (projectBlockResult.data || []).map((pkg: any) => ({
      ...pkg,
      id: `block:${pkg.id}`,
      scope_source: 'project_block',
      scope_id: pkg.id,
      name: pkg.package_name || pkg.block_name,
    }))

    const allowed = (pkg: any) => {
      if (reportDiscipline === 'infrastructure') return String(pkg.discipline || '').toLowerCase() === 'infrastructure' || pkg.scope_source === 'project_block'
      if (reportDiscipline === 'mep') return ['mep', 'mechanical', 'electrical', 'general', 'housebuild', ''].includes(String(pkg.discipline || '').toLowerCase())
      return pkg.scope_source === 'project_block' || ['housebuild', 'general', ''].includes(String(pkg.discipline || '').toLowerCase())
    }

    const seen = new Set<string>()
    const merged = [...delivery, ...blocks].filter(allowed).filter((pkg: any) => {
      const key = String(pkg.name || pkg.package_name || pkg.block_name || '').trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    setPackages(merged)
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


  function plannedPercentAt(task: any, dateIso: string) {
    const start = task?.start_date ? new Date(task.start_date) : null
    const finish = task?.finish_date ? new Date(task.finish_date) : null
    const point = new Date(dateIso)
    if (!start || !finish || Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return 0
    if (point < start) return 0
    if (point >= finish) return 100
    const span = Math.max(1, finish.getTime() - start.getTime())
    return Math.max(0, Math.min(100, Math.round(((point.getTime() - start.getTime()) / span) * 100)))
  }

  function mapActivity(item: any, plannedAt?: string) {
    const previous = Number(item.previous_progress || 0)
    const current = Number(item.new_progress || 0)

    const taskPackageId = item.delivery_package_id || item.tasks?.delivery_package_id || item.block_id || item.tasks?.block_id || null
    const taskPackage = packages.find(pkg => String(pkg.id) === String(taskPackageId || ''))
    const baseActivity =
      item.tasks?.task_name ||
      item.tasks?.name ||
      item.tasks?.activity ||
      item.tasks?.title ||
      `Task ${item.task_id || ''}`

    return {
      id: item.id,
      taskId: item.task_id,
      activity: taskPackage?.name ? `${taskPackage.name} · ${baseActivity}` : baseActivity,
      last_week: previous,
      this_week: current,
      planned: plannedAt ? plannedPercentAt(item.tasks, plannedAt) : Number(item.tasks?.planned_progress || 0),
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
        // The first progress log of the week establishes the opening value.
        map.set(key, item)
        return
      }

      const existing = map.get(key)

      // Subsequent updates only move the closing value forward. This means an
      // activity updated several times during the week appears once in the report.
      map.set(key, {
        ...existing,
        this_week: item.this_week,
        planned: item.planned,
        remarks: item.remarks || existing.remarks,
      })
    })

    return Array.from(map.values())
  }

  function activityBelongsToReport(item: any) {
    if (!routeDiscipline || isCombinedIPD) return true
    const requested = String(routeDiscipline).trim().toLowerCase()
    const projected = projectedTaskDiscipline(item.tasks || {})
    if (requested === 'housebuild') return String(item.tasks?.discipline || 'Housebuild').toLowerCase() === 'housebuild'
    if (requested === 'mechanical') return projected === 'Mechanical'
    if (requested === 'electrical') return projected === 'Electrical'
    if (requested === 'mep') return ['Mechanical', 'Electrical', 'MEP'].includes(projected)
    if (requested === 'infrastructure') return projected === 'Infrastructure'
    return true
  }

  async function calculateLiveWeekActivities(report: any) {
    if (!projectId || !report) return []

    const { start, end } = getWeekRange(report.report_date)

    let query = supabase
      .from('task_progress_logs')
      .select('*, tasks(*)')
      .eq('project_id', projectId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    const { data, error } = await query
    if (error) throw error

    return dedupeActivities(
      (data || [])
        .filter(activityBelongsToReport)
        .filter((item: any) => {
          const deliveryPackageId = report.delivery_package_id || null
          const blockId = report.block_id || null
          if (!deliveryPackageId && !blockId) return true
          const taskPackageId = item.delivery_package_id || item.tasks?.delivery_package_id || null
          const taskBlockId = item.block_id || item.tasks?.block_id || null
          if (deliveryPackageId) return String(taskPackageId || '') === String(deliveryPackageId)
          if (String(taskBlockId || '') === String(blockId)) return true
          const block = packages.find(pkg => pkg.scope_source === 'project_block' && String(pkg.scope_id) === String(blockId))
          const blockName = String(block?.name || block?.package_name || block?.block_name || '').trim().toLowerCase()
          const taskText = String([item.tasks?.name, item.tasks?.phase, item.tasks?.category].filter(Boolean).join(' ')).toLowerCase()
          return Boolean(blockName && taskText.includes(blockName))
        })
        .map((item: any) => mapActivity(item, end))
    )
  }

  async function loadFrozenActivities(reportId: string) {
    const { data, error } = await supabase
      .from('weekly_activities')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []).map((item: any) => ({
      id: item.id,
      taskId: item.task_id || null,
      activity: item.activity,
      last_week: Number(item.last_week || 0),
      this_week: Number(item.this_week || 0),
      planned: Number(item.planned || 0),
      remarks: item.remarks || '',
    }))
  }

  async function snapshotWeekActivities(report: any) {
    if (!report?.id) return []

    const activities = await calculateLiveWeekActivities(report)

    const { error: deleteError } = await supabase
      .from('weekly_activities')
      .delete()
      .eq('report_id', report.id)

    if (deleteError) throw deleteError

    if (activities.length > 0) {
      const { error: insertError } = await supabase
        .from('weekly_activities')
        .insert(
          activities.map((item: any) => ({
            report_id: report.id,
            task_id: item.taskId || null,
            delivery_package_id: report.delivery_package_id || report.block_id || null,
            activity: item.activity,
            last_week: item.last_week,
            this_week: item.this_week,
            planned: item.planned,
            remarks: item.remarks || null,
          }))
        )

      if (insertError) throw insertError
    }

    return activities
  }

  async function loadScheduleActivities() {
    if (!selectedReport?.id || !projectId) {
      setScheduleActivities([])
      return
    }

    try {
      const status = String((selectedReport as any).workflow_status || 'Draft')
      const frozenStatuses = ['Submitted', 'Resubmitted', 'Approved', 'Locked', 'Rejected']

      if (frozenStatuses.includes(status)) {
        const frozen = await loadFrozenActivities(selectedReport.id)
        const hasSnapshot = Boolean((selectedReport as any).activity_snapshot_at)
        // A zero-row snapshot is meaningful: it means "No activity recorded this week".
        // Only legacy reports without a snapshot marker may fall back to live logs.
        setScheduleActivities(
          hasSnapshot || frozen.length > 0
            ? frozen
            : await calculateLiveWeekActivities(selectedReport)
        )
        return
      }

      // Draft/Returned reports always reflect Project Controls updates made in
      // the current reporting week. Nobody types progress values in the report.
      setScheduleActivities(await calculateLiveWeekActivities(selectedReport))
    } catch (error: any) {
      console.error(error?.message || error)
      setScheduleActivities([])
    }
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
      const status = String(report.workflow_status || 'Draft')
      const frozenStatuses = ['Submitted', 'Resubmitted', 'Approved', 'Locked', 'Rejected']

      if (frozenStatuses.includes(status)) {
        const frozen = await loadFrozenActivities(report.id)
        activityMap[report.id] = report.activity_snapshot_at || frozen.length > 0
          ? frozen
          : await calculateLiveWeekActivities(report)
      } else {
        activityMap[report.id] = await calculateLiveWeekActivities(report)
      }
    }

    setAllReportPhotos(photoMap)
    setAllReportActivities(activityMap)
  }

  function openNewReport() {
    if (!(canWriteDiscipline || isPrivilegedEditor)) {
      notify('info', `You can view ${disciplineLabel || 'this'} reports, but only the assigned project owner or an active delegate can write here.`)
      return
    }
    setReportForm({
      ...emptyForm,
      department: disciplineLabel || (session.discipline ? session.discipline.charAt(0).toUpperCase()+session.discipline.slice(1) : ''),
      reporting_officer: user?.full_name || '',
      reporting_officer_email: user?.email || '',
      contractor_name: Array.from(new Set(packages.map(item => item.contractor_name).filter(Boolean))).join(', '),
      package_name: 'Project Wide',
    })
    setPhotoCaptions({})
    setPhotos([])
    setSelectedReportId(null)
    setShowReportModal(true)
  }

  function openEditReport(report: WeeklyReport) {
    const reportAny = report as any
    const email = user?.email?.toLowerCase().trim() || ''
    const ownsReport = reportAny.created_by === user?.id || reportAny.reporting_officer_email?.toLowerCase().trim() === email
    const editableStatus = String(reportAny.workflow_status || 'Draft') === 'Draft' && !reportAny.sent_to_pmo_at
    if (!(isPrivilegedEditor || ownsReport) || !editableStatus) {
      notify('info', 'This report is view only. Only its creator, Workspace Admin or Admin can edit it before the combined report is sent to PMO.')
      return
    }

    setReportForm({
      department: reportAny.department || reportAny.discipline || '',
      block_id: reportAny.block_id || '',
      delivery_package_id: reportAny.delivery_package_id || '',
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

  function onPackageChange(scopeValue: string) {
    const pkg = packages.find(item => String(item.id) === String(scopeValue))
    if (!pkg) {
      const relevantContractors = Array.from(new Set(packages.map(item => item.contractor_name).filter(Boolean)))
      setReportForm(current => ({
        ...current,
        block_id: '',
        delivery_package_id: '',
        package_name: 'Project Wide',
        contractor_name: relevantContractors.join(', '),
      }))
      return
    }

    setReportForm(current => ({
      ...current,
      block_id: pkg.scope_source === 'project_block' ? String(pkg.scope_id) : '',
      delivery_package_id: pkg.scope_source === 'delivery_package' ? String(pkg.scope_id) : '',
      package_name: pkg.name || pkg.package_name || pkg.block_name || '',
      contractor_name: pkg.contractor_name || '',
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

    const existingCount = selectedReportId ? reportPhotos.length : 0
    if (existingCount + photos.length > 10) {
      notify('error', `A report can contain up to 10 progress photos. You can add ${Math.max(0, 10 - existingCount)} more.`)
      return
    }

    setUploadingPhotos(true)
    try {
      const stamp = Date.now()
      await Promise.all(photos.map(async (photo, index) => {
        const safeName = photo.name.replace(/\s+/g, '-').toLowerCase()
        const filePath = `${reportId}/${stamp}-${index}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(filePath, photo, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(filePath)
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
        if (photoInsertError) throw photoInsertError
      }))
      setPhotos([])
    } finally {
      setUploadingPhotos(false)
    }
  }

  async function saveReport() {
    const existing = Boolean(selectedReportId)
    const mayCreate = canWriteDiscipline || isPrivilegedEditor
    const mayEditExisting = canCreatorEdit
    if ((existing && !mayEditExisting) || (!existing && !mayCreate)) {
      notify('error', existing
        ? 'This report is read-only. Only the report creator, Workspace Admin or Admin can edit it before submission.'
        : `You can view ${disciplineLabel || 'this'} reports, but you are not authorised to create one for this discipline.`)
      return
    }
    try {
      const now = new Date().toISOString()
      const isNewReport = !selectedReportId
      const initialWorkflowStatus = 'Draft'

      const snapshot = {
  startDate: reportProjectHealth.startDate,
  finishDate: reportProjectHealth.finishDate,
  plannedProgress: reportProjectHealth.plannedProgress,
  overallProgress: reportProjectHealth.overallProgress,
  varianceDays: reportProjectHealth.varianceDays,
  varianceLabel: reportProjectHealth.varianceLabel,
  status: automaticReportStatus,
  statusSummary: reportProjectHealth.statusSummary,
}
      const savedReport = await upsertReport.mutateAsync({
        id: selectedReportId || undefined,

        ...reportForm,

        report_date: isNewReport
          ? new Date().toISOString().slice(0, 10)
          : selectedReportAny?.report_date,

        block_id: reportForm.block_id || null,
        delivery_package_id: reportForm.delivery_package_id || null,
        status: automaticReportStatus,
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
      await refetchReports()

      setSelectedReportId(reportId)
      setShowReportModal(true)
      setPhotos([])
      setPhotoCaptions({})

      notify(
        'success',
        'Report saved. You can keep editing it until you send it to the Combined IPD Report.'
      )
    } catch (error: any) {
      notify('error', error?.message || 'Failed to save report.')
    }
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
      // Freeze the Project Controls activity calculation at submission time.
      // Future progress updates must never rewrite this reporting week's history.
      try {
        const frozen = await snapshotWeekActivities(selectedReport)
        setScheduleActivities(frozen)
      } catch (snapshotError: any) {
        notify('error', snapshotError?.message || 'Could not freeze this week’s Project Controls activity.')
        return
      }

      payload.activity_snapshot_at = now
      payload.submitted_at = now
      payload.submitted_by = user?.id || null
      payload.submitted_to_combined_at = now
      payload.sent_to_pmo_at = null
      payload.sent_to_pmo_by = null
    }


    const { error } = await supabase
      .from('weekly_reports')
      .update(payload)
      .eq('id', selectedReport.id)

    if (error) {
      notify('error', error.message)
      return
    }



    await refetchReports()
    if (status === 'Submitted' || status === 'Resubmitted') setSelectedReportId(null)

    notify('success', 'Report sent to the Combined IPD Report queue.')
  }

  async function sendCombinedToPmo() {
    if (!isCombinedIPD || combinedQueueReports.length === 0) return

    const now = new Date().toISOString()
    const ids = combinedQueueReports.map((report: any) => report.id)
    const sortedReportDates = combinedQueueReports
      .map((report: any) => String(report.report_date || ''))
      .filter(Boolean)
      .sort()
    const latestReportDate = sortedReportDates.length ? sortedReportDates[sortedReportDates.length - 1] : ''

    const { error } = await supabase
      .from('weekly_reports')
      .update({
        sent_to_pmo_at: now,
        sent_to_pmo_by: user?.id || null,
      })
      .in('id', ids)

    if (error) {
      notify('error', error.message)
      return
    }

    await refetchReports()
    notify('success', 'Combined IPD report sent to PMO / Executive Reporting.')
    navigate(`/app/pmo-weekly-report?source=ipd${latestReportDate ? `&week=${encodeURIComponent(latestReportDate)}` : ''}`)
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
    printHtml(reportRef.current.innerHTML, isCombinedIPD ? 'Combined IPD Report' : `${disciplineLabel} Report`)
  }

  async function printAllReports() {
    await loadAllPrintData()

    setTimeout(() => {
      if (!allReportsRef.current) return
      printHtml(allReportsRef.current.innerHTML, isCombinedIPD ? 'Combined IPD Report' : `${disciplineLabel} Reports`)
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
          <div className="text-xl font-semibold text-[#102943]">{disciplineLabel || 'Project Report'}</div>
          <div className="text-[11px] text-[#74818d] mt-1">
            Weekly Project Report · {projectName}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm btn" onClick={() => setShowHistory(true)}>
            <History size={13} />
            History
            {historyReports.length > 0 && <span className="ml-1 rounded-full bg-[#e8f6f4] px-1.5 py-0.5 text-[10px] font-semibold text-[#05969b]">{historyReports.length}</span>}
          </button>

          {isCombinedIPD && (
            <>
              <button className="btn-ghost btn-sm btn" onClick={printAllReports} disabled={combinedQueueReports.length === 0}>
                <Printer size={13} />
                Print Combined IPD
              </button>
              <button className="btn-gold btn-sm btn" onClick={sendCombinedToPmo} disabled={combinedQueueReports.length === 0}>
                <Send size={13} />
                Send to PMO / Executive
              </button>
            </>
          )}

          {!isCombinedIPD && (
            <button className="btn-gold btn-sm btn" onClick={() => {
              if (canWriteDiscipline || isPrivilegedEditor) openNewReport()
              else notify('info', `You can view ${disciplineLabel} reports, but only the assigned discipline team or an administrator can create one.`)
            }}>
              <Plus size={13} />
              Create {disciplineLabel} Report
            </button>
          )}
        </div>
      </div>

      <ExecutiveHealthReportPanel projectId={projectId} health={projectHealth.health} />
      <HealthHistoryChart projectId={projectId} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric title={isCombinedIPD ? "Department Reports" : `${disciplineLabel} Reports`} value={isCombinedIPD ? combinedQueueReports.length : reports.length} color="text-[#df5f41]" />
        <Metric title="Open Risks" value={openRisks} color={openRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="High Risks" value={highRisks} color={highRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="Open Snags" value={openSnags} color={openSnags > 0 ? 'text-amber-400' : 'text-emerald-400'} />
        <Metric title="Pending Procurement" value={pendingProcurement} color={pendingProcurement > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>

      {isCombinedIPD && (
        <div className="card p-4 border border-[#cfe8e4] bg-[#f3fbfa] text-sm text-[#365665]">
          <span className="font-semibold text-[#102943]">Combined IPD queue:</span>{' '}
          submitted Housebuild, Mechanical, Electrical and Infrastructure reports remain here until the combined set is sent to PMO / Executive Reporting. Printing does not clear the queue; only Send does.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 items-start">
        <div className="min-w-0 space-y-3">
          {!selectedReport ? (
            <div className="card p-8 text-center text-[#74818d]">
              No active report on this page. Once a report is submitted, it moves to the Combined IPD Report queue. Previous submissions remain available in History.
            </div>
          ) : (
            <>
              <div className="card p-3 flex flex-wrap gap-2">
                {canCreatorEdit && (
                  <button className="btn-ghost btn-sm btn" onClick={() => openEditReport(selectedReport)}>
                    Edit Report
                  </button>
                )}
                {canCreatorSubmit && (
                  <button className="btn-gold btn-sm btn" onClick={() => updateWorkflow('Submitted')}>
                    <Send size={13} />
                    Send to Combined IPD
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
                    projectImageUrl={projectImageUrl}
                    branding={activeWorkspace?.branding}
                    organizationName={activeWorkspace?.name}
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

              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={allReportsRef}>
          {visibleReports.map((report: any) => {
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
                  projectImageUrl={projectImageUrl}
                  branding={activeWorkspace?.branding}
                  organizationName={activeWorkspace?.name}
                  selectedPackage={findReportPackage(report)}
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

      {showHistory && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#102943]/45 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowHistory(false) }}>
          <div className="w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="h-1.5 bg-[#08b5a6]" />
            <div className="flex items-start justify-between border-b border-[#e5e8eb] p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#05969b]">Report archive</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#102943]">{disciplineLabel} History</h2>
                <p className="mt-1 text-sm text-[#6f7d89]">Previous reports are kept here so the live reporting page stays focused on the current week.</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="rounded-lg p-2 text-[#6f7d89] hover:bg-[#f2f5f7]"><X size={18} /></button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-6">
              {historyReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d9e1e7] p-10 text-center text-sm text-[#74818d]">No previous reports yet.</div>
              ) : (
                <div className="space-y-3">
                  {historyReports.map((report: any) => {
                    const packageName = report.package_name || packages.find(item => item.id === (report.delivery_package_id || report.block_id))?.name || packages.find(item => item.id === (report.delivery_package_id || report.block_id))?.package_name || packages.find(item => item.id === (report.delivery_package_id || report.block_id))?.block_name || 'Project Wide'
                    return (
                      <div key={report.id} className="flex flex-col gap-3 rounded-2xl border border-[#e2e8ec] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-[#102943]">Week Ending {fdate(report.report_date)}</div>
                            <span className={`badge ${workflowBadge(report.workflow_status || 'Draft')}`}>{report.workflow_status || 'Draft'}</span>
                          </div>
                          <div className="mt-1 text-xs text-[#6f7d89]">{packageName} · Officer: {report.reporting_officer || '—'}</div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            className="btn-ghost btn-sm btn"
                            onClick={async () => { await loadAllPrintData(); setPreviewReportId(report.id) }}
                          >
                            <Eye size={13} /> Preview
                          </button>
                          <button
                            className="btn-ghost btn-sm btn"
                            disabled={isDownloadingHistory}
                            onClick={() => downloadHistoricalReport(report)}
                          >
                            <Download size={13} />
                            {isDownloadingHistory && downloadReportId === report.id ? 'Preparing…' : 'Download PDF'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewReport && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#102943]/55 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewReportId(null) }}>
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[#f6f5f1] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dfe3e7] bg-white px-5 py-4">
              <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#05969b]">Report preview</div><div className="mt-1 font-semibold text-[#102943]">{disciplineLabel} · Week Ending {fdate(previewReport.report_date)}</div></div>
              <div className="flex gap-2"><button className="btn-ghost btn-sm btn" onClick={() => downloadHistoricalReport(previewReport)}><Download size={13}/> Download PDF</button><button onClick={() => setPreviewReportId(null)} className="rounded-lg p-2 text-[#6f7d89] hover:bg-[#f2f5f7]"><X size={18}/></button></div>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              <ReportDocument
                report={{ ...previewReport, status_summary: previewReport.status_summary || buildSnapshotHealth(previewReport, reportProjectHealth).statusSummary }}
                projectName={projectName}
                projectImageUrl={projectImageUrl}
                branding={activeWorkspace?.branding}
                organizationName={activeWorkspace?.name}
                selectedPackage={findReportPackage(previewReport)}
                activities={allReportActivities[previewReport.id] || []}
                photos={allReportPhotos[previewReport.id] || []}
                contractSum={contractSum}
                openSnags={openSnags}
                criticalSnags={criticalSnags}
                openRisks={openRisks}
                pendingProcurement={pendingProcurement}
                projectHealth={buildSnapshotHealth(previewReport, reportProjectHealth)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="fixed left-[-10000px] top-0 w-[794px] bg-white" aria-hidden="true">
        <div ref={downloadReportRef}>
          {downloadReport && (
            <ReportDocument
              report={{
                ...downloadReport,
                status_summary: downloadReport.status_summary || buildSnapshotHealth(downloadReport, reportProjectHealth).statusSummary,
              }}
              projectName={projectName}
              projectImageUrl={projectImageUrl}
              branding={activeWorkspace?.branding}
              organizationName={activeWorkspace?.name}
              selectedPackage={findReportPackage(downloadReport)}
              activities={allReportActivities[downloadReport.id] || []}
              photos={allReportPhotos[downloadReport.id] || []}
              contractSum={contractSum}
              openSnags={openSnags}
              criticalSnags={criticalSnags}
              openRisks={openRisks}
              pendingProcurement={pendingProcurement}
              projectHealth={buildSnapshotHealth(downloadReport, reportProjectHealth)}
            />
          )}
        </div>
      </div>


      {showReportModal && (
        <Modal
          title={selectedReportId ? `Edit ${disciplineLabel} Report` : `Create ${disciplineLabel} Report`}
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
              value={reportForm.block_id ? `block:${reportForm.block_id}` : reportForm.delivery_package_id}
              onChange={event => onPackageChange(event.target.value)}
            >
              <option value="">Project Wide / All Packages</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name || pkg.package_name || pkg.block_name}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#dfe3e7] bg-[#f7f9fa] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#74818d]">Delivery status · automatic</div>
                <div className="mt-1 text-sm font-semibold text-[#102943]">{automaticReportStatus}</div>
              </div>
              <div className="rounded-xl border border-[#dfe3e7] bg-[#f7f9fa] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#74818d]">Days behind · automatic</div>
                <div className="mt-1 text-sm font-semibold text-[#102943]">{automaticDaysBehind > 0 ? `${automaticDaysBehind} day${automaticDaysBehind === 1 ? '' : 's'}` : '0 days'}</div>
              </div>
            </div>


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
              <div className="text-xs text-[#74818d]">Select and upload up to 10 photos at once. {selectedReportId ? `${reportPhotos.length}/10 already saved.` : '0/10 saved.'}</div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="form-control"
                onChange={event => {
                  const selected = Array.from(event.target.files || [])
                  const remaining = Math.max(0, 10 - (selectedReportId ? reportPhotos.length : 0))
                  if (selected.length > remaining) {
                    notify('info', `You can select up to ${remaining} more photo${remaining === 1 ? '' : 's'} for this report.`)
                    setPhotos(selected.slice(0, remaining))
                  } else {
                    setPhotos(selected)
                  }
                  setPhotoCaptions({})
                  event.target.value = ''
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="btn-ghost btn flex-1 justify-center"
                onClick={saveReport}
                disabled={upsertReport.isPending || uploadingPhotos}
              >
                {upsertReport.isPending || uploadingPhotos ? 'Saving…' : selectedReportId ? 'Save Changes' : 'Save Draft'}
              </button>
              {selectedReportId && canCreatorSubmit && (
                <button
                  className="btn-gold btn flex-1 justify-center"
                  onClick={async () => { setShowReportModal(false); await updateWorkflow('Submitted') }}
                  disabled={upsertReport.isPending || uploadingPhotos}
                >
                  <Send size={14} /> Send to Combined IPD
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Metric({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="card p-3">
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-[#74818d] uppercase tracking-widest mt-1">{title}</div>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#102943]">{title}</h2>
          <button onClick={onClose} className="text-[#74818d] hover:text-[#102943]">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

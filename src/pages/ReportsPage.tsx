import { useEffect, useMemo, useState } from 'react'
import {
  Printer,
  Plus,
  FileText,
  CalendarDays,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle,
  Lock,
  RotateCcw,
  Send,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import { canExportReports } from '@/lib/permissions'
import {
  useWeeklyReports,
  useUpsertWeeklyReport,
  useWeeklyActivities,
  useUpsertWeeklyActivity,
  useRisks,
  useSnags,
  useApprovals,
  useProcurement,
  useFinancial,
} from '@/hooks/useData'
import { fdate, formatCurrency } from '@/lib/utils'
import type { WeeklyReport } from '@/types'

const IPD_DISCIPLINES = ['Housebuild', 'Infrastructure', 'MEP']
const PMO_ROLES = ['workspace_admin', 'admin', 'pmo']

function isPMO(role?: string | null) {
  return PMO_ROLES.includes(role || '')
}

function inferDiscipline(role?: string | null) {
  if (role === 'housebuild') return 'Housebuild'
  if (role === 'infrastructure') return 'Infrastructure'
  if (role === 'mep') return 'MEP'
  return ''
}

function getActivityStatus(thisWeek: number, planned: number) {
  if (thisWeek >= planned) return 'On Track'
  if (planned - thisWeek <= 10) return 'Behind'
  return 'Stuck'
}

function workflowBadge(status?: string | null) {
  if (status === 'Approved') return 'badge-green'
  if (status === 'Locked') return 'badge-green'
  if (status === 'Submitted') return 'badge-amber'
  if (status === 'Returned') return 'badge-red'
  return 'badge-muted'
}

export default function ReportsPage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()
  const canExport = canExportReports(role)
  const canReview = isPMO(role)

  const { data: reports = [], isLoading } = useWeeklyReports()
  const { data: risks = [] } = useRisks()
  const { data: snags = [] } = useSnags()
  const { data: approvals = [] } = useApprovals()
  const { data: procurement = [] } = useProcurement()
  const { data: financial = [] } = useFinancial()

  const upsertReport = useUpsertWeeklyReport()
  const upsertActivity = useUpsertWeeklyActivity()

  const [packages, setPackages] = useState<any[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({})
  const [reportPhotos, setReportPhotos] = useState<any[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [printMode, setPrintMode] = useState<'selected' | 'all'>('selected')
  const [returnComment, setReturnComment] = useState('')

  const selectedReport =
    reports.find(report => report.id === selectedReportId) || reports[0]

  const { data: activities = [] } = useWeeklyActivities(selectedReport?.id)

  const selectedReportAny = selectedReport as any
  const workflowStatus = selectedReportAny?.workflow_status || 'Draft'
  const isLocked = workflowStatus === 'Locked' || Boolean(selectedReportAny?.locked_at)
  const isApproved = workflowStatus === 'Approved' || Boolean(selectedReportAny?.approved_at)

  const isCreator =
    Boolean(user?.id) &&
    Boolean(selectedReportAny?.created_by) &&
    selectedReportAny.created_by === user?.id

  const canEditSelectedReport =
    Boolean(selectedReport) &&
    !isLocked &&
    !isApproved &&
    (isCreator || canReview)

  const canAddActivity =
    Boolean(selectedReport) &&
    !isLocked &&
    !isApproved &&
    (isCreator || canReview)

  const [reportForm, setReportForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    department: inferDiscipline(role),
    block_id: '',
    package_name: '',
    contractor_name: '',
    reporting_officer: '',
    reporting_officer_email: '',
    status: 'On Track',
    pending_issues: '',
    matters_arising: '',
    look_ahead: '',
    next_meeting: '',
    quality_tracking: '',
    procurement_tracking: '',
    safety_tracking: '',
  })

  const [activityForm, setActivityForm] = useState({
    activity: '',
    last_week: 0,
    this_week: 0,
    planned: 0,
    activity_status: 'On Track',
    remarks: '',
  })

  useEffect(() => {
    loadPackages()
  }, [projectId])

  useEffect(() => {
    loadReportPhotos()
  }, [selectedReport?.id])

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

  async function loadReportPhotos() {
    if (!selectedReport?.id) {
      setReportPhotos([])
      return
    }

    const { data, error } = await supabase
      .from('report_photos')
      .select('*')
      .eq('report_id', selectedReport.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error.message)
      setReportPhotos([])
      return
    }

    setReportPhotos(data || [])
  }

  const selectedPackage = packages.find(
    item => item.id === (selectedReport as any)?.block_id
  )

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
    risk => risk.status === 'Open' && (risk.risk_score || 0) >= 12
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
    .reduce((sum, item) => sum + item.amount, 0)

  function openNewReport() {
    setReportForm({
      report_date: new Date().toISOString().slice(0, 10),
      department: inferDiscipline(role),
      block_id: '',
      package_name: '',
      contractor_name: '',
      reporting_officer: user?.full_name || '',
      reporting_officer_email: user?.email || '',
      status: 'On Track',
      pending_issues: '',
      matters_arising: '',
      look_ahead: '',
      next_meeting: '',
      quality_tracking: '',
      procurement_tracking: '',
      safety_tracking: '',
    })

    setPhotoCaptions({})
    setPhotos([])
    setSelectedReportId(null)
    setShowReportModal(true)
  }

  function openEditReport(report: WeeklyReport) {
    const reportAny = report as any

    setReportForm({
      report_date: report.report_date || new Date().toISOString().slice(0, 10),
      department: reportAny.department || reportAny.discipline || '',
      block_id: reportAny.block_id || '',
      package_name: reportAny.package_name || '',
      contractor_name: reportAny.contractor_name || '',
      reporting_officer: reportAny.reporting_officer || '',
      reporting_officer_email: reportAny.reporting_officer_email || '',
      status: report.status || 'On Track',
      pending_issues: report.pending_issues || '',
      matters_arising: report.matters_arising || '',
      look_ahead: report.look_ahead || '',
      next_meeting: report.next_meeting || '',
      quality_tracking: report.quality_tracking || '',
      procurement_tracking: report.procurement_tracking || '',
      safety_tracking: report.safety_tracking || '',
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
      contractor_name: pkg?.contractor_name || '',
    }))
  }

  function getSavedReportId(savedReport: any) {
    if (!savedReport) return null
    if (savedReport.id) return savedReport.id
    if (Array.isArray(savedReport) && savedReport[0]?.id) return savedReport[0].id
    if (savedReport.data?.id) return savedReport.data.id
    if (Array.isArray(savedReport.data) && savedReport.data[0]?.id) {
      return savedReport.data[0].id
    }
    return null
  }

  async function findReportIdFallback() {
    if (!projectId) return null

    let query = supabase
      .from('weekly_reports')
      .select('id')
      .eq('project_id', projectId)
      .eq('report_date', reportForm.report_date)
      .order('created_at', { ascending: false })
      .limit(1)

    if (reportForm.department) query = query.eq('department', reportForm.department)
    if (reportForm.block_id) query = query.eq('block_id', reportForm.block_id)

    const { data } = await query.maybeSingle()
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
        .upload(filePath, photo, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error(uploadError.message)
        alert(`Photo upload failed: ${uploadError.message}`)
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

      if (photoInsertError) {
        console.error(photoInsertError.message)
        alert(photoInsertError.message)
      }
    }

    setUploadingPhotos(false)
    setPhotos([])
  }

  async function saveReport() {
    try {
      const savedReport = await upsertReport.mutateAsync({
        id: selectedReportId || undefined,
        ...reportForm,
        discipline: reportForm.department,
        reporting_officer_email:
          reportForm.reporting_officer_email || user?.email || '',
        created_by_role: role,
        created_by: selectedReportId
          ? (selectedReport as any)?.created_by || user?.id || null
          : user?.id || null,
        updated_by: user?.id || null,
        workflow_status: selectedReportId
          ? (selectedReport as any)?.workflow_status || 'Draft'
          : 'Draft',
        next_meeting: reportForm.next_meeting || undefined,
      } as any)

      const reportId =
        selectedReportId ||
        getSavedReportId(savedReport) ||
        (await findReportIdFallback())

      if (!reportId) {
        alert('Report saved, but report ID could not be found for photo upload.')
        return
      }

      if (photos.length > 0) {
        await uploadReportPhotos(reportId)
      }

      setSelectedReportId(reportId)
      await loadReportPhotos()

      setShowReportModal(false)
      setPhotos([])
      setPhotoCaptions({})
    } catch (error: any) {
      console.error('Save report failed:', error)
      alert(error?.message || 'Failed to save report.')
    }
  }

  async function saveActivity() {
    if (!selectedReport?.id || !activityForm.activity.trim()) return

    const reportAny = selectedReport as any
    const status = getActivityStatus(
      Number(activityForm.this_week || 0),
      Number(activityForm.planned || 0)
    )

    await upsertActivity.mutateAsync({
      report_id: selectedReport.id,
      activity: activityForm.activity,
      last_week: Number(activityForm.last_week || 0),
      this_week: Number(activityForm.this_week || 0),
      planned: Number(activityForm.planned || 0),
      activity_status: status,
      remarks: activityForm.remarks || undefined,
      block_id: reportAny.block_id || null,
      package_name: reportAny.package_name || null,
      contractor_name: reportAny.contractor_name || null,
      discipline: reportAny.department || reportAny.discipline || null,
    } as any)

    setActivityForm({
      activity: '',
      last_week: 0,
      this_week: 0,
      planned: 0,
      activity_status: 'On Track',
      remarks: '',
    })

    setShowActivityModal(false)
  }

  async function updateWorkflow(status: string, extra: Record<string, any> = {}) {
    if (!selectedReport?.id) return

    const now = new Date().toISOString()

    const payload: any = {
      workflow_status: status,
      updated_by: user?.id || null,
      ...extra,
    }

    if (status === 'Submitted') {
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
      payload.return_comment = returnComment || null
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
      alert(error.message)
      return
    }

    setReturnComment('')
    alert(`Report marked as ${status}.`)
  }

  function printSelectedReport() {
    setPrintMode('selected')
    setTimeout(() => window.print(), 50)
  }

  function printAllReports() {
    setPrintMode('all')
    setTimeout(() => window.print(), 50)
  }

  function statusColor(status?: string | null) {
    if (status === 'Ahead') return 'text-emerald-400'
    if (status === 'On Track') return 'text-blue-400'
    if (status === 'Behind') return 'text-amber-400'
    if (status === 'Stuck') return 'text-red-400'
    return 'text-[#c49e48]'
  }

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #selected-report-print,
          #selected-report-print *,
          #all-reports-print,
          #all-reports-print * {
            visibility: visible;
          }

          #selected-report-print,
          #all-reports-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px;
          }

          .no-print {
            display: none !important;
          }

          .print-dark,
          .print-dark * {
            color: black !important;
            background: white !important;
          }

          .print-break {
            page-break-after: always;
          }
        }

        @media screen {
          #all-reports-print {
            display: none;
          }
        }
      `}</style>

      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold text-[#ede8de]">IPD Reports</div>
          <div className="text-[11px] text-[#6e7d8c] mt-1">
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

      <div className="no-print grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric title="IPD Reports" value={reports.length} color="text-[#c49e48]" />
        <Metric title="Open Risks" value={openRisks} color={openRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="High Risks" value={highRisks} color={highRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="Open Snags" value={openSnags} color={openSnags > 0 ? 'text-amber-400' : 'text-emerald-400'} />
        <Metric title="Pending Approvals" value={pendingApprovals} color={pendingApprovals > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>

      <div className="no-print grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#ede8de] font-semibold">
            <FileText size={16} className="text-[#c49e48]" />
            Report History
          </div>

          {isLoading ? (
            <div className="text-sm text-[#6e7d8c]">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-[#6e7d8c]">
              No IPD reports yet.
            </div>
          ) : (
            reportGroups.map(([date, dateReports]) => (
              <div key={date} className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-[#c49e48] pt-2">
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
                          ? 'border-[#c49e48]/40 bg-[#c49e48]/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-[#c49e48]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[#ede8de]">
                          {reportAny.department || reportAny.discipline || 'IPD'}
                        </div>

                        <span className={`badge ${workflowBadge(reportAny.workflow_status || 'Draft')}`}>
                          {reportAny.workflow_status || 'Draft'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#c49e48] mt-1">{packageName}</div>
                      <div className="text-[11px] text-[#6e7d8c] mt-1">
                        Contractor: {reportAny.contractor_name || '—'}
                      </div>
                      <div className="text-[11px] text-[#6e7d8c] mt-1">
                        Officer: {reportAny.reporting_officer || '—'}
                      </div>

                      {selectedReport?.id === report.id && reportPhotos.length > 0 && (
                        <div className="text-[10px] text-[#6e7d8c] mt-1 flex items-center gap-1">
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

        <div className="card print:shadow-none">
          {!selectedReport ? (
            <div className="p-8 text-center text-[#6e7d8c]">
              Select or create an IPD report.
            </div>
          ) : (
            <div>
              <ReportView
                id="selected-report-print"
                report={selectedReport}
                projectName={projectName}
                selectedPackage={selectedPackage}
                reportPhotos={reportPhotos}
                activities={activities}
                contractSum={contractSum}
                openSnags={openSnags}
                criticalSnags={criticalSnags}
                openRisks={openRisks}
                pendingProcurement={pendingProcurement}
                statusColor={statusColor}
              />

              <div className="no-print p-6 border-t border-white/[0.06] flex flex-wrap gap-2">
                {canEditSelectedReport && (
                  <button
                    className="btn-ghost btn-sm btn"
                    onClick={() => openEditReport(selectedReport)}
                  >
                    Edit Report
                  </button>
                )}

                {canAddActivity && (
                  <button
                    className="btn-gold btn-sm btn"
                    onClick={() => setShowActivityModal(true)}
                  >
                    <Plus size={13} />
                    Add Activity
                  </button>
                )}

                {!isLocked && !isApproved && isCreator && workflowStatus === 'Draft' && (
                  <button
                    className="btn-ghost btn-sm btn"
                    onClick={() => updateWorkflow('Submitted')}
                  >
                    <Send size={13} />
                    Submit
                  </button>
                )}

                {canReview && workflowStatus === 'Submitted' && (
                  <>
                    <button
                      className="btn-gold btn-sm btn"
                      onClick={() => updateWorkflow('Approved')}
                    >
                      <CheckCircle size={13} />
                      Approve
                    </button>

                    <input
                      className="form-control max-w-xs"
                      placeholder="Return comment"
                      value={returnComment}
                      onChange={e => setReturnComment(e.target.value)}
                    />

                    <button
                      className="btn-ghost btn-sm btn"
                      onClick={() => updateWorkflow('Returned')}
                    >
                      <RotateCcw size={13} />
                      Return
                    </button>
                  </>
                )}

                {canReview && isApproved && !isLocked && (
                  <button
                    className="btn-gold btn-sm btn"
                    onClick={() => updateWorkflow('Locked')}
                  >
                    <Lock size={13} />
                    Lock
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="all-reports-print">
        {reports.map((report: any) => (
          <div key={report.id} className="print-break">
            <ReportView
              report={report}
              projectName={projectName}
              selectedPackage={packages.find(item => item.id === report.block_id)}
              reportPhotos={[]}
              activities={[]}
              contractSum={contractSum}
              openSnags={openSnags}
              criticalSnags={criticalSnags}
              openRisks={openRisks}
              pendingProcurement={pendingProcurement}
              statusColor={statusColor}
            />
          </div>
        ))}
      </div>

      {showReportModal && (
        <Modal
          title={selectedReportId ? 'Edit IPD Report' : 'New IPD Report'}
          onClose={() => {
            setShowReportModal(false)
            setSelectedReportId(null)
          }}
        >
          <div className="space-y-3">
            <input
              type="date"
              className="form-control"
              value={reportForm.report_date}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  report_date: event.target.value,
                }))
              }
            />

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

            {[
              ['pending_issues', 'Pending Issues'],
              ['matters_arising', 'Matters Arising'],
              ['look_ahead', 'Look Ahead'],
              ['quality_tracking', 'Quality Tracking'],
              ['procurement_tracking', 'Procurement Tracking'],
              ['safety_tracking', 'Safety Tracking'],
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

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ede8de]">
                <UploadCloud size={15} className="text-[#c49e48]" />
                Upload Progress Photos
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="form-control"
                onChange={event => {
                  const selectedPhotos = Array.from(event.target.files || [])
                  setPhotos(selectedPhotos)
                  setPhotoCaptions({})
                }}
              />

              {photos.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-[#6e7d8c]">
                    {photos.length} photo(s) selected.
                  </div>

                  {photos.map(photo => (
                    <div
                      key={photo.name}
                      className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
                    >
                      <div className="text-xs text-[#ede8de]">{photo.name}</div>

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
              )}
            </div>

            <button
              className="btn-gold btn w-full justify-center"
              onClick={saveReport}
              disabled={upsertReport.isPending || uploadingPhotos}
            >
              {upsertReport.isPending || uploadingPhotos ? 'Saving…' : 'Save Report'}
            </button>
          </div>
        </Modal>
      )}

      {showActivityModal && (
        <Modal title="Add Weekly Activity" onClose={() => setShowActivityModal(false)}>
          <div className="space-y-3">
            <input
              className="form-control"
              placeholder="Activity"
              value={activityForm.activity}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  activity: event.target.value,
                }))
              }
            />

            <div className="grid grid-cols-3 gap-3">
              {[
                ['last_week', 'Last Week %'],
                ['this_week', 'This Week %'],
                ['planned', 'Planned %'],
              ].map(([key, label]) => (
                <input
                  key={key}
                  type="number"
                  className="form-control"
                  placeholder={label}
                  value={(activityForm as any)[key]}
                  onChange={event =>
                    setActivityForm(current => ({
                      ...current,
                      [key]: Number(event.target.value),
                    }))
                  }
                />
              ))}
            </div>

            <textarea
              className="form-control"
              rows={2}
              placeholder="Remarks"
              value={activityForm.remarks}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
            />

            <button
              className="btn-gold btn w-full justify-center"
              onClick={saveActivity}
              disabled={upsertActivity.isPending}
            >
              {upsertActivity.isPending ? 'Saving…' : 'Save Activity'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ReportView({
  id,
  report,
  projectName,
  selectedPackage,
  reportPhotos,
  activities,
  contractSum,
  openSnags,
  criticalSnags,
  openRisks,
  pendingProcurement,
  statusColor,
}: any) {
  return (
    <div id={id} className="print-dark">
      <div className="gold-bar" />

      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#c49e48]">
              IPD Weekly Report
            </div>

            <div className="text-2xl font-bold text-[#ede8de] mt-1">
              {projectName}
            </div>

            <div className="text-sm text-[#6e7d8c] mt-1">
              Report Date: {fdate(report.report_date)}
            </div>

            <div className="text-sm text-[#c49e48] mt-1">
              Discipline: {(report as any).department || (report as any).discipline || '—'}
            </div>
          </div>

          <div className="text-right">
            <div className={`text-xl font-bold ${statusColor(report.status)}`}>
              {report.status || 'On Track'}
            </div>

            <div className="mt-2">
              <span className={`badge ${workflowBadge((report as any).workflow_status || 'Draft')}`}>
                {(report as any).workflow_status || 'Draft'}
              </span>
            </div>

            <div className="text-[11px] text-[#6e7d8c] mt-2">
              Reporting Officer: {(report as any).reporting_officer || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Section title="Project / Package Information">
          <InfoGrid
            items={[
              ['Project Title', projectName || '—'],
              [
                'Package',
                (report as any).package_name ||
                  selectedPackage?.package_name ||
                  selectedPackage?.block_name ||
                  'Project Wide',
              ],
              ['Discipline', (report as any).department || (report as any).discipline || '—'],
              ['Contractor', (report as any).contractor_name || selectedPackage?.contractor_name || '—'],
              ['Contract Sum', contractSum ? formatCurrency(contractSum) : 'TBC'],
              ['Open Snags', openSnags],
              ['Critical Snags', criticalSnags],
              ['Open Risks', openRisks],
              ['Pending Procurement', pendingProcurement],
            ]}
          />
        </Section>

        <Section title="Weekly Progress Activities">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Last Week %</th>
                  <th>This Week %</th>
                  <th>Planned %</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-[#6e7d8c]">
                      No activities added yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((activity: any) => {
                    const status =
                      activity.activity_status ||
                      getActivityStatus(
                        Number(activity.this_week || 0),
                        Number(activity.planned || 0)
                      )

                    return (
                      <tr key={activity.id}>
                        <td className="text-[#ede8de] font-medium">{activity.activity}</td>
                        <td>{activity.last_week || 0}%</td>
                        <td>{activity.this_week || 0}%</td>
                        <td>{activity.planned || 0}%</td>
                        <td>{status}</td>
                        <td className="text-[#6e7d8c]">{activity.remarks || '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Pending Issues">
          <TextBlock value={report.pending_issues} />
        </Section>

        <Section title="Matters Arising">
          <TextBlock value={report.matters_arising} />
        </Section>

        <Section title="Look Ahead">
          <TextBlock value={report.look_ahead} />
        </Section>

        <Section title="Quality Tracking">
          <TextBlock value={report.quality_tracking} />
        </Section>

        <Section title="Procurement Tracking">
          <TextBlock value={report.procurement_tracking} />
        </Section>

        <Section title="Safety Tracking">
          <TextBlock value={report.safety_tracking} />
        </Section>

        <Section title="Progress Photos">
          <PhotoGallery photos={reportPhotos} />
        </Section>

        <Section title="Next Site Meeting">
          <div className="flex items-center gap-2 text-[#ede8de]">
            <CalendarDays size={14} className="text-[#c49e48]" />
            {report.next_meeting ? fdate(report.next_meeting) : 'Not set'}
          </div>
        </Section>

        <div className="border-t border-white/[0.06] pt-4 text-[10px] text-[#6e7d8c] font-mono">
          Generated by PMOCorex · {new Date().toLocaleDateString('en-GB')} · Confidential
        </div>
      </div>
    </div>
  )
}

function Metric({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="card p-3">
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-[#c49e48] uppercase tracking-widest border-b border-[#c49e48]/20 pb-1 mb-3">
        {title}
      </div>
      {children}
    </div>
  )
}

function TextBlock({ value }: { value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#bfb9ae] whitespace-pre-wrap min-h-[60px]">
      {value || '—'}
    </div>
  )
}

function InfoGrid({ items }: { items: [string, any][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c]">
            {label}
          </div>
          <div className="text-sm text-[#ede8de] mt-1">{value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

function PhotoGallery({ photos }: { photos: any[] }) {
  if (!photos.length) return <TextBlock value="No photos attached." />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
      {photos.map((photo, index) => (
        <div
          key={photo.id || `${photo.photo_url}-${index}`}
          className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden break-inside-avoid"
        >
          <img
            src={photo.photo_url}
            alt={photo.photo_name || `Report photo ${index + 1}`}
            className="w-full h-64 object-cover print:h-auto print:max-h-[320px]"
          />
          <div className="p-3 text-xs text-[#6e7d8c]">
            {photo.caption || photo.photo_name || `Progress Photo ${index + 1}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

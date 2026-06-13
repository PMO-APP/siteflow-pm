import { useEffect, useState } from 'react'
import {
  Printer,
  Plus,
  FileText,
  CalendarDays,
  Image as ImageIcon,
  UploadCloud,
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

const REPORT_DEPARTMENTS = [
  'PMO',
  'Housebuild',
  'Infrastructure',
  'MEP',
  'Design',
  'Costing',
  'Quality',
  'HSE',
  'Project Owner',
]

export default function ReportsPage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()
  const canExport = canExportReports(role)

  const { data: reports = [], isLoading } = useWeeklyReports()
  const { data: risks = [] } = useRisks()
  const { data: snags = [] } = useSnags()
  const { data: approvals = [] } = useApprovals()
  const { data: procurement = [] } = useProcurement()
  const { data: financial = [] } = useFinancial()

  const upsertReport = useUpsertWeeklyReport()
  const upsertActivity = useUpsertWeeklyActivity()

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({})
  const [reportPhotos, setReportPhotos] = useState<any[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const selectedReport =
    reports.find(report => report.id === selectedReportId) || reports[0]

  const { data: activities = [] } = useWeeklyActivities(selectedReport?.id)

  const [reportForm, setReportForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    department: '',
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
    remarks: '',
  })

  useEffect(() => {
    loadReportPhotos()
  }, [selectedReport?.id])

  async function loadReportPhotos() {
    if (!selectedReport?.id) {
      setReportPhotos([])
      return
    }

    const { data, error } = await supabase
      .from('report_photos')
      .select('*')
      .eq('report_id', selectedReport.id)
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error(error.message)
      setReportPhotos([])
      return
    }

    setReportPhotos(data || [])
  }

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
      department: '',
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
      department: reportAny.department || '',
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

    if (reportForm.department) {
      query = query.eq('department', reportForm.department)
    }

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
        continue
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
        })

      if (photoInsertError) {
        console.error(photoInsertError.message)
      }
    }

    setUploadingPhotos(false)
    setPhotos([])
    await loadReportPhotos()
  }

 async function saveReport() {
  try {
    console.log('Saving report...', reportForm)

    const savedReport = await upsertReport.mutateAsync({
      id: selectedReportId || undefined,
      ...reportForm,
      reporting_officer_email:
        reportForm.reporting_officer_email || user?.email || '',
      created_by_role: role,
      next_meeting: reportForm.next_meeting || undefined,
    } as any)

    console.log('Saved report response:', savedReport)

    const reportId =
      selectedReportId ||
      getSavedReportId(savedReport) ||
      (await findReportIdFallback())

    console.log('Resolved report ID:', reportId)

    if (!reportId) {
      alert('Report saved, but report ID could not be found for photo upload.')
      return
    }

    if (photos.length > 0) {
      await uploadReportPhotos(reportId)
    }

    setShowReportModal(false)
    setSelectedReportId(null)
    setPhotos([])
    setPhotoCaptions({})
  } catch (error: any) {
    console.error('Save report failed:', error)
    alert(error?.message || 'Failed to save report.')
  }
}

  async function saveActivity() {
    if (!selectedReport?.id || !activityForm.activity.trim()) return

    await upsertActivity.mutateAsync({
      report_id: selectedReport.id,
      activity: activityForm.activity,
      last_week: Number(activityForm.last_week || 0),
      this_week: Number(activityForm.this_week || 0),
      planned: Number(activityForm.planned || 0),
      remarks: activityForm.remarks || undefined,
    })

    setActivityForm({
      activity: '',
      last_week: 0,
      this_week: 0,
      planned: 0,
      remarks: '',
    })

    setShowActivityModal(false)
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold text-[#ede8de]">
            Weekly Project Reports
          </div>

          <div className="text-[11px] text-[#6e7d8c] mt-1">{projectName}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canExport && (
            <>
              <button
                className="btn-ghost btn-sm btn"
                onClick={() => window.print()}
              >
                <Printer size={13} />
                Print / PDF
              </button>

              <button className="btn-gold btn-sm btn" onClick={openNewReport}>
                <Plus size={13} />
                New Weekly Report
              </button>
            </>
          )}
        </div>
      </div>

      {!canExport && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          Reports View Only — you can view reports, but you cannot create or
          export reports.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric title="Reports" value={reports.length} color="text-[#c49e48]" />
        <Metric title="Open Risks" value={openRisks} color={openRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="High Risks" value={highRisks} color={highRisks > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <Metric title="Open Snags" value={openSnags} color={openSnags > 0 ? 'text-amber-400' : 'text-emerald-400'} />
        <Metric title="Pending Approvals" value={pendingApprovals} color={pendingApprovals > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#ede8de] font-semibold">
            <FileText size={16} className="text-[#c49e48]" />
            Report History
          </div>

          {isLoading ? (
            <div className="text-sm text-[#6e7d8c]">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-[#6e7d8c]">
              No weekly reports yet.
            </div>
          ) : (
            reports.map(report => {
              const reportAny = report as any

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
                      {fdate(report.report_date)}
                    </div>

                    <span className={`text-[10px] font-semibold ${statusColor(report.status)}`}>
                      {report.status || 'On Track'}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#c49e48] mt-1">
                    {reportAny.department || 'No department'}
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
            })
          )}
        </div>

        <div className="card print:shadow-none">
          {!selectedReport ? (
            <div className="p-8 text-center text-[#6e7d8c]">
              Select or create a weekly report.
            </div>
          ) : (
            <div id="weekly-report-print">
              <div className="gold-bar" />

              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[#c49e48]">
                      IPD Weekly Project Report
                    </div>

                    <div className="text-2xl font-bold text-[#ede8de] mt-1">
                      {projectName}
                    </div>

                    <div className="text-sm text-[#6e7d8c] mt-1">
                      Report Date: {fdate(selectedReport.report_date)}
                    </div>

                    <div className="text-sm text-[#c49e48] mt-1">
                      Department: {(selectedReport as any).department || '—'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xl font-bold ${statusColor(selectedReport.status)}`}>
                      {selectedReport.status || 'On Track'}
                    </div>

                    <div className="text-[11px] text-[#6e7d8c] mt-1">
                      Reporting Officer:{' '}
                      {(selectedReport as any).reporting_officer || '—'}
                    </div>

                    {(selectedReport as any).reporting_officer_email && (
                      <div className="text-[10px] text-[#6e7d8c] mt-1">
                        {(selectedReport as any).reporting_officer_email}
                      </div>
                    )}

                    {canExport && (
                      <button
                        className="btn-ghost btn-sm btn mt-3"
                        onClick={() => openEditReport(selectedReport)}
                      >
                        Edit Report
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <Section title="Project Information">
                  <InfoGrid
                    items={[
                      ['Project Title', projectName || '—'],
                      ['Department', (selectedReport as any).department || '—'],
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
                          <th>Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {activities.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-[#6e7d8c]">
                              No activities added yet.
                            </td>
                          </tr>
                        ) : (
                          activities.map(activity => (
                            <tr key={activity.id}>
                              <td className="text-[#ede8de] font-medium">
                                {activity.activity}
                              </td>
                              <td>{activity.last_week || 0}%</td>
                              <td>{activity.this_week || 0}%</td>
                              <td>{activity.planned || 0}%</td>
                              <td className="text-[#6e7d8c]">
                                {activity.remarks || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {canExport && (
                    <button
                      className="btn-gold btn-sm btn mt-3"
                      onClick={() => setShowActivityModal(true)}
                    >
                      <Plus size={13} />
                      Add Activity
                    </button>
                  )}
                </Section>

                <Section title="Pending Issues">
                  <TextBlock value={selectedReport.pending_issues} />
                </Section>

                <Section title="Matters Arising">
                  <TextBlock value={selectedReport.matters_arising} />
                </Section>

                <Section title="Look Ahead">
                  <TextBlock value={selectedReport.look_ahead} />
                </Section>

                <Section title="Quality Tracking">
                  <TextBlock value={selectedReport.quality_tracking} />
                </Section>

                <Section title="Procurement Tracking">
                  <TextBlock value={selectedReport.procurement_tracking} />
                </Section>

                <Section title="Safety Tracking">
                  <TextBlock value={selectedReport.safety_tracking} />
                </Section>

                <Section title="Progress Photos">
                  <PhotoGallery photos={reportPhotos} />
                </Section>

                <Section title="Next Site Meeting">
                  <div className="flex items-center gap-2 text-[#ede8de]">
                    <CalendarDays size={14} className="text-[#c49e48]" />
                    {selectedReport.next_meeting
                      ? fdate(selectedReport.next_meeting)
                      : 'Not set'}
                  </div>
                </Section>

                <div className="border-t border-white/[0.06] pt-4 text-[10px] text-[#6e7d8c] font-mono">
                  Generated by PMOCorex · {new Date().toLocaleDateString('en-GB')} · Confidential
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReportModal && (
        <Modal
          title={selectedReportId ? 'Edit Weekly Report' : 'New Weekly Report'}
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
              <option value="">Select Department</option>
              {REPORT_DEPARTMENTS.map(department => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

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

            <textarea
              className="form-control"
              rows={2}
              placeholder="Pending Issues"
              value={reportForm.pending_issues}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  pending_issues: event.target.value,
                }))
              }
            />

            <textarea
              className="form-control"
              rows={2}
              placeholder="Matters Arising"
              value={reportForm.matters_arising}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  matters_arising: event.target.value,
                }))
              }
            />

            <textarea
              className="form-control"
              rows={2}
              placeholder="Look Ahead"
              value={reportForm.look_ahead}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  look_ahead: event.target.value,
                }))
              }
            />

            <textarea
              className="form-control"
              rows={2}
              placeholder="Quality Tracking"
              value={reportForm.quality_tracking}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  quality_tracking: event.target.value,
                }))
              }
            />

            <textarea
              className="form-control"
              rows={2}
              placeholder="Procurement Tracking"
              value={reportForm.procurement_tracking}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  procurement_tracking: event.target.value,
                }))
              }
            />

            <textarea
              className="form-control"
              rows={2}
              placeholder="Safety Tracking"
              value={reportForm.safety_tracking}
              onChange={event =>
                setReportForm(current => ({
                  ...current,
                  safety_tracking: event.target.value,
                }))
              }
            />

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
      const selectedPhotos = Array.from(
        event.target.files || []
      )

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
          <div className="text-xs text-[#ede8de]">
            {photo.name}
          </div>

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
  <Modal
    title="Add Weekly Activity"
    onClose={() => setShowActivityModal(false)}
  >
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
        <input
          type="number"
          className="form-control"
          placeholder="Last Week %"
          value={activityForm.last_week}
          onChange={event =>
            setActivityForm(current => ({
              ...current,
              last_week: Number(event.target.value),
            }))
          }
        />

        <input
          type="number"
          className="form-control"
          placeholder="This Week %"
          value={activityForm.this_week}
          onChange={event =>
            setActivityForm(current => ({
              ...current,
              this_week: Number(event.target.value),
            }))
          }
        />

        <input
          type="number"
          className="form-control"
          placeholder="Planned %"
          value={activityForm.planned}
          onChange={event =>
            setActivityForm(current => ({
              ...current,
              planned: Number(event.target.value),
            }))
          }
        />
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

      <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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
        <div
          key={label}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
        >
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
  if (!photos.length) {
    return <TextBlock value="No photos attached." />
  }

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

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-white"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

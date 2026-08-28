import { useEffect, useMemo, useRef, useState } from 'react'
import { PenTool, Plus, Printer, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

import { pmoConfirm } from '@/lib/notifications'
const TABS = [
  ['my-report', 'My Weekly Report'],
  ['report', 'Combined Design Report'],
  ['drawings', 'Drawing Register'],
  ['consultants', 'Consultants'],
  ['issues', 'Design Issues'],
  ['weekly', 'Weekly Commentary'],
  ['history', 'History'],
]

const STATUSES = ['Open', 'In Progress', 'Pending', 'Approved', 'Closed']

function canEditDesignReports(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'design',
    'design_project_owner',
  ].includes(role || '')
}

function viewOnlyMessage() {
  return 'View only. Only the Design team and Administrators can add, submit, update or delete design records.'
}

function toLocalDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentReportFriday(now = new Date()) {
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(14, 0, 0, 0)
  return friday
}

function getReportSubmissionLock(now = new Date()) {
  const friday = getCurrentReportFriday(now)
  const day = now.getDay()
  const isThursday = day === 4
  const isFriday = day === 5
  const isAllowed = isThursday || (isFriday && now.getTime() <= friday.getTime())
  const reportWeek = toLocalDateInput(friday)

  const deadlineLabel = friday.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  let message = `Submissions open Thursday and Friday. Deadline: ${deadlineLabel}.`
  if (isThursday) {
    message = `Submission open. Deadline: ${deadlineLabel}.`
  } else if (isFriday && isAllowed) {
    message = `Submission open until 2:00 PM today (${deadlineLabel}).`
  } else if (isFriday) {
    message = 'Submission closed. The Friday 2:00 PM deadline has passed.'
  } else if (day === 6 || day === 0) {
    message = 'Submission closed for this week. Reports are accepted only on Thursday or Friday before 2:00 PM.'
  } else {
    message = 'Submission is not open yet. Reports can only be submitted on Thursday or Friday before 2:00 PM.'
  }

  return {
    deadline: friday,
    isAllowed,
    deadlineLabel,
    reportWeek,
    message,
  }
}

function fdate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function statusBadge(status?: string | null) {
  if (status === 'Approved' || status === 'Closed') return 'badge-green'
  if (status === 'Rejected') return 'badge-red'
  if (status === 'Pending' || status === 'Pending Review') return 'badge-amber'
  return 'badge-muted'
}

export default function DesignReportsPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName, organizationId, portfolioId } = useProjectStore()

  const canEdit = canEditDesignReports(role)
  const reportRef = useRef<HTMLDivElement>(null)

  const [, setClockTick] = useState(0)
  const reportLock = getReportSubmissionLock()
  const currentReportWeek = reportLock.reportWeek
  const [reportWeek, setReportWeek] = useState(currentReportWeek)
  const canSubmitIndividualReport = ['design', 'design_project_owner'].includes(role || '')
  const canSubmitReport = canSubmitIndividualReport && reportLock.isAllowed

  const [activeTab, setActiveTab] = useState('my-report')
  const [drawings, setDrawings] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [reportDetails, setReportDetails] = useState<string[]>([''])

  const [form, setForm] = useState({
    category: 'Consultant Update',
    title: '',
    description: '',
    consultant_name: '',
    status: 'Open',
    due_date: '',
    management_attention: false,
  })

  useEffect(() => {
    loadData()
    loadSubmissions()
  }, [projectId, portfolioId, organizationId, reportWeek])

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(value => value + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const matchedReport = submissions.find(
      submission => submission.report_week === reportWeek
    )

    setSelectedSubmission(matchedReport || null)
  }, [reportWeek, submissions])

  async function loadData() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setNotice('')

    const { data: drawingData, error: drawingError } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'Drawing')
      .order('revision_date', { ascending: false })

    if (drawingError) {
      setNotice(drawingError.message)
      setLoading(false)
      return
    }

    const { data: reportData, error: reportError } = await supabase
      .from('design_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_week', reportWeek)
      .order('id', { ascending: false })

    if (reportError) {
      setNotice(reportError.message)
      setLoading(false)
      return
    }

    setDrawings(drawingData || [])
    setItems(reportData || [])
    setLoading(false)
  }


  async function loadSubmissions() {
    if (!projectId && !portfolioId && !organizationId) return

    let query = supabase
      .from('design_report_submissions')
      .select('*')

    // The combined weekly Design Report is portfolio/workspace-wide, not limited
    // to whichever project PMO currently has open. Fall back safely when older
    // workspaces do not yet expose organization/portfolio context.
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId)
    } else if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
      .order('report_week', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      setNotice(error.message)
      return
    }

    setSubmissions(data || [])
  }

  async function submitReport() {
    if (!canSubmitIndividualReport) {
      setNotice('Only Design team members can submit an individual weekly design report.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    const liveLock = getReportSubmissionLock()
    if (!liveLock.isAllowed) {
      setNotice(liveLock.message)
      return
    }

    const cleanedDetails = reportDetails
      .map(detail => detail.trim())
      .filter(Boolean)

    if (!cleanedDetails.length) {
      setNotice('Add at least one report detail before submitting.')
      return
    }

    const alreadySubmitted = submissions.some(
      submission =>
        submission.report_week === liveLock.reportWeek &&
        submission.submitted_by === user?.id
    )

    if (alreadySubmitted) {
      setNotice('You have already submitted your report for this project and reporting week.')
      return
    }

    const ownItems = items.filter(item => item.created_by === user?.id)
    const reporterName = user?.full_name || user?.email || '—'

    const snapshotData = {
      projectName: projectName || '—',
      reportWeek: liveLock.reportWeek,
      preparedBy: reporterName,
      generatedAt: new Date().toISOString(),
      reportDetails: cleanedDetails,
      drawings,
      items: ownItems,
      stats: {
        totalDrawings: drawings.length,
        approvedDrawings: approvedDrawings.length,
        pendingDrawings: pendingDrawings.length,
        rejectedDrawings: rejectedDrawings.length,
        individualItems: ownItems.length,
      },
    }

    const { error } = await supabase.from('design_report_submissions').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: liveLock.reportWeek,
      submitted_by: user?.id || null,
      submitted_by_name: reporterName,
      status: 'Submitted',
      snapshot_data: snapshotData,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setReportDetails([''])
    setReportWeek(liveLock.reportWeek)
    await loadSubmissions()
    setActiveTab('report')
    setNotice('Your weekly design report was submitted successfully and added to the combined report.')
  }

  async function addItem(category: string) {
    setNotice('')

    if (!canEdit) {
      setNotice('View only. Only the Design team and Administrators can add, submit, update or delete design records.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!form.title.trim()) {
      setNotice('Title is required.')
      return
    }

    const { error } = await supabase.from('design_reports').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: reportWeek,
      category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      consultant_name: form.consultant_name.trim() || null,
      status: form.status,
      due_date: form.due_date || null,
      source: 'Manual',
      management_attention: form.management_attention,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setForm({
      category,
      title: '',
      description: '',
      consultant_name: '',
      status: 'Open',
      due_date: '',
      management_attention: false,
    })

    await loadData()
    setNotice('Design report item saved successfully.')
  }

  async function deleteItem(id: string) {
    if (!canEdit) {
      setNotice('View only. Only the Design team and Administrators can add, submit, update or delete design records.')
      return
    }

    const confirmed = await pmoConfirm('Delete this design report item?')
    if (!confirmed) return

    const { error } = await supabase.from('design_reports').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadData()
  }

  function printReport() {
    if (!reportRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Design Report</title>
          <style>
            body { margin: 0; background: white; }
            @page { size: A4; margin: 0; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${reportRef.current.innerHTML}</body>
      </html>
    `)

    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 700)
  }

  const approvedDrawings = drawings.filter(
    item => item.status === 'Approved' || item.approval_status === 'Approved' || item.status === 'Current'
  )

  const pendingDrawings = drawings.filter(
    item =>
      item.status === 'Pending Review' ||
      item.status === 'For Review' ||
      item.approval_status === 'Pending Review' ||
      item.review_status === 'Pending Review'
  )

  const rejectedDrawings = drawings.filter(
    item => item.status === 'Rejected' || item.approval_status === 'Rejected'
  )

  const consultantUpdates = items.filter(item => item.category === 'Consultant Update')
  const designIssues = items.filter(item => item.category === 'Design Issue')
  const weeklyAchievements = items.filter(item => item.category === 'Weekly Achievement')
  const weeklyChallenges = items.filter(item => item.category === 'Weekly Challenge')
  const nextWeekFocus = items.filter(item => item.category === 'Next Week Focus')
  const managementAttention = items.filter(item => item.management_attention === true)

  const consultantSummary = useMemo(() => {
    const map: Record<string, any> = {}

    drawings.forEach(drawing => {
      const name = drawing.consultant_name || drawing.issued_by || 'Unassigned Consultant'

      if (!map[name]) {
        map[name] = {
          consultant: name,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        }
      }

      map[name].total += 1

      if (
        drawing.status === 'Approved' ||
        drawing.approval_status === 'Approved' ||
        drawing.status === 'Current'
      ) {
        map[name].approved += 1
      }

      if (
        drawing.status === 'Pending Review' ||
        drawing.status === 'For Review' ||
        drawing.review_status === 'Pending Review'
      ) {
        map[name].pending += 1
      }

      if (drawing.status === 'Rejected' || drawing.approval_status === 'Rejected') {
        map[name].rejected += 1
      }
    })

    return Object.values(map)
  }, [drawings])

  const weekSubmissions = useMemo(
    () => submissions.filter(submission => submission.report_week === reportWeek),
    [submissions, reportWeek]
  )

  const ownCurrentSubmission = submissions.find(
    submission =>
      submission.report_week === currentReportWeek &&
      submission.submitted_by === user?.id
  )

  const snapshot = selectedSubmission?.snapshot_data || null
  const snapshotStats = snapshot?.stats || {}

  const reportProjectName = snapshot?.projectName || projectName
  const reportWeekForDocument = snapshot?.reportWeek || selectedSubmission?.report_week || reportWeek
  const reportPreparedBy =
    snapshot?.preparedBy || selectedSubmission?.submitted_by_name || user?.full_name || user?.email || '—'

  const reportDrawings = snapshot?.drawings || drawings
  const reportItems = snapshot?.items || items

  const reportApprovedDrawings = snapshot
    ? reportDrawings.filter(
        (item: any) =>
          item.status === 'Approved' ||
          item.approval_status === 'Approved' ||
          item.status === 'Current'
      )
    : approvedDrawings

  const reportPendingDrawings = snapshot
    ? reportDrawings.filter(
        (item: any) =>
          item.status === 'Pending Review' ||
          item.status === 'For Review' ||
          item.approval_status === 'Pending Review' ||
          item.review_status === 'Pending Review'
      )
    : pendingDrawings

  const reportRejectedDrawings = snapshot
    ? reportDrawings.filter(
        (item: any) =>
          item.status === 'Rejected' ||
          item.approval_status === 'Rejected'
      )
    : rejectedDrawings

  const reportConsultantUpdates = reportItems.filter(
    (item: any) => item.category === 'Consultant Update'
  )
  const reportDesignIssues = reportItems.filter(
    (item: any) => item.category === 'Design Issue'
  )
  const reportWeeklyAchievements = reportItems.filter(
    (item: any) => item.category === 'Weekly Achievement'
  )
  const reportWeeklyChallenges = reportItems.filter(
    (item: any) => item.category === 'Weekly Challenge'
  )
  const reportNextWeekFocus = reportItems.filter(
    (item: any) => item.category === 'Next Week Focus'
  )
  const reportManagementAttention = reportItems.filter(
    (item: any) => item.management_attention === true
  )

  return (
    <div className="pmx-command-page min-h-screen -m-4 space-y-6 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
      <section className="pmx-command-hero">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#ffd1c5] bg-[#ff7657]/10 text-[#df5f41] text-xs">
          Design Management
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#102943]">
          Design Reports
        </h1>

        <p className="text-[#65717c] mt-3 max-w-2xl">
          Weekly design reporting, consultant updates, drawing register, design issues and management attention items.
        </p>

        <div className="text-xs text-[#74818d] mt-4">
          Project: <span className="text-[#df5f41]">{projectName || 'No project selected'}</span>
        </div>

        {!canEdit && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            {viewOnlyMessage()}
          </div>
        )}
      </section>

      {notice && (
        <div className="rounded-xl border border-[#ffd1c5] bg-[#ff7657]/10 p-3 text-sm text-[#102943]">
          {notice}
        </div>
      )}

      <div className="card p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="form-label">Reporting Week</label>
          <div className="form-control max-w-xs bg-[#f3f5f7] font-semibold text-[#102943]">
            {fdate(reportWeek)}
          </div>

          <div className="mt-2 text-xs text-[#65717c]">
            The reporting date is set automatically by PMOCorex and cannot be changed.
          </div>
          <div
            className={`mt-1 text-xs ${
              reportLock.isAllowed ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {reportWeek === currentReportWeek
              ? reportLock.message
              : 'Historical reporting week. Submission is disabled.'}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {selectedSubmission && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSelectedSubmission(null)
                setReportWeek(currentReportWeek)
              }}
            >
              Back to Current Report
            </button>
          )}

          <button
            className="btn btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!weekSubmissions.length}
            onClick={() => {
              if (!weekSubmissions.length) {
                setNotice('No individual design reports have been submitted for this reporting week yet.')
                return
              }

              printReport()
            }}
          >
            <Printer size={15} />
            Print / Download Design Report
          </button>
        </div>
      </div>

      {selectedSubmission && (
        <div className="rounded-xl border border-[#ffd1c5] bg-[#ff7657]/10 p-3 text-sm text-[#102943]">
          Viewing the combined design report for {fdate(reportWeek)}. Individual submissions are preserved as saved snapshots.
        </div>
      )}

      {!selectedSubmission && canEdit && !reportLock.isAllowed && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {reportLock.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`btn btn-sm ${activeTab === value ? 'btn-gold' : 'btn-ghost'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 text-[#65717c]">Loading design data…</div>
      ) : (
        <>
          {activeTab === 'my-report' && (
            <IndividualWeeklyReportForm
              projectName={projectName}
              reportWeek={currentReportWeek}
              reportDetails={reportDetails}
              setReportDetails={setReportDetails}
              canSubmit={canSubmitReport && reportWeek === currentReportWeek && !ownCurrentSubmission}
              alreadySubmitted={!!ownCurrentSubmission}
              submissionLockMessage={reportLock.message}
              onSubmit={submitReport}
            />
          )}

          {activeTab === 'report' && (
            weekSubmissions.length ? (
              <div ref={reportRef}>
                <CombinedDesignReportDocument
                  reportWeek={reportWeek}
                  submissions={weekSubmissions}
                />
              </div>
            ) : (
              <NoSubmittedDesignReport
                reportWeek={reportWeek}
                canEdit={canEdit}
                canSubmitReport={canSubmitReport}
                submissionLockMessage={reportLock.message}
              />
            )
          )}

          {activeTab === 'drawings' && <DrawingRegister drawings={drawings} />}

          {activeTab === 'consultants' && (
            <ConsultantsTab
              consultantSummary={consultantSummary}
              consultantUpdates={consultantUpdates}
              form={form}
              setForm={setForm}
              addItem={addItem}
              deleteItem={deleteItem}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'issues' && (
            <ManualTab
              title="Design Issues / Blockers"
              category="Design Issue"
              items={designIssues}
              form={form}
              setForm={setForm}
              addItem={addItem}
              deleteItem={deleteItem}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'weekly' && (
            <WeeklyTab
              weeklyAchievements={weeklyAchievements}
              weeklyChallenges={weeklyChallenges}
              nextWeekFocus={nextWeekFocus}
              form={form}
              setForm={setForm}
              addItem={addItem}
              deleteItem={deleteItem}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'history' && (
            <DesignReportHistoryTab
              submissions={submissions}
              onOpenReport={(submission: any) => {
                setSelectedSubmission(submission)
                setReportWeek(submission.report_week)
                setActiveTab('report')
              }}
            />
          )}
        </>
      )}
    </div>
  )
}


function IndividualWeeklyReportForm({
  projectName,
  reportWeek,
  reportDetails,
  setReportDetails,
  canSubmit,
  alreadySubmitted,
  submissionLockMessage,
  onSubmit,
}: {
  projectName?: string | null
  reportWeek: string
  reportDetails: string[]
  setReportDetails: React.Dispatch<React.SetStateAction<string[]>>
  canSubmit: boolean
  alreadySubmitted: boolean
  submissionLockMessage: string
  onSubmit: () => void
}) {
  function updateDetail(index: number, value: string) {
    setReportDetails(current => current.map((item, i) => (i === index ? value : item)))
  }

  function removeDetail(index: number) {
    setReportDetails(current => {
      const next = current.filter((_, i) => i !== index)
      return next.length ? next : ['']
    })
  }

  return (
    <div className="card p-5 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#102943]">My Weekly Design Report</h3>
        <p className="mt-1 text-sm text-[#74818d]">
          Submit only your own update for the selected project. PMOCorex combines all Design team submissions into the weekly Design Report.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="form-label">Project Name</label>
          <div className="form-control bg-[#f3f5f7] font-semibold text-[#102943]">
            {projectName || 'No project selected'}
          </div>
          <div className="mt-1 text-xs text-[#74818d]">Taken from the project you are currently working in.</div>
        </div>

        <div>
          <label className="form-label">Reporting Week</label>
          <div className="form-control bg-[#f3f5f7] font-semibold text-[#102943]">{fdate(reportWeek)}</div>
          <div className="mt-1 text-xs text-[#74818d]">System controlled. Backdating is not allowed.</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="form-label">Report Details</label>
            <p className="text-xs text-[#74818d]">Add each update as a separate item for cleaner presentation in the combined report.</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setReportDetails(current => [...current, ''])}
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {reportDetails.map((detail, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3f7] text-xs font-bold text-[#102943]">
                {index + 1}
              </div>
              <textarea
                className="form-control min-h-[86px] flex-1"
                placeholder="Enter a clear project/design update..."
                value={detail}
                onChange={event => updateDetail(index, event.target.value)}
                disabled={alreadySubmitted}
              />
              {!alreadySubmitted && reportDetails.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm mt-1"
                  onClick={() => removeDetail(index)}
                  title="Remove item"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {alreadySubmitted ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
          Your report for this project and reporting week has already been submitted and locked.
        </div>
      ) : (
        <div className={`rounded-xl border p-3 text-sm ${canSubmit ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-amber-500/30 bg-amber-500/10 text-amber-700'}`}>
          {submissionLockMessage}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-gold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit || alreadySubmitted}
          onClick={onSubmit}
        >
          Submit My Weekly Report
        </button>
      </div>
    </div>
  )
}

function CombinedDesignReportDocument({ reportWeek, submissions }: any) {
  const sortedSubmissions = [...submissions].sort((a: any, b: any) =>
    String(a.submitted_by_name || '').localeCompare(String(b.submitted_by_name || ''))
  )

  return (
    <div className="design-report-document">
      <style>{`
        .design-report-document { background: white; color: #111827; width: 210mm; min-height: 297mm; padding: 16mm; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; box-sizing: border-box; }
        .dr-border { border: 2px solid #c49e48; padding: 12px; margin-bottom: 16px; }
        .dr-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d6c38a; padding-bottom: 10px; margin-bottom: 14px; letter-spacing: 0.12em; font-weight: 800; }
        .dr-title { text-align: center; font-size: 26px; font-weight: 900; margin: 16px 0; text-transform: uppercase; }
        .dr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .dr-info { border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
        .dr-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .dr-value { font-weight: 700; margin-top: 3px; }
        .dr-section { margin-top: 16px; page-break-inside: avoid; }
        .dr-section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7a5a12; border-bottom: 1px solid #d6c38a; padding-bottom: 5px; margin-bottom: 10px; }
        .dr-table { width: 100%; border-collapse: collapse; }
        .dr-table th, .dr-table td { border: 1px solid #333; padding: 6px; vertical-align: top; font-size: 11px; }
        .dr-table th { background: #f3f4f6; font-weight: 800; }
        .dr-footer { border-top: 1px solid #ddd; margin-top: 24px; padding-top: 8px; font-size: 10px; color: #666; }
        @media print { .design-report-document { width: auto; min-height: auto; padding: 14mm; } }
      `}</style>

      <div className="dr-border">
        <div className="dr-top"><div>MIXTA AFRICA</div><div>PMOCOREX</div></div>
        <div className="dr-title">Design Team Weekly Report</div>
        <div className="dr-grid">
          <Info label="Report Week" value={fdate(reportWeek)} />
          <Info label="Individual Submissions" value={sortedSubmissions.length} />
          <Info label="Generated By" value="PMOCorex" />
        </div>
      </div>

      {sortedSubmissions.map((submission: any, submissionIndex: number) => {
        const snapshot = submission.snapshot_data || {}
        const details = Array.isArray(snapshot.reportDetails) ? snapshot.reportDetails : []
        const reporter = submission.submitted_by_name || snapshot.preparedBy || 'Design Team Member'
        return (
          <Section key={submission.id || submissionIndex} title={`${submissionIndex + 1}. ${snapshot.projectName || 'Project'} · ${reporter}`}>
            <div className="mb-2 text-[11px] text-gray-600">
              Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('en-GB') : '—'}
            </div>
            <table className="dr-table">
              <thead><tr><th style={{ width: '8%' }}>No.</th><th>Report Detail</th></tr></thead>
              <tbody>
                {details.length ? details.map((detail: string, index: number) => (
                  <tr key={index}><td>{index + 1}</td><td>{detail}</td></tr>
                )) : <tr><td colSpan={2}>No itemized report detail was recorded.</td></tr>}
              </tbody>
            </table>
          </Section>
        )
      })}

      <div className="dr-footer">Mixta Africa · Consolidated by PMOCorex · Confidential · {new Date().toLocaleDateString('en-GB')}</div>
    </div>
  )
}


function NoSubmittedDesignReport({
  reportWeek,
  canEdit,
  canSubmitReport,
  submissionLockMessage,
}: {
  reportWeek: string
  canEdit: boolean
  canSubmitReport: boolean
  submissionLockMessage: string
}) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#ffd1c5] bg-[#ff7657]/10 text-[#df5f41]">
        <PenTool size={22} />
      </div>

      <h3 className="text-lg font-semibold text-[#102943]">
        No design report submitted for {fdate(reportWeek)}
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-[#74818d]">
        This tab only displays locked weekly design report snapshots. Use the Drawing Register,
        Consultants, Design Issues and Weekly Commentary tabs to update live records, then submit
        the weekly report to generate the snapshot for this date.
      </p>

      {canEdit ? (
        canSubmitReport ? (
          <p className="mt-4 text-sm text-amber-300">
            Click Submit Weekly Report when this week's design information is ready.
          </p>
        ) : (
          <p className="mt-4 text-sm text-red-400">
            {submissionLockMessage}
          </p>
        )
      ) : (
        <p className="mt-4 text-sm text-amber-300">
          You can view submitted reports only. No report has been submitted for this week yet.
        </p>
      )}
    </div>
  )
}


function DesignReportHistoryTab({
  submissions,
  onOpenReport,
}: {
  submissions: any[]
  onOpenReport: (submission: any) => void
}) {
  if (!submissions.length) {
    return (
      <div className="card p-8 text-center text-[#74818d]">
        No submitted design reports yet. Submit a weekly report to save it into history.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="tbl min-w-[1000px]">
        <thead>
          <tr>
            <th>Report Week</th>
            <th>Status</th>
            <th>Submitted By</th>
            <th>Submitted On</th>
            <th>Snapshot</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {submissions.map(submission => (
            <tr key={submission.id}>
              <td className="font-medium text-[#102943]">
                {fdate(submission.report_week)}
              </td>
              <td>
                <span className={`badge ${statusBadge(submission.status)}`}>
                  {submission.status || 'Submitted'}
                </span>
              </td>
              <td>{submission.submitted_by_name || '—'}</td>
              <td>{fdate(submission.submitted_at)}</td>
              <td>
                {submission.snapshot_data ? (
                  <span className="text-emerald-400">Saved</span>
                ) : (
                  <span className="text-amber-400">Legacy report</span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => onOpenReport(submission)}
                >
                  View / Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DesignReportDocument({
  projectName,
  reportWeek,
  preparedBy,
  drawings,
  approvedDrawings,
  pendingDrawings,
  rejectedDrawings,
  consultantUpdates,
  designIssues,
  weeklyAchievements,
  weeklyChallenges,
  nextWeekFocus,
  managementAttention,
}: any) {
  return (
    <div className="design-report-document">
      <style>{`
        .design-report-document {
          background: white;
          color: #111827;
          width: 210mm;
          min-height: 297mm;
          padding: 16mm;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.45;
          box-sizing: border-box;
        }
        .dr-border { border: 2px solid #c49e48; padding: 12px; margin-bottom: 16px; }
        .dr-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d6c38a; padding-bottom: 10px; margin-bottom: 14px; letter-spacing: 0.12em; font-weight: 800; }
        .dr-title { text-align: center; font-size: 26px; font-weight: 900; margin: 16px 0; text-transform: uppercase; }
        .dr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .dr-info { border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
        .dr-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .dr-value { font-weight: 700; margin-top: 3px; }
        .dr-section { margin-top: 16px; page-break-inside: avoid; }
        .dr-section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7a5a12; border-bottom: 1px solid #d6c38a; padding-bottom: 5px; margin-bottom: 10px; }
        .dr-table { width: 100%; border-collapse: collapse; }
        .dr-table th, .dr-table td { border: 1px solid #333; padding: 6px; vertical-align: top; font-size: 11px; }
        .dr-table th { background: #f3f4f6; font-weight: 800; }
        .dr-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; min-height: 36px; white-space: pre-wrap; }
        .dr-footer { border-top: 1px solid #ddd; margin-top: 24px; padding-top: 8px; font-size: 10px; color: #666; }
        @media print { .design-report-document { width: auto; min-height: auto; padding: 14mm; } }
      `}</style>

      <div className="dr-border">
        <div className="dr-top">
          <div>MIXTA AFRICA</div>
          <div>PMOCOREX</div>
        </div>

        <div className="dr-title">{projectName || 'Project'}</div>

        <div className="dr-grid">
          <Info label="Report Type" value="Design Weekly Report" />
          <Info label="Report Week" value={fdate(reportWeek)} />
          <Info label="Prepared By" value={preparedBy} />
        </div>
      </div>

      <Section title="Drawing Summary">
        <div className="dr-grid">
          <Info label="Total Drawings" value={drawings.length} />
          <Info label="Approved" value={approvedDrawings.length} />
          <Info label="Pending Review" value={pendingDrawings.length} />
          <Info label="Rejected" value={rejectedDrawings.length} />
          <Info label="Open Design Issues" value={designIssues.filter((item: any) => item.status !== 'Closed').length} />
          <Info label="Management Attention" value={managementAttention.length} />
        </div>
      </Section>

      <ReportTable title="Consultant Updates" items={consultantUpdates} />
      <ReportTable title="Design Issues / Blockers" items={designIssues} />
      <ReportTable title="Weekly Achievements" items={weeklyAchievements} />
      <ReportTable title="Weekly Challenges" items={weeklyChallenges} />
      <ReportTable title="Next Week Focus" items={nextWeekFocus} />
      <ReportTable title="Items Requiring Management Attention" items={managementAttention} />

      <Section title="Sign-off">
        <div className="dr-grid">
          <Info label="Prepared By" value={preparedBy} />
          <Info label="Reviewed By" value="—" />
          <Info label="Approved By" value="—" />
        </div>
      </Section>

      <div className="dr-footer">
        Mixta Africa · Generated by PMOCorex · Confidential · {new Date().toLocaleDateString('en-GB')}
      </div>
    </div>
  )
}

function ReportTable({ title, items }: { title: string; items: any[] }) {
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <div className="dr-box">No update recorded for this section.</div>
      ) : (
        <table className="dr-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Responsible</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.title || '—'}</td>
                <td>{item.consultant_name || '—'}</td>
                <td>{item.status || '—'}</td>
                <td>{item.due_date ? fdate(item.due_date) : '—'}</td>
                <td>{item.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dr-section">
      <div className="dr-section-title">{title}</div>
      {children}
    </section>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="dr-info">
      <div className="dr-label">{label}</div>
      <div className="dr-value">{value ?? '—'}</div>
    </div>
  )
}

function DrawingRegister({ drawings }: { drawings: any[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#dfe3e7]">
        <div className="font-bold text-[#102943]">Drawing Register</div>
        <div className="text-xs text-[#74818d]">Auto-filled from Document Control.</div>
      </div>

      {drawings.length === 0 ? (
        <div className="p-6 text-sm text-[#74818d]">
          No drawings found. Upload drawings from the Documents page first.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl min-w-[1100px]">
            <thead>
              <tr>
                <th>Drawing No.</th>
                <th>Title</th>
                <th>Discipline</th>
                <th>Rev</th>
                <th>Status</th>
                <th>Issued For</th>
                <th>Consultant</th>
                <th>Rev Date</th>
              </tr>
            </thead>
            <tbody>
              {drawings.map(drawing => (
                <tr key={drawing.id}>
                  <td className="font-mono text-[#df5f41]">{drawing.drawing_number || drawing.document_number || '—'}</td>
                  <td className="font-medium text-[#102943]">{drawing.title}</td>
                  <td>{drawing.discipline || '—'}</td>
                  <td>{drawing.revision_no || drawing.revision || '—'}</td>
                  <td>
                    <span className={`badge ${statusBadge(drawing.approval_status || drawing.review_status || drawing.status)}`}>
                      {drawing.approval_status || drawing.review_status || drawing.status || '—'}
                    </span>
                  </td>
                  <td>{drawing.issued_for || '—'}</td>
                  <td>{drawing.consultant_name || drawing.issued_by || '—'}</td>
                  <td>{drawing.revision_date ? fdate(drawing.revision_date) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ConsultantsTab({
  consultantSummary,
  consultantUpdates,
  form,
  setForm,
  addItem,
  deleteItem,
  canEdit,
}: any) {
  return (
    <div className="pmx-command-page min-h-screen -m-4 space-y-5 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
      <MetricGrid
        values={[
          ['Consultants', consultantSummary.length],
          ['Total Drawings', consultantSummary.reduce((sum: number, item: any) => sum + item.total, 0)],
          ['Approved', consultantSummary.reduce((sum: number, item: any) => sum + item.approved, 0)],
          ['Pending', consultantSummary.reduce((sum: number, item: any) => sum + item.pending, 0)],
        ]}
      />

      <div className="card overflow-x-auto">
        <table className="tbl min-w-[900px]">
          <thead>
            <tr>
              <th>Consultant</th>
              <th>Total Drawings</th>
              <th>Approved</th>
              <th>Pending</th>
              <th>Rejected</th>
            </tr>
          </thead>
          <tbody>
            {consultantSummary.map((item: any) => (
              <tr key={item.consultant}>
                <td className="font-medium text-[#102943]">{item.consultant}</td>
                <td>{item.total}</td>
                <td>{item.approved}</td>
                <td>{item.pending}</td>
                <td>{item.rejected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ManualTab
        title="Consultant Updates"
        category="Consultant Update"
        items={consultantUpdates}
        form={form}
        setForm={setForm}
        addItem={addItem}
        deleteItem={deleteItem}
        canEdit={canEdit}
      />
    </div>
  )
}

function WeeklyTab({
  weeklyAchievements,
  weeklyChallenges,
  nextWeekFocus,
  form,
  setForm,
  addItem,
  deleteItem,
  canEdit,
}: any) {
  return (
    <div className="space-y-5">
      <ManualTab title="Weekly Achievements" category="Weekly Achievement" items={weeklyAchievements} form={form} setForm={setForm} addItem={addItem} deleteItem={deleteItem} canEdit={canEdit} />
      <ManualTab title="Weekly Challenges" category="Weekly Challenge" items={weeklyChallenges} form={form} setForm={setForm} addItem={addItem} deleteItem={deleteItem} canEdit={canEdit} />
      <ManualTab title="Next Week Focus" category="Next Week Focus" items={nextWeekFocus} form={form} setForm={setForm} addItem={addItem} deleteItem={deleteItem} canEdit={canEdit} />
    </div>
  )
}

function ManualTab({
  title,
  category,
  items,
  form,
  setForm,
  addItem,
  deleteItem,
  canEdit,
}: any) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#df5f41]" />
          <h2 className="font-bold text-[#102943]">{title}</h2>
        </div>

        {!canEdit && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            {viewOnlyMessage()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="form-control disabled:opacity-60 disabled:cursor-not-allowed" value={category} disabled />

          <input
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Title"
            value={form.title}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, title: e.target.value, category })}
          />

          <input
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Consultant / responsible party"
            value={form.consultant_name}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, consultant_name: e.target.value, category })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <select
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.status}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, status: e.target.value, category })}
          >
            {STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.due_date}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, due_date: e.target.value, category })}
          />
        </div>

        <textarea
          className="form-control mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
          rows={3}
          placeholder="Update / description"
          value={form.description}
          disabled={!canEdit}
          onChange={e => setForm({ ...form, description: e.target.value, category })}
        />

        <label className={`flex items-center gap-2 text-sm text-[#65717c] mt-3 ${!canEdit ? 'opacity-60' : ''}`}>
          <input
            type="checkbox"
            checked={form.management_attention}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, management_attention: e.target.checked, category })}
          />
          Requires management attention
        </label>

        {canEdit && (
          <button className="btn btn-gold mt-4" onClick={() => addItem(category)}>
            Save Update
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-sm text-[#74818d]">No updates submitted yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[1200px]">
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>Responsible</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.category}</td>
                  <td className="font-medium text-[#102943]">{item.title}</td>
                  <td>{item.consultant_name || '—'}</td>
                  <td>
                    <span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Open'}</span>
                  </td>
                  <td>{item.due_date ? fdate(item.due_date) : '—'}</td>
                  <td className="max-w-[360px] text-[#65717c]">{item.description || '—'}</td>
                  <td>
                    {canEdit ? (
                      <button className="tbl-action text-red-400" onClick={() => deleteItem(item.id)}>
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-[#74818d]">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MetricGrid({ values }: { values: [string, string | number][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {values.map(([title, value]) => (
        <Metric key={title} title={title} value={value} />
      ))}
    </div>
  )
}

function Metric({ title, value }: { title: string | number; value: string | number }) {
  return (
    <div className="card p-4">
      <PenTool size={18} className="text-[#df5f41]" />
      <div className="text-2xl font-black text-[#102943] mt-3">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#74818d] mt-1">{title}</div>
    </div>
  )
}

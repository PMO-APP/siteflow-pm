import { useEffect, useMemo, useRef, useState } from 'react'
import { PenTool, Plus, Printer, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

const TABS = [
  ['report', 'Design Report'],
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

  const [activeTab, setActiveTab] = useState('report')
  const [drawings, setDrawings] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [reportWeek, setReportWeek] = useState(new Date().toISOString().slice(0, 10))

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
  }, [projectId, reportWeek])

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
      .order('submitted_at', { ascending: false })

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
    if (!projectId) return

    const { data, error } = await supabase
      .from('design_report_submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('report_week', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      return
    }

    setSubmissions(data || [])
  }

  async function submitReport() {
    if (!canEdit) {
      setNotice(viewOnlyMessage())
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    const snapshotData = {
      projectName,
      reportWeek,
      preparedBy: user?.full_name || user?.email || '—',
      generatedAt: new Date().toISOString(),

      drawings,
      items,

      stats: {
        totalDrawings: drawings.length,
        approvedDrawings: approvedDrawings.length,
        pendingDrawings: pendingDrawings.length,
        rejectedDrawings: rejectedDrawings.length,
        consultantUpdates: consultantUpdates.length,
        designIssues: designIssues.length,
        weeklyAchievements: weeklyAchievements.length,
        weeklyChallenges: weeklyChallenges.length,
        nextWeekFocus: nextWeekFocus.length,
        managementAttention: managementAttention.length,
      },
    }

    const { error } = await supabase.from('design_report_submissions').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: reportWeek,
      submitted_by: user?.id || null,
      submitted_by_name: user?.full_name || user?.email || null,
      status: 'Submitted',
      snapshot_data: snapshotData,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setSelectedSubmission(null)
    await loadSubmissions()
    setNotice('Design report submitted successfully and saved to history.')
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

    const confirmed = window.confirm('Delete this design report item?')
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
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Design Management
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Design Reports
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Weekly design reporting, consultant updates, drawing register, design issues and management attention items.
        </p>

        <div className="text-xs text-[#6e7d8c] mt-4">
          Project: <span className="text-[#c49e48]">{projectName || 'No project selected'}</span>
        </div>

        {!canEdit && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            {viewOnlyMessage()}
          </div>
        )}
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <div className="card p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="form-label">Report Week</label>
          <input
            type="date"
            className="form-control max-w-xs"
            value={reportWeek}
            onChange={e => {
              setSelectedSubmission(null)
              setReportWeek(e.target.value)
            }}
          />
        </div>

        <div className="flex gap-2 items-center">
          {selectedSubmission && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSelectedSubmission(null)
                setReportWeek(new Date().toISOString().slice(0, 10))
              }}
            >
              Back to Current Report
            </button>
          )}

          {canEdit && !selectedSubmission && (
            <button className="btn btn-ghost" onClick={submitReport}>
              Submit Weekly Report
            </button>
          )}

          <button className="btn btn-gold" onClick={printReport}>
            <Printer size={15} />
            Print / Download Design Report
          </button>
        </div>
      </div>

      {selectedSubmission && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          Viewing historical design report for {fdate(selectedSubmission.report_week)}.
          This report is a saved snapshot and will not change when new design records are added.
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
        <div className="card p-6 text-slate-400">Loading design data…</div>
      ) : (
        <>
          {activeTab === 'report' && (
            <div ref={reportRef}>
              <DesignReportDocument
                projectName={reportProjectName}
                reportWeek={reportWeekForDocument}
                preparedBy={reportPreparedBy}
                drawings={reportDrawings}
                approvedDrawings={reportApprovedDrawings}
                pendingDrawings={reportPendingDrawings}
                rejectedDrawings={reportRejectedDrawings}
                consultantUpdates={reportConsultantUpdates}
                designIssues={reportDesignIssues}
                weeklyAchievements={reportWeeklyAchievements}
                weeklyChallenges={reportWeeklyChallenges}
                nextWeekFocus={reportNextWeekFocus}
                managementAttention={reportManagementAttention}
              />
            </div>
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


function DesignReportHistoryTab({
  submissions,
  onOpenReport,
}: {
  submissions: any[]
  onOpenReport: (submission: any) => void
}) {
  if (!submissions.length) {
    return (
      <div className="card p-8 text-center text-[#6e7d8c]">
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
              <td className="font-medium text-[#ede8de]">
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
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="font-bold text-[#ede8de]">Drawing Register</div>
        <div className="text-xs text-[#6e7d8c]">Auto-filled from Document Control.</div>
      </div>

      {drawings.length === 0 ? (
        <div className="p-6 text-sm text-[#6e7d8c]">
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
                  <td className="font-mono text-[#c49e48]">{drawing.drawing_number || drawing.document_number || '—'}</td>
                  <td className="font-medium text-[#ede8de]">{drawing.title}</td>
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
    <div className="space-y-5">
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
                <td className="font-medium text-[#ede8de]">{item.consultant}</td>
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
          <Plus size={17} className="text-[#c49e48]" />
          <h2 className="font-bold text-[#ede8de]">{title}</h2>
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

        <label className={`flex items-center gap-2 text-sm text-slate-400 mt-3 ${!canEdit ? 'opacity-60' : ''}`}>
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
        <div className="card p-6 text-sm text-[#6e7d8c]">No updates submitted yet.</div>
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
                  <td className="font-medium text-[#ede8de]">{item.title}</td>
                  <td>{item.consultant_name || '—'}</td>
                  <td>
                    <span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Open'}</span>
                  </td>
                  <td>{item.due_date ? fdate(item.due_date) : '—'}</td>
                  <td className="max-w-[360px] text-slate-400">{item.description || '—'}</td>
                  <td>
                    {canEdit ? (
                      <button className="tbl-action text-red-400" onClick={() => deleteItem(item.id)}>
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">View Only</span>
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
      <PenTool size={18} className="text-[#c49e48]" />
      <div className="text-2xl font-black text-white mt-3">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">{title}</div>
    </div>
  )
}

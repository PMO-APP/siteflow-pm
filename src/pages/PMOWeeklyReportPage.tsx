import { useEffect, useMemo, useState } from 'react'
import { FileText, Printer, RefreshCw, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { fdate, formatCurrency } from '@/lib/utils'

type ExecutiveRow = {
  project: string
  package_name: string
  discipline: string
  status: string
  comments: string
  rag: string
  approved_budget: string
  outstanding_works: string
  risks: string
  performance: string
  finish_by: string
}

function canManageExecutiveReports(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo'].includes(role || '')
}

function getRag(status?: string | null) {
  if (status === 'Ahead' || status === 'On Track') return 'GREEN'
  if (status === 'Behind') return 'AMBER'
  if (status === 'Stuck') return 'RED'
  return 'AMBER'
}

function getPerformance(status?: string | null) {
  if (status === 'Ahead' || status === 'On Track') return 'on track'
  if (status === 'Behind' || status === 'Stuck') return 'lagging'
  return 'lagging'
}

export default function PMOWeeklyReportPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const canManage = canManageExecutiveReports(role)

  const [reportWeek, setReportWeek] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const [report, setReport] = useState({
    executive_summary: '',
    design_summary: '',
    costing_summary: '',
    site_summary: '',
    hse_summary: '',
    risk_summary: '',
    key_decisions_required: '',
    management_attention: '',
  })

  const [rows, setRows] = useState<ExecutiveRow[]>([])

  useEffect(() => {
    loadExistingReport()
  }, [projectId, reportWeek])

  async function loadExistingReport() {
    if (!projectId) return

    const { data } = await supabase
      .from('pmo_weekly_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_week', reportWeek)
      .maybeSingle()

    if (data) {
      setReport({
        executive_summary: data.executive_summary || '',
        design_summary: data.design_summary || '',
        costing_summary: data.costing_summary || '',
        site_summary: data.site_summary || '',
        hse_summary: data.hse_summary || '',
        risk_summary: data.risk_summary || '',
        key_decisions_required: data.key_decisions_required || '',
        management_attention: data.management_attention || '',
      })

      setRows(data.report_rows || [])
    }
  }

  async function generateReport() {
    if (!canManage) {
      setNotice('Only PMO/Admin can generate executive reports.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    setLoading(true)
    setNotice('')

    const [
      ipdResult,
      activitiesResult,
      designResult,
      drawingsResult,
      costingResult,
      contractsResult,
      paymentsResult,
      variationsResult,
      risksResult,
      procurementResult,
      snagsResult,
      approvalsResult,
    ] = await Promise.all([
      supabase
        .from('weekly_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('report_date', reportWeek),

      supabase.from('weekly_activities').select('*'),

      supabase
        .from('design_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('report_week', reportWeek),

      supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('type', 'Drawing'),

      supabase
        .from('cost_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('report_week', reportWeek),

      supabase.from('cost_contracts').select('*').eq('project_id', projectId),

      supabase.from('cost_payments').select('*').eq('project_id', projectId),

      supabase.from('cost_variations').select('*').eq('project_id', projectId),

      supabase.from('risks').select('*').eq('project_id', projectId),

      supabase.from('procurement_items').select('*').eq('project_id', projectId),

      supabase.from('snags').select('*').eq('project_id', projectId),

      supabase.from('approvals').select('*').eq('project_id', projectId),
    ])

    const ipdReports = ipdResult.data || []
    const activities = activitiesResult.data || []
    const designItems = designResult.data || []
    const drawings = drawingsResult.data || []
    const costItems = costingResult.data || []
    const contracts = contractsResult.data || []
    const payments = paymentsResult.data || []
    const variations = variationsResult.data || []
    const risks = risksResult.data || []
    const procurement = procurementResult.data || []
    const snags = snagsResult.data || []
    const approvals = approvalsResult.data || []

    const approvedDrawings = drawings.filter(
      item =>
        item.status === 'Approved' ||
        item.approval_status === 'Approved' ||
        item.status === 'Current'
    ).length

    const pendingDrawings = drawings.filter(
      item =>
        item.status === 'Pending Review' ||
        item.status === 'For Review' ||
        item.review_status === 'Pending Review'
    ).length

    const totalContractValue = contracts.reduce(
      (sum, item) => sum + Number(item.contract_value || 0),
      0
    )

    const totalPaid = contracts.reduce(
      (sum, item) => sum + Number(item.amount_paid || 0),
      0
    )

    const pendingPayments = payments
      .filter(item => item.payment_status === 'Pending')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)

    const approvedVariations = variations
      .filter(item => item.status === 'Approved')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)

    const openRisks = risks.filter(item => item.status === 'Open')
    const highRisks = risks.filter(
      item =>
        item.severity === 'High' ||
        item.risk_level === 'High' ||
        Number(item.risk_score || 0) >= 12
    )

    const openSnags = snags.filter(item => item.status !== 'Closed')
    const pendingProcurement = procurement.filter(
      item => item.status !== 'Delivered'
    )
    const pendingApprovals = approvals.filter(
      item => item.status !== 'Approved' && item.status !== 'Rejected'
    )

    const generatedRows: ExecutiveRow[] = ipdReports.map(reportItem => {
      const reportAny = reportItem as any

      const reportActivities = activities.filter(
        activity => activity.report_id === reportItem.id
      )

      const activityLines = reportActivities.length
        ? reportActivities
            .map(
              activity =>
                `- ${activity.activity}: ${activity.this_week || 0}% achieved against ${activity.planned || 0}% planned. ${activity.remarks || ''}`
            )
            .join('\n')
        : reportItem.look_ahead || reportItem.matters_arising || 'No activities recorded.'

      return {
        project: projectName || 'Project',
        package_name: reportAny.package_name || 'Project Wide',
        discipline: reportAny.department || reportAny.discipline || 'IPD',
        status: reportItem.status || 'On Track',
        comments: [
          `Reporting Officer: ${reportAny.reporting_officer || '—'}`,
          `Contractor: ${reportAny.contractor_name || '—'}`,
          activityLines,
          reportItem.pending_issues
            ? `Pending Issues: ${reportItem.pending_issues}`
            : '',
          reportItem.look_ahead ? `Look Ahead: ${reportItem.look_ahead}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        rag: getRag(reportItem.status),
        approved_budget: totalContractValue
          ? formatCurrency(totalContractValue)
          : 'TBC',
        outstanding_works:
          reportItem.pending_issues ||
          reportItem.look_ahead ||
          'To be updated from IPD report.',
        risks: openRisks.length
          ? openRisks
              .slice(0, 3)
              .map(risk => risk.title || risk.risk || risk.description)
              .join('\n')
          : 'No open risks recorded.',
        performance: getPerformance(reportItem.status),
        finish_by: reportAny.finish_by || reportAny.next_meeting || 'TBC',
      }
    })

    if (generatedRows.length === 0) {
      generatedRows.push({
        project: projectName || 'Project',
        package_name: 'Project Wide',
        discipline: 'PMO',
        status: 'No IPD Report',
        comments:
          'No IPD report has been submitted for the selected reporting week.',
        rag: 'AMBER',
        approved_budget: totalContractValue
          ? formatCurrency(totalContractValue)
          : 'TBC',
        outstanding_works: 'Awaiting IPD report submissions.',
        risks: openRisks.length
          ? openRisks
              .slice(0, 3)
              .map(risk => risk.title || risk.risk || risk.description)
              .join('\n')
          : 'No open risks recorded.',
        performance: 'lagging',
        finish_by: 'TBC',
      })
    }

    setRows(generatedRows)

    setReport({
      executive_summary: `${projectName || 'Project'} PMO executive report for ${fdate(
        reportWeek
      )}. ${ipdReports.length} IPD report(s), ${
        designItems.length
      } design report(s), and ${
        costItems.length
      } cost report(s) were reviewed. Overall management attention is required for ${
        highRisks.length
      } high risk item(s), ${pendingDrawings} pending drawing(s), ${
        pendingProcurement.length
      } pending procurement item(s), and ${pendingPayments.toLocaleString()} in pending payments.`,

      design_summary: `Design records show ${drawings.length} drawing(s), ${approvedDrawings} approved/current drawing(s), and ${pendingDrawings} drawing(s) pending review.`,

      costing_summary: `Cost records show total contract value of ₦${totalContractValue.toLocaleString()}, total paid of ₦${totalPaid.toLocaleString()}, pending payments of ₦${pendingPayments.toLocaleString()}, and approved variations of ₦${approvedVariations.toLocaleString()}.`,

      site_summary: `${ipdReports.length} IPD report(s) were submitted for the week. ${openSnags.length} open snag(s) and ${pendingProcurement.length} pending procurement item(s) remain active.`,

      hse_summary: `HSE summary will pull from HSE records once HSE reporting is connected to the executive report module.`,

      risk_summary: `${openRisks.length} open risk(s) recorded, including ${highRisks.length} high risk item(s).`,

      key_decisions_required: [
        pendingDrawings > 0
          ? `- Resolve ${pendingDrawings} pending drawing review(s).`
          : '',
        pendingApprovals.length > 0
          ? `- Close ${pendingApprovals.length} pending approval item(s).`
          : '',
        pendingPayments > 0
          ? `- Review pending payments totaling ₦${pendingPayments.toLocaleString()}.`
          : '',
        highRisks.length > 0
          ? `- Review ${highRisks.length} high risk item(s).`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),

      management_attention: [
        pendingProcurement.length > 0
          ? `- ${pendingProcurement.length} procurement item(s) are pending delivery.`
          : '',
        openSnags.length > 0
          ? `- ${openSnags.length} snag(s) remain open.`
          : '',
        approvedVariations > 0
          ? `- Approved variations total ₦${approvedVariations.toLocaleString()}.`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    setLoading(false)
  }

  async function saveReport() {
    if (!canManage) {
      setNotice('Only PMO/Admin can save executive reports.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    const payload = {
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: reportWeek,
      ...report,
      report_rows: rows,
      status: 'Draft',
      generated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('pmo_weekly_reports')
      .select('id')
      .eq('project_id', projectId)
      .eq('report_week', reportWeek)
      .maybeSingle()

    const { error } = existing
      ? await supabase
          .from('pmo_weekly_reports')
          .update(payload)
          .eq('id', existing.id)
      : await supabase.from('pmo_weekly_reports').insert(payload)

    if (error) {
      setNotice(error.message)
      return
    }

    setNotice('Executive report saved successfully.')
  }

  function printExecutiveReport() {
    window.print()
  }

  function updateField(key: keyof typeof report, value: string) {
    setReport(current => ({ ...current, [key]: value }))
  }

  const ragCounts = useMemo(() => {
    return {
      green: rows.filter(row => row.rag === 'GREEN').length,
      amber: rows.filter(row => row.rag === 'AMBER').length,
      red: rows.filter(row => row.rag === 'RED').length,
    }
  }, [rows])

  return (
    <div className="pmx-command-page min-h-screen -m-4 space-y-6 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #executive-report-print,
          #executive-report-print * {
            visibility: visible;
          }

          #executive-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
          }

          .no-print {
            display: none !important;
          }

          .print-table {
            color: black !important;
            border-collapse: collapse;
            width: 100%;
            font-size: 10px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #222;
            padding: 6px;
            vertical-align: top;
          }

          .print-dark {
            color: black !important;
            background: white !important;
          }
        }
      `}</style>

      <section className="no-print overflow-hidden rounded-[24px] border border-[#dfe3e7] bg-white shadow-sm">
        <div className="border-l-[6px] border-[#ff7657] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#ffd1c5] bg-[#ff7657]/10 text-[#df5f41] text-xs">
          PMO Reporting
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#102943]">
          Executive Reports
        </h1>

        <p className="text-[#65717c] mt-3 max-w-3xl leading-7">
          Generate weekly, monthly and board-ready reports from live IPD, design,
          costing, risk, procurement, approval and project records.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e8ec] bg-[#f8fafb] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b8791]">Report status</div>
            <div className="mt-2 font-semibold text-emerald-700">Ready to generate</div>
          </div>
          <div className="rounded-2xl border border-[#e3e8ec] bg-[#f8fafb] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b8791]">Project</div>
            <div className="mt-2 truncate font-semibold text-[#102943]">{projectName || 'Selected project'}</div>
          </div>
          <div className="rounded-2xl border border-[#e3e8ec] bg-[#f8fafb] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b8791]">Reporting week</div>
            <div className="mt-2 font-semibold text-[#102943]">{fdate(reportWeek)}</div>
          </div>
        </div>
        </div>
      </section>

      {notice && (
        <div className="no-print rounded-xl border border-[#ffd1c5] bg-[#ff7657]/10 p-3 text-sm text-[#102943]">
          {notice}
        </div>
      )}

      {!canManage && (
        <div className="no-print card p-4 text-sm text-amber-400">
          View only. Only PMO/Admin can generate or save executive reports.
        </div>
      )}

      <div className="no-print card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">Report Week</label>
          <input
            type="date"
            className="form-control"
            value={reportWeek}
            onChange={e => setReportWeek(e.target.value)}
          />
        </div>

        {canManage && (
          <>
            <button className="btn btn-gold" onClick={generateReport}>
              <RefreshCw size={14} />
              {loading ? 'Generating…' : 'Generate Report'}
            </button>

            <button className="btn btn-ghost" onClick={saveReport}>
              <Save size={14} />
              Save Draft
            </button>
          </>
        )}

        <button className="btn btn-ghost" onClick={printExecutiveReport}>
          <Printer size={14} />
          Print / PDF
        </button>
      </div>

      <div id="executive-report-print" className="card p-6 print-dark">
        <div className="flex items-start justify-between gap-4 border-b border-[#e4e8eb] pb-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#df5f41]">
              PMO Snapshot Report
            </div>

            <h1 className="text-2xl font-black text-[#102943] print-dark mt-1">
              {projectName || 'Project'} Executive Weekly Report
            </h1>

            <div className="text-sm text-[#74818d] print-dark mt-1">
              Report Week: {fdate(reportWeek)}
            </div>
          </div>

          <div className="text-right text-sm text-[#74818d] print-dark">
            Generated by: {user?.full_name || user?.email || 'PMOCorex'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5 no-print">
          <Metric title="Green" value={ragCounts.green} color="text-emerald-700" />
          <Metric title="Amber" value={ragCounts.amber} color="text-amber-700" />
          <Metric title="Red" value={ragCounts.red} color="text-red-700" />
        </div>

        <ReportBlock
          title="Executive Summary"
          value={report.executive_summary}
          editable={canManage}
          onChange={value => updateField('executive_summary', value)}
        />

        <div className="mt-6">
          <div className="text-[10px] font-mono text-[#df5f41] uppercase tracking-widest border-b border-[#ffd1c5] pb-1 mb-3">
            Project Performance Snapshot
          </div>

          <div className="overflow-x-auto">
            <table className="tbl print-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Status / Comments</th>
                  <th>RAG</th>
                  <th>Approved Budget</th>
                  <th>Outstanding Works</th>
                  <th>Risks</th>
                  <th>Performance</th>
                  <th>Finish By</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6">
                      Generate report to compile project records.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.project}-${row.package_name}-${index}`}>
                      <td>
                        <strong>{row.project}</strong>
                        <br />
                        {row.package_name}
                        <br />
                        <span>{row.discipline}</span>
                      </td>
                      <td>{row.status}</td>
                      <td className="whitespace-pre-wrap">{row.comments}</td>
                      <td>
                        <span
                          className={`badge ${
                            row.rag === 'GREEN'
                              ? 'badge-green'
                              : row.rag === 'RED'
                              ? 'badge-red'
                              : 'badge-amber'
                          }`}
                        >
                          {row.rag}
                        </span>
                      </td>
                      <td>{row.approved_budget}</td>
                      <td className="whitespace-pre-wrap">
                        {row.outstanding_works}
                      </td>
                      <td className="whitespace-pre-wrap">{row.risks}</td>
                      <td>{row.performance}</td>
                      <td>{row.finish_by ? fdate(row.finish_by) : 'TBC'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ReportBlock
          title="Design Summary"
          value={report.design_summary}
          editable={canManage}
          onChange={value => updateField('design_summary', value)}
        />

        <ReportBlock
          title="Costing Summary"
          value={report.costing_summary}
          editable={canManage}
          onChange={value => updateField('costing_summary', value)}
        />

        <ReportBlock
          title="Site Summary"
          value={report.site_summary}
          editable={canManage}
          onChange={value => updateField('site_summary', value)}
        />

        <ReportBlock
          title="HSE Summary"
          value={report.hse_summary}
          editable={canManage}
          onChange={value => updateField('hse_summary', value)}
        />

        <ReportBlock
          title="Risk Summary"
          value={report.risk_summary}
          editable={canManage}
          onChange={value => updateField('risk_summary', value)}
        />

        <ReportBlock
          title="Key Decisions Required"
          value={report.key_decisions_required}
          editable={canManage}
          onChange={value => updateField('key_decisions_required', value)}
        />

        <ReportBlock
          title="Management Attention"
          value={report.management_attention}
          editable={canManage}
          onChange={value => updateField('management_attention', value)}
        />

        <div className="border-t border-[#e4e8eb] mt-6 pt-4 text-[10px] text-[#74818d] print-dark">
          Generated by PMOCorex · {new Date().toLocaleDateString('en-GB')} ·
          Confidential
        </div>
      </div>
    </div>
  )
}

function ReportBlock({
  title,
  value,
  editable,
  onChange,
}: {
  title: string
  value: string
  editable: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-[#df5f41]" />
        <h2 className="font-bold text-[#102943] print-dark">{title}</h2>
      </div>

      {editable ? (
        <textarea
          className="form-control no-print"
          rows={4}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : null}

      <div className="rounded-xl border border-[#dfe3e7] bg-[#fbfcfc] p-4 text-sm text-[#536170] whitespace-pre-wrap min-h-[60px] print-dark">
        {value || '—'}
      </div>
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
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-[#74818d] uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  )
}

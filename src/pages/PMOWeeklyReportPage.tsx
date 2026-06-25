import { useEffect, useState } from 'react'
import { FileText, RefreshCw, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'

export default function PMOWeeklyReportPage() {
  const { user } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

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
    }
  }

  async function generateReport() {
    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    setLoading(true)
    setNotice('')

    const [
      designResult,
      drawingsResult,
      costingResult,
      contractsResult,
      paymentsResult,
      variationsResult,
      risksResult,
    ] = await Promise.all([
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
    ])

    const designItems = designResult.data || []
    const drawings = drawingsResult.data || []
    const costItems = costingResult.data || []
    const contracts = contractsResult.data || []
    const payments = paymentsResult.data || []
    const variations = variationsResult.data || []
    const risks = risksResult.data || []

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

    const designIssues = designItems.filter(
      item => item.category === 'Design Issue'
    )

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

    const highRisks = risks.filter(
      item =>
        item.severity === 'High' ||
        item.risk_level === 'High' ||
        item.status === 'Open'
    )

    setReport({
      executive_summary: `${projectName || 'Project'} weekly PMO report generated from live PMOCorex records for the selected reporting week.`,

      design_summary: `Design records show ${drawings.length} drawing(s), ${approvedDrawings} approved drawing(s), and ${pendingDrawings} drawing(s) pending review. ${designIssues.length} design issue(s) were recorded for the week.`,

      costing_summary: `Cost records show total contract value of ₦${totalContractValue.toLocaleString()}, total paid of ₦${totalPaid.toLocaleString()}, pending payments of ₦${pendingPayments.toLocaleString()}, and approved variations of ₦${approvedVariations.toLocaleString()}.`,

      site_summary: `Site progress summary should be pulled from the Site Progress module in the next build phase.`,

      hse_summary: `HSE summary should be pulled from the HSE module in the next build phase.`,

      risk_summary: `${highRisks.length} high/open risk item(s) require attention.`,

      key_decisions_required: designItems
        .filter(item => item.management_attention)
        .map(item => `- ${item.title}`)
        .join('\n'),

      management_attention: [
        pendingDrawings > 0
          ? `- ${pendingDrawings} drawing(s) are still pending review.`
          : '',
        pendingPayments > 0
          ? `- Pending payments total ₦${pendingPayments.toLocaleString()}.`
          : '',
        highRisks.length > 0
          ? `- ${highRisks.length} high/open risk item(s) require attention.`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    setLoading(false)
  }

  async function saveReport() {
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

    setNotice('Executive Reports saved successfully.')
  }

  function updateField(key: keyof typeof report, value: string) {
    setReport(current => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          PMO Reporting
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Executive Reports
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Generate, review, save and download PMO executive reports from live project records.
        </p>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">Report Week</label>
          <input
            type="date"
            className="form-control"
            value={reportWeek}
            onChange={e => setReportWeek(e.target.value)}
          />
        </div>

        <button className="btn btn-gold" onClick={generateReport}>
          <RefreshCw size={14} />
          {loading ? 'Generating…' : 'Generate Report'}
        </button>

        <button className="btn btn-ghost" onClick={saveReport}>
          <Save size={14} />
          Save Draft
        </button>
      </div>

      <ReportSection
        title="Executive Summary"
        value={report.executive_summary}
        onChange={value => updateField('executive_summary', value)}
      />

      <ReportSection
        title="Design Summary"
        value={report.design_summary}
        onChange={value => updateField('design_summary', value)}
      />

      <ReportSection
        title="Costing Summary"
        value={report.costing_summary}
        onChange={value => updateField('costing_summary', value)}
      />

      <ReportSection
        title="Site Summary"
        value={report.site_summary}
        onChange={value => updateField('site_summary', value)}
      />

      <ReportSection
        title="HSE Summary"
        value={report.hse_summary}
        onChange={value => updateField('hse_summary', value)}
      />

      <ReportSection
        title="Risk Summary"
        value={report.risk_summary}
        onChange={value => updateField('risk_summary', value)}
      />

      <ReportSection
        title="Key Decisions Required"
        value={report.key_decisions_required}
        onChange={value => updateField('key_decisions_required', value)}
      />

      <ReportSection
        title="Management Attention"
        value={report.management_attention}
        onChange={value => updateField('management_attention', value)}
      />
    </div>
  )
}

function ReportSection({
  title,
  value,
  onChange,
}: {
  title: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-[#c49e48]" />
        <h2 className="font-bold text-[#ede8de]">{title}</h2>
      </div>

      <textarea
        className="form-control"
        rows={4}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

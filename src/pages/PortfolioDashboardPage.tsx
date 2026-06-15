import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

type ProjectHealth =
  | 'Healthy'
  | 'Minor Attention'
  | 'Slow'
  | 'Stuck'
  | 'Critical'

export default function PortfolioDashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [snags, setSnags] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [procurement, setProcurement] = useState<any[]>([])
  const [financial, setFinancial] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPortfolioData()
  }, [])

  async function loadPortfolioData() {
    setLoading(true)

    const [
      projectsRes,
      risksRes,
      snagsRes,
      approvalsRes,
      procurementRes,
      financialRes,
      reportsRes,
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('risks').select('*'),
      supabase.from('snags').select('*'),
      supabase.from('approvals').select('*'),
      supabase.from('procurement').select('*'),
      supabase.from('financial').select('*'),
      supabase.from('weekly_reports').select('*'),
    ])

    setProjects(projectsRes.data || [])
    setRisks(risksRes.data || [])
    setSnags(snagsRes.data || [])
    setApprovals(approvalsRes.data || [])
    setProcurement(procurementRes.data || [])
    setFinancial(financialRes.data || [])
    setReports(reportsRes.data || [])

    setLoading(false)
  }

  const projectRows = useMemo(() => {
    return projects.map(project => {
      const projectId = project.id

      const projectRisks = risks.filter(item => item.project_id === projectId)
      const projectSnags = snags.filter(item => item.project_id === projectId)
      const projectApprovals = approvals.filter(
        item => item.project_id === projectId
      )
      const projectProcurement = procurement.filter(
        item => item.project_id === projectId
      )
      const projectFinancial = financial.filter(
        item => item.project_id === projectId
      )
      const projectReports = reports.filter(item => item.project_id === projectId)

      const openRisks = projectRisks.filter(item => item.status === 'Open')
      const highRisks = openRisks.filter(item => Number(item.risk_score || 0) >= 12)

      const openSnags = projectSnags.filter(item => item.status !== 'Closed')
      const criticalSnags = openSnags.filter(
        item => item.severity === 'Critical'
      )

      const pendingApprovals = projectApprovals.filter(
        item => item.status !== 'Approved' && item.status !== 'Rejected'
      )

      const pendingProcurement = projectProcurement.filter(
        item => item.status !== 'Delivered'
      )

      const contractSum = projectFinancial
        .filter(item => item.type === 'Contract Sum')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)

      const paidToDate = projectFinancial
        .filter(item =>
          ['Paid', 'Payment', 'Paid to Date'].includes(item.type)
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)

      const variations = projectFinancial
        .filter(item => item.type === 'Variation')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)

      const lastReport = projectReports
        .sort(
          (a, b) =>
            new Date(b.report_date || b.created_at).getTime() -
            new Date(a.report_date || a.created_at).getTime()
        )[0]

      const progress = Number(project.progress || project.progress_percent || 0)
      const scheduleVariance = Number(project.schedule_variance || 0)

      const health = calculateHealth({
        progress,
        scheduleVariance,
        highRisks: highRisks.length,
        openRisks: openRisks.length,
        criticalSnags: criticalSnags.length,
        openSnags: openSnags.length,
        pendingApprovals: pendingApprovals.length,
        pendingProcurement: pendingProcurement.length,
        lastReport,
      })

      return {
        project,
        progress,
        scheduleVariance,
        health,
        openRisks: openRisks.length,
        highRisks: highRisks.length,
        openSnags: openSnags.length,
        criticalSnags: criticalSnags.length,
        pendingApprovals: pendingApprovals.length,
        pendingProcurement: pendingProcurement.length,
        contractSum,
        paidToDate,
        variations,
        lastReport,
      }
    })
  }, [projects, risks, snags, approvals, procurement, financial, reports])

  const summary = useMemo(() => {
    const totalContractSum = projectRows.reduce(
      (sum, row) => sum + row.contractSum,
      0
    )

    const paidToDate = projectRows.reduce((sum, row) => sum + row.paidToDate, 0)

    const variations = projectRows.reduce((sum, row) => sum + row.variations, 0)

    return {
      totalProjects: projectRows.length,
      activeProjects: projectRows.filter(row => row.project.status !== 'Completed')
        .length,
      healthy: projectRows.filter(row => row.health === 'Healthy').length,
      slow: projectRows.filter(row => row.health === 'Slow').length,
      stuck: projectRows.filter(row => row.health === 'Stuck').length,
      critical: projectRows.filter(row => row.health === 'Critical').length,
      totalContractSum,
      paidToDate,
      variations,
      totalOpenRisks: projectRows.reduce((sum, row) => sum + row.openRisks, 0),
      totalHighRisks: projectRows.reduce((sum, row) => sum + row.highRisks, 0),
      totalOpenSnags: projectRows.reduce((sum, row) => sum + row.openSnags, 0),
      totalPendingApprovals: projectRows.reduce(
        (sum, row) => sum + row.pendingApprovals,
        0
      ),
      totalPendingProcurement: projectRows.reduce(
        (sum, row) => sum + row.pendingProcurement,
        0
      ),
    }
  }, [projectRows])

  const strugglingProjects = projectRows.filter(row =>
    ['Slow', 'Stuck', 'Critical'].includes(row.health)
  )

  if (loading) {
    return <div className="card p-6 text-slate-400">Loading portfolio dashboard…</div>
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Company Portfolio Control
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Portfolio Dashboard
        </h1>

        <p className="text-slate-400 mt-3 max-w-3xl">
          A central view of project delivery, financial exposure, risks,
          approvals, procurement pressure, reporting health, and struggling
          projects across the company.
        </p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric icon={Building2} title="Total Projects" value={summary.totalProjects} />
        <Metric icon={Activity} title="Active" value={summary.activeProjects} />
        <Metric icon={CheckCircle} title="Healthy" value={summary.healthy} good />
        <Metric icon={TrendingDown} title="Slow" value={summary.slow} warning />
        <Metric icon={ShieldAlert} title="Critical" value={summary.critical} danger />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-[#c49e48]" />
            <h2 className="text-lg font-bold text-[#ede8de]">
              Financial Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MoneyCard title="Total Contract Sum" value={summary.totalContractSum} />
            <MoneyCard title="Paid To Date" value={summary.paidToDate} />
            <MoneyCard title="Approved Variations" value={summary.variations} />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-[#c49e48]" />
            <h2 className="text-lg font-bold text-[#ede8de]">
              Portfolio Pressure
            </h2>
          </div>

          <PressureRow label="Open Risks" value={summary.totalOpenRisks} />
          <PressureRow label="High Risks" value={summary.totalHighRisks} danger />
          <PressureRow label="Open Snags" value={summary.totalOpenSnags} />
          <PressureRow label="Pending Approvals" value={summary.totalPendingApprovals} />
          <PressureRow label="Procurement Issues" value={summary.totalPendingProcurement} />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-[#c49e48]" />
          <h2 className="text-lg font-bold text-[#ede8de]">
            Projects Needing Attention
          </h2>
        </div>

        {strugglingProjects.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-500">
            No struggling projects detected.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {strugglingProjects.map(row => (
              <ProjectHealthCard key={row.project.id} row={row} />
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-[#c49e48]" />
          <h2 className="text-lg font-bold text-[#ede8de]">
            Portfolio Project Register
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Health</th>
                <th>Progress</th>
                <th>Schedule Var.</th>
                <th>Contract Sum</th>
                <th>Paid</th>
                <th>Risks</th>
                <th>Snags</th>
                <th>Approvals</th>
                <th>Procurement</th>
                <th>Last Report</th>
              </tr>
            </thead>

            <tbody>
              {projectRows.map(row => (
                <tr key={row.project.id}>
                  <td className="font-semibold text-[#ede8de]">
                    {row.project.project_name || row.project.name}
                  </td>
                  <td>{row.project.status || 'Active'}</td>
                  <td>
                    <HealthBadge health={row.health} />
                  </td>
                  <td>{row.progress}%</td>
                  <td>{row.scheduleVariance}%</td>
                  <td>{formatCurrency(row.contractSum || 0)}</td>
                  <td>{formatCurrency(row.paidToDate || 0)}</td>
                  <td>{row.openRisks}</td>
                  <td>{row.openSnags}</td>
                  <td>{row.pendingApprovals}</td>
                  <td>{row.pendingProcurement}</td>
                  <td>
                    {row.lastReport?.report_date
                      ? new Date(row.lastReport.report_date).toLocaleDateString(
                          'en-GB'
                        )
                      : 'No report'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function calculateHealth(input: {
  progress: number
  scheduleVariance: number
  highRisks: number
  openRisks: number
  criticalSnags: number
  openSnags: number
  pendingApprovals: number
  pendingProcurement: number
  lastReport?: any
}): ProjectHealth {
  let score = 100

  if (input.scheduleVariance < -20) score -= 30
  else if (input.scheduleVariance < -10) score -= 18
  else if (input.scheduleVariance < -5) score -= 8

  score -= input.highRisks * 8
  score -= input.openRisks * 2
  score -= input.criticalSnags * 6
  score -= input.openSnags * 1
  score -= input.pendingApprovals * 2
  score -= input.pendingProcurement * 2

  if (!input.lastReport) score -= 10

  if (score >= 80) return 'Healthy'
  if (score >= 65) return 'Minor Attention'
  if (score >= 50) return 'Slow'
  if (score >= 35) return 'Stuck'
  return 'Critical'
}

function Metric({
  icon: Icon,
  title,
  value,
  good,
  warning,
  danger,
}: {
  icon: any
  title: string
  value: number
  good?: boolean
  warning?: boolean
  danger?: boolean
}) {
  const color = danger
    ? 'text-red-400'
    : warning
    ? 'text-amber-400'
    : good
    ? 'text-emerald-400'
    : 'text-[#c49e48]'

  return (
    <div className="card p-4">
      <Icon size={18} className={color} />
      <div className={`font-display text-3xl font-bold mt-3 ${color}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}

function MoneyCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c]">
        {title}
      </div>
      <div className="text-xl font-bold text-[#ede8de] mt-2">
        {formatCurrency(value || 0)}
      </div>
    </div>
  )
}

function PressureRow({
  label,
  value,
  danger,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={danger ? 'text-red-400 font-bold' : 'text-[#ede8de]'}>
        {value}
      </span>
    </div>
  )
}

function ProjectHealthCard({ row }: { row: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-[#ede8de]">
            {row.project.project_name || row.project.name}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {row.project.status || 'Active'}
          </div>
        </div>

        <HealthBadge health={row.health} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <MiniStat label="Progress" value={`${row.progress}%`} />
        <MiniStat label="Schedule" value={`${row.scheduleVariance}%`} />
        <MiniStat label="Open Risks" value={row.openRisks} />
        <MiniStat label="Open Snags" value={row.openSnags} />
        <MiniStat label="Approvals" value={row.pendingApprovals} />
        <MiniStat label="Procurement" value={row.pendingProcurement} />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c]">
        {label}
      </div>
      <div className="text-sm font-bold text-[#ede8de] mt-1">{value}</div>
    </div>
  )
}

function HealthBadge({ health }: { health: ProjectHealth }) {
  const style =
    health === 'Healthy'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      : health === 'Minor Attention'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
      : health === 'Slow'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
      : health === 'Stuck'
      ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
      : 'border-red-500/20 bg-red-500/10 text-red-400'

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${style}`}>
      {health}
    </span>
  )
}

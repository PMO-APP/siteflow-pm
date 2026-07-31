import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { PortfolioHealthComparison } from '@/components/health'
import { ExecutiveCommandCentre } from '@/components/portfolio/ExecutiveCommandCentre'

type ProjectHealth =
  | 'Healthy'
  | 'Minor Attention'
  | 'Slow'
  | 'Stuck'
  | 'Critical'

type ChartProject = {
  id: number
  name: string
  score?: number
  status?: string
  health?: ProjectHealth
}

const HEALTH_COLORS: Record<ProjectHealth, string> = {
  Healthy: '#10b981',
  'Minor Attention': '#3b82f6',
  Slow: '#f59e0b',
  Stuck: '#f97316',
  Critical: '#ef4444',
}

const CHART_COLORS = [
  '#c49e48',
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
]

export default function PortfolioDashboardPage() {
  const navigate = useNavigate()

  const [organizations, setOrganizations] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [snags, setSnags] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [procurement, setProcurement] = useState<any[]>([])
  const [financial, setFinancial] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [externalTasks, setExternalTasks] = useState<any[]>([])
  const [internalTasks, setInternalTasks] = useState<any[]>([])
  const [qualityGates, setQualityGates] = useState<any[]>([])
  const [siteReports, setSiteReports] = useState<any[]>([])

  const [hseObservations, setHseObservations] = useState<any[]>([])
  const [hseIncidents, setHseIncidents] = useState<any[]>([])
  const [hseToolboxTalks, setHseToolboxTalks] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusLens, setFocusLens] = useState<'Executive' | 'Delivery' | 'Commercial' | 'Quality' | 'Risk'>('Executive')

  useEffect(() => {
    loadPortfolioData()
  }, [])

  async function loadPortfolioData() {
    setLoading(true)

    const [
      organizationsRes,
      projectsRes,
      milestonesRes,
      risksRes,
      snagsRes,
      approvalsRes,
      procurementRes,
      financialRes,
      reportsRes,
      externalTasksRes,
      internalTasksRes,
      qualityGatesRes,
      siteReportsRes,
      hseObservationsRes,
      hseIncidentsRes,
      hseToolboxTalksRes,
    ] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('project_milestones').select('*'),
      supabase.from('risks').select('*'),
      supabase.from('snags').select('*'),
      supabase.from('approvals').select('*'),
      supabase.from('procurement_items').select('*'),
      supabase.from('financial_items').select('*'),
      supabase.from('weekly_reports').select('*'),
      supabase.from('external_tasks').select('*'),
      supabase.from('internal_tasks').select('*'),
      supabase.from('quality_gates').select('*'),
      supabase.from('site_reports').select('*'),
      supabase.from('hse_observations').select('*'),
      supabase.from('hse_incidents').select('*'),
      supabase.from('hse_toolbox_talks').select('*'),
    ])

    setOrganizations(organizationsRes.data || [])
    setProjects(projectsRes.data || [])
    setMilestones(milestonesRes.data || [])
    setRisks(risksRes.data || [])
    setSnags(snagsRes.data || [])
    setApprovals(approvalsRes.data || [])
    setProcurement(procurementRes.data || [])
    setFinancial(financialRes.data || [])
    setReports(reportsRes.data || [])
    setExternalTasks(externalTasksRes.data || [])
    setInternalTasks(internalTasksRes.data || [])
    setQualityGates(qualityGatesRes.data || [])
    setSiteReports(siteReportsRes.data || [])
    setHseObservations(hseObservationsRes.data || [])
    setHseIncidents(hseIncidentsRes.data || [])
    setHseToolboxTalks(hseToolboxTalksRes.data || [])

    setLoading(false)
  }

  const projectRows = useMemo(() => {
    return projects.map(project => {
      const projectId = project.id

      const projectMilestones = milestones.filter(item => item.project_id === projectId)
      const projectRisks = risks.filter(item => item.project_id === projectId)
      const projectSnags = snags.filter(item => item.project_id === projectId)
      const projectApprovals = approvals.filter(item => item.project_id === projectId)
      const projectProcurement = procurement.filter(item => item.project_id === projectId)
      const projectFinancial = financial.filter(item => item.project_id === projectId)
      const projectReports = reports.filter(item => item.project_id === projectId)
      const projectExternalTasks = externalTasks.filter(item => item.project_id === projectId)
      const projectInternalTasks = internalTasks.filter(item => item.project_id === projectId)
      const projectQualityGates = qualityGates.filter(item => item.project_id === projectId)
      const projectSiteReports = siteReports.filter(item => item.project_id === projectId)

      const projectObservations = hseObservations.filter(item => item.project_id === projectId)
      const projectIncidents = hseIncidents.filter(item => item.project_id === projectId)
      const projectToolboxTalks = hseToolboxTalks.filter(item => item.project_id === projectId)

      const openObservations = projectObservations.filter(item => !isClosedStatus(item.status))

      const criticalObservations = openObservations.filter(item =>
        String(item.severity || '').toLowerCase().includes('critical')
      )

      const openIncidents = projectIncidents.filter(item => !isClosedStatus(item.status))

      const toolboxTalksThisMonth = projectToolboxTalks.filter(item => {
        if (!item.talk_date) return false

        const date = new Date(item.talk_date)
        const now = new Date()

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        )
      })

      const openRisks = projectRisks.filter(item => !isClosedStatus(item.status))
      const highRisks = openRisks.filter(item => {
        const score = Number(item.risk_score || item.score || item.rating || 0)
        const severity = String(item.severity || item.impact || '').toLowerCase()
        return score >= 12 || severity.includes('high') || severity.includes('critical')
      })

      const openSnags = projectSnags.filter(item => !isClosedStatus(item.status))
      const criticalSnags = openSnags.filter(item =>
        String(item.severity || item.priority || '').toLowerCase().includes('critical')
      )

      const pendingApprovals = projectApprovals.filter(
        item => !['approved', 'rejected', 'closed'].includes(String(item.status || '').toLowerCase())
      )

      const pendingProcurement = projectProcurement.filter(
        item => !['delivered', 'closed', 'completed'].includes(String(item.status || '').toLowerCase())
      )

      const delayedProcurement = projectProcurement.filter(item => {
        const status = String(item.status || '').toLowerCase()
        return status.includes('delay') || status.includes('overdue') || status.includes('stuck')
      })

      const allTasks = [...projectExternalTasks, ...projectInternalTasks]
      const overdueTasks = allTasks.filter(item => {
        if (!item.due_date) return false
        return new Date(item.due_date).getTime() < Date.now() && !isClosedStatus(item.status)
      })

      const completedMilestones = projectMilestones.filter(item =>
        ['completed', 'done', 'achieved'].includes(String(item.status || '').toLowerCase())
      )

      const progress =
        Number(project.progress || project.progress_percent || 0) ||
        calculatePercentage(completedMilestones.length, projectMilestones.length)

      const scheduleVariance =
        Number(project.schedule_variance || project.variance || 0) ||
        calculateScheduleVariance(projectMilestones)

      const contractSum = sumByKeywords(projectFinancial, [
        'contract',
        'contract sum',
        'budget',
        'original contract',
      ])

      const paidToDate = sumByKeywords(projectFinancial, [
        'paid',
        'payment',
        'paid to date',
      ])

      const variations = sumByKeywords(projectFinancial, [
        'variation',
        'change',
        'vo',
      ])

      const outstanding = Math.max(contractSum + variations - paidToDate, 0)
      const budgetConsumption = contractSum > 0 ? Math.round((paidToDate / contractSum) * 100) : 0

      const lastReport = [...projectReports, ...projectSiteReports]
        .sort(
          (a, b) =>
            new Date(b.report_date || b.created_at || 0).getTime() -
            new Date(a.report_date || a.created_at || 0).getTime()
        )[0]

      const daysSinceReport = lastReport
        ? Math.floor(
            (Date.now() -
              new Date(lastReport.report_date || lastReport.created_at).getTime()) /
              86400000
          )
        : null

      const failedQualityGates = projectQualityGates.filter(
        item => !['passed', 'approved', 'closed', 'completed'].includes(String(item.status || '').toLowerCase())
      )

      const score = calculateHealthScore({
        progress,
        scheduleVariance,
        highRisks: highRisks.length,
        openRisks: openRisks.length,
        criticalSnags: criticalSnags.length,
        openSnags: openSnags.length,
        pendingApprovals: pendingApprovals.length,
        pendingProcurement: pendingProcurement.length,
        delayedProcurement: delayedProcurement.length,
        overdueTasks: overdueTasks.length,
        failedQualityGates: failedQualityGates.length,
        budgetConsumption,
        daysSinceReport,
        openObservations: openObservations.length,
        criticalObservations: criticalObservations.length,
        openIncidents: openIncidents.length,
      })

      const health = getHealth(score)

      return {
        project,
        progress,
        scheduleVariance,
        health,
        score,
        openRisks: openRisks.length,
        highRisks: highRisks.length,
        openSnags: openSnags.length,
        criticalSnags: criticalSnags.length,
        pendingApprovals: pendingApprovals.length,
        pendingProcurement: pendingProcurement.length,
        delayedProcurement: delayedProcurement.length,
        overdueTasks: overdueTasks.length,
        failedQualityGates: failedQualityGates.length,
        openObservations: openObservations.length,
        criticalObservations: criticalObservations.length,
        openIncidents: openIncidents.length,
        toolboxTalks: projectToolboxTalks.length,
        toolboxTalksThisMonth: toolboxTalksThisMonth.length,
        contractSum,
        paidToDate,
        variations,
        outstanding,
        budgetConsumption,
        lastReport,
        daysSinceReport,
      }
    })
  }, [
    projects,
    milestones,
    risks,
    snags,
    approvals,
    procurement,
    financial,
    reports,
    externalTasks,
    internalTasks,
    qualityGates,
    siteReports,
    hseObservations,
    hseIncidents,
    hseToolboxTalks,
  ])

  const summary = useMemo(() => {
    return {
      totalProjects: projectRows.length,
      activeProjects: projectRows.filter(row =>
        ['active', 'execution', 'finishing'].includes(
          String(row.project.status || row.project.phase || '').toLowerCase()
        )
      ).length,
      healthy: projectRows.filter(row => row.health === 'Healthy').length,
      slow: projectRows.filter(row => row.health === 'Slow').length,
      stuck: projectRows.filter(row => row.health === 'Stuck').length,
      critical: projectRows.filter(row => row.health === 'Critical').length,
      totalContractSum: projectRows.reduce((sum, row) => sum + row.contractSum, 0),
      paidToDate: projectRows.reduce((sum, row) => sum + row.paidToDate, 0),
      variations: projectRows.reduce((sum, row) => sum + row.variations, 0),
      outstanding: projectRows.reduce((sum, row) => sum + row.outstanding, 0),
      totalOpenRisks: projectRows.reduce((sum, row) => sum + row.openRisks, 0),
      totalHighRisks: projectRows.reduce((sum, row) => sum + row.highRisks, 0),
      totalOpenSnags: projectRows.reduce((sum, row) => sum + row.openSnags, 0),
      totalPendingApprovals: projectRows.reduce((sum, row) => sum + row.pendingApprovals, 0),
      totalPendingProcurement: projectRows.reduce((sum, row) => sum + row.pendingProcurement, 0),
      overdueTasks: projectRows.reduce((sum, row) => sum + row.overdueTasks, 0),

      totalOpenObservations: projectRows.reduce((sum, row) => sum + row.openObservations, 0),
      totalCriticalObservations: projectRows.reduce((sum, row) => sum + row.criticalObservations, 0),
      totalOpenIncidents: projectRows.reduce((sum, row) => sum + row.openIncidents, 0),
      totalToolboxTalks: projectRows.reduce((sum, row) => sum + row.toolboxTalks, 0),
      totalToolboxTalksThisMonth: projectRows.reduce((sum, row) => sum + row.toolboxTalksThisMonth, 0),
    }
  }, [projectRows])

  const healthChartData = useMemo(() => {
    const labels: ProjectHealth[] = [
      'Healthy',
      'Minor Attention',
      'Slow',
      'Stuck',
      'Critical',
    ]

    return labels.map(label => {
      const rows = projectRows.filter(row => row.health === label)

      return {
        name: label,
        value: rows.length,
        fill: HEALTH_COLORS[label],
        projects: rows.map(row => ({
          id: row.project.id,
          name: projectName(row.project),
          score: row.score,
          health: row.health,
          status: row.project.status || 'Not Set',
        })),
      }
    })
  }, [projectRows])

  const statusChartData = useMemo(() => {
    const grouped: Record<string, ChartProject[]> = {}

    projectRows.forEach(row => {
      const status = row.project.status || 'Not Set'

      if (!grouped[status]) grouped[status] = []

      grouped[status].push({
        id: row.project.id,
        name: projectName(row.project),
        score: row.score,
        health: row.health,
        status,
      })
    })

    return Object.entries(grouped).map(([name, projects]) => ({
      name,
      value: projects.length,
      projects,
    }))
  }, [projectRows])

  const riskChartData = projectRows
    .map(row => ({
      name: projectName(row.project),
      risks: row.openRisks,
      highRisks: row.highRisks,
    }))
    .sort((a, b) => b.risks - a.risks)
    .slice(0, 10)

  const snagChartData = projectRows
    .map(row => ({
      name: projectName(row.project),
      snags: row.openSnags,
      critical: row.criticalSnags,
    }))
    .sort((a, b) => b.snags - a.snags)
    .slice(0, 10)

  const hseChartData = projectRows
    .map(row => ({
      name: projectName(row.project),
      observations: row.openObservations,
      critical: row.criticalObservations,
      incidents: row.openIncidents,
    }))
    .filter(row => row.observations > 0 || row.critical > 0 || row.incidents > 0)
    .sort((a, b) => b.incidents + b.critical + b.observations - (a.incidents + a.critical + a.observations))
    .slice(0, 10)

  const financeChartData = projectRows
    .filter(row => row.contractSum > 0 || row.paidToDate > 0)
    .map(row => ({
      name: projectName(row.project),
      contract: row.contractSum,
      paid: row.paidToDate,
      outstanding: row.outstanding,
    }))
    .slice(0, 10)

  const executiveAlerts = projectRows
    .filter(
      row =>
        row.health === 'Critical' ||
        row.score < 65 ||
        row.highRisks > 0 ||
        row.criticalObservations > 0 ||
        row.openIncidents > 0
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)

  const portfolioHealth = projectRows.length
    ? Math.round(projectRows.reduce((sum, row) => sum + row.score, 0) / projectRows.length)
    : 0

  const portfolioProgress = projectRows.length
    ? Math.round(projectRows.reduce((sum, row) => sum + row.progress, 0) / projectRows.length)
    : 0

  const projectsRequiringAttention = projectRows.filter(row => row.score < 65).length
  const projectsOnTrack = projectRows.filter(row => row.score >= 65).length
  const recoveryConfidence = Math.max(0, Math.min(100, portfolioHealth - Math.min(18, summary.totalHighRisks * 2)))

  const filteredRows = projectRows
    .filter(row => projectName(row.project).toLowerCase().includes(searchQuery.toLowerCase()))
    .slice()
    .sort((a, b) => a.score - b.score)

  const attentionLeader = executiveAlerts[0]
  const summarySentence = attentionLeader
    ? `${projectName(attentionLeader.project)} currently carries the greatest delivery pressure. ${projectsRequiringAttention} project${projectsRequiringAttention === 1 ? '' : 's'} require intervention, led by ${summary.totalHighRisks} high risks and ${summary.totalPendingApprovals} pending approvals across the portfolio.`
    : `Portfolio delivery remains stable. ${projectsOnTrack} project${projectsOnTrack === 1 ? '' : 's'} are currently on track, with no critical executive intervention identified.`

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f7f8f6] text-[#173f5f] flex items-center justify-center">
        <div className="rounded-2xl border border-[#dfe7e6] bg-white px-6 py-5 text-sm text-[#6c7f89] shadow-sm">
          Loading portfolio intelligence…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#f7f8f6] text-[#183044]">
      <div className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-[#dfe7e6] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <PMOCorexLogo size={38} tone="light" />
            <div className="hidden h-8 w-px bg-[#dfe7e6] sm:block" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d909a]">Executive portfolio</div>
              <div className="mt-1 text-sm font-semibold text-[#173f5f]">{organizations[0]?.name || 'Organization workspace'}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border border-[#d7e1e4] bg-white px-4 py-2.5 text-sm font-semibold text-[#405b69] shadow-sm transition hover:border-[#b9c9d0]">
              <ArrowLeft size={15} /> Back
            </button>
            <button onClick={() => navigate('/projects')} className="rounded-xl bg-[#173f5f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f334e]">
              Workspace hub
            </button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[28px] border border-[#dfe7e6] bg-white p-6 shadow-[0_10px_35px_rgba(24,56,76,0.05)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#edf2f2 1px, transparent 1px), linear-gradient(90deg, #edf2f2 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
          <div className="relative grid gap-8 xl:grid-cols-[1.5fr_.7fr] xl:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfdde2] bg-[#eef3f4] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2f6f91]">
                <Activity size={13} /> Portfolio overview
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-[#173f5f] sm:text-5xl">
                A clear view of where delivery needs attention.
              </h1>
              <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[#607580]">{summarySentence}</p>

              <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                <span className="font-semibold text-[#173f5f]">{summary.totalProjects} projects</span>
                <span className="text-[#71838d]">{projectsOnTrack} on track</span>
                <span className={projectsRequiringAttention ? 'font-semibold text-[#d86335]' : 'text-[#71838d]'}>{projectsRequiringAttention} require attention</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dfe7e6] bg-[#f9fbfb]/95 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#82939c]">Portfolio health</div>
                  <div className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-[#173f5f]">{portfolioHealth}%</div>
                </div>
                <HealthBadge health={getHealth(portfolioHealth)} />
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e6ecee]">
                <div className="h-full rounded-full bg-[#2f6f91] transition-all" style={{ width: `${portfolioHealth}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e1e8ea] pt-4">
                <MiniStat label="Portfolio progress" value={`${portfolioProgress}%`} />
                <MiniStat label="Recovery confidence" value={`${recoveryConfidence}%`} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#dfe7e6] bg-white shadow-sm md:grid-cols-4 xl:grid-cols-8">
          <KpiStrip label="Active projects" value={summary.activeProjects} />
          <KpiStrip label="Portfolio progress" value={`${portfolioProgress}%`} />
          <KpiStrip label="Open risks" value={summary.totalOpenRisks} alert={summary.totalHighRisks > 0} />
          <KpiStrip label="High risks" value={summary.totalHighRisks} alert={summary.totalHighRisks > 0} />
          <KpiStrip label="Approvals waiting" value={summary.totalPendingApprovals} />
          <KpiStrip label="Procurement issues" value={summary.totalPendingProcurement} />
          <KpiStrip label="Open snags" value={summary.totalOpenSnags} />
          <KpiStrip label="Overdue tasks" value={summary.overdueTasks} alert={summary.overdueTasks > 0} />
        </section>

        <ExecutiveCommandCentre
          rows={projectRows}
          onOpenProject={projectId => navigate(`/projects/${projectId}/dashboard`)}
        />

        <PortfolioHealthComparison projects={projects} />

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
          <div className="rounded-2xl border border-[#dfe7e6] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading eyebrow="Portfolio register" title="Project health" description="Sorted by projects requiring the earliest intervention." />
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82939c]" size={16} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects" className="w-full rounded-xl border border-[#dfe7e6] bg-[#f9fbfb] py-2.5 pl-9 pr-3 text-sm text-[#173f5f] outline-none transition placeholder:text-[#9fb4bd] focus:border-[#2f6f91] focus:bg-white" />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#dfe7e6] text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8d97]">
                    <th className="px-3 py-3">Project</th><th className="px-3 py-3">Health</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Schedule</th><th className="px-3 py-3">Risks</th><th className="px-3 py-3">Approvals</th><th className="px-3 py-3">Recovery</th><th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.project.id} className="group border-b border-[#edf2f2] transition hover:bg-[#f9fbfb]">
                      <td className="px-3 py-4"><div className="font-semibold text-[#173f5f]">{projectName(row.project)}</div><div className="mt-1 text-xs text-[#8a9da5]">{row.project.status || row.project.phase || 'Active'}</div></td>
                      <td className="px-3 py-4"><HealthBadge health={row.health} /></td>
                      <td className="px-3 py-4"><div className="font-semibold text-[#405b69]">{row.progress}%</div><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-[#e9eff1]"><div className="h-full rounded-full bg-[#2f6f91]" style={{ width: `${Math.min(100, row.progress)}%` }} /></div></td>
                      <td className="px-3 py-4"><span className={row.scheduleVariance < -10 ? 'font-semibold text-[#d86335]' : row.scheduleVariance < -5 ? 'font-semibold text-[#b17a2c]' : 'text-[#536974]'}>{row.scheduleVariance}%</span></td>
                      <td className="px-3 py-4"><span className="font-semibold text-[#405b69]">{row.openRisks}</span>{row.highRisks > 0 && <span className="ml-2 text-xs font-semibold text-[#d86335]">{row.highRisks} high</span>}</td>
                      <td className="px-3 py-4 text-[#536974]">{row.pendingApprovals}</td>
                      <td className="px-3 py-4"><span className="text-sm font-semibold text-[#2f6f91]">{Math.max(0, Math.min(100, row.score - row.highRisks * 2))}%</span></td>
                      <td className="px-3 py-4"><button onClick={() => navigate(`/projects/${row.project.id}/dashboard`)} className="rounded-lg p-2 text-[#78909b] transition hover:bg-[#eaf1f4] hover:text-[#173f5f]"><ChevronRight size={17} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && <div className="py-10 text-center text-sm text-[#82959e]">No project matches your search.</div>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[#dfe7e6] bg-[#173f5f] p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#bfd0d7]"><Sparkles size={15} /> Executive intelligence</div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">Portfolio delivery remains {portfolioHealth >= 65 ? 'recoverable' : 'under pressure'}.</h2>
              <p className="mt-4 text-sm leading-6 text-[#cfdcdf]">{summarySentence}</p>
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#bfd0d7]">Recommended focus</div>
                <div className="mt-2 text-sm font-semibold">{attentionLeader ? `Resolve the leading constraints on ${projectName(attentionLeader.project)} before they increase schedule exposure.` : 'Maintain current controls and protect reporting cadence.'}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dfe7e6] bg-white p-5 shadow-sm">
              <SectionHeading eyebrow="Executive watchlist" title="Attention required" />
              <div className="mt-4 space-y-3">
                {executiveAlerts.length ? executiveAlerts.slice(0, 4).map(row => (
                  <button key={row.project.id} onClick={() => navigate(`/projects/${row.project.id}/dashboard`)} className="w-full rounded-xl border border-[#e2e9ed] p-4 text-left transition hover:border-[#b8ccd5] hover:bg-[#f9fbfb]">
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-[#173f5f]">{projectName(row.project)}</span><HealthBadge health={row.health} /></div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#71838d]"><span>{row.highRisks} high risks</span><span>{row.pendingApprovals} approvals</span><span>{row.overdueTasks} overdue</span></div>
                  </button>
                )) : <div className="rounded-xl bg-[#f3f7f5] p-4 text-sm text-[#648074]">No critical intervention required.</div>}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#dfe7e6] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow="Focus mode" title="Review the portfolio through the right lens" description="Switch emphasis without changing the underlying project data." />
            <div className="flex flex-wrap gap-2">
              {(['Executive', 'Delivery', 'Commercial', 'Quality', 'Risk'] as const).map(lens => <button key={lens} onClick={() => setFocusLens(lens)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${focusLens === lens ? 'bg-[#173f5f] text-white' : 'border border-[#d9e2e5] bg-[#f9fbfb] text-[#607985] hover:border-[#a9c0ca]'}`}>{lens}</button>)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {focusLens === 'Commercial' ? <>
              <FocusCard icon={Wallet} label="Total contract sum" value={formatCurrency(summary.totalContractSum)} note="Portfolio baseline" />
              <FocusCard icon={Wallet} label="Paid to date" value={formatCurrency(summary.paidToDate)} note="Certified and recorded" />
              <FocusCard icon={AlertTriangle} label="Outstanding exposure" value={formatCurrency(summary.outstanding)} note="Unpaid portfolio balance" alert />
              <FocusCard icon={TrendingDown} label="Variations" value={formatCurrency(summary.variations)} note="Recorded change exposure" />
            </> : focusLens === 'Quality' ? <>
              <FocusCard icon={CheckCircle} label="Open snags" value={summary.totalOpenSnags} note="Across all projects" />
              <FocusCard icon={ShieldAlert} label="Open observations" value={summary.totalOpenObservations} note="HSE and site observations" />
              <FocusCard icon={AlertTriangle} label="Critical observations" value={summary.totalCriticalObservations} note="Immediate attention" alert />
              <FocusCard icon={Activity} label="Toolbox talks" value={summary.totalToolboxTalksThisMonth} note="Completed this month" />
            </> : focusLens === 'Risk' ? <>
              <FocusCard icon={AlertTriangle} label="Open risks" value={summary.totalOpenRisks} note="Portfolio-wide" />
              <FocusCard icon={ShieldAlert} label="High risks" value={summary.totalHighRisks} note="Executive review" alert />
              <FocusCard icon={Clock} label="Overdue tasks" value={summary.overdueTasks} note="Not yet closed" alert />
              <FocusCard icon={FileText} label="Approvals waiting" value={summary.totalPendingApprovals} note="Decision queue" />
            </> : <>
              <FocusCard icon={Activity} label="Portfolio health" value={`${portfolioHealth}%`} note="Weighted project position" />
              <FocusCard icon={BarChart3} label="Portfolio progress" value={`${portfolioProgress}%`} note="Average recorded progress" />
              <FocusCard icon={Building2} label="Projects on track" value={projectsOnTrack} note={`${projectsRequiringAttention} require attention`} />
              <FocusCard icon={TrendingDown} label="Recovery confidence" value={`${recoveryConfidence}%`} note="Current control confidence" />
            </>}
          </div>
        </section>
      </div>
    </div>
  )
}

function calculateHealthScore(input: any) {
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
  score -= input.delayedProcurement * 6
  score -= input.overdueTasks * 3
  score -= input.failedQualityGates * 4

  score -= (input.openObservations || 0) * 1
  score -= (input.criticalObservations || 0) * 8
  score -= (input.openIncidents || 0) * 10

  if (input.budgetConsumption > 100) score -= 18
  else if (input.budgetConsumption > 85) score -= 8

  if (input.daysSinceReport === null) score -= 10
  else if (input.daysSinceReport > 14) score -= 10
  else if (input.daysSinceReport > 7) score -= 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function getHealth(score: number): ProjectHealth {
  if (score >= 80) return 'Healthy'
  if (score >= 65) return 'Minor Attention'
  if (score >= 50) return 'Slow'
  if (score >= 35) return 'Stuck'
  return 'Critical'
}

function calculatePercentage(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function calculateScheduleVariance(milestones: any[]) {
  if (!milestones.length) return 0

  const delayed = milestones.filter(item => {
    if (!item.due_date && !item.planned_date) return false
    const due = new Date(item.due_date || item.planned_date).getTime()
    return due < Date.now() && !isClosedStatus(item.status)
  }).length

  return delayed ? -Math.min(30, delayed * 5) : 0
}

function sumByKeywords(items: any[], keywords: string[]) {
  return items
    .filter(item => {
      const label = String(
        item.type ||
          item.category ||
          item.item_type ||
          item.description ||
          item.title ||
          ''
      ).toLowerCase()

      return keywords.some(keyword => label.includes(keyword.toLowerCase()))
    })
    .reduce((sum, item) => sum + Number(item.amount || item.value || item.cost || 0), 0)
}

function isClosedStatus(status?: string) {
  return ['closed', 'completed', 'complete', 'done', 'approved', 'delivered', 'resolved'].includes(
    String(status || '').toLowerCase()
  )
}

function projectName(project: any) {
  return project.project_name || project.name || 'Unnamed Project'
}

function shortCurrency(value: number) {
  if (value >= 1_000_000_000) return `₦${Math.round(value / 1_000_000_000)}bn`
  if (value >= 1_000_000) return `₦${Math.round(value / 1_000_000)}m`
  if (value >= 1_000) return `₦${Math.round(value / 1_000)}k`
  return `₦${value}`
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#82939c]">{eyebrow}</div><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#173f5f]">{title}</h2>{description && <p className="mt-1 text-sm text-[#71838d]">{description}</p>}</div>
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b9da4]">{label}</div><div className="mt-1 text-lg font-semibold text-[#405b69]">{value}</div></div>
}

function KpiStrip({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return <div className="min-h-[92px] border-b border-r border-[#e5ebed] px-4 py-4 last:border-r-0 md:border-b-0"><div className={`text-2xl font-semibold tracking-[-0.035em] ${alert ? 'text-[#d86335]' : 'text-[#173f5f]'}`}>{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#83969f]">{label}</div></div>
}

function FocusCard({ icon: Icon, label, value, note, alert }: any) {
  return <div className="rounded-2xl border border-[#e2e9ed] bg-[#f9fbfa] p-5"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${alert ? 'bg-[#fff0e9] text-[#d86335]' : 'bg-[#eaf1f4] text-[#2f6f91]'}`}><Icon size={17} /></div><div className={`mt-5 text-2xl font-semibold tracking-[-0.04em] ${alert ? 'text-[#d86335]' : 'text-[#173f5f]'}`}>{value}</div><div className="mt-1 text-sm font-semibold text-[#45606e]">{label}</div><div className="mt-2 text-xs text-[#82939c]">{note}</div></div>
}

function HealthBadge({ health }: { health: ProjectHealth }) {
  const style = health === 'Healthy' ? 'border-[#b9daca] bg-[#edf7f1] text-[#317458]' : health === 'Minor Attention' ? 'border-[#cfdde2] bg-[#eef3f4] text-[#2f6f91]' : health === 'Slow' ? 'border-[#e8d5ad] bg-[#fbf5e9] text-[#9a6b22]' : health === 'Stuck' ? 'border-[#f0c4b2] bg-[#fff0e9] text-[#d86335]' : 'border-[#f0c4b2] bg-[#fff0e9] text-[#bd4f39]'
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${style}`}>{health}</span>
}

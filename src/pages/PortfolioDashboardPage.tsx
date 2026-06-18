import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  ShieldAlert,
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

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0c1014] text-white flex items-center justify-center">
        <div className="card p-6 text-slate-400">Loading portfolio dashboard…</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PMOCorexLogo size={42} />

          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="btn btn-ghost">
              <ArrowLeft size={15} />
              Back
            </button>

            <button onClick={() => navigate('/projects')} className="btn btn-gold">
              Workspace Hub
            </button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              Executive Portfolio Control
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-[#ede8de]">
              Portfolio Dashboard
            </h1>

            <p className="text-slate-400 mt-4 max-w-3xl">
              Workspace-level view of project delivery, financial exposure,
              risks, snags, HSE performance, approvals, procurement, reporting
              compliance, and intervention priorities across all projects.
            </p>

            <div className="mt-5 text-xs text-[#6e7d8c]">
              Workspace:{' '}
              <span className="text-[#c49e48]">
                {organizations[0]?.name || 'Organization'}
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Metric icon={Building2} title="Total Projects" value={summary.totalProjects} />
          <Metric icon={Activity} title="Active" value={summary.activeProjects} />
          <Metric icon={CheckCircle} title="Healthy" value={summary.healthy} good />
          <Metric icon={TrendingDown} title="Slow" value={summary.slow} warning />
          <Metric icon={ShieldAlert} title="Critical" value={summary.critical} danger />
          <Metric icon={Clock} title="Overdue Tasks" value={summary.overdueTasks} danger={summary.overdueTasks > 0} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="card p-5 xl:col-span-3">
            <SectionTitle icon={Wallet} title="Financial Overview" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <MoneyCard title="Total Contract Sum" value={summary.totalContractSum} />
              <MoneyCard title="Paid To Date" value={summary.paidToDate} />
              <MoneyCard title="Outstanding Exposure" value={summary.outstanding} />
              <MoneyCard title="Approved Variations" value={summary.variations} />
            </div>
          </div>

          <div className="card p-5">
            <SectionTitle icon={AlertTriangle} title="Portfolio Pressure" />

            <PressureRow label="Open Risks" value={summary.totalOpenRisks} />
            <PressureRow label="High Risks" value={summary.totalHighRisks} danger />
            <PressureRow label="Open Snags" value={summary.totalOpenSnags} />
            <PressureRow label="Pending Approvals" value={summary.totalPendingApprovals} />
            <PressureRow label="Procurement Issues" value={summary.totalPendingProcurement} />
          </div>

          <div className="card p-5">
            <SectionTitle icon={ShieldAlert} title="Portfolio Safety" />

            <PressureRow label="Open Observations" value={summary.totalOpenObservations} />
            <PressureRow label="Critical Observations" value={summary.totalCriticalObservations} danger />
            <PressureRow label="Open Incidents" value={summary.totalOpenIncidents} danger />
            <PressureRow label="Toolbox Talks" value={summary.totalToolboxTalks} />
            <PressureRow label="Talks This Month" value={summary.totalToolboxTalksThisMonth} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard title="Projects by Health Status">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={healthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#6e7d8c" fontSize={11} />
                <YAxis stroke="#6e7d8c" fontSize={11} allowDecimals={false} />
                <Tooltip content={<ProjectListTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {healthChartData.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <ProjectGroupDetails
              title="Health Status Details"
              groups={healthChartData}
              showScore
            />
          </ChartCard>

          <ChartCard title="Project Status Distribution">
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {statusChartData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ProjectListTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <ProjectGroupDetails
              title="Status Distribution Details"
              groups={statusChartData}
              showHealth
            />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ChartCard title="Top Projects by Open Risks">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="#6e7d8c" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#6e7d8c" fontSize={11} width={120} />
                <Tooltip content={<DarkTooltip />} />
                <Legend />
                <Bar dataKey="risks" fill="#c49e48" radius={[0, 8, 8, 0]} />
                <Bar dataKey="highRisks" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Projects by Open Snags">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={snagChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="#6e7d8c" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#6e7d8c" fontSize={11} width={120} />
                <Tooltip content={<DarkTooltip />} />
                <Legend />
                <Bar dataKey="snags" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                <Bar dataKey="critical" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Projects by HSE Pressure">
            {hseChartData.length === 0 ? (
              <EmptyChart message="No open HSE pressure recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hseChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="#6e7d8c" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#6e7d8c" fontSize={11} width={120} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend />
                  <Bar dataKey="observations" fill="#c49e48" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="critical" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="incidents" fill="#ef4444" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Financial Exposure by Project">
          {financeChartData.length === 0 ? (
            <EmptyChart message="No financial data available yet from financial_items." />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={financeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#6e7d8c" fontSize={11} />
                <YAxis stroke="#6e7d8c" fontSize={11} tickFormatter={shortCurrency} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                <Bar dataKey="contract" fill="#c49e48" radius={[8, 8, 0, 0]} />
                <Bar dataKey="paid" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="outstanding" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card p-5 xl:col-span-1">
            <SectionTitle icon={ShieldAlert} title="Executive Attention Required" />

            {executiveAlerts.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
                No critical intervention required.
              </div>
            ) : (
              <div className="space-y-3">
                {executiveAlerts.map(row => (
                  <div key={row.project.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#ede8de]">
                        {projectName(row.project)}
                      </div>
                      <HealthBadge health={row.health} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <span>Risks: {row.openRisks}</span>
                      <span>Snags: {row.openSnags}</span>
                      <span>HSE Obs: {row.openObservations}</span>
                      <span>Incidents: {row.openIncidents}</span>
                      <span>Approvals: {row.pendingApprovals}</span>
                      <span>Procurement: {row.pendingProcurement}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 xl:col-span-2">
            <SectionTitle icon={BarChart3} title="Portfolio Heatmap" />

            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Schedule</th>
                    <th>Risk</th>
                    <th>Snags</th>
                    <th>HSE</th>
                    <th>Approvals</th>
                    <th>Procurement</th>
                    <th>Finance</th>
                    <th>Reports</th>
                  </tr>
                </thead>

                <tbody>
                  {projectRows.map(row => (
                    <tr key={row.project.id}>
                      <td className="font-semibold text-[#ede8de]">
                        {projectName(row.project)}
                      </td>
                      <td><HeatCell value={row.scheduleVariance < -10 ? 3 : row.scheduleVariance < -5 ? 2 : 1} /></td>
                      <td><HeatCell value={row.highRisks > 0 ? 3 : row.openRisks > 3 ? 2 : 1} /></td>
                      <td><HeatCell value={row.criticalSnags > 0 ? 3 : row.openSnags > 5 ? 2 : 1} /></td>
                      <td><HeatCell value={row.openIncidents > 0 ? 3 : row.criticalObservations > 0 ? 2 : 1} /></td>
                      <td><HeatCell value={row.pendingApprovals > 5 ? 3 : row.pendingApprovals > 0 ? 2 : 1} /></td>
                      <td><HeatCell value={row.delayedProcurement > 0 ? 3 : row.pendingProcurement > 3 ? 2 : 1} /></td>
                      <td><HeatCell value={row.budgetConsumption > 100 ? 3 : row.budgetConsumption > 85 ? 2 : 1} /></td>
                      <td><HeatCell value={row.daysSinceReport === null ? 3 : row.daysSinceReport > 14 ? 3 : row.daysSinceReport > 7 ? 2 : 1} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle icon={FileText} title="Portfolio Project Register" />

          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Score</th>
                  <th>Progress</th>
                  <th>Schedule Var.</th>
                  <th>Contract Sum</th>
                  <th>Paid</th>
                  <th>Risks</th>
                  <th>Snags</th>
                  <th>HSE Obs</th>
                  <th>Incidents</th>
                  <th>Approvals</th>
                  <th>Procurement</th>
                  <th>Last Report</th>
                </tr>
              </thead>

              <tbody>
                {projectRows
                  .slice()
                  .sort((a, b) => a.score - b.score)
                  .map(row => (
                    <tr key={row.project.id}>
                      <td className="font-semibold text-[#ede8de]">
                        {projectName(row.project)}
                      </td>
                      <td>{row.project.status || 'Active'}</td>
                      <td><HealthBadge health={row.health} /></td>
                      <td>{row.score}%</td>
                      <td>{row.progress}%</td>
                      <td>{row.scheduleVariance}%</td>
                      <td>{formatCurrency(row.contractSum || 0)}</td>
                      <td>{formatCurrency(row.paidToDate || 0)}</td>
                      <td>{row.openRisks}</td>
                      <td>{row.openSnags}</td>
                      <td>{row.openObservations}</td>
                      <td>{row.openIncidents}</td>
                      <td>{row.pendingApprovals}</td>
                      <td>{row.pendingProcurement}</td>
                      <td>
                        {row.lastReport?.report_date || row.lastReport?.created_at
                          ? new Date(
                              row.lastReport.report_date ||
                                row.lastReport.created_at
                            ).toLocaleDateString('en-GB')
                          : 'No report'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
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

function SectionTitle({ icon: Icon, title }: any) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-[#c49e48]" />
      <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>
    </div>
  )
}

function Metric({ icon: Icon, title, value, good, warning, danger }: any) {
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

function PressureRow({ label, value, danger }: any) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={danger ? 'text-red-400 font-bold' : 'text-[#ede8de]'}>
        {value}
      </span>
    </div>
  )
}

function ChartCard({ title, children }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-[#c49e48]" />
        <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[250px] rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-sm text-slate-500">
      {message}
    </div>
  )
}

function ProjectGroupDetails({
  title,
  groups,
  showScore,
  showHealth,
}: {
  title: string
  groups: any[]
  showScore?: boolean
  showHealth?: boolean
}) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-[#6e7d8c] mb-3">
        {title}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.map(group => (
          <div key={group.name} className="rounded-xl border border-white/10 bg-[#0c1014]/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-[#ede8de]">
                {group.name}
              </div>

              <span className="rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 px-2 py-1 text-[10px] font-bold text-[#c49e48]">
                {group.value}
              </span>
            </div>

            {group.projects?.length > 0 ? (
              <div className="mt-3 space-y-2">
                {group.projects.map((project: ChartProject) => (
                  <div
                    key={`${group.name}-${project.id}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-slate-300 truncate">
                      {project.name}
                    </span>

                    <span className="text-[#6e7d8c] flex-shrink-0">
                      {showScore && typeof project.score === 'number'
                        ? `${project.score}%`
                        : showHealth && project.health
                        ? project.health
                        : project.status || ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-500">No projects</div>
            )}
          </div>
        ))}
      </div>
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

function HeatCell({ value }: { value: 1 | 2 | 3 }) {
  const style =
    value === 1
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
      : value === 2
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/20'
      : 'bg-red-500/20 text-red-400 border-red-500/20'

  const label = value === 1 ? 'Low' : value === 2 ? 'Med' : 'High'

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${style}`}>
      {label}
    </span>
  )
}

function ProjectListTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0]?.payload
  const projects: ChartProject[] = data?.projects || []

  return (
    <div className="rounded-xl border border-white/10 bg-[#0c1014] p-3 shadow-xl max-w-[320px]">
      <div className="text-xs font-bold text-[#ede8de] mb-1">
        {label || data?.name}
      </div>

      <div className="text-xs text-slate-400 mb-2">
        {data?.value || 0} project{data?.value === 1 ? '' : 's'}
      </div>

      {projects.length > 0 ? (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {projects.map(project => (
            <div
              key={project.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-[#c49e48] truncate">
                • {project.name}
              </span>

              <span className="text-slate-500 flex-shrink-0">
                {typeof project.score === 'number'
                  ? `${project.score}%`
                  : project.health || project.status || ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500">No projects</div>
      )}
    </div>
  )
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-[#0c1014] p-3 shadow-xl">
      <div className="text-xs font-bold text-[#ede8de] mb-2">{label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="text-xs text-slate-400">
          {item.name}: <span className="text-[#c49e48]">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-[#0c1014] p-3 shadow-xl">
      <div className="text-xs font-bold text-[#ede8de] mb-2">{label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="text-xs text-slate-400">
          {item.name}: <span className="text-[#c49e48]">{formatCurrency(item.value || 0)}</span>
        </div>
      ))}
    </div>
  )
}

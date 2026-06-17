import ExecutiveSummary from '@/components/dashboard/ExecutiveSummary'
import DeliveryPulse from '@/components/dashboard/DeliveryPulse'
import AIInsights from '@/components/dashboard/AIInsights'
import { useProjectStore } from '@/store/project'
import { differenceInDays } from 'date-fns'
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Package,
  FileCheck,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '@/hooks/useTasks'
import {
  useProcurement,
  useApprovals,
  useSnags,
  useRisks,
  useFinancial,
  useProjects,
} from '@/hooks/useData'
import { fdate, urgencyColor, formatCurrency } from '@/lib/utils'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const colorPool = [
  '#c49e48',
  '#4599d4',
  '#9b7fd4',
  '#3fad78',
  '#e05252',
  '#6b8e23',
  '#d4960e',
  '#8a5cf6',
]

const route = (path: string) => `/app${path}`

export default function Dashboard() {
  const navigate = useNavigate()
  const { projectId, projectName } = useProjectStore()

  const { data: taskData = [] } = useTasks()
  const { data: procData = [] } = useProcurement()
  const { data: approvalData = [] } = useApprovals()
  const { data: snagData = [] } = useSnags()
  const { data: riskData = [] } = useRisks()
  const { data: financialData = [] } = useFinancial()
  const { data: projectData = [] } = useProjects()

  const tasks = (taskData as any[]).filter(
    task => !projectId || task.project_id === projectId
  )

  const procs = procData as any[]
  const approvals = approvalData as any[]
  const snags = snagData as any[]
  const risks = riskData as any[]
  const financial = financialData as any[]
  const projects = projectData as any[]

  const project = projects.find((p: any) => p.id === projectId) || {}

  const today = new Date()

  const projectStartDate = project?.start_date
    ? new Date(project.start_date)
    : null

  const targetDate = project?.handover_date
    ? new Date(project.handover_date)
    : null

  const hasTimeline = !!projectStartDate && !!targetDate

  const daysLeft = targetDate
    ? Math.max(0, differenceInDays(targetDate, today))
    : null

  const totalDays = hasTimeline
    ? Math.max(1, differenceInDays(targetDate!, projectStartDate!))
    : 0

  const elapsed = hasTimeline
    ? differenceInDays(today, projectStartDate!)
    : 0

  const timelinePct = hasTimeline
    ? Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)))
    : 0

  const plannedPct = hasTimeline
    ? Math.min(100, Math.round((elapsed / totalDays) * 100))
    : 0

  const done = tasks.filter((t: any) => t.status === 'Completed').length
  const inProg = tasks.filter((t: any) => t.status === 'In Progress').length

  const overdue = tasks.filter((t: any) => {
    if (!t.finish_date) return false
    return new Date(t.finish_date) < today && t.status !== 'Completed'
  }).length

  const getTaskProgress = (t: any): number => {
    if (t.status === 'Completed') return 100
    if (t.status === 'Not Started') return 0
    return Number(t.progress_pct || 0)
  }

  const housebuildTasks = tasks.filter(
    t => (t.discipline || 'Housebuild') === 'Housebuild'
  )

  const mepTasks = tasks.filter(t => t.discipline === 'MEP')

  const infrastructureTasks = tasks.filter(
    t => t.discipline === 'Infrastructure'
  )

  const calcDisciplineProgress = (disciplineTasks: any[]) => {
    if (disciplineTasks.length === 0) return 0

    const totalWeight = disciplineTasks.reduce(
      (sum, task) => sum + Number(task.weight_pct || 1),
      0
    )

    if (totalWeight === 0) return 0

    const earnedWeight = disciplineTasks.reduce(
      (sum, task) =>
        sum +
        (Number(task.weight_pct || 1) * getTaskProgress(task)) / 100,
      0
    )

    return Math.round((earnedWeight / totalWeight) * 100)
  }

  const housebuildProgress = calcDisciplineProgress(housebuildTasks)
  const mepProgress = calcDisciplineProgress(mepTasks)
  const infrastructureProgress = calcDisciplineProgress(infrastructureTasks)

  const disciplineWeights = {
    Housebuild: 60,
    MEP: 25,
    Infrastructure: 15,
  }

  const hasDisciplineTasks =
    housebuildTasks.length + mepTasks.length + infrastructureTasks.length > 0

  const progressPct = hasDisciplineTasks
    ? Math.round(
        housebuildProgress * (disciplineWeights.Housebuild / 100) +
          mepProgress * (disciplineWeights.MEP / 100) +
          infrastructureProgress *
            (disciplineWeights.Infrastructure / 100)
      )
    : 0

  const variancePct =
    hasTimeline && tasks.length > 0 ? progressPct - plannedPct : null

  const varianceStatus =
    variancePct === null
      ? 'NO BASELINE'
      : variancePct >= 3
      ? 'AHEAD'
      : variancePct <= -3
      ? 'BEHIND'
      : 'ON TRACK'

  const procRisks = procs.filter((p: any) => {
    const d = p.order_by_date
      ? differenceInDays(new Date(p.order_by_date), today)
      : null

    return (
      d !== null &&
      d <= 14 &&
      p.status !== 'Delivered' &&
      p.status !== 'Ordered'
    )
  }).length

  const pendingApprovals = approvals.filter(
    (a: any) => a.status !== 'Approved' && a.status !== 'Rejected'
  ).length

  const overdueApprovals = approvals.filter((a: any) => {
    if (a.status === 'Approved') return false
    return a.deadline
      ? differenceInDays(new Date(a.deadline), today) < 0
      : false
  }).length

  const openSnags = snags.filter((s: any) => s.status !== 'Closed').length

  const criticalSnags = snags.filter(
    (s: any) => s.severity === 'Critical' && s.status !== 'Closed'
  ).length

  const openRisks = risks.filter((r: any) => r.status === 'Open').length

  const highRisks = risks.filter(
    (r: any) => r.status === 'Open' && Number(r.risk_score || 0) >= 12
  ).length

  const contractSum = financial
    .filter((f: any) => f.type === 'Contract Sum')
    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0)

  const variationsTotal = financial
    .filter((f: any) => f.type === 'Variation' && f.status === 'Approved')
    .reduce(
      (s: number, f: any) =>
        s +
        (f.direction === 'Addition'
          ? Number(f.amount || 0)
          : -Number(f.amount || 0)),
      0
    )

  const pendingVariationExposure = financial
    .filter((f: any) => f.type === 'Variation' && f.status === 'Pending')
    .reduce(
      (s: number, f: any) =>
        s +
        (f.direction === 'Addition'
          ? Number(f.amount || 0)
          : -Number(f.amount || 0)),
      0
    )

  const revisedContract = contractSum + variationsTotal
  const projectedFinalContractSum = revisedContract + pendingVariationExposure

  const paidTotal = financial
    .filter((f: any) => f.type === 'Payment' && f.status === 'Paid')
    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0)

  const costOverrunPct =
    contractSum > 0
      ? ((projectedFinalContractSum - contractSum) / contractSum) * 100
      : 0

  const paidPct =
    projectedFinalContractSum > 0
      ? (paidTotal / projectedFinalContractSum) * 100
      : 0

  const finalAccountForecast = projectedFinalContractSum - paidTotal

  const phaseList: string[] = Array.from(
    new Set(
      tasks
        .map((t: any) => t.phase)
        .filter((phase: any): phase is string => Boolean(phase))
    )
  )

  const phaseData = phaseList.map((ph: string, i: number) => {
    const pts = tasks.filter((t: any) => t.phase === ph)

    const completedWeight = pts.reduce((sum: number, t: any) => {
      if (t.status === 'Completed') return sum + 100
      if (t.status === 'In Progress') return sum + Number(t.progress_pct || 0)
      return sum
    }, 0)

    const pct = pts.length === 0 ? 0 : Math.round(completedWeight / pts.length)
    const completed = pts.filter((t: any) => t.status === 'Completed').length

    return {
      name: ph,
      pct,
      total: pts.length,
      done: completed,
      color: colorPool[i % colorPool.length],
    }
  })

  const statusPie = [
    { name: 'Completed', value: done, color: '#3fad78' },
    { name: 'In Progress', value: inProg, color: '#d4960e' },
    {
      name: 'Not Started',
      value: tasks.length - done - inProg,
      color: '#2a3a4a',
    },
  ].filter((s: any) => s.value > 0)

  const deadlines: {
    name: string
    date: string
    type: string
    days: number
  }[] = []

  tasks.forEach((t: any) => {
    if (t.procurement_deadline) {
      const d = differenceInDays(new Date(t.procurement_deadline), today)

      if (d >= 0 && d <= 21) {
        deadlines.push({
          name: t.name,
          date: t.procurement_deadline,
          type: 'Procurement',
          days: d,
        })
      }
    }

    if (t.approval_deadline) {
      const d = differenceInDays(new Date(t.approval_deadline), today)

      if (d >= 0 && d <= 21) {
        deadlines.push({
          name: t.name,
          date: t.approval_deadline,
          type: 'Approval',
          days: d,
        })
      }
    }
  })

  approvals
    .filter((a: any) => a.status !== 'Approved')
    .forEach((a: any) => {
      if (a.deadline) {
        const d = differenceInDays(new Date(a.deadline), today)

        if (d >= 0 && d <= 21) {
          deadlines.push({
            name: a.title,
            date: a.deadline,
            type: 'Approval',
            days: d,
          })
        }
      }
    })

  deadlines.sort((a, b) => a.days - b.days)

  const alerts: {
    level: 'red' | 'amber'
    msg: string
    action: string
  }[] = []

  if (overdue > 0) {
    alerts.push({
      level: 'red',
      msg: `${overdue} programme task${
        overdue > 1 ? 's are' : ' is'
      } past their planned finish date`,
      action: route('/schedule'),
    })
  }

  if (overdueApprovals > 0) {
    alerts.push({
      level: 'red',
      msg: `${overdueApprovals} approval${
        overdueApprovals > 1 ? 's have' : ' has'
      } missed its deadline — escalate now`,
      action: route('/approvals'),
    })
  }

  if (criticalSnags > 0) {
    alerts.push({
      level: 'red',
      msg: `${criticalSnags} critical snag${
        criticalSnags > 1 ? 's' : ''
      } open — blocking handover`,
      action: route('/snags'),
    })
  }

  if (highRisks > 0) {
    alerts.push({
      level: 'red',
      msg: `${highRisks} high-scoring risk${
        highRisks > 1 ? 's require' : ' requires'
      } immediate mitigation`,
      action: route('/risk'),
    })
  }

  if (procRisks > 0) {
    alerts.push({
      level: 'amber',
      msg: `${procRisks} procurement item${
        procRisks > 1 ? 's' : ''
      } approaching or past order deadline`,
      action: route('/procurement'),
    })
  }

  if (daysLeft !== null && daysLeft < 60) {
    alerts.push({
      level: 'amber',
      msg: `Only ${daysLeft} days to handover — review critical path immediately`,
      action: route('/schedule'),
    })
  }

  const calculateHandoverConfidence = () => {
    if (tasks.length === 0) return null

    let score = 100

    const taskCompletionFactor = 100 - progressPct
    const overdueRatio = tasks.length > 0 ? overdue / tasks.length : 0
    const riskRatio = risks.length > 0 ? highRisks / risks.length : 0
    const snagRatio = snags.length > 0 ? criticalSnags / snags.length : 0
    const approvalRatio =
      approvals.length > 0 ? overdueApprovals / approvals.length : 0
    const procurementRatio = procs.length > 0 ? procRisks / procs.length : 0

    score -= taskCompletionFactor * 0.25
    score -= overdueRatio * 25
    score -= riskRatio * 20
    score -= snagRatio * 18
    score -= approvalRatio * 15
    score -= procurementRatio * 15

    if (variancePct !== null && variancePct < 0) {
      score -= Math.abs(variancePct) * 1.5
    }

    if (!targetDate || !projectStartDate) {
      score -= 10
    }

    return Math.max(20, Math.min(95, Math.round(score)))
  }

  const handoverConfidence = calculateHandoverConfidence()

  const kpiCards = [
    {
      label: 'Progress',
      value: `${progressPct}%`,
      sub: `${done}/${tasks.length} tasks`,
      color: 'c-gold',
      icon: TrendingUp,
      link: route('/schedule'),
    },
    {
      label: 'Housebuild',
      value: `${housebuildProgress}%`,
      sub: `${housebuildTasks.length} tasks`,
      color: 'c-gold',
      icon: TrendingUp,
      link: route('/schedule'),
    },
    {
      label: 'MEP',
      value: `${mepProgress}%`,
      sub: `${mepTasks.length} tasks`,
      color: 'c-amr',
      icon: TrendingUp,
      link: route('/schedule'),
    },
    {
      label: 'Infrastructure',
      value: `${infrastructureProgress}%`,
      sub: `${infrastructureTasks.length} tasks`,
      color: 'c-grn',
      icon: TrendingUp,
      link: route('/schedule'),
    },
    {
      label: 'Schedule Variance',
      value: variancePct === null ? '—' : `${variancePct}%`,
      sub: varianceStatus,
      color:
        variancePct === null
          ? 'c-amr'
          : variancePct <= -3
          ? 'c-red'
          : variancePct >= 3
          ? 'c-grn'
          : 'c-amr',
      icon: TrendingUp,
      link: route('/schedule'),
    },
    {
      label: 'Overdue Tasks',
      value: overdue,
      sub: 'RED status',
      color: overdue > 0 ? 'c-red' : 'c-grn',
      icon: Clock,
      link: route('/schedule'),
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      sub: `${overdueApprovals} overdue`,
      color: pendingApprovals > 5 ? 'c-amr' : 'c-grn',
      icon: FileCheck,
      link: route('/approvals'),
    },
    {
      label: 'Procurement Risks',
      value: procRisks,
      sub: 'Order due ≤14d',
      color: procRisks > 0 ? 'c-red' : 'c-grn',
      icon: Package,
      link: route('/procurement'),
    },
    {
      label: 'Open Snags',
      value: openSnags,
      sub: `${criticalSnags} critical`,
      color:
        criticalSnags > 0 ? 'c-red' : openSnags > 0 ? 'c-amr' : 'c-grn',
      icon: AlertTriangle,
      link: route('/snags'),
    },
    {
      label: 'Open Risks',
      value: openRisks,
      sub: `${highRisks} high`,
      color: highRisks > 0 ? 'c-red' : 'c-grn',
      icon: Shield,
      link: route('/risk'),
    },
  ]

  return (
  <div className="space-y-6">
    {/* HERO */}
    <div className="dashboard-hero relative rounded-xl p-5 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_50%,rgba(196,158,72,0.05),transparent)]" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
        <div>
          <div
            className={`font-display text-7xl font-black leading-none ${
              daysLeft !== null && daysLeft < 60
                ? 'text-red-400'
                : 'text-[#c49e48]'
            }`}
          >
            {daysLeft ?? '-'}
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6e7d8c] mt-1">
            Days Remaining
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] text-[#6e7d8c] uppercase tracking-widest mb-1">
            {projectName}
          </div>

          <div className="text-[10px] text-[#6e7d8c] uppercase tracking-widest mb-1">
            Formal Handover Target
          </div>

          <div className="font-display text-xl font-semibold text-[#ede8de]">
            {targetDate
              ? targetDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : 'No handover date set'}
          </div>

          <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c49e48] to-[#e3c06a]"
              style={{ width: `${timelinePct}%` }}
            />
          </div>

          <div className="text-[10px] text-[#6e7d8c] mt-1">
            {timelinePct}% of timeline elapsed
          </div>
        </div>
      </div>
    </div>

    {/* KPI CARDS */}
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {kpiCards.map((k: any) => {
        const Icon = k.icon

        return (
          <div
            key={k.label}
            className="stat-card cursor-pointer hover:border-[#c49e48]/20 transition-colors group"
            onClick={() => navigate(k.link)}
          >
            <div
              className={`gold-bar ${
                k.color === 'c-red'
                  ? '!bg-red-500'
                  : k.color === 'c-amr'
                  ? '!bg-amber-500'
                  : k.color === 'c-grn'
                  ? '!bg-emerald-500'
                  : ''
              }`}
            />

            <div className="flex items-start justify-between">
              <div>
                <div className="stat-number text-3xl">{k.value}</div>
                <div className="stat-label">{k.label}</div>
                <div className="stat-sub">{k.sub}</div>
              </div>

              <Icon
                size={16}
                className="text-[#6e7d8c] group-hover:text-[#c49e48] transition-colors mt-1"
              />
            </div>
          </div>
        )
      })}
    </div>

    {/* INTELLIGENCE ROW */}
    <div className="grid xl:grid-cols-2 gap-5">
      <DeliveryPulse
        progress={progressPct}
        variance={variancePct}
        openRisks={openRisks}
        overdueTasks={overdue}
      />

      <AIInsights
        overdueTasks={overdue}
        procurementRisks={procRisks}
        highRisks={highRisks}
        variance={variancePct ?? 0}
        handoverConfidence={handoverConfidence ?? 0}
      />
    </div>

    <ExecutiveSummary
      projectName={projectName}
      progress={progressPct}
      variance={variancePct}
      overdueTasks={overdue}
      openRisks={openRisks}
      highRisks={highRisks}
      pendingApprovals={pendingApprovals}
      procurementRisks={procRisks}
    />

    {/* FINANCIAL SUMMARY */}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="card p-4">
        <div className="text-xs text-slate-500">Contract Sum</div>
        <div className="text-2xl font-bold text-[#ede8de]">
          {formatCurrency(contractSum)}
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs text-slate-500">Approved Variations</div>
        <div className="text-2xl font-bold text-[#ede8de]">
          {formatCurrency(variationsTotal)}
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs text-slate-500">Paid To Date</div>
        <div className="text-2xl font-bold text-[#ede8de]">
          {formatCurrency(paidTotal)}
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs text-slate-500">Final Forecast</div>
        <div className="text-2xl font-bold text-[#ede8de]">
          {formatCurrency(projectedFinalContractSum)}
        </div>
      </div>
    </div>

    {/* ACTIVITIES + DEADLINES */}
    <div className="grid xl:grid-cols-2 gap-5">
      <div className="card overflow-hidden">
        <div className="card-head">
          <div className="card-title">Current Activities</div>
        </div>

        <div className="p-4 space-y-3">
          {tasks.filter(t => t.status === 'In Progress').length === 0 ? (
            <div className="text-sm text-slate-500">
              No current activities in progress.
            </div>
          ) : (
            tasks
              .filter(t => t.status === 'In Progress')
              .slice(0, 8)
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="text-[#ede8de] font-medium truncate">
                      {task.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {task.phase || 'No phase'}
                    </div>
                  </div>

                  <div className="text-[#c49e48] font-semibold">
                    {getTaskProgress(task)}%
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <div className="card-title">Upcoming Deadlines</div>
        </div>

        <div className="p-4 space-y-3">
          {deadlines.length === 0 ? (
            <div className="text-sm text-slate-500">
              No deadlines due within the next 21 days.
            </div>
          ) : (
            deadlines.slice(0, 10).map(item => (
              <div
                key={`${item.name}-${item.date}-${item.type}`}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="min-w-0">
                  <div className="text-[#ede8de] font-medium truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.type} • {fdate(item.date)}
                  </div>
                </div>

                <span className={urgencyColor(item.days)}>
                  {item.days}d
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

    {/* PHASE + STATUS */}
    <div className="grid xl:grid-cols-3 gap-5">
      <div className="card xl:col-span-2 overflow-hidden">
        <div className="card-head">
          <div className="card-title">Phase Progress</div>
        </div>

        <div className="p-4 space-y-4">
          {phaseData.length === 0 ? (
            <div className="text-sm text-slate-500">
              No phase data available.
            </div>
          ) : (
            phaseData.map(phase => (
              <div key={phase.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#ede8de]">{phase.name}</span>
                  <span className="text-[#ede8de]">{phase.pct}%</span>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${phase.pct}%`,
                      background: phase.color,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <div className="card-title">Task Status Breakdown</div>
        </div>

        <div className="p-4">
          {statusPie.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
              No task status data available.
            </div>
          ) : (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {statusPie.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-3">
                {statusPie.map(item => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: item.color }}
                      />
                      <span className="text-slate-400">{item.name}</span>
                    </div>

                    <span className="text-[#ede8de] font-semibold">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
)
}

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
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

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

  const { data: tasks = [] } = useTasks()
  const { data: procs = [] } = useProcurement()
  const { data: approvals = [] } = useApprovals()
  const { data: snags = [] } = useSnags()
  const { data: risks = [] } = useRisks()
  const { data: financial = [] } = useFinancial()
  const { data: projects = [] } = useProjects()

  const project =
    projects.find((p: any) => p.id === projectId) || {}

  const today = new Date()

  const projectStartDate =
    project?.start_date ? new Date(project.start_date) : null

  const targetDate =
    project?.handover_date ? new Date(project.handover_date) : null

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
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round((elapsed / totalDays) * 100)
        )
      )
    : 0

  const plannedPct = hasTimeline
    ? Math.min(
        100,
        Math.round((elapsed / totalDays) * 100)
      )
    : 0

  const done = tasks.filter(t => t.status === 'Completed').length
  const inProg = tasks.filter(t => t.status === 'In Progress').length

  const overdue = tasks.filter(t => {
    if (!t.finish_date) return false
    return new Date(t.finish_date) < today && t.status !== 'Completed'
  }).length

  const getTaskProgress = (t: any): number => {
    if (t.status === 'Completed') return 100
    if (t.status === 'Not Started') return 0
    return Number(t.progress_pct || 0)
  }

  const progressPct =
    tasks.length === 0
      ? 0
      : Math.round(
          tasks.reduce((sum, t) => sum + getTaskProgress(t), 0) /
            tasks.length
        )

  const variancePct =
    hasTimeline && tasks.length > 0
      ? progressPct - plannedPct
      : null

  const varianceStatus =
    variancePct === null
      ? 'NO BASELINE'
      : variancePct >= 3
      ? 'AHEAD'
      : variancePct <= -3
      ? 'BEHIND'
      : 'ON TRACK'

  const procRisks = procs.filter(p => {
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

  const pendingApprovals =
    approvals.filter(a => a.status !== 'Approved' && a.status !== 'Rejected')
      .length

  const overdueApprovals = approvals.filter(a => {
    if (a.status === 'Approved') return false
    return a.deadline
      ? differenceInDays(new Date(a.deadline), today) < 0
      : false
  }).length

  const openSnags = snags.filter(s => s.status !== 'Closed').length

  const criticalSnags =
    snags.filter(s => s.severity === 'Critical' && s.status !== 'Closed')
      .length

  const openRisks = risks.filter(r => r.status === 'Open').length

  const highRisks =
    risks.filter(r => r.status === 'Open' && (r.risk_score || 0) >= 12)
      .length

  const contractSum =
    financial
      .filter(f => f.type === 'Contract Sum')
      .reduce((s, f) => s + f.amount, 0)

  const variationsTotal =
    financial
      .filter(f => f.type === 'Variation' && f.status === 'Approved')
      .reduce(
        (s, f) => s + (f.direction === 'Addition' ? f.amount : -f.amount),
        0
      )

  const certifiedTotal =
    financial
      .filter(f => f.type === 'Payment' && f.status === 'Certified')
      .reduce((s, f) => s + f.amount, 0)

  const phaseList = [
    ...new Set(tasks.map((t: any) => t.phase).filter(Boolean)),
  ]

  const phaseData = phaseList.map((ph, i) => {
    const pts = tasks.filter(t => t.phase === ph)

    const completedWeight = pts.reduce((sum, t) => {
      if (t.status === 'Completed') return sum + 100
      if (t.status === 'In Progress') return sum + Number(t.progress_pct || 0)
      return sum
    }, 0)

    const pct =
      pts.length === 0 ? 0 : Math.round(completedWeight / pts.length)

    const completed = pts.filter(t => t.status === 'Completed').length

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
  ].filter(s => s.value > 0)

  const deadlines: {
    name: string
    date: string
    type: string
    days: number
  }[] = []

  tasks.forEach(t => {
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
    .filter(a => a.status !== 'Approved')
    .forEach(a => {
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
      msg: `${overdue} programme task${overdue > 1 ? 's are' : ' is'} past their planned finish date`,
      action: route('/schedule'),
    })
  }

  if (overdueApprovals > 0) {
    alerts.push({
      level: 'red',
      msg: `${overdueApprovals} approval${overdueApprovals > 1 ? 's have' : ' has'} missed its deadline — escalate now`,
      action: route('/approvals'),
    })
  }

  if (criticalSnags > 0) {
    alerts.push({
      level: 'red',
      msg: `${criticalSnags} critical snag${criticalSnags > 1 ? 's' : ''} open — blocking handover`,
      action: route('/snags'),
    })
  }

  if (highRisks > 0) {
    alerts.push({
      level: 'red',
      msg: `${highRisks} high-scoring risk${highRisks > 1 ? 's require' : ' requires'} immediate mitigation`,
      action: route('/risk'),
    })
  }

  if (procRisks > 0) {
    alerts.push({
      level: 'amber',
      msg: `${procRisks} procurement item${procRisks > 1 ? 's' : ''} approaching or past order deadline`,
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

// ==========================================
// AI HANDOVER CONFIDENCE ENGINE
// ==========================================
const calculateHandoverConfidence = () => {
  if (tasks.length === 0) return null

  let score = 100

  const taskCompletionFactor = 100 - progressPct

  const overdueRatio =
    tasks.length > 0 ? overdue / tasks.length : 0

  const riskRatio =
    risks.length > 0 ? highRisks / risks.length : 0

  const snagRatio =
    snags.length > 0 ? criticalSnags / snags.length : 0

  const approvalRatio =
    approvals.length > 0 ? overdueApprovals / approvals.length : 0

  const procurementRatio =
    procs.length > 0 ? procRisks / procs.length : 0

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

return (
    <div className="space-y-5">
      <div className="relative bg-gradient-to-r from-[#161f28] via-[#1c2a36] to-[#161f28] border border-[#c49e48]/15 rounded-xl p-5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_50%,rgba(196,158,72,0.05),transparent)]" />

        <div className="relative flex items-center gap-8">
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

          <div className="hidden lg:flex flex-col gap-2">
            {alerts.slice(0, 2).map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer ${
                  a.level === 'red'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
                onClick={() => navigate(a.action)}
              >
                <AlertTriangle size={11} />
                {a.msg.length > 45 ? a.msg.slice(0, 45) + '…' : a.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          {
            label: 'Progress',
            value: `${progressPct}%`,
            sub: `${done}/${tasks.length} tasks`,
            color: 'c-gold',
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
              criticalSnags > 0
                ? 'c-red'
                : openSnags > 0
                ? 'c-amr'
                : 'c-grn',
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
        ].map(k => (
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
                <div className="stat-number text-3xl">
                  {k.value}
                </div>

                <div className="stat-label">
                  {k.label}
                </div>

                <div className="stat-sub">
                  {k.sub}
                </div>
              </div>

              <k.icon
                size={16}
                className="text-[#6e7d8c] group-hover:text-[#c49e48] transition-colors mt-1"
              />
            </div>
          </div>
        ))}
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Phase Progress</div>
            <button
              className="tbl-action"
              onClick={() => navigate(route('/schedule'))}
            >
              Schedule →
            </button>
          </div>

          <div className="p-4 space-y-3">
            {phaseData.length === 0 ? (
              <div className="empty-state py-8">
                No phase data yet.
              </div>
            ) : (
              phaseData.map(ph => (
                <div key={ph.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[11px] text-[#bfb9ae] font-medium">
                      {ph.name}
                    </div>

                    <div className="text-[10px] text-[#6e7d8c]">
                      {ph.done}/{ph.total} · {ph.pct}%
                    </div>
                  </div>

                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${ph.pct}%`,
                        background: ph.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Task Status</div>
          </div>

          <div className="p-4 flex items-center gap-4">
            {statusPie.length === 0 ? (
              <div className="empty-state py-8 w-full">
                No task status data yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPie.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 flex-1">
                  {statusPie.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: s.color }}
                      />

                      <div className="text-[11px] text-[#bfb9ae] flex-1">
                        {s.name}
                      </div>

                      <div className="text-[11px] font-mono text-[#6e7d8c]">
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Financial Summary</div>
            <button
              className="tbl-action"
              onClick={() => navigate(route('/financial'))}
            >
              View →
            </button>
          </div>

          <div className="p-4 space-y-3">
            {[
              {
                label: 'Contract Sum',
                value: contractSum,
                color: 'text-[#c49e48]',
              },
              {
                label: 'Approved Variations',
                value: variationsTotal,
                color:
                  variationsTotal >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400',
              },
              {
                label: 'Revised Contract',
                value: contractSum + variationsTotal,
                color: 'text-[#ede8de]',
              },
              {
                label: 'Certified to Date',
                value: certifiedTotal,
                color: 'text-blue-400',
              },
            ].map(f => (
              <div
                key={f.label}
                className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="text-[11px] text-[#6e7d8c]">
                  {f.label}
                </div>

                <div className={`text-[12px] font-mono font-medium ${f.color}`}>
                  {f.value === 0 ? 'TBC' : formatCurrency(f.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-head">
            <div className="card-title">⚡ Smart Alerts</div>
            <span className="text-[9px] font-mono text-[#6e7d8c]">
              AI-GENERATED
            </span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {alerts.length === 0 ? (
              <div className="empty-state py-8">
                <div className="text-2xl mb-2">✅</div>
                <p>No critical alerts. Project on track.</p>
              </div>
            ) : (
              alerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                    a.level === 'red'
                      ? 'border-l-2 border-red-500'
                      : 'border-l-2 border-amber-500'
                  }`}
                  onClick={() => navigate(a.action)}
                >
                  <AlertTriangle
                    size={13}
                    className={
                      a.level === 'red'
                        ? 'text-red-400 flex-shrink-0 mt-0.5'
                        : 'text-amber-400 flex-shrink-0 mt-0.5'
                    }
                  />

                  <div className="text-[12px] text-[#bfb9ae] flex-1">
                    {a.msg}
                  </div>

                  <ChevronRight
                    size={12}
                    className="text-[#6e7d8c] flex-shrink-0 mt-0.5"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Upcoming Deadlines</div>
            <span className="text-[9px] font-mono text-[#6e7d8c]">
              NEXT 21 DAYS
            </span>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
            {deadlines.length === 0 ? (
              <div className="empty-state py-8">
                <p>No deadlines in next 21 days ✅</p>
              </div>
            ) : (
              deadlines.slice(0, 10).map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background:
                        d.days === 0
                          ? '#e05252'
                          : d.days <= 7
                          ? '#e05252'
                          : d.days <= 14
                          ? '#d4960e'
                          : '#3fad78',
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#bfb9ae] truncate">
                      {d.name}
                    </div>

                    <div className="text-[9px] text-[#6e7d8c]">
                      {d.type} · {fdate(d.date)}
                    </div>
                  </div>

                  <div className={`text-[11px] font-bold font-mono ${urgencyColor(d.days)}`}>
                    {d.days === 0 ? 'TODAY' : `${d.days}d`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Active & At-Risk Tasks</div>
            <button
              className="tbl-action"
              onClick={() => navigate(route('/schedule'))}
            >
              All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task</th>
                  <th>Finish</th>
                  <th>RAG</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {tasks
                  .filter(
                    t =>
                      t.rag === 'RED' ||
                      t.rag === 'AMBER' ||
                      t.status === 'In Progress'
                  )
                  .slice(0, 6)
                  .map(t => (
                    <tr key={t.id}>
                      <td className="font-mono text-[#6e7d8c] text-[10px]">
                        #{t.task_number}
                      </td>

                      <td className="max-w-[160px] truncate text-[#ede8de]">
                        {t.name}
                      </td>

                      <td>{fdate(t.finish_date)}</td>

                      <td>
                        <span
                          className={`badge ${
                            t.rag === 'RED'
                              ? 'badge-red'
                              : t.rag === 'AMBER'
                              ? 'badge-amber'
                              : 'badge-green'
                          }`}
                        >
                          {t.rag || '—'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            t.status === 'Completed'
                              ? 'badge-green'
                              : t.status === 'In Progress'
                              ? 'badge-amber'
                              : 'badge-muted'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                {tasks.filter(
                  t =>
                    t.rag === 'RED' ||
                    t.rag === 'AMBER' ||
                    t.status === 'In Progress'
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-6 text-[#6e7d8c]"
                    >
                      No active or at-risk tasks ✅
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Top Risks</div>
            <button
              className="tbl-action"
              onClick={() => navigate(route('/risk'))}
            >
              Register →
            </button>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
            {risks
              .filter(r => r.status === 'Open')
              .slice(0, 6)
              .map(r => {
                const score = r.risk_score || r.likelihood * r.impact
                const lvl =
                  score >= 15
                    ? 'badge-red'
                    : score >= 10
                    ? 'badge-amber'
                    : 'badge-muted'

                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 px-4 py-2.5"
                  >
                    <span className={`badge ${lvl} mt-0.5 flex-shrink-0`}>
                      {score}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#bfb9ae] truncate">
                        {r.title}
                      </div>

                      <div className="text-[9px] text-[#6e7d8c]">
                        {r.category}
                      </div>
                    </div>
                  </div>
                )
              })}

            {risks.filter(r => r.status === 'Open').length === 0 && (
              <div className="empty-state py-8">
                <p>No open risks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

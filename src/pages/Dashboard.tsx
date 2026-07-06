import { useEffect, useMemo, useState } from 'react'
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
import { supabase } from '@/lib/supabase'
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

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) return false
  return String(a) === String(b)
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function toDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getTaskStart(task: any) {
  return task.planned_start || task.start_date
}

function getTaskFinish(task: any) {
  return task.planned_finish || task.finish_date
}

function getTaskProgress(task: any): number {
  if (task.status === 'Completed') return 100
  if (task.status === 'Not Started') return 0
  return clamp(Number(task.progress_pct || 0))
}

function getTaskStatus(task: any) {
  const progress = getTaskProgress(task)
  const finish = toDate(getTaskFinish(task))
  const today = new Date()

  if (task.is_blocked) return 'Blocked'
  if (task.is_on_hold) return 'On Hold'
  if (progress >= 100 || task.status === 'Completed') return 'Completed'
  if (progress > 0 && finish && finish < today) return 'Behind'
  if (progress > 0 || task.status === 'In Progress') return 'In Progress'
  return 'Not Started'
}

function calcWeightedProgress(tasks: any[]) {
  if (!tasks.length) return 0

  const totalWeight = tasks.reduce(
    (sum, task) => sum + Number(task.weight_pct || 0),
    0
  )

  if (totalWeight === 0) {
    return Math.round(
      tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) /
        tasks.length
    )
  }

  const earnedWeight = tasks.reduce(
    (sum, task) =>
      sum + (Number(task.weight_pct || 0) * getTaskProgress(task)) / 100,
    0
  )

  return Math.round((earnedWeight / totalWeight) * 100)
}

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

  const [costContracts, setCostContracts] = useState<any[]>([])
  const [costPayments, setCostPayments] = useState<any[]>([])
  const [costVariations, setCostVariations] = useState<any[]>([])
  const [costProcurements, setCostProcurements] = useState<any[]>([])
  const [designSubmissions, setDesignSubmissions] = useState<any[]>([])
  const [costSubmissions, setCostSubmissions] = useState<any[]>([])

  useEffect(() => {
    loadDashboardLiveData()
  }, [projectId])

  async function loadDashboardLiveData() {
    if (!projectId) {
      setCostContracts([])
      setCostPayments([])
      setCostVariations([])
      setCostProcurements([])
      setDesignSubmissions([])
      setCostSubmissions([])
      return
    }

    const [
      contractResult,
      paymentResult,
      variationResult,
      procurementResult,
      designReportResult,
      costReportResult,
    ] = await Promise.all([
      supabase
        .from('cost_contracts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('cost_payments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('cost_variations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('cost_procurements')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('design_report_submissions')
        .select('*')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false }),

      supabase
        .from('cost_report_submissions')
        .select('*')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false }),
    ])

    setCostContracts(contractResult.data || [])
    setCostPayments(paymentResult.data || [])
    setCostVariations(variationResult.data || [])
    setCostProcurements(procurementResult.data || [])
    setDesignSubmissions(designReportResult.data || [])
    setCostSubmissions(costReportResult.data || [])
  }

  const today = new Date()

  const tasks = useMemo(
    () =>
      (taskData as any[])
        .filter(task => !projectId || sameId(task.project_id, projectId))
        .sort((a, b) => Number(a.task_number || 0) - Number(b.task_number || 0)),
    [taskData, projectId]
  )

  const procs = useMemo(
    () =>
      (procData as any[]).filter(
        item => !projectId || !item.project_id || sameId(item.project_id, projectId)
      ),
    [procData, projectId]
  )

  const approvals = useMemo(
    () =>
      (approvalData as any[]).filter(
        item => !projectId || !item.project_id || sameId(item.project_id, projectId)
      ),
    [approvalData, projectId]
  )

  const snags = useMemo(
    () =>
      (snagData as any[]).filter(
        item => !projectId || !item.project_id || sameId(item.project_id, projectId)
      ),
    [snagData, projectId]
  )

  const risks = useMemo(
    () =>
      (riskData as any[]).filter(
        item => !projectId || !item.project_id || sameId(item.project_id, projectId)
      ),
    [riskData, projectId]
  )

  const financial = useMemo(
    () =>
      (financialData as any[]).filter(
        item => !projectId || !item.project_id || sameId(item.project_id, projectId)
      ),
    [financialData, projectId]
  )

  const projects = projectData as any[]
  const project =
    projects.find((p: any) => sameId(p.id, projectId)) ||
    projects.find((p: any) => p.name === projectName) ||
    {}

  const projectStartDate = toDate(project?.start_date)
  const targetDate = toDate(project?.handover_date || project?.planned_finish)
  const hasTimeline = Boolean(projectStartDate && targetDate)

  const daysLeft = targetDate
    ? Math.max(0, differenceInDays(targetDate, today))
    : null

  const totalDays = hasTimeline
    ? Math.max(1, differenceInDays(targetDate!, projectStartDate!))
    : 0

  const elapsed = hasTimeline
    ? clamp(differenceInDays(today, projectStartDate!), 0, totalDays)
    : 0

  const timelinePct = hasTimeline
    ? clamp(Math.round((elapsed / totalDays) * 100))
    : 0

  const plannedPct = hasTimeline
    ? clamp(Math.round((elapsed / totalDays) * 100))
    : 0

  const done = tasks.filter((t: any) => getTaskProgress(t) >= 100).length
  const inProg = tasks.filter((t: any) => getTaskStatus(t) === 'In Progress').length
  const notStarted = tasks.filter((t: any) => getTaskStatus(t) === 'Not Started').length

  const overdue = tasks.filter((t: any) => {
    const finish = toDate(getTaskFinish(t))
    return Boolean(finish && finish < today && getTaskProgress(t) < 100)
  }).length

  const housebuildTasks = tasks.filter(t => t.discipline === 'Housebuild')
  const mepTasks = tasks.filter(t => t.discipline === 'MEP')
  const infrastructureTasks = tasks.filter(t => t.discipline === 'Infrastructure')

  const housebuildProgress = calcWeightedProgress(housebuildTasks)
  const mepProgress = calcWeightedProgress(mepTasks)
  const infrastructureProgress = calcWeightedProgress(infrastructureTasks)
  const progressPct = calcWeightedProgress(tasks)

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

  const delayedTasks = tasks.filter(task => {
    const finish = toDate(getTaskFinish(task))
    return Boolean(finish && finish < today && getTaskProgress(task) < 100)
  })

  const activeDelayedTask = delayedTasks.sort((a, b) => {
    const aFinish = toDate(getTaskFinish(a))?.getTime() || 0
    const bFinish = toDate(getTaskFinish(b))?.getTime() || 0
    return aFinish - bFinish
  })[0]

  const varianceDays = activeDelayedTask
    ? -Math.max(
        0,
        differenceInDays(today, toDate(getTaskFinish(activeDelayedTask))!)
      )
    : 0

  const procRisksFromProcurement = procs.filter((p: any) => {
    const dateValue =
      p.order_by_date ||
      p.expected_delivery_date ||
      p.due_date ||
      p.required_date

    const d = dateValue ? differenceInDays(new Date(dateValue), today) : null

    return (
      d !== null &&
      d <= 14 &&
      !['Delivered', 'Installed', 'Ordered', 'Completed', 'Cancelled'].includes(
        p.status || p.payment_status || ''
      )
    )
  }).length

  const procRisksFromCostProcurement = costProcurements.filter((p: any) => {
    const dateValue = p.expected_delivery_date || p.request_date
    const d = dateValue ? differenceInDays(new Date(dateValue), today) : null

    return (
      d !== null &&
      d <= 14 &&
      !['Delivered', 'Installed', 'Cancelled'].includes(p.status || '')
    )
  }).length

  const procRisks = procRisksFromProcurement + procRisksFromCostProcurement

  const pendingApprovals = approvals.filter(
    (a: any) => !['Approved', 'Rejected', 'Closed'].includes(a.status || '')
  ).length

  const overdueApprovals = approvals.filter((a: any) => {
    if (['Approved', 'Rejected', 'Closed'].includes(a.status || '')) return false
    return a.deadline
      ? differenceInDays(new Date(a.deadline), today) < 0
      : false
  }).length

  const openSnags = snags.filter(
    (s: any) => !['Closed', 'Resolved'].includes(s.status || '')
  ).length

  const criticalSnags = snags.filter(
    (s: any) =>
      s.severity === 'Critical' &&
      !['Closed', 'Resolved'].includes(s.status || '')
  ).length

  const openRisks = risks.filter(
    (r: any) => !['Closed', 'Resolved', 'Mitigated'].includes(r.status || '')
  ).length

  const highRisks = risks.filter(
    (r: any) =>
      !['Closed', 'Resolved', 'Mitigated'].includes(r.status || '') &&
      Number(r.risk_score || r.score || 0) >= 12
  ).length

  const financialContractSum = financial
    .filter((f: any) => f.type === 'Contract Sum')
    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0)

  const costContractSum = costContracts.reduce(
    (sum, item) => sum + Number(item.contract_value || 0),
    0
  )

  const contractSum = costContractSum > 0 ? costContractSum : financialContractSum

  const financialVariationsTotal = financial
    .filter((f: any) => f.type === 'Variation' && f.status === 'Approved')
    .reduce(
      (s: number, f: any) =>
        s +
        (f.direction === 'Addition'
          ? Number(f.amount || 0)
          : -Number(f.amount || 0)),
      0
    )

  const approvedCostVariationValue = costVariations
    .filter(item => item.status === 'Approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const variationsTotal =
    approvedCostVariationValue > 0
      ? approvedCostVariationValue
      : financialVariationsTotal

  const financialPendingVariationExposure = financial
    .filter((f: any) => f.type === 'Variation' && f.status === 'Pending')
    .reduce(
      (s: number, f: any) =>
        s +
        (f.direction === 'Addition'
          ? Number(f.amount || 0)
          : -Number(f.amount || 0)),
      0
    )

  const pendingCostVariationExposure = costVariations
    .filter(item => item.status === 'Pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const pendingVariationExposure =
    pendingCostVariationExposure > 0
      ? pendingCostVariationExposure
      : financialPendingVariationExposure

  const revisedContract = contractSum + variationsTotal
  const projectedFinalContractSum = revisedContract + pendingVariationExposure

  const financialPaidTotal = financial
    .filter((f: any) => f.type === 'Payment' && f.status === 'Paid')
    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0)

  const costPaidTotal =
    costPayments
      .filter((p: any) => p.payment_status === 'Paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0) +
    costContracts.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0)

  const paidTotal = costPaidTotal > 0 ? costPaidTotal : financialPaidTotal

  const pendingPayments = costPayments
    .filter((p: any) => p.payment_status === 'Pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

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
    const pct = calcWeightedProgress(pts)

    return {
      name: ph,
      pct,
      total: pts.length,
      done: pts.filter((t: any) => getTaskProgress(t) >= 100).length,
      color: colorPool[i % colorPool.length],
    }
  })

  const statusPie = [
    { name: 'Completed', value: done, color: '#3fad78' },
    { name: 'In Progress', value: inProg, color: '#d4960e' },
    { name: 'Not Started', value: notStarted, color: '#2a3a4a' },
    {
      name: 'Behind / Blocked',
      value: tasks.filter(t =>
        ['Behind', 'Blocked', 'On Hold'].includes(getTaskStatus(t))
      ).length,
      color: '#e05252',
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

    const finishDate = getTaskFinish(t)
    if (finishDate && getTaskProgress(t) < 100) {
      const d = differenceInDays(new Date(finishDate), today)

      if (d >= 0 && d <= 14) {
        deadlines.push({
          name: t.name,
          date: finishDate,
          type: 'Activity Finish',
          days: d,
        })
      }
    }
  })

  approvals
    .filter((a: any) => !['Approved', 'Rejected', 'Closed'].includes(a.status || ''))
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

  costPayments
    .filter((p: any) => p.payment_status === 'Pending')
    .forEach((p: any) => {
      if (p.due_date) {
        const d = differenceInDays(new Date(p.due_date), today)

        if (d >= 0 && d <= 21) {
          deadlines.push({
            name: p.payment_title,
            date: p.due_date,
            type: 'Payment',
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
      } missed its deadline`,
      action: route('/approvals'),
    })
  }

  if (criticalSnags > 0) {
    alerts.push({
      level: 'red',
      msg: `${criticalSnags} critical snag${
        criticalSnags > 1 ? 's' : ''
      } open`,
      action: route('/snags'),
    })
  }

  if (highRisks > 0) {
    alerts.push({
      level: 'red',
      msg: `${highRisks} high-scoring risk${
        highRisks > 1 ? 's require' : ' requires'
      } mitigation`,
      action: route('/risk'),
    })
  }

  if (procRisks > 0) {
    alerts.push({
      level: 'amber',
      msg: `${procRisks} procurement item${
        procRisks > 1 ? 's' : ''
      } approaching or past deadline`,
      action: route('/procurement'),
    })
  }

  if (pendingPayments > 0) {
    alerts.push({
      level: 'amber',
      msg: `${formatCurrency(pendingPayments)} pending payment exposure`,
      action: route('/costing'),
    })
  }

  if (daysLeft !== null && daysLeft < 60) {
    alerts.push({
      level: 'amber',
      msg: `Only ${daysLeft} days to handover`,
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
    const procurementRatio =
      procs.length + costProcurements.length > 0
        ? procRisks / (procs.length + costProcurements.length)
        : 0

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

  const latestDesignReport = designSubmissions[0]
  const latestCostReport = costSubmissions[0]

  const kpiCards = [
    {
      label: 'Progress',
      value: `${progressPct}%`,
      sub: `${done}/${tasks.length} tasks completed`,
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
      sub:
        varianceDays < 0
          ? `${Math.abs(varianceDays)} days behind`
          : varianceStatus,
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
      sub: overdue > 0 ? 'Action required' : 'No overdue task',
      color: overdue > 0 ? 'c-red' : 'c-grn',
      icon: Clock,
      link: route('/schedule'),
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      sub: `${overdueApprovals} overdue`,
      color: overdueApprovals > 0 ? 'c-red' : pendingApprovals > 5 ? 'c-amr' : 'c-grn',
      icon: FileCheck,
      link: route('/approvals'),
    },
    {
      label: 'Procurement Risks',
      value: procRisks,
      sub: 'Due ≤14d / overdue',
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
              {projectName || project?.name || 'Selected Project'}
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

      {alerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-head">
            <div className="card-title">Live Alerts</div>
          </div>

          <div className="p-4 space-y-3">
            {alerts.slice(0, 8).map(alert => (
              <button
                key={alert.msg}
                onClick={() => navigate(alert.action)}
                className="w-full flex items-center justify-between gap-4 text-left rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:border-[#c49e48]/20"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    size={16}
                    className={
                      alert.level === 'red'
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }
                  />
                  <span className="text-sm text-[#ede8de]">{alert.msg}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
          <div className="text-[10px] text-slate-500 mt-1">
            {Math.round(paidPct)}% of forecast
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500">Final Forecast</div>
          <div className="text-2xl font-bold text-[#ede8de]">
            {formatCurrency(projectedFinalContractSum)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {costOverrunPct >= 0 ? '+' : ''}
            {costOverrunPct.toFixed(1)}% vs contract
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Outstanding Balance</div>
          <div className="text-2xl font-bold text-[#ede8de]">
            {formatCurrency(finalAccountForecast)}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500">Pending Payments</div>
          <div className="text-2xl font-bold text-[#ede8de]">
            {formatCurrency(pendingPayments)}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500">Latest Cost Report</div>
          <div className="text-lg font-bold text-[#ede8de]">
            {latestCostReport ? fdate(latestCostReport.report_week) : 'No report'}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500">Latest Design Report</div>
          <div className="text-lg font-bold text-[#ede8de]">
            {latestDesignReport ? fdate(latestDesignReport.report_week) : 'No report'}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <div className="card overflow-hidden">
          <div className="card-head">
            <div className="card-title">Current Activities</div>
          </div>

          <div className="p-4 space-y-3">
            {tasks.filter(t => getTaskStatus(t) === 'In Progress').length === 0 ? (
              <div className="text-sm text-slate-500">
                No current activities in progress.
              </div>
            ) : (
              tasks
                .filter(t => getTaskStatus(t) === 'In Progress')
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
                        {task.phase || task.discipline || 'No phase'}
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

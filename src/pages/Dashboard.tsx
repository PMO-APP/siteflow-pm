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
import { useProjectIntelligence } from '@/intelligence'
import { ProjectPulsePanel } from '@/components/dashboard/ProjectPulsePanel'
import { ProjectLearningPanel } from '@/components/dashboard/ProjectLearningPanel'
import { ProjectCopilotPanel } from '@/components/copilot/ProjectCopilotPanel'
import { ProjectReviewPanel } from '@/components/meeting/ProjectReviewPanel'
import { ActionControlPanel } from '@/components/action/ActionControlPanel'
import { ExecutiveBoardPackPanel } from '@/components/board/ExecutiveBoardPackPanel'
import { useProjectHealth } from '@/hooks/useProjectHealth'
import { HealthDetailsDrawer, ProjectHealthCard } from '@/components/health'

const colorPool = [
  '#3b82f6',
  '#64748b',
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
  const [healthDrawerOpen, setHealthDrawerOpen] = useState(false)
  const sharedProjectHealth = useProjectHealth(projectId)

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

  const firstScheduleTask =
    [...tasks]
      .filter(task => toDate(getTaskStart(task)))
      .sort((a, b) => {
        const aDate = toDate(getTaskStart(a))?.getTime() ?? 0
        const bDate = toDate(getTaskStart(b))?.getTime() ?? 0
        return aDate - bDate
      })[0] ?? null

  const lastScheduleTask =
    [...tasks]
      .filter(task => toDate(getTaskFinish(task)))
      .sort((a, b) => {
        const aDate = toDate(getTaskFinish(a))?.getTime() ?? 0
        const bDate = toDate(getTaskFinish(b))?.getTime() ?? 0
        return bDate - aDate
      })[0] ?? null

  const projectStartDate =
    toDate(project?.start_date) ??
    (firstScheduleTask ? toDate(getTaskStart(firstScheduleTask)) : null)

  const targetDate =
    toDate(project?.handover_date) ??
    toDate(project?.planned_finish) ??
    (lastScheduleTask ? toDate(getTaskFinish(lastScheduleTask)) : null)

  const handoverSource =
    project?.handover_date
      ? 'Project Handover Date'
      : project?.planned_finish
      ? 'Project Planned Finish'
      : lastScheduleTask
      ? `Schedule (${lastScheduleTask.name || lastScheduleTask.activity || 'Last Task'})`
      : null

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

  const { intelligence: projectIntelligence } = useProjectIntelligence({
    projectId,
    projectName: projectName || project?.name,
    plannedFinish: targetDate?.toISOString(),
    currentProgress: progressPct,
  })

  const latestDesignReport = designSubmissions[0]
  const latestCostReport = costSubmissions[0]

  const kpiCards = [
    {
      label: 'Progress',
      value: `${progressPct}%`,
      sub: `${done}/${tasks.length} tasks completed`,
      color: 'c-blue',
      icon: TrendingUp,
      link: route('/schedule'),
    },
    {
      label: 'Housebuild',
      value: `${housebuildProgress}%`,
      sub: `${housebuildTasks.length} tasks`,
      color: 'c-blue',
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

  const projectHealth = projectIntelligence?.health.overallScore ?? Math.max(
    20,
    Math.min(
      96,
      Math.round(
        (handoverConfidence ?? 60) * 0.45 +
          progressPct * 0.25 +
          Math.max(0, 100 - overdue * 6) * 0.15 +
          Math.max(0, 100 - highRisks * 10) * 0.15
      )
    )
  )

  const healthLabel =
    projectIntelligence?.health.overallBand === 'green'
      ? 'Healthy'
      : projectIntelligence?.health.overallBand === 'red'
      ? 'Critical'
      : projectIntelligence?.health.overallBand === 'amber'
      ? 'Watch'
      : projectHealth >= 80
      ? 'Healthy'
      : projectHealth >= 60
      ? 'Watch'
      : 'Critical'

  const healthTone =
    projectHealth >= 80
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : projectHealth >= 60
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200'

  const executiveBrief = projectIntelligence
    ? `${projectIntelligence.narrative.overallStatus} ${projectIntelligence.narrative.executiveOutlook}`
    : overdue > 0 || procRisks > 0 || overdueApprovals > 0
    ? `${projectName || project?.name || 'This project'} remains recoverable, but ${[
        overdue > 0 ? `${overdue} overdue programme task${overdue === 1 ? '' : 's'}` : '',
        procRisks > 0 ? `${procRisks} procurement exposure${procRisks === 1 ? '' : 's'}` : '',
        overdueApprovals > 0 ? `${overdueApprovals} overdue approval${overdueApprovals === 1 ? '' : 's'}` : '',
      ].filter(Boolean).join(' and ')} require attention. Current handover confidence is ${handoverConfidence ?? 'not yet available'}%.`
    : `${projectName || project?.name || 'This project'} is progressing without a critical live exception. Current handover confidence is ${handoverConfidence ?? 'not yet available'}% and delivery remains ${varianceStatus.toLowerCase()}.`

  const pifRouteBySource: Record<string, string> = {
    schedule: route('/schedule'),
    approval: route('/approvals'),
    procurement: route('/procurement'),
    risk: route('/risk'),
    quality: route('/snags'),
    snag: route('/snags'),
    finance: route('/costing'),
    hse: route('/hse'),
  }

  const pifPriorities = projectIntelligence?.alerts.map(alert => {
    const eventId = alert.relatedEventIds[0]
    const source = eventId?.split(':')[0] || 'schedule'
    return {
      title: alert.title,
      level: alert.severity === 'critical' ? ('red' as const) : ('amber' as const),
      route: pifRouteBySource[source] || route('/schedule'),
      meta: alert.recommendedAction,
    }
  }) || []

  const priorities = [
    ...pifPriorities,
    ...alerts.map(alert => ({
      title: alert.msg,
      level: alert.level,
      route: alert.action,
      meta: alert.level === 'red' ? 'Immediate attention' : 'Review this week',
    })),
    ...deadlines.slice(0, 4).map(item => ({
      title: item.name,
      level: item.days <= 3 ? ('red' as const) : ('amber' as const),
      route: item.type === 'Approval' ? route('/approvals') : route('/schedule'),
      meta: `${item.type} · ${item.days === 0 ? 'Due today' : `${item.days} days`}`,
    })),
  ].filter((item, index, list) => list.findIndex(other => other.title === item.title) === index).slice(0, 5)

  const dimensions = projectIntelligence?.health.dimensions
  const healthAreas = dimensions
    ? [
        { label: 'Schedule', score: dimensions.schedule.score, detail: dimensions.schedule.explanation },
        { label: 'Procurement', score: dimensions.procurement.score, detail: dimensions.procurement.explanation },
        { label: 'Approvals', score: dimensions.approval.score, detail: dimensions.approval.explanation },
        { label: 'Quality', score: dimensions.quality.score, detail: dimensions.quality.explanation },
        { label: 'Safety', score: dimensions.safety.score, detail: dimensions.safety.explanation },
        { label: 'Commercial', score: dimensions.commercial.score, detail: dimensions.commercial.explanation },
      ]
    : [
        { label: 'Schedule', score: variancePct === null ? 60 : clamp(82 + variancePct * 2), detail: varianceStatus },
        { label: 'Procurement', score: clamp(92 - procRisks * 12), detail: procRisks ? `${procRisks} exposed` : 'Clear' },
        { label: 'Approvals', score: clamp(94 - overdueApprovals * 16 - pendingApprovals * 2), detail: `${pendingApprovals} pending` },
        { label: 'Quality', score: clamp(94 - criticalSnags * 18 - openSnags * 2), detail: `${openSnags} open snags` },
        { label: 'Risk', score: clamp(92 - highRisks * 15 - openRisks * 2), detail: `${highRisks} high` },
        { label: 'Commercial', score: clamp(90 - Math.max(0, costOverrunPct) * 3), detail: `${costOverrunPct >= 0 ? '+' : ''}${costOverrunPct.toFixed(1)}% forecast` },
      ]

  return (
    <div className="min-w-0 space-y-6 pb-10 text-slate-900">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#f8f7f3] px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.28]" style={{ backgroundImage: 'linear-gradient(rgba(30,64,175,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-end">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <span>Project Control Room</span><span className="h-1 w-1 rounded-full bg-blue-300"/><span>{project?.phase || 'Delivery phase'}</span>
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">{projectName || project?.name || 'Selected Project'}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{executiveBrief}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => navigate(route('/schedule'))} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">Open schedule</button>
              <button onClick={() => navigate(route('/recovery-forecast'))} className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-white">View recovery forecast</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Project health</div><div className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-slate-950">{projectHealth}<span className="text-xl text-slate-400">%</span></div></div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthTone}`}>{healthLabel}</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${projectHealth}%` }}/></div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm"><div><div className="text-slate-500">Handover</div><div className="mt-1 font-semibold text-slate-900">{targetDate ? targetDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'Not set'}</div></div><div><div className="text-slate-500">Confidence</div><div className="mt-1 font-semibold text-slate-900">{projectIntelligence?.forecast.confidence ?? handoverConfidence ?? '—'}%</div></div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
        <ProjectHealthCard
          health={sharedProjectHealth.health}
          loading={sharedProjectHealth.isLoading}
          fetching={sharedProjectHealth.isFetching}
          onOpen={() => setHealthDrawerOpen(true)}
          onRefresh={() => sharedProjectHealth.refetch()}
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Executive interpretation</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">What is driving project health</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">{sharedProjectHealth.healthSummary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(sharedProjectHealth.contributors || []).filter(item => item.status === 'assessed').slice(0, 4).map(item => (
              <button key={item.key} type="button" onClick={() => setHealthDrawerOpen(true)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{item.label}</span><span className="text-sm font-semibold text-slate-900">{item.score}%</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${item.score || 0}%` }} /></div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.explanations[0] || 'No exception recorded.'}</div>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 xl:grid-cols-8">
        {[
          ['Progress', `${progressPct}%`], ['Variance', variancePct === null ? '—' : `${variancePct > 0 ? '+' : ''}${variancePct}%`], ['Days left', daysLeft ?? '—'], ['Overdue', overdue], ['Approvals', pendingApprovals], ['Procurement', procRisks], ['Risks', openRisks], ['Snags', openSnags],
        ].map(([label,value],index)=><button key={String(label)} onClick={()=>navigate(index<4?route('/schedule'):index===4?route('/approvals'):index===5?route('/procurement'):index===6?route('/risk'):route('/snags'))} className="min-w-0 border-b border-r border-slate-200 p-4 text-left transition hover:bg-slate-50 sm:p-5"><div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{value}</div></button>)}
      </section>

      {projectIntelligence && (
        <ProjectPulsePanel
          intelligence={projectIntelligence}
          onOpenSource={(source) => navigate(pifRouteBySource[source] || route('/schedule'))}
        />
      )}

      {projectIntelligence && (
        <ProjectLearningPanel intelligence={projectIntelligence} />
      )}

      {projectIntelligence && (
        <ProjectReviewPanel
          intelligence={projectIntelligence}
          onOpenSource={(source) => navigate(pifRouteBySource[source] || route('/schedule'))}
        />
      )}

      {projectIntelligence && (
        <ActionControlPanel
          intelligence={projectIntelligence}
          onOpenSource={(source) => navigate(pifRouteBySource[source] || route('/schedule'))}
        />
      )}

      {projectIntelligence && (
        <ExecutiveBoardPackPanel intelligence={projectIntelligence} />
      )}

      {projectIntelligence && (
        <ProjectCopilotPanel
          projectName={projectName || project?.name}
          intelligence={projectIntelligence}
          onOpenSource={(source) => navigate(pifRouteBySource[source] || route('/schedule'))}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Action queue</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Today’s priorities</h2></div><span className="text-sm text-slate-500">{priorities.length} requiring attention</span></div>
          <div className="mt-5 divide-y divide-slate-100">
            {priorities.length ? priorities.map((item,index)=><button key={`${item.title}-${index}`} onClick={()=>navigate(item.route)} className="group flex w-full items-center gap-4 py-4 text-left"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.level==='red'?'bg-red-500':'bg-amber-500'}`}/><div className="min-w-0 flex-1"><div className="font-medium text-slate-900 group-hover:text-blue-700">{item.title}</div><div className="mt-1 text-sm text-slate-500">{item.meta}</div></div><span className="text-sm font-semibold text-blue-700">Open</span></button>) : <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-800">No critical priority is currently open.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-950 p-6 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Project intelligence</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{projectIntelligence?.narrative.keyIssues || (handoverConfidence && handoverConfidence >= 75 ? 'Delivery remains achievable.' : 'Recovery action is required.')}</h2>
          <p className="mt-4 text-sm leading-6 text-blue-100">{projectIntelligence?.narrative.immediateActions || `${overdue > 0 ? `The primary schedule pressure is ${activeDelayedTask?.name || `${overdue} overdue activities`}.` : 'No overdue activity is currently driving the forecast.'} ${procRisks > 0 ? `Resolve ${procRisks} procurement exposure${procRisks===1?'':'s'} to protect available float.` : 'Procurement is not currently reducing available float.'}`}</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-blue-200">Recovery confidence</div><div className="mt-1 text-3xl font-semibold">{handoverConfidence ?? '—'}%</div></div><div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-blue-200">Schedule position</div><div className="mt-1 text-xl font-semibold">{varianceStatus}</div></div></div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Delivery</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Phase progress</h2></div><button onClick={()=>navigate(route('/schedule'))} className="text-sm font-semibold text-blue-700">Full schedule</button></div>
          <div className="mt-6 space-y-5">{phaseData.length ? phaseData.slice(0,7).map(phase=><div key={phase.name}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="font-medium text-slate-800">{phase.name}</span><span className="font-semibold text-slate-950">{phase.pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{width:`${phase.pct}%`}}/></div></div>) : <div className="text-sm text-slate-500">No phase data available.</div>}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Project health matrix</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Control areas</h2>
          <div className="mt-5 divide-y divide-slate-100">{healthAreas.map(area=>{const tone=area.score>=80?'bg-emerald-500':area.score>=60?'bg-amber-500':'bg-red-500';return <div key={area.label} className="flex items-center gap-4 py-3.5"><span className={`h-2.5 w-2.5 rounded-full ${tone}`}/><div className="min-w-0 flex-1"><div className="font-medium text-slate-900">{area.label}</div><div className="text-sm text-slate-500">{area.detail}</div></div><div className="text-sm font-semibold text-slate-900">{Math.round(area.score)}%</div></div>})}</div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Commercial pulse</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Financial snapshot</h2></div><button onClick={()=>navigate(route('/costing'))} className="text-sm font-semibold text-blue-700">Open commercial register</button></div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-5">{[
          ['Contract value',formatCurrency(contractSum)],['Approved variations',formatCurrency(variationsTotal)],['Paid to date',formatCurrency(paidTotal)],['Pending payments',formatCurrency(pendingPayments)],['Final forecast',formatCurrency(projectedFinalContractSum)]
        ].map(([label,value])=><div key={label} className="bg-white p-5"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-2 truncate text-xl font-semibold tracking-[-0.03em] text-slate-950">{value}</div></div>)}</div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Now</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Current activities</h2></div><span className="text-sm text-slate-500">{inProg} active</span></div><div className="mt-5 divide-y divide-slate-100">{tasks.filter(t=>getTaskStatus(t)==='In Progress').slice(0,7).map(task=><div key={task.id} className="flex items-center gap-4 py-3.5"><div className="min-w-0 flex-1"><div className="truncate font-medium text-slate-900">{task.name}</div><div className="mt-1 text-sm text-slate-500">{task.phase || task.discipline || 'Unassigned phase'}</div></div><span className="font-semibold text-blue-700">{getTaskProgress(task)}%</span></div>)}{inProg===0&&<div className="py-5 text-sm text-slate-500">No activities are currently marked in progress.</div>}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Next</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Upcoming deadlines</h2></div><span className="text-sm text-slate-500">21-day view</span></div><div className="mt-5 divide-y divide-slate-100">{deadlines.slice(0,7).map(item=><div key={`${item.name}-${item.date}`} className="flex items-center gap-4 py-3.5"><div className="min-w-0 flex-1"><div className="truncate font-medium text-slate-900">{item.name}</div><div className="mt-1 text-sm text-slate-500">{item.type} · {fdate(item.date)}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.days<=3?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'}`}>{item.days===0?'Today':`${item.days}d`}</span></div>)}{deadlines.length===0&&<div className="py-5 text-sm text-slate-500">No deadline is due within the next 21 days.</div>}</div></section>
      </div>

      <HealthDetailsDrawer open={healthDrawerOpen} health={sharedProjectHealth.health} onClose={() => setHealthDrawerOpen(false)} />
    </div>
  )
}

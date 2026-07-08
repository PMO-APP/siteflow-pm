import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/store/project'
import {
  AlertTriangle,
  CalendarDays,
  Gauge,
  Hammer,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Task = {
  id: string
  project_id?: number | string
  task_number: number
  name: string
  activity?: string
  task_name?: string
  title?: string
  phase: string
  package?: string | null
  discipline?: string | null
  description?: string | null
  start_date: string
  finish_date: string
  planned_start?: string | null
  planned_finish?: string | null
  baseline_start?: string | null
  baseline_finish?: string | null
  duration_days: number
  dependencies: string | null
  progress_pct: number
  progress?: number
  status: string
  rag: string
}

type KPI = {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}

export default function RecoveryForecastPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [project, setProject] = useState<any>(null)
  const [procurement, setProcurement] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [snags, setSnags] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { projectId } = useProjectStore()

  useEffect(() => {
    fetchRecoveryData()
  }, [projectId])

  async function fetchRecoveryData() {
    setLoading(true)

    if (!projectId) {
      setTasks([])
      setProject(null)
      setProcurement([])
      setApprovals([])
      setSnags([])
      setRisks([])
      setLoading(false)
      return
    }

    const [
      taskRes,
      projectRes,
      procurementRes,
      approvalRes,
      snagRes,
      riskRes,
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('task_number', { ascending: true }),

      supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single(),

      supabase
        .from('procurement_items')
        .select('*')
        .eq('project_id', projectId),

      supabase
        .from('approvals')
        .select('*')
        .eq('project_id', projectId),

      supabase
        .from('snags')
        .select('*')
        .eq('project_id', projectId),

      supabase
        .from('risks')
        .select('*')
        .eq('project_id', projectId),
    ])

    if (taskRes.error) console.error(taskRes.error)
    if (projectRes.error) console.error(projectRes.error)
    if (procurementRes.error) console.error(procurementRes.error)
    if (approvalRes.error) console.error(approvalRes.error)
    if (snagRes.error) console.error(snagRes.error)
    if (riskRes.error) console.error(riskRes.error)

    setTasks((taskRes.data || []) as Task[])
    setProject(projectRes.data || null)
    setProcurement(procurementRes.data || [])
    setApprovals(approvalRes.data || [])
    setSnags(snagRes.data || [])
    setRisks(riskRes.data || [])

    setLoading(false)
  }

  const engine = useMemo(() => {
    const today = new Date()

    const safeDate = (value?: string | null) => {
      if (!value) return null
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }

    const daysBetween = (a: Date, b: Date) =>
      Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))

    const normalizeScope = (value?: string | null) => {
      const raw = value || 'Fully Finished'
      const allowed = [
        'Carcass',
        'Shell & Core',
        'Fully Finished',
        'Infrastructure',
        'MEP Only',
        'External Works',
        'Custom',
      ]

      return allowed.includes(raw) ? raw : 'Fully Finished'
    }

    const getTaskName = (task: any) =>
      String(task.name || task.activity || task.task_name || task.title || '')

    const getTaskStart = (task: any) =>
      task.planned_start || task.start_date || null

    const getTaskFinish = (task: any) =>
      task.planned_finish || task.finish_date || null

    const getTaskProgress = (task: any) => {
      const status = String(task.status || '').toLowerCase()
      if (status === 'completed' || status === 'done') return 100
      if (status === 'not started') return 0
      return Math.min(100, Math.max(0, Number(task.progress_pct || 0)))
    }

    const projectScope = normalizeScope(project?.project_scope)

    const scopeKeywords: Record<string, string[]> = {
      Carcass: [
        'excavation',
        'foundation',
        'blinding',
        'ground beam',
        'ground floor',
        'slab',
        'column',
        'beam',
        'blockwork',
        'floor',
        'roof',
        'parapet',
        'staircase',
        'external plastering',
        'cleaning',
        'practical completion',
      ],
      'Shell & Core': [
        'excavation',
        'foundation',
        'structure',
        'slab',
        'column',
        'beam',
        'blockwork',
        'roof',
        'external wall',
        'external plastering',
        'facade',
        'mep first fix',
        'core',
        'staircase',
        'practical completion',
      ],
      Infrastructure: [
        'road',
        'drain',
        'stormwater',
        'water',
        'sewer',
        'electrical',
        'streetlight',
        'paving',
        'kerb',
        'infrastructure',
      ],
      'MEP Only': [
        'mep',
        'mechanical',
        'electrical',
        'plumbing',
        'hvac',
        'fire',
        'elv',
        'first fix',
        'second fix',
        'testing',
        'commissioning',
      ],
      'External Works': [
        'external',
        'landscape',
        'driveway',
        'paving',
        'fence',
        'gate',
        'road',
        'drain',
        'kerb',
        'walkway',
      ],
      'Fully Finished': [],
      Custom: [],
    }

    const validTasks = tasks.filter(
      task => safeDate(getTaskStart(task)) && safeDate(getTaskFinish(task))
    )

    const applicableTasks =
      projectScope === 'Fully Finished' || projectScope === 'Custom'
        ? validTasks
        : validTasks.filter(task => {
            const keywords = scopeKeywords[projectScope] || []
            const haystack = [
              getTaskName(task),
              task.phase,
              task.package,
              task.discipline,
              task.description,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()

            return keywords.some(keyword =>
              haystack.includes(keyword.toLowerCase())
            )
          })

    const scopedTasks = applicableTasks.length ? applicableTasks : validTasks
    const totalTasks = scopedTasks.length

    const firstTask =
      [...scopedTasks]
        .filter(task => safeDate(getTaskStart(task)))
        .sort((a, b) => {
          const aDate = safeDate(getTaskStart(a))?.getTime() ?? 0
          const bDate = safeDate(getTaskStart(b))?.getTime() ?? 0
          return aDate - bDate
        })[0] || null

    const lastTask =
      [...scopedTasks]
        .filter(task => safeDate(getTaskFinish(task)))
        .sort((a, b) => {
          const aDate = safeDate(getTaskFinish(a))?.getTime() ?? 0
          const bDate = safeDate(getTaskFinish(b))?.getTime() ?? 0
          return bDate - aDate
        })[0] || null

    const delayedTasks = scopedTasks.filter(task => {
      const finish = safeDate(getTaskFinish(task))

      return (
        !!finish &&
        finish < today &&
        getTaskProgress(task) < 100 &&
        !['completed', 'done'].includes(String(task.status || '').toLowerCase())
      )
    })

    const completedTasks = scopedTasks.filter(t => getTaskProgress(t) >= 100).length

    const calculatedProgress =
      totalTasks === 0
        ? Number(project?.completion_percent || 0)
        : Math.round(
            scopedTasks.reduce((sum, t) => sum + getTaskProgress(t), 0) /
              totalTasks
          )

    const progressPct =
      Number(project?.completion_percent || 0) > 0
        ? Number(project.completion_percent)
        : calculatedProgress

    const taskDelayDays = delayedTasks.map(task => {
      const finish = safeDate(getTaskFinish(task))
      return finish ? Math.max(0, daysBetween(today, finish)) : 0
    })

    const worstDelay = taskDelayDays.length === 0 ? 0 : Math.max(...taskDelayDays)

    const avgTaskDelay =
      taskDelayDays.length === 0
        ? 0
        : Math.round(
            taskDelayDays.reduce((sum, d) => sum + d, 0) / taskDelayDays.length
          )

    const redTasks = scopedTasks.filter(t => t.rag === 'RED').length
    const amberTasks = scopedTasks.filter(t => t.rag === 'AMBER').length

    const activeTasks = scopedTasks.filter(
      t => t.status === 'In Progress' || getTaskProgress(t) > 0
    ).length

    const openRisks = risks.filter(r => r.status === 'Open').length

    const highRisks = risks.filter(
      r => r.status === 'Open' && Number(r.risk_score || 0) >= 12
    ).length

    const openSnags = snags.filter(s => s.status !== 'Closed').length

    const criticalSnags = snags.filter(
      s => s.status !== 'Closed' && s.severity === 'Critical'
    ).length

    const pendingApprovals = approvals.filter(
      a => a.status !== 'Approved' && a.status !== 'Rejected'
    ).length

    const overdueApprovals = approvals.filter(a => {
      if (a.status === 'Approved') return false
      const deadline = safeDate(a.deadline)
      return !!deadline && deadline < today
    }).length

    const procurementRisks = procurement.filter(p => {
      if (p.status === 'Delivered' || p.status === 'Ordered') return false

      const orderDate = safeDate(p.order_by_date)
      if (!orderDate) return false

      const daysToOrder = daysBetween(orderDate, today)

      return daysToOrder <= 14
    }).length

    const projectStartDate =
      safeDate(project?.start_date) ||
      (firstTask ? safeDate(getTaskStart(firstTask)) : null)

    const targetDate =
      safeDate(project?.handover_date) ||
      safeDate(project?.planned_finish) ||
      (lastTask ? safeDate(getTaskFinish(lastTask)) : null)

    const targetDateSource = project?.handover_date
      ? 'Project Handover Date'
      : project?.planned_finish
      ? 'Project Planned Finish'
      : lastTask
      ? `Schedule (${getTaskName(lastTask) || 'Last Task'})`
      : 'Not Set'

    const hasTimeline = !!projectStartDate && !!targetDate

    const plannedPct =
      hasTimeline && targetDate && projectStartDate
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(
                (daysBetween(today, projectStartDate) /
                  Math.max(1, daysBetween(targetDate, projectStartDate))) *
                  100
              )
            )
          )
        : null

    const variancePct = plannedPct !== null ? progressPct - plannedPct : null

    let confidenceScore = 100

    confidenceScore -= (100 - progressPct) * 0.2
    confidenceScore -= worstDelay * 1.1
    confidenceScore -= avgTaskDelay * 0.7
    confidenceScore -= redTasks * 5
    confidenceScore -= amberTasks * 2
    confidenceScore -= procurementRisks * 2
    confidenceScore -= highRisks * 6
    confidenceScore -= openRisks * 1.5
    confidenceScore -= criticalSnags * 6
    confidenceScore -= openSnags * 1
    confidenceScore -= overdueApprovals * 5
    confidenceScore -= pendingApprovals * 1

    if (variancePct !== null && variancePct < 0) {
      confidenceScore -= Math.abs(variancePct) * 2
    }

    if (activeTasks === 0 && totalTasks > 0) {
      confidenceScore -= 10
    }

    if (project?.health_status === 'Good') confidenceScore += 5
    if (project?.health_status === 'At Risk') confidenceScore -= 10
    if (project?.health_status === 'Critical') confidenceScore -= 20

    confidenceScore = Math.max(5, Math.min(95, Math.round(confidenceScore)))

    let recoveryScore = confidenceScore

    if (worstDelay > 30) recoveryScore -= 15
    if (redTasks >= 5) recoveryScore -= 10
    if (procurementRisks >= 10) recoveryScore -= 10
    if (progressPct >= 70 && worstDelay <= 14) recoveryScore += 8

    recoveryScore = Math.max(5, Math.min(95, Math.round(recoveryScore)))

    const recoverable =
      recoveryScore >= 75 ? 'YES' : recoveryScore >= 50 ? 'RISK' : 'NO'

    const requiredAcceleration =
      worstDelay === 0
        ? '0%'
        : `${Math.min(50, Math.round(worstDelay * 1.8))}%`

    const forecastFinish = targetDate
      ? new Date(targetDate)
      : lastTask
      ? new Date(getTaskFinish(lastTask))
      : new Date()

    forecastFinish.setDate(forecastFinish.getDate() + worstDelay)

    const phaseHeatmap = scopedTasks.reduce((acc: any, task) => {
      const phase = task.phase || 'Unassigned Phase'
      const finish = safeDate(getTaskFinish(task))

      if (!acc[phase]) acc[phase] = 0

      const delayed =
        !!finish &&
        finish < today &&
        getTaskProgress(task) < 100 &&
        !['completed', 'done'].includes(String(task.status || '').toLowerCase())

      if (delayed) acc[phase] += 1

      return acc
    }, {})

    const criticalTasks = scopedTasks
      .map(task => {
        const finish = safeDate(getTaskFinish(task))
        const start = safeDate(getTaskStart(task))

        const lateDays =
          finish && finish < today && getTaskProgress(task) < 100
            ? Math.max(0, daysBetween(today, finish))
            : 0

        const totalDur = Math.max(1, Number(task.duration_days || 1))
        const elapsed = start ? Math.max(0, daysBetween(today, start)) : 0

        const expectedProgress = Math.min(
          100,
          Math.round((elapsed / totalDur) * 100)
        )

        const progressLag = Math.max(0, expectedProgress - getTaskProgress(task))

        let score = 0

        score += lateDays * 4
        score += progressLag * 0.8
        score += task.duration_days > 10 ? 10 : 0
        score += task.rag === 'RED' ? 20 : task.rag === 'AMBER' ? 10 : 0

        return {
          ...task,
          score: Math.round(score),
          lateDays,
          progressLag,
        }
      })
      .filter(t => t.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    let summary = ''

    if (confidenceScore >= 85) {
      summary =
        'Project delivery performance is healthy. Current risks are manageable, but continued monitoring is required.'
    } else if (confidenceScore >= 65) {
      summary =
        'Project is experiencing moderate delivery pressure. Recovery actions are required to protect the current scope target.'
    } else if (confidenceScore >= 45) {
      summary =
        'Project delivery is under significant stress. Procurement, risk, approval, snag, and schedule items require coordinated intervention.'
    } else {
      summary =
        'Project is in critical delivery condition. Executive intervention is required to protect completion, cost, and handover readiness.'
    }

    const scopeNote =
      projectScope === 'Carcass'
        ? 'This forecast is based on carcass scope only. It should not be read as fully finished project handover.'
        : projectScope === 'Shell & Core'
        ? 'This forecast is based on shell and core scope.'
        : projectScope === 'Fully Finished'
        ? 'This forecast is based on full completion scope.'
        : `This forecast is based on ${projectScope} scope.`

    const recommendations: string[] = []

    if (redTasks > 0) {
      recommendations.push('Escalate all RED activities within the current project scope.')
    }

    if (worstDelay > 14) {
      recommendations.push('Introduce a recovery programme with parallel work fronts.')
    }

    if (procurementRisks > 0) {
      recommendations.push('Fast-track procurement items that may affect the current scope.')
    }

    if (highRisks > 0) {
      recommendations.push('Hold a risk mitigation session for high-impact open risks.')
    }

    if (pendingApprovals > 0) {
      recommendations.push('Close pending approvals to prevent decision bottlenecks.')
    }

    if (criticalSnags > 0) {
      recommendations.push('Assign critical snags to owners with target close-out dates.')
    }

    if (progressPct < 50) {
      recommendations.push('Increase workforce productivity and tighten site supervision.')
    }

    if (recommendations.length === 0) {
      recommendations.push('Project currently progressing within acceptable thresholds.')
    }

    return {
      projectScope,
      scopeNote,
      targetDate,
      targetDateSource,
      delayedTasks,
      criticalTasks,
      recommendations,
      totalDelayDays: worstDelay,
      avgTaskDelay,
      progressPct,
      completedTasks,
      totalTasks,
      confidenceScore,
      recoveryScore,
      forecastFinish,
      recoverable,
      requiredAcceleration,
      phaseHeatmap,
      summary,
      procurementRisks,
      openRisks,
      highRisks,
      openSnags,
      criticalSnags,
      pendingApprovals,
      overdueApprovals,
      variancePct,
    }
  }, [tasks, project, procurement, approvals, snags, risks])

  const kpis: KPI[] = [
    {
      label: 'Delayed Tasks',
      value: engine.delayedTasks.length,
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      label: 'Active Delay',
      value: `${engine.totalDelayDays} Days`,
      icon: CalendarDays,
      color: 'text-amber-400',
    },
    {
      label: 'Recoverable',
      value: engine.recoverable,
      icon: ShieldCheck,
      color: 'text-emerald-400',
    },
    {
      label: 'Speed Increase',
      value: engine.requiredAcceleration,
      icon: Gauge,
      color: 'text-sky-400',
    },
    {
      label: 'Confidence',
      value: `${engine.confidenceScore}%`,
      icon: TrendingUp,
      color: 'text-violet-400',
    },
  ]

  if (loading) {
    return <div className="p-8 text-white">Loading Recovery Forecast...</div>
  }

  if (tasks.length === 0) {
    return (
      <div className="card p-8 text-slate-400">
        No recovery forecast data available for this project yet.
      </div>
    )
  }

  return (
    <div className="space-y-5 text-white">
      <div className="card p-5">
        <h1 className="text-2xl font-bold">Recovery Forecast Engine</h1>
        <p className="text-sm text-slate-400 mt-1">
          Reads schedule, dashboard health, risks, approvals, procurement, and snags.
        </p>

        <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Project Scope
            </div>
            <div className="font-bold text-[#c49e48] mt-1">
              {engine.projectScope}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Target Date
            </div>
            <div className="font-bold text-white mt-1">
              {engine.targetDate
                ? engine.targetDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'No target date'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {engine.targetDateSource}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Scope Note
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {engine.scopeNote}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-2">Executive Summary</h2>
          <p className="text-slate-300">{engine.summary}</p>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-3">Recovery Probability</h2>

          <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
            <div
              className="h-4 bg-emerald-500"
              style={{ width: `${engine.recoveryScore}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {engine.recoveryScore}% likelihood of meeting completion date
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Based on tasks, dashboard variance, risks, approvals, procurement, and snags.
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">Delay Heatmap</h2>

          <div className="space-y-3">
            {Object.entries(engine.phaseHeatmap).length === 0 ? (
              <div className="text-sm text-slate-500">
                No phase delay data available.
              </div>
            ) : (
              Object.entries(engine.phaseHeatmap).map(([phase, count]: any) => (
                <div key={phase}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{phase}</span>
                    <span>{count}</span>
                  </div>

                  <div className="w-full h-3 bg-slate-800 rounded">
                    <div
                      className="h-3 bg-red-500 rounded"
                      style={{ width: `${Math.min(100, count * 20)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {kpis.map(item => {
          const Icon = item.icon

          return (
            <div key={item.label} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </p>

                  <h2 className={`text-2xl font-bold mt-2 ${item.color}`}>
                    {item.value}
                  </h2>
                </div>

                <Icon size={18} className={item.color} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MiniMetric title="Progress" value={`${engine.progressPct}%`} />
        <MiniMetric title="Variance" value={engine.variancePct === null ? '—' : `${engine.variancePct}%`} />
        <MiniMetric title="Procurement Risks" value={engine.procurementRisks} />
        <MiniMetric title="High Risks" value={engine.highRisks} />
        <MiniMetric title="Pending Approvals" value={engine.pendingApprovals} />
        <MiniMetric title="Open Snags" value={engine.openSnags} />
        <MiniMetric title="Critical Snags" value={engine.criticalSnags} />
        <MiniMetric title="Forecast Finish" value={engine.forecastFinish.toDateString()} />
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Critical Delayed Activities</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="text-left py-3">#</th>
                <th className="text-left">Task</th>
                <th className="text-left">Phase</th>
                <th className="text-left">Planned Finish</th>
                <th className="text-left">Progress</th>
              </tr>
            </thead>

            <tbody>
              {engine.delayedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-emerald-400">
                    No delayed critical activities.
                  </td>
                </tr>
              ) : (
                engine.delayedTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-900">
                    <td className="py-3">{task.task_number}</td>
                    <td>{task.name}</td>
                    <td>{task.phase}</td>
                    <td>{task.finish_date}</td>
                    <td className="text-red-400">{task.progress_pct}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Recommended Recovery Actions</h2>

        <div className="space-y-3 text-sm text-slate-300">
          {engine.recommendations.map((item, i) => (
            <Action key={i} text={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="text-xl font-bold text-[#c49e48] mt-2">
        {value}
      </div>
    </div>
  )
}

function Action({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Hammer size={16} className="text-[#c49e48] mt-0.5" />
      <span>{text}</span>
    </div>
  )
}

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
  project_id?: number
  task_number: number
  name: string
  phase: string
  start_date: string
  finish_date: string
  duration_days: number
  dependencies: string | null
  progress_pct: number
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
  const [loading, setLoading] = useState(true)
  const { projectId } = useProjectStore()

  useEffect(() => {
    fetchTasks()
  }, [projectId])

  async function fetchTasks() {
    setLoading(true)

    if (!projectId) {
      setTasks([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('task_number', { ascending: true })

    if (error) {
      console.error(error)
      setTasks([])
    } else {
      setTasks((data || []) as Task[])
    }

    setLoading(false)
  }

  const engine = useMemo(() => {
    const today = new Date()

    const daysBetween = (a: Date, b: Date) =>
      Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))

    const safeDate = (value: string) => {
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date
    }

    const parseDeps = (dep: string | null) =>
      dep
        ? dep
            .split(',')
            .map(x => Number(x.trim()))
            .filter(Boolean)
        : []

    const downstreamMap: Record<number, number[]> = {}

    tasks.forEach(task => {
      const deps = parseDeps(task.dependencies)

      deps.forEach(d => {
        if (!downstreamMap[d]) downstreamMap[d] = []
        downstreamMap[d].push(task.task_number)
      })
    })

    const validTasks = tasks.filter(
      task => safeDate(task.start_date) && safeDate(task.finish_date)
    )

    const delayedTasks = validTasks.filter(task => {
      const finish = safeDate(task.finish_date)
      if (!finish) return false

      return finish < today && Number(task.progress_pct || 0) < 100
    })

    const taskDelayDays = delayedTasks.map(task => {
      const finish = safeDate(task.finish_date)
      return finish ? Math.max(0, daysBetween(today, finish)) : 0
    })

    // Important correction:
    // Do not add all delayed task days together.
    // Use the worst active delay because many tasks may run in parallel.
    const totalDelayDays =
      taskDelayDays.length === 0 ? 0 : Math.max(...taskDelayDays)

    const criticalTasks = validTasks
      .map(task => {
        const finish = safeDate(task.finish_date)!
        const start = safeDate(task.start_date)!

        const lateDays =
          finish < today && Number(task.progress_pct || 0) < 100
            ? Math.max(0, daysBetween(today, finish))
            : 0

        const daysToFinish = Math.max(0, daysBetween(finish, today))

        const totalDur = Math.max(1, Number(task.duration_days || 1))

        const elapsed = Math.max(0, daysBetween(today, start))

        const expectedProgress = Math.min(
          100,
          Math.round((elapsed / totalDur) * 100)
        )

        const progressLag = Math.max(
          0,
          expectedProgress - Number(task.progress_pct || 0)
        )

        const downstream = downstreamMap[task.task_number]?.length || 0

        let score = 0

        score += lateDays * 4
        score += progressLag * 0.8
        score += downstream * 12
        score += task.duration_days > 10 ? 10 : 0
        score += daysToFinish <= 30 ? 10 : 0
        score += task.rag === 'RED' ? 20 : task.rag === 'AMBER' ? 10 : 0

        return {
          ...task,
          score: Math.round(score),
          lateDays,
          progressLag,
          downstream,
        }
      })
      .filter(t => t.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    const projectFinish =
      validTasks.length > 0
        ? new Date(
            validTasks.reduce((latest, task) => {
              const taskFinish = safeDate(task.finish_date)!
              const latestFinish = safeDate(latest.finish_date)!

              return taskFinish > latestFinish ? task : latest
            }).finish_date
          )
        : today

    const forecastFinish = new Date(projectFinish)
    forecastFinish.setDate(projectFinish.getDate() + totalDelayDays)

    const recoverable =
      totalDelayDays <= 14 ? 'YES' : totalDelayDays <= 30 ? 'RISK' : 'NO'

    const requiredAcceleration =
      totalDelayDays === 0
        ? '0%'
        : `${Math.min(50, Math.round((totalDelayDays / 30) * 100))}%`

    const completionConfidence =
      totalDelayDays <= 7
        ? '92%'
        : totalDelayDays <= 14
        ? '78%'
        : totalDelayDays <= 30
        ? '56%'
        : '34%'

    const sourceTasks = delayedTasks.length > 0 ? delayedTasks : criticalTasks

    const recommendations = sourceTasks.slice(0, 6).map(task => {
      const taskName = task.name.toLowerCase()

      if (
        taskName.includes('block') ||
        taskName.includes('tiling') ||
        taskName.includes('plaster')
      ) {
        return `Add additional labour crew to ${task.name}`
      }

      if (
        taskName.includes('door') ||
        taskName.includes('window') ||
        taskName.includes('sanitary')
      ) {
        return `Fast-track materials delivery for ${task.name}`
      }

      if (
        taskName.includes('m&e') ||
        taskName.includes('electrical') ||
        taskName.includes('plumbing')
      ) {
        return `Run extended hours and parallel inspections for ${task.name}`
      }

      if (task.dependencies) {
        return `Prioritize ${task.name} as linked successor activities may be impacted`
      }

      if (task.duration_days > 10) {
        return `Split ${task.name} into work zones for parallel execution`
      }

      return `Daily review and 48-hour action plan for ${task.name}`
    })

    const phaseHeatmap = validTasks.reduce((acc: any, task: Task) => {
      const finish = safeDate(task.finish_date)
      const delayed =
        !!finish && finish < today && Number(task.progress_pct || 0) < 100

      if (!acc[task.phase || 'Unassigned Phase']) {
        acc[task.phase || 'Unassigned Phase'] = 0
      }

      if (delayed) {
        acc[task.phase || 'Unassigned Phase'] += 1
      }

      return acc
    }, {})

    return {
      delayedTasks,
      criticalTasks,
      recommendations,
      totalDelayDays,
      forecastFinish,
      recoverable,
      requiredAcceleration,
      completionConfidence,
      phaseHeatmap,

      summary:
        totalDelayDays === 0
          ? 'Project currently on track with no active delays.'
          : totalDelayDays <= 7
          ? 'Minor delay detected. Recoverable with immediate action.'
          : totalDelayDays <= 14
          ? 'Moderate delay affecting programme. Recovery measures required.'
          : 'Major delay threatening completion date. Executive intervention required.',

      recoveryScore:
        totalDelayDays === 0
          ? 95
          : totalDelayDays <= 7
          ? 80
          : totalDelayDays <= 14
          ? 65
          : totalDelayDays <= 30
          ? 45
          : 20,
    }
  }, [tasks])

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
      value: engine.completionConfidence,
      icon: TrendingUp,
      color: 'text-violet-400',
    },
  ]

  if (loading) {
    return (
      <div className="p-8 text-white">
        Loading Recovery Forecast...
      </div>
    )
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
        <h1 className="text-2xl font-bold">
          Recovery Forecast Engine
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Predict delays, forecast completion, and recommend recovery actions.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-2">
            Executive Summary
          </h2>
          <p className="text-slate-300">
            {engine.summary}
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-3">
            Recovery Probability
          </h2>

          <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
            <div
              className="h-4 bg-emerald-500"
              style={{ width: `${engine.recoveryScore}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {engine.recoveryScore}% likelihood of meeting completion date
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">
            Delay Heatmap
          </h2>

          <div className="space-y-3">
            {Object.entries(engine.phaseHeatmap).map(([phase, count]: any) => (
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
            ))}
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

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-2">
          Forecast Completion Date
        </h2>

        <div className="text-3xl font-bold text-[#c49e48]">
          {engine.forecastFinish.toDateString()}
        </div>

        <p className="text-sm text-slate-400 mt-2">
          Based on the worst active delay and current productivity trend.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">
          Critical Delayed Activities
        </h2>

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
                    <td className="text-red-400">
                      {task.progress_pct}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">
          Recommended Recovery Actions
        </h2>

        <div className="space-y-3 text-sm text-slate-300">
          {engine.delayedTasks.length === 0 ? (
            <div className="text-emerald-400 text-sm">
              No recovery action required. Project on track.
            </div>
          ) : (
            engine.recommendations.map((item, i) => (
              <Action key={i} text={item} />
            ))
          )}
        </div>
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

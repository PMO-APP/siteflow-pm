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

    const safeDate = (value?: string) => {
      if (!value) return null
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }

    const daysBetween = (a: Date, b: Date) =>
      Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))

    const validTasks = tasks.filter(
      task => safeDate(task.start_date) && safeDate(task.finish_date)
    )

    const delayedTasks = validTasks.filter(task => {
      const finish = safeDate(task.finish_date)
      return !!finish && finish < today && Number(task.progress_pct || 0) < 100
    })

    const totalTasks = validTasks.length

    const completedTasks = validTasks.filter(
      t => Number(t.progress_pct || 0) >= 100 || t.status === 'Completed'
    ).length

    const avgProgress =
      totalTasks === 0
        ? 0
        : Math.round(
            validTasks.reduce((sum, t) => {
              if (t.status === 'Completed') return sum + 100
              return sum + Number(t.progress_pct || 0)
            }, 0) / totalTasks
          )

    const taskDelayDays = delayedTasks.map(task => {
      const finish = safeDate(task.finish_date)
      return finish ? Math.max(0, daysBetween(today, finish)) : 0
    })

    const worstDelay =
      taskDelayDays.length === 0 ? 0 : Math.max(...taskDelayDays)

    const avgTaskDelay =
      taskDelayDays.length === 0
        ? 0
        : Math.round(
            taskDelayDays.reduce((sum, d) => sum + d, 0) /
              taskDelayDays.length
          )

    const redTasks = validTasks.filter(t => t.rag === 'RED').length
    const amberTasks = validTasks.filter(t => t.rag === 'AMBER').length

    const activeTasks = validTasks.filter(
      t => t.status === 'In Progress' || Number(t.progress_pct || 0) > 0
    ).length

    let confidenceScore = 100

    confidenceScore -= worstDelay * 1.2
    confidenceScore -= avgTaskDelay * 0.8
    confidenceScore -= redTasks * 6
    confidenceScore -= amberTasks * 2

    if (avgProgress < 25) confidenceScore -= 20
    else if (avgProgress < 50) confidenceScore -= 10
    else if (avgProgress >= 75) confidenceScore += 5

    if (delayedTasks.length > 5) confidenceScore -= 15
    if (activeTasks === 0 && totalTasks > 0) confidenceScore -= 10

    confidenceScore = Math.max(5, Math.min(98, Math.round(confidenceScore)))

    let recoveryScore = confidenceScore

    if (worstDelay > 30) recoveryScore -= 20
    if (redTasks >= 5) recoveryScore -= 15
    if (avgProgress >= 70 && worstDelay <= 14) recoveryScore += 8

    recoveryScore = Math.max(5, Math.min(95, Math.round(recoveryScore)))

    const recoverable =
      recoveryScore >= 75 ? 'YES' : recoveryScore >= 50 ? 'RISK' : 'NO'

    const requiredAcceleration =
      worstDelay === 0
        ? '0%'
        : `${Math.min(50, Math.round(worstDelay * 1.8))}%`

    const latestTask =
      validTasks.length > 0
        ? validTasks.reduce((latest, current) => {
            const currentDate = safeDate(current.finish_date)
            const latestDate = safeDate(latest.finish_date)

            if (currentDate && latestDate && currentDate > latestDate) {
              return current
            }

            return latest
          })
        : null

    const forecastFinish = latestTask
      ? new Date(latestTask.finish_date)
      : new Date()

    forecastFinish.setDate(forecastFinish.getDate() + worstDelay)

    const phaseHeatmap = validTasks.reduce((acc: any, task) => {
      const phase = task.phase || 'Unassigned Phase'
      const finish = safeDate(task.finish_date)

      if (!acc[phase]) acc[phase] = 0

      const delayed =
        !!finish && finish < today && Number(task.progress_pct || 0) < 100

      if (delayed) acc[phase] += 1

      return acc
    }, {})

    const criticalTasks = validTasks
      .map(task => {
        const finish = safeDate(task.finish_date)
        const start = safeDate(task.start_date)

        const lateDays =
          finish && finish < today && Number(task.progress_pct || 0) < 100
            ? Math.max(0, daysBetween(today, finish))
            : 0

        const totalDur = Math.max(1, Number(task.duration_days || 1))

        const elapsed =
          start ? Math.max(0, daysBetween(today, start)) : 0

        const expectedProgress = Math.min(
          100,
          Math.round((elapsed / totalDur) * 100)
        )

        const progressLag = Math.max(
          0,
          expectedProgress - Number(task.progress_pct || 0)
        )

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
        'Project delivery performance is healthy with strong recovery capability and manageable execution risks.'
    } else if (confidenceScore >= 65) {
      summary =
        'Project is experiencing moderate delivery pressure. Recovery actions are required to maintain the target completion date.'
    } else {
      summary =
        'Project delivery is under significant stress. Delays and execution risks may threaten the completion timeline.'
    }

    const recommendations: string[] = []

    if (redTasks > 0) {
      recommendations.push('Escalate all RED activities to executive monitoring.')
    }

    if (worstDelay > 14) {
      recommendations.push('Introduce a recovery programme with parallel work fronts.')
    }

    if (avgProgress < 50) {
      recommendations.push('Increase workforce productivity and tighten site supervision.')
    }

    if (delayedTasks.length > 3) {
      recommendations.push('Conduct weekly delay review meetings with contractors.')
    }

    if (amberTasks > 3) {
      recommendations.push('Convert AMBER activities into short-term action plans before they become critical.')
    }

    if (recommendations.length === 0) {
      recommendations.push('Project currently progressing within acceptable thresholds.')
    }

    return {
      delayedTasks,
      criticalTasks,
      recommendations,
      totalDelayDays: worstDelay,
      avgTaskDelay,
      avgProgress,
      completedTasks,
      totalTasks,
      confidenceScore,
      recoveryScore,
      forecastFinish,
      recoverable,
      requiredAcceleration,
      phaseHeatmap,
      summary,
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
      value: `${engine.confidenceScore}%`,
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

          <p className="mt-1 text-xs text-slate-500">
            Based on task progress, active delay, RAG pressure, and recovery capacity.
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-4">
            Delay Heatmap
          </h2>

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

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-sm text-slate-400 uppercase tracking-wider">
            Average Progress
          </h2>
          <div className="text-3xl font-bold text-[#c49e48] mt-2">
            {engine.avgProgress}%
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {engine.completedTasks}/{engine.totalTasks} tasks completed
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-sm text-slate-400 uppercase tracking-wider">
            Average Delay
          </h2>
          <div className="text-3xl font-bold text-amber-400 mt-2">
            {engine.avgTaskDelay} Days
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Average delay across delayed activities
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-sm text-slate-400 uppercase tracking-wider">
            Forecast Completion Date
          </h2>
          <div className="text-2xl font-bold text-[#c49e48] mt-2">
            {engine.forecastFinish.toDateString()}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Based on active delay and programme trend
          </p>
        </div>
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
          {engine.recommendations.map((item, i) => (
            <Action key={i} text={item} />
          ))}
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

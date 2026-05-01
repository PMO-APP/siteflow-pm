// ===============================================
// FULL RECOVERY FORECAST ENGINE
// React + TypeScript + Supabase
// File: src/pages/RecoveryForecastPage.tsx
// ===============================================

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Gauge,
  Hammer,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

// ================= TYPES =================

type Task = {
  id: string
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
  icon: any
  color: string
}

// ================= PAGE =================

export default function RecoveryForecastPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('task_number', { ascending: true })

    if (!error && data) {
      setTasks(data as Task[])
    }

    setLoading(false)
  }

  // ================= ENGINE =================

  const engine = useMemo(() => {
    const today = new Date()

    const delayedTasks = tasks.filter((task) => {
      const finish = new Date(task.finish_date)
      return finish < today && Number(task.progress_pct) < 100
    })

    const totalDelayDays = delayedTasks.reduce((sum, task) => {
      const finish = new Date(task.finish_date)
      const diff =
        Math.ceil(
          (today.getTime() - finish.getTime()) /
            (1000 * 60 * 60 * 24)
        ) || 0

      return sum + diff
    }, 0)

    const projectFinish =
      tasks.length > 0
        ? new Date(
            tasks.reduce((latest, task) =>
              new Date(task.finish_date) >
              new Date(latest.finish_date)
                ? task
                : latest
            ).finish_date
          )
        : today

    const forecastFinish = new Date(projectFinish)
    forecastFinish.setDate(
      projectFinish.getDate() + totalDelayDays
    )

    const criticalRed = tasks.filter(
      (t) => t.rag === 'RED'
    ).length

    const amber = tasks.filter(
      (t) => t.rag === 'AMBER'
    ).length

    const recoverable =
      totalDelayDays <= 14
        ? 'YES'
        : totalDelayDays <= 30
        ? 'RISK'
        : 'NO'

    const requiredAcceleration =
      totalDelayDays === 0
        ? '0%'
        : `${Math.min(
            50,
            Math.round((totalDelayDays / 30) * 100)
          )}%`

    const completionConfidence =
      totalDelayDays <= 7
        ? '92%'
        : totalDelayDays <= 14
        ? '78%'
        : totalDelayDays <= 30
        ? '56%'
        : '34%'

    return {
      delayedTasks,
      totalDelayDays,
      forecastFinish,
      criticalRed,
      amber,
      recoverable,
      requiredAcceleration,
      completionConfidence,
    }
  }, [tasks])

  // ================= KPI =================

  const kpis: KPI[] = [
    {
      label: 'Delayed Tasks',
      value: engine.delayedTasks.length,
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      label: 'Total Delay',
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

  // ================= UI =================

  if (loading) {
    return (
      <div className="p-8 text-white">
        Loading Recovery Forecast...
      </div>
    )
  }

  return (
    <div className="space-y-5 text-white">
      {/* Header */}
      <div className="card p-5">
        <h1 className="text-2xl font-bold">
          Recovery Forecast Engine
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Predict delays, forecast completion, and
          recommend recovery actions.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid md:grid-cols-5 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.label}
              className="card p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                  <h2
                    className={`text-2xl font-bold mt-2 ${item.color}`}
                  >
                    {item.value}
                  </h2>
                </div>

                <Icon
                  size={18}
                  className={item.color}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Forecast Finish */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-2">
          Forecast Completion Date
        </h2>

        <div className="text-3xl font-bold text-[#c49e48]">
          {engine.forecastFinish.toDateString()}
        </div>

        <p className="text-sm text-slate-400 mt-2">
          Based on active delays and current
          productivity trend.
        </p>
      </div>

      {/* Delayed Tasks Table */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">
          Critical Delayed Activities
        </h2>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Task</th>
                <th className="text-left py-2">Phase</th>
                <th className="text-left py-2">
                  Planned Finish
                </th>
                <th className="text-left py-2">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody>
              {engine.delayedTasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-slate-800"
                >
                  <td className="py-2">
                    {task.task_number}
                  </td>
                  <td className="py-2">
                    {task.name}
                  </td>
                  <td className="py-2">
                    {task.phase}
                  </td>
                  <td className="py-2">
                    {task.finish_date}
                  </td>
                  <td className="py-2">
                    {task.progress_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery Actions */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">
          Recommended Recovery Actions
        </h2>

        <div className="space-y-3 text-sm text-slate-300">
          <Action text="Deploy extra manpower to RED critical tasks" />
          <Action text="Run parallel trades where dependencies allow" />
          <Action text="Weekend overtime on critical path tasks" />
          <Action text="Expedite procurement long-lead materials" />
          <Action text="Daily contractor review with 48hr commitments" />
          <Action text="Split zones to accelerate finishes" />
        </div>
      </div>
    </div>
  )
}

// ================= SMALL COMPONENTS =================

function Action({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Hammer
        size={16}
        className="text-[#c49e48] mt-0.5"
      />
      <span>{text}</span>
    </div>
  )
}

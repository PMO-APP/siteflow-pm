import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { CalendarDays, CheckCircle2, Circle, Clock3, Flag, AlertTriangle } from 'lucide-react'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'

interface Props {
  tasks: Task[]
  onTaskClick: (t: Task) => void
}

interface TimelineRange {
  start: Date
  end: Date
  totalDays: number
  months: Date[]
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

const makeTimelineRange = (tasks: Task[]): TimelineRange => {
  const dates = tasks.flatMap(task => [parseDate(task.start_date), parseDate(task.finish_date)]).filter(Boolean) as Date[]
  const today = new Date()

  const earliest = dates.length
    ? new Date(Math.min(...dates.map(date => date.getTime()), today.getTime()))
    : today
  const latest = dates.length
    ? new Date(Math.max(...dates.map(date => date.getTime()), today.getTime()))
    : addMonths(today, 3)

  const start = startOfMonth(addMonths(earliest, -1))
  const end = endOfMonth(addMonths(latest, 1))
  const totalDays = Math.max(1, differenceInCalendarDays(end, start))

  const months: Date[] = []
  let cursor = startOfMonth(start)
  while (cursor <= end) {
    months.push(cursor)
    cursor = addMonths(cursor, 1)
  }

  return { start, end, totalDays, months }
}

const clamp = (value: number) => Math.max(0, Math.min(100, value))

const positionPct = (date: Date, range: TimelineRange) =>
  clamp((differenceInCalendarDays(date, range.start) / range.totalDays) * 100)

const getStatusMeta = (task: Task) => {
  if (task.status === 'Completed') {
    return {
      label: 'Completed',
      Icon: CheckCircle2,
      bar: 'bg-emerald-500',
      fill: 'bg-emerald-600',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (task.status === 'In Progress') {
    return {
      label: 'In progress',
      Icon: Clock3,
      bar: 'bg-sky-200',
      fill: 'bg-[#16476b]',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
    }
  }

  if (task.rag === 'RED') {
    return {
      label: 'Overdue',
      Icon: AlertTriangle,
      bar: 'bg-rose-100',
      fill: 'bg-[#ef6b54]',
      badge: 'border-rose-200 bg-rose-50 text-rose-700',
    }
  }

  return {
    label: 'Planned',
    Icon: Circle,
    bar: 'bg-slate-200',
    fill: 'bg-[#8aa7ba]',
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
  }
}

export default function GanttView({ tasks, onTaskClick }: Props) {
  const range = makeTimelineRange(tasks)
  const today = new Date()
  const todayPct = positionPct(today, range)
  const phases = [...new Set(tasks.map(task => task.phase || 'Unassigned'))]

  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
        <h3 className="mt-4 text-base font-semibold text-[#153b59]">No schedule activities to display</h3>
        <p className="mt-1 text-sm text-slate-500">Import or create schedule activities to populate the Gantt view.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(22,71,107,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ef6b54]">Schedule timeline</p>
          <h3 className="mt-1 text-lg font-semibold text-[#153b59]">Programme Gantt</h3>
          <p className="mt-1 text-xs text-slate-500">Select an activity bar to review or update its delivery position.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {[
            ['bg-emerald-500', 'Completed'],
            ['bg-[#16476b]', 'In progress'],
            ['bg-[#8aa7ba]', 'Planned'],
            ['bg-[#ef6b54]', 'Overdue'],
          ].map(([colour, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
              <span className={`h-2 w-2 rounded-full ${colour}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(1080, range.months.length * 145 + 340) }}>
          <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-slate-50/95 backdrop-blur">
            <div className="sticky left-0 z-40 w-[340px] flex-shrink-0 border-r border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Activity</span>
            </div>
            <div className="relative flex-1">
              <div className="flex h-full">
                {range.months.map(month => {
                  const monthStart = month < range.start ? range.start : month
                  const rawMonthEnd = endOfMonth(month)
                  const monthEnd = rawMonthEnd > range.end ? range.end : rawMonthEnd
                  const days = Math.max(1, differenceInCalendarDays(monthEnd, monthStart) + 1)
                  const width = (days / (range.totalDays + 1)) * 100

                  return (
                    <div
                      key={month.toISOString()}
                      className="border-r border-slate-200 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 last:border-r-0"
                      style={{ width: `${width}%` }}
                    >
                      {format(month, 'MMM yyyy')}
                    </div>
                  )
                })}
              </div>
              <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-[#ef6b54]" style={{ left: `${todayPct}%` }}>
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-b-md bg-[#ef6b54] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                  Today
                </span>
              </div>
            </div>
          </div>

          {phases.map(phase => {
            const phaseTasks = tasks.filter(task => (task.phase || 'Unassigned') === phase)
            const completed = phaseTasks.filter(task => task.status === 'Completed').length
            const phaseProgress = phaseTasks.length
              ? Math.round(phaseTasks.reduce((sum, task) => sum + Number(task.progress_pct || 0), 0) / phaseTasks.length)
              : 0

            return (
              <section key={phase}>
                <div className="flex border-b border-slate-200 bg-[#f3f7f9]">
                  <div className="sticky left-0 z-20 flex w-[340px] flex-shrink-0 items-center justify-between gap-3 border-r border-slate-200 bg-[#f3f7f9] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#153b59]">{phase}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{completed}/{phaseTasks.length} completed</p>
                    </div>
                    <span className="rounded-full border border-sky-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-[#16476b]">
                      {phaseProgress}%
                    </span>
                  </div>
                  <div className="relative h-[54px] flex-1">
                    {range.months.slice(1).map(month => (
                      <div
                        key={month.toISOString()}
                        className="absolute inset-y-0 border-l border-slate-200/80"
                        style={{ left: `${positionPct(month, range)}%` }}
                      />
                    ))}
                    <div className="absolute inset-y-0 z-10 w-px bg-[#ef6b54]/80" style={{ left: `${todayPct}%` }} />
                  </div>
                </div>

                {phaseTasks.map(task => {
                  const start = parseDate(task.start_date)
                  const finish = parseDate(task.finish_date) || start
                  const left = start ? positionPct(start, range) : 0
                  const end = finish ? positionPct(finish, range) : left
                  const width = Math.max(0.45, end - left)
                  const progress = clamp(Number(task.progress_pct || 0))
                  const status = getStatusMeta(task)
                  const StatusIcon = status.Icon

                  return (
                    <div key={task.id} className="group flex min-h-[52px] border-b border-slate-100 bg-white transition-colors hover:bg-sky-50/35">
                      <button
                        type="button"
                        onClick={() => onTaskClick(task)}
                        className="sticky left-0 z-20 flex w-[340px] flex-shrink-0 items-center gap-3 border-r border-slate-200 bg-inherit px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ef6b54]"
                      >
                        <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border ${status.badge}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400">#{task.task_number}</span>
                            {task.is_milestone && <Flag className="h-3 w-3 text-[#ef6b54]" />}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-medium text-[#153b59]" title={task.name}>{task.name}</span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {start ? fdate(task.start_date) : 'No start date'} · {finish ? fdate(task.finish_date) : 'No finish date'}
                          </span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">{progress}%</span>
                      </button>

                      <div className="relative flex-1">
                        {range.months.slice(1).map(month => (
                          <div
                            key={month.toISOString()}
                            className="absolute inset-y-0 border-l border-slate-100"
                            style={{ left: `${positionPct(month, range)}%` }}
                          />
                        ))}
                        <div className="absolute inset-y-0 z-10 w-px bg-[#ef6b54]/70" style={{ left: `${todayPct}%` }} />

                        {start && (
                          task.is_milestone ? (
                            <button
                              type="button"
                              onClick={() => onTaskClick(task)}
                              className="absolute top-1/2 z-20 h-4 w-4 -translate-y-1/2 rotate-45 rounded-[3px] border-2 border-white bg-[#ef6b54] shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef6b54] focus-visible:ring-offset-2"
                              style={{ left: `calc(${left}% - 8px)` }}
                              title={`Milestone: ${task.name}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => onTaskClick(task)}
                              className={`absolute top-1/2 z-20 h-5 -translate-y-1/2 overflow-hidden rounded-md ${status.bar} shadow-sm ring-1 ring-inset ring-black/5 transition-all hover:-translate-y-[55%] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef6b54] focus-visible:ring-offset-2`}
                              style={{ left: `${left}%`, width: `${width}%`, minWidth: 7 }}
                              title={`#${task.task_number} ${task.name} | ${fdate(task.start_date)} → ${fdate(task.finish_date)} | ${progress}%`}
                            >
                              <span className={`block h-full ${status.fill}`} style={{ width: `${progress}%` }} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
        <span>{tasks.length} activities across {phases.length} phases</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-[#ef6b54]" />
          The coral line marks today
        </span>
      </div>
    </div>
  )
}

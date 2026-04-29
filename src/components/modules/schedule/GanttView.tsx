import { differenceInDays, parseISO } from 'date-fns'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'

const GANTT_START = new Date('2026-04-01')
const GANTT_END = new Date('2026-09-30')
const TOTAL_DAYS = differenceInDays(GANTT_END, GANTT_START)
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

const pct = (d: string) => Math.max(0, Math.min(100, (differenceInDays(parseISO(d), GANTT_START) / TOTAL_DAYS) * 100))

const barColor = (t: Task) => {
  if (t.status === 'Completed') return 'bg-emerald-500/70'
  if (t.status === 'In Progress') return 'bg-amber-500'
  if (t.rag === 'RED') return 'bg-red-500'
  return 'bg-[#c49e48]/50'
}

interface Props {
  tasks: Task[]
  onTaskClick: (t: Task) => void
}

export default function GanttView({ tasks, onTaskClick }: Props) {
  const today = new Date()
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, GANTT_START) / TOTAL_DAYS) * 100))

  const PHASES = [...new Set(tasks.map(t => t.phase))]

  return (
    <div className="card overflow-hidden">
      <div style={{ minWidth: 900 }}>
        {/* Header */}
        <div className="flex bg-[#1c2a36] border-b border-white/[0.06]">
          <div className="w-60 flex-shrink-0 px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[#6e7d8c]">Task</div>
          <div className="flex-1 flex">
            {MONTHS.map(m => (
              <div key={m} className="flex-1 py-2 text-center text-[8px] font-mono uppercase tracking-wider text-[#6e7d8c] border-l border-white/[0.04]">{m}</div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {PHASES.map(ph => {
          const pts = tasks.filter(t => t.phase === ph)
          return (
            <div key={ph}>
              {/* Phase header */}
              <div className="flex bg-[#1a2530] border-b border-white/[0.04]">
                <div className="w-60 flex-shrink-0 px-3 py-1.5 font-display text-[11px] font-semibold text-[#ede8de]">{ph}</div>
                <div className="flex-1 relative h-6">
                  <div className="absolute top-0 bottom-0 w-px bg-red-500/50" style={{ left: `${todayPct}%` }} />
                </div>
              </div>

              {pts.map(t => {
                const hasStart = !!t.start_date
                const hasEnd = !!t.finish_date
                const left = hasStart ? pct(t.start_date!) : 0
                const right = hasEnd ? pct(t.finish_date!) : left
                const width = Math.max(0.5, right - left)

                return (
                  <div key={t.id} className="flex border-b border-white/[0.02] hover:bg-white/[0.015] group">
                    <div className="w-60 flex-shrink-0 px-3 py-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-[#6e7d8c]">#{t.task_number}</span>
                      <span className="text-[11px] text-[#bfb9ae] truncate" title={t.name}>{t.name.length > 26 ? t.name.slice(0, 26) + '…' : t.name}</span>
                    </div>
                    <div className="flex-1 relative h-[28px]">
                      {/* Month grid lines */}
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.025]" style={{ left: `${(i / 6) * 100}%` }} />
                      ))}
                      {/* Today line */}
                      <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10" style={{ left: `${todayPct}%` }} />
                      {/* Task bar */}
                      {hasStart && (
                        <div
                          className={`absolute top-[7px] h-[13px] rounded ${barColor(t)} cursor-pointer hover:opacity-80 transition-opacity`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`#${t.task_number} ${t.name} | ${fdate(t.start_date)} → ${fdate(t.finish_date)}`}
                          onClick={() => onTaskClick(t)}
                        >
                          {t.is_milestone && <div className="absolute -top-0.5 -right-1 w-3 h-3 bg-[#c49e48] rotate-45 rounded-sm" />}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Legend */}
        <div className="flex items-center gap-5 px-4 py-3 border-t border-white/[0.06] bg-[#111820]">
          {[
            { color: 'bg-emerald-500/70', label: 'Completed' },
            { color: 'bg-amber-500', label: 'In Progress' },
            { color: 'bg-[#c49e48]/50', label: 'Planned' },
            { color: 'bg-red-500', label: 'Overdue' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-2.5 rounded ${l.color}`} />
              <span className="text-[9px] text-[#6e7d8c]">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4">
            <div className="w-px h-3 bg-red-500/50" />
            <span className="text-[9px] text-[#6e7d8c]">Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}

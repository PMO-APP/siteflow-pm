import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'

const KEY_MILESTONES = [
  { name: 'Specialist Contractors Awarded', date: '2026-05-13' },
  { name: 'Roof Structure Complete', date: '2026-06-11' },
  { name: 'Building Envelope Closed', date: '2026-07-10' },
  { name: 'MEP Second Fix Complete', date: '2026-06-30' },
  { name: 'Tiling Complete', date: '2026-08-15' },
  { name: 'Hammam/Koi/Cascade Complete', date: '2026-08-31' },
  { name: 'Interior Design Complete', date: '2026-09-10' },
  { name: 'Testing & Commissioning Complete', date: '2026-09-17' },
  { name: 'Formal Handover', date: '2026-09-18' },
]

interface Props { tasks: Task[] }

export default function MilestoneTracker({ tasks }: Props) {
  const today = new Date()

  const milestoneTasks = tasks.filter(t => t.is_milestone)
  const allMilestones = [
    ...KEY_MILESTONES.map(m => ({ ...m, type: 'key', status: differenceInDays(new Date(m.date), today) < 0 ? 'Past' : 'Upcoming' })),
    ...milestoneTasks.map(t => ({ name: t.name, date: t.finish_date || '', type: 'task', status: t.status })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Milestone Tracker</div></div>
      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.08]" />

          <div className="space-y-1">
            {allMilestones.map((m, i) => {
              const days = m.date ? differenceInDays(new Date(m.date), today) : null
              const isPast = days !== null && days < 0
              const isToday = days === 0
              const isKey = m.type === 'key'
              const isDone = m.status === 'Completed' || m.status === 'Past' || isPast

              return (
                <div key={i} className="flex items-start gap-4 py-2">
                  {/* Dot */}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${isDone ? 'bg-emerald-500/20 border-emerald-500' : isToday ? 'bg-[#c49e48] border-[#c49e48]' : isKey ? 'bg-[#1c2a36] border-[#c49e48]/50' : 'bg-[#1c2a36] border-white/[0.1]'}`}>
                    {isDone ? <span className="text-emerald-400 text-sm">✓</span> : <span className="text-[#6e7d8c] text-xs">{i + 1}</span>}
                  </div>

                  <div className="flex-1 pt-1.5">
                    <div className={`text-[13px] font-medium ${isDone ? 'text-[#6e7d8c] line-through' : 'text-[#ede8de]'}`}>
                      {m.name}
                      {isKey && <span className="ml-2 badge badge-gold">KEY</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[#6e7d8c]">{fdate(m.date)}</span>
                      {days !== null && !isDone && (
                        <span className={`text-[11px] font-mono ${days <= 14 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-[#6e7d8c]'}`}>
                          {isToday ? 'TODAY' : `${Math.abs(days)}d ${days < 0 ? 'ago' : 'to go'}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

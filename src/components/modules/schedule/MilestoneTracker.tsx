import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'

interface Props {
  tasks: Task[]
}

export default function MilestoneTracker({ tasks }: Props) {
  const today = new Date()

  const milestones = tasks
    .filter(task => task.is_milestone)
    .sort((a, b) => {
      const aDate = a.finish_date || ''
      const bDate = b.finish_date || ''
      return aDate.localeCompare(bDate)
    })

  if (milestones.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-xl font-bold text-[#ede8de]">
          No milestones found
        </div>

        <p className="text-sm text-[#6e7d8c] mt-2">
          This project has no milestone tasks yet. Mark schedule tasks as
          milestones or import a schedule with a Milestone column.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Milestone Tracker</div>
      </div>

      <div className="p-4">
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.08]" />

          <div className="space-y-1">
            {milestones.map((milestone, index) => {
              const finishDate = milestone.finish_date
                ? new Date(milestone.finish_date)
                : null

              const days = finishDate
                ? differenceInDays(finishDate, today)
                : null

              const isCompleted = milestone.status === 'Completed'
              const isPast = days !== null && days < 0
              const isToday = days === 0
              const isOverdue = isPast && !isCompleted

              return (
                <div key={milestone.id} className="flex items-start gap-4 py-2">
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : isOverdue
                        ? 'bg-red-500/20 border-red-500'
                        : isToday
                        ? 'bg-[#c49e48] border-[#c49e48]'
                        : 'bg-[#1c2a36] border-[#c49e48]/50'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="text-emerald-400 text-sm">✓</span>
                    ) : (
                      <span
                        className={`text-xs ${
                          isToday ? 'text-[#0c1014]' : 'text-[#6e7d8c]'
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 pt-1.5">
                    <div
                      className={`text-[13px] font-medium ${
                        isCompleted
                          ? 'text-[#6e7d8c] line-through'
                          : 'text-[#ede8de]'
                      }`}
                    >
                      {milestone.name}
                      <span className="ml-2 badge badge-gold">KEY</span>
                    </div>

                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[#6e7d8c]">
                        {fdate(milestone.finish_date)}
                      </span>

                      {days !== null && !isCompleted && (
                        <span
                          className={`text-[11px] font-mono ${
                            isOverdue
                              ? 'text-red-400'
                              : days <= 14
                              ? 'text-red-400'
                              : days <= 30
                              ? 'text-amber-400'
                              : 'text-[#6e7d8c]'
                          }`}
                        >
                          {isToday
                            ? 'TODAY'
                            : isOverdue
                            ? `${Math.abs(days)}d overdue`
                            : `${days}d to go`}
                        </span>
                      )}

                      {isCompleted && (
                        <span className="text-[11px] font-mono text-emerald-400">
                          Completed
                        </span>
                      )}
                    </div>

                    {milestone.phase && (
                      <div className="text-[10px] text-[#6e7d8c] mt-1">
                        Phase: {milestone.phase}
                      </div>
                    )}
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

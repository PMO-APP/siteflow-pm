import { differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react'
import type { RFI } from '../types'

export default function RFISLAIndicator({ rfi }: { rfi: RFI }) {
  if (!rfi.due_date) {
    return <span className="text-sm text-slate-500">No response due date set</span>
  }

  if (rfi.status === 'Answered' || rfi.status === 'Closed') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
        <CheckCircle2 size={16} /> Response completed
      </span>
    )
  }

  const due = startOfDay(new Date(rfi.due_date))
  const today = startOfDay(new Date())
  const days = differenceInCalendarDays(due, today)

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-red-300">
        <AlertTriangle size={16} /> Overdue by {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${days === 0 ? 'text-amber-300' : 'text-sky-300'}`}>
      <CalendarClock size={16} />
      {days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} remaining`} · {format(due, 'dd MMM yyyy')}
    </span>
  )
}

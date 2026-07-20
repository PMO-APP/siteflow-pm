import { format } from 'date-fns'
import { CheckCircle2, Circle, MessageSquare, Send, XCircle } from 'lucide-react'
import { useRFIHistory } from '../hooks/useRFIs'

function iconFor(eventType: string) {
  if (eventType === 'answered' || eventType === 'closed') return CheckCircle2
  if (eventType === 'submitted') return Send
  if (eventType === 'comment_added') return MessageSquare
  if (eventType === 'rejected') return XCircle
  return Circle
}

export default function RFITimeline({ rfiId }: { rfiId: string }) {
  const { data = [], isLoading, error } = useRFIHistory(rfiId)
  if (isLoading) return <div className="text-sm text-slate-500">Loading timeline…</div>
  if (error) return <div className="text-sm text-red-300">{(error as Error).message}</div>
  if (!data.length) return <div className="text-sm text-slate-500">No workflow history has been recorded yet.</div>

  return (
    <ol className="space-y-0">
      {data.map((event, index) => {
        const Icon = iconFor(event.event_type)
        const isLast = index === data.length - 1
        return (
          <li key={event.id} className="relative flex gap-4 pb-7">
            {!isLast && <div className="absolute left-[11px] top-6 h-full w-px bg-white/10" />}
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[#c49e48]">
              <Icon size={14} />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm text-slate-200">{event.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {event.actor_name || 'System'} · {format(new Date(event.created_at), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

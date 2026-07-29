import { CheckCircle2, Clock3, ExternalLink, History, ShieldCheck, AlertTriangle } from 'lucide-react'
import type { runProjectIntelligence } from '@/intelligence/PIF'
import type { IntelligenceSource } from '@/intelligence/models/IntelligenceEvent'

interface Props {
  intelligence: ReturnType<typeof runProjectIntelligence>
  onOpenSource: (source: IntelligenceSource) => void
}

function badge(status: string) {
  if (status === 'overdue') return 'bg-red-50 text-red-700'
  if (status === 'due_today') return 'bg-amber-50 text-amber-800'
  if (status === 'due_soon') return 'bg-blue-50 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

export function ActionControlPanel({ intelligence, onOpenSource }: Props) {
  const action = intelligence.actionIntelligence
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Action control</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Decisions, owners and follow-through</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{action.executiveSummary}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-center"><div className="text-xs text-slate-500">Control score</div><div className="mt-1 text-xl font-semibold">{action.controlScore}%</div></div>
          <div className="rounded-xl bg-red-50 px-4 py-3 text-center"><div className="text-xs text-red-600">Overdue</div><div className="mt-1 text-xl font-semibold text-red-700">{action.overdueCount}</div></div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-center"><div className="text-xs text-blue-600">Due soon</div><div className="mt-1 text-xl font-semibold text-blue-700">{action.dueSoonCount}</div></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"><ShieldCheck className="h-4 w-4"/> Priority action register</div>
          <div className="divide-y divide-slate-100">
            {action.actions.slice(0, 7).map(item => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  {item.status === 'overdue' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600"/> : <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"/>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><div className="font-semibold text-slate-900">{item.title}</div><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge(item.status)}`}>{item.status.replace('_', ' ')}</span></div>
                    <div className="mt-1 text-sm text-slate-600">{item.rationale}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Owner: {item.owner}</span><span>Confidence: {item.confidence}%</span>{item.dueDate && <span>Due: {item.dueDate}</span>}</div>
                  </div>
                  {item.source && <button onClick={() => onOpenSource(item.source!)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" aria-label={`Open ${item.source}`}><ExternalLink className="h-4 w-4"/></button>}
                </div>
              </div>
            ))}
            {!action.actions.length && <div className="p-5 text-sm text-slate-500">No active management actions were generated.</div>}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"><History className="h-4 w-4"/> Decision timeline</div>
          <div className="max-h-[420px] divide-y divide-slate-100 overflow-auto">
            {action.timeline.slice(0, 7).map(item => (
              <div key={item.id} className="p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${item.outcome === 'positive' ? 'text-emerald-600' : item.outcome === 'negative' ? 'text-red-600' : 'text-slate-500'}`}/>
                  <div className="min-w-0"><div className="font-medium text-slate-900">{item.title}</div><div className="mt-1 text-xs text-slate-500">{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div className="mt-1 text-sm text-slate-600">{item.description}</div></div>
                </div>
              </div>
            ))}
            {!action.timeline.length && <div className="p-5 text-sm text-slate-500">No decision history is available yet.</div>}
          </div>
        </div>
      </div>
    </section>
  )
}

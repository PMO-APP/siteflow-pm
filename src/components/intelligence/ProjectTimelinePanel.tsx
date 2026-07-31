import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, ChevronRight, Filter, Network, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/project'
import { useProjectTimeline } from '@/hooks/useProjectTimeline'
import {
  analyseEventImpact,
  fetchActivityDependencyGraph,
  type DependencyGraph,
  type EventImpactAnalysis,
  type ProjectTimelineItem,
} from '@/services/intelligence/projectTimelineService'

const priorityStyle = {
  low: 'border-slate-200 bg-slate-50 text-slate-600',
  normal: 'border-blue-200 bg-blue-50 text-blue-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function ProjectTimelinePanel() {
  const navigate = useNavigate()
  const { projectId } = useProjectStore()
  const timeline = useProjectTimeline(120)
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('All')
  const [priority, setPriority] = useState('All')
  const [selected, setSelected] = useState<ProjectTimelineItem | null>(null)
  const [impact, setImpact] = useState<EventImpactAnalysis | null>(null)
  const [graph, setGraph] = useState<DependencyGraph | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const items = timeline.data || []
  const modules = useMemo(() => ['All', ...Array.from(new Set(items.map(item => item.module)))], [items])
  const filtered = useMemo(() => items.filter(item => {
    const term = query.trim().toLowerCase()
    const matchesText = !term || `${item.title} ${item.message} ${item.eventType}`.toLowerCase().includes(term)
    return matchesText && (module === 'All' || item.module === module) && (priority === 'All' || item.priority === priority)
  }), [items, query, module, priority])

  async function inspect(item: ProjectTimelineItem) {
    setSelected(item)
    setImpact(null)
    setGraph(null)
    if (!projectId) return
    setDetailsLoading(true)
    try {
      const nextImpact = await analyseEventImpact(projectId, item)
      setImpact(nextImpact)
      const activityId = nextImpact.affectedActivities[0]?.id
      if (activityId) setGraph(await fetchActivityDependencyGraph(projectId, activityId))
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Connected project intelligence</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Unified project timeline</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A single audit trail across schedule, procurement, approvals, quality, HSE, risk, snags and handover.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500"><Activity className="h-4 w-4" />{filtered.length} events</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_150px]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the project timeline" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><Filter className="h-4 w-4 text-slate-400" /><select value={module} onChange={event => setModule(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none">{modules.map(value => <option key={value}>{value}</option>)}</select></label>
          <select value={priority} onChange={event => setPriority(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"><option>All</option><option>critical</option><option>high</option><option>normal</option><option>low</option></select>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {timeline.isLoading && <div className="py-10 text-center text-sm text-slate-500">Loading connected project history…</div>}
          {!timeline.isLoading && filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><div className="font-semibold text-slate-800">No matching project events</div><div className="mt-1 text-sm text-slate-500">Events will appear as operational modules publish updates.</div></div>}
          {filtered.slice(0, 12).map(item => (
            <button key={item.id} type="button" onClick={() => inspect(item)} className="group flex w-full items-start gap-4 py-4 text-left">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-50" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{item.title}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityStyle[item.priority]}`}>{item.priority}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.module}</span></div>
                {item.message && <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.message}</p>}
                <div className="mt-1.5 text-xs text-slate-400">{formatDate(item.occurredAt)} · {item.eventType}</div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Event explorer</div><h3 className="mt-1 text-xl font-semibold text-slate-950">{selected.title}</h3><div className="mt-1 text-sm text-slate-500">{formatDate(selected.occurredAt)} · {selected.eventType}</div></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div></div>
            <div className="space-y-6 p-5 sm:p-7">
              <section className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/><h4 className="font-semibold text-slate-900">Impact analysis</h4></div>{detailsLoading ? <p className="mt-4 text-sm text-slate-500">Tracing relationships…</p> : impact ? <div className="mt-4 space-y-4 text-sm"><div><div className="font-medium text-slate-500">Health impact</div><p className="mt-1 leading-6 text-slate-700">{impact.healthImpact}</p></div><div><div className="font-medium text-slate-500">Recovery impact</div><p className="mt-1 leading-6 text-slate-700">{impact.recoveryImpact}</p></div><div className="rounded-xl bg-blue-50 p-4"><div className="font-semibold text-blue-900">Recommended action</div><p className="mt-1 leading-6 text-blue-800">{impact.recommendedAction}</p></div></div> : null}</section>

              <section className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-2"><Network className="h-4 w-4 text-blue-700"/><h4 className="font-semibold text-slate-900">Dependency intelligence</h4></div>{graph ? <div className="mt-4 space-y-4">{graph.activity && <button onClick={() => navigate(graph.activity!.route || '/app/schedule')} className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-left"><div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected activity</div><div className="mt-1 font-semibold text-slate-950">{graph.activity.title}</div></button>}{[['Predecessors', graph.predecessors], ['Successors', graph.successors], ['Connected records', graph.connected]].map(([label, nodes]) => <div key={String(label)}><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{String(label)} · {(nodes as any[]).length}</div><div className="mt-2 grid gap-2">{(nodes as any[]).map(item => <button key={`${item.type}-${item.id}`} onClick={() => item.route && navigate(item.route)} className="rounded-xl border border-slate-200 p-3 text-left hover:border-blue-200 hover:bg-blue-50/30"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{item.title}</span><span className="text-xs text-slate-500">{item.type}</span></div><div className="mt-1 text-xs text-slate-500">{item.relationship}{item.status ? ` · ${item.status}` : ''}</div></button>)}</div></div>)}</div> : !detailsLoading && <p className="mt-4 text-sm leading-6 text-slate-500">No linked schedule activity was identified. Add an activity relationship to enable dependency tracing.</p>}</section>

              <details className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-semibold text-slate-900">Raw event payload</summary><pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(selected.payload, null, 2)}</pre></details>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

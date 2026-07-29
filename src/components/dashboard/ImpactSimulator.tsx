import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, GitBranch, Gauge, RotateCcw } from 'lucide-react'
import type { ImpactSimulationResult } from '@/intelligence'

interface Props {
  scenarios: ImpactSimulationResult[]
}

const scenarioLabel: Record<ImpactSimulationResult['type'], string> = {
  approval_slip: 'Approval slip',
  procurement_slip: 'Procurement slip',
  additional_crew: 'Additional crew',
  weekend_work: 'Weekend work',
  parallel_work: 'Parallel working',
}

function dateLabel(value?: string) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ImpactSimulator({ scenarios }: Props) {
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id || '')
  const selected = useMemo(() => scenarios.find(item => item.id === selectedId) || scenarios[0], [scenarios, selectedId])

  if (!selected) return null
  const recovery = selected.scheduleImpactDays < 0

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Impact simulator</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Test a decision before committing</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Compare deterministic schedule effects using current constraints, severity and linked project evidence.</p>
        </div>
        <button onClick={() => setSelectedId(scenarios[0]?.id || '')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"><RotateCcw className="h-4 w-4"/>Reset</button>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-2" role="listbox" aria-label="Impact scenarios">
          {scenarios.map(item => {
            const positive = item.scheduleImpactDays < 0
            const active = item.id === selected.id
            return <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
              <div><div className="text-sm font-semibold text-slate-900">{scenarioLabel[item.type]}</div><div className="mt-1 text-xs text-slate-500">Confidence {item.confidence}%</div></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{positive ? `${Math.abs(item.scheduleImpactDays)}d recovered` : `+${item.scheduleImpactDays}d`}</span>
            </button>
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h3 className="text-xl font-semibold text-slate-950">{selected.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{selected.description}</p></div>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${recovery ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{recovery ? <ArrowDownRight className="h-4 w-4"/> : <ArrowUpRight className="h-4 w-4"/>}{recovery ? `${Math.abs(selected.scheduleImpactDays)} days recovered` : `${selected.scheduleImpactDays} days added`}</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-medium text-slate-500">Forecast delay</div><div className="mt-2 text-2xl font-semibold text-slate-950">{selected.forecastDelayDays}d</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-medium text-slate-500">Forecast finish</div><div className="mt-2 text-lg font-semibold text-slate-950">{dateLabel(selected.forecastFinish)}</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-medium text-slate-500">Confidence</div><div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-950"><Gauge className="h-5 w-5 text-blue-700"/>{selected.confidence}%</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-medium text-slate-500">Cost impact</div><div className="mt-2 text-lg font-semibold capitalize text-slate-950">{selected.costImpact}</div></div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><GitBranch className="h-4 w-4 text-blue-700"/>Dependency path</div><div className="mt-3 flex flex-wrap items-center gap-2">{selected.dependencyPath.map((item, index) => <span key={`${item}-${index}`} className="contents"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">{item}</span>{index < selected.dependencyPath.length - 1 && <span className="text-slate-400">→</span>}</span>)}</div></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-sm font-semibold text-blue-950">Recommended control</div><p className="mt-2 text-sm leading-6 text-blue-900">{selected.recommendation}</p><p className="mt-3 text-xs leading-5 text-blue-700">Operational impact: {selected.operationalImpact}</p></div>
          </div>
        </div>
      </div>
    </section>
  )
}

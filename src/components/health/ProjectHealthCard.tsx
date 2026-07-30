import { Activity, ChevronRight, RefreshCw } from 'lucide-react'
import type { ProjectHealthResult } from '@/core/engine/types'
import { HealthStatusBadge } from './HealthStatusBadge'
import { HealthTrendIndicator, type HealthTrend } from './HealthTrendIndicator'

export function ProjectHealthCard({
  health,
  loading,
  fetching,
  trend,
  onOpen,
  onRefresh,
}: {
  health: ProjectHealthResult | null
  loading?: boolean
  fetching?: boolean
  trend?: HealthTrend
  onOpen?: () => void
  onRefresh?: () => void
}) {
  if (loading && !health) {
    return (
      <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="h-4 w-36 rounded bg-slate-200" />
        <div className="mt-5 h-14 w-28 rounded bg-slate-200" />
        <div className="mt-5 h-2 rounded bg-slate-100" />
      </section>
    )
  }

  if (!health) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600"><Activity size={19} /></div>
          <div>
            <h2 className="font-semibold text-slate-900">Project health is not available</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Select a project or refresh the data sources to calculate an explainable health score.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Unified health engine</div>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-5xl font-semibold tracking-[-0.06em] text-slate-950">{health.score}<span className="text-xl text-slate-400">%</span></div>
            <div className="pb-1"><HealthStatusBadge tone={health.tone} label={health.label} /></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HealthTrendIndicator trend={trend} />
          {onRefresh && (
            <button type="button" onClick={onRefresh} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50" aria-label="Refresh project health">
              <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${health.score}%` }} />
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-600">{health.summary}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">Confidence: <span className="font-semibold text-slate-700">{health.confidence.label} ({health.confidence.score}%)</span></div>
        {onOpen && <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">View breakdown <ChevronRight size={16} /></button>}
      </div>
    </section>
  )
}

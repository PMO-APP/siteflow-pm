import type { ProjectHealthResult } from '@/core/engine/types'
import { useProjectHealthHistory } from '@/hooks/useProjectHealthHistory'
import { HealthStatusBadge } from './HealthStatusBadge'
import { HealthTrendIndicator } from './HealthTrendIndicator'

export function ExecutiveHealthReportPanel({ projectId, health }: { projectId?: string | number | null; health: ProjectHealthResult | null }) {
  const { trend } = useProjectHealthHistory(30, projectId)
  if (!health) return null
  const assessed = health.contributors.filter(item => item.status === 'assessed' && item.score !== null)
  const weakest = [...assessed].sort((a, b) => Number(a.score) - Number(b.score))[0]
  const strongest = [...assessed].sort((a, b) => Number(b.score) - Number(a.score))[0]
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Executive health statement</div><h2 className="mt-1 text-lg font-semibold text-slate-950">Current delivery position</h2></div>
      <div className="flex items-center gap-2"><HealthTrendIndicator trend={trend.direction} /><HealthStatusBadge tone={health.tone} label={`${health.score}% · ${health.label}`} /></div>
    </div>
    <p className="mt-4 text-sm leading-6 text-slate-600">{health.summary}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <HealthFact label="Primary management focus" value={weakest ? `${weakest.label} · ${weakest.score}%` : 'Not assessed'} />
      <HealthFact label="Strongest contributor" value={strongest ? `${strongest.label} · ${strongest.score}%` : 'Not assessed'} />
      <HealthFact label="Recommended action" value={health.recommendations[0] || 'Maintain current controls and monitor delivery.'} />
    </div>
  </section>
}
function HealthFact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-sm font-medium leading-5 text-slate-800">{value}</div></div> }

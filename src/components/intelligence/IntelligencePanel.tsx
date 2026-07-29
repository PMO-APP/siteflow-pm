import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Lightbulb, Target } from 'lucide-react'
import type { ReactNode } from 'react'

export type IntelligenceStatus = 'healthy' | 'watch' | 'critical' | 'neutral'
export type IntelligenceTrend = 'improving' | 'stable' | 'declining'

export interface IntelligenceMetric {
  label: string
  value: ReactNode
  helper?: string
}

export interface IntelligencePanelProps {
  title: string
  status: IntelligenceStatus
  statusLabel: string
  summary: string
  primaryConstraint?: string
  recommendation: string
  trend?: IntelligenceTrend
  metrics?: IntelligenceMetric[]
}

const statusConfig = {
  healthy: { label: 'Healthy', icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  watch: { label: 'Needs attention', icon: AlertTriangle, classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  critical: { label: 'Critical', icon: AlertTriangle, classes: 'border-red-200 bg-red-50 text-red-700' },
  neutral: { label: 'Monitoring', icon: Target, classes: 'border-slate-200 bg-slate-50 text-slate-700' },
} as const

const trendConfig = {
  improving: { label: 'Improving', icon: ArrowUpRight, classes: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  stable: { label: 'Stable', icon: ArrowRight, classes: 'text-slate-700 bg-slate-50 border-slate-200' },
  declining: { label: 'Declining', icon: ArrowDownRight, classes: 'text-red-700 bg-red-50 border-red-200' },
} as const

export function IntelligencePanel({
  title,
  status,
  statusLabel,
  summary,
  primaryConstraint,
  recommendation,
  trend = 'stable',
  metrics = [],
}: IntelligencePanelProps) {
  const statusMeta = statusConfig[status]
  const trendMeta = trendConfig[trend]
  const StatusIcon = statusMeta.icon
  const TrendIcon = trendMeta.icon

  return (
    <section className="overflow-hidden rounded-2xl border border-[#dfe3e7] bg-white shadow-[0_10px_35px_rgba(16,41,67,0.06)]">
      <div className="border-b border-[#e8ebee] bg-gradient-to-r from-[#f8fafb] to-white px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#78909f]">Executive intelligence</div>
            <h2 className="mt-1 text-lg font-semibold text-[#102943]">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMeta.classes}`}>
              <StatusIcon size={13} /> {statusLabel || statusMeta.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${trendMeta.classes}`}>
              <TrendIcon size={13} /> {trendMeta.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-4">
          <p className="max-w-3xl text-sm leading-6 text-[#566675]">{summary}</p>
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map(metric => (
                <div key={metric.label} className="rounded-xl border border-[#e4e8eb] bg-[#fafbfc] p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8493a0]">{metric.label}</div>
                  <div className="mt-1.5 text-xl font-semibold text-[#102943]">{metric.value}</div>
                  {metric.helper && <div className="mt-1 text-[10px] text-[#7a8895]">{metric.helper}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {primaryConstraint && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                <Target size={13} /> Primary constraint
              </div>
              <p className="mt-2 text-sm font-medium leading-5 text-[#4e4b42]">{primaryConstraint}</p>
            </div>
          )}
          <div className="rounded-xl border border-[#cfdde8] bg-[#f3f8fc] p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#315c7d]">
              <Lightbulb size={13} /> Recommended action
            </div>
            <p className="mt-2 text-sm font-medium leading-5 text-[#27445b]">{recommendation}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

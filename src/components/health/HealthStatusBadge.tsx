import type { ContributorTone, HealthTone } from '@/core/engine/types'

const toneClasses: Record<HealthTone | ContributorTone, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  recoverable: 'border-blue-200 bg-blue-50 text-blue-700',
  at_risk: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
  not_assessed: 'border-slate-200 bg-slate-50 text-slate-600',
}

export function HealthStatusBadge({
  tone,
  label,
}: {
  tone: HealthTone | ContributorTone
  label: string
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}

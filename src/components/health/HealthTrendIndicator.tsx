import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'

export type HealthTrend = 'improving' | 'stable' | 'declining' | 'insufficient_history'

const config = {
  improving: { label: 'Improving', Icon: ArrowUpRight, className: 'text-emerald-700 bg-emerald-50' },
  stable: { label: 'Stable', Icon: ArrowRight, className: 'text-slate-700 bg-slate-100' },
  declining: { label: 'Declining', Icon: ArrowDownRight, className: 'text-red-700 bg-red-50' },
  insufficient_history: { label: 'No trend yet', Icon: ArrowRight, className: 'text-slate-500 bg-slate-50' },
} as const

export function HealthTrendIndicator({ trend = 'insufficient_history' }: { trend?: HealthTrend }) {
  const item = config[trend]
  const Icon = item.Icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}>
      <Icon size={14} />
      {item.label}
    </span>
  )
}

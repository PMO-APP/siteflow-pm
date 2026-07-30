import type { ProjectHealthContributor } from '@/core/engine/types'

export function HealthBreakdownChart({ contributors }: { contributors: ProjectHealthContributor[] }) {
  return (
    <div className="space-y-4">
      {contributors.map(item => (
        <div key={item.key}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="font-semibold text-slate-900">{item.score === null ? 'Not assessed' : `${item.score}%`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-700" style={{ width: `${item.score ?? 0}%`, opacity: item.score === null ? .2 : 1 }} />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Weight: {Math.round(item.normalizedWeight * 100)}%</div>
        </div>
      ))}
    </div>
  )
}

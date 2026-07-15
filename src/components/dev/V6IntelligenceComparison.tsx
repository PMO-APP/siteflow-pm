import { useProjectIntelligence } from '@/hooks/useProjectIntelligence'
import { useV6ProjectIntelligence } from '@/hooks/useV6ProjectIntelligence'

export default function V6IntelligenceComparison({
  project,
}: {
  project?: any
}) {
  const current =
    useProjectIntelligence({ project })

  const v6 =
    useV6ProjectIntelligence()

  if (v6.isLoading) {
    return (
      <div className="pmx-card">
        Loading V6 comparison…
      </div>
    )
  }

  if (v6.isError || !v6.data) {
    return (
      <div className="pmx-card text-red-400">
        Unable to build V6 intelligence.
      </div>
    )
  }

  const rows = [
    {
      metric: 'Health score',
      current: current.health.score,
      v6: v6.data.health.score,
    },
    {
      metric: 'Delay days',
      current:
        current.forecastV2.delayDays,
      v6:
        v6.data.forecast.delayDays,
    },
    {
      metric: 'Recovery confidence',
      current:
        current.forecastV2
          .recoveryConfidence,
      v6:
        v6.data.forecast
          .recoveryConfidence,
    },
    {
      metric: 'Readiness score',
      current:
        current.readiness.score,
      v6:
        v6.data.readiness.score,
    },
  ]

  return (
    <div className="pmx-card">
      <div className="pmx-eyebrow">
        Development only
      </div>

      <h3 className="mt-2 text-base font-semibold text-[var(--pmx-text)]">
        V6 Intelligence Comparison
      </h3>

      <div className="mt-4 divide-y divide-[var(--pmx-border)]">
        {rows.map(row => {
          const matches =
            Number(row.current) ===
            Number(row.v6)

          return (
            <div
              key={row.metric}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-3 text-sm"
            >
              <span>{row.metric}</span>
              <span>{row.current}</span>
              <span>{row.v6}</span>
              <span
                className={
                  matches
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }
              >
                {matches ? 'Match' : 'Review'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

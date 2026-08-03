import {
  Gauge,
  TrendingUp,
} from 'lucide-react'
import type { ForecastV2Result } from '@/core/intelligence/forecast/forecastV2'
import {
  MetricCard,
  SectionHeader,
} from '@/components/ui'

export default function ProductionPanel({
  forecast,
}: {
  forecast: ForecastV2Result
}) {
  return (
    <div className="pmx-card p-5">
      <SectionHeader
        eyebrow="Forecast Engine"
        title="Production Performance"
        description="Compares achieved production with the rate required to meet the target date."
      />

      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-3">
        <MetricCard
          label="Actual Rate"
          value={`${forecast.production.actualPerDay}%`}
          helper="Progress earned per day"
          icon={TrendingUp}
          tone="primary"
          compact
        />

        <MetricCard
          label="Required Rate"
          value={`${forecast.production.requiredPerDay}%`}
          helper="Required daily progress"
          icon={Gauge}
          tone={
            forecast.production.requiredPerDay >
            forecast.production.actualPerDay
              ? 'warning'
              : 'success'
          }
          compact
        />

        <MetricCard
          label="Production Efficiency"
          value={`${forecast.production.efficiency}%`}
          helper={
            forecast.production.efficiency >= 100
              ? 'Rate supports target'
              : 'Rate below requirement'
          }
          icon={Gauge}
          tone={
            forecast.production.efficiency >= 100
              ? 'success'
              : forecast.production.efficiency >= 75
              ? 'warning'
              : 'danger'
          }
          compact
        />
      </div>

      <div className="mt-4 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--pmx-faint)]">
          Primary Constraint
        </div>

        <div className="mt-2 text-base font-semibold text-[var(--pmx-text)]">
          {forecast.primaryConstraint || 'No active constraint identified'}
        </div>

        <div className="mt-2 text-xs text-[var(--pmx-muted)]">
          Recovery confidence: {forecast.recoveryConfidence}% ·{' '}
          {forecast.recoverable
            ? 'Current delay remains recoverable.'
            : 'Current delivery position requires escalation.'}
        </div>
      </div>
    </div>
  )
}

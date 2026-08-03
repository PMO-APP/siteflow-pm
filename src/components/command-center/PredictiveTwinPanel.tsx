import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Gauge, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react'
import type { DeliveryTwinResult } from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import type { ForecastV2Result } from '@/core/intelligence/forecast/forecastV2'

type ScenarioKey = 'baseline' | 'recovery' | 'procurement_delay' | 'additional_labour' | 'weekend_working'

type Scenario = {
  key: ScenarioKey
  label: string
  dayDelta: number
  healthDelta: number
  riskDelta: number
  cost: 'None' | 'Low' | 'Medium' | 'High'
  note: string
}

const scenarios: Scenario[] = [
  { key: 'baseline', label: 'Baseline', dayDelta: 0, healthDelta: 0, riskDelta: 0, cost: 'None', note: 'Current delivery trend with no management intervention.' },
  { key: 'recovery', label: 'Accelerated recovery', dayDelta: -10, healthDelta: 8, riskDelta: -12, cost: 'Medium', note: 'Parallel working, focused escalation and critical-path recovery.' },
  { key: 'procurement_delay', label: 'Delayed procurement', dayDelta: 14, healthDelta: -10, riskDelta: 18, cost: 'Low', note: 'Models a two-week delay to at-risk procurement items.' },
  { key: 'additional_labour', label: 'Additional labour', dayDelta: -7, healthDelta: 5, riskDelta: -6, cost: 'High', note: 'Adds labour to recover production on current work fronts.' },
  { key: 'weekend_working', label: 'Weekend working', dayDelta: -5, healthDelta: 3, riskDelta: -4, cost: 'Medium', note: 'Adds controlled weekend shifts to priority activities.' },
]

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export default function PredictiveTwinPanel({ twin, sharedForecast, currentHealth }: { twin: DeliveryTwinResult; sharedForecast: ForecastV2Result; currentHealth: number }) {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('baseline')
  const scenario = scenarios.find(item => item.key === scenarioKey) || scenarios[0]

  const forecast = useMemo(() => {
    const activeSignals = twin.packages.reduce(
      (sum, item) => sum + Object.values(item.issueSummary).reduce((a, b) => a + b, 0),
      0
    )
    const baselineDate =
      sharedForecast.forecastDate ||
      sharedForecast.targetDate ||
      new Date()
    const baselineDelay = Math.max(0, sharedForecast.delayDays)
    const expectedDelay = Math.max(0, baselineDelay + scenario.dayDelta)
    const expected = addDays(baselineDate, scenario.dayDelta)
    const uncertainty = Math.max(2, Math.min(7, Math.round(2 + activeSignals * 0.2)))
    const best = addDays(expected, -uncertainty)
    const worst = addDays(expected, uncertainty)
    const health = clamp(currentHealth + scenario.healthDelta)
    const riskExposure = clamp(
      Math.round((100 - currentHealth) + activeSignals * 1.2 + scenario.riskDelta)
    )
    const confidence = clamp(sharedForecast.recoveryConfidence, 5, 95)
    const onTimeProbability = clamp(
      Math.round(confidence - expectedDelay * 3 - riskExposure * 0.15),
      5,
      95
    )

    const blockers = [
      ...twin.dependencyIntelligence.bottlenecks.slice(0, 3).map(item => ({
        title: item.activityName,
        detail: `${item.downstreamCount} downstream activit${item.downstreamCount === 1 ? 'y' : 'ies'} across ${Math.max(1, item.packageCount)} package(s)`,
      })),
      ...twin.packages
        .filter(item => item.primaryDelayActivity)
        .slice(0, 2)
        .map(item => ({
          title: item.primaryDelayActivity as string,
          detail: `${item.name} • ${item.overdueActivities} overdue activit${item.overdueActivities === 1 ? 'y' : 'ies'}`,
        })),
    ].slice(0, 3)

    return {
      averageHealth: currentHealth,
      health,
      riskExposure,
      confidence,
      onTimeProbability,
      expectedDelay,
      expected,
      best,
      worst,
      blockers,
    }
  }, [scenario, twin, sharedForecast, currentHealth])

  return (
    <section className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]">
            <Sparkles size={14} /> Predictive twin
          </div>
          <h3 className="mt-1 text-base font-semibold text-[var(--pmx-text)]">Delivery forecast</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--pmx-muted)]">
            Scenario view anchored to the same approved target date, schedule delay and recovery confidence used across the Dashboard and Recovery Forecast.
          </p>
        </div>
        <label className="min-w-[220px] text-xs font-medium text-[var(--pmx-muted)]">
          Scenario
          <select
            value={scenarioKey}
            onChange={event => setScenarioKey(event.target.value as ScenarioKey)}
            className="mt-1 w-full rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface)] px-3 py-2 text-sm text-[var(--pmx-text)] outline-none focus:border-[var(--pmx-primary)]"
          >
            {scenarios.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<CalendarClock size={15} />} label="Expected completion" value={formatDate(forecast.expected)} hint={`${forecast.expectedDelay} forecast delay days`} />
        <Metric icon={<Gauge size={15} />} label="On-time probability" value={`${forecast.onTimeProbability}%`} hint={`${forecast.confidence}% forecast confidence`} />
        <Metric icon={<TrendingUp size={15} />} label="Forecast health" value={`${forecast.health}%`} hint={`${forecast.health - forecast.averageHealth >= 0 ? '+' : ''}${forecast.health - forecast.averageHealth} vs current`} />
        <Metric icon={<ShieldCheck size={15} />} label="Risk exposure" value={`${forecast.riskExposure}%`} hint={`${scenario.cost} intervention cost`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Completion range</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <DateCard label="Best case" date={forecast.best} />
            <DateCard label="Expected" date={forecast.expected} emphasized />
            <DateCard label="Worst case" date={forecast.worst} />
          </div>
          <div className="mt-4 rounded-lg bg-[var(--pmx-surface-2)] p-3 text-xs leading-5 text-[var(--pmx-muted)]">
            <span className="font-semibold text-[var(--pmx-text)]">{scenario.label}:</span> {scenario.note}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--pmx-faint)]">
            <AlertTriangle size={14} /> Predicted bottlenecks
          </div>
          <div className="mt-3 space-y-2">
            {forecast.blockers.length ? forecast.blockers.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
                <div className="text-sm font-semibold text-[var(--pmx-text)]">{index + 1}. {item.title}</div>
                <div className="mt-1 text-xs text-[var(--pmx-muted)]">{item.detail}</div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-[var(--pmx-border)] p-4 text-xs text-[var(--pmx-muted)]">
                No material future bottleneck is detectable from the current project data.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pmx-faint)]">{icon}{label}</div>
      <div className="mt-2 text-xl font-semibold text-[var(--pmx-text)]">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--pmx-muted)]">{hint}</div>
    </div>
  )
}

function DateCard({ label, date, emphasized = false }: { label: string; date: Date; emphasized?: boolean }) {
  return (
    <div className={emphasized ? 'rounded-lg border border-[var(--pmx-primary)] bg-[var(--pmx-primary-soft)] p-3' : 'rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3'}>
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--pmx-text)]">{formatDate(date)}</div>
    </div>
  )
}

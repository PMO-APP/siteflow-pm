import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Forecast = { id: string; currency: string; forecast_final_cost: number | string; reviewed_at: string | null }
type Props = { projectId: number; budget: number | null; currency: string; currencyConflict: boolean; overdueCount: number | null; paymentDataError: boolean; financialDataError: boolean; invalidRecordCount: number; lastUpdated: string | null }
const fmt = (n: number, c: string) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
export default function FinancialHealthSignal({ projectId, budget, currency, currencyConflict, overdueCount, paymentDataError, financialDataError, invalidRecordCount, lastUpdated }: Props) {
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [forecastLoading, setForecastLoading] = useState(true)
  const [forecastError, setForecastError] = useState(false)
  useEffect(() => {
    let active = true
    setForecastLoading(true); setForecastError(false); setForecasts([])
    if (!Number.isFinite(projectId) || projectId <= 0) { setForecastLoading(false); return () => { active = false } }
    const loadForecasts = async () => {
      try {
        const { data, error } = await supabase.from('project_cost_forecasts')
          .select('id,currency,forecast_final_cost,reviewed_at')
          .eq('project_id', projectId)
          .eq('status', 'approved')
          .order('reviewed_at', { ascending: false })
          .limit(2)
        if (!active) return
        setForecastError(Boolean(error))
        setForecasts(error ? [] : (data || []) as Forecast[])
      } catch {
        if (!active) return
        setForecastError(true)
        setForecasts([])
      } finally {
        if (active) setForecastLoading(false)
      }
    }
    void loadForecasts()
    return () => { active = false }
  }, [projectId])
  const assessment = useMemo(() => {
    const latest = forecasts[0]
    const latestValue = latest ? Number(latest.forecast_final_cost) : NaN
    const forecastUsable = !!latest && Number.isFinite(latestValue) && latestValue >= 0 && latest.currency === currency
    const variance = forecastUsable && budget !== null && Number.isFinite(budget) && budget > 0 && !currencyConflict ? latestValue - budget : null
    const variancePct = variance !== null && budget !== null ? variance / budget * 100 : null
    const age = lastUpdated ? Math.floor((Date.now() - Date.parse(lastUpdated)) / 86400000) : null
    const staleRegister = age !== null && Number.isFinite(age) && age > 14
    const staleForecast = latest?.reviewed_at ? (Date.now() - Date.parse(latest.reviewed_at)) / 86400000 > 30 : false
    const missing = currencyConflict || financialDataError || paymentDataError || forecastError || forecastLoading || budget === null || !forecastUsable || overdueCount === null || invalidRecordCount > 0
    const issues = [
      ...(variance !== null && variance > 0 ? [`Forecast over budget by ${fmt(variance, currency)} (${variancePct!.toFixed(1)}%)`] : []),
      ...(overdueCount !== null && overdueCount > 0 ? [`${overdueCount} overdue payment${overdueCount === 1 ? '' : 's'} require follow-up`] : []),
      ...(staleForecast ? ['Approved cost forecast is over 30 days old'] : []),
      ...(staleRegister ? ['Financial register has not been updated in 14 days'] : []),
    ]
    const warnings = [
      ...(currencyConflict ? ['Mixed currencies require reconciliation'] : []),
      ...(financialDataError ? ['Financial register unavailable'] : []),
      ...(paymentDataError ? ['Payment deadlines unavailable'] : []),
      ...(forecastError ? ['Approved forecast could not be loaded'] : []),
      ...(!forecastLoading && !forecastError && !forecastUsable ? ['No comparable approved cost forecast'] : []),
      ...(budget === null ? ['Approved budget unavailable'] : []),
      ...(invalidRecordCount > 0 ? [`${invalidRecordCount} invalid financial amount${invalidRecordCount === 1 ? '' : 's'}`] : []),
    ]
    // No weighted score: thresholds are not organisation-approved. Never imply healthy finances from missing evidence.
    const status = issues.some(i => i.startsWith('Forecast over budget')) ? 'Over budget' : issues.length ? 'Attention required' : missing ? 'Insufficient data' : 'No current alerts'
    return { status, issues, warnings, variance, variancePct, staleForecast }
  }, [forecasts, forecastLoading, forecastError, budget, currency, currencyConflict, overdueCount, paymentDataError, financialDataError, invalidRecordCount, lastUpdated])
  return <div className="mt-4 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4" aria-label="Financial management status">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Financial management status</h3><span className="rounded-full border border-[var(--pmx-border)] px-3 py-1 text-xs font-semibold">{assessment.status}</span></div>
    <p className="mt-1 text-xs text-[var(--pmx-muted)]">Rules-based indicators, not an audited financial health score. Figures reflect recorded data and the latest independently approved forecast.</p>
    {forecastLoading ? <p className="mt-2 text-sm">Checking approved cost forecast…</p> : <>
      {assessment.issues.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{assessment.issues.slice(0, 3).map(s => <li key={s}>{s}</li>)}</ul>}
      {assessment.warnings.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium">Data reliability: {assessment.warnings.length} item(s) need review</summary><ul className="mt-2 list-disc space-y-1 pl-5">{assessment.warnings.map(s => <li key={s}>{s}</li>)}</ul></details>}
      {!assessment.issues.length && !assessment.warnings.length && <p className="mt-2 text-sm">No budget variance or overdue payment alert identified in the available records. Continue routine Costing verification.</p>}
    </>}
  </div>
}

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'

type Observation = { activity_id: string; delivery_package_id: string; observed_on: string; quantity_completed: number; quantity_unit: string; crew_count: number; working_hours: number }
type PackageOption = { id: string; name: string }
const positive = (v: unknown) => Number.isFinite(Number(v)) && Number(v) > 0

/** An evidence-driven what-if calculation, not a certified project forecast. */
export default function MeasuredProductionForecast({ projectId, packages, tasks }: { projectId: string | number; packages: PackageOption[]; tasks: Task[] }) {
  const [records, setRecords] = useState<Observation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [packageId, setPackageId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [remaining, setRemaining] = useState('')
  const [crew, setCrew] = useState('')
  const [hours, setHours] = useState('8')
  const selectedPackage = packageId || packages[0]?.id || ''
  const activities = useMemo(() => tasks.filter(t => String(t.delivery_package_id || '') === selectedPackage), [tasks, selectedPackage])
  const selectedActivity = activityId || String(activities[0]?.id || '')
  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)
    supabase.from('package_production_observations')
      .select('activity_id,delivery_package_id,observed_on,quantity_completed,quantity_unit,crew_count,working_hours')
      .eq('project_id', projectId).order('observed_on', { ascending: false }).limit(1000)
      .then(({ data, error: requestError }) => {
        if (!live) return
        setRecords(requestError ? [] : (data || []) as Observation[])
        setError(requestError?.message || null)
        setLoading(false)
      })
    return () => { live = false }
  }, [projectId])
  const evidence = useMemo(() => {
    const rows = records.filter(r => String(r.delivery_package_id) === selectedPackage && String(r.activity_id) === selectedActivity)
    const units = [...new Set(rows.map(r => String(r.quantity_unit).trim().toLowerCase()))]
    const valid = rows.every(r => positive(r.quantity_completed) && positive(r.crew_count) && positive(r.working_hours) && Number(r.working_hours) <= 24)
    const hoursTotal = rows.reduce((sum, r) => sum + Number(r.crew_count) * Number(r.working_hours), 0)
    const quantityTotal = rows.reduce((sum, r) => sum + Number(r.quantity_completed), 0)
    const rate = valid && units.length === 1 && hoursTotal > 0 ? quantityTotal / hoursTotal : null
    return { count: rows.length, unit: units.length === 1 ? rows[0]?.quantity_unit || '' : '', rate, unitsCompatible: units.length <= 1 }
  }, [records, selectedPackage, selectedActivity])
  const estimatedDays = evidence.rate !== null && positive(remaining) && positive(crew) && positive(hours) && Number(hours) <= 24
    ? Math.ceil(Number(remaining) / (evidence.rate * Number(crew) * Number(hours))) : null
  return <details className="rounded-xl border border-[#dfe3e7] bg-white p-4" aria-label="Measured productivity scenario">
    <summary className="cursor-pointer text-sm font-semibold text-[#123a60]">Measured productivity scenario · evidence-based what-if</summary>
    <p className="mt-2 text-xs text-[#65717c]">Uses recorded quantity per person-hour from Phase 5. Enter remaining work in the SAME unit and an assumed available crew. The result is working days for this activity only, not a package handover forecast. Data is currently limited by author-only access policies.</p>
    {loading ? <p className="mt-2 text-xs">Loading observations…</p> : error ? <p role="alert" className="mt-2 text-xs text-amber-700">Observations unavailable: {error}. Verify the Phase 5 migration and access.</p> : <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs">Package<select className="mt-1 w-full rounded border p-2" value={selectedPackage} onChange={e => { setPackageId(e.target.value); setActivityId(''); setRemaining('') }}>{packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="text-xs">Activity<select className="mt-1 w-full rounded border p-2" value={selectedActivity} onChange={e => { setActivityId(e.target.value); setRemaining('') }}>{activities.map(t => <option key={String(t.id)} value={String(t.id)}>{String(t.task_number || '')} {String(t.name || t.id)}</option>)}</select></label>
        <label className="text-xs">Remaining work {evidence.unit ? `(${evidence.unit})` : '(unit unverified)'}<input className="mt-1 w-full rounded border p-2" type="number" min="0" step="any" value={remaining} onChange={e => setRemaining(e.target.value)} placeholder="Enter verified outstanding quantity" /></label>
        <label className="text-xs">Available crew (assumption)<input className="mt-1 w-full rounded border p-2" type="number" min="1" step="1" value={crew} onChange={e => setCrew(e.target.value)} /></label>
        <label className="text-xs">Hours per person per working day<input className="mt-1 w-full rounded border p-2" type="number" min="0.25" max="24" step="0.25" value={hours} onChange={e => setHours(e.target.value)} /></label>
      </div>
      <div className="mt-3 rounded-lg bg-[#f8fafb] p-3 text-sm">
        <p>Recorded observations: <strong>{evidence.count}</strong> · Measured output: <strong>{evidence.rate === null ? 'Unavailable' : `${evidence.rate.toFixed(3)} ${evidence.unit} / person-hour`}</strong></p>
        <p className="mt-1">Indicative remaining working days: <strong>{estimatedDays === null ? 'Insufficient evidence or inputs' : `${estimatedDays} days`}</strong></p>
        {!evidence.unitsCompatible && <p className="mt-1 text-amber-700">Mixed measurement units. Reconcile observations before forecasting.</p>}
        <p className="mt-2 text-xs text-amber-700">Not a validated completion date. Assumes a constant measured rate and full daily crew availability; excludes dependencies, procurement, holidays, weather, rework and parallel resource conflicts. Nothing is saved or applied to the master forecast.</p>
      </div>
    </>}
  </details>
}

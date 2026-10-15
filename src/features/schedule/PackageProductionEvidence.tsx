import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'

type PackageOption = { id: string; name: string }
type Observation = {
  id: string; delivery_package_id: string; activity_id: string; observed_on: string
  quantity_completed: number; quantity_unit: string; crew_count: number; working_hours: number
}

export default function PackageProductionEvidence({ projectId, packages, tasks }: {
  projectId: string | number; packages: PackageOption[]; tasks: Task[]
}) {
  const [packageId, setPackageId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('m²')
  const [crew, setCrew] = useState('')
  const [hours, setHours] = useState('8')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Observation[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = packageId || packages[0]?.id || ''
  const activities = useMemo(() => tasks.filter(t => String(t.delivery_package_id || '') === selected), [tasks, selected])
  const activity = activityId || String(activities[0]?.id || '')
  useEffect(() => {
    let active = true
    setRows([])
    if (!projectId) return
    supabase.from('package_production_observations')
      .select('id,delivery_package_id,activity_id,observed_on,quantity_completed,quantity_unit,crew_count,working_hours')
      .eq('project_id', projectId).order('observed_on', { ascending: false }).limit(250)
      .then(({ data, error }) => {
        if (!active) return
        setRows(error ? [] : (data || []) as Observation[])
        if (error) setMessage(`Production records unavailable: ${error.message}. Apply the Phase 5 SQL migration first.`)
      })
    return () => { active = false }
  }, [projectId])
  const selectedRows = rows.filter(r => r.delivery_package_id === selected)
  const activityRows = selectedRows.filter(r => r.activity_id === activity)
  const matchingUnits = [...new Set(activityRows.map(r => r.quantity_unit))]
  const totalQuantity = matchingUnits.length === 1 ? activityRows.reduce((s, r) => s + Number(r.quantity_completed), 0) : null
  const totalCrewHours = activityRows.reduce((s, r) => s + Number(r.crew_count) * Number(r.working_hours), 0)
  const rate = totalQuantity !== null && totalCrewHours > 0 ? totalQuantity / totalCrewHours : null
  async function save() {
    const q = Number(quantity), c = Number(crew), h = Number(hours)
    if (!selected || !activity || !date || !Number.isFinite(q) || q <= 0 || !Number.isInteger(c) || c < 1 || !Number.isFinite(h) || h <= 0 || h > 24 || !unit.trim()) {
      setMessage('Select a package and activity; enter a valid date, positive quantity, crew count and working hours.')
      return
    }
    setBusy(true); setMessage('')
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) { setMessage('Sign in before submitting production evidence.'); setBusy(false); return }
    const { data, error } = await supabase.from('package_production_observations').insert({
      project_id: Number(projectId), delivery_package_id: selected, activity_id: activity,
      observed_on: date, quantity_completed: q, quantity_unit: unit.trim(), crew_count: c,
      working_hours: h, notes: notes.trim(), recorded_by: auth.user.id,
    }).select('id,delivery_package_id,activity_id,observed_on,quantity_completed,quantity_unit,crew_count,working_hours').single()
    if (error) setMessage(`Unable to save: ${error.message}`)
    else { setRows(prev => [data as Observation, ...prev]); setQuantity(''); setNotes(''); setMessage('Production observation saved. This does not yet certify a completion forecast.') }
    setBusy(false)
  }
  return <details className="rounded-xl border border-[#dfe3e7] bg-white p-4">
    <summary className="cursor-pointer text-sm font-semibold text-[#123a60]">Measured site production and crew records</summary>
    <p className="mt-2 text-xs text-[#65717c]">Enter actual quantities completed per activity and date. Rates are historical observations, not automatically approved forecasting assumptions. Currently, records are visible only to their author pending project-role access integration.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs">Delivery package<select className="mt-1 w-full rounded border p-2" value={selected} onChange={e => { setPackageId(e.target.value); setActivityId('') }}>{packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="text-xs">Schedule activity<select className="mt-1 w-full rounded border p-2" value={activity} onChange={e => setActivityId(e.target.value)}>{activities.map(t => <option key={String(t.id)} value={String(t.id)}>{String(t.task_number || '')} {String(t.name || t.id)}</option>)}</select></label>
      <label className="text-xs">Observation date<input className="mt-1 w-full rounded border p-2" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label className="text-xs">Quantity completed<input className="mt-1 w-full rounded border p-2" type="number" min="0.001" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <label className="text-xs">Quantity unit<input className="mt-1 w-full rounded border p-2" maxLength={32} value={unit} onChange={e => setUnit(e.target.value)} placeholder="m², m³, units" /></label>
      <label className="text-xs">Crew count<input className="mt-1 w-full rounded border p-2" type="number" min="1" step="1" value={crew} onChange={e => setCrew(e.target.value)} /></label>
      <label className="text-xs">Hours worked per person<input className="mt-1 w-full rounded border p-2" type="number" min="0.25" max="24" step="0.25" value={hours} onChange={e => setHours(e.target.value)} /></label>
      <label className="text-xs">Site notes<input className="mt-1 w-full rounded border p-2" value={notes} onChange={e => setNotes(e.target.value)} /></label>
    </div>
    <button type="button" disabled={busy || !activities.length} onClick={save} className="mt-3 rounded-lg bg-[#123a60] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save measured production'}</button>
    {message && <p role="status" className="mt-2 text-xs">{message}</p>}
    <div className="mt-3 text-xs text-[#65717c]">Selected package: {selectedRows.length} recorded observations. Selected activity: {activityRows.length} observations. {rate !== null ? `Observed rate: ${rate.toFixed(3)} ${matchingUnits[0]} per person-hour (${totalQuantity?.toFixed(2)} ${matchingUnits[0]} / ${totalCrewHours.toFixed(1)} person-hours).` : 'Comparable measured rate unavailable.'}</div>
  </details>
}

import { useEffect, useState } from 'react'
import type { Task } from '@/types'
import { loadVerifiedActivityDurations, type VerifiedEvidenceResult } from './verifiedPackageEvidence'
import { calculatePackageForecast } from './packageForecast'
import type { MeasuredDurationResult } from './measuredDurationEvidence'

type Package = { id: string; name: string; date: Date }
type Row = { pkg: Package; data: VerifiedEvidenceResult; indicative: ReturnType<typeof calculatePackageForecast> | null; warning: string }

export default function VerifiedPackageOutlook({ projectId, packages, tasks }: {
  projectId: number | string; packages: Package[]; tasks: Task[]
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let live = true
    if (!projectId || !packages.length) { setRows([]); return }
    const id = Number(projectId)
    if (!Number.isSafeInteger(id) || id < 1) { setError('Invalid project ID'); return }
    setLoading(true); setError('')
    // Fetch each package independently: never mix evidence across packages.
    void Promise.all(packages.map(async pkg => {
      const data = await loadVerifiedActivityDurations(id, pkg.id)
      if (!data.ok) return { pkg, data, indicative: null, warning: data.error }
      const durations = new Map<string, MeasuredDurationResult>(
        data.activities.map(a => [a.activityId, a.result])
      )
      const indicative = calculatePackageForecast(pkg.id, pkg.date.toISOString(), tasks, new Date(), 1, durations)
      const unfinished = tasks.filter(t => String(t.delivery_package_id || '') === pkg.id
        && !['completed', 'complete', 'done'].includes(String(t.status).toLowerCase())
        && Number(t.progress_pct || 0) < 100)
      const warnings: string[] = []
      if (unfinished.some(t => !durations.has(String(t.id)))) warnings.push('Not all unfinished activities have verified measured durations')
      if (data.excluded.length) warnings.push(`${data.excluded.length} activity inputs could not produce measured durations`)
      warnings.push('Resource capacity, quantity as-of dates and site calendars are not independently verified')
      return { pkg, data, indicative, warning: warnings.join('; ') }
    })).then(next => { if (live) { setRows(next); setLoading(false) } })
      .catch(e => { if (live) { setError(String(e)); setLoading(false) } })
    return () => { live = false }
  }, [projectId, packages.map(p => `${p.id}:${p.date.toISOString()}`).join('|'), tasks, revision])
  return <div className="mt-4 rounded-xl border border-[#dfe3e7] bg-[#f8fafb] p-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-[#123a60]">Verified-evidence package scenarios</h3>
      <button type="button" onClick={() => setRevision(x => x+1)} className="rounded border px-3 py-1 text-xs">Refresh evidence</button>
    </div>
    <p className="mt-2 text-xs text-[#65717c]">Read-only working estimates using verified observations and the latest verified remaining-work assumptions. Dates are NOT validated handover forecasts and are NOT published to the Dashboard or Master Finish Outlook. Only authorised project reviewers can retrieve these records.</p>
    {loading && <p className="mt-2 text-xs">Loading verified evidence…</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {!loading && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs">
      <thead><tr className="border-b"><th className="py-2">Package</th><th>Verified measured activities</th><th>Indicative finish</th><th>Readiness</th></tr></thead>
      <tbody>{rows.map(({pkg,data,indicative,warning}) => <tr key={pkg.id} className="border-b align-top">
        <td className="py-2 font-semibold">{pkg.name}</td>
        <td>{data.ok ? data.activities.length : 'Unavailable'}</td>
        <td>{data.ok && indicative?.forecast ? indicative.forecast : 'Not available'}</td>
        <td className="max-w-[360px] text-[#65717c]">{warning}{indicative && !indicative.forecast ? `; ${indicative.reason}` : ''}</td>
      </tr>)}</tbody>
    </table></div>}
  </div>
}

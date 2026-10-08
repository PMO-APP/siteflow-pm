import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import type { DeliveryPackage } from './deliveryPackages'

type Entry = { packageName: string; activity: string; start: string; finish: string; phase: string }
const dateValid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date

/** Generic, project-scoped bulk recovery setup. One row per activity, tab-separated. */
export default function BulkRecoverySetup({ packages, onClose }: { packages: DeliveryPackage[]; onClose: () => void }) {
  const { projectId } = useProjectStore()
  const queryClient = useQueryClient()
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const parsed = useMemo(() => {
    const errors: string[] = []
    const entries: Entry[] = []
    source.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return
      const parts = line.split('\t').map(value => value.trim())
      if (index === 0 && parts[0]?.toLowerCase() === 'package') return
      if (parts.length !== 5 || !parts[0] || !parts[1] || !dateValid(parts[2]) || !dateValid(parts[3]) || parts[2] > parts[3]) {
        errors.push(`Line ${index + 1}: expected Package, Activity, Start YYYY-MM-DD, Finish YYYY-MM-DD, Phase (tab-separated).`)
        return
      }
      entries.push({ packageName: parts[0], activity: parts[1], start: parts[2], finish: parts[3], phase: parts[4] })
    })
    const keys = new Set<string>()
    entries.forEach(row => {
      const key = `${row.packageName.toLowerCase()}::${row.activity.toLowerCase()}`
      if (keys.has(key)) errors.push(`Duplicate activity: ${row.packageName} / ${row.activity}`)
      keys.add(key)
    })
    return { entries, errors }
  }, [source])
  const groups = useMemo(() => [...new Set(parsed.entries.map(row => row.packageName))], [parsed.entries])
  const existingNames = new Set(packages.map(pkg => pkg.name.toLowerCase()))
  const existing = groups.filter(name => existingNames.has(name.toLowerCase()))

  async function save() {
    if (!projectId || busy || !parsed.entries.length || parsed.errors.length) return
    setBusy(true)
    setMessage('')
    let created = 0
    let resumed = 0
    let inserted = 0
    try {
      // Recheck the selected project's current packages before writing.
      const { data: live, error: checkError } = await supabase.from('delivery_packages')
        .select('id, name').eq('project_id', projectId)
      if (checkError) throw checkError
      const byName = new Map((live || []).map(pkg => [String(pkg.name).trim().toLowerCase(), pkg]))

      // An existing package can only be resumed if it is completely empty.
      // Preflight all collisions before creating anything, so a populated schedule is never touched.
      const resumable = new Map<string, string>()
      for (const name of groups) {
        const match = byName.get(name.trim().toLowerCase())
        if (!match) continue
        const { count, error } = await supabase.from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('delivery_package_id', match.id)
        if (error) throw error
        if (count !== 0) throw new Error(`Package ${name} already contains ${count} activities. Import stopped without changing existing activities. Remove that package from the pasted rows before retrying.`)
        resumable.set(name, match.id)
      }

      for (const name of groups) {
        const rows = parsed.entries.filter(row => row.packageName === name)
        const start = rows.reduce((min, row) => row.start < min ? row.start : min, rows[0].start)
        const finish = rows.reduce((max, row) => row.finish > max ? row.finish : max, rows[0].finish)
        let packageId = resumable.get(name)
        if (!packageId) {
          const { data: pkg, error: packageError } = await supabase.from('delivery_packages').insert({
            project_id: projectId, name, code: null, discipline: 'Housebuild', package_type: 'Block',
            contractor_name: null, weight_pct: 0, planned_start: start, planned_finish: finish,
            is_shared: false, status: 'Active',
          }).select('id').single()
          if (packageError) throw packageError
          packageId = pkg.id
          created += 1
        } else {
          // Verify again immediately before inserting; never append to an existing programme.
          const { count, error } = await supabase.from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId).eq('delivery_package_id', packageId)
          if (error) throw error
          if (count !== 0) throw new Error(`${name} is no longer empty. No activities were added to it.`)
          resumed += 1
        }
        const { error: taskError } = await supabase.from('tasks').insert(rows.map((row, i) => ({
          project_id: projectId, delivery_package_id: packageId, discipline: 'Housebuild',
          task_number: i + 1, name: row.activity, phase: row.phase,
          start_date: row.start, finish_date: row.finish, planned_start: row.start, planned_finish: row.finish,
          dependencies: null, responsible: null, status: 'Not Started', rag: '', progress_pct: 0,
          procurement_deadline: null, approval_deadline: null,
          notes: 'Management recovery target; update actual progress in Project Controls.',
          is_milestone: /handover/i.test(row.activity),
        })))
        if (taskError) throw new Error(`${name}: activity insert failed: ${taskError.message}. The package may exist without activities; inspect it before retrying.`)
        inserted += rows.length
      }
      setMessage(`Success: ${created} new packages, ${resumed} empty packages resumed, and ${inserted} activities created in this project. Review Schedule and Project Controls before issuing the programme.`)
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : String(error)} Saved so far: ${created} new package(s), ${resumed} resumed package(s), ${inserted} activities. Inspect the result before retrying.`)
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['delivery-packages', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
      setBusy(false)
    }
  }

  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Bulk recovery schedule setup</h2><p className="mt-1 text-sm text-slate-600">Creates independent packages and planned activities only in the selected project. Existing populated packages are never overwritten. Completely empty packages left by a failed import can be resumed.</p></div><button type="button" onClick={onClose} disabled={busy} className="rounded-lg border px-3 py-1.5">Close</button></div>
      <p className="mt-4 text-sm text-slate-700">Paste five <strong>tab-separated</strong> columns: Package, Activity, Start, Finish, Phase. Copy directly from Excel. Dates must be YYYY-MM-DD. The dates are management targets, not actual progress.</p>
      <textarea aria-label="Bulk schedule rows" className="mt-3 h-52 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" value={source} onChange={e => setSource(e.target.value)} placeholder={'Package\tActivity\tStart\tFinish\tPhase\nBlock A1-A2\tSnag rectification A1\t2026-10-10\t2026-10-23\tRecovery'} />
      <div className="mt-3 text-sm text-slate-700">Preview: <strong>{groups.length} packages</strong> · <strong>{parsed.entries.length} activities</strong></div>
      {groups.length > 0 && <div className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs">{groups.join(' · ')}</div>}
      {parsed.errors.map((error, i) => <p key={i} className="mt-2 text-sm text-red-700">{error}</p>)}
      {existing.length > 0 && <p className="mt-2 text-sm text-amber-700">Existing packages detected (only completely empty packages can be resumed): {existing.join(', ')}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      <div className="mt-5 flex justify-end"><button type="button" onClick={save} disabled={busy || !parsed.entries.length || parsed.errors.length > 0} className="rounded-xl bg-[#0B2A3C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Creating…' : `Create ${groups.length} packages`}</button></div>
    </div>
  </div>
}

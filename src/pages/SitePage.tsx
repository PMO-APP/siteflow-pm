import { useState } from 'react'
import { Plus, Camera, Cloud, Users, Truck, AlertOctagon, X } from 'lucide-react'
import { useSiteReports, useUpsertSiteReport } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth'
import { supabase, uploadFile } from '@/lib/supabase'
import { fdate } from '@/lib/utils'
import type { SiteReport } from '@/types'
import { CommandHero } from '@/components/ui/command/CommandPrimitives'
import { IntelligencePanel } from '@/components/intelligence/IntelligencePanel'

const WEATHER = ['Sunny','Partly Cloudy','Overcast','Light Rain','Heavy Rain','Harmattan']

export default function SitePage() {
  const { data: reports = [], isLoading } = useSiteReports()
  const upsert = useUpsertSiteReport()
  const { user } = useAuthStore()
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<SiteReport | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const [form, setForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    report_type: 'Daily' as const,
    weather: 'Sunny',
    temperature_c: 28,
    works_carried_out: '',
    planned_vs_actual: '',
    overall_progress_pct: 0,
    total_labour: 0,
    skilled_labour: 0,
    unskilled_labour: 0,
    equipment_on_site: '',
    safety_incidents: 0,
    safety_notes: '',
    near_misses: 0,
    issues_encountered: '',
    actions_required: '',
    materials_received: '',
    visitors: '',
    next_day_plan: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    await upsert.mutateAsync({ ...form, submitted_by: user?.id })
    setModal(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, reportId?: string) => {
    const files = e.target.files
    if (!files?.length) return
    setPhotoUploading(true)
    for (const file of Array.from(files)) {
      const result = await uploadFile('site-photos', file, 'site')
      if (result && reportId) {
        await supabase.from('photos').insert({
          storage_path: result.path,
          public_url: result.publicUrl,
          photo_date: new Date().toISOString().slice(0, 10),
          report_id: reportId,
          uploaded_by: user?.id,
        })
      }
    }
    setPhotoUploading(false)
  }

  const latest = reports[0]
  const hasIncident = Number(latest?.safety_incidents || 0) > 0
  const hasConstraint = Boolean(latest?.issues_encountered?.trim())

  return (
    <div className="pmx-command-page space-y-5">
      <CommandHero
        eyebrow="Site execution"
        title="Site Command Centre"
        description="Capture daily production, labour, weather, safety, constraints and the next-day plan without losing the project delivery narrative."
      />

      <IntelligencePanel
        title="Site Delivery Intelligence"
        status={!latest ? 'neutral' : hasIncident ? 'critical' : hasConstraint ? 'watch' : 'healthy'}
        statusLabel={!latest ? 'No report yet' : hasIncident ? 'Safety intervention required' : hasConstraint ? 'Constraints recorded' : 'Delivery controlled'}
        trend={!latest ? 'stable' : hasIncident ? 'declining' : 'stable'}
        summary={!latest ? 'No daily site report has been submitted, so current production, labour and safety conditions cannot be assessed.' : `The latest report records ${latest.total_labour || 0} personnel on site and ${latest.overall_progress_pct || 0}% overall progress under ${latest.weather || 'unrecorded'} weather conditions.`}
        primaryConstraint={!latest ? 'Site intelligence depends on consistent daily reporting.' : hasIncident ? `${latest.safety_incidents} safety incident${latest.safety_incidents === 1 ? '' : 's'} recorded in the latest report.` : hasConstraint ? latest.issues_encountered : undefined}
        recommendation={!latest ? 'Submit the first daily report with labour, progress, constraints, safety and the next-day plan.' : hasIncident ? 'Close immediate safety actions and verify controls before affected work continues.' : hasConstraint ? 'Assign owners and dates to recorded constraints before the next coordination review.' : 'Maintain daily reporting and compare labour deployment against achieved production.'}
        metrics={[
          { label: 'Reports', value: reports.length },
          { label: 'Labour', value: latest?.total_labour || 0 },
          { label: 'Progress', value: `${latest?.overall_progress_pct || 0}%` },
          { label: 'Incidents', value: latest?.safety_incidents || 0 },
        ]}
      />

      {/* Summary cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: 'Labour on Site', value: latest.total_labour, sub: `${latest.skilled_labour} skilled / ${latest.unskilled_labour} unskilled`, color: 'text-blue-400' },
            { icon: Cloud, label: 'Weather', value: latest.weather || '—', sub: `${latest.temperature_c || '—'}°C`, color: 'text-[#c49e48]' },
            { icon: AlertOctagon, label: 'Safety Incidents', value: latest.safety_incidents, sub: `${latest.near_misses} near miss${latest.near_misses !== 1 ? 'es' : ''}`, color: latest.safety_incidents > 0 ? 'text-red-400' : 'text-emerald-400' },
            { icon: Truck, label: 'Overall Progress', value: `${latest.overall_progress_pct || 0}%`, sub: 'As of latest report', color: 'text-[#c49e48]' },
          ].map(s => (
            <div key={s.label} className="card p-3">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={14} className={s.color} />
                <div className="text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest">{s.label}</div>
              </div>
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[#6e7d8c] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button className="btn-gold btn-sm btn" onClick={() => setModal(true)}>
          <Plus size={13} /> New Site Report
        </button>
        <label className="btn-ghost btn-sm btn cursor-pointer">
          <Camera size={13} /> Upload Photos
          <input type="file" accept="image/*" multiple hidden onChange={e => handlePhotoUpload(e)} />
        </label>
      </div>

      {/* Reports list */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Site Reports</div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Weather</th>
                <th>Labour</th><th>Progress</th>
                <th>Safety</th><th>Submitted By</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-6 text-[#6e7d8c]">Loading…</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="font-medium text-[#ede8de]">{fdate(r.report_date)}</td>
                  <td><span className="badge badge-blue">{r.report_type}</span></td>
                  <td>{r.weather || '—'}</td>
                  <td>{r.total_labour}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#c49e48] rounded-full" style={{ width: `${r.overall_progress_pct || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-[#6e7d8c]">{r.overall_progress_pct || 0}%</span>
                    </div>
                  </td>
                  <td>
                    {r.safety_incidents > 0
                      ? <span className="badge badge-red">{r.safety_incidents} incident{r.safety_incidents > 1 ? 's' : ''}</span>
                      : <span className="badge badge-green">Clear</span>}
                  </td>
                  <td className="text-[#6e7d8c] text-[11px]">Site Team</td>
                  <td><button className="tbl-action">View</button></td>
                </tr>
              ))}
              {!isLoading && reports.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-[#6e7d8c]">No site reports yet. Submit the first one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="gold-bar" />
            <div className="modal-head">
              <div className="modal-title">Site Report — {fdate(selected.report_date, 'dd MMMM yyyy')}</div>
              <button onClick={() => setSelected(null)} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'Weather', v: `${selected.weather} · ${selected.temperature_c}°C` },
                  { k: 'Total Labour', v: `${selected.total_labour} (${selected.skilled_labour}S / ${selected.unskilled_labour}U)` },
                  { k: 'Overall Progress', v: `${selected.overall_progress_pct || 0}%` },
                ].map(i => <div key={i.k} className="bg-[#1c2a36] rounded p-2"><div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase tracking-widest mb-1">{i.k}</div><div className="text-[13px] text-[#ede8de]">{i.v}</div></div>)}
              </div>
              {[
                { label: 'Works Carried Out', value: selected.works_carried_out },
                { label: 'Planned vs Actual', value: selected.planned_vs_actual },
                { label: 'Equipment on Site', value: selected.equipment_on_site },
                { label: 'Materials Received', value: selected.materials_received },
                { label: 'Issues Encountered', value: selected.issues_encountered },
                { label: 'Actions Required', value: selected.actions_required },
                { label: 'Safety Notes', value: selected.safety_notes },
                { label: "Tomorrow's Plan", value: selected.next_day_plan },
                { label: 'Visitors', value: selected.visitors },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <div className="text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest mb-1">{f.label}</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">{f.value}</div>
                </div>
              ))}
              {/* Photo upload for this report */}
              <div>
                <div className="text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest mb-2">Add Photos</div>
                <label className="btn-ghost btn-sm btn cursor-pointer">
                  <Camera size={12} /> {photoUploading ? 'Uploading…' : 'Upload Photos'}
                  <input type="file" accept="image/*" multiple hidden onChange={e => handlePhotoUpload(e, selected.id)} disabled={photoUploading} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New report modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="gold-bar" />
            <div className="modal-head">
              <div className="modal-title">New Site Report</div>
              <button onClick={() => setModal(false)} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="form-label">Date</label><input type="date" className="form-control" value={form.report_date} onChange={e => set('report_date', e.target.value)} /></div>
                <div><label className="form-label">Type</label><select className="form-control" value={form.report_type} onChange={e => set('report_type', e.target.value)}><option>Daily</option><option>Weekly</option></select></div>
                <div><label className="form-label">Weather</label><select className="form-control" value={form.weather} onChange={e => set('weather', e.target.value)}>{WEATHER.map(w => <option key={w}>{w}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Temperature (°C)</label><input type="number" className="form-control" value={form.temperature_c} onChange={e => set('temperature_c', +e.target.value)} /></div>
                <div><label className="form-label">Overall Progress %</label><input type="number" min={0} max={100} className="form-control" value={form.overall_progress_pct} onChange={e => set('overall_progress_pct', +e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="form-label">Total Labour</label><input type="number" className="form-control" value={form.total_labour} onChange={e => set('total_labour', +e.target.value)} /></div>
                <div><label className="form-label">Skilled</label><input type="number" className="form-control" value={form.skilled_labour} onChange={e => set('skilled_labour', +e.target.value)} /></div>
                <div><label className="form-label">Unskilled</label><input type="number" className="form-control" value={form.unskilled_labour} onChange={e => set('unskilled_labour', +e.target.value)} /></div>
              </div>
              <div><label className="form-label">Works Carried Out</label><textarea className="form-control" rows={3} value={form.works_carried_out} onChange={e => set('works_carried_out', e.target.value)} placeholder="Describe work done today…" /></div>
              <div><label className="form-label">Planned vs Actual</label><textarea className="form-control" rows={2} value={form.planned_vs_actual} onChange={e => set('planned_vs_actual', e.target.value)} /></div>
              <div><label className="form-label">Equipment on Site</label><input className="form-control" value={form.equipment_on_site} onChange={e => set('equipment_on_site', e.target.value)} placeholder="List equipment on site…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Safety Incidents</label><input type="number" min={0} className="form-control" value={form.safety_incidents} onChange={e => set('safety_incidents', +e.target.value)} /></div>
                <div><label className="form-label">Near Misses</label><input type="number" min={0} className="form-control" value={form.near_misses} onChange={e => set('near_misses', +e.target.value)} /></div>
              </div>
              <div><label className="form-label">Safety Notes</label><textarea className="form-control" rows={2} value={form.safety_notes} onChange={e => set('safety_notes', e.target.value)} /></div>
              <div><label className="form-label">Issues Encountered</label><textarea className="form-control" rows={2} value={form.issues_encountered} onChange={e => set('issues_encountered', e.target.value)} /></div>
              <div><label className="form-label">Actions Required</label><textarea className="form-control" rows={2} value={form.actions_required} onChange={e => set('actions_required', e.target.value)} /></div>
              <div><label className="form-label">Materials Received</label><input className="form-control" value={form.materials_received} onChange={e => set('materials_received', e.target.value)} /></div>
              <div><label className="form-label">Visitors</label><input className="form-control" value={form.visitors} onChange={e => set('visitors', e.target.value)} /></div>
              <div><label className="form-label">Tomorrow's Plan</label><textarea className="form-control" rows={2} value={form.next_day_plan} onChange={e => set('next_day_plan', e.target.value)} /></div>
            </div>
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
              <button className="btn-ghost btn-sm btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-gold btn-sm btn" onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Submit Report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

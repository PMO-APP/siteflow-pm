import { useProjectStore } from '@/store/project'
import { getRole } from '@/lib/access'
import { canEditPage } from '@/lib/permissions'
import { useState } from 'react'
import { Plus, X, Shield } from 'lucide-react'
import { useRisks, useUpsertRisk } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth'
import { fdate, riskLevel } from '@/lib/utils'
import type { Risk } from '@/types'

const CATEGORIES: Risk['category'][] = ['Procurement', 'Programme', 'Design', 'Financial', 'Safety', 'External', 'Contractor']
const STATUSES: Risk['status'][] = ['Open', 'Mitigated', 'Closed', 'Transferred']

function RiskModal({ item, onClose }: { item: Risk | null; onClose: () => void }) {
  const upsert = useUpsertRisk()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || 'Procurement' as Risk['category'],
    likelihood: item?.likelihood || 3,
    impact: item?.impact || 3,
    status: item?.status || 'Open' as Risk['status'],
    mitigation_action: item?.mitigation_action || '',
    contingency_action: item?.contingency_action || '',
    review_date: item?.review_date || '',
    closed_date: item?.closed_date || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const score = form.likelihood * form.impact
  const lvl = riskLevel(score)

  const save = async () => {
    await upsert.mutateAsync({ id: item?.id, ...form, created_by: user?.id })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />
        <div className="modal-head">
          <div className="modal-title">{item ? `Edit Risk #${item.risk_number}` : 'New Risk'}</div>
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="form-label">Risk Title *</label><input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Category</label><select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="form-label">Status</label><select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>

          {/* Risk scoring */}
          <div className="bg-[#1c2a36] rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono text-[#6e7d8c] uppercase tracking-widest">Risk Score</div>
              <div className={`text-2xl font-display font-bold px-3 py-1 rounded ${lvl.color}`}>{score} — {lvl.label}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Likelihood (1–5): {form.likelihood}</label>
                <input type="range" min={1} max={5} value={form.likelihood} onChange={e => set('likelihood', +e.target.value)} className="w-full accent-[#c49e48]" />
                <div className="flex justify-between text-[9px] text-[#6e7d8c] mt-0.5"><span>Rare</span><span>Almost Certain</span></div>
              </div>
              <div>
                <label className="form-label">Impact (1–5): {form.impact}</label>
                <input type="range" min={1} max={5} value={form.impact} onChange={e => set('impact', +e.target.value)} className="w-full accent-[#c49e48]" />
                <div className="flex justify-between text-[9px] text-[#6e7d8c] mt-0.5"><span>Negligible</span><span>Catastrophic</span></div>
              </div>
            </div>
          </div>

          <div><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div><label className="form-label">Mitigation Action</label><textarea className="form-control" rows={2} value={form.mitigation_action} onChange={e => set('mitigation_action', e.target.value)} placeholder="What actions are being taken to reduce this risk?" /></div>
          <div><label className="form-label">Contingency Action</label><textarea className="form-control" rows={2} value={form.contingency_action} onChange={e => set('contingency_action', e.target.value)} placeholder="What happens if the risk materialises?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Review Date</label><input type="date" className="form-control" value={form.review_date} onChange={e => set('review_date', e.target.value)} /></div>
            <div><label className="form-label">Closed Date</label><input type="date" className="form-control" value={form.closed_date} onChange={e => set('closed_date', e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>Cancel</button>
          <button className="btn-gold btn-sm btn" onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : item ? 'Save' : 'Add Risk'}</button>
        </div>
      </div>
    </div>
  )
}

// 5x5 matrix visualisation
function RiskMatrix({ risks }: { risks: Risk[] }) {
  const open = risks.filter(r => r.status === 'Open')
  const cell = (l: number, i: number) => open.filter(r => r.likelihood === l && r.impact === i)
  const cellColor = (l: number, i: number) => {
    const s = l * i
    if (s >= 15) return 'bg-red-500/20 border-red-500/30'
    if (s >= 10) return 'bg-orange-500/15 border-orange-500/20'
    if (s >= 5) return 'bg-amber-500/15 border-amber-500/20'
    return 'bg-emerald-500/10 border-emerald-500/15'
  }
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Risk Matrix — Open Risks</div></div>
      <div className="p-4">
        <div className="flex gap-2">
          {/* Y-axis label */}
          <div className="flex flex-col justify-center">
            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest">← Likelihood</div>
          </div>
          <div className="flex-1">
            {/* Matrix */}
            <div className="grid gap-1" style={{ gridTemplateRows: 'repeat(5, 48px)', gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[5,4,3,2,1].map(l => [1,2,3,4,5].map(i => {
                const items = cell(l, i)
                return (
                  <div key={`${l}-${i}`} className={`border rounded flex flex-wrap items-center justify-center gap-0.5 p-0.5 ${cellColor(l, i)}`} title={`L${l}×I${i}=${l*i}`}>
                    {items.map(r => (
                      <div key={r.id} className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-mono text-white" title={r.title}>
                        {r.risk_number}
                      </div>
                    ))}
                  </div>
                )
              }))}
            </div>
            {/* X-axis */}
            <div className="flex mt-1 pl-0">
              {['','1','2','3','4','5'].map((v, i) => (
                i === 0 ? null : <div key={v} className="flex-1 text-center text-[9px] text-[#6e7d8c]">{v}</div>
              ))}
            </div>
            <div className="text-center text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest mt-0.5">Impact →</div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-3 justify-center">
          {[{ label: 'Low (1–4)', c: 'bg-emerald-500/30' }, { label: 'Medium (5–9)', c: 'bg-amber-500/30' }, { label: 'High (10–14)', c: 'bg-orange-500/30' }, { label: 'Critical (15–25)', c: 'bg-red-500/30' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded ${l.c}`} /><span className="text-[9px] text-[#6e7d8c]">{l.label}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RiskPage() {
  const { data: risks = [], isLoading } = useRisks()

  const { user } = useAuthStore()
  const { projectOwnerEmail } = useProjectStore()

  const role = getRole(user?.email)

  const canEdit = canEditPage(
    role,
    'risk',
    user?.email,
    projectOwnerEmail
  )
  const [modal, setModal] = useState<Risk | null | 'new'>(null)
  const [catFilter, setCatFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [view, setView] = useState<'list' | 'matrix'>('list')

  const filtered = risks.filter(r => {
    if (catFilter && r.category !== catFilter) return false
    if (statFilter && r.status !== statFilter) return false
    return true
  })

  const open = risks.filter(r => r.status === 'Open').length
  const high = risks.filter(r => r.status === 'Open' && (r.risk_score || 0) >= 12).length
  const mitigated = risks.filter(r => r.status === 'Mitigated').length
  const closed = risks.filter(r => r.status === 'Closed').length

  const catColor = (c: string) => {
    const m: Record<string, string> = { Procurement: 'badge-amber', Programme: 'badge-blue', Design: 'badge-muted', Financial: 'badge-red', Safety: 'badge-red', External: 'badge-muted', Contractor: 'badge-amber' }
    return m[c] || 'badge-muted'
  }
  const statBadge = (s: string) => s === 'Open' ? 'badge-red' : s === 'Mitigated' ? 'badge-amber' : s === 'Closed' ? 'badge-green' : 'badge-muted'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ label: 'Open Risks', value: open, c: open > 0 ? 'text-red-400' : 'text-emerald-400' }, { label: 'High / Critical', value: high, c: high > 0 ? 'text-red-400' : 'text-emerald-400' }, { label: 'Mitigated', value: mitigated, c: 'text-amber-400' }, { label: 'Closed', value: closed, c: 'text-emerald-400' }].map(s => (
          <div key={s.label} className="card p-3"><div className={`font-display text-3xl font-bold ${s.c}`}>{s.value}</div><div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">{s.label}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {(['list', 'matrix'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${view === v ? 'bg-[#c49e48] text-[#0c1014]' : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'}`}>
              {v === 'list' ? 'List' : 'Matrix'}
            </button>
          ))}
        </div>
        <select className="form-control text-[12px] py-1.5 w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-control text-[12px] py-1.5 w-auto" value={statFilter} onChange={e => setStatFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {canEdit && (
  <button
    className="btn-gold btn-sm btn ml-auto"
    onClick={() => setModal('new')}
  >
    <Plus size={13} /> Add Risk
  </button>
)}
      </div>

      {view === 'matrix' && <RiskMatrix risks={risks} />}

      {view === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr><th>#</th><th>Risk</th><th>Category</th><th>L</th><th>I</th><th>Score</th><th>Level</th><th>Status</th><th className="hide-mobile">Review</th><th></th></tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={10} className="text-center py-6 text-[#6e7d8c]">Loading…</td></tr>
                  : filtered.map(r => {
                  const score = r.risk_score || (r.likelihood * r.impact)
                  const lvl = riskLevel(score)
                  return (
                    <tr key={r.id} className={r.status === 'Closed' ? 'opacity-40' : ''}>
                      <td className="font-mono text-[10px] text-[#6e7d8c]">R{r.risk_number}</td>
                      <td className="max-w-[200px]">
                        <div className="text-[12px] text-[#ede8de] font-medium truncate">{r.title}</div>
                        {r.mitigation_action && <div className="text-[10px] text-[#6e7d8c] truncate">{r.mitigation_action.slice(0, 60)}</div>}
                      </td>
                      <td><span className={`badge ${catColor(r.category || '')}`}>{r.category}</span></td>
                      <td className="font-mono text-center">{r.likelihood}</td>
                      <td className="font-mono text-center">{r.impact}</td>
                      <td className="font-mono font-bold text-center text-[14px] text-[#ede8de]">{score}</td>
                      <td><span className={`badge ${lvl.color}`}>{lvl.label}</span></td>
                      <td><span className={`badge ${statBadge(r.status)}`}>{r.status}</span></td>
                      <td className="hide-mobile">{fdate(r.review_date)}</td>
                      <td>
  {canEdit ? (
    <button
      className="tbl-action"
      onClick={() => setModal(r)}
    >
      Edit
    </button>
  ) : (
    <span className="text-[10px] text-[#6e7d8c]">
      View only
    </span>
  )}
</td>
                    </tr>
                  )
                })}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-8 text-[#6e7d8c]">{risks.length === 0 ? 'No risks logged yet.' : 'No risks match filters.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== null && (
        <RiskModal item={modal === 'new' ? null : modal as Risk} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

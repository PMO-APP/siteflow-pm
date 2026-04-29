import { useState } from 'react'
import { Plus, X, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useApprovals, useUpsertApproval } from '@/hooks/useData'
import { fdate, urgencyColor } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Approval } from '@/types'

const TYPES: Approval['type'][] = ['Material','Shop Drawing','Design','Sample','RFI Response','Client Signoff','Other']
const STATUSES: Approval['status'][] = ['Draft','Submitted','Under Review','Approved','Rejected','Resubmit']

function ApprovalModal({ item, onClose }: { item: Approval | null; onClose: () => void }) {
  const upsert = useUpsertApproval()
  const [form, setForm] = useState({
    title: item?.title || '', type: item?.type || 'Material',
    description: item?.description || '', submitted_date: item?.submitted_date || '',
    deadline: item?.deadline || '', status: item?.status || 'Draft',
    approved_date: item?.approved_date || '', rejection_reason: item?.rejection_reason || '',
    revision_number: item?.revision_number || 1, notes: item?.notes || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => { await upsert.mutateAsync({ id: item?.id, ...form }); onClose() }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />
        <div className="modal-head"><div className="modal-title">{item ? 'Edit Approval' : 'New Approval Request'}</div><button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button></div>
        <div className="p-5 space-y-4">
          <div><label className="form-label">Title *</label><input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Type</label><select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="form-label">Status</label><select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Submitted Date</label><input type="date" className="form-control" value={form.submitted_date} onChange={e => set('submitted_date', e.target.value)} /></div>
            <div><label className="form-label">Deadline</label><input type="date" className="form-control" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Approved Date</label><input type="date" className="form-control" value={form.approved_date} onChange={e => set('approved_date', e.target.value)} /></div>
            <div><label className="form-label">Revision #</label><input type="number" min={1} className="form-control" value={form.revision_number} onChange={e => set('revision_number', +e.target.value)} /></div>
          </div>
          <div><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          {form.status === 'Rejected' && <div><label className="form-label">Rejection Reason</label><textarea className="form-control" rows={2} value={form.rejection_reason} onChange={e => set('rejection_reason', e.target.value)} /></div>}
          <div><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>Cancel</button>
          <button className="btn-gold btn-sm btn" onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const { data: approvals = [], isLoading } = useApprovals()
  const [modal, setModal] = useState<Approval | null | 'new'>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const today = new Date()

  const filtered = approvals.filter(a => (!typeFilter || a.type === typeFilter) && (!statFilter || a.status === statFilter))

  const pending = approvals.filter(a => a.status !== 'Approved' && a.status !== 'Rejected').length
  const overdue = approvals.filter(a => a.status !== 'Approved' && a.deadline && differenceInDays(new Date(a.deadline), today) < 0).length
  const approved = approvals.filter(a => a.status === 'Approved').length

  const statusIcon = (s: string) => {
    if (s === 'Approved') return <CheckCircle size={12} className="text-emerald-400" />
    if (s === 'Rejected') return <XCircle size={12} className="text-red-400" />
    return <Clock size={12} className="text-amber-400" />
  }
  const statusBadge = (s: string) => {
    if (s === 'Approved') return 'badge-green'
    if (s === 'Rejected') return 'badge-red'
    if (s === 'Under Review') return 'badge-amber'
    if (s === 'Submitted') return 'badge-blue'
    return 'badge-muted'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[{ label: 'Pending', value: pending, color: 'text-amber-400' }, { label: 'Overdue', value: overdue, color: overdue > 0 ? 'text-red-400' : 'text-emerald-400' }, { label: 'Approved', value: approved, color: 'text-emerald-400' }].map(s => (
          <div key={s.label} className="card p-3"><div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div><div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">{s.label}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select className="form-control text-[12px] py-1.5 w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">All Types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <select className="form-control text-[12px] py-1.5 w-auto" value={statFilter} onChange={e => setStatFilter(e.target.value)}><option value="">All Status</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        <button className="btn-gold btn-sm btn ml-auto" onClick={() => setModal('new')}><Plus size={13} /> New Approval</button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Title</th><th>Type</th><th>Rev</th><th>Submitted</th><th>Deadline</th><th>Days Left</th><th>Status</th><th className="hide-mobile">Notes</th><th></th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={9} className="text-center py-6 text-[#6e7d8c]">Loading…</td></tr>
                : filtered.map(a => {
                const d = a.deadline ? differenceInDays(new Date(a.deadline), today) : null
                const od = d !== null && d < 0 && a.status !== 'Approved'
                return (
                  <tr key={a.id} className={od ? 'bg-red-500/[0.03]' : ''}>
                    <td className="font-medium text-[#ede8de] max-w-[200px]">{a.title}</td>
                    <td><span className="badge badge-muted">{a.type}</span></td>
                    <td className="font-mono text-[10px] text-[#6e7d8c]">Rev {a.revision_number}</td>
                    <td>{fdate(a.submitted_date)}</td>
                    <td className={urgencyColor(d)}>{fdate(a.deadline)}</td>
                    <td className={`font-mono text-[11px] font-bold ${urgencyColor(d)}`}>{d === null ? '—' : d < 0 ? `${Math.abs(d)}d over` : d === 0 ? 'TODAY' : `${d}d`}</td>
                    <td><div className="flex items-center gap-1.5">{statusIcon(a.status)}<span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></div></td>
                    <td className="hide-mobile text-[11px] text-[#6e7d8c] max-w-[160px] truncate">{a.notes || '—'}</td>
                    <td><button className="tbl-action" onClick={() => setModal(a)}>Edit</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {modal !== null && <ApprovalModal item={modal === 'new' ? null : modal as Approval} onClose={() => setModal(null)} />}
    </div>
  )
}

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useQualityGates, useUpsertQualityGate } from '@/hooks/useData'
import { fdate } from '@/lib/utils'
import type { QualityGate } from '@/types'

const STATUSES: QualityGate['status'][] = [
  'Pending',
  'Approved',
  'Rejected',
]

const GATE_TYPES = [
  'Structural',
  'MEP',
  'Architectural',
  'Infrastructure',
  'Waterproofing',
  'Drainage',
  'Finishes',
  'Hidden Work',
  'Other',
]

function QualityGateModal({
  item,
  onClose,
}: {
  item: QualityGate | null
  onClose: () => void
}) {
  const upsert = useUpsertQualityGate()

  const [form, setForm] = useState({
    gate_name: item?.gate_name || '',
    gate_type: item?.gate_type || 'Structural',
    status: item?.status || 'Pending',
    contractor: item?.contractor || '',
    consultant: item?.consultant || '',
    internal_reviewer: item?.internal_reviewer || '',
    inspection_date: item?.inspection_date || '',
    comments: item?.comments || '',
  })

  const set = (key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const save = async () => {
    if (!form.gate_name.trim()) return

    await upsert.mutateAsync({
      id: item?.id,
      gate_name: form.gate_name.trim(),
      gate_type: form.gate_type,
      status: form.status as QualityGate['status'],
      contractor: form.contractor || null,
      consultant: form.consultant || null,
      internal_reviewer: form.internal_reviewer || null,
      inspection_date: form.inspection_date || null,
      approved_at:
        form.status === 'Approved'
          ? new Date().toISOString()
          : item?.approved_at || null,
      comments: form.comments || null,
    } as any)

    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? 'Update Quality Gate' : 'New Quality Gate'}
          </div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Gate Name *</label>
            <input
              className="form-control"
              value={form.gate_name}
              onChange={e => set('gate_name', e.target.value)}
              placeholder="e.g. Terrace drainage connection sign-off"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Gate Type</label>
              <select
                className="form-control"
                value={form.gate_type}
                onChange={e => set('gate_type', e.target.value)}
              >
                {GATE_TYPES.map(type => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {STATUSES.map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Contractor</label>
              <input
                className="form-control"
                value={form.contractor}
                onChange={e => set('contractor', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Consultant</label>
              <input
                className="form-control"
                value={form.consultant}
                onChange={e => set('consultant', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Internal Reviewer</label>
              <input
                className="form-control"
                value={form.internal_reviewer}
                onChange={e => set('internal_reviewer', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Inspection Date</label>
            <input
              type="date"
              className="form-control"
              value={form.inspection_date}
              onChange={e => set('inspection_date', e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Comments / Inspection Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.comments}
              onChange={e => set('comments', e.target.value)}
              placeholder="Add inspection comments, rejection reason, approval condition, or next action..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn-gold btn-sm btn"
            onClick={save}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? 'Saving...' : 'Save Gate'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QualityPage() {
  const { data: gates = [], isLoading } = useQualityGates()
  const [modal, setModal] = useState<QualityGate | null | 'new'>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = gates.filter(gate => {
    if (statusFilter && gate.status !== statusFilter) return false
    if (typeFilter && gate.gate_type !== typeFilter) return false
    return true
  })

  const pending = gates.filter(gate => gate.status === 'Pending').length
  const approved = gates.filter(gate => gate.status === 'Approved').length
  const rejected = gates.filter(gate => gate.status === 'Rejected').length

  const statusBadge = (status: QualityGate['status']) => {
    if (status === 'Approved') return 'badge-green'
    if (status === 'Rejected') return 'badge-red'
    return 'badge-amber'
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold text-[#ede8de]">
          Quality Gates
        </div>

        <div className="text-[11px] text-[#6e7d8c] mt-1">
          Control hold points before work proceeds
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-400' },
          { label: 'Approved', value: approved, color: 'text-emerald-400' },
          { label: 'Rejected', value: rejected, color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="card p-3">
            <div className={`font-display text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>

            <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {GATE_TYPES.map(type => (
            <option key={type}>{type}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {STATUSES.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <button
          className="btn-gold btn-sm btn ml-auto"
          onClick={() => setModal('new')}
        >
          <Plus size={13} />
          Add Gate
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Type</th>
                <th>Status</th>
                <th className="hide-mobile">Contractor</th>
                <th className="hide-mobile">Consultant</th>
                <th className="hide-mobile">Reviewer</th>
                <th>Inspection</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[#6e7d8c]">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#6e7d8c]">
                    No quality gates created yet.
                  </td>
                </tr>
              ) : (
                filtered.map(gate => (
                  <tr key={gate.id}>
                    <td className="font-medium text-[#ede8de] max-w-[260px]">
                      <div className="truncate">{gate.gate_name}</div>
                      {gate.comments && (
                        <div className="text-[10px] text-[#6e7d8c] truncate">
                          {gate.comments}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="badge badge-muted">
                        {gate.gate_type || 'Other'}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${statusBadge(gate.status)}`}>
                        {gate.status}
                      </span>
                    </td>

                    <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                      {gate.contractor || '—'}
                    </td>

                    <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                      {gate.consultant || '—'}
                    </td>

                    <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                      {gate.internal_reviewer || '—'}
                    </td>

                    <td>{fdate(gate.inspection_date)}</td>

                    <td>
                      <button
                        className="tbl-action"
                        onClick={() => setModal(gate)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <QualityGateModal
          item={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

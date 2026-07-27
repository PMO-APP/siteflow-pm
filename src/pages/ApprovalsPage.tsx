import { useMembershipStore } from '@/store/membership'
import { canApprove } from '@/lib/permissions'
import { useState } from 'react'
import { Plus, X, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useApprovals, useUpsertApproval } from '@/hooks/useData'
import { fdate, urgencyColor } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Approval } from '@/types'
import { CommandHero } from '@/components/ui/command/CommandPrimitives'

const TYPES: Approval['type'][] = [
  'Material',
  'Shop Drawing',
  'Design',
  'Sample',
  'RFI Response',
  'Client Signoff',
  'Other',
]

const STATUSES: Approval['status'][] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Resubmit',
]

function ApprovalModal({
  item,
  onClose,
}: {
  item: Approval | null
  onClose: () => void
}) {
  const upsert = useUpsertApproval()
  const isEditMode = !!item

  const [form, setForm] = useState({
    title: item?.title || '',
    type: item?.type || 'Material',
    description: item?.description || '',
    submitted_date: item?.submitted_date || '',
    deadline: item?.deadline || '',
    status: item?.status || 'Draft',
    approved_date: item?.approved_date || '',
    rejection_reason: item?.rejection_reason || '',
    revision_number: item?.revision_number || 1,
    notes: item?.notes || '',
  })

  const set = (key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }

      if (key === 'status' && value === 'Approved' && !next.approved_date) {
        next.approved_date = new Date().toISOString().slice(0, 10)
      }

      if (key === 'status' && value !== 'Rejected') {
        next.rejection_reason = ''
      }

      return next
    })
  }

  const cleanDate = (value: string) =>
    value && value.trim() !== '' ? value : null

  const save = async () => {
    if (!form.title.trim() && !isEditMode) return

    if (isEditMode) {
      await upsert.mutateAsync({
        id: item.id,
        status: form.status,
        approved_date: cleanDate(form.approved_date),
        description: form.description || null,
        notes: form.notes || null,
        rejection_reason:
          form.status === 'Rejected'
            ? form.rejection_reason || null
            : null,
      } as any)
    } else {
      await upsert.mutateAsync({
        title: form.title.trim(),
        type: form.type,
        description: form.description || null,
        submitted_date: cleanDate(form.submitted_date),
        deadline: cleanDate(form.deadline),
        status: form.status,
        approved_date: cleanDate(form.approved_date),
        rejection_reason:
          form.status === 'Rejected'
            ? form.rejection_reason || null
            : null,
        revision_number: Number(form.revision_number || 1),
        notes: form.notes || null,
      } as any)
    }

    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {isEditMode ? 'Update Approval Status' : 'New Approval Request'}
          </div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        {isEditMode && (
          <div className="grid grid-cols-2 gap-2 px-5 py-3 bg-[#111820] border-b border-white/[0.06]">
            {[
              { label: 'Title', value: item.title },
              { label: 'Type', value: item.type },
              { label: 'Submitted', value: fdate(item.submitted_date) },
              { label: 'Deadline', value: fdate(item.deadline) },
            ].map(info => (
              <div key={info.label} className="rounded-lg bg-[#1c2a36] p-2">
                <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase tracking-widest">
                  {info.label}
                </div>

                <div className="text-[12px] text-[#ede8de] mt-1 truncate">
                  {info.value || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4">
          {!isEditMode && (
            <>
              <div>
                <label className="form-label">Title *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-control"
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                  >
                    {TYPES.map(type => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Revision #</label>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={form.revision_number}
                    onChange={e =>
                      set('revision_number', Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Submitted Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.submitted_date}
                    onChange={e => set('submitted_date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Deadline</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.deadline}
                    onChange={e => set('deadline', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {isEditMode && (
            <div>
              <label className="form-label">Approval Item</label>
              <div className="form-control bg-[#111820] border-white/[0.04] text-[#bfb9ae]">
                {item.title}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="form-label">Approved Date</label>
              <input
                type="date"
                className="form-control"
                value={form.approved_date}
                onChange={e => set('approved_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {form.status === 'Rejected' && (
            <div>
              <label className="form-label">Rejection Reason</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.rejection_reason}
                onChange={e => set('rejection_reason', e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
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
            {upsert.isPending
              ? 'Saving…'
              : isEditMode
              ? 'Save Update'
              : 'Create Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const { data: approvals = [], isLoading } = useApprovals()
  const role = useMembershipStore(state => state.role)
  const canEdit = canApprove(role)

  const [modal, setModal] = useState<Approval | null | 'new'>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const today = new Date()

  const filtered = approvals.filter(
    approval =>
      (!typeFilter || approval.type === typeFilter) &&
      (!statFilter || approval.status === statFilter)
  )

  const pending = approvals.filter(
    approval =>
      approval.status !== 'Approved' &&
      approval.status !== 'Rejected'
  ).length

  const overdue = approvals.filter(
    approval =>
      approval.status !== 'Approved' &&
      approval.deadline &&
      differenceInDays(new Date(approval.deadline), today) < 0
  ).length

  const approved = approvals.filter(
    approval => approval.status === 'Approved'
  ).length

  const statusIcon = (status: string) => {
    if (status === 'Approved') {
      return <CheckCircle size={12} className="text-emerald-400" />
    }

    if (status === 'Rejected') {
      return <XCircle size={12} className="text-red-400" />
    }

    return <Clock size={12} className="text-amber-400" />
  }

  const statusBadge = (status: string) => {
    if (status === 'Approved') return 'badge-green'
    if (status === 'Rejected') return 'badge-red'
    if (status === 'Under Review') return 'badge-amber'
    if (status === 'Submitted') return 'badge-blue'
    return 'badge-muted'
  }

  return (
    <div className="pmx-command-page space-y-5">
      <CommandHero
        eyebrow="Technical governance"
        title="Approval Centre"
        description="Track every submission from draft through review, decision and release, with overdue items brought immediately into focus."
      />

      {!canEdit && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          View Only Mode — you can view approvals, but you cannot create,
          approve, reject, or update approval records.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-400' },
          {
            label: 'Overdue',
            value: overdue,
            color: overdue > 0 ? 'text-red-400' : 'text-emerald-400',
          },
          { label: 'Approved', value: approved, color: 'text-emerald-400' },
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

          {TYPES.map(type => (
            <option key={type}>{type}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statFilter}
          onChange={e => setStatFilter(e.target.value)}
        >
          <option value="">All Status</option>

          {STATUSES.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        {canEdit && (
          <button
            className="btn-gold btn-sm btn ml-auto"
            onClick={() => setModal('new')}
          >
            <Plus size={13} />
            New Approval
          </button>
        )}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Rev</th>
                <th>Submitted</th>
                <th>Deadline</th>
                <th>Days Left</th>
                <th>Status</th>
                <th className="hide-mobile">Notes</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-6 text-[#6e7d8c]"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (
                filtered.map(approval => {
                  const days = approval.deadline
                    ? differenceInDays(new Date(approval.deadline), today)
                    : null

                  const isOverdue =
                    days !== null &&
                    days < 0 &&
                    approval.status !== 'Approved'

                  return (
                    <tr
                      key={approval.id}
                      className={isOverdue ? 'bg-red-500/[0.03]' : ''}
                    >
                      <td className="font-medium text-[#ede8de] max-w-[200px]">
                        {approval.title}
                      </td>

                      <td>
                        <span className="badge badge-muted">
                          {approval.type}
                        </span>
                      </td>

                      <td className="font-mono text-[10px] text-[#6e7d8c]">
                        Rev {approval.revision_number}
                      </td>

                      <td>{fdate(approval.submitted_date)}</td>

                      <td className={urgencyColor(days)}>
                        {fdate(approval.deadline)}
                      </td>

                      <td
                        className={`font-mono text-[11px] font-bold ${urgencyColor(days)}`}
                      >
                        {days === null
                          ? '—'
                          : days < 0
                          ? `${Math.abs(days)}d over`
                          : days === 0
                          ? 'TODAY'
                          : `${days}d`}
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(approval.status)}

                          <span
                            className={`badge ${statusBadge(approval.status)}`}
                          >
                            {approval.status}
                          </span>
                        </div>
                      </td>

                      <td className="hide-mobile text-[11px] text-[#6e7d8c] max-w-[160px] truncate">
                        {approval.notes || '—'}
                      </td>

                      <td>
                        {canEdit ? (
                          <button
                            className="tbl-action"
                            onClick={() => setModal(approval)}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && canEdit && (
        <ApprovalModal
          item={modal === 'new' ? null : (modal as Approval)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

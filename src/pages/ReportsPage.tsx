import { useMembershipStore } from '@/store/membership'
import { canEditRisk } from '@/lib/permissions'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useRisks, useUpsertRisk } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth'
import { fdate, riskLevel } from '@/lib/utils'
import type { Risk } from '@/types'

const CATEGORIES: Risk['category'][] = [
  'Procurement',
  'Programme',
  'Design',
  'Financial',
  'Safety',
  'External',
  'Contractor',
]

const STATUSES: Risk['status'][] = [
  'Open',
  'Mitigated',
  'Closed',
  'Transferred',
]

function RiskModal({
  item,
  onClose,
}: {
  item: Risk | null
  onClose: () => void
}) {
  const upsert = useUpsertRisk()
  const { user } = useAuthStore()

  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || ('Procurement' as Risk['category']),
    likelihood: item?.likelihood || 3,
    impact: item?.impact || 3,
    status: item?.status || ('Open' as Risk['status']),
    mitigation_action: item?.mitigation_action || '',
    contingency_action: item?.contingency_action || '',
    review_date: item?.review_date || '',
    closed_date: item?.closed_date || '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({
      ...current,
      [key]: value,
    }))

  const score = form.likelihood * form.impact
  const level = riskLevel(score)

  async function save() {
    if (!form.title.trim()) return

    await upsert.mutateAsync({
      id: item?.id,
      ...form,
      created_by: user?.id,
    })

    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal max-w-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? `Edit Risk #${item.risk_number}` : 'New Risk'}
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
            <label className="form-label">Risk Title *</label>
            <input
              className="form-control"
              value={form.title}
              onChange={event => set('title', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={form.category}
                onChange={event => set('category', event.target.value)}
              >
                {CATEGORIES.map(category => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={event => set('status', event.target.value)}
              >
                {STATUSES.map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#1c2a36] rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono text-[#6e7d8c] uppercase tracking-widest">
                Risk Score
              </div>

              <div
                className={`text-2xl font-display font-bold px-3 py-1 rounded ${level.color}`}
              >
                {score} — {level.label}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Likelihood (1–5): {form.likelihood}
                </label>

                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.likelihood}
                  onChange={event =>
                    set('likelihood', +event.target.value)
                  }
                  className="w-full accent-[#c49e48]"
                />

                <div className="flex justify-between text-[9px] text-[#6e7d8c] mt-0.5">
                  <span>Rare</span>
                  <span>Almost Certain</span>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Impact (1–5): {form.impact}
                </label>

                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.impact}
                  onChange={event => set('impact', +event.target.value)}
                  className="w-full accent-[#c49e48]"
                />

                <div className="flex justify-between text-[9px] text-[#6e7d8c] mt-0.5">
                  <span>Negligible</span>
                  <span>Catastrophic</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.description}
              onChange={event => set('description', event.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Mitigation Action</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.mitigation_action}
              onChange={event =>
                set('mitigation_action', event.target.value)
              }
              placeholder="What actions are being taken to reduce this risk?"
            />
          </div>

          <div>
            <label className="form-label">Contingency Action</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.contingency_action}
              onChange={event =>
                set('contingency_action', event.target.value)
              }
              placeholder="What happens if the risk materialises?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Review Date</label>
              <input
                type="date"
                className="form-control"
                value={form.review_date}
                onChange={event => set('review_date', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Closed Date</label>
              <input
                type="date"
                className="form-control"
                value={form.closed_date}
                onChange={event => set('closed_date', event.target.value)}
              />
            </div>
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
            {upsert.isPending ? 'Saving…' : item ? 'Save' : 'Add Risk'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RiskMatrix({ risks }: { risks: Risk[] }) {
  const open = risks.filter(risk => risk.status === 'Open')

  const cell = (likelihood: number, impact: number) =>
    open.filter(
      risk =>
        risk.likelihood === likelihood &&
        risk.impact === impact
    )

  const cellColor = (likelihood: number, impact: number) => {
    const score = likelihood * impact

    if (score >= 15) return 'bg-red-500/20 border-red-500/30'
    if (score >= 10) return 'bg-orange-500/15 border-orange-500/20'
    if (score >= 5) return 'bg-amber-500/15 border-amber-500/20'

    return 'bg-emerald-500/10 border-emerald-500/15'
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Risk Matrix — Open Risks</div>
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <div className="flex flex-col justify-center">
            <div
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
              className="text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest"
            >
              ← Likelihood
            </div>
          </div>

          <div className="flex-1">
            <div
              className="grid gap-1"
              style={{
                gridTemplateRows: 'repeat(5, 48px)',
                gridTemplateColumns: 'repeat(5, 1fr)',
              }}
            >
              {[5, 4, 3, 2, 1].map(likelihood =>
                [1, 2, 3, 4, 5].map(impact => {
                  const items = cell(likelihood, impact)

                  return (
                    <div
                      key={`${likelihood}-${impact}`}
                      className={`border rounded flex flex-wrap items-center justify-center gap-0.5 p-0.5 ${cellColor(
                        likelihood,
                        impact
                      )}`}
                      title={`L${likelihood}×I${impact}=${
                        likelihood * impact
                      }`}
                    >
                      {items.map(risk => (
                        <div
                          key={risk.id}
                          className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-mono text-white"
                          title={risk.title}
                        >
                          {risk.risk_number}
                        </div>
                      ))}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex mt-1">
              {['', '1', '2', '3', '4', '5'].map((value, index) =>
                index === 0 ? null : (
                  <div
                    key={value}
                    className="flex-1 text-center text-[9px] text-[#6e7d8c]"
                  >
                    {value}
                  </div>
                )
              )}
            </div>

            <div className="text-center text-[9px] font-mono text-[#6e7d8c] uppercase tracking-widest mt-0.5">
              Impact →
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-3 justify-center">
          {[
            { label: 'Low (1–4)', color: 'bg-emerald-500/30' },
            { label: 'Medium (5–9)', color: 'bg-amber-500/30' },
            { label: 'High (10–14)', color: 'bg-orange-500/30' },
            { label: 'Critical (15–25)', color: 'bg-red-500/30' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${item.color}`} />
              <span className="text-[9px] text-[#6e7d8c]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RiskPage() {
  const { data: risks = [], isLoading } = useRisks()
  const role = useMembershipStore(state => state.role)
  const canEdit = canEditRisk(role)

  const [modal, setModal] = useState<Risk | null | 'new'>(null)
  const [catFilter, setCatFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [view, setView] = useState<'list' | 'matrix'>('list')

  const filtered = risks.filter(risk => {
    if (catFilter && risk.category !== catFilter) return false
    if (statFilter && risk.status !== statFilter) return false
    return true
  })

  const open = risks.filter(risk => risk.status === 'Open').length

  const high = risks.filter(
    risk => risk.status === 'Open' && (risk.risk_score || 0) >= 12
  ).length

  const mitigated = risks.filter(
    risk => risk.status === 'Mitigated'
  ).length

  const closed = risks.filter(risk => risk.status === 'Closed').length

  const catColor = (category: string) => {
    const map: Record<string, string> = {
      Procurement: 'badge-amber',
      Programme: 'badge-blue',
      Design: 'badge-muted',
      Financial: 'badge-red',
      Safety: 'badge-red',
      External: 'badge-muted',
      Contractor: 'badge-amber',
    }

    return map[category] || 'badge-muted'
  }

  const statBadge = (status: string) => {
    if (status === 'Open') return 'badge-red'
    if (status === 'Mitigated') return 'badge-amber'
    if (status === 'Closed') return 'badge-green'
    return 'badge-muted'
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          Risk Register View Only — you can view risks, but you cannot add,
          edit, mitigate, transfer, or close risk records.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Open Risks',
            value: open,
            color: open > 0 ? 'text-red-400' : 'text-emerald-400',
          },
          {
            label: 'High / Critical',
            value: high,
            color: high > 0 ? 'text-red-400' : 'text-emerald-400',
          },
          {
            label: 'Mitigated',
            value: mitigated,
            color: 'text-amber-400',
          },
          {
            label: 'Closed',
            value: closed,
            color: 'text-emerald-400',
          },
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
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {(['list', 'matrix'] as const).map(value => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                view === value
                  ? 'bg-[#c49e48] text-[#0c1014]'
                  : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'
              }`}
            >
              {value === 'list' ? 'List' : 'Matrix'}
            </button>
          ))}
        </div>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={catFilter}
          onChange={event => setCatFilter(event.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(category => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statFilter}
          onChange={event => setStatFilter(event.target.value)}
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
            Add Risk
          </button>
        )}
      </div>

      {view === 'matrix' && <RiskMatrix risks={risks} />}

      {view === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Risk</th>
                  <th>Category</th>
                  <th>L</th>
                  <th>I</th>
                  <th>Score</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th className="hide-mobile">Review</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-[#6e7d8c]">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  filtered.map(risk => {
                    const score =
                      risk.risk_score || risk.likelihood * risk.impact

                    const level = riskLevel(score)

                    return (
                      <tr
                        key={risk.id}
                        className={risk.status === 'Closed' ? 'opacity-40' : ''}
                      >
                        <td className="font-mono text-[10px] text-[#6e7d8c]">
                          R{risk.risk_number}
                        </td>

                        <td className="max-w-[200px]">
                          <div className="text-[12px] text-[#ede8de] font-medium truncate">
                            {risk.title}
                          </div>

                          {risk.mitigation_action && (
                            <div className="text-[10px] text-[#6e7d8c] truncate">
                              {risk.mitigation_action.slice(0, 60)}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${catColor(risk.category || '')}`}>
                            {risk.category}
                          </span>
                        </td>

                        <td className="font-mono text-center">
                          {risk.likelihood}
                        </td>

                        <td className="font-mono text-center">
                          {risk.impact}
                        </td>

                        <td className="font-mono font-bold text-center text-[14px] text-[#ede8de]">
                          {score}
                        </td>

                        <td>
                          <span className={`badge ${level.color}`}>
                            {level.label}
                          </span>
                        </td>

                        <td>
                          <span className={`badge ${statBadge(risk.status)}`}>
                            {risk.status}
                          </span>
                        </td>

                        <td className="hide-mobile">
                          {fdate(risk.review_date)}
                        </td>

                        <td>
                          {canEdit ? (
                            <button
                              className="tbl-action"
                              onClick={() => setModal(risk)}
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

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-[#6e7d8c]">
                      {risks.length === 0
                        ? 'No risks logged yet.'
                        : 'No risks match filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== null && canEdit && (
        <RiskModal
          item={modal === 'new' ? null : (modal as Risk)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

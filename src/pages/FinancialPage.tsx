import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { logAudit } from '@/lib/audit'
import { canManageFinancials } from '@/lib/permissions'
import { useState } from 'react'
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  useFinancial,
  useUpsertFinancial,
} from '@/hooks/useData'
import { formatCurrency, fdate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { FinancialItem } from '@/types'

const TYPES = [
  'Contract Sum',
  'Variation',
  'Provisional Sum',
  'Contingency',
  'PC Sum',
  'Payment',
  'Retention',
]

const STATUSES = [
  'Pending',
  'Submitted',
  'Approved',
  'Rejected',
  'Certified',
  'Paid',
]

export default function FinancialPage() {
  const { data: items = [], isLoading } = useFinancial()
  const upsert = useUpsertFinancial()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const canEdit = canManageFinancials(role)

  const [modal, setModal] = useState<FinancialItem | null | 'new'>(null)

  const [form, setForm] = useState({
    type: 'Variation' as FinancialItem['type'],
    reference: '',
    description: '',
    amount: 0,
    currency: 'NGN',
    direction: 'Addition' as FinancialItem['direction'],
    status: 'Pending' as FinancialItem['status'],
    submitted_date: '',
    notes: '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({ ...current, [key]: value }))

  function openEdit(item: FinancialItem) {
    if (!canEdit) return

    setForm({
      type: item.type,
      reference: item.reference || '',
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      direction: item.direction,
      status: item.status,
      submitted_date: item.submitted_date || '',
      notes: item.notes || '',
    })

    setModal(item)
  }

  function openNew() {
    if (!canEdit) return

    setForm({
      type: 'Variation',
      reference: '',
      description: '',
      amount: 0,
      currency: 'NGN',
      direction: 'Addition',
      status: 'Pending',
      submitted_date: '',
      notes: '',
    })

    setModal('new')
  }

  async function save() {
    if (!canEdit) return

    const id = modal !== 'new' ? (modal as FinancialItem).id : undefined

    await upsert.mutateAsync({
      id,
      ...form,
      submitted_by: user?.id,
    })

    await logAudit(
      user,
      modal === 'new' ? 'CREATE' : 'UPDATE',
      'Financial',
      id || 'new',
      `${form.type}: ${form.description}`
    )

    setModal(null)
  }

  const contractSum = items
    .filter(item => item.type === 'Contract Sum')
    .reduce((sum, item) => sum + item.amount, 0)

  const approvedVars = items.filter(
    item => item.type === 'Variation' && item.status === 'Approved'
  )

  const variationsNet = approvedVars.reduce(
    (sum, item) =>
      sum + (item.direction === 'Addition' ? item.amount : -item.amount),
    0
  )

  const certifiedAmt = items
    .filter(item => item.type === 'Payment' && item.status === 'Certified')
    .reduce((sum, item) => sum + item.amount, 0)

  const paidAmt = items
    .filter(item => item.type === 'Payment' && item.status === 'Paid')
    .reduce((sum, item) => sum + item.amount, 0)

  const retentionAmt = items
    .filter(item => item.type === 'Retention')
    .reduce((sum, item) => sum + item.amount, 0)

  const revised = contractSum + variationsNet

  const pendingVariationExposure = items
    .filter(item => item.type === 'Variation' && item.status === 'Pending')
    .reduce((sum, item) => {
      return sum + (item.direction === 'Addition' ? item.amount : -item.amount)
    }, 0)

  const projectedFinalContractSum = revised + pendingVariationExposure

  const costOverrunPct =
    contractSum > 0
      ? ((projectedFinalContractSum - contractSum) / contractSum) * 100
      : 0

  const finalAccountForecast = projectedFinalContractSum - paidAmt

  const paymentProgressPct =
    projectedFinalContractSum > 0
      ? (paidAmt / projectedFinalContractSum) * 100
      : 0

  const chartData = [
    { name: 'Contract', value: contractSum, color: '#c49e48' },
    {
      name: 'Variations',
      value: variationsNet,
      color: variationsNet >= 0 ? '#3fad78' : '#e05252',
    },
    { name: 'Revised', value: revised, color: '#4599d4' },
    { name: 'Certified', value: certifiedAmt, color: '#9b7fd4' },
    { name: 'Paid', value: paidAmt, color: '#3fad78' },
  ]

  function typeColor(type: string) {
    switch (type) {
      case 'Contract Sum':
        return 'badge-gold'
      case 'Variation':
        return 'badge-blue'
      case 'Payment':
        return 'badge-green'
      case 'Retention':
        return 'badge-amber'
      default:
        return 'badge-muted'
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          View Only Mode — you can view financial information, but you cannot
          add, edit, certify, approve, or update financial records.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Contract Sum',
            value: contractSum,
            color: 'text-[#c49e48]',
          },
          {
            label: 'Revised Contract',
            value: revised,
            color: 'text-blue-400',
          },
          {
            label: 'Projected Final Sum',
            value: projectedFinalContractSum,
            color:
              projectedFinalContractSum > contractSum
                ? 'text-amber-400'
                : 'text-emerald-400',
          },
          {
            label: 'Cost Overrun %',
            value: `${costOverrunPct.toFixed(1)}%`,
            color:
              costOverrunPct > 10
                ? 'text-red-400'
                : costOverrunPct > 0
                ? 'text-amber-400'
                : 'text-emerald-400',
          },
          {
            label: 'Final Account Forecast',
            value: finalAccountForecast,
            color: 'text-purple-400',
          },
          {
            label: 'Paid %',
            value: `${paymentProgressPct.toFixed(1)}%`,
            color:
              paymentProgressPct >= 100
                ? 'text-emerald-400'
                : paymentProgressPct >= 70
                ? 'text-blue-400'
                : paymentProgressPct >= 40
                ? 'text-amber-400'
                : 'text-red-400',
          },
          {
            label: 'Retention Held',
            value: retentionAmt,
            color: 'text-[#6e7d8c]',
          },
        ].map(summary => (
          <div key={summary.label} className="card p-3">
            <div className={`font-display text-xl font-bold ${summary.color}`}>
              {typeof summary.value === 'string'
                ? summary.value
                : summary.value === 0
                ? 'TBC'
                : formatCurrency(summary.value)}
            </div>

            <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">
              {summary.label}
            </div>
          </div>
        ))}
      </div>

      {contractSum > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Financial Position</div>
          </div>

          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6e7d8c' }} />

                <YAxis
                  tick={{ fontSize: 10, fill: '#6e7d8c' }}
                  tickFormatter={value =>
                    value >= 1e9
                      ? `₦${(value / 1e9).toFixed(1)}B`
                      : value >= 1e6
                      ? `₦${(value / 1e6).toFixed(0)}M`
                      : `₦${value}`
                  }
                />

                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: '#1c2a36',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    color: '#ede8de',
                    fontSize: 12,
                  }}
                />

                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="font-display text-[16px] font-semibold text-[#ede8de]">
          Financial Register
        </div>

        {canEdit && (
          <button className="btn-gold btn-sm btn" onClick={openNew}>
            <Plus size={13} />
            Add Item
          </button>
        )}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Type</th>
                <th>Description</th>
                <th>Direction</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[#6e7d8c]">
                    Loading…
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono text-[10px] text-[#6e7d8c]">
                      {item.reference || '—'}
                    </td>

                    <td>
                      <span className={`badge ${typeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </td>

                    <td className="text-[#ede8de] max-w-[200px] truncate">
                      {item.description}
                    </td>

                    <td>
                      {item.direction === 'Addition' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <TrendingUp size={11} />
                          Add
                        </span>
                      ) : item.direction === 'Omission' ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <TrendingDown size={11} />
                          Omit
                        </span>
                      ) : (
                        <span className="text-[#6e7d8c]">—</span>
                      )}
                    </td>

                    <td className="font-mono font-medium text-[#ede8de]">
                      {item.amount === 0
                        ? 'TBC'
                        : formatCurrency(item.amount, item.currency)}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          item.status === 'Approved' || item.status === 'Paid'
                            ? 'badge-green'
                            : item.status === 'Certified'
                            ? 'badge-blue'
                            : item.status === 'Rejected'
                            ? 'badge-red'
                            : 'badge-muted'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>{fdate(item.submitted_date)}</td>

                    <td>
                      {canEdit ? (
                        <button
                          className="tbl-action"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-[#6e7d8c] text-[11px]">
                          View
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && canEdit && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="gold-bar" />

            <div className="modal-head">
              <div className="modal-title">
                {modal === 'new' ? 'New Financial Item' : 'Edit Item'}
              </div>

              <button
                onClick={() => setModal(null)}
                className="text-[#6e7d8c] hover:text-[#ede8de]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-control"
                    value={form.type}
                    onChange={event => set('type', event.target.value)}
                  >
                    {TYPES.map(type => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Reference</label>
                  <input
                    className="form-control"
                    value={form.reference}
                    onChange={event => set('reference', event.target.value)}
                    placeholder="e.g. VO-001"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Description</label>
                <input
                  className="form-control"
                  value={form.description}
                  onChange={event => set('description', event.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Amount (₦)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.amount}
                    onChange={event => set('amount', +event.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Direction</label>
                  <select
                    className="form-control"
                    value={form.direction}
                    onChange={event => set('direction', event.target.value)}
                  >
                    <option>Addition</option>
                    <option>Omission</option>
                    <option>N/A</option>
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

              <div>
                <label className="form-label">Date Submitted</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.submitted_date}
                  onChange={event => set('submitted_date', event.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={event => set('notes', event.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
              <button
                className="btn-ghost btn-sm btn"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>

              <button
                className="btn-gold btn-sm btn"
                onClick={save}
                disabled={upsert.isPending}
              >
                {upsert.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

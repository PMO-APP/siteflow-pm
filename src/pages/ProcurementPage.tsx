import { useMembershipStore } from '@/store/membership'
import { canEditProcurement } from '@/lib/permissions'
import { useState } from 'react'
import { Plus, X, Search } from 'lucide-react'
import {
  useProcurement,
  useUpsertProcurement,
} from '@/hooks/useData'
import { fdate, urgencyColor } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { ProcurementItem } from '@/types'
import { CommandHero } from '@/components/ui/command/CommandPrimitives'

const CATS = [
  'Tiles',
  'Doors & Windows',
  'Specialist',
  'Timber',
  'MEP',
  'ELV',
  'Roofing',
  'External',
  'Interior',
  'Sanitary',
  'Other',
]

const STATUSES: ProcurementItem['status'][] = [
  'Pending',
  'RFQ Sent',
  'PO Raised',
  'Ordered',
  'In Transit',
  'Customs',
  'Delivered',
  'Rejected',
]

function ProcModal({
  item,
  onClose,
}: {
  item: ProcurementItem | null
  onClose: () => void
}) {
  const upsert = useUpsertProcurement()

  const [form, setForm] = useState({
    name: item?.name || '',
    specification: item?.specification || '',
    category: item?.category || 'Tiles',
    quantity: item?.quantity || 0,
    unit: item?.unit || '',
    unit_cost: item?.unit_cost || 0,
    currency: item?.currency || 'NGN',
    vendor: item?.vendor || '',
    vendor_contact: item?.vendor_contact || '',
    vendor_email: item?.vendor_email || '',
    order_by_date: item?.order_by_date || '',
    required_on_site: item?.required_on_site || '',
    lead_time_days: item?.lead_time_days || 0,
    is_imported: item?.is_imported || false,
    customs_clearance_days: item?.customs_clearance_days || 0,
    status: item?.status || 'Pending',
    po_number: item?.po_number || '',
    po_date: item?.po_date || '',
    delivery_date: item?.delivery_date || '',
    notes: item?.notes || '',
  })

  const isEditMode = !!item

  const set = (key: string, value: any) => {
    setForm(prev => {
      const next = {
        ...prev,
        [key]: value,
      }

      if (key === 'status' && value === 'Delivered' && !next.delivery_date) {
        next.delivery_date = new Date().toISOString().slice(0, 10)
      }

      return next
    })
  }

  const cleanDate = (value: string) =>
    value && value.trim() !== '' ? value : null

  async function save() {
    if (!isEditMode && !form.name.trim()) return

    if (isEditMode) {
      await upsert.mutateAsync({
        id: item.id,
        status: form.status,
        vendor: form.vendor || null,
        vendor_contact: form.vendor_contact || null,
        vendor_email: form.vendor_email || null,
        po_number: form.po_number || null,
        po_date: cleanDate(form.po_date),
        delivery_date: cleanDate(form.delivery_date),
        notes: form.notes || null,
      } as any)
    } else {
      await upsert.mutateAsync({
        name: form.name.trim(),
        specification: form.specification || null,
        category: form.category,
        quantity: Number(form.quantity || 0),
        unit: form.unit || null,
        unit_cost: Number(form.unit_cost || 0),
        currency: form.currency || 'NGN',
        vendor: form.vendor || null,
        vendor_contact: form.vendor_contact || null,
        vendor_email: form.vendor_email || null,
        order_by_date: cleanDate(form.order_by_date),
        required_on_site: cleanDate(form.required_on_site),
        lead_time_days: Number(form.lead_time_days || 0),
        is_imported: form.is_imported,
        customs_clearance_days: Number(form.customs_clearance_days || 0),
        status: form.status,
        po_number: form.po_number || null,
        po_date: cleanDate(form.po_date),
        delivery_date: cleanDate(form.delivery_date),
        notes: form.notes || null,
      } as any)
    }

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
        className="modal max-w-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {isEditMode ? 'Update Procurement Item' : 'New Procurement Item'}
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
              { label: 'Item', value: item.name },
              { label: 'Category', value: item.category },
              { label: 'Order By', value: fdate(item.order_by_date) },
              {
                label: 'Required On Site',
                value: fdate(item.required_on_site),
              },
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

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {!isEditMode && (
            <>
              <div>
                <label className="form-label">Item Name *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={event => set('name', event.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Specification</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.specification}
                  onChange={event => set('specification', event.target.value)}
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
                    {CATS.map(category => (
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.quantity}
                    onChange={event =>
                      set('quantity', Number(event.target.value))
                    }
                  />
                </div>

                <div>
                  <label className="form-label">Unit</label>
                  <input
                    className="form-control"
                    value={form.unit}
                    onChange={event => set('unit', event.target.value)}
                    placeholder="m², nr, set…"
                  />
                </div>

                <div>
                  <label className="form-label">Unit Cost (₦)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.unit_cost}
                    onChange={event =>
                      set('unit_cost', Number(event.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Order By Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.order_by_date}
                    onChange={event => set('order_by_date', event.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Required On Site</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.required_on_site}
                    onChange={event =>
                      set('required_on_site', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Lead Time (days)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.lead_time_days}
                    onChange={event =>
                      set('lead_time_days', Number(event.target.value))
                    }
                  />
                </div>

                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    id="imported-item"
                    checked={form.is_imported}
                    onChange={event =>
                      set('is_imported', event.target.checked)
                    }
                    className="accent-[#c49e48]"
                  />

                  <label
                    htmlFor="imported-item"
                    className="text-[12px] text-[#bfb9ae]"
                  >
                    Imported item
                  </label>
                </div>
              </div>
            </>
          )}

          {isEditMode && (
            <div>
              <label className="form-label">Procurement Item</label>
              <div className="form-control bg-[#111820] border-white/[0.04] text-[#bfb9ae]">
                {item.name}
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Vendor</label>
              <input
                className="form-control"
                value={form.vendor}
                onChange={event => set('vendor', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Contact</label>
              <input
                className="form-control"
                value={form.vendor_contact}
                onChange={event => set('vendor_contact', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.vendor_email}
                onChange={event => set('vendor_email', event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">PO Number</label>
              <input
                className="form-control"
                value={form.po_number}
                onChange={event => set('po_number', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">PO Date</label>
              <input
                type="date"
                className="form-control"
                value={form.po_date}
                onChange={event => set('po_date', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Delivery Date</label>
              <input
                type="date"
                className="form-control"
                value={form.delivery_date}
                onChange={event => set('delivery_date', event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Notes / Update</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.notes}
              onChange={event => set('notes', event.target.value)}
              placeholder="Add latest procurement update, vendor response, delay reason, or delivery note…"
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
              : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProcurementPage() {
  const { data: items = [], isLoading } = useProcurement()
  const role = useMembershipStore(state => state.role)
  const canEdit = canEditProcurement(role)

  const [modal, setModal] = useState<ProcurementItem | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const today = new Date()

  const cats = [...new Set(items.map(item => item.category).filter(Boolean))]

  const filtered = items.filter(item => {
    if (
      search &&
      !item.name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }

    if (catFilter && item.category !== catFilter) return false

    if (statFilter) {
      const days = item.order_by_date
        ? differenceInDays(new Date(item.order_by_date), today)
        : null

      const overdue =
        days !== null &&
        days < 0 &&
        item.status !== 'Delivered'

      const urgent =
        days !== null &&
        days >= 0 &&
        days <= 14 &&
        item.status !== 'Delivered' &&
        item.status !== 'Ordered'

      if (statFilter === 'OVERDUE' && !overdue) return false
      if (statFilter === 'URGENT' && !urgent) return false
      if (statFilter === 'OK' && (overdue || urgent)) return false
    }

    return true
  })

  const overdue = items.filter(item => {
    const days = item.order_by_date
      ? differenceInDays(new Date(item.order_by_date), today)
      : null

    return (
      days !== null &&
      days < 0 &&
      item.status !== 'Delivered' &&
      item.status !== 'Ordered'
    )
  }).length

  const urgent = items.filter(item => {
    const days = item.order_by_date
      ? differenceInDays(new Date(item.order_by_date), today)
      : null

    return (
      days !== null &&
      days >= 0 &&
      days <= 7 &&
      item.status !== 'Delivered' &&
      item.status !== 'Ordered'
    )
  }).length

  const delivered = items.filter(item => item.status === 'Delivered').length

  return (
    <div className="pmx-command-page space-y-5">
      <CommandHero
        eyebrow="Procurement control"
        title="Procurement Control Centre"
        description="Control long-lead items, supplier commitments, order deadlines and site delivery readiness from one operational workspace."
      />

      {!canEdit && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          Procurement Register View Only — you can view procurement records,
          but you cannot add, edit, or update procurement items.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Items',
            value: items.length,
            color: 'text-[#c49e48]',
          },
          {
            label: 'Overdue',
            value: overdue,
            color: overdue > 0 ? 'text-red-400' : 'text-emerald-400',
          },
          {
            label: 'Urgent (<7d)',
            value: urgent,
            color: urgent > 0 ? 'text-amber-400' : 'text-emerald-400',
          },
          {
            label: 'Delivered',
            value: delivered,
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
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-7 text-[12px] py-1.5"
            placeholder="Search items…"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={catFilter}
          onChange={event => setCatFilter(event.target.value)}
        >
          <option value="">All Categories</option>

          {cats.map(category => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statFilter}
          onChange={event => setStatFilter(event.target.value)}
        >
          <option value="">All</option>
          <option value="OVERDUE">🔴 Overdue</option>
          <option value="URGENT">🟡 Urgent</option>
          <option value="OK">🟢 On Track</option>
        </select>

        {canEdit && (
          <button
            className="btn-gold btn-sm btn ml-auto"
            onClick={() => setModal('new')}
          >
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
                <th>Item</th>
                <th className="hide-mobile">Spec</th>
                <th>Category</th>
                <th>Order By</th>
                <th className="hide-mobile">Required On Site</th>
                <th className="hide-mobile">Lead</th>
                <th>Status</th>
                <th className="hide-mobile">Vendor</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-[#6e7d8c]">
                    Loading…
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const days = item.order_by_date
                    ? differenceInDays(new Date(item.order_by_date), today)
                    : null

                  const overdue =
                    days !== null &&
                    days < 0 &&
                    item.status !== 'Delivered' &&
                    item.status !== 'Ordered'

                  const urgent =
                    days !== null &&
                    days >= 0 &&
                    days <= 7 &&
                    item.status !== 'Delivered' &&
                    item.status !== 'Ordered'

                  let statusBadge = (
                    <span className="badge badge-muted">{item.status}</span>
                  )

                  if (item.status === 'Delivered') {
                    statusBadge = (
                      <span className="badge badge-green">Delivered</span>
                    )
                  } else if (
                    item.status === 'Ordered' ||
                    item.status === 'In Transit'
                  ) {
                    statusBadge = (
                      <span className="badge badge-blue">{item.status}</span>
                    )
                  } else if (overdue) {
                    statusBadge = (
                      <span className="badge badge-red">OVERDUE</span>
                    )
                  } else if (urgent) {
                    statusBadge = (
                      <span className="badge badge-amber">URGENT</span>
                    )
                  }

                  return (
                    <tr
                      key={item.id}
                      className={overdue ? 'bg-red-500/[0.03]' : ''}
                    >
                      <td className="font-medium text-[#ede8de] max-w-[180px]">
                        {item.name}

                        {item.is_imported && (
                          <span className="ml-1 text-[9px] badge badge-blue">
                            IMPORT
                          </span>
                        )}
                      </td>

                      <td className="hide-mobile text-[11px] text-[#6e7d8c] max-w-[160px] truncate">
                        {item.specification || '—'}
                      </td>

                      <td>
                        <span className="text-[10px] font-mono text-[#6e7d8c] bg-[#1c2a36] px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      </td>

                      <td className={`font-mono text-[11px] ${urgencyColor(days)}`}>
                        {item.order_by_date ? (
                          <>
                            {fdate(item.order_by_date)}
                            {days !== null && (
                              <span className="text-[9px] ml-1">
                                {days < 0
                                  ? `(${Math.abs(days)}d ago)`
                                  : `(${days}d)`}
                              </span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="hide-mobile">
                        {fdate(item.required_on_site)}
                      </td>

                      <td className="hide-mobile">
                        {item.lead_time_days
                          ? `${item.lead_time_days}d`
                          : '—'}
                      </td>

                      <td>{statusBadge}</td>

                      <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                        {item.vendor || '—'}
                      </td>

                      <td>
                        {canEdit ? (
                          <button
                            className="tbl-action"
                            onClick={() => setModal(item)}
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
                  <td colSpan={9} className="text-center py-8 text-[#6e7d8c]">
                    {items.length === 0
                      ? 'No procurement items logged yet.'
                      : 'No procurement items match filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && canEdit && (
        <ProcModal
          item={modal === 'new' ? null : (modal as ProcurementItem)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

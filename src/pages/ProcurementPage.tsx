import { useState } from 'react'
import { Plus, X, Search, AlertTriangle, Package } from 'lucide-react'
import { useProcurement, useUpsertProcurement, useDeleteProcurement } from '@/hooks/useData'
import { fdate, urgencyColor } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { ProcurementItem } from '@/types'

const CATS = ['Tiles','Doors & Windows','Specialist','Timber','MEP','ELV','Roofing','External','Interior','Sanitary','Other']
const STATUSES: ProcurementItem['status'][] = ['Pending','RFQ Sent','PO Raised','Ordered','In Transit','Customs','Delivered','Rejected']

function ProcModal({ item, onClose }: { item: ProcurementItem | null; onClose: () => void }) {
  const upsert = useUpsertProcurement()
  const [form, setForm] = useState({
    name: item?.name || '', specification: item?.specification || '',
    category: item?.category || 'Tiles', quantity: item?.quantity || 0,
    unit: item?.unit || '', unit_cost: item?.unit_cost || 0, currency: item?.currency || 'NGN',
    vendor: item?.vendor || '', vendor_contact: item?.vendor_contact || '', vendor_email: item?.vendor_email || '',
    order_by_date: item?.order_by_date || '', required_on_site: item?.required_on_site || '',
    lead_time_days: item?.lead_time_days || 0, is_imported: item?.is_imported || false,
    customs_clearance_days: item?.customs_clearance_days || 0,
    status: item?.status || 'Pending', po_number: item?.po_number || '',
    po_date: item?.po_date || '', delivery_date: item?.delivery_date || '', notes: item?.notes || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => { await upsert.mutateAsync({ id: item?.id, ...form }); onClose() }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />
        <div className="modal-head">
          <div className="modal-title">{item ? 'Edit Item' : 'New Procurement Item'}</div>
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div><label className="form-label">Item Name *</label><input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label className="form-label">Specification</label><textarea className="form-control" rows={2} value={form.specification} onChange={e => set('specification', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Category</label><select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="form-label">Status</label><select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="form-label">Quantity</label><input type="number" className="form-control" value={form.quantity} onChange={e => set('quantity', +e.target.value)} /></div>
            <div><label className="form-label">Unit</label><input className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="m², nr, set…" /></div>
            <div><label className="form-label">Unit Cost (₦)</label><input type="number" className="form-control" value={form.unit_cost} onChange={e => set('unit_cost', +e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Order By Date</label><input type="date" className="form-control" value={form.order_by_date} onChange={e => set('order_by_date', e.target.value)} /></div>
            <div><label className="form-label">Required on Site</label><input type="date" className="form-control" value={form.required_on_site} onChange={e => set('required_on_site', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Lead Time (days)</label><input type="number" className="form-control" value={form.lead_time_days} onChange={e => set('lead_time_days', +e.target.value)} /></div>
            <div className="flex items-center gap-2 mt-5"><input type="checkbox" id="imp" checked={form.is_imported} onChange={e => set('is_imported', e.target.checked)} className="accent-[#c49e48]" /><label htmlFor="imp" className="text-[12px] text-[#bfb9ae]">Imported item</label></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="form-label">Vendor</label><input className="form-control" value={form.vendor} onChange={e => set('vendor', e.target.value)} /></div>
            <div><label className="form-label">Contact</label><input className="form-control" value={form.vendor_contact} onChange={e => set('vendor_contact', e.target.value)} /></div>
            <div><label className="form-label">Email</label><input type="email" className="form-control" value={form.vendor_email} onChange={e => set('vendor_email', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">PO Number</label><input className="form-control" value={form.po_number} onChange={e => set('po_number', e.target.value)} /></div>
            <div><label className="form-label">PO Date</label><input type="date" className="form-control" value={form.po_date} onChange={e => set('po_date', e.target.value)} /></div>
          </div>
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

export default function ProcurementPage() {
  const { data: items = [], isLoading } = useProcurement()
  const [modal, setModal] = useState<ProcurementItem | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const today = new Date()

  const cats = [...new Set(items.map(i => i.category).filter(Boolean))]

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && i.category !== catFilter) return false
    if (statFilter) {
      const d = i.order_by_date ? differenceInDays(new Date(i.order_by_date), today) : null
      const od = d !== null && d < 0 && i.status !== 'Delivered'
      const ur = d !== null && d >= 0 && d <= 14 && i.status !== 'Delivered' && i.status !== 'Ordered'
      if (statFilter === 'OVERDUE' && !od) return false
      if (statFilter === 'URGENT' && !ur) return false
      if (statFilter === 'OK' && (od || ur)) return false
    }
    return true
  })

  const overdue = items.filter(i => { const d = i.order_by_date ? differenceInDays(new Date(i.order_by_date), today) : null; return d !== null && d < 0 && i.status !== 'Delivered' }).length
  const urgent = items.filter(i => { const d = i.order_by_date ? differenceInDays(new Date(i.order_by_date), today) : null; return d !== null && d >= 0 && d <= 7 && i.status !== 'Delivered' && i.status !== 'Ordered' }).length
  const delivered = items.filter(i => i.status === 'Delivered').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: items.length, color: 'text-[#c49e48]' },
          { label: 'Overdue', value: overdue, color: overdue > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Urgent (<7d)', value: urgent, color: urgent > 0 ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Delivered', value: delivered, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="card p-3"><div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div><div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">{s.label}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]" />
          <input className="form-control pl-7 text-[12px] py-1.5" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control text-[12px] py-1.5 w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-control text-[12px] py-1.5 w-auto" value={statFilter} onChange={e => setStatFilter(e.target.value)}>
          <option value="">All</option>
          <option value="OVERDUE">🔴 Overdue</option>
          <option value="URGENT">🟡 Urgent</option>
          <option value="OK">🟢 On Track</option>
        </select>
        <button className="btn-gold btn-sm btn ml-auto" onClick={() => setModal('new')}><Plus size={13} /> Add Item</button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Item</th><th className="hide-mobile">Spec</th><th>Category</th><th>Order By</th><th className="hide-mobile">Required On Site</th><th className="hide-mobile">Lead</th><th>Status</th><th className="hide-mobile">Vendor</th><th></th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={9} className="text-center py-6 text-[#6e7d8c]">Loading…</td></tr>
                : filtered.map(item => {
                const d = item.order_by_date ? differenceInDays(new Date(item.order_by_date), today) : null
                const od = d !== null && d < 0 && item.status !== 'Delivered' && item.status !== 'Ordered'
                const ur = d !== null && d >= 0 && d <= 7 && item.status !== 'Delivered' && item.status !== 'Ordered'
                let sb = <span className="badge badge-muted">{item.status}</span>
                if (item.status === 'Delivered') sb = <span className="badge badge-green">Delivered</span>
                else if (item.status === 'Ordered' || item.status === 'In Transit') sb = <span className="badge badge-blue">{item.status}</span>
                else if (od) sb = <span className="badge badge-red">OVERDUE</span>
                else if (ur) sb = <span className="badge badge-amber">URGENT</span>
                return (
                  <tr key={item.id} className={od ? 'bg-red-500/[0.03]' : ''}>
                    <td className="font-medium text-[#ede8de] max-w-[180px]">{item.name}{item.is_imported && <span className="ml-1 text-[9px] badge badge-blue">IMPORT</span>}</td>
                    <td className="hide-mobile text-[11px] text-[#6e7d8c] max-w-[160px] truncate">{item.specification || '—'}</td>
                    <td><span className="text-[10px] font-mono text-[#6e7d8c] bg-[#1c2a36] px-2 py-0.5 rounded">{item.category}</span></td>
                    <td className={`font-mono text-[11px] ${urgencyColor(d)}`}>{item.order_by_date ? <>{fdate(item.order_by_date)}{d !== null && <span className="text-[9px] ml-1">({d < 0 ? Math.abs(d)+'d ago' : d+'d'})</span>}</> : '—'}</td>
                    <td className="hide-mobile">{fdate(item.required_on_site)}</td>
                    <td className="hide-mobile">{item.lead_time_days ? `${item.lead_time_days}d` : '—'}</td>
                    <td>{sb}</td>
                    <td className="hide-mobile text-[11px] text-[#6e7d8c]">{item.vendor || '—'}</td>
                    <td><button className="tbl-action" onClick={() => setModal(item)}>Edit</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <ProcModal item={modal === 'new' ? null : modal as ProcurementItem} onClose={() => setModal(null)} />}
    </div>
  )
}

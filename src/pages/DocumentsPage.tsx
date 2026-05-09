import { useProjectStore } from '@/store/project'
import { logAudit } from '@/lib/audit'
import { getRole } from '@/lib/access'
import { canEditPage } from '@/lib/permissions'
import { useState } from 'react'
import { Plus, X, Search, Upload, FileText, Download, ExternalLink } from 'lucide-react'
import { useDocuments, useUpsertDocument } from '@/hooks/useData'
import { uploadFile } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'
import type { Document } from '@/types'

const TYPES: Document['type'][] = ['Drawing', 'Specification', 'BOQ', 'Contract', 'RFI', 'Method Statement', 'Submittal', 'Report', 'Other']
const DISCIPLINES = ['Architectural', 'Structural', 'MEP', 'ELV', 'Landscape', 'General']
const STATUSES = ['Draft', 'For Review', 'Current', 'Superseded', 'Void']
const REVISIONS = ['A', 'B', 'C', 'D', 'E', 'P1', 'P2', 'P3', '1', '2', '3']

function DocModal({ item, onClose }: { item: Document | null; onClose: () => void }) {
  const upsert = useUpsertDocument()
  const { user } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: item?.title || '',
    document_number: item?.document_number || '',
    type: item?.type || 'Drawing' as Document['type'],
    discipline: item?.discipline || 'Architectural',
    revision: item?.revision || 'A',
    revision_date: item?.revision_date || new Date().toISOString().slice(0, 10),
    status: item?.status || 'Current',
    description: item?.description || '',
    issued_by: item?.issued_by || '',
    storage_path: item?.storage_path || '',
    public_url: item?.public_url || '',
    file_size_kb: item?.file_size_kb || 0,
    file_type: item?.file_type || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0]

  if (!file) return

  setUploading(true)

  const result = await uploadFile(
    'documents',
    file,
    'docs'
  )

  if (result) {
    set('storage_path', result.path)
    set('public_url', result.publicUrl)
    set(
      'file_size_kb',
      Math.round(file.size / 1024)
    )
    set('file_type', file.type)

    await logAudit(
      user,
      'UPLOAD',
      'Documents',
      item?.id || 'new',
      `${form.title || file.name} Rev ${form.revision}`
    )
  }

  setUploading(false)
}

  const save = async () => {
  if (!form.title.trim()) return

  await upsert.mutateAsync({
    id: item?.id,
    ...form,
    uploaded_by: user?.id
  })

  await logAudit(
    user,
    item ? 'UPDATE' : 'CREATE',
    'Documents',
    item?.id || 'new',
    `${form.title} Rev ${form.revision}`
  )

  onClose()
}

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />
        <div className="modal-head">
          <div className="modal-title">{item ? 'Edit Document' : 'Register Document'}</div>
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="form-label">Title *</label><input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Document title…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Document Number</label><input className="form-control" value={form.document_number} onChange={e => set('document_number', e.target.value)} placeholder="e.g. A-100, S-201" /></div>
            <div><label className="form-label">Type</label><select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Discipline</label><select className="form-control" value={form.discipline} onChange={e => set('discipline', e.target.value)}>{DISCIPLINES.map(d => <option key={d}>{d}</option>)}</select></div>
            <div><label className="form-label">Status</label><select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Revision</label><select className="form-control" value={form.revision} onChange={e => set('revision', e.target.value)}>{REVISIONS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label className="form-label">Revision Date</label><input type="date" className="form-control" value={form.revision_date} onChange={e => set('revision_date', e.target.value)} /></div>
          </div>
          <div><label className="form-label">Issued By</label><input className="form-control" value={form.issued_by} onChange={e => set('issued_by', e.target.value)} placeholder="Architect / Engineer name…" /></div>
          <div><label className="form-label">Description / Notes</label><textarea className="form-control" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div>
            <label className="form-label">Upload File</label>
            <label className="btn-ghost btn-sm btn cursor-pointer w-full justify-center border-dashed">
              <Upload size={13} />
              {uploading ? 'Uploading…' : form.storage_path ? `File uploaded ✓` : 'Click to upload PDF / DWG / Image'}
              <input type="file" hidden onChange={handleFile} accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.docx,.xlsx" disabled={uploading} />
            </label>
            {form.file_size_kb > 0 && <div className="text-[10px] text-[#6e7d8c] mt-1">{form.file_size_kb} KB · {form.file_type}</div>}
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>Cancel</button>
          <button className="btn-gold btn-sm btn" onClick={save} disabled={upsert.isPending || uploading}>
            {upsert.isPending ? 'Saving…' : item ? 'Save Changes' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const { user } = useAuthStore()
const { projectOwnerEmail } = useProjectStore()

const role = getRole(user?.email)

const canEdit = canEditPage(
  role,
  'documents',
  user?.email,
  projectOwnerEmail
)
  const { data: docs = [], isLoading } = useDocuments()
  const [modal, setModal] = useState<Document | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [discFilter, setDiscFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !(d.document_number || '').toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && d.type !== typeFilter) return false
    if (discFilter && d.discipline !== discFilter) return false
    if (statFilter && d.status !== statFilter) return false
    return true
  })

  const byType = TYPES.reduce((acc, t) => {
    acc[t] = docs.filter(d => d.type === t).length
    return acc
  }, {} as Record<string, number>)

  const statBadge = (s: string) => {
    if (s === 'Current') return 'badge-green'
    if (s === 'For Review') return 'badge-amber'
    if (s === 'Draft') return 'badge-muted'
    if (s === 'Superseded') return 'badge badge-muted opacity-50'
    if (s === 'Void') return 'badge-red'
    return 'badge-muted'
  }

  const typeIcon = (t: string) => {
    if (t === 'Drawing') return '📐'
    if (t === 'RFI') return '❓'
    if (t === 'Report') return '📄'
    if (t === 'Contract') return '📜'
    return '📁'
  }

  return (
   <div className="space-y-4">
  {!canEdit && (
    <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
      Document Library View
    </div>
  )}
      {/* Breakdown chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byType).filter(([, v]) => v > 0).map(([type, count]) => (
          <button key={type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${typeFilter === type ? 'bg-[#c49e48] text-[#0c1014] border-[#c49e48]' : 'bg-[#1c2a36] text-[#bfb9ae] border-white/[0.08] hover:border-[#c49e48]/30'}`}
            onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
          >
            <span>{typeIcon(type)}</span> {type} <span className="font-mono">{count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]" />
          <input className="form-control pl-7 text-[12px] py-1.5" placeholder="Search title or number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control text-[12px] py-1.5 w-auto" value={discFilter} onChange={e => setDiscFilter(e.target.value)}>
          <option value="">All Disciplines</option>
          {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
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
    <Plus size={13} />
    Register Doc
  </button>
)}
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Doc No.</th><th>Title</th><th>Type</th>
                <th className="hide-mobile">Discipline</th>
                <th>Rev</th><th>Rev Date</th><th>Status</th>
                <th className="hide-mobile">Issued By</th>
                <th className="hide-mobile">Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-6 text-[#6e7d8c]">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-[#6e7d8c]">
                  {docs.length === 0 ? 'No documents registered. Add the first one above.' : 'No documents match filters.'}
                </td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className={d.status === 'Superseded' || d.status === 'Void' ? 'opacity-50' : ''}>
                  <td className="font-mono text-[10px] text-[#c49e48]">{d.document_number || '—'}</td>
                  <td className="font-medium text-[#ede8de] max-w-[200px] truncate" title={d.title}>{d.title}</td>
                  <td><span className="text-[9px]">{typeIcon(d.type)}</span> <span className="text-[10px] text-[#6e7d8c]">{d.type}</span></td>
                  <td className="hide-mobile"><span className="badge badge-muted">{d.discipline || '—'}</span></td>
                  <td className="font-mono text-[11px] text-[#6e7d8c]">Rev {d.revision}</td>
                  <td>{fdate(d.revision_date)}</td>
                  <td><span className={`badge ${statBadge(d.status)}`}>{d.status}</span></td>
                  <td className="hide-mobile text-[11px] text-[#6e7d8c]">{d.issued_by || '—'}</td>
                  <td className="hide-mobile text-[10px] font-mono text-[#6e7d8c]">{d.file_size_kb ? `${d.file_size_kb}KB` : '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      {d.public_url && (
                        <a href={d.public_url} target="_blank" rel="noreferrer" className="tbl-action" title="Download">
                          <Download size={10} />
                        </a>
                      )}
                      {canEdit ? (
  <button
    className="tbl-action"
    onClick={() => setModal(d)}
  >
    Edit
  </button>
) : (
  <span className="text-[#6e7d8c] text-[11px] px-2">
    View
  </span>
)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && canEdit && (
        <DocModal item={modal === 'new' ? null : modal as Document} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

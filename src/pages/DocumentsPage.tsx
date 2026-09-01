import { logAudit } from '@/lib/audit'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Search, Upload, Download } from 'lucide-react'
import { useDocuments, useUpsertDocument } from '@/hooks/useData'
import { uploadFile, backupFileToGoogleDrive } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'
import type { Document } from '@/types'
import DocumentRepository from '@/components/DocumentRepository'
import { useQuickActionRoute } from '@/hooks/useQuickActionRoute'
import { useAccessSession } from '@/access/AccessSessionProvider'

const TYPES: Document['type'][] = [
  'Drawing',
  'Specification',
  'BOQ',
  'Contract',
  'Programme / Schedule',
  'RFI',
  'Method Statement',
  'Submittal',
  'Report',
  'Payment Document',
  'HSE Document',
  'Quality Document',
  'Other',
] as any

const DISCIPLINES = [
  'Architectural',
  'Structural',
  'MEP',
  'ELV',
  'Landscape',
  'Infrastructure',
  'Housebuild',
  'Costing',
  'HSE',
  'Quality',
  'General',
]

const STATUSES = [
  'Draft',
  'Submitted',
  'For Review',
  'Pending Review',
  'Approved',
  'Current',
  'Superseded',
  'Rejected',
  'Void',
]

const ISSUED_FOR = [
  'Information',
  'Review',
  'Approval',
  'Construction',
  'Tender',
  'Coordination',
  'As Built',
]

const REVISIONS = ['A', 'B', 'C', 'D', 'E', 'P1', 'P2', 'P3', '1', '2', '3']

const INTERNAL_DISTRIBUTION_TEAMS = ['Housebuild', 'MEP', 'Infrastructure']

function getDocumentFolder(type: string, discipline?: string) {
  const cleanDiscipline = (discipline || 'general')
    .toLowerCase()
    .replace(/\s+/g, '-')

  if (type === 'Drawing') return `design-drawings/${cleanDiscipline}`
  if (type === 'Programme / Schedule') return 'programmes-and-schedules'
  if (type === 'Report') return 'reports'
  if (type === 'Contract') return 'contracts'
  if (type === 'Payment Document') return 'costing-documents/payments'
  if (type === 'BOQ') return 'costing-documents/boq'
  if (type === 'HSE Document') return 'hse-documents'
  if (type === 'Quality Document') return 'quality-documents'
  if (type === 'RFI') return 'rfis'
  if (type === 'Method Statement') return 'method-statements'
  if (type === 'Submittal') return 'submittals'
  if (type === 'Specification') return 'specifications'

  return `team-documents/${cleanDiscipline}`
}

function DocModal({
  item,
  onClose,
}: {
  item: Document | null
  onClose: () => void
}) {
  const upsert = useUpsertDocument()
  const { user } = useAuthStore()
  const { projectId, projectName } = useProjectStore()
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    title: item?.title || '',
    document_number: item?.document_number || '',
    type: item?.type || ('Drawing' as Document['type']),
    discipline: item?.discipline || 'Architectural',
    revision: item?.revision || 'A',
    revision_date:
      item?.revision_date || new Date().toISOString().slice(0, 10),
    status: item?.status || 'Submitted',
    description: item?.description || '',
    issued_by: item?.issued_by || '',
    storage_path: item?.storage_path || '',
    public_url: item?.public_url || '',
    file_size_kb: item?.file_size_kb || 0,
    file_type: item?.file_type || '',
    document_type: (item as any)?.document_type || item?.type || 'Drawing',
    consultant_name: (item as any)?.consultant_name || '',
    revision_no: (item as any)?.revision_no || item?.revision || 'A',
    approval_status: (item as any)?.approval_status || 'Submitted',
    review_status: (item as any)?.review_status || 'Pending Review',
    issued_for: (item as any)?.issued_for || 'Review',
    drawing_number:
      (item as any)?.drawing_number || item?.document_number || '',
    package_name: (item as any)?.package_name || '',
    google_drive_file_id: (item as any)?.google_drive_file_id || '',
    google_drive_url: (item as any)?.google_drive_url || '',
    google_drive_sync_status:
      (item as any)?.google_drive_sync_status || 'pending',
    google_drive_sync_error: (item as any)?.google_drive_sync_error || '',
    originator_name: (item as any)?.originator_name || (item as any)?.consultant_name || item?.issued_by || '',
    received_by_team: (item as any)?.received_by_team || 'Design',
    received_date: (item as any)?.received_date || item?.revision_date || new Date().toISOString().slice(0, 10),
    document_custodian: (item as any)?.document_custodian || 'Design',
    distribution_status: (item as any)?.distribution_status || 'Not distributed',
    distributed_to: Array.isArray((item as any)?.distributed_to) ? (item as any).distributed_to : [],
    distribution_date: (item as any)?.distribution_date ? String((item as any).distribution_date).slice(0, 10) : '',
    transmittal_reference: (item as any)?.transmittal_reference || '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({ ...current, [key]: value }))

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!projectId) {
      alert('No project selected.')
      return
    }

    try {
      setUploading(true)

      const folder = getDocumentFolder(form.type, form.discipline)

      const result = await uploadFile(
        'project-files',
        file,
        `projects/${projectId}/documents/${folder}`
      )

      if (!result) {
        alert('Upload failed. No file path returned.')
        return
      }

      set('storage_path', result.path)
      set('public_url', result.publicUrl)
      set('file_size_kb', Math.round(file.size / 1024))
      set('file_type', file.type || file.name.split('.').pop() || 'file')

      try {
        set('google_drive_sync_status', 'syncing')
        set('google_drive_sync_error', '')

        const driveResult = await backupFileToGoogleDrive({
          bucket: 'project-files',
          filePath: result.path,
          fileName: file.name,
          projectId,
          projectName,
          documentType: form.type,
          discipline: form.discipline,
          title: form.title || file.name,
        })

        set('google_drive_file_id', driveResult.googleDriveFileId)
        set('google_drive_url', driveResult.googleDriveUrl)
        set('google_drive_sync_status', 'synced')
      } catch (driveError: any) {
        set('google_drive_sync_status', 'failed')
        set(
          'google_drive_sync_error',
          driveError?.message || 'Google Drive backup failed'
        )
      }

      await logAudit(
        user,
        'UPLOAD',
        'Documents',
        item?.id || 'new',
        `${form.title || file.name} Rev ${form.revision}`
      )
    } catch (error: any) {
      alert(error?.message || 'Document upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function save() {
    if (!form.title.trim()) return

    if (!projectId) {
      alert('No project selected.')
      return
    }

    await upsert.mutateAsync({
      id: item?.id,
      project_id: projectId,
      ...form,
      document_type: form.type,
      revision_no: form.revision,
      drawing_number: form.document_number,
      document_custodian: form.type === 'Drawing' ? 'Design' : undefined,
      received_by_team: form.type === 'Drawing' ? 'Design' : undefined,
      uploaded_by: item?.uploaded_by || user?.id,
    } as any)

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
    <div
      className="modal-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? 'Edit Document' : 'Register Document'}
          </div>

          <button
            onClick={onClose}
            className="text-[#74818d] hover:text-[#102943]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input
              className="form-control"
              value={form.title}
              onChange={event => set('title', event.target.value)}
              placeholder="Document title…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Document / Drawing Number</label>
              <input
                className="form-control"
                value={form.document_number}
                onChange={event => {
                  set('document_number', event.target.value)
                  set('drawing_number', event.target.value)
                }}
                placeholder="e.g. A-100, S-201"
              />
            </div>

            <div>
              <label className="form-label">Document Type</label>
              <select
                className="form-control"
                value={form.type}
                onChange={event => {
                  set('type', event.target.value)
                  set('document_type', event.target.value)
                }}
              >
                {TYPES.map(type => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Discipline / Team</label>
              <select
                className="form-control"
                value={form.discipline}
                onChange={event => set('discipline', event.target.value)}
              >
                {DISCIPLINES.map(discipline => (
                  <option key={discipline}>{discipline}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Issued For</label>
              <select
                className="form-control"
                value={form.issued_for}
                onChange={event => set('issued_for', event.target.value)}
              >
                {ISSUED_FOR.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {form.type === 'Drawing' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Drawing Package</label>
                <input
                  className="form-control"
                  value={form.package_name}
                  onChange={event => set('package_name', event.target.value)}
                  placeholder="e.g. Ground Floor Layout, MEP Coordination"
                />
              </div>

              <div>
                <label className="form-label">Consultant</label>
                <input
                  className="form-control"
                  value={form.consultant_name}
                  onChange={event => {
                    set('consultant_name', event.target.value)
                    set('originator_name', event.target.value)
                  }}
                  placeholder="Originating external consultant"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Revision</label>
              <select
                className="form-control"
                value={form.revision}
                onChange={event => {
                  set('revision', event.target.value)
                  set('revision_no', event.target.value)
                }}
              >
                {REVISIONS.map(revision => (
                  <option key={revision}>{revision}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Revision Date</label>
              <input
                type="date"
                className="form-control"
                value={form.revision_date}
                onChange={event => set('revision_date', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Register Status</label>
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

          {form.type === 'Drawing' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Approval Status</label>
                <select
                  className="form-control"
                  value={form.approval_status}
                  onChange={event =>
                    set('approval_status', event.target.value)
                  }
                >
                  {STATUSES.map(status => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Review Status</label>
                <select
                  className="form-control"
                  value={form.review_status}
                  onChange={event => set('review_status', event.target.value)}
                >
                  {STATUSES.map(status => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {form.type === 'Drawing' && (
            <div className="rounded-xl border border-[#08B5A6]/30 bg-[#E8F6F4]/60 p-4 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#05969B]">Controlled Drawing Gateway</div>
                <div className="mt-1 text-[12px] text-[#445b68]">External consultant → Design Team → controlled distribution to Housebuild, MEP and Infrastructure.</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Document Custodian</label>
                  <input className="form-control bg-white/70" value="Design Team" readOnly />
                </div>
                <div>
                  <label className="form-label">Received Date</label>
                  <input type="date" className="form-control" value={form.received_date} onChange={event => set('received_date', event.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Distribution Status</label>
                  <select className="form-control" value={form.distribution_status} onChange={event => set('distribution_status', event.target.value)}>
                    {['Not distributed','Partially distributed','Distributed','Recalled'].map(status => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Distribution Date</label>
                  <input type="date" className="form-control" value={form.distribution_date} onChange={event => set('distribution_date', event.target.value)} />
                </div>
              </div>

              <div>
                <label className="form-label">Distributed To</label>
                <div className="grid grid-cols-3 gap-2">
                  {INTERNAL_DISTRIBUTION_TEAMS.map(team => {
                    const checked = form.distributed_to.includes(team)
                    return <label key={team} className="flex items-center gap-2 rounded-lg border border-[#b8ded9] bg-white px-3 py-2 text-[12px] font-semibold text-[#102943]">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked ? form.distributed_to.filter((item: string) => item !== team) : [...form.distributed_to, team]
                        set('distributed_to', next)
                        set('distribution_status', next.length === 0 ? 'Not distributed' : next.length === INTERNAL_DISTRIBUTION_TEAMS.length ? 'Distributed' : 'Partially distributed')
                        if (next.length > 0 && !form.distribution_date) set('distribution_date', new Date().toISOString().slice(0, 10))
                      }} />
                      {team}
                    </label>
                  })}
                </div>
              </div>

              <div>
                <label className="form-label">Transmittal / Distribution Reference</label>
                <input className="form-control" value={form.transmittal_reference} onChange={event => set('transmittal_reference', event.target.value)} placeholder="e.g. TR-STR-042" />
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Issued By</label>
            <input
              className="form-control"
              value={form.issued_by}
              onChange={event => set('issued_by', event.target.value)}
              placeholder="Person, team, consultant or company…"
            />
          </div>

          <div>
            <label className="form-label">Description / Notes</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.description}
              onChange={event => set('description', event.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Upload File</label>

            <label className="btn-ghost btn-sm btn cursor-pointer w-full justify-center border-dashed">
              <Upload size={13} />
              {uploading
                ? 'Uploading…'
                : form.storage_path
                ? 'File uploaded ✓'
                : 'Click to upload PDF / DWG / Excel / Word / Image'}

              <input
                type="file"
                hidden
                onChange={handleFile}
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.docx,.xlsx,.xls,.mpp"
                disabled={uploading}
              />
            </label>

            {form.file_size_kb > 0 && (
              <div className="text-[10px] text-[#74818d] mt-1">
                {form.file_size_kb} KB · {form.file_type || 'file'}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[#dfe3e7]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn-gold btn-sm btn"
            onClick={save}
            disabled={upsert.isPending || uploading}
          >
            {upsert.isPending
              ? 'Saving…'
              : item
              ? 'Save Changes'
              : 'Register'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { can, session } = useAccessSession()
  const { projectId } = useProjectStore()
  const canCreateDocument = Boolean(projectId) && can('documents.upload', { scopeType: 'project', scopeId: projectId, discipline: session.discipline })

  const { data: docs = [], isLoading } = useDocuments()
  const [modal, setModal] = useState<Document | null | 'new'>(null)

  useQuickActionRoute(() => setModal('new'), canCreateDocument)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [discFilter, setDiscFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [viewMode, setViewMode] = useState<'register' | 'library'>('register')

  const filtered = docs.filter(document => {
    const searchText = search.toLowerCase()

    const matchesSearch =
      !search ||
      document.title.toLowerCase().includes(searchText) ||
      (document.document_number || '').toLowerCase().includes(searchText)

    if (!matchesSearch) return false
    if (typeFilter && document.type !== typeFilter) return false
    if (discFilter && document.discipline !== discFilter) return false
    if (statFilter && document.status !== statFilter) return false

    return true
  })

  const byType = TYPES.reduce((acc, type) => {
    acc[type] = docs.filter(document => document.type === type).length
    return acc
  }, {} as Record<string, number>)

  function statBadge(status: string) {
    if (status === 'Current' || status === 'Approved') return 'badge-green'
    if (status === 'For Review' || status === 'Pending Review')
      return 'badge-amber'
    if (status === 'Draft' || status === 'Submitted') return 'badge-muted'
    if (status === 'Superseded') return 'badge badge-muted opacity-50'
    if (status === 'Void' || status === 'Rejected') return 'badge-red'
    return 'badge-muted'
  }

  function typeIcon(type: string) {
    if (type === 'Drawing') return '📐'
    if (type === 'Programme / Schedule') return '📅'
    if (type === 'RFI') return '❓'
    if (type === 'Report') return '📄'
    if (type === 'Contract') return '📜'
    if (type === 'BOQ' || type === 'Payment Document') return '💰'
    if (type === 'HSE Document') return '🦺'
    if (type === 'Quality Document') return '✅'
    return '📁'
  }

  return (
    <div className="pmx-command-page min-h-screen -m-4 space-y-5 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
      {!canCreateDocument && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          Document Control View — you can view and download documents, but you
          cannot register, edit, or upload documents.
        </div>
      )}

      <div className="rounded-xl border border-[#b9ebe6] bg-[#E8F6F4] px-4 py-3 text-sm text-[#0B2A3C]">
        <strong>Document Control is the source of truth.</strong> Drawing uploads, revisions, approvals and superseded records are managed here. Design Intelligence reads these drawing records automatically for revision comparison and coordination review.
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`btn btn-sm ${
            viewMode === 'register' ? 'btn-gold' : 'btn-ghost'
          }`}
          onClick={() => setViewMode('register')}
        >
          Document Register
        </button>

        <button
          className={`btn btn-sm ${
            viewMode === 'library' ? 'btn-gold' : 'btn-ghost'
          }`}
          onClick={() => setViewMode('library')}
        >
          Document Library
        </button>

        <button
          className="btn btn-sm btn-ghost"
          onClick={() => navigate('/app/design-intelligence')}
        >
          Design Intelligence
        </button>
      </div>

      {viewMode === 'register' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType)
              .filter(([, count]) => count > 0)
              .map(([type, count]) => (
                <button
                  key={type}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                    typeFilter === type
                      ? 'bg-[#ff7657] text-[#0c1014] border-[#c49e48]'
                      : 'bg-white text-[#536170] border-[#dfe3e7] hover:border-[#ffd1c5]'
                  }`}
                  onClick={() =>
                    setTypeFilter(typeFilter === type ? '' : type)
                  }
                >
                  <span>{typeIcon(type)}</span>
                  {type}
                  <span className="font-mono">{count}</span>
                </button>
              ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#74818d]"
              />

              <input
                className="form-control pl-7 text-[12px] py-1.5"
                placeholder="Search title or number…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>

            <select
              className="form-control text-[12px] py-1.5 w-auto"
              value={discFilter}
              onChange={event => setDiscFilter(event.target.value)}
            >
              <option value="">All Teams / Disciplines</option>
              {DISCIPLINES.map(discipline => (
                <option key={discipline}>{discipline}</option>
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

            {canCreateDocument && (
              <button
                className="btn-gold btn-sm btn ml-auto"
                onClick={() => setModal('new')}
              >
                <Plus size={13} />
                Register Document
              </button>
            )}
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Doc No.</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th className="hide-mobile">Team / Discipline</th>
                    <th>Rev</th>
                    <th>Rev Date</th>
                    <th>Status</th>
                    <th className="hide-mobile">Issued By</th>
                    <th className="hide-mobile">Distribution</th>
                    <th className="hide-mobile">Size</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center py-6 text-[#74818d]"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center py-8 text-[#74818d]"
                      >
                        {docs.length === 0
                          ? 'No documents registered yet.'
                          : 'No documents match filters.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(document => {
                      const canEditThisDocument =
                        can('documents.upload', { scopeType: 'project', scopeId: projectId, discipline: session.discipline }) &&
                        (document.uploaded_by === user?.id || can('documents.delete', { scopeType: 'project', scopeId: projectId, discipline: session.discipline }))

                      return (
                        <tr
                          key={document.id}
                          className={
                            document.status === 'Superseded' ||
                            document.status === 'Void'
                              ? 'opacity-50'
                              : ''
                          }
                        >
                          <td className="font-mono text-[10px] text-[#df5f41]">
                            {document.document_number || '—'}
                          </td>

                          <td
                            className="font-medium text-[#102943] max-w-[200px] truncate"
                            title={document.title}
                          >
                            {document.title}
                          </td>

                          <td>
                            <span className="text-[9px]">
                              {typeIcon(document.type)}
                            </span>{' '}
                            <span className="text-[10px] text-[#74818d]">
                              {document.type}
                            </span>
                          </td>

                          <td className="hide-mobile">
                            <span className="badge badge-muted">
                              {document.discipline || '—'}
                            </span>
                          </td>

                          <td className="font-mono text-[11px] text-[#74818d]">
                            Rev {document.revision}
                          </td>

                          <td>{fdate(document.revision_date)}</td>

                          <td>
                            <span
                              className={`badge ${statBadge(
                                document.status
                              )}`}
                            >
                              {document.status}
                            </span>
                          </td>

                          <td className="hide-mobile text-[11px] text-[#74818d]">
                            {(document as any).originator_name || document.issued_by || '—'}
                          </td>

                          <td className="hide-mobile">
                            {document.type === 'Drawing' ? <div>
                              <span className={`badge ${(document as any).distribution_status === 'Distributed' ? 'badge-success' : (document as any).distribution_status === 'Partially distributed' ? 'badge-warning' : 'badge-muted'}`}>
                                {(document as any).distribution_status || 'Not distributed'}
                              </span>
                              {Array.isArray((document as any).distributed_to) && (document as any).distributed_to.length > 0 && <div className="mt-1 text-[9px] text-[#74818d]">{(document as any).distributed_to.join(', ')}</div>}
                            </div> : <span className="text-[#74818d]">—</span>}
                          </td>

                          <td className="hide-mobile text-[10px] font-mono text-[#74818d]">
                            {document.file_size_kb
                              ? `${document.file_size_kb}KB`
                              : '—'}
                          </td>

                          <td>
                            <div className="flex gap-1">
                              {document.public_url && (
                                <a
                                  href={document.public_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="tbl-action"
                                  title="Download"
                                >
                                  <Download size={10} />
                                </a>
                              )}

                              {(document as any).google_drive_url && (
                                <a
                                  href={(document as any).google_drive_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="tbl-action"
                                  title="Google Drive Backup"
                                >
                                  Drive
                                </a>
                              )}

                              {document.type === 'Drawing' && (
                                <button
                                  className="tbl-action"
                                  title="Open this drawing in Design Intelligence"
                                  onClick={() => navigate(`/app/design-intelligence?document=${document.id}`)}
                                >
                                  Design Intel
                                </button>
                              )}

                              {canEditThisDocument ? (
                                <button
                                  className="tbl-action"
                                  onClick={() => setModal(document)}
                                >
                                  Edit
                                </button>
                              ) : (
                                <span className="text-[#74818d] text-[11px] px-2">
                                  View
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <DocumentRepository title="Document Library" rootFolder="documents" />
      )}

      {modal !== null && canCreateDocument && (
        <DocModal
          item={modal === 'new' ? null : (modal as Document)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

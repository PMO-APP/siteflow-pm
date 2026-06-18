import { logAudit } from '@/lib/audit'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import {
  canUploadDocuments,
  canEditDocument,
} from '@/lib/permissions'
import { useState } from 'react'
import {
  Plus,
  X,
  Search,
  Upload,
  Download,
} from 'lucide-react'
import {
  useDocuments,
  useUpsertDocument,
} from '@/hooks/useData'
import {
  uploadFile,
  backupFileToGoogleDrive,
} from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'
import type { Document } from '@/types'
import DocumentRepository from '@/components/DocumentRepository'

const TYPES: Document['type'][] = [
  'Drawing',
  'Specification',
  'BOQ',
  'Contract',
  'RFI',
  'Method Statement',
  'Submittal',
  'Report',
  'Other',
]

const DISCIPLINES = [
  'Architectural',
  'Structural',
  'MEP',
  'ELV',
  'Landscape',
  'General',
]

const STATUSES = [
  'Draft',
  'For Review',
  'Current',
  'Superseded',
  'Void',
]

const REVISIONS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'P1',
  'P2',
  'P3',
  '1',
  '2',
  '3',
]

function getDocumentFolder(type: string, discipline?: string) {
  const cleanDiscipline = (discipline || 'general')
    .toLowerCase()
    .replace(/\s+/g, '-')

  if (type === 'Drawing') return `drawings/${cleanDiscipline}`
  if (type === 'Report') return 'reports'
  if (type === 'Contract') return 'contracts'
  if (type === 'RFI') return 'rfis'
  if (type === 'BOQ') return 'boq'
  if (type === 'Method Statement') return 'method-statements'
  if (type === 'Submittal') return 'submittals'
  if (type === 'Specification') return 'specifications'

  return 'other'
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
    status: item?.status || 'Current',
    description: item?.description || '',
    issued_by: item?.issued_by || '',
    storage_path: item?.storage_path || '',
    public_url: item?.public_url || '',
    file_size_kb: item?.file_size_kb || 0,
    file_type: item?.file_type || '',
    google_drive_file_id: (item as any)?.google_drive_file_id || '',
    google_drive_url: (item as any)?.google_drive_url || '',
    google_drive_sync_status:
      (item as any)?.google_drive_sync_status || 'pending',
    google_drive_sync_error: (item as any)?.google_drive_sync_error || '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({
      ...current,
      [key]: value,
    }))

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
        set('google_drive_sync_error', '')
      } catch (driveError: any) {
        console.error('Google Drive backup failed:', driveError)

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
      console.error('Document upload failed:', error)
      alert(error?.message || 'Document upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function save() {
    if (!form.title.trim()) return

    if (!projectId) {
      alert(
        'No project selected. Please return to Workspace Hub and select a project.'
      )
      return
    }

    await upsert.mutateAsync({
      id: item?.id,
      project_id: projectId,
      ...form,
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
      <div
        className="modal max-w-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? 'Edit Document' : 'Register Document'}
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
              <label className="form-label">Document Number</label>
              <input
                className="form-control"
                value={form.document_number}
                onChange={event => set('document_number', event.target.value)}
                placeholder="e.g. A-100, S-201"
              />
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Discipline</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Revision</label>
              <select
                className="form-control"
                value={form.revision}
                onChange={event => set('revision', event.target.value)}
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
          </div>

          <div>
            <label className="form-label">Issued By</label>
            <input
              className="form-control"
              value={form.issued_by}
              onChange={event => set('issued_by', event.target.value)}
              placeholder="Architect / Engineer name…"
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
                : 'Click to upload PDF / DWG / Image'}

              <input
                type="file"
                hidden
                onChange={handleFile}
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.docx,.xlsx"
                disabled={uploading}
              />
            </label>

            {form.file_size_kb > 0 && (
              <>
                <div className="text-[10px] text-[#6e7d8c] mt-1">
                  {form.file_size_kb} KB · {form.file_type || 'file'}
                </div>

                {form.google_drive_sync_status === 'syncing' && (
                  <div className="text-[10px] text-amber-400 mt-1">
                    Syncing to Google Drive…
                  </div>
                )}

                {form.google_drive_sync_status === 'synced' && (
                  <div className="text-[10px] text-emerald-400 mt-1">
                    ✓ Backed up to Google Drive
                  </div>
                )}

                {form.google_drive_sync_status === 'failed' && (
                  <div className="text-[10px] text-red-400 mt-1">
                    ⚠ Google Drive backup failed
                    {form.google_drive_sync_error
                      ? `: ${form.google_drive_sync_error}`
                      : ''}
                  </div>
                )}

                {form.google_drive_url && (
                  <a
                    href={form.google_drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#c49e48] underline mt-1 inline-block"
                  >
                    Open Google Drive backup
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
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

const canCreateDocument = canUploadDocuments(role)

  const { data: docs = [], isLoading } = useDocuments()
  const [modal, setModal] = useState<Document | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [discFilter, setDiscFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [viewMode, setViewMode] = useState<'register' | 'repository'>(
    'register'
  )

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
    if (status === 'Current') return 'badge-green'
    if (status === 'For Review') return 'badge-amber'
    if (status === 'Draft') return 'badge-muted'
    if (status === 'Superseded') return 'badge badge-muted opacity-50'
    if (status === 'Void') return 'badge-red'
    return 'badge-muted'
  }

  function typeIcon(type: string) {
    if (type === 'Drawing') return '📐'
    if (type === 'RFI') return '❓'
    if (type === 'Report') return '📄'
    if (type === 'Contract') return '📜'
    return '📁'
  }

  return (
    <div className="space-y-4">
      {!canCreateDocument && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          Document Library View — you can view and download documents, but you
          cannot register, edit, or upload documents.
        </div>
      )}

      <div className="flex gap-2">
        <button
          className={`btn btn-sm ${
            viewMode === 'register' ? 'btn-gold' : 'btn-ghost'
          }`}
          onClick={() => setViewMode('register')}
        >
          Register
        </button>

        <button
          className={`btn btn-sm ${
            viewMode === 'repository' ? 'btn-gold' : 'btn-ghost'
          }`}
          onClick={() => setViewMode('repository')}
        >
          Repository
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
                      ? 'bg-[#c49e48] text-[#0c1014] border-[#c49e48]'
                      : 'bg-[#1c2a36] text-[#bfb9ae] border-white/[0.08] hover:border-[#c49e48]/30'
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
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
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
              <option value="">All Disciplines</option>
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
                Register Doc
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
                    <th className="hide-mobile">Discipline</th>
                    <th>Rev</th>
                    <th>Rev Date</th>
                    <th>Status</th>
                    <th className="hide-mobile">Issued By</th>
                    <th className="hide-mobile">Size</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-6 text-[#6e7d8c]"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-8 text-[#6e7d8c]"
                      >
                        {docs.length === 0
                          ? 'No documents registered yet.'
                          : 'No documents match filters.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(document => {
                     const canEditThisDocument = canEditDocument(
  role,
  document.uploaded_by,
  user?.id
)

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
                          <td className="font-mono text-[10px] text-[#c49e48]">
                            {document.document_number || '—'}
                          </td>

                          <td
                            className="font-medium text-[#ede8de] max-w-[200px] truncate"
                            title={document.title}
                          >
                            {document.title}
                          </td>

                          <td>
                            <span className="text-[9px]">
                              {typeIcon(document.type)}
                            </span>{' '}
                            <span className="text-[10px] text-[#6e7d8c]">
                              {document.type}
                            </span>
                          </td>

                          <td className="hide-mobile">
                            <span className="badge badge-muted">
                              {document.discipline || '—'}
                            </span>
                          </td>

                          <td className="font-mono text-[11px] text-[#6e7d8c]">
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

                          <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                            {document.issued_by || '—'}
                          </td>

                          <td className="hide-mobile text-[10px] font-mono text-[#6e7d8c]">
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

                              {canEditThisDocument ? (
                                <button
                                  className="tbl-action"
                                  onClick={() => setModal(document)}
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
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <DocumentRepository />
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

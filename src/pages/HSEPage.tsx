import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  HardHat,
  Plus,
  Search,
  ShieldAlert,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  uploadFile,
  backupFileToGoogleDrive,
} from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import DocumentRepository from '@/components/DocumentRepository'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'
import {
  canCreateHSE,
  canCloseHSE,
  canEditOwnOrAdmin,
} from '@/lib/permissions'

type Tab =
  | 'observations'
  | 'incidents'
  | 'toolbox'
  | 'documents'
  | 'repository'

type HSEObservation = {
  id: string
  observation_number?: number | null
  project_id: number | null
  title: string
  description?: string | null
  location?: string | null
  area?: string | null
  category?: string | null
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Closed' | 'Escalated'
  responsible_person?: string | null
  target_close_date?: string | null
  closed_date?: string | null
  created_by?: string | null
  created_at?: string | null
}

type HSEIncident = {
  id: string
  project_id: number | null
  incident_number?: string | null
  incident_type: string
  title: string
  location?: string | null
  incident_date?: string | null
  description?: string | null
  root_cause?: string | null
  immediate_action?: string | null
  corrective_action?: string | null
  preventive_action?: string | null
  status: 'Open' | 'Under Investigation' | 'Closed'
  created_by?: string | null
  created_at?: string | null
}

type ToolboxTalk = {
  id: string
  project_id: number | null
  topic: string
  facilitator?: string | null
  talk_date?: string | null
  attendees?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string | null
}

type HSEDocument = {
  id: string
  project_id: number | null
  title: string
  document_type?: string | null
  file_url?: string | null
  storage_path?: string | null
  file_size_kb?: number | null
  file_type?: string | null
  google_drive_file_id?: string | null
  google_drive_url?: string | null
  google_drive_sync_status?: string | null
  google_drive_sync_error?: string | null
  uploaded_by?: string | null
  created_at?: string | null
}

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const
const OBS_STATUS = ['Open', 'In Progress', 'Closed', 'Escalated'] as const
const INCIDENT_STATUS = ['Open', 'Under Investigation', 'Closed'] as const

const OBS_CATEGORIES = [
  'Unsafe Act',
  'Unsafe Condition',
  'Near Miss',
  'PPE Violation',
  'Housekeeping',
  'Scaffold Safety',
  'Electrical Hazard',
  'Fire Safety',
  'Excavation Safety',
  'Working at Height',
  'Environmental',
  'General',
]

const INCIDENT_TYPES = [
  'Near Miss',
  'First Aid Case',
  'Medical Treatment Case',
  'Lost Time Injury',
  'Property Damage',
  'Environmental Incident',
  'Fatality',
]

const DOCUMENT_TYPES = [
  'HSE Plan',
  'Risk Assessment',
  'Method Statement',
  'Permit To Work',
  'MSDS',
  'Emergency Procedure',
  'Audit Report',
  'Induction Record',
  'Toolbox Talk Record',
  'Other',
]

export default function HSEPage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)

  const [activeTab, setActiveTab] = useState<Tab>('observations')
  const [observations, setObservations] = useState<HSEObservation[]>([])
  const [incidents, setIncidents] = useState<HSEIncident[]>([])
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([])
  const [documents, setDocuments] = useState<HSEDocument[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modal, setModal] = useState<
    | null
    | { type: 'observation'; item: HSEObservation | null }
    | { type: 'incident'; item: HSEIncident | null }
    | { type: 'toolbox'; item: ToolboxTalk | null }
    | { type: 'document'; item: HSEDocument | null }
  >(null)

  const canCreate = canCreateHSE(role)
  const canClose = canCloseHSE(role)

  useEffect(() => {
    loadHSE()
  }, [projectId])

  async function loadHSE() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const [obsRes, incRes, toolboxRes, docsRes] = await Promise.all([
      supabase
        .from('hse_observations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('hse_incidents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('hse_toolbox_talks')
        .select('*')
        .eq('project_id', projectId)
        .order('talk_date', { ascending: false }),

      supabase
        .from('hse_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
    ])

    setObservations(obsRes.data || [])
    setIncidents(incRes.data || [])
    setToolboxTalks(toolboxRes.data || [])
    setDocuments(docsRes.data || [])
    setLoading(false)
  }

  const filteredObservations = useMemo(() => {
    return observations.filter(item => {
      const term = search.toLowerCase().trim()

      if (
        term &&
        !String(item.title || '').toLowerCase().includes(term) &&
        !String(item.location || '').toLowerCase().includes(term) &&
        !String(item.category || '').toLowerCase().includes(term)
      ) {
        return false
      }

      if (severityFilter && item.severity !== severityFilter) return false
      if (statusFilter && item.status !== statusFilter) return false

      return true
    })
  }, [observations, search, severityFilter, statusFilter])

  const filteredIncidents = useMemo(() => {
    return incidents.filter(item => {
      const term = search.toLowerCase().trim()

      if (
        term &&
        !String(item.title || '').toLowerCase().includes(term) &&
        !String(item.location || '').toLowerCase().includes(term) &&
        !String(item.incident_type || '').toLowerCase().includes(term)
      ) {
        return false
      }

      if (statusFilter && item.status !== statusFilter) return false

      return true
    })
  }, [incidents, search, statusFilter])

  const openObservations = observations.filter(item => item.status !== 'Closed')
  const criticalObservations = observations.filter(
    item => item.status !== 'Closed' && item.severity === 'Critical'
  )
  const openIncidents = incidents.filter(item => item.status !== 'Closed')

  const talksThisMonth = toolboxTalks.filter(item => {
    if (!item.talk_date) return false

    const date = new Date(item.talk_date)
    const now = new Date()

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  })

  const badgeSeverity = (severity?: string | null) => {
    if (severity === 'Critical') return 'badge-red'
    if (severity === 'High') return 'badge-amber'
    if (severity === 'Medium') return 'badge-blue'
    return 'badge-muted'
  }

  const badgeStatus = (status?: string | null) => {
    if (status === 'Closed') return 'badge-green'
    if (status === 'In Progress' || status === 'Under Investigation') {
      return 'badge-amber'
    }
    if (status === 'Escalated') return 'badge-red'
    return 'badge-blue'
  }

  return (
    <div className="space-y-4">
      {!canCreate && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          HSE View Only — you can view HSE records, but you cannot create or
          edit HSE reports.
        </div>
      )}

      <div>
        <div className="text-xl font-semibold text-[#ede8de]">HSE</div>
        <div className="text-[11px] text-[#6e7d8c] mt-1">
          {projectName || 'No project selected'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={ShieldAlert}
          label="Open HSE Issues"
          value={openObservations.length}
          color={openObservations.length > 0 ? 'text-amber-400' : 'text-emerald-400'}
        />

        <MetricCard
          icon={AlertTriangle}
          label="Critical Issues"
          value={criticalObservations.length}
          color={criticalObservations.length > 0 ? 'text-red-400' : 'text-emerald-400'}
        />

        <MetricCard
          icon={HardHat}
          label="Open Incidents"
          value={openIncidents.length}
          color={openIncidents.length > 0 ? 'text-red-400' : 'text-emerald-400'}
        />

        <MetricCard
          icon={Users}
          label="Toolbox This Month"
          value={talksThisMonth.length}
          color="text-[#c49e48]"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
        {[
  ['observations', 'Observations'],
  ['incidents', 'Incidents'],
  ['toolbox', 'Toolbox Talks'],
  ['documents', 'Documents'],
  ['repository', 'Repository'],
].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setActiveTab(value as Tab)
                setSearch('')
                setSeverityFilter('')
                setStatusFilter('')
              }}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                activeTab === value
                  ? 'bg-[#c49e48] text-[#0c1014]'
                  : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-7 text-[12px] py-1.5"
            placeholder="Search HSE records…"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        {activeTab === 'observations' && (
          <select
            className="form-control text-[12px] py-1.5 w-auto"
            value={severityFilter}
            onChange={event => setSeverityFilter(event.target.value)}
          >
            <option value="">All Severity</option>
            {SEVERITIES.map(severity => (
              <option key={severity}>{severity}</option>
            ))}
          </select>
        )}

        {(activeTab === 'observations' || activeTab === 'incidents') && (
          <select
            className="form-control text-[12px] py-1.5 w-auto"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="">All Status</option>

            {(activeTab === 'incidents' ? INCIDENT_STATUS : OBS_STATUS).map(
              status => (
                <option key={status}>{status}</option>
              )
            )}
          </select>
        )}

        {canCreate && (
          <button
            className="btn-gold btn-sm btn ml-auto"
            onClick={() => {
              if (activeTab === 'observations') {
                setModal({ type: 'observation', item: null })
              }

              if (activeTab === 'incidents') {
                setModal({ type: 'incident', item: null })
              }

              if (activeTab === 'toolbox') {
                setModal({ type: 'toolbox', item: null })
              }

              if (activeTab === 'documents') {
                setModal({ type: 'document', item: null })
              }
            }}
          >
            <Plus size={13} />
            Add {activeTab === 'toolbox' ? 'Talk' : activeTab.slice(0, -1)}
          </button>
        )}
      </div>

      {activeTab === 'observations' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Observation</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th className="hide-mobile">Responsible</th>
                  <th className="hide-mobile">Target Close</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-[#6e7d8c]">
                      Loading…
                    </td>
                  </tr>
                ) : filteredObservations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-[#6e7d8c]">
                      No HSE observations found.
                    </td>
                  </tr>
                ) : (
                  filteredObservations.map(item => (
                    <tr key={item.id}>
                      <td className="font-mono text-[10px] text-[#6e7d8c]">
                        #{item.observation_number || '—'}
                      </td>

                      <td className="font-medium text-[#ede8de] max-w-[220px] truncate">
                        {item.title}
                      </td>

                      <td className="text-[11px] text-[#6e7d8c]">
                        {item.category || 'General'}
                      </td>

                      <td className="text-[11px] text-[#6e7d8c]">
                        {item.location || '—'}
                      </td>

                      <td>
                        <span className={`badge ${badgeSeverity(item.severity)}`}>
                          {item.severity}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${badgeStatus(item.status)}`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                        {item.responsible_person || '—'}
                      </td>

                      <td className="hide-mobile">
                        {fdate(item.target_close_date)}
                      </td>

                      <td>
                        <button
                          className="tbl-action"
                          onClick={() =>
                            setModal({ type: 'observation', item })
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Incident</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-[#6e7d8c]">
                      Loading…
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#6e7d8c]">
                      No HSE incidents found.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map(item => (
                    <tr key={item.id}>
                      <td className="font-mono text-[10px] text-[#6e7d8c]">
                        {item.incident_number || '—'}
                      </td>

                      <td className="font-medium text-[#ede8de]">
                        {item.title}
                      </td>

                      <td className="text-[11px] text-[#6e7d8c]">
                        {item.incident_type}
                      </td>

                      <td className="text-[11px] text-[#6e7d8c]">
                        {item.location || '—'}
                      </td>

                      <td>{fdate(item.incident_date)}</td>

                      <td>
                        <span className={`badge ${badgeStatus(item.status)}`}>
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="tbl-action"
                          onClick={() => setModal({ type: 'incident', item })}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'toolbox' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Facilitator</th>
                  <th>Date</th>
                  <th>Attendees</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {toolboxTalks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#6e7d8c]">
                      No toolbox talks recorded.
                    </td>
                  </tr>
                ) : (
                  toolboxTalks.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium text-[#ede8de]">
                        {item.topic}
                      </td>
                      <td>{item.facilitator || '—'}</td>
                      <td>{fdate(item.talk_date)}</td>
                      <td>{item.attendees || '—'}</td>
                      <td className="max-w-[240px] truncate">
                        {item.notes || '—'}
                      </td>
                      <td>
                        <button
                          className="tbl-action"
                          onClick={() => setModal({ type: 'toolbox', item })}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Size</th>
                  <th>File</th>
                </tr>
              </thead>

              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#6e7d8c]">
                      No HSE documents uploaded.
                    </td>
                  </tr>
                ) : (
                  documents.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium text-[#ede8de]">
                        {item.title}
                      </td>

                      <td>{item.document_type || 'Other'}</td>

                      <td>{fdate(item.created_at)}</td>

                      <td className="text-[10px] text-[#6e7d8c]">
                        {item.file_size_kb ? `${item.file_size_kb} KB` : '—'}
                      </td>

                      <td>
                        <div className="flex gap-2">
                          {item.file_url ? (
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="tbl-action"
                            >
                              Open
                            </a>
                          ) : (
                            '—'
                          )}

                          {item.google_drive_url && (
                            <a
                              href={item.google_drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="tbl-action"
                            >
                              Drive
                            </a>
                          )}

                          <button
                            className="tbl-action"
                            onClick={() => setModal({ type: 'document', item })}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'repository' && (
  <DocumentRepository
    rootFolder="hse"
    title="HSE Repository"
  />
)}

      {modal?.type === 'observation' && (
        <ObservationModal
          item={modal.item}
          canClose={canClose}
          onClose={() => setModal(null)}
          onSaved={loadHSE}
        />
      )}

      {modal?.type === 'incident' && (
        <IncidentModal
          item={modal.item}
          canClose={canClose}
          onClose={() => setModal(null)}
          onSaved={loadHSE}
        />
      )}

      {modal?.type === 'toolbox' && (
        <ToolboxModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={loadHSE}
        />
      )}

      {modal?.type === 'document' && (
        <DocumentModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={loadHSE}
        />
      )}
    </div>
  )
}

function ObservationModal({
  item,
  canClose,
  onClose,
  onSaved,
}: {
  item: HSEObservation | null
  canClose: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { projectId } = useProjectStore()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const canEdit =
    !item || canEditOwnOrAdmin(role, item.created_by, user?.id) || canClose

  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    location: item?.location || '',
    area: item?.area || '',
    category: item?.category || 'General',
    severity: item?.severity || ('Low' as HSEObservation['severity']),
    status: item?.status || ('Open' as HSEObservation['status']),
    responsible_person: item?.responsible_person || '',
    target_close_date: item?.target_close_date || '',
    closed_date: item?.closed_date || '',
  })

  const set = (key: string, value: any) => {
    if (!canEdit) return
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!form.title.trim()) return

    const payload = {
      ...form,
      project_id: item?.project_id || projectId,
      created_by: item?.created_by || user?.id,
      target_close_date: form.target_close_date || null,
      closed_date:
        form.status === 'Closed'
          ? form.closed_date || new Date().toISOString().slice(0, 10)
          : null,
    }

    const query = item?.id
      ? supabase.from('hse_observations').update(payload).eq('id', item.id)
      : supabase.from('hse_observations').insert(payload)

    const { error } = await query

    if (error) {
      alert(error.message)
      return
    }

    await onSaved()
    onClose()
  }

  return (
    <BaseModal
      title={item ? 'HSE Observation' : 'New HSE Observation'}
      onClose={onClose}
      onSave={canEdit ? save : undefined}
    >
      {!canEdit && <ViewOnlyNotice />}

      <Field label="Title *">
        <input
          className="form-control"
          value={form.title}
          disabled={!canEdit}
          onChange={event => set('title', event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            className="form-control"
            value={form.category}
            disabled={!canEdit}
            onChange={event => set('category', event.target.value)}
          >
            {OBS_CATEGORIES.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>

        <Field label="Severity">
          <select
            className="form-control"
            value={form.severity}
            disabled={!canEdit}
            onChange={event => set('severity', event.target.value)}
          >
            {SEVERITIES.map(severity => (
              <option key={severity}>{severity}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Location">
          <input
            className="form-control"
            value={form.location}
            disabled={!canEdit}
            onChange={event => set('location', event.target.value)}
          />
        </Field>

        <Field label="Area">
          <input
            className="form-control"
            value={form.area}
            disabled={!canEdit}
            onChange={event => set('area', event.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select
            className="form-control"
            value={form.status}
            disabled={!canEdit}
            onChange={event => set('status', event.target.value)}
          >
            {OBS_STATUS.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>

        <Field label="Responsible Person">
          <input
            className="form-control"
            value={form.responsible_person}
            disabled={!canEdit}
            onChange={event => set('responsible_person', event.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target Close">
          <input
            type="date"
            className="form-control"
            value={form.target_close_date}
            disabled={!canEdit}
            onChange={event => set('target_close_date', event.target.value)}
          />
        </Field>

        <Field label="Closed Date">
          <input
            type="date"
            className="form-control"
            value={form.closed_date}
            disabled={!canEdit}
            onChange={event => set('closed_date', event.target.value)}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className="form-control"
          rows={3}
          value={form.description}
          disabled={!canEdit}
          onChange={event => set('description', event.target.value)}
        />
      </Field>
    </BaseModal>
  )
}

function IncidentModal({
  item,
  canClose,
  onClose,
  onSaved,
}: {
  item: HSEIncident | null
  canClose: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { projectId } = useProjectStore()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const canEdit =
    !item || canEditOwnOrAdmin(role, item.created_by, user?.id) || canClose

  const [form, setForm] = useState({
    incident_number: item?.incident_number || '',
    incident_type: item?.incident_type || 'Near Miss',
    title: item?.title || '',
    location: item?.location || '',
    incident_date:
      item?.incident_date || new Date().toISOString().slice(0, 10),
    description: item?.description || '',
    root_cause: item?.root_cause || '',
    immediate_action: item?.immediate_action || '',
    corrective_action: item?.corrective_action || '',
    preventive_action: item?.preventive_action || '',
    status: item?.status || ('Open' as HSEIncident['status']),
  })

  const set = (key: string, value: any) => {
    if (!canEdit) return
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!form.title.trim()) return

    const payload = {
      ...form,
      project_id: item?.project_id || projectId,
      created_by: item?.created_by || user?.id,
      incident_date: form.incident_date || null,
    }

    const query = item?.id
      ? supabase.from('hse_incidents').update(payload).eq('id', item.id)
      : supabase.from('hse_incidents').insert(payload)

    const { error } = await query

    if (error) {
      alert(error.message)
      return
    }

    await onSaved()
    onClose()
  }

  return (
    <BaseModal
      title={item ? 'HSE Incident' : 'New HSE Incident'}
      onClose={onClose}
      onSave={canEdit ? save : undefined}
    >
      {!canEdit && <ViewOnlyNotice />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Incident Number">
          <input
            className="form-control"
            value={form.incident_number}
            disabled={!canEdit}
            onChange={event => set('incident_number', event.target.value)}
          />
        </Field>

        <Field label="Incident Type">
          <select
            className="form-control"
            value={form.incident_type}
            disabled={!canEdit}
            onChange={event => set('incident_type', event.target.value)}
          >
            {INCIDENT_TYPES.map(type => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Title *">
        <input
          className="form-control"
          value={form.title}
          disabled={!canEdit}
          onChange={event => set('title', event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Location">
          <input
            className="form-control"
            value={form.location}
            disabled={!canEdit}
            onChange={event => set('location', event.target.value)}
          />
        </Field>

        <Field label="Incident Date">
          <input
            type="date"
            className="form-control"
            value={form.incident_date}
            disabled={!canEdit}
            onChange={event => set('incident_date', event.target.value)}
          />
        </Field>
      </div>

      <Field label="Status">
        <select
          className="form-control"
          value={form.status}
          disabled={!canEdit}
          onChange={event => set('status', event.target.value)}
        >
          {INCIDENT_STATUS.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea
          className="form-control"
          rows={3}
          value={form.description}
          disabled={!canEdit}
          onChange={event => set('description', event.target.value)}
        />
      </Field>

      <Field label="Root Cause">
        <textarea
          className="form-control"
          rows={2}
          value={form.root_cause}
          disabled={!canEdit}
          onChange={event => set('root_cause', event.target.value)}
        />
      </Field>

      <Field label="Immediate Action">
        <textarea
          className="form-control"
          rows={2}
          value={form.immediate_action}
          disabled={!canEdit}
          onChange={event => set('immediate_action', event.target.value)}
        />
      </Field>

      <Field label="Corrective Action">
        <textarea
          className="form-control"
          rows={2}
          value={form.corrective_action}
          disabled={!canEdit}
          onChange={event => set('corrective_action', event.target.value)}
        />
      </Field>

      <Field label="Preventive Action">
        <textarea
          className="form-control"
          rows={2}
          value={form.preventive_action}
          disabled={!canEdit}
          onChange={event => set('preventive_action', event.target.value)}
        />
      </Field>
    </BaseModal>
  )
}

function ToolboxModal({
  item,
  onClose,
  onSaved,
}: {
  item: ToolboxTalk | null
  onClose: () => void
  onSaved: () => void
}) {
  const { projectId } = useProjectStore()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const canEdit = !item || canEditOwnOrAdmin(role, item.created_by, user?.id)

  const [form, setForm] = useState({
    topic: item?.topic || '',
    facilitator: item?.facilitator || '',
    talk_date: item?.talk_date || new Date().toISOString().slice(0, 10),
    attendees: item?.attendees || '',
    notes: item?.notes || '',
  })

  const set = (key: string, value: any) => {
    if (!canEdit) return
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!form.topic.trim()) return

    const payload = {
      ...form,
      project_id: item?.project_id || projectId,
      created_by: item?.created_by || user?.id,
      talk_date: form.talk_date || null,
    }

    const query = item?.id
      ? supabase.from('hse_toolbox_talks').update(payload).eq('id', item.id)
      : supabase.from('hse_toolbox_talks').insert(payload)

    const { error } = await query

    if (error) {
      alert(error.message)
      return
    }

    await onSaved()
    onClose()
  }

  return (
    <BaseModal
      title={item ? 'Toolbox Talk' : 'New Toolbox Talk'}
      onClose={onClose}
      onSave={canEdit ? save : undefined}
    >
      {!canEdit && <ViewOnlyNotice />}

      <Field label="Topic *">
        <input
          className="form-control"
          value={form.topic}
          disabled={!canEdit}
          onChange={event => set('topic', event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Facilitator">
          <input
            className="form-control"
            value={form.facilitator}
            disabled={!canEdit}
            onChange={event => set('facilitator', event.target.value)}
          />
        </Field>

        <Field label="Date">
          <input
            type="date"
            className="form-control"
            value={form.talk_date}
            disabled={!canEdit}
            onChange={event => set('talk_date', event.target.value)}
          />
        </Field>
      </div>

      <Field label="Attendees">
        <textarea
          className="form-control"
          rows={2}
          value={form.attendees}
          disabled={!canEdit}
          onChange={event => set('attendees', event.target.value)}
          placeholder="Names or number of attendees…"
        />
      </Field>

      <Field label="Notes">
        <textarea
          className="form-control"
          rows={3}
          value={form.notes}
          disabled={!canEdit}
          onChange={event => set('notes', event.target.value)}
        />
      </Field>
    </BaseModal>
  )
}

function DocumentModal({
  item,
  onClose,
  onSaved,
}: {
  item: HSEDocument | null
  onClose: () => void
  onSaved: () => void
}) {
  const { projectId, projectName } = useProjectStore()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const [uploading, setUploading] = useState(false)

  const canEdit = !item || canEditOwnOrAdmin(role, item.uploaded_by, user?.id)

  const [form, setForm] = useState({
    title: item?.title || '',
    document_type: item?.document_type || 'Other',
    file_url: item?.file_url || '',
    storage_path: item?.storage_path || '',
    file_size_kb: item?.file_size_kb || 0,
    file_type: item?.file_type || '',
    google_drive_file_id: item?.google_drive_file_id || '',
    google_drive_url: item?.google_drive_url || '',
    google_drive_sync_status:
      item?.google_drive_sync_status || 'pending',
    google_drive_sync_error: item?.google_drive_sync_error || '',
  })

  const set = (key: string, value: any) => {
    if (!canEdit) return
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!projectId) {
      alert('No project selected.')
      return
    }

    try {
      setUploading(true)

      const cleanType = form.document_type
        .toLowerCase()
        .replace(/\s+/g, '-')

     const result = await uploadFile(
  'project-files',
  file,
  `projects/${projectId}/hse/${cleanType}`
)

      if (!result) {
        alert('Upload failed. No file path returned.')
        return
      }

      set('storage_path', result.path)
      set('file_url', result.publicUrl)
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
          documentType: `HSE - ${form.document_type}`,
          discipline: 'HSE',
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
    } catch (error: any) {
      console.error('HSE document upload failed:', error)
      alert(error?.message || 'HSE document upload failed')
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

    const payload = {
      ...form,
      project_id: item?.project_id || projectId,
      uploaded_by: item?.uploaded_by || user?.id,
    }

    const query = item?.id
      ? supabase.from('hse_documents').update(payload).eq('id', item.id)
      : supabase.from('hse_documents').insert(payload)

    const { error } = await query

    if (error) {
      alert(error.message)
      return
    }

    await onSaved()
    onClose()
  }

  return (
    <BaseModal
      title={item ? 'HSE Document' : 'New HSE Document'}
      onClose={onClose}
      onSave={canEdit && !uploading ? save : undefined}
    >
      {!canEdit && <ViewOnlyNotice />}

      <Field label="Title *">
        <input
          className="form-control"
          value={form.title}
          disabled={!canEdit}
          onChange={event => set('title', event.target.value)}
        />
      </Field>

      <Field label="Document Type">
        <select
          className="form-control"
          value={form.document_type}
          disabled={!canEdit}
          onChange={event => set('document_type', event.target.value)}
        >
          {DOCUMENT_TYPES.map(type => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </Field>

      <Field label="Upload File">
        <label className="btn-ghost btn-sm btn cursor-pointer w-full justify-center border-dashed">
          <Upload size={13} />
          {uploading
            ? 'Uploading…'
            : form.storage_path
            ? 'File uploaded ✓'
            : 'Click to upload HSE document'}

          <input
            type="file"
            hidden
            disabled={!canEdit || uploading}
            onChange={handleFile}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
        </label>

        {form.file_size_kb > 0 && (
          <div className="text-[10px] text-[#6e7d8c] mt-1">
            {form.file_size_kb} KB · {form.file_type || 'file'}
          </div>
        )}

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

        {form.file_url && (
          <a
            href={form.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-[#c49e48] underline mt-1 inline-block"
          >
            Open uploaded file
          </a>
        )}
      </Field>
    </BaseModal>
  )
}

function BaseModal({
  title,
  children,
  onClose,
  onSave,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  onSave?: () => void
}) {
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
          <div className="modal-title">{title}</div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">{children}</div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>
            Close
          </button>

          {onSave && (
            <button className="btn-gold btn-sm btn" onClick={onSave}>
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function ViewOnlyNotice() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-400">
      View only — you can view this HSE record, but you cannot edit it.
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: number
  color: string
}) {
  return (
    <div className="card p-3">
      <Icon size={17} className={color} />

      <div className={`font-display text-3xl font-bold mt-2 ${color}`}>
        {value}
      </div>

      <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  )
}

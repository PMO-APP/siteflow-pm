import { useEffect, useState } from 'react'
import { CheckCircle, FileSpreadsheet, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { fdate } from '@/lib/utils'

const REVISION_TYPES = [
  'Baseline',
  'Updated Programme',
  'Recovery Programme',
  'Catch-up Programme',
  'Design Programme',
  'Tender Programme',
]

function canManageSchedule(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo'].includes(role || '')
}

export default function ScheduleRevisionsPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const [revisions, setRevisions] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    revision_name: '',
    revision_type: 'Baseline',
    revision_no: '',
    reason: '',
    block_id: '',
    package_name: '',
    planned_start: '',
    planned_finish: '',
    baseline_finish: '',
    current_finish: '',
    forecast_finish: '',
    notes: '',
    file: null as File | null,
  })

  const canManage = canManageSchedule(role)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const [revisionResult, packageResult] = await Promise.all([
      supabase
        .from('schedule_revisions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
        .from('project_blocks')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (revisionResult.error) setNotice(revisionResult.error.message)
    if (packageResult.error) setNotice(packageResult.error.message)

    setRevisions(revisionResult.data || [])
    setPackages(packageResult.data || [])
    setLoading(false)
  }

  function onPackageChange(packageId: string) {
    const pkg = packages.find(item => item.id === packageId)

    setForm(current => ({
      ...current,
      block_id: packageId,
      package_name: pkg?.package_name || pkg?.block_name || '',
    }))
  }

  async function uploadFile() {
    if (!form.file || !projectId) return { file_url: '', file_name: '' }

    const safeName = form.file.name.replace(/\s+/g, '-').toLowerCase()
    const filePath = `${projectId}/schedule-revisions/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('project-files')
      .upload(filePath, form.file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from('project-files').getPublicUrl(filePath)

    return {
      file_url: publicUrl,
      file_name: form.file.name,
    }
  }

  async function createRevision() {
    setNotice('')

    if (!canManage) {
      setNotice('Only PMO/Admin can upload schedule revisions.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!form.revision_name.trim()) {
      setNotice('Revision name is required.')
      return
    }

    try {
      setUploading(true)

      const fileData = await uploadFile()

      const { error } = await supabase.from('schedule_revisions').insert({
        organization_id: organizationId,
        portfolio_id: portfolioId,
        project_id: projectId,

        revision_name: form.revision_name.trim(),
        revision_type: form.revision_type,
        revision_no: form.revision_no.trim() || null,
        reason: form.reason.trim() || null,

        block_id: form.block_id || null,
        package_name: form.package_name || null,

        planned_start: form.planned_start || null,
        planned_finish: form.planned_finish || null,
        baseline_finish: form.baseline_finish || null,
        current_finish: form.current_finish || null,
        forecast_finish: form.forecast_finish || null,

        file_url: fileData.file_url || null,
        file_name: fileData.file_name || null,

        status: 'Approved',
        is_active: false,

        uploaded_by: user?.id || null,
        submitted_by: user?.id || null,
        submitted_date: new Date().toISOString().slice(0, 10),

        notes: form.notes.trim() || null,
      })

      if (error) {
        setNotice(error.message)
        setUploading(false)
        return
      }

      setForm({
        revision_name: '',
        revision_type: 'Baseline',
        revision_no: '',
        reason: '',
        block_id: '',
        package_name: '',
        planned_start: '',
        planned_finish: '',
        baseline_finish: '',
        current_finish: '',
        forecast_finish: '',
        notes: '',
        file: null,
      })

      setUploading(false)
      await loadData()
    } catch (error: any) {
      setNotice(error?.message || 'Schedule revision upload failed.')
      setUploading(false)
    }
  }

  async function activateRevision(id: string) {
    setNotice('')

    if (!canManage) {
      setNotice('Only PMO/Admin can activate schedule revisions.')
      return
    }

    const { error } = await supabase.rpc('activate_schedule_revision', {
      p_revision_id: id,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    await supabase
      .from('schedule_revisions')
      .update({ activated_by: user?.id || null })
      .eq('id', id)

    await loadData()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Schedule Control
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Schedule Revisions
        </h1>

        <p className="text-slate-400 mt-3 max-w-3xl">
          Upload approved baseline, revised, recovery or catch-up programmes.
          Only one schedule can be active per project/package.
        </p>

        <div className="text-xs text-[#6e7d8c] mt-4">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      {!canManage && (
        <div className="card p-4 text-sm text-amber-400">
          View only. Only PMO/Admin can upload or activate schedule revisions.
        </div>
      )}

      {canManage && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={17} className="text-[#c49e48]" />
            <h2 className="font-bold text-[#ede8de]">
              Upload Approved Programme
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="form-control"
              placeholder="Revision name"
              value={form.revision_name}
              onChange={e =>
                setForm({ ...form, revision_name: e.target.value })
              }
            />

            <select
              className="form-control"
              value={form.revision_type}
              onChange={e =>
                setForm({ ...form, revision_type: e.target.value })
              }
            >
              {REVISION_TYPES.map(type => (
                <option key={type}>{type}</option>
              ))}
            </select>

            <input
              className="form-control"
              placeholder="Revision No. e.g. Rev 2"
              value={form.revision_no}
              onChange={e => setForm({ ...form, revision_no: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <select
              className="form-control"
              value={form.block_id}
              onChange={e => onPackageChange(e.target.value)}
            >
              <option value="">Project-wide schedule</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.package_name || pkg.block_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form-control"
              value={form.planned_start}
              onChange={e =>
                setForm({ ...form, planned_start: e.target.value })
              }
            />

            <input
              type="date"
              className="form-control"
              value={form.planned_finish}
              onChange={e =>
                setForm({ ...form, planned_finish: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input
              type="date"
              className="form-control"
              value={form.baseline_finish}
              onChange={e =>
                setForm({ ...form, baseline_finish: e.target.value })
              }
              title="Baseline Finish"
            />

            <input
              type="date"
              className="form-control"
              value={form.current_finish}
              onChange={e =>
                setForm({ ...form, current_finish: e.target.value })
              }
              title="Current Finish"
            />

            <input
              type="date"
              className="form-control"
              value={form.forecast_finish}
              onChange={e =>
                setForm({ ...form, forecast_finish: e.target.value })
              }
              title="Forecast Finish"
            />
          </div>

          <textarea
            className="form-control mt-3"
            rows={2}
            placeholder="Reason for revision"
            value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
          />

          <textarea
            className="form-control mt-3"
            rows={2}
            placeholder="Notes"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />

          <input
            type="file"
            className="form-control mt-3"
            accept=".xlsx,.xls,.csv,.xml,.pdf,.mpp"
            onChange={e =>
              setForm({
                ...form,
                file: e.target.files?.[0] || null,
              })
            }
          />

          <button
            className="btn btn-gold mt-4"
            onClick={createRevision}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Save Revision'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-slate-400">Loading revisions…</div>
      ) : revisions.length === 0 ? (
        <div className="card p-8 text-center text-[#6e7d8c]">
          No schedule revisions uploaded yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Revision</th>
                <th>Type</th>
                <th>Package</th>
                <th>Status</th>
                <th>Active</th>
                <th>Planned Finish</th>
                <th>Forecast Finish</th>
                <th>File</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {revisions.map(item => (
                <tr key={item.id}>
                  <td className="font-medium text-[#ede8de]">
                    {item.revision_name}
                    {item.revision_no ? (
                      <div className="text-[10px] text-[#6e7d8c]">
                        {item.revision_no}
                      </div>
                    ) : null}
                  </td>

                  <td>{item.revision_type || '—'}</td>

                  <td>{item.package_name || 'Project Wide'}</td>

                  <td>
                    <span className="badge badge-muted">
                      {item.status || 'Draft'}
                    </span>
                  </td>

                  <td>
                    {item.is_active ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-muted">No</span>
                    )}
                  </td>

                  <td>{item.planned_finish ? fdate(item.planned_finish) : '—'}</td>

                  <td>
                    {item.forecast_finish ? fdate(item.forecast_finish) : '—'}
                  </td>

                  <td>
                    {item.file_url ? (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="tbl-action"
                      >
                        <FileSpreadsheet size={13} />
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td>
                    {canManage && !item.is_active && (
                      <button
                        className="btn btn-gold btn-sm"
                        onClick={() => activateRevision(item.id)}
                      >
                        <CheckCircle size={13} />
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

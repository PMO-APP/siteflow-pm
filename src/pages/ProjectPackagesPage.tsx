import { useEffect, useState } from 'react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAuthStore } from '@/store/auth'

const PACKAGE_TYPES = [
  'Building',
  'Block',
  'Tower',
  'Zone',
  'Infrastructure',
  'Road Section',
  'Utility Package',
  'Renovation Area',
  'External Works',
  'Other',
]

const STATUSES = [
  'Not Started',
  'In Progress',
  'On Track',
  'Behind',
  'Stuck',
  'Completed',
]

export default function ProjectPackagesPage() {
  const { user } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    block_name: '',
    package_name: '',
    package_type: 'Building',
    package_label: 'Package',
    contractor_name: '',
    progress_weight: '',
    units_count: '',
    planned_start: '',
    planned_finish: '',
    progress_pct: '',
    status: 'Not Started',
    remarks: '',
  })

  useEffect(() => {
    loadPackages()
  }, [projectId])

  async function loadPackages() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('project_blocks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setPackages(data || [])
    setLoading(false)
  }

  async function addPackage() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!form.block_name.trim()) {
      setNotice('Package name is required.')
      return
    }

    const nextOrder = packages.length + 1
    const packageName = form.package_name.trim() || form.block_name.trim()

    const { error } = await supabase.from('project_blocks').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,

      block_name: form.block_name.trim(),
      package_name: packageName,
      package_type: form.package_type,
      package_label: form.package_label || 'Package',

      contractor_name: form.contractor_name.trim() || null,
      discipline: 'General',

      progress_weight: Number(form.progress_weight || 0),
      units_count: Number(form.units_count || 0),

      planned_start: form.planned_start || null,
      planned_finish: form.planned_finish || null,

      progress_pct: Number(form.progress_pct || 0),
      status: form.status,
      remarks: form.remarks.trim() || null,

      sort_order: nextOrder,
      is_active: true,
      created_by: user?.id || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setForm({
      block_name: '',
      package_name: '',
      package_type: 'Building',
      package_label: 'Package',
      contractor_name: '',
      progress_weight: '',
      units_count: '',
      planned_start: '',
      planned_finish: '',
      progress_pct: '',
      status: 'Not Started',
      remarks: '',
    })

    await loadPackages()
  }

  async function deletePackage(id: string) {
    const confirmed = window.confirm(
      'Delete this project package? Reports linked to it may lose their package reference.'
    )

    if (!confirmed) return

    const { error } = await supabase.from('project_blocks').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadPackages()
  }

  const totalWeight = packages.reduce(
    (sum, item) => sum + Number(item.progress_weight || 0),
    0
  )

  const weightedProgress = packages.reduce((sum, item) => {
    const weight = Number(item.progress_weight || 0)
    const progress = Number(item.progress_pct || 0)

    return sum + (weight * progress) / 100
  }, 0)

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Project Setup
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Project Packages
        </h1>

        <p className="text-slate-400 mt-3 max-w-3xl">
          Set up blocks, towers, zones, infrastructure sections, road packages
          or work areas so progress can be reported accurately by package.
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric title="Packages" value={packages.length} />
        <Metric title="Total Weight" value={`${totalWeight}%`} />
        <Metric
          title="Weighted Progress"
          value={`${weightedProgress.toFixed(1)}%`}
        />
        <Metric
          title="Completed"
          value={packages.filter(item => item.status === 'Completed').length}
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#c49e48]" />

          <h2 className="font-bold text-[#ede8de]">Add Project Package</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="form-control"
            placeholder="Package / Block name e.g. B5-B6"
            value={form.block_name}
            onChange={event =>
              setForm({
                ...form,
                block_name: event.target.value,
                package_name: event.target.value,
              })
            }
          />

          <select
            className="form-control"
            value={form.package_type}
            onChange={event =>
              setForm({ ...form, package_type: event.target.value })
            }
          >
            {PACKAGE_TYPES.map(type => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <input
            className="form-control"
            placeholder="Contractor"
            value={form.contractor_name}
            onChange={event =>
              setForm({ ...form, contractor_name: event.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <input
            type="number"
            className="form-control"
            placeholder="Weight %"
            value={form.progress_weight}
            onChange={event =>
              setForm({ ...form, progress_weight: event.target.value })
            }
          />

          <input
            type="number"
            className="form-control"
            placeholder="Units count"
            value={form.units_count}
            onChange={event =>
              setForm({ ...form, units_count: event.target.value })
            }
          />

          <input
            type="number"
            className="form-control"
            placeholder="Current progress %"
            value={form.progress_pct}
            onChange={event =>
              setForm({ ...form, progress_pct: event.target.value })
            }
          />

          <select
            className="form-control"
            value={form.status}
            onChange={event =>
              setForm({ ...form, status: event.target.value })
            }
          >
            {STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input
            type="date"
            className="form-control"
            value={form.planned_start}
            onChange={event =>
              setForm({ ...form, planned_start: event.target.value })
            }
          />

          <input
            type="date"
            className="form-control"
            value={form.planned_finish}
            onChange={event =>
              setForm({ ...form, planned_finish: event.target.value })
            }
          />
        </div>

        <textarea
          className="form-control mt-3"
          rows={2}
          placeholder="Remarks"
          value={form.remarks}
          onChange={event =>
            setForm({ ...form, remarks: event.target.value })
          }
        />

        <button className="btn btn-gold mt-4" onClick={addPackage}>
          Save Package
        </button>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading packages…</div>
      ) : packages.length === 0 ? (
        <div className="card p-8 text-center text-[#6e7d8c]">
          No project packages yet. Add blocks, towers, zones, or infrastructure
          packages for this project.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Package</th>
                <th>Type</th>
                <th>Contractor</th>
                <th>Weight</th>
                <th>Progress</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {packages.map(item => (
                <tr key={item.id}>
                  <td className="font-medium text-[#ede8de]">
                    {item.package_name || item.block_name}
                  </td>

                  <td>{item.package_type || item.block_type || 'Package'}</td>

                  <td>{item.contractor_name || '—'}</td>

                  <td>{Number(item.progress_weight || 0)}%</td>

                  <td className="text-[#c49e48] font-semibold">
                    {Number(item.progress_pct || 0)}%
                  </td>

                  <td>
                    <span className="badge badge-muted">
                      {item.status || 'Not Started'}
                    </span>
                  </td>

                  <td>
                    <button
                      className="tbl-action text-red-400"
                      onClick={() => deletePackage(item.id)}
                    >
                      <Trash2 size={13} />
                    </button>
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

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <Building2 size={18} className="text-[#c49e48]" />

      <div className="text-2xl font-black text-white mt-3">{value}</div>

      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}

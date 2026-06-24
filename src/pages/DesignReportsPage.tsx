import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, PenTool } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'

const CATEGORIES = [
  'Drawings Issued',
  'Pending Approvals',
  'Consultant Updates',
  'RFIs',
  'Material Approvals',
  'Finish Approvals',
  'Design Changes',
  'Authority Approvals',
]

const STATUSES = ['Open', 'In Progress', 'Pending', 'Approved', 'Closed']

export default function DesignReportsPage() {
  const { user } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const [reportWeek, setReportWeek] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [form, setForm] = useState({
    category: 'Drawings Issued',
    title: '',
    description: '',
    consultant_name: '',
    status: 'Open',
    due_date: '',
  })

  useEffect(() => {
    loadReports()
  }, [projectId, reportWeek])

  async function loadReports() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('design_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_week', reportWeek)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setItems(data || [])
    setLoading(false)
  }

  async function addItem() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!form.title.trim()) {
      setNotice('Title is required.')
      return
    }

    const { error } = await supabase.from('design_reports').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: reportWeek,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      consultant_name: form.consultant_name.trim() || null,
      status: form.status,
      due_date: form.due_date || null,
      created_by: user?.id || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setForm({
      category: 'Drawings Issued',
      title: '',
      description: '',
      consultant_name: '',
      status: 'Open',
      due_date: '',
    })

    await loadReports()
  }

  async function deleteItem(id: string) {
    const confirmed = window.confirm('Delete this design report item?')
    if (!confirmed) return

    const { error } = await supabase.from('design_reports').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadReports()
  }

  const groupedItems = useMemo(() => {
    return CATEGORIES.map(category => ({
      category,
      items: items.filter(item => item.category === category),
    }))
  }, [items])

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Design Control
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Design Reports
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Track drawings, consultant updates, RFIs, approvals, design changes
          and authority items for PMO reporting.
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
        <Metric title="Total Items" value={items.length} />
        <Metric
          title="Pending"
          value={items.filter(item => item.status === 'Pending').length}
        />
        <Metric
          title="Approved"
          value={items.filter(item => item.status === 'Approved').length}
        />
        <Metric
          title="Closed"
          value={items.filter(item => item.status === 'Closed').length}
        />
      </div>

      <div className="card p-4">
        <label className="form-label">Report Week</label>
        <input
          type="date"
          className="form-control max-w-xs"
          value={reportWeek}
          onChange={e => setReportWeek(e.target.value)}
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#c49e48]" />
          <h2 className="font-bold text-[#ede8de]">Add Design Report Item</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="form-control"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <input
            className="form-control"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />

          <input
            className="form-control"
            placeholder="Consultant / reviewer"
            value={form.consultant_name}
            onChange={e =>
              setForm({ ...form, consultant_name: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <select
            className="form-control"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-control"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
          />
        </div>

        <textarea
          className="form-control mt-3"
          rows={3}
          placeholder="Description / update"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <button className="btn btn-gold mt-4" onClick={addItem}>
          Save Design Report
        </button>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading design reports…</div>
      ) : (
        <div className="space-y-5">
          {groupedItems.map(group => (
            <div key={group.category} className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="font-bold text-[#ede8de]">
                  {group.category}
                </div>

                <div className="text-xs text-[#6e7d8c]">
                  {group.items.length} item(s)
                </div>
              </div>

              {group.items.length === 0 ? (
                <div className="p-5 text-sm text-[#6e7d8c]">
                  No entries for this section.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Consultant</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Description</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.items.map(item => (
                        <tr key={item.id}>
                          <td className="font-medium text-[#ede8de]">
                            {item.title}
                          </td>

                          <td>{item.consultant_name || '—'}</td>

                          <td>
                            <span className="badge badge-muted">
                              {item.status || 'Open'}
                            </span>
                          </td>

                          <td>{item.due_date || '—'}</td>

                          <td className="max-w-[360px] text-slate-400">
                            {item.description || '—'}
                          </td>

                          <td>
                            <button
                              className="tbl-action text-red-400"
                              onClick={() => deleteItem(item.id)}
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
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <PenTool size={18} className="text-[#c49e48]" />

      <div className="text-2xl font-black text-white mt-3">{value}</div>

      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}

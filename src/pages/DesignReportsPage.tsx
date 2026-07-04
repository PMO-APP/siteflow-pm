import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, PenTool } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

const TABS = [
  ['overview', 'Overview'],
  ['drawings', 'Drawing Register'],
  ['consultants', 'Consultants'],
  ['issues', 'Design Issues'],
  ['weekly', 'Weekly Commentary'],
]

const MANUAL_CATEGORIES = [
  'Consultant Update',
  'Design Issue',
  'Weekly Achievement',
  'Weekly Challenge',
  'Next Week Focus',
]

const STATUSES = ['Open', 'In Progress', 'Pending', 'Approved', 'Closed']

function canEditDesignReports(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'overall_project_owner',
    'design_project_owner',
    'design',
  ].includes(role || '')
}

export default function DesignReportsPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const canEdit = canEditDesignReports(role)

  const [activeTab, setActiveTab] = useState('overview')
  const [drawings, setDrawings] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const [reportWeek, setReportWeek] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [form, setForm] = useState({
    category: 'Consultant Update',
    title: '',
    description: '',
    consultant_name: '',
    status: 'Open',
    due_date: '',
    management_attention: false,
  })

  useEffect(() => {
    loadData()
  }, [projectId, reportWeek])

  async function loadData() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: drawingData, error: drawingError } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'Drawing')
      .order('revision_date', { ascending: false })

    if (drawingError) {
      setNotice(drawingError.message)
      setLoading(false)
      return
    }

    const { data: reportData, error: reportError } = await supabase
      .from('design_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_week', reportWeek)
      .order('created_at', { ascending: false })

    if (reportError) {
      setNotice(reportError.message)
      setLoading(false)
      return
    }

    setDrawings(drawingData || [])
    setItems(reportData || [])
    setLoading(false)
  }

  async function addItem() {
    setNotice('')

    if (!canEdit) {
      setNotice(
        'View only. Only Admin, PMO and assigned Design Project Owners can update Design Reports.'
      )
      return
    }

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
      source: 'Manual',
      management_attention: form.management_attention,
      created_by: user?.id || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setForm({
      category: 'Consultant Update',
      title: '',
      description: '',
      consultant_name: '',
      status: 'Open',
      due_date: '',
      management_attention: false,
    })

    await loadData()
  }

  async function deleteItem(id: string) {
    if (!canEdit) {
      setNotice(
        'View only. Only Admin, PMO and assigned Design Project Owners can delete Design Report items.'
      )
      return
    }

    const confirmed = window.confirm('Delete this design report item?')
    if (!confirmed) return

    const { error } = await supabase.from('design_reports').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadData()
  }

  const approvedDrawings = drawings.filter(
    item =>
      item.status === 'Approved' ||
      item.approval_status === 'Approved' ||
      item.status === 'Current'
  )

  const pendingDrawings = drawings.filter(
    item =>
      item.status === 'Pending Review' ||
      item.status === 'For Review' ||
      item.approval_status === 'Pending Review' ||
      item.review_status === 'Pending Review'
  )

  const rejectedDrawings = drawings.filter(
    item => item.status === 'Rejected' || item.approval_status === 'Rejected'
  )

  const consultantSummary = useMemo(() => {
    const map: Record<string, any> = {}

    drawings.forEach(drawing => {
      const name =
        drawing.consultant_name || drawing.issued_by || 'Unassigned Consultant'

      if (!map[name]) {
        map[name] = {
          consultant: name,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        }
      }

      map[name].total += 1

      if (
        drawing.status === 'Approved' ||
        drawing.approval_status === 'Approved' ||
        drawing.status === 'Current'
      ) {
        map[name].approved += 1
      }

      if (
        drawing.status === 'Pending Review' ||
        drawing.status === 'For Review' ||
        drawing.review_status === 'Pending Review'
      ) {
        map[name].pending += 1
      }

      if (
        drawing.status === 'Rejected' ||
        drawing.approval_status === 'Rejected'
      ) {
        map[name].rejected += 1
      }
    })

    return Object.values(map)
  }, [drawings])

  const consultantUpdates = items.filter(
    item => item.category === 'Consultant Update'
  )

  const designIssues = items.filter(item => item.category === 'Design Issue')

  const weeklyItems = items.filter(item =>
    ['Weekly Achievement', 'Weekly Challenge', 'Next Week Focus'].includes(
      item.category
    )
  )

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Design Management
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Design Management
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Drawing status is automatically pulled from Document Control. Manual
          input is only for consultant updates, design issues and weekly
          commentary.
        </p>

        <div className="text-xs text-[#6e7d8c] mt-4">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>

        {!canEdit && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            View Only. Only Admin, PMO and assigned Design Project Owners can update Design Reports.
          </div>
        )}
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <div className="card p-4">
        <label className="form-label">Report Week</label>
        <input
          type="date"
          className="form-control max-w-xs"
          value={reportWeek}
          onChange={e => setReportWeek(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`btn btn-sm ${
              activeTab === value ? 'btn-gold' : 'btn-ghost'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading design data…</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              drawings={drawings}
              approvedDrawings={approvedDrawings}
              pendingDrawings={pendingDrawings}
              rejectedDrawings={rejectedDrawings}
              designIssues={designIssues}
              weeklyItems={weeklyItems}
            />
          )}

          {activeTab === 'drawings' && <DrawingRegister drawings={drawings} />}

          {activeTab === 'consultants' && (
            <ConsultantsTab
              consultantSummary={consultantSummary}
              consultantUpdates={consultantUpdates}
              form={form}
              setForm={setForm}
              addItem={addItem}
              deleteItem={deleteItem}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'issues' && (
            <ManualTab
              title="Design Issues / Blockers"
              defaultCategory="Design Issue"
              items={designIssues}
              form={form}
              setForm={setForm}
              addItem={addItem}
              deleteItem={deleteItem}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'weekly' && (
            <ManualTab
              title="Weekly Commentary"
              defaultCategory="Weekly Achievement"
              items={weeklyItems}
              form={form}
              setForm={setForm}
              addItem={addItem}
              deleteItem={deleteItem}
              canEdit={canEdit}
            />
          )}
        </>
      )}
    </div>
  )
}

function OverviewTab({
  drawings,
  approvedDrawings,
  pendingDrawings,
  rejectedDrawings,
  designIssues,
  weeklyItems,
}: any) {
  return (
    <div className="space-y-5">
      <MetricGrid
        values={[
          ['Total Drawings', drawings.length],
          ['Approved', approvedDrawings.length],
          ['Pending Review', pendingDrawings.length],
          ['Rejected', rejectedDrawings.length],
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-bold text-[#ede8de] mb-3">
            Design Executive Summary
          </h2>

          <div className="space-y-3 text-sm text-slate-400">
            <p>
              Total drawings in Document Control:{' '}
              <span className="text-[#c49e48] font-semibold">
                {drawings.length}
              </span>
              .
            </p>

            <p>
              Approved drawings:{' '}
              <span className="text-emerald-400 font-semibold">
                {approvedDrawings.length}
              </span>
              .
            </p>

            <p>
              Pending review:{' '}
              <span className="text-amber-400 font-semibold">
                {pendingDrawings.length}
              </span>
              .
            </p>

            <p>
              Open design issues:{' '}
              <span className="text-red-400 font-semibold">
                {designIssues.filter((item: any) => item.status !== 'Closed')
                  .length}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-[#ede8de] mb-3">
            Weekly Commentary
          </h2>

          {weeklyItems.length === 0 ? (
            <div className="text-sm text-[#6e7d8c]">
              No weekly commentary submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {weeklyItems.slice(0, 5).map((item: any) => (
                <div key={item.id} className="text-sm">
                  <div className="text-[#c49e48] font-semibold">
                    {item.category}
                  </div>
                  <div className="text-slate-400">{item.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DrawingRegister({ drawings }: { drawings: any[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="font-bold text-[#ede8de]">Drawing Register</div>
        <div className="text-xs text-[#6e7d8c]">
          Auto-filled from Document Control.
        </div>
      </div>

      {drawings.length === 0 ? (
        <div className="p-6 text-sm text-[#6e7d8c]">
          No drawings found. Upload drawings from the Documents page first.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl min-w-[1100px]">
            <thead>
              <tr>
                <th>Drawing No.</th>
                <th>Title</th>
                <th>Discipline</th>
                <th>Rev</th>
                <th>Status</th>
                <th>Issued For</th>
                <th>Consultant</th>
                <th>Rev Date</th>
              </tr>
            </thead>

            <tbody>
              {drawings.map(drawing => (
                <tr key={drawing.id}>
                  <td className="font-mono text-[#c49e48]">
                    {drawing.drawing_number ||
                      drawing.document_number ||
                      '—'}
                  </td>
                  <td className="font-medium text-[#ede8de]">
                    {drawing.title}
                  </td>
                  <td>{drawing.discipline || '—'}</td>
                  <td>{drawing.revision_no || drawing.revision || '—'}</td>
                  <td>
                    <span className="badge badge-muted">
                      {drawing.approval_status ||
                        drawing.review_status ||
                        drawing.status ||
                        '—'}
                    </span>
                  </td>
                  <td>{drawing.issued_for || '—'}</td>
                  <td>{drawing.consultant_name || drawing.issued_by || '—'}</td>
                  <td>{drawing.revision_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ConsultantsTab({
  consultantSummary,
  consultantUpdates,
  form,
  setForm,
  addItem,
  deleteItem,
  canEdit,
}: any) {
  return (
    <div className="space-y-5">
      <MetricGrid
        values={[
          ['Consultants', consultantSummary.length],
          [
            'Total Drawings',
            consultantSummary.reduce(
              (sum: number, item: any) => sum + item.total,
              0
            ),
          ],
          [
            'Approved',
            consultantSummary.reduce(
              (sum: number, item: any) => sum + item.approved,
              0
            ),
          ],
          [
            'Pending',
            consultantSummary.reduce(
              (sum: number, item: any) => sum + item.pending,
              0
            ),
          ],
        ]}
      />

      <div className="card overflow-x-auto">
        <table className="tbl min-w-[900px]">
          <thead>
            <tr>
              <th>Consultant</th>
              <th>Total Drawings</th>
              <th>Approved</th>
              <th>Pending</th>
              <th>Rejected</th>
            </tr>
          </thead>

          <tbody>
            {consultantSummary.map((item: any) => (
              <tr key={item.consultant}>
                <td className="font-medium text-[#ede8de]">
                  {item.consultant}
                </td>
                <td>{item.total}</td>
                <td>{item.approved}</td>
                <td>{item.pending}</td>
                <td>{item.rejected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ManualTab
        title="Consultant Updates"
        defaultCategory="Consultant Update"
        items={consultantUpdates}
        form={form}
        setForm={setForm}
        addItem={addItem}
        deleteItem={deleteItem}
        canEdit={canEdit}
      />
    </div>
  )
}

function ManualTab({
  title,
  defaultCategory,
  items,
  form,
  setForm,
  addItem,
  deleteItem,
  canEdit,
}: any) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#c49e48]" />
          <h2 className="font-bold text-[#ede8de]">{title}</h2>
        </div>

        {!canEdit && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            View Only. You can read this report, but cannot add, edit or delete updates.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.category}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {MANUAL_CATEGORIES.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <input
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Title"
            value={form.title}
            disabled={!canEdit}
            onChange={e =>
              setForm({
                ...form,
                title: e.target.value,
                category: form.category || defaultCategory,
              })
            }
          />

          <input
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Consultant / responsible party"
            value={form.consultant_name}
            disabled={!canEdit}
            onChange={e =>
              setForm({ ...form, consultant_name: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <select
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.status}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-control disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.due_date}
            disabled={!canEdit}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
          />
        </div>

        <textarea
          className="form-control mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
          rows={3}
          placeholder="Update / description"
          value={form.description}
          disabled={!canEdit}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <label className={`flex items-center gap-2 text-sm text-slate-400 mt-3 ${!canEdit ? 'opacity-60' : ''}`}>
          <input
            type="checkbox"
            checked={form.management_attention}
            disabled={!canEdit}
            onChange={e =>
              setForm({ ...form, management_attention: e.target.checked })
            }
          />
          Requires management attention
        </label>

        {canEdit && (
          <button className="btn btn-gold mt-4" onClick={addItem}>
            Save Update
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-sm text-[#6e7d8c]">
          No manual updates submitted yet.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[1200px]">
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>Responsible</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.category}</td>
                  <td className="font-medium text-[#ede8de]">{item.title}</td>
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
                    {canEdit ? (
                      <button
                        className="tbl-action text-red-400"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">
                        View Only
                      </span>
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

function MetricGrid({ values }: { values: [string, string | number][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {values.map(([title, value]) => (
        <Metric key={title} title={title} value={value} />
      ))}
    </div>
  )
}

function Metric({ title, value }: { title: string | number; value: string | number }) {
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

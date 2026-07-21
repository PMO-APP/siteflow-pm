import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareText, Plus, Search } from 'lucide-react'
import { useProjectStore } from '@/store/project'
import RFIStatusBadge from '../components/RFIStatusBadge'
import { useRFIs } from '../hooks/useRFIs'
import type { RFIDiscipline, RFIFilters, RFIPriority, RFIStatus } from '../types'

const statuses: Array<RFIStatus | 'all'> = ['all', 'Draft', 'Submitted', 'Under Review', 'Answered', 'Closed', 'Rejected']
const priorities: Array<RFIPriority | 'all'> = ['all', 'Low', 'Medium', 'High', 'Critical']
const disciplines: Array<RFIDiscipline | 'all'> = ['all', 'Architectural', 'Structural', 'MEP', 'Civil', 'Commercial', 'HSE', 'General']

export default function RFIRegisterPage() {
  const projectId = useProjectStore((state) => state.projectId)
  const [filters, setFilters] = useState<RFIFilters>({ search: '', status: 'all', priority: 'all', discipline: 'all' })
  const { data = [], isLoading, error } = useRFIs(projectId, filters)

  const summary = useMemo(() => ({
    open: data.filter((rfi) => !['Closed', 'Rejected'].includes(rfi.status)).length,
    overdue: data.filter((rfi) => Boolean(rfi.due_date) && new Date(rfi.due_date as string) < new Date() && !['Answered', 'Closed', 'Rejected'].includes(rfi.status)).length,
    answered: data.filter((rfi) => rfi.status === 'Answered').length,
    closed: data.filter((rfi) => rfi.status === 'Closed').length,
  }), [data])

  if (!projectId) return <div className="panel p-8 text-center text-slate-400">Select a project to view its RFIs.</div>

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-[#c49e48]">Technical coordination</p>
          <h1 className="mt-1 text-2xl font-semibold">RFI Register</h1>
          <p className="mt-1 text-sm text-slate-400">Track questions, responsibility, response time and closure.</p>
        </div>
        <Link to="/app/rfis/new" className="btn-primary inline-flex items-center gap-2"><Plus size={16} />New RFI</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Open', summary.open],
          ['Overdue', summary.overdue],
          ['Answered', summary.answered],
          ['Closed', summary.closed],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-500" />
            <input className="form-control pl-9" placeholder="Search RFIs..." value={filters.search ?? ''} onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))} />
          </div>
          <select className="form-control" value={filters.status ?? 'all'} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value as RFIStatus | 'all' }))}>
            {statuses.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status}</option>)}
          </select>
          <select className="form-control" value={filters.priority ?? 'all'} onChange={(e) => setFilters((current) => ({ ...current, priority: e.target.value as RFIPriority | 'all' }))}>
            {priorities.map((priority) => <option key={priority} value={priority}>{priority === 'all' ? 'All priorities' : priority}</option>)}
          </select>
          <select className="form-control" value={filters.discipline ?? 'all'} onChange={(e) => setFilters((current) => ({ ...current, discipline: e.target.value as RFIDiscipline | 'all' }))}>
            {disciplines.map((discipline) => <option key={discipline} value={discipline}>{discipline === 'all' ? 'All disciplines' : discipline}</option>)}
          </select>
        </div>

        {isLoading ? <div className="p-8 text-slate-400">Loading RFIs…</div> :
          error ? <div className="p-8 text-red-300">{(error as Error).message}</div> :
          data.length === 0 ? <div className="p-10 text-center"><MessageSquareText className="mx-auto text-slate-600" /><p className="mt-3 text-slate-400">No RFIs found.</p></div> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.03] text-left text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="p-4">Reference</th><th className="p-4">Title</th><th className="p-4">Discipline</th><th className="p-4">Priority</th><th className="p-4">Due</th><th className="p-4">Status</th></tr>
              </thead>
              <tbody>
                {data.map((rfi) => (
                  <tr key={rfi.id} className="border-t border-white/[.06] hover:bg-white/[.025]">
                    <td className="p-4"><Link className="font-medium text-[#c49e48]" to={`/app/rfis/${rfi.id}`}>{rfi.reference_no}</Link></td>
                    <td className="p-4 text-slate-200">{rfi.title}</td>
                    <td className="p-4 text-slate-400">{rfi.discipline}</td>
                    <td className="p-4 text-slate-400">{rfi.priority}</td>
                    <td className="p-4 text-slate-400">{rfi.due_date || '—'}</td>
                    <td className="p-4"><RFIStatusBadge status={rfi.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </div>
    </section>
  )
}

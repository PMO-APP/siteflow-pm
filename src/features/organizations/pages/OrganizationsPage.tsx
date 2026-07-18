import { useMemo, useState } from 'react'
import { Building2, Plus, Search, Users, Briefcase } from 'lucide-react'
import { useOrganizations } from '../hooks'
import CreateOrganizationDialog from '../components/CreateOrganizationDialog'

function formatType(value: string) {
  return value.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export default function OrganizationsPage() {
  const { data = [], isLoading, error } = useOrganizations()
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return data
    return data.filter(item =>
      `${item.name} ${item.organization_type} ${item.email || ''}`.toLowerCase().includes(normalized)
    )
  }, [data, query])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Administration</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">Organizations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage consultants, contractors and vendors, then assign each organization and its personnel to the correct projects.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={18} /> Add organization
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<Building2 size={18} />} label="Organizations" value={String(data.length)} />
        <Metric icon={<Briefcase size={18} />} label="Active" value={String(data.filter(item => item.status === 'active').length)} />
        <Metric icon={<Users size={18} />} label="External network" value="Multi-project" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search organizations" className="w-full rounded-lg border border-slate-300 bg-transparent py-2.5 pl-10 pr-3 text-sm dark:border-slate-700" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading organizations…</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-600">Unable to load organizations: {String(error.message || error)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto text-slate-300" size={34} />
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No organizations found</h2>
            <p className="mt-1 text-sm text-slate-500">Create the first external organization to begin assigning projects.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map(item => (
              <div key={item.id} className="grid gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:grid-cols-[1.4fr_1fr_0.7fr] sm:items-center">
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white">{item.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.email || 'No contact email'}</div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{formatType(item.organization_type)}</div>
                <div className="sm:text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateOrganizationDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm text-slate-500">{icon}{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  )
}

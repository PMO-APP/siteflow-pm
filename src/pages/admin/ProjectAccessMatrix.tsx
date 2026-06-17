import { useEffect, useMemo, useState } from 'react'
import { FolderKanban, RefreshCw, Search, Shield, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ALL_PROJECT_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
  'design',
  'housebuild',
  'hse_manager',
  'hse_officer',
  'costing',
  'infrastructure',
  'mep',
  'viewer',
  'guest',
]

function formatRole(role?: string | null) {
  if (!role) return 'Team Member'

  const labels: Record<string, string> = {
    workspace_admin: 'Workspace Admin',
    admin: 'Administrator',
    pmo: 'PMO',
    portfolio_manager: 'Portfolio Manager',
    project_owner: 'Project Owner',
    consultant: 'Consultant',
    hse_manager: 'HSE Manager',
    hse_officer: 'HSE Officer',
    contractor: 'Contractor',
    vendor: 'Vendor',
    subcontractor: 'Subcontractor',
    design: 'Design',
    housebuild: 'Housebuild',
    costing: 'Costing',
    infrastructure: 'Infrastructure',
    mep: 'MEP',
    viewer: 'Viewer',
    guest: 'Guest',
    overall_project_owner: 'Overall Project Owner',
    housebuild_project_owner: 'Housebuild Project Owner',
    mep_project_owner: 'MEP Project Owner',
    infrastructure_project_owner: 'Infrastructure Project Owner',
    hse_project_owner: 'HSE Project Owner',
  }

  return labels[role] || role.replace(/_/g, ' ')
}

export default function ProjectAccessMatrix() {
  const [memberships, setMemberships] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMatrix()
  }, [])

  async function loadMatrix() {
    setLoading(true)

    const [{ data: memberRows }, { data: projectRows }] = await Promise.all([
      supabase.from('memberships').select('*').order('full_name'),
      supabase.from('projects').select('id, project_name').order('project_name'),
    ])

    setMemberships(memberRows || [])
    setProjects(projectRows || [])
    setLoading(false)
  }

  const projectMap = useMemo(() => {
    return new Map(projects.map(project => [project.id, project.project_name]))
  }, [projects])

  const rows = useMemo(() => {
    const grouped = new Map<string, any>()

    memberships.forEach(membership => {
      const email = String(membership.email || '').toLowerCase()
      const key = `${email}-${membership.role}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          email: membership.email,
          fullName: membership.full_name,
          role: membership.role,
          accessScope: membership.access_scope,
          projectIds: [],
        })
      }

      const current = grouped.get(key)

      if (membership.project_id) {
        current.projectIds.push(membership.project_id)
      }
    })

    return Array.from(grouped.values()).map(row => {
      const role = String(row.role || '').toLowerCase()

      const hasAllProjectAccess =
        row.accessScope === 'workspace' || ALL_PROJECT_ROLES.includes(role)

      return {
        ...row,
        accessLabel: hasAllProjectAccess ? 'All Projects' : 'Selected Projects',
        projectNames: hasAllProjectAccess
          ? ['All Projects']
          : row.projectIds
              .map((id: number) => projectMap.get(id))
              .filter(Boolean),
      }
    })
  }, [memberships, projectMap])

  const filteredRows = rows.filter(row => {
    const term = search.toLowerCase().trim()

    if (!term) return true

    return (
      String(row.fullName || '').toLowerCase().includes(term) ||
      String(row.email || '').toLowerCase().includes(term) ||
      String(row.role || '').toLowerCase().includes(term) ||
      row.projectNames.join(' ').toLowerCase().includes(term)
    )
  })

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Access Governance
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#ede8de]">
          Project Access Matrix
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl text-sm">
          Review who has access to each project, including multi-project
          consultants, contractors, and project owners.
        </p>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-9"
            placeholder="Search by name, email, role, or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button onClick={loadMatrix} className="btn btn-ghost">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={Users} title="Users" value={rows.length} />
        <MetricCard icon={FolderKanban} title="Projects" value={projects.length} />
        <MetricCard
          icon={Shield}
          title="External / Selected Access"
          value={
            rows.filter(row => row.accessLabel === 'Selected Projects').length
          }
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400">Loading access matrix…</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No access records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-[#6e7d8c]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Access Type
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Projects</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, index) => (
                  <tr
                    key={`${row.email}-${row.role}-${index}`}
                    className="border-t border-white/[0.06]"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#ede8de]">
                        {row.fullName || 'Unnamed User'}
                      </div>

                      <div className="text-xs text-[#6e7d8c]">
                        {row.email || 'No email'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 px-2 py-1 text-xs text-[#c49e48]">
                        {formatRole(row.role)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {row.accessLabel}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {row.projectNames.length === 0 ? (
                          <span className="text-xs text-slate-500">
                            No project assigned
                          </span>
                        ) : (
                          row.projectNames.map((project: string) => (
                            <span
                              key={project}
                              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
                            >
                              {project}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function MetricCard({
  icon: Icon,
  title,
  value,
}: {
  icon: any
  title: string
  value: number
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-black text-white">{value}</div>
          <div className="text-xs text-slate-500 mt-1">{title}</div>
        </div>

        <Icon size={22} className="text-[#c49e48]" />
      </div>
    </div>
  )
}

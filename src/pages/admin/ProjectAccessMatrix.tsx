import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  FolderKanban,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { replaceMemberProjectAssignments } from '@/access/canonicalMembershipAdminService'

const WORKSPACE_WIDE_ROLES = new Set([
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
])

const ROLE_LABELS: Record<string, string> = {
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

function formatRole(role?: string | null) {
  if (!role) return 'Team Member'
  return ROLE_LABELS[role] || role.replace(/_/g, ' ')
}

type AccessRow = {
  key: string
  email: string
  fullName: string
  userId: string | null
  organizationId: number | null
  role: string
  accessScope: string
  membershipIds: number[]
  projectIds: number[]
  hasAllProjectAccess: boolean
}

export default function ProjectAccessMatrix() {
  const { activeWorkspace } = useWorkspace()
  const [memberships, setMemberships] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState<AccessRow | null>(null)
  const [draftProjectIds, setDraftProjectIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    loadMatrix()
  }, [])

  async function loadMatrix() {
    setLoading(true)
    setErrorMessage('')

    const [{ data: memberRows, error: memberError }, { data: projectRows, error: projectError }] =
      await Promise.all([
        activeWorkspace
          ? supabase.from('workspace_member_access_summary').select('*').eq('workspace_id', activeWorkspace.id).order('user_id')
          : Promise.resolve({ data: [], error: null }),
        supabase.from('projects').select('id, project_name, portfolio_id').order('project_name'),
      ])

    if (memberError || projectError) {
      setErrorMessage(memberError?.message || projectError?.message || 'Unable to load access records.')
    }

    setMemberships(memberRows || [])
    setProjects(projectRows || [])
    setLoading(false)
  }

  const projectMap = useMemo(
    () => new Map(projects.map(project => [Number(project.id), project.project_name])),
    [projects]
  )

  const rows = useMemo<AccessRow[]>(() => {
    return memberships.map((membership:any) => {
      const assignments = Array.isArray(membership.assignments) ? membership.assignments : []
      const scopeTypeOf = (item:any) => item?.scopeType ?? item?.scope_type
      const scopeIdOf = (item:any) => item?.scopeId ?? item?.scope_id
      const projectIds = assignments
        .filter((item:any) => scopeTypeOf(item) === 'project' && scopeIdOf(item) != null)
        .map((item:any) => Number(scopeIdOf(item)))
        .filter(Number.isFinite)
      const hasWorkspaceAccess = assignments.some((item:any) => scopeTypeOf(item) === 'workspace')
      const email = String(membership.email || '').trim().toLowerCase()
      const role = String(membership.role || '').trim().toLowerCase()
      return {
        key: `${membership.user_id}-${role}`,
        email,
        fullName: String(membership.full_name || membership.email || '').trim(),
        userId: membership.user_id || null,
        organizationId: membership.legacy_organization_id || null,
        role,
        accessScope: hasWorkspaceAccess ? 'workspace' : projectIds.length ? 'project' : 'none',
        membershipIds: [],
        projectIds: Array.from(new Set(projectIds)),
        hasAllProjectAccess: hasWorkspaceAccess || WORKSPACE_WIDE_ROLES.has(role),
      }
    })
  }, [memberships])

  const filteredRows = rows.filter(row => {
    const term = search.toLowerCase().trim()
    if (!term) return true
    const projectNames = row.projectIds.map(id => projectMap.get(id) || '').join(' ')
    return (
      row.fullName.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      row.role.toLowerCase().includes(term) ||
      projectNames.toLowerCase().includes(term)
    )
  })

  const selectedAccessCount = rows.filter(row => !row.hasAllProjectAccess).length

  function openAccessEditor(row: AccessRow) {
    setSelectedRow(row)
    setDraftProjectIds(row.projectIds)
    setNotice('')
    setErrorMessage('')
    setConfirmDelete(false)
  }

  function closeDrawer() {
    if (saving) return
    setSelectedRow(null)
    setDraftProjectIds([])
    setConfirmDelete(false)
  }

  function toggleProject(projectId: number) {
    setDraftProjectIds(current =>
      current.includes(projectId)
        ? current.filter(id => id !== projectId)
        : [...current, projectId]
    )
  }

  async function saveProjectAccess() {
    if (!selectedRow || selectedRow.hasAllProjectAccess) return
    if (draftProjectIds.length === 0) {
      setErrorMessage('Select at least one project, or remove the user from the workspace.')
      return
    }

    setSaving(true)
    setNotice('')
    setErrorMessage('')

    if (!activeWorkspace?.id || !selectedRow.userId) {
      setErrorMessage('Workspace and user identity are required to update access.')
      setSaving(false)
      return
    }

    try {
      await replaceMemberProjectAssignments({
        workspaceId: activeWorkspace.id,
        userId: selectedRow.userId,
        projectIds: draftProjectIds,
        role: selectedRow.role,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update project access.')
      setSaving(false)
      await loadMatrix()
      return
    }

    await supabase
      .from('project_team_members')
      .delete()
      .eq('email', selectedRow.email)
      .eq('role', selectedRow.role)

    await supabase.from('project_team_members').insert(
      draftProjectIds.map(projectId => ({
        project_id: projectId,
        email: selectedRow.email,
        full_name: selectedRow.fullName || null,
        role: selectedRow.role,
      }))
    )

    setNotice('Project access updated successfully.')
    await loadMatrix()
    setSelectedRow(current =>
      current ? { ...current, projectIds: draftProjectIds } : current
    )
    setSaving(false)
  }

  async function removeUser() {
    if (!selectedRow) return
    setSaving(true)
    setErrorMessage('')
    setNotice('')

    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: {
        userId: selectedRow.userId,
        email: selectedRow.email,
        workspaceId: activeWorkspace?.id,
      },
    })

    if (error || data?.error) {
      setErrorMessage(
        data?.error || error?.message || 'Unable to delete this user. Confirm the admin-delete-user function is deployed.'
      )
      setSaving(false)
      return
    }

    setSaving(false)
    closeDrawer()
    await loadMatrix()
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-[#dce6ed] bg-white px-6 py-7 shadow-[0_18px_50px_rgba(16,41,67,0.07)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff6b4a]/25 bg-[#fff5f2] px-3 py-1 text-xs font-semibold text-[#d95438]">
              <ShieldCheck size={14} /> Access governance
            </div>
            <h1 className="text-2xl font-black text-[#102943] sm:text-3xl">Project Access Matrix</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66788a]">
              Review every user’s delivery scope, add or remove project access, and remove users who should no longer enter the workspace.
            </p>
          </div>

          <button onClick={loadMatrix} className="btn btn-ghost self-start lg:self-auto">
            <RefreshCw size={15} /> Refresh records
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon={Users} title="Access profiles" value={rows.length} description="Unique user and role combinations" />
        <MetricCard icon={FolderKanban} title="Projects" value={projects.length} description="Available delivery environments" />
        <MetricCard icon={ShieldCheck} title="Selected access" value={selectedAccessCount} description="Users restricted to named projects" />
      </div>

      <div className="rounded-2xl border border-[#dce6ed] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8292a1]" />
          <input
            className="form-control pl-11"
            placeholder="Search by name, email, role, or project"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
      </div>

      {errorMessage && !selectedRow && (
        <div className="rounded-xl border border-[#f3b6aa] bg-[#fff4f1] px-4 py-3 text-sm text-[#a63f2d]">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-[24px] border border-[#dce6ed] bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-sm text-[#66788a]">Loading access records…</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center">
            <UserRound className="mx-auto mb-3 text-[#8da1b3]" size={30} />
            <div className="font-bold text-[#102943]">No access records found</div>
            <p className="mt-1 text-sm text-[#748596]">Try a different search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-[#dce6ed] bg-[#f7fafc] text-[#607487]">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em]">User</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em]">Role</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em]">Access</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em]">Projects</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.12em]">Manage</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => {
                  const names = row.hasAllProjectAccess
                    ? ['All projects']
                    : row.projectIds.map(id => projectMap.get(id)).filter(Boolean) as string[]

                  return (
                    <tr key={row.key} className="border-b border-[#edf2f5] last:border-b-0 hover:bg-[#fbfdfe]">
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf5f8] font-black text-[#2b6d88]">
                            {(row.fullName || row.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#102943]">{row.fullName || 'Unnamed user'}</div>
                            <div className="mt-0.5 text-xs text-[#758799]">{row.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <span className="inline-flex rounded-full border border-[#cfe0e8] bg-[#f2f8fa] px-3 py-1 text-xs font-semibold text-[#315f73]">
                          {formatRole(row.role)}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <div className="font-semibold text-[#314b60]">
                          {row.hasAllProjectAccess ? 'Workspace-wide' : 'Selected projects'}
                        </div>
                        <div className="mt-1 text-xs text-[#8292a1]">
                          {row.hasAllProjectAccess ? 'Access follows role permissions' : `${row.projectIds.length} project${row.projectIds.length === 1 ? '' : 's'} assigned`}
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex max-w-md flex-wrap gap-2">
                          {names.length === 0 ? (
                            <span className="text-xs text-[#9aa8b5]">No project assigned</span>
                          ) : (
                            names.slice(0, 4).map(name => (
                              <span key={name} className="rounded-lg border border-[#dce6ed] bg-white px-2.5 py-1 text-xs text-[#52697c]">
                                {name}
                              </span>
                            ))
                          )}
                          {names.length > 4 && <span className="px-1 py-1 text-xs font-semibold text-[#607487]">+{names.length - 4} more</span>}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-right">
                        <button
                          onClick={() => openAccessEditor(row)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#d4e0e7] bg-white px-3 py-2 text-xs font-bold text-[#173d5c] transition hover:border-[#9fb6c5] hover:bg-[#f6fafc]"
                        >
                          <Pencil size={14} /> Manage <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-[#102943]/35 backdrop-blur-[2px]" onMouseDown={event => {
          if (event.target === event.currentTarget) closeDrawer()
        }}>
          <aside className="flex h-full w-full max-w-xl flex-col bg-[#f7fafc] shadow-[-22px_0_60px_rgba(16,41,67,0.18)]">
            <header className="border-b border-[#dce6ed] bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#d95438]">Access control</div>
                  <h2 className="mt-1 text-xl font-black text-[#102943]">Manage user access</h2>
                  <p className="mt-1 text-sm text-[#66788a]">{selectedRow.fullName || selectedRow.email}</p>
                </div>
                <button onClick={closeDrawer} className="rounded-xl border border-[#dce6ed] bg-white p-2 text-[#607487] hover:bg-[#f3f7f9]" aria-label="Close access drawer">
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-2xl border border-[#dce6ed] bg-white p-5">
                <div className="grid grid-cols-2 gap-4">
                  <Summary label="Role" value={formatRole(selectedRow.role)} />
                  <Summary label="Access type" value={selectedRow.hasAllProjectAccess ? 'Workspace-wide' : 'Selected projects'} />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#dce6ed] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#102943]">Project assignments</h3>
                    <p className="mt-1 text-sm leading-5 text-[#748596]">
                      {selectedRow.hasAllProjectAccess
                        ? 'This role already has workspace-wide visibility. Change the role under Users & Roles to restrict it to named projects.'
                        : 'Select every project this user should be able to open and work within.'}
                    </p>
                  </div>
                  {!selectedRow.hasAllProjectAccess && (
                    <span className="rounded-full bg-[#edf5f8] px-3 py-1 text-xs font-bold text-[#315f73]">{draftProjectIds.length} selected</span>
                  )}
                </div>

                <div className="mt-5 space-y-2">
                  {projects.map(project => {
                    const checked = selectedRow.hasAllProjectAccess || draftProjectIds.includes(Number(project.id))
                    return (
                      <button
                        key={project.id}
                        type="button"
                        disabled={selectedRow.hasAllProjectAccess}
                        onClick={() => toggleProject(Number(project.id))}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          checked
                            ? 'border-[#9fc6d6] bg-[#f0f8fb]'
                            : 'border-[#dce6ed] bg-white hover:border-[#b6c8d3]'
                        } ${selectedRow.hasAllProjectAccess ? 'cursor-default opacity-70' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md border ${checked ? 'border-[#2b7894] bg-[#2b7894] text-white' : 'border-[#b9c8d2] text-transparent'}`}>
                            <Check size={14} />
                          </span>
                          <span className="font-semibold text-[#173d5c]">{project.project_name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {notice && <div className="mt-4 rounded-xl border border-[#a8d8c1] bg-[#f0fbf5] px-4 py-3 text-sm text-[#287052]">{notice}</div>}
              {errorMessage && <div className="mt-4 rounded-xl border border-[#f0b3a7] bg-[#fff4f1] px-4 py-3 text-sm text-[#a63f2d]">{errorMessage}</div>}

              <div className="mt-5 rounded-2xl border border-[#f0c5bc] bg-[#fff8f6] p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#ffe8e2] p-2 text-[#c94d35]"><Trash2 size={18} /></div>
                  <div className="flex-1">
                    <h3 className="font-black text-[#8e3424]">Remove user</h3>
                    <p className="mt-1 text-sm leading-5 text-[#8c625a]">Deletes the user’s PMOCorex account, memberships, invitations, and project-team records.</p>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="mt-4 rounded-xl border border-[#e5a597] bg-white px-4 py-2 text-sm font-bold text-[#b5412c] hover:bg-[#fff1ed]">
                        Remove user
                      </button>
                    ) : (
                      <div className="mt-4 rounded-xl border border-[#edb7ac] bg-white p-4">
                        <p className="text-sm font-semibold text-[#7d372a]">Confirm permanent removal of {selectedRow.email}?</p>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost" disabled={saving}>Cancel</button>
                          <button onClick={removeUser} className="inline-flex items-center gap-2 rounded-xl bg-[#c94d35] px-4 py-2 text-sm font-bold text-white hover:bg-[#ae3f2b] disabled:opacity-60" disabled={saving}>
                            <Trash2 size={15} /> {saving ? 'Removing…' : 'Delete user'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer className="border-t border-[#dce6ed] bg-white px-6 py-4">
              <div className="flex justify-end gap-3">
                <button onClick={closeDrawer} className="btn btn-ghost" disabled={saving}>Close</button>
                {!selectedRow.hasAllProjectAccess && (
                  <button onClick={saveProjectAccess} className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save project access'}
                  </button>
                )}
              </div>
            </footer>
          </aside>
        </div>
      )}
    </section>
  )
}

function MetricCard({ icon: Icon, title, value, description }: { icon: any; title: string; value: number; description: string }) {
  return (
    <div className="rounded-2xl border border-[#dce6ed] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#748596]">{title}</div>
          <div className="mt-2 text-3xl font-black text-[#102943]">{value}</div>
          <div className="mt-1 text-xs text-[#8292a1]">{description}</div>
        </div>
        <div className="rounded-xl bg-[#edf5f8] p-2.5 text-[#2b7894]"><Icon size={20} /></div>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8292a1]">{label}</div>
      <div className="mt-1 font-bold text-[#173d5c]">{value}</div>
    </div>
  )
}

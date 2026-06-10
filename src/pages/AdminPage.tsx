import { useEffect, useState } from 'react'
import {
  User,
  Lock,
  Users,
  Settings,
  Shield,
  Building2,
  Briefcase,
  FolderKanban,
  Mail,
} from 'lucide-react'
import { useThemeStore } from '@/store/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'
import { useMembershipStore } from '@/store/membership'
import {
  canManageUsers,
  canManageWorkspace,
  canManagePortfolio,
} from '@/lib/permissions'

const baseAdminTabs = [
  'Overview',
  'My Profile',
  'Security',
  'Users & Roles',
  'Organizations',
  'System Settings',
]

type InviteScope = 'workspace' | 'portfolio' | 'project'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const { theme, setTheme } = useThemeStore()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const navigate = useNavigate()

  const [organizations, setOrganizations] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteScope, setInviteScope] = useState<InviteScope>('workspace')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('pmo')
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<number | ''>(1)
  const [selectedPortfolioId, setSelectedPortfolioId] =
    useState<number | ''>('')
  const [selectedProjectId, setSelectedProjectId] =
    useState<number | ''>('')
  const [inviteLink, setInviteLink] = useState('')
  const [notice, setNotice] = useState('')

  const adminTabs = baseAdminTabs.filter(tab => {
    if (tab === 'Users & Roles') return canManageUsers(role)
    if (tab === 'Organizations') return canManageWorkspace(role)
    if (tab === 'System Settings') return canManageWorkspace(role)
    return true
  })

  useEffect(() => {
    if (!adminTabs.includes(activeTab)) {
      setActiveTab('Overview')
    }
  }, [role])

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    setLoading(true)

    const [
      { data: orgs },
      { data: ports },
      { data: projs },
      { data: memberRows },
      { data: inviteRows },
    ] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at'),
      supabase.from('portfolios').select('*').order('created_at'),
      supabase.from('projects').select('*').order('id'),
      supabase.from('memberships').select('*').order('created_at'),
      supabase.from('team_invitations').select('*').order('created_at', {
        ascending: false,
      }),
    ])

    setOrganizations(orgs || [])
    setPortfolios(ports || [])
    setProjects(projs || [])
    setMemberships(memberRows || [])
    setInvitations(inviteRows || [])
    setLoading(false)
  }

  function handleScopeChange(scope: InviteScope) {
    setInviteScope(scope)
    setInviteLink('')
    setNotice('')
    setSelectedPortfolioId('')
    setSelectedProjectId('')

    if (scope === 'workspace') setInviteRole('pmo')
    if (scope === 'portfolio') setInviteRole('portfolio_manager')
    if (scope === 'project') setInviteRole('contractor')
  }

  async function sendInvite() {
  if (!canManageUsers(role)) {
    setNotice('You do not have permission to invite users.')
    return
  }

  setNotice('')
  setInviteLink('')

  if (!inviteEmail.trim()) {
    setNotice('Email address is required.')
    return
  }

  if (!selectedOrganizationId) {
    setNotice('Organization is required.')
    return
  }

  if (inviteScope === 'workspace' && !canManageWorkspace(role)) {
    setNotice('You do not have permission to create workspace invitations.')
    return
  }

  if (inviteScope === 'portfolio' && !canManagePortfolio(role)) {
    setNotice('You do not have permission to create portfolio invitations.')
    return
  }

  if (inviteScope === 'portfolio' && !selectedPortfolioId) {
    setNotice('Select a portfolio for portfolio access.')
    return
  }

  if (inviteScope === 'project' && !selectedProjectId) {
    setNotice('Select a project for project access.')
    return
  }

  const { data, error } = await supabase
    .from('team_invitations')
    .insert([
      {
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName || null,
        role: inviteRole,
        invite_scope: inviteScope,
        access_scope: inviteScope,
        organization_id: selectedOrganizationId,
        portfolio_id:
          inviteScope === 'portfolio' ? selectedPortfolioId : null,
        project_id: inviteScope === 'project' ? selectedProjectId : null,
        status: 'pending',
        invited_by: user?.email || 'Admin',
      },
    ])
    .select('*')
    .single()

  if (error) {
    setNotice(error.message)
    return
  }

  const link = `${window.location.origin}/accept-invite?token=${data.token}`

  const { error: emailError } = await supabase.functions.invoke(
    'send-invite-email',
    {
      body: {
        email: data.email,
        fullName: data.full_name,
        role: data.role,
        inviteScope: data.invite_scope,
        inviteLink: link,
        invitedBy: user?.email || 'PMOCorex Admin',
      },
    }
  )

  if (emailError) {
    setInviteLink(link)
    setNotice(
      `Invitation created, but email failed to send: ${emailError.message}`
    )
    await loadAdminData()
    return
  }

  setInviteLink(link)
  setNotice('Invitation created and email sent successfully.')
  setInviteEmail('')
  setInviteName('')
  setInviteRole(
    inviteScope === 'workspace'
      ? 'pmo'
      : inviteScope === 'portfolio'
      ? 'portfolio_manager'
      : 'contractor'
  )

  await loadAdminData()
}

  const pendingInvites = invitations.filter(
    invite => invite.status === 'pending'
  ).length

  const activeMembers = memberships.length

  const filteredPortfolios = portfolios.filter(
    portfolio =>
      !selectedOrganizationId ||
      portfolio.organization_id === selectedOrganizationId
  )

  const filteredProjects = projects.filter(
    project =>
      !selectedOrganizationId ||
      project.organization_id === selectedOrganizationId
  )

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="text-[#c49e48]" size={22} />

              <h1 className="text-2xl font-bold text-[#ede8de]">
                Workspace Admin Console
              </h1>
            </div>

            <p className="text-sm text-[#6e7d8c] mt-1">
              Manage workspace users, roles, organizations, portfolios, and
              system preferences.
            </p>
          </div>

          <button
            onClick={() => navigate('/projects')}
            className="btn btn-ghost w-fit"
          >
            Back to Workspace Hub
          </button>
        </div>

        <div className="card p-2 flex flex-wrap gap-2">
          {adminTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn btn-sm ${
                activeTab === tab ? 'btn-gold' : 'btn-ghost'
              }`}
            >
              {tab === 'Overview' && <Shield size={14} />}
              {tab === 'My Profile' && <User size={14} />}
              {tab === 'Security' && <Lock size={14} />}
              {tab === 'Users & Roles' && <Users size={14} />}
              {tab === 'Organizations' && <Building2 size={14} />}
              {tab === 'System Settings' && <Settings size={14} />}
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card p-6 text-[#6e7d8c]">
            Loading workspace admin…
          </div>
        ) : (
          <div className="card p-6">
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#ede8de]">
                    Workspace Overview
                  </h2>

                  <p className="text-sm text-[#6e7d8c] mt-1">
                    Company-level control centre for PMOCorex.
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <AdminMetric
                    title="Organizations"
                    value={organizations.length}
                    icon={Building2}
                  />

                  <AdminMetric
                    title="Portfolios"
                    value={portfolios.length}
                    icon={Briefcase}
                  />

                  <AdminMetric
                    title="Projects"
                    value={projects.length}
                    icon={FolderKanban}
                  />

                  <AdminMetric
                    title="Members"
                    value={activeMembers}
                    icon={Users}
                  />

                  <AdminMetric
                    title="Pending Invites"
                    value={pendingInvites}
                    icon={Mail}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-[#ede8de]">
                    Workspace Structure
                  </div>

                  <div className="mt-4 space-y-3">
                    {organizations.map(org => {
                      const orgPortfolios = portfolios.filter(
                        portfolio => portfolio.organization_id === org.id
                      )

                      const orgProjects = projects.filter(
                        project => project.organization_id === org.id
                      )

                      return (
                        <div
                          key={org.id}
                          className="rounded-xl border border-white/10 bg-[#111827]/70 p-4"
                        >
                          <div className="font-semibold text-[#ede8de]">
                            {org.name}
                          </div>

                          <div className="text-xs text-[#6e7d8c] mt-1">
                            {orgPortfolios.length} portfolio(s) •{' '}
                            {orgProjects.length} project(s)
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'My Profile' && (
              <div>
                <h2 className="text-lg font-semibold text-[#ede8de]">
                  My Profile
                </h2>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoCard label="Name" value={user?.full_name || 'Admin'} />
                  <InfoCard label="Email" value={user?.email || '—'} />
                  <InfoCard label="Role" value={role || 'guest'} />
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <div>
                <h2 className="text-lg font-semibold text-[#ede8de]">
                  Security
                </h2>

                <p className="text-sm text-[#6e7d8c] mt-1">
                  Password change and account security will be managed here.
                </p>
              </div>
            )}

            {activeTab === 'Users & Roles' && canManageUsers(role) && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#ede8de]">
                    Users & Roles
                  </h2>

                  <p className="text-sm text-[#6e7d8c] mt-1">
                    Invite users into the workspace, portfolio, or project.
                  </p>
                </div>

                {notice && (
                  <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
                    {notice}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-[#ede8de]">
                      Invite Scope
                    </div>

                    <p className="text-xs text-[#6e7d8c] mt-1">
                      Workspace access sees all projects in an organization.
                      Portfolio and project access are more restricted.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canManageWorkspace(role) && (
                      <button
                        type="button"
                        onClick={() => handleScopeChange('workspace')}
                        className={`btn btn-sm ${
                          inviteScope === 'workspace'
                            ? 'btn-gold'
                            : 'btn-ghost'
                        }`}
                      >
                        Workspace Access
                      </button>
                    )}

                    {canManagePortfolio(role) && (
                      <button
                        type="button"
                        onClick={() => handleScopeChange('portfolio')}
                        className={`btn btn-sm ${
                          inviteScope === 'portfolio'
                            ? 'btn-gold'
                            : 'btn-ghost'
                        }`}
                      >
                        Portfolio Access
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleScopeChange('project')}
                      className={`btn btn-sm ${
                        inviteScope === 'project'
                          ? 'btn-gold'
                          : 'btn-ghost'
                      }`}
                    >
                      Project Access
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    className="form-control"
                    placeholder="Full Name"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                  />

                  <input
                    className="form-control"
                    placeholder="Email Address"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />

                  <select
                    className="form-control"
                    value={selectedOrganizationId}
                    onChange={e =>
                      setSelectedOrganizationId(Number(e.target.value))
                    }
                  >
                    <option value="">Select Organization</option>

                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>

                  {inviteScope === 'portfolio' && (
                    <select
                      className="form-control"
                      value={selectedPortfolioId}
                      onChange={e =>
                        setSelectedPortfolioId(Number(e.target.value))
                      }
                    >
                      <option value="">Select Portfolio</option>

                      {filteredPortfolios.map(portfolio => (
                        <option key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {inviteScope === 'project' && (
                    <select
                      
                      className="form-control"
                      value={selectedProjectId}
                      onChange={e =>
                        setSelectedProjectId(Number(e.target.value))
                      }
                    >
                      <option value="">Select Project</option>

                      {filteredProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  )}

                  {inviteScope === 'workspace' && (
                    <select
                      className="form-control"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="workspace_admin">Workspace Admin</option>
                      <option value="admin">Admin</option>
                      <option value="pmo">PMO</option>
                      <option value="portfolio_manager">
                        Portfolio Manager
                      </option>
                    </select>
                  )}

                  {inviteScope === 'portfolio' && (
                    <select
                      className="form-control"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="portfolio_manager">
                        Portfolio Manager
                      </option>
                      <option value="pmo">PMO</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}

                  {inviteScope === 'project' && (
                    <select
                      className="form-control"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="consultant">Consultant</option>
                      <option value="contractor">Contractor</option>
                      <option value="project_manager">
                        Project Manager
                      </option>
                      <option value="design">Design Team</option>
                      <option value="housebuild">Housebuild</option>
                      <option value="mep">MEP</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="costing">Costing</option>
                      <option value="guest">Guest</option>
                    </select>
                  )}
                </div>

                <button onClick={sendInvite} className="btn btn-gold">
                  Create Invitation
                </button>

                {inviteLink && (
                  <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="font-semibold text-[#ede8de]">
                      Invitation Link
                    </div>

                    <div className="text-xs mt-2 break-all text-[#6e7d8c]">
                      {inviteLink}
                    </div>

                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(inviteLink)
                      }
                      className="btn btn-sm btn-ghost mt-3"
                    >
                      Copy Link
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-[#ede8de] mb-3">
                      Active Members
                    </div>

                    <div className="space-y-2">
                      {memberships.length === 0 ? (
                        <div className="text-sm text-[#6e7d8c]">
                          No members yet.
                        </div>
                      ) : (
                        memberships.map(member => (
                          <div
                            key={member.id}
                            className="rounded-xl border border-white/10 bg-[#111827]/70 p-3"
                          >
                            <div className="text-sm text-[#ede8de]">
                              {member.full_name || member.email}
                            </div>

                            <div className="text-xs text-[#6e7d8c]">
                              {member.role} • {member.access_scope}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-[#ede8de] mb-3">
                      Pending Invitations
                    </div>

                    <div className="space-y-2">
                      {invitations.filter(i => i.status === 'pending')
                        .length === 0 ? (
                        <div className="text-sm text-[#6e7d8c]">
                          No pending invitations.
                        </div>
                      ) : (
                        invitations
                          .filter(invite => invite.status === 'pending')
                          .map(invite => (
                            <div
                              key={invite.id}
                              className="rounded-xl border border-white/10 bg-[#111827]/70 p-3"
                            >
                              <div className="text-sm text-[#ede8de]">
                                {invite.full_name || invite.email}
                              </div>

                              <div className="text-xs text-[#6e7d8c]">
                                {invite.role} •{' '}
                                {invite.invite_scope ||
                                  invite.access_scope ||
                                  'project'}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Organizations' && canManageWorkspace(role) && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#ede8de]">
                  Organizations
                </h2>

                <div className="space-y-3">
                  {organizations.map(org => (
                    <div
                      key={org.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="font-semibold text-[#ede8de]">
                        {org.name}
                      </div>

                      <div className="text-xs text-[#6e7d8c] mt-1">
                        Organization ID: {org.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'System Settings' &&
              canManageWorkspace(role) && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-[#ede8de]">
                    System Settings
                  </h2>

                  <p className="text-sm text-[#6e7d8c] mt-1">
                    Organisation and workspace preferences.
                  </p>

                  <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
                    <div className="text-sm font-semibold text-[#ede8de]">
                      Appearance
                    </div>

                    <p className="text-xs text-[#6e7d8c] mt-1">
                      Choose your preferred theme.
                    </p>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setTheme('dark')}
                        className={`btn btn-sm ${
                          theme === 'dark' ? 'btn-gold' : 'btn-ghost'
                        }`}
                      >
                        Dark Mode
                      </button>

                      <button
                        onClick={() => setTheme('light')}
                        className={`btn btn-sm ${
                          theme === 'light' ? 'btn-gold' : 'btn-ghost'
                        }`}
                      >
                        Light Mode
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminMetric({ title, value, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-black text-white">{value}</div>
          <div className="text-xs text-[#6e7d8c] mt-1">{title}</div>
        </div>

        <Icon size={18} className="text-[#c49e48]" />
      </div>
    </div>
  )
}

function InfoCard({ label, value }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-[#6e7d8c]">
        {label}
      </div>

      <div className="text-sm text-[#ede8de] mt-1">{value}</div>
    </div>
  )
}

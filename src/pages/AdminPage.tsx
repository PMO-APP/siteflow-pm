import { useEffect, useState } from 'react'
import {
  User,
  Lock,
  Users,
  Shield,
  Building2,
  Briefcase,
  FolderKanban,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useThemeStore } from '@/store/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMembershipStore } from '@/store/membership'
import {
  canManageUsers,
  canManageWorkspace,
  canManagePortfolio,
} from '@/lib/permissions'

const baseAdminTabs = [
  'Overview',
  'Security',
  'Users & Roles',
]

type InviteScope = 'workspace' | 'portfolio' | 'project'

export default function AdminPage() {
  const [searchParams] = useSearchParams()
  const profileTab = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState(
    profileTab === 'profile' ? 'My Profile' : 'Overview'
  )

  const { theme, setTheme } = useThemeStore()
  const { user, signOut } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const accessScope = useMembershipStore(state => state.accessScope)
  const organizationId = useMembershipStore(state => state.organizationId)
  const portfolioId = useMembershipStore(state => state.portfolioId)
  const projectId = useMembershipStore(state => state.projectId)

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

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const adminTabs = baseAdminTabs.filter(tab => {
    if (tab === 'Users & Roles') return canManageUsers(role)
    if (tab === 'Organizations') return canManageWorkspace(role)
    return true
  })

  useEffect(() => {
    if (profileTab === 'profile') {
      setActiveTab('My Profile')
    }
  }, [profileTab])

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
    if (orgs?.[0]?.id) {
  setSelectedOrganizationId(orgs[0].id)
}
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

  async function updatePassword() {
    setPasswordNotice('')
    setPasswordError('')

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordError(error.message)
      setPasswordLoading(false)
      return
    }

    setPasswordNotice('Password updated successfully.')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordLoading(false)
  }

  async function sendInvite() {
    if (!canManageUsers(role)) {
      setNotice('You do not have permission to invite users.')
      return
    }

    setNotice('')
    setInviteLink('')

    const cleanEmail = inviteEmail.trim().toLowerCase()

    if (!cleanEmail) {
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
          email: cleanEmail,
          full_name: inviteName.trim() || null,
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
          fullName: data.full_name || '',
          role: data.role,
          inviteScope: data.invite_scope || data.access_scope,
          inviteLink: link,
          invitedBy: user?.email || 'PMOCorex Admin',
        },
      }
    )

    if (emailError) {
      setInviteLink(link)
      setNotice(
        `Invitation created, but email failed to send: ${
          emailError.message || 'Unknown email error'
        }`
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

  const userOrganization = organizations.find(org => org.id === organizationId)
  const userPortfolio = portfolios.find(portfolio => portfolio.id === portfolioId)
  const userProject = projects.find(project => project.id === projectId)

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
  title={organizations[0]?.name || 'Organization'}
  value="Workspace"
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
              </div>
            )}

           

            {activeTab === 'Security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#ede8de]">
                    Security & Preferences
                  </h2>

                  <p className="text-sm text-[#6e7d8c] mt-1">
                    Manage your password, account session, and display theme.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-[#ede8de]">
                      Change Password
                    </div>

                    <p className="text-xs text-[#6e7d8c] mt-1">
                      Update your password for future PMOCorex sign-ins.
                    </p>
                  </div>

                  {passwordError && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                      {passwordError}
                    </div>
                  )}

                  {passwordNotice && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                      {passwordNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        className="form-control pr-10"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword(current => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        className="form-control pr-10"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(current => !current)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={updatePassword}
                    disabled={passwordLoading}
                    className="btn btn-gold"
                  >
                    {passwordLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-[#ede8de]">
                    Appearance
                  </div>

                  <p className="text-xs text-[#6e7d8c] mt-1">
                    Choose your preferred PMOCorex theme.
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

                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="text-sm font-semibold text-red-400">
                    Account Session
                  </div>

                  <p className="text-xs text-[#6e7d8c] mt-1">
                    Sign out of this PMOCorex session.
                  </p>

                  <button onClick={signOut} className="btn btn-ghost mt-4">
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Users & Roles' && canManageUsers(role) && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[#ede8de]">
                  Users & Roles
                </h2>

                {notice && (
                  <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
                    {notice}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div className="text-sm font-semibold text-[#ede8de]">
                    Invite Scope
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canManageWorkspace(role) && (
                      <button
                        type="button"
                        onClick={() => handleScopeChange('workspace')}
                        className={`btn btn-sm ${
                          inviteScope === 'workspace' ? 'btn-gold' : 'btn-ghost'
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
                          inviteScope === 'portfolio' ? 'btn-gold' : 'btn-ghost'
                        }`}
                      >
                        Portfolio Access
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleScopeChange('project')}
                      className={`btn btn-sm ${
                        inviteScope === 'project' ? 'btn-gold' : 'btn-ghost'
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

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
  <div className="text-[10px] uppercase tracking-wider text-[#6e7d8c]">
    Organization
  </div>

  <div className="text-sm font-semibold text-[#ede8de] mt-1">
    {organizations[0]?.name || 'Organization'}
  </div>
</div>

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
    <option value="project_manager">Project Manager</option>
    <option value="project_owner">Project Owner</option>
    <option value="design">Design Team</option>
    <option value="housebuild">Housebuild</option>
    <option value="mep">MEP</option>
    <option value="infrastructure">Infrastructure</option>
    <option value="costing">Costing</option>
    <option value="viewer">Viewer</option>
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
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="btn btn-sm btn-ghost mt-3"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
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

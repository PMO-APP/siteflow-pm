import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  Briefcase,
  FolderKanban,
  Lock,
  LogOut,
  Mail,
  Shield,
  User,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useThemeStore } from '@/store/theme'
import { getInitials } from '@/lib/utils'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

function formatRoleLabel(role?: string | null) {
  if (!role) return 'Team Member'

  const labels: Record<string, string> = {
    workspace_admin: 'Workspace Admin',
    admin: 'Administrator',
    pmo: 'PMO',
    portfolio_manager: 'Portfolio Manager',
    project_manager: 'Project Manager',
    project_owner: 'Project Owner',
    contractor: 'Contractor',
    consultant: 'Consultant',
    design: 'Design Team',
    costing: 'Costing Team',
    housebuild: 'Housebuild',
    mep: 'MEP',
    infrastructure: 'Infrastructure',
    viewer: 'Viewer',
    guest: 'Guest',
  }

  return labels[role] || role.replace(/_/g, ' ')
}

export default function ProfilePage() {
  const navigate = useNavigate()

  const { user, signOut } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const role = useMembershipStore(state => state.role)
  const accessScope = useMembershipStore(state => state.accessScope)
  const organizationId = useMembershipStore(state => state.organizationId)
  const portfolioId = useMembershipStore(state => state.portfolioId)
  const projectId = useMembershipStore(state => state.projectId)

  const [organizationName, setOrganizationName] = useState('—')
  const [portfolioName, setPortfolioName] = useState('—')
  const [projectName, setProjectName] = useState('—')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    loadAccessContext()
  }, [organizationId, portfolioId, projectId])

  async function loadAccessContext() {
    if (organizationId) {
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle()

      setOrganizationName(data?.name || '—')
    } else {
      setOrganizationName('—')
    }

    if (portfolioId) {
      const { data } = await supabase
        .from('portfolios')
        .select('name')
        .eq('id', portfolioId)
        .maybeSingle()

      setPortfolioName(data?.name || '—')
    } else {
      setPortfolioName('—')
    }

    if (projectId) {
      const { data } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', projectId)
        .maybeSingle()

      setProjectName(data?.project_name || '—')
    } else {
      setProjectName('—')
    }
  }

  async function updatePassword() {
    setPasswordNotice('')
    setPasswordError('')

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError('Password must include at least one uppercase letter.')
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('Password must include at least one number.')
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

  const displayName = user?.full_name || user?.email || 'User'
  const displayEmail = user?.email || 'No email available'
  const displayRole = formatRoleLabel(role || user?.role)

  const hasMinLength = newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left w-fit"
          >
            <PMOCorexLogo size={42} />
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="btn btn-ghost w-fit"
          >
            <ArrowLeft size={15} />
            Back to Workspace Hub
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-3xl bg-[#c49e48]/20 border border-[#c49e48]/30 flex items-center justify-center text-2xl font-black text-[#c49e48]">
                {getInitials(displayName)}
              </div>

              <div>
                <div className="inline-flex mb-2 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
                  PMOCorex Account
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
                  {displayName}
                </h1>

                <p className="text-sm text-[#6e7d8c] mt-1">
                  {displayEmail}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-w-[220px]">
              <div className="text-xs uppercase tracking-wider text-[#6e7d8c]">
                Current Role
              </div>

              <div className="text-lg font-bold text-[#c49e48] mt-1">
                {displayRole}
              </div>

              <div className="text-xs text-[#6e7d8c] mt-1">
                Access scope: {accessScope || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <section className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <User size={18} className="text-[#c49e48]" />

                <div>
                  <h2 className="text-lg font-bold text-[#ede8de]">
                    Account Details
                  </h2>

                  <p className="text-xs text-[#6e7d8c]">
                    Your personal login and account information.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoCard icon={User} label="Full Name" value={displayName} />
                <InfoCard icon={Mail} label="Login Email" value={displayEmail} />
                <InfoCard icon={Shield} label="Role" value={displayRole} />
                <InfoCard
                  icon={Shield}
                  label="Access Scope"
                  value={accessScope || '—'}
                />
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Building2 size={18} className="text-[#c49e48]" />

                <div>
                  <h2 className="text-lg font-bold text-[#ede8de]">
                    Access Details
                  </h2>

                  <p className="text-xs text-[#6e7d8c]">
                    Workspace, portfolio, and project access assigned to your account.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InfoCard
                  icon={Building2}
                  label="Organization"
                  value={organizationName}
                />
                <InfoCard
                  icon={Briefcase}
                  label="Portfolio"
                  value={portfolioName}
                />
                <InfoCard
                  icon={FolderKanban}
                  label="Project"
                  value={projectName}
                />
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock size={18} className="text-[#c49e48]" />

                <div>
                  <h2 className="text-lg font-bold text-[#ede8de]">
                    Security
                  </h2>

                  <p className="text-xs text-[#6e7d8c]">
                    Change your password for future PMOCorex sign-ins.
                  </p>
                </div>
              </div>

              {passwordError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {passwordError}
                </div>
              )}

              {passwordNotice && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                  {passwordNotice}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">New Password</label>

                  <div className="relative">
                    <input
                      className="form-control pr-10"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Create new password"
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

                  <div className="mt-3 space-y-1 text-xs">
                    <Requirement passed={hasMinLength} text="8+ characters" />
                    <Requirement passed={hasUppercase} text="1 uppercase letter" />
                    <Requirement passed={hasNumber} text="1 number" />
                  </div>
                </div>

                <div>
                  <label className="form-label">Confirm Password</label>

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
              </div>

              <button
                onClick={updatePassword}
                disabled={passwordLoading}
                className="btn btn-gold mt-5"
              >
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </button>
            </section>
          </div>

          <div className="space-y-5">
            <section className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Palette size={18} className="text-[#c49e48]" />

                <div>
                  <h2 className="text-lg font-bold text-[#ede8de]">
                    Appearance
                  </h2>

                  <p className="text-xs text-[#6e7d8c]">
                    Choose your preferred display theme.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`btn btn-sm justify-center ${
                    theme === 'dark' ? 'btn-gold' : 'btn-ghost'
                  }`}
                >
                  Dark
                </button>

                <button
                  onClick={() => setTheme('light')}
                  className={`btn btn-sm justify-center ${
                    theme === 'light' ? 'btn-gold' : 'btn-ghost'
                  }`}
                >
                  Light
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-center gap-2">
                <LogOut size={18} className="text-red-400" />

                <div>
                  <h2 className="text-lg font-bold text-red-400">
                    Account Session
                  </h2>

                  <p className="text-xs text-[#6e7d8c] mt-1">
                    Sign out of this PMOCorex session.
                  </p>
                </div>
              </div>

              <button
                onClick={signOut}
                className="btn btn-ghost w-full justify-center mt-5"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </section>

            <section className="card p-6">
              <h2 className="text-lg font-bold text-[#ede8de]">
                Quick Actions
              </h2>

              <div className="space-y-2 mt-4">
                <button
                  onClick={() => navigate('/projects')}
                  className="btn btn-ghost w-full justify-center"
                >
                  <ArrowLeft size={15} />
                  Workspace Hub
                </button>

                {['workspace_admin', 'admin'].includes(role || '') && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="btn btn-ghost w-full justify-center"
                  >
                    <Shield size={15} />
                    Admin Console
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#6e7d8c]">
        <Icon size={14} className="text-[#c49e48]" />
        {label}
      </div>

      <div className="text-sm text-[#ede8de] mt-2 break-all">
        {value}
      </div>
    </div>
  )
}

function Requirement({
  passed,
  text,
}: {
  passed: boolean
  text: string
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        passed ? 'text-emerald-400' : 'text-[#6e7d8c]'
      }`}
    >
      <span>{passed ? '✓' : '•'}</span>
      <span>{text}</span>
    </div>
  )
}

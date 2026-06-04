import { useState } from 'react'
import { User, Lock, Users, Settings, Shield } from 'lucide-react'
import { useThemeStore } from '@/store/theme'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAuthStore } from '@/store/auth'

const adminTabs = [
  'My Profile',
  'Security',
  'Users & Roles',
  'Project Team',
  'System Settings',
]

type InviteScope = 'workspace' | 'project'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('My Profile')
  const { theme, setTheme } = useThemeStore()
  const { projectId } = useProjectStore()
  const { user } = useAuthStore()

  const [inviteScope, setInviteScope] = useState<InviteScope>('project')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('contractor')
  const [inviteLink, setInviteLink] = useState('')
  const [notice, setNotice] = useState('')

  function handleScopeChange(scope: InviteScope) {
    setInviteScope(scope)
    setInviteLink('')
    setNotice('')

    if (scope === 'workspace') {
      setInviteRole('pmo')
    } else {
      setInviteRole('contractor')
    }
  }

  async function sendInvite() {
    setNotice('')
    setInviteLink('')

    if (inviteScope === 'project' && !projectId) {
      setNotice('No project selected for project access.')
      return
    }

    if (!inviteEmail.trim()) {
      setNotice('Email address is required.')
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
          project_id: inviteScope === 'project' ? projectId : null,
          status: 'pending',
          invited_by: user?.email || 'Admin',
        },
      ])
      .select('token')
      .single()

    if (error) {
      setNotice(error.message)
      return
    }

    const link = `${window.location.origin}/accept-invite?token=${data.token}`

    setInviteLink(link)
    setNotice(
      inviteScope === 'workspace'
        ? 'Workspace invitation created successfully.'
        : 'Project invitation created successfully.'
    )

    setInviteEmail('')
    setInviteName('')
    setInviteRole(inviteScope === 'workspace' ? 'pmo' : 'contractor')
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="text-[#c49e48]" size={22} />
          <h1 className="text-2xl font-bold text-[#ede8de]">
            Admin Console
          </h1>
        </div>

        <p className="text-sm text-[#6e7d8c] mt-1">
          Manage profile, security, users, roles, project team, and system
          settings
        </p>
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
            {tab === 'My Profile' && <User size={14} />}
            {tab === 'Security' && <Lock size={14} />}
            {tab === 'Users & Roles' && <Users size={14} />}
            {tab === 'Project Team' && <Shield size={14} />}
            {tab === 'System Settings' && <Settings size={14} />}
            {tab}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {activeTab === 'My Profile' && (
          <div>
            <h2 className="text-lg font-semibold text-[#ede8de]">
              My Profile
            </h2>
            <p className="text-sm text-[#6e7d8c] mt-1">
              Profile details will be managed here.
            </p>
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

        {activeTab === 'Users & Roles' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#ede8de]">
                Users & Roles
              </h2>

              <p className="text-sm text-[#6e7d8c] mt-1">
                Invite users into PMOCorex or into the current project.
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
                  Workspace access is for PMO/Admin users. Project access is for
                  consultants, contractors, and delivery teams.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleScopeChange('workspace')}
                  className={`btn btn-sm ${
                    inviteScope === 'workspace' ? 'btn-gold' : 'btn-ghost'
                  }`}
                >
                  Workspace Access
                </button>

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

              {inviteScope === 'workspace' ? (
                <select
                  className="form-control"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="pmo">PMO</option>
                  <option value="portfolio_manager">
                    Portfolio Manager
                  </option>
                </select>
              ) : (
                <select
                  className="form-control"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  <option value="consultant">Consultant</option>
                  <option value="contractor">Contractor</option>
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
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="btn btn-sm btn-ghost mt-3"
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Project Team' && (
          <div>
            <h2 className="text-lg font-semibold text-[#ede8de]">
              Project Team
            </h2>
            <p className="text-sm text-[#6e7d8c] mt-1">
              Project-level team members and permissions will be managed here.
            </p>
          </div>
        )}

        {activeTab === 'System Settings' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#ede8de]">
              System Settings
            </h2>

            <p className="text-sm text-[#6e7d8c] mt-1">
              Organisation and project preferences
            </p>

            <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
              <div className="text-sm font-semibold text-[#ede8de]">
                Appearance
              </div>

              <p className="text-xs text-[#6e7d8c] mt-1">
                Choose your preferred theme
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
    </div>
  )
}

import { useState } from 'react'
import { User, Lock, Users, Settings, Shield } from 'lucide-react'
import { useThemeStore } from '@/store/theme'

const adminTabs = [
  'My Profile',
  'Security',
  'Users & Roles',
  'Project Team',
  'System Settings',
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('My Profile')
  const { theme, setTheme } = useThemeStore()

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
          Manage profile, security, users, roles, project team, and system settings
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
          <div>
            <h2 className="text-lg font-semibold text-[#ede8de]">
              Users & Roles
            </h2>
            <p className="text-sm text-[#6e7d8c] mt-1">
              Admins will assign user roles here.
            </p>
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
        Select your preferred theme.
      </p>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setTheme('dark')}
          className={`btn btn-sm ${
            theme === 'dark'
              ? 'btn-gold'
              : 'btn-ghost'
          }`}
        >
          Dark Mode
        </button>

        <button
          onClick={() => setTheme('light')}
          className={`btn btn-sm ${
            theme === 'light'
              ? 'btn-gold'
              : 'btn-ghost'
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

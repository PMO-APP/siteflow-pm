import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">
          Manage your personal account information.
        </p>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#c49e48]/20 border border-[#c49e48]/30 flex items-center justify-center text-xl font-bold text-[#c49e48]">
            {getInitials(user?.full_name || 'Admin')}
          </div>

          <div>
            <div className="text-xl font-bold text-[#ede8de]">
              {user?.full_name || 'Admin'}
            </div>

            <div className="text-sm text-[#6e7d8c]">
              {user?.email || 'No email available'}
            </div>

            <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-[#c49e48]/10 border border-[#c49e48]/20 text-[#c49e48] text-xs font-semibold">
              {user?.role || 'admin'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

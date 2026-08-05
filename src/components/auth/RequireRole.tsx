
import { Navigate } from 'react-router-dom'
import { useMembershipStore } from '@/store/membership'

export default function RequireRole({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) {
  const role = useMembershipStore(state => state.role)
  const permissionProfileKey = useMembershipStore(state => state.permissionProfileKey)
  const loading = useMembershipStore(state => state.loading)

  if (loading) {
    return <div className="min-h-40 grid place-items-center text-sm text-[#71838d]">Checking access…</div>
  }

  const allowed =
    Boolean(role && allowedRoles.includes(role)) ||
    Boolean(
      permissionProfileKey &&
      allowedRoles.includes(permissionProfileKey)
    )

  if (!allowed) {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}

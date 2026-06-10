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

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}

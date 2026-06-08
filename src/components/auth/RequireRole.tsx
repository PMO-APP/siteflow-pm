import { Navigate } from 'react-router-dom'
import { useMembershipStore } from '@/store/membership'

export default function RequireRole({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) {
  const { role, loading } = useMembershipStore()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}

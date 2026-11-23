import { Navigate, useLocation } from 'react-router-dom'

export default function ExecutiveDashboardPage() {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: '/management-intelligence', search, hash }} replace />
}

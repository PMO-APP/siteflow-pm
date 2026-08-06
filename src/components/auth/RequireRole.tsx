
import { Navigate } from 'react-router-dom'
import { useAccessSession } from '@/access/AccessSessionProvider'

/**
 * @deprecated Use RequirePermission for all new routes.
 * Retained temporarily for downstream extensions that still pass role/profile keys.
 */
export default function RequireRole({
  children,
  allowedRoles,
}:{
  children:React.ReactNode
  allowedRoles:string[]
}){
  const {session}=useAccessSession()

  if(session.loading){
    return <div className="min-h-40 grid place-items-center text-sm text-[#71838d]">Checking access…</div>
  }

  const descriptors=[
    session.permissionProfileKey,
    session.role,
    session.portalRole,
  ].filter(Boolean) as string[]

  if(!descriptors.some(value=>allowedRoles.includes(value))){
    return <Navigate to="/projects" replace/>
  }

  return <>{children}</>
}

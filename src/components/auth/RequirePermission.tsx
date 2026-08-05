
import { Navigate } from 'react-router-dom'
import { useAccessSession } from '@/access/AccessSessionProvider'
import type { AccessScopeType,PermissionAction } from '@/access/accessTypes'

export default function RequirePermission({
  children,
  action,
  scopeType,
  scopeId,
  discipline,
  redirectTo='/projects',
}:{
  children:React.ReactNode
  action:PermissionAction
  scopeType?:AccessScopeType
  scopeId?:string|number|null
  discipline?:string|null
  redirectTo?:string
}){
  const {session,can}=useAccessSession()

  if(session.loading){
    return <div className="min-h-40 grid place-items-center text-sm text-[#71838d]">Checking access…</div>
  }

  if(!can(action,{scopeType,scopeId,discipline})){
    return <Navigate to={redirectTo} replace/>
  }

  return <>{children}</>
}

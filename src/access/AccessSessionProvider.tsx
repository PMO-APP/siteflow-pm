
import { createContext,useCallback,useContext,useEffect,useMemo,useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { canPerform,loadCanonicalAccessSession } from './accessService'
import type { CanonicalAccessSession,PermissionAction,AccessScopeType } from './accessTypes'

const empty:CanonicalAccessSession={
  loading:true,error:null,workspaceId:null,userId:null,role:null,
  permissionProfileKey:null,discipline:null,status:null,isDefault:false,
  portalRole:null,workspaceType:null,assignments:[],
}

type AccessContextValue={
  session:CanonicalAccessSession
  refresh:()=>Promise<void>
  can:(action:PermissionAction,context?:{
    scopeType?:AccessScopeType
    scopeId?:string|number|null
    discipline?:string|null
  })=>boolean
}

const AccessContext=createContext<AccessContextValue|null>(null)

export function useAccessSession(){
  const value=useContext(AccessContext)
  if(!value)throw new Error('useAccessSession must be used within AccessSessionProvider.')
  return value
}

export default function AccessSessionProvider({children}:{children:React.ReactNode}){
  const user=useAuthStore(state=>state.user)
  const {activeWorkspace}=useWorkspace()
  const setCanonicalMembership=useMembershipStore(state=>state.setCanonicalMembership)
  const clearMembership=useMembershipStore(state=>state.clearMembership)
  const [session,setSession]=useState<CanonicalAccessSession>(empty)

  const refresh=useCallback(async()=>{
    if(!user?.id||!activeWorkspace?.id){
      setSession({...empty,loading:false})
      clearMembership()
      return
    }

    setSession(current=>({...current,loading:true,error:null}))
    try{
      const next=await loadCanonicalAccessSession({
        userId:user.id,
        workspaceId:activeWorkspace.id,
      })
      setSession(next)
      setCanonicalMembership(next)
    }catch(error){
      console.error('Canonical access loading failed:',error)
      setSession({
        ...empty,
        loading:false,
        workspaceId:activeWorkspace.id,
        userId:user.id,
        error:error instanceof Error?error.message:'Unable to load workspace access.',
      })
      clearMembership()
    }
  },[user?.id,activeWorkspace?.id,setCanonicalMembership,clearMembership])

  useEffect(()=>{void refresh()},[refresh])

  const value=useMemo(()=>({
    session,
    refresh,
    can:(action:PermissionAction,context?:{
      scopeType?:AccessScopeType
      scopeId?:string|number|null
      discipline?:string|null
    })=>canPerform(session,action,context),
  }),[session,refresh])

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

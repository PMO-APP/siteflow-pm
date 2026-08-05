
import { supabase } from '@/lib/supabase'
import type {
  AccessLevel,
  AccessScopeType,
  CanonicalWorkspaceMember,
  MemberAccessAssignment,
} from './accessTypes'

function mapAssignment(row:any):MemberAccessAssignment{
  return {
    id:String(row.id),
    workspaceId:String(row.workspace_id),
    userId:String(row.user_id),
    scopeType:row.scope_type,
    scopeId:row.scope_id,
    discipline:row.discipline,
    accessLevel:row.access_level,
    assignmentRole:row.assignment_role,
    source:row.source,
    startsAt:row.starts_at,
    endsAt:row.ends_at,
  }
}

export async function loadCanonicalWorkspaceMember(
  workspaceId:string,
  userId:string
):Promise<CanonicalWorkspaceMember|null>{
  const [{data:member,error:memberError},{data:assignments,error:assignmentError}]=await Promise.all([
    supabase.from('workspace_members').select('*')
      .eq('workspace_id',workspaceId).eq('user_id',userId).maybeSingle(),
    supabase.from('member_access_assignments').select('*')
      .eq('workspace_id',workspaceId).eq('user_id',userId)
  ])
  if(memberError)throw memberError
  if(assignmentError)throw assignmentError
  if(!member)return null
  return {
    workspaceId:String(member.workspace_id),
    userId:String(member.user_id),
    role:member.role,
    status:member.status||'active',
    isDefault:Boolean(member.is_default),
    discipline:member.discipline||null,
    permissionProfileKey:member.permission_profile_key||null,
    source:member.source||'native',
    assignments:(assignments||[]).map(mapAssignment),
  }
}

export async function listWorkspaceMemberDirectory(workspaceId:string){
  const {data,error}=await supabase.from('workspace_member_access_summary')
    .select('*').eq('workspace_id',workspaceId)
  if(error)throw error
  return data||[]
}

export async function assignMemberAccess(input:{
  workspaceId:string
  userId:string
  scopeType:AccessScopeType
  scopeId?:string|null
  discipline?:string|null
  accessLevel:AccessLevel
  assignmentRole?:string|null
}){
  const {data,error}=await supabase.from('member_access_assignments').upsert({
    workspace_id:input.workspaceId,
    user_id:input.userId,
    scope_type:input.scopeType,
    scope_id:input.scopeId||null,
    discipline:input.discipline||null,
    access_level:input.accessLevel,
    assignment_role:input.assignmentRole||null,
    source:'native',
    updated_at:new Date().toISOString(),
  },{
    onConflict:'workspace_id,user_id,scope_type,scope_id,discipline,access_level'
  }).select('*').single()
  if(error)throw error
  return mapAssignment(data)
}

export async function removeMemberAccess(assignmentId:string){
  const {error}=await supabase.from('member_access_assignments')
    .delete().eq('id',assignmentId)
  if(error)throw error
}

export function hasLocalScope(
  member:CanonicalWorkspaceMember|null,
  scopeType:AccessScopeType,
  scopeId?:string|null,
  minimum:AccessLevel='view',
  discipline?:string|null
){
  if(!member||member.status!=='active')return false
  if(['workspace_admin','admin','pmo'].includes(String(member.role)))return true
  const rank:Record<AccessLevel,number>={view:1,contribute:2,edit:3,manage:4}
  return member.assignments.some(item=>
    item.scopeType===scopeType
    &&(!scopeId||item.scopeId===scopeId)
    &&(!discipline||item.discipline===discipline)
    &&rank[item.accessLevel]>=rank[minimum]
  )
}

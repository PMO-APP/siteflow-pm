import { supabase } from '@/lib/supabase'

function disciplineFromRole(role?: string | null) {
  const clean = String(role || '').toLowerCase()
  if (clean.includes('housebuild')) return 'housebuild'
  if (clean.includes('infrastructure')) return 'infrastructure'
  if (clean.includes('mep') || clean.includes('mechanical') || clean.includes('electrical')) return 'mep'
  if (clean.includes('design')) return 'design'
  if (clean.includes('cost')) return 'costing'
  if (clean.includes('hse')) return 'hse'
  if (clean.includes('overall') || clean === 'project_owner' || clean === 'project_manager') return 'overall'
  return null
}

export async function listCanonicalWorkspaceMembers(workspaceId:string){
  const {data,error}=await supabase.from('workspace_member_access_summary').select('*').eq('workspace_id',workspaceId).order('user_id')
  if(error)throw error
  return data||[]
}

export async function replaceMemberProjectAssignments(input:{workspaceId:string;userId:string;projectIds:number[];role?:string|null;discipline?:string|null}){
  const discipline = input.discipline || disciplineFromRole(input.role)
  const {error:deleteError}=await supabase.from('member_access_assignments').delete().eq('workspace_id',input.workspaceId).eq('user_id',input.userId).eq('scope_type','project')
  if(deleteError)throw deleteError
  if(!input.projectIds.length)return
  const {error:insertError}=await supabase.from('member_access_assignments').insert(input.projectIds.map(projectId=>({
    workspace_id:input.workspaceId,
    user_id:input.userId,
    scope_type:'project',
    scope_id:String(projectId),
    access_level:'edit',
    assignment_role:input.role||null,
    discipline,
    source:'native',
  })))
  if(insertError)throw insertError
}

export async function upsertCanonicalAssignment(input:{workspaceId:string;userId:string;scopeType:'workspace'|'portfolio'|'project'|'package'|'discipline';scopeId?:string|number|null;accessLevel?:'view'|'contribute'|'edit'|'manage';role?:string|null;discipline?:string|null}){
  const {error}=await supabase.from('member_access_assignments').upsert({workspace_id:input.workspaceId,user_id:input.userId,scope_type:input.scopeType,scope_id:input.scopeId===null||input.scopeId===undefined?null:String(input.scopeId),access_level:input.accessLevel||'edit',assignment_role:input.role||null,discipline:input.discipline||disciplineFromRole(input.role),source:'native',updated_at:new Date().toISOString()},{onConflict:'workspace_id,user_id,scope_type,scope_id,discipline,access_level'})
  if(error)throw error
}

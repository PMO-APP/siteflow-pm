
import { supabase } from '@/lib/supabase'
import {
  addCanonicalAssignment,
  createCanonicalWorkspaceMember,
} from '@/access/canonicalMembershipAdminService'
import { upsertCanonicalProfile } from './canonicalAuthService'

function cleanRole(value:unknown){
  return String(value||'').toLowerCase().trim()
}

function inviteProjectIds(invite:any){
  const arrayIds=Array.isArray(invite?.project_ids)?invite.project_ids:[]
  const singleIds=invite?.project_id?[invite.project_id]:[]
  return [...new Set([...arrayIds,...singleIds])]
    .map(id=>Number(id))
    .filter(Number.isFinite)
}

export async function completeCanonicalInvitation(input:{
  invite:any
  userId:string
  email:string
  fullName:string
}){
  const role=cleanRole(input.invite.role)||'viewer'
  const workspaceId=String(input.invite.workspace_id||'')
  const scope=input.invite.invite_scope||input.invite.access_scope||'project'
  const projectIds=inviteProjectIds(input.invite)

  if(!workspaceId)throw new Error('This invitation is not linked to a workspace.')

  await upsertCanonicalProfile({
    userId:input.userId,
    email:input.email,
    fullName:input.fullName,
    role:['workspace_admin','admin','pmo','viewer'].includes(role)?role:'viewer',
  })

  await createCanonicalWorkspaceMember({
    workspaceId,
    userId:input.userId,
    role,
    email:input.email,
    fullName:input.fullName,
    workspaceType:input.invite.workspace_type||'internal',
    portalRole:input.invite.portal_role||role,
    isDefault:true,
  })

  if(scope==='workspace'){
    await addCanonicalAssignment({
      workspaceId,
      userId:input.userId,
      scopeType:'workspace',
      accessLevel:['workspace_admin','admin','pmo'].includes(role)?'manage':'view',
      role,
    })
  }

  if(scope==='project'){
    if(!projectIds.length)throw new Error('No project was attached to this invitation.')

    for(const projectId of projectIds){
      await addCanonicalAssignment({
        workspaceId,
        userId:input.userId,
        scopeType:'project',
        scopeId:projectId,
        accessLevel:'edit',
        role,
      })
    }

    const {error:teamError}=await supabase.from('project_team_members').upsert(
      projectIds.map(projectId=>({
        project_id:projectId,
        email:input.email,
        full_name:input.fullName,
        role,
      })),
      {onConflict:'project_id,email'}
    )
    if(teamError)throw teamError
  }

  const {error:inviteError}=await supabase
    .from('team_invitations')
    .update({
      status:'accepted',
      accepted_at:new Date().toISOString(),
      accepted_by:input.userId,
    })
    .eq('id',input.invite.id)
    .eq('status','pending')

  if(inviteError)throw inviteError

  return {workspaceId,role,projectIds}
}

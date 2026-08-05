
import { supabase } from '@/lib/supabase'
import type { WorkspaceSetupDraft,WorkspaceSetupStepKey } from './workspaceSetupTypes'

export async function loadWorkspaceSetupDraft(userId:string,workspaceId:string|null){
  let query=supabase.from('workspace_setup_drafts').select('*').eq('user_id',userId)
  if(workspaceId)query=query.eq('workspace_id',workspaceId)
  else query=query.is('workspace_id',null)
  const {data,error}=await query.maybeSingle()
  if(error)throw error
  if(!data)return null
  return {
    id:data.id,userId:data.user_id,workspaceId:data.workspace_id,currentStep:data.current_step,
    completedSteps:data.completed_steps||[],skippedSteps:data.skipped_steps||[],
    data:data.draft_data||{},startedAt:data.started_at,lastSavedAt:data.last_saved_at,
    completedAt:data.completed_at
  } as WorkspaceSetupDraft
}

export async function saveWorkspaceSetupDraft(draft:WorkspaceSetupDraft){
  const payload={
    user_id:draft.userId,workspace_id:draft.workspaceId,current_step:draft.currentStep,
    completed_steps:draft.completedSteps,skipped_steps:draft.skippedSteps,
    draft_data:draft.data,started_at:draft.startedAt,last_saved_at:new Date().toISOString(),
    completed_at:draft.completedAt,updated_at:new Date().toISOString()
  }
  const {data,error}=await supabase.from('workspace_setup_drafts').upsert(payload,{
    onConflict:'user_id,workspace_id'
  }).select('*').single()
  if(error)throw error
  return data
}

export async function saveWorkspaceSetupStepData(
  draft:WorkspaceSetupDraft,step:WorkspaceSetupStepKey,data:Record<string,unknown>
){
  return saveWorkspaceSetupDraft({
    ...draft,data:{...draft.data,[step]:{...(draft.data[step] as Record<string,unknown>||{}),...data}}
  })
}

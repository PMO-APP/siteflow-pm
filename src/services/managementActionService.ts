import { supabase } from '@/lib/supabase'

export type ManagementActionType = 'instruction' | 'question' | 'request_update' | 'decision'

export type ManagementAction = {
  id: string
  workspaceId: string
  projectId: number | null
  projectName: string | null
  actionType: ManagementActionType
  title: string
  message: string
  priority: string
  status: string
  dueAt: string | null
  recipientLabels: string[]
  recipientUserIds: string[]
  createdByName: string | null
  createdAt: string
}

function mapRow(row:any):ManagementAction {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id == null ? null : Number(row.project_id),
    projectName: row.project_name || null,
    actionType: row.action_type || 'instruction',
    title: row.title,
    message: row.message || '',
    priority: row.priority || 'normal',
    status: row.status || 'open',
    dueAt: row.due_at || null,
    recipientLabels: row.recipient_labels || [],
    recipientUserIds: row.recipient_user_ids || [],
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
  }
}

export async function listManagementActions(workspaceId:string) {
  const {data,error}=await supabase.from('management_actions').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).limit(100)
  if(error){
    if(/42P01|PGRST205|could not find the table/i.test([error.message,error.details,error.hint,error.code].filter(Boolean).join(' '))) return []
    throw error
  }
  return (data||[]).map(mapRow)
}

export async function createManagementAction(input:{
  workspaceId:string
  projectId?:number|null
  projectName?:string|null
  actionType:ManagementActionType
  title:string
  message:string
  priority:string
  dueAt?:string|null
  recipientLabels:string[]
  recipientUserIds:string[]
  createdByName?:string|null
}) {
  const {data:auth}=await supabase.auth.getUser()
  const recipientUserIds=Array.from(new Set(input.recipientUserIds.filter(Boolean)))
  const {data,error}=await supabase.from('management_actions').insert({
    workspace_id:input.workspaceId,
    project_id:input.projectId||null,
    project_name:input.projectName||null,
    action_type:input.actionType,
    title:input.title,
    message:input.message,
    priority:input.priority,
    status:'open',
    due_at:input.dueAt||null,
    recipient_labels:input.recipientLabels,
    recipient_user_ids:recipientUserIds,
    created_by:auth.user?.id||null,
    created_by_name:input.createdByName||auth.user?.email||null,
  }).select('*').single()
  if(error) throw error

  if(recipientUserIds.length){
    const {error:notificationError}=await supabase.from('notifications').insert(recipientUserIds.map(userId=>({
      workspace_id:input.workspaceId,
      project_id:input.projectId||null,
      user_id:userId,
      type:input.priority==='critical'?'alert':'info',
      category:'management',
      title:`Management ${input.actionType.replace('_',' ')}: ${input.title}`,
      message:input.message,
      priority:input.priority,
      action_url:'/app/notifications',
      source_module:'management_action',
      is_read:false,
    })))
    if(notificationError) throw notificationError
  }
  return mapRow(data)
}

export async function updateManagementActionStatus(id:string,status:string){
  const {error}=await supabase.from('management_actions').update({status,updated_at:new Date().toISOString()}).eq('id',id)
  if(error) throw error
}

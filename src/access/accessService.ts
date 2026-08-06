
import { supabase } from '@/lib/supabase'
import type {
  AccessLevel,
  AccessScopeType,
  CanonicalAccessAssignment,
  CanonicalAccessSession,
  PermissionAction,
} from './accessTypes'

const ACCESS_RANK:Record<AccessLevel,number>={
  view:1,
  contribute:2,
  edit:3,
  manage:4,
}

const PROFILE_ACTIONS:Record<string,PermissionAction[]>={
  workspace_admin:[
    'workspace.view','workspace.manage','portfolio.view','portfolio.edit',
    'project.view','project.contribute','project.edit','project.manage','project.delete',
    'schedule.view','schedule.edit','schedule.import',
    'documents.view','documents.upload','documents.delete',
    'procurement.view','procurement.edit','approvals.view','approvals.edit',
    'quality.view','quality.edit','snags.view','snags.edit','risk.view','risk.edit',
    'reports.view','reports.edit','reports.review','reports.export',
    'costing.view','costing.edit','hse.create','hse.close',
    'team.invite','team.manage','notifications.announce','audit.view',
  ],
  pmo:[
    'workspace.view','workspace.manage','portfolio.view','portfolio.edit',
    'project.view','project.contribute','project.edit','project.manage',
    'schedule.view','schedule.edit','schedule.import',
    'documents.view','documents.upload','documents.delete',
    'procurement.view','procurement.edit','approvals.view','approvals.edit',
    'quality.view','quality.edit','snags.view','snags.edit','risk.view','risk.edit',
    'reports.view','reports.edit','reports.review','reports.export',
    'costing.view','hse.create','hse.close','team.invite','team.manage',
    'notifications.announce','audit.view',
  ],
  project_owner:[
    'workspace.view','portfolio.view','project.view','project.contribute','project.edit','project.manage',
    'schedule.view','schedule.edit','documents.view','documents.upload',
    'procurement.view','procurement.edit','approvals.view','approvals.edit',
    'quality.view','quality.edit','snags.view','snags.edit','risk.view','risk.edit',
    'reports.view','reports.edit','reports.export','costing.view','hse.create',
  ],
  discipline_project_owner:[
    'workspace.view','portfolio.view','project.view','project.contribute','project.edit',
    'schedule.view','schedule.edit','documents.view','documents.upload',
    'procurement.view','procurement.edit','approvals.view','quality.view','quality.edit',
    'snags.view','snags.edit','risk.view','risk.edit','reports.view','reports.edit',
    'reports.export','costing.view','hse.create',
  ],
  hse_manager:['workspace.view','portfolio.view','project.view','hse.create','hse.close','reports.view'],
  hse_officer:['workspace.view','portfolio.view','project.view','hse.create','reports.view'],
  discipline_member:[
    'workspace.view','portfolio.view','project.view','project.contribute','schedule.view',
    'documents.view','documents.upload','procurement.view','approvals.view','quality.view',
    'snags.view','risk.view','reports.view','reports.edit','costing.view',
  ],
  consultant:[
    'workspace.view','portfolio.view','project.view','project.contribute','schedule.view',
    'documents.view','documents.upload','procurement.view','approvals.view','quality.view',
    'snags.view','risk.view','reports.view',
  ],
  contractor:[
    'workspace.view','portfolio.view','project.view','project.contribute','schedule.view',
    'documents.view','documents.upload','procurement.view','approvals.view','quality.view',
    'snags.view','risk.view','reports.view','hse.create',
  ],
  vendor:['workspace.view','portfolio.view','project.view','documents.view','procurement.view'],
  viewer:[
    'workspace.view','portfolio.view','project.view','schedule.view','documents.view',
    'procurement.view','approvals.view','quality.view','snags.view','risk.view',
    'reports.view','costing.view',
  ],
  workspace_member:[
    'workspace.view','portfolio.view','project.view','schedule.view','documents.view',
    'procurement.view','approvals.view','quality.view','snags.view','risk.view',
    'reports.view','costing.view',
  ],
}

function mapAssignment(row:any):CanonicalAccessAssignment{
  return {
    id:String(row.id),
    workspaceId:String(row.workspace_id),
    userId:String(row.user_id),
    scopeType:row.scope_type,
    scopeId:row.scope_id===null?null:String(row.scope_id),
    discipline:row.discipline||null,
    accessLevel:row.access_level,
    assignmentRole:row.assignment_role||null,
    source:row.source||'native',
  }
}

export async function loadCanonicalAccessSession(input:{
  workspaceId:string
  userId:string
}):Promise<CanonicalAccessSession>{
  const [{data:member,error:memberError},{data:assignmentRows,error:assignmentError}]=await Promise.all([
    supabase.from('workspace_members').select(`
      workspace_id,
      user_id,
      role,
      status,
      is_default,
      discipline,
      permission_profile_key,
      portal_role,
      workspace_type
    `).eq('workspace_id',input.workspaceId).eq('user_id',input.userId).maybeSingle(),
    supabase.from('member_access_assignments').select('*')
      .eq('workspace_id',input.workspaceId)
      .eq('user_id',input.userId),
  ])

  if(memberError)throw memberError
  if(assignmentError)throw assignmentError

  if(!member){
    return {
      loading:false,error:null,workspaceId:input.workspaceId,userId:input.userId,
      role:null,permissionProfileKey:null,discipline:null,status:null,isDefault:false,
      portalRole:null,workspaceType:null,assignments:[],
    }
  }

  return {
    loading:false,
    error:null,
    workspaceId:String(member.workspace_id),
    userId:String(member.user_id),
    role:member.role||null,
    permissionProfileKey:member.permission_profile_key||null,
    discipline:member.discipline||null,
    status:member.status||'active',
    isDefault:Boolean(member.is_default),
    portalRole:member.portal_role||null,
    workspaceType:member.workspace_type||null,
    assignments:(assignmentRows||[]).map(mapAssignment),
  }
}

export function hasScopeAccess(
  session:CanonicalAccessSession,
  scopeType:AccessScopeType,
  scopeId:string|null|undefined,
  minimum:AccessLevel='view',
  discipline?:string|null
){
  if(session.status!=='active')return false

  if(['workspace_admin','pmo'].includes(session.permissionProfileKey||'')){
    return true
  }

  return session.assignments.some(item=>
    item.scopeType===scopeType
    &&(scopeType==='workspace'||!scopeId||item.scopeId===String(scopeId))
    &&(!discipline||item.discipline===discipline)
    &&ACCESS_RANK[item.accessLevel]>=ACCESS_RANK[minimum]
  )
}

export function canPerform(
  session:CanonicalAccessSession,
  action:PermissionAction,
  context?:{
    scopeType?:AccessScopeType
    scopeId?:string|number|null
    discipline?:string|null
  }
){
  if(session.status!=='active')return false
  const profile=session.permissionProfileKey||'workspace_member'
  const allowed=PROFILE_ACTIONS[profile]||PROFILE_ACTIONS.workspace_member
  if(!allowed.includes(action))return false

  if(!context?.scopeType)return true

  const minimum:AccessLevel=
    action.endsWith('.manage')||action==='project.delete'||action==='team.manage'||action==='documents.delete'?'manage':
    action.endsWith('.edit')||action==='schedule.edit'||action==='schedule.import'||action==='documents.upload'||action==='reports.review'?'edit':
    action.endsWith('.contribute')||action==='hse.create'?'contribute':'view'

  return hasScopeAccess(
    session,
    context.scopeType,
    context.scopeId===null||context.scopeId===undefined?null:String(context.scopeId),
    minimum,
    context.discipline||null
  )
}

export function projectIdsFromAssignments(assignments:CanonicalAccessAssignment[]){
  return assignments
    .filter(item=>item.scopeType==='project'&&item.scopeId!==null)
    .map(item=>Number(item.scopeId))
    .filter(Number.isFinite)
}

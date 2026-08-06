
import { canPerform as canPerformCanonical } from '@/access/accessService'
import type {
  CanonicalAccessAssignment,
  CanonicalAccessSession,
  PermissionAction,
} from '@/access/accessTypes'

export type SecuredAction =
  | 'project.view' | 'project.edit' | 'project.delete'
  | 'schedule.view' | 'schedule.edit' | 'schedule.import'
  | 'procurement.edit' | 'approval.edit' | 'document.upload'
  | 'hse.edit' | 'hse.close' | 'workspace.invite' | 'audit.view'

export type AuthorizationContext = {
  role: string | null
  permissionProfileKey?: string | null
  status?: string | null
  workspaceId?: string | null
  userId?: string | null
  accessScope?: 'workspace' | 'portfolio' | 'project' | null
  projectId?: number | null
  assignedProjectIds?: number[]
  discipline?: string | null
  assignments?: CanonicalAccessAssignment[]
}

const ACTION_MAP:Record<SecuredAction,PermissionAction>={
  'project.view':'project.view',
  'project.edit':'project.edit',
  'project.delete':'project.delete',
  'schedule.view':'schedule.view',
  'schedule.edit':'schedule.edit',
  'schedule.import':'schedule.import',
  'procurement.edit':'procurement.edit',
  'approval.edit':'approvals.edit',
  'document.upload':'documents.upload',
  'hse.edit':'hse.create',
  'hse.close':'hse.close',
  'workspace.invite':'team.invite',
  'audit.view':'audit.view',
}

function compatibilityAssignments(ctx:AuthorizationContext):CanonicalAccessAssignment[]{
  if(ctx.assignments?.length)return ctx.assignments

  const workspaceId=ctx.workspaceId||'compatibility-workspace'
  const userId=ctx.userId||'compatibility-user'
  const result:CanonicalAccessAssignment[]=[]

  if(ctx.accessScope==='workspace'){
    result.push({
      id:'compat-workspace',
      workspaceId,
      userId,
      scopeType:'workspace',
      scopeId:null,
      discipline:ctx.discipline||null,
      accessLevel:'manage',
      assignmentRole:ctx.role,
      source:'compatibility',
    })
  }

  for(const projectId of ctx.assignedProjectIds||[]){
    result.push({
      id:`compat-project-${projectId}`,
      workspaceId,
      userId,
      scopeType:'project',
      scopeId:String(projectId),
      discipline:ctx.discipline||null,
      accessLevel:'edit',
      assignmentRole:ctx.role,
      source:'compatibility',
    })
  }

  return result
}

export function canPerform(action:SecuredAction,ctx:AuthorizationContext):boolean{
  const session:CanonicalAccessSession={
    loading:false,
    error:null,
    workspaceId:ctx.workspaceId||null,
    userId:ctx.userId||null,
    role:ctx.role,
    permissionProfileKey:ctx.permissionProfileKey||ctx.role||'workspace_member',
    discipline:ctx.discipline||null,
    status:ctx.status||'active',
    isDefault:true,
    portalRole:ctx.role,
    workspaceType:null,
    assignments:compatibilityAssignments(ctx),
  }

  const projectScoped=ctx.projectId!==null&&ctx.projectId!==undefined
  return canPerformCanonical(
    session,
    ACTION_MAP[action],
    projectScoped
      ? {scopeType:'project',scopeId:ctx.projectId,discipline:ctx.discipline||null}
      : undefined
  )
}

export function assertAuthorized(action:SecuredAction,ctx:AuthorizationContext){
  if(!canPerform(action,ctx))throw new Error(`Not authorized to perform ${action}`)
}

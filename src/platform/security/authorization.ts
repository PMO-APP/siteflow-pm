export type SecuredAction =
  | 'project.view' | 'project.edit' | 'project.delete'
  | 'schedule.view' | 'schedule.edit' | 'schedule.import'
  | 'procurement.edit' | 'approval.edit' | 'document.upload'
  | 'hse.edit' | 'hse.close' | 'workspace.invite' | 'audit.view'

export type AuthorizationContext = {
  role: string | null
  accessScope?: 'workspace' | 'portfolio' | 'project' | null
  projectId?: number | null
  assignedProjectIds?: number[]
  discipline?: string | null
}

const ADMIN_ROLES = new Set(['workspace_admin', 'admin'])
const PMO_ROLES = new Set(['pmo', 'portfolio_manager'])
const READ_ONLY_ROLES = new Set(['viewer', 'guest'])

export function canPerform(action: SecuredAction, ctx: AuthorizationContext): boolean {
  const role = ctx.role ?? 'guest'
  if (ADMIN_ROLES.has(role)) return true
  if (READ_ONLY_ROLES.has(role)) return action.endsWith('.view')
  if (PMO_ROLES.has(role)) return action !== 'project.delete'

  const assigned = !ctx.projectId || (ctx.assignedProjectIds ?? []).includes(ctx.projectId)
  if (!assigned && ctx.accessScope === 'project') return action.endsWith('.view')

  if (role === 'hse' || role === 'hse_lead' || role === 'hse_manager') {
    return action.endsWith('.view') || action === 'hse.edit' ||
      (action === 'hse.close' && role !== 'hse')
  }
  if (['contractor', 'consultant', 'vendor', 'subcontractor'].includes(role)) {
    return action.endsWith('.view') || action === 'document.upload'
  }
  if (action === 'schedule.import' || action === 'workspace.invite' || action === 'project.delete') return false
  return assigned
}

export function assertAuthorized(action: SecuredAction, ctx: AuthorizationContext) {
  if (!canPerform(action, ctx)) throw new Error(`Not authorized to perform ${action}`)
}

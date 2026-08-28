import { supabase } from '@/lib/supabase'
import type {
  AccessLevel,
  AccessScopeType,
  CanonicalAccessAssignment,
  CanonicalAccessSession,
  PermissionAction,
} from './accessTypes'

const ACCESS_RANK: Record<AccessLevel, number> = {
  view: 1,
  contribute: 2,
  edit: 3,
  manage: 4,
}

const INTERNAL_ROLES = new Set([
  'workspace_admin','admin','pmo','portfolio_manager','project_owner','project_manager',
  'overall_project_owner','design','design_project_owner','housebuild','housebuild_project_owner',
  'infrastructure','infrastructure_project_owner','mep','mep_project_owner','costing',
  'hse','hse_manager','hse_lead','hse_officer','hse_project_owner','viewer',
])

const DESIGN_ALLOWED_ACTIONS: PermissionAction[] = [
  'workspace.view','portfolio.view','project.view','schedule.view',
  'documents.view','documents.upload','procurement.view','approvals.view',
  'quality.view','snags.view','snags.edit','risk.view','reports.view','reports.edit',
  'reports.export','costing.view',
]

const PROFILE_ACTIONS: Record<string, PermissionAction[]> = {
  workspace_admin: [
    'workspace.view','workspace.manage','portfolio.view','portfolio.edit',
    'project.view','project.contribute','project.edit','project.manage','project.delete',
    'schedule.view','schedule.edit','schedule.import','documents.view','documents.upload','documents.delete',
    'procurement.view','procurement.edit','approvals.view','approvals.edit','quality.view','quality.edit',
    'snags.view','snags.edit','risk.view','risk.edit','reports.view','reports.edit','reports.review','reports.export',
    'costing.view','costing.edit','hse.create','hse.close','team.invite','team.manage','notifications.announce','audit.view',
  ],
  admin: [
    'workspace.view','workspace.manage','portfolio.view','portfolio.edit',
    'project.view','project.contribute','project.edit','project.manage','project.delete',
    'schedule.view','schedule.edit','schedule.import','documents.view','documents.upload','documents.delete',
    'procurement.view','procurement.edit','approvals.view','approvals.edit','quality.view','quality.edit',
    'snags.view','snags.edit','risk.view','risk.edit','reports.view','reports.edit','reports.review','reports.export',
    'costing.view','costing.edit','hse.create','hse.close','team.invite','team.manage','notifications.announce','audit.view',
  ],
  pmo: [
    'workspace.view','workspace.manage','portfolio.view','portfolio.edit','project.view','project.contribute','project.edit','project.manage',
    'schedule.view','schedule.edit','schedule.import','documents.view','documents.upload','documents.delete',
    'procurement.view','procurement.edit','approvals.view','approvals.edit','quality.view','quality.edit',
    'snags.view','snags.edit','risk.view','risk.edit','reports.view','reports.edit','reports.review','reports.export',
    'costing.view','hse.create','hse.close','team.invite','team.manage','notifications.announce','audit.view',
  ],
  project_owner: [
    'workspace.view','portfolio.view','project.view','project.contribute','project.edit','project.manage',
    'schedule.view','schedule.edit','documents.view','documents.upload','procurement.view','procurement.edit',
    'approvals.view','approvals.edit','quality.view','quality.edit','snags.view','snags.edit','risk.view','risk.edit',
    'reports.view','reports.edit','reports.export','costing.view','hse.create',
  ],
  discipline_project_owner: [
    'workspace.view','portfolio.view','project.view','project.contribute','project.edit','schedule.view','schedule.edit',
    'documents.view','documents.upload','procurement.view','procurement.edit','approvals.view','approvals.edit',
    'quality.view','quality.edit','snags.view','snags.edit','risk.view','risk.edit','reports.view','reports.edit',
    'reports.export','costing.view','costing.edit','hse.create',
  ],
  hse_manager: ['workspace.view','portfolio.view','project.view','hse.create','hse.close','reports.view','reports.edit'],
  hse_officer: ['workspace.view','portfolio.view','project.view','hse.create','reports.view','reports.edit'],
  discipline_member: [
    'workspace.view','portfolio.view','project.view','project.contribute','project.edit','schedule.view','schedule.edit',
    'documents.view','documents.upload','procurement.view','procurement.edit','approvals.view','approvals.edit',
    'quality.view','quality.edit','snags.view','snags.edit','risk.view','risk.edit','reports.view','reports.edit',
    'reports.export','costing.view','costing.edit','hse.create',
  ],
  consultant: ['workspace.view','portfolio.view','project.view','project.contribute','schedule.view','documents.view','documents.upload','procurement.view','approvals.view','quality.view','snags.view','risk.view','reports.view'],
  contractor: ['workspace.view','portfolio.view','project.view','project.contribute','schedule.view','documents.view','documents.upload','procurement.view','approvals.view','quality.view','snags.view','risk.view','reports.view','hse.create'],
  vendor: ['workspace.view','portfolio.view','project.view','documents.view','procurement.view'],
  viewer: ['workspace.view','portfolio.view','project.view','schedule.view','documents.view','procurement.view','approvals.view','quality.view','snags.view','risk.view','reports.view','costing.view'],
  workspace_member: ['workspace.view','portfolio.view','project.view','schedule.view','documents.view','procurement.view','approvals.view','quality.view','snags.view','risk.view','reports.view','costing.view'],
}

function normalizeDiscipline(value?: string | null) {
  const clean = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (!clean) return null
  if (clean === 'mechanical' || clean === 'electrical' || clean === 'm&e' || clean === 'mep') return 'mep'
  if (clean.includes('housebuild')) return 'housebuild'
  if (clean.includes('infrastructure')) return 'infrastructure'
  if (clean.includes('design')) return 'design'
  if (clean.includes('cost')) return 'costing'
  if (clean.includes('hse') || clean.includes('safety')) return 'hse'
  if (clean === 'overall' || clean.includes('project owner')) return 'overall'
  return clean
}

function disciplinesMatch(a?: string | null, b?: string | null) {
  const left = normalizeDiscipline(a)
  const right = normalizeDiscipline(b)
  if (!right) return true
  if (!left) return false
  return left === right
}

function mapAssignment(row: any): CanonicalAccessAssignment {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    userId: String(row.user_id),
    scopeType: row.scope_type,
    scopeId: row.scope_id === null ? null : String(row.scope_id),
    discipline: row.discipline || null,
    accessLevel: row.access_level,
    assignmentRole: row.assignment_role || null,
    source: row.source || 'native',
  }
}

function mapDelegation(row: any): CanonicalAccessAssignment {
  return {
    id: `delegation:${row.id}`,
    workspaceId: String(row.workspace_id),
    userId: String(row.to_user_id),
    scopeType: 'project',
    scopeId: String(row.project_id),
    discipline: row.discipline || null,
    accessLevel: 'edit',
    assignmentRole: 'temporary_delegate',
    source: 'delegation',
  }
}

export async function loadCanonicalAccessSession(input: { workspaceId: string; userId: string }): Promise<CanonicalAccessSession> {
  const now = new Date().toISOString()
  const [memberResult, assignmentResult, delegationResult] = await Promise.all([
    supabase.from('workspace_members').select(`workspace_id,user_id,role,status,is_default,discipline,permission_profile_key,portal_role,workspace_type`).eq('workspace_id', input.workspaceId).eq('user_id', input.userId).maybeSingle(),
    supabase.from('member_access_assignments').select('*').eq('workspace_id', input.workspaceId).eq('user_id', input.userId),
    supabase.from('project_access_delegations').select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('to_user_id', input.userId)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gte('ends_at', now),
  ])

  if (memberResult.error) throw memberResult.error
  if (assignmentResult.error) throw assignmentResult.error
  // Backward-compatible rollout: the app still loads if the migration has not
  // yet been applied. Delegations simply remain unavailable until it is run.
  if (delegationResult.error && delegationResult.error.code !== '42P01') {
    console.error('Delegation access loading failed:', delegationResult.error.message)
  }

  const member = memberResult.data
  if (!member) {
    return { loading:false,error:null,workspaceId:input.workspaceId,userId:input.userId,role:null,permissionProfileKey:null,discipline:null,status:null,isDefault:false,portalRole:null,workspaceType:null,assignments:[] }
  }

  return {
    loading:false,error:null,workspaceId:String(member.workspace_id),userId:String(member.user_id),
    role:member.role || null,permissionProfileKey:member.permission_profile_key || null,discipline:member.discipline || null,
    status:member.status || 'active',isDefault:Boolean(member.is_default),portalRole:member.portal_role || null,workspaceType:member.workspace_type || null,
    assignments:[...(assignmentResult.data || []).map(mapAssignment), ...(!delegationResult.error ? (delegationResult.data || []).map(mapDelegation) : [])],
  }
}

function isInternalSession(session: CanonicalAccessSession) {
  return INTERNAL_ROLES.has(String(session.role || '').toLowerCase()) ||
    ['workspace_admin','pmo','project_owner','discipline_project_owner','discipline_member','hse_manager','hse_officer','viewer','workspace_member'].includes(session.permissionProfileKey || '')
}

export function hasScopeAccess(
  session: CanonicalAccessSession,
  scopeType: AccessScopeType,
  scopeId: string | null | undefined,
  minimum: AccessLevel = 'view',
  discipline?: string | null
) {
  if (session.status !== 'active') return false

  const profile = session.permissionProfileKey || ''
  const role = String(session.role || '').toLowerCase()

  // Administrators are the only implicit edit-anywhere profiles. PMO keeps
  // workspace governance/review powers but project data edits still require a
  // named assignment, exactly like every other delivery user.
  if (['workspace_admin','admin'].includes(profile) || ['workspace_admin','admin'].includes(role)) return true

  // Workspace membership is visibility, not ownership. Internal users may see
  // project/portfolio truth across the workspace without receiving edit rights.
  if (minimum === 'view' && isInternalSession(session) && ['workspace','portfolio','project'].includes(scopeType)) return true

  if (scopeType === 'workspace' && ['workspace_admin','pmo'].includes(profile) && ACCESS_RANK[minimum] <= ACCESS_RANK.manage) return true

  return session.assignments.some(item =>
    item.scopeType === scopeType &&
    (scopeType === 'workspace' || !scopeId || item.scopeId === String(scopeId)) &&
    (!discipline || disciplinesMatch(item.discipline, discipline)) &&
    ACCESS_RANK[item.accessLevel] >= ACCESS_RANK[minimum]
  )
}

export function canPerform(
  session: CanonicalAccessSession,
  action: PermissionAction,
  context?: { scopeType?: AccessScopeType; scopeId?: string | number | null; discipline?: string | null }
) {
  if (session.status !== 'active') return false
  const profile = session.permissionProfileKey || 'workspace_member'
  const isDesignMember = String(session.role || '').toLowerCase() === 'design' || normalizeDiscipline(session.discipline) === 'design'
  const allowed = isDesignMember ? DESIGN_ALLOWED_ACTIONS : (PROFILE_ACTIONS[profile] || PROFILE_ACTIONS.workspace_member)
  if (!allowed.includes(action)) return false

  // PMO governance actions remain workspace-wide even though PMO no longer has
  // invisible edit-any-project authority.
  if ((profile === 'pmo' || String(session.role || '').toLowerCase() === 'pmo') &&
      ['reports.review','reports.export','team.invite','team.manage','workspace.manage','audit.view','notifications.announce'].includes(action)) return true

  if (!context?.scopeType) {
    // Mutating project actions without project context are intentionally denied
    // for ordinary members. This prevents a page forgetting to scope an edit.
    const mutating = action.endsWith('.edit') || action.endsWith('.manage') || action.endsWith('.contribute') ||
      ['schedule.edit','schedule.import','documents.upload','documents.delete','hse.create','hse.close','project.delete'].includes(action)
    if (mutating && !['workspace_admin','admin'].includes(profile)) return false
    return true
  }

  const minimum: AccessLevel =
    action.endsWith('.manage') || action === 'project.delete' || action === 'team.manage' || action === 'documents.delete' ? 'manage' :
    action.endsWith('.edit') || action === 'schedule.edit' || action === 'schedule.import' || action === 'documents.upload' || action === 'reports.review' ? 'edit' :
    action.endsWith('.contribute') || action === 'hse.create' ? 'contribute' : 'view'

  return hasScopeAccess(session, context.scopeType, context.scopeId == null ? null : String(context.scopeId), minimum, context.discipline || null)
}

export function projectIdsFromAssignments(assignments: CanonicalAccessAssignment[]) {
  return Array.from(new Set(assignments
    .filter(item => item.scopeType === 'project' && item.scopeId !== null && ACCESS_RANK[item.accessLevel] >= ACCESS_RANK.edit)
    .map(item => Number(item.scopeId))
    .filter(Number.isFinite)))
}

export function activeDelegationsFromAssignments(assignments: CanonicalAccessAssignment[]) {
  return assignments.filter(item => item.source === 'delegation')
}


import { supabase } from '@/lib/supabase'
import type {
  CustomerAdministrationData,
  CustomerAdminMember,
  WorkspaceCompanyProfile,
  WorkspaceCostCentre,
  WorkspaceDepartment,
  WorkspaceLocation,
  WorkspaceSecurityPolicy,
} from './customerAdminTypes'

const DEFAULT_PROFILE = (workspaceId: string, name = ''): WorkspaceCompanyProfile => ({
  workspaceId,
  legalName: name,
  registrationNumber: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
})

const DEFAULT_SECURITY = (workspaceId: string): WorkspaceSecurityPolicy => ({
  workspaceId,
  sessionTimeoutMinutes: 30,
  requireMfa: false,
  enforceStrongPasswords: true,
  inviteExpiryDays: 7,
  allowedEmailDomains: [],
  ssoEnabled: false,
})

function mapDepartment(row: any): WorkspaceDepartment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    code: row.code,
    description: row.description,
    isActive: row.is_active !== false,
  }
}

function mapCostCentre(row: any): WorkspaceCostCentre {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    code: row.code,
    description: row.description,
    isActive: row.is_active !== false,
  }
}

function mapLocation(row: any): WorkspaceLocation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.location_type || 'office',
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    isActive: row.is_active !== false,
  }
}

export async function loadCustomerAdministration(
  workspaceId: string,
  workspaceName: string
): Promise<CustomerAdministrationData> {
  const [
    profileRes,
    securityRes,
    departmentsRes,
    costCentresRes,
    locationsRes,
    membersRes,
    subscriptionRes,
    inviteRes,
  ] = await Promise.all([
    supabase.from('workspace_company_profiles').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('workspace_security_policies').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('workspace_departments').select('*').eq('workspace_id', workspaceId).order('name'),
    supabase.from('workspace_cost_centres').select('*').eq('workspace_id', workspaceId).order('name'),
    supabase.from('workspace_locations').select('*').eq('workspace_id', workspaceId).order('name'),
    supabase
      .from('workspace_members')
      .select('workspace_id,user_id,role,status,department_id,job_title,joined_at,workspace_departments(name)')
      .eq('workspace_id', workspaceId)
      .order('joined_at'),
    supabase.from('workspace_subscriptions').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('team_invitations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'pending'),
  ])

  const hardErrors = [
    profileRes.error,
    securityRes.error,
    departmentsRes.error,
    costCentresRes.error,
    locationsRes.error,
    membersRes.error,
    subscriptionRes.error,
  ].filter(Boolean)
  if (hardErrors.length) throw hardErrors[0]

  const userIds = (membersRes.data || []).map((member: any) => member.user_id)
  let identities: any[] = []
  if (userIds.length) {
    const { data } = await supabase
      .from('memberships')
      .select('user_id,email,full_name')
      .in('user_id', userIds)
    identities = data || []
  }
  const identityById = new Map(identities.map(item => [String(item.user_id), item]))

  const members: CustomerAdminMember[] = (membersRes.data || []).map((row: any) => {
    const identity = identityById.get(String(row.user_id))
    const department = Array.isArray(row.workspace_departments)
      ? row.workspace_departments[0]
      : row.workspace_departments
    return {
      userId: row.user_id,
      email: identity?.email || '',
      fullName: identity?.full_name || identity?.email || 'Workspace member',
      role: row.role,
      status: row.status === 'inactive' ? 'inactive' : 'active',
      departmentId: row.department_id,
      departmentName: department?.name || null,
      jobTitle: row.job_title,
      joinedAt: row.joined_at,
    }
  })

  const profileRow: any = profileRes.data
  const profile = profileRow
    ? {
        workspaceId,
        legalName: profileRow.legal_name || workspaceName,
        registrationNumber: profileRow.registration_number || '',
        contactEmail: profileRow.contact_email || '',
        contactPhone: profileRow.contact_phone || '',
        website: profileRow.website || '',
        address: profileRow.address || '',
        city: profileRow.city || '',
        state: profileRow.state || '',
        country: profileRow.country || 'Nigeria',
      }
    : DEFAULT_PROFILE(workspaceId, workspaceName)

  const securityRow: any = securityRes.data
  const security = securityRow
    ? {
        workspaceId,
        sessionTimeoutMinutes: Number(securityRow.session_timeout_minutes || 30),
        requireMfa: Boolean(securityRow.require_mfa),
        enforceStrongPasswords: securityRow.enforce_strong_passwords !== false,
        inviteExpiryDays: Number(securityRow.invite_expiry_days || 7),
        allowedEmailDomains: securityRow.allowed_email_domains || [],
        ssoEnabled: Boolean(securityRow.sso_enabled),
      }
    : DEFAULT_SECURITY(workspaceId)

  const subscription: any = subscriptionRes.data || {}
  const activeMembers = members.filter(member => member.status === 'active').length
  const seats = subscription.seats == null ? null : Number(subscription.seats)

  return {
    profile,
    security,
    departments: (departmentsRes.data || []).map(mapDepartment),
    costCentres: (costCentresRes.data || []).map(mapCostCentre),
    locations: (locationsRes.data || []).map(mapLocation),
    members,
    pendingInvites: inviteRes.count || 0,
    license: {
      plan: subscription.plan || 'enterprise',
      status: subscription.status || 'active',
      seats,
      activeMembers,
      availableSeats: seats == null ? null : Math.max(0, seats - activeMembers),
      utilizationPercent: seats ? Math.min(100, Math.round((activeMembers / seats) * 100)) : null,
    },
  }
}

export async function saveCompanyProfile(profile: WorkspaceCompanyProfile) {
  const { error } = await supabase.from('workspace_company_profiles').upsert({
    workspace_id: profile.workspaceId,
    legal_name: profile.legalName,
    registration_number: profile.registrationNumber || null,
    contact_email: profile.contactEmail || null,
    contact_phone: profile.contactPhone || null,
    website: profile.website || null,
    address: profile.address || null,
    city: profile.city || null,
    state: profile.state || null,
    country: profile.country || null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function saveSecurityPolicy(policy: WorkspaceSecurityPolicy) {
  const { error } = await supabase.from('workspace_security_policies').upsert({
    workspace_id: policy.workspaceId,
    session_timeout_minutes: policy.sessionTimeoutMinutes,
    require_mfa: policy.requireMfa,
    enforce_strong_passwords: policy.enforceStrongPasswords,
    invite_expiry_days: policy.inviteExpiryDays,
    allowed_email_domains: policy.allowedEmailDomains,
    sso_enabled: policy.ssoEnabled,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function createDepartment(workspaceId: string, values: { name: string; code?: string; description?: string }) {
  const { error } = await supabase.from('workspace_departments').insert({
    workspace_id: workspaceId,
    name: values.name.trim(),
    code: values.code?.trim() || null,
    description: values.description?.trim() || null,
  })
  if (error) throw error
}

export async function createCostCentre(workspaceId: string, values: { name: string; code: string; description?: string }) {
  const { error } = await supabase.from('workspace_cost_centres').insert({
    workspace_id: workspaceId,
    name: values.name.trim(),
    code: values.code.trim(),
    description: values.description?.trim() || null,
  })
  if (error) throw error
}

export async function createLocation(workspaceId: string, values: { name: string; type: string; address?: string; city?: string; state?: string; country?: string }) {
  const { error } = await supabase.from('workspace_locations').insert({
    workspace_id: workspaceId,
    name: values.name.trim(),
    location_type: values.type,
    address: values.address?.trim() || null,
    city: values.city?.trim() || null,
    state: values.state?.trim() || null,
    country: values.country?.trim() || null,
  })
  if (error) throw error
}

export async function updateMember(
  workspaceId: string,
  userId: string,
  values: { role: string; status: 'active' | 'inactive'; departmentId: string | null; jobTitle: string | null }
) {
  const { error } = await supabase
    .from('workspace_members')
    .update({
      role: values.role,
      status: values.status,
      department_id: values.departmentId,
      job_title: values.jobTitle,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteStructureRecord(table: 'workspace_departments' | 'workspace_cost_centres' | 'workspace_locations', workspaceId: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('workspace_id', workspaceId).eq('id', id)
  if (error) throw error
}

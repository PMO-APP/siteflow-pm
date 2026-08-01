import { supabase } from '@/lib/supabase'
import type { Workspace, WorkspaceBranding, WorkspaceSettings } from './types'

const DEFAULT_SETTINGS: WorkspaceSettings = {
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  dateFormat: 'dd/MM/yyyy',
  locale: 'en-NG',
  industry: 'Real Estate Development',
}

const DEFAULT_BRANDING: WorkspaceBranding = {
  logoUrl: null,
  primaryColor: '#173f5f',
  secondaryColor: '#ef8354',
  loginBackgroundUrl: null,
  emailHeaderUrl: null,
  reportFooter: null,
}

function mapWorkspace(row: any): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status || 'active',
    plan: row.plan || 'enterprise',
    createdAt: row.created_at,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(row.workspace_settings?.[0] || row.workspace_settings || {}),
    },
    branding: {
      ...DEFAULT_BRANDING,
      ...(row.workspace_branding?.[0] || row.workspace_branding || {}),
      logoUrl: row.workspace_branding?.[0]?.logo_url ?? row.workspace_branding?.logo_url ?? null,
      primaryColor: row.workspace_branding?.[0]?.primary_color ?? row.workspace_branding?.primary_color ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: row.workspace_branding?.[0]?.secondary_color ?? row.workspace_branding?.secondary_color ?? DEFAULT_BRANDING.secondaryColor,
      loginBackgroundUrl: row.workspace_branding?.[0]?.login_background_url ?? null,
      emailHeaderUrl: row.workspace_branding?.[0]?.email_header_url ?? null,
      reportFooter: row.workspace_branding?.[0]?.report_footer ?? null,
    },
  }
}

export async function listUserWorkspaces(userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`workspace_id, is_default, workspaces (
      id, name, slug, status, plan, created_at,
      workspace_settings (*),
      workspace_branding (*)
    )`)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })

  if (error) throw error

  return (data || [])
    .map((item: any) => item.workspaces)
    .filter(Boolean)
    .map(mapWorkspace)
}

export async function updateWorkspaceProfile(
  workspaceId: string,
  values: Pick<Workspace, 'name'> & { industry: string; timezone: string; currency: string }
) {
  const [{ error: workspaceError }, { error: settingsError }] = await Promise.all([
    supabase.from('workspaces').update({ name: values.name }).eq('id', workspaceId),
    supabase.from('workspace_settings').upsert({
      workspace_id: workspaceId,
      industry: values.industry,
      timezone: values.timezone,
      currency: values.currency,
    }),
  ])

  if (workspaceError) throw workspaceError
  if (settingsError) throw settingsError
}

export async function updateWorkspaceBranding(
  workspaceId: string,
  branding: Pick<WorkspaceBranding, 'primaryColor' | 'secondaryColor' | 'reportFooter'>
) {
  const { error } = await supabase.from('workspace_branding').upsert({
    workspace_id: workspaceId,
    primary_color: branding.primaryColor,
    secondary_color: branding.secondaryColor,
    report_footer: branding.reportFooter,
  })

  if (error) throw error
}

export function scopeWorkspace<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  workspaceId: string | null | undefined
): T {
  if (!workspaceId) throw new Error('An active workspace is required for this operation.')
  return query.eq('workspace_id', workspaceId)
}

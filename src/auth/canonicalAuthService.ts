
import { supabase } from '@/lib/supabase'
import { getWorkspaceHome, resolveWorkspace } from '@/platform/access'

export type CanonicalLoginMembership = {
  workspace_id: string
  role: string | null
  workspace_type: string | null
  is_default: boolean | null
  status: string | null
}

export async function listCanonicalLoginMemberships(
  userId: string
): Promise<CanonicalLoginMembership[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspace_type, is_default, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('is_default', { ascending: false })

  if (error) throw error
  return (data || []) as CanonicalLoginMembership[]
}

export async function resolveCanonicalLoginPath(userId: string) {
  const rows = await listCanonicalLoginMemberships(userId)
  const external = rows.find(
    item => resolveWorkspace(item.role, item.workspace_type) !== 'internal'
  )
  const selected = external || rows.find(item => item.is_default) || rows[0]
  return getWorkspaceHome(
    resolveWorkspace(selected?.role, selected?.workspace_type)
  )
}

export async function upsertCanonicalProfile(input: {
  userId: string
  email: string
  fullName: string
  role: string
}) {
  const { error } = await supabase.from('profiles').upsert({
    id: input.userId,
    email: input.email.trim().toLowerCase(),
    full_name: input.fullName.trim(),
    role: input.role,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function getSignedInUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

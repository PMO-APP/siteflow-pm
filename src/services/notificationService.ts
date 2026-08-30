
import { supabase } from '@/lib/supabase'
import type { NotificationPreference, WorkspaceAnnouncement, WorkspaceNotification } from './notificationTypes'

function mapNotification(row: any): WorkspaceNotification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    type: row.type || 'info',
    category: row.category || row.type || 'general',
    title: row.title || 'Notification',
    message: row.message || '',
    priority: row.priority || 'normal',
    actionUrl: row.action_url || null,
    sourceModule: row.source_module || null,
    isRead: Boolean(row.is_read),
    readAt: row.read_at || null,
    createdAt: row.created_at,
  }
}

export async function listNotifications(input: {
  workspaceId: string
  userId: string
  role?: string | null
  projectId?: string | number | null
  unreadOnly?: boolean
  limit?: number
}) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .order('created_at', { ascending: false })
    .limit(input.limit || 100)

  const audience = [`user_id.eq.${input.userId}`]
  if (input.role) audience.push(`role.eq.${input.role}`)
  audience.push('user_id.is.null')
  query = query.or(audience.join(','))
  if (input.projectId) query = query.or(`project_id.eq.${input.projectId},project_id.is.null`)
  if (input.unreadOnly) query = query.eq('is_read', false)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapNotification)
}

export async function markNotificationRead(id: string | number) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markNotificationsRead(ids: Array<string | number>) {
  if (!ids.length) return
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
}

export async function getNotificationPreference(workspaceId: string, userId: string): Promise<NotificationPreference> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return {
    workspaceId,
    userId,
    inAppEnabled: data?.in_app_enabled !== false,
    emailEnabled: Boolean(data?.email_enabled),
    pushEnabled: Boolean(data?.push_enabled),
    digestFrequency: data?.digest_frequency || 'instant',
    quietHoursStart: data?.quiet_hours_start || null,
    quietHoursEnd: data?.quiet_hours_end || null,
    categories: data?.categories || {
      schedule: true, approvals: true, procurement: true, quality: true,
      hse: true, risks: true, assignments: true, administration: true
    },
  }
}

export async function saveNotificationPreference(preference: NotificationPreference) {
  const { error } = await supabase.from('notification_preferences').upsert({
    workspace_id: preference.workspaceId,
    user_id: preference.userId,
    in_app_enabled: preference.inAppEnabled,
    email_enabled: preference.emailEnabled,
    push_enabled: preference.pushEnabled,
    digest_frequency: preference.digestFrequency,
    quiet_hours_start: preference.quietHoursStart,
    quiet_hours_end: preference.quietHoursEnd,
    categories: preference.categories,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function listAnnouncements(workspaceId: string, role?: string | null) {
  let query = supabase
    .from('workspace_announcements')
    .select('*')
    .eq('workspace_id', workspaceId)
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
  if (role) query = query.or(`audience_role.is.null,audience_role.eq.${role}`)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row: any): WorkspaceAnnouncement => ({
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    message: row.message,
    priority: row.priority || 'normal',
    audienceRole: row.audience_role,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

export async function createAnnouncement(input: {
  workspaceId: string
  title: string
  message: string
  priority: string
  audienceRole?: string | null
  audienceLabel?: string | null
  recipientUserIds?: string[]
  startsAt?: string
  endsAt?: string | null
}) {
  const { data: auth } = await supabase.auth.getUser()
  const recipientUserIds = Array.from(new Set((input.recipientUserIds || []).filter(Boolean)))

  // An explicit recipient list is delivered as one notification per workspace member.
  // This supports people, departments and permission-based teams without overloading
  // workspace_announcements.audience_role or accidentally broadcasting the message.
  if (recipientUserIds.length) {
    const { error } = await supabase.from('notifications').insert(recipientUserIds.map(userId => ({
      workspace_id: input.workspaceId,
      user_id: userId,
      type: 'info',
      category: 'administration',
      title: input.title,
      message: input.message,
      priority: input.priority,
      action_url: '/app/notifications',
      source_module: 'announcements',
      is_read: false,
    })))
    if (error) throw error
    return
  }

  // Workspace-wide broadcasts remain true announcements and are visible in the
  // Announcements tab for everyone in the workspace.
  const { error } = await supabase.from('workspace_announcements').insert({
    workspace_id: input.workspaceId,
    title: input.title,
    message: input.message,
    priority: input.priority,
    audience_role: input.audienceRole || null,
    starts_at: input.startsAt || new Date().toISOString(),
    ends_at: input.endsAt || null,
    created_by: auth.user?.id || null,
  })
  if (error) throw error
}


export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'
export type NotificationChannel = 'in_app' | 'email' | 'push'

export type WorkspaceNotification = {
  id: string | number
  workspaceId: string | null
  projectId: string | number | null
  userId: string | null
  role: string | null
  type: string
  category: string
  title: string
  message: string
  priority: NotificationPriority
  actionUrl: string | null
  sourceModule: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export type NotificationPreference = {
  workspaceId: string
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
  digestFrequency: 'instant' | 'daily' | 'weekly' | 'off'
  quietHoursStart: string | null
  quietHoursEnd: string | null
  categories: Record<string, boolean>
}

export type WorkspaceAnnouncement = {
  id: string
  workspaceId: string
  title: string
  message: string
  priority: NotificationPriority
  audienceRole: string | null
  startsAt: string
  endsAt: string | null
  createdBy: string | null
  createdAt: string
}

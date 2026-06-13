import { supabase } from '@/lib/supabase'

type NotifyUsersParams = {
  projectId?: number | null
  recipientUserId?: string | null
  recipientRole?: string | null
  type: string
  title: string
  message?: string
  sendEmail?: boolean
  emailPayload?: {
    to?: string[]
    subject?: string
    type?: string
    projectName?: string
    submittedBy?: string
    submittedByEmail?: string
    message?: string
    reviewUrl?: string
  }
}

export async function notifyUsers({
  projectId = null,
  recipientUserId = null,
  recipientRole = null,
  type,
  title,
  message = '',
  sendEmail = false,
  emailPayload,
}: NotifyUsersParams) {
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      project_id: projectId,
      user_id: recipientUserId,
      role: recipientRole,
      type,
      title,
      message,
      is_read: false,
    })

  if (notificationError) {
    console.error('Notification insert failed:', notificationError.message)
  }

  if (sendEmail && emailPayload) {
    const { error: emailError } = await supabase.functions.invoke(
      'send-notification-email',
      {
        body: emailPayload,
      }
    )

    if (emailError) {
      console.error('Notification email failed:', emailError.message)
    }
  }
}

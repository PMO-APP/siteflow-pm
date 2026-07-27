export type NotificationTone = 'success' | 'error' | 'warning' | 'info'

export type AlertOptions = {
  title?: string
  message: string
  tone?: NotificationTone
  confirmLabel?: string
}

export type ConfirmOptions = {
  title?: string
  message: string
  tone?: NotificationTone
  confirmLabel?: string
  cancelLabel?: string
}

export type PromptOptions = ConfirmOptions & {
  inputLabel?: string
  placeholder?: string
  initialValue?: string
  required?: boolean
}

type NotificationBridge = {
  alert: (options: AlertOptions) => Promise<void>
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
  toast: (options: AlertOptions & { duration?: number }) => void
}

let bridge: NotificationBridge | null = null

export function registerNotificationBridge(next: NotificationBridge | null) {
  bridge = next
}

function inferTone(message: string): NotificationTone {
  const value = message.toLowerCase()
  if (value.includes('success') || value.includes('imported') || value.includes('uploaded') || value.includes('saved') || value.includes('copied')) return 'success'
  if (value.includes('failed') || value.includes('unable') || value.includes('error') || value.includes('required')) return 'error'
  if (value.includes('delete') || value.includes('remove') || value.includes('warning')) return 'warning'
  return 'info'
}

function inferTitle(message: string, tone: NotificationTone) {
  const value = message.toLowerCase()
  if (value.includes('schedule') && value.includes('imported')) return 'Schedule imported successfully'
  if (value.includes('upload') && tone === 'success') return 'Upload complete'
  if (value.includes('copied')) return 'Copied to clipboard'
  if (tone === 'success') return 'Action completed'
  if (tone === 'error') return 'Action could not be completed'
  if (tone === 'warning') return 'Please confirm'
  return 'PMOCorex notification'
}

export async function pmoAlert(messageOrOptions: string | AlertOptions) {
  const options = typeof messageOrOptions === 'string'
    ? { message: messageOrOptions, tone: inferTone(messageOrOptions) }
    : messageOrOptions
  const tone = options.tone || inferTone(options.message)
  const normalized = { ...options, tone, title: options.title || inferTitle(options.message, tone) }
  if (bridge) return bridge.alert(normalized)
  console.info(`[PMOCorex ${tone}]`, normalized.message)
}

export async function pmoConfirm(messageOrOptions: string | ConfirmOptions) {
  const options = typeof messageOrOptions === 'string'
    ? { message: messageOrOptions, tone: 'warning' as NotificationTone }
    : messageOrOptions
  if (bridge) return bridge.confirm({ title: 'Confirm action', confirmLabel: 'Continue', cancelLabel: 'Cancel', ...options })
  return false
}

export async function pmoPrompt(messageOrOptions: string | PromptOptions) {
  const options = typeof messageOrOptions === 'string'
    ? { message: messageOrOptions, tone: 'info' as NotificationTone }
    : messageOrOptions
  if (bridge) return bridge.prompt({ title: 'Add details', confirmLabel: 'Continue', cancelLabel: 'Cancel', ...options })
  return null
}

export function pmoToast(messageOrOptions: string | (AlertOptions & { duration?: number })) {
  const options = typeof messageOrOptions === 'string'
    ? { message: messageOrOptions, tone: inferTone(messageOrOptions) }
    : messageOrOptions
  const tone = options.tone || inferTone(options.message)
  if (bridge) bridge.toast({ ...options, tone, title: options.title || inferTitle(options.message, tone) })
  else console.info(`[PMOCorex ${tone}]`, options.message)
}

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

  if (notificationError) console.error('Notification insert failed:', notificationError.message)

  if (sendEmail && emailPayload) {
    const { error: emailError } = await supabase.functions.invoke('send-notification-email', { body: emailPayload })
    if (emailError) console.error('Notification email failed:', emailError.message)
  }
}

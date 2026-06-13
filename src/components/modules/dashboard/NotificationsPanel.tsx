import { useEffect, useState } from 'react'
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  FileText,
  MessageSquare,
  ClipboardList,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { fdate } from '@/lib/utils'

interface Props {
  onClose: () => void
}

export default function NotificationsPanel({ onClose }: Props) {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId } = useProjectStore()

  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()

    const channel = supabase
      .channel('live-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, role, projectId])

  async function loadNotifications() {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    const filters = [
      `user_id.eq.${user.id}`,
      `role.eq.${role || ''}`,
    ]

    if (projectId) {
      filters.push(`project_id.eq.${projectId}`)
    }

    const { data, error } = await query.or(filters.join(','))

    if (error) {
      console.error(error.message)
      setNotifications([])
      setLoading(false)
      return
    }

    setNotifications(data || [])
    setLoading(false)
  }

  async function markRead(id: number) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    await loadNotifications()
  }

  async function markAllRead() {
    if (!user) return

    const ids = notifications.map(item => item.id)

    if (ids.length === 0) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)

    await loadNotifications()
  }

  const unread = notifications.filter(n => !n.is_read).length

  function typeIcon(type?: string) {
    switch (type) {
      case 'rfi':
        return <MessageSquare size={13} className="text-amber-400 flex-shrink-0" />

      case 'document':
        return <FileText size={13} className="text-blue-400 flex-shrink-0" />

      case 'progress_report':
        return <ClipboardList size={13} className="text-purple-400 flex-shrink-0" />

      case 'external_task_update':
        return <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />

      case 'alert':
        return <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />

      case 'warning':
        return <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />

      case 'success':
        return <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />

      default:
        return <Info size={13} className="text-blue-400 flex-shrink-0" />
    }
  }

  return (
    <div className="card border border-[#c49e48]/20 shadow-2xl animate-in">
      <div className="gold-bar" />

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-[#c49e48]" />

          <span className="font-display text-[14px] font-semibold text-[#ede8de]">
            Notifications
          </span>

          {unread > 0 && <span className="badge badge-red">{unread}</span>}
        </div>

        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] text-[#6e7d8c] hover:text-[#c49e48] transition-colors"
            >
              Mark all read
            </button>
          )}

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
        {loading ? (
          <div className="py-8 text-center text-[#6e7d8c] text-[12px]">
            Loading notifications…
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-[#6e7d8c] text-[12px]">
            <Bell size={24} className="mx-auto mb-2 opacity-30" />
            No notifications
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                !n.is_read ? 'bg-[#c49e48]/[0.03]' : ''
              }`}
              onClick={() => markRead(n.id)}
            >
              <div className="mt-0.5">{typeIcon(n.type)}</div>

              <div className="flex-1 min-w-0">
                <div
                  className={`text-[12px] font-medium ${
                    n.is_read ? 'text-[#6e7d8c]' : 'text-[#ede8de]'
                  }`}
                >
                  {n.title}
                </div>

                {n.message && (
                  <div className="text-[11px] text-[#6e7d8c] mt-0.5">
                    {n.message}
                  </div>
                )}

                <div className="text-[9px] text-[#6e7d8c] mt-1 font-mono">
                  {fdate(n.created_at)}
                </div>
              </div>

              {!n.is_read && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#c49e48] flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-white/[0.06] text-[10px] text-[#6e7d8c] text-center">
        Alerts auto-generated from project activity
      </div>
    </div>
  )
}

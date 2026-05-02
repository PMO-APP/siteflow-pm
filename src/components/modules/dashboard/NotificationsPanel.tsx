import { useEffect } from 'react'
import { Bell, X, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { useNotifications } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { fdate } from '@/lib/utils'

interface Props { onClose: () => void }

export default function NotificationsPanel({ onClose }: Props) {
  const { user } = useAuthStore()
  const { data: notifications = [] } = useNotifications(user?.id)
  const qc = useQueryClient()
  useEffect(() => {
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
        qc.invalidateQueries({
          queryKey: ['notifications'],
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [qc])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const unread = notifications.filter(n => !n.is_read).length

  const typeIcon = (t: string) => {
    switch (t) {
      case 'alert': return <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
      case 'warning': return <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
      case 'success': return <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
      default: return <Info size={13} className="text-blue-400 flex-shrink-0" />
    }
  }

  return (
    <div className="card border border-[#c49e48]/20 shadow-2xl animate-in">
      <div className="gold-bar" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-[#c49e48]" />
          <span className="font-display text-[14px] font-semibold text-[#ede8de]">Notifications</span>
          {unread > 0 && (
            <span className="badge badge-red">{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[10px] text-[#6e7d8c] hover:text-[#c49e48] transition-colors">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-[#6e7d8c] text-[12px]">
            <Bell size={24} className="mx-auto mb-2 opacity-30" />
            No notifications
          </div>
        ) : notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors ${!n.is_read ? 'bg-[#c49e48]/[0.03]' : ''}`}
            onClick={() => markRead(n.id)}
          >
            <div className="mt-0.5">{typeIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-[12px] font-medium ${n.is_read ? 'text-[#6e7d8c]' : 'text-[#ede8de]'}`}>{n.title}</div>
              {n.message && <div className="text-[11px] text-[#6e7d8c] mt-0.5">{n.message}</div>}
              <div className="text-[9px] text-[#6e7d8c] mt-1 font-mono">{fdate(n.created_at)}</div>
            </div>
            {!n.is_read && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#c49e48] flex-shrink-0 mt-1.5" />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-white/[0.06] text-[10px] text-[#6e7d8c] text-center">
        Alerts auto-generated from project data
      </div>
    </div>
  )
}

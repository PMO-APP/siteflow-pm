
import { useEffect, useState } from 'react'
import { Bell, X, AlertTriangle, CheckCircle, Info, ArrowRight, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { listNotifications, markNotificationRead, markNotificationsRead } from '@/services/notificationService'
import type { WorkspaceNotification } from '@/services/notificationTypes'

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId } = useProjectStore()
  const { activeWorkspace } = useWorkspace()
  const [notifications,setNotifications]=useState<WorkspaceNotification[]>([])
  const [loading,setLoading]=useState(true)

  async function load(){
    if(!user||!activeWorkspace){setNotifications([]);setLoading(false);return}
    setLoading(true)
    try{
      setNotifications(await listNotifications({
        workspaceId:activeWorkspace.id,userId:user.id,role,projectId,limit:30
      }))
    }catch(err){console.error('Notification loading failed:',err);setNotifications([])}
    finally{setLoading(false)}
  }

  useEffect(()=>{
    void load()
    if(!activeWorkspace)return
    const channel=window.setInterval(()=>void load(),30000)
    return ()=>window.clearInterval(channel)
  },[user?.id,role,projectId,activeWorkspace?.id])

  const unread=notifications.filter(n=>!n.isRead)

  async function open(item:WorkspaceNotification){
    if(!item.isRead){await markNotificationRead(item.id)}
    onClose()
    if(item.actionUrl)navigate(item.actionUrl)
    else navigate('/app/notifications')
  }

  return <div className="overflow-hidden rounded-2xl border border-[#dbe4e8] bg-white shadow-[0_24px_70px_rgba(16,41,67,.18)]">
    <div className="h-1 bg-[#ef8354]"/>
    <div className="flex items-center justify-between border-b border-[#e7ecef] px-4 py-3">
      <div className="flex items-center gap-2"><div className="rounded-lg bg-[#eaf1f7] p-2 text-[#173f5f]"><Bell size={15}/></div><div><div className="text-sm font-semibold text-[#102943]">Notifications</div><div className="text-[10px] text-[#87929b]">{unread.length} unread</div></div></div>
      <div className="flex items-center gap-1">{unread.length>0&&<button onClick={async()=>{await markNotificationsRead(unread.map(n=>n.id));await load()}} className="rounded-lg p-2 text-[#6f7d89] hover:bg-[#f3f6f7]" title="Mark all read"><CheckCheck size={15}/></button>}<button onClick={onClose} className="rounded-lg p-2 text-[#6f7d89] hover:bg-[#f3f6f7]"><X size={15}/></button></div>
    </div>
    <div className="max-h-[420px] overflow-y-auto divide-y divide-[#edf0f2]">
      {loading?<div className="p-8 text-center text-sm text-[#87929b]">Loading notifications…</div>:notifications.length===0?<div className="p-8 text-center"><Bell size={26} className="mx-auto text-[#c7d1d6]"/><div className="mt-3 text-sm font-semibold text-[#52616d]">You are all caught up</div><div className="mt-1 text-xs text-[#98a3aa]">New project and workspace alerts will appear here.</div></div>:notifications.map(item=><button key={item.id} onClick={()=>void open(item)} className={`w-full px-4 py-3 text-left transition hover:bg-[#f8fafb] ${!item.isRead?'bg-[#fffaf7]':''}`}><div className="flex gap-3"><Icon priority={item.priority} type={item.type}/><div className="min-w-0 flex-1"><div className={`text-xs ${item.isRead?'font-medium text-[#65717c]':'font-semibold text-[#102943]'}`}>{item.title}</div>{item.message&&<div className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#7b8791]">{item.message}</div>}<div className="mt-1.5 flex items-center gap-2 text-[9px] text-[#9aa4aa]"><span className="capitalize">{item.category}</span><span>•</span><span>{new Date(item.createdAt).toLocaleString()}</span></div></div>{!item.isRead&&<span className="mt-1.5 h-2 w-2 rounded-full bg-[#ef8354]"/>}</div></button>)}
    </div>
    <button onClick={()=>{onClose();navigate('/app/notifications')}} className="flex w-full items-center justify-center gap-2 border-t border-[#e7ecef] px-4 py-3 text-xs font-semibold text-[#173f5f] hover:bg-[#f7fafb]">Open communication centre <ArrowRight size={14}/></button>
  </div>
}

function Icon({priority,type}:{priority:string;type:string}) {
  const critical=priority==='critical'||priority==='high'||type==='alert'||type==='warning'
  if(critical)return <div className="mt-0.5 rounded-lg bg-red-50 p-2 text-red-600"><AlertTriangle size={14}/></div>
  if(type==='success')return <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-600"><CheckCircle size={14}/></div>
  return <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600"><Info size={14}/></div>
}

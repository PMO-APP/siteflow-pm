
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Mail, Megaphone, Settings, ShieldAlert, Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useAccessSession } from '@/access/AccessSessionProvider'
import {
  createAnnouncement, getNotificationPreference, listAnnouncements, listNotifications,
  markNotificationRead, markNotificationsRead, saveNotificationPreference
} from '@/services/notificationService'
import type { NotificationPreference, WorkspaceAnnouncement, WorkspaceNotification } from '@/services/notificationTypes'

type Tab = 'inbox' | 'preferences' | 'announcements'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const {can}=useAccessSession()
  const { projectId } = useProjectStore()
  const { activeWorkspace } = useWorkspace()
  const [tab,setTab]=useState<Tab>('inbox')
  const [notifications,setNotifications]=useState<WorkspaceNotification[]>([])
  const [preference,setPreference]=useState<NotificationPreference|null>(null)
  const [announcements,setAnnouncements]=useState<WorkspaceAnnouncement[]>([])
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [showAnnouncement,setShowAnnouncement]=useState(false)

  const canAnnounce=can('notifications.announce')

  async function load(){
    if(!activeWorkspace||!user)return
    setLoading(true);setMessage('')
    try{
      const [items,prefs,announcementsData]=await Promise.all([
        listNotifications({workspaceId:activeWorkspace.id,userId:user.id,role,projectId,limit:250}),
        getNotificationPreference(activeWorkspace.id,user.id),
        listAnnouncements(activeWorkspace.id,role)
      ])
      setNotifications(items);setPreference(prefs);setAnnouncements(announcementsData)
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to load communication centre.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[activeWorkspace?.id,user?.id,role,projectId])
  const unread=notifications.filter(n=>!n.isRead)
  const critical=notifications.filter(n=>n.priority==='critical'||n.priority==='high')
  const categories=useMemo(()=>Array.from(new Set(notifications.map(n=>n.category))),[notifications])

  async function openNotification(item:WorkspaceNotification){
    if(!item.isRead){await markNotificationRead(item.id);setNotifications(current=>current.map(n=>n.id===item.id?{...n,isRead:true}:n))}
    if(item.actionUrl)navigate(item.actionUrl)
  }

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Communication centre</div><h1 className="mt-2 text-3xl font-semibold text-[#102943]">Notifications & Announcements</h1><p className="mt-2 max-w-3xl text-sm text-[#6f7d89]">Review project alerts, management announcements and the communication preferences that control how updates reach you.</p></div>
          <div className="flex gap-2">{canAnnounce&&<button onClick={()=>setShowAnnouncement(true)} className="btn btn-ghost"><Plus size={15}/>New announcement</button>}<button onClick={()=>void load()} className="btn btn-gold"><RefreshCw size={15}/>Refresh</button></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Bell} label="Unread" value={unread.length} helper="Items requiring review"/>
        <Metric icon={ShieldAlert} label="High priority" value={critical.length} helper="High and critical alerts"/>
        <Metric icon={Megaphone} label="Announcements" value={announcements.length} helper="Active workspace notices"/>
        <Metric icon={Mail} label="Delivery mode" value={preference?.digestFrequency||'—'} helper={preference?.emailEnabled?'Email enabled':'In-app only'}/>
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#dfe3e7] bg-white p-2">
        {(['inbox','preferences','announcements'] as Tab[]).map(item=><button key={item} onClick={()=>setTab(item)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize ${tab===item?'bg-[#173f5f] text-white':'text-[#536170] hover:bg-[#eef3f4]'}`}>{item}</button>)}
      </div>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}
      {loading?<div className="rounded-2xl border bg-white p-10 text-[#71838d]">Loading communication centre…</div>:<>
        {tab==='inbox'&&<Inbox items={notifications} categories={categories} onOpen={openNotification} onReadAll={async()=>{await markNotificationsRead(unread.map(n=>n.id));setNotifications(current=>current.map(n=>({...n,isRead:true})))}}/>}
        {tab==='preferences'&&preference&&<Preferences value={preference} setValue={setPreference} onSave={async()=>{try{await saveNotificationPreference(preference);setMessage('Notification preferences saved.')}catch(err){setMessage(err instanceof Error?err.message:'Unable to save preferences.')}}}/>}
        {tab==='announcements'&&<Announcements items={announcements}/>}
      </>}
    </div>
    {showAnnouncement&&activeWorkspace&&<AnnouncementDrawer workspaceId={activeWorkspace.id} onClose={()=>setShowAnnouncement(false)} onSaved={async()=>{setShowAnnouncement(false);await load()}} setMessage={setMessage}/>}
  </div>
}

function Metric({icon:Icon,label,value,helper}:{icon:any;label:string;value:any;helper:string}){return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><Icon size={18} className="text-[#6b7b88]"/><div className="mt-4 text-3xl font-semibold capitalize text-[#102943]">{value}</div><div className="mt-1 text-xs font-semibold text-[#536170]">{label}</div><div className="mt-1 text-[11px] text-[#87929b]">{helper}</div></div>}

function Inbox({items,categories,onOpen,onReadAll}:{items:WorkspaceNotification[];categories:string[];onOpen:(n:WorkspaceNotification)=>void;onReadAll:()=>void}){
  const [category,setCategory]=useState('');const [unreadOnly,setUnreadOnly]=useState(false)
  const filtered=items.filter(item=>(!category||item.category===category)&&(!unreadOnly||!item.isRead))
  return <section className="rounded-[24px] border border-[#dfe3e7] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ecef] p-5"><div><h2 className="text-xl font-semibold text-[#102943]">Notification inbox</h2><p className="mt-1 text-sm text-[#87929b]">Actionable project and workspace communication.</p></div><div className="flex gap-2"><select className="form-control min-w-40" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><label className="flex items-center gap-2 rounded-xl border border-[#dfe3e7] px-3 text-xs font-semibold text-[#536170]"><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/>Unread only</label><button onClick={onReadAll} className="btn btn-ghost"><CheckCheck size={15}/>Mark all read</button></div></div>
    <div className="divide-y divide-[#edf0f2]">{filtered.length===0?<div className="p-12 text-center text-sm text-[#87929b]">No notifications match the current filters.</div>:filtered.map(item=><button key={item.id} onClick={()=>onOpen(item)} className={`w-full p-5 text-left transition hover:bg-[#f8fafb] ${!item.isRead?'bg-[#fffaf7]':''}`}><div className="flex gap-4"><div className={`mt-1 h-2.5 w-2.5 rounded-full ${item.priority==='critical'?'bg-red-500':item.priority==='high'?'bg-amber-500':item.isRead?'bg-[#cbd5da]':'bg-[#1f668f]'}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm ${item.isRead?'font-medium text-[#536170]':'font-semibold text-[#102943]'}`}>{item.title}</h3><span className="badge badge-muted capitalize">{item.category}</span>{item.priority!=='normal'&&<span className="badge badge-amber capitalize">{item.priority}</span>}</div>{item.message&&<p className="mt-2 text-sm leading-6 text-[#6f7d89]">{item.message}</p>}<div className="mt-2 text-[11px] text-[#929da5]">{new Date(item.createdAt).toLocaleString()}</div></div></div></button>)}</div>
  </section>
}

function Preferences({value,setValue,onSave}:{value:NotificationPreference;setValue:(v:NotificationPreference)=>void;onSave:()=>void}){
  const categories=['schedule','approvals','procurement','quality','hse','risks','assignments','administration']
  return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="flex items-center gap-2"><Settings size={18} className="text-[#1f668f]"/><h2 className="text-xl font-semibold text-[#102943]">Delivery preferences</h2></div>
    <div className="mt-5 grid gap-3 md:grid-cols-3"><Toggle label="In-app notifications" checked={value.inAppEnabled} onChange={v=>setValue({...value,inAppEnabled:v})}/><Toggle label="Email notifications" checked={value.emailEnabled} onChange={v=>setValue({...value,emailEnabled:v})}/><Toggle label="Push notifications" checked={value.pushEnabled} onChange={v=>setValue({...value,pushEnabled:v})}/></div>
    <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Digest frequency"><select className="form-control" value={value.digestFrequency} onChange={e=>setValue({...value,digestFrequency:e.target.value as any})}><option value="instant">Instant</option><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option><option value="off">Off</option></select></Field><Field label="Quiet hours start"><input type="time" className="form-control" value={value.quietHoursStart||''} onChange={e=>setValue({...value,quietHoursStart:e.target.value||null})}/></Field><Field label="Quiet hours end"><input type="time" className="form-control" value={value.quietHoursEnd||''} onChange={e=>setValue({...value,quietHoursEnd:e.target.value||null})}/></Field></div>
    <div className="mt-6"><div className="text-xs font-semibold uppercase tracking-[.12em] text-[#71808c]">Categories</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map(c=><Toggle key={c} label={c} checked={value.categories[c]!==false} onChange={v=>setValue({...value,categories:{...value.categories,[c]:v}})}/>)}</div></div>
    <div className="mt-6 flex justify-end"><button onClick={onSave} className="btn btn-gold"><CheckCheck size={15}/>Save preferences</button></div>
  </section>
}

function Announcements({items}:{items:WorkspaceAnnouncement[]}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><h2 className="text-xl font-semibold text-[#102943]">Workspace announcements</h2><div className="mt-5 space-y-3">{items.length===0?<div className="rounded-xl bg-[#f7f9fa] p-8 text-center text-sm text-[#87929b]">No active announcements.</div>:items.map(item=><article key={item.id} className="rounded-2xl border border-[#dfe3e7] p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Megaphone size={16} className="text-[#df5f41]"/><h3 className="font-semibold text-[#102943]">{item.title}</h3></div><p className="mt-3 text-sm leading-6 text-[#6f7d89]">{item.message}</p></div><span className="badge badge-muted capitalize">{item.priority}</span></div><div className="mt-3 text-[11px] text-[#929da5]">Published {new Date(item.createdAt).toLocaleString()}</div></article>)}</div></section>}

function AnnouncementDrawer({workspaceId,onClose,onSaved,setMessage}:any){
  const [form,setForm]=useState({title:'',message:'',priority:'normal',audienceRole:'',endsAt:''});const [saving,setSaving]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await createAnnouncement({workspaceId,...form,audienceRole:form.audienceRole||null,endsAt:form.endsAt?new Date(form.endsAt).toISOString():null});await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to publish announcement.')}finally{setSaving(false)}}
  return <div className="fixed inset-0 z-50 bg-[#102943]/35" onClick={onClose}><aside className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="text-xs uppercase tracking-wider text-[#df5f41]">Workspace communication</div><h2 className="mt-2 text-2xl font-semibold text-[#102943]">New announcement</h2><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Title"><input className="form-control" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Message"><textarea className="form-control min-h-32" required value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></Field><Field label="Priority"><select className="form-control" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></Field><Field label="Audience role"><input className="form-control" placeholder="Leave blank for everyone" value={form.audienceRole} onChange={e=>setForm({...form,audienceRole:e.target.value})}/></Field><Field label="Ends at"><input type="datetime-local" className="form-control" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></Field><div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={saving} className="btn btn-gold">{saving?'Publishing…':'Publish announcement'}</button></div></form></aside></div>
}

function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="flex items-center justify-between rounded-xl border border-[#dfe3e7] p-4 text-sm font-semibold capitalize text-[#26384a]"><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-4 w-4"/></label>}
function Field({label,children}:{label:string;children:any}){return <label className="block text-xs font-semibold text-[#52616d]">{label}<div className="mt-2">{children}</div></label>}

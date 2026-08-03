
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Link2, Mail, Plus, RefreshCw, Send, Users, XCircle } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { listGeneratedReports } from '@/services/executiveReportService'
import {
  approveDistribution, createReportDistribution, createSecureShareLink,
  listDistributionLists, listReportDistributions, listReportSchedules,
  listShareLinks, loadDistributionAnalytics, saveDistributionList,
  saveReportSchedule
} from '@/services/reportDistributionService'
import type {
  DistributionAnalytics, DistributionList, ReportDistribution, ReportSchedule, ShareLink
} from '@/services/reportDistributionTypes'
import type { GeneratedReport } from '@/services/executiveReportTypes'

type Tab='distributions'|'schedules'|'lists'|'links'

export default function ReportDistributionPage(){
  const {activeWorkspace}=useWorkspace()
  const [tab,setTab]=useState<Tab>('distributions')
  const [reports,setReports]=useState<GeneratedReport[]>([])
  const [distributions,setDistributions]=useState<ReportDistribution[]>([])
  const [schedules,setSchedules]=useState<ReportSchedule[]>([])
  const [lists,setLists]=useState<DistributionList[]>([])
  const [links,setLinks]=useState<ShareLink[]>([])
  const [analytics,setAnalytics]=useState<DistributionAnalytics|null>(null)
  const [message,setMessage]=useState('')
  const [dialog,setDialog]=useState<'distribution'|'schedule'|'list'|'link'|null>(null)

  async function load(){
    if(!activeWorkspace)return
    try{
      const [r,d,s,l,k,a]=await Promise.all([
        listGeneratedReports(activeWorkspace.id),
        listReportDistributions(activeWorkspace.id),
        listReportSchedules(activeWorkspace.id),
        listDistributionLists(activeWorkspace.id),
        listShareLinks(activeWorkspace.id),
        loadDistributionAnalytics(activeWorkspace.id)
      ])
      setReports(r);setDistributions(d);setSchedules(s);setLists(l);setLinks(k);setAnalytics(a)
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to load distribution centre.')}
  }
  useEffect(()=>{void load()},[activeWorkspace?.id])

  if(!activeWorkspace)return <div className="rounded-2xl border bg-white p-8">No active workspace.</div>

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Report lifecycle</div><h1 className="mt-2 text-3xl font-semibold text-[#102943]">Distribution & Automation Centre</h1><p className="mt-2 max-w-3xl text-sm text-[#6f7d89]">Approve, schedule, share and track executive reports across internal and external audiences.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={()=>setDialog('distribution')} className="btn btn-gold"><Send size={15}/>New distribution</button><button onClick={()=>void load()} className="btn btn-ghost"><RefreshCw size={15}/>Refresh</button></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Distributions" value={analytics?.totalDistributions||0}/>
        <Metric label="Successful" value={analytics?.successful||0}/>
        <Metric label="Failed" value={analytics?.failed||0}/>
        <Metric label="Schedules" value={analytics?.scheduled||0}/>
        <Metric label="Secure links" value={analytics?.secureLinks||0}/>
        <Metric label="Downloads" value={analytics?.downloads||0}/>
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#dfe3e7] bg-white p-2">
        {(['distributions','schedules','lists','links'] as Tab[]).map(item=><button key={item} onClick={()=>setTab(item)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize ${tab===item?'bg-[#173f5f] text-white':'text-[#536170] hover:bg-[#eef3f4]'}`}>{item}</button>)}
      </div>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}

      {tab==='distributions'&&<DistributionTable items={distributions} onApprove={async item=>{try{await approveDistribution(item.id,activeWorkspace.id);setMessage('Distribution approved and queued.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Unable to approve distribution.')}}}/>}
      {tab==='schedules'&&<Schedules items={schedules} onCreate={()=>setDialog('schedule')}/>}
      {tab==='lists'&&<Lists items={lists} onCreate={()=>setDialog('list')}/>}
      {tab==='links'&&<Links items={links} onCreate={()=>setDialog('link')}/>}
    </div>

    {dialog==='distribution'&&<DistributionDialog workspaceId={activeWorkspace.id} reports={reports} lists={lists} onClose={()=>setDialog(null)} onSaved={async()=>{setDialog(null);await load()}} setMessage={setMessage}/>}
    {dialog==='schedule'&&<ScheduleDialog workspaceId={activeWorkspace.id} reports={reports} onClose={()=>setDialog(null)} onSaved={async()=>{setDialog(null);await load()}} setMessage={setMessage}/>}
    {dialog==='list'&&<ListDialog workspaceId={activeWorkspace.id} onClose={()=>setDialog(null)} onSaved={async()=>{setDialog(null);await load()}} setMessage={setMessage}/>}
    {dialog==='link'&&<LinkDialog workspaceId={activeWorkspace.id} reports={reports} onClose={()=>setDialog(null)} onSaved={async()=>{setDialog(null);await load()}} setMessage={setMessage}/>}
  </div>
}

function DistributionTable({items,onApprove}:{items:ReportDistribution[];onApprove:(item:ReportDistribution)=>void}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white"><div className="border-b p-5"><h2 className="text-xl font-semibold text-[#102943]">Distribution queue</h2></div><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Report</th><th>Channel</th><th>Format</th><th>Recipients</th><th>Approval</th><th>Status</th><th>Last sent</th><th></th></tr></thead><tbody>{items.length?items.map(item=><tr key={item.id}><td><div className="font-semibold">{item.reportTitle}</div><div className="text-xs text-[#87929b]">v{item.reportVersion}</div></td><td className="capitalize">{item.channel.replace(/_/g,' ')}</td><td className="uppercase">{item.format}</td><td>{item.recipients.length}</td><td><span className="badge badge-muted">{item.approvalStatus}</span></td><td><span className={`badge ${item.status==='sent'?'badge-green':item.status==='failed'?'badge-red':'badge-amber'}`}>{item.status}</span></td><td>{item.lastSentAt?new Date(item.lastSentAt).toLocaleString():'—'}</td><td>{item.status==='pending_approval'&&<button onClick={()=>onApprove(item)} className="tbl-action" title="Approve"><CheckCircle2 size={15}/></button>}</td></tr>):<tr><td colSpan={8} className="p-12 text-center text-[#87929b]">No distributions yet.</td></tr>}</tbody></table></div></section>}

function Schedules({items,onCreate}:{items:ReportSchedule[];onCreate:()=>void}){return <Panel title="Report schedules" action={<button onClick={onCreate} className="btn btn-gold"><Plus size={14}/>New schedule</button>}><div className="space-y-3">{items.length?items.map(item=><article key={item.id} className="rounded-xl border p-4"><div className="flex justify-between"><div><div className="font-semibold text-[#26384a]">{item.name}</div><div className="mt-1 text-xs text-[#87929b]">{item.frequency} · {item.runTime} · {item.timezone}</div></div><span className={`badge ${item.isActive?'badge-green':'badge-muted'}`}>{item.isActive?'active':'paused'}</span></div><div className="mt-3 text-xs text-[#6f7d89]">{item.recipients.length} recipients · {item.format.toUpperCase()} · {item.channel.replace(/_/g,' ')}</div></article>):<Empty text="No schedules configured."/ >}</div></Panel>}

function Lists({items,onCreate}:{items:DistributionList[];onCreate:()=>void}){return <Panel title="Distribution lists" action={<button onClick={onCreate} className="btn btn-gold"><Plus size={14}/>New list</button>}><div className="grid gap-3 md:grid-cols-2">{items.length?items.map(item=><article key={item.id} className="rounded-xl border p-4"><div className="flex items-center gap-2"><Users size={16}/><div className="font-semibold text-[#26384a]">{item.name}</div></div><div className="mt-2 text-sm text-[#6f7d89]">{item.description}</div><div className="mt-3 text-xs text-[#87929b]">{item.recipients.length} recipients</div></article>):<Empty text="No reusable distribution lists."/ >}</div></Panel>}

function Links({items,onCreate}:{items:ShareLink[];onCreate:()=>void}){return <Panel title="Secure share links" action={<button onClick={onCreate} className="btn btn-gold"><Plus size={14}/>Create link</button>}><div className="space-y-3">{items.length?items.map(item=><article key={item.id} className="rounded-xl border p-4"><div className="flex justify-between"><div className="font-mono text-xs text-[#52616d]">{item.token}</div><span className={`badge ${item.revokedAt?'badge-red':'badge-green'}`}>{item.revokedAt?'revoked':'active'}</span></div><div className="mt-3 text-xs text-[#87929b]">{item.viewOnly?'View only':'Download allowed'} · {item.downloadCount} downloads · {item.expiresAt?`Expires ${new Date(item.expiresAt).toLocaleString()}`:'No expiry'}</div></article>):<Empty text="No secure links created."/ >}</div></Panel>}

function DistributionDialog({workspaceId,reports,lists,onClose,onSaved,setMessage}:any){
  const [form,setForm]=useState({reportId:reports[0]?.id||'',channel:'email',format:'pdf',recipients:'',listId:'',approvalRequired:true,emailSubject:'',emailIntroduction:''});const [saving,setSaving]=useState(false)
  const listRecipients=useMemo(()=>lists.find((l:DistributionList)=>l.id===form.listId)?.recipients.map((r:any)=>r.email)||[],[form.listId,lists])
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{const manual=form.recipients.split(',').map((v:string)=>v.trim()).filter(Boolean);await createReportDistribution({...form,workspaceId,recipients:Array.from(new Set([...manual,...listRecipients]))});await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to create distribution.')}finally{setSaving(false)}}
  return <Drawer title="New report distribution" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Report"><select className="form-control" value={form.reportId} onChange={e=>setForm({...form,reportId:e.target.value})}>{reports.map((r:GeneratedReport)=><option key={r.id} value={r.id}>{r.title} v{r.versionNumber}</option>)}</select></Field><Field label="Distribution list"><select className="form-control" value={form.listId} onChange={e=>setForm({...form,listId:e.target.value})}><option value="">None</option>{lists.map((l:DistributionList)=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><Field label="Additional recipients"><input className="form-control" placeholder="email@company.com, ..." value={form.recipients} onChange={e=>setForm({...form,recipients:e.target.value})}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Channel"><select className="form-control" value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}><option value="email">Email</option><option value="secure_link">Secure link</option><option value="workspace_feed">Workspace feed</option><option value="download">Download</option></select></Field><Field label="Format"><select className="form-control" value={form.format} onChange={e=>setForm({...form,format:e.target.value})}><option value="pdf">PDF</option><option value="excel">Excel</option><option value="word">Word</option></select></Field></div><Field label="Email subject"><input className="form-control" value={form.emailSubject} onChange={e=>setForm({...form,emailSubject:e.target.value})}/></Field><Field label="Introduction"><textarea className="form-control min-h-24" value={form.emailIntroduction} onChange={e=>setForm({...form,emailIntroduction:e.target.value})}/></Field><label className="flex justify-between rounded-xl border p-3 text-sm"><span>Approval required</span><input type="checkbox" checked={form.approvalRequired} onChange={e=>setForm({...form,approvalRequired:e.target.checked})}/></label><Actions saving={saving} onClose={onClose}/></form></Drawer>
}

function ScheduleDialog({workspaceId,reports,onClose,onSaved,setMessage}:any){const [form,setForm]=useState({name:'Monthly Board Report',templateId:null,reportType:'monthly_board',scopeType:'workspace',scopeId:null,frequency:'monthly',cronExpression:null,timezone:'Africa/Lagos',runTime:'08:00',recipients:'',channel:'email',format:'pdf',approvalRequired:true,isActive:true,nextRunAt:null});const [saving,setSaving]=useState(false);async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await saveReportSchedule({...form,workspaceId,recipients:form.recipients.split(',').map(v=>v.trim()).filter(Boolean)} as any);await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to save schedule.')}finally{setSaving(false)}}return <Drawer title="New report schedule" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Name"><input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Frequency"><select className="form-control" value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}>{['daily','weekly','fortnightly','monthly','quarterly','yearly','custom'].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Run time"><input type="time" className="form-control" value={form.runTime} onChange={e=>setForm({...form,runTime:e.target.value})}/></Field></div><Field label="Recipients"><input className="form-control" value={form.recipients} onChange={e=>setForm({...form,recipients:e.target.value})}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Channel"><select className="form-control" value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}><option value="email">Email</option><option value="secure_link">Secure link</option><option value="workspace_feed">Workspace feed</option></select></Field><Field label="Format"><select className="form-control" value={form.format} onChange={e=>setForm({...form,format:e.target.value})}><option value="pdf">PDF</option><option value="excel">Excel</option><option value="word">Word</option></select></Field></div><Actions saving={saving} onClose={onClose}/></form></Drawer>}

function ListDialog({workspaceId,onClose,onSaved,setMessage}:any){const [form,setForm]=useState({name:'',description:'',recipients:''});const [saving,setSaving]=useState(false);async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await saveDistributionList({workspaceId,name:form.name,description:form.description,recipients:form.recipients.split(',').map(v=>({name:'',email:v.trim(),external:true})).filter(v=>v.email)});await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to save list.')}finally{setSaving(false)}}return <Drawer title="New distribution list" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Name"><input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Description"><textarea className="form-control" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field><Field label="Recipients"><textarea className="form-control min-h-28" placeholder="email1@company.com, email2@company.com" value={form.recipients} onChange={e=>setForm({...form,recipients:e.target.value})}/></Field><Actions saving={saving} onClose={onClose}/></form></Drawer>}

function LinkDialog({workspaceId,reports,onClose,onSaved,setMessage}:any){const [form,setForm]=useState({reportId:reports[0]?.id||'',expiresAt:'',password:'',downloadLimit:'',viewOnly:true,watermark:'Confidential'});const [saving,setSaving]=useState(false);async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await createSecureShareLink({workspaceId,reportId:form.reportId,expiresAt:form.expiresAt?new Date(form.expiresAt).toISOString():null,password:form.password||null,downloadLimit:form.downloadLimit?Number(form.downloadLimit):null,viewOnly:form.viewOnly,watermark:form.watermark||null});await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to create link.')}finally{setSaving(false)}}return <Drawer title="Create secure share link" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Report"><select className="form-control" value={form.reportId} onChange={e=>setForm({...form,reportId:e.target.value})}>{reports.map((r:GeneratedReport)=><option key={r.id} value={r.id}>{r.title}</option>)}</select></Field><Field label="Expiry"><input type="datetime-local" className="form-control" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></Field><Field label="Password"><input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field><Field label="Download limit"><input type="number" className="form-control" value={form.downloadLimit} onChange={e=>setForm({...form,downloadLimit:e.target.value})}/></Field><Field label="Watermark"><input className="form-control" value={form.watermark} onChange={e=>setForm({...form,watermark:e.target.value})}/></Field><label className="flex justify-between rounded-xl border p-3 text-sm"><span>View only</span><input type="checkbox" checked={form.viewOnly} onChange={e=>setForm({...form,viewOnly:e.target.checked})}/></label><Actions saving={saving} onClose={onClose}/></form></Drawer>}

function Metric({label,value}:{label:string;value:number}){return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><div className="text-3xl font-semibold text-[#102943]">{value}</div><div className="mt-2 text-xs font-semibold text-[#536170]">{label}</div></div>}
function Panel({title,action,children}:{title:string;action?:any;children:any}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5"><div className="mb-5 flex justify-between"><h2 className="text-xl font-semibold text-[#102943]">{title}</h2>{action}</div>{children}</section>}
function Empty({text}:{text:string}){return <div className="rounded-xl bg-[#f7f9fa] p-8 text-center text-sm text-[#87929b]">{text}</div>}
function Drawer({title,onClose,children}:{title:string;onClose:()=>void;children:any}){return <div className="fixed inset-0 z-50 bg-[#102943]/35" onClick={onClose}><aside className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><h2 className="text-2xl font-semibold text-[#102943]">{title}</h2><div className="mt-6">{children}</div></aside></div>}
function Field({label,children}:{label:string;children:any}){return <label className="block text-xs font-semibold text-[#52616d]">{label}<div className="mt-2">{children}</div></label>}
function Actions({saving,onClose}:{saving:boolean;onClose:()=>void}){return <div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={saving} className="btn btn-gold">{saving?'Saving…':'Save'}</button></div>}

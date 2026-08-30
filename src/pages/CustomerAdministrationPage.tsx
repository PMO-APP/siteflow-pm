
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Building2, Users, ShieldCheck, MapPin, BadgeDollarSign, Plus, Save,
  UserCog, MailPlus, RefreshCw, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import {
  createCostCentre, createDepartment, createLocation, deleteStructureRecord,
  loadCustomerAdministration, saveCompanyProfile, saveSecurityPolicy, updateMember
} from '@/workspace/customerAdminService'
import type {
  CustomerAdministrationData, CustomerAdminMember, WorkspaceCompanyProfile,
  WorkspaceSecurityPolicy
} from '@/workspace/customerAdminTypes'

type Tab = 'overview' | 'structure' | 'members' | 'security'
const ROLES = ['workspace_admin','admin','pmo','portfolio_manager','project_owner','project_manager','design','landscaping','housebuild','costing','infrastructure','mep','hse','viewer']

export default function CustomerAdministrationPage() {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const [tab,setTab]=useState<Tab>('overview')
  const [data,setData]=useState<CustomerAdministrationData|null>(null)
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [editingMember,setEditingMember]=useState<CustomerAdminMember|null>(null)

  async function load(){
    if(!activeWorkspace) return
    setLoading(true); setMessage('')
    try{ setData(await loadCustomerAdministration(activeWorkspace.id,activeWorkspace.name)) }
    catch(e){ setMessage(e instanceof Error?e.message:'Unable to load customer administration.') }
    finally{ setLoading(false) }
  }
  useEffect(()=>{void load()},[activeWorkspace?.id])

  if(!activeWorkspace) return <div className="rounded-2xl border bg-white p-8">No active workspace.</div>

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Customer administration</div>
          <h1 className="mt-2 text-3xl font-semibold text-[#102943]">{activeWorkspace.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#6f7d89]">Manage company details, organizational structure, workspace members, license use and security defaults.</p></div>
          <div className="flex gap-2"><button onClick={()=>navigate('/app/team-access')} className="btn btn-ghost"><MailPlus size={16}/>Invite member</button><button onClick={()=>void load()} className="btn btn-gold"><RefreshCw size={16}/>Refresh</button></div>
        </div>
      </section>

      {data && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Active members" value={data.license.activeMembers} helper={data.license.seats?`${data.license.availableSeats} seats available`:'Unlimited seats'}/>
        <Metric icon={MailPlus} label="Pending invites" value={data.pendingInvites} helper="Awaiting acceptance"/>
        <Metric icon={Building2} label="Departments" value={data.departments.length} helper="Active workspace structure"/>
        <Metric icon={BadgeDollarSign} label="Plan" value={data.license.plan} helper={data.license.status}/>
      </section>}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#dfe3e7] bg-white p-2">
        {(['overview','structure','members','security'] as Tab[]).map(item=><button key={item} onClick={()=>setTab(item)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize ${tab===item?'bg-[#173f5f] text-white':'text-[#536170] hover:bg-[#eef3f4]'}`}>{item}</button>)}
      </div>

      {message && <div className="rounded-2xl border border-[#f2d3c7] bg-[#fff5f0] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}
      {loading ? <div className="rounded-2xl border bg-white p-10 text-[#71838d]">Loading customer administration…</div> :
      data && <>
        {tab==='overview' && <Overview profile={data.profile} onSaved={load} setMessage={setMessage}/>}
        {tab==='structure' && <Structure data={data} workspaceId={activeWorkspace.id} reload={load} setMessage={setMessage}/>}
        {tab==='members' && <Members data={data} onEdit={setEditingMember}/>}
        {tab==='security' && <Security policy={data.security} onSaved={load} setMessage={setMessage}/>}
      </>}
    </div>

    {editingMember && data && <MemberDrawer member={editingMember} departments={data.departments} workspaceId={activeWorkspace.id} onClose={()=>setEditingMember(null)} onSaved={async()=>{setEditingMember(null);await load()}} setMessage={setMessage}/>}
  </div>
}

function Metric({icon:Icon,label,value,helper}:{icon:any;label:string;value:any;helper:string}){return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><Icon size={18} className="text-[#6b7b88]"/><div className="mt-4 text-3xl font-semibold capitalize text-[#102943]">{value}</div><div className="mt-1 text-xs font-semibold text-[#536170]">{label}</div><div className="mt-1 text-[11px] text-[#87929b]">{helper}</div></div>}

function Overview({profile,onSaved,setMessage}:{profile:WorkspaceCompanyProfile;onSaved:()=>Promise<void>;setMessage:(v:string)=>void}){
  const [form,setForm]=useState(profile); const [saving,setSaving]=useState(false)
  useEffect(()=>setForm(profile),[profile])
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await saveCompanyProfile(form);setMessage('Company profile saved.');await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to save profile.')}finally{setSaving(false)}}
  const f="form-control"
  return <form onSubmit={submit} className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><h2 className="text-xl font-semibold text-[#102943]">Company profile</h2><div className="mt-5 grid gap-4 md:grid-cols-2">
    <Field label="Legal name"><input className={f} value={form.legalName} onChange={e=>setForm({...form,legalName:e.target.value})}/></Field>
    <Field label="Registration number"><input className={f} value={form.registrationNumber} onChange={e=>setForm({...form,registrationNumber:e.target.value})}/></Field>
    <Field label="Contact email"><input type="email" className={f} value={form.contactEmail} onChange={e=>setForm({...form,contactEmail:e.target.value})}/></Field>
    <Field label="Contact phone"><input className={f} value={form.contactPhone} onChange={e=>setForm({...form,contactPhone:e.target.value})}/></Field>
    <Field label="Website"><input className={f} value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></Field>
    <Field label="Country"><input className={f} value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></Field>
    <Field label="Address" wide><textarea className={`${f} min-h-24`} value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
    <Field label="City"><input className={f} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field>
    <Field label="State"><input className={f} value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></Field>
  </div><div className="mt-5 flex justify-end"><button disabled={saving} className="btn btn-gold"><Save size={16}/>{saving?'Saving…':'Save profile'}</button></div></form>
}

function Structure({data,workspaceId,reload,setMessage}:{data:CustomerAdministrationData;workspaceId:string;reload:()=>Promise<void>;setMessage:(v:string)=>void}){
  return <div className="grid gap-5 xl:grid-cols-3">
    <StructureCard title="Departments" icon={Building2} items={data.departments} onCreate={async (v:{name:string;code?:string;description?:string})=>{await createDepartment(workspaceId,v);await reload()}} onDelete={async (id:string)=>{await deleteStructureRecord('workspace_departments',workspaceId,id);await reload()}} setMessage={setMessage}/>
    <StructureCard title="Cost centres" icon={BadgeDollarSign} items={data.costCentres} requireCode onCreate={async (v:{name:string;code?:string;description?:string})=>{await createCostCentre(workspaceId,{name:v.name,code:v.code||'',description:v.description});await reload()}} onDelete={async (id:string)=>{await deleteStructureRecord('workspace_cost_centres',workspaceId,id);await reload()}} setMessage={setMessage}/>
    <StructureCard title="Locations" icon={MapPin} items={data.locations} onCreate={async (v:{name:string;code?:string;description?:string})=>{await createLocation(workspaceId,{name:v.name,type:'office',address:v.description,country:'Nigeria'});await reload()}} onDelete={async (id:string)=>{await deleteStructureRecord('workspace_locations',workspaceId,id);await reload()}} setMessage={setMessage}/>
  </div>
}

function StructureCard({title,icon:Icon,items,onCreate,onDelete,requireCode,setMessage}:any){
  const [name,setName]=useState(''); const [code,setCode]=useState(''); const [description,setDescription]=useState('')
  async function add(){if(!name.trim()||(requireCode&&!code.trim()))return;try{await onCreate({name,code,description});setName('');setCode('');setDescription('')}catch(e){setMessage(e instanceof Error?e.message:'Unable to create record.')}}
  return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5"><div className="flex items-center gap-2"><Icon size={18} className="text-[#1f668f]"/><h2 className="font-semibold text-[#102943]">{title}</h2></div>
    <div className="mt-4 space-y-2">{items.length?items.map((x:any)=><div key={x.id} className="flex items-center justify-between rounded-xl border border-[#e6ecef] px-3 py-3"><div><div className="text-sm font-semibold text-[#26384a]">{x.name}</div><div className="text-xs text-[#87929b]">{x.code||x.type||'Active'}</div></div><button onClick={()=>void onDelete(x.id)} className="rounded-lg p-2 text-[#b24b3a] hover:bg-[#fff1ed]"><Trash2 size={15}/></button></div>):<div className="rounded-xl bg-[#f7f9fa] p-4 text-sm text-[#87929b]">No {title.toLowerCase()} yet.</div>}</div>
    <div className="mt-4 space-y-2"><input className="form-control" placeholder={`New ${title.slice(0,-1).toLowerCase()} name`} value={name} onChange={e=>setName(e.target.value)}/>{requireCode&&<input className="form-control" placeholder="Code" value={code} onChange={e=>setCode(e.target.value)}/>}<input className="form-control" placeholder="Description or address" value={description} onChange={e=>setDescription(e.target.value)}/><button onClick={()=>void add()} className="btn btn-ghost w-full"><Plus size={15}/>Add</button></div>
  </section>
}

function Members({data,onEdit}:{data:CustomerAdministrationData;onEdit:(m:CustomerAdminMember)=>void}){
  return <section className="rounded-[24px] border border-[#dfe3e7] bg-white"><div className="border-b border-[#e6ecef] p-5"><h2 className="text-xl font-semibold text-[#102943]">Workspace members</h2><p className="mt-1 text-sm text-[#87929b]">Manage role, department, title and active status.</p></div><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Member</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr></thead><tbody>{data.members.map(m=><tr key={m.userId}><td><div className="font-semibold text-[#26384a]">{m.fullName}</div><div className="text-xs text-[#87929b]">{m.email||'No email available'}</div></td><td className="capitalize">{m.role.replace(/_/g,' ')}</td><td>{m.departmentName||'—'}</td><td><span className={`badge ${m.status==='active'?'badge-green':'badge-muted'}`}>{m.status}</span></td><td><button onClick={()=>onEdit(m)} className="tbl-action"><UserCog size={14}/></button></td></tr>)}</tbody></table></div></section>
}

function Security({policy,onSaved,setMessage}:{policy:WorkspaceSecurityPolicy;onSaved:()=>Promise<void>;setMessage:(v:string)=>void}){
  const [form,setForm]=useState(policy); const [saving,setSaving]=useState(false); useEffect(()=>setForm(policy),[policy])
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await saveSecurityPolicy(form);setMessage('Security policy saved.');await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to save policy.')}finally{setSaving(false)}}
  return <form onSubmit={submit} className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-[#1f668f]"/><h2 className="text-xl font-semibold text-[#102943]">Security defaults</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2">
    <Field label="Session timeout (minutes)"><input type="number" min={5} className="form-control" value={form.sessionTimeoutMinutes} onChange={e=>setForm({...form,sessionTimeoutMinutes:Number(e.target.value)})}/></Field>
    <Field label="Invite expiry (days)"><input type="number" min={1} className="form-control" value={form.inviteExpiryDays} onChange={e=>setForm({...form,inviteExpiryDays:Number(e.target.value)})}/></Field>
    <Field label="Allowed email domains" wide><input className="form-control" placeholder="company.com, subsidiary.com" value={form.allowedEmailDomains.join(', ')} onChange={e=>setForm({...form,allowedEmailDomains:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}/></Field>
  </div><div className="mt-5 grid gap-3 md:grid-cols-3"><Toggle label="Require MFA" checked={form.requireMfa} onChange={v=>setForm({...form,requireMfa:v})}/><Toggle label="Strong passwords" checked={form.enforceStrongPasswords} onChange={v=>setForm({...form,enforceStrongPasswords:v})}/><Toggle label="SSO enabled" checked={form.ssoEnabled} onChange={v=>setForm({...form,ssoEnabled:v})}/></div><div className="mt-5 flex justify-end"><button disabled={saving} className="btn btn-gold"><Save size={16}/>{saving?'Saving…':'Save policy'}</button></div></form>
}

function MemberDrawer({member,departments,workspaceId,onClose,onSaved,setMessage}:any){
  const [form,setForm]=useState({role:member.role,status:member.status,departmentId:member.departmentId||'',jobTitle:member.jobTitle||''});const [saving,setSaving]=useState(false)
  async function save(){setSaving(true);try{await updateMember(workspaceId,member.userId,{role:form.role,status:form.status,departmentId:form.departmentId||null,jobTitle:form.jobTitle||null});await onSaved()}catch(e){setMessage(e instanceof Error?e.message:'Unable to update member.')}finally{setSaving(false)}}
  return <div className="fixed inset-0 z-50 bg-[#102943]/35" onClick={onClose}><aside className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-wider text-[#df5f41]">Member access</div><h2 className="mt-2 text-2xl font-semibold text-[#102943]">{member.fullName}</h2><p className="text-sm text-[#87929b]">{member.email}</p></div><button onClick={onClose}>✕</button></div><div className="mt-6 space-y-4">
    <Field label="Role"><select className="form-control" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}</select></Field>
    <Field label="Department"><select className="form-control" value={form.departmentId} onChange={e=>setForm({...form,departmentId:e.target.value})}><option value="">No department</option>{departments.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
    <Field label="Job title"><input className="form-control" value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}/></Field>
    <Field label="Status"><select className="form-control" value={form.status} onChange={e=>setForm({...form,status:e.target.value as any})}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
  </div><div className="mt-8 flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={()=>void save()} disabled={saving} className="btn btn-gold"><Save size={16}/>{saving?'Saving…':'Save changes'}</button></div></aside></div>
}

function Field({label,children,wide}:{label:string;children:any;wide?:boolean}){return <label className={`${wide?'md:col-span-2':''} block text-xs font-semibold text-[#52616d]`}>{label}<div className="mt-2">{children}</div></label>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="flex items-center justify-between rounded-xl border border-[#dfe3e7] p-4 text-sm font-semibold text-[#26384a]"><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-4 w-4"/></label>}


import { useEffect,useMemo,useState } from 'react'
import { Building2,CheckCircle2,Loader2 } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { saveSetupWorkspace,type WorkspaceSetupInput } from './workspaceCreationService'

const defaultForm:WorkspaceSetupInput={
  organizationId:'',name:'Corporate Workspace',code:'',description:'',
  portfolioPrefix:'PORT',projectPrefix:'PRJ',language:'en',
  dateFormat:'dd/MM/yyyy',numberFormat:'1,234.56',timezone:'Africa/Lagos',
  workingHoursStart:'08:00',workingHoursEnd:'17:00',weekStart:'monday',
  financialYearStart:'1'
}

function makeCode(value:string){
  return value.trim().split(/\s+/).map(x=>x[0]||'').join('').slice(0,8).toUpperCase()
}

export default function WorkspaceCreationStep({
  data,organizationId,onChange,onCreated
}:{
  data:Record<string,unknown>;organizationId:string
  onChange:(data:Record<string,unknown>)=>Promise<void>
  onCreated:(workspaceId:string)=>Promise<void>
}){
  const {refresh,switchWorkspace}=useWorkspace()
  const [form,setForm]=useState<WorkspaceSetupInput>({...defaultForm,...(data as Partial<WorkspaceSetupInput>),organizationId})
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{setForm(current=>({...current,organizationId}))},[organizationId])
  const valid=useMemo(()=>Boolean(organizationId&&form.name.trim()&&form.code.trim()&&form.timezone&&form.dateFormat),[form,organizationId])

  function update<K extends keyof WorkspaceSetupInput>(key:K,value:WorkspaceSetupInput[K]){
    const next={...form,[key]:value}
    if(key==='name'&&!form.code)next.code=makeCode(String(value))
    setForm(next);void onChange(next)
  }

  async function save(){
    if(!valid){setError('Workspace name, code and operating defaults are required.');return}
    setSaving(true);setError('');setMessage('')
    try{
      const result=await saveSetupWorkspace(form)
      await onChange({...form,workspaceId:result.workspaceId,slug:result.slug})
      await refresh()
      switchWorkspace(result.workspaceId)
      await onCreated(result.workspaceId)
      setMessage(result.created?'Workspace created successfully.':'Workspace settings updated successfully.')
    }catch(e){setError(e instanceof Error?e.message:'Unable to save workspace.')}
    finally{setSaving(false)}
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border bg-[#f7fafb] p-5"><div className="flex gap-3"><Building2 className="text-[#1f668f]"/><div><h3 className="font-semibold text-[#173f5f]">Create the operating workspace</h3><p className="mt-1 text-sm text-[#6f7d89]">This is where portfolios, projects, users, controls and reports will live.</p></div></div></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Workspace name" required><input className="form-control" value={form.name} onChange={e=>update('name',e.target.value)}/></Field>
      <Field label="Workspace code" required><input className="form-control uppercase" value={form.code} onChange={e=>update('code',e.target.value.replace(/[^a-zA-Z0-9-]/g,''))} placeholder="MIXTA-HQ"/></Field>
      <Field label="Portfolio prefix"><input className="form-control uppercase" value={form.portfolioPrefix} onChange={e=>update('portfolioPrefix',e.target.value)}/></Field>
      <Field label="Project prefix"><input className="form-control uppercase" value={form.projectPrefix} onChange={e=>update('projectPrefix',e.target.value)}/></Field>
      <Field label="Language"><select className="form-control" value={form.language} onChange={e=>update('language',e.target.value)}><option value="en">English</option><option value="fr">French</option></select></Field>
      <Field label="Date format"><select className="form-control" value={form.dateFormat} onChange={e=>update('dateFormat',e.target.value)}><option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="MM/dd/yyyy">MM/DD/YYYY</option><option value="yyyy-MM-dd">YYYY-MM-DD</option></select></Field>
      <Field label="Number format"><select className="form-control" value={form.numberFormat} onChange={e=>update('numberFormat',e.target.value)}><option>1,234.56</option><option>1.234,56</option><option>1 234,56</option></select></Field>
      <Field label="Time zone"><select className="form-control" value={form.timezone} onChange={e=>update('timezone',e.target.value)}><option value="Africa/Lagos">Africa/Lagos</option><option value="Africa/Accra">Africa/Accra</option><option value="Africa/Nairobi">Africa/Nairobi</option><option value="UTC">UTC</option></select></Field>
      <Field label="Working hours start"><input type="time" className="form-control" value={form.workingHoursStart} onChange={e=>update('workingHoursStart',e.target.value)}/></Field>
      <Field label="Working hours end"><input type="time" className="form-control" value={form.workingHoursEnd} onChange={e=>update('workingHoursEnd',e.target.value)}/></Field>
      <Field label="Week starts"><select className="form-control" value={form.weekStart} onChange={e=>update('weekStart',e.target.value)}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></Field>
      <Field label="Financial year starts"><select className="form-control" value={form.financialYearStart} onChange={e=>update('financialYearStart',e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>{new Date(2026,i,1).toLocaleString('en',{month:'long'})}</option>)}</select></Field>
    </div>
    <Field label="Description"><textarea className="form-control min-h-24" value={form.description} onChange={e=>update('description',e.target.value)}/></Field>
    {message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="mr-2 inline" size={16}/>{message}</div>}
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <button type="button" onClick={()=>void save()} disabled={!valid||saving} className="btn btn-gold">{saving?<><Loader2 className="animate-spin" size={15}/>Saving…</>:'Create or update workspace'}</button>
  </div>
}
function Field({label,required,children}:{label:string;required?:boolean;children:React.ReactNode}){return <label className="block text-xs font-semibold text-[#52616d]">{label}{required&&<span className="text-red-500"> *</span>}<div className="mt-2">{children}</div></label>}


import { useEffect,useMemo,useState } from 'react'
import { Building2,CheckCircle2,Globe2,Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { findUserOrganization,saveSetupOrganization,type OrganizationSetupInput } from '@/experience/organizationSetupService'

const INDUSTRIES=[
  'Real Estate Development','Construction','Infrastructure','Manufacturing','Oil & Gas',
  'Hospitality','Healthcare','Education','Government','Other'
]
const CURRENCIES=['NGN','USD','GBP','EUR','GHS','KES','ZAR','XOF','MAD','TND']
const WORK_DAYS=[
  ['monday','Monday'],['tuesday','Tuesday'],['wednesday','Wednesday'],
  ['thursday','Thursday'],['friday','Friday'],['saturday','Saturday'],['sunday','Sunday']
]

const defaultForm:OrganizationSetupInput={
  name:'',industry:'Real Estate Development',country:'Nigeria',website:'',email:'',
  phone:'',address:'',timezone:'Africa/Lagos',currency:'NGN',
  workingWeek:'monday_saturday',customWorkingDays:['monday','tuesday','wednesday','thursday','friday','saturday']
}

export default function OrganizationSetupStep({
  data,onChange,onCreated
}:{
  data:Record<string,unknown>
  onChange:(data:Record<string,unknown>)=>Promise<void>
  onCreated:(organizationId:string)=>Promise<void>
}){
  const user=useAuthStore(s=>s.user)
  const [form,setForm]=useState<OrganizationSetupInput>({...defaultForm,...(data as Partial<OrganizationSetupInput>)})
  const [checking,setChecking]=useState(true)
  const [saving,setSaving]=useState(false)
  const [existingId,setExistingId]=useState<string|null>(String(data.organizationId||'')||null)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    async function load(){
      if(!user?.id){setChecking(false);return}
      try{
        const existing=await findUserOrganization(user.id)
        if(existing&&active){
          setExistingId(String(existing.id))
          const next:OrganizationSetupInput={
            name:existing.name||'',
            industry:existing.industry||defaultForm.industry,
            country:existing.country||defaultForm.country,
            website:existing.website||'',
            email:existing.email||user.email||'',
            phone:existing.phone||'',
            address:existing.address||'',
            timezone:existing.timezone||defaultForm.timezone,
            currency:existing.currency||defaultForm.currency,
            workingWeek:(existing.working_week as OrganizationSetupInput['workingWeek'])||defaultForm.workingWeek,
            customWorkingDays:existing.working_days||defaultForm.customWorkingDays
          }
          setForm(next)
          await onChange({...next,organizationId:String(existing.id),existing:true})
          setMessage('Your existing organization has been detected. Review the details and continue.')
        }else if(active&&user?.email){
          setForm(current=>({...current,email:current.email||user.email||''}))
        }
      }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to check organization details.')}
      finally{if(active)setChecking(false)}
    }
    void load()
    return()=>{active=false}
  },[user?.id])

  const valid=useMemo(()=>Boolean(form.name.trim()&&form.industry&&form.country&&form.timezone&&form.currency&&form.customWorkingDays.length),[form])

  function update<K extends keyof OrganizationSetupInput>(key:K,value:OrganizationSetupInput[K]){
    const next={...form,[key]:value}
    if(key==='workingWeek'){
      if(value==='monday_friday')next.customWorkingDays=['monday','tuesday','wednesday','thursday','friday']
      if(value==='monday_saturday')next.customWorkingDays=['monday','tuesday','wednesday','thursday','friday','saturday']
    }
    setForm(next)
    void onChange(next)
  }

  async function save(){
    if(!valid){setError('Complete the organization name, industry, country, time zone, currency and working days.');return}
    setSaving(true);setError('');setMessage('')
    try{
      const result=await saveSetupOrganization(form)
      setExistingId(result.organizationId)
      await onChange({...form,organizationId:result.organizationId,slug:result.slug,existing:!result.created})
      await onCreated(result.organizationId)
      setMessage(result.created?'Organization created successfully.':'Organization details updated successfully.')
    }catch(e){setError(e instanceof Error?e.message:'Unable to save the organization.')}
    finally{setSaving(false)}
  }

  if(checking)return <div className="grid min-h-64 place-items-center rounded-2xl bg-[#f7f9fa]"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#1f668f]"/><p className="mt-3 text-sm text-[#6f7d89]">Checking your organization…</p></div></div>

  return <div className="space-y-5">
    <div className="rounded-2xl border border-[#dce7ed] bg-[#f7fafb] p-5">
      <div className="flex items-start gap-3"><Building2 className="mt-1 text-[#1f668f]"/><div><h3 className="font-semibold text-[#173f5f]">{existingId?'Organization detected':'Create your organization'}</h3><p className="mt-1 text-sm leading-6 text-[#6f7d89]">{existingId?'PMOCorex will update the existing company profile instead of creating a duplicate.':'This is the company-level account that will own your workspaces, users and projects.'}</p></div></div>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Organization name" required><input className="form-control" value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Mixta Africa"/></Field>
      <Field label="Industry" required><select className="form-control" value={form.industry} onChange={e=>update('industry',e.target.value)}>{INDUSTRIES.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Country" required><input className="form-control" value={form.country} onChange={e=>update('country',e.target.value)} placeholder="Nigeria"/></Field>
      <Field label="Website"><input className="form-control" type="url" value={form.website} onChange={e=>update('website',e.target.value)} placeholder="https://company.com"/></Field>
      <Field label="Company email"><input className="form-control" type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="info@company.com"/></Field>
      <Field label="Phone number"><input className="form-control" value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+234..."/></Field>
      <Field label="Time zone" required><select className="form-control" value={form.timezone} onChange={e=>update('timezone',e.target.value)}><option value="Africa/Lagos">Africa/Lagos</option><option value="Africa/Accra">Africa/Accra</option><option value="Africa/Nairobi">Africa/Nairobi</option><option value="Africa/Johannesburg">Africa/Johannesburg</option><option value="Europe/London">Europe/London</option><option value="UTC">UTC</option></select></Field>
      <Field label="Currency" required><select className="form-control" value={form.currency} onChange={e=>update('currency',e.target.value)}>{CURRENCIES.map(x=><option key={x}>{x}</option>)}</select></Field>
    </div>

    <Field label="Company address"><textarea className="form-control min-h-24" value={form.address} onChange={e=>update('address',e.target.value)} placeholder="Registered or operating address"/></Field>

    <div>
      <div className="text-xs font-semibold text-[#52616d]">Working week <span className="text-red-500">*</span></div>
      <div className="mt-2 grid gap-3 md:grid-cols-3">{[
        ['monday_friday','Monday–Friday'],['monday_saturday','Monday–Saturday'],['custom','Custom']
      ].map(([value,label])=><button type="button" key={value} onClick={()=>update('workingWeek',value as OrganizationSetupInput['workingWeek'])} className={`rounded-xl border p-4 text-left text-sm font-semibold ${form.workingWeek===value?'border-[#173f5f] bg-[#eef5f8] text-[#173f5f]':'border-[#dfe5e8] text-[#536170]'}`}>{label}</button>)}</div>
      {form.workingWeek==='custom'&&<div className="mt-3 flex flex-wrap gap-2">{WORK_DAYS.map(([value,label])=><label key={value} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={form.customWorkingDays.includes(value)} onChange={e=>update('customWorkingDays',e.target.checked?[...form.customWorkingDays,value]:form.customWorkingDays.filter(x=>x!==value))}/>{label}</label>)}</div>}
    </div>

    {message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={16} className="mr-2 inline"/>{message}</div>}
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <button type="button" disabled={saving||!valid} onClick={()=>void save()} className="btn btn-gold">{saving?<><Loader2 size={15} className="animate-spin"/>Saving organization…</>:<><Globe2 size={15}/>{existingId?'Update organization':'Create organization'}</>}</button>
  </div>
}

function Field({label,required,children}:{label:string;required?:boolean;children:React.ReactNode}){return <label className="block text-xs font-semibold text-[#52616d]">{label}{required&&<span className="text-red-500"> *</span>}<div className="mt-2">{children}</div></label>}

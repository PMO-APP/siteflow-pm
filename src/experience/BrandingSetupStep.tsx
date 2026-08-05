
import { ChangeEvent,useMemo,useState } from 'react'
import { CheckCircle2,Loader2,Palette,Upload } from 'lucide-react'
import { saveSetupBranding,uploadSetupBrandAsset,type BrandingSetupInput } from './workspaceCreationService'

const HEX=/^#[0-9a-fA-F]{6}$/
export default function BrandingSetupStep({
  data,workspaceId,onChange,onSaved
}:{
  data:Record<string,unknown>;workspaceId:string
  onChange:(data:Record<string,unknown>)=>Promise<void>
  onSaved:()=>Promise<void>
}){
  const [form,setForm]=useState<BrandingSetupInput>({
    workspaceId,logoUrl:null,darkLogoUrl:null,lightLogoUrl:null,
    primaryColor:'#173f5f',accentColor:'#ef8354',defaultTheme:'light',
    emailFooter:'',companyAddress:'',supportEmail:'',supportPhone:'',
    ...(data as Partial<BrandingSetupInput>)
  })
  const [saving,setSaving]=useState(false),[uploading,setUploading]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('')
  const valid=useMemo(()=>HEX.test(form.primaryColor)&&HEX.test(form.accentColor),[form])
  function update<K extends keyof BrandingSetupInput>(key:K,value:BrandingSetupInput[K]){const next={...form,[key]:value};setForm(next);void onChange(next)}
  async function upload(kind:'logo'|'dark-logo'|'light-logo',e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)){setError('Use PNG, JPG, WEBP or SVG files.');return}
    if(file.size>5*1024*1024){setError('Logo files must be 5 MB or smaller.');return}
    setUploading(kind);setError('')
    try{const url=await uploadSetupBrandAsset(workspaceId,kind,file);update(kind==='logo'?'logoUrl':kind==='dark-logo'?'darkLogoUrl':'lightLogoUrl',url)}
    catch(err){setError(err instanceof Error?err.message:'Unable to upload logo.')}
    finally{setUploading('');e.target.value=''}
  }
  async function save(){if(!valid){setError('Use valid six-digit HEX colours.');return}setSaving(true);setError('');try{await saveSetupBranding({...form,workspaceId});await onSaved();setMessage('Workspace branding saved.')}catch(e){setError(e instanceof Error?e.message:'Unable to save branding.')}finally{setSaving(false)}}
  return <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
    <div className="space-y-5">
      <div className="rounded-2xl border bg-[#f7fafb] p-5"><div className="flex gap-3"><Palette className="text-[#1f668f]"/><div><h3 className="font-semibold text-[#173f5f]">Brand your workspace</h3><p className="mt-1 text-sm text-[#6f7d89]">These defaults appear across navigation, reports, Boardroom and emails.</p></div></div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <LogoField label="Company logo" loading={uploading==='logo'} value={form.logoUrl} onChange={e=>void upload('logo',e)}/>
        <LogoField label="Dark-background logo" loading={uploading==='dark-logo'} value={form.darkLogoUrl} onChange={e=>void upload('dark-logo',e)}/>
        <LogoField label="Light-background logo" loading={uploading==='light-logo'} value={form.lightLogoUrl} onChange={e=>void upload('light-logo',e)}/>
        <Field label="Theme"><select className="form-control" value={form.defaultTheme} onChange={e=>update('defaultTheme',e.target.value as BrandingSetupInput['defaultTheme'])}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></Field>
        <Field label="Primary colour"><div className="flex gap-2"><input type="color" className="h-12 w-14 rounded-lg border p-1" value={form.primaryColor} onChange={e=>update('primaryColor',e.target.value)}/><input className="form-control" value={form.primaryColor} onChange={e=>update('primaryColor',e.target.value)}/></div></Field>
        <Field label="Accent colour"><div className="flex gap-2"><input type="color" className="h-12 w-14 rounded-lg border p-1" value={form.accentColor} onChange={e=>update('accentColor',e.target.value)}/><input className="form-control" value={form.accentColor} onChange={e=>update('accentColor',e.target.value)}/></div></Field>
        <Field label="Support email"><input type="email" className="form-control" value={form.supportEmail} onChange={e=>update('supportEmail',e.target.value)}/></Field>
        <Field label="Support phone"><input className="form-control" value={form.supportPhone} onChange={e=>update('supportPhone',e.target.value)}/></Field>
      </div>
      <Field label="Company address"><textarea className="form-control min-h-20" value={form.companyAddress} onChange={e=>update('companyAddress',e.target.value)}/></Field>
      <Field label="Email footer"><textarea className="form-control min-h-20" value={form.emailFooter} onChange={e=>update('emailFooter',e.target.value)}/></Field>
      {message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="mr-2 inline" size={16}/>{message}</div>}
      {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <button type="button" onClick={()=>void save()} disabled={saving||!valid} className="btn btn-gold">{saving?<><Loader2 className="animate-spin" size={15}/>Saving…</>:'Save branding'}</button>
    </div>
    <div className="rounded-[24px] border bg-[#f7f9fa] p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-[#71808c]">Live preview</div>
      <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 text-white" style={{backgroundColor:form.primaryColor}}>{form.logoUrl?<img src={form.logoUrl} className="h-8 max-w-32 object-contain"/>:<div className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 font-bold">P</div>}<div><div className="font-semibold">PMOCorex</div><div className="text-[10px] text-white/70">Portfolio Control Centre</div></div></div>
        <div className="p-5"><div className="rounded-xl border p-4"><div className="text-xs text-[#87929b]">Portfolio health</div><div className="mt-2 text-3xl font-semibold" style={{color:form.primaryColor}}>84%</div><div className="mt-3 h-2 rounded-full bg-[#e8edef]"><div className="h-2 w-4/5 rounded-full" style={{backgroundColor:form.accentColor}}/></div></div><div className="mt-4 rounded-xl border p-4"><div className="text-xs font-semibold" style={{color:form.primaryColor}}>Sample report header</div><div className="mt-2 h-2 w-2/3 rounded bg-[#e8edef]"/></div></div>
      </div>
    </div>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-xs font-semibold text-[#52616d]">{label}<div className="mt-2">{children}</div></label>}
function LogoField({label,value,loading,onChange}:{label:string;value:string|null;loading:boolean;onChange:(e:ChangeEvent<HTMLInputElement>)=>void}){return <div className="rounded-xl border p-3"><div className="text-xs font-semibold text-[#52616d]">{label}</div><div className="mt-2 flex items-center justify-between gap-2">{value?<img src={value} className="h-10 max-w-28 object-contain"/>:<span className="text-xs text-[#87929b]">Not uploaded</span>}<label className="btn btn-ghost cursor-pointer"><Upload size={14}/>{loading?'Uploading…':'Upload'}<input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onChange}/></label></div></div>}

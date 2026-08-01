
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Building2, Image, Monitor, Palette, Save, Upload, Mail, FileText } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { updateWorkspaceBranding, updateWorkspaceProfile, uploadWorkspaceBrandAsset } from '@/workspace/workspaceService'
import type { WorkspaceBranding } from '@/workspace/types'

export default function WorkspaceSettingsPage() {
  const { activeWorkspace, refresh } = useWorkspace()
  const [saving,setSaving]=useState(false)
  const [uploading,setUploading]=useState('')
  const [message,setMessage]=useState('')
  const [profile,setProfile]=useState({name:'',industry:'',timezone:'Africa/Lagos',currency:'NGN'})
  const [branding,setBranding]=useState<WorkspaceBranding>({
    logoUrl:null,primaryColor:'#173f5f',secondaryColor:'#ef8354',loginBackgroundUrl:null,
    emailHeaderUrl:null,reportFooter:null,productName:'PMOCorex',productTagline:'Project delivery control',
    faviconUrl:null,loginHeadline:null,loginSubheadline:null,emailSenderName:null,
    reportHeaderText:null,hidePlatformBrand:false
  })

  useEffect(()=>{
    if(!activeWorkspace)return
    setProfile({name:activeWorkspace.name,industry:activeWorkspace.settings.industry||'',timezone:activeWorkspace.settings.timezone,currency:activeWorkspace.settings.currency})
    setBranding(activeWorkspace.branding)
  },[activeWorkspace])

  async function submit(e:FormEvent){
    e.preventDefault()
    if(!activeWorkspace)return
    setSaving(true);setMessage('')
    try{
      await Promise.all([
        updateWorkspaceProfile(activeWorkspace.id,profile),
        updateWorkspaceBranding(activeWorkspace.id,branding)
      ])
      await refresh()
      setMessage('Workspace branding and settings saved.')
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to save workspace settings.')}
    finally{setSaving(false)}
  }

  async function upload(kind:'logo'|'favicon'|'login-background'|'email-header',event:ChangeEvent<HTMLInputElement>){
    if(!activeWorkspace||!event.target.files?.[0])return
    const file=event.target.files[0]
    const allowed=['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon']
    if(!allowed.includes(file.type)){setMessage('Use PNG, JPG, WEBP, SVG or ICO images only.');return}
    if(file.size>5*1024*1024){setMessage('Brand assets must be 5 MB or smaller.');return}
    setUploading(kind)
    try{
      const url=await uploadWorkspaceBrandAsset(activeWorkspace.id,kind,file)
      setBranding(current=>({
        ...current,
        ...(kind==='logo'?{logoUrl:url}:{}),
        ...(kind==='favicon'?{faviconUrl:url}:{}),
        ...(kind==='login-background'?{loginBackgroundUrl:url}:{}),
        ...(kind==='email-header'?{emailHeaderUrl:url}:{}),
      }))
      setMessage('Asset uploaded. Save settings to apply it.')
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to upload brand asset.')}
    finally{setUploading('');event.target.value=''}
  }

  if(!activeWorkspace)return <div className="rounded-2xl border bg-white p-8">No workspace is available for this account.</div>
  const field='mt-2 w-full rounded-xl border border-[#d7e0e6] bg-white px-3.5 py-3 text-sm text-[#173f5f] outline-none focus:border-[#4d86a8]'

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex items-start gap-4"><div className="rounded-2xl bg-[#eaf1f7] p-3 text-[#1f668f]"><Palette/></div><div>
          <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">White-label platform</div>
          <h1 className="mt-2 text-3xl font-semibold text-[#102943]">Brand and workspace settings</h1>
          <p className="mt-2 text-sm text-[#6f7d89]">Control the identity shown across the application, login experience, email and generated reports.</p>
        </div></div>
      </section>

      <form onSubmit={submit} className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-2">
          <Card icon={Building2} title="Workspace profile">
            <label className="block text-xs font-semibold text-[#52616d]">Workspace name<input className={field} value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
            <label className="mt-4 block text-xs font-semibold text-[#52616d]">Industry<input className={field} value={profile.industry} onChange={e=>setProfile({...profile,industry:e.target.value})}/></label>
            <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#52616d]">Timezone<input className={field} value={profile.timezone} onChange={e=>setProfile({...profile,timezone:e.target.value})}/></label><label className="text-xs font-semibold text-[#52616d]">Currency<input className={field} value={profile.currency} onChange={e=>setProfile({...profile,currency:e.target.value.toUpperCase()})}/></label></div>
          </Card>

          <Card icon={Monitor} title="Product identity">
            <label className="block text-xs font-semibold text-[#52616d]">Product name<input className={field} value={branding.productName} onChange={e=>setBranding({...branding,productName:e.target.value})}/></label>
            <label className="mt-4 block text-xs font-semibold text-[#52616d]">Product tagline<input className={field} value={branding.productTagline} onChange={e=>setBranding({...branding,productTagline:e.target.value})}/></label>
            <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#52616d]">Primary colour<input type="color" className={`${field} h-12 p-1`} value={branding.primaryColor} onChange={e=>setBranding({...branding,primaryColor:e.target.value})}/></label><label className="text-xs font-semibold text-[#52616d]">Accent colour<input type="color" className={`${field} h-12 p-1`} value={branding.secondaryColor} onChange={e=>setBranding({...branding,secondaryColor:e.target.value})}/></label></div>
            <label className="mt-4 flex items-center justify-between rounded-xl border border-[#dfe3e7] p-3 text-sm font-semibold text-[#26384a]"><span>Hide “Powered by SiteFlow PM”</span><input type="checkbox" checked={branding.hidePlatformBrand} onChange={e=>setBranding({...branding,hidePlatformBrand:e.target.checked})}/></label>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card icon={Image} title="Brand assets">
            <Asset label="Company logo" value={branding.logoUrl} loading={uploading==='logo'} onChange={e=>void upload('logo',e)}/>
            <Asset label="Browser favicon" value={branding.faviconUrl} loading={uploading==='favicon'} onChange={e=>void upload('favicon',e)}/>
            <Asset label="Login background" value={branding.loginBackgroundUrl} loading={uploading==='login-background'} onChange={e=>void upload('login-background',e)}/>
            <Asset label="Email header" value={branding.emailHeaderUrl} loading={uploading==='email-header'} onChange={e=>void upload('email-header',e)}/>
          </Card>

          <Card icon={Monitor} title="Login experience">
            <label className="block text-xs font-semibold text-[#52616d]">Login headline<input className={field} value={branding.loginHeadline||''} onChange={e=>setBranding({...branding,loginHeadline:e.target.value||null})}/></label>
            <label className="mt-4 block text-xs font-semibold text-[#52616d]">Login subheadline<textarea className={`${field} min-h-24`} value={branding.loginSubheadline||''} onChange={e=>setBranding({...branding,loginSubheadline:e.target.value||null})}/></label>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe3e7]">
              <div className="min-h-40 bg-cover bg-center p-5 text-white" style={{backgroundColor:branding.primaryColor,backgroundImage:branding.loginBackgroundUrl?`linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)),url(${branding.loginBackgroundUrl})`:undefined}}>
                <div className="flex items-center gap-3">{branding.logoUrl?<img src={branding.logoUrl} className="h-10 max-w-32 object-contain" alt=""/>:<div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 font-bold">{branding.productName.slice(0,1)}</div>}<div><div className="font-bold">{branding.productName}</div><div className="text-xs text-white/70">{branding.productTagline}</div></div></div>
                <h3 className="mt-7 text-xl font-semibold">{branding.loginHeadline||'Return to the work that moves delivery forward.'}</h3>
                <p className="mt-2 text-sm text-white/75">{branding.loginSubheadline||'Review portfolio performance and keep every control area connected.'}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card icon={Mail} title="Email identity">
            <label className="block text-xs font-semibold text-[#52616d]">Sender name<input className={field} value={branding.emailSenderName||''} onChange={e=>setBranding({...branding,emailSenderName:e.target.value||null})}/></label>
          </Card>
          <Card icon={FileText} title="Report identity">
            <label className="block text-xs font-semibold text-[#52616d]">Report header<input className={field} value={branding.reportHeaderText||''} onChange={e=>setBranding({...branding,reportHeaderText:e.target.value||null})}/></label>
            <label className="mt-4 block text-xs font-semibold text-[#52616d]">Report footer<textarea className={`${field} min-h-24`} value={branding.reportFooter||''} onChange={e=>setBranding({...branding,reportFooter:e.target.value||null})}/></label>
          </Card>
        </section>

        <div className="flex items-center justify-between rounded-2xl border border-[#dfe3e7] bg-white p-4"><span className="text-sm text-[#65717c]">{message}</span><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#173f5f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><Save size={16}/>{saving?'Saving…':'Save branding'}</button></div>
      </form>
    </div>
  </div>
}

function Card({icon:Icon,title,children}:{icon:any;title:string;children:any}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="flex items-center gap-2 text-[#102943]"><Icon size={19}/><h2 className="font-semibold">{title}</h2></div><div className="mt-5">{children}</div></section>}
function Asset({label,value,loading,onChange}:{label:string;value:string|null;loading:boolean;onChange:(e:ChangeEvent<HTMLInputElement>)=>void}){return <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#e0e7ea] p-3"><div className="min-w-0"><div className="text-xs font-semibold text-[#52616d]">{label}</div><div className="mt-1 truncate text-[11px] text-[#87929b]">{value?'Uploaded':'No asset uploaded'}</div></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#eaf1f7] px-3 py-2 text-xs font-semibold text-[#173f5f]"><Upload size={14}/>{loading?'Uploading…':'Upload'}<input type="file" accept="image/*,.ico" className="hidden" disabled={loading} onChange={onChange}/></label></div>}

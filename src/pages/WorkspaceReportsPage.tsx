import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

type Project = {id:number; project_name:string; status?:string|null; handover_date?:string|null; organization_id?:number|null; portfolio_id?:number|null; overall_owner_email?:string|null; housebuild_owner_email?:string|null; mep_owner_email?:string|null; infrastructure_owner_email?:string|null}
type ReportRow = {project_id:number; discipline?:string|null; report_date?:string|null}
const units = ['Housebuild','Mechanical','Electrical','Infrastructure']
function lagosToday() {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const get=(name:string)=>parts.find(p=>p.type===name)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
function reportingWeek() {
  const today = lagosToday()
  const d = new Date(`${today}T12:00:00Z`)
  const offset = (5-d.getUTCDay()+7)%7
  d.setUTCDate(d.getUTCDate()+offset)
  return d.toISOString().slice(0,10)
}
export default function WorkspaceReportsPage() {
  const {section} = useParams()
  const navigate=useNavigate()
  const setProject=useProjectStore(s=>s.setProject)
  const [projects,setProjects]=useState<Project[]>([])
  const [design,setDesign]=useState<ReportRow[]>([])
  const [ipd,setIpd]=useState<ReportRow[]>([])
  const [costing,setCosting]=useState<ReportRow[]>([])
  const [week,setWeek]=useState(reportingWeek)
  const [loading,setLoading]=useState(false)
  const [errors,setErrors]=useState<string[]>([])
  const [search,setSearch]=useState('')
  const [discipline,setDiscipline]=useState('Housebuild')
  const [updated,setUpdated]=useState('')
  const [refresh,setRefresh]=useState(0)
  useEffect(()=>{
    let active=true
    async function load(){
      setLoading(true);setErrors([])
      // All queries respect Supabase RLS; do not fall back to an unscoped service-role query.
      const projectResult=await supabase.from('projects').select('id,project_name,status,handover_date,organization_id,portfolio_id,overall_owner_email,housebuild_owner_email,mep_owner_email,infrastructure_owner_email').is('archived_at',null).order('project_name')
      if(!active)return
      if(projectResult.error){setErrors([`Projects: ${projectResult.error.message}`]);setProjects([]);setLoading(false);return}
      const visible=(projectResult.data||[]) as Project[]
      setProjects(visible)
      if(section==='pmo' && visible.length){
        const ids=visible.map(p=>p.id)
        const monday=new Date(`${week}T12:00:00Z`);monday.setUTCDate(monday.getUTCDate()-4)
        const start=monday.toISOString().slice(0,10)
        const [d,c,i]=await Promise.all([
          supabase.from('design_report_submissions').select('project_id').in('project_id',ids).eq('report_week',start),
          supabase.from('cost_report_submissions').select('project_id').in('project_id',ids).eq('report_week',start),
          supabase.from('weekly_reports').select('project_id,discipline,report_date').in('project_id',ids).gte('report_date',start).lte('report_date',week),
        ])
        if(!active)return
        setDesign((d.data||[]) as ReportRow[]);setCosting((c.data||[]) as ReportRow[]);setIpd((i.data||[]) as ReportRow[])
        setErrors([d.error&&`Design: ${d.error.message}`,c.error&&`Costing: ${c.error.message}`,i.error&&`IPD: ${i.error.message}`].filter(Boolean) as string[])
      } else {setDesign([]);setCosting([]);setIpd([])}
      if(active){setUpdated(new Date().toLocaleString('en-NG',{timeZone:'Africa/Lagos'}));setLoading(false)}
    }
    void load();return ()=>{active=false}
  },[section,week,refresh])
  const filtered=useMemo(()=>projects.filter(p=>p.project_name.toLowerCase().includes(search.toLowerCase())),[projects,search])
  function open(p:Project){
    setProject(p.id,p.project_name,p.organization_id??null,p.portfolio_id??null,p.overall_owner_email??null,p.housebuild_owner_email??null,p.mep_owner_email??null,p.infrastructure_owner_email??null)
    navigate(section==='design'?'/app/design-reports':`/app/reports/ipd`)
  }
  const today=lagosToday()
  const atRisk=projects.filter(p=>['Stuck','Delayed','On Hold'].includes(p.status||''))
  const dueSoon=projects.filter(p=>p.handover_date && p.handover_date>=today && p.handover_date<=new Date(Date.parse(today+'T12:00:00Z')+30*86400000).toISOString().slice(0,10))
  const overdue=projects.filter(p=>p.handover_date && p.handover_date<today && !['Completed','Cancelled'].includes(p.status||''))
  const missing=projects.map(p=>{
    const missingUnits=[
      !design.some(r=>r.project_id===p.id)&&'Design',
      !costing.some(r=>r.project_id===p.id)&&'Costing (project submission)',
      ...units.filter(u=>!ipd.some(r=>r.project_id===p.id && (r.discipline||'').toLowerCase()===u.toLowerCase())),
    ].filter(Boolean)
    return {...p,missingUnits}
  })
  const isPMO=section==='pmo'
  if(!isPMO && section!=='design' && section!=='ipd')return <div className="p-8">Unknown report section. <button onClick={()=>navigate('/projects')}>Back to workspace</button></div>
  return <div className="min-h-screen bg-[#f7f8f6] text-[#173f5f]">
    <header className="border-b border-[#d8e4ee] bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4"><PMOCorexLogo size={38}/><button className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold" onClick={()=>navigate('/projects')}><ArrowLeft size={16}/> Workspace Hub</button></div></header>
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#05969B]">Workspace / Reports</p><h1 className="mt-2 text-3xl font-black">{isPMO?'PMO Executive Report':section==='design'?'Design Reports':'IPD Reports'}</h1><p className="mt-2 text-sm text-slate-600">{isPMO?'Read-only portfolio management overview. Departmental submissions are the source of record; missing or unverified figures are not inferred.':'Choose a project to open its existing departmental reporting page.'}</p></div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">{isPMO?<label className="text-sm">Week ending (Friday) <input type="date" className="ml-2 rounded border p-2" value={week} onChange={e=>setWeek(e.target.value)}/></label>:<><input aria-label="Find project" className="rounded-lg border p-2" placeholder="Search projects" value={search} onChange={e=>setSearch(e.target.value)}/>{section==='ipd'&&<label className="text-sm">Unit <select className="ml-2 rounded border p-2" value={discipline} onChange={e=>setDiscipline(e.target.value)}>{units.map(u=><option key={u}>{u}</option>)}</select></label>}</>}<button className="ml-auto flex items-center gap-2 rounded-lg border px-3 py-2" onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15}/> Refresh</button></div>
      {loading&&<p>Loading report sources…</p>}
      {errors.length>0&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Some source records could not be verified: {errors.join(' · ')}. Treat related totals and submission status as unavailable.</div>}
      {isPMO?<><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Visible projects',projects.length],
        ['Flagged project statuses',atRisk.length],
        ['Handover date passed',overdue.length],
        ['Due within 30 days',dueSoon.length],
      ].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Management attention</h2><p className="mt-1 text-sm text-slate-600">Prioritised indicators available from project status and handover dates. This is not yet the approved schedule-variance risk ranking.</p>
      {[...new Map([...overdue,...atRisk,...dueSoon].map(p=>[p.id,p])).values()].length===0?<p className="mt-4 text-sm">No attention flags from these fields. This does not establish that the portfolio is risk-free.</p>:
      <div className="mt-4 space-y-2">{[...new Map([...overdue,...atRisk,...dueSoon].map(p=>[p.id,p])).values()].map(p=><div key={p.id} className="flex items-start gap-3 rounded-xl border p-3"><AlertTriangle size={18} className="mt-1 text-amber-600"/><div><strong>{p.project_name}</strong><p className="text-sm text-slate-600">{overdue.some(x=>x.id===p.id)?'Handover date has passed':atRisk.some(x=>x.id===p.id)?`Project status: ${p.status}`:'Handover due within 30 days'} · Handover: {p.handover_date||'Not available'}</p></div></div>)}</div>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Departmental reporting coverage</h2><p className="mt-1 text-sm text-slate-600">Project-level Costing submission status is shown separately from the new consolidated Costing report. Absence of a record does not prove late submission.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Project</th><th className="p-3">Design</th><th className="p-3">Costing (legacy)</th><th className="p-3">IPD disciplines received</th><th className="p-3">Project status</th></tr></thead><tbody>{missing.map(p=><tr key={p.id} className="border-b"><td className="p-3 font-semibold">{p.project_name}</td><td className="p-3">{design.some(r=>r.project_id===p.id)?'Recorded':'Not recorded'}</td><td className="p-3">{costing.some(r=>r.project_id===p.id)?'Recorded':'Not recorded'}</td><td className="p-3">{units.filter(u=>ipd.some(r=>r.project_id===p.id && (r.discipline||'').toLowerCase()===u.toLowerCase())).join(', ')||'None recorded'}</td><td className="p-3">{p.status||'Not available'}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Financial exposure and recovery intelligence</h2><p className="mt-2 text-sm text-slate-600">Pending payments, certified valuations, cost variations, planned-versus-actual progress, forecast handovers and ranked delivery risk require validated source integration. No financial totals or delay-day estimates are fabricated in this first phase.</p></section>
      <p className="text-xs text-slate-500">Last refreshed: {updated||'Not yet loaded'}. Live, read-only view; not a frozen issued report.</p></>:
      <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 text-lg font-bold">Select project {section==='ipd'?`· ${discipline}`:''}</h2><div className="grid gap-3 sm:grid-cols-2">{filtered.map(p=><button key={p.id} onClick={()=>open(p)} className="flex items-center justify-between rounded-xl border p-4 text-left hover:border-teal-500 hover:bg-teal-50"><span><strong className="block">{p.project_name}</strong><span className="text-xs text-slate-500">{p.status||'Status unavailable'}</span></span><FileText size={20}/></button>)}</div>{!filtered.length&&<p>No accessible projects match your search.</p>}</section>}
    </main></div>
}

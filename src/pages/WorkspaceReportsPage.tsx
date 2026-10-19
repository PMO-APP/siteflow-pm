import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

type Project = {id:number; project_name:string; status?:string|null; handover_date?:string|null; organization_id?:number|null; portfolio_id?:number|null; overall_owner_email?:string|null; housebuild_owner_email?:string|null; mep_owner_email?:string|null; infrastructure_owner_email?:string|null}
type Revision = {project_id:number; package_name?:string|null; block_id?:string|null; current_finish?:string|null; planned_finish?:string|null; forecast_finish?:string|null; baseline_finish?:string|null; revision_name?:string|null}
type Payment = {project_id:number; payment_title?:string|null; amount?:number|null; payment_status?:string|null}
type Blocker = {id?:number;project_id:number;title?:string|null;description?:string|null;status?:string|null;severity?:string|null;impact?:string|null;risk_score?:number|null;due_date?:string|null;expected_delivery_date?:string|null;required_date?:string|null;item_name?:string|null;name?:string|null}
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
  const [revisions,setRevisions]=useState<Revision[]>([])
  const [payments,setPayments]=useState<Payment[]>([])
  const [risks,setRisks]=useState<Blocker[]>([])
  const [procurements,setProcurements]=useState<Blocker[]>([])
  const [approvals,setApprovals]=useState<Blocker[]>([])
  const [blockerHealth,setBlockerHealth]=useState({risks:false,procurement:false,approvals:false})
  const [sourceHealth,setSourceHealth]=useState({revisions:false,payments:false,design:false,ipd:false})
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
        const [d,i,r,pay,riskRes,procRes,approvalRes]=await Promise.all([
          supabase.from('design_report_submissions').select('project_id').in('project_id',ids).eq('report_week',start),
          supabase.from('weekly_reports').select('project_id,discipline,report_date').in('project_id',ids).gte('report_date',start).lte('report_date',week),
          supabase.from('schedule_revisions').select('project_id,package_name,block_id,current_finish,planned_finish,forecast_finish,baseline_finish,revision_name').in('project_id',ids).eq('is_active',true),
          supabase.from('cost_payments').select('project_id,payment_title,amount,payment_status').in('project_id',ids),
          supabase.from('risks').select('id,project_id,title,description,status,severity,impact,risk_score').in('project_id',ids),
          supabase.from('procurement_items').select('id,project_id,item_name,name,status,expected_delivery_date,required_date').in('project_id',ids),
          supabase.from('approvals').select('id,project_id,title,name,status,due_date,required_date').in('project_id',ids),
        ])
        if(!active)return
        setDesign((d.data||[]) as ReportRow[]);setIpd((i.data||[]) as ReportRow[])
        setRevisions((r.data||[]) as Revision[]);setPayments((pay.data||[]) as Payment[])
        setRisks((riskRes.data||[]) as Blocker[]);setProcurements((procRes.data||[]) as Blocker[]);setApprovals((approvalRes.data||[]) as Blocker[])
        setBlockerHealth({risks:!riskRes.error,procurement:!procRes.error,approvals:!approvalRes.error})
        setSourceHealth({revisions:!r.error,payments:!pay.error,design:!d.error,ipd:!i.error})
        setErrors([d.error&&`Design: ${d.error.message}`,i.error&&`IPD: ${i.error.message}`,r.error&&`Active revisions: ${r.error.message}`,pay.error&&`Payment register: ${pay.error.message}`,riskRes.error&&`Risks: ${riskRes.error.message}`,procRes.error&&`Procurement: ${procRes.error.message}`,approvalRes.error&&`Approvals: ${approvalRes.error.message}`].filter(Boolean) as string[])
      } else {setDesign([]);setIpd([]);setRevisions([]);setPayments([]);setRisks([]);setProcurements([]);setApprovals([]);setBlockerHealth({risks:false,procurement:false,approvals:false});setSourceHealth({revisions:false,payments:false,design:false,ipd:false})}
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
      ...units.filter(u=>!ipd.some(r=>r.project_id===p.id && (r.discipline||'').toLowerCase()===u.toLowerCase())),
    ].filter(Boolean)
    return {...p,missingUnits}
  })
  // Transparent attention ordering based only on verified project metadata.
  // This is NOT a schedule variance or forecast-risk model: those require approved
  // baseline/revision dates, progress records and verified departmental submissions.
  const attention=useMemo(()=>projects.map(p=>{
    const status=(p.status||'').toLowerCase().trim()
    const flagged=['stuck','delayed','on hold','at risk','critical'].includes(status)
    const closed=['completed','cancelled','canceled','archived'].includes(status)
    const validDate=Boolean(p.handover_date && /^\d{4}-\d{2}-\d{2}$/.test(p.handover_date) && !Number.isNaN(Date.parse(p.handover_date+'T12:00:00Z')))
    const days=validDate ? Math.round((Date.parse(p.handover_date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000):null
    const overdue=!closed && days!==null && days<0
    const imminent=!closed && days!==null && days>=0 && days<=14
    const soon=!closed && days!==null && days>14 && days<=30
    const band=overdue?0:(flagged&&imminent)?1:flagged?2:imminent?3:soon?4:5
    const reasons=[overdue?`Recorded handover passed ${Math.abs(days!)} day(s) ago`:null,flagged?`Project status: ${p.status}`:null,imminent?`Recorded handover in ${days} day(s)`:null,soon?`Recorded handover in ${days} day(s)`:null].filter(Boolean) as string[]
    return {...p,days,band,reasons,closed,validDate}
  }).filter(p=>!p.closed).sort((a,b)=>a.band-b.band||(a.days??999999)-(b.days??999999)||a.project_name.localeCompare(b.project_name)),[projects,today])
  // Active programme revisions can be package-specific. Never collapse package targets
  // into a single project date or call a missed target a measured schedule delay.
  const programmeAttention=projects.flatMap(p=>revisions.filter(r=>r.project_id===p.id).map(r=>{
    const target=r.current_finish||r.planned_finish||null
    const forecast=r.forecast_finish||null
    const targetMs=target?Date.parse(target+'T12:00:00Z'):NaN
    const forecastMs=forecast?Date.parse(forecast+'T12:00:00Z'):NaN
    const daysToTarget=Number.isFinite(targetMs)?Math.round((targetMs-Date.parse(today+'T12:00:00Z'))/86400000):null
    const forecastOverrunDays=Number.isFinite(targetMs)&&Number.isFinite(forecastMs)?Math.max(0,Math.round((forecastMs-targetMs)/86400000)):null
    return {projectId:p.id,project:p.project_name,package:r.package_name||r.block_id||'Project programme',target,forecast,daysToTarget,forecastOverrunDays,revision:r.revision_name||'Active revision'}
  }))).sort((a,b)=>(a.daysToTarget??999999)-(b.daysToTarget??999999))
  const openRecord=(status?:string|null)=>!/(closed|completed|resolved|approved|delivered|cancelled|canceled|paid)/i.test(status||'')
  const pastDate=(date?:string|null)=>Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date<today)
  const attentionEvidence=projects.map(project=>{
    const highRisks=risks.filter(r=>r.project_id===project.id && openRecord(r.status) && (/high|critical/i.test(`${r.severity||''} ${r.impact||''}`)||Number(r.risk_score||0)>=12))
    const lateProcurement=procurements.filter(r=>r.project_id===project.id && openRecord(r.status) && pastDate(r.expected_delivery_date||r.required_date))
    const lateApprovals=approvals.filter(r=>r.project_id===project.id && openRecord(r.status) && pastDate(r.due_date||r.required_date))
    return {project,highRisks,lateProcurement,lateApprovals}
  }).sort((a,b)=>(b.highRisks.length+b.lateProcurement.length+b.lateApprovals.length)-(a.highRisks.length+a.lateProcurement.length+a.lateApprovals.length))
  const pendingPayments=payments.filter(p=>!['paid','rejected','cancelled','canceled'].includes((p.payment_status||'').toLowerCase().trim()))
  const knownPending=pendingPayments.filter(p=>p.amount!=null&&Number.isFinite(Number(p.amount)))
  const pendingTotal=knownPending.reduce((sum,p)=>sum+Number(p.amount),0)
  // Management attention combines source evidence without assigning a fabricated composite score.
  // Financial records are shown as exposure only; a payment becomes a delivery blocker
  // only when the underlying departmental report explicitly says so.
  const managementMatrix=projects.map(project=>{
    const projectRevisions=programmeAttention.filter(r=>r.projectId===project.id)
    const overduePackages=projectRevisions.filter(r=>r.daysToTarget!==null && r.daysToTarget<0)
    const forecastOverruns=projectRevisions.filter(r=>r.forecastOverrunDays!==null && r.forecastOverrunDays>0)
    const nearPackages=projectRevisions.filter(r=>r.daysToTarget!==null && r.daysToTarget>=0 && r.daysToTarget<=30)
    const projectPayments=pendingPayments.filter(p=>p.project_id===project.id)
    const knownAmounts=projectPayments.filter(p=>p.amount!==null && p.amount!==undefined && Number.isFinite(Number(p.amount)))
    const total=knownAmounts.reduce((sum,p)=>sum+Number(p.amount),0)
    const metadata=attention.find(p=>p.id===project.id)
    const signals=[
      ...overduePackages.map(p=>`${p.package}: target passed ${Math.abs(p.daysToTarget!)} days ago`),
      ...forecastOverruns.map(p=>`${p.package}: forecast ${p.forecastOverrunDays} days beyond target`),
      ...nearPackages.map(p=>`${p.package}: target within ${p.daysToTarget} days`),
      ...(metadata?.reasons||[]),
    ]
    const priorityBand=overduePackages.length||forecastOverruns.length ? 0 : metadata?.band??5
    return {project,overduePackages,forecastOverruns,nearPackages,projectPayments,total,knownAmounts,signals,priorityBand}
  }).sort((a,b)=>a.priorityBand-b.priorityBand || b.overduePackages.length-a.overduePackages.length || b.forecastOverruns.length-a.forecastOverruns.length || a.project.project_name.localeCompare(b.project.project_name))
  const projectsWithVerifiedProgramme=managementMatrix.filter(p=>revisions.some(r=>r.project_id===p.project.id)).length
  const projectsWithExposure=managementMatrix.filter(p=>p.overduePackages.length||p.forecastOverruns.length).length
  const priority=attention.filter(p=>p.reasons.length>0)
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
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Management attention · priority watchlist</h2><p className="mt-1 text-sm text-slate-600">Ordered by recorded handover proximity and flagged project status. Not a calculated schedule-delay ranking; actual slippage and delivery feasibility are not available from these fields alone.</p></div><span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Provisional metadata-based prioritisation</span></div>
      {priority.length===0?<p className="mt-4 text-sm">No handover/status flags identified. This does not mean projects are risk-free.</p>:<div className="mt-4 space-y-3">{priority.map((p,i)=><div key={p.id} className="rounded-xl border p-4"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold">{i+1}</span><AlertTriangle size={18} className="mt-1 shrink-0 text-amber-600"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{p.project_name}</strong><span className="text-xs text-slate-600">{p.handover_date||'No handover date recorded'}</span></div><p className="mt-1 text-sm text-slate-700">{p.reasons.join(' · ')}</p><p className="mt-2 text-xs text-slate-500">Actual schedule variance: unavailable · Payment blockers: unverified · Recovery forecast: not connected</p></div></div></div>)}</div>}
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Priority order: passed recorded handover → flagged status with handover in 14 days → other flagged statuses → handover within 14 days → handover within 30 days. Ties use nearest date. Missing dates never count as zero days. This order must be replaced by the authoritative package-level schedule and verified blockers before being labelled a delivery-risk score.</div></section>
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-bold">Executive intervention matrix</h2><p className="mt-1 text-sm text-slate-600">Combines available active programme dates, project status and payment-register visibility. Sorted by evidenced schedule exposure; not a weighted progress or delivery feasibility score.</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{sourceHealth.revisions?`${projectsWithVerifiedProgramme}/${projects.length} projects with active programme records`:'Programme verification unavailable'}</span></div>
      {sourceHealth.revisions&&<div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Projects with recorded forecast/target exposure</p><p className="text-2xl font-bold">{projectsWithExposure}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Overdue programme packages</p><p className="text-2xl font-bold">{programmeAttention.filter(r=>r.daysToTarget!==null&&r.daysToTarget<0).length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Forecast overruns</p><p className="text-2xl font-bold">{programmeAttention.filter(r=>r.forecastOverrunDays!==null&&r.forecastOverrunDays>0).length}</p></div></div>}
      <div className="mt-4 space-y-3">{managementMatrix.map(({project,overduePackages,forecastOverruns,nearPackages,projectPayments,total,knownAmounts,signals})=><article key={project.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{project.project_name}</h3><p className="text-xs text-slate-500">{project.status||'Project status unavailable'}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">{overduePackages.length||forecastOverruns.length?'Schedule exposure recorded':nearPackages.length?'Upcoming package target':'No verified schedule exposure'}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Overdue targets</p><p className="text-xl font-bold">{sourceHealth.revisions?overduePackages.length:'Unavailable'}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Forecast overruns</p><p className="text-xl font-bold">{sourceHealth.revisions?forecastOverruns.length:'Unavailable'}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Non-final payment records</p><p className="text-xl font-bold">{sourceHealth.payments?projectPayments.length:'Unavailable'}</p>{sourceHealth.payments&&projectPayments.length>0&&<p className="text-xs">₦{total.toLocaleString('en-NG')} recorded{knownAmounts.length!==projectPayments.length?' · incomplete amounts':''}</p>}</div></div><div className="mt-3 text-sm">{signals.length?<><strong>Evidence requiring review</strong><ul className="mt-1 list-disc space-y-1 pl-5">{signals.slice(0,5).map((signal,i)=><li key={i}>{signal}</li>)}</ul>{signals.length>5&&<p className="text-xs text-slate-500">+{signals.length-5} more programme/status signals in the detailed tables</p>}</>:<p className="text-slate-500">No attention signals in available metadata. This is not an all-clear.</p>}</div><p className="mt-3 text-xs text-slate-500">Management decision: requires PMO validation against departmental submissions and actual progress. Payment records are not automatically classified as construction blockers.</p></article>)}</div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Risk, procurement and approval exceptions</h2><p className="mt-1 text-sm text-slate-600">Live source records. High/critical open risks and overdue procurement/approvals are listed as management review signals, not proven causes of programme delay. Counts do not constitute a delivery-risk score.</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-slate-100 px-3 py-2">Risk register: {blockerHealth.risks?'Available':'Unavailable'}</span><span className="rounded bg-slate-100 px-3 py-2">Procurement: {blockerHealth.procurement?'Available':'Unavailable'}</span><span className="rounded bg-slate-100 px-3 py-2">Approvals: {blockerHealth.approvals?'Available':'Unavailable'}</span></div><div className="mt-4 space-y-3">{attentionEvidence.map(({project,highRisks,lateProcurement,lateApprovals})=><article key={project.id} className="rounded-xl border p-3"><h3 className="font-semibold">{project.project_name}</h3><div className="mt-2 grid gap-2 sm:grid-cols-3"><p className="rounded bg-slate-50 p-2 text-sm">High/critical open risks: <strong>{blockerHealth.risks?highRisks.length:'Unavailable'}</strong></p><p className="rounded bg-slate-50 p-2 text-sm">Overdue procurement: <strong>{blockerHealth.procurement?lateProcurement.length:'Unavailable'}</strong></p><p className="rounded bg-slate-50 p-2 text-sm">Overdue approvals: <strong>{blockerHealth.approvals?lateApprovals.length:'Unavailable'}</strong></p></div>{[...highRisks.map(r=>({kind:'Risk',r})),...lateProcurement.map(r=>({kind:'Procurement',r})),...lateApprovals.map(r=>({kind:'Approval',r}))].slice(0,8).map(({kind,r},index)=><p key={`${kind}-${r.id||index}`} className="mt-2 text-sm"><span className="font-semibold">{kind}:</span> {r.title||r.item_name||r.name||r.description||'Unnamed item'} <span className="text-slate-500">({r.status||'Status not recorded'})</span></p>)}{!highRisks.length&&!lateProcurement.length&&!lateApprovals.length&&<p className="mt-2 text-xs text-slate-500">No matching exceptions in accessible records; this is not an all-clear.</p>}</article>)}</div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Departmental reporting coverage</h2><p className="mt-1 text-sm text-slate-600">This shows visible Design and IPD source records only. Costing now has a workspace-wide report and must not be treated as a missing project-level submission. Absence of a record does not prove late submission.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Project</th><th className="p-3">Design</th><th className="p-3">IPD disciplines received</th><th className="p-3">Project status</th></tr></thead><tbody>{missing.map(p=><tr key={p.id} className="border-b"><td className="p-3 font-semibold">{p.project_name}</td><td className="p-3">{!sourceHealth.design?'Unavailable':design.some(r=>r.project_id===p.id)?'Recorded':'Not recorded'}</td><td className="p-3">{!sourceHealth.ipd?'Unavailable':units.filter(u=>ipd.some(r=>r.project_id===p.id && (r.discipline||'').toLowerCase()===u.toLowerCase())).join(', ')||'None recorded'}</td><td className="p-3">{p.status||'Not available'}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Approved programme targets and forecast exposure</h2><p className="mt-1 text-sm text-slate-600">Active schedule revisions by package. A passed target or forecast beyond target indicates exposure, not measured progress slippage. Original baselines and weighted actual progress must be validated separately.</p>{!sourceHealth.revisions?<p className="mt-3 text-amber-700">Schedule source unavailable or not loaded.</p>:programmeAttention.length===0?<p className="mt-3 text-slate-500">No accessible active schedule revisions.</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Project / package</th><th className="p-2">Active target</th><th className="p-2">Forecast</th><th className="p-2">Exposure</th></tr></thead><tbody>{programmeAttention.map((r,i)=><tr className="border-b" key={`${r.project}-${r.package}-${i}`}><td className="p-2"><strong>{r.project}</strong><span className="block text-xs text-slate-500">{r.package} · {r.revision}</span></td><td className="p-2">{r.target||'Not recorded'}</td><td className="p-2">{r.forecast||'Not recorded'}</td><td className="p-2">{r.forecastOverrunDays!==null&&r.forecastOverrunDays>0?`Forecast ${r.forecastOverrunDays} days after target`:r.daysToTarget!==null&&r.daysToTarget<0?`Target passed ${Math.abs(r.daysToTarget)} days ago`:r.daysToTarget!==null?`${r.daysToTarget} days until target`:'Insufficient dates'}</td></tr>)}</tbody></table></div>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Payment items requiring review</h2><p className="mt-1 text-sm text-slate-600">Read-only Costing payment register. A pending payment is not automatically a confirmed construction blocker or a bank-disbursement obligation. No amounts are counted when missing.</p>{!sourceHealth.payments?<p className="mt-3 text-amber-700">Payment register unavailable or not loaded.</p>:<><p className="mt-3 text-sm font-semibold">{pendingPayments.length} non-final payment records · ₦{pendingTotal.toLocaleString('en-NG')} in recorded amounts{knownPending.length!==pendingPayments.length?' (some amounts unavailable)':''}</p>{pendingPayments.length===0?<p className="mt-2 text-sm text-slate-500">No pending payment records found. This does not confirm that there are no payment obligations.</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Project</th><th className="p-2">Payment item</th><th className="p-2">Status</th><th className="p-2">Amount</th></tr></thead><tbody>{pendingPayments.slice(0,50).map((p,i)=><tr key={i} className="border-b"><td className="p-2">{projects.find(x=>x.id===p.project_id)?.project_name||'Unknown'}</td><td className="p-2">{p.payment_title||'Untitled'}</td><td className="p-2">{p.payment_status||'Unverified'}</td><td className="p-2">{p.amount==null?'Not recorded':`₦${Number(p.amount).toLocaleString('en-NG')}`}</td></tr>)}</tbody></table>{pendingPayments.length>50&&<p className="text-xs text-slate-500">Showing first 50 items; {pendingPayments.length} total.</p>}</div>}</>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Intelligence still awaiting validated integration</h2><p className="mt-2 text-sm text-slate-600">Certified valuations, cost variations, actual weighted progress and Recovery Forecast are not yet connected. Risk, procurement and approval exceptions above are sourced separately and are not confirmed causal dependencies. Payment items and programme dates above are separate source facts, not a combined delivery-risk score. No management decisions are inferred without verified blockers.</p></section>
      <p className="text-xs text-slate-500">Last refreshed: {updated||'Not yet loaded'}. Live, read-only view; not a frozen issued report.</p></>:
      <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 text-lg font-bold">Select project {section==='ipd'?`· ${discipline}`:''}</h2><div className="grid gap-3 sm:grid-cols-2">{filtered.map(p=><button key={p.id} onClick={()=>open(p)} className="flex items-center justify-between rounded-xl border p-4 text-left hover:border-teal-500 hover:bg-teal-50"><span><strong className="block">{p.project_name}</strong><span className="text-xs text-slate-500">{p.status||'Status unavailable'}</span></span><FileText size={20}/></button>)}</div>{!filtered.length&&<p>No accessible projects match your search.</p>}</section>}
    </main></div>
}

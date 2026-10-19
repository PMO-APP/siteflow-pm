import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { calculateProjectProgress, calculateProjectPlannedProgress } from '@/core/metrics/progressMetrics'

type Project = {id:number; project_name:string; status?:string|null; handover_date?:string|null; organization_id?:number|null; portfolio_id?:number|null; overall_owner_email?:string|null; housebuild_owner_email?:string|null; mep_owner_email?:string|null; infrastructure_owner_email?:string|null}
type Revision = {project_id:number; package_name?:string|null; block_id?:string|null; current_finish?:string|null; planned_finish?:string|null; forecast_finish?:string|null; baseline_finish?:string|null; revision_name?:string|null}
type Payment = {project_id:number; payment_title?:string|null; amount?:number|null; payment_status?:string|null}
type Blocker = {id?:number;project_id:number;title?:string|null;description?:string|null;status?:string|null;risk_score?:number|null;deadline?:string|null;required_on_site?:string|null;delivery_date?:string|null;name?:string|null}
type TaskEvidence = {id:number;project_id:number;progress_pct?:number|null;status?:string|null;duration_days?:number|null;start_date?:string|null;finish_date?:string|null}
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
  const [taskEvidence,setTaskEvidence]=useState<TaskEvidence[]>([])
  const [taskSourceOk,setTaskSourceOk]=useState(false)
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
        const [d,i,r,pay,riskRes,procRes,approvalRes,taskRes]=await Promise.all([
          supabase.from('design_report_submissions').select('project_id').in('project_id',ids).eq('report_week',start),
          supabase.from('weekly_reports').select('project_id,discipline,report_date').in('project_id',ids).gte('report_date',start).lte('report_date',week),
          supabase.from('schedule_revisions').select('project_id,package_name,block_id,current_finish,planned_finish,forecast_finish,baseline_finish,revision_name').in('project_id',ids).eq('is_active',true),
          supabase.from('cost_payments').select('project_id,payment_title,amount,payment_status').in('project_id',ids),
          supabase.from('risks').select('id,project_id,title,description,status,risk_score').in('project_id',ids),
          supabase.from('procurement_items').select('id,project_id,name,status,required_on_site,delivery_date').in('project_id',ids),
          supabase.from('approvals').select('id,project_id,title,status,deadline').in('project_id',ids),
          supabase.from('tasks').select('id,project_id,progress_pct,status,duration_days,start_date,finish_date').in('project_id',ids),
        ])
        if(!active)return
        setDesign((d.data||[]) as ReportRow[]);setIpd((i.data||[]) as ReportRow[])
        setRevisions((r.data||[]) as Revision[]);setPayments((pay.data||[]) as Payment[])
        setTaskEvidence((taskRes.data||[]) as TaskEvidence[]);setTaskSourceOk(!taskRes.error)
        setRisks((riskRes.data||[]) as Blocker[]);setProcurements((procRes.data||[]) as Blocker[]);setApprovals((approvalRes.data||[]) as Blocker[])
        setBlockerHealth({risks:!riskRes.error,procurement:!procRes.error,approvals:!approvalRes.error})
        setSourceHealth({revisions:!r.error,payments:!pay.error,design:!d.error,ipd:!i.error})
        setErrors([d.error&&`Design: ${d.error.message}`,i.error&&`IPD: ${i.error.message}`,r.error&&`Active revisions: ${r.error.message}`,pay.error&&`Payment register: ${pay.error.message}`,riskRes.error&&`Risks: ${riskRes.error.message}`,procRes.error&&`Procurement: ${procRes.error.message}`,approvalRes.error&&`Approvals: ${approvalRes.error.message}`,taskRes.error&&`Task progress: ${taskRes.error.message}`].filter(Boolean) as string[])
      } else {setDesign([]);setIpd([]);setRevisions([]);setPayments([]);setRisks([]);setProcurements([]);setApprovals([]);setTaskEvidence([]);setTaskSourceOk(false);setBlockerHealth({risks:false,procurement:false,approvals:false});setSourceHealth({revisions:false,payments:false,design:false,ipd:false})}
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
  const effectiveHandover=(p:Project)=>{
    const active=revisions.filter(r=>r.project_id===p.id && !r.block_id && (!r.package_name || /^(master|project programme|overall)$/i.test(r.package_name.trim())))
    const approved=active.map(r=>r.current_finish||r.planned_finish).filter((v):v is string=>Boolean(v)).sort()
    return approved.length ? approved[approved.length-1] : p.handover_date||null
  }
  const atRisk=projects.filter(p=>['Stuck','Delayed','On Hold'].includes(p.status||''))
  const dueSoon=projects.filter(p=>effectiveHandover(p) && effectiveHandover(p)!>=today && effectiveHandover(p)!<=new Date(Date.parse(today+'T12:00:00Z')+30*86400000).toISOString().slice(0,10))
  const overdue=projects.filter(p=>effectiveHandover(p) && effectiveHandover(p)!<today && !['Completed','Cancelled'].includes(p.status||''))
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
    const validDate=Boolean(effectiveHandover(p) && /^\d{4}-\d{2}-\d{2}$/.test(effectiveHandover(p)!) && !Number.isNaN(Date.parse(effectiveHandover(p)!+'T12:00:00Z')))
    const days=validDate ? Math.round((Date.parse(effectiveHandover(p)!+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000):null
    const overdue=!closed && days!==null && days<0
    const imminent=!closed && days!==null && days>=0 && days<=14
    const soon=!closed && days!==null && days>14 && days<=30
    const band=overdue?0:(flagged&&imminent)?1:flagged?2:imminent?3:soon?4:5
    const reasons=[overdue?`Effective recorded handover passed ${Math.abs(days!)} day(s) ago`:null,flagged?`Project status: ${p.status}`:null,imminent?`Effective recorded handover in ${days} day(s)`:null,soon?`Effective recorded handover in ${days} day(s)`:null].filter(Boolean) as string[]
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
  })).sort((a,b)=>(a.daysToTarget??999999)-(b.daysToTarget??999999))
  const openRecord=(status?:string|null)=>!/(closed|completed|resolved|approved|delivered|cancelled|canceled|paid)/i.test(status||'')
  const pastDate=(date?:string|null)=>Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date<today)
  const attentionEvidence=projects.map(project=>{
    const highRisks=risks.filter(r=>r.project_id===project.id && openRecord(r.status) && (r.risk_score != null && Number(r.risk_score)>=12))
    const lateProcurement=procurements.filter(r=>r.project_id===project.id && openRecord(r.status) && pastDate(r.required_on_site) && !r.delivery_date)
    const lateApprovals=approvals.filter(r=>r.project_id===project.id && openRecord(r.status) && pastDate(r.deadline))
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
  // Reuse the same weighted progress functions as Portfolio Dashboard.
  // Do not compute planned % without task dates or actual % without progress evidence.
  const progressComparison = projects.map(project => {
    const tasks = taskEvidence.filter(t => t.project_id === project.id)
    const dated = tasks.filter(t => Boolean(t.start_date && t.finish_date))
    const measured = tasks.filter(t => t.progress_pct != null && Number.isFinite(Number(t.progress_pct)) || /completed|complete|done|not started|not_started/i.test(t.status || ''))
    const actual = taskSourceOk && tasks.length > 0 && measured.length === tasks.length ? calculateProjectProgress(tasks) : null
    const planned = taskSourceOk && tasks.length > 0 && dated.length === tasks.length ? calculateProjectPlannedProgress(tasks, new Date(`${today}T12:00:00Z`)) : null
    // A revised project programme without revised task dates must not be presented
    // as an authoritative revised planned-progress percentage.
    const activeProjectTargets = revisions.filter(r => r.project_id === project.id && !r.block_id && (!r.package_name || /^(master|project programme|overall)$/i.test(r.package_name.trim())))
      .map(r => r.current_finish || r.planned_finish).filter((v): v is string => Boolean(v))
    const sortedTaskFinishes = dated.map(t => t.finish_date || '').sort()
    const latestTaskFinish = sortedTaskFinishes.length ? sortedTaskFinishes[sortedTaskFinishes.length - 1] : null
    const revisedDatesUnreconciled = activeProjectTargets.some(target => latestTaskFinish !== null && target > latestTaskFinish)
    const variance = actual !== null && planned !== null && !revisedDatesUnreconciled ? actual - planned : null
    const forecast = programmeAttention.filter(r => r.projectId === project.id && r.forecastOverrunDays !== null)
    const worstForecastOverrun = forecast.length ? Math.max(...forecast.map(r => r.forecastOverrunDays || 0)) : null
    return {project,actual,planned,variance,revisedDatesUnreconciled,taskCount:tasks.length,measured:measured.length,dated:dated.length,worstForecastOverrun}
  }).sort((a,b) => (a.variance === null ? 1 : b.variance === null ? -1 : a.variance-b.variance) || (b.worstForecastOverrun ?? -1)-(a.worstForecastOverrun ?? -1))
  // Evidence-first intervention ranking. This is a triage order, NOT a calculated
  // probability of on-time delivery or a replacement for Recovery Forecast.
  // Do not convert unavailable registers to zero risk.
  const interventionQueue = managementMatrix.map(entry => {
    const evidence = attentionEvidence.find(x => x.project.id === entry.project.id)
    const overdueDays = entry.overduePackages.map(x => Math.abs(x.daysToTarget || 0))
    const forecastDays = entry.forecastOverruns.map(x => x.forecastOverrunDays || 0)
    const maxDays = Math.max(0, ...overdueDays, ...forecastDays)
    const approaching = entry.nearPackages.some(x => x.daysToTarget !== null && x.daysToTarget <= 14)
    const severe = (evidence?.highRisks.length || 0) > 0
    const overdueDependencies = (evidence?.lateProcurement.length || 0) + (evidence?.lateApprovals.length || 0)
    const flagged = /stuck|delayed|on hold|at risk|critical/i.test(entry.project.status || '')
    const progress = progressComparison.find(p => p.project.id === entry.project.id)
    const behind = progress?.variance !== null && progress?.variance !== undefined ? Math.max(0, -progress.variance) : null
    const overdueHandover = attention.find(p => p.id === entry.project.id)?.days
    const passedHandover = overdueHandover !== null && overdueHandover !== undefined && overdueHandover < 0
    const tier = (behind !== null && behind >= 30) || maxDays >= 30 || (maxDays > 0 && (severe || overdueDependencies > 0)) ? 0
      : (behind !== null && behind >= 15) || passedHandover || maxDays > 0 || (approaching && (severe || overdueDependencies > 0)) ? 1
      : approaching || severe || overdueDependencies > 0 || flagged ? 2 : 3
    const factors = [
      maxDays > 0 ? `Recorded package target / forecast exposure up to ${maxDays} days` : null,
      behind !== null && behind > 0 ? `Task-date planned versus actual progress: ${behind} percentage points behind` : null,
      progress?.revisedDatesUnreconciled ? 'Revised programme target is later than task finish dates; revised planned progress not verified' : null,
      passedHandover ? `Effective recorded handover passed ${Math.abs(overdueHandover!)} days ago (verify completion)` : null,
      approaching ? 'Package target within 14 days' : null,
      severe ? `${evidence?.highRisks.length} elevated-score open risk(s)` : null,
      (evidence?.lateProcurement.length || 0) > 0 ? `${evidence?.lateProcurement.length} overdue procurement item(s)` : null,
      (evidence?.lateApprovals.length || 0) > 0 ? `${evidence?.lateApprovals.length} overdue approval(s)` : null,
      flagged ? `Recorded project status: ${entry.project.status}` : null,
    ].filter(Boolean) as string[]
    const coverage = [sourceHealth.revisions,blockerHealth.risks,blockerHealth.procurement,blockerHealth.approvals].filter(Boolean).length
    return {...entry,tier,maxDays,behind,factors,coverage}
  }).sort((a,b)=>a.tier-b.tier || (b.behind ?? -1)-(a.behind ?? -1) || b.maxDays-a.maxDays || b.factors.length-a.factors.length || a.project.project_name.localeCompare(b.project.project_name))
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
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Management attention · priority watchlist</h2><p className="mt-1 text-sm text-slate-600">Ordered by available active project-level approved programme date (fallback: project handover) and flagged project status. Package targets appear separately. Not a calculated schedule-delay ranking; actual slippage and delivery feasibility are not available from these fields alone.</p></div><span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Provisional programme/status prioritisation</span></div>
      {priority.length===0?<p className="mt-4 text-sm">No handover/status flags identified. This does not mean projects are risk-free.</p>:<div className="mt-4 space-y-3">{priority.map((p,i)=><div key={p.id} className="rounded-xl border p-4"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold">{i+1}</span><AlertTriangle size={18} className="mt-1 shrink-0 text-amber-600"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{p.project_name}</strong><span className="text-xs text-slate-600">{effectiveHandover(p)||'No handover date recorded'}</span></div><p className="mt-1 text-sm text-slate-700">{p.reasons.join(' · ')}</p><p className="mt-2 text-xs text-slate-500">Actual schedule variance: unavailable · Payment blockers: unverified · Recovery forecast: not connected</p></div></div></div>)}</div>}
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Priority order: passed recorded handover → flagged status with handover in 14 days → other flagged statuses → handover within 14 days → handover within 30 days. Ties use nearest date. Missing dates never count as zero days. This order must be replaced by the authoritative package-level schedule and verified blockers before being labelled a delivery-risk score.</div></section>
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-bold">Executive intervention matrix</h2><p className="mt-1 text-sm text-slate-600">Combines available active programme dates, project status and payment-register visibility. Sorted by evidenced schedule exposure; not a weighted progress or delivery feasibility score.</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{sourceHealth.revisions?`${projectsWithVerifiedProgramme}/${projects.length} projects with active programme records`:'Programme verification unavailable'}</span></div>
      {sourceHealth.revisions&&<div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Projects with recorded forecast/target exposure</p><p className="text-2xl font-bold">{projectsWithExposure}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Overdue programme packages</p><p className="text-2xl font-bold">{programmeAttention.filter(r=>r.daysToTarget!==null&&r.daysToTarget<0).length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Forecast overruns</p><p className="text-2xl font-bold">{programmeAttention.filter(r=>r.forecastOverrunDays!==null&&r.forecastOverrunDays>0).length}</p></div></div>}
      <div className="mt-4 space-y-3">{managementMatrix.map(({project,overduePackages,forecastOverruns,nearPackages,projectPayments,total,knownAmounts,signals})=><article key={project.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{project.project_name}</h3><p className="text-xs text-slate-500">{project.status||'Project status unavailable'}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">{overduePackages.length||forecastOverruns.length?'Schedule exposure recorded':nearPackages.length?'Upcoming package target':'No verified schedule exposure'}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Overdue targets</p><p className="text-xl font-bold">{sourceHealth.revisions?overduePackages.length:'Unavailable'}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Forecast overruns</p><p className="text-xl font-bold">{sourceHealth.revisions?forecastOverruns.length:'Unavailable'}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Non-final payment records</p><p className="text-xl font-bold">{sourceHealth.payments?projectPayments.length:'Unavailable'}</p>{sourceHealth.payments&&projectPayments.length>0&&<p className="text-xs">₦{total.toLocaleString('en-NG')} recorded{knownAmounts.length!==projectPayments.length?' · incomplete amounts':''}</p>}</div></div><div className="mt-3 text-sm">{signals.length?<><strong>Evidence requiring review</strong><ul className="mt-1 list-disc space-y-1 pl-5">{signals.slice(0,5).map((signal,i)=><li key={i}>{signal}</li>)}</ul>{signals.length>5&&<p className="text-xs text-slate-500">+{signals.length-5} more programme/status signals in the detailed tables</p>}</>:<p className="text-slate-500">No attention signals in available metadata. This is not an all-clear.</p>}</div><p className="mt-3 text-xs text-slate-500">Management decision: requires PMO validation against departmental submissions and actual progress. Payment records are not automatically classified as construction blockers.</p></article>)}</div></section>
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Executive intervention priority</h2><p className="mt-1 text-sm text-slate-600">Evidence-based triage across task-date progress variance, programme dates, high risks, overdue procurement and approvals. Not an actual-versus-planned progress score or a probability of delivery.</p></div><span className="rounded bg-slate-100 px-3 py-2 text-xs">{interventionQueue.filter(p=>p.tier<3).length} projects with attention signals</span></div>
      <div className="mt-4 space-y-3">{interventionQueue.map((entry,index)=><article key={entry.project.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{index+1}. {entry.project.project_name}</h3><span className={`rounded px-2 py-1 text-xs font-semibold ${entry.tier===0?'bg-red-100 text-red-800':entry.tier===1?'bg-amber-100 text-amber-900':entry.tier===2?'bg-yellow-50 text-yellow-900':'bg-slate-100 text-slate-700'}`}>{['Immediate review','High attention','Monitor closely','No verified attention signals'][entry.tier]}</span></div>{entry.factors.length>0?<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{entry.factors.map((reason,i)=><li key={i}>{reason}</li>)}</ul>:<p className="mt-2 text-sm text-slate-500">No matching signals in accessible sources. This is not an all-clear.</p>}<p className="mt-2 text-xs text-slate-500">Source coverage: {entry.coverage}/4 operational sources available. Pending payments are reported separately; no causal link to delays is assumed.</p></article>)}</div>
      <p className="mt-3 text-xs text-slate-500">Attention bands are screening rules, not approved corporate risk ratings. Progress variances are based on task dates, not a verified revised-programme forecast. Recovery Forecast remains unverified. PMO should confirm critical-path impact before management escalation.</p></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Risk, procurement and approval exceptions</h2><p className="mt-1 text-sm text-slate-600">Live source records. Elevated-score open risks and overdue procurement/approvals are listed as management review signals, not proven causes of programme delay. Counts do not constitute a delivery-risk score.</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-slate-100 px-3 py-2">Risk register: {blockerHealth.risks?'Available':'Unavailable'}</span><span className="rounded bg-slate-100 px-3 py-2">Procurement: {blockerHealth.procurement?'Available':'Unavailable'}</span><span className="rounded bg-slate-100 px-3 py-2">Approvals: {blockerHealth.approvals?'Available':'Unavailable'}</span></div><div className="mt-4 space-y-3">{attentionEvidence.map(({project,highRisks,lateProcurement,lateApprovals})=><article key={project.id} className="rounded-xl border p-3"><h3 className="font-semibold">{project.project_name}</h3><div className="mt-2 grid gap-2 sm:grid-cols-3"><p className="rounded bg-slate-50 p-2 text-sm">Elevated-score open risks: <strong>{blockerHealth.risks?highRisks.length:'Unavailable'}</strong></p><p className="rounded bg-slate-50 p-2 text-sm">Overdue procurement: <strong>{blockerHealth.procurement?lateProcurement.length:'Unavailable'}</strong></p><p className="rounded bg-slate-50 p-2 text-sm">Overdue approvals: <strong>{blockerHealth.approvals?lateApprovals.length:'Unavailable'}</strong></p></div>{[...highRisks.map(r=>({kind:'Risk',r})),...lateProcurement.map(r=>({kind:'Procurement',r})),...lateApprovals.map(r=>({kind:'Approval',r}))].slice(0,8).map(({kind,r},index)=><p key={`${kind}-${r.id||index}`} className="mt-2 text-sm"><span className="font-semibold">{kind}:</span> {r.title||r.name||r.description||'Unnamed item'} <span className="text-slate-500">({r.status||'Status not recorded'})</span></p>)}{!highRisks.length&&!lateProcurement.length&&!lateApprovals.length&&<p className="mt-2 text-xs text-slate-500">No matching exceptions in accessible records; this is not an all-clear.</p>}</article>)}</div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Departmental reporting coverage</h2><p className="mt-1 text-sm text-slate-600">This shows visible Design and IPD source records only. Costing now has a workspace-wide report and must not be treated as a missing project-level submission. Absence of a record does not prove late submission.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Project</th><th className="p-3">Design</th><th className="p-3">IPD disciplines received</th><th className="p-3">Project status</th></tr></thead><tbody>{missing.map(p=><tr key={p.id} className="border-b"><td className="p-3 font-semibold">{p.project_name}</td><td className="p-3">{!sourceHealth.design?'Unavailable':design.some(r=>r.project_id===p.id)?'Recorded':'Not recorded'}</td><td className="p-3">{!sourceHealth.ipd?'Unavailable':units.filter(u=>ipd.some(r=>r.project_id===p.id && (r.discipline||'').toLowerCase()===u.toLowerCase())).join(', ')||'None recorded'}</td><td className="p-3">{p.status||'Not available'}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Approved programme targets and forecast exposure</h2><p className="mt-1 text-sm text-slate-600">Active schedule revisions by package. A passed target or forecast beyond target indicates exposure, not measured progress slippage. Original baselines and weighted actual progress must be validated separately.</p>{!sourceHealth.revisions?<p className="mt-3 text-amber-700">Schedule source unavailable or not loaded.</p>:programmeAttention.length===0?<p className="mt-3 text-slate-500">No accessible active schedule revisions.</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Project / package</th><th className="p-2">Active target</th><th className="p-2">Forecast</th><th className="p-2">Exposure</th></tr></thead><tbody>{programmeAttention.map((r,i)=><tr className="border-b" key={`${r.project}-${r.package}-${i}`}><td className="p-2"><strong>{r.project}</strong><span className="block text-xs text-slate-500">{r.package} · {r.revision}</span></td><td className="p-2">{r.target||'Not recorded'}</td><td className="p-2">{r.forecast||'Not recorded'}</td><td className="p-2">{r.forecastOverrunDays!==null&&r.forecastOverrunDays>0?`Forecast ${r.forecastOverrunDays} days after target`:r.daysToTarget!==null&&r.daysToTarget<0?`Target passed ${Math.abs(r.daysToTarget)} days ago`:r.daysToTarget!==null?`${r.daysToTarget} days until target`:'Insufficient dates'}</td></tr>)}</tbody></table></div>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Payment items requiring review</h2><p className="mt-1 text-sm text-slate-600">Read-only Costing payment register. A pending payment is not automatically a confirmed construction blocker or a bank-disbursement obligation. No amounts are counted when missing.</p>{!sourceHealth.payments?<p className="mt-3 text-amber-700">Payment register unavailable or not loaded.</p>:<><p className="mt-3 text-sm font-semibold">{pendingPayments.length} non-final payment records · ₦{pendingTotal.toLocaleString('en-NG')} in recorded amounts{knownPending.length!==pendingPayments.length?' (some amounts unavailable)':''}</p>{pendingPayments.length===0?<p className="mt-2 text-sm text-slate-500">No pending payment records found. This does not confirm that there are no payment obligations.</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Project</th><th className="p-2">Payment item</th><th className="p-2">Status</th><th className="p-2">Amount</th></tr></thead><tbody>{pendingPayments.slice(0,50).map((p,i)=><tr key={i} className="border-b"><td className="p-2">{projects.find(x=>x.id===p.project_id)?.project_name||'Unknown'}</td><td className="p-2">{p.payment_title||'Untitled'}</td><td className="p-2">{p.payment_status||'Unverified'}</td><td className="p-2">{p.amount==null?'Not recorded':`₦${Number(p.amount).toLocaleString('en-NG')}`}</td></tr>)}</tbody></table>{pendingPayments.length>50&&<p className="text-xs text-slate-500">Showing first 50 items; {pendingPayments.length} total.</p>}</div>}</>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Planned vs actual delivery performance</h2><p className="mt-1 text-sm text-slate-600">Uses the same weighted task-progress and planned-progress calculation functions as Portfolio Dashboard. Ranked by verified progress variance (most behind first); programme forecast overrun is a secondary comparison, not a probability of on-time delivery. Figures are withheld if task progress or dates are incomplete, or an active revised project programme extends beyond the recorded task finish dates.</p><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Project</th><th className="p-2">Planned</th><th className="p-2">Actual</th><th className="p-2">Variance</th><th className="p-2">Max recorded forecast overrun</th><th className="p-2">Evidence</th></tr></thead><tbody>{progressComparison.map(r=><tr key={r.project.id} className="border-b"><td className="p-2 font-semibold">{r.project.project_name}</td><td className="p-2">{r.revisedDatesUnreconciled?'Unreconciled':r.planned === null?'Unavailable':`${r.planned}%`}</td><td className="p-2">{r.actual === null?'Unavailable':`${r.actual}%`}</td><td className="p-2">{r.variance === null?(r.revisedDatesUnreconciled?'Unreconciled':'Unavailable'):`${r.variance>0?'+':''}${r.variance} pp`}</td><td className="p-2">{r.worstForecastOverrun === null?'Unavailable':`${r.worstForecastOverrun} days`}</td><td className="p-2 text-xs text-slate-500">{r.measured}/{r.taskCount} tasks with progress; {r.dated}/{r.taskCount} dated</td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-slate-500">Package-level recovery confidence and forecast finish still require the verified Recovery Forecast adapter. No on-time delivery probability is calculated here.</p></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Construction progress evidence coverage</h2><p className="mt-1 text-sm text-slate-600">Read-only task progress from Project Controls. These are raw activity counts, not weighted project completion or planned-versus-actual variance. The Recovery Forecast remains the authority for delivery projections.</p>{!taskSourceOk?<p className="mt-3 text-amber-700">Task progress source unavailable. No progress conclusion can be drawn.</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Project</th><th className="p-2">Tasks recorded</th><th className="p-2">With measured progress</th><th className="p-2">Fully complete (100%)</th><th className="p-2">Recovery Forecast</th></tr></thead><tbody>{projects.map(project=>{const tasks=taskEvidence.filter(t=>t.project_id===project.id);const measured=tasks.filter(t=>t.progress_pct!==null&&t.progress_pct!==undefined&&Number.isFinite(Number(t.progress_pct)));return <tr key={project.id} className="border-b"><td className="p-2 font-semibold">{project.project_name}</td><td className="p-2">{tasks.length}</td><td className="p-2">{measured.length}</td><td className="p-2">{measured.filter(t=>Number(t.progress_pct)===100).length}</td><td className="p-2"><button className="text-teal-700 underline" onClick={()=>{setProject(project.id,project.project_name,project.organization_id??null,project.portfolio_id??null,project.overall_owner_email??null,project.housebuild_owner_email??null,project.mep_owner_email??null,project.infrastructure_owner_email??null);navigate('/app/recovery-forecast')}}>Open source forecast</button></td></tr>})}</tbody></table></div>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Intelligence still awaiting validated integration</h2><p className="mt-2 text-sm text-slate-600">Certified valuations, cost variations and computed Recovery Forecast confidence are not yet connected. Weighted progress comparisons above use the shared progress functions only where source task data is complete. Risk, procurement and approval exceptions above are sourced separately and are not confirmed causal dependencies. Payment items and programme dates above are separate source facts, not a combined delivery-risk score. No management decisions are inferred without verified blockers.</p></section>
      <p className="text-xs text-slate-500">Last refreshed: {updated||'Not yet loaded'}. Live, read-only view; not a frozen issued report.</p></>:
      <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 text-lg font-bold">Select project {section==='ipd'?`· ${discipline}`:''}</h2><div className="grid gap-3 sm:grid-cols-2">{filtered.map(p=><button key={p.id} onClick={()=>open(p)} className="flex items-center justify-between rounded-xl border p-4 text-left hover:border-teal-500 hover:bg-teal-50"><span><strong className="block">{p.project_name}</strong><span className="text-xs text-slate-500">{p.status||'Status unavailable'}</span></span><FileText size={20}/></button>)}</div>{!filtered.length&&<p>No accessible projects match your search.</p>}</section>}
    </main></div>
}

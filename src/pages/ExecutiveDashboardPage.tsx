import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Building2, CalendarClock,
  CheckCircle2, Clock3, Expand, Gauge, Lightbulb, MapPin, RefreshCw,
  ShieldAlert, Target, Wallet, X
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { loadExecutivePortfolioSnapshot, updateExecutiveDecision } from '@/services/executiveDashboardService'
import type {
  ExecutiveAttentionItem, ExecutivePortfolioSnapshot, ExecutiveProjectRow
} from '@/services/executiveDashboardTypes'

const RAG = { healthy:'#16a34a', attention:'#08B5A6', critical:'#dc2626' }

export default function ExecutiveDashboardPage() {
  const navigate=useNavigate()
  const { activeWorkspace }=useWorkspace()
  const setProject=useProjectStore(state=>state.setProject)
  const [data,setData]=useState<ExecutivePortfolioSnapshot|null>(null)
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [updatedAt,setUpdatedAt]=useState<Date|null>(null)
  const [cockpit,setCockpit]=useState(false)
  const [lens,setLens]=useState<'health'|'schedule'|'risk'|'procurement'|'quality'|'hse'>('health')

  async function load(){
    if(!activeWorkspace)return
    setLoading(true);setMessage('')
    try{const snapshot=await loadExecutivePortfolioSnapshot(activeWorkspace.id);setData(snapshot);setUpdatedAt(new Date())}
    catch(err:any){console.error('[Executive Dashboard] load failed:',err);setMessage(err?.message||err?.details||err?.hint||'Unable to load executive portfolio intelligence.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[activeWorkspace?.id])
  useEffect(()=>{
    if(!cockpit)return
    const timer=window.setInterval(()=>void load(),60000)
    return()=>window.clearInterval(timer)
  },[cockpit,activeWorkspace?.id])

  function openProject(project:ExecutiveProjectRow,path='/app'){
    setProject(project.id,project.name,project.organizationId,project.portfolioId)
    navigate(path)
  }
  function openAttention(item:ExecutiveAttentionItem){
    const project=data?.projects.find(row=>row.id===item.projectId)
    if(project)openProject(project,item.actionUrl)
  }

  if(!activeWorkspace)return <div className="rounded-2xl border bg-white p-8">No active workspace.</div>
  if(cockpit&&data)return <Cockpit data={data} workspaceName={activeWorkspace.name} onClose={()=>setCockpit(false)} onProject={openProject}/>

  const metrics=data?.metrics
  const heatData=(data?.projects||[]).map(project=>({
    name:project.name.length>18?`${project.name.slice(0,18)}…`:project.name,
    fullName:project.name,
    value:lens==='health'?project.healthScore:lens==='schedule'?project.scheduleVarianceDays:lens==='risk'?project.highRisks:lens==='procurement'?project.overdueProcurement:lens==='quality'?project.qualityExceptions:project.openHseIncidents,
    project
  })).sort((a,b)=>b.value-a.value)

  return <div className="min-h-dvh bg-[#f6f5f1]">
    <header className="sticky top-0 z-30 border-b border-[#dfe7e6] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-7 lg:px-10">
        <button type="button" onClick={()=>navigate('/projects')} className="text-left" aria-label="Back to Workspace Hub"><PMOCorexLogo size={40}/></button>
        <button type="button" onClick={()=>navigate('/projects')} className="btn btn-ghost"><ArrowLeft size={15}/>Workspace Hub</button>
      </div>
    </header>
    <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
      <section className="overflow-hidden rounded-[28px] border border-[#dfe3e7] bg-white">
        <div className="grid lg:grid-cols-[1fr_390px]">
          <div className="p-7 sm:p-9"><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#05969B]">Executive command centre</div><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#102943] sm:text-4xl">Portfolio Intelligence</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-[#65717c]">A live executive view across <strong>{activeWorkspace.name}</strong>: portfolio health, management pressure, decisions and the projects most likely to need intervention.</p><div className="mt-6 flex flex-wrap gap-2"><button onClick={()=>void load()} className="btn btn-ghost"><RefreshCw size={15}/>Refresh</button><button onClick={()=>setCockpit(true)} className="btn bg-[#0B2A3C] text-white hover:bg-[#123d55]"><Expand size={15}/>Boardroom mode</button><button onClick={()=>navigate('/portfolio-dashboard')} className="btn btn-ghost">Open portfolio dashboard <ArrowRight size={14}/></button></div></div>
          <div className="bg-[#0B2A3C] p-7 text-white"><Lightbulb size={25} className="text-[#08B5A6]"/><div className="mt-5 text-[11px] uppercase tracking-[.18em] text-white/55">Executive insight</div><p className="mt-3 text-lg font-semibold leading-7">{data?.insights[0]||'Portfolio intelligence is loading.'}</p><div className="mt-5 text-xs text-white/55">{updatedAt ? `Updated ${updatedAt.toLocaleString()}` : 'Waiting for live portfolio data'}</div></div>
        </div>
      </section>

      {message&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 shrink-0"/><span>{message}</span></div></div>}
      {loading?<ExecutiveDashboardSkeleton/>:data&&<>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric icon={Building2} label="Active projects" value={metrics?.activeProjects||0} helper={`${metrics?.healthyProjects||0} healthy`}/>
          <Metric icon={Gauge} label="Portfolio health" value={`${metrics?.portfolioHealthScore||0}%`} helper={(metrics?.criticalProjects||0)>0?'Critical':'Current health'} tone={(metrics?.criticalProjects||0)>0?'red':'green'}/>
          <Metric icon={Activity} label="Overall progress" value={`${metrics?.overallProgress||0}%`} helper={`SPI ${metrics?.portfolioSpi??'—'}`}/>
          <Metric icon={Wallet} label="Budget utilisation" value={metrics?.budgetUtilization==null?'—':`${metrics.budgetUtilization}%`} helper={`CPI ${metrics?.portfolioCpi??'—'}`}/>
          <Metric icon={CalendarClock} label="Forecast completion" value={metrics?.forecastCompletion?new Date(metrics.forecastCompletion).toLocaleDateString('en-GB',{month:'short',year:'numeric'}):'—'} helper="Latest portfolio forecast"/>
        </section>

        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f7d89]">Portfolio RAG</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">Project health centre</h2><p className="mt-1 text-sm text-[#7b8791]">Select a project to open its live command centre.</p></div><div className="flex gap-2 text-xs"><span className="badge badge-green">Healthy {metrics?.healthyProjects}</span><span className="inline-flex items-center rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[11px] font-semibold text-[#05969B]">Attention {metrics?.attentionProjects}</span><span className="badge badge-red">Critical {metrics?.criticalProjects}</span></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.projects.length===0?<div className="sm:col-span-2 lg:col-span-3 xl:col-span-4"><Empty text="No active projects are available in this workspace."/></div>:data.projects.map(project=><button key={project.id} onClick={()=>openProject(project)} className="group rounded-2xl border border-[#dfe3e7] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-[#102943]">{project.name}</h3><div className="mt-1 text-xs text-[#87929b]">{project.status}</div></div><span className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:RAG[project.health]}}/></div><div className="mt-5 flex items-end justify-between"><div><div className="text-3xl font-semibold text-[#102943]">{project.healthScore}</div><div className="text-[10px] uppercase tracking-wider text-[#87929b]">Health score</div></div><div className="text-right"><div className="text-lg font-semibold text-[#26384a]">{project.progress}%</div><div className="text-[10px] text-[#87929b]">Actual progress</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf1f3]"><div className="h-full rounded-full" style={{width:`${project.progress}%`,backgroundColor:RAG[project.health]}}/></div><div className="mt-4 rounded-xl bg-[#f7f9fa] p-3 text-xs leading-5 text-[#65717c]">{project.primaryBlocker}</div></button>)}</div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#102943]">Executive attention queue</h2><p className="mt-1 text-sm text-[#87929b]">Ranked using delay, risk, procurement, approvals, quality and HSE pressure.</p></div><span className="badge badge-red">{data.attention.length} signals</span></div><div className="mt-5 space-y-3">{data.attention.slice(0,10).map(item=><button key={item.id} onClick={()=>openAttention(item)} className="w-full rounded-2xl border border-[#e1e7ea] p-4 text-left transition hover:border-[#9ab4c5] hover:bg-[#fafcfc]"><div className="flex gap-3"><div className={`mt-1 rounded-xl p-2 ${item.severity==='critical'?'bg-red-50 text-red-600':'bg-[#E8F6F4] text-[#05969B]'}`}><AlertTriangle size={16}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#102943]">{item.title}</h3><span className="badge badge-muted">{item.category}</span><span className={item.severity==='critical'?'badge badge-red':'inline-flex items-center rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[11px] font-semibold text-[#05969B]'}>{item.severity}</span></div><div className="mt-1 text-xs font-semibold text-[#52616d]">{item.projectName}</div><p className="mt-2 text-sm leading-6 text-[#6f7d89]">{item.reason}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#909ba3]"><span>Owner: {item.owner}</span>{item.daysOverdue>0&&<span>{item.daysOverdue} days overdue</span>}<span>{item.suggestedAction}</span></div></div><ArrowRight size={15} className="mt-2 text-[#9aa5ad]"/></div></button>)}{data.attention.length===0&&<Empty text="No executive attention items are currently detected."/>}</div></section>

          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-[#102943]">Live executive insights</h2><p className="mt-1 text-sm text-[#87929b]">Deterministic interpretation of current portfolio evidence.</p><div className="mt-5 space-y-3">{data.insights.map((insight,index)=><div key={index} className="flex gap-3 rounded-2xl border border-[#e2e8eb] p-4"><div className="rounded-xl bg-[#E8F6F4] p-2 text-[#05969B]"><Lightbulb size={16}/></div><p className="text-sm leading-6 text-[#52616d]">{insight}</p></div>)}</div></section>
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
          <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#102943]">Project pressure view</h2><p className="mt-1 text-sm text-[#87929b]">Compare project pressure across the workspace using each executive lens.</p></div><div className="flex flex-wrap gap-2">{(['health','schedule','risk','procurement','quality','hse'] as const).map(item=><button key={item} onClick={()=>setLens(item)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${lens===item?'bg-[#0B2A3C] text-white':'bg-[#f1f4f5] text-[#65717c]'}`}>{item}</button>)}</div></div><div className="mt-5 h-[340px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={heatData} layout="vertical" margin={{left:20,right:25}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="name" width={130} tick={{fontSize:11}}/><Tooltip formatter={(value)=>[value,lens]} labelFormatter={(_,payload)=>payload?.[0]?.payload?.fullName||''}/><Bar dataKey="value" radius={[0,7,7,0]} onClick={(entry:any)=>openProject(entry.project)}>{heatData.map((entry,index)=><Cell key={index} fill={lens==='health'?RAG[entry.project.health]:entry.value>3?'#dc2626':entry.value>0?'#08B5A6':'#16a34a'}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
          <PortfolioMap projects={data.projects} onProject={openProject}/>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DecisionQueue data={data} onUpdated={load} onProject={openProject}/>
          <Timeline data={data} onProject={openProject}/>
        </section>

        {data.projects.length>1&&<section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-[#102943]">Project comparisons</h2><p className="mt-1 text-sm text-[#87929b]">Comparative signals based on available live project data.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Ranking title="Best delivery" rows={data.rankings.bestDelivery} value={p=>`${p.progress-p.plannedProgress>=0?'+':''}${p.progress-p.plannedProgress}% variance`} onProject={openProject}/><Ranking title="Lowest risk" rows={data.rankings.lowestRisk} value={p=>`${p.highRisks} high risks`} onProject={openProject}/><Ranking title="Best quality" rows={data.rankings.bestQuality} value={p=>`${p.qualityExceptions} exceptions`} onProject={openProject}/><Ranking title="Most delayed" rows={data.rankings.mostDelayed} value={p=>`${p.scheduleVarianceDays} days`} onProject={openProject}/></div></section>}
      </>}
    </main>
  </div>
}

function ExecutiveDashboardSkeleton(){return <div className="space-y-5" aria-label="Loading executive dashboard"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({length:5}).map((_,i)=><div key={i} className="h-32 animate-pulse rounded-2xl border border-[#dfe3e7] bg-white p-5"><div className="h-4 w-4 rounded bg-[#e7ecef]"/><div className="mt-5 h-8 w-20 rounded bg-[#edf1f3]"/><div className="mt-3 h-3 w-24 rounded bg-[#edf1f3]"/></div>)}</div><div className="h-72 animate-pulse rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="h-5 w-44 rounded bg-[#e7ecef]"/><div className="mt-3 h-3 w-72 max-w-full rounded bg-[#edf1f3]"/><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-36 rounded-2xl bg-[#f4f7f8]"/>)}</div></div></div>}

function Metric({icon:Icon,label,value,helper,tone='navy'}:{icon:any;label:string;value:any;helper:string;tone?:string}){const toneClass=tone==='red'?'text-red-600':tone==='green'?'text-emerald-600':'text-[#102943]';return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><Icon size={18} className="text-[#6b7b88]"/><div className={`mt-4 text-3xl font-semibold ${toneClass}`}>{value}</div><div className="mt-1 text-xs font-semibold text-[#536170]">{label}</div><div className="mt-1 text-[11px] text-[#87929b]">{helper}</div></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl bg-[#f7f9fa] p-8 text-center text-sm text-[#87929b]">{text}</div>}

function PortfolioMap({projects,onProject}:{projects:ExecutiveProjectRow[];onProject:(p:ExecutiveProjectRow)=>void}){
  if(projects.length===0)return <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><MapPin size={18} className="text-[#05969B]"/><h2 className="text-xl font-semibold text-[#102943]">Project location</h2></div><div className="mt-5"><Empty text="No project locations are available yet."/></div></div>
  const located=projects.filter(p=>p.latitude!=null&&p.longitude!=null)
  const source=located.length?located:projects
  const lats=source.map(p=>p.latitude??6.45),lngs=source.map(p=>p.longitude??3.4)
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs)
  return <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><MapPin size={18} className="text-[#05969B]"/><h2 className="text-xl font-semibold text-[#102943]">Project location</h2></div><p className="mt-1 text-sm text-[#87929b]">{located.length?'Project position from saved coordinates.':'Add project coordinates to activate geographic positioning.'}</p><div className="relative mt-5 h-[340px] overflow-hidden rounded-2xl border border-[#dce5e9] bg-[linear-gradient(90deg,rgba(23,63,95,.05)_1px,transparent_1px),linear-gradient(rgba(23,63,95,.05)_1px,transparent_1px)] bg-[size:28px_28px]">{source.map((project,index)=>{const left=located.length?8+84*((project.longitude!-minLng)/(maxLng-minLng||1)):12+(index%4)*24;const top=located.length?8+80*(1-(project.latitude!-minLat)/(maxLat-minLat||1)):15+Math.floor(index/4)*24;return <button key={project.id} onClick={()=>onProject(project)} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{left:`${left}%`,top:`${top}%`}}><span className="block h-4 w-4 rounded-full border-2 border-white shadow-md" style={{backgroundColor:RAG[project.health]}}/><span className="absolute left-1/2 top-5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#102943] px-2 py-1 text-[10px] text-white group-hover:block">{project.name}</span></button>})}<div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[10px] text-[#71808c] shadow-sm">Green healthy · Teal attention · Red critical</div></div></div>
}

function DecisionQueue({data,onUpdated,onProject}:{data:ExecutivePortfolioSnapshot;onUpdated:()=>Promise<void>;onProject:(p:ExecutiveProjectRow)=>void}){const open=data.decisions.filter(d=>!['completed','cancelled'].includes(d.status));return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex items-end justify-between"><div><h2 className="text-xl font-semibold text-[#102943]">Executive decisions required</h2><p className="mt-1 text-sm text-[#87929b]">Management decisions linked to projects and report evidence.</p></div><span className="inline-flex items-center rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[11px] font-semibold text-[#05969B]">{open.length} open</span></div><div className="mt-5 space-y-3">{open.slice(0,8).map(decision=><div key={decision.id} className="rounded-2xl border border-[#e1e7ea] p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#102943]">{decision.decision}</h3><span className="badge badge-muted capitalize">{decision.priority}</span></div>{decision.projectName&&<button onClick={()=>{const p=data.projects.find(x=>x.id===decision.projectId);if(p)onProject(p)}} className="mt-1 text-xs font-semibold text-[#05969B]">{decision.projectName}</button>}<p className="mt-2 text-sm text-[#6f7d89]">{decision.rationale||'Decision recorded for executive follow-up.'}</p><div className="mt-3 flex gap-4 text-[11px] text-[#929da5]"><span>Owner: {decision.ownerName||'Unassigned'}</span><span>Due: {decision.dueDate?new Date(decision.dueDate).toLocaleDateString():'Not set'}</span></div></div><button onClick={async()=>{await updateExecutiveDecision(decision.id,{status:'completed'});await onUpdated()}} className="rounded-xl bg-emerald-50 p-2 text-emerald-600" title="Mark completed"><CheckCircle2 size={16}/></button></div></div>)}{open.length===0&&<Empty text="No open executive decisions."/>}</div></section>}

function Timeline({data,onProject}:{data:ExecutivePortfolioSnapshot;onProject:(p:ExecutiveProjectRow,path?:string)=>void}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-[#102943]">Executive timeline</h2><p className="mt-1 text-sm text-[#87929b]">Upcoming milestones, approvals and procurement events.</p><div className="mt-5 space-y-1">{data.timeline.slice(0,10).map(item=><button key={item.id} onClick={()=>{const p=data.projects.find(x=>x.id===item.projectId);if(p)onProject(p,item.actionUrl||'/app')}} className="flex w-full gap-3 rounded-xl p-3 text-left hover:bg-[#f7f9fa]"><div className="mt-1 rounded-lg bg-[#E8F6F4] p-2 text-[#05969B]"><Clock3 size={14}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-sm font-semibold text-[#26384a]">{item.title}</h3><span className="whitespace-nowrap text-[11px] text-[#87929b]">{new Date(item.date).toLocaleDateString()}</span></div><div className="mt-1 text-xs text-[#87929b]">{item.projectName||'Selected project'} · {item.type} · {item.status}</div></div></button>)}{data.timeline.length===0&&<Empty text="No dated executive events are available."/>}</div></section>}

function Ranking({title,rows,value,onProject}:{title:string;rows:ExecutiveProjectRow[];value:(p:ExecutiveProjectRow)=>string;onProject:(p:ExecutiveProjectRow)=>void}){return <div className="rounded-2xl border border-[#e1e7ea] p-4"><h3 className="font-semibold text-[#102943]">{title}</h3><div className="mt-4 space-y-3">{rows.map((project,index)=><button key={project.id} onClick={()=>onProject(project)} className="flex w-full items-center gap-3 text-left"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eef3f5] text-xs font-semibold text-[#52616d]">{index+1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#26384a]">{project.name}</span><span className="text-[11px] text-[#87929b]">{value(project)}</span></span></button>)}</div></div>}

function Cockpit({data,workspaceName,onClose,onProject}:{data:ExecutivePortfolioSnapshot;workspaceName:string;onClose:()=>void;onProject:(p:ExecutiveProjectRow)=>void}){return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B2A3C] p-6 text-white"><div className="mx-auto max-w-[1800px] space-y-6"><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-[.2em] text-white/50">Executive cockpit · live</div><h1 className="mt-2 text-4xl font-semibold">{workspaceName}</h1><p className="mt-2 text-white/60">Project health, pressure and decisions. Auto-refreshes every 60 seconds.</p></div><button onClick={onClose} className="rounded-xl bg-white/10 p-3 hover:bg-white/15"><X size={20}/></button></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><CockpitMetric label="Health" value={`${data.metrics.portfolioHealthScore}%`}/><CockpitMetric label="Progress" value={`${data.metrics.overallProgress}%`}/><CockpitMetric label="Critical" value={data.metrics.criticalProjects}/><CockpitMetric label="SPI" value={data.metrics.portfolioSpi??'—'}/><CockpitMetric label="Open decisions" value={data.decisions.filter(d=>!['completed','cancelled'].includes(d.status)).length}/></div><div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl bg-white/8 p-6"><h2 className="text-xl font-semibold">Portfolio RAG</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.projects.map(p=><button key={p.id} onClick={()=>onProject(p)} className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-left"><div className="flex justify-between"><span className="font-semibold">{p.name}</span><span className="h-3 w-3 rounded-full" style={{backgroundColor:RAG[p.health]}}/></div><div className="mt-4 text-3xl font-semibold">{p.healthScore}</div><div className="mt-2 text-xs text-white/55">{p.primaryBlocker}</div></button>)}</div></div><div className="space-y-5"><div className="rounded-3xl bg-white/8 p-6"><h2 className="text-xl font-semibold">Top management pressure</h2><div className="mt-4 space-y-3">{data.attention.slice(0,6).map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-white/[.05] p-4"><div className="text-sm font-semibold">{item.projectName} · {item.title}</div><div className="mt-2 text-xs leading-5 text-white/55">{item.reason}</div></div>)}</div></div><div className="rounded-3xl bg-[#08B5A6] p-6 text-[#0B2A3C]"><Lightbulb size={22}/><div className="mt-4 text-lg font-semibold">{data.insights[0]}</div></div></div></div></div></div>}
function CockpitMetric({label,value}:{label:string;value:any}){return <div className="rounded-2xl border border-white/10 bg-white/[.07] p-5"><div className="text-4xl font-semibold">{value}</div><div className="mt-2 text-xs uppercase tracking-wider text-white/50">{label}</div></div>}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Building2, CalendarClock,
  CheckCircle2, Clock3, Expand, Gauge, Lightbulb, MapPin, RefreshCw,
  ShieldAlert, Target, Wallet, X, Send, MessageSquareText, TrendingUp, Plus, Users
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Line, LineChart, Legend
} from 'recharts'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { loadExecutivePortfolioSnapshot, updateExecutiveDecision } from '@/services/executiveDashboardService'
import { createManagementAction, listManagementActions, updateManagementActionStatus } from '@/services/managementActionService'
import type { ManagementAction, ManagementActionType } from '@/services/managementActionService'
import { loadCustomerAdministration } from '@/workspace/customerAdminService'
import type { CustomerAdminMember } from '@/workspace/customerAdminTypes'
import { useAuthStore } from '@/store/auth'
import type {
  ExecutiveAttentionItem, ExecutivePortfolioSnapshot, ExecutiveProjectRow
} from '@/services/executiveDashboardTypes'

const RAG = { healthy:'#16a34a', attention:'#08B5A6', critical:'#dc2626' }

export default function ExecutiveDashboardPage() {
  const navigate=useNavigate()
  const [searchParams,setSearchParams]=useSearchParams()
  const { activeWorkspace }=useWorkspace()
  const setProject=useProjectStore(state=>state.setProject)
  const [data,setData]=useState<ExecutivePortfolioSnapshot|null>(null)
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [updatedAt,setUpdatedAt]=useState<Date|null>(null)
  const cockpit=searchParams.get('mode')==='boardroom'
  const [lens,setLens]=useState<'health'|'schedule'|'risk'|'procurement'|'quality'|'hse'>('health')
  const [trendLens,setTrendLens]=useState<'progress'|'cost'|'schedule'|'risk'|'quality'>('progress')
  const [managementActions,setManagementActions]=useState<ManagementAction[]>([])
  const [actionDrawer,setActionDrawer]=useState(false)
  const user=useAuthStore(state=>state.user)

  async function load(){
    if(!activeWorkspace)return
    setLoading(true);setMessage('')
    try{
      const [snapshot,actions]=await Promise.all([
        loadExecutivePortfolioSnapshot(activeWorkspace.id),
        listManagementActions(activeWorkspace.id),
      ])
      setData(snapshot);setManagementActions(actions);setUpdatedAt(new Date())
    }
    catch(err:any){console.error('[All Project Command Center] load failed:',err);setMessage(err?.message||err?.details||err?.hint||'Unable to load all-project workspace intelligence.')}
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

  const metrics=data?.metrics
  const heatData=(data?.projects||[]).map(project=>({
    name:project.name.length>18?`${project.name.slice(0,18)}…`:project.name,
    fullName:project.name,
    value:lens==='health'?project.healthScore:lens==='schedule'?project.scheduleVarianceDays:lens==='risk'?project.highRisks:lens==='procurement'?project.overdueProcurement:lens==='quality'?project.qualityExceptions:project.openHseIncidents,
    project
  })).sort((a,b)=>b.value-a.value)


  const trendData=useMemo(()=>{
    const grouped=new Map<string,any[]>()
    for(const point of data?.trends||[]){
      const rows=grouped.get(point.date)||[];rows.push(point);grouped.set(point.date,rows)
    }
    return Array.from(grouped.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([date,rows])=>{
      const avg=(values:Array<number|null>)=>{const clean=values.filter((v):v is number=>v!=null&&Number.isFinite(v));return clean.length?Number((clean.reduce((a,b)=>a+b,0)/clean.length).toFixed(1)):null}
      return {
        date:new Date(`${date}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),
        progress:avg(rows.map(r=>r.progress)),planned:avg(rows.map(r=>r.plannedProgress)),
        budget:avg(rows.map(r=>r.budgetUtilization)),delay:avg(rows.map(r=>r.scheduleVarianceDays)),
        risks:rows.reduce((sum,r)=>sum+Number(r.highRisks||0),0),quality:avg(rows.map(r=>r.qualityScore)),
      }
    })
  },[data?.trends])

  // Keep all React hooks above conditional renders. Boardroom mode is a view
  // of this same page, so changing ?mode=boardroom must never change hook order.
  if(!activeWorkspace)return <div className="rounded-2xl border bg-white p-8">No active workspace.</div>
  if(cockpit&&data)return <Cockpit data={data} workspaceName={activeWorkspace.name} onClose={()=>setSearchParams({}, { replace:true })} onProject={openProject}/>

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
          <div className="p-7 sm:p-9"><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#05969B]">Workspace command centre</div><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#102943] sm:text-4xl">All Project Command Center</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-[#65717c]">One workspace-wide control room across <strong>{activeWorkspace.name}</strong>: delivery position, portfolio health, schedule pressure, cost, risk and management intervention.</p><div className="mt-6 flex flex-wrap gap-2"><button onClick={()=>void load()} className="btn btn-ghost"><RefreshCw size={15}/>Refresh</button><button type="button" onClick={()=>setSearchParams({mode:'boardroom'}, { replace:true })} className="btn bg-[#0B2A3C] text-white hover:bg-[#123d55]"><Expand size={15}/>Boardroom mode</button></div></div>
          <div className="bg-[#0B2A3C] p-7 text-white"><Lightbulb size={25} className="text-[#08B5A6]"/><div className="mt-5 text-[11px] uppercase tracking-[.18em] text-white/55">Management insight</div><p className="mt-3 text-lg font-semibold leading-7">{data?.insights[0]||'Portfolio intelligence is loading.'}</p><div className="mt-5 text-xs text-white/55">{updatedAt ? `Updated ${updatedAt.toLocaleString()}` : 'Waiting for live portfolio data'}</div></div>
        </div>
      </section>

      {message&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 shrink-0"/><span>{message}</span></div></div>}
      {loading?<ExecutiveDashboardSkeleton/>:data&&<>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric icon={Building2} label="Active projects" value={metrics?.activeProjects||0} helper={`${metrics?.healthyProjects||0} healthy`}/>
          <Metric icon={Gauge} label="Portfolio health" value={`${metrics?.portfolioHealthScore||0}%`} helper={(metrics?.criticalProjects||0)>0?'Critical':'Current health'} tone={(metrics?.criticalProjects||0)>0?'red':'green'}/>
          <Metric icon={Activity} label="Overall progress" value={`${metrics?.overallProgress||0}%`} helper={`SPI ${metrics?.portfolioSpi??'—'}`}/>
          <Metric icon={Wallet} label="Budget utilisation" value={metrics?.budgetUtilization==null?'—':`${metrics.budgetUtilization}%`} helper={`CPI ${metrics?.portfolioCpi??'—'}`}/>
          <Metric icon={CalendarClock} label="Projects delayed" value={metrics?`${metrics.delayedProjects} delayed`:'—'} helper={metrics?.forecastCompletion?`Latest recorded completion/target ${new Date(metrics.forecastCompletion).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}`:'Forecast dates not recorded yet'} tone={metrics?.delayedProjects?'red':'green'}/>
        </section>

        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#05969B]">Delivery position</div>
              <h2 className="mt-2 text-xl font-semibold text-[#102943]">Actual vs plan across all projects</h2>
              <p className="mt-1 text-sm text-[#7b8791]">Portfolio command-centre signals are consolidated here so there is one workspace control room.</p>
            </div>
            <div className="text-xs text-[#7b8791]">Click a project to open its command centre.</div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b border-[#e7ecef] text-left text-[11px] uppercase tracking-[.12em] text-[#7b8791]"><th className="pb-3 pr-4">Project</th><th className="pb-3 pr-4">Actual</th><th className="pb-3 pr-4">Planned</th><th className="pb-3 pr-4">Variance</th><th className="pb-3 pr-4">Budget used</th><th className="pb-3 pr-4">High risks</th><th className="pb-3">Schedule delay</th></tr></thead>
              <tbody>{data.projects.map(project=>{const variance=project.progress-project.plannedProgress;return <tr key={project.id} onClick={()=>openProject(project)} className="cursor-pointer border-b border-[#edf1f3] transition hover:bg-[#f8fbfb]"><td className="py-3 pr-4 font-semibold text-[#102943]">{project.name}</td><td className="py-3 pr-4">{project.progress}%</td><td className="py-3 pr-4 text-[#65717c]">{project.plannedProgress}%</td><td className={`py-3 pr-4 font-semibold ${variance<0?'text-red-600':variance>0?'text-emerald-600':'text-[#65717c]'}`}>{variance>0?'+':''}{variance}%</td><td className="py-3 pr-4">{project.budgetUtilization==null?'—':`${project.budgetUtilization}%`}</td><td className={`py-3 pr-4 ${project.highRisks>0?'font-semibold text-red-600':'text-[#65717c]'}`}>{project.highRisks}</td><td className={`py-3 ${project.scheduleVarianceDays>0?'font-semibold text-red-600':'text-emerald-600'}`}>{project.scheduleVarianceDays>0?`${project.scheduleVarianceDays} days`:'On plan'}</td></tr>})}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#05969B]">Cost & value position</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">How the money is performing against delivery</h2><p className="mt-1 text-sm text-[#7b8791]">Compare physical progress with spend, commitments and forecast final cost. A positive cost-progress gap means spend is running ahead of physical delivery.</p></div>
            <div className="text-right text-xs text-[#7b8791]"><div>Portfolio budget <strong className="text-[#102943]">{formatMoney(metrics?.totalBudget||0)}</strong></div><div className="mt-1">Forecast final cost <strong className={metrics?.forecastCostVariance!=null&&metrics.forecastCostVariance>0?'text-red-600':'text-[#102943]'}>{metrics?.totalForecastCost==null?'—':formatMoney(metrics.totalForecastCost)}</strong></div></div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm"><thead><tr className="border-b border-[#e7ecef] text-left text-[11px] uppercase tracking-[.12em] text-[#7b8791]"><th className="pb-3 pr-4">Project</th><th className="pb-3 pr-4">Physical progress</th><th className="pb-3 pr-4">Budget spent</th><th className="pb-3 pr-4">Cost vs progress</th><th className="pb-3 pr-4">Actual cost</th><th className="pb-3 pr-4">Committed</th><th className="pb-3 pr-4">Forecast at completion</th><th className="pb-3">Forecast variance</th></tr></thead>
            <tbody>{data.projects.map(project=>{const variance=project.forecastCost!=null&&project.budget>0?project.forecastCost-project.budget:null;return <tr key={project.id} onClick={()=>openProject(project)} className="cursor-pointer border-b border-[#edf1f3] hover:bg-[#f8fbfb]"><td className="py-3 pr-4 font-semibold text-[#102943]">{project.name}</td><td className="py-3 pr-4">{project.progress}%</td><td className="py-3 pr-4">{project.budgetUtilization==null?'—':`${project.budgetUtilization}%`}</td><td className={`py-3 pr-4 font-semibold ${project.costProgressGap!=null&&project.costProgressGap>10?'text-red-600':project.costProgressGap!=null&&project.costProgressGap<-10?'text-[#05969B]':'text-[#65717c]'}`}>{project.costProgressGap==null?'—':`${project.costProgressGap>0?'+':''}${project.costProgressGap}%`}</td><td className="py-3 pr-4">{project.actualCost?formatMoney(project.actualCost):'—'}</td><td className="py-3 pr-4">{project.committedCost?formatMoney(project.committedCost):'—'}</td><td className="py-3 pr-4">{project.forecastCost==null?'—':<>{formatMoney(project.forecastCost)}<div className="text-[10px] text-[#87929b]">{project.forecastCostSource==='run-rate'?'run-rate estimate':'recorded forecast'}</div></>}</td><td className={`py-3 ${variance!=null&&variance>0?'font-semibold text-red-600':'text-[#65717c]'}`}>{variance==null?'—':`${variance>0?'+':''}${formatMoney(variance)}`}</td></tr>})}</tbody></table>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#05969B]">Portfolio trend centre</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">Is delivery improving or deteriorating?</h2><p className="mt-1 text-sm text-[#7b8791]">Daily executive snapshots build genuine trends from this deployment onward.</p></div>
            <div className="flex flex-wrap gap-2">{(['progress','cost','schedule','risk','quality'] as const).map(item=><button key={item} onClick={()=>setTrendLens(item)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${trendLens===item?'bg-[#0B2A3C] text-white':'bg-[#f0f3f5] text-[#5d6b77]'}`}>{item}</button>)}</div>
          </div>
          <div className="mt-5 h-[300px]">{trendData.length<2?<Empty text="Trend history starts accumulating after this upgrade. At least two daily snapshots are needed before a meaningful trend line is shown."/>:<ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{top:10,right:20,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Legend/>{trendLens==='progress'&&<><Line type="monotone" dataKey="progress" name="Actual progress %" stroke="#08B5A6" strokeWidth={3}/><Line type="monotone" dataKey="planned" name="Planned progress %" stroke="#0B2A3C" strokeWidth={2}/></>}{trendLens==='cost'&&<><Line type="monotone" dataKey="budget" name="Budget used %" stroke="#08B5A6" strokeWidth={3}/><Line type="monotone" dataKey="progress" name="Physical progress %" stroke="#0B2A3C" strokeWidth={2}/></>}{trendLens==='schedule'&&<Line type="monotone" dataKey="delay" name="Average delay days" stroke="#dc2626" strokeWidth={3}/>} {trendLens==='risk'&&<Line type="monotone" dataKey="risks" name="High risks" stroke="#dc2626" strokeWidth={3}/>} {trendLens==='quality'&&<Line type="monotone" dataKey="quality" name="Quality confidence %" stroke="#08B5A6" strokeWidth={3}/>}</LineChart></ResponsiveContainer>}</div>
        </section>

        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f7d89]">Portfolio RAG</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">Project health centre</h2><p className="mt-1 text-sm text-[#7b8791]">Select a project to open its live command centre.</p></div><div className="flex gap-2 text-xs"><span className="badge badge-green">Healthy {metrics?.healthyProjects}</span><span className="inline-flex items-center rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[11px] font-semibold text-[#05969B]">Attention {metrics?.attentionProjects}</span><span className="badge badge-red">Critical {metrics?.criticalProjects}</span></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.projects.length===0?<div className="sm:col-span-2 lg:col-span-3 xl:col-span-4"><Empty text="No active projects are available in this workspace."/></div>:data.projects.map(project=><button key={project.id} onClick={()=>openProject(project)} className="group rounded-2xl border border-[#dfe3e7] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-[#102943]">{project.name}</h3><div className="mt-1 text-xs text-[#87929b]">{project.status}</div></div><span className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:RAG[project.health]}}/></div><div className="mt-5 flex items-end justify-between"><div><div className="text-3xl font-semibold text-[#102943]">{project.healthScore}</div><div className="text-[10px] uppercase tracking-wider text-[#87929b]">Health score</div></div><div className="text-right"><div className="text-lg font-semibold text-[#26384a]">{project.progress}%</div><div className="text-[10px] text-[#87929b]">Actual progress</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf1f3]"><div className="h-full rounded-full" style={{width:`${project.progress}%`,backgroundColor:RAG[project.health]}}/></div><div className="mt-4 rounded-xl bg-[#f7f9fa] p-3 text-xs leading-5 text-[#65717c]">{project.primaryBlocker}</div></button>)}</div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#102943]">Management attention queue</h2><p className="mt-1 text-sm text-[#87929b]">Ranked using delay, risk, procurement, approvals, quality and HSE pressure.</p></div><span className="badge badge-red">{data.attention.length} signals</span></div><div className="mt-5 space-y-3">{data.attention.slice(0,10).map(item=><button key={item.id} onClick={()=>openAttention(item)} className="w-full rounded-2xl border border-[#e1e7ea] p-4 text-left transition hover:border-[#9ab4c5] hover:bg-[#fafcfc]"><div className="flex gap-3"><div className={`mt-1 rounded-xl p-2 ${item.severity==='critical'?'bg-red-50 text-red-600':'bg-[#E8F6F4] text-[#05969B]'}`}><AlertTriangle size={16}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#102943]">{item.title}</h3><span className="badge badge-muted">{item.category}</span><span className={item.severity==='critical'?'badge badge-red':'inline-flex items-center rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[11px] font-semibold text-[#05969B]'}>{item.severity}</span></div><div className="mt-1 text-xs font-semibold text-[#52616d]">{item.projectName}</div><p className="mt-2 text-sm leading-6 text-[#6f7d89]">{item.reason}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#909ba3]"><span>Owner: {item.owner}</span>{item.daysOverdue>0&&<span>{item.daysOverdue} days overdue</span>}<span>{item.suggestedAction}</span></div></div><ArrowRight size={15} className="mt-2 text-[#9aa5ad]"/></div></button>)}{data.attention.length===0&&<Empty text="No executive attention items are currently detected."/>}</div></section>

          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-[#102943]">Live executive insights</h2><p className="mt-1 text-sm text-[#87929b]">Deterministic interpretation of current portfolio evidence.</p><div className="mt-5 space-y-3">{data.insights.map((insight,index)=><div key={index} className="flex gap-3 rounded-2xl border border-[#e2e8eb] p-4"><div className="rounded-xl bg-[#E8F6F4] p-2 text-[#05969B]"><Lightbulb size={16}/></div><p className="text-sm leading-6 text-[#52616d]">{insight}</p></div>)}</div></section>
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
          <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#102943]">Project pressure view</h2><p className="mt-1 text-sm text-[#87929b]">Compare project pressure across the workspace using each executive lens.</p></div><div className="flex flex-wrap gap-2">{(['health','schedule','risk','procurement','quality','hse'] as const).map(item=><button key={item} onClick={()=>setLens(item)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${lens===item?'bg-[#0B2A3C] text-white':'bg-[#f1f4f5] text-[#65717c]'}`}>{item}</button>)}</div></div><div className="mt-5 h-[340px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={heatData} layout="vertical" margin={{left:20,right:25}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="name" width={130} tick={{fontSize:11}}/><Tooltip formatter={(value)=>[value,lens]} labelFormatter={(_,payload)=>payload?.[0]?.payload?.fullName||''}/><Bar dataKey="value" radius={[0,7,7,0]} onClick={(entry:any)=>openProject(entry.project)}>{heatData.map((entry,index)=><Cell key={index} fill={lens==='health'?RAG[entry.project.health]:entry.value>3?'#dc2626':entry.value>0?'#08B5A6':'#16a34a'}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
          <PortfolioMap projects={data.projects} onProject={openProject}/>
        </section>

        <ManagementActionCentre actions={managementActions} onCreate={()=>setActionDrawer(true)} onStatus={async(id,status)=>{await updateManagementActionStatus(id,status);await load()}}/>
        <section className="grid gap-5 xl:grid-cols-2">
          <DecisionQueue data={data} onUpdated={load} onProject={openProject}/>
          <Timeline data={data} onProject={openProject}/>
        </section>

        {data.projects.length>1&&<section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-[#102943]">Project comparisons</h2><p className="mt-1 text-sm text-[#87929b]">Comparative signals based on available live project data.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Ranking title="Best delivery" rows={data.rankings.bestDelivery} value={p=>`${p.progress-p.plannedProgress>=0?'+':''}${p.progress-p.plannedProgress}% variance`} onProject={openProject}/><Ranking title="Lowest risk" rows={data.rankings.lowestRisk} value={p=>`${p.highRisks} high risks`} onProject={openProject}/><Ranking title="Best quality confidence" rows={data.rankings.bestQuality} value={p=>p.qualityScore==null?'Insufficient quality evidence':`${p.qualityScore}% · ${p.qualityEvidenceCount} evidence items`} onProject={openProject}/><Ranking title="Most delayed" rows={data.rankings.mostDelayed} value={p=>`${p.scheduleVarianceDays} days`} onProject={openProject}/></div></section>}
      </>}
    </main>
    {actionDrawer&&<ManagementActionDrawer workspaceId={activeWorkspace.id} projects={data?.projects||[]} createdByName={user?.full_name||user?.email||'Management'} onClose={()=>setActionDrawer(false)} onSaved={async()=>{setActionDrawer(false);await load()}}/>}
  </div>
}

function ExecutiveDashboardSkeleton(){return <div className="space-y-5" aria-label="Loading executive dashboard"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({length:5}).map((_,i)=><div key={i} className="h-32 animate-pulse rounded-2xl border border-[#dfe3e7] bg-white p-5"><div className="h-4 w-4 rounded bg-[#e7ecef]"/><div className="mt-5 h-8 w-20 rounded bg-[#edf1f3]"/><div className="mt-3 h-3 w-24 rounded bg-[#edf1f3]"/></div>)}</div><div className="h-72 animate-pulse rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="h-5 w-44 rounded bg-[#e7ecef]"/><div className="mt-3 h-3 w-72 max-w-full rounded bg-[#edf1f3]"/><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-36 rounded-2xl bg-[#f4f7f8]"/>)}</div></div></div>}

function Metric({icon:Icon,label,value,helper,tone='navy'}:{icon:any;label:string;value:any;helper:string;tone?:string}){const toneClass=tone==='red'?'text-red-600':tone==='green'?'text-emerald-600':'text-[#102943]';return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><Icon size={18} className="text-[#6b7b88]"/><div className={`mt-4 text-3xl font-semibold ${toneClass}`}>{value}</div><div className="mt-1 text-xs font-semibold text-[#536170]">{label}</div><div className="mt-1 text-[11px] text-[#87929b]">{helper}</div></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl bg-[#f7f9fa] p-8 text-center text-sm text-[#87929b]">{text}</div>}

function PortfolioMap({projects,onProject}:{projects:ExecutiveProjectRow[];onProject:(p:ExecutiveProjectRow)=>void}){
  if(projects.length===0)return null
  const located=projects.filter(p=>p.latitude!=null&&p.longitude!=null)
  if(!located.length)return null
  const source=located
  const lats=source.map(p=>p.latitude??6.45),lngs=source.map(p=>p.longitude??3.4)
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs)
  return <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><MapPin size={18} className="text-[#05969B]"/><h2 className="text-xl font-semibold text-[#102943]">Project location</h2></div><p className="mt-1 text-sm text-[#87929b]">{located.length?'Project position from saved coordinates.':'Add project coordinates to activate geographic positioning.'}</p><div className="relative mt-5 h-[340px] overflow-hidden rounded-2xl border border-[#dce5e9] bg-[linear-gradient(90deg,rgba(23,63,95,.05)_1px,transparent_1px),linear-gradient(rgba(23,63,95,.05)_1px,transparent_1px)] bg-[size:28px_28px]">{source.map((project,index)=>{const left=located.length?8+84*((project.longitude!-minLng)/(maxLng-minLng||1)):12+(index%4)*24;const top=located.length?8+80*(1-(project.latitude!-minLat)/(maxLat-minLat||1)):15+Math.floor(index/4)*24;return <button key={project.id} onClick={()=>onProject(project)} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{left:`${left}%`,top:`${top}%`}}><span className="block h-4 w-4 rounded-full border-2 border-white shadow-md" style={{backgroundColor:RAG[project.health]}}/><span className="absolute left-1/2 top-5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#102943] px-2 py-1 text-[10px] text-white group-hover:block">{project.name}</span></button>})}<div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[10px] text-[#71808c] shadow-sm">Green healthy · Teal attention · Red critical</div></div></div>
}

function DecisionQueue({data,onUpdated,onProject}:{data:ExecutivePortfolioSnapshot;onUpdated:()=>Promise<void>;onProject:(p:ExecutiveProjectRow)=>void}){const open=data.decisions.filter(d=>!['completed','cancelled'].includes(d.status));return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><div className="flex items-end justify-between"><div><h2 className="text-xl font-semibold text-[#102943]">Management decisions required</h2><p className="mt-1 text-sm text-[#87929b]">Management decisions linked to projects and report evidence.</p></div><span className="inline-flex items-center rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[11px] font-semibold text-[#05969B]">{open.length} open</span></div><div className="mt-5 space-y-3">{open.slice(0,8).map(decision=><div key={decision.id} className="rounded-2xl border border-[#e1e7ea] p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#102943]">{decision.decision}</h3><span className="badge badge-muted capitalize">{decision.priority}</span></div>{decision.projectName&&<button onClick={()=>{const p=data.projects.find(x=>x.id===decision.projectId);if(p)onProject(p)}} className="mt-1 text-xs font-semibold text-[#05969B]">{decision.projectName}</button>}<p className="mt-2 text-sm text-[#6f7d89]">{decision.rationale||'Decision recorded for executive follow-up.'}</p><div className="mt-3 flex gap-4 text-[11px] text-[#929da5]"><span>Owner: {decision.ownerName||'Unassigned'}</span><span>Due: {decision.dueDate?new Date(decision.dueDate).toLocaleDateString():'Not set'}</span></div></div><button onClick={async()=>{await updateExecutiveDecision(decision.id,{status:'completed'});await onUpdated()}} className="rounded-xl bg-emerald-50 p-2 text-emerald-600" title="Mark completed"><CheckCircle2 size={16}/></button></div></div>)}{open.length===0&&<Empty text="No open executive decisions."/>}</div></section>}

function Timeline({data,onProject}:{data:ExecutivePortfolioSnapshot;onProject:(p:ExecutiveProjectRow,path?:string)=>void}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-[#102943]">Cross-project timeline</h2><p className="mt-1 text-sm text-[#87929b]">Upcoming milestones, approvals and procurement events.</p><div className="mt-5 space-y-1">{data.timeline.slice(0,10).map(item=><button key={item.id} onClick={()=>{const p=data.projects.find(x=>x.id===item.projectId);if(p)onProject(p,item.actionUrl||'/app')}} className="flex w-full gap-3 rounded-xl p-3 text-left hover:bg-[#f7f9fa]"><div className="mt-1 rounded-lg bg-[#E8F6F4] p-2 text-[#05969B]"><Clock3 size={14}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-sm font-semibold text-[#26384a]">{item.title}</h3><span className="whitespace-nowrap text-[11px] text-[#87929b]">{new Date(item.date).toLocaleDateString()}</span></div><div className="mt-1 text-xs text-[#87929b]">{item.projectName||'Selected project'} · {item.type} · {item.status}</div></div></button>)}{data.timeline.length===0&&<Empty text="No dated executive events are available."/>}</div></section>}

function Ranking({title,rows,value,onProject}:{title:string;rows:ExecutiveProjectRow[];value:(p:ExecutiveProjectRow)=>string;onProject:(p:ExecutiveProjectRow)=>void}){return <div className="rounded-2xl border border-[#e1e7ea] p-4"><h3 className="font-semibold text-[#102943]">{title}</h3><div className="mt-4 space-y-3">{rows.map((project,index)=><button key={project.id} onClick={()=>onProject(project)} className="flex w-full items-center gap-3 text-left"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eef3f5] text-xs font-semibold text-[#52616d]">{index+1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#26384a]">{project.name}</span><span className="text-[11px] text-[#87929b]">{value(project)}</span></span></button>)}</div></div>}


function formatMoney(value:number){
  const abs=Math.abs(value)
  const sign=value<0?'-':''
  if(abs>=1_000_000_000)return `${sign}₦${(abs/1_000_000_000).toFixed(1)}bn`
  if(abs>=1_000_000)return `${sign}₦${(abs/1_000_000).toFixed(1)}m`
  if(abs>=1_000)return `${sign}₦${(abs/1_000).toFixed(1)}k`
  return `${sign}₦${Math.round(abs).toLocaleString()}`
}

function ManagementActionCentre({actions,onCreate,onStatus}:{actions:ManagementAction[];onCreate:()=>void;onStatus:(id:string,status:string)=>Promise<void>}){
  const open=actions.filter(item=>!['completed','cancelled'].includes(item.status))
  const overdue=open.filter(item=>item.dueAt&&new Date(item.dueAt).getTime()<Date.now())
  return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#05969B]">Management action centre</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">Questions, instructions and accountable follow-up</h2><p className="mt-1 text-sm text-[#7b8791]">Direct an instruction, question, decision or update request to a person or team. Recipients receive it through PMOCorex notifications.</p></div><button onClick={onCreate} className="btn bg-[#0B2A3C] text-white"><Plus size={15}/>New management action</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-4"><MiniActionMetric label="Open" value={open.length}/><MiniActionMetric label="Overdue" value={overdue.length} danger={overdue.length>0}/><MiniActionMetric label="Completed" value={actions.filter(a=>a.status==='completed').length}/><MiniActionMetric label="Issued" value={actions.length}/></div>
    <div className="mt-5 space-y-3">{open.slice(0,8).map(item=><article key={item.id} className="rounded-2xl border border-[#e1e7ea] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#E8F6F4] px-2.5 py-1 text-[10px] font-bold uppercase text-[#05969B]">{item.actionType.replace('_',' ')}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.priority==='critical'?'bg-red-50 text-red-600':'bg-[#f0f3f5] text-[#667580]'}`}>{item.priority}</span>{item.projectName&&<span className="text-xs font-semibold text-[#536170]">{item.projectName}</span>}</div><h3 className="mt-2 font-semibold text-[#102943]">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[#6f7d89]">{item.message}</p><div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#87929b]"><span>To: {item.recipientLabels.join(', ')||'—'}</span><span>Issued by: {item.createdByName||'Management'}</span><span>Due: {item.dueAt?new Date(item.dueAt).toLocaleString():'No due date'}</span></div></div><button onClick={()=>onStatus(item.id,'completed')} className="rounded-xl bg-emerald-50 p-2 text-emerald-600" title="Mark completed"><CheckCircle2 size={16}/></button></div></article>)}{open.length===0&&<Empty text="No open management actions. Use this area when leadership needs to ask, instruct, decide or request an update."/ >}</div>
  </section>
}
function MiniActionMetric({label,value,danger=false}:{label:string;value:number;danger?:boolean}){return <div className={`rounded-2xl border p-4 ${danger?'border-red-200 bg-red-50':'border-[#e1e7ea] bg-[#f9fbfb]'}`}><div className={`text-2xl font-semibold ${danger?'text-red-600':'text-[#102943]'}`}>{value}</div><div className="mt-1 text-xs text-[#71808c]">{label}</div></div>}

type ActionAudience={id:string;label:string;helper:string;userIds:string[]}
function buildActionAudiences(members:CustomerAdminMember[]):ActionAudience[]{
  const active=members.filter(member=>member.status==='active')
  const normalize=(v?:string|null)=>(v||'').toLowerCase().replace(/[\s_-]+/g,' ').trim()
  const values=(m:any)=>[m.departmentName,m.role,m.jobTitle].map(normalize).filter(Boolean)
  const system=[
    ['Design Team',['design']],['Landscaping Team',['landscaping','landscape']],['Costing Team',['costing','cost','quantity surveying','qs']],
    ['Housebuild Team',['housebuild','house build']],['Infrastructure Team',['infrastructure','infra']],['MEP Team',['mep','mechanical','electrical']],
    ['HSE Team',['hse','health safety environment','health and safety']]
  ] as Array<[string,string[]]>
  const teams=system.map(([label,aliases])=>({id:`team:${label}`,label,helper:'Team audience',userIds:Array.from(new Set(active.filter(m=>aliases.some(a=>values(m).some(v=>v===a||v.includes(a)))).map(m=>m.userId)))}))
  const ipdIds=Array.from(new Set(teams.filter(t=>['Housebuild Team','Infrastructure Team','MEP Team','HSE Team'].includes(t.label)).flatMap(t=>t.userIds)))
  const people=active.map(m=>({id:`person:${m.userId}`,label:m.fullName||m.email,helper:[m.jobTitle,m.departmentName,m.email].filter(Boolean).join(' · '),userIds:[m.userId]}))
  return [{id:'team:IPD',label:'IPD',helper:'Housebuild + Infrastructure + MEP + HSE',userIds:ipdIds},...teams,...people].filter(item=>item.userIds.length>0)
}

function ManagementActionDrawer({workspaceId,projects,createdByName,onClose,onSaved}:{workspaceId:string;projects:ExecutiveProjectRow[];createdByName:string;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [members,setMembers]=useState<CustomerAdminMember[]>([])
  const [selected,setSelected]=useState<ActionAudience[]>([])
  const [query,setQuery]=useState('')
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [form,setForm]=useState({projectId:'',actionType:'instruction' as ManagementActionType,title:'',message:'',priority:'normal',dueAt:''})
  useEffect(()=>{let live=true;(async()=>{try{const data=await loadCustomerAdministration(workspaceId,'Workspace');if(live)setMembers(data.members)}catch(err:any){if(live)setError(err?.message||'Unable to load recipients.')}})();return()=>{live=false}},[workspaceId])
  const audiences=useMemo(()=>buildActionAudiences(members),[members])
  const suggestions=useMemo(()=>{const q=query.toLowerCase().trim();return audiences.filter(a=>!selected.some(s=>s.id===a.id)&&(!q||`${a.label} ${a.helper}`.toLowerCase().includes(q))).slice(0,10)},[audiences,selected,query])
  const recipientIds=useMemo(()=>Array.from(new Set(selected.flatMap(s=>s.userIds))),[selected])
  async function submit(e:React.FormEvent){e.preventDefault();if(!selected.length){setError('Choose at least one person or team.');return}setSaving(true);setError('');try{const project=projects.find(p=>String(p.id)===form.projectId);await createManagementAction({workspaceId,projectId:project?.id||null,projectName:project?.name||null,actionType:form.actionType,title:form.title,message:form.message,priority:form.priority,dueAt:form.dueAt?new Date(form.dueAt).toISOString():null,recipientLabels:selected.map(s=>s.label),recipientUserIds:recipientIds,createdByName});await onSaved()}catch(err:any){setError(err?.message||'Unable to issue management action.')}finally{setSaving(false)}}
  return <div className="fixed inset-0 z-50 bg-[#102943]/35" onClick={onClose}><aside className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-wider text-[#08B5A6]">Management intervention</div><h2 className="mt-2 text-2xl font-semibold text-[#0B2A3C]">New management action</h2></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-[#f1f5f6]"><X size={18}/></button></div>{error&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<form onSubmit={submit} className="mt-6 space-y-4"><FieldBlock label="Project"><select className="form-control" value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})}><option value="">Workspace-wide / multiple projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FieldBlock><div className="grid grid-cols-2 gap-3"><FieldBlock label="Type"><select className="form-control" value={form.actionType} onChange={e=>setForm({...form,actionType:e.target.value as ManagementActionType})}><option value="instruction">Instruction</option><option value="question">Question</option><option value="request_update">Request update</option><option value="decision">Decision</option></select></FieldBlock><FieldBlock label="Priority"><select className="form-control" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>normal</option><option>high</option><option>critical</option></select></FieldBlock></div><FieldBlock label="Title"><input required className="form-control" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></FieldBlock><FieldBlock label="Instruction / question / comment"><textarea required rows={5} className="form-control" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></FieldBlock><FieldBlock label="To people or teams"><div className="rounded-xl border border-[#dbe5e8] p-2"><div className="flex flex-wrap gap-2">{selected.map(item=><button type="button" key={item.id} onClick={()=>setSelected(s=>s.filter(x=>x.id!==item.id))} className="rounded-full bg-[#E8F6F4] px-3 py-1 text-xs font-semibold text-[#05969B]">{item.label} ×</button>)}</div><input className="mt-2 w-full border-0 px-2 py-2 text-sm outline-none" placeholder="Type a name, Design, IPD, MEP, Costing…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-[#e1e7ea] bg-white">{suggestions.map(item=><button type="button" key={item.id} onClick={()=>{setSelected(s=>[...s,item]);setQuery('')}} className="block w-full border-b border-[#edf1f3] px-3 py-2 text-left hover:bg-[#f7fbfb]"><div className="text-sm font-semibold text-[#102943]">{item.label}</div><div className="text-[11px] text-[#87929b]">{item.helper} · {item.userIds.length} recipient{item.userIds.length===1?'':'s'}</div></button>)}</div>}</div><div className="mt-1 text-[11px] text-[#87929b]">{recipientIds.length} unique recipient{recipientIds.length===1?'':'s'}</div></FieldBlock><FieldBlock label="Response / completion due"><input type="datetime-local" className="form-control" value={form.dueAt} onChange={e=>setForm({...form,dueAt:e.target.value})}/></FieldBlock><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={saving} className="btn bg-[#0B2A3C] text-white"><Send size={15}/>{saving?'Issuing…':'Issue action'}</button></div></form></aside></div>
}
function FieldBlock({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#536170]">{label}</span>{children}</label>}

function Cockpit({data,workspaceName,onClose,onProject}:{data:ExecutivePortfolioSnapshot;workspaceName:string;onClose:()=>void;onProject:(p:ExecutiveProjectRow)=>void}){return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B2A3C] p-6 text-white"><div className="mx-auto max-w-[1800px] space-y-6"><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-[.2em] text-white/50">All project cockpit · live</div><h1 className="mt-2 text-4xl font-semibold">{workspaceName}</h1><p className="mt-2 text-white/60">Project health, pressure and decisions. Auto-refreshes every 60 seconds.</p></div><button onClick={onClose} className="rounded-xl bg-white/10 p-3 hover:bg-white/15"><X size={20}/></button></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><CockpitMetric label="Health" value={`${data.metrics.portfolioHealthScore}%`}/><CockpitMetric label="Progress" value={`${data.metrics.overallProgress}%`}/><CockpitMetric label="Critical" value={data.metrics.criticalProjects}/><CockpitMetric label="SPI" value={data.metrics.portfolioSpi??'—'}/><CockpitMetric label="Open decisions" value={data.decisions.filter(d=>!['completed','cancelled'].includes(d.status)).length}/></div><div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl bg-white/8 p-6"><h2 className="text-xl font-semibold">Portfolio RAG</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.projects.map(p=><button key={p.id} onClick={()=>onProject(p)} className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-left"><div className="flex justify-between"><span className="font-semibold">{p.name}</span><span className="h-3 w-3 rounded-full" style={{backgroundColor:RAG[p.health]}}/></div><div className="mt-4 text-3xl font-semibold">{p.healthScore}</div><div className="mt-2 text-xs text-white/55">{p.primaryBlocker}</div></button>)}</div></div><div className="space-y-5"><div className="rounded-3xl bg-white/8 p-6"><h2 className="text-xl font-semibold">Top management pressure</h2><div className="mt-4 space-y-3">{data.attention.slice(0,6).map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-white/[.05] p-4"><div className="text-sm font-semibold">{item.projectName} · {item.title}</div><div className="mt-2 text-xs leading-5 text-white/55">{item.reason}</div></div>)}</div></div><div className="rounded-3xl bg-[#08B5A6] p-6 text-[#0B2A3C]"><Lightbulb size={22}/><div className="mt-4 text-lg font-semibold">{data.insights[0]}</div></div></div></div></div></div>}
function CockpitMetric({label,value}:{label:string;value:any}){return <div className="rounded-2xl border border-white/10 bg-white/[.07] p-5"><div className="text-4xl font-semibold">{value}</div><div className="mt-2 text-xs uppercase tracking-wider text-white/50">{label}</div></div>}

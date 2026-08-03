
import { useEffect, useMemo, useState } from 'react'
import { Brain, CheckCircle2, FileText, Lock, RefreshCw, Save, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import {
  approveNarrative, buildExecutiveNarrative, listExecutiveNarratives, saveNarrativeDraft
} from '@/services/executiveNarrativeService'
import type {
  ExecutiveNarrativeDraft, ExecutiveNarrativeFormat, NarrativeInsight, NarrativeInsightStatus
} from '@/services/executiveNarrativeTypes'

const FORMATS: Array<{value:ExecutiveNarrativeFormat;label:string}> = [
  {value:'board_summary',label:'Board Summary'},
  {value:'ceo_briefing',label:'CEO Briefing'},
  {value:'weekly_pmo',label:'Weekly PMO Commentary'},
  {value:'project_director',label:'Project Director Briefing'},
  {value:'risk_recovery',label:'Risk & Recovery Commentary'},
  {value:'dashboard_paragraph',label:'Dashboard Summary'},
  {value:'detailed_management',label:'Detailed Management Narrative'},
]

export default function ExecutiveNarrativePage() {
  const { activeWorkspace } = useWorkspace()
  const [format,setFormat]=useState<ExecutiveNarrativeFormat>('board_summary')
  const [mode,setMode]=useState<'deterministic'|'ai_assisted'>('deterministic')
  const [draft,setDraft]=useState<ExecutiveNarrativeDraft|null>(null)
  const [history,setHistory]=useState<ExecutiveNarrativeDraft[]>([])
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')

  async function loadHistory(){
    if(!activeWorkspace)return
    try{setHistory(await listExecutiveNarratives(activeWorkspace.id))}
    catch(err){setMessage(err instanceof Error?err.message:'Unable to load narrative history.')}
  }

  async function generate(){
    if(!activeWorkspace)return
    setLoading(true);setMessage('')
    try{
      const next=await buildExecutiveNarrative({
        workspaceId:activeWorkspace.id,
        format,
        mode
      })
      setDraft(next)
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to generate executive narrative.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void loadHistory()},[activeWorkspace?.id])
  useEffect(()=>{if(activeWorkspace&&!draft)void generate()},[activeWorkspace?.id])

  const acceptedInsights=useMemo(()=>draft?.insights.filter(item=>item.status!=='rejected')||[],[draft])

  if(!activeWorkspace)return <div className="rounded-2xl border bg-white p-8">No active workspace.</div>

  function updateInsight(id:string,status:NarrativeInsightStatus){
    if(!draft)return
    setDraft({...draft,insights:draft.insights.map(item=>item.id===id?{...item,status}:item)})
  }

  async function save(){
    if(!draft)return
    try{
      const saved=await saveNarrativeDraft(draft)
      setDraft(saved);setMessage('Narrative draft saved.');await loadHistory()
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to save narrative.')}
  }

  async function approve(){
    if(!draft)return
    try{
      const saved=await approveNarrative(draft)
      setDraft(saved);setMessage('Executive narrative approved.');await loadHistory()
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to approve narrative.')}
  }

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Executive narrative engine</div>
            <h1 className="mt-2 text-3xl font-semibold text-[#102943]">Executive Narrative & Insight Centre</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f7d89]">Generate management commentary from traceable project evidence, review each insight, add management context and approve the final narrative.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>void generate()} disabled={loading} className="btn btn-gold"><RefreshCw size={15}/>{loading?'Generating…':'Regenerate'}</button>
            <button onClick={()=>void save()} disabled={!draft} className="btn btn-ghost"><Save size={15}/>Save draft</button>
            <button onClick={()=>void approve()} disabled={!draft||draft.status==='approved'} className="btn btn-primary"><CheckCircle2 size={15}/>Approve</button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Accepted insights" value={acceptedInsights.length} helper="Included in the narrative"/>
        <Metric label="Evidence records" value={draft?.evidence.length||0} helper="Traceable supporting facts"/>
        <Metric label="Mode" value={mode==='deterministic'?'Deterministic':'AI-assisted'} helper="Source of wording"/>
        <Metric label="Status" value={draft?.status||'Draft'} helper="Editorial approval state"/>
      </section>

      <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div>
            <label className="text-xs font-semibold text-[#52616d]">Narrative format</label>
            <select className="form-control mt-2" value={format} onChange={e=>setFormat(e.target.value as ExecutiveNarrativeFormat)}>
              {FORMATS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#52616d]">Generation mode</label>
            <select className="form-control mt-2" value={mode} onChange={e=>setMode(e.target.value as any)}>
              <option value="deterministic">Deterministic</option>
              <option value="ai_assisted">AI-assisted</option>
            </select>
          </div>
        </div>
        {mode==='ai_assisted'&&<div className="mt-3 rounded-xl border border-[#d7e5eb] bg-[#f2f8fa] px-4 py-3 text-xs leading-5 text-[#536170]">AI-assisted mode sends only the structured evidence and deterministic draft to the secure Edge Function. If the function is unavailable, the deterministic narrative remains unchanged.</div>}
      </section>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}

      {draft&&<div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,.8fr)]">
        <div className="space-y-5">
          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6">
            <div className="flex items-center gap-2 text-[#102943]"><Brain size={18}/><h2 className="text-xl font-semibold">Executive narrative</h2></div>
            <textarea className="mt-5 min-h-[280px] w-full rounded-2xl border border-[#dce4e8] p-4 text-sm leading-7 text-[#26384a] outline-none focus:border-[#8fb0c7]" value={draft.narrative} onChange={e=>setDraft({...draft,narrative:e.target.value})}/>
            <label className="mt-5 block text-xs font-semibold text-[#52616d]">Management commentary<textarea className="mt-2 min-h-28 w-full rounded-xl border border-[#dce4e8] p-3 text-sm leading-6 text-[#26384a] outline-none focus:border-[#8fb0c7]" placeholder="Add leadership context, qualifications or decisions not captured in the system data." value={draft.managementCommentary} onChange={e=>setDraft({...draft,managementCommentary:e.target.value})}/></label>
          </section>

          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6">
            <div className="flex items-center gap-2 text-[#102943]"><Sparkles size={18}/><h2 className="text-xl font-semibold">Editorial insight review</h2></div>
            <div className="mt-5 space-y-3">{draft.insights.map(insight=><InsightCard key={insight.id} insight={insight} onStatus={status=>updateInsight(insight.id,status)}/>)}</div>
          </section>

          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6">
            <h2 className="text-xl font-semibold text-[#102943]">Period movement</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Movement title="Improved" items={draft.comparison.improved} empty="No verified improvement comparison is available." tone="green"/>
              <Movement title="Deteriorated" items={draft.comparison.deteriorated} empty="No verified deterioration comparison is available." tone="red"/>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6">
            <div className="flex items-center gap-2 text-[#102943]"><ShieldCheck size={18}/><h2 className="text-xl font-semibold">Evidence panel</h2></div>
            <p className="mt-2 text-xs leading-5 text-[#87929b]">Each item identifies the metric, trigger and supporting module behind the narrative.</p>
            <div className="mt-5 space-y-3">{draft.evidence.length?draft.evidence.map(item=><article key={item.id} className="rounded-xl border border-[#e1e7ea] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-[#26384a]">{item.projectName||activeWorkspace.name}</div><div className="mt-1 text-xs text-[#87929b]">{item.sourceModule}</div></div><span className="badge badge-muted">{item.confidence}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><span className="text-[#98a3aa]">Metric</span><div className="mt-1 font-semibold text-[#52616d]">{item.metric}</div></div><div><span className="text-[#98a3aa]">Value</span><div className="mt-1 font-semibold text-[#52616d]">{item.value}</div></div></div><div className="mt-3 rounded-lg bg-[#f7f9fa] p-2 text-[11px] text-[#71808c]">{item.condition}</div>{item.actionUrl&&<a href={item.actionUrl} className="mt-3 inline-block text-xs font-semibold text-[#1f668f]">Open source module →</a>}</article>):<div className="rounded-xl bg-[#f7f9fa] p-6 text-center text-sm text-[#87929b]">No evidence records were required.</div>}</div>
          </section>

          <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6">
            <div className="flex items-center gap-2 text-[#102943]"><FileText size={18}/><h2 className="text-xl font-semibold">Narrative history</h2></div>
            <div className="mt-5 space-y-2">{history.length?history.slice(0,8).map(item=><button key={item.id} onClick={()=>setDraft(item)} className="w-full rounded-xl border border-[#e1e7ea] p-3 text-left hover:bg-[#f8fafb]"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#26384a]">{item.title}</span><span className={`badge ${item.status==='approved'?'badge-green':'badge-muted'}`}>{item.status}</span></div><div className="mt-2 text-[11px] text-[#929da5]">{new Date(item.generatedAt).toLocaleString()}</div></button>):<div className="rounded-xl bg-[#f7f9fa] p-6 text-center text-sm text-[#87929b]">No saved narratives yet.</div>}</div>
          </section>
        </aside>
      </div>}
    </div>
  </div>
}

function Metric({label,value,helper}:{label:string;value:any;helper:string}){return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><div className="text-2xl font-semibold capitalize text-[#102943]">{value}</div><div className="mt-2 text-xs font-semibold text-[#536170]">{label}</div><div className="mt-1 text-[11px] text-[#87929b]">{helper}</div></div>}

function InsightCard({insight,onStatus}:{insight:NarrativeInsight;onStatus:(status:NarrativeInsightStatus)=>void}){
  const tone=insight.severity==='critical'?'border-red-200 bg-red-50':insight.severity==='warning'?'border-amber-200 bg-amber-50':insight.severity==='positive'?'border-emerald-200 bg-emerald-50':'border-[#e1e7ea] bg-white'
  return <article className={`rounded-2xl border p-4 ${tone}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#71808c]">{insight.category}</div><h3 className="mt-1 font-semibold text-[#102943]">{insight.headline}</h3></div><div className="flex gap-1"><button onClick={()=>onStatus('accepted')} title="Accept" className="rounded-lg p-2 hover:bg-white/70"><CheckCircle2 size={15}/></button><button onClick={()=>onStatus('rejected')} title="Reject" className="rounded-lg p-2 hover:bg-white/70"><XCircle size={15}/></button><button onClick={()=>onStatus('locked')} title="Lock" className="rounded-lg p-2 hover:bg-white/70"><Lock size={15}/></button></div></div><p className="mt-3 text-sm leading-6 text-[#536170]">{insight.statement}</p>{insight.suggestedAction&&<div className="mt-3 rounded-lg bg-white/60 p-3 text-xs text-[#52616d]"><strong>Suggested action:</strong> {insight.suggestedAction}</div>}<div className="mt-3 flex gap-2"><span className="badge badge-muted">{insight.confidence} confidence</span><span className="badge badge-muted">{insight.status}</span><span className="badge badge-muted">{insight.evidenceIds.length} evidence</span></div></article>
}

function Movement({title,items,empty,tone}:{title:string;items:string[];empty:string;tone:'green'|'red'}){
  return <div className={`rounded-2xl border p-4 ${tone==='green'?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}><h3 className="font-semibold text-[#26384a]">{title}</h3><div className="mt-3 space-y-2">{items.length?items.map(item=><div key={item} className="text-sm leading-6 text-[#536170]">{item}</div>):<div className="text-sm text-[#87929b]">{empty}</div>}</div></div>
}

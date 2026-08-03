
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Expand, FileText, Pause, Play, Plus, Save, Users, X } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { listGeneratedReports } from '@/services/executiveReportService'
import {
  DEFAULT_BOARD_SECTIONS, changeBoardSessionStatus, createBoardAction,
  createBoardDecision, listBoardActions, listBoardDecisions, listBoardSessions,
  loadBoardSnapshot, saveBoardSession
} from '@/services/boardroomService'
import type { BoardAction, BoardDecision, BoardSession } from '@/services/boardroomTypes'
import type { ExecutivePortfolioSnapshot } from '@/services/executiveDashboardTypes'
import type { GeneratedReport } from '@/services/executiveReportTypes'

const newSession=(workspaceId:string):BoardSession=>({
  workspaceId,title:'Executive Portfolio Review',meetingDate:new Date().toISOString().slice(0,16),
  chairperson:'',attendees:[],reportId:null,dataMode:'live',status:'draft',
  sections:DEFAULT_BOARD_SECTIONS,meetingNotes:'',sourceDataTimestamp:null,startedAt:null,closedAt:null
})

export default function BoardroomPage(){
  const {activeWorkspace}=useWorkspace()
  const [sessions,setSessions]=useState<BoardSession[]>([])
  const [reports,setReports]=useState<GeneratedReport[]>([])
  const [session,setSession]=useState<BoardSession|null>(null)
  const [snapshot,setSnapshot]=useState<ExecutivePortfolioSnapshot|null>(null)
  const [slide,setSlide]=useState(0)
  const [presenting,setPresenting]=useState(false)
  const [notesOpen,setNotesOpen]=useState(false)
  const [capture,setCapture]=useState<'decision'|'action'|null>(null)
  const [decisions,setDecisions]=useState<any[]>([])
  const [actions,setActions]=useState<any[]>([])
  const [message,setMessage]=useState('')

  async function load(){
    if(!activeWorkspace)return
    try{
      const [s,r]=await Promise.all([listBoardSessions(activeWorkspace.id),listGeneratedReports(activeWorkspace.id)])
      setSessions(s);setReports(r)
      if(!session)setSession(s[0]||newSession(activeWorkspace.id))
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to load boardroom.')}
  }
  useEffect(()=>{void load()},[activeWorkspace?.id])

  async function refreshSnapshot(current:BoardSession){
    try{
      setSnapshot(await loadBoardSnapshot(current))
      if(current.id){
        setDecisions(await listBoardDecisions(current.id))
        setActions(await listBoardActions(current.id))
      }
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to load board data.')}
  }
  useEffect(()=>{if(session)void refreshSnapshot(session)},[session?.id,session?.dataMode,session?.reportId])

  const visible=session?.sections.filter(s=>s.visible)||[]
  const currentSection=visible[slide]||visible[0]

  async function save(){
    if(!session)return
    try{
      const saved=await saveBoardSession({...session,sourceDataTimestamp:snapshot?new Date().toISOString():session.sourceDataTimestamp})
      setSession(saved);setMessage('Board session saved.');await load()
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to save board session.')}
  }

  async function status(next:BoardSession['status']){
    if(!session)return
    try{const saved=await changeBoardSessionStatus(session,next);setSession(saved);setPresenting(next==='live');setMessage(`Session ${next}.`)}
    catch(e){setMessage(e instanceof Error?e.message:'Unable to update session.')}
  }

  if(!activeWorkspace||!session)return <div className="rounded-2xl border bg-white p-8">Loading boardroom…</div>

  if(presenting&&snapshot&&currentSection){
    return <div className="fixed inset-0 z-[100] bg-[#0d2235] text-white">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div><div className="text-xs uppercase tracking-[.18em] text-white/50">{session.dataMode} mode</div><div className="mt-1 text-lg font-semibold">{session.title}</div></div>
          <div className="flex items-center gap-2"><button onClick={()=>setCapture('decision')} className="rounded-xl bg-white/10 px-4 py-2 text-sm">Record decision</button><button onClick={()=>setCapture('action')} className="rounded-xl bg-white/10 px-4 py-2 text-sm">Assign action</button><button onClick={()=>setNotesOpen(!notesOpen)} className="rounded-xl bg-white/10 px-4 py-2 text-sm">Presenter notes</button><button onClick={()=>setPresenting(false)} className="rounded-xl p-2 hover:bg-white/10"><X/></button></div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-8 lg:p-12">
          <Slide section={currentSection.type} title={currentSection.title} snapshot={snapshot} decisions={decisions} actions={actions} workspaceName={activeWorkspace.name}/>
        </main>
        <footer className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button disabled={slide===0} onClick={()=>setSlide(Math.max(0,slide-1))} className="rounded-xl bg-white/10 p-3 disabled:opacity-30"><ArrowLeft/></button>
          <div className="text-sm text-white/60">{slide+1} / {visible.length} · {currentSection.title}</div>
          <button disabled={slide>=visible.length-1} onClick={()=>setSlide(Math.min(visible.length-1,slide+1))} className="rounded-xl bg-white/10 p-3 disabled:opacity-30"><ArrowRight/></button>
        </footer>
      </div>
      {notesOpen&&<aside className="fixed right-4 top-24 w-80 rounded-2xl border border-white/10 bg-[#173f5f] p-5 shadow-2xl"><div className="text-xs uppercase tracking-wider text-white/50">Presenter notes</div><p className="mt-3 text-sm leading-6 text-white/80">{currentSection.presenterNotes||'No presenter notes for this section.'}</p></aside>}
      {capture&&session.id&&<CaptureDrawer type={capture} session={session} onClose={()=>setCapture(null)} onSaved={async()=>{setCapture(null);await refreshSnapshot(session)}} setMessage={setMessage}/>}
    </div>
  }

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap justify-between gap-4"><div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Executive review workflow</div><h1 className="mt-2 text-3xl font-semibold text-[#102943]">Boardroom Mode</h1><p className="mt-2 text-sm text-[#6f7d89]">Prepare, present and record executive reviews using live or approved frozen data.</p></div><div className="flex gap-2"><button onClick={()=>setSession(newSession(activeWorkspace.id))} className="btn btn-ghost"><Plus size={15}/>New session</button><button onClick={()=>void save()} className="btn btn-ghost"><Save size={15}/>Save</button><button onClick={async()=>{await status('live');setPresenting(true)}} className="btn btn-gold"><Play size={15}/>Start presentation</button></div></div>
      </section>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5"><h2 className="font-semibold text-[#102943]">Sessions</h2><div className="mt-4 space-y-2">{sessions.map(item=><button key={item.id} onClick={()=>{setSession(item);setSlide(0)}} className={`w-full rounded-xl border p-3 text-left ${session.id===item.id?'border-[#8fb0c7] bg-[#eef5f8]':'border-[#e2e8eb]'}`}><div className="text-sm font-semibold text-[#26384a]">{item.title}</div><div className="mt-1 text-[11px] text-[#87929b]">{new Date(item.meetingDate).toLocaleString()} · {item.status}</div></button>)}</div></section>

        <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2"><Field label="Meeting title"><input className="form-control" value={session.title} onChange={e=>setSession({...session,title:e.target.value})}/></Field><Field label="Date and time"><input type="datetime-local" className="form-control" value={session.meetingDate.slice(0,16)} onChange={e=>setSession({...session,meetingDate:e.target.value})}/></Field><Field label="Chairperson"><input className="form-control" value={session.chairperson} onChange={e=>setSession({...session,chairperson:e.target.value})}/></Field><Field label="Attendees"><input className="form-control" value={session.attendees.join(', ')} onChange={e=>setSession({...session,attendees:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}/></Field><Field label="Data mode"><select className="form-control" value={session.dataMode} onChange={e=>setSession({...session,dataMode:e.target.value as any})}><option value="live">Live data</option><option value="frozen">Frozen report snapshot</option></select></Field><Field label="Approved report"><select className="form-control" value={session.reportId||''} onChange={e=>setSession({...session,reportId:e.target.value||null})}><option value="">No report selected</option>{reports.filter(r=>r.status==='approved').map(r=><option key={r.id} value={r.id}>{r.title} v{r.versionNumber}</option>)}</select></Field></div>
          <Field label="Meeting notes"><textarea className="form-control min-h-28" value={session.meetingNotes} onChange={e=>setSession({...session,meetingNotes:e.target.value})}/></Field>
          <div className="mt-5"><h3 className="font-semibold text-[#26384a]">Board pack sections</h3><div className="mt-3 space-y-2">{session.sections.map((section,index)=><div key={section.id} className="rounded-xl border border-[#e2e8eb] p-3"><div className="flex items-center justify-between"><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={section.visible} onChange={e=>setSession({...session,sections:session.sections.map(s=>s.id===section.id?{...s,visible:e.target.checked}:s)})}/>{section.title}</label><span className="text-xs text-[#87929b]">{index+1}</span></div><textarea className="mt-2 w-full rounded-lg border p-2 text-xs" placeholder="Presenter notes" value={section.presenterNotes} onChange={e=>setSession({...session,sections:session.sections.map(s=>s.id===section.id?{...s,presenterNotes:e.target.value}:s)})}/></div>)}</div></div>
        </section>

        <aside className="space-y-5">
          <Panel title="Session status"><div className="grid grid-cols-2 gap-2"><button onClick={()=>void status('paused')} className="btn btn-ghost"><Pause size={14}/>Pause</button><button onClick={()=>void status('completed')} className="btn btn-gold"><CheckCircle2 size={14}/>Close</button></div><div className="mt-4 rounded-xl bg-[#f7f9fa] p-4 text-sm text-[#6f7d89]">Status: <strong>{session.status}</strong><br/>Mode: <strong>{session.dataMode}</strong><br/>Source: {session.sourceDataTimestamp?new Date(session.sourceDataTimestamp).toLocaleString():'Not frozen'}</div></Panel>
          <Panel title="Meeting record"><div className="space-y-3 text-sm text-[#536170]"><div className="flex justify-between"><span>Attendees</span><strong>{session.attendees.length}</strong></div><div className="flex justify-between"><span>Decisions</span><strong>{decisions.length}</strong></div><div className="flex justify-between"><span>Actions</span><strong>{actions.length}</strong></div></div></Panel>
        </aside>
      </div>
    </div>
  </div>
}

function Slide({section,title,snapshot,decisions,actions,workspaceName}:any){
  if(section==='cover')return <div className="grid min-h-[65vh] place-items-center text-center"><div><div className="text-sm uppercase tracking-[.3em] text-white/50">{workspaceName}</div><h1 className="mt-6 text-6xl font-semibold">{title}</h1><p className="mt-5 text-xl text-white/60">{new Date().toLocaleDateString()}</p></div></div>
  if(section==='portfolio_kpis')return <div><h2 className="text-4xl font-semibold">{title}</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{Object.entries(snapshot.metrics).slice(0,9).map(([k,v]:any)=><div key={k} className="rounded-2xl bg-white/10 p-6"><div className="text-4xl font-semibold">{String(v??'—')}</div><div className="mt-2 text-sm text-white/60">{k.replace(/([A-Z])/g,' $1')}</div></div>)}</div></div>
  if(section==='rag_overview')return <div><h2 className="text-4xl font-semibold">{title}</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{snapshot.projects.map((p:any)=><div key={p.id} className={`rounded-2xl p-5 ${p.health==='critical'?'bg-red-500/20':p.health==='attention'?'bg-amber-500/20':'bg-emerald-500/20'}`}><div className="text-xl font-semibold">{p.name}</div><div className="mt-2 text-white/60">{p.progress}% progress · {p.ragLabel}</div></div>)}</div></div>
  const list=section==='attention_queue'?snapshot.attention:section==='decisions'?decisions:section==='actions'?actions:section==='timeline'?snapshot.timeline:null
  if(list)return <div><h2 className="text-4xl font-semibold">{title}</h2><div className="mt-8 space-y-4">{list.length?list.slice(0,10).map((item:any,i:number)=><div key={item.id||i} className="rounded-2xl bg-white/10 p-5"><div className="text-xl font-semibold">{item.title||item.decision||item.action}</div><div className="mt-2 text-white/60">{item.projectName||item.owner_name||item.ownerName||item.status||''}</div></div>):<div className="rounded-2xl bg-white/10 p-10 text-center text-white/50">No items to present.</div>}</div></div>
  return <div><h2 className="text-4xl font-semibold">{title}</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{snapshot.projects.slice(0,9).map((p:any)=><div key={p.id} className="rounded-2xl bg-white/10 p-5"><div className="text-lg font-semibold">{p.name}</div><div className="mt-3 text-white/60">{p.primaryBlocker}</div></div>)}</div></div>
}

function CaptureDrawer({type,session,onClose,onSaved,setMessage}:any){const [form,setForm]=useState({text:'',rationale:'',ownerName:'',dueDate:'',priority:'high',projectId:''});const [saving,setSaving]=useState(false);async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{if(type==='decision')await createBoardDecision({sessionId:session.id,workspaceId:session.workspaceId,projectId:form.projectId||null,decision:form.text,rationale:form.rationale,ownerName:form.ownerName,dueDate:form.dueDate||null,priority:form.priority,status:'open',sectionType:null} as BoardDecision);else await createBoardAction({sessionId:session.id,workspaceId:session.workspaceId,projectId:form.projectId||null,action:form.text,ownerName:form.ownerName,ownerUserId:null,dueDate:form.dueDate||null,escalationDate:null,priority:form.priority,status:'open',completionEvidence:''} as BoardAction);await onSaved()}catch(err){setMessage(err instanceof Error?err.message:'Unable to save item.')}finally{setSaving(false)}}return <div className="fixed inset-0 z-[110] bg-black/40" onClick={onClose}><aside className="ml-auto h-full w-full max-w-md bg-white p-6 text-[#26384a]" onClick={e=>e.stopPropagation()}><h2 className="text-2xl font-semibold capitalize">Record {type}</h2><form onSubmit={submit} className="mt-6 space-y-4"><Field label={type==='decision'?'Decision':'Action'}><textarea className="form-control min-h-28" required value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/></Field>{type==='decision'&&<Field label="Rationale"><textarea className="form-control" value={form.rationale} onChange={e=>setForm({...form,rationale:e.target.value})}/></Field>}<Field label="Owner"><input className="form-control" value={form.ownerName} onChange={e=>setForm({...form,ownerName:e.target.value})}/></Field><Field label="Due date"><input type="date" className="form-control" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></Field><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={saving} className="btn btn-gold">{saving?'Saving…':'Save'}</button></div></form></aside></div>}
function Panel({title,children}:{title:string;children:any}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5"><h2 className="mb-4 font-semibold text-[#102943]">{title}</h2>{children}</section>}
function Field({label,children}:{label:string;children:any}){return <label className="mb-4 block text-xs font-semibold text-[#52616d]">{label}<div className="mt-2">{children}</div></label>}

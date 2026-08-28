import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock3, Link2, ShieldCheck } from 'lucide-react'
import { EnterprisePageHero, EnterpriseNotice } from '@/components/ui/enterprise'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAccessSession } from '@/access/AccessSessionProvider'

const STAGES = [
  ['Pre-Construction', ['AMC Approval','Engagement of Project Team','Soil Investigation / Geotechnical Survey','Topographical Survey and Site Beaconing','Construction Drawings Completed','Coordinated Housebuild Design Drawings Approved','Co-ordinated Infrastructure Drawing Approved','MEP Drawings Approved','BOQ / Cost Plan Completed','Tendering Process Completed','Contractor Award Completed','Performance Bond / Advance Payment Guarantee in Place',"Contractor's Insurance in Place (CAR)",'Advance Payment Released','Site Mobilization / Site Possession Handed to Contractor','Site Clearance and Construction Access Road Done']],
  ['Mobilization', ['Issue of Construction Drawings to Contractor','Kick-off Meeting Achieved','Materials Procurement - Long-Lead Items','Setting Out Completed','Approval of Setting Out Completed','Building and Road Levels Established','Shop Drawings Submitted and Approved']],
  ['Construction', ['Construction of Housebuild in Progress','Infrastructure in Progress','Roads and Drainage Completed','MEP Installations in Progress','Control Units in Progress','Perimeter Fencing and Estate Security Completed','Landscaping in Progress','Show Home Completed','Interim Valuations / Progress Payment Certificates','Checklists in Use','Snaglists and NCR in Use','Corrections Ongoing']],
  ['Utilities & Testing', ['Testing and Commissioning','Power Connection Achieved','Streetlighting Completed','Sewage Connection Achieved','Water Supply Connection Achieved','Telecoms / Fibre Connection']],
  ['Close-Out & Handover', ['Completion Achieved - House Build','Completion Achieved - Infrastructure','Landscaping Completed','Practical Completion Certificate Issued','Snagging and Corrections','Final Checklists Completed','Construction Cleaning Completed','As-Built Drawings Submitted','O&M Manuals Submitted','Fire Service / Building Completion Certificate','Pre-Handover Inspection','Handover','Facility Management Team Engaged','Final Account Agreed / Retention Released','Defects Correction','Defects Liability Period End']],
] as const

const statusOptions = ['Not Started','In Progress','Complete','Not Applicable','Blocked'] as const

function statusIcon(status: string) {
  if (status === 'Complete') return <CheckCircle2 size={18} className="text-emerald-600" />
  if (status === 'Blocked') return <AlertTriangle size={18} className="text-red-600" />
  if (status === 'In Progress') return <Clock3 size={18} className="text-blue-600" />
  return <Circle size={18} className="text-slate-400" />
}

export default function ProjectJourneyPage() {
  const { projectId, projectName } = useProjectStore()
  const { can } = useAccessSession()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(STAGES.map(([s]) => [s, true])))
  const canEdit = Boolean(projectId) && can('project.edit', { scopeType:'project', scopeId: projectId })

  async function load() {
    if (!projectId) { setItems([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase.from('project_journey_items').select('*').eq('project_id', projectId).order('stage_order').order('item_order')
    if (error) { console.error(error.message); setLoading(false); return }
    let rows = data || []
    if (!rows.length && canEdit) {
      const seed = STAGES.flatMap(([stage, titles], stageIndex) => titles.map((title, itemIndex) => ({ project_id: projectId, stage, stage_order: stageIndex + 1, item_order: itemIndex + 1, title })))
      const inserted = await supabase.from('project_journey_items').insert(seed).select('*')
      if (!inserted.error) rows = inserted.data || []
      else console.error(inserted.error.message)
    }
    setItems(rows); setLoading(false)
  }

  useEffect(() => { void load() }, [projectId, canEdit])

  const stats = useMemo(() => {
    const applicable = items.filter(i => i.status !== 'Not Applicable')
    const complete = applicable.filter(i => i.status === 'Complete').length
    const blocked = applicable.filter(i => i.status === 'Blocked').length
    const overdue = applicable.filter(i => i.status !== 'Complete' && i.planned_date && i.planned_date < new Date().toISOString().slice(0,10)).length
    return { total: applicable.length, complete, blocked, overdue, pct: applicable.length ? Math.round(complete / applicable.length * 100) : 0 }
  }, [items])

  const handoverStage = items.filter(i => i.stage === 'Close-Out & Handover' && i.status !== 'Not Applicable')
  const handoverPct = handoverStage.length ? Math.round(handoverStage.filter(i => i.status === 'Complete').length / handoverStage.length * 100) : 0

  async function patch(id: string, changes: any) {
    if (!canEdit) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i))
    const { error } = await supabase.from('project_journey_items').update(changes).eq('id', id)
    if (error) { console.error(error.message); void load() }
  }

  if (!projectId) return <EnterpriseNotice tone="warning"><strong>Select a project.</strong> Open a project before viewing its delivery journey.</EnterpriseNotice>

  return <div className="space-y-6 pb-10">
    <EnterprisePageHero eyebrow="Project milestone journey" title="Project Journey" description={`High-level lifecycle readiness for ${projectName}. This tracker complements physical progress by showing whether critical delivery and handover steps have actually been satisfied.`} />

    {!canEdit && <EnterpriseNotice tone="info"><strong>Read-only journey.</strong> You can see the complete project journey. Only the assigned project owner, an active delegate, or an authorised administrator can update it.</EnterpriseNotice>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><div className="text-5xl font-bold text-[#123a60]">{stats.pct}%</div><div className="mt-1 text-xs font-semibold uppercase tracking-[.18em] text-slate-500">of the delivery journey achieved</div></div>
        <div className="flex gap-8 text-right"><div><b className="text-2xl text-emerald-600">{stats.complete}</b><div className="text-xs uppercase text-slate-500">Achieved</div></div><div><b className="text-2xl text-amber-600">{Math.max(0, stats.total-stats.complete)}</b><div className="text-xs uppercase text-slate-500">Outstanding</div></div><div><b className="text-2xl text-red-600">{stats.overdue}</b><div className="text-xs uppercase text-slate-500">Overdue</div></div></div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#123a60] transition-all" style={{width:`${stats.pct}%`}} /></div>
      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-5">{STAGES.map(([stage]) => { const stageItems=items.filter(i=>i.stage===stage && i.status!=='Not Applicable'); const done=stageItems.filter(i=>i.status==='Complete').length; const pct=stageItems.length?Math.round(done/stageItems.length*100):0; return <div key={stage} className="rounded-xl border border-slate-200 p-3"><div className="text-xs font-semibold text-slate-700">{stage}</div><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{done}/{stageItems.length}</span><b>{pct}%</b></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#123a60]" style={{width:`${pct}%`}} /></div></div>})}</div>
    </section>

    <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs uppercase tracking-wider text-slate-500">Journey completion</div><b className="mt-1 block text-2xl text-[#123a60]">{stats.complete}/{stats.total}</b></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs uppercase tracking-wider text-slate-500">Handover readiness</div><b className="mt-1 block text-2xl text-[#123a60]">{handoverPct}%</b></div><div className={`rounded-2xl border p-4 ${stats.blocked || stats.overdue ? 'border-red-200 bg-red-50':'border-emerald-200 bg-emerald-50'}`}><div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500"><ShieldCheck size={15}/> Readiness signal</div><b className={`mt-1 block text-lg ${stats.blocked || stats.overdue?'text-red-700':'text-emerald-700'}`}>{stats.blocked ? `${stats.blocked} blocked milestone${stats.blocked===1?'':'s'}` : stats.overdue ? `${stats.overdue} overdue milestone${stats.overdue===1?'':'s'}` : 'No current journey exceptions'}</b></div></div>

    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading project journey…</div> : items.length === 0 ? <EnterpriseNotice tone="warning"><strong>Journey not initialised.</strong> Ask the assigned project owner or PMO/Admin to open this page once to initialise the standard journey.</EnterpriseNotice> : <div className="space-y-4">{STAGES.map(([stage], stageIndex) => { const rows=items.filter(i=>i.stage===stage); const done=rows.filter(i=>i.status==='Complete').length; return <section key={stage} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" onClick={()=>setExpanded(x=>({...x,[stage]:!x[stage]}))}><div className="flex items-center gap-3">{expanded[stage]?<ChevronDown size={17}/>:<ChevronRight size={17}/>}<span className="text-xs font-semibold text-slate-500">0{stageIndex+1}</span><h2 className="font-bold text-slate-900">{stage}</h2></div><span className="text-sm font-semibold text-slate-500">{done} / {rows.length}</span></button>{expanded[stage] && <div className="border-t border-slate-200">{rows.map(item=><div key={item.id} className="grid gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 lg:grid-cols-[minmax(240px,1fr)_170px_150px_150px_minmax(180px,1fr)] lg:items-center"><div className="flex min-w-0 items-center gap-3">{statusIcon(item.status)}<span className="font-medium text-slate-800">{item.title}</span></div><select disabled={!canEdit} value={item.status} onChange={e=>void patch(item.id,{status:e.target.value})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50">{statusOptions.map(s=><option key={s}>{s}</option>)}</select><input disabled={!canEdit} type="date" value={item.planned_date||''} onChange={e=>void patch(item.id,{planned_date:e.target.value||null})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" title="Planned completion"/><input disabled={!canEdit} type="date" value={item.actual_date||''} onChange={e=>void patch(item.id,{actual_date:e.target.value||null})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" title="Actual completion"/><div className="flex gap-2"><input disabled={!canEdit} value={item.evidence_url||''} onChange={e=>setItems(prev=>prev.map(i=>i.id===item.id?{...i,evidence_url:e.target.value}:i))} onBlur={e=>void patch(item.id,{evidence_url:e.target.value||null})} placeholder="Evidence / document link" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"/>{item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-[#123a60]" title="Open evidence"><Link2 size={16}/></a>}</div></div>)}</div>}</section>})}</div>}
  </div>
}

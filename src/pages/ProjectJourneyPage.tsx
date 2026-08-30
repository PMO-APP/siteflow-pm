import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock3, Link2, ShieldCheck, PlayCircle, Info } from 'lucide-react'
import { EnterprisePageHero, EnterpriseNotice } from '@/components/ui/enterprise'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAccessSession } from '@/access/AccessSessionProvider'
import { useMembershipStore } from '@/store/membership'

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
  const { can, session } = useAccessSession()
  const membershipRole = useMembershipStore(state => state.role)
  const effectiveRole = String(session.role || membershipRole || '').toLowerCase()
  const isWorkspaceAdministrator = ['workspace_admin','admin'].includes(effectiveRole)

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [initialising, setInitialising] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(STAGES.map(([s]) => [s, true])))
  const canEdit = Boolean(projectId) && (
    isWorkspaceAdministrator ||
    can('project.edit', { scopeType:'project', scopeId: projectId })
  )

  async function load() {
    if (!projectId) { setItems([]); setLoading(false); return }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('project_journey_items').select('*').eq('project_id', projectId).order('stage_order').order('item_order')
    if (error) { console.error(error.message); setError(error.message); setLoading(false); return }
    setItems(data || []); setLoading(false)
  }

  useEffect(() => { void load() }, [projectId, canEdit])

  async function initialiseJourney() {
    if (!projectId || !canEdit || initialising) return
    setInitialising(true)
    setError('')
    const seed = STAGES.flatMap(([stage, titles], stageIndex) => titles.map((title, itemIndex) => ({
      project_id: projectId,
      stage,
      stage_order: stageIndex + 1,
      item_order: itemIndex + 1,
      title,
      status: 'Not Started',
    })))
    const inserted = await supabase.from('project_journey_items').insert(seed).select('*')
    if (inserted.error) {
      console.error(inserted.error.message)
      setError(inserted.error.message)
    } else {
      setItems(inserted.data || [])
    }
    setInitialising(false)
  }

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

    <section className="rounded-2xl border border-teal-100 bg-[#E8F6F4] p-5">
      <div className="flex items-start gap-3">
        <Info size={20} className="mt-0.5 text-[#05969B]" />
        <div>
          <h2 className="font-bold text-[#0B2A3C]">How Project Journey works</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">This is the project’s high-level delivery gate checklist. Initialise it once, then update each milestone as the project moves from pre-construction through handover. Add planned and actual dates, mark the status, and attach evidence such as an approval, drawing, certificate or report. It does not replace the detailed programme; it tells management whether the critical lifecycle steps have actually been completed.</p>
        </div>
      </div>
    </section>

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

    {error && <EnterpriseNotice tone="warning"><strong>Project Journey could not be updated.</strong> {error}</EnterpriseNotice>}

    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading project journey…</div> : items.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><PlayCircle size={32} className="mx-auto text-[#08B5A6]"/><h2 className="mt-3 text-xl font-bold text-[#0B2A3C]">Journey not initialised</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">Initialising creates the standard PMOCorex lifecycle checklist for this project. It is done once; after that, authorised users keep the milestone statuses, dates and evidence up to date.</p>{canEdit ? <button type="button" onClick={()=>void initialiseJourney()} disabled={initialising} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B2A3C] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><PlayCircle size={17}/>{initialising?'Initialising…':'Initialize Project Journey'}</button> : <p className="mt-4 text-sm font-medium text-slate-600">A Workspace Admin, Admin, PMO or authorised project owner must initialise it.</p>}</section> : <div className="space-y-4">{STAGES.map(([stage], stageIndex) => { const rows=items.filter(i=>i.stage===stage); const done=rows.filter(i=>i.status==='Complete').length; return <section key={stage} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" onClick={()=>setExpanded(x=>({...x,[stage]:!x[stage]}))}><div className="flex items-center gap-3">{expanded[stage]?<ChevronDown size={17}/>:<ChevronRight size={17}/>}<span className="text-xs font-semibold text-slate-500">0{stageIndex+1}</span><h2 className="font-bold text-slate-900">{stage}</h2></div><span className="text-sm font-semibold text-slate-500">{done} / {rows.length}</span></button>{expanded[stage] && <div className="border-t border-slate-200"><div className="hidden grid-cols-[minmax(240px,1fr)_170px_150px_150px_minmax(180px,1fr)] gap-3 bg-slate-50 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 lg:grid"><span>Milestone</span><span>Status</span><span>Planned date</span><span>Actual date</span><span>Evidence</span></div>{rows.map(item=><div key={item.id} className="grid gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 lg:grid-cols-[minmax(240px,1fr)_170px_150px_150px_minmax(180px,1fr)] lg:items-center"><div className="flex min-w-0 items-center gap-3">{statusIcon(item.status)}<span className="font-medium text-slate-800">{item.title}</span></div><select disabled={!canEdit} value={item.status} onChange={e=>void patch(item.id,{status:e.target.value})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50">{statusOptions.map(s=><option key={s}>{s}</option>)}</select><input disabled={!canEdit} type="date" value={item.planned_date||''} onChange={e=>void patch(item.id,{planned_date:e.target.value||null})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" title="Planned completion"/><input disabled={!canEdit} type="date" value={item.actual_date||''} onChange={e=>void patch(item.id,{actual_date:e.target.value||null})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" title="Actual completion"/><div className="flex gap-2"><input disabled={!canEdit} value={item.evidence_url||''} onChange={e=>setItems(prev=>prev.map(i=>i.id===item.id?{...i,evidence_url:e.target.value}:i))} onBlur={e=>void patch(item.id,{evidence_url:e.target.value||null})} placeholder="Evidence / document link" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"/>{item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-[#123a60]" title="Open evidence"><Link2 size={16}/></a>}</div></div>)}</div>}</section>})}</div>}
  </div>
}

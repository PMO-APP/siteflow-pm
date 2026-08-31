import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileDiff,
  FileSearch,
  Plus,
  RefreshCw,
  Ruler,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { EnterpriseMetric, EnterpriseNotice, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import {
  loadDesignIntelligence,
  runRegisterCoordinationReview,
  saveDesignDrawing,
  saveDesignIssue,
  updateDesignIssue,
  type DesignDiscipline,
  type DesignDrawing,
  type DesignIssue,
  type DesignRule,
} from '@/services/designIntelligenceService'

const TABS = ['Drawing Register', 'Revision Compare', 'Coordination Review', 'Clash & Risk Register', 'Design Rules', 'Resolution Tracker'] as const
type Tab = (typeof TABS)[number]

const DISCIPLINES: DesignDiscipline[] = ['Architecture', 'Structural', 'MEP', 'Infrastructure', 'Landscaping', 'General']
const RESPONSIBLE_TEAMS = ['Design', 'Costing', 'Infrastructure', 'MEP', 'PMO', 'Housebuild', 'Landscaping', 'HSE']

function severityClass(severity: string) {
  if (severity === 'Critical') return 'border-red-200 bg-red-50 text-red-700'
  if (severity === 'High') return 'border-red-200 bg-red-50 text-red-700'
  if (severity === 'Medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function statusClass(status: string) {
  if (['Resolved', 'Closed'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'Under Review') return 'border-teal-200 bg-[#E8F6F4] text-[#05969B]'
  return 'border-red-200 bg-red-50 text-red-700'
}

export default function DesignIntelligencePage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const canManage = ['workspace_admin', 'admin', 'pmo', 'design'].includes(String(role || '').toLowerCase())
  const canGovernRules = ['workspace_admin', 'admin', 'pmo'].includes(String(role || '').toLowerCase())

  const [tab, setTab] = useState<Tab>('Drawing Register')
  const [drawings, setDrawings] = useState<DesignDrawing[]>([])
  const [issues, setIssues] = useState<DesignIssue[]>([])
  const [rules, setRules] = useState<DesignRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showDrawing, setShowDrawing] = useState(false)
  const [showIssue, setShowIssue] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  const [drawingForm, setDrawingForm] = useState({
    drawing_number: '', title: '', discipline: 'Architecture' as DesignDiscipline,
    revision: 'A', revision_date: '', status: 'Current' as DesignDrawing['status'],
    level: '', zone: '', file_url: '', notes: '',
  })
  const [issueForm, setIssueForm] = useState({
    title: '', category: 'Constructability', severity: 'High' as DesignIssue['severity'],
    description: '', consequence: '', recommendation: '', responsible_team: 'Design', location: '',
  })

  async function load() {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const data = await loadDesignIntelligence(projectId)
      setDrawings(data.drawings)
      setIssues(data.issues)
      setRules(data.rules)
    } catch (err: any) {
      setError(err?.message || 'Unable to load Design Intelligence. Run the supplied Supabase migration first.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [projectId])

  const stats = useMemo(() => {
    const open = issues.filter(item => !['Resolved', 'Closed', 'Rejected'].includes(item.status))
    return {
      currentDrawings: drawings.filter(item => item.status === 'Current').length,
      revisions: drawings.length,
      openIssues: open.length,
      critical: open.filter(item => ['High', 'Critical'].includes(item.severity)).length,
      resolved: issues.filter(item => ['Resolved', 'Closed'].includes(item.status)).length,
    }
  }, [drawings, issues])

  const revisionGroups = useMemo(() => {
    const map = new Map<string, DesignDrawing[]>()
    drawings.forEach(item => {
      const key = `${item.discipline} • ${item.drawing_number}`
      map.set(key, [...(map.get(key) || []), item])
    })
    return [...map.entries()].filter(([, rows]) => rows.length > 1)
  }, [drawings])

  async function addDrawing() {
    if (!projectId || !drawingForm.drawing_number.trim() || !drawingForm.title.trim()) return
    try {
      await saveDesignDrawing(projectId, {
        ...drawingForm,
        revision_date: drawingForm.revision_date || null,
        level: drawingForm.level || null,
        zone: drawingForm.zone || null,
        file_url: drawingForm.file_url || null,
        notes: drawingForm.notes || null,
      })
      setShowDrawing(false)
      setDrawingForm({ drawing_number: '', title: '', discipline: 'Architecture', revision: 'A', revision_date: '', status: 'Current', level: '', zone: '', file_url: '', notes: '' })
      await load()
    } catch (err: any) { setError(err?.message || 'Could not register drawing.') }
  }

  async function addIssue() {
    if (!projectId || !issueForm.title.trim() || !issueForm.description.trim()) return
    try {
      await saveDesignIssue(projectId, {
        ...issueForm,
        disciplines: [],
        drawing_ids: [],
        confidence: 'Confirmed',
        source_type: 'Manual',
        status: 'Open',
      })
      setShowIssue(false)
      setIssueForm({ title: '', category: 'Constructability', severity: 'High', description: '', consequence: '', recommendation: '', responsible_team: 'Design', location: '' })
      await load()
    } catch (err: any) { setError(err?.message || 'Could not create coordination issue.') }
  }

  async function runReview() {
    if (!projectId) return
    setReviewing(true)
    setNotice('')
    try {
      const result = await runRegisterCoordinationReview(projectId, drawings)
      setNotice(result.newFindings
        ? `${result.newFindings} new coordination finding${result.newFindings === 1 ? '' : 's'} added to the risk register.`
        : `Review completed. ${result.totalFindings ? 'No new findings beyond items already recorded.' : 'No register/revision exceptions detected.'}`)
      await load()
      setTab('Coordination Review')
    } catch (err: any) { setError(err?.message || 'Coordination review failed.') }
    finally { setReviewing(false) }
  }

  if (!projectId) return <EnterpriseNotice tone="warning">Select a project before opening Design Intelligence.</EnterpriseNotice>

  return (
    <div className="space-y-5 pb-10">
      <EnterprisePageHero
        eyebrow="Design coordination intelligence"
        title="Design Intelligence"
        description="Control drawing revisions, coordination risks, constructability checks and design-rule compliance before issues reach site."
        projectName={projectName}
        actions={<div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><RefreshCw size={16}/>Refresh</button>
          {canManage && <button onClick={() => void runReview()} disabled={reviewing} className="inline-flex items-center gap-2 rounded-xl bg-[#0B2A3C] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><ScanSearch size={16}/>{reviewing ? 'Reviewing…' : 'Run coordination review'}</button>}
        </div>}
      />

      {error && <EnterpriseNotice tone="error"><strong>Design Intelligence could not complete the request.</strong> {error}</EnterpriseNotice>}
      {notice && <EnterpriseNotice tone="success">{notice}</EnterpriseNotice>}

      <div className="grid gap-3 md:grid-cols-5">
        <EnterpriseMetric label="Current drawings" value={stats.currentDrawings} helper="Registered current set" icon={FileSearch}/>
        <EnterpriseMetric label="Drawing records" value={stats.revisions} helper="All revisions" icon={FileDiff}/>
        <EnterpriseMetric label="Open coordination" value={stats.openIssues} helper="Require review" icon={AlertTriangle} tone={stats.openIssues ? 'red' : 'green'}/>
        <EnterpriseMetric label="High / critical" value={stats.critical} helper="Management attention" icon={ShieldCheck} tone={stats.critical ? 'red' : 'green'}/>
        <EnterpriseMetric label="Resolved" value={stats.resolved} helper="Closed design risks" icon={CheckCircle2} tone="green"/>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {TABS.map(item => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === item ? 'bg-[#0B2A3C] text-white' : 'text-[#0B2A3C] hover:bg-[#E8F6F4]'}`}>{item}</button>)}
      </div>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading Design Intelligence…</div> : <>
        {tab === 'Drawing Register' && <EnterpriseSection title="Drawing Register" description="One controlled register for Architecture, Structural, MEP, Infrastructure and Landscaping revisions." action={canManage ? <button onClick={() => setShowDrawing(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Register drawing</button> : undefined}>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="p-3">Drawing</th><th>Discipline</th><th>Revision</th><th>Revision date</th><th>Status</th><th>Level / Zone</th><th>File</th></tr></thead><tbody>{drawings.map(row => <tr key={row.id} className="border-b border-slate-100"><td className="p-3"><div className="font-bold text-[#0B2A3C]">{row.drawing_number}</div><div className="text-xs text-slate-500">{row.title}</div></td><td>{row.discipline}</td><td className="font-bold">{row.revision}</td><td>{row.revision_date || '—'}</td><td><span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold">{row.status}</span></td><td>{[row.level,row.zone].filter(Boolean).join(' • ') || '—'}</td><td>{row.file_url ? <a href={row.file_url} target="_blank" rel="noreferrer" className="font-semibold text-[#05969B]">Open drawing</a> : '—'}</td></tr>)}{!drawings.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No drawings registered yet.</td></tr>}</tbody></table></div>
        </EnterpriseSection>}

        {tab === 'Revision Compare' && <EnterpriseSection title="Revision Compare" description="Track revision chains and flag conflicting or outdated current drawings.">
          {!revisionGroups.length ? <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Register two or more revisions of the same drawing number to build its revision chain.</div> : <div className="grid gap-3 lg:grid-cols-2">{revisionGroups.map(([key, rows]) => <article key={key} className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-[#0B2A3C]">{key}</h3><div className="mt-3 space-y-2">{[...rows].sort((a,b) => String(b.revision).localeCompare(String(a.revision), undefined, { numeric: true })).map(row => <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="font-semibold">Rev {row.revision}</span><span className="text-xs text-slate-500">{row.revision_date || 'No date'} • {row.status}</span></div>)}</div></article>)}</div>}
        </EnterpriseSection>}

        {tab === 'Coordination Review' && <EnterpriseSection title="Coordination Review" description="Deterministic checks run now; PDF/DWG/IFC geometry findings will enter the same register when the analysis worker is enabled." action={canManage ? <button onClick={() => void runReview()} disabled={reviewing} className="inline-flex items-center gap-2 rounded-xl bg-[#0B2A3C] px-4 py-2.5 text-sm font-bold text-white"><Sparkles size={16}/>Run checks</button> : undefined}>
          <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 p-5"><FileDiff className="text-[#08B5A6]"/><h3 className="mt-3 font-bold">Revision integrity</h3><p className="mt-1 text-sm text-slate-500">Conflicting current revisions and outdated current drawings.</p></div><div className="rounded-2xl border border-slate-200 p-5"><Ruler className="text-[#08B5A6]"/><h3 className="mt-3 font-bold">Discipline coverage</h3><p className="mt-1 text-sm text-slate-500">Checks that Architecture, Structural and MEP current sets exist.</p></div><div className="rounded-2xl border border-dashed border-[#08B5A6] bg-[#E8F6F4] p-5"><ScanSearch className="text-[#05969B]"/><h3 className="mt-3 font-bold text-[#0B2A3C]">Geometry analysis ready</h3><p className="mt-1 text-sm text-slate-600">The register is structured for future PDF/DWG overlays, missing-element detection and IFC/BIM clash processing.</p></div></div>
          <div className="mt-5 space-y-3">{issues.filter(item => ['Rule','Revision','Clash','AI'].includes(item.source_type) && !['Resolved','Closed','Rejected'].includes(item.status)).map(issue => <IssueCard key={issue.id} issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/>)}</div>
        </EnterpriseSection>}

        {tab === 'Clash & Risk Register' && <EnterpriseSection title="Clash & Risk Register" description="Confirmed, probable and inferred design risks are recorded here with ownership and resolution evidence." action={canManage ? <button onClick={() => setShowIssue(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Raise design issue</button> : undefined}>
          <div className="space-y-3">{issues.map(issue => <IssueCard key={issue.id} issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/>)}{!issues.length && <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No design coordination issues recorded yet.</div>}</div>
        </EnterpriseSection>}

        {tab === 'Design Rules' && <EnterpriseSection title="Design Rules Library" description="PMOCorex learns from real delivery failures by turning them into repeatable checks for future projects.">
          {!canGovernRules && <div className="mb-4"><EnterpriseNotice tone="info">Rules are visible to the project team. Only PMO, Admin and Workspace Admin govern the rules library.</EnterpriseNotice></div>}
          <div className="grid gap-3 lg:grid-cols-2">{rules.map(rule => <article key={rule.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-[#05969B]">{rule.code} • {rule.category}</div><h3 className="mt-1 font-bold text-[#0B2A3C]">{rule.title}</h3></div><span className={`rounded-full border px-2 py-1 text-xs font-bold ${severityClass(rule.severity)}`}>{rule.severity}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{rule.rule_text}</p>{rule.system_rule && <div className="mt-3 text-xs font-semibold text-slate-400">PMOCorex standard rule</div>}</article>)}</div>
        </EnterpriseSection>}

        {tab === 'Resolution Tracker' && <EnterpriseSection title="Resolution Tracker" description="Close the loop from design finding to verified resolution.">
          <div className="space-y-3">{issues.filter(item => !['Closed','Rejected'].includes(item.status)).map(issue => <IssueCard key={issue.id} issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/>)}</div>
        </EnterpriseSection>}
      </>}

      {showDrawing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-[#05969B]">Drawing register</div><h2 className="mt-1 text-2xl font-bold text-[#0B2A3C]">Register drawing revision</h2></div><button onClick={() => setShowDrawing(false)} className="rounded-lg border border-slate-200 p-2"><X size={17}/></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Drawing number"><input value={drawingForm.drawing_number} onChange={e => setDrawingForm({...drawingForm,drawing_number:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Title"><input value={drawingForm.title} onChange={e => setDrawingForm({...drawingForm,title:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Discipline"><select value={drawingForm.discipline} onChange={e => setDrawingForm({...drawingForm,discipline:e.target.value as DesignDiscipline})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{DISCIPLINES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Revision"><input value={drawingForm.revision} onChange={e => setDrawingForm({...drawingForm,revision:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Revision date"><input type="date" value={drawingForm.revision_date} onChange={e => setDrawingForm({...drawingForm,revision_date:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Status"><select value={drawingForm.status} onChange={e => setDrawingForm({...drawingForm,status:e.target.value as DesignDrawing['status']})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Draft','For Review','Current','Superseded','Void'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Level"><input value={drawingForm.level} onChange={e => setDrawingForm({...drawingForm,level:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Ground floor"/></Field><Field label="Zone"><input value={drawingForm.zone} onChange={e => setDrawingForm({...drawingForm,zone:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><div className="md:col-span-2"><Field label="Drawing URL / document link"><input value={drawingForm.file_url} onChange={e => setDrawingForm({...drawingForm,file_url:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowDrawing(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold">Cancel</button><button onClick={() => void addDrawing()} className="rounded-xl bg-[#08B5A6] px-4 py-2.5 font-bold text-white">Register drawing</button></div></div></div>}

      {showIssue && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-[#05969B]">Coordination finding</div><h2 className="mt-1 text-2xl font-bold text-[#0B2A3C]">Raise design issue</h2></div><button onClick={() => setShowIssue(false)} className="rounded-lg border border-slate-200 p-2"><X size={17}/></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="Issue title"><input value={issueForm.title} onChange={e=>setIssueForm({...issueForm,title:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Terrace level / internal FFL flood risk"/></Field></div><Field label="Category"><select value={issueForm.category} onChange={e=>setIssueForm({...issueForm,category:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Constructability','Clash','Missing Element','Revision Control','Water Ingress','Drainage','Access / Clearance','Discipline Coverage','Other'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Severity"><select value={issueForm.severity} onChange={e=>setIssueForm({...issueForm,severity:e.target.value as DesignIssue['severity']})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Low','Medium','High','Critical'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Responsible team"><select value={issueForm.responsible_team} onChange={e=>setIssueForm({...issueForm,responsible_team:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{RESPONSIBLE_TEAMS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Location"><input value={issueForm.location} onChange={e=>setIssueForm({...issueForm,location:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Living room terrace / Ground floor"/></Field><div className="md:col-span-2"><Field label="Finding"><textarea value={issueForm.description} onChange={e=>setIssueForm({...issueForm,description:e.target.value})} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div><Field label="Possible consequence"><textarea value={issueForm.consequence} onChange={e=>setIssueForm({...issueForm,consequence:e.target.value})} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Recommended review/action"><textarea value={issueForm.recommendation} onChange={e=>setIssueForm({...issueForm,recommendation:e.target.value})} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowIssue(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold">Cancel</button><button onClick={() => void addIssue()} className="rounded-xl bg-[#08B5A6] px-4 py-2.5 font-bold text-white">Raise issue</button></div></div></div>}
    </div>
  )
}

function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label> }

function IssueCard({ issue, canManage, onChange }:{ issue:DesignIssue; canManage:boolean; onChange:(patch:Partial<DesignIssue>)=>Promise<void> }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${severityClass(issue.severity)}`}>{issue.severity}</span><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(issue.status)}`}>{issue.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{issue.source_type}</span><span className="text-xs font-semibold text-slate-400">{issue.confidence} confidence</span></div><h3 className="mt-3 text-lg font-bold text-[#0B2A3C]">{issue.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{issue.description}</p>{issue.location && <div className="mt-2 text-xs text-slate-500"><strong>Location:</strong> {issue.location}</div>}{issue.consequence && <div className="mt-2 text-sm text-slate-600"><strong>Possible consequence:</strong> {issue.consequence}</div>}{issue.recommendation && <div className="mt-1 text-sm text-slate-600"><strong>Recommended action:</strong> {issue.recommendation}</div>}</div><div className="w-full shrink-0 lg:w-52"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Responsible team</div><div className="mt-1 font-bold text-[#0B2A3C]">{issue.responsible_team || 'Unassigned'}</div>{canManage && <select value={issue.status} onChange={e=>void onChange({status:e.target.value as DesignIssue['status']})} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{['Open','Under Review','Accepted','Resolved','Closed','Rejected'].map(x=><option key={x}>{x}</option>)}</select>}</div></div></article>
}

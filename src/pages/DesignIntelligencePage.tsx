import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  BrainCircuit, 
  CheckCircle2,
  FileDiff,
  FileSearch,
  Plus,
  RefreshCw,
  Ruler,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { EnterpriseMetric, EnterpriseNotice, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import {
  getDesignDrawingUrl,
  loadDesignIntelligence,
  runRegisterCoordinationReview,
  saveDesignIssue,
  updateDesignIssue,
  type DesignAnalysisJob,
  type DesignDiscipline,
  type DesignDrawing,
  type DesignIssue,
  type DesignRule,
} from '@/services/designIntelligenceService'

const TABS = ['Drawing Register', 'Revision Compare', 'Coordination Review', 'Clash & Risk Register', 'Design Rules', 'Resolution Tracker'] as const
type Tab = (typeof TABS)[number]

const RESPONSIBLE_TEAMS = ['Design', 'Costing', 'Infrastructure', 'MEP', 'PMO', 'Housebuild', 'Landscaping', 'HSE']

function severityClass(severity: string) {
  if (severity === 'Critical' || severity === 'High') return 'border-red-200 bg-red-50 text-red-700'
  if (severity === 'Medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function statusClass(status: string) {
  if (['Resolved', 'Closed', 'Completed', 'Analysed'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (['Under Review', 'Analysing', 'Queued'].includes(status)) return 'border-teal-200 bg-[#E8F6F4] text-[#05969B]'
  return 'border-red-200 bg-red-50 text-red-700'
}

function modeLabel(mode: DesignAnalysisJob['mode']) {
  if (mode === 'revision_compare') return 'Revision comparison'
  if (mode === 'cross_discipline') return 'Cross-discipline review'
  return 'Drawing review'
}

export default function DesignIntelligencePage() {
  const { projectId, projectName } = useProjectStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusedDocumentId = searchParams.get('document')
  const role = useMembershipStore(state => state.role)
  const canManage = ['workspace_admin', 'admin', 'pmo', 'design'].includes(String(role || '').toLowerCase())
  const canGovernRules = ['workspace_admin', 'admin', 'pmo'].includes(String(role || '').toLowerCase())

  const [tab, setTab] = useState<Tab>('Drawing Register')
  const [drawings, setDrawings] = useState<DesignDrawing[]>([])
  const [issues, setIssues] = useState<DesignIssue[]>([])
  const [rules, setRules] = useState<DesignRule[]>([])
  const [jobs, setJobs] = useState<DesignAnalysisJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showIssue, setShowIssue] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleDiscipline, setRuleDiscipline] = useState('All')
  const [ruleSeverity, setRuleSeverity] = useState('All')
  const [expandedRule, setExpandedRule] = useState<string | null>(null)

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
      setJobs(data.jobs)
    } catch (err: any) {
      setError(err?.message || 'Unable to load Design Intelligence. Run the supplied Supabase migrations first.')
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

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase()
    return rules.filter(rule => {
      const disciplineMatch = ruleDiscipline === 'All' || (rule.disciplines || []).includes(ruleDiscipline) || rule.category === ruleDiscipline
      const severityMatch = ruleSeverity === 'All' || rule.severity === ruleSeverity
      const haystack = [rule.code, rule.title, rule.category, rule.rule_text, ...(rule.disciplines || []), ...(rule.stages || [])].join(' ').toLowerCase()
      return disciplineMatch && severityMatch && (!q || haystack.includes(q))
    })
  }, [rules, ruleSearch, ruleDiscipline, ruleSeverity])

  const ruleDisciplineOptions = ['All','Architecture','Structural','Mechanical','Electrical','Plumbing','Fire / Life Safety','Infrastructure','Landscaping','Cross-Discipline','Constructability']

  const revisionGroups = useMemo(() => {
    const map = new Map<string, DesignDrawing[]>()
    drawings.forEach(item => {
      const key = `${item.discipline} • ${item.drawing_number}`
      map.set(key, [...(map.get(key) || []), item])
    })
    return [...map.entries()].filter(([, rows]) => rows.length > 1)
  }, [drawings])

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
        ? `${result.newFindings} new register/revision finding${result.newFindings === 1 ? '' : 's'} added.`
        : `Register review completed. ${result.totalFindings ? 'No new findings beyond items already recorded.' : 'No register/revision exceptions detected.'}`)
      await load()
      setTab('Coordination Review')
    } catch (err: any) { setError(err?.message || 'Coordination review failed.') }
    finally { setReviewing(false) }
  }

  async function openDrawing(row: DesignDrawing) {
    try {
      const url = await getDesignDrawingUrl(row)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setError(err?.message || 'Could not open drawing.')
    }
  }

  if (!projectId) return <EnterpriseNotice tone="warning">Select a project before opening Design Intelligence.</EnterpriseNotice>

  return (
    <div className="space-y-5 pb-10">
      <EnterprisePageHero
        eyebrow="Design coordination intelligence"
        title="Design Intelligence"
        description="Control drawing revisions from Documents, compare coordinated sets and surface constructability risks before they reach site."
        projectName={projectName}
        actions={<div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/app/documents?type=Drawing')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><FileSearch size={16}/>Open Documents</button>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><RefreshCw size={16}/>Refresh</button>
          {canManage && <button onClick={() => void runReview()} disabled={reviewing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C] disabled:opacity-50"><ScanSearch size={16}/>{reviewing ? 'Checking…' : 'Run register checks'}</button>}
          {canManage && <button disabled title="Automated AI drawing review is planned for a future release." className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500"><BrainCircuit size={16}/>AI review · Coming soon</button>}
        </div>}
      />

      {error && <EnterpriseNotice tone="error"><strong>Design Intelligence could not complete the request.</strong> {error}</EnterpriseNotice>}
      {notice && <EnterpriseNotice tone="success">{notice}</EnterpriseNotice>}
      <EnterpriseNotice tone="info"><strong>Single source of truth:</strong> drawings are uploaded, revised and superseded in Documents. Design Intelligence reads that controlled register and never keeps a separate drawing revision history.</EnterpriseNotice>
      <EnterpriseNotice tone="info"><strong>AI Drawing Review — Coming Soon:</strong> automated multidisciplinary PDF review is prepared for a future release. Design rules, revision control, coordination issues and resolution tracking remain fully available now.</EnterpriseNotice>

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
        {tab === 'Drawing Register' && <EnterpriseSection title="Drawing Register" description="Read-only analysis view of drawings controlled in Documents. Uploads, revisions, approvals and supersession are managed there." action={<button onClick={() => navigate('/app/documents?type=Drawing')} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white"><FileSearch size={16}/>Manage drawings in Documents</button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="p-3">Drawing</th><th>Discipline</th><th>Revision</th><th>Revision date</th><th>Status</th><th>Source</th><th>Analysis</th><th>File / Action</th></tr></thead><tbody>{drawings.map(row => <tr key={row.id} className={`border-b border-slate-100 ${focusedDocumentId && row.document_id === focusedDocumentId ? 'bg-[#E8F6F4]' : ''}`}><td className="p-3"><div className="font-bold text-[#0B2A3C]">{row.drawing_number}</div><div className="text-xs text-slate-500">{row.title}</div></td><td>{row.discipline}</td><td className="font-bold">{row.revision}</td><td>{row.revision_date || '—'}</td><td><span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold">{row.status}</span></td><td><span className="rounded-full bg-[#E8F6F4] px-2 py-1 text-xs font-semibold text-[#05969B]">Documents</span></td><td><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(row.analysis_status || 'Not analysed')}`}>{row.analysis_status || 'Not analysed'}</span></td><td><div className="flex items-center gap-2">{(row.file_path || row.file_url) ? <button onClick={() => void openDrawing(row)} className="font-semibold text-[#05969B]">Open</button> : <span className="text-slate-400">No file</span>}{canManage && (row.file_path || row.file_url) && <span title="Automated AI drawing review is coming soon." className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-400">AI review · Soon</span>}</div></td></tr>)}{!drawings.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No drawing documents are registered yet. Add drawings from Documents first.</td></tr>}</tbody></table></div>
        </EnterpriseSection>}

        {tab === 'Revision Compare' && <EnterpriseSection title="Revision Compare" description="Compare two revisions of the same sheet and surface elements that appear added, removed, moved or materially changed.">
          {!revisionGroups.length ? <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Add two or more revisions of the same drawing number in Documents to build its revision chain.</div> : <div className="grid gap-3 lg:grid-cols-2">{revisionGroups.map(([key, rows]) => { const sorted=[...rows].sort((a,b)=>String(b.revision).localeCompare(String(a.revision),undefined,{numeric:true})); const pair=sorted.filter(x=>x.file_path||x.file_url).slice(0,2); return <article key={key} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-[#0B2A3C]">{key}</h3>{canManage && pair.length===2 && <span title="Automated visual revision comparison is coming soon." className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">AI compare · Coming soon</span>}</div><div className="mt-3 space-y-2">{sorted.map(row => <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="font-semibold">Rev {row.revision}</span><span className="text-xs text-slate-500">{row.revision_date || 'No date'} • {row.status} • {row.file_path||row.file_url?'File ready':'No file'}</span></div>)}</div></article>})}</div>}
        </EnterpriseSection>}

        {tab === 'Coordination Review' && <EnterpriseSection title="Coordination Review" description="Deterministic register and revision checks feed one coordination register. Automated PDF visual review is staged for a future release." action={canManage ? <div className="flex gap-2"><button onClick={() => void runReview()} disabled={reviewing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><Sparkles size={16}/>Run register checks</button><button disabled title="Automated AI coordination review is coming soon." className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500"><BrainCircuit size={16}/>AI review · Coming soon</button></div> : undefined}>
          <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 p-5"><FileDiff className="text-[#08B5A6]"/><h3 className="mt-3 font-bold">Revision integrity</h3><p className="mt-1 text-sm text-slate-500">Conflicting current revisions and outdated current drawings.</p></div><div className="rounded-2xl border border-slate-200 p-5"><Ruler className="text-[#08B5A6]"/><h3 className="mt-3 font-bold">Discipline coordination</h3><p className="mt-1 text-sm text-slate-500">Architecture, Structure and MEP PDFs are reviewed together where available.</p></div><div className="rounded-2xl border border-[#08B5A6] bg-[#E8F6F4] p-5"><ScanSearch className="text-[#05969B]"/><h3 className="mt-3 font-bold text-[#0B2A3C]">Constructability review</h3><p className="mt-1 text-sm text-slate-600">Flags probable missing elements, level/drainage risks and visible coordination concerns for human confirmation.</p></div></div>
          <div className="mt-6"><h3 className="font-bold text-[#0B2A3C]">Recent analysis runs</h3><div className="mt-3 space-y-2">{jobs.slice(0,6).map(job => <div key={job.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold text-[#0B2A3C]">{modeLabel(job.mode)}</div><div className="text-xs text-slate-500">{new Date(job.created_at).toLocaleString()} • {job.drawing_ids.length} drawing(s)</div></div><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(job.status)}`}>{job.status}</span></div>{job.result_summary && <p className="mt-2 text-sm text-slate-600">{job.result_summary}</p>}{job.status==='Completed' && <div className="mt-1 text-xs font-semibold text-[#05969B]">{job.finding_count} new finding(s)</div>}{job.error_message && <div className="mt-2 text-xs text-red-600">{job.error_message}</div>}</div>)}{!jobs.length && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">AI drawing review is coming soon. No paid AI service is required for the current Design Intelligence workflow.</div>}</div></div>
          <div className="mt-6 space-y-3">{issues.filter(item => ['Rule','Revision','Clash','AI'].includes(item.source_type) && !['Resolved','Closed','Rejected'].includes(item.status)).map(issue => <IssueCard key={issue.id} issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/>)}</div>
        </EnterpriseSection>}

        {tab === 'Clash & Risk Register' && <EnterpriseSection title="Clash & Risk Register" description="Confirmed, probable and inferred design risks are recorded here with ownership and resolution evidence." action={canManage ? <button onClick={() => setShowIssue(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Raise design issue</button> : undefined}>
          <div className="space-y-3">{issues.map(issue => <IssueCard key={issue.id} issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/>)}{!issues.length && <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No design coordination issues recorded yet.</div>}</div>
        </EnterpriseSection>}

        {tab === 'Design Rules' && <EnterpriseSection title="Design Rules Library" description="A governed construction coordination library across Architecture, Structure, MEP, Fire, Infrastructure, Landscape and constructability. Rules are review prompts, not professional design certification.">
          {!canGovernRules && <div className="mb-4"><EnterpriseNotice tone="info">Rules are visible to the project team. Only PMO, Admin and Workspace Admin govern the rules library.</EnterpriseNotice></div>}
          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block"><Search size={16} className="absolute left-3 top-3.5 text-slate-400"/><input value={ruleSearch} onChange={e=>setRuleSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder="Search rule, risk, stage or discipline…"/></label>
            <select value={ruleDiscipline} onChange={e=>setRuleDiscipline(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#0B2A3C]">{ruleDisciplineOptions.map(x=><option key={x}>{x}</option>)}</select>
            <select value={ruleSeverity} onChange={e=>setRuleSeverity(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#0B2A3C]">{['All','Critical','High','Medium','Low'].map(x=><option key={x}>{x}</option>)}</select>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm"><div className="font-semibold text-[#0B2A3C]">{filteredRules.length} of {rules.length} active rules</div><div className="text-xs text-slate-500">PMOCorex Standard • Lessons Learned • Project-Specific</div></div>
          <div className="grid gap-3 lg:grid-cols-2">{filteredRules.map(rule => { const open=expandedRule===rule.id; return <article key={rule.id} className="rounded-2xl border border-slate-200 p-5"><button onClick={()=>setExpandedRule(open?null:rule.id)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-[#05969B]">{rule.code} • {rule.category}</div><h3 className="mt-1 font-bold text-[#0B2A3C]">{rule.title}</h3></div><span className={`rounded-full border px-2 py-1 text-xs font-bold ${severityClass(rule.severity)}`}>{rule.severity}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{rule.rule_text}</p><div className="mt-3 flex flex-wrap gap-1.5">{(rule.disciplines||[]).map(x=><span key={x} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{x}</span>)}</div></button>{open && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm md:grid-cols-2">{rule.why_it_matters && <div><strong className="text-[#0B2A3C]">Why it matters</strong><p className="mt-1 text-slate-600">{rule.why_it_matters}</p></div>}{rule.verification && <div><strong className="text-[#0B2A3C]">What to verify</strong><p className="mt-1 text-slate-600">{rule.verification}</p></div>}{rule.evidence_required && <div><strong className="text-[#0B2A3C]">Evidence</strong><p className="mt-1 text-slate-600">{rule.evidence_required}</p></div>}{rule.resolution_guidance && <div><strong className="text-[#0B2A3C]">Resolution guidance</strong><p className="mt-1 text-slate-600">{rule.resolution_guidance}</p></div>}<div className="md:col-span-2 text-xs font-semibold text-slate-400">{rule.source_class || (rule.system_rule?'PMOCorex Standard':'Project-Specific')} • {(rule.stages||[]).join(' • ')}</div></div>}</article>})}</div>
          {!filteredRules.length && <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No rules match these filters.</div>}
        </EnterpriseSection>}

        {tab === 'Resolution Tracker' && <EnterpriseSection title="Resolution Tracker" description="Close the loop from design finding to verified resolution.">
          <div className="space-y-3">{issues.filter(item => !['Closed','Rejected'].includes(item.status)).map(issue => <IssueCard key={issue.id} issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/>)}</div>
        </EnterpriseSection>}
      </>}


      {showIssue && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-[#05969B]">Coordination finding</div><h2 className="mt-1 text-2xl font-bold text-[#0B2A3C]">Raise design issue</h2></div><button onClick={() => setShowIssue(false)} className="rounded-lg border border-slate-200 p-2"><X size={17}/></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="Issue title"><input value={issueForm.title} onChange={e=>setIssueForm({...issueForm,title:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Terrace level / internal FFL flood risk"/></Field></div><Field label="Category"><select value={issueForm.category} onChange={e=>setIssueForm({...issueForm,category:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Constructability','Clash','Missing Element','Revision Control','Water Ingress','Drainage','Access / Clearance','Discipline Coverage','Other'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Severity"><select value={issueForm.severity} onChange={e=>setIssueForm({...issueForm,severity:e.target.value as DesignIssue['severity']})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Low','Medium','High','Critical'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Responsible team"><select value={issueForm.responsible_team} onChange={e=>setIssueForm({...issueForm,responsible_team:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{RESPONSIBLE_TEAMS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Location"><input value={issueForm.location} onChange={e=>setIssueForm({...issueForm,location:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Living room terrace / Ground floor"/></Field><div className="md:col-span-2"><Field label="Finding"><textarea value={issueForm.description} onChange={e=>setIssueForm({...issueForm,description:e.target.value})} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div><Field label="Possible consequence"><textarea value={issueForm.consequence} onChange={e=>setIssueForm({...issueForm,consequence:e.target.value})} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Recommended review/action"><textarea value={issueForm.recommendation} onChange={e=>setIssueForm({...issueForm,recommendation:e.target.value})} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowIssue(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold">Cancel</button><button onClick={() => void addIssue()} className="rounded-xl bg-[#08B5A6] px-4 py-2.5 font-bold text-white">Raise issue</button></div></div></div>}
    </div>
  )
}

function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label> }

function IssueCard({ issue, canManage, onChange }:{ issue:DesignIssue; canManage:boolean; onChange:(patch:Partial<DesignIssue>)=>Promise<void> }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${severityClass(issue.severity)}`}>{issue.severity}</span><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(issue.status)}`}>{issue.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{issue.source_type}</span><span className="text-xs font-semibold text-slate-400">{issue.confidence} confidence</span></div><h3 className="mt-3 text-lg font-bold text-[#0B2A3C]">{issue.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{issue.description}</p>{issue.location && <div className="mt-2 text-xs text-slate-500"><strong>Location:</strong> {issue.location}</div>}{issue.consequence && <div className="mt-2 text-sm text-slate-600"><strong>Possible consequence:</strong> {issue.consequence}</div>}{issue.recommendation && <div className="mt-1 text-sm text-slate-600"><strong>Recommended action:</strong> {issue.recommendation}</div>}</div><div className="w-full shrink-0 lg:w-52"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Responsible team</div><div className="mt-1 font-bold text-[#0B2A3C]">{issue.responsible_team || 'Unassigned'}</div>{canManage && <select value={issue.status} onChange={e=>void onChange({status:e.target.value as DesignIssue['status']})} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{['Open','Under Review','Accepted','Resolved','Closed','Rejected'].map(x=><option key={x}>{x}</option>)}</select>}</div></div></article>
}

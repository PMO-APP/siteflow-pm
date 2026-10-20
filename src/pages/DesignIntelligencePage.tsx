import { supabase } from '@/lib/supabase'
import DesignCollaboration from '@/components/design/DesignCollaboration'
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
  queueDesignAnalysis,
  runRegisterCoordinationReview,
  saveDesignIssue,
  updateDesignIssue,
  type DesignAnalysisJob,
  type DesignDiscipline,
  type DesignDrawing,
  type DesignIssue,
  type DesignRule,
} from '@/services/designIntelligenceService'

const TABS = ['Drawing Register', 'Revision Compare', 'Coordination Review', 'Design Issues', 'Design Rules', 'Resolution Tracker'] as const
type Tab = (typeof TABS)[number]

const RESPONSIBLE_TEAMS = ['Design', 'Architecture', 'Structural', 'Mechanical', 'Electrical', 'Plumbing', 'MEP', 'Fire', 'Infrastructure', 'Civil', 'Landscaping', 'Costing', 'Housebuild', 'HSE', 'PMO', 'Contractor', 'Consultant', 'Cross-Discipline']
const TECHNICAL_OWNERS = ['Design', 'Housebuild', 'MEP', 'Infrastructure', 'Landscaping', 'Cross-Discipline']

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

export default function DesignIntelligencePage({ section = 'intelligence' }: { section?: 'reviews' | 'intelligence' }) {
  const { projectId, projectName } = useProjectStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusedDocumentId = searchParams.get('document')
  const visibleTabs: readonly Tab[] = section === 'reviews'
    ? ['Revision Compare', 'Coordination Review']
    : ['Design Issues', 'Design Rules']
  const role = useMembershipStore(state => state.role)
  const canManage = ['workspace_admin', 'admin', 'design'].includes(String(role || '').toLowerCase())
  const canGovernRules = ['workspace_admin', 'admin'].includes(String(role || '').toLowerCase())

  const [tab, setTab] = useState<Tab>(section === 'reviews' ? 'Coordination Review' : 'Design Issues')
  const [drawings, setDrawings] = useState<DesignDrawing[]>([])
  const [selectedDrawingId, setSelectedDrawingId] = useState('project-coordination')
  const [issues, setIssues] = useState<DesignIssue[]>([])
  const [rules, setRules] = useState<DesignRule[]>([])
  const [jobs, setJobs] = useState<DesignAnalysisJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showIssue, setShowIssue] = useState(false)
  const [issueView, setIssueView] = useState<'active' | 'history' | 'gallery'>('active')
  const [galleryFiles, setGalleryFiles] = useState<any[]>([])
  const [galleryError, setGalleryError] = useState('')
  const [gallerySearch, setGallerySearch] = useState('')
  const [auditByIssue, setAuditByIssue] = useState<Record<string, any[]>>({})
  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const [newIssueFiles, setNewIssueFiles] = useState<File[]>([])
  const [newIssueCaption, setNewIssueCaption] = useState('')
  const [newIssueError, setNewIssueError] = useState('')
  const [savingIssue, setSavingIssue] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [analysingKey, setAnalysingKey] = useState<string | null>(null)
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleDiscipline, setRuleDiscipline] = useState('All')
  const [ruleSeverity, setRuleSeverity] = useState('All')
  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  const [issueForm, setIssueForm] = useState({
    title: '', category: 'Constructability', severity: 'High' as DesignIssue['severity'],
    description: '', consequence: '', recommendation: '', responsible_team: 'Design', technical_owner: 'Cross-Discipline', location: '',
  })

  const archivedStatuses = ['Resolved', 'Closed', 'Rejected']
  const isIssueDirty = Boolean(issueForm.title.trim() || issueForm.description.trim() || issueForm.consequence.trim() || issueForm.recommendation.trim() || issueForm.location.trim() || newIssueFiles.length || newIssueCaption.trim())
  function closeIssueForm() {
    if (savingIssue) return
    if (isIssueDirty && !window.confirm('Discard this unsaved design issue and selected attachments?')) return
    setShowIssue(false)
    setNewIssueError('')
  }
  async function changeIssueStatus(issue: DesignIssue, status: DesignIssue['status']) {
    if (!canManage || statusBusy || projectId == null) return
    const isClosing = archivedStatuses.includes(status)
    const note = window.prompt(isClosing ? 'Resolution / closure reason (required for audit history):' : 'Reason for status change / reopening:', '')
    if (note === null) return
    if (isClosing && !note.trim()) { window.alert('Please enter a resolution or closure reason.'); return }
    setStatusBusy(issue.id)
    try {
      await updateDesignIssue(projectId, issue.id, { status })
      if (note.trim()) {
        const { data: auth } = await supabase.auth.getUser()
        const { error } = await supabase.from('design_collaboration_comments').insert({
          project_id: Number(projectId), context_type: 'issue', context_id: String(issue.id),
          body: `Status: ${issue.status} → ${status}. ${note.trim()}`, author_id: auth.user?.id,
        })
        if (error) setNotice(`Status saved, but the explanation could not be posted: ${error.message}`)
      }
      await load()
    } catch (e: any) { setNotice(e?.message || 'Could not update issue status') }
    finally { setStatusBusy(null) }
  }
  async function loadGallery() {
    if (!projectId) return
    setGalleryError('')
    const { data, error } = await supabase.from('design_collaboration_files').select('id,project_id,context_type,context_id,file_name,mime_type,caption,location,storage_path,created_at').eq('project_id',Number(projectId)).order('created_at',{ascending:false}).limit(500)
    if (error) { setGalleryError(error.message); return }
    setGalleryFiles(data || [])
  }
  async function openGalleryFile(file: any) {
    const { data, error } = await supabase.storage.from('design-collaboration').createSignedUrl(file.storage_path, 120)
    if (error || !data?.signedUrl) { setGalleryError(error?.message || 'Unable to open private evidence'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  async function loadAudit() {
    if (!projectId) return
    const {data,error} = await supabase.from('design_issue_status_audit').select('issue_id,old_status,new_status,changed_at,changed_by').eq('project_id',Number(projectId)).order('changed_at',{ascending:false}).limit(500)
    if (error) return // History remains accessible even before the optional audit migration.
    const grouped: Record<string, any[]> = {}
    for (const row of data || []) (grouped[String(row.issue_id)] ||= []).push(row)
    setAuditByIssue(grouped)
  }
  useEffect(() => { if (issueView === 'gallery') void loadGallery(); if (issueView === 'history') void loadAudit() }, [issueView, projectId])

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
      pendingDistribution: drawings.filter(item => item.status === 'Current' && (item.distribution_status !== 'Distributed' || !(item.distributed_to || []).length)).length,
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
    if (!projectId || !issueForm.title.trim() || !issueForm.description.trim() || savingIssue) return
    setNewIssueError('')
    const permitted = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (newIssueFiles.some(file => !permitted.includes(file.type) || file.size > 15 * 1024 * 1024)) {
      setNewIssueError('Only PDF, JPG, PNG or WebP files up to 15 MB each are allowed.')
      return
    }
    setSavingIssue(true)
    let created: DesignIssue | null = null
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error('Sign in again before creating an issue.')
      created = await saveDesignIssue(projectId, {
        ...issueForm,
        disciplines: [], drawing_ids: [], confidence: 'Confirmed', source_type: 'Manual',
        document_custodian: 'Design', action_owner: issueForm.responsible_team, status: 'Open',
      })
      for (const file of newIssueFiles) {
        const path = `${projectId}/issue/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: uploadError } = await supabase.storage.from('design-collaboration').upload(path, file, { upsert: false, contentType: file.type })
        if (uploadError) throw uploadError
        const { error: recordError } = await supabase.from('design_collaboration_files').insert({
          project_id: Number(projectId), context_type: 'issue', context_id: String(created.id),
          storage_path: path, file_name: file.name, mime_type: file.type,
          caption: newIssueCaption.trim() || null, location: issueForm.location.trim() || null,
          uploaded_by: authData.user.id,
        })
        if (recordError) {
          await supabase.storage.from('design-collaboration').remove([path])
          throw recordError
        }
      }
      setShowIssue(false)
      setNewIssueFiles([])
      setNewIssueCaption('')
      setIssueForm({ title: '', category: 'Constructability', severity: 'High', description: '', consequence: '', recommendation: '', responsible_team: 'Design', technical_owner: 'Cross-Discipline', location: '' })
      await load()
    } catch (err: any) {
      setNewIssueError(created
        ? `Issue created, but one or more attachments could not be uploaded: ${err?.message || 'Unknown error'}. Close this form and add any missing files under the saved issue.`
        : err?.message || 'Could not create coordination issue.')
      if (created) await load()
    } finally {
      setSavingIssue(false)
    }
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

  async function analyseDrawings(drawingIds: string[], mode: 'single_drawing' | 'revision_compare' | 'cross_discipline', key: string) {
    if (!projectId || !drawingIds.length) return
    setAnalysingKey(key)
    setError('')
    setNotice('')
    try {
      const result = await queueDesignAnalysis(projectId, drawingIds, mode)
      setNotice(result?.summary || `Design analysis completed with ${result?.findings ?? 0} new finding(s).`)
      await load()
      setTab('Coordination Review')
    } catch (err: any) {
      setError(err?.message || 'Automated design review failed.')
      await load()
    } finally {
      setAnalysingKey(null)
    }
  }

  async function runCrossDisciplineAnalysis() {
    const currentPdfs = drawings.filter(row => row.status === 'Current' && (row.file_path || row.file_url) && (String(row.mime_type || '').toLowerCase() === 'application/pdf' || String(row.file_name || row.file_path || '').toLowerCase().endsWith('.pdf')))
    if (currentPdfs.length < 2) {
      setError('Cross-discipline AI review needs at least two current PDF drawings in Documents.')
      return
    }
    await analyseDrawings(currentPdfs.map(row => row.id), 'cross_discipline', 'cross-discipline')
  }

  if (!projectId) return <EnterpriseNotice tone="warning">Select a project before opening Design Intelligence.</EnterpriseNotice>

  return (
    <div className="space-y-5 pb-10">
      <EnterprisePageHero
        eyebrow="Design coordination intelligence"
        title={section === 'reviews' ? 'Design Reviews' : 'Design Intelligence'}
        description={section === 'reviews' ? 'Review coordinated drawings, revisions and technical findings before construction.' : 'Monitor design risks, constructability concerns and design quality rules.'}
        projectName={projectName}
        actions={<div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/app/documents?type=Drawing')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><FileSearch size={16}/>Open Documents</button>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><RefreshCw size={16}/>Refresh</button>
          {canManage && <button onClick={() => void runReview()} disabled={reviewing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C] disabled:opacity-50"><ScanSearch size={16}/>{reviewing ? 'Checking…' : 'Run register checks'}</button>}
          {canManage && <button onClick={() => void runCrossDisciplineAnalysis()} disabled={!!analysingKey} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"><BrainCircuit size={16}/>{analysingKey === 'cross-discipline' ? 'Analysing…' : 'AI coordination review'}</button>}
        </div>}
      />

      {error && <EnterpriseNotice tone="error"><strong>Design Intelligence could not complete the request.</strong> {error}</EnterpriseNotice>}
      {notice && <EnterpriseNotice tone="success">{notice}</EnterpriseNotice>}
      <EnterpriseNotice tone="info"><strong>Single source of truth:</strong> drawings are uploaded, revised and superseded in Documents. Design Intelligence reads that controlled register and never keeps a separate drawing revision history.</EnterpriseNotice>
      {section === 'reviews' && <EnterpriseNotice tone="info"><strong>AI Drawing Review — Coming Soon:</strong> automated multidisciplinary PDF review is prepared for a future release. Design rules, revision control, coordination issues and resolution tracking remain fully available now.</EnterpriseNotice>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <EnterpriseMetric label="Current drawings" value={stats.currentDrawings} helper="Registered current set" icon={FileSearch}/>
        <EnterpriseMetric label="Drawing records" value={stats.revisions} helper="All revisions" icon={FileDiff}/>
        <EnterpriseMetric label="Awaiting distribution" value={stats.pendingDistribution} helper="Design action" icon={RefreshCw} tone={stats.pendingDistribution ? 'red' : 'green'}/>
        <EnterpriseMetric label="Open Design Issues" value={stats.openIssues} helper="Require review" icon={AlertTriangle} tone={stats.openIssues ? 'red' : 'green'}/>
        <EnterpriseMetric label="High / critical" value={stats.critical} helper="Management attention" icon={ShieldCheck} tone={stats.critical ? 'red' : 'green'}/>
        <EnterpriseMetric label="Resolved" value={stats.resolved} helper="Closed design issues" icon={CheckCircle2} tone="green"/>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {visibleTabs.map(item => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === item ? 'bg-[#0B2A3C] text-white' : 'text-[#0B2A3C] hover:bg-[#E8F6F4]'}`}>{item}</button>)}
      </div>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading Design Intelligence…</div> : <>
        {tab === 'Drawing Register' && <EnterpriseSection title="Drawing Register" description="Read-only analysis view of drawings controlled in Documents. Uploads, revisions, approvals and supersession are managed there." action={<button onClick={() => navigate('/app/documents?type=Drawing')} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white"><FileSearch size={16}/>Manage drawings in Documents</button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[1420px] text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="p-3">Drawing</th><th>Discipline</th><th>Originator</th><th>Revision</th><th>Received</th><th>Status</th><th>Custodian</th><th>Distribution</th><th>Analysis</th><th>File / Action</th></tr></thead><tbody>{drawings.map(row => <tr key={row.id} className={`border-b border-slate-100 ${focusedDocumentId && row.document_id === focusedDocumentId ? 'bg-[#E8F6F4]' : ''}`}><td className="p-3"><div className="font-bold text-[#0B2A3C]">{row.drawing_number}</div><div className="text-xs text-slate-500">{row.title}</div></td><td>{row.discipline}</td><td><div className="font-semibold text-[#0B2A3C]">{row.originator_name || 'External consultant'}</div><div className="text-[11px] text-slate-400">Source</div></td><td className="font-bold">{row.revision}</td><td>{row.received_date || row.revision_date || '—'}</td><td><span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold">{row.status}</span></td><td><span className="rounded-full bg-[#E8F6F4] px-2 py-1 text-xs font-semibold text-[#05969B]">{row.document_custodian || 'Design'}</span></td><td><div><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${row.distribution_status === 'Distributed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{row.distribution_status || 'Not distributed'}</span>{(row.distributed_to || []).length > 0 && <div className="mt-1 text-[11px] text-slate-500">{(row.distributed_to || []).join(', ')}</div>}{row.transmittal_reference && <div className="text-[10px] text-slate-400">{row.transmittal_reference}</div>}</div></td><td><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(row.analysis_status || 'Not analysed')}`}>{row.analysis_status || 'Not analysed'}</span></td><td><div className="flex items-center gap-2">{(row.file_path || row.file_url) ? <button onClick={() => void openDrawing(row)} className="font-semibold text-[#05969B]">Open</button> : <span className="text-slate-400">No file</span>}{canManage && (row.file_path || row.file_url) && <button onClick={() => void analyseDrawings([row.id], 'single_drawing', row.id)} disabled={!!analysingKey || !(String(row.mime_type || '').toLowerCase() === 'application/pdf' || String(row.file_name || row.file_path || '').toLowerCase().endsWith('.pdf'))} title="Run conservative AI review of this controlled PDF. Findings require human confirmation." className="rounded-lg border border-[#08B5A6] px-2.5 py-1.5 text-xs font-bold text-[#05969B] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">{analysingKey === row.id ? 'Analysing…' : 'Analyse'}</button>}</div></td></tr>)}{!drawings.length && <tr><td colSpan={10} className="p-8 text-center text-slate-500">No drawing documents are registered yet. Add drawings from Documents first.</td></tr>}</tbody></table></div>
        </EnterpriseSection>}

        {tab === 'Revision Compare' && <EnterpriseSection title="Revision Compare" description="Compare two revisions of the same sheet and surface elements that appear added, removed, moved or materially changed.">
          {!revisionGroups.length ? <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Add two or more revisions of the same drawing number in Documents to build its revision chain.</div> : <div className="grid gap-3 lg:grid-cols-2">{revisionGroups.map(([key, rows]) => { const sorted=[...rows].sort((a,b)=>String(b.revision).localeCompare(String(a.revision),undefined,{numeric:true})); const pair=sorted.filter(x=>x.file_path||x.file_url).slice(0,2); return <article key={key} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-[#0B2A3C]">{key}</h3>{canManage && pair.length===2 && <button onClick={() => void analyseDrawings(pair.map(row => row.id), 'revision_compare', `revision:${key}`)} disabled={!!analysingKey} className="rounded-lg bg-[#08B5A6] px-3 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">{analysingKey === `revision:${key}` ? 'Comparing…' : 'AI compare revisions'}</button>}</div><div className="mt-3 space-y-2">{sorted.map(row => <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="font-semibold">Rev {row.revision}</span><span className="text-xs text-slate-500">{row.revision_date || 'No date'} • {row.status} • {row.file_path||row.file_url?'File ready':'No file'}</span></div>)}</div></article>})}</div>}
        </EnterpriseSection>}

        {tab === 'Coordination Review' && <EnterpriseSection title="Coordination Review" description="Register checks and conservative AI PDF review feed one coordination register. AI findings require human confirmation before they are treated as design decisions." action={canManage ? <div className="flex gap-2"><button onClick={() => void runReview()} disabled={reviewing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A3C]"><Sparkles size={16}/>Run register checks</button><button onClick={() => void runCrossDisciplineAnalysis()} disabled={!!analysingKey} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"><BrainCircuit size={16}/>{analysingKey === 'cross-discipline' ? 'Analysing…' : 'Run AI coordination review'}</button></div> : undefined}>
          <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 p-5"><FileDiff className="text-[#08B5A6]"/><h3 className="mt-3 font-bold">Revision integrity</h3><p className="mt-1 text-sm text-slate-500">Conflicting current revisions and outdated current drawings.</p></div><div className="rounded-2xl border border-slate-200 p-5"><Ruler className="text-[#08B5A6]"/><h3 className="mt-3 font-bold">Discipline coordination</h3><p className="mt-1 text-sm text-slate-500">Architecture, Structure and MEP PDFs are reviewed together where available.</p></div><div className="rounded-2xl border border-[#08B5A6] bg-[#E8F6F4] p-5"><ScanSearch className="text-[#05969B]"/><h3 className="mt-3 font-bold text-[#0B2A3C]">Constructability review</h3><p className="mt-1 text-sm text-slate-600">Flags probable missing elements, level/drainage risks and visible coordination concerns for human confirmation.</p></div></div>
          <div className="mt-6"><h3 className="font-bold text-[#0B2A3C]">Recent analysis runs</h3><div className="mt-3 space-y-2">{jobs.slice(0,6).map(job => <div key={job.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold text-[#0B2A3C]">{modeLabel(job.mode)}</div><div className="text-xs text-slate-500">{new Date(job.created_at).toLocaleString()} • {job.drawing_ids.length} drawing(s)</div></div><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(job.status)}`}>{job.status}</span></div>{job.result_summary && <p className="mt-2 text-sm text-slate-600">{job.result_summary}</p>}{job.status==='Completed' && <div className="mt-1 text-xs font-semibold text-[#05969B]">{job.finding_count} new finding(s)</div>}{job.error_message && <div className="mt-2 text-xs text-red-600">{job.error_message}</div>}</div>)}{!jobs.length && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No AI analysis runs yet. Run a drawing, revision or cross-discipline review to create the first analysis record.</div>}</div></div>
          <div className="mt-6 space-y-3">{issues.filter(item => ['Rule','Revision','Clash','AI'].includes(item.source_type) && !['Resolved','Closed','Rejected'].includes(item.status)).map(issue => <div key={issue.id} className="space-y-2"><IssueCard issue={issue} canManage={canManage} onChange={async patch => { await updateDesignIssue(projectId, issue.id, patch); await load() }}/><DesignCollaboration projectId={projectId} context="issue" contextId={String(issue.id)} canEdit={canManage} heading={`Supporting drawings, photographs and discussion: ${issue.title}`} /></div>)}</div>
        </EnterpriseSection>}

        {section === 'reviews' && <div className="space-y-3"><label className="block text-sm font-semibold text-[#102943]">Review against controlled drawing (optional)<select className="form-control mt-2" value={selectedDrawingId} onChange={e=>setSelectedDrawingId(e.target.value)}><option value="project-coordination">General coordination / upload draft for review</option>{drawings.map(d=><option key={d.id} value={String(d.id)}>{String((d as any).title || (d as any).name || d.id)}</option>)}</select></label><DesignCollaboration projectId={projectId} context="review" contextId={selectedDrawingId} canEdit={canManage} heading="Shared drawings, revisions and review discussion" /></div>}

      {tab === 'Design Issues' && <EnterpriseSection title="Design Issues & Coordination" description="Track design issues, coordination clashes and constructability concerns, with assigned owners and resolution evidence." action={canManage ? <button onClick={() => setShowIssue(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#08B5A6] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Raise design issue</button> : undefined}>
          <div className="mb-4 flex flex-wrap gap-2">{([['active','Active Issues'],['history','Resolution History'],['gallery','Evidence Gallery']] as const).map(([key,label]) => <button key={key} onClick={() => setIssueView(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${issueView === key ? 'bg-[#0B2A3C] text-white' : 'border border-slate-200 bg-white text-[#0B2A3C]'}`}>{label}</button>)}</div>
          {issueView === 'gallery' && <div className="space-y-3"><p className="text-sm text-slate-500">Private project evidence from Design Issues, Reviews and Weekly Reports. Drawings here are not automatically approved construction documents.</p><div className="flex gap-2"><input className="w-full rounded-xl border border-slate-200 px-3 py-2" value={gallerySearch} onChange={e => setGallerySearch(e.target.value)} placeholder="Search file name, caption, location or source"/><button className="rounded-xl border px-3 py-2" onClick={() => void loadGallery()}>Refresh</button></div>{galleryError && <p role="alert" className="text-sm text-red-700">{galleryError}</p>}<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{galleryFiles.filter(f => [f.file_name,f.caption,f.location,f.context_type].join(' ').toLowerCase().includes(gallerySearch.toLowerCase())).map(f => <article key={f.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="break-all font-semibold">{f.file_name}</div><div className="mt-1 text-xs text-slate-500">{f.context_type} · {new Date(f.created_at).toLocaleString()} · {f.location || 'No location'}</div><p className="mt-2 text-sm">{f.caption || 'No caption'}</p><button onClick={() => void openGalleryFile(f)} className="mt-3 text-sm font-bold text-teal-700 underline">Open secure file</button></article>)}</div>{!galleryFiles.length && <p className="text-sm text-slate-500">No accessible collaboration files found for this project.</p>}</div>}
          {issueView !== 'gallery' && <div className="space-y-3">{issues.filter(item => issueView === 'history' ? archivedStatuses.includes(item.status) : !archivedStatuses.includes(item.status)).map(issue => <div key={issue.id} className="space-y-2"><IssueCard issue={issue} canManage={canManage} onChange={async patch => { if (patch.status) await changeIssueStatus(issue, patch.status); else { await updateDesignIssue(projectId, issue.id, patch); await load() } }}/><DesignCollaboration projectId={projectId} context="issue" contextId={String(issue.id)} canEdit={canManage} heading={`Supporting drawings, photographs and discussion: ${issue.title}`} />{issueView === 'history' && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><h4 className="text-sm font-bold">Status audit history</h4>{(auditByIssue[String(issue.id)] || []).map((a,i) => <p key={i} className="mt-1 text-xs text-slate-600">{new Date(a.changed_at).toLocaleString()}: {a.old_status || 'Created'} → {a.new_status}</p>)}{!(auditByIssue[String(issue.id)] || []).length && <p className="mt-1 text-xs text-slate-500">No audit events available yet. Existing comments and evidence are retained above.</p>}</div>}</div>)}</div>}

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


      </>}


      {showIssue && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5"><div><div className="text-xs font-bold uppercase tracking-wider text-[#05969B]">Coordination finding</div><h2 className="mt-1 text-2xl font-bold text-[#0B2A3C]">Raise design issue</h2></div><button onClick={closeIssueForm} className="rounded-lg border border-slate-200 p-2"><X size={17}/></button></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5"><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="Issue title"><input value={issueForm.title} onChange={e=>setIssueForm({...issueForm,title:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Terrace level / internal FFL flood risk"/></Field></div><Field label="Category"><select value={issueForm.category} onChange={e=>setIssueForm({...issueForm,category:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Constructability','Clash','Missing Element','Revision Control','Water Ingress','Drainage','Access / Clearance','Discipline Coverage','Other'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Severity"><select value={issueForm.severity} onChange={e=>setIssueForm({...issueForm,severity:e.target.value as DesignIssue['severity']})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{['Low','Medium','High','Critical'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Action owner"><select value={issueForm.responsible_team} onChange={e=>setIssueForm({...issueForm,responsible_team:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{RESPONSIBLE_TEAMS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Technical owner"><select value={issueForm.technical_owner} onChange={e=>setIssueForm({...issueForm,technical_owner:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">{TECHNICAL_OWNERS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Location"><input value={issueForm.location} onChange={e=>setIssueForm({...issueForm,location:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Living room terrace / Ground floor"/></Field><div className="md:col-span-2"><Field label="Finding"><textarea value={issueForm.description} onChange={e=>setIssueForm({...issueForm,description:e.target.value})} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div><Field label="Possible consequence"><textarea value={issueForm.consequence} onChange={e=>setIssueForm({...issueForm,consequence:e.target.value})} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field><Field label="Recommended review/action"><textarea value={issueForm.recommendation} onChange={e=>setIssueForm({...issueForm,recommendation:e.target.value})} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></Field></div><div className="mt-4 space-y-2 rounded-xl border border-slate-200 p-3"><label className="block text-sm font-semibold text-[#102943]">Supporting drawings, photographs or PDFs (optional)<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-2 block w-full text-sm" onChange={e => setNewIssueFiles(Array.from(e.target.files || []))} disabled={savingIssue}/></label><input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Evidence caption / drawing reference (optional)" value={newIssueCaption} onChange={e => setNewIssueCaption(e.target.value)} disabled={savingIssue}/><p className="text-xs text-slate-500">{newIssueFiles.length} selected. PDF, JPG, PNG or WebP, up to 15 MB each. Files are linked to the issue after it is created and remain private.</p></div>{newIssueError && <p role="alert" className="mt-3 text-sm text-red-700">{newIssueError}</p>}</div><div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white p-4"><button onClick={closeIssueForm} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold">Cancel</button><button onClick={() => void addIssue()} disabled={savingIssue || !issueForm.title.trim() || !issueForm.description.trim()} className="rounded-xl bg-[#08B5A6] px-4 py-2.5 font-bold text-white">{savingIssue ? 'Saving issue and evidence…' : 'Raise issue'}</button></div></div></div>}
    </div>
  )
}

function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label> }

function IssueCard({ issue, canManage, onChange }:{ issue:DesignIssue; canManage:boolean; onChange:(patch:Partial<DesignIssue>)=>Promise<void> }) {
  const actionOwner = issue.action_owner || issue.responsible_team || 'Unassigned'
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${severityClass(issue.severity)}`}>{issue.severity}</span><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(issue.status)}`}>{issue.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{issue.source_type}</span><span className="text-xs font-semibold text-slate-400">{issue.confidence} confidence</span></div><h3 className="mt-3 text-lg font-bold text-[#0B2A3C]">{issue.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{issue.description}</p>{issue.location && <div className="mt-2 text-xs text-slate-500"><strong>Location:</strong> {issue.location}</div>}{issue.consequence && <div className="mt-2 text-sm text-slate-600"><strong>Possible consequence:</strong> {issue.consequence}</div>}{issue.recommendation && <div className="mt-1 text-sm text-slate-600"><strong>Recommended action:</strong> {issue.recommendation}</div>}</div><div className="w-full shrink-0 lg:w-64"><div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 lg:grid-cols-1"><div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document custodian</div><div className="mt-0.5 font-bold text-[#0B2A3C]">{issue.document_custodian || 'Design'}</div></div><div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Technical owner</div><div className="mt-0.5 font-bold text-[#0B2A3C]">{issue.technical_owner || issue.disciplines?.join(', ') || 'Cross-Discipline'}</div></div><div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action owner</div><div className="mt-0.5 font-bold text-[#0B2A3C]">{actionOwner}</div></div></div>{canManage && <select value={issue.status} onChange={e=>void onChange({status:e.target.value as DesignIssue['status']})} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{['Open','Under Review','Accepted','Resolved','Closed','Rejected'].map(x=><option key={x}>{x}</option>)}</select>}</div></div></article>
}

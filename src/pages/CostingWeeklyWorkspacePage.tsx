import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'

const SECTIONS = ['Pre-Contract', 'Tender', 'Contracts', 'Post Contract', 'Payments', 'Procurement'] as const
const STATUS = ['Open', 'In Progress', 'Pending', 'Approved', 'Paid', 'Completed', 'Delayed']
type ReportItem = { id: string; project_id: number; report_week: string; section: string; item_title: string; description: string | null; status: string; amount: number | null }
type Project = { id: number; name: string; portfolio_id?: number | null }
type SourceItem = { id: string; project_id: number; section: string; title: string; status: string; amount: number | null; details: string; source: string }
const SOURCE_TABLES = [
  { table: 'cost_contracts', section: 'Contracts', title: 'contract_title', status: 'status', amount: 'contract_value', details: 'remarks' },
  { table: 'cost_payments', section: 'Payments', title: 'payment_title', status: 'payment_status', amount: 'amount', details: 'remarks' },
  { table: 'cost_variations', section: 'Post Contract', title: 'variation_title', status: 'status', amount: 'amount', details: 'remarks' },
  { table: 'cost_procurements', section: 'Procurement', title: 'item_name', status: 'status', amount: 'estimated_cost', details: 'remarks' },
] as const
function fridayOf(date: string) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + (5 - d.getDay() + 7) % 7)
  return d.toISOString().slice(0, 10)
}
export default function CostingWeeklyWorkspacePage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(s => s.role)
  const workspaceId = useMembershipStore(s => s.workspaceId)
  const organizationId = useProjectStore(s => s.organizationId)
  const [week, setWeek] = useState(() => fridayOf(new Date().toISOString().slice(0, 10)))
  const [projects, setProjects] = useState<Project[]>([])
  const [items, setItems] = useState<ReportItem[]>([])
  const [previous, setPrevious] = useState<ReportItem[]>([])
  const [sources, setSources] = useState<SourceItem[]>([])
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [section, setSection] = useState<string>(SECTIONS[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Open')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [confirmingSource, setConfirmingSource] = useState<string | null>(null)
  const [sourceNote, setSourceNote] = useState('')
  const [sourceStatus, setSourceStatus] = useState('')
  const [savingSource, setSavingSource] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({})
  const [attested, setAttested] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const canEdit = ['costing', 'admin', 'workspace_admin'].includes(role || '')
  async function refresh() {
    if (!workspaceId) { setMessage('Select a workspace to load the Cost Reporting Centre.'); return }
    setLoading(true); setMessage(''); setLoadError(false); setReviewed({}); setAttested(false); setSubmittedId(null)
    setSources([]); setSourceWarnings([])
    const { data: ws, error: wsError } = await supabase.from('workspaces').select('organization_id').eq('id', workspaceId).single()
    if (wsError || !ws?.organization_id) { setMessage(wsError?.message || 'Workspace organization unavailable'); setLoadError(true); setLoading(false); return }
    const orgId = ws.organization_id
    const [p, r] = await Promise.all([
      supabase.from('projects').select('id,name,portfolio_id').eq('workspace_id', workspaceId).order('name'),
      supabase.from('cost_reports').select('id,project_id,report_week,section,item_title,description,status,amount').eq('organization_id', orgId).lte('report_week', week).order('report_week', { ascending: false }).limit(3000),
    ])
    if (p.error || r.error) { setMessage(p.error?.message || r.error?.message || 'Unable to load reports'); setLoadError(true) }
    setProjects((p.data || []) as Project[])
    const allowedIds = new Set((p.data || []).map(project => Number(project.id)))
    const all = ((r.data || []) as ReportItem[]).filter(item => allowedIds.has(Number(item.project_id)))
    setItems(all.filter(i => i.report_week === week))
    const latest = new Map<string, ReportItem>()
    for (const i of all.filter(i => i.report_week < week)) {
      const key = `${i.project_id}:${i.section}:${i.item_title.trim().toLowerCase()}`
      if (!latest.has(key)) latest.set(key, i)
    }
    setPrevious([...latest.values()].filter(i => !['Completed', 'Paid'].includes(i.status)))
    // Read existing operational registers as live reference data. Do not manufacture
    // weekly activity or copy these rows into immutable report snapshots.
    const sourceResults = await Promise.all(SOURCE_TABLES.map(async config => {
      const { data, error } = await supabase.from(config.table).select('*').eq('organization_id', orgId).limit(1000)
      return { config, data: (data || []) as Record<string, unknown>[], error }
    }))
    const warnings: string[] = []
    const collected: SourceItem[] = []
    for (const { config, data, error } of sourceResults) {
      if (error) { warnings.push(`${config.table}: ${error.message}`); continue }
      if (data.length === 1000) warnings.push(`${config.table}: first 1000 records shown; pagination needed for a complete view`)
      for (const row of data) {
        if (!row.id || !row.project_id || !allowedIds.has(Number(row.project_id))) continue
        collected.push({
          id: String(row.id), project_id: Number(row.project_id), section: config.section,
          title: String(row[config.title] || '(Untitled)'), status: String(row[config.status] || 'Not recorded'),
          amount: row[config.amount] == null ? null : Number(row[config.amount]),
          details: String(row[config.details] || ''), source: config.table,
        })
      }
    }
    setSources(collected)
    setSourceWarnings(warnings)
    if (warnings.length) setLoadError(true)
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [workspaceId, week])
  const visible = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())), [projects, filter])
  const missingProjects = useMemo(() => projects.filter(p => !items.some(i => i.project_id === p.id)), [projects, items])
  const previousFor = (id: number, cat: string) => previous.filter(i => i.project_id === id && i.section === cat && !items.some(current => current.project_id === id && current.section === cat && current.item_title.trim().toLowerCase() === i.item_title.trim().toLowerCase()))
  async function add(project: Project, carry?: ReportItem) {
    if (!canEdit || !user || !organizationId) return
    const label = carry?.item_title || title.trim()
    if (!label) { setMessage('Enter an activity title.'); return }
    const { error } = await supabase.from('cost_reports').insert({
      organization_id: organizationId, portfolio_id: project.portfolio_id ?? null,
      project_id: project.id, report_week: week, section: carry?.section || section,
      item_title: label, description: carry?.description ?? (description.trim() || null),
      status: carry?.status || status, amount: carry?.amount ?? (amount ? Number(amount) : 0),
      created_by: user.id, created_by_name: user.full_name || user.email || null,
    })
    if (error) { setMessage(error.message); return }
    setTitle(''); setDescription(''); setAmount(''); setMessage('Saved to the project Costing report.'); await refresh()
  }
  // An explicit officer-confirmed weekly update is saved as a report entry.
  // The operational register itself is not modified or silently duplicated.
  function startSourceReview(item: SourceItem) {
    setConfirmingSource(`${item.source}:${item.id}`)
    setSourceNote('')
    setSourceStatus(item.status === 'Not recorded' ? 'Pending' : item.status)
  }
  async function confirmSource(project: Project, item: SourceItem) {
    if (!canEdit || !user || !organizationId || savingSource) return
    if (!sourceNote.trim()) {
      setMessage('Describe what happened this week, or explicitly write "No change confirmed".')
      return
    }
    const entryTitle = `[${item.source}:${item.id}] ${item.title}`
    if (items.some(i => i.project_id === project.id && i.report_week === week && i.item_title === entryTitle)) {
      setMessage('This register item already has a confirmed entry for the selected week.')
      return
    }
    setSavingSource(true)
    const { error } = await supabase.from('cost_reports').insert({
      organization_id: organizationId, portfolio_id: project.portfolio_id ?? null,
      project_id: project.id, report_week: week, section: item.section,
      item_title: entryTitle, description: sourceNote.trim(),
      status: sourceStatus || 'Pending', amount: item.amount,
      created_by: user.id, created_by_name: user.full_name || user.email || null,
    })
    setSavingSource(false)
    if (error) { setMessage(error.message); return }
    setConfirmingSource(null); setSourceNote(''); setMessage('Confirmed weekly update saved.')
    await refresh()
  }

  const reviewKey = (id: number, cat: string) => `${id}:${cat}`
  const pendingReview = projects.flatMap(p => SECTIONS.filter(cat => !reviewed[reviewKey(p.id, cat)]).map(cat => `${p.name}: ${cat}`))
  const readyToSubmit = Boolean(workspaceId && canEdit && !loading && !loadError && !sourceWarnings.length && projects.length && pendingReview.length === 0 && attested && !submitting && !submittedId)
  async function submitConsolidated() {
    if (!readyToSubmit || !workspaceId) return
    // The RPC controls the week and validates access, project membership and uniqueness.
    // Only reviewed weekly entries are included; live registers are not silently submitted.
    const snapshot = {
      report_type: 'consolidated_costing',
      review_basis: 'officer_confirmed_weekly_entries',
      projects: projects.map(p => ({
        id: p.id, name: p.name,
        categories: Object.fromEntries(SECTIONS.map((cat, index) => [
          ['pre_contract','tender_action','contracts','post_contract','payments','client_procured_items'][index],
          items.filter(i => i.project_id === p.id && i.section === cat).map(i => ({
            id: i.id, title: i.item_title, description: i.description,
            status: i.status, amount: i.amount, report_week: i.report_week,
          })),
        ])),
      })),
    }
    setSubmitting(true); setMessage('')
    const { data, error } = await supabase.rpc('submit_consolidated_cost_report', {
      p_workspace_id: workspaceId, p_snapshot_data: snapshot,
    })
    setSubmitting(false)
    if (error) { setMessage(`Submission not completed: ${error.message}`); return }
    setSubmittedId(String(data)); setMessage('Consolidated Costing report submitted successfully.')
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white px-6 py-4"><div className="mx-auto max-w-[1500px] flex items-center justify-between"><Link to="/projects" className="font-bold text-teal-700">PMOCorex · Workspace Hub</Link><span className="text-sm text-slate-500">Workspace reporting</span></div></header>
    <main className="p-6 space-y-5 max-w-[1500px] mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-teal-700">Workspace reporting</p><h1 className="text-2xl font-bold">Cost Reporting Centre</h1><p className="text-sm text-slate-500">Review all projects in one place. Existing records are reused, not duplicated automatically.</p></div><Link className="border rounded-lg px-4 py-2" to="/projects">Back to Workspace Hub</Link></div>
    <div className="flex flex-wrap gap-3 items-end"><label className="text-sm">Week ending (Friday)<input className="block border rounded p-2" type="date" value={week} onChange={e => setWeek(fridayOf(e.target.value))}/></label><label className="text-sm">Find project<input className="block border rounded p-2" placeholder="Search projects" value={filter} onChange={e => setFilter(e.target.value)}/></label><button className="border rounded px-4 py-2" onClick={() => void refresh()}>Refresh</button></div>
    {message && <p role="status" className="rounded bg-slate-100 p-3 text-sm">{message}</p>}
    {loading ? <p>Loading Costing records…</p> : <p className="text-sm text-slate-600">{projects.length} projects · {items.length} weekly entries · {previous.length} unresolved prior entries · {sources.length} linked register records</p>}
    {sourceWarnings.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><strong>Some register data could not be fully loaded.</strong>{sourceWarnings.map(w => <p key={w}>{w}</p>)}</div>}
    <p className="text-xs text-slate-600">Register records below show the current recorded position, not verified activity for the selected reporting week. Select “Confirm weekly update” to record a dated, officer-verified note; this never changes the source register. The officer must confirm what changed before including it in a submitted report.</p>
    <div className="overflow-x-auto border rounded-xl"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-100"><tr><th className="text-left p-3">Project</th>{SECTIONS.map(s => <th key={s} className="text-left p-3">{s}</th>)}</tr></thead><tbody>{visible.map(p => <tr key={p.id} className="border-t align-top"><td className="p-3 font-semibold"><button className="text-left underline" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{p.name} {expanded === p.id ? '−' : '+'}</button></td>{SECTIONS.map(s => { const current = items.filter(i => i.project_id === p.id && i.section === s); const carry = previousFor(p.id, s); const linked = sources.filter(i => i.project_id === p.id && i.section === s); return <td key={s} className="p-3"><button className="text-left" onClick={() => { setExpanded(p.id); setSection(s) }}><strong>{current.length}</strong> current{carry.length ? <span className="block text-amber-700">{carry.length} to review</span> : null}{linked.length ? <span className="block text-teal-700">{linked.length} in register</span> : null}</button>{expanded === p.id && section === s && <div className="mt-2 space-y-2 min-w-44">{current.map(i => <div key={i.id} className="border-t pt-1"><strong>{i.item_title}</strong><p>{i.status}</p></div>)}{linked.map(i => <div key={`${i.source}:${i.id}`} className="border-t pt-1"><strong>{i.title}</strong><p>{i.status}{i.amount != null ? ` · ₦${i.amount.toLocaleString()}` : ''}</p>{i.details && <p className="text-xs text-slate-600">{i.details}</p>}<p className="text-[11px] text-slate-500">Live register: {i.source}. Confirm before reporting.</p>{canEdit && !current.some(c => c.item_title === `[${i.source}:${i.id}] ${i.title}`) && <div className="mt-1">{confirmingSource === `${i.source}:${i.id}` ? <div className="space-y-1"><textarea className="w-full border p-1" aria-label={`Weekly update for ${i.title}`} placeholder="What changed this week? Or: No change confirmed." value={sourceNote} onChange={e => setSourceNote(e.target.value)}/><input className="w-full border p-1" aria-label="Confirmed status" value={sourceStatus} onChange={e => setSourceStatus(e.target.value)}/><button disabled={savingSource} className="rounded bg-teal-700 text-white px-2 py-1 disabled:opacity-50" onClick={() => void confirmSource(p, i)}>Save confirmed update</button><button className="ml-2 underline" onClick={() => setConfirmingSource(null)}>Cancel</button></div> : <button className="underline text-teal-700" onClick={() => startSourceReview(i)}>Confirm weekly update</button>}</div>}</div>)}{carry.map(i => <div key={i.id} className="border-t pt-1"><strong>{i.item_title}</strong><p>Last: {i.status} ({i.report_week})</p>{canEdit && <button className="underline text-teal-700" onClick={() => void add(p, i)}>Carry forward</button>}</div>)}{canEdit && <div className="space-y-1 border-t pt-2"><input className="w-full border p-1" placeholder="New activity" value={title} onChange={e => setTitle(e.target.value)}/><textarea className="w-full border p-1" placeholder="Update / remarks" value={description} onChange={e => setDescription(e.target.value)}/><select className="w-full border p-1" value={status} onChange={e => setStatus(e.target.value)}>{STATUS.map(v => <option key={v}>{v}</option>)}</select><input className="w-full border p-1" type="number" min="0" placeholder="Amount (optional)" value={amount} onChange={e => setAmount(e.target.value)}/><button className="rounded bg-teal-700 text-white px-2 py-1" onClick={() => void add(p)}>Save activity</button></div>}</div>}</td>})}</tr>)}</tbody></table></div>
    <section className="border rounded-xl p-4 space-y-3" aria-label="Consolidated report review">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Consolidated report review</h2><p className="text-sm text-slate-600">Review all six reporting categories before submitting through the existing authorized workflow.</p></div><button className="border rounded px-3 py-2" onClick={() => setShowPreview(v => !v)}>{showPreview ? 'Hide report preview' : 'Preview consolidated report'}</button></div>
      <p className="text-sm">{items.length} confirmed weekly entries across {new Set(items.map(i => i.project_id)).size} projects. {missingProjects.length} projects have no confirmed entries for this week.</p>
      {missingProjects.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><strong>Review required:</strong> No confirmed entry for {missingProjects.map(p => p.name).join(', ')}. This does not mean no activity; confirm no change or add updates before submission.</div>}
      {sourceWarnings.length > 0 && <p className="text-sm text-amber-700">Register loading warnings exist. Resolve them before treating the preview as complete.</p>}
      {showPreview && <div className="space-y-4" id="costing-report-preview">
        <div><h3 className="font-bold">Costing and Procurement Weekly Report</h3><p className="text-sm">Week ending: {week} · Draft review only, not submitted</p></div>
        {projects.map(project => <section key={project.id} className="border-t pt-3"><h4 className="font-semibold">{project.name}</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">{SECTIONS.map(cat => { const entries = items.filter(i => i.project_id === project.id && i.section === cat); return <div key={cat} className="rounded border p-3"><h5 className="font-medium">{cat}</h5>{entries.length ? <ul className="list-disc pl-4 mt-1">{entries.map(i => <li key={i.id} className="text-sm"><strong>{i.item_title}</strong> · {i.status}{i.amount != null ? ` · ₦${i.amount.toLocaleString()}` : ''}{i.description ? <p className="whitespace-pre-wrap">{i.description}</p> : null}</li>)}</ul> : <p className="text-xs text-amber-700">Not confirmed this week</p>}</div> })}</div></section>)}
        <p className="text-xs text-slate-600">Preview only. It excludes unconfirmed live register records and does not create an immutable submission.</p>
      </div>}
      <div className="rounded-lg border p-3 space-y-3">
        <h3 className="font-semibold">Officer review and submission</h3>
        <p className="text-sm">Confirm every project/category, including those with no activity. An empty category is reported as reviewed with no weekly entries, not as an invented update.</p>
        <p className="text-sm">{projects.length * SECTIONS.length - pendingReview.length} of {projects.length * SECTIONS.length} project/category checks completed.</p>
        <div className="max-h-72 overflow-y-auto space-y-2">{projects.map(p => <div key={p.id} className="border-t pt-2"><strong className="text-sm">{p.name}</strong><div className="flex flex-wrap gap-3 mt-1">{SECTIONS.map(cat => <label key={cat} className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={!canEdit || loading || !!submittedId} checked={!!reviewed[reviewKey(p.id, cat)]} onChange={e => setReviewed(prev => ({...prev,[reviewKey(p.id, cat)]:e.target.checked}))}/>{cat}</label>)}</div></div>)}</div>
        {loadError && <p className="text-sm text-red-700">Submission blocked: incomplete or failed data loading. Refresh after resolving the warnings.</p>}
        {pendingReview.length > 0 && <p className="text-sm text-amber-700">{pendingReview.length} project/category checks remain.</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={attested} disabled={!canEdit || !!submittedId} onChange={e => setAttested(e.target.checked)}/><span>I have reviewed the six categories for every project and verified the amounts and statuses against the available source records. I understand the report will be immutable after submission.</span></label>
        <button className="rounded bg-teal-700 text-white px-4 py-2 disabled:opacity-50" disabled={!readyToSubmit} onClick={() => void submitConsolidated()}>{submitting ? 'Submitting…' : submittedId ? 'Submitted' : 'Submit consolidated Costing report'}</button>
        {submittedId && <p className="text-sm text-teal-700">Submission ID: {submittedId}</p>}
        <p className="text-xs text-slate-600">Submission is enforced by the server-side RPC, including the Lagos reporting window. This interface does not implement audited amendments; submitted snapshots cannot be edited here.</p>
      </div>
    </section>
    <p className="text-xs text-slate-500">This is a consolidated preparation view. Consolidated submission uses the workspace-scoped RPC and does not alter project-level submissions. Carry-forward entries require explicit confirmation and do not claim a new status change.</p>
  </main></div>
}

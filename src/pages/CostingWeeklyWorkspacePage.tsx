import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'

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
  const [week, setWeek] = useState(() => fridayOf(new Date().toISOString().slice(0, 10)))
  const [projects, setProjects] = useState<Project[]>([])
  const [items, setItems] = useState<ReportItem[]>([])
  const [previous, setPrevious] = useState<ReportItem[]>([])
  const [sources, setSources] = useState<SourceItem[]>([])
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [activeCarry, setActiveCarry] = useState<ReportItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [reportOrgId, setReportOrgId] = useState<number | null>(null)
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
    const orgId = Number(ws.organization_id)
    setReportOrgId(orgId)
    const [p, r] = await Promise.all([
      supabase.from('projects').select('id,project_name,portfolio_id').eq('workspace_id', workspaceId).order('project_name'),
      supabase.from('cost_reports').select('id,project_id,report_week,section,item_title,description,status,amount').eq('organization_id', orgId).lte('report_week', week).order('report_week', { ascending: false }).limit(3000),
    ])
    if (p.error || r.error) { setMessage(`Unable to load Costing information: ${p.error?.message || r.error?.message}. Please refresh after this is resolved.`); setLoadError(true); setProjects([]); setItems([]); setPrevious([]); setLoading(false); return }
    setProjects(((p.data || []) as Array<{ id: number; project_name: string; portfolio_id?: number | null }>).map(project => ({ id: project.id, name: project.project_name || `Project #${project.id}`, portfolio_id: project.portfolio_id })))
    const all = (r.data || []) as ReportItem[]
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
        if (!row.id || !row.project_id) continue
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
    if (!canEdit || !user || !reportOrgId || saving) return
    const label = carry?.item_title || title.trim()
    if (!label) { setMessage('Enter an activity title.'); return }
    setSaving(true)
    const { error } = await supabase.from('cost_reports').insert({
      organization_id: reportOrgId, portfolio_id: project.portfolio_id ?? null,
      project_id: project.id, report_week: week, section: carry?.section || section,
      item_title: label, description: description.trim() || carry?.description || null,
      status, amount: amount.trim() ? Number(amount) : (carry?.amount ?? null),
      created_by: user.id, created_by_name: user.full_name || user.email || null,
    })
    setSaving(false)
    if (error) { setMessage(error.message); return }
    setTitle(''); setDescription(''); setAmount(''); setActiveCarry(null); setMessage('Weekly activity saved.'); await refresh()
  }
  // An explicit officer-confirmed weekly update is saved as a report entry.
  // The operational register itself is not modified or silently duplicated.
  function startSourceReview(item: SourceItem) {
    setConfirmingSource(`${item.source}:${item.id}`)
    setSourceNote('')
    setSourceStatus(item.status === 'Not recorded' ? 'Pending' : item.status)
  }
  async function confirmSource(project: Project, item: SourceItem) {
    if (!canEdit || !user || !reportOrgId || savingSource) return
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
      organization_id: reportOrgId, portfolio_id: project.portfolio_id ?? null,
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
  const readyToSubmit = Boolean(showPreview && items.length > 0 && missingProjects.length === 0 && workspaceId && canEdit && !loading && !loadError && !sourceWarnings.length && projects.length && pendingReview.length === 0 && attested && !submitting && !submittedId)
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
  return <><style>{`@media print { body * { visibility: hidden !important; } #costing-report-preview, #costing-report-preview * { visibility: visible !important; } #costing-report-preview { position: absolute; left: 0; top: 0; width: 100%; border: 0; padding: 0; } @page { size: A4 landscape; margin: 12mm; } }`}</style><main className="p-6 space-y-5 max-w-[1500px] mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-teal-700">Workspace reporting</p><h1 className="text-2xl font-bold">Cost Reporting Centre</h1><p className="text-sm text-slate-500">Prepare one weekly Costing report across all projects. Update activities in the table, then generate a preview.</p></div><Link className="border rounded-lg px-4 py-2" to="/projects">Back to Workspace Hub</Link></div>
    <div className="flex flex-wrap gap-3 items-end"><label className="text-sm">Week ending (Friday)<input className="block border rounded p-2" type="date" value={week} onChange={e => setWeek(fridayOf(e.target.value))}/></label><label className="text-sm">Find project<input className="block border rounded p-2" placeholder="Search projects" value={filter} onChange={e => setFilter(e.target.value)}/></label><button className="border rounded px-4 py-2" onClick={() => void refresh()}>Refresh</button></div>
    {message && <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">{message}</p>}
    {loading ? <p>Loading Costing records…</p> : !loadError && <p className="text-sm text-slate-600">{projects.length} projects · {items.length} updates this week · {previous.length} outstanding activities · {sources.length} existing commercial records</p>}
    {sourceWarnings.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><strong>Some register data could not be fully loaded.</strong>{sourceWarnings.map(w => <p key={w}>{w}</p>)}</div>}
    <p className="text-xs text-slate-600">Select a project and reporting category to add this week’s update, carry forward an outstanding item, or confirm information from an existing register. No changes are invented automatically.</p>
    {!loadError && projects.length > 0 && <div className="overflow-x-auto border rounded-xl"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-100"><tr><th className="text-left p-3">Project</th>{SECTIONS.map(cat => <th className="text-left p-3" key={cat}>{cat}</th>)}</tr></thead><tbody>{visible.map(p => <tr key={p.id} className="border-t"><td className="p-3 font-medium">{p.name}</td>{SECTIONS.map(cat => { const current = items.filter(i => i.project_id === p.id && i.section === cat); const carry = previousFor(p.id, cat); return <td key={cat} className="p-3 align-top"><button className="rounded border px-2 py-2 w-full text-left hover:bg-teal-50" onClick={() => { setExpanded(p.id); setSection(cat); setActiveCarry(null); setTitle(''); setDescription(''); setStatus('Open'); setAmount('') }}><strong>{current.length} updated</strong>{carry.length > 0 && <span className="block text-amber-700">{carry.length} ongoing</span>}{!current.length && !carry.length && <span className="block text-slate-500">Add update</span>}</button></td>})}</tr>)}</tbody></table></div>}
    {expanded !== null && projects.some(p => p.id === expanded) && <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setExpanded(null)}><aside role="dialog" aria-modal="true" aria-label="Edit Costing weekly activities" className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}><div className="flex justify-between items-start gap-3"><div><h2 className="text-lg font-semibold">{projects.find(p => p.id === expanded)?.name}</h2><p className="text-sm text-slate-600">{section} · Week ending {week}</p></div><button className="border rounded px-3 py-1" onClick={() => setExpanded(null)}>Close</button></div>
    <div><h3 className="font-medium">This week's saved updates</h3>{items.filter(i => i.project_id === expanded && i.section === section).map(i => <div key={i.id} className="border rounded p-2 mt-2 text-sm"><strong>{i.item_title}</strong><p>{i.status}{i.amount != null ? ` · ₦${i.amount.toLocaleString()}` : ''}</p><p className="whitespace-pre-wrap">{i.description}</p></div>)}{!items.some(i => i.project_id === expanded && i.section === section) && <p className="text-sm text-slate-500">No updates saved this week.</p>}</div>
    <div><h3 className="font-medium">Ongoing activities from previous weeks</h3><p className="text-xs text-slate-600">Outstanding activities remain visible automatically. They are not reported as verified this week until you confirm or update them.</p>{previousFor(expanded, section).map(i => <div key={i.id} className="border rounded p-3 mt-2 text-sm"><strong>{i.item_title}</strong><p>Last status: {i.status} · {i.report_week}</p>{i.amount != null && <p>₦{i.amount.toLocaleString()}</p>}{i.description && <p className="whitespace-pre-wrap">{i.description}</p>}{canEdit && <button className="mt-2 underline text-teal-700" onClick={() => { setActiveCarry(i); setTitle(i.item_title); setDescription(i.description || ''); setStatus(i.status); setAmount(i.amount == null ? '' : String(i.amount)) }}>Update or confirm no change</button>}</div>)}{previousFor(expanded, section).length === 0 && <p className="text-sm text-slate-500">No outstanding activities to carry forward.</p>}</div>
    {canEdit && <div className="border-t pt-3 space-y-2"><h3 className="font-semibold">{activeCarry ? 'Update ongoing activity' : 'Add a new activity'}</h3>{activeCarry && <button className="text-xs underline" onClick={() => { setActiveCarry(null); setTitle(''); setDescription(''); setStatus('Open'); setAmount('') }}>Switch to new activity</button>}<label className="block text-xs">Activity<input className="w-full border rounded p-2 mt-1" value={title} disabled={!!activeCarry} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tender evaluation for fittings"/></label><label className="block text-xs">This week's update / remarks<textarea className="w-full border rounded p-2 mt-1" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What progressed? If unchanged, say 'No change confirmed'."/></label><div className="grid grid-cols-2 gap-2"><label className="block text-xs">Status<select className="w-full border rounded p-2 mt-1" value={status} onChange={e => setStatus(e.target.value)}>{STATUS.map(v => <option key={v}>{v}</option>)}</select></label><label className="block text-xs">Amount (₦, optional)<input type="number" min="0" className="w-full border rounded p-2 mt-1" value={amount} onChange={e => setAmount(e.target.value)}/></label></div><button disabled={saving || !title.trim() || !description.trim()} className="rounded bg-teal-700 text-white px-4 py-2 disabled:opacity-50" onClick={() => { const p = projects.find(p => p.id === expanded); if (p) void add(p, activeCarry || undefined) }}>{saving ? 'Saving…' : activeCarry ? 'Save weekly update' : 'Add activity'}</button><p className="text-xs text-slate-500">Completed and Paid activities will not appear as outstanding next week. Previous report entries remain in history.</p></div>}
    <div><h3 className="font-medium">Existing register records</h3>{sources.filter(i => i.project_id === expanded && i.section === section).map(i => <div key={`${i.source}:${i.id}`} className="border rounded p-2 mt-2 text-sm"><strong>{i.title}</strong><p>{i.status}</p>{canEdit && <button className="underline text-teal-700" onClick={() => startSourceReview(i)}>Confirm source update</button>}{confirmingSource === `${i.source}:${i.id}` && <div className="space-y-2 mt-2"><textarea className="border rounded p-2 w-full" value={sourceNote} onChange={e => setSourceNote(e.target.value)} placeholder="This week's verified update"/><input className="border rounded p-2 w-full" value={sourceStatus} onChange={e => setSourceStatus(e.target.value)}/><button className="rounded bg-teal-700 text-white px-3 py-1" disabled={savingSource} onClick={() => { const p = projects.find(p => p.id === expanded); if (p) void confirmSource(p, i) }}>Save confirmed update</button></div>}</div>)}{!sources.some(i => i.project_id === expanded && i.section === section) && <p className="text-sm text-slate-500">No register records yet. You can still report activities above.</p>}</div></aside></div>}
    {!loading && !loadError && projects.length === 0 && <p className="rounded border p-4 text-sm">No projects were found in this workspace. Check your workspace selection before preparing the report.</p>}
    {!loadError && projects.length > 0 && <section className="border rounded-xl p-4 space-y-3" aria-label="Consolidated report review">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Generate weekly report</h2><p className="text-sm text-slate-600">Prepare updates in the table above. When ready, generate a draft to check the report before submitting.</p></div><button className="border rounded px-3 py-2" disabled={items.length === 0} onClick={() => setShowPreview(v => !v)}>{showPreview ? 'Hide draft report' : 'Generate draft report'}</button></div>
      <p className="text-sm">{items.length} confirmed weekly entries across {new Set(items.map(i => i.project_id)).size} projects. {missingProjects.length} projects have no confirmed entries for this week.</p>
      {missingProjects.length > 0 && items.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><strong>Review required:</strong> No confirmed entry for {missingProjects.map(p => p.name).join(', ')}. This does not mean no activity; confirm no change or add updates before submission.</div>}
      {sourceWarnings.length > 0 && <p className="text-sm text-amber-700">Register loading warnings exist. Resolve them before treating the preview as complete.</p>}
      {showPreview && items.length > 0 && <div className="space-y-4" >
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">Management-ready draft. Only officer-confirmed weekly entries are included.</p><button type="button" className="border rounded px-3 py-2 text-sm" onClick={() => window.print()}>Print / Save as PDF</button></div>
        <div id="costing-report-preview" className="bg-white text-slate-900 border rounded-xl p-5 print:border-0 print:p-0">
          <div className="border-b-2 border-teal-700 pb-4 mb-4"><p className="text-xs font-semibold tracking-widest uppercase text-teal-700">PMOCorex · Portfolio Control Centre</p><h3 className="text-2xl font-bold mt-1">Costing & Procurement Weekly Report</h3><p className="text-sm mt-1">Week ending Friday {week}</p><p className="text-xs text-slate-600 mt-1">DRAFT · Prepared for PMO / Management review · Not submitted</p></div>
          <div className="grid grid-cols-3 gap-2 mb-5 text-sm"><div className="border rounded p-3"><p className="text-xs text-slate-500">Projects</p><strong>{projects.length}</strong></div><div className="border rounded p-3"><p className="text-xs text-slate-500">Confirmed updates</p><strong>{items.length}</strong></div><div className="border rounded p-3"><p className="text-xs text-slate-500">Projects with updates</p><strong>{new Set(items.map(i => i.project_id)).size} / {projects.length}</strong></div></div>
          {missingProjects.length > 0 && <p className="text-xs border-l-4 border-amber-500 pl-3 py-2 mb-4">No weekly updates confirmed for: {missingProjects.map(p => p.name).join(', ')}. This is not a declaration of no activity.</p>}
          {projects.map(project => <section key={project.id} className="mb-6 print:break-inside-avoid"><h4 className="font-bold text-lg bg-slate-100 px-3 py-2 border-l-4 border-teal-700">{project.name}</h4><div className="overflow-x-auto"><table className="w-full text-sm border-collapse mt-2"><thead><tr className="bg-slate-50"><th className="border text-left p-2 w-40">Reporting category</th><th className="border text-left p-2">Activity / Weekly progress</th><th className="border text-left p-2 w-28">Status</th><th className="border text-right p-2 w-36">Amount (₦)</th></tr></thead><tbody>{SECTIONS.map(cat => { const entries = items.filter(i => i.project_id === project.id && i.section === cat); return entries.length ? entries.map((entry, idx) => <tr key={entry.id}><td className="border p-2 align-top font-medium">{idx === 0 ? cat : ''}</td><td className="border p-2 align-top"><strong>{entry.item_title}</strong>{entry.description && <p className="whitespace-pre-wrap mt-1 text-slate-700">{entry.description}</p>}</td><td className="border p-2 align-top">{entry.status}</td><td className="border p-2 align-top text-right tabular-nums">{entry.amount == null ? '—' : entry.amount.toLocaleString('en-NG', {minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>) : <tr key={cat}><td className="border p-2 font-medium">{cat}</td><td colSpan={3} className="border p-2 italic text-slate-500">No weekly update confirmed</td></tr>})}</tbody></table></div></section>)}
          <div className="border-t pt-3 mt-4 text-xs text-slate-600"><p>Reporting basis: saved, officer-confirmed weekly activities only. Amounts are recorded figures, not calculated totals or proof of payment. Unconfirmed register records and unresolved prior-week activities are excluded until reviewed.</p><p className="mt-1">Generated from PMOCorex · Week ending {week} · Draft copy</p></div>
        </div>
      </div>}
      {showPreview && items.length > 0 && <div className="rounded-lg border p-3 space-y-3">
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
      </div>}
    </section>}
    <p className="text-xs text-slate-500">This is a consolidated preparation view. Consolidated submission uses the workspace-scoped RPC and does not alter project-level submissions. Carry-forward entries require explicit confirmation and do not claim a new status change.</p>
  </main></>
}

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
  const [loading, setLoading] = useState(false)
  const canEdit = ['costing', 'admin', 'workspace_admin'].includes(role || '')
  async function refresh() {
    if (!organizationId) { setMessage('Select a project within your organization to load its Costing workspace.'); return }
    setLoading(true); setMessage('')
    setSources([]); setSourceWarnings([])
    const [p, r] = await Promise.all([
      supabase.from('projects').select('id,name,portfolio_id').eq('organization_id', organizationId).order('name'),
      supabase.from('cost_reports').select('id,project_id,report_week,section,item_title,description,status,amount').eq('organization_id', organizationId).lte('report_week', week).order('report_week', { ascending: false }).limit(3000),
    ])
    if (p.error || r.error) setMessage(p.error?.message || r.error?.message || 'Unable to load reports')
    setProjects((p.data || []) as Project[])
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
      const { data, error } = await supabase.from(config.table).select('*').eq('organization_id', organizationId).limit(1000)
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
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [organizationId, week])
  const visible = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())), [projects, filter])
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
  return <main className="p-6 space-y-5 max-w-[1500px] mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-teal-700">Costing Management</p><h1 className="text-2xl font-bold">Consolidated weekly reporting workspace</h1><p className="text-sm text-slate-500">Review all projects in one place. Existing records are reused, not duplicated automatically.</p></div><Link className="border rounded-lg px-4 py-2" to="/app/costing/reports">Individual project report</Link></div>
    <div className="flex flex-wrap gap-3 items-end"><label className="text-sm">Week ending (Friday)<input className="block border rounded p-2" type="date" value={week} onChange={e => setWeek(fridayOf(e.target.value))}/></label><label className="text-sm">Find project<input className="block border rounded p-2" placeholder="Search projects" value={filter} onChange={e => setFilter(e.target.value)}/></label><button className="border rounded px-4 py-2" onClick={() => void refresh()}>Refresh</button></div>
    {message && <p role="status" className="rounded bg-slate-100 p-3 text-sm">{message}</p>}
    {loading ? <p>Loading Costing records…</p> : <p className="text-sm text-slate-600">{projects.length} projects · {items.length} weekly entries · {previous.length} unresolved prior entries · {sources.length} linked register records</p>}
    {sourceWarnings.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><strong>Some register data could not be fully loaded.</strong>{sourceWarnings.map(w => <p key={w}>{w}</p>)}</div>}
    <p className="text-xs text-slate-600">Register records below show the current recorded position, not verified activity for the selected reporting week. The officer must confirm what changed before including it in a submitted report.</p>
    <div className="overflow-x-auto border rounded-xl"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-100"><tr><th className="text-left p-3">Project</th>{SECTIONS.map(s => <th key={s} className="text-left p-3">{s}</th>)}</tr></thead><tbody>{visible.map(p => <tr key={p.id} className="border-t align-top"><td className="p-3 font-semibold"><button className="text-left underline" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{p.name} {expanded === p.id ? '−' : '+'}</button></td>{SECTIONS.map(s => { const current = items.filter(i => i.project_id === p.id && i.section === s); const carry = previousFor(p.id, s); const linked = sources.filter(i => i.project_id === p.id && i.section === s); return <td key={s} className="p-3"><button className="text-left" onClick={() => { setExpanded(p.id); setSection(s) }}><strong>{current.length}</strong> current{carry.length ? <span className="block text-amber-700">{carry.length} to review</span> : null}{linked.length ? <span className="block text-teal-700">{linked.length} in register</span> : null}</button>{expanded === p.id && section === s && <div className="mt-2 space-y-2 min-w-44">{current.map(i => <div key={i.id} className="border-t pt-1"><strong>{i.item_title}</strong><p>{i.status}</p></div>)}{linked.map(i => <div key={`${i.source}:${i.id}`} className="border-t pt-1"><strong>{i.title}</strong><p>{i.status}{i.amount != null ? ` · ₦${i.amount.toLocaleString()}` : ''}</p>{i.details && <p className="text-xs text-slate-600">{i.details}</p>}<p className="text-[11px] text-slate-500">Live register: {i.source}. Confirm before reporting.</p></div>)}{carry.map(i => <div key={i.id} className="border-t pt-1"><strong>{i.item_title}</strong><p>Last: {i.status} ({i.report_week})</p>{canEdit && <button className="underline text-teal-700" onClick={() => void add(p, i)}>Carry forward</button>}</div>)}{canEdit && <div className="space-y-1 border-t pt-2"><input className="w-full border p-1" placeholder="New activity" value={title} onChange={e => setTitle(e.target.value)}/><textarea className="w-full border p-1" placeholder="Update / remarks" value={description} onChange={e => setDescription(e.target.value)}/><select className="w-full border p-1" value={status} onChange={e => setStatus(e.target.value)}>{STATUS.map(v => <option key={v}>{v}</option>)}</select><input className="w-full border p-1" type="number" min="0" placeholder="Amount (optional)" value={amount} onChange={e => setAmount(e.target.value)}/><button className="rounded bg-teal-700 text-white px-2 py-1" onClick={() => void add(p)}>Save activity</button></div>}</div>}</td>})}</tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">This is a consolidated preparation view. Submission and immutable weekly snapshots remain in the existing Costing Reports workflow. Carry-forward entries require explicit confirmation and do not claim a new status change.</p>
  </main>
}

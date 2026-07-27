import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Search, ShieldCheck, UserRound, RefreshCw } from 'lucide-react'
import { EnterpriseMetric, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'

type Log = { id: string; created_at: string; user_email: string; action: string; module: string; record_id: string; description: string }

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => logs.filter(log => {
    const q = search.toLowerCase()
    return !q || log.user_email?.toLowerCase().includes(q) || log.module?.toLowerCase().includes(q) || log.description?.toLowerCase().includes(q) || log.action?.toLowerCase().includes(q)
  }), [logs, search])

  const uniqueUsers = new Set(logs.map(log => log.user_email).filter(Boolean)).size
  const critical = logs.filter(log => log.action === 'DELETE' || log.description?.includes('CRITICAL')).length
  const updates = logs.filter(log => log.action === 'UPDATE').length

  return <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <EnterprisePageHero eyebrow="Workspace governance" title="Audit Trail" description="Review important platform activity, permission changes and record-level actions across the workspace." actions={<button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe3e7] bg-white px-4 py-2.5 text-sm font-semibold text-[#123a60] hover:bg-[#f5f8fa]"><RefreshCw size={15}/>Refresh</button>} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EnterpriseMetric label="Recorded events" value={logs.length} helper="Most recent 200 events" icon={Activity}/>
        <EnterpriseMetric label="Active users" value={uniqueUsers} helper="Users represented in the log" icon={UserRound}/>
        <EnterpriseMetric label="Updates" value={updates} helper="Records modified" icon={ShieldCheck} tone="amber"/>
        <EnterpriseMetric label="Critical actions" value={critical} helper="Deletes and critical events" icon={ShieldCheck} tone={critical ? 'red' : 'green'}/>
      </section>

      <EnterpriseSection title="Workspace activity" description="Search by user, module, action or event detail." action={<div className="relative min-w-[260px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87939d]"/><input className="w-full rounded-xl border border-[#dfe3e7] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#123a60]" placeholder="Search audit events" value={search} onChange={e => setSearch(e.target.value)}/></div>}>
        <div className="overflow-x-auto rounded-2xl border border-[#e2e7eb]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f5f7f8] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#74818d]"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th></tr></thead>
            <tbody className="divide-y divide-[#edf0f2]">
              {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-[#7c8892]">Loading audit activity…</td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-[#7c8892]">No audit events match this search.</td></tr> : filtered.map(log => {
                const criticalAction = log.action === 'DELETE' || log.description?.includes('CRITICAL')
                const tone = criticalAction ? 'border-red-200 bg-red-50 text-red-700' : log.action === 'UPDATE' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                return <tr key={log.id} className="hover:bg-[#fafbfb]"><td className="whitespace-nowrap px-4 py-3 text-[#6f7d89]">{new Date(log.created_at).toLocaleString()}</td><td className="px-4 py-3 font-medium text-[#26384a]">{log.user_email || 'System'}</td><td className="px-4 py-3 text-[#536170]">{log.module || '—'}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{log.action}</span></td><td className="px-4 py-3 text-[#536170]">{log.description || '—'}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </EnterpriseSection>
    </div>
  </div>
}

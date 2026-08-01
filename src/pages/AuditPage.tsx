
import { useEffect, useMemo, useState } from 'react'
import { Activity, Search, ShieldCheck, UserRound, RefreshCw, Download, History, Filter } from 'lucide-react'
import { EnterpriseMetric, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { exportAuditCsv, listAuditLogs } from '@/services/auditService'
import type { AuditLogRecord } from '@/services/auditTypes'
import RecordHistoryDrawer from '@/components/audit/RecordHistoryDrawer'

export default function AuditPage() {
  const { activeWorkspace } = useWorkspace()
  const [logs,setLogs]=useState<AuditLogRecord[]>([])
  const [search,setSearch]=useState('')
  const [module,setModule]=useState('')
  const [action,setAction]=useState('')
  const [severity,setSeverity]=useState('')
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [history,setHistory]=useState<{tableName:string;recordId:string}|null>(null)

  async function load(){
    if(!activeWorkspace)return
    setLoading(true);setMessage('')
    try{
      setLogs(await listAuditLogs({
        workspaceId:activeWorkspace.id,
        search,module,action,severity,limit:500
      }))
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to load audit activity.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[activeWorkspace?.id])
  const modules=useMemo(()=>Array.from(new Set(logs.map(l=>l.module).filter(Boolean))).sort(),[logs])
  const uniqueUsers=new Set(logs.map(l=>l.actorEmail).filter(Boolean)).size
  const critical=logs.filter(l=>l.severity==='critical').length
  const updates=logs.filter(l=>l.action==='UPDATE').length
  const deletions=logs.filter(l=>l.action==='DELETE').length

  return <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <EnterprisePageHero eyebrow="Workspace governance" title="Audit Trail" description="Review immutable activity, record changes, security-sensitive actions and version history across the active workspace." actions={<div className="flex gap-2"><button onClick={()=>exportAuditCsv(logs)} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe3e7] bg-white px-4 py-2.5 text-sm font-semibold text-[#123a60] hover:bg-[#f5f8fa]"><Download size={15}/>Export CSV</button><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white"><RefreshCw size={15}/>Refresh</button></div>} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <EnterpriseMetric label="Recorded events" value={logs.length} helper="Most recent 500 events" icon={Activity}/>
        <EnterpriseMetric label="Active users" value={uniqueUsers} helper="Users represented" icon={UserRound}/>
        <EnterpriseMetric label="Updates" value={updates} helper="Records modified" icon={ShieldCheck} tone="amber"/>
        <EnterpriseMetric label="Deletes" value={deletions} helper="Destructive actions" icon={ShieldCheck} tone={deletions?'red':'green'}/>
        <EnterpriseMetric label="Critical events" value={critical} helper="High-risk activity" icon={ShieldCheck} tone={critical?'red':'green'}/>
      </section>

      <EnterpriseSection title="Audit controls" description="Filter by module, action, severity or free-text evidence." action={<Filter size={18} className="text-[#6f7d89]"/>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87939d]"/><input className="w-full rounded-xl border border-[#dfe3e7] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#123a60]" placeholder="Search user, module, action or details" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-control" value={module} onChange={e=>setModule(e.target.value)}><option value="">All modules</option>{modules.map(item=><option key={item} value={item}>{item}</option>)}</select>
          <select className="form-control" value={action} onChange={e=>setAction(e.target.value)}><option value="">All actions</option>{['CREATE','UPDATE','DELETE','RESTORE','LOGIN','LOGOUT','EXPORT'].map(item=><option key={item}>{item}</option>)}</select>
          <select className="form-control" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">All severity</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select>
        </div>
        <div className="mt-3 flex justify-end"><button onClick={()=>void load()} className="btn btn-ghost">Apply filters</button></div>
      </EnterpriseSection>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}

      <EnterpriseSection title="Workspace activity" description="Every logged action includes the actor, record, change evidence and time.">
        <div className="overflow-x-auto rounded-2xl border border-[#e2e7eb]">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-[#f5f7f8] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#74818d]"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Changes</th><th className="px-4 py-3">Details</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-[#edf0f2]">
              {loading?<tr><td colSpan={9} className="px-4 py-12 text-center text-[#7c8892]">Loading audit activity…</td></tr>:logs.length===0?<tr><td colSpan={9} className="px-4 py-12 text-center text-[#7c8892]">No audit events match the current filters.</td></tr>:logs.map(log=>{
                const tone=log.severity==='critical'?'border-red-200 bg-red-50 text-red-700':log.severity==='warning'?'border-amber-200 bg-amber-50 text-amber-700':'border-emerald-200 bg-emerald-50 text-emerald-700'
                return <tr key={log.id} className="hover:bg-[#fafbfb]"><td className="whitespace-nowrap px-4 py-3 text-[#6f7d89]">{new Date(log.createdAt).toLocaleString()}</td><td className="px-4 py-3"><div className="font-medium text-[#26384a]">{log.actorEmail||'System'}</div><div className="text-[11px] capitalize text-[#87929b]">{log.actorRole?.replace(/_/g,' ')||'—'}</div></td><td className="px-4 py-3 capitalize text-[#536170]">{log.module||'—'}</td><td className="px-4 py-3"><span className="badge badge-muted">{log.action}</span></td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{log.severity}</span></td><td className="px-4 py-3 text-xs text-[#536170]">{log.recordId||'—'}</td><td className="max-w-[220px] px-4 py-3 text-xs text-[#6f7d89]">{log.changedFields.length?log.changedFields.join(', '):'—'}</td><td className="max-w-[300px] px-4 py-3 text-[#536170]">{log.description||'—'}</td><td className="px-4 py-3">{log.tableName&&log.recordId?<button onClick={()=>setHistory({tableName:log.tableName!,recordId:log.recordId!})} className="tbl-action" title="Open record history"><History size={15}/></button>:null}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </EnterpriseSection>
    </div>

    {activeWorkspace&&<RecordHistoryDrawer open={Boolean(history)} workspaceId={activeWorkspace.id} tableName={history?.tableName||null} recordId={history?.recordId||null} onClose={()=>setHistory(null)} onRestored={()=>void load()}/>}
  </div>
}

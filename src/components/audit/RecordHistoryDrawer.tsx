
import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, X, Clock3, GitCompare } from 'lucide-react'
import { listRecordVersions, restoreRecordVersion } from '@/services/auditService'
import type { RecordVersion } from '@/services/auditTypes'

export default function RecordHistoryDrawer({
  open,
  workspaceId,
  tableName,
  recordId,
  onClose,
  onRestored,
}: {
  open: boolean
  workspaceId: string
  tableName: string | null
  recordId: string | null
  onClose: () => void
  onRestored?: () => void
}) {
  const [versions,setVersions]=useState<RecordVersion[]>([])
  const [selected,setSelected]=useState<RecordVersion|null>(null)
  const [loading,setLoading]=useState(false)
  const [restoring,setRestoring]=useState(false)
  const [message,setMessage]=useState('')

  useEffect(()=>{
    if(!open||!tableName||!recordId)return
    setLoading(true);setMessage('')
    listRecordVersions(workspaceId,tableName,recordId)
      .then(rows=>{setVersions(rows);setSelected(rows[0]||null)})
      .catch(err=>setMessage(err instanceof Error?err.message:'Unable to load record history.'))
      .finally(()=>setLoading(false))
  },[open,workspaceId,tableName,recordId])

  const previous=useMemo(()=>{
    if(!selected)return null
    const index=versions.findIndex(v=>v.id===selected.id)
    return index>=0 ? versions[index+1] || null : null
  },[selected,versions])

  async function restore(){
    if(!selected)return
    if(!confirm(`Restore this record to version ${selected.versionNumber}? The current values will be preserved in the audit trail.`))return
    setRestoring(true);setMessage('')
    try{
      await restoreRecordVersion(selected.id)
      setMessage('Version restored successfully.')
      onRestored?.()
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to restore this version.')}
    finally{setRestoring(false)}
  }

  if(!open)return null
  return <div className="fixed inset-0 z-[70] bg-[#102943]/35" onClick={onClose}>
    <aside className="ml-auto h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl" onClick={e=>e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e2e7eb] bg-white px-6 py-5">
        <div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Record history</div><h2 className="mt-2 text-2xl font-semibold text-[#102943]">{tableName?.replace(/_/g,' ')}</h2><p className="mt-1 text-xs text-[#7b8791]">Record {recordId}</p></div>
        <button onClick={onClose} className="rounded-xl p-2 text-[#71808c] hover:bg-[#f1f4f5]"><X size={18}/></button>
      </div>

      <div className="grid min-h-[calc(100vh-92px)] lg:grid-cols-[260px_1fr]">
        <div className="border-r border-[#e2e7eb] p-4">
          {loading?<div className="p-4 text-sm text-[#7b8791]">Loading versions…</div>:versions.length===0?<div className="p-4 text-sm text-[#7b8791]">No version history is available.</div>:<div className="space-y-2">{versions.map(v=><button key={v.id} onClick={()=>setSelected(v)} className={`w-full rounded-xl border p-3 text-left ${selected?.id===v.id?'border-[#8fb0c7] bg-[#eef5f8]':'border-[#e5eaed] hover:bg-[#f8fafb]'}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#26384a]">Version {v.versionNumber}</span><span className="badge badge-muted">{v.operation}</span></div><div className="mt-2 flex items-center gap-1 text-[11px] text-[#87929b]"><Clock3 size={12}/>{new Date(v.createdAt).toLocaleString()}</div></button>)}</div>}
        </div>

        <div className="p-5">
          {message&&<div className="mb-4 rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}
          {!selected?<div className="rounded-xl bg-[#f7f9fa] p-6 text-sm text-[#7b8791]">Select a version to inspect.</div>:<>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[#102943]"><GitCompare size={18}/><h3 className="font-semibold">Version comparison</h3></div><p className="mt-1 text-xs text-[#87929b]">Compare the selected version with the version immediately before it.</p></div><button onClick={()=>void restore()} disabled={restoring} className="btn btn-gold"><RotateCcw size={15}/>{restoring?'Restoring…':'Restore version'}</button></div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <JsonPanel title={`Version ${selected.versionNumber}`} value={selected.snapshot}/>
              <JsonPanel title={previous?`Previous version ${previous.versionNumber}`:'No earlier version'} value={previous?.snapshot||{}}/>
            </div>
          </>}
        </div>
      </div>
    </aside>
  </div>
}

function JsonPanel({title,value}:{title:string;value:Record<string,unknown>}) {
  return <section className="overflow-hidden rounded-2xl border border-[#dfe3e7]"><div className="border-b border-[#e6ecef] bg-[#f7f9fa] px-4 py-3 text-sm font-semibold text-[#26384a]">{title}</div><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-5 text-[#52616d]">{JSON.stringify(value,null,2)}</pre></section>
}

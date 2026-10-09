import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Amendment = {
  id: string
  department: string
  project_id: string
  report_week: string
  reason: string
  status: string
  requested_at: string
  requested_by: string
  review_note: string | null
  original_snapshot: unknown
  proposed_snapshot: unknown
}
export default function ReportAmendmentReview({ projectId }: { projectId: number | null }) {
  const [items, setItems] = useState<Amendment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string,string>>({})
  const [showHistory, setShowHistory] = useState(false)
  const load = useCallback(async () => {
    if (projectId === null) { setItems([]); return }
    setLoading(true); setError('')
    const { data, error: queryError } = await supabase.from('report_amendment_requests')
      .select('id,department,project_id,report_week,reason,status,requested_at,requested_by,review_note,original_snapshot,proposed_snapshot')
      .eq('project_id', String(projectId)).order('requested_at', { ascending: false })
    if (queryError) { setError(queryError.message); setItems([]) }
    else setItems((data || []) as Amendment[])
    setLoading(false)
  }, [projectId])
  useEffect(() => { void load() }, [load])
  const decide = async (item: Amendment, approve: boolean) => {
    const note = (notes[item.id] || '').trim()
    if (note.length < 5) { setError('Enter a review note of at least five characters.'); return }
    if (!window.confirm(`${approve ? 'Approve' : 'Reject'} this ${item.department} amendment? The original report will remain unchanged.`)) return
    setBusy(item.id); setError('')
    const { error: rpcError } = await supabase.rpc('review_report_amendment', {
      p_request_id: item.id, p_approve: approve, p_review_note: note
    })
    if (rpcError) setError(rpcError.message)
    else await load()
    setBusy(null)
  }
  const visible = showHistory ? items : items.filter(x => x.status === 'pending')
  return <section className="rounded-2xl border border-[#dfe5ea] bg-white p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold text-xl">Report amendment approvals</h2>
        <p className="text-sm text-[#65717c]">Design and Costing · original submissions remain locked.</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setShowHistory(x => !x)} className="rounded border px-3 py-2 text-sm">{showHistory ? 'Pending only' : 'Show history'}</button>
        <button type="button" onClick={() => void load()} className="rounded border px-3 py-2 text-sm">Refresh</button>
      </div>
    </div>
    {!projectId && <p>Select a project to review amendments.</p>}
    {loading && <p>Loading amendment requests…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loading && !!projectId && visible.length === 0 && !error && <p className="text-sm text-[#65717c]">No {showHistory ? '' : 'pending '}amendments found for this project.</p>}
    {visible.map(item => <article key={item.id} className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><strong className="capitalize">{item.department} · Week {item.report_week}</strong><span className="text-sm">{item.status}</span></div>
      <p className="text-sm"><strong>Reason:</strong> {item.reason}</p>
      <p className="text-xs text-[#65717c]">Requested {new Date(item.requested_at).toLocaleString('en-NG',{timeZone:'Africa/Lagos'})}</p>
      <details className="text-sm"><summary className="cursor-pointer">Compare original and proposed snapshots</summary>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div><strong>Original</strong><pre className="overflow-auto max-h-64 bg-gray-50 p-2 text-xs">{JSON.stringify(item.original_snapshot,null,2) || 'No original snapshot recorded'}</pre></div>
          <div><strong>Proposed</strong><pre className="overflow-auto max-h-64 bg-gray-50 p-2 text-xs">{JSON.stringify(item.proposed_snapshot,null,2)}</pre></div>
        </div>
      </details>
      {item.status === 'pending' ? <div className="space-y-2">
        <label className="block text-sm">Decision note (required)
          <textarea className="mt-1 block w-full rounded border p-2" rows={2} value={notes[item.id] || ''} onChange={e => setNotes(prev => ({...prev,[item.id]:e.target.value}))} />
        </label>
        <div className="flex gap-2">
          <button type="button" disabled={busy !== null} onClick={() => void decide(item,true)} className="rounded bg-[#087f73] px-4 py-2 text-white disabled:opacity-50">Approve</button>
          <button type="button" disabled={busy !== null} onClick={() => void decide(item,false)} className="rounded border px-4 py-2 disabled:opacity-50">Reject</button>
        </div>
      </div> : <p className="text-sm"><strong>Review:</strong> {item.review_note || 'No note'}</p>}
    </article>)}
  </section>
}

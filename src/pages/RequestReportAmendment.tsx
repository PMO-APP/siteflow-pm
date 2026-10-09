import { useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Report = { id: string; report_week: string; snapshot_data?: unknown }
type JsonObject = Record<string, unknown>
const protectedFields = new Set(['projectName','reportWeek','preparedBy','generatedAt','id','project_id','submitted_by','submitted_at'])
const pretty = (value: string) => value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,s=>s.toUpperCase())
const isObject = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isScalar = (value: unknown) => value === null || ['string','number','boolean'].includes(typeof value)
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export default function RequestReportAmendment({ department, submission }: { department: 'design' | 'costing'; submission: Report }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [draft, setDraft] = useState<JsonObject>({})
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [changes, setChanges] = useState<string[]>([])
  const start = () => {
    if (!isObject(submission.snapshot_data)) {
      setMessage('This historical report has no usable saved snapshot. Contact PMO to verify the original before requesting a correction.')
      return
    }
    setDraft(clone(submission.snapshot_data))
    setChanges([]); setReason(''); setMessage(''); setOpen(true)
  }
  const update = (path: Array<string | number>, value: string, original: unknown) => {
    let nextValue: unknown = value
    if (typeof original === 'number') {
      if (value.trim() === '' || !Number.isFinite(Number(value))) { setMessage('Enter a valid number.'); return }
      nextValue = Number(value)
    } else if (typeof original === 'boolean') nextValue = value === 'true'
    const next = clone(draft)
    let target: any = next
    for (const key of path.slice(0,-1)) target = target[key]
    target[path[path.length-1]] = nextValue
    setDraft(next)
    const name = path.map(String).join('.')
    setChanges(current => current.includes(name) ? current : [...current,name])
    setMessage('')
  }
  const renderFields = (value: unknown, path: Array<string | number> = [], depth = 0): ReactNode => {
    if (depth > 5) return <p className="text-xs text-gray-500">Additional nested data is retained unchanged.</p>
    if (Array.isArray(value)) return <div className="space-y-3">{value.map((entry,index) =>
      <div key={index} className="rounded border p-3"><p className="text-xs font-semibold mb-2">Item {index+1}</p>{renderFields(entry,[...path,index],depth+1)}</div>
    )}</div>
    if (isObject(value)) return <div className="space-y-3">{Object.entries(value).filter(([key])=>!protectedFields.has(key)).map(([key,entry]) =>
      <div key={key}>{!isScalar(entry) && <h4 className="text-sm font-semibold mb-2">{pretty(key)}</h4>}{renderFields(entry,[...path,key],depth+1)}</div>
    )}</div>
    if (path.length === 0) return null
    const label = pretty(String(path[path.length-1]))
    if (typeof value === 'boolean') return <label className="block text-sm">{label}<select className="mt-1 block w-full border rounded p-2" value={String(value)} onChange={e=>update(path,e.target.value,value)}><option value="true">Yes</option><option value="false">No</option></select></label>
    if (value === null) return <p className="text-xs text-gray-500">{label}: No original value (retained unchanged)</p>
    if (typeof value === 'number') return <label className="block text-sm">{label}<input type="number" step="any" className="mt-1 block w-full border rounded p-2" value={value} onChange={e=>update(path,e.target.value,value)} /></label>
    if (typeof value === 'string') return <label className="block text-sm">{label}<textarea rows={value.length > 90 ? 3 : 1} className="mt-1 block w-full border rounded p-2" value={value} onChange={e=>update(path,e.target.value,value)} /></label>
    return null
  }
  const send = async () => {
    if (reason.trim().length < 10) { setMessage('Explain the correction in at least 10 characters.'); return }
    if (!changes.length) { setMessage('Change at least one report field before requesting an amendment.'); return }
    setSending(true); setMessage('')
    const { error } = await supabase.rpc('request_report_amendment', {
      p_department: department, p_submission_id: submission.id,
      p_proposed_snapshot: draft, p_reason: reason.trim(),
    })
    setSending(false)
    if (error) setMessage(error.message)
    else { setOpen(false); setMessage('Amendment request sent to PMO. The original report remains locked.') }
  }
  return <div className="inline-block">
    <button type="button" className="btn btn-sm" onClick={start}>Request amendment</button>
    {message && <p role="status" className="text-xs mt-1 max-w-sm">{message}</p>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Request report amendment" className="bg-white text-[#183047] rounded-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-4">
        <h3 className="text-lg font-semibold">Request {department} report amendment</h3>
        <p className="text-sm">Week: {submission.report_week}. Edit the values that need correction. The submitted original remains unchanged.</p>
        <label className="block text-sm font-medium">Reason for correction<textarea rows={3} className="mt-1 w-full border rounded p-2" value={reason} onChange={e=>setReason(e.target.value)} /></label>
        <div className="border-t pt-3 space-y-3"><h4 className="font-semibold">Report values</h4>{renderFields(draft)}</div>
        <p className="text-sm">Fields changed: {changes.length}. {changes.length ? changes.map(pretty).join(', ') : 'No changes yet.'}</p>
        <p className="text-xs text-gray-600">Financial totals and derived statistics may require recalculation. PMO must review the full corrected snapshot before approval.</p>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        <div className="flex gap-2 justify-end"><button type="button" className="btn" disabled={sending} onClick={()=>setOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" disabled={sending} onClick={()=>void send()}>{sending ? 'Sending…' : 'Send to PMO'}</button></div>
      </div>
    </div>}
  </div>
}

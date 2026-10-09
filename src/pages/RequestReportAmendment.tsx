import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Report = { id: string; report_week: string; snapshot_data?: unknown }
export default function RequestReportAmendment({
  department, submission,
}: { department: 'design' | 'costing'; submission: Report }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [snapshotText, setSnapshotText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const start = () => {
    if (!submission.snapshot_data || typeof submission.snapshot_data !== 'object') {
      setMessage('This legacy submission has no saved snapshot. Contact PMO to verify the original report before requesting a correction.')
      return
    }
    setSnapshotText(JSON.stringify(submission.snapshot_data, null, 2))
    setReason('')
    setMessage('')
    setOpen(true)
  }
  const send = async () => {
    if (reason.trim().length < 10) { setMessage('Please explain the correction in at least 10 characters.'); return }
    let snapshot: unknown
    try {
      snapshot = JSON.parse(snapshotText)
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || Object.keys(snapshot).length === 0) {
        throw new Error('Snapshot must be a nonempty JSON object.')
      }
    } catch {
      setMessage('Corrected report data must be valid JSON.')
      return
    }
    setSending(true); setMessage('')
    const { error } = await supabase.rpc('request_report_amendment', {
      p_department: department,
      p_submission_id: submission.id,
      p_proposed_snapshot: snapshot,
      p_reason: reason.trim(),
    })
    setSending(false)
    if (error) setMessage(error.message)
    else { setOpen(false); setMessage('Amendment request sent to PMO for review. The submitted report remains unchanged.') }
  }
  return <div className="inline-block">
    <button type="button" className="btn btn-sm" onClick={start}>Request amendment</button>
    {message && <p role="status" className="text-xs mt-1 max-w-sm">{message}</p>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Request report amendment" className="bg-white text-[#183047] rounded-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-3">
        <h3 className="text-lg font-semibold">Request {department} report amendment</h3>
        <p className="text-sm">Reporting week: {submission.report_week}. Your original submission stays locked. An approved correction is stored separately for audit.</p>
        <label className="block text-sm">Reason for correction
          <textarea rows={3} className="mt-1 w-full border rounded p-2" value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <label className="block text-sm">Proposed corrected snapshot (JSON)
          <textarea rows={12} spellCheck={false} className="mt-1 w-full font-mono text-xs border rounded p-2" value={snapshotText} onChange={e => setSnapshotText(e.target.value)} />
        </label>
        <p className="text-xs text-amber-700">Advanced correction editor: change only the fields that need correction. PMO will compare your proposal against the original before deciding.</p>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn" disabled={sending} onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={sending} onClick={() => void send()}>{sending ? 'Submitting…' : 'Send request'}</button>
        </div>
      </div>
    </div>}
  </div>
}

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useMembershipStore } from '@/store/membership'
import RFIStatusBadge from '../components/RFIStatusBadge'
import { useRFI, useTransitionRFI } from '../hooks/useRFIs'

export default function RFIDetailPage() {
  const { rfiId } = useParams()
  const { data: rfi, isLoading, error } = useRFI(rfiId)
  const transition = useTransitionRFI()
  const role = useMembershipStore((state) => state.role)
  const [response, setResponse] = useState('')

  const canAnswer = ['workspace_admin', 'admin', 'pmo', 'consultant', 'design', 'project_owner', 'overall_project_owner'].includes(role ?? '')

  if (isLoading) return <div className="panel p-8">Loading…</div>
  if (error || !rfi) return <div className="panel p-8 text-red-300">{(error as Error)?.message || 'RFI not found'}</div>

  const mutationError = transition.error ? (transition.error as Error).message : ''

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <Link to="/app/rfis" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} />Back to register</Link>
      <div className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div><div className="text-sm font-medium text-[#c49e48]">{rfi.reference_no}</div><h1 className="mt-1 text-2xl font-semibold">{rfi.title}</h1><p className="mt-2 text-sm text-slate-500">{rfi.discipline} · {rfi.priority} priority · Due {rfi.due_date || 'not set'}</p></div>
          <RFIStatusBadge status={rfi.status} />
        </div>
        <div className="mt-7 border-t border-white/10 pt-6"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Question</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">{rfi.question}</p></div>
        {rfi.response && <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-5"><h2 className="text-sm font-semibold text-emerald-300">Response</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">{rfi.response}</p></div>}
      </div>

      {mutationError && <div className="panel p-4 text-sm text-red-300">{mutationError}</div>}
      {rfi.status === 'Draft' && <div className="panel flex justify-end p-4"><button disabled={transition.isPending} className="btn-primary" onClick={() => transition.mutate({ id: rfi.id, status: 'Submitted' })}>{transition.isPending ? 'Submitting…' : 'Submit RFI'}</button></div>}
      {canAnswer && ['Submitted', 'Under Review'].includes(rfi.status) && <div className="panel space-y-4 p-6"><h2 className="font-semibold">Provide response</h2><textarea className="form-control" rows={6} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Enter the formal response…" /><div className="flex justify-end"><button disabled={!response.trim() || transition.isPending} className="btn-primary" onClick={() => transition.mutate({ id: rfi.id, status: 'Answered', response })}>{transition.isPending ? 'Issuing…' : 'Issue response'}</button></div></div>}
      {rfi.status === 'Answered' && <div className="panel flex justify-end p-4"><button disabled={transition.isPending} className="btn-primary" onClick={() => transition.mutate({ id: rfi.id, status: 'Closed' })}>{transition.isPending ? 'Closing…' : 'Close RFI'}</button></div>}
    </section>
  )
}

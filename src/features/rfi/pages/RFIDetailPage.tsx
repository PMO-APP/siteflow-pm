import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, MessageSquare, ScrollText } from 'lucide-react'
import { useRFI, useTransitionRFI } from '../hooks/useRFIs'
import RFIStatusBadge from '../components/RFIStatusBadge'
import RFISLAIndicator from '../components/RFISLAIndicator'
import RFIComments from '../components/RFIComments'
import RFITimeline from '../components/RFITimeline'
import { useMembershipStore } from '@/store/membership'

type Tab = 'overview' | 'conversation' | 'timeline'

export default function RFIDetailPage() {
  const { rfiId } = useParams()
  const { data: rfi, isLoading, error } = useRFI(rfiId)
  const action = useTransitionRFI()
  const role = useMembershipStore(state => state.role)
  const [response, setResponse] = useState('')
  const [tab, setTab] = useState<Tab>('overview')

  const canAnswer = ['workspace_admin', 'admin', 'pmo', 'consultant', 'design', 'project_owner'].includes(role || '')

  if (isLoading) return <div className="panel p-8">Loading…</div>
  if (error || !rfi) return <div className="panel p-8 text-red-300">{(error as Error)?.message || 'RFI not found'}</div>

  const tabs: Array<{ id: Tab; label: string; icon: typeof Clock3 }> = [
    { id: 'overview', label: 'Overview', icon: ScrollText },
    { id: 'conversation', label: 'Conversation', icon: MessageSquare },
    { id: 'timeline', label: 'Timeline', icon: Clock3 },
  ]

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <Link to="/app/rfis" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft size={15} /> Back to register
      </Link>

      <div className="panel overflow-hidden">
        <header className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div>
              <div className="text-sm font-medium text-[#c49e48]">{rfi.reference_no}</div>
              <h1 className="mt-1 text-2xl font-semibold">{rfi.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{rfi.discipline} · {rfi.priority} priority</p>
              <div className="mt-3"><RFISLAIndicator rfi={rfi} /></div>
            </div>
            <RFIStatusBadge status={rfi.status} />
          </div>
        </header>

        <nav className="flex gap-1 border-y border-white/[.08] bg-black/10 px-4">
          {tabs.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
                  tab === item.id
                    ? 'border-[#c49e48] text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-200'
                }`}
              >
                <Icon size={15} /> {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Question</h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">{rfi.question}</p>
              </div>

              {rfi.response && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-5">
                  <h2 className="text-sm font-semibold text-emerald-300">Formal response</h2>
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">{rfi.response}</p>
                </div>
              )}

              {rfi.status === 'Draft' && (
                <div className="flex justify-end border-t border-white/10 pt-5">
                  <button
                    className="btn-primary"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id: rfi.id, status: 'Submitted' })}
                  >
                    Submit RFI
                  </button>
                </div>
              )}

              {canAnswer && ['Submitted', 'Under Review'].includes(rfi.status) && (
                <div className="space-y-4 border-t border-white/10 pt-5">
                  <h2 className="font-semibold">Provide formal response</h2>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={response}
                    onChange={event => setResponse(event.target.value)}
                    placeholder="Enter the approved technical response…"
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={!response.trim() || action.isPending}
                      className="btn-primary"
                      onClick={() => action.mutate({ id: rfi.id, status: 'Answered', response })}
                    >
                      Issue response
                    </button>
                  </div>
                </div>
              )}

              {rfi.status === 'Answered' && (
                <div className="flex justify-end border-t border-white/10 pt-5">
                  <button
                    className="btn-primary"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id: rfi.id, status: 'Closed' })}
                  >
                    Close RFI
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'conversation' && <RFIComments rfiId={rfi.id} />}
          {tab === 'timeline' && <RFITimeline rfiId={rfi.id} />}
        </div>
      </div>
    </section>
  )
}

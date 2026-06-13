import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useExternalProjectStore } from '@/store/externalProject'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { notifyUsers } from '@/lib/notifications'

export default function ExternalRFIPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  const {
    externalProjectId,
    externalProjectName,
    setExternalProject,
  } = useExternalProjectStore()

  const projectFromUrl = searchParams.get('project')
  const activeProjectId = externalProjectId || Number(projectFromUrl) || null

  const [rfis, setRfis] = useState<any[]>([])
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    syncProjectFromUrl()
  }, [projectFromUrl])

  useEffect(() => {
    loadRFIs()
  }, [activeProjectId, user?.email])

  async function syncProjectFromUrl() {
    if (!projectFromUrl) return

    const projectId = Number(projectFromUrl)

    if (!projectId || externalProjectId === projectId) return

    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('id', projectId)
      .maybeSingle()

    if (data) {
      setExternalProject(data.id, data.project_name)
    }
  }

  async function loadRFIs() {
    if (!activeProjectId || !user?.email) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('external_rfis')
      .select('*')
      .eq('project_id', activeProjectId)
      .eq('submitted_by_email', user.email)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setRfis(data || [])
    setLoading(false)
  }

  async function submitRFI() {
    setNotice('')

    if (!activeProjectId) {
      setNotice('Please select a project from the External Portal first.')
      return
    }

    if (!subject.trim()) {
      setNotice('RFI subject is required.')
      return
    }

    if (!question.trim()) {
      setNotice('RFI question/comment is required.')
      return
    }

    setSubmitting(true)

    const cleanSubject = subject.trim()
    const cleanQuestion = question.trim()

    const { error } = await supabase.from('external_rfis').insert({
      project_id: activeProjectId,
      submitted_by: user?.full_name || user?.email || 'External User',
      submitted_by_email: user?.email || '',
      subject: cleanSubject,
      question: cleanQuestion,
      status: 'Open',
    })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await notifyUsers({
      projectId: activeProjectId,
      recipientRole: 'pmo',
      type: 'rfi',
      title: 'New RFI / Comment Submitted',
      message: `${
        user?.full_name || user?.email || 'External user'
      } submitted: ${cleanSubject}`,
      sendEmail: true,
      emailPayload: {
        to: ['e.bio-ibogomo@mixtafrica.com'],
        subject: `New RFI Submitted: ${cleanSubject}`,
        type: 'RFI / Comment',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message: cleanQuestion,
        reviewUrl: `${window.location.origin}/app/external-review`,
      },
    })

    setSubject('')
    setQuestion('')
    setNotice('RFI submitted successfully. The internal team has been notified.')
    setSubmitting(false)

    await loadRFIs()
  }

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PMOCorexLogo size={42} />

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-ghost"
            >
              <ArrowLeft size={15} />
              External Portal
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="btn btn-gold"
            >
              Profile
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
          <div className="relative">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              RFIs & Comments
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
              Comments / RFIs
            </h1>

            <p className="text-slate-400 mt-3 max-w-2xl">
              Submit clarifications for the selected project only.
            </p>

            <div className="mt-4 text-sm text-slate-500">
              Current Project:{' '}
              <span className="text-[#c49e48]">
                {externalProjectName || 'No project selected'}
              </span>
            </div>
          </div>
        </section>

        {notice && (
          <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
            {notice}
          </div>
        )}

        {!activeProjectId && (
          <div className="card p-6 text-center">
            <p className="text-slate-400">
              Please select a project before submitting RFIs.
            </p>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold mt-4"
            >
              Select Project
            </button>
          </div>
        )}

        {activeProjectId && (
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card p-6 xl:col-span-1">
              <div className="flex items-center gap-2 mb-5">
                <Send size={18} className="text-[#c49e48]" />

                <h2 className="text-lg font-bold text-[#ede8de]">
                  Submit New RFI
                </h2>
              </div>

              <div className="space-y-3">
                <input
                  className="form-control"
                  placeholder="Subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />

                <textarea
                  className="form-control min-h-[160px]"
                  placeholder="Write your question, comment, or clarification request..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                />

                <button
                  onClick={submitRFI}
                  disabled={submitting}
                  className="btn btn-gold w-full justify-center"
                >
                  {submitting ? 'Submitting…' : 'Submit RFI'}
                </button>
              </div>
            </div>

            <div className="xl:col-span-2 space-y-4">
              {loading ? (
                <div className="card p-6 text-slate-400">
                  Loading RFIs…
                </div>
              ) : rfis.length === 0 ? (
                <div className="card p-10 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                    <MessageSquare size={24} className="text-[#c49e48]" />
                  </div>

                  <div className="text-xl font-bold text-white">
                    No RFIs submitted yet
                  </div>

                  <p className="text-sm text-slate-500 mt-2">
                    RFIs for this selected project will appear here.
                  </p>
                </div>
              ) : (
                rfis.map(rfi => <RFICard key={rfi.id} rfi={rfi} />)
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function RFICard({ rfi }: { rfi: any }) {
  const isClosed = rfi.status === 'Closed' || rfi.status === 'Responded'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#ede8de]">
            {rfi.subject}
          </h2>

          <div className="text-xs text-slate-500 mt-1">
            Submitted:{' '}
            {rfi.created_at
              ? new Date(rfi.created_at).toLocaleDateString('en-GB')
              : '—'}
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-1 ${
            isClosed
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
          }`}
        >
          {isClosed ? <CheckCircle size={13} /> : <Clock size={13} />}
          {rfi.status || 'Open'}
        </span>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-[#6e7d8c]">
          Question / Comment
        </div>

        <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
          {rfi.question}
        </p>
      </div>

      {rfi.internal_response && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-xs uppercase tracking-wider text-emerald-400">
            Internal Response
          </div>

          <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">
            {rfi.internal_response}
          </p>

          <div className="text-xs text-slate-500 mt-3">
            Responded by {rfi.responded_by || 'Internal Team'}
          </div>
        </div>
      )}
    </div>
  )
}

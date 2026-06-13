import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  FolderUp,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useExternalProjectStore } from '@/store/externalProject'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

export default function ExternalSubmissionStatusPage() {
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

  const [documents, setDocuments] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [rfis, setRfis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    syncProjectFromUrl()
  }, [projectFromUrl])

  useEffect(() => {
    loadSubmissions()
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

  async function loadSubmissions() {
    if (!activeProjectId || !user?.email) {
      setLoading(false)
      return
    }

    setLoading(true)

    const [
      { data: docs, error: docsError },
      { data: reps, error: repsError },
      { data: rfiRows, error: rfiError },
    ] = await Promise.all([
      supabase
        .from('external_documents')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('uploaded_by_email', user.email)
        .order('created_at', { ascending: false }),

      supabase
        .from('external_progress_reports')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('submitted_by_email', user.email)
        .order('created_at', { ascending: false }),

      supabase
        .from('external_rfis')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('submitted_by_email', user.email)
        .order('created_at', { ascending: false }),
    ])

    if (docsError || repsError || rfiError) {
      setNotice(
        docsError?.message ||
          repsError?.message ||
          rfiError?.message ||
          'Unable to load submissions.'
      )
      setLoading(false)
      return
    }

    setDocuments(docs || [])
    setReports(reps || [])
    setRfis(rfiRows || [])
    setLoading(false)
  }

  const totalSubmissions = documents.length + reports.length + rfis.length

  const pendingCount = [...documents, ...reports, ...rfis].filter(item =>
    ['Submitted', 'Open'].includes(item.status || '')
  ).length

  const approvedCount = [...documents, ...reports, ...rfis].filter(item =>
    ['Approved', 'Accepted', 'Responded', 'Closed'].includes(item.status || '')
  ).length

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
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              Submission Status
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
              My Submissions
            </h1>

            <p className="text-slate-400 mt-3 max-w-2xl">
              Track the review status of your documents, progress reports, and
              RFIs for the selected project only.
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
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {notice}
          </div>
        )}

        {!activeProjectId && (
          <div className="card p-6 text-center">
            <p className="text-slate-400">Please select a project first.</p>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold mt-4"
            >
              Select Project
            </button>
          </div>
        )}

        {activeProjectId && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon={ShieldCheck}
                title="Total Submissions"
                value={totalSubmissions}
              />
              <MetricCard
                icon={Clock}
                title="Pending Review"
                value={pendingCount}
              />
              <MetricCard
                icon={CheckCircle}
                title="Completed / Responded"
                value={approvedCount}
              />
            </section>

            {loading ? (
              <div className="card p-6 text-slate-400">
                Loading submissions…
              </div>
            ) : totalSubmissions === 0 ? (
              <div className="card p-10 text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                  <FolderUp size={24} className="text-[#c49e48]" />
                </div>

                <div className="text-xl font-bold text-white">
                  No submissions yet
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Your documents, reports, and RFIs for this selected project
                  will appear here once submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <SubmissionSection
                  title="Documents"
                  icon={FileText}
                  items={documents}
                  type="document"
                />

                <SubmissionSection
                  title="Progress Reports"
                  icon={ShieldCheck}
                  items={reports}
                  type="report"
                />

                <SubmissionSection
                  title="RFIs / Comments"
                  icon={MessageSquare}
                  items={rfis}
                  type="rfi"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  value,
}: {
  icon: any
  title: string
  value: number
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-black text-white">{value}</div>
          <div className="text-xs text-slate-500 mt-1">{title}</div>
        </div>

        <Icon size={22} className="text-[#c49e48]" />
      </div>
    </div>
  )
}

function SubmissionSection({
  title,
  icon: Icon,
  items,
  type,
}: {
  title: string
  icon: any
  items: any[]
  type: 'document' | 'report' | 'rfi'
}) {
  return (
    <section className="card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-[#c49e48]" />
          <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>
        </div>

        <span className="text-xs rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 text-[#c49e48] px-2 py-1">
          {items.length} item(s)
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
          No {title.toLowerCase()} submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <SubmissionCard key={`${type}-${item.id}`} item={item} type={type} />
          ))}
        </div>
      )}
    </section>
  )
}

function SubmissionCard({
  item,
  type,
}: {
  item: any
  type: 'document' | 'report' | 'rfi'
}) {
  const title =
    type === 'document'
      ? item.document_title
      : type === 'report'
      ? item.progress_summary
      : item.subject

  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-GB')
    : '—'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-bold text-[#ede8de]">
            {title || 'Untitled submission'}
          </h3>

          <p className="text-xs text-slate-500 mt-1">Submitted: {date}</p>

          {type === 'document' && item.file_url && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#c49e48] hover:underline mt-2 inline-block"
            >
              Open file/link
            </a>
          )}

          {type === 'rfi' && item.internal_response && (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="text-xs uppercase tracking-wider text-emerald-400">
                Internal Response
              </div>

              <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">
                {item.internal_response}
              </p>
            </div>
          )}

          {item.review_comment && (
            <div className="mt-3 rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3">
              <div className="text-xs uppercase tracking-wider text-[#c49e48]">
                Review Comment
              </div>

              <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">
                {item.review_comment}
              </p>
            </div>
          )}
        </div>

        <StatusBadge status={item.status || 'Submitted'} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style =
    ['Approved', 'Accepted', 'Responded', 'Closed'].includes(status)
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : ['Rejected'].includes(status)
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : status.includes('Required')
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'

  return (
    <span className={`text-xs rounded-full border px-2 py-1 ${style}`}>
      {status}
    </span>
  )
}

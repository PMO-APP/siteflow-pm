import { useEffect, useState } from 'react'
import {
  CheckCircle,
  FileText,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export default function ExternalReviewDashboard() {
  const { user } = useAuthStore()

  const [documents, setDocuments] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [rfis, setRfis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    loadSubmissions()
  }, [])

  async function loadSubmissions() {
    setLoading(true)

    const [
      { data: docs, error: docsError },
      { data: reps, error: repsError },
      { data: rfiRows, error: rfisError },
    ] = await Promise.all([
      supabase
        .from('external_documents')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('external_progress_reports')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('external_rfis')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    if (docsError || repsError || rfisError) {
      setNotice(
        docsError?.message ||
          repsError?.message ||
          rfisError?.message ||
          'Unable to load external submissions.'
      )
      setLoading(false)
      return
    }

    setDocuments(docs || [])
    setReports(reps || [])
    setRfis(rfiRows || [])
    setLoading(false)
  }

  async function updateDocumentStatus(
    id: number,
    status: string,
    comment = ''
  ) {
    const { error } = await supabase
      .from('external_documents')
      .update({
        status,
        review_comment: comment || null,
        reviewed_by: user?.email || 'Internal Team',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadSubmissions()
  }

  async function updateReportStatus(
    id: number,
    status: string,
    comment = ''
  ) {
    const { error } = await supabase
      .from('external_progress_reports')
      .update({
        status,
        review_comment: comment || null,
        reviewed_by: user?.email || 'Internal Team',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadSubmissions()
  }

  async function respondToRFI(id: number, response: string) {
    if (!response.trim()) return

    const { error } = await supabase
      .from('external_rfis')
      .update({
        status: 'Responded',
        internal_response: response.trim(),
        responded_by: user?.email || 'Internal Team',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadSubmissions()
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Internal Review
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          External Review & Approval
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Review documents, progress reports, and RFIs submitted by external
          consultants, contractors, vendors, and subcontractors.
        </p>
      </section>

      {notice && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-slate-400">
          Loading external submissions…
        </div>
      ) : (
        <>
          <ReviewSection
            title="External Documents"
            icon={FileText}
            count={documents.length}
          >
            {documents.length === 0 ? (
              <EmptyState text="No external documents submitted yet." />
            ) : (
              documents.map(doc => (
                <DocumentReviewCard
                  key={doc.id}
                  item={doc}
                  onApprove={() => updateDocumentStatus(doc.id, 'Approved')}
                  onReject={() => updateDocumentStatus(doc.id, 'Rejected')}
                  onRevision={() =>
                    updateDocumentStatus(doc.id, 'Revision Required')
                  }
                />
              ))
            )}
          </ReviewSection>

          <ReviewSection
            title="Progress Reports"
            icon={ShieldCheck}
            count={reports.length}
          >
            {reports.length === 0 ? (
              <EmptyState text="No progress reports submitted yet." />
            ) : (
              reports.map(report => (
                <ReportReviewCard
                  key={report.id}
                  item={report}
                  onAccept={() => updateReportStatus(report.id, 'Accepted')}
                  onClarify={() =>
                    updateReportStatus(report.id, 'Clarification Required')
                  }
                />
              ))
            )}
          </ReviewSection>

          <ReviewSection
            title="RFIs / Comments"
            icon={MessageSquare}
            count={rfis.length}
          >
            {rfis.length === 0 ? (
              <EmptyState text="No RFIs submitted yet." />
            ) : (
              rfis.map(rfi => (
                <RFIReviewCard
                  key={rfi.id}
                  item={rfi}
                  onRespond={response => respondToRFI(rfi.id, response)}
                />
              ))
            )}
          </ReviewSection>
        </>
      )}
    </div>
  )
}

function ReviewSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string
  icon: any
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-[#c49e48]" />

          <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>
        </div>

        <span className="text-xs rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 text-[#c49e48] px-2 py-1">
          {count} item(s)
        </span>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  )
}

function DocumentReviewCard({
  item,
  onApprove,
  onReject,
  onRevision,
}: {
  item: any
  onApprove: () => void
  onReject: () => void
  onRevision: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-bold text-[#ede8de]">{item.document_title}</h3>

          <p className="text-sm text-slate-500 mt-1">
            {item.document_type || 'Document'} • Submitted by{' '}
            {item.uploaded_by || item.uploaded_by_email || 'External User'}
          </p>

          {item.file_url && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#c49e48] hover:underline mt-2 inline-block"
            >
              Open file/link
            </a>
          )}
        </div>

        <StatusBadge status={item.status || 'Submitted'} />
      </div>

      <ActionRow>
        <button onClick={onApprove} className="btn btn-sm btn-gold">
          <CheckCircle size={14} />
          Approve
        </button>

        <button onClick={onRevision} className="btn btn-sm btn-ghost">
          <RefreshCcw size={14} />
          Request Revision
        </button>

        <button onClick={onReject} className="btn btn-sm btn-ghost">
          <XCircle size={14} />
          Reject
        </button>
      </ActionRow>
    </div>
  )
}

function ReportReviewCard({
  item,
  onAccept,
  onClarify,
}: {
  item: any
  onAccept: () => void
  onClarify: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-bold text-[#ede8de]">
            {item.progress_summary}
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            {item.report_date || 'No date'} • Submitted by{' '}
            {item.submitted_by || item.submitted_by_email || 'External User'}
          </p>

          {item.issues_risks && (
            <p className="text-sm text-red-400 mt-2">
              Issues/Risks: {item.issues_risks}
            </p>
          )}
        </div>

        <StatusBadge status={item.status || 'Submitted'} />
      </div>

      <ActionRow>
        <button onClick={onAccept} className="btn btn-sm btn-gold">
          <CheckCircle size={14} />
          Accept Report
        </button>

        <button onClick={onClarify} className="btn btn-sm btn-ghost">
          <RefreshCcw size={14} />
          Request Clarification
        </button>
      </ActionRow>
    </div>
  )
}

function RFIReviewCard({
  item,
  onRespond,
}: {
  item: any
  onRespond: (response: string) => void
}) {
  const [response, setResponse] = useState(item.internal_response || '')

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-bold text-[#ede8de]">{item.subject}</h3>

          <p className="text-sm text-slate-500 mt-1">
            Submitted by {item.submitted_by || item.submitted_by_email}
          </p>
        </div>

        <StatusBadge status={item.status || 'Open'} />
      </div>

      <p className="text-sm text-slate-300 whitespace-pre-wrap">
        {item.question}
      </p>

      <textarea
        className="form-control min-h-[90px]"
        placeholder="Write internal response..."
        value={response}
        onChange={e => setResponse(e.target.value)}
      />

      <button
        onClick={() => onRespond(response)}
        className="btn btn-sm btn-gold"
      >
        Respond & Mark Responded
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'Approved' || status === 'Accepted' || status === 'Responded'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : status === 'Rejected'
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

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 mt-4">{children}</div>
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  FileText,
  FolderUp,
  UploadCloud,
  CheckCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const DOCUMENT_TYPES = [
  'Drawing',
  'Progress Photo',
  'Method Statement',
  'Material Approval',
  'Inspection Report',
  'Certificate',
  'Other',
]

export default function ExternalDocumentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const projectId = useMembershipStore(state => state.projectId)

  const [documents, setDocuments] = useState<any[]>([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentType, setDocumentType] = useState('Drawing')
  const [fileUrl, setFileUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [projectId, user?.email])

  async function loadDocuments() {
    if (!projectId || !user?.email) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('external_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('uploaded_by_email', user.email)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setDocuments(data || [])
    setLoading(false)
  }

  async function submitDocument() {
    setNotice('')

    if (!projectId) {
      setNotice('No project is assigned to your account.')
      return
    }

    if (!documentTitle.trim()) {
      setNotice('Document title is required.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('external_documents').insert({
      project_id: projectId,
      uploaded_by: user?.full_name || user?.email || 'External User',
      uploaded_by_email: user?.email || '',
      document_title: documentTitle.trim(),
      document_type: documentType,
      file_url: fileUrl.trim() || null,
      status: 'Submitted',
    })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    setDocumentTitle('')
    setDocumentType('Drawing')
    setFileUrl('')
    setNotice('Document submitted successfully for internal review.')
    setSubmitting(false)

    await loadDocuments()
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
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              External Documents
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
              Upload Documents
            </h1>

            <p className="text-slate-400 mt-3 max-w-2xl">
              Submit drawings, photos, reports, certificates, and supporting
              files for internal PMOCorex review.
            </p>
          </div>
        </section>

        {notice && (
          <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="card p-6 xl:col-span-1">
            <div className="flex items-center gap-2 mb-5">
              <UploadCloud size={18} className="text-[#c49e48]" />

              <h2 className="text-lg font-bold text-[#ede8de]">
                Submit Document
              </h2>
            </div>

            <div className="space-y-3">
              <input
                className="form-control"
                placeholder="Document title"
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
              />

              <select
                className="form-control"
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <input
                className="form-control"
                placeholder="File URL or document link"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
              />

              <button
                onClick={submitDocument}
                disabled={submitting}
                className="btn btn-gold w-full justify-center"
              >
                {submitting ? 'Submitting…' : 'Submit Document'}
              </button>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            {loading ? (
              <div className="card p-6 text-slate-400">
                Loading submitted documents…
              </div>
            ) : documents.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                  <FolderUp size={24} className="text-[#c49e48]" />
                </div>

                <div className="text-xl font-bold text-white">
                  No documents submitted yet
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Your submitted documents will appear here.
                </p>
              </div>
            ) : (
              documents.map(doc => (
                <DocumentCard key={doc.id} document={doc} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function DocumentCard({ document }: { document: any }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#c49e48]" />

            <h2 className="text-lg font-bold text-[#ede8de]">
              {document.document_title}
            </h2>
          </div>

          <div className="text-sm text-slate-500 mt-1">
            {document.document_type || 'Document'} •{' '}
            {new Date(document.created_at).toLocaleDateString('en-GB')}
          </div>

          {document.file_url && (
            <a
              href={document.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#c49e48] hover:underline mt-2 inline-block"
            >
              Open file/link
            </a>
          )}
        </div>

        <span className="inline-flex items-center gap-1 text-xs rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 px-2 py-1">
          <CheckCircle size={13} />
          {document.status || 'Submitted'}
        </span>
      </div>
    </div>
  )
}

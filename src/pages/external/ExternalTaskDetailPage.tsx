import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Paperclip,
  Send,
  UploadCloud,
} from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useExternalProjectStore } from '@/store/externalProject'
import { notifyUsers } from '@/lib/notifications'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Submitted', 'Completed']

export default function ExternalTaskDetailPage() {
  const navigate = useNavigate()
  const { taskId } = useParams()
  const [searchParams] = useSearchParams()

  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const {
    externalProjectId,
    externalProjectName,
    setExternalProject,
  } = useExternalProjectStore()

  const projectFromUrl = searchParams.get('project')
  const activeProjectId = externalProjectId || Number(projectFromUrl) || null

  const [task, setTask] = useState<any | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [comment, setComment] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
const [evidence, setEvidence] = useState<any[]>([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isLocked =
    task?.review_status === 'Approved' ||
    task?.status === 'Approved' ||
    task?.status === 'Completed'

  useEffect(() => {
    syncProjectFromUrl()
  }, [projectFromUrl])

  useEffect(() => {
    loadTaskDetail()
  }, [taskId, activeProjectId, user?.email, role])

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

  async function loadTaskDetail() {
    if (!taskId || !activeProjectId || !user?.email) {
      setLoading(false)
      return
    }

    setLoading(true)
    setNotice('')

    const { data: taskRow, error: taskError } = await supabase
      .from('external_tasks')
      .select('*')
      .eq('id', Number(taskId))
      .eq('project_id', activeProjectId)
      .or(`assigned_to_email.eq.${user.email},assigned_role.eq.${role || ''}`)
      .maybeSingle()

    if (taskError) {
      setNotice(taskError.message)
      setLoading(false)
      return
    }

    if (!taskRow) {
      setNotice('Task not found for this selected project.')
      setTask(null)
      setLoading(false)
      return
    }

    const { data: commentRows, error: commentError } = await supabase
      .from('external_task_comments')
      .select('*')
      .eq('task_id', Number(taskId))
      .eq('project_id', activeProjectId)
      .order('created_at', { ascending: true })

    if (commentError) {
      setNotice(commentError.message)
      setLoading(false)
      return
    }

    const { data: historyRows } = await supabase
      .from('external_task_history')
      .select('*')
      .eq('task_id', Number(taskId))
      .order('created_at', { ascending: false })

    setTask(taskRow)
    setComments(commentRows || [])
    setHistory(historyRows || [])
    await loadEvidence(Number(taskId))
    setLoading(false)
  }

  async function addHistory(action: string) {
    if (!task) return

    await supabase.from('external_task_history').insert({
      task_id: task.id,
      project_id: activeProjectId,
      action,
      performed_by: user?.full_name || user?.email || 'External User',
      performed_by_email: user?.email || '',
      performed_by_role: role || 'external',
    })
  }

  async function updateTaskStatus(status: string) {
    if (!task || !activeProjectId) return

    if (isLocked) {
      setNotice('This task has already been approved and locked.')
      return
    }

    setNotice('')

    const { error } = await supabase
      .from('external_tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('project_id', activeProjectId)

    if (error) {
      setNotice(error.message)
      return
    }

    await addHistory(`Status changed to ${status}`)

    await notifyUsers({
      projectId: activeProjectId,
      recipientRole: 'pmo',
      type: 'external_task_update',
      title: 'External Task Status Updated',
      message: `${
        user?.full_name || user?.email || 'External user'
      } updated "${task.title}" to ${status}.`,
      sendEmail: status === 'Submitted' || status === 'Completed',
      emailPayload: {
        to: ['YOUR_PMO_EMAIL@company.com'],
        subject: `External Task ${status}: ${task.title}`,
        type: 'External Task Update',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message: `Task: ${task.title}\nStatus: ${status}`,
        reviewUrl: `${window.location.origin}/app/external-task-review`,
      },
    })

    setTask({ ...task, status })
    await loadTaskDetail()
  }

  async function openEvidence(storagePath: string) {
    const { data, error } = await supabase.storage
      .from('external-task-evidence')
      .createSignedUrl(storagePath, 3600)

    if (error) {
      setNotice(error.message)
      return
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }
  async function uploadEvidenceFiles(taskId: number) {
  if (!activeProjectId) return []

  const uploadedFiles: {
  storagePath: string
  fileName: string
  fileType: string
  fileSize: number
}[] = []

  for (const file of evidenceFiles) {
    const safeName =
      file.name.replace(/\s+/g, '-')

    const storagePath =
      `${activeProjectId}/${taskId}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('external-task-evidence')
      .upload(storagePath, file)

    if (error) throw error

    uploadedFiles.push({
      storagePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  }

  return uploadedFiles
}
  async function loadEvidence(taskId: number) {
  const { data } = await supabase
    .from('external_task_evidence')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', {
      ascending: false,
    })

  setEvidence(data || [])
}

 async function sendComment() {
  setNotice('')

  if (isLocked) {
    setNotice('This task has already been approved and locked.')
    return
  }

  if (!task || !activeProjectId) {
    setNotice('Task or project not found.')
    return
  }

  if (!comment.trim() && evidenceFiles.length === 0) {
    setNotice('Please add a comment or upload evidence.')
    return
  }

  setSubmitting(true)

  try {
    const cleanComment = comment.trim()
    const uploadedFiles = await uploadEvidenceFiles(task.id)

    const { data: commentRow, error: commentError } = await supabase
      .from('external_task_comments')
      .insert({
        task_id: task.id,
        project_id: activeProjectId,
        sender_name: user?.full_name || user?.email || 'External User',
        sender_email: user?.email || '',
        sender_role: role || 'external',
        comment:
          cleanComment ||
          `${uploadedFiles.length} evidence file(s) uploaded.`,
        evidence_status:
          uploadedFiles.length > 0 ? 'Submitted' : null,
      })
      .select('id')
      .single()

    if (commentError) throw commentError

    if (uploadedFiles.length > 0) {
      const evidenceRows = uploadedFiles.map(file => ({
        task_id: task.id,
        project_id: activeProjectId,
        comment_id: commentRow.id,
        storage_path: file.storagePath,
        file_name: file.fileName,
        file_type: file.fileType,
        file_size: file.fileSize,
        evidence_status: 'Submitted',
        uploaded_by: user?.full_name || user?.email || 'External User',
        uploaded_by_email: user?.email || '',
        uploaded_by_role: role || 'external',
      }))

      const { error: evidenceError } = await supabase
        .from('external_task_evidence')
        .insert(evidenceRows)

      if (evidenceError) throw evidenceError
    }

    await addHistory(
      uploadedFiles.length > 0
        ? `${uploadedFiles.length} evidence file(s) uploaded`
        : 'Comment added'
    )

    await notifyUsers({
      projectId: activeProjectId,
      recipientRole: 'pmo',
      type: 'external_task_comment',
      title: `New Comment on Task: ${task.title}`,
      message: `${
        user?.full_name || user?.email || 'External user'
      } commented on "${task.title}".`,
      sendEmail: true,
      emailPayload: {
        to: ['YOUR_PMO_EMAIL@company.com'],
        subject: `New Task Comment: ${task.title}`,
        type: 'External Task Comment',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message:
          cleanComment ||
          `${uploadedFiles.length} evidence file(s) uploaded.`,
        reviewUrl: `${window.location.origin}/app/external-task-review`,
      },
    })

    setComment('')
    setEvidenceFiles([])
    setNotice('Comment/evidence sent. The internal team has been notified.')

    await loadTaskDetail()
  } catch (error: any) {
    setNotice(error.message || 'Unable to send comment/evidence.')
  } finally {
    setSubmitting(false)
  }
}

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PMOCorexLogo size={42} />

          <div className="flex gap-2">
            <button
              onClick={() =>
                navigate(`/external-project/tasks?project=${activeProjectId}`)
              }
              className="btn btn-ghost"
            >
              <ArrowLeft size={15} />
              My Tasks
            </button>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold"
            >
              External Portal
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
          <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
            Assignment Conversation
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
            Task Details
          </h1>

          <p className="text-slate-400 mt-3 max-w-2xl">
            View task details, update task status, add comments, and upload
            supporting evidence for internal review.
          </p>

          <div className="mt-4 text-sm text-slate-500">
            Current Project:{' '}
            <span className="text-[#c49e48]">
              {externalProjectName || 'No project selected'}
            </span>
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
              Please select a project before viewing task details.
            </p>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold mt-4"
            >
              Select Project
            </button>
          </div>
        )}

        {activeProjectId && loading && (
          <div className="card p-6 text-slate-400">
            Loading task details…
          </div>
        )}

        {activeProjectId && !loading && !task && (
          <div className="card p-10 text-center">
            <AlertTriangle size={30} className="mx-auto text-amber-400" />

            <div className="text-xl font-bold text-white mt-4">
              Task not found
            </div>

            <p className="text-sm text-slate-500 mt-2">
              This task may not belong to your selected project.
            </p>
          </div>
        )}

        {activeProjectId && !loading && task && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section className="card p-6 xl:col-span-1 space-y-5">
              <div>
                <h2 className="text-2xl font-black text-[#ede8de]">
                  {task.title}
                </h2>

                <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge status={task.status || 'Open'} />

                <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[#c49e48]">
                  Priority: {task.priority || 'Medium'}
                </span>

                <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-400">
                  Due: {task.due_date || 'Not set'}
                </span>
              </div>

              <div>
                <label className="form-label">Update Status</label>

                <select
                  className="form-control"
                  value={task.status || 'Pending'}
                  disabled={isLocked}
                  onChange={e => updateTaskStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Assigned To
                </div>

                <div className="text-[#ede8de] mt-1">
                  {task.assigned_to_name ||
                    task.assigned_to_email ||
                    task.assigned_company ||
                    'External Partner'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Assignment History
                </div>

                {history.length === 0 ? (
                  <div className="text-slate-500 text-xs">
                    No history yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map(item => (
                      <div
                        key={item.id}
                        className="border-l border-[#c49e48]/40 pl-3"
                      >
                        <div className="text-[#ede8de] text-xs">
                          {item.action}
                        </div>

                        <div className="text-slate-500 text-[11px] mt-1">
                          {item.performed_by || 'User'} •{' '}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString('en-GB')
                            : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card p-6 xl:col-span-2 space-y-5">
              {isLocked && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                  This submission has been approved by PMO and is now locked.
                </div>
              )}

              <div className="flex items-center gap-2">
  <Send size={18} className="text-[#c49e48]" />

  <h2 className="text-lg font-bold text-[#ede8de]">
    Task Conversation & Evidence
  </h2>
</div>

{evidence.length > 0 && (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
    <div className="font-bold text-[#ede8de]">
      Evidence Gallery
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {evidence.map(file => (
        <div
          key={file.id}
          className="rounded-xl border border-white/10 bg-[#0c1014]/60 p-3"
        >
          <div className="text-sm font-semibold text-[#ede8de] truncate">
            {file.file_name || 'Evidence File'}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {file.file_size
              ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB`
              : 'Size unavailable'}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {file.evidence_status || 'Submitted'}
          </div>

          <button
            onClick={() => openEvidence(file.storage_path)}
            className="btn btn-sm btn-ghost mt-3"
          >
            <Paperclip size={13} />
            View
          </button>
        </div>
      ))}
    </div>
  </div>
)}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                    No comments yet. Start the conversation below.
                  </div>
                ) : (
                  comments.map(item => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#ede8de]">
                          {item.sender_name || item.sender_email}
                        </div>

                        <div className="text-xs text-slate-500">
                          {item.sender_role || 'User'} •{' '}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString('en-GB')
                            : '—'}
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">
                        {item.comment}
                      </p>

                      {item.attachment_url && (
                        <div className="mt-3 space-y-2">
                          <button
                            onClick={() => openEvidence(item.attachment_url)}
                            className="inline-flex items-center gap-1 text-sm text-[#c49e48] hover:underline"
                          >
                            <Paperclip size={13} />
                            View Evidence
                          </button>

                          <div className="text-xs text-slate-500">
                            {item.file_name || 'Uploaded File'}
                          </div>

                          {item.file_size && (
                            <div className="text-xs text-slate-500">
                              {(item.file_size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          )}

                          {item.evidence_status && (
                            <span className="inline-flex rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 px-2 py-1 text-xs text-[#c49e48]">
                              {item.evidence_status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <textarea
                  disabled={isLocked}
                  className="form-control min-h-[110px]"
                  placeholder={
                    isLocked
                      ? 'Task has been approved and locked.'
                      : 'Write a comment, question, or update...'
                  }
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />

                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4">
                  <label className="form-label flex items-center gap-2">
                    <UploadCloud size={15} />
                    Upload Evidence
                  </label>

                  <input
  type="file"
  multiple
  disabled={isLocked}
  className="form-control"
  onChange={e =>
    setEvidenceFiles(
      Array.from(e.target.files || [])
    )
  }
/>

                {evidenceFiles.length > 0 && (
  <div className="space-y-1 mt-2">
    {evidenceFiles.map(file => (
      <div
        key={file.name}
        className="text-xs text-slate-400"
      >
        {file.name}
      </div>
    ))}
  </div>
)}
                </div>

                <button
                  onClick={sendComment}
                  disabled={submitting || isLocked}
                  className="btn btn-gold"
                >
                  <Send size={15} />
                  {submitting ? 'Sending…' : 'Send Comment / Evidence'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isDone = ['Completed', 'Submitted', 'Approved'].includes(status)

  const style =
    status === 'Completed' || status === 'Approved'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      : status === 'Submitted'
      ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
      : status === 'In Progress'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-400'

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-1 ${style}`}
    >
      {isDone ? <CheckCircle size={13} /> : <Clock size={13} />}
      {status}
    </span>
  )
}

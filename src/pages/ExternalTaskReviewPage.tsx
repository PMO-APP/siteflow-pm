import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Send,
  Paperclip,
  CheckCircle,
  Clock,
  RefreshCw,
  UploadCloud,
  XCircle,
  RotateCcw,
  ShieldCheck,
  History,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { notifyUsers } from '@/lib/notifications'

const STATUS_OPTIONS = [
  'Open',
  'Pending',
  'In Progress',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Revision Required',
  'Completed',
]

export default function ExternalTaskReviewPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName } = useProjectStore()

  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  const [reply, setReply] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [projectId])

  useEffect(() => {
    if (selectedTask?.id) loadTaskDetails(selectedTask.id)
  }, [selectedTask?.id])

  async function loadTasks() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('external_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])

    if (!selectedTask && data && data.length > 0) {
      setSelectedTask(data[0])
    }

    setLoading(false)
  }

  async function loadTaskDetails(taskId: number) {
    if (!projectId) return

    setLoadingDetails(true)

    const [{ data: commentRows, error: commentError }, { data: historyRows }] =
      await Promise.all([
        supabase
          .from('external_task_comments')
          .select('*')
          .eq('task_id', taskId)
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),

        supabase
          .from('external_task_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false }),
      ])

    if (commentError) {
      setNotice(commentError.message)
      setLoadingDetails(false)
      return
    }

    setComments(commentRows || [])
    setHistory(historyRows || [])
    setLoadingDetails(false)
  }

  async function openEvidence(storagePath: string) {
    const { data, error } = await supabase.storage
      .from('external-task-evidence')
      .createSignedUrl(storagePath, 3600)

    if (error) {
      setNotice(error.message)
      return
    }

    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function addHistory(taskId: number, action: string, metadata: any = {}) {
    await supabase.from('external_task_history').insert({
      task_id: taskId,
      project_id: projectId,
      action,
      performed_by: user?.full_name || user?.email || 'Internal User',
      performed_by_email: user?.email || '',
      performed_by_role: role || 'internal',
      metadata,
    })
  }

  async function uploadEvidence(taskId: number) {
    if (!evidenceFile || !projectId) return null

    const safeFileName = evidenceFile.name.replace(/\s+/g, '-')
    const filePath = `${projectId}/${taskId}/${Date.now()}-${safeFileName}`

    const { error } = await supabase.storage
      .from('external-task-evidence')
      .upload(filePath, evidenceFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    return filePath
  }

  async function sendReply() {
    setNotice('')

    if (!selectedTask || !projectId) {
      setNotice('Select a task first.')
      return
    }

    if (!reply.trim() && !evidenceFile) {
      setNotice('Reply message or evidence upload is required.')
      return
    }

    setSubmitting(true)

    try {
      const cleanReply = reply.trim()
      const uploadedFileUrl = await uploadEvidence(selectedTask.id)

      const { error } = await supabase.from('external_task_comments').insert({
        task_id: selectedTask.id,
        project_id: projectId,
        sender_name: user?.full_name || user?.email || 'Internal User',
        sender_email: user?.email || '',
        sender_role: role || 'internal',
        comment: cleanReply || 'Evidence uploaded.',
        attachment_url: uploadedFileUrl,
        evidence_status: uploadedFileUrl ? 'Submitted' : null,
      })

      if (error) throw error

      await addHistory(
        selectedTask.id,
        uploadedFileUrl
          ? 'Internal reply added with evidence'
          : 'Internal reply added',
        { hasEvidence: !!uploadedFileUrl }
      )

      await supabase
        .from('external_tasks')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTask.id)
        .eq('project_id', projectId)

      if (selectedTask.assigned_to_email) {
        await notifyUsers({
          projectId,
          recipientRole: selectedTask.assigned_role,
          type: 'external_task_comment_reply',
          title: `Reply on Task: ${selectedTask.title}`,
          message: `${
            user?.full_name || user?.email || 'Internal team'
          } replied to your task conversation.`,
          sendEmail: true,
          emailPayload: {
            to: [selectedTask.assigned_to_email],
            subject: `Reply on Task: ${selectedTask.title}`,
            type: 'Task Conversation Reply',
            projectName: projectName || 'PMOCorex Project',
            submittedBy: user?.full_name || user?.email || 'Internal Team',
            submittedByEmail: user?.email || '',
            message: cleanReply || 'Evidence uploaded.',
            reviewUrl: `${window.location.origin}/external-project/tasks/${selectedTask.id}?project=${projectId}`,
          },
        })
      }

      setReply('')
      setEvidenceFile(null)
      setNotice('Reply/evidence sent. External assignee has been notified.')

      await loadTaskDetails(selectedTask.id)
      await loadTasks()
    } catch (error: any) {
      setNotice(error.message || 'Unable to send reply.')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateTaskStatus(status: string) {
    if (!selectedTask || !projectId) return

    const { error } = await supabase
      .from('external_tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTask.id)
      .eq('project_id', projectId)

    if (error) {
      setNotice(error.message)
      return
    }

    await addHistory(selectedTask.id, `Internal status changed to ${status}`, {
      status,
    })

    const updatedTask = { ...selectedTask, status }
    setSelectedTask(updatedTask)

    await notifyExternalUser(
      `Task Status Updated: ${selectedTask.title}`,
      `Your task status has been updated to ${status}.`
    )

    await loadTasks()
    await loadTaskDetails(selectedTask.id)
  }

  async function reviewDecision(
    decision: 'Approved' | 'Rejected' | 'Revision Required'
  ) {
    if (!selectedTask || !projectId) return

    setSubmitting(true)
    setNotice('')

    const finalStatus = decision === 'Approved' ? 'Approved' : decision

    const { error } = await supabase
      .from('external_tasks')
      .update({
        status: finalStatus,
        review_status: decision,
        review_comment: reviewComment.trim() || null,
        reviewed_by: user?.email || 'Internal Team',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTask.id)
      .eq('project_id', projectId)

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await addHistory(selectedTask.id, `Submission ${decision}`, {
      decision,
      reviewComment: reviewComment.trim() || null,
    })

    await notifyExternalUser(
      `Task ${decision}: ${selectedTask.title}`,
      reviewComment.trim() ||
        `Your task submission has been marked as ${decision}.`
    )

    const updatedTask = {
      ...selectedTask,
      status: finalStatus,
      review_status: decision,
      review_comment: reviewComment.trim() || null,
    }

    setSelectedTask(updatedTask)
    setReviewComment('')
    setNotice(`Task marked as ${decision}.`)
    setSubmitting(false)

    await loadTasks()
    await loadTaskDetails(selectedTask.id)
  }

  async function notifyExternalUser(title: string, message: string) {
    if (!selectedTask?.assigned_to_email || !projectId) return

    await notifyUsers({
      projectId,
      recipientRole: selectedTask.assigned_role,
      type: 'external_task_review',
      title,
      message,
      sendEmail: true,
      emailPayload: {
        to: [selectedTask.assigned_to_email],
        subject: title,
        type: 'External Task Review',
        projectName: projectName || 'PMOCorex Project',
        submittedBy: user?.full_name || user?.email || 'Internal Team',
        submittedByEmail: user?.email || '',
        message,
        reviewUrl: `${window.location.origin}/external-project/tasks/${selectedTask.id}?project=${projectId}`,
      },
    })
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          External Task Review
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Assignment Conversations
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Review external assignments, evidence, approval decisions, comments,
          and full assignment history.
        </p>

        <div className="mt-4 text-sm text-slate-500">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      {!projectId ? (
        <div className="card p-6 text-slate-400">
          Select a project from the Workspace Hub first.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <section className="card p-5 xl:col-span-1 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-[#c49e48]" />
                <h2 className="text-lg font-bold text-[#ede8de]">
                  External Tasks
                </h2>
              </div>

              <button onClick={loadTasks} className="btn btn-ghost">
                <RefreshCw size={14} />
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-slate-500">Loading tasks…</div>
            ) : tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                No external tasks for this project.
              </div>
            ) : (
              <div className="space-y-2 max-h-[650px] overflow-y-auto">
                {tasks.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selectedTask?.id === task.id
                        ? 'border-[#c49e48]/40 bg-[#c49e48]/10'
                        : 'border-white/10 bg-white/5 hover:border-[#c49e48]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-[#ede8de] truncate">
                        {task.title}
                      </div>

                      {task.status === 'Completed' ||
                      task.status === 'Approved' ? (
                        <CheckCircle size={14} className="text-emerald-400" />
                      ) : (
                        <Clock size={14} className="text-amber-400" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      {task.status || 'Open'} • {task.priority || 'Medium'}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      To:{' '}
                      {task.assigned_to_name ||
                        task.assigned_to_email ||
                        task.assigned_company ||
                        'External Partner'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 xl:col-span-3 space-y-5">
            {!selectedTask ? (
              <div className="text-center py-20">
                <ClipboardList size={38} className="mx-auto text-[#c49e48]" />
                <div className="text-lg font-bold text-white mt-4">
                  Select a task
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Choose an external task to review comments and evidence.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#ede8de]">
                      {selectedTask.title}
                    </h2>

                    <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">
                      {selectedTask.description || 'No description provided.'}
                    </p>

                    <div className="text-xs text-slate-500 mt-2">
                      Assigned to:{' '}
                      {selectedTask.assigned_to_name ||
                        selectedTask.assigned_to_email ||
                        selectedTask.assigned_company ||
                        'External Partner'}
                    </div>

                    {selectedTask.review_status && (
                      <div className="text-xs text-[#c49e48] mt-2">
                        Review Status: {selectedTask.review_status}
                      </div>
                    )}
                  </div>

                  <div className="min-w-[220px]">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={selectedTask.status || 'Open'}
                      onChange={e => updateTaskStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#c49e48]" />
                    <h3 className="font-bold text-[#ede8de]">
                      PMO Review Decision
                    </h3>
                  </div>

                  <textarea
                    className="form-control min-h-[80px]"
                    placeholder="Add review comment or reason..."
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => reviewDecision('Approved')}
                      disabled={submitting}
                      className="btn btn-sm btn-gold"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>

                    <button
                      onClick={() => reviewDecision('Revision Required')}
                      disabled={submitting}
                      className="btn btn-sm btn-ghost"
                    >
                      <RotateCcw size={14} />
                      Request Revision
                    </button>

                    <button
                      onClick={() => reviewDecision('Rejected')}
                      disabled={submitting}
                      className="btn btn-sm btn-ghost"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-2">
                      <Send size={16} className="text-[#c49e48]" />
                      <h3 className="font-bold text-[#ede8de]">
                        Conversation & Evidence
                      </h3>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {loadingDetails ? (
                        <div className="text-sm text-slate-500">
                          Loading details…
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                          No comments yet.
                        </div>
                      ) : (
                        comments.map(item => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-white/10 bg-white/5 p-4"
                          >
                            <div className="text-sm font-bold text-[#ede8de]">
                              {item.sender_name || item.sender_email}
                            </div>

                            <div className="text-xs text-slate-500">
                              {item.sender_role || 'User'} •{' '}
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString(
                                    'en-GB'
                                  )
                                : '—'}
                            </div>

                            <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">
                              {item.comment}
                            </p>

                            {item.attachment_url && (
                              <button
                                type="button"
                                onClick={() =>
                                  openEvidence(item.attachment_url)
                                }
                                className="inline-flex items-center gap-1 text-sm text-[#c49e48] hover:underline mt-3"
                              >
                                <Paperclip size={13} />
                                View Evidence
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <History size={16} className="text-[#c49e48]" />
                      <h3 className="font-bold text-[#ede8de]">
                        Assignment History
                      </h3>
                    </div>

                    {history.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No history yet.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto">
                        {history.map(item => (
                          <div
                            key={item.id}
                            className="border-l border-[#c49e48]/40 pl-3"
                          >
                            <div className="text-sm text-[#ede8de]">
                              {item.action}
                            </div>

                            <div className="text-[11px] text-slate-500 mt-1">
                              {item.performed_by || 'User'} •{' '}
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString(
                                    'en-GB'
                                  )
                                : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <textarea
                    className="form-control min-h-[110px]"
                    placeholder="Write reply to external assignee..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />

                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4">
                    <label className="form-label flex items-center gap-2">
                      <UploadCloud size={15} />
                      Upload Reply Evidence
                    </label>

                    <input
                      type="file"
                      className="form-control"
                      onChange={e =>
                        setEvidenceFile(e.target.files?.[0] || null)
                      }
                    />

                    {evidenceFile && (
                      <div className="text-xs text-slate-400 mt-2">
                        Selected: {evidenceFile.name}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={sendReply}
                    disabled={submitting}
                    className="btn btn-gold"
                  >
                    <Send size={15} />
                    {submitting ? 'Sending…' : 'Send Reply / Evidence'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

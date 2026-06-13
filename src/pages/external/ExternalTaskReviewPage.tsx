import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Send,
  Paperclip,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { notifyUsers } from '@/lib/notifications'

const STATUS_OPTIONS = ['Open', 'Pending', 'In Progress', 'Submitted', 'Completed']

export default function ExternalTaskReviewPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName } = useProjectStore()

  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingComments, setLoadingComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [projectId])

  useEffect(() => {
    if (selectedTask?.id) {
      loadComments(selectedTask.id)
    }
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

  async function loadComments(taskId: number) {
    if (!projectId) return

    setLoadingComments(true)

    const { data, error } = await supabase
      .from('external_task_comments')
      .select('*')
      .eq('task_id', taskId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      setNotice(error.message)
      setLoadingComments(false)
      return
    }

    setComments(data || [])
    setLoadingComments(false)
  }

  async function sendReply() {
    setNotice('')

    if (!selectedTask || !projectId) {
      setNotice('Select a task first.')
      return
    }

    if (!reply.trim()) {
      setNotice('Reply message is required.')
      return
    }

    setSubmitting(true)

    const cleanReply = reply.trim()

    const { error } = await supabase.from('external_task_comments').insert({
      task_id: selectedTask.id,
      project_id: projectId,
      sender_name: user?.full_name || user?.email || 'Internal User',
      sender_email: user?.email || '',
      sender_role: role || 'internal',
      comment: cleanReply,
      attachment_url: attachmentUrl.trim() || null,
    })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await supabase
      .from('external_tasks')
      .update({
        updated_at: new Date().toISOString(),
      })
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
          message: cleanReply,
          reviewUrl: `${window.location.origin}/external-project/tasks/${selectedTask.id}?project=${projectId}`,
        },
      })
    }

    setReply('')
    setAttachmentUrl('')
    setNotice('Reply sent. External assignee has been notified.')
    setSubmitting(false)

    await loadComments(selectedTask.id)
    await loadTasks()
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

    const updatedTask = {
      ...selectedTask,
      status,
    }

    setSelectedTask(updatedTask)

    if (selectedTask.assigned_to_email) {
      await notifyUsers({
        projectId,
        recipientRole: selectedTask.assigned_role,
        type: 'external_task_status_review',
        title: `Task Status Updated: ${selectedTask.title}`,
        message: `Your task status has been updated to ${status}.`,
        sendEmail: true,
        emailPayload: {
          to: [selectedTask.assigned_to_email],
          subject: `Task Status Updated: ${selectedTask.title}`,
          type: 'Task Status Update',
          projectName: projectName || 'PMOCorex Project',
          submittedBy: user?.full_name || user?.email || 'Internal Team',
          submittedByEmail: user?.email || '',
          message: `Task: ${selectedTask.title}\nStatus: ${status}`,
          reviewUrl: `${window.location.origin}/external-project/tasks/${selectedTask.id}?project=${projectId}`,
        },
      })
    }

    await loadTasks()
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
          Review external assignments, reply to task comments, update statuses,
          and keep project-specific task communication in one place.
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

                      {task.status === 'Completed' ? (
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

          <section className="card p-5 xl:col-span-3 space-y-4">
            {!selectedTask ? (
              <div className="text-center py-20">
                <ClipboardList size={38} className="mx-auto text-[#c49e48]" />

                <div className="text-lg font-bold text-white mt-4">
                  Select a task
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Choose an external task to review comments and respond.
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

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {loadingComments ? (
                    <div className="text-sm text-slate-500">
                      Loading comments…
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
                        <div>
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
                        </div>

                        <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">
                          {item.comment}
                        </p>

                        {item.attachment_url && (
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-[#c49e48] hover:underline mt-3"
                          >
                            <Paperclip size={13} />
                            Open attachment/link
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <textarea
                    className="form-control min-h-[110px]"
                    placeholder="Write reply to external assignee..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />

                  <input
                    className="form-control"
                    placeholder="Attachment URL / file link"
                    value={attachmentUrl}
                    onChange={e => setAttachmentUrl(e.target.value)}
                  />

                  <button
                    onClick={sendReply}
                    disabled={submitting}
                    className="btn btn-gold"
                  >
                    <Send size={15} />
                    {submitting ? 'Sending…' : 'Send Reply'}
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

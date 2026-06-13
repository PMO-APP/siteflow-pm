import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Paperclip,
  Send,
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
  const [comment, setComment] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

    setTask(taskRow)
    setComments(commentRows || [])
    setLoading(false)
  }

  async function updateTaskStatus(status: string) {
    if (!task || !activeProjectId) return

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
        reviewUrl: `${window.location.origin}/app/external-communication`,
      },
    })

    setTask({ ...task, status })
  }

  async function sendComment() {
    setNotice('')

    if (!task || !activeProjectId) {
      setNotice('Task or project not found.')
      return
    }

    if (!comment.trim()) {
      setNotice('Comment is required.')
      return
    }

    setSubmitting(true)

    const cleanComment = comment.trim()

    const { error } = await supabase.from('external_task_comments').insert({
      task_id: task.id,
      project_id: activeProjectId,
      sender_name: user?.full_name || user?.email || 'External User',
      sender_email: user?.email || '',
      sender_role: role || 'external',
      comment: cleanComment,
      attachment_url: attachmentUrl.trim() || null,
    })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

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
        message: cleanComment,
        reviewUrl: `${window.location.origin}/app/external-communication`,
      },
    })

    setComment('')
    setAttachmentUrl('')
    setNotice('Comment sent. The internal team has been notified.')
    setSubmitting(false)

    await loadTaskDetail()
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
            View task details, update task status, ask questions, add comments,
            and attach supporting links.
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
            </section>

            <section className="card p-6 xl:col-span-2 space-y-5">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-[#c49e48]" />

                <h2 className="text-lg font-bold text-[#ede8de]">
                  Task Conversation
                </h2>
              </div>

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
                      <div className="flex items-center justify-between gap-3">
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
                  placeholder="Write a comment, question, or update..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />

                <input
                  className="form-control"
                  placeholder="Attachment URL / file link"
                  value={attachmentUrl}
                  onChange={e => setAttachmentUrl(e.target.value)}
                />

                <button
                  onClick={sendComment}
                  disabled={submitting}
                  className="btn btn-gold"
                >
                  <Send size={15} />
                  {submitting ? 'Sending…' : 'Send Comment'}
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
  const isDone = ['Completed', 'Submitted'].includes(status)

  const style =
    status === 'Completed'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      : status === 'Submitted'
      ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
      : status === 'In Progress'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-400'

  return (
    <span className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-1 ${style}`}>
      {isDone ? <CheckCircle size={13} /> : <Clock size={13} />}
      {status}
    </span>
  )
}

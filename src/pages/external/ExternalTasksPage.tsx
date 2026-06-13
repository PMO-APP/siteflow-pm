import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useExternalProjectStore } from '@/store/externalProject'
import { notifyUsers } from '@/lib/notifications'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Submitted', 'Completed']

export default function ExternalTasksPage() {
  const navigate = useNavigate()
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

  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    syncProjectFromUrl()
  }, [projectFromUrl])

  useEffect(() => {
    loadTasks()
  }, [activeProjectId, user?.email, role])

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

  async function loadTasks() {
    if (!activeProjectId || !user?.email) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('external_tasks')
      .select('*')
      .eq('project_id', activeProjectId)
      .or(`assigned_to_email.eq.${user.email},assigned_role.eq.${role || ''}`)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  async function updateTaskStatus(taskId: number, status: string) {
    setNotice('')

    const task = tasks.find(item => item.id === taskId)

    const { error } = await supabase
      .from('external_tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
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
      } updated task "${task?.title || 'Assigned Task'}" to ${status}.`,
      sendEmail: status === 'Submitted' || status === 'Completed',
      emailPayload: {
        to: ['YOUR_PMO_EMAIL@company.com'],
        subject: `External Task ${status}: ${task?.title || 'Assigned Task'}`,
        type: 'External Task Update',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message: `Task: ${task?.title || 'Assigned Task'}\nStatus: ${status}`,
        reviewUrl: `${window.location.origin}/app/external-review`,
      },
    })

    await loadTasks()
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
              External Tasks
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
              My Assigned Tasks
            </h1>

            <p className="text-slate-400 mt-3 max-w-2xl">
              View and update tasks assigned to you for the selected project
              only.
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
            <p className="text-slate-400">
              Please select a project before viewing assigned tasks.
            </p>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold mt-4"
            >
              Select Project
            </button>
          </div>
        )}

        {activeProjectId &&
          (loading ? (
            <div className="card p-6 text-slate-400">Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                <ClipboardList size={24} className="text-[#c49e48]" />
              </div>

              <div className="text-xl font-bold text-white">
                No tasks assigned yet
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Tasks assigned for this selected project will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={updateTaskStatus}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onStatusChange,
}: {
  task: any
  onStatusChange: (taskId: number, status: string) => void
}) {
  const statusStyle =
    task.status === 'Completed'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : task.status === 'In Progress'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : task.status === 'Submitted'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

  const priorityStyle =
    task.priority === 'High' || task.priority === 'Critical'
      ? 'text-red-400'
      : task.priority === 'Low'
      ? 'text-slate-400'
      : 'text-[#c49e48]'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#ede8de]">
            {task.title}
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {task.description || 'No description provided.'}
          </p>
        </div>

        {task.status === 'Completed' ? (
          <CheckCircle size={20} className="text-emerald-400" />
        ) : task.status === 'In Progress' ? (
          <Clock size={20} className="text-blue-400" />
        ) : (
          <AlertTriangle size={20} className="text-amber-400" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`text-xs rounded-full border px-2 py-1 ${statusStyle}`}>
          {task.status || 'Pending'}
        </span>

        <span
          className={`text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 ${priorityStyle}`}
        >
          Priority: {task.priority || 'Medium'}
        </span>

        <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-400">
          Due: {task.due_date || 'Not set'}
        </span>
      </div>

      <select
        className="form-control"
        value={task.status || 'Pending'}
        onChange={e => onStatusChange(task.id, e.target.value)}
      >
        {STATUS_OPTIONS.map(status => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  )
}

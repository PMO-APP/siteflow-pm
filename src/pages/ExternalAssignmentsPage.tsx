import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { notifyUsers } from '@/lib/notifications'

const ASSIGNABLE_ROLES = [
  'consultant',
  'contractor',
  'vendor',
  'subcontractor',
]

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export default function ExternalAssignmentsPage() {
  const { user } = useAuthStore()
  const { projectId, projectName } = useProjectStore()

  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedRole, setAssignedRole] = useState('contractor')
  const [assignedCompany, setAssignedCompany] = useState('')
  const [assignedName, setAssignedName] = useState('')
  const [assignedEmail, setAssignedEmail] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    loadTasks()
  }, [projectId])

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
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  async function createTask() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!title.trim()) {
      setNotice('Task title is required.')
      return
    }

    if (!assignedEmail.trim()) {
      setNotice('Assigned email is required so the user can be notified.')
      return
    }

    setSubmitting(true)

    const cleanTitle = title.trim()
    const cleanDescription = description.trim()
    const cleanEmail = assignedEmail.trim().toLowerCase()
    const cleanName = assignedName.trim()
    const cleanCompany = assignedCompany.trim()

    const { error } = await supabase.from('external_tasks').insert({
      project_id: projectId,
      assigned_role: assignedRole,
      assigned_company: cleanCompany || null,
      assigned_to_name: cleanName || null,
      assigned_to_email: cleanEmail,
      title: cleanTitle,
      description: cleanDescription || null,
      priority,
      due_date: dueDate || null,
      status: 'Open',
      progress: 0,
      created_by: user?.email || 'Internal Team',
    })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await notifyUsers({
      projectId,
      recipientRole: assignedRole,
      type: 'external_assignment',
      title: 'New Task Assigned',
      message: `${cleanTitle} has been assigned to ${
        cleanName || cleanEmail
      } for ${projectName || 'this project'}.`,
      sendEmail: true,
      emailPayload: {
        to: [cleanEmail],
        subject: `New Task Assigned: ${cleanTitle}`,
        type: 'External Task Assignment',
        projectName: projectName || 'PMOCorex Project',
        submittedBy: user?.full_name || user?.email || 'PMOCorex Team',
        submittedByEmail: user?.email || '',
        message: [
          `Task: ${cleanTitle}`,
          cleanDescription ? `Description: ${cleanDescription}` : '',
          `Priority: ${priority}`,
          `Due Date: ${dueDate || 'Not set'}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        reviewUrl: `${window.location.origin}/external-project/tasks?project=${projectId}`,
      },
    })

    await notifyUsers({
      projectId,
      recipientRole: 'pmo',
      type: 'task_assignment',
      title: 'External Task Created',
      message: `${cleanName || cleanEmail} was assigned task "${cleanTitle}".`,
      sendEmail: false,
    })

    setTitle('')
    setDescription('')
    setAssignedRole('contractor')
    setAssignedCompany('')
    setAssignedName('')
    setAssignedEmail('')
    setPriority('Medium')
    setDueDate('')
    setNotice('External task assigned successfully. Notification sent.')
    setSubmitting(false)

    await loadTasks()
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          External Collaboration
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          External Assignments
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Assign project-specific tasks to consultants, contractors, vendors,
          and subcontractors. Notifications are sent immediately.
        </p>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-6 xl:col-span-1">
          <div className="flex items-center gap-2 mb-5">
            <Plus size={18} className="text-[#c49e48]" />
            <h2 className="text-lg font-bold text-[#ede8de]">
              Create External Task
            </h2>
          </div>

          <div className="space-y-3">
            <input
              className="form-control"
              placeholder="Task title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <textarea
              className="form-control min-h-[100px]"
              placeholder="Task description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <select
              className="form-control"
              value={assignedRole}
              onChange={e => setAssignedRole(e.target.value)}
            >
              {ASSIGNABLE_ROLES.map(role => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>

            <input
              className="form-control"
              placeholder="Assigned company / vendor name"
              value={assignedCompany}
              onChange={e => setAssignedCompany(e.target.value)}
            />

            <input
              className="form-control"
              placeholder="Assigned person name"
              value={assignedName}
              onChange={e => setAssignedName(e.target.value)}
            />

            <input
              className="form-control"
              placeholder="Assigned person email"
              value={assignedEmail}
              onChange={e => setAssignedEmail(e.target.value)}
            />

            <select
              className="form-control"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {PRIORITIES.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form-control"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />

            <button
              onClick={createTask}
              disabled={submitting}
              className="btn btn-gold w-full justify-center"
            >
              {submitting ? 'Assigning…' : 'Assign Task'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="card p-6 text-slate-400">
              Loading external assignments…
            </div>
          ) : tasks.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                <ClipboardList size={24} className="text-[#c49e48]" />
              </div>

              <div className="text-xl font-bold text-white">
                No external tasks assigned yet
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Tasks assigned here will appear in the external user portal for
                this project only.
              </p>
            </div>
          ) : (
            tasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </section>
    </div>
  )
}

function TaskCard({ task }: { task: any }) {
  const statusStyle =
    task.status === 'Completed'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : task.status === 'In Progress'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : task.status === 'Submitted'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

  const priorityStyle =
    task.priority === 'Critical'
      ? 'text-red-400'
      : task.priority === 'High'
      ? 'text-orange-400'
      : task.priority === 'Low'
      ? 'text-slate-400'
      : 'text-[#c49e48]'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#ede8de]">{task.title}</h2>

          <p className="text-sm text-slate-500 mt-1">
            {task.description || 'No description provided.'}
          </p>

          <div className="text-xs text-slate-500 mt-2">
            Assigned to:{' '}
            <span className="text-[#c49e48]">
              {task.assigned_to_name ||
                task.assigned_to_email ||
                task.assigned_company ||
                formatRole(task.assigned_role)}
            </span>
          </div>
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
          {task.status || 'Open'}
        </span>

        <span
          className={`text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 ${priorityStyle}`}
        >
          Priority: {task.priority || 'Medium'}
        </span>

        <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-400">
          Due: {task.due_date || 'Not set'}
        </span>

        <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-400">
          Progress: {task.progress || 0}%
        </span>
      </div>
    </div>
  )
}

function formatRole(role?: string | null) {
  if (!role) return 'External User'

  const labels: Record<string, string> = {
    consultant: 'Consultant',
    contractor: 'Contractor',
    vendor: 'Vendor',
    subcontractor: 'Subcontractor',
  }

  return labels[role] || role.replace(/_/g, ' ')
}

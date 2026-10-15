import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  Plus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'

const TASK_ASSIGNER_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
  'project_owner',
  'overall_project_owner',
  'housebuild_project_owner',
  'mep_project_owner',
  'infrastructure_project_owner',
  'hse_manager',
  'hse_lead',
  'design',
  'housebuild',
  'infrastructure',
  'mep',
  'costing',
]

const INTERNAL_DEPARTMENTS = [
  'PMO',
  'Project Owner',
  'Design',
  'Housebuild',
  'Infrastructure',
  'MEP',
  'Costing',
  'HSE',
]

const INTERNAL_ROLES = [
  'pmo',
  'project_owner',
  'overall_project_owner',
  'housebuild_project_owner',
  'mep_project_owner',
  'infrastructure_project_owner',
  'hse_manager',
  'hse_lead',
  'design',
  'housebuild',
  'infrastructure',
  'mep',
  'costing',
]

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUS_OPTIONS = ['Open', 'In Progress', 'Pending Review', 'Completed']
const VISIBILITY_OPTIONS = ['Private', 'Team', 'Project']

export default function InternalAssignmentsPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName } = useProjectStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const canAssign = TASK_ASSIGNER_ROLES.includes(role || '')

  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedDepartment, setAssignedDepartment] = useState('PMO')
  const [assignedRole, setAssignedRole] = useState('pmo')
  const [assignedEmail, setAssignedEmail] = useState('')
  const [assignedName, setAssignedName] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [visibility, setVisibility] = useState('Private')

  useEffect(() => {
    loadTasks()
  }, [projectId, user?.email, user?.id, role])

  useEffect(() => {
    if (!canAssign || searchParams.get('action') !== 'new') return
    setShowCreate(true)

    window.setTimeout(() => {
      document.getElementById('internal-task-title')?.focus()
      document.getElementById('create-internal-task')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 30)

    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [canAssign, searchParams, setSearchParams])

  async function loadTasks() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    let query = supabase
      .from('internal_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (!canAssign) {
      query = query.or(
        [
          `assigned_person_email.eq.${user?.email || ''}`,
          `assigned_email.eq.${user?.email || ''}`,
          `assigned_role.eq.${role || ''}`,
          `visibility.eq.Project`,
        ].join(',')
      )
    }

    const { data, error } = await query

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  async function sendTaskEmail({
    to,
    assigneeName,
    taskTitle,
    taskDescription,
    dueDateValue,
    priorityValue,
  }: {
    to: string
    assigneeName: string
    taskTitle: string
    taskDescription: string
    dueDateValue: string
    priorityValue: string
  }) {
    if (!to.trim()) return

    const { error } = await supabase.functions.invoke('send-task-email', {
      body: {
        to: to.trim(),
        assigneeName: assigneeName || 'Team Member',
        taskTitle,
        taskDescription,
        projectName: projectName || 'PMOCorex Project',
        dueDate: dueDateValue || 'Not set',
        priority: priorityValue,
        assignedBy: user?.full_name || user?.email || 'PMOCorex Team',
        taskUrl: `${window.location.origin}/app/internal-assignments`,
      },
    })

    if (error) {
      setNotice(
        `Task was created, but email notification failed: ${error.message}`
      )
      return
    }

    setNotice('Internal task assigned successfully. Email notification sent.')
  }

  async function createTask() {
    setNotice('')

    if (!canAssign) {
      setNotice('You do not have permission to assign internal tasks.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!title.trim()) {
      setNotice('Task title is required.')
      return
    }

    if (!assignedEmail.trim()) {
      setNotice('Assigned person email is required.')
      return
    }

    setSubmitting(true)

    const cleanTitle = title.trim()
    const cleanDescription = description.trim()
    const cleanEmail = assignedEmail.trim().toLowerCase()
    const cleanName = assignedName.trim()

    const taskPayload = {
      project_id: projectId,

      assigned_department: assignedDepartment,
      assigned_role: assignedRole,

      assigned_person_name: cleanName || null,
      assigned_person_email: cleanEmail,
      assigned_email: cleanEmail,

      title: cleanTitle,
      description: cleanDescription || null,

      priority,
      due_date: dueDate || null,
      status: 'Open',
      progress: 0,
      visibility,

      created_by: user?.id || null,
      submitted_by: user?.full_name || user?.email || 'PMOCorex Team',
    }

    const { error } = await supabase.from('internal_tasks').insert(taskPayload)

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await sendTaskEmail({
      to: cleanEmail,
      assigneeName: cleanName,
      taskTitle: cleanTitle,
      taskDescription: cleanDescription,
      dueDateValue: dueDate,
      priorityValue: priority,
    })

    setTitle('')
    setDescription('')
    setAssignedDepartment('PMO')
    setAssignedRole('pmo')
    setAssignedEmail('')
    setAssignedName('')
    setPriority('Medium')
    setDueDate('')
    setVisibility('Private')
    setSubmitting(false)

    setShowCreate(false)
    await loadTasks()
  }

  async function updateTaskStatus(taskId: number, status: string) {
    const { error } = await supabase
      .from('internal_tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadTasks()
  }

  async function updateTaskProgress(taskId: number, progress: number) {
    const cleanProgress = Math.max(0, Math.min(100, progress || 0))

    const { error } = await supabase
      .from('internal_tasks')
      .update({
        progress: cleanProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadTasks()
  }

  return (
    <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6 lg:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dfe3e7] bg-white p-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#102943]">Internal Assignments</h1>
          <p className="mt-1 text-sm text-[#65717c]">Assign work, track ownership and follow up on deadlines.</p>
        </div>
        {canAssign && <button type="button" onClick={() => setShowCreate(v => !v)} className="inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-3 text-sm font-semibold text-white">
          <Plus size={16} /> {showCreate ? 'Close form' : 'New Assignment'}
        </button>}
      </header>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Open', tasks.filter(t => t.status === 'Open' || !t.status).length],
          ['In progress', tasks.filter(t => t.status === 'In Progress').length],
          ['Completed', tasks.filter(t => t.status === 'Completed').length],
          ['Overdue', tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== 'Completed').length],
        ].map(([label, count]) => <div key={label} className="rounded-2xl border border-[#dfe3e7] bg-white p-4">
          <div className="text-xs text-[#65717c]">{label}</div><div className="mt-1 text-2xl font-semibold text-[#102943]">{loading ? '—' : count}</div>
        </div>)}
      </div>
      {notice && (
        <div className="rounded-xl border border-[#cfdbe3] bg-white p-4 text-sm text-[#31526d]">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5">
        {canAssign && showCreate && (
          <div id="create-internal-task" className="rounded-[24px] border border-[#dfe3e7] bg-white p-6 max-w-3xl">
            <div className="flex items-center gap-2 mb-5">
              <Plus size={18} className="text-[#df5f41]" />
              <h2 className="text-lg font-semibold text-[#102943]">
                Create Internal Task
              </h2>
            </div>

            <p className="mb-5 text-sm text-[#65717c]">Define the work, choose the responsible team or role, and set a deadline. Fields marked * are required.</p>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#102943]">Assignment title *
              <input
                id="internal-task-title"
                className="form-control"
                placeholder="Task title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              /></label>

              <label className="block text-sm font-medium text-[#102943]">Description / expected deliverable
              <textarea
                className="form-control min-h-[100px]"
                placeholder="Task description"
                value={description}
                onChange={e => setDescription(e.target.value)}
              /></label>

              <label className="block text-sm font-medium text-[#102943]">Assigned department
                <span className="mb-1 block text-xs font-normal text-[#65717c]">Which department is responsible for this work?</span>
              <select
                className="form-control"
                value={assignedDepartment}
                onChange={e => setAssignedDepartment(e.target.value)}
              >
                {INTERNAL_DEPARTMENTS.map(department => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select></label>

              <label className="block text-sm font-medium text-[#102943]">Assigned team or role
                <span className="mb-1 block text-xs font-normal text-[#65717c]">Choose the role that should receive the assignment.</span>
              <select
                className="form-control"
                value={assignedRole}
                onChange={e => setAssignedRole(e.target.value)}
              >
                {INTERNAL_ROLES.map(item => (
                  <option key={item} value={item}>
                    {formatRole(item)}
                  </option>
                ))}
              </select></label>

              <label className="block text-sm font-medium text-[#102943]">Responsible person's name
              <input
                className="form-control"
                placeholder="Assigned person name"
                value={assignedName}
                onChange={e => setAssignedName(e.target.value)}
              /></label>

              <label className="block text-sm font-medium text-[#102943]">Responsible person's email *
                <span className="mb-1 block text-xs font-normal text-[#65717c]">Used to notify the assignee. Enter their registered work email.</span>
              <input
                type="email"
                className="form-control"
                placeholder="Assigned person email"
                value={assignedEmail}
                onChange={e => setAssignedEmail(e.target.value)}
              /></label>

              <label className="block text-sm font-medium text-[#102943]">Priority
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
              </select></label>

              <label className="block text-sm font-medium text-[#102943]">Visibility
                <span className="mb-1 block text-xs font-normal text-[#65717c]">Who should be able to see this assignment?</span>
              <select
                className="form-control"
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
              >
                {VISIBILITY_OPTIONS.map(item => (
                  <option key={item} value={item}>
                    {item === 'Private'
                      ? 'Private'
                      : item === 'Team'
                      ? 'Team Visible'
                      : 'Project Visible'}
                  </option>
                ))}
              </select></label>

              <label className="block text-sm font-medium text-[#102943]">Due date
              <input
                type="date"
                className="form-control"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              /></label>

              <button
                onClick={createTask}
                disabled={submitting}
                className="rounded-xl bg-[#123a60] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d2e4d] w-full justify-center"
              >
                {submitting ? 'Assigning…' : 'Assign Internal Task'}
              </button>
            </div>
          </div>
        )}

        <div
          className={
            'space-y-4'
          }
        >
          <h2 className="text-lg font-semibold text-[#102943]">Assignments</h2>
          {loading ? (
            <div className="card p-6 text-[#65717c]">
              Loading internal assignments…
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#cfdbe3] bg-white p-10 text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                <ClipboardList size={24} className="text-[#df5f41]" />
              </div>

              <div className="text-xl font-semibold text-[#102943]">
                No internal tasks found
              </div>

              <p className="text-sm text-[#7b8791] mt-2">
                {canAssign
                  ? 'No assignments yet. Use New Assignment to create the first one.'
                  : 'Tasks assigned to your role or email will appear here.'}
              </p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                onProgressChange={updateTaskProgress}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function TaskCard({
  task,
  onStatusChange,
  onProgressChange,
}: {
  task: any
  onStatusChange: (taskId: number, status: string) => void
  onProgressChange: (taskId: number, progress: number) => void
}) {
  const statusStyle =
    task.status === 'Completed'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : task.status === 'In Progress'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : task.status === 'Pending Review'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

  const priorityStyle =
    task.priority === 'Critical'
      ? 'text-red-400'
      : task.priority === 'High'
      ? 'text-orange-400'
      : task.priority === 'Low'
      ? 'text-[#65717c]'
      : 'text-[#df5f41]'

  return (
    <div className="rounded-[22px] border border-[#dfe3e7] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#102943]">{task.title}</h2>

          <p className="text-sm text-[#7b8791] mt-1">
            {task.description || 'No description provided.'}
          </p>

          <div className="text-xs text-slate-500 mt-2">
            Assigned to:{' '}
            <span className="text-[#df5f41]">
              {task.assigned_person_name ||
                task.assigned_person_email ||
                task.assigned_email ||
                formatRole(task.assigned_role)}
            </span>
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Department:{' '}
            <span className="text-[#102943]">
              {task.assigned_department || '—'}
            </span>
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Visibility:{' '}
            <span className="text-[#102943]">
              {task.visibility || 'Private'}
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

        <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[#65717c]">
          Due: {task.due_date || 'Not set'}
        </span>

        <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[#65717c]">
          Progress: {task.progress || 0}%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          className="form-control"
          value={task.status || 'Open'}
          onChange={e => onStatusChange(task.id, e.target.value)}
        >
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <input
          className="form-control"
          type="number"
          min={0}
          max={100}
          value={task.progress || 0}
          onChange={e => onProgressChange(task.id, Number(e.target.value))}
        />
      </div>
    </div>
  )
}

function formatRole(role?: string | null) {
  if (!role) return 'Team Member'

  const labels: Record<string, string> = {
    pmo: 'PMO',
    project_owner: 'Project Owner',
    overall_project_owner: 'Overall Project Owner',
    housebuild_project_owner: 'Housebuild Project Owner',
    mep_project_owner: 'MEP Project Owner',
    infrastructure_project_owner: 'Infrastructure Project Owner',
    hse_manager: 'HSE Manager',
    hse_lead: 'HSE Lead',
    design: 'Design',
    housebuild: 'Housebuild',
    infrastructure: 'Infrastructure',
    mep: 'MEP',
    costing: 'Costing',
  }

  return labels[role] || role.replace(/_/g, ' ')
}

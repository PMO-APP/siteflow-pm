import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDot, ClipboardList, Clock3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Pending Review', 'Completed']

export default function MyAssignmentsPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName } = useProjectStore()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [notice, setNotice] = useState('')

  useEffect(() => { void loadTasks() }, [projectId, user?.email, role])

  async function loadTasks() {
    if (!projectId || !user) { setLoading(false); return }
    setLoading(true)
    const email = String(user.email || '').toLowerCase().trim()
    const { data, error } = await supabase
      .from('internal_tasks')
      .select('*')
      .eq('project_id', projectId)
      .or([`assigned_person_email.eq.${email}`, `assigned_email.eq.${email}`, `assigned_role.eq.${role || ''}`].join(','))
      .order('due_date', { ascending: true, nullsFirst: false })
    if (error) setNotice(error.message)
    else setTasks(data || [])
    setLoading(false)
  }

  async function updateTask(taskId: number, values: Record<string, unknown>) {
    const { error } = await supabase.from('internal_tasks').update({ ...values, updated_at: new Date().toISOString() }).eq('id', taskId)
    if (error) { setNotice(error.message); return }
    await loadTasks()
  }

  const now = new Date()
  const stats = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter(t => t.status === 'Open').length,
    active: tasks.filter(t => t.status === 'In Progress').length,
    overdue: tasks.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) < now).length,
    complete: tasks.filter(t => t.status === 'Completed').length,
  }), [tasks])
  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter)

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-[#dfe3e7] bg-white">
        <div className="grid lg:grid-cols-[1fr_360px]">
          <div className="p-7 sm:p-9">
            <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Personal delivery workspace</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#102943] sm:text-4xl">My Assignments</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#65717c]">Work assigned to you by PMO and discipline leads for {projectName || 'the selected project'}.</p>
          </div>
          <div className="bg-[#123a60] p-7 text-white">
            <div className="text-[11px] uppercase tracking-[.18em] text-white/60">Personal completion</div>
            <div className="mt-3 text-5xl font-semibold">{stats.total ? Math.round(stats.complete / stats.total * 100) : 0}%</div>
            <div className="mt-5 h-2 rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ff7657]" style={{width:`${stats.total ? stats.complete / stats.total * 100 : 0}%`}} /></div>
          </div>
        </div>
      </section>

      {notice && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{notice}</div>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Assigned', stats.total, ClipboardList], ['Open', stats.open, CircleDot], ['In progress', stats.active, Clock3], ['Overdue', stats.overdue, AlertTriangle], ['Completed', stats.complete, CheckCircle2]
        ].map(([label,value,Icon]: any) => <div key={label} className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><Icon size={17} className={label==='Overdue'&&value ? 'text-red-500':'text-[#6c7b88]'}/><div className="mt-4 text-2xl font-semibold text-[#102943]">{value}</div><div className="mt-1 text-xs text-[#7c8994]">{label}</div></div>)}
      </section>

      <section className="rounded-[24px] border border-[#dfe3e7] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eaed] p-5 sm:p-6">
          <div><h2 className="text-xl font-semibold text-[#102943]">Assignment board</h2><p className="mt-1 text-sm text-[#7b8791]">Update your status and progress as work advances.</p></div>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-xl border border-[#dfe3e7] bg-white px-4 py-2.5 text-sm">{['All',...STATUS_OPTIONS].map(x=><option key={x}>{x}</option>)}</select>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {loading ? <div className="col-span-full p-8 text-center text-[#7b8791]">Loading assignments…</div> : filtered.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-[#cfd8df] p-10 text-center"><ClipboardList className="mx-auto text-[#9aa7b1]"/><h3 className="mt-3 font-semibold text-[#102943]">No assignments in this view</h3><p className="mt-1 text-sm text-[#7b8791]">New work from your team lead will appear here.</p></div> : filtered.map(task => {
            const overdue = task.status !== 'Completed' && task.due_date && new Date(task.due_date) < now
            return <article key={task.id} className="rounded-2xl border border-[#dfe3e7] p-5">
              <div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${task.priority==='Critical'?'bg-red-50 text-red-700':task.priority==='High'?'bg-orange-50 text-orange-700':'bg-[#eef4f7] text-[#31526d]'}`}>{task.priority || 'Medium'}</span><h3 className="mt-3 text-lg font-semibold text-[#102943]">{task.title}</h3></div><span className={`text-xs font-semibold ${overdue?'text-red-600':'text-[#788591]'}`}>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB') : 'No due date'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[#65717c]">{task.description || 'No description provided.'}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#7b8791]"><CalendarDays size={14}/>{task.assigned_department || 'Internal'} · assigned by {task.submitted_by || 'Team lead'}</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px]">
                <div><div className="mb-2 flex justify-between text-xs"><span>Progress</span><span>{Number(task.progress || 0)}%</span></div><input type="range" min="0" max="100" step="5" value={Number(task.progress || 0)} onChange={e=>void updateTask(task.id,{progress:Number(e.target.value)})} className="w-full accent-[#123a60]"/></div>
                <select value={task.status || 'Open'} onChange={e=>void updateTask(task.id,{status:e.target.value})} className="rounded-xl border border-[#dfe3e7] px-3 py-2 text-xs">{STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select>
              </div>
            </article>
          })}
        </div>
      </section>
    </div>
  </div>
}

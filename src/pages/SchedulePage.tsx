import { useState } from 'react'
import { Plus, Calendar, List, BarChart2, Flag, Search, Filter } from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { fdate, urgencyColor, computeRAG } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import TaskModal from '@/components/modules/schedule/TaskModal'
import GanttView from '@/components/modules/schedule/GanttView'
import MilestoneTracker from '@/components/modules/schedule/MilestoneTracker'

const PHASES = ['All','Approval Schedule','Program Schedule','Internal "Wet works" (Contractor)','External Works Phase','Internal works & Interior Design']
type View = 'list' | 'gantt' | 'milestones'

export default function SchedulePage() {
  const { data: tasks = [], isLoading } = useTasks()
  const updateTask = useUpdateTask()
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [ragFilter, setRagFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalTask, setModalTask] = useState<Task | null | 'new'>(null)

  const today = new Date()

const getTaskProgress = (t: Task): number => {
  if (t.status === 'Completed') return 100
  if (t.status === 'Not Started') return 0
  return Number(t.progress_pct || 0)
}

const getRag = (t: Task): string => {
  if (t.status === 'Completed') return 'DONE'
  if (!t.finish_date) return 'GREEN'

  const finish = new Date(t.finish_date)
  const daysLeft =
    (finish.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

  if (today > finish && getTaskProgress(t) < 100) return 'RED'
  if (daysLeft <= 3) return 'AMBER'
  return 'GREEN'
}

  const filtered = tasks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !String(t.task_number).includes(search)) return false
    if (phaseFilter !== 'All' && t.phase !== phaseFilter) return false
    if (ragFilter && getRag(t) !== ragFilter) return false
    if (statusFilter && (t.status || 'Not Started') !== statusFilter) return false
    return true
  })

  const grouped = PHASES.slice(1).reduce((acc, ph) => {
    const pts = filtered.filter(t => t.phase === ph)
    if (pts.length) acc[ph] = pts
    return acc
  }, {} as Record<string, Task[]>)

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'Completed').length,
    inProg: tasks.filter(t => t.status === 'In Progress').length,
    red: tasks.filter(t => getRag(t) === 'RED').length,
    amber: tasks.filter(t => getRag(t) === 'AMBER').length,
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-[#c49e48]' },
          { label: 'Completed', value: stats.done, color: 'text-emerald-400' },
          { label: 'In Progress', value: stats.inProg, color: 'text-amber-400' },
          { label: 'RED', value: stats.red, color: 'text-red-400' },
          { label: 'AMBER', value: stats.amber, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* View toggles */}
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {([['list', List, 'List'], ['gantt', BarChart2, 'Gantt'], ['milestones', Flag, 'Milestones']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${view === v ? 'bg-[#c49e48] text-[#0c1014]' : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'}`}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]" />
          <input className="form-control pl-7 text-[12px] py-1.5" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="form-control text-[12px] py-1.5 w-auto" value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
          {PHASES.map(p => <option key={p}>{p}</option>)}
        </select>

        <select className="form-control text-[12px] py-1.5 w-auto" value={ragFilter} onChange={e => setRagFilter(e.target.value)}>
          <option value="">All RAG</option>
          <option value="RED">🔴 Red</option>
          <option value="AMBER">🟡 Amber</option>
          <option value="GREEN">🟢 Green</option>
        </select>

        <select className="form-control text-[12px] py-1.5 w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['Not Started','In Progress','Completed','On Hold','Blocked'].map(s => <option key={s}>{s}</option>)}
        </select>

        <button className="btn-gold btn-sm btn ml-auto" onClick={() => setModalTask('new')}>
          <Plus size={13} /> Add Task
        </button>
      </div>

      {/* Content */}
      {view === 'gantt' && <GanttView tasks={filtered} onTaskClick={t => setModalTask(t)} />}
      {view === 'milestones' && <MilestoneTracker tasks={tasks} />}

      {view === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Name</th>
                  <th className="hide-mobile">Deps</th>
                  <th>Start</th>
                  <th>Finish</th>
                  <th className="hide-mobile">Dur</th>
                  <th className="hide-mobile">Proc Deadline</th>
                  <th className="hide-mobile">Appr Deadline</th>
                  <th>RAG</th>
                  <th>Status</th>
                  <th className="hide-mobile">Progress</th>
                  <th className="hide-mobile">Responsible</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={13} className="text-center py-8 text-[#6e7d8c]">Loading…</td></tr>
                ) : Object.entries(grouped).map(([phase, pts]) => (
                  <>
                    <tr key={phase} className="bg-[#1c2a36]">
                      <td colSpan={13} className="font-display text-[12px] font-semibold text-[#ede8de] py-2">{phase}</td>
                    </tr>
                    {pts.map(t => {
                      const rag = t.status === 'Completed' ? '' : (getRag(t) || computeRAG(t))
                      const procDays = t.procurement_deadline ? differenceInDays(new Date(t.procurement_deadline), today) : null
                      const apprDays = t.approval_deadline ? differenceInDays(new Date(t.approval_deadline), today) : null
                      return (
                        <tr key={t.id}>
                          <td className="font-mono text-[#6e7d8c] text-[10px]">#{t.task_number}</td>
                          <td className="font-medium text-[#ede8de] max-w-[200px]">{t.name}{t.is_milestone && <span className="ml-1 text-[#c49e48]">⬦</span>}</td>
                          <td className="hide-mobile font-mono text-[10px] text-[#6e7d8c]">{t.dependencies || '—'}</td>
                          <td>{fdate(t.start_date)}</td>
                          <td>{fdate(t.finish_date)}</td>
                          <td className="hide-mobile text-center">{t.duration_days || '—'}</td>
                          <td className="hide-mobile">
                            {t.procurement_deadline ? <span className={urgencyColor(procDays)}>{fdate(t.procurement_deadline)}</span> : '—'}
                          </td>
                          <td className="hide-mobile">
                            {t.approval_deadline ? <span className={urgencyColor(apprDays)}>{fdate(t.approval_deadline)}</span> : '—'}
                          </td>
                          <td>
                            {rag ? <span className={`badge ${rag === 'RED' ? 'badge-red' : rag === 'AMBER' ? 'badge-amber' : 'badge-green'}`}>{rag}</span> : <span className="badge badge-green">DONE</span>}
                          </td>
                          <td>
                            <span className={`badge ${t.status === 'Completed' ? 'badge-green' : t.status === 'In Progress' ? 'badge-amber' : t.status === 'Blocked' ? 'badge-red' : 'badge-muted'}`}>{t.status}</span>
                          </td>
                          <td className="hide-mobile">
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#c49e48] rounded-full" style={{ width: `${getTaskProgress(t)}%` }} />
                              </div>
                              <span className="text-[10px] text-[#6e7d8c]">{getTaskProgress(t)}%</span>
                            </div>
                          </td>
                          <td className="hide-mobile text-[#6e7d8c] text-[11px]">{t.responsible || '—'}</td>
                          <td>
                            <button className="tbl-action" onClick={() => setModalTask(t)}>Edit</button>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modalTask !== null && (
        <TaskModal
          task={modalTask === 'new' ? null : modalTask}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  )
}

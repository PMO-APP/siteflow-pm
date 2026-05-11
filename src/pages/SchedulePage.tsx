import * as XLSX from 'xlsx'
import { Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { Fragment, useState } from 'react'
import {
  Plus,
  List,
  BarChart2,
  Flag,
  Search,
} from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { fdate, urgencyColor, computeRAG } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import TaskModal from '@/components/modules/schedule/TaskModal'
import GanttView from '@/components/modules/schedule/GanttView'
import MilestoneTracker from '@/components/modules/schedule/MilestoneTracker'

type View = 'list' | 'gantt' | 'milestones'

export default function SchedulePage() {
  const { projectId, projectName } = useProjectStore()

  const {
    data: allTasks = [],
    isLoading,
  } = useTasks()

  const tasks: Task[] = allTasks.filter(
    (task: Task) => task.project_id === projectId
  )

  const PHASES: string[] = [
    'All',
    ...Array.from(
      new Set(
        tasks
          .map((task: Task) => task.phase)
          .filter((phase): phase is string => Boolean(phase))
      )
    ),
  ]

  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [ragFilter, setRagFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalTask, setModalTask] = useState<Task | null | 'new'>(null)

  const today = new Date()

  const getTaskProgress = (task: Task): number => {
    if (task.status === 'Completed') return 100
    if (task.status === 'Not Started') return 0
    return Number(task.progress_pct || 0)
  }

  const getRag = (task: Task): string => {
    if (task.status === 'Completed') return 'DONE'
    if (!task.finish_date) return 'GREEN'

    const finish = new Date(task.finish_date)

    if (Number.isNaN(finish.getTime())) return 'GREEN'

    const daysLeft =
      (finish.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)

    if (today > finish && getTaskProgress(task) < 100) {
      return 'RED'
    }

    if (daysLeft <= 3) {
      return 'AMBER'
    }

    return 'GREEN'
  }

  const filtered: Task[] = tasks
    .filter((task: Task) => {
      const taskName = task.name || ''
      const taskNumber = String(task.task_number || '')

      if (
        search &&
        !taskName.toLowerCase().includes(search.toLowerCase()) &&
        !taskNumber.includes(search)
      ) {
        return false
      }

      if (phaseFilter !== 'All' && task.phase !== phaseFilter) {
        return false
      }

      if (ragFilter && getRag(task) !== ragFilter) {
        return false
      }

      if (
        statusFilter &&
        (task.status || 'Not Started') !== statusFilter
      ) {
        return false
      }

      return true
    })
    .sort(
      (a: Task, b: Task) =>
        Number(a.task_number || 0) - Number(b.task_number || 0)
    )

  const grouped: Record<string, Task[]> = PHASES.slice(1).reduce(
    (acc: Record<string, Task[]>, phase: string) => {
      const phaseTasks = filtered.filter(
        (task: Task) => task.phase === phase
      )

      if (phaseTasks.length) {
        acc[phase] = phaseTasks
      }

      return acc
    },
    {}
  )

  const stats = {
    total: tasks.length,
    done: tasks.filter(
      (task: Task) => task.status === 'Completed'
    ).length,
    inProg: tasks.filter(
      (task: Task) => task.status === 'In Progress'
    ).length,
    red: tasks.filter(
      (task: Task) => getRag(task) === 'RED'
    ).length,
    amber: tasks.filter(
      (task: Task) => getRag(task) === 'AMBER'
    ).length,
  }
const handleScheduleUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0]
  if (!file || !projectId) return

  const reader = new FileReader()

  reader.onload = async e => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    const tasksToInsert = rows.map((row, index) => ({
      project_id: projectId,
      task_number: row['Task Number'] || index + 1,
      name: row['Task Name'] || row['Name'] || 'Untitled Task',
      phase: row['Phase'] || 'General',
      start_date: row['Start Date'] || null,
      finish_date: row['Finish Date'] || null,
      duration_days: row['Duration'] || null,
      dependencies: row['Dependencies'] || null,
      responsible: row['Responsible'] || null,
      status: row['Status'] || 'Not Started',
      rag: row['RAG'] || '',
      progress_pct: Number(row['Progress'] || 0),
      procurement_deadline: row['Procurement Deadline'] || null,
      approval_deadline: row['Approval Deadline'] || null,
      notes: row['Notes'] || null,
      is_milestone: row['Milestone'] === true || row['Milestone'] === 'Yes',
    }))

    const { error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)

    if (error) {
      alert(error.message)
      return
    }

    alert('Schedule uploaded successfully.')
    window.location.reload()
  }

  reader.readAsArrayBuffer(file)
}
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold text-[#ede8de]">
          Master Schedule
        </div>

        <div className="text-[11px] text-[#6e7d8c] mt-1">
          {projectName}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-[#c49e48]' },
          { label: 'Completed', value: stats.done, color: 'text-emerald-400' },
          { label: 'In Progress', value: stats.inProg, color: 'text-amber-400' },
          { label: 'RED', value: stats.red, color: 'text-red-400' },
          { label: 'AMBER', value: stats.amber, color: 'text-amber-400' },
        ].map((item: { label: string; value: number; color: string }) => (
          <div key={item.label} className="card p-3">
            <div className={`font-display text-3xl font-bold ${item.color}`}>
              {item.value}
            </div>

            <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-0.5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {(
  [
    ['list', List, 'List'],
    ['gantt', BarChart2, 'Gantt'],
    ['milestones', Flag, 'Milestones'],
  ] as [View, React.ElementType, string][]
).map(([value, Icon, label]) => (
            <button
              key={value as string}
              onClick={() => setView(value as View)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                view === value
                  ? 'bg-[#c49e48] text-[#0c1014]'
                  : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-7 text-[12px] py-1.5"
            placeholder="Search tasks…"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={phaseFilter}
          onChange={event => setPhaseFilter(event.target.value)}
        >
          {PHASES.map((phase: string) => (
            <option key={phase}>{phase}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={ragFilter}
          onChange={event => setRagFilter(event.target.value)}
        >
          <option value="">All RAG</option>
          <option value="RED">🔴 Red</option>
          <option value="AMBER">🟡 Amber</option>
          <option value="GREEN">🟢 Green</option>
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
        >
          <option value="">All Status</option>
          {[
            'Not Started',
            'In Progress',
            'Completed',
            'On Hold',
            'Blocked',
          ].map((status: string) => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <label className="btn-ghost btn-sm btn ml-auto cursor-pointer">
  <Upload size={13} />
  Upload Schedule
  <input
    type="file"
    hidden
    accept=".xlsx,.xls,.csv"
    onChange={handleScheduleUpload}
  />
</label>

<button
  className="btn-gold btn-sm btn"
  onClick={() => setModalTask('new')}
>
  <Plus size={13} />
  Add Task
</button>
      </div>

      {view === 'gantt' && (
        <GanttView
          tasks={filtered}
          onTaskClick={(task: Task) => setModalTask(task)}
        />
      )}

      {view === 'milestones' && (
        <MilestoneTracker tasks={tasks} />
      )}

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
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-[#6e7d8c]">
                      Loading…
                    </td>
                  </tr>
                ) : Object.entries(grouped).length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-[#6e7d8c]">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  Object.entries(grouped).map(
                    ([phase, phaseTasks]: [string, Task[]]) => (
                      <Fragment key={phase}>
                        <tr className="bg-[#1c2a36]">
                          <td
                            colSpan={13}
                            className="font-display text-[12px] font-semibold text-[#ede8de] py-2"
                          >
                            {phase}
                          </td>
                        </tr>

                        {phaseTasks.map((task: Task) => {
                          const rag =
                            task.status === 'Completed'
                              ? ''
                              : getRag(task) || computeRAG(task)

                          const procDays = task.procurement_deadline
                            ? differenceInDays(
                                new Date(task.procurement_deadline),
                                today
                              )
                            : null

                          const apprDays = task.approval_deadline
                            ? differenceInDays(
                                new Date(task.approval_deadline),
                                today
                              )
                            : null

                          return (
                            <tr key={task.id}>
                              <td className="font-mono text-[#6e7d8c] text-[10px]">
                                #{task.task_number}
                              </td>

                              <td className="font-medium text-[#ede8de] max-w-[200px]">
                                {task.name}

                                {task.is_milestone && (
                                  <span className="ml-1 text-[#c49e48]">
                                    ⬦
                                  </span>
                                )}
                              </td>

                              <td className="hide-mobile font-mono text-[10px] text-[#6e7d8c]">
                                {task.dependencies || '—'}
                              </td>

                              <td>{fdate(task.start_date)}</td>
                              <td>{fdate(task.finish_date)}</td>

                              <td className="hide-mobile text-center">
                                {task.duration_days || '—'}
                              </td>

                              <td className="hide-mobile">
                                {task.procurement_deadline ? (
                                  <span className={urgencyColor(procDays)}>
                                    {fdate(task.procurement_deadline)}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              <td className="hide-mobile">
                                {task.approval_deadline ? (
                                  <span className={urgencyColor(apprDays)}>
                                    {fdate(task.approval_deadline)}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              <td>
                                {rag ? (
                                  <span
                                    className={`badge ${
                                      rag === 'RED'
                                        ? 'badge-red'
                                        : rag === 'AMBER'
                                        ? 'badge-amber'
                                        : 'badge-green'
                                    }`}
                                  >
                                    {rag}
                                  </span>
                                ) : (
                                  <span className="badge badge-green">
                                    DONE
                                  </span>
                                )}
                              </td>

                              <td>
                                <span
                                  className={`badge ${
                                    task.status === 'Completed'
                                      ? 'badge-green'
                                      : task.status === 'In Progress'
                                      ? 'badge-amber'
                                      : task.status === 'Blocked'
                                      ? 'badge-red'
                                      : 'badge-muted'
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </td>

                              <td className="hide-mobile">
                                <div className="flex items-center gap-2">
                                  <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#c49e48] rounded-full"
                                      style={{
                                        width: `${getTaskProgress(task)}%`,
                                      }}
                                    />
                                  </div>

                                  <span className="text-[10px] text-[#6e7d8c]">
                                    {getTaskProgress(task)}%
                                  </span>
                                </div>
                              </td>

                              <td className="hide-mobile text-[#6e7d8c] text-[11px]">
                                {task.responsible || '—'}
                              </td>

                              <td>
                                <button
                                  className="tbl-action"
                                  onClick={() => setModalTask(task)}
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalTask !== null && (
        <TaskModal
          task={modalTask === 'new' ? null : modalTask}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  )
}
